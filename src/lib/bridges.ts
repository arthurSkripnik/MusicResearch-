// Genre ⇄ genre bridges: influence both ways + "what they share", derived from the relations already on the map.
// Nothing here is stored except the optional BridgeNote (data/bridges.json): new facts show up in bridges by themselves.
import type { BridgeNote, Confidence, Entity, Relation } from '../data/schema';
import { bridgeNotes } from '../data';
import type { Snapshot } from './repository';

const PEOPLE_REL = new Set(['collaborated', 'member_of', 'produced', 'mixed', 'founded']);
const INFLUENCE = new Set(['influenced', 'emerged_from', 'shares_trait', 'sounds_akin']);
const RANK: Confidence[] = ['established', 'likely', 'disputed', 'unverified'];
const weakest = (cs: Confidence[]): Confidence => cs.reduce((w, c) => (RANK.indexOf(c) > RANK.indexOf(w) ? c : w), 'established' as Confidence);

export const bridgeId = (a: string, b: string) => { const [x, y] = [a, b].sort(); return `bridge:${x}~${y}`; };
const NOTES = new Map(bridgeNotes.map((n) => [n.id, n]));

export interface Flow { rel: Relation; via: string[] }
export interface Item { id: string; score: number; confidence: Confidence }
export interface Bridge {
  a: Entity; b: Entity;
  ab: Flow[]; ba: Flow[]; alike: Flow[];          // a→b, b→a, similarity without direction
  people: Item[]; scenes: Item[]; releases: Item[]; concepts: Item[]; roots: Item[];
  era?: [number, number];
  likes: string[];
  note?: BridgeNote;
  edges: string[];                                // relation ids to light up on the map
}

// ---------- index, built once per snapshot ----------
interface Index {
  snap: Snapshot;
  adj: Map<string, Relation[]>;
  side: Map<string, Set<string>>;   // genre/style id → its genres, artists, releases, tracks
  styles: Map<string, string[]>;    // broad genre → its styles
}
let cache: Index | null = null;

function index(snap: Snapshot): Index {
  if (cache?.snap === snap) return cache;
  const adj = new Map<string, Relation[]>();
  for (const r of snap.relations) {
    (adj.get(r.from) ?? adj.set(r.from, []).get(r.from)!).push(r);
    (adj.get(r.to) ?? adj.set(r.to, []).get(r.to)!).push(r);
  }
  const genres = [...snap.entities.values()].filter((e) => e.type === 'genre');
  const styles = new Map<string, string[]>();
  for (const g of genres) for (const p of g.attrs?.genres ?? []) (styles.get(p) ?? styles.set(p, []).get(p)!).push(g.id);
  const side = new Map<string, Set<string>>();
  for (const g of genres) {
    const own = new Set([g.id, ...(styles.get(g.id) ?? [])]);
    const s = new Set(own);
    for (const gid of own) for (const r of adj.get(gid) ?? []) {
      if (r.type === 'in_genre' && r.to === gid) s.add(r.from);              // artists, releases
    }
    for (const e of snap.entities.values()) {                                 // releases/tracks of those artists
      const owner = e.attrs?.artist ?? (e.attrs?.release ? snap.entities.get(e.attrs.release)?.attrs?.artist : undefined);
      if ((e.type === 'release' || e.type === 'track') && owner && s.has(owner)) s.add(e.id);
      if (e.type === 'track' && e.attrs?.release && s.has(e.attrs.release)) s.add(e.id);
    }
    side.set(g.id, s);
  }
  cache = { snap, adj, side, styles };
  return cache;
}

const other = (r: Relation, id: string) => (r.from === id ? r.to : r.from);

/** Genres an entity reaches: its own sides + the sides of people/records it is tied to. */
function reach(ix: Index, id: string, rels: Set<string>): Map<string, Relation[]> {
  const out = new Map<string, Relation[]>();
  for (const [g, s] of ix.side) {
    if (s.has(id)) out.set(g, []);
    for (const r of ix.adj.get(id) ?? []) if (rels.has(r.type) && s.has(other(r, id))) (out.get(g) ?? out.set(g, []).get(g)!).push(r);
  }
  return out;
}

/** Ancestors through influence: x influenced g, or g emerged from x. */
function ancestors(ix: Index, g: string): Map<string, Relation> {
  const out = new Map<string, Relation>();
  for (const gid of [g, ...(ix.styles.get(g) ?? [])]) for (const r of ix.adj.get(gid) ?? []) {
    if (r.type === 'influenced' && r.to === gid && ix.snap.entities.get(r.from)?.type === 'genre') out.set(r.from, r);
    if (r.type === 'emerged_from' && r.from === gid && ix.snap.entities.get(r.to)?.type === 'genre') out.set(r.to, r);
  }
  return out;
}

