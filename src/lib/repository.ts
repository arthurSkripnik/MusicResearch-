// Single access point to data. Today: bundled /data JSON files + a localStorage / artifact db overlay.
// Later: swap the implementation for SQLite/Postgres/MusicBrainz import without touching UI.
import type { Entity, Relation, Journal, Reaction, Status, Hypothesis } from '../data/schema';
import { dataEntities, dataRelations, briefJournal, journalNotes, baseHypotheses, bundledCovers, spotifyLinks } from '../data';

export interface Cover { src: string; link?: string; source: string }
const COVERS = bundledCovers as Record<string, Cover>;
export interface SpotifyLink { kind: 'album' | 'track'; spotifyId: string; link: string; title: string; artist: string; date?: string }
export const SPOTIFY = spotifyLinks as Record<string, SpotifyLink>;

export const canonEntities: Entity[] = dataEntities;

export const canonRelations: Relation[] = dataRelations;

/** Relations derived from entity attributes, so facts are not typed twice. */
export function deriveRelations(entities: Entity[]): Relation[] {
  const out: Relation[] = [];
  for (const e of entities) {
    if (e.type === 'release' && e.attrs?.artist) {
      out.push({ id: `drv:rel:${e.id}`, type: 'released', from: e.attrs.artist, to: e.id,
        why: 'Реліз артиста.', confidence: e.confidence === 'unverified' ? 'unverified' : 'established', author: e.author === 'arthur' ? 'arthur' : 'claude' });
    }
    if (e.type === 'track') {
      if (e.attrs?.release) {
        out.push({ id: `drv:trk:${e.id}`, type: 'track_of', from: e.id, to: e.attrs.release,
          why: 'Трек із цього релізу.', confidence: e.confidence, author: 'claude' });
      } else if (e.attrs?.artist) {
        out.push({ id: `drv:trk:${e.id}`, type: 'released', from: e.attrs.artist, to: e.id,
          why: 'Трек артиста; реліз не встановлено.', confidence: 'established', author: 'claude' });
      }
    }
    if (e.type === 'genre') {
      for (const g of e.attrs?.genres ?? []) {
        out.push({ id: `drv:style:${e.id}:${g}`, type: 'style_of', from: e.id, to: g,
          why: 'Стиль цього жанру в класифікації Discogs.', confidence: 'established', author: 'claude' });
      }
    }
    if (e.type === 'release') {
      for (const st of e.attrs?.styles ?? []) {
        out.push({ id: `drv:rstyle:${e.id}:${st}`, type: 'in_genre', from: e.id, to: st,
          why: 'Стиль релізу (за Discogs-класифікацією).', confidence: e.confidence === 'unverified' ? 'unverified' : 'likely', author: 'claude' });
      }
    }
    if (e.city && (e.type === 'artist' || e.type === 'label' || e.type === 'scene')) {
      out.push({ id: `drv:city:${e.id}`, type: 'based_in', from: e.id, to: e.city,
        why: e.type === 'scene' ? 'Місто сцени.' : 'Місто походження або бази.', confidence: e.confidence === 'unverified' ? 'unverified' : 'likely', author: 'claude' });
    }
  }
  return out;
}

/** A track without its own cover shows its release's cover. */
function withTrackCovers(entities: Map<string, Entity>, covers: Record<string, Cover>): Record<string, Cover> {
  const out = { ...covers };
  for (const e of entities.values()) {
    const rel = e.attrs?.release;
    if (e.type === 'track' && !out[e.id] && rel && out[rel]) out[e.id] = { ...out[rel], link: undefined };
  }
  return out;
}

export function validate(entities: Entity[], relations: Relation[], journal: Journal): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const e of entities) {
    if (ids.has(e.id)) errors.push(`Duplicate entity id ${e.id}`);
    ids.add(e.id);
    if (!e.id.startsWith(`${e.type}:`)) errors.push(`Entity id ${e.id} does not match type ${e.type}`);
  }
  for (const e of entities) {
    for (const ref of [e.city, e.attrs?.parent, e.attrs?.artist, e.attrs?.release, ...(e.attrs?.genres ?? []), ...(e.attrs?.styles ?? [])]) {
      if (ref && !ids.has(ref)) errors.push(`${e.id} references missing ${ref}`);
    }
  }
  const rids = new Set<string>();
  for (const r of relations) {
    if (rids.has(r.id)) errors.push(`Duplicate relation id ${r.id}`);
    rids.add(r.id);
    if (!ids.has(r.from)) errors.push(`${r.id} (${r.type}): missing from ${r.from}`);
    if (!ids.has(r.to)) errors.push(`${r.id} (${r.type}): missing to ${r.to}`);
    if (!r.why?.trim()) errors.push(`${r.id}: relation without "why"`);
  }
  for (const t of Object.keys(journal.statuses)) if (!ids.has(t)) errors.push(`status on missing ${t}`);
  for (const re of journal.reactions) if (!ids.has(re.target)) errors.push(`reaction ${re.id} on missing ${re.target}`);
  for (const t of Object.keys(journal.vinyl ?? {})) if (!ids.has(t)) errors.push(`vinyl on missing ${t}`);
  return errors;
}

