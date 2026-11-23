#!/usr/bin/env node
// Spotify helper for research threads (no dependencies, Node 18+).
// State lives next to this file in .state.json: client id, PKCE verifier, rotating refresh token, playlist ids.
// Commands:
//   node spotify.mjs auth-url                      → login link for Arthur (PKCE, no client secret)
//   node spotify.mjs exchange "<redirected URL>"   → saves the refresh token
//   node spotify.mjs me                            → check the connection
//   node spotify.mjs playlist "<name>" "<description>"        → find or create a private playlist, prints id
//   node spotify.mjs add "<playlist name>" album "<artist>" "<album>"   → adds all album tracks (skips duplicates)
//   node spotify.mjs add "<playlist name>" track "<artist>" "<track>"   → adds one track
//   node spotify.mjs list "<playlist name>"        → prints the playlist items
//   node spotify.mjs clear "<playlist name>"       → removes all items (rebuild a thread playlist)
//   node spotify.mjs describe "<playlist name>" "<text>" → sets the description (≤300 chars, one line): what to listen for
//   node spotify.mjs cover "<playlist name>" <file.jpg>  → uploads a custom cover (make it with cover.mjs)
//   node spotify.mjs mosaic "<playlist name>"     → rollback: 2×2 mosaic of the first four album covers
//   node spotify.mjs intake                        → new items from "Explorer · Дослідити": prints them, logs them to
//                                                    intake-log.jsonl, then removes them from the playlist
//   node spotify.mjs deep                          → same as intake, for «🔍 Розібрати» (log kind "deep"): each track = a
//                                                    detailed breakdown of the track + its album; ≥3 tracks of one album = album breakdown
//   node spotify.mjs likes                         → Liked Songs added since the last run (first run only sets the baseline)
//   node spotify.mjs notify "<playlist name>" "<text>" [thread cmsg id] → ONE ntfy push to Arthur after a recommendation
//                                                    batch: title = playlist, tap opens the thread, button opens the playlist
//   node spotify.mjs removed                       → tracks Arthur removed from Explorer playlists since the last run
//   node spotify.mjs notify-new "<playlist name>" "<text>" <thread cmsg id> → same, sent ONCE by a NEW research thread
//                                                    right after it creates its Explorer playlist ("Новий тред · <topic>")
// Rule: print what was matched (artist — title, year) so the thread can tell Arthur; never guess silently.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const STATE = path.join(DIR, '.state.json');
const REDIRECT = 'http://127.0.0.1:8888/callback';
const SCOPES = 'playlist-read-private playlist-modify-private playlist-modify-public user-library-read ugc-image-upload';
const st = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
const save = () => fs.writeFileSync(STATE, JSON.stringify(st, null, 2));
const b64url = (b) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function token() {
  if (st.access && st.accessExp > Date.now() + 30000) return st.access;
  if (!st.refresh) throw new Error('Not connected: run auth-url / exchange first');
  const r = await fetch('https://accounts.spotify.com/api/token', { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: st.refresh, client_id: st.clientId }) });
  const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j));
  st.access = j.access_token; st.accessExp = Date.now() + j.expires_in * 1000;
  if (j.refresh_token) st.refresh = j.refresh_token; // PKCE refresh tokens rotate
  save(); return st.access;
}
async function api(method, url, body) {
  const r = await fetch(url.startsWith('http') ? url : `https://api.spotify.com/v1${url}`, { method,
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 204) return {};
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`${method} ${url}: ${r.status} ${JSON.stringify(j)}`);
  return j;
}
async function findPlaylist(name) {
  for (let url = '/me/playlists?limit=50'; url;) { const p = await api('GET', url); const hit = p.items.find((x) => x?.name?.replaceAll('&amp;', '&') === name); if (hit) return hit; url = p.next; }
}
async function playlistItems(id) {
  const out = []; for (let url = `/playlists/${id}/items?limit=50`; url;) { const p = await api('GET', url);
    for (const it of p.items) { const t = it.item ?? it.track; if (t) out.push(t); } url = p.next; } return out;
}

