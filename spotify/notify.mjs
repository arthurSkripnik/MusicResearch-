#!/usr/bin/env node
// Shared ntfy sender with a daily cap (Arthur, 2026-11-12: "fewer pushes per day"; ntfy.sh free quota is per IP).
//   node notify.mjs [--evening|--alert] --title "…" [--click URL] [--actions "view, A, URL; …"] "text"
// Rules (Kyiv day):
//   --evening : the 20:45 intake digest; always sent; also appends every queued thread note ("Ще з тредів").
//   --alert   : routine failure; sent if fewer than 1 alert today, otherwise queued.
//   (default) : thread push; at most 2 per day across ALL threads; above that it is queued for the evening digest.
// Prints SENT / QUEUED / FAILED <http>. A thread/alert push that fails (ntfy 429, network) is QUEUED too; only the evening digest can print FAILED. State: .ntfy-count.json, ntfy-queue.jsonl (both next to this file).
import fs from 'node:fs';
const here = (p) => new URL(p, import.meta.url);
const args = process.argv.slice(2); const opt = {}; const rest = [];
for (let i = 0; i < args.length; i++) { const k = args[i];
  if (k === '--evening' || k === '--alert') opt.kind = k.slice(2);
  else if (k.startsWith('--')) opt[k.slice(2)] = args[++i]; else rest.push(k); }
const kind = opt.kind ?? 'thread'; let text = rest.join(' ').trim();
if (!opt.title || !text) { console.error('usage: notify.mjs [--evening|--alert] --title T [--click U] [--actions A] "text"'); process.exit(2); }
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv' }).format(new Date());
const cf = here('./.ntfy-count.json');
let c = fs.existsSync(cf) ? JSON.parse(fs.readFileSync(cf, 'utf8')) : {}; if (c.day !== day) c = { day, thread: 0, alert: 0, evening: 0 };
const qf = here('./ntfy-queue.jsonl');
const LIMIT = { thread: 2, alert: 1, evening: Infinity };
if (c[kind] >= LIMIT[kind]) {
  fs.appendFileSync(qf, JSON.stringify({ at: new Date().toISOString(), title: opt.title, text, click: opt.click }) + '\n');
  console.log(`QUEUED (${kind} cap ${LIMIT[kind]}/day reached; goes into tonight's evening digest)`); process.exit(0);
}
if (kind === 'evening' && fs.existsSync(qf)) {
  const q = fs.readFileSync(qf, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  if (q.length) text += `\n\nЩе з тредів:\n${q.map((x) => `• ${x.title}: ${x.text.split('\n')[0].slice(0, 120)}`).join('\n')}`;
}
const topic = fs.readFileSync(here('./.ntfy-topic'), 'utf8').trim();
const enc = (s) => /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString('base64')}?=`;
const headers = { Title: enc(opt.title) }; if (opt.click) headers.Click = opt.click; if (opt.actions) headers.Actions = enc(opt.actions);
const queue = (why) => {
  fs.appendFileSync(qf, JSON.stringify({ at: new Date().toISOString(), title: opt.title, text, click: opt.click }) + '\n');
  console.log(`QUEUED (send failed: ${why}; goes into the next evening digest)`); process.exit(0);
};
let r;
try { r = await fetch(`https://ntfy.sh/${topic}`, { method: 'POST', headers, body: text }); }
catch (e) { if (kind !== 'evening') queue(e.message); console.log(`FAILED network ${e.message}`); process.exit(1); }
if (!r.ok) { const why = `${r.status} ${(await r.text()).slice(0, 160)}`; if (kind !== 'evening') queue(why); console.log(`FAILED ${why}`); process.exit(1); }
c[kind]++; fs.writeFileSync(cf, JSON.stringify(c));
if (kind === 'evening' && fs.existsSync(qf)) fs.writeFileSync(qf, '');
console.log(`SENT (${kind} ${c[kind]} today)`);
