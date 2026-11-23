// Model → Cytoscape elements, styles, filters. No React here.
import type { ElementDefinition, StylesheetJson } from 'cytoscape';
import type { Entity, EntityType, Relation, ClaimClass, Status, CountryCode } from '../data/schema';
import { RELATION_CLASS, RELATION_LABEL } from '../data/schema';
import type { Snapshot } from './repository';
import { hiddenBridges } from './bridges';

// Hand-placed genre "islands": neighbouring traditions sit close, so the map is the same every time.
export const GENRE_ANCHORS: Record<string, { x: number; y: number }> = {
  'genre:synth-pop': { x: -589, y: -589 }, 'genre:alt-rock': { x: -279, y: -682 }, 'genre:post-rock': { x: -31, y: -775 },
  'genre:electronica': { x: 155, y: -589 }, 'genre:industrial': { x: 465, y: -744 }, 'genre:ambient': { x: 558, y: -496 },
  'genre:jazz': { x: -961, y: -93 }, 'genre:jazz-fusion': { x: -1116, y: -310 }, 'genre:soul': { x: -806, y: 186 }, 'genre:neo-soul': { x: -660, y: 20 },
  'genre:funk': { x: -713, y: 434 }, 'genre:jazz-funk': { x: -1023, y: 403 }, 'genre:acid-jazz': { x: -837, y: 682 },
  'genre:dub': { x: -434, y: -310 }, 'genre:trip-hop': { x: -279, y: -62 }, 'genre:hip-hop': { x: -496, y: 186 },
  'genre:instrumental-hip-hop': { x: -279, y: 341 }, 'genre:downtempo': { x: 93, y: -279 },
  'genre:breakbeat': { x: 62, y: 341 }, 'genre:big-beat': { x: 186, y: 651 }, 'genre:breakbeat-hardcore': { x: 465, y: 248 },
  'genre:jungle': { x: 651, y: 465 }, 'genre:drum-and-bass': { x: 868, y: 651 }, 'genre:house': { x: 372, y: -155 },
  'genre:acid-house': { x: 620, y: 0 }, 'genre:techno': { x: 806, y: -248 }, 'genre:idm': { x: 899, y: -527 },
  // Discogs genres (broad hubs), 2026-11-10
  'genre:electronic': { x: 330, y: 90 }, 'genre:funk-soul': { x: -960, y: 260 }, 'genre:reggae': { x: -640, y: -470 },
  'genre:rock': { x: -160, y: -960 }, 'genre:pop': { x: -720, y: -800 }, 'genre:latin': { x: -420, y: -1000 },
  // styles added 2026-11-10
  'genre:roots-reggae': { x: -860, y: -440 }, 'genre:uk-garage': { x: 1060, y: 380 }, 'genre:dubstep': { x: 1170, y: 140 },
  'genre:grime': { x: 1040, y: 840 }, 'genre:modal': { x: -1290, y: -90 }, 'genre:hard-bop': { x: -1330, y: -330 },
  'genre:contemporary-jazz': { x: -1280, y: 140 }, 'genre:jazzy-hip-hop': { x: -620, y: 400 },
  // Discogs genres not researched yet (2026-11-13): on the rim, near their closest neighbours
  'genre:blues': { x: -1250, y: -760 }, 'genre:classical': { x: 760, y: -1060 }, 'genre:stage-screen': { x: 1260, y: -820 },
  'genre:brass-military': { x: -1330, y: 760 }, 'genre:childrens': { x: -380, y: 1000 }, 'genre:non-music': { x: 1300, y: 980 },
};

export interface Filters {
  types: Set<EntityType>;
  classes: Set<ClaimClass>;
  decades: [number, number];   // inclusive decade starts, e.g. [1960, 2020]
  country: CountryCode | '';
  hideUnverified: boolean;
  statusOnly: boolean;          // personal mode: only nodes with a status or reaction
  producers: boolean;           // the producer layer (producers + the records they connect)
}