const [cmd, ...a] = process.argv.slice(2);
if (cmd === 'notify' || cmd === 'notify-new') { // Arthur 2026-11-11: push when a thread adds recommendations (one per batch, not per track)
  const topic = fs.readFileSync(path.join(DIR, '.ntfy-topic'), 'utf8').trim();
  const [name, text, threadId] = a;
  const id = (await findPlaylist(name).catch(() => null))?.id;
  const pl = id ? `https://open.spotify.com/playlist/${id}` : null;
  const th = threadId ? `https://claude.ai/code/project/chan_01MbAFSd2qqmnLwrh3uaEpUg?thread=${threadId}` : null;
  const actions = [th && { action: 'view', label: 'Тред', url: th }, pl && { action: 'view', label: 'Плейлист', url: pl }].filter(Boolean);
  const r = await fetch('https://ntfy.sh/', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, title: cmd === 'notify-new' ? `Новий тред · ${name.replace(/^Explorer · /, '')}` : `Нові рекомендації · ${name}`, message: text, tags: ['notes'], click: th || pl || undefined, actions }) });
  console.log(`notify: ${r.status}`); process.exit(r.ok ? 0 : 1);
}

const INTAKE = '➕ Дослідити';
const INTAKE_ID = '5HUTif8EYAxXeC7ZCxZIUi';
const DEEP_ID = '4FOrdKuow6hJT5UP9pVDAx'; // «🔍 Розібрати» (Arthur 2026-11-18): detailed breakdown of a track/album
const LOG = path.join(DIR, 'intake-log.jsonl');
const fmt = (t) => `${(t.artists ?? []).map((r) => r.name).join(', ')} — ${t.name}` +
  (t.album ? ` (альбом ${t.album.name}${t.album.release_date ? `, ${t.album.release_date.slice(0, 4)}` : ''})` : '') +
  ` · ${t.external_urls?.spotify ?? t.uri}`;
const log = (kind, t, at) => fs.appendFileSync(LOG, JSON.stringify({ kind, at, seen: new Date().toISOString(), uri: t.uri, line: fmt(t) }) + '\n');