export function isParentLink(snap: Snapshot, a: string, b: string): boolean {
  const ea = snap.entities.get(a), eb = snap.entities.get(b);
  return !!(ea?.attrs?.genres?.includes(b) || eb?.attrs?.genres?.includes(a));
}

export function computeBridge(snap: Snapshot, a: string, b: string): Bridge | null {
  const ea = snap.entities.get(a), eb = snap.entities.get(b);
  if (!ea || !eb || ea.type !== 'genre' || eb.type !== 'genre' || a === b) return null;
  const ix = index(snap);
  const famA = new Set([a, ...(ix.styles.get(a) ?? [])]), famB = new Set([b, ...(ix.styles.get(b) ?? [])]);
  const sideA = ix.side.get(a)!, sideB = ix.side.get(b)!;

  // directions
  const ab: Flow[] = [], ba: Flow[] = [], alike: Flow[] = [], edges: string[] = [];
  for (const r of snap.relations) {
    if (!INFLUENCE.has(r.type)) continue;
    const fA = famA.has(r.from), tA = famA.has(r.to), fB = famB.has(r.from), tB = famB.has(r.to);
    if (!((fA && tB) || (fB && tA))) continue;
    const alikeType = r.type === 'shares_trait' || r.type === 'sounds_akin';
    if (alikeType && !([r.from, r.to].includes(a) && [r.from, r.to].includes(b))) continue;
    edges.push(r.id);
    const flow = { rel: r, via: (r.via ?? []).filter((v) => snap.entities.has(v)) };
    if (r.type === 'shares_trait' || r.type === 'sounds_akin') alike.push(flow);
    else if ((r.type === 'influenced' && fA) || (r.type === 'emerged_from' && fB)) ab.push(flow);
    else ba.push(flow);
  }

  // people: artists / producers that touch both sides
  const people: Item[] = [];
  for (const e of snap.entities.values()) {
    if (e.type !== 'artist' && e.type !== 'producer') continue;
    const ra = reach(ix, e.id, PEOPLE_REL);
    const hitA = [...ra.keys()].some((g) => famA.has(g) || g === a), hitB = [...ra.keys()].some((g) => famB.has(g) || g === b);
    if (!(hitA && hitB)) continue;
    const used = [...ra.entries()].filter(([g]) => g === a || g === b).flatMap(([, rs]) => rs);
    const both = sideA.has(e.id) && sideB.has(e.id);
    people.push({ id: e.id, score: used.length + (sideA.has(e.id) || sideB.has(e.id) ? 2 : 0) + (both ? 2 : 0),
      confidence: weakest([e.confidence, ...used.map((r) => r.confidence)]) });
  }

  // scenes with members (or genres) on both sides
  const scenes: Item[] = [];
  for (const e of snap.entities.values()) {
    if (e.type !== 'scene') continue;
    const rels = ix.adj.get(e.id) ?? [];
    const mem = rels.filter((r) => r.type === 'part_of_scene' || r.type === 'scene_genre').map((r) => other(r, e.id));
    const inA = mem.filter((m) => sideA.has(m)), inB = mem.filter((m) => sideB.has(m));
    if (inA.length && inB.length) scenes.push({ id: e.id, score: inA.length + inB.length, confidence: e.confidence });
  }

  // records on one side that people from the other side worked on (or that sit in both)
  const releases: Item[] = [];
  const peopleIds = new Set(people.map((p) => p.id));
  for (const e of snap.entities.values()) {
    if (e.type !== 'release') continue;
    const inA = sideA.has(e.id), inB = sideB.has(e.id);
    if (!inA && !inB) continue;
    const otherSide = inA ? sideB : sideA;
    const direct = (ix.adj.get(e.id) ?? []).filter((r) => (r.type === 'produced' || r.type === 'mixed') && otherSide.has(other(r, e.id)));
    const owner = e.attrs?.artist;
    const collab = owner ? (ix.adj.get(owner) ?? []).filter((r) => r.type === 'collaborated' && otherSide.has(other(r, owner))) : [];
    const score = (inA && inB ? 3 : 0) + direct.length * 2 + (collab.length ? 1 : 0)
      + (owner && peopleIds.has(owner) ? 1 : 0);
    if (score >= 2 || (inA && inB)) releases.push({ id: e.id, score, confidence: weakest([e.confidence, ...direct.map((r) => r.confidence), ...collab.map((r) => r.confidence)]) });
  }

  // techniques / sounds both sides demonstrate
  const conceptsOf = (fam: Set<string>, s: Set<string>) => {
    const out = new Map<string, Relation[]>();
    for (const id of new Set([...fam, ...s])) for (const r of ix.adj.get(id) ?? []) {
      if ((r.type === 'demonstrates' || r.type === 'shares_trait') && r.from === id && snap.entities.get(r.to)?.type === 'concept')
        (out.get(r.to) ?? out.set(r.to, []).get(r.to)!).push(r);
    }
    return out;
  };
  const cA = conceptsOf(famA, sideA), cB = conceptsOf(famB, sideB);
  const concepts: Item[] = [...cA.keys()].filter((c) => cB.has(c)).map((c) => {
    const rs = [...cA.get(c)!, ...cB.get(c)!];
    return { id: c, score: rs.length, confidence: weakest(rs.map((r) => r.confidence)) };
  });

  // common roots
  const anA = ancestors(ix, a), anB = ancestors(ix, b);
  const roots: Item[] = [...anA.keys()].filter((g) => anB.has(g) && g !== a && g !== b).map((g) => ({
    id: g, score: 1, confidence: weakest([anA.get(g)!.confidence, anB.get(g)!.confidence]),
  }));

  const note = NOTES.get(bridgeId(a, b));
  const sort = (xs: Item[]) => {
    const pin = note?.pin ?? [];
    return xs.sort((x, y) => (pin.includes(y.id) ? 1 : 0) - (pin.includes(x.id) ? 1 : 0) || y.score - x.score
      || (snap.entities.get(x.id)?.name ?? '').localeCompare(snap.entities.get(y.id)?.name ?? ''));
  };
  // via ids are evidence too: make sure they appear in their group
  for (const id of [...ab, ...ba].flatMap((f) => f.via)) {
    const e = snap.entities.get(id)!;
    const list = e.type === 'release' ? releases : e.type === 'concept' ? concepts : e.type === 'scene' ? scenes
      : e.type === 'artist' || e.type === 'producer' ? people : null;
    if (list && !list.some((x) => x.id === id)) list.push({ id, score: 1, confidence: e.confidence });
  }

  const years = releases.map((r) => snap.entities.get(r.id)?.years?.from).filter((y): y is number => !!y).sort();
  const era: [number, number] | undefined = note?.era ?? (years.length ? [years[0], years[years.length - 1]] : undefined);

  const touched = new Set([...people, ...releases].map((x) => x.id));
  for (const e of snap.entities.values()) if (e.type === 'track' && (touched.has(e.attrs?.release ?? '') || touched.has(e.attrs?.artist ?? ''))) touched.add(e.id);
  const likes = [...touched].filter((id) => snap.journal.statuses[id] || snap.journal.reactions.some((r) => r.target === id))
    .filter((id) => { const t = snap.entities.get(id)?.type; return t === 'release' || t === 'track'; });

  return { a: ea, b: eb, ab, ba, alike, people: sort(people), scenes: sort(scenes), releases: sort(releases),
    concepts: sort(concepts), roots: sort(roots), era, likes, note, edges };
}

