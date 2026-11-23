// Match canon releases/tracks to Spotify. Uses the access token kept by spotify/spotify.mjs
// (run `node spotify.mjs me` first to refresh it). Writes scripts/spotify-match.json for review.
// Usage: node scripts/spotify-match.mjs <items.json> <state.json>
import fs from 'node:fs';
const items = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const { access } = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, '').replace(/\(.*?\)|\[.*?\]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const reissue = /remaster|anniversary|deluxe|expanded|edition|mix\/master|reissue|live/i;
async function search(type, q) {
  const r = await fetch(`https://api.spotify.com/v1/search?type=${type}&limit=10&q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${access}` } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return (await r.json())[type + 's'].items.filter(Boolean);
}
function score(it, x, type) {
  const artists = it.artists.map((a) => norm(a.name));
  const a = norm(x.artist), n = norm(x.name), title = norm(it.name);
  let s = 0;
  if (artists.some((v) => v === a)) s += 5; else if (artists.some((v) => v.includes(a) || a.includes(v))) s += 3;
  if (title === n) s += 5; else if (title.startsWith(n) || n.startsWith(title)) s += 3;
  if (type === 'album') {
    const y = parseInt(it.release_date);
    if (x.year && y === x.year) s += 2; else if (x.year && Math.abs(y - x.year) <= 1) s += 1;
    if (reissue.test(it.name)) s -= 1;
    if (it.album_type === 'album') s += 1;
  } else if (reissue.test(it.name)) s -= 1;
  return s;
}
const out = {};
for (const x of items) {
  const type = x.kind;
  let res = await search(type, `${type === 'album' ? 'album' : 'track'}:${x.name} artist:${x.artist}`);
  if (!res.length) res = await search(type, `${x.artist} ${x.name}`);
  const best = res.map((it) => ({ it, s: score(it, x, type) })).sort((p, q) => q.s - p.s)[0];
  if (!best || best.s < 8) { console.log('NO ', x.id, best ? `${best.s} ${best.it.artists[0].name} — ${best.it.name}` : ''); continue; }
  const it = best.it, alb = type === 'album' ? it : it.album;
  out[x.id] = { kind: type, spotifyId: it.id, uri: it.uri, link: it.external_urls.spotify, title: it.name,
    artist: it.artists.map((a) => a.name).join(', '), date: alb.release_date, image: alb.images?.[0]?.url, score: best.s };
  console.log('OK ', x.id, best.s, `${out[x.id].artist} — ${it.name} (${alb.release_date})`);
  await new Promise((r) => setTimeout(r, 120));
}
fs.writeFileSync(new URL('./spotify-match.json', import.meta.url), JSON.stringify(out, null, 2));
