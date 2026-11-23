// One-off migration (2026-11-10): src/data/**/*.ts → data/*.json (one record per line, stable ids).
// Run from the project root: npx tsx tools/convert-ts-to-json.ts
import fs from 'node:fs';
import { genres } from '../src/data/canon/genres';
import { cities, scenes, events, concepts, labels } from '../src/data/canon/context';
import { artists } from '../src/data/canon/artists';
import { releases, tracks } from '../src/data/canon/releases';
import { relations } from '../src/data/canon/relations';
import { producerLayerEntities, producerRelations } from '../src/data/canon/producers';
import { weekEntities, weekRelations } from '../src/data/canon/week-2026-11-10';
import { briefJournal } from '../src/data/journal/brief-2026-11';
import { journalNotes } from '../src/data/journal/notes';
import { hypotheses } from '../src/data/lab/hypotheses';
import { writeArray, writeObject, relationId } from './lib';

const entities = [...genres, ...scenes, ...labels, ...artists, ...releases, ...tracks, ...cities, ...events, ...concepts,
  ...producerLayerEntities, ...weekEntities];
const byType: Record<string, unknown[]> = {};
for (const e of entities) (byType[e.type] ??= []).push(JSON.parse(JSON.stringify(e)));
fs.mkdirSync('data/entities', { recursive: true });
fs.mkdirSync('data/journal', { recursive: true });
for (const [t, list] of Object.entries(byType)) writeArray(`data/entities/${t}.json`, list);

const seen = new Set<string>();
const rels = [...relations, ...producerRelations, ...weekRelations].map((r) => {
  const base = relationId(r);
  let id = base, k = 2;
  while (seen.has(id)) id = `${base}~${k++}`;
  seen.add(id);
  return JSON.parse(JSON.stringify({ ...r, id }));
});
writeArray('data/relations.json', rels);

// Keep Arthur's verbatim quotes that lived in TS comments above each note.
const src = fs.readFileSync('src/data/journal/notes.ts', 'utf8');
const notes = journalNotes.map((n) => {
  const at = src.indexOf(`id: '${n.id}'`);
  const open = src.lastIndexOf('  {\n', at);
  const comment = src.slice(open + 4, at).split('\n').map((l) => l.trim()).filter((l) => l.startsWith('//'))
    .map((l) => l.replace(/^\/\/\s?/, '')).join(' ').trim();
  return JSON.parse(JSON.stringify(comment ? { id: n.id, date: n.date, source: comment, ...n } : n));
});
writeArray('data/journal/notes.json', notes);
writeObject('data/journal/brief-2026-11.json', JSON.parse(JSON.stringify(briefJournal)));
writeArray('data/hypotheses.json', JSON.parse(JSON.stringify(hypotheses)));
fs.renameSync('src/data/covers.json', 'data/covers.json');
fs.renameSync('src/data/spotify.json', 'data/spotify.json');
console.log('entities', entities.length, Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length])),
  'relations', rels.length, 'notes', notes.length);