/** How much a pair shares without counting directions: used for edge weight and hidden bridges. */
export function bridgeWeight(br: Bridge): number {
  return br.people.length + br.scenes.length + br.releases.length + br.concepts.length;
}

/** Style pairs with no direct influence link but ≥3 shared people / scenes / records. Shown as thin dashed edges. */
export function hiddenBridges(snap: Snapshot, min = 3, max = 14): { a: string; b: string; weight: number }[] {
  const ix = index(snap);
  const styles = [...snap.entities.values()].filter((e) => e.type === 'genre' && e.attrs?.level !== 'genre').map((e) => e.id);
  const linked = new Set<string>();
  for (const r of snap.relations) {
    if (snap.entities.get(r.from)?.type === 'genre' && snap.entities.get(r.to)?.type === 'genre') linked.add(bridgeId(r.from, r.to));
  }
  // cheap pre-count: entities that sit on both sides
  const count = new Map<string, number>();
  for (const e of snap.entities.values()) {
    if (e.type !== 'artist' && e.type !== 'producer' && e.type !== 'scene' && e.type !== 'release') continue;
    const gs = [...reach(ix, e.id, e.type === 'scene' ? new Set(['part_of_scene', 'scene_genre']) : PEOPLE_REL).keys()].filter((g) => styles.includes(g));
    for (let i = 0; i < gs.length; i++) for (let j = i + 1; j < gs.length; j++) {
      const k = bridgeId(gs[i], gs[j]); count.set(k, (count.get(k) ?? 0) + 1);
    }
  }
  return [...count.entries()].filter(([k, n]) => n >= min && !linked.has(k))
    .map(([k, n]) => { const [a, b] = k.slice(7).split('~'); return { a, b, weight: n }; })
    .filter(({ a, b }) => !isParentLink(snap, a, b))
    .sort((x, y) => y.weight - x.weight).slice(0, max);
}
