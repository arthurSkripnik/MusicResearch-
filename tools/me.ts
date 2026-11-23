// me — the one command for changing and shipping the map's data. Keeps the model out of whole files.
//
//   npx tsx tools/me.ts stats                      counts + pending inbox files
//   npx tsx tools/me.ts find <text> [--full]       compact card(s): entity + its relations
//   npx tsx tools/me.ts add '<json>' ['<json>'…]   add/patch records (same op format as the inbox, see below)
//   npx tsx tools/me.ts check                      validate everything
//   npx tsx tools/me.ts apply [--dry]              apply inbox/pending/*.jsonl, then move them to inbox/done/
//   npx tsx tools/me.ts release                    check + build; lists cover files to send with the Artifact publish
//   npx tsx tools/me.ts release --mark-published   record that those cover files are now published
//
// Op format (one JSON per line in inbox/pending/<date>-<topic>.jsonl; lines starting with # are comments):
//   {"op":"entity", "id":"artist:x", "type":"artist", "name":"X", "summary":"…", …}   new entity (confidence/author default)
//   {"op":"patch", "id":"release:y", "summary":"…", "attrs":{"styles":["style:dub"]}}  merge fields into an existing entity
//   {"op":"relation", "type":"influenced", "from":"genre:a", "to":"genre:b", "why":"…"}  id is derived: type:from>to
//   {"op":"unrelation", "id":"influenced:genre:a>genre:b"}                             remove a relation
//   {"op":"note", "id":"note-2026-11-10-x", "date":"2026-11-10", "source":"Arthur's words", "reactions":[…], "statuses":{…}}
//   {"op":"relation", …, "via":["artist:x","release:y"]}                              optional evidence (≤4 ids) for an influence
//   {"op":"bridge", "a":"genre:x", "b":"genre:y", "diff":"…", "pin":[…], "era":[1995,2003]}  note on a genre ⇄ genre bridge (upsert)
//   {"op":"hypothesis", "id":"hyp:x", "text":"…", "status":"open", "related":[…], "origin":"…"}
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { validate, deriveRelations } from '../src/lib/repository';
import type { Entity, Relation, JournalNote, Hypothesis, Journal, BridgeNote } from '../src/data/schema';
import { readJSON, writeArray, relationId } from './lib';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
process.chdir(ROOT);
const ENT_DIR = 'data/entities';
const PENDING = 'inbox/pending', DONE = 'inbox/done';
const PUBLISHED = 'tools/.published-covers.json';

// ---------- load ----------
const entityFiles = fs.readdirSync(ENT_DIR).filter((f) => f.endsWith('.json'));
const entities = new Map<string, Entity>();
const typeOf = new Map<string, string>(); // entity id → file type
for (const f of entityFiles) for (const e of readJSON<Entity[]>(`${ENT_DIR}/${f}`)) { entities.set(e.id, e); typeOf.set(e.id, f.slice(0, -5)); }
let relations = readJSON<Relation[]>('data/relations.json');
const notes = readJSON<JournalNote[]>('data/journal/notes.json');
const hypotheses = readJSON<Hypothesis[]>('data/hypotheses.json');
const brief = readJSON<Journal>('data/journal/brief-2026-11.json');
const bridges = readJSON<BridgeNote[]>('data/bridges.json');
const dirty = new Set<string>();

