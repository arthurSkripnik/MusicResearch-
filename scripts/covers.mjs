// Fetch album covers from Deezer (open search API, no login) for every release in the canon.
// node scripts/covers.mjs search <releases.json>  → scripts/covers-match.json (review the matches)
// node scripts/covers.mjs download                → public/covers/<id>.jpg + data/covers.json (release id → file + source link); skips ids that already have a cover
// Run with NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt in the cloud session.
import fs from 'node:fs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(q) {
  const r = await fetch('https://api.deezer.com/search/album?limit=15&q=' + encodeURIComponent(q));
  const j = await r.json(); if (j.error) throw new Error(JSON.stringify(j.error)); return j.data ?? [];
}
const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const [cmd] = process.argv.slice(2);
if (cmd === 'search') {
  const releases = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  const out = {};
  for (const r of releases) {
    let items = await api(`artist:"${r.artist}" album:"${r.name.replace(/[…]/g, '')}"`);
    if (!items.length) items = await api(`${r.artist} ${r.name.replace(/[…]/g, '')}`);
    await sleep(150);
    const score = (a) => {
      let s = 0; const ar = norm(a.artist?.name ?? ''), ra = norm(r.artist);
      if (ar === ra) s += 5; else if (ar.includes(ra) || ra.includes(ar)) s += 3;
      const an = norm(a.title), rn = norm(r.name);
      if (an === rn) s += 4; else if (an.startsWith(rn)) s += 3; else if (an.includes(rn)) s += 1;
      if (/live|remix|instrumental|karaoke|tribute|8 ?bit|lullaby/.test(an) && !/live|remix/.test(rn)) s -= 4;
      if (/deluxe|remaster|anniversary|expanded/.test(an)) s -= 0.5;
      return s;
    };
    const best = items.map((a) => [a, score(a)]).sort((x, y) => y[1] - x[1])[0];
    if (best && best[1] >= 7) {
      const a = best[0];
      out[r.id] = { link: a.link, title: a.title, artist: a.artist.name, image: a.cover_big, score: best[1] };
      console.log(r.id, `${a.artist.name} — ${a.title} s${best[1]}`);
    } else {
      out[r.id] = { miss: true, best: best ? `${best[0].artist?.name} — ${best[0].title} s${best[1]}` : null };
      console.log(r.id, 'MISS', out[r.id].best);
    }
  }
  fs.writeFileSync(new URL('./covers-match.json', import.meta.url), JSON.stringify(out, null, 2));
}
if (cmd === 'download') {
  const m = JSON.parse(fs.readFileSync(new URL('./covers-match.json', import.meta.url), 'utf8'));
  const coversPath = new URL('../data/covers.json', import.meta.url);
  const out = JSON.parse(fs.readFileSync(coversPath, 'utf8'));
  for (const [id, v] of Object.entries(m)) {
    if (v.miss || !v.image || out[id]) continue;
    const url = v.image.replace(/\/\d+x\d+-/, '/320x320-');
    const r = await fetch(url); if (!r.ok) { console.log('fail', id, r.status); continue; }
    const b = Buffer.from(await r.arrayBuffer());
    const file = `covers/${id.replace(/[^a-z0-9-]+/gi, '_')}.jpg`;
    fs.writeFileSync(new URL(`../public/${file}`, import.meta.url), b);
    out[id] = { src: file, link: v.link, source: 'Deezer' };
    console.log('ok', id, b.length);
  }
  fs.writeFileSync(coversPath, JSON.stringify(out, null, 1) + '\n');
}