// ---------------- store with localStorage overlay ----------------

const KEY = 'music-explorer/v1';

export interface UserData {
  entities: Entity[];
  relations: Relation[];
  journal: Journal;
  hypotheses: Hypothesis[];
  positions: Record<string, { x: number; y: number }>;
  covers?: Record<string, Cover>;
  appliedNotes?: string[];
}

/** Merge Arthur's later chat notes into the saved layer, once each, so his later edits in the app win. */
function applyNotes(d: UserData): boolean {
  const done = new Set(d.appliedNotes ?? []);
  let changed = false;
  for (const n of journalNotes) {
    if (done.has(n.id)) continue;
    const have = new Set(d.journal.reactions.map((r) => r.id));
    const add = n.reactions.filter((r) => !have.has(r.id)).map((r) => ({ ...r, date: n.date, origin: 'note' as const }));
    const drop = new Set(n.removeReactions ?? []);
    const statuses = { ...d.journal.statuses, ...n.statuses };
    for (const id of n.removeStatuses ?? []) delete statuses[id];
    d.journal = { ...d.journal, reactions: [...d.journal.reactions.filter((r) => !drop.has(r.id)), ...add], statuses,
      vinyl: { ...(d.journal.vinyl ?? {}), ...(n.vinyl ?? {}) } };
    if (n.addHypotheses) {
      const haveH = new Set(d.hypotheses.map((h) => h.id));
      d.hypotheses = [...d.hypotheses, ...n.addHypotheses.filter((h) => !haveH.has(h.id))];
    }
    if (n.hypothesisLinks) {
      d.hypotheses = d.hypotheses.map((h) => {
        const links = n.hypothesisLinks![h.id];
        return links ? { ...h, related: [...new Set([...h.related, ...links])] } : h;
      });
    }
    done.add(n.id);
    changed = true;
  }
  d.appliedNotes = [...done];
  return changed;
}

function emptyUser(): UserData {
  const d: UserData = {
    entities: [], relations: [],
    journal: structuredClone(briefJournal),
    hypotheses: structuredClone(baseHypotheses),
    positions: {},
  };
  applyNotes(d);
  return d;
}

function hydrate(saved: Partial<UserData>): UserData {
  const d: UserData = { ...emptyUser(), appliedNotes: [], ...saved };
  applyNotes(d);
  return d;
}

function load(): UserData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = hydrate(JSON.parse(raw));
      const json = JSON.stringify(d);
      if (json !== raw) localStorage.setItem(KEY, json);
      return d;
    }
  } catch { /* storage unavailable */ }
  return emptyUser();
}

// Durable storage: when the page runs as a claude.ai Artifact with the `db` capability,
// the whole personal layer lives in one document; localStorage is only a fast local cache.
type DocRef = { get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>; set(d: Record<string, unknown>): Promise<void> };
let remote: DocRef | null = null;
let remoteTimer: ReturnType<typeof setTimeout> | undefined;
let pending: string | null = null;
let writing = false;
async function flushRemote() {
  if (!remote || writing || pending === null) return;
  writing = true;
  const json = pending; pending = null;
  try { await remote.set({ json, savedAt: new Date().toISOString() }); } catch { /* keep local copy */ }
  writing = false;
  if (pending !== null) flushRemote();
}

function save(d: UserData) {
  const json = JSON.stringify(d);
  try { localStorage.setItem(KEY, json); } catch { /* storage unavailable */ }
  if (remote) { pending = json; clearTimeout(remoteTimer); remoteTimer = setTimeout(flushRemote, 800); }
}

export interface Snapshot {
  entities: Map<string, Entity>;
  relations: Relation[];
  journal: Journal;
  hypotheses: Hypothesis[];
  positions: Record<string, { x: number; y: number }>;
  covers: Record<string, Cover>;
  version: number;
}

type Listener = () => void;

class Repository {
  private user: UserData = load();
  private listeners = new Set<Listener>();
  private snap!: Snapshot;
  private version = 0;