// ---------- checks ----------
function noteJournal(): Journal {
  return {
    statuses: Object.assign({}, ...notes.map((n) => n.statuses)),
    reactions: notes.flatMap((n) => n.reactions.map((r) => ({ ...r, date: n.date, origin: 'note' as const }))),
    notes: {}, vinyl: Object.assign({}, ...notes.map((n) => n.vinyl ?? {})),
  } as Journal;
}
function check(): string[] {
  const list = [...entities.values()];
  const all = [...relations, ...deriveRelations(list)];
  const errors = [...validate(list, all, brief), ...validate(list, [], noteJournal())];
  const ids = new Set(entities.keys());
  const relIds = new Set<string>();
  for (const r of relations) {
    if (relIds.has(r.id)) errors.push(`duplicate relation ${r.id}`); relIds.add(r.id);
    for (const v of r.via ?? []) if (!ids.has(v)) errors.push(`${r.id}: via missing ${v}`);
    if ((r.via?.length ?? 0) > 4) errors.push(`${r.id}: via has more than 4 ids`);
  }
  for (const b of bridges) {
    const want = `bridge:${[b.a, b.b].sort().join('~')}`;
    if (b.id !== want) errors.push(`${b.id}: id must be ${want}`);
    for (const x of [b.a, b.b, ...(b.pin ?? [])]) if (!ids.has(x)) errors.push(`${b.id}: missing ${x}`);
    if (entities.get(b.a)?.type !== 'genre' || entities.get(b.b)?.type !== 'genre') errors.push(`${b.id}: a and b must be genres/styles`);
  }
  for (const n of notes) for (const [h, links] of Object.entries(n.hypothesisLinks ?? {})) {
    if (!hypotheses.some((x) => x.id === h) && !notes.some((m) => m.addHypotheses?.some((x) => x.id === h))) errors.push(`${n.id}: unknown hypothesis ${h}`);
    for (const l of links) if (!ids.has(l)) errors.push(`${n.id}: hypothesis link to missing ${l}`);
  }
  for (const h of [...hypotheses, ...notes.flatMap((n) => n.addHypotheses ?? [])]) for (const l of h.related) if (!ids.has(l)) errors.push(`${h.id}: related missing ${l}`);
  for (const [id, t] of typeOf) if (!fs.existsSync(`${ENT_DIR}/${t}.json`))
    errors.push(`${id}: no file ${ENT_DIR}/${t}.json — add it to src/data/index.ts too`);
  return [...new Set(errors)];
}

