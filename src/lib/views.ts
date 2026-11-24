// Shared model for the "zoom" and "river" views: genres, styles, their artists and influence between them.
// Derived from the snapshot at runtime; nothing here is stored.
import type { Snapshot } from './repository';
import { isTopGenre, influenceOf } from './graph';
import { GENRE_COLOR, rgba } from './palette';
export { GENRE_COLOR, rgba };

export interface VGenre { id: string; name: string; placeholder: boolean }
export interface VStyle { id: string; name: string; genres: string[]; year?: number; artists: string[] }
export interface VModel {
  genres: VGenre[]; styles: VStyle[];
  influence: [string, string][];               // [shaper, shaped] between genres/styles
  genreLinks: { a: string; b: string; n: number }[];
  artistsOf: Map<string, string[]>;            // genre or style id → artist ids
  byId: Map<string, VGenre | VStyle>;
  artistCover: Map<string, string>;            // artist id → a cover of one of their records
  mine: Set<string>;                           // ids with my status or reaction, plus the styles/genres that hold them
}

let cache: { snap: Snapshot; m: VModel } | null = null;

export function viewModel(snap: Snapshot): VModel {
  if (cache?.snap === snap) return cache.m;
  const all = [...snap.entities.values()];
  const genres: VGenre[] = all.filter(isTopGenre).map((e) => ({ id: e.id, name: e.name, placeholder: !!e.attrs?.placeholder }));
  const artistsOf = new Map<string, string[]>();
  for (const r of snap.relations) {
    if (r.type !== 'in_genre' || snap.entities.get(r.from)?.type !== 'artist') continue;
    (artistsOf.get(r.to) ?? artistsOf.set(r.to, []).get(r.to)!).push(r.from);
  }
  const styles: VStyle[] = all.filter((e) => e.type === 'genre' && !isTopGenre(e)).map((e) => ({
    id: e.id, name: e.name, genres: (e.attrs?.genres ?? []).filter((g) => isTopGenre(snap.entities.get(g))),
    year: e.years?.from, artists: artistsOf.get(e.id) ?? [],
  }));
  const influence: [string, string][] = [];
  for (const r of snap.relations) { const f = influenceOf(snap, r); if (f) influence.push(f); }
  const tops = (id: string) => { const e = snap.entities.get(id); return isTopGenre(e) ? [id] : (styles.find((s) => s.id === id)?.genres ?? []); };
  const count = new Map<string, number>();
  for (const [a, b] of influence) for (const x of tops(a)) for (const y of tops(b)) if (x !== y) count.set(`${x}>${y}`, (count.get(`${x}>${y}`) ?? 0) + 1);
  const genreLinks = [...count].map(([k, n]) => { const [a, b] = k.split('>'); return { a, b, n }; });
  const byId = new Map<string, VGenre | VStyle>([...genres.map((g) => [g.id, g] as const), ...styles.map((s) => [s.id, s] as const)]);
  const artistCover = new Map<string, string>();
  for (const e of all) {
    const a = e.attrs?.artist; const c = snap.covers[e.id];
    if (a && c?.src && !artistCover.has(a) && e.type === 'release') artistCover.set(a, c.src);
  }
  const mine = new Set<string>([...Object.keys(snap.journal.statuses), ...snap.journal.reactions.map((r) => r.target)]);
  // a record of mine marks its artist; an artist of mine marks their styles and genres
  for (const id of [...mine]) { const a = snap.entities.get(id)?.attrs?.artist; if (a) mine.add(a); }
  for (const [holder, list] of artistsOf) if (list.some((a) => mine.has(a))) mine.add(holder);
  for (const s of styles) if (mine.has(s.id)) s.genres.forEach((g) => mine.add(g));
  const m = { genres, styles, influence, genreLinks, artistsOf, byId, artistCover, mine };
  cache = { snap, m };
  return m;
}

// Hand-placed genre "continents" for the zoom view, in the map's own geography; new genres go on the rim.
const GENRE_POS: Record<string, [number, number]> = {
  'genre:electronic': [430, 140], 'genre:hip-hop': [-40, 470], 'genre:funk-soul': [-520, 330], 'genre:jazz': [-640, -160],
  'genre:latin': [-470, -600], 'genre:pop': [-20, -660], 'genre:rock': [360, -500], 'genre:reggae': [30, -60],
  'genre:folk-world-country': [760, -620], 'genre:blues': [-960, -400], 'genre:classical': [720, -940],
  'genre:stage-screen': [1040, -200], 'genre:brass-military': [-900, 640], 'genre:childrens': [-260, 900], 'genre:non-music': [860, 720],
};

