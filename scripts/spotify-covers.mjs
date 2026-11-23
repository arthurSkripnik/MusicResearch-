// Build data/spotify.json (links) and fetch missing covers into public/covers/ + data/covers.json from scripts/spotify-match.json.
// Only releases without a cover file are downloaded. Same proxy env as covers.mjs.
import fs from 'node:fs';
const m = JSON.parse(fs.readFileSync(new URL('./spotify-match.json', import.meta.url), 'utf8'));
const coversPath = new URL('../data/covers.json', import.meta.url);
const covers = JSON.parse(fs.readFileSync(coversPath, 'utf8'));
const links = {};
for (const [id, v] of Object.entries(m)) {
  links[id] = { kind: v.kind, spotifyId: v.spotifyId, link: v.link, title: v.title, artist: v.artist, date: v.date };
  if (!v.image || covers[id]) continue;
  const url = v.image.replace('ab67616d0000b273', 'ab67616d00001e02'); // 640 → 300 px variant
  const r = await fetch(url); if (!r.ok) { console.log('fail', id, r.status); continue; }
  const b = Buffer.from(await r.arrayBuffer());
  const file = `covers/${id.replace(/[^a-z0-9-]+/gi, '_')}.jpg`;
  fs.writeFileSync(new URL(`../public/${file}`, import.meta.url), b);
  covers[id] = { src: file, link: v.link, source: 'Spotify' };
  console.log('ok', id, b.length);
}
fs.writeFileSync(new URL('../data/spotify.json', import.meta.url), JSON.stringify(links, null, 1));
fs.writeFileSync(coversPath, JSON.stringify(covers, null, 1) + '\n');