// ---------- ops ----------
type Op = Record<string, any> & { op: string };
function applyOp(o: Op): string {
  const { op, ...rec } = o;
  switch (op) {
    case 'entity': {
      if (!rec.id || !rec.type || !rec.name) throw new Error('entity needs id, type, name');
      if (entities.has(rec.id)) throw new Error(`${rec.id} exists — use "patch"`);
      if (!rec.id.startsWith(rec.type + ':')) throw new Error(`${rec.id}: id must start with "${rec.type}:"`);
      const e = { confidence: 'established', author: 'claude', ...rec } as Entity;
      entities.set(e.id, e); typeOf.set(e.id, e.type); dirty.add(`e:${e.type}`);
      return `+ ${e.id}`;
    }
    case 'patch': {
      const e = entities.get(rec.id); if (!e) throw new Error(`patch: no ${rec.id}`);
      const { id, attrs, ...fields } = rec;
      const next = { ...e, ...fields, ...(attrs ? { attrs: { ...(e.attrs ?? {}), ...attrs } } : {}) } as Entity;
      for (const [k, v] of Object.entries(next)) if (v === null) delete (next as any)[k];
      for (const [k, v] of Object.entries(next.attrs ?? {})) if (v === null) delete (next.attrs as any)[k];
      entities.set(id, next); dirty.add(`e:${typeOf.get(id)}`);
      return `~ ${id} (${Object.keys({ ...fields, ...(attrs ?? {}) }).join(', ')})`;
    }
    case 'relation': {
      if (!rec.type || !rec.from || !rec.to || !rec.why) throw new Error('relation needs type, from, to, why');
      const id = rec.id ?? relationId(rec as Relation);
      if (relations.some((r) => r.id === id)) throw new Error(`relation ${id} exists`);
      relations.push({ confidence: 'established', author: 'claude', ...rec, id } as Relation); dirty.add('r');
      return `+ ${id}`;
    }
    case 'unrelation': {
      const before = relations.length; relations = relations.filter((r) => r.id !== rec.id);
      if (relations.length === before) throw new Error(`unrelation: no ${rec.id}`);
      dirty.add('r'); return `- ${rec.id}`;
    }
    case 'note': {
      if (notes.some((n) => n.id === rec.id)) throw new Error(`note ${rec.id} exists`);
      notes.push({ reactions: [], statuses: {}, ...rec } as JournalNote); dirty.add('n');
      return `+ ${rec.id} (${(rec.reactions ?? []).length} reactions, ${Object.keys(rec.statuses ?? {}).length} statuses)`;
    }
    case 'hypothesis': {
      const i = hypotheses.findIndex((h) => h.id === rec.id);
      if (i >= 0) hypotheses[i] = { ...hypotheses[i], ...rec } as Hypothesis; else hypotheses.push(rec as Hypothesis);
      dirty.add('h'); return `${i >= 0 ? '~' : '+'} ${rec.id}`;
    }
    case 'bridge': {
      if (!rec.a || !rec.b) throw new Error('bridge needs a, b');
      const id = `bridge:${[rec.a, rec.b].sort().join('~')}`;
      const i = bridges.findIndex((b) => b.id === id);
      const next = { ...(i >= 0 ? bridges[i] : {}), ...rec, id } as BridgeNote;
      if (i >= 0) bridges[i] = next; else bridges.push(next);
      dirty.add('b'); return `${i >= 0 ? '~' : '+'} ${id}`;
    }
    default: throw new Error(`unknown op "${op}"`);
  }
}
function save() {
  const byType: Record<string, Entity[]> = {};
  for (const [id, e] of entities) (byType[typeOf.get(id)!] ??= []).push(e);
  for (const d of dirty) {
    if (d.startsWith('e:')) { const t = d.slice(2); writeArray(`${ENT_DIR}/${t}.json`, byType[t] ?? []); }
    if (d === 'r') writeArray('data/relations.json', relations);
    if (d === 'n') writeArray('data/journal/notes.json', notes);
    if (d === 'h') writeArray('data/hypotheses.json', hypotheses);
    if (d === 'b') writeArray('data/bridges.json', bridges);
  }
}
function parseLines(text: string, where: string): Op[] {
  return text.split('\n').map((l, i) => [l.trim(), i + 1] as const).filter(([l]) => l && !l.startsWith('#') && !l.startsWith('//'))
    .map(([l, n]) => { try { return JSON.parse(l); } catch { throw new Error(`${where}:${n}: not valid JSON`); } });
}
function runOps(ops: { op: Op; where: string }[]): { log: string[]; errors: string[] } {
  const log: string[] = [], errors: string[] = [];
  for (const { op, where } of ops) { try { log.push(applyOp(op)); } catch (e) { errors.push(`${where}: ${(e as Error).message}`); } }
  return { log, errors: [...errors, ...check()] };
}

// ---------- commands ----------
const [cmd, ...args] = process.argv.slice(2);
const short = (s?: string, n = 110) => (s && s.length > n ? s.slice(0, n) + '…' : s ?? '');