export const ALL_TYPES: EntityType[] = ['genre', 'scene', 'label', 'artist', 'release', 'track', 'producer', 'city', 'event', 'concept'];

export const DEFAULT_FILTERS: Filters = {
  types: new Set<EntityType>(['genre', 'scene', 'label', 'artist', 'release', 'track', 'event', 'producer']),
  classes: new Set<ClaimClass>(['fact', 'history', 'interpretation', 'personal']),
  decades: [1960, 2020],
  country: '',
  hideUnverified: false,
  statusOnly: false,
  producers: false,
};

export function inProducerLayer(e: Entity): boolean {
  return e.type === 'producer' || e.attrs?.layer === 'producers';
}

export function entityCountry(e: Entity, entities: Map<string, Entity>): CountryCode | undefined {
  if (e.country) return e.country;
  if (e.city) return entities.get(e.city)?.country;
  if (e.attrs?.artist) {
    const a = entities.get(e.attrs.artist);
    return a ? entityCountry(a, entities) : undefined;
  }
  return undefined;
}

export function entityYear(e: Entity, entities: Map<string, Entity>): number | undefined {
  if (e.years?.from) return e.years.from;
  if (e.attrs?.release) return entities.get(e.attrs.release)?.years?.from;
  return undefined;
}

export function passesFilters(e: Entity, snap: Snapshot, f: Filters, personal: boolean): boolean {
  if (!f.types.has(e.type)) return false;
  if (!f.producers && inProducerLayer(e)) return false;
  if (f.hideUnverified && e.confidence === 'unverified') return false;
  const y = entityYear(e, snap.entities);
  if (y !== undefined) {
    const to = e.years?.to ?? (e.type === 'release' || e.type === 'track' || e.type === 'event' ? y : 2030);
    if (to < f.decades[0] || y > f.decades[1] + 9) return false;
  }
  if (f.country) {
    const c = entityCountry(e, snap.entities);
    if (c !== f.country) return false;
  }
  if (personal && f.statusOnly && e.type !== 'genre') {
    if (!snap.journal.statuses[e.id] && !snap.journal.reactions.some((r) => r.target === e.id)) return false;
  }
  return true;
}

/** A Discogs top-level genre (the start view of the map). */
export const isTopGenre = (e: Entity | undefined) => e?.type === 'genre' && e.attrs?.level === 'genre';

/** Top-level genres an entity belongs to: a genre is itself, a style its parents, the rest through their styles. */
export function topGenresOf(snap: Snapshot, id: string, depth = 0): string[] {
  const e = snap.entities.get(id);
  if (!e || depth > 3) return [];
  if (isTopGenre(e)) return [e.id];
  if (e.type === 'genre') return (e.attrs?.genres ?? []).filter((g) => isTopGenre(snap.entities.get(g)));
  const via: string[] = [];
  for (const r of snap.relations) if (r.from === id && r.type === 'in_genre') via.push(r.to);
  if (e.attrs?.release) via.push(e.attrs.release);
  if (e.attrs?.artist) via.push(e.attrs.artist);
  const out: string[] = [];
  for (const v of via) for (const g of topGenresOf(snap, v, depth + 1)) if (!out.includes(g)) out.push(g);
  return out;
}

/** Styles of a top-level genre. */
export function stylesOf(snap: Snapshot, genre: string): string[] {
  return [...snap.entities.values()].filter((e) => e.type === 'genre' && (e.attrs?.genres ?? []).includes(genre)).map((e) => e.id);
}

/** Influence between genres/styles as "who shaped whom": influenced runs from→to, emerged_from the other way. */
export function influenceOf(snap: Snapshot, r: Relation): [string, string] | null {
  if (r.type !== 'influenced' && r.type !== 'emerged_from') return null;
  if (snap.entities.get(r.from)?.type !== 'genre' || snap.entities.get(r.to)?.type !== 'genre') return null;
  return r.type === 'influenced' ? [r.from, r.to] : [r.to, r.from];
}