async function uploadCover(name, buf) {
  const p = await findPlaylist(name); if (!p) throw new Error(`no playlist ${name}`);
  const r = await fetch(`https://api.spotify.com/v1/playlists/${p.id}/images`, { method: 'PUT',
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'image/jpeg' }, body: buf.toString('base64') });
  if (!r.ok) throw new Error(`cover upload ${r.status} ${await r.text()}`);
  return p;
}
if (cmd === 'cover') {
  const buf = fs.readFileSync(a[1]); await uploadCover(a[0], buf); console.log(`cover set for ${a[0]} (${buf.length} bytes)`); process.exit(0);
}
if (cmd === 'mosaic') {
  const p = await findPlaylist(a[0]); if (!p) throw new Error('no playlist');
  const urls = [...new Set((await playlistItems(p.id)).map((t) => t.album?.images?.[0]?.url).filter(Boolean))].slice(0, 4);
  const { createRequire } = await import('node:module'); const { chromium } = createRequire(import.meta.url)('playwright');
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 640, height: 640 } });
  await pg.setContent(`<style>body{margin:0;display:grid;grid-template-columns:320px 320px}img{width:320px;height:320px;object-fit:cover}</style>${urls.map((u) => `<img src="${u}">`).join('')}`);
  await pg.waitForLoadState('networkidle').catch(() => {}); const buf = await pg.screenshot({ type: 'jpeg', quality: 80 }); await b.close();
  await uploadCover(a[0], buf); console.log(`mosaic set for ${a[0]}`); process.exit(0);
}
if (cmd === 'rename') { // rename <playlist> <new name>
  const p = await findPlaylist(a[0]); if (!p) throw new Error(`no playlist ${a[0]}`);
  await api('PUT', `/playlists/${p.id}`, { name: a[1] }); console.log(`renamed ${a[0]} -> ${a[1]}`); process.exit(0);
}
if (cmd === 'describe') {
  const p = await findPlaylist(a[0]); if (!p) throw new Error(`no playlist ${a[0]}`);
  const text = (a[1] ?? '').replace(/\s+/g, ' ').trim();
  if (text.length > 300) { console.log(`TOO LONG: ${text.length} chars, max 300`); process.exit(2); }
  await api('PUT', `/playlists/${p.id}`, { description: text });
  console.log(`described ${a[0]} (${text.length} chars)`);
  process.exit(0);
}
// Removals = Arthur's "не зайшло" signal (Arthur, 2026-11-11). Threads never remove from Explorer playlists themselves
// (clear/remove below drop the item from the snapshot, so they never count). Run daily in the 20:45 intake.
//   removed → for every "Explorer · …" playlist, tracks that were there at the last run and are gone now; logs them to
//             removed-log.jsonl and prints them grouped by playlist. First run per playlist only sets the baseline.
const SNAP = path.join(DIR, 'explorer-snapshot.json');
const readSnap = () => fs.existsSync(SNAP) ? JSON.parse(fs.readFileSync(SNAP, 'utf8')) : {};
const forget = (pid, uris) => { const s = readSnap(); if (s[pid]) { for (const u of uris) delete s[pid].items[u]; fs.writeFileSync(SNAP, JSON.stringify(s, null, 1)); } };
if (cmd === 'removed') {
  // "не зайшло" = Arthur removed a track from an Explorer playlist. Not counted:
  //  - removals made with `spotify.mjs remove/clear` (forgotten from the snapshot right away);
  //  - tracks a thread logged in thread-moves.jsonl ({"playlist","uri","by","why"}) when it removed/moved them another way;
  //  - tracks that now sit in another Explorer playlist (a move, not a dislike).
  const snap = readSnap(); const now = new Date().toISOString(); let total = 0;
  const MOVES = path.join(DIR, 'thread-moves.jsonl');
  const moved = new Set((fs.existsSync(MOVES) ? fs.readFileSync(MOVES, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []).map((m) => m.uri));
  const lists = [];
  for (let url = '/me/playlists?limit=50'; url;) { const page = await api('GET', url);
    for (const p of page.items) { const name = p?.name?.replaceAll('&amp;', '&');
      if (name?.startsWith('Explorer · ') && p.id !== INTAKE_ID) lists.push({ id: p.id, name }); }
    url = page.next; }
  const curs = {}; for (const l of lists) curs[l.id] = Object.fromEntries((await playlistItems(l.id)).filter((t) => t.uri).map((t) => [t.uri, fmt(t)]));
  const everywhere = new Set(Object.values(curs).flatMap((c) => Object.keys(c)));
  for (const { id, name } of lists) {
    const cur = curs[id], old = snap[id]?.items;
    if (old) {
      const gone = Object.keys(old).filter((u) => !cur[u]);
      const real = gone.filter((u) => !moved.has(u) && !everywhere.has(u));
      for (const u of gone.filter((u) => !real.includes(u))) fs.appendFileSync(path.join(DIR, 'removed-log.jsonl'), JSON.stringify({ kind: 'thread-move', seen: now, playlist: name, uri: u, line: old[u] }) + '\n');
      if (real.length) { console.log(`${name}: прибрано ${real.length}`); total += real.length;
        for (const u of real) { console.log(`- ${old[u]}`); fs.appendFileSync(path.join(DIR, 'removed-log.jsonl'), JSON.stringify({ kind: 'removed', seen: now, playlist: name, uri: u, line: old[u] }) + '\n'); } }
    } else console.log(`${name}: baseline set (${Object.keys(cur).length})`);
    snap[id] = { name, items: cur };
  }
  fs.writeFileSync(SNAP, JSON.stringify(snap, null, 1));
  console.log(`REMOVED: ${total}`); process.exit(0);
}
if (cmd === 'intake' || cmd === 'deep') {
  const p = { id: cmd === 'deep' ? DEEP_ID : INTAKE_ID }; // by id, so renaming the playlist in Spotify never breaks intake
  if (false) await api('POST', '/me/playlists', { name: INTAKE,
    description: 'Music Explorer: кидай сюди те, що хочеш дослідити. Раз на день Claude забирає звідси треки в треди.', public: false });
  const got = [];
  for (let url = `/playlists/${p.id}/items?limit=50`; url;) { const r = await api('GET', url);
    for (const it of r.items) { const t = it.item ?? it.track; if (t?.uri) got.push({ t, at: it.added_at }); } url = r.next; }
  if (!got.length) { console.log(`${cmd.toUpperCase()}: empty`); process.exit(0); }
  for (const { t, at } of got) { log(cmd, t, at); console.log(`- ${fmt(t)}`); }
  const uris = [...new Set(got.map((g) => g.t.uri))];
  for (let i = 0; i < uris.length; i += 100) await api('DELETE', `/playlists/${p.id}/items`, { items: uris.slice(i, i + 100).map((uri) => ({ uri })) });
  if (cmd === 'deep') { const by = {}; for (const { t } of got) (by[t.album?.name ?? '?'] ??= []).push(t);
    for (const [alb, ts] of Object.entries(by)) if (ts.length >= 3) console.log(`ALBUM: ${ts[0].artists?.[0]?.name} — ${alb} (${ts.length} треків) → розбір по альбому`); }
  console.log(`${cmd.toUpperCase()}: ${got.length} item(s) logged and removed`);
  process.exit(0);
}
// ★ playlists: sort each new Liked Song into one best-fit ★ playlist (Arthur, 2026-11-10).
//   star-pending                 → likes from intake-log newer than the sandbox cutoff and not yet sorted, with uri
//   star <key> <spotify:track:…> → add to ★ playlist <key> from sandbox-liked/star-playlists.json, skip artist+title dupes
const STAR_FILE = new URL('../sandbox-liked/star-playlists.json', import.meta.url);
const STAR_LOG = new URL('./star-log.jsonl', import.meta.url);
const readJsonl = (u) => fs.existsSync(u) ? fs.readFileSync(u, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
if (cmd === 'star-pending') {
  const cfg = JSON.parse(fs.readFileSync(STAR_FILE, 'utf8'));
  const done = new Set(readJsonl(STAR_LOG).map((x) => x.uri));
  const seen = new Set();
  const pend = readJsonl(new URL('./intake-log.jsonl', import.meta.url))
    .filter((x) => x.kind === 'like' && x.at > cfg.last_sorted_like && !done.has(x.uri) && !seen.has(x.uri) && seen.add(x.uri));
  console.log('★ playlists: ' + Object.entries(cfg.playlists).map(([k, v]) => `${k} = ${v.name} (${v.about})`).join(' | '));
  for (const x of pend) console.log(`- ${x.uri} · ${x.line}`);
  console.log(`STAR-PENDING: ${pend.length}`);
  process.exit(0);
}
if (cmd === 'star') {
  const cfg = JSON.parse(fs.readFileSync(STAR_FILE, 'utf8'));
  const pl = cfg.playlists[a[0]]; if (!pl) throw new Error(`no ★ key ${a[0]}; keys: ${Object.keys(cfg.playlists).join(', ')}`);
  const uri = a[1]; if (!/^spotify:track:\w+$/.test(uri ?? '')) throw new Error('need spotify:track:<id>');
  const t = await api('GET', `/tracks/${uri.split(':')[2]}`);
  const key = (x) => `${x.artists?.[0]?.name}|${x.name}`.toLowerCase().replace(/\s*[-(].*(remaster|version|edit|live).*$/i, '').trim();
  const have = await playlistItems(pl.id);
  const entry = { uri, key: a[0], playlist: pl.name, line: fmt(t), at: new Date().toISOString() };
  if (have.some((x) => x.uri === uri || key(x) === key(t))) { entry.skipped = 'duplicate'; fs.appendFileSync(STAR_LOG, JSON.stringify(entry) + '\n'); console.log(`STAR: already in ${pl.name}: ${fmt(t)}`); process.exit(0); }
  try { await api('POST', `/playlists/${pl.id}/items`, { uris: [uri] }); }
  catch (e) { if (String(e).includes(' 429')) { console.log('STAR: RATE LIMITED, stop; the rest stays pending for the next run'); process.exit(3); } throw e; }
  fs.appendFileSync(STAR_LOG, JSON.stringify(entry) + '\n');
  await new Promise((r) => setTimeout(r, 3000)); // pace writes: ~60 rapid writes caused an 8h block on 2026-11-07
  console.log(`STAR: ${fmt(t)} → ${pl.name}`);
  process.exit(0);
}
if (cmd === 'separator' || cmd === 'batch-note') {
  // New-batch convention (Arthur, 2026-11-11): new tracks always go to the END; before each new batch a divider track
  // ("One Second of Silence") is appended, and the description starts with "Нове DD.MM: what & why ║ <base description>".
  //   separator <playlist>              → append the divider (skipped if the playlist is empty or already ends with it)
  //   batch-note <playlist> "<note>"    → replace the previous "Нове …" note, keep the base text, ≤300 chars
  const DIVIDER = 'spotify:track:4jaXxB0DJ6X4PdjMK8XVfu';
  const p = await findPlaylist(a[0]); if (!p) throw new Error(`no playlist ${a[0]}`);
  if (cmd === 'separator') {
    const items = await playlistItems(p.id); const last = items.at(-1)?.uri;
    if (!items.length || last === DIVIDER) { console.log(`separator: skipped (${items.length ? 'already ends with divider' : 'empty playlist'})`); process.exit(0); }
    await api('POST', `/playlists/${p.id}/items`, { uris: [DIVIDER] }); console.log(`separator added to ${a[0]} after ${items.length} tracks`); process.exit(0);
  }
  const full = await api('GET', `/playlists/${p.id}?fields=description`);
  const cur = (full.description ?? '').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"');
  const base = cur.replace(/^Нове [^║]*║\s*/, '').trim();
  const d = new Date(); const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  let text = `Нове ${date}: ${(a[1] ?? '').replace(/\s+/g, ' ').trim()}`;
  if (text.length > 300) { console.log(`TOO LONG: note is ${text.length} chars, max 300`); process.exit(2); }
  if (base) text = `${text} ║ ${base}`.slice(0, 300).replace(/\s+\S*$/, (m) => (text.length + 3 + base.length > 300 ? '…' : m));
  await api('PUT', `/playlists/${p.id}`, { description: text });
  console.log(`batch-note ${a[0]} (${text.length} chars): ${text}`); process.exit(0);
}
if (cmd === 'likes') {
  const since = st.lastLikeAt; const fresh = [];
  let newest = since;
  outer: for (let url = '/me/tracks?limit=50'; url;) { const r = await api('GET', url);
    for (const it of r.items) { if (!newest || it.added_at > newest) newest = it.added_at;
      if (!since) break outer; if (it.added_at <= since) break outer; fresh.push(it); }
    url = r.next; }
  st.lastLikeAt = newest ?? new Date().toISOString(); save();
  if (!since) { console.log(`LIKES: baseline set at ${st.lastLikeAt}`); process.exit(0); }
  if (!fresh.length) { console.log('LIKES: none'); process.exit(0); }
  for (const it of fresh.reverse()) { log('like', it.track, it.added_at); console.log(`- ${fmt(it.track)}`); }
  console.log(`LIKES: ${fresh.length} new`);
  process.exit(0);
}
if (cmd === 'auth-url') {
  st.clientId = a[0] ?? st.clientId; st.verifier = b64url(crypto.randomBytes(48)); st.oauthState = b64url(crypto.randomBytes(12)); save();
  const challenge = b64url(crypto.createHash('sha256').update(st.verifier).digest());
  console.log('https://accounts.spotify.com/authorize?' + new URLSearchParams({ client_id: st.clientId, response_type: 'code',
    redirect_uri: REDIRECT, scope: SCOPES, code_challenge_method: 'S256', code_challenge: challenge, state: st.oauthState }));
} else if (cmd === 'exchange') {
  const u = new URL(a[0]); if (u.searchParams.get('state') !== st.oauthState) throw new Error('state mismatch');
  if (u.searchParams.get('error')) throw new Error(u.searchParams.get('error'));
  const r = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code: u.searchParams.get('code'), redirect_uri: REDIRECT, client_id: st.clientId, code_verifier: st.verifier }) });
  const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j));
  const meR = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${j.access_token}` } });
  if (!meR.ok) { console.log(`NOT SAVED: this login cannot use the app (${meR.status} ${await meR.text()}). Old token kept.`); process.exit(3); }
  Object.assign(st, { access: j.access_token, accessExp: Date.now() + j.expires_in * 1000, refresh: j.refresh_token, verifier: undefined, oauthState: undefined }); save();
  console.log('connected as', (await meR.json()).display_name);
} else if (cmd === 'me') {
  console.log(JSON.stringify(await api('GET', '/me'), null, 1));
} else if (cmd === 'playlist') {
  const p = (await findPlaylist(a[0])) ?? await api('POST', '/me/playlists', { name: a[0], description: a[1] ?? 'Music Explorer', public: false });
  console.log(p.id, p.external_urls?.spotify);
} else if (cmd === 'add') {
  const [name, kind, artist, title] = a;
  const p = await findPlaylist(name); if (!p) throw new Error(`no playlist ${name}; run playlist first`);
  const type = kind === 'album' ? 'album' : 'track';
  const q = `${type}:${title} artist:${artist}`;
  const res = await api('GET', `/search?${new URLSearchParams({ q, type, limit: '5' })}`);
  const items = res[`${type}s`].items;
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9а-яіїє]+/g, '');
  const hit = items.find((x) => norm(x.name) === norm(title) && x.artists.some((r) => norm(r.name) === norm(artist)))
    ?? items.find((x) => norm(x.name).startsWith(norm(title)) && x.artists.some((r) => norm(r.name) === norm(artist)));
  if (!hit) { console.log('NOT FOUND', q, '\ncandidates:', items.map((x) => `${x.artists.map((r) => r.name).join(', ')} — ${x.name}`).join(' | ')); process.exit(2); }
  let uris = [hit.uri];
  if (type === 'album') { uris = []; for (let url = `/albums/${hit.id}/tracks?limit=50`; url;) { const t = await api('GET', url); uris.push(...t.items.map((x) => x.uri)); url = t.next; } }
  const have = new Set((await playlistItems(p.id)).map((t) => t.uri));
  uris = uris.filter((u) => !have.has(u));
  for (let i = 0; i < uris.length; i += 100) await api('POST', `/playlists/${p.id}/items`, { uris: uris.slice(i, i + 100) }); // always append at the END (Arthur, 2026-11-11)
  console.log(`added ${uris.length} · ${hit.artists.map((r) => r.name).join(', ')} — ${hit.name}${hit.release_date ? ` (${hit.release_date.slice(0, 4)})` : ''} · ${hit.external_urls.spotify}`);
} else if (cmd === 'clear') {
  // removes every item from a thread playlist (used when a thread rebuilds its playlist)
  const p = await findPlaylist(a[0]); if (!p) throw new Error('no playlist');
  const uris = [...new Set((await playlistItems(p.id)).map((t) => t.uri))];
  for (let i = 0; i < uris.length; i += 100) await api('DELETE', `/playlists/${p.id}/items`, { items: uris.slice(i, i + 100).map((uri) => ({ uri })) });
  forget(p.id, uris); console.log(`cleared ${uris.length}`);
} else if (cmd === 'search') { // search <query> [track|album] → candidates with album, year, uri (for picking originals over remixes)
  const type = a[1] === 'album' ? 'album' : 'track';
  const res = await api('GET', `/search?${new URLSearchParams({ q: a[0], type, limit: '10' })}`);
  for (const x of res[`${type}s`].items) console.log(`${x.artists.map((r) => r.name).join(', ')} — ${x.name} [${type === 'track' ? x.album.name + ', ' + x.album.release_date?.slice(0, 4) + ', ' + (x.duration_ms / 1000).toFixed(1) + 's' : x.release_date?.slice(0, 4)}] ${x.uri}`);
} else if (cmd === 'adduri' || cmd === 'remove') { // adduri|remove <playlist> <spotify:track:… or track URL>
  const p = await findPlaylist(a[0]); if (!p) throw new Error('no playlist');
  const m = a[1].match(/track[:/]([A-Za-z0-9]+)/); if (!m) throw new Error('need a track uri or url');
  const uri = `spotify:track:${m[1]}`;
  if (cmd === 'remove') { await api('DELETE', `/playlists/${p.id}/items`, { items: [{ uri }] }); forget(p.id, [uri]); }
  else if (!(await playlistItems(p.id)).some((t) => t.uri === uri)) await api('POST', `/playlists/${p.id}/items`, { uris: [uri] });
  console.log(`${cmd} ${uri}`);
} else if (cmd === 'list') {
  const p = await findPlaylist(a[0]); if (!p) throw new Error('no playlist');
  for (const t of await playlistItems(p.id)) console.log(`${t.artists?.map((r) => r.name).join(', ')} — ${t.name}`);
} else {
  console.log('commands: auth-url [clientId] | exchange <url> | me | playlist <name> [desc] | add <playlist> album|track <artist> <title> | search <q> [track|album] | adduri|remove <playlist> <uri> | list <playlist>');
}