if (cmd === 'stats') {
  const byType: Record<string, number> = {};
  for (const t of typeOf.values()) byType[t] = (byType[t] ?? 0) + 1;
  const pending = fs.existsSync(PENDING) ? fs.readdirSync(PENDING).filter((f) => f.endsWith('.jsonl')) : [];
  console.log('entities', entities.size, byType);
  console.log('relations', relations.length, '| notes', notes.length, '| hypotheses', hypotheses.length);
  console.log('pending inbox:', pending.length ? pending.join(', ') : 'none');
} else if (cmd === 'find') {
  const full = args.includes('--full');
  const q = args.filter((a) => a !== '--full').join(' ').toLowerCase();
  if (!q) { console.error('find <text>'); process.exit(1); }
  const hits = [...entities.values()].filter((e) => e.id.toLowerCase().includes(q) || e.name.toLowerCase().includes(q)
    || (e.aliases ?? []).some((a) => a.toLowerCase().includes(q)));
  if (!hits.length) console.log('no match');
  for (const e of hits.slice(0, 8)) {
    const { id, type, name, summary, ...rest } = e;
    console.log(`${id} · ${name}${e.years?.from ? ` · ${e.years.from}` : ''}`);
    console.log(`  ${full ? summary ?? '' : short(summary)}`);
    if (full) console.log('  ' + JSON.stringify(rest));
    const rels = relations.filter((r) => r.from === id || r.to === id);
    for (const r of rels.slice(0, full ? 999 : 12)) console.log(`  ${r.from === id ? '→' : '←'} ${r.type} ${r.from === id ? r.to : r.from}${full ? ` — ${r.why}` : ''}`);
    if (!full && rels.length > 12) console.log(`  … ${rels.length - 12} more (--full)`);
  }
  if (hits.length > 8) console.log(`… ${hits.length - 8} more matches, narrow the query`);
} else if (cmd === 'add') {
  const { log, errors } = runOps(args.flatMap((a, i) => parseLines(a, `arg${i + 1}`).map((op) => ({ op, where: `arg${i + 1}` }))));
  if (errors.length) { console.error(errors.join('\n')); console.error('nothing written'); process.exit(1); }
  save(); console.log(log.join('\n')); console.log('OK');
} else if (cmd === 'check') {
  const errors = check();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log(`OK · ${entities.size} entities · ${relations.length} relations · ${notes.length} notes`);
} else if (cmd === 'apply') {
  const dry = args.includes('--dry');
  const files = fs.existsSync(PENDING) ? fs.readdirSync(PENDING).filter((f) => f.endsWith('.jsonl')).sort() : [];
  if (!files.length) { console.log('nothing pending'); process.exit(0); }
  const ops: { op: Op; where: string }[] = [];
  const parseErrors: string[] = [];
  for (const f of files) {
    try { ops.push(...parseLines(fs.readFileSync(`${PENDING}/${f}`, 'utf8'), f).map((op, i) => ({ op, where: `${f}#${i + 1}` }))); }
    catch (e) { parseErrors.push((e as Error).message); }
  }
  const { log, errors } = runOps(ops);
  console.log(`${files.length} files, ${ops.length} ops`);
  console.log(log.join('\n'));
  const all = [...parseErrors, ...errors];
  if (all.length) { console.error('ERRORS (nothing written):\n' + all.join('\n')); process.exit(1); }
  if (dry) { console.log('dry run OK, nothing written'); process.exit(0); }
  save();
  fs.mkdirSync(DONE, { recursive: true });
  for (const f of files) {
    // Never overwrite an earlier applied file that reused the same name.
    let to = `${DONE}/${f}`, k = 2;
    while (fs.existsSync(to)) to = `${DONE}/${f.replace(/\.jsonl$/, '')}~${k++}.jsonl`;
    fs.renameSync(`${PENDING}/${f}`, to);
  }
  console.log(`applied, moved ${files.length} files to ${DONE}/`);
} else if (cmd === 'release') {
  const published: string[] = fs.existsSync(PUBLISHED) ? readJSON(PUBLISHED) : [];
  const covers = fs.readdirSync('public/covers').map((f) => `covers/${f}`);
  const fresh = covers.filter((c) => !published.includes(c));
  if (args.includes('--mark-published')) {
    fs.writeFileSync(PUBLISHED, JSON.stringify(covers.sort(), null, 1) + '\n');
    console.log(`recorded ${covers.length} published cover files`); process.exit(0);
  }
  const errors = check();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  execSync('npx tsc --noEmit && npx vite build --logLevel error', { stdio: 'inherit' });
  const kb = Math.round(fs.statSync('dist/index.html').size / 1024);
  console.log(`built dist/index.html (${kb} KB). Publish it by path with the Artifact tool — never read it or the live page.`);
  if (fresh.length) {
    const map = Object.fromEntries(fresh.map((c) => [c, `${ROOT}/dist/${c}`]));
    console.log(`${fresh.length} new cover files — pass as Artifact "files", then run: release --mark-published`);
    console.log(JSON.stringify(map));
  } else console.log('no new cover files');
} else {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).join('\n'));
}