export interface ZoomLayout { pos: Map<string, [number, number]>; artistPos: { id: string; style: string; x: number; y: number }[] }
let lcache: { m: VModel; l: ZoomLayout } | null = null;

export function zoomLayout(m: VModel): ZoomLayout {
  if (lcache?.m === m) return lcache.l;
  const pos = new Map<string, [number, number]>();
  let rim = 0;
  m.genres.forEach((g) => {
    const p = GENRE_POS[g.id];
    if (p) pos.set(g.id, [...p]);
    else { const a = rim++ * 0.9 + 0.4; pos.set(g.id, [Math.cos(a) * 1350, Math.sin(a) * 1350]); }
  });
  const sp = new Map<string, [number, number]>();
  m.styles.forEach((s) => {
    const gs = s.genres.filter((g) => pos.has(g));
    if (!gs.length) { sp.set(s.id, [0, 0]); return; }
    let x = 0; let y = 0; gs.forEach((g) => { x += pos.get(g)![0]; y += pos.get(g)![1]; }); x /= gs.length; y /= gs.length;
    if (gs.length === 1) {
      const sib = m.styles.filter((t) => t.genres.length === 1 && t.genres[0] === gs[0]);
      const i = sib.indexOf(s); const n = sib.length; const a = (i * 2 * Math.PI) / n + 0.3;
      const r = n > 9 ? (i % 2 ? 150 : 255) : n > 4 ? 170 : 130;
      x += Math.cos(a) * r; y += Math.sin(a) * r;
    }
    sp.set(s.id, [x, y]);
  });
  // push styles apart and off the genre centres
  const ids = [...sp.keys()]; const centres = [...pos.values()];
  for (let it = 0; it < 120; it++) {
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = sp.get(ids[i])!; const b = sp.get(ids[j])!;
      const dx = b[0] - a[0]; const dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1;
      if (d < 150) { const k = (150 - d) / 2 / d; a[0] -= dx * k; a[1] -= dy * k; b[0] += dx * k; b[1] += dy * k; }
    }
    ids.forEach((id) => centres.forEach((c) => {
      const p = sp.get(id)!; const dx = p[0] - c[0]; const dy = p[1] - c[1]; const d = Math.hypot(dx, dy) || 1;
      if (d < 85) { p[0] = c[0] + (dx / d) * 85; p[1] = c[1] + (dy / d) * 85; }
    }));
  }
  sp.forEach((v, k) => pos.set(k, v));
  // artists: a small ring around the first style (or genre) they belong to
  const seen = new Set<string>(); const artistPos: ZoomLayout['artistPos'] = [];
  [...m.styles.map((s) => s.id), ...m.genres.map((g) => g.id)].forEach((sid) => {
    const c = pos.get(sid); if (!c) return;
    const list = (m.artistsOf.get(sid) ?? []).filter((a) => !seen.has(a)); list.forEach((a) => seen.add(a));
    list.forEach((a, i) => {
      const n = list.length; const ang = (i * 2 * Math.PI) / Math.max(n, 1) - Math.PI / 2; const r = n > 7 ? (i % 2 ? 44 : 68) : n > 3 ? 50 : 40;
      artistPos.push({ id: a, style: sid, x: c[0] + Math.cos(ang) * r, y: c[1] + Math.sin(ang) * r });
      if (!pos.has(a)) pos.set(a, [c[0] + Math.cos(ang) * r, c[1] + Math.sin(ang) * r]);
    });
  });
  const l = { pos, artistPos };
  lcache = { m, l };
  return l;
}

/** Where the river places a style when its year is unknown: with its genre's era, marked as approximate. */
export function riverYear(s: VStyle, m: VModel): { y: number; approx: boolean } {
  if (s.year) return { y: s.year, approx: false };
  const sib = m.styles.filter((t) => t.year && t.genres.some((g) => s.genres.includes(g))).map((t) => t.year!);
  const y = sib.length ? Math.round(sib.reduce((a, b) => a + b, 0) / sib.length) : 1980;
  return { y, approx: true };
}

/** A genre's own colour, or for a style the colour of its first genre. */
export function colorOf(id: string, m: VModel): string {
  if (GENRE_COLOR[id]) return GENRE_COLOR[id];
  const st = m.styles.find((s) => s.id === id);
  return (st && GENRE_COLOR[st.genres[0]]) || '#8f877b';
}
