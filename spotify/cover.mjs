#!/usr/bin/env node
// Playlist cover in the Music Explorer map style.
//   node cover.mjs covers/<spec>.json covers/<out>.jpg
// Spec: { "title": "Explorer · …", "center": "trip-hop",
//         "groups": [ { "node": "downtempo", "kind": "genre|scene|label", "artists": ["Nightmares on Wax"] } ],
//         "links": [["drum & bass","Bristol"]]   // optional extra dashed links between group nodes
//       }
// Keep it to 3–6 groups: the cover is shown small, the shape matters more than the labels.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const [specPath, outPath] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const W = 640, cx = 320, cy = 282;
// Bright theme: one hue per playlist (spec.hue, else derived from the title), so the series is recognisable in a list.
let h = spec.hue; if (h === undefined) { h = 0; for (const ch of spec.title) h = (h * 31 + ch.charCodeAt(0)) % 360; }
const dark = `hsl(${h} 55% 22%)`;
const n = spec.groups.length;
const pos = {};
const shadow = 'paint-order="stroke" stroke="rgba(0,0,0,.35)" stroke-width="3"';
let edges = '', nodes = '', outer = '', labels = '';
spec.groups.forEach((g, i) => {
  const a = -Math.PI / 2 - Math.PI / n + (i * 2 * Math.PI) / n;
  const r = 172, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
  pos[g.node] = { x, y };
  const kind = g.kind ?? 'genre';
  const rad = Math.max(34, Math.min(54, 8 + g.node.length * 4.9));
  const fs_ = Math.min(19, Math.floor((rad * 2 - 6) / (g.node.length * 0.5)));
  edges += `<path d="M${cx} ${cy} Q${(cx + x) / 2 + 30 * Math.sin(a)} ${(cy + y) / 2 - 30 * Math.cos(a)} ${x} ${y}" stroke="#fff" stroke-opacity=".75" stroke-width="3" fill="none"/>`;
  if (kind === 'scene') nodes += `<circle cx="${x}" cy="${y}" r="${rad}" fill="#fff" fill-opacity=".12" stroke="#fff" stroke-width="2.5" stroke-dasharray="6 5"/>` +
    `<text x="${x}" y="${y + 6}" font-family="Fraunces" font-style="italic" font-weight="600" font-size="${fs_}" fill="#fff" text-anchor="middle">${esc(g.node)}</text>`;
  else if (kind === 'label') nodes += `<circle cx="${x}" cy="${y}" r="${rad}" fill="#1b1f3a" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>` +
    `<text x="${x}" y="${y + 6}" font-family="Fraunces" font-weight="600" font-size="${fs_}" fill="#fff" text-anchor="middle">${esc(g.node)}</text>`;
  else nodes += `<circle cx="${x}" cy="${y}" r="${rad}" fill="#fffaf0"/>` +
    `<text x="${x}" y="${y + 6}" font-family="Fraunces" font-weight="600" font-size="${fs_}" fill="${dark}" text-anchor="middle">${esc(g.node)}</text>`;
  (g.artists ?? []).slice(0, 3).forEach((ar, j, arr) => {
    const spread = (j - (arr.length - 1) / 2) * 0.32;
    const ax = cx + 250 * Math.cos(a + spread), ay = Math.min(522, cy + 250 * Math.sin(a + spread)); // keep clear of the legend band
    const ang = Math.atan2(ay - y, ax - x);
    outer += `<line x1="${x + rad * Math.cos(ang)}" y1="${y + rad * Math.sin(ang)}" x2="${ax}" y2="${ay}" stroke="#fff" stroke-opacity=".6" stroke-width="1.6"/><circle cx="${ax}" cy="${ay}" r="8" fill="#ffd84d" stroke="${dark}" stroke-width="2"/>`;
    const tw = ar.length * 8.6, side = ax < cx - 30 ? -1 : ax > cx + 30 ? 1 : 0;
    let tx, ty, anchor;
    if (side === -1 && ax - 13 - tw >= 8) { tx = ax - 13; ty = ay + 5; anchor = 'end'; }
    else if (side === 1 && ax + 13 + tw <= W - 8) { tx = ax + 13; ty = ay + 5; anchor = 'start'; }
    else if (side === 0 && ax + 13 + tw <= W - 8) { tx = ax + 13; ty = ay + 5; anchor = 'start'; }
    else { tx = Math.min(W - 8 - tw / 2, Math.max(8 + tw / 2, ax)); ty = ay + (ay > cy ? 27 : -16); anchor = 'middle'; }
    labels += `<text x="${tx}" y="${ty}" font-family="IBM Plex Sans" font-weight="500" font-size="15" fill="#fff" text-anchor="${anchor}" ${shadow}>${esc(ar)}</text>`;
  });
});
for (const [a, b] of spec.links ?? []) if (pos[a] && pos[b])
  edges += `<line x1="${pos[a].x}" y1="${pos[a].y}" x2="${pos[b].x}" y2="${pos[b].y}" stroke="#fff" stroke-opacity=".8" stroke-dasharray="6 6" stroke-width="2"/>`;
