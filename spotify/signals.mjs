#!/usr/bin/env node
// Artist signals for the nightly intake (Arthur's idea, 2026-11-11): artists Arthur keeps coming back to.
//   node signals.mjs            → candidates: ≥5 liked tracks all-time (07.11 snapshot + later likes)
//                                 or ≥3 tracks added in the last 14 days (likes or ➕ Дослідити)
// Offline: reads ../sandbox-liked/liked-2026-11-07.json and intake-log.jsonl, no Spotify calls.
// Each artist is reported again only when a count grows (state in signals-shown.json).
// The routine itself drops artists that already have a thread of their own (compare with list_threads titles).
import fs from 'node:fs';
const here = (p) => new URL(p, import.meta.url);
const snap = JSON.parse(fs.readFileSync(here('../sandbox-liked/liked-2026-11-07.json'), 'utf8'));
const log = fs.readFileSync(here('./intake-log.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const parse = (line) => { const [who, rest] = line.split(' — '); return { artists: who.split(', ').map((s) => s.trim()), name: (rest ?? '').split(' (альбом')[0] }; };
const likes = new Map(); // uri → {artists, name, at}
for (const t of snap) likes.set(t.uri, { artists: t.artists, name: t.name, at: t.added });
const recent = new Map();
const cutoff = new Date(Date.now() - 14 * 864e5).toISOString();
for (const x of log) {
  const p = parse(x.line);
  if (x.kind === 'like' && !likes.has(x.uri)) likes.set(x.uri, { ...p, at: x.at });
  if ((x.kind === 'like' || x.kind === 'intake') && x.at >= cutoff) recent.set(x.uri, p);
}
for (const [u, t] of likes) if (t.at >= cutoff) recent.set(u, { artists: t.artists, name: t.name });
const count = (m) => { const c = new Map(); for (const t of m.values()) for (const a of new Set(t.artists)) { const e = c.get(a) ?? []; e.push(t.name); c.set(a, e); } return c; };
const all = count(likes), rec = count(recent);
const shownFile = here('./signals-shown.json');
const shown = fs.existsSync(shownFile) ? JSON.parse(fs.readFileSync(shownFile, 'utf8')) : {};
const out = [];
for (const a of new Set([...all.keys(), ...rec.keys()])) {
  const n = all.get(a)?.length ?? 0, r = rec.get(a)?.length ?? 0;
  if (n < 5 && r < 3) continue;
  const prev = shown[a]; if (prev && prev.all >= n && prev.recent >= r) continue;
  out.push({ a, n, r, tracks: [...new Set([...(rec.get(a) ?? []), ...(all.get(a) ?? [])])].slice(0, 6) });
  shown[a] = { all: n, recent: r, at: new Date().toISOString() };
}
out.sort((x, y) => y.r - x.r || y.n - x.n);
for (const o of out) console.log(`- ${o.a}: ${o.n} у лайках, ${o.r} за 14 днів · ${o.tracks.join('; ')}`);
console.log(`SIGNALS: ${out.length}`);
if (!process.argv.includes('--dry')) fs.writeFileSync(shownFile, JSON.stringify(shown, null, 1));
