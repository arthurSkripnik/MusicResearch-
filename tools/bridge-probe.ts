// Prints a derived bridge or the hidden-bridge list, for checking data without the UI.
//   npx tsx tools/bridge-probe.ts genre:hip-hop genre:neo-soul   |   npx tsx tools/bridge-probe.ts --hidden
(globalThis as any).localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { repo } = await import('../src/lib/repository');
const { computeBridge, hiddenBridges } = await import('../src/lib/bridges');
const snap = repo.getSnapshot();
const name = (id: string) => snap.entities.get(id)?.name ?? id;
const [a, b] = process.argv.slice(2);
if (a === '--hidden') {
  for (const h of hiddenBridges(snap)) console.log(`${name(h.a)} ⇄ ${name(h.b)} · ${h.weight}`);
} else {
  const br = computeBridge(snap, a, b);
  if (!br) { console.log('no bridge'); process.exit(1); }
  const fl = (xs: typeof br.ab) => xs.map((f) => `${f.rel.type} ${name(f.rel.from)}→${name(f.rel.to)} [${f.rel.confidence}] ${f.rel.why}${f.via.length ? ' via ' + f.via.map(name).join(', ') : ''}`);
  console.log('A→B', fl(br.ab)); console.log('B→A', fl(br.ba)); console.log('alike', fl(br.alike));
  for (const k of ['people', 'scenes', 'releases', 'concepts', 'roots'] as const) console.log(k, br[k].map((x) => `${name(x.id)}(${x.score}${x.confidence !== 'established' ? ',' + x.confidence : ''})`).join(' · '));
  console.log('era', br.era, 'likes', br.likes.map(name), 'note', br.note?.diff);
}