const cr = Math.max(56, Math.min(80, 14 + spec.center.length * 8));
// legend: what the shapes mean
const L = 590, lg = (x, shape, text) => `${shape(x)}<text x="${x + 16}" y="${L + 5}" font-family="IBM Plex Sans" font-size="12.5" fill="#fff" ${shadow}>${text}</text>`;
const legend = [
  lg(24, (x) => `<circle cx="${x + 6}" cy="${L}" r="7" fill="#fffaf0"/>`, 'жанр'),
  lg(84, (x) => `<circle cx="${x + 6}" cy="${L}" r="7" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 3"/>`, 'сцена'),
  lg(150, (x) => `<circle cx="${x + 6}" cy="${L}" r="7" fill="#1b1f3a" stroke="#fff" stroke-opacity=".8" stroke-width="1.5"/>`, 'лейбл'),
  lg(216, (x) => `<circle cx="${x + 6}" cy="${L}" r="6" fill="#ffd84d" stroke="${dark}" stroke-width="1.5"/>`, 'артист'),
  lg(292, (x) => `<line x1="${x - 4}" y1="${L}" x2="${x + 12}" y2="${L}" stroke="#fff" stroke-width="3"/>`, 'історичний зв’язок'),
  lg(446, (x) => `<line x1="${x - 4}" y1="${L}" x2="${x + 12}" y2="${L}" stroke="#fff" stroke-width="2" stroke-dasharray="4 3"/>`, 'спорідненість'),
].join('');
// Soft "glow" background (like Spotify daylist): base hue, a big blurred orb behind the graph, a warmer core, light grain.
const V = process.env.COVER_VARIANT ?? 'dark';
const oh = V === 'orb' ? (h + 180) % 360 : (h + 45) % 360, ch_ = V === 'orb' ? (h + 130) % 360 : (h + 90) % 360;
const isDark = V === 'dark' || V === 'dark2';
const g0 = isDark ? `hsl(${h} 45% 13%)` : `hsl(${h} 62% 66%)`, g1 = isDark ? `hsl(${(h + 15) % 360} 50% 7%)` : `hsl(${(h + 15) % 360} 58% 54%)`;
const orb = isDark ? `hsl(${h} 85% 48%)` : `hsl(${oh} 92% 66%)`, core = isDark ? `hsl(${(h + (V === 'dark2' ? 180 : 40)) % 360} 90% 62%)` : `hsl(${ch_} 88% 76%)`;
const bg = `<defs>
<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${g0}"/><stop offset="1" stop-color="${g1}"/></linearGradient>
<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .5 0"/></filter></defs>
<rect width="640" height="640" fill="url(#g)"/>
<g filter="url(#blur)"><circle cx="${cx}" cy="${cy + 10}" r="${isDark ? 210 : 230}" fill="${orb}" opacity="${isDark ? .85 : 1}"/><circle cx="${cx}" cy="${cy + 10}" r="95" fill="${core}" opacity="${isDark ? .75 : 1}"/></g>
<rect width="640" height="640" filter="url(#grain)" opacity="${isDark ? .07 : .10}"/>`;
const svg = `<svg width="640" height="640" viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
${bg}${edges}${outer}
<circle cx="${cx}" cy="${cy}" r="${cr}" fill="#fffaf0" stroke="${dark}" stroke-width="3"/>
<text x="${cx}" y="${cy + 10}" font-family="Fraunces" font-weight="600" font-size="${Math.min(30, Math.floor((cr * 2 - 12) / (spec.center.length * 0.5)))}" fill="${dark}" text-anchor="middle">${esc(spec.center)}</text>
${nodes}${labels}
<g transform="translate(0,18)">${legend}</g></svg>`;
const html = `<!doctype html><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet"><style>body{margin:0}</style>${svg}`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 640, height: 640 } });
await p.setContent(html); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(600);
let q = 88; let buf;
do { buf = await p.screenshot({ type: 'jpeg', quality: q }); q -= 8; } while (buf.length > 190000 && q > 40); // base64 must stay ≤256 KB
fs.writeFileSync(outPath, buf); await b.close();
console.log(`cover ${path.basename(outPath)} ${buf.length} bytes`);