/** Influence between top-level genres, one line per direction: a shaped b through n links between their styles. */
export function genreLinks(snap: Snapshot): { a: string; b: string; n: number }[] {
  const count = new Map<string, number>();
  for (const r of snap.relations) {
    const f = influenceOf(snap, r); if (!f) continue;
    for (const a of topGenresOf(snap, f[0])) for (const b of topGenresOf(snap, f[1])) {
      if (a === b) continue;
      const k = `${a}>${b}`; count.set(k, (count.get(k) ?? 0) + 1);
    }
  }
  return [...count].map(([k, n]) => { const [a, b] = k.split('>'); return { a, b, n }; });
}

export function relationClass(r: Relation): ClaimClass { return RELATION_CLASS[r.type]; }

const QUIET = new Set(['style_of', 'in_genre', 'released', 'track_of', 'based_in', 'signed_to', 'on_label']);

export function buildElements(snap: Snapshot): ElementDefinition[] {
  const degree = new Map<string, number>();
  for (const r of snap.relations) {
    degree.set(r.from, (degree.get(r.from) ?? 0) + 1);
    degree.set(r.to, (degree.get(r.to) ?? 0) + 1);
  }
  const nodes: ElementDefinition[] = [...snap.entities.values()].map((e) => ({
    group: 'nodes',
    data: { id: e.id, label: e.name, type: e.type, degree: degree.get(e.id) ?? 0, cover: snap.covers[e.id]?.src },
    classes: [e.type, e.type === 'genre' && e.attrs?.level === 'genre' ? 'lvl-genre' : '', e.confidence, e.attrs?.placeholder ? 'placeholder' : '', snap.covers[e.id] ? 'has-cover' : '',
      inProducerLayer(e) ? 'layer-producers' : ''].join(' '),
  }));
  const edges: ElementDefinition[] = snap.relations.map((r) => ({
    group: 'edges',
    data: { id: r.id, source: r.from, target: r.to, type: r.type, rlabel: RELATION_LABEL[r.type][0] },
    classes: [relationClass(r), r.confidence, `t-${r.type}`, QUIET.has(r.type) ? 'quiet' : '',
      isGenreEdge(snap, r) ? 'genre-edge' : ''].join(' '),
  }));
  // pairs of styles with no direct link but much in common: shown only together with interpretations
  const hidden: ElementDefinition[] = hiddenBridges(snap).map((h) => ({
    group: 'edges',
    data: { id: `hb:${h.a}~${h.b}`, source: h.a, target: h.b, type: 'sounds_akin', rlabel: `прихований місток · ${h.weight}` },
    classes: 'interpretation likely hidden-bridge genre-edge',
  }));
  // the start view: one line per pair of top-level genres, as thick as the links between their styles
  const agg: ElementDefinition[] = genreLinks(snap).map((l) => ({
    group: 'edges',
    data: { id: `agg:${l.a}>${l.b}`, source: l.a, target: l.b, type: 'influenced', weight: l.n,
      rlabel: `${snap.entities.get(l.a)?.name} → ${snap.entities.get(l.b)?.name} · ${l.n}` },
    classes: 'agg genre-edge',
  }));
  // inside an opened genre: a style's influence to/from another genre, drawn to that genre as a whole
  const xg = new Map<string, { s: string; t: string; n: number }>();
  for (const r of snap.relations) {
    const f = influenceOf(snap, r); if (!f) continue;
    const A = topGenresOf(snap, f[0]); const B = topGenresOf(snap, f[1]);
    for (const g of B) if (!A.includes(g) && f[0] !== g) { const k = `${f[0]}>${g}`; xg.set(k, { s: f[0], t: g, n: (xg.get(k)?.n ?? 0) + 1 }); }
    for (const g of A) if (!B.includes(g) && f[1] !== g) { const k = `${g}>${f[1]}`; xg.set(k, { s: g, t: f[1], n: (xg.get(k)?.n ?? 0) + 1 }); }
  }
  const xgEdges: ElementDefinition[] = [...xg].map(([k, x]) => ({
    group: 'edges',
    data: { id: `xg:${k}`, source: x.s, target: x.t, type: 'influenced', weight: x.n,
      rlabel: `${snap.entities.get(x.s)?.name} → ${snap.entities.get(x.t)?.name}` },
    classes: 'xg history',
  }));
  const nstyles = new Map<string, number>();
  for (const e of snap.entities.values()) if (e.type === 'genre') for (const g of e.attrs?.genres ?? []) nstyles.set(g, (nstyles.get(g) ?? 0) + 1);
  for (const n of nodes) if (nstyles.has(n.data.id as string)) n.data.nstyles = nstyles.get(n.data.id as string);
  return [...nodes, ...edges, ...hidden, ...agg, ...xgEdges];
}