  constructor() { this.rebuild(); this.connectRemote(); }

  /** 'local' until the artifact database answers; then 'cloud'. */
  storage: 'local' | 'cloud' = 'local';

  private async connectRemote() {
    let claude = (globalThis as { claude?: { use(n: string): Promise<unknown> } }).claude;
    for (let i = 0; i < 20 && !claude?.use; i++) {
      await new Promise((r) => setTimeout(r, 150));
      claude = (globalThis as { claude?: { use(n: string): Promise<unknown> } }).claude;
    }
    if (!claude?.use) return;
    try {
      const db = await claude.use('db') as { doc(p: string): DocRef } | null;
      if (!db) return;
      const ref = db.doc('state/main');
      const snap = await ref.get();
      remote = ref;
      this.storage = 'cloud';
      const raw = snap.exists ? snap.data()?.json : undefined;
      if (typeof raw === 'string') {
        this.user = hydrate(JSON.parse(raw));
        this.commit();
      } else {
        save(this.user); // first run: seed the database from the local copy / brief
        this.listeners.forEach((l) => l());
      }
    } catch { /* stay local */ }
  }

  private rebuild() {
    const all = [...canonEntities, ...this.user.entities];
    const entities = new Map(all.map((e) => [e.id, e]));
    const relations = [...canonRelations, ...deriveRelations(all), ...this.user.relations];
    this.snap = { entities, relations, journal: this.user.journal, hypotheses: this.user.hypotheses,
      positions: this.user.positions, covers: withTrackCovers(entities, { ...COVERS, ...(this.user.covers ?? {}) }), version: ++this.version };
  }

  private commit(structural = true) {
    save(this.user);
    if (structural) this.rebuild();
    else this.snap = { ...this.snap, journal: this.user.journal, positions: this.user.positions, version: ++this.version };
    this.listeners.forEach((l) => l());
  }

  subscribe = (l: Listener) => { this.listeners.add(l); return () => this.listeners.delete(l); };
  getSnapshot = () => this.snap;

  setStatus(id: string, status: Status | null) {
    const statuses = { ...this.user.journal.statuses };
    if (status) statuses[id] = status; else delete statuses[id];
    this.user.journal = { ...this.user.journal, statuses };
    this.commit(false);
  }

  addReaction(r: Omit<Reaction, 'id' | 'origin'>) {
    const reaction: Reaction = { ...r, id: `app-${Date.now().toString(36)}`, origin: 'app' };
    this.user.journal = { ...this.user.journal, reactions: [...this.user.journal.reactions, reaction] };
    this.commit(false);
  }

  removeReaction(id: string) {
    this.user.journal = { ...this.user.journal, reactions: this.user.journal.reactions.filter((r) => r.id !== id) };
    this.commit(false);
  }

  setNote(id: string, text: string) {
    const notes = { ...this.user.journal.notes };
    if (text.trim()) notes[id] = text; else delete notes[id];
    this.user.journal = { ...this.user.journal, notes };
    this.commit(false);
  }

  addEntity(e: Entity) { this.user.entities = [...this.user.entities, e]; this.commit(); }

  addRelation(r: Relation) { this.user.relations = [...this.user.relations, r]; this.commit(); }

  removeUserRelation(id: string) { this.user.relations = this.user.relations.filter((r) => r.id !== id); this.commit(); }

  savePositions(p: Record<string, { x: number; y: number }>) {
    this.user.positions = { ...this.user.positions, ...p };
    save(this.user);
  }

  setCover(id: string, cover: Cover | null) {
    const covers = { ...(this.user.covers ?? {}) };
    if (cover) covers[id] = cover; else delete covers[id];
    this.user.covers = covers;
    this.commit();
  }

  resetPositions() { this.user.positions = {}; this.commit(false); }

  exportJSON(): string {
    return JSON.stringify({ format: 'music-explorer', version: 1, exportedAt: new Date().toISOString(), ...this.user }, null, 2);
  }

  importJSON(text: string) {
    const parsed = JSON.parse(text);
    if (parsed.format !== 'music-explorer') throw new Error('Це не файл Music Explorer');
    const { entities = [], relations = [], journal, hypotheses, positions = {}, covers = {} } = parsed;
    this.user = hydrate({ entities, relations, journal: journal ?? emptyUser().journal, hypotheses: hypotheses ?? emptyUser().hypotheses,
      positions, covers, appliedNotes: parsed.appliedNotes ?? [] });
    this.commit();
  }

  resetAll() { this.user = emptyUser(); this.commit(); }
}

export const repo = new Repository();
