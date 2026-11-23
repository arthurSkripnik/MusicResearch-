// Releases and tracks as JSON for scripts/covers.mjs and scripts/spotify-match.mjs.
import { dataEntities } from '../src/data';
const an = new Map(dataEntities.filter((e) => e.type === 'artist').map((a) => [a.id, a.name]));
const artistOf = (id?: string) => (an.get(id ?? '') ?? '').replace(' / Reprazent', '').replace(' (?)', '');
console.log(JSON.stringify([
  ...dataEntities.filter((e) => e.type === 'release').map((r) => ({ id: r.id, kind: 'album', name: r.name, artist: artistOf(r.attrs?.artist), year: r.years?.from })),
  ...dataEntities.filter((e) => e.type === 'track').map((t) => ({ id: t.id, kind: 'track', name: t.name, artist: artistOf(t.attrs?.artist), confidence: t.confidence })),
]));