/** An edge between two genres/styles that opens the bridge panel (not a style's own parent link). */
export function isGenreEdge(snap: Snapshot, r: { type: string; from: string; to: string }): boolean {
  return r.type !== 'style_of' && snap.entities.get(r.from)?.type === 'genre' && snap.entities.get(r.to)?.type === 'genre';
}

export function statusClass(s: Status | undefined): string {
  return s ? `st-${s}` : '';
}

// ---------------- visual language ----------------

const C = {
  ink: '#ece6dc', muted: '#8f877b', faint: '#4a453e', bg: '#12110f',
  genre: '#b4574a', scene: '#c9a46a', label: '#6f93b3', artist: '#d8d1c5', release: '#9c9488', producer: '#5fb8a6',
  track: '#7a7368', aux: '#6d665c', accent: '#e8a13a',
};
const SERIF = 'Fraunces, Georgia, serif';
const SANS = '"IBM Plex Sans", system-ui, sans-serif';

export const stylesheet: StylesheetJson = [
  { selector: 'node', style: {
    'label': 'data(label)', 'color': C.ink, 'font-family': SANS, 'font-size': 11, 'text-valign': 'bottom',
    'text-margin-y': 4, 'text-outline-color': C.bg, 'text-outline-width': 2.5, 'text-outline-opacity': 0.9,
    'min-zoomed-font-size': 9, 'width': 10, 'height': 10, 'border-width': 0,
    'transition-property': 'opacity, background-color, border-color, width, height', 'transition-duration': 220,
  } },
  { selector: 'node.genre', style: {
    'shape': 'ellipse', 'background-color': C.genre, 'background-opacity': 0.2, 'border-width': 1.5, 'border-color': C.genre,
    'width': 'mapData(degree, 1, 40, 46, 96)', 'height': 'mapData(degree, 1, 40, 46, 96)',
    'font-family': SERIF, 'font-weight': 600, 'font-size': 24, 'text-valign': 'center', 'text-margin-y': 0,
    'min-zoomed-font-size': 4, 'text-outline-width': 3, 'z-index': 5,
  } },
  { selector: 'node.genre.lvl-genre', style: {
    'width': 132, 'height': 132, 'background-opacity': 0.32, 'border-width': 2.5, 'font-size': 32,
    'text-transform': 'uppercase', 'min-zoomed-font-size': 2, 'z-index': 6,
  } },
  { selector: 'node.scene', style: {
    'shape': 'ellipse', 'background-color': C.scene, 'background-opacity': 0.1, 'border-width': 1.2, 'border-color': C.scene,
    'border-style': 'dashed', 'width': 38, 'height': 38, 'font-family': SERIF, 'font-size': 15, 'font-style': 'italic',
    'color': '#e3cfa8', 'min-zoomed-font-size': 6, 'z-index': 4,
  } },
  { selector: 'node.scene.placeholder', style: { 'opacity': 0.55, 'border-color': C.aux } },
  { selector: 'node.label', style: {
    'shape': 'round-rectangle', 'background-color': C.label, 'background-opacity': 0.18, 'border-width': 1.2, 'border-color': C.label,
    'width': 26, 'height': 26, 'font-size': 11, 'font-weight': 600, 'text-transform': 'uppercase', 'color': '#b9cde0',
    'min-zoomed-font-size': 7, 'z-index': 4,
  } },
  { selector: 'node.artist', style: {
    'background-color': C.artist, 'width': 'mapData(degree, 1, 16, 7, 18)', 'height': 'mapData(degree, 1, 16, 7, 18)',
    'font-size': 12, 'z-index': 3,
  } },
  { selector: 'node.release', style: {
    'shape': 'rectangle', 'background-color': C.release, 'width': 9, 'height': 9, 'font-size': 10.5,
    'font-style': 'italic', 'color': '#c9c1b5', 'min-zoomed-font-size': 10,
  } },
  { selector: 'node.release.has-cover', style: {
    'background-image': 'data(cover)', 'background-fit': 'cover', 'background-opacity': 1, 'width': 22, 'height': 22,
    'border-width': 0.5, 'border-color': '#000'
  } },
  { selector: 'node.track', style: {
    'shape': 'ellipse', 'background-color': C.track, 'width': 5, 'height': 5, 'font-size': 9.5, 'color': '#a59d90', 'min-zoomed-font-size': 11,
  } },
  { selector: 'node.city', style: {
    'shape': 'round-triangle', 'background-opacity': 0, 'border-width': 1.2, 'border-color': C.aux, 'width': 12, 'height': 12,
    'font-size': 10, 'color': C.muted, 'text-transform': 'uppercase', 'min-zoomed-font-size': 8,
  } },
  { selector: 'node.event', style: {
    'shape': 'diamond', 'background-opacity': 0, 'border-width': 1.2, 'border-color': C.aux, 'width': 13, 'height': 13,
    'font-size': 10, 'color': C.muted, 'min-zoomed-font-size': 9,
  } },
  { selector: 'node.concept', style: {
    'shape': 'hexagon', 'background-opacity': 0, 'border-width': 1.2, 'border-color': C.aux, 'width': 14, 'height': 14,
    'font-size': 10, 'color': C.muted, 'font-style': 'italic', 'min-zoomed-font-size': 9,
  } },
  { selector: 'node.producer', style: {
    'shape': 'star', 'background-color': C.producer, 'background-opacity': 0.9,
    'width': 'mapData(degree, 1, 8, 16, 30)', 'height': 'mapData(degree, 1, 8, 16, 30)',
    'font-size': 12.5, 'font-weight': 600, 'color': '#a9e0d4', 'min-zoomed-font-size': 6, 'z-index': 6,
  } },
  { selector: 'node.unverified', style: { 'border-style': 'dotted' } },

  { selector: 'edge', style: {
    'width': 0.8, 'line-color': C.artist, 'line-opacity': 0.14, 'curve-style': 'straight',
    'target-arrow-shape': 'none', 'arrow-scale': 0.6, 'font-family': SANS, 'font-size': 9, 'color': C.muted,
    'text-rotation': 'autorotate', 'text-background-color': C.bg, 'text-background-opacity': 0.85, 'text-background-padding': '2px',
    'min-zoomed-font-size': 8, 'transition-property': 'line-opacity, width', 'transition-duration': 220,
  } },
  { selector: 'edge.history', style: {
    'width': 1.6, 'line-color': C.genre, 'line-opacity': 0.5, 'curve-style': 'unbundled-bezier',
    'control-point-distances': 40, 'control-point-weights': 0.5, 'target-arrow-shape': 'triangle', 'target-arrow-color': C.genre,
  } },
  { selector: 'edge.t-in_genre', style: {
    'width': 0.8, 'line-opacity': 0.16, 'target-arrow-shape': 'none', 'curve-style': 'straight', 'line-color': C.genre,
  } },
  { selector: 'edge.t-style_of', style: {
    'width': 2.2, 'line-opacity': 0.1, 'target-arrow-shape': 'none', 'curve-style': 'straight', 'line-color': C.genre,
  } },
  { selector: 'edge.interpretation', style: {
    'line-style': 'dashed', 'line-dash-pattern': [4, 4], 'line-color': C.scene, 'line-opacity': 0.4, 'width': 1, 'curve-style': 'unbundled-bezier',
    'control-point-distances': 25, 'control-point-weights': 0.5,
  } },
  { selector: 'edge.t-produced, edge.t-mixed', style: {
    'line-color': C.producer, 'line-opacity': 0.55, 'width': 1.3, 'curve-style': 'unbundled-bezier',
    'control-point-distances': 20, 'control-point-weights': 0.5, 'target-arrow-shape': 'none',
  } },
  { selector: 'edge.t-mixed', style: { 'line-style': 'dashed', 'line-dash-pattern': [5, 3] } },
  { selector: 'edge.lit.t-produced, edge.lit.t-mixed', style: { 'line-color': C.producer, 'color': '#a9e0d4' } },
  { selector: 'edge.hidden-bridge', style: {
    'line-style': 'dashed', 'line-dash-pattern': [2, 5], 'line-color': C.genre, 'line-opacity': 0.35, 'width': 1,
    'curve-style': 'straight', 'target-arrow-shape': 'none',
  } },
  { selector: 'node.genre.lvl-genre.topview', style: {
    'width': 'mapData(nstyles, 1, 21, 150, 300)', 'height': 'mapData(nstyles, 1, 21, 150, 300)', 'font-size': 72,
  } },
  { selector: 'node.genre.lvl-genre.placeholder', style: {
    'background-opacity': 0.06, 'border-style': 'dashed', 'border-opacity': 0.55, 'border-width': 2, 'color': '#8f877b',
  } },
  { selector: 'node.genre.lvl-genre.placeholder.topview', style: { 'width': 120, 'height': 120, 'font-size': 52 } },
  { selector: 'edge.agg', style: {
    'width': 'mapData(weight, 1, 5, 6, 24)', 'line-color': C.genre, 'line-opacity': 0.55, 'curve-style': 'bezier',
    'control-point-step-size': 60, 'target-arrow-shape': 'triangle', 'target-arrow-color': C.genre, 'arrow-scale': 1.1,
    'label': 'data(weight)', 'font-size': 64, 'color': '#e3b9a8', 'text-background-opacity': 0, 'text-outline-color': C.bg,
    'text-outline-width': 6, 'min-zoomed-font-size': 3,
  } },
  { selector: 'node.inring', style: { 'font-size': 30, 'min-zoomed-font-size': 3 } },
  { selector: 'node.ext', style: { 'background-opacity': 0.1, 'border-style': 'dashed', 'width': 110, 'height': 110, 'font-size': 26 } },
  { selector: 'edge.xg', style: { 'width': 'mapData(weight, 1, 3, 1.6, 4)', 'line-opacity': 0.55, 'line-style': 'solid',
    'curve-style': 'straight', 'target-arrow-shape': 'triangle', 'arrow-scale': 0.9 } },
  { selector: 'edge.genre-edge', style: { 'overlay-padding': 6 } },
  { selector: 'edge.agg.hover', style: { 'line-opacity': 0.9, 'width': 'mapData(weight, 1, 5, 6, 24)', 'label': 'data(rlabel)', 'font-size': 44 } },
  { selector: 'edge.genre-edge.hover', style: { 'line-opacity': 0.95, 'width': 2.6, 'label': 'data(rlabel)', 'z-index': 15 } },
  { selector: 'edge.personal', style: { 'line-color': C.accent, 'line-opacity': 0.6, 'width': 1.4, 'line-style': 'dotted' } },
  { selector: 'edge.unverified', style: { 'line-opacity': 0.2 } },
  { selector: 'edge.disputed', style: { 'line-dash-pattern': [1, 3], 'line-style': 'dashed' } },

  // ---- personal mode ----
  { selector: 'node.pmode', style: { 'background-color': '#3a362f', 'border-color': '#4a453e', 'color': '#8f877b' } },
  { selector: 'node.pmode.genre', style: { 'background-color': '#3a362f', 'background-opacity': 0.25, 'color': '#a59d90' } },
  { selector: 'node.hasstatus[type != "genre"][type != "scene"][type != "label"]', style: { 'width': 12, 'height': 12, 'min-zoomed-font-size': 5, 'color': '#d9c4a0' } },
  { selector: 'node.pmode.has-cover', style: { 'background-image-opacity': 0.3 } },
  { selector: 'node.has-cover.hasstatus', style: { 'width': 24, 'height': 24, 'border-width': 2.5, 'background-image-opacity': 1 } },
  { selector: 'node.st-liked, node.st-favorite', style: { 'background-color': C.accent, 'background-opacity': 1, 'border-color': C.accent, 'color': '#f4d9a8' } },
  { selector: 'node.st-favorite', style: { 'border-width': 4, 'border-opacity': 0.35 } },
  { selector: 'node.st-listened, node.st-familiar, node.st-deep', style: { 'background-color': C.accent, 'background-opacity': 0.45, 'border-color': C.accent, 'color': '#d9c4a0' } },
  { selector: 'node.st-to_listen, node.st-curious', style: { 'background-opacity': 0, 'border-width': 1.6, 'border-color': C.accent, 'border-style': 'solid', 'color': '#d9c4a0' } },
  { selector: 'node.st-listening, node.st-exploring', style: { 'background-color': C.accent, 'background-opacity': 0.2, 'border-width': 3, 'border-color': C.accent, 'color': '#f4d9a8' } },
  { selector: 'node.st-recommended', style: { 'background-opacity': 0, 'border-width': 1.2, 'border-color': C.accent, 'border-style': 'dotted', 'color': '#bfae90' } },
  { selector: 'node.st-revisit', style: { 'background-opacity': 0, 'border-width': 1.6, 'border-color': C.accent, 'border-style': 'dashed' } },
  { selector: 'node.st-disliked, node.st-not_now', style: { 'background-color': '#2a2723', 'background-opacity': 1, 'border-width': 1, 'border-color': '#6d665c', 'border-style': 'dotted', 'color': '#6d665c' } },

  // ---- focus & path ----
  { selector: '.hidden', style: { 'display': 'none' } },
  { selector: '.faded', style: { 'opacity': 0.12 } },
  { selector: 'edge.faded', style: { 'opacity': 0.04 } },
  { selector: 'node.focus', style: { 'border-width': 2.5, 'border-color': C.ink, 'border-style': 'solid', 'z-index': 20 } },
  { selector: 'node.neighbour', style: { 'z-index': 10, 'min-zoomed-font-size': 3 } },
  { selector: 'edge.lit', style: { 'line-opacity': 0.9, 'width': 1.8, 'label': 'data(rlabel)', 'z-index': 10 } },
  { selector: 'edge.lit.fact', style: { 'line-color': C.ink } },
  { selector: 'edge.lit.quiet', style: { 'label': '' } },
  { selector: 'node.onpath', style: { 'border-width': 2.5, 'border-color': C.accent, 'border-style': 'solid', 'z-index': 20, 'min-zoomed-font-size': 2 } },
  { selector: 'edge.onpath', style: { 'line-color': C.accent, 'target-arrow-color': C.accent, 'line-opacity': 1, 'width': 3, 'label': 'data(rlabel)', 'z-index': 20, 'color': C.accent } },
  { selector: 'node.fresh', style: { 'opacity': 0 } },
];
