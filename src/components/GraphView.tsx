import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import cytoscape, { type Core, type NodeSingular } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import type { Snapshot } from '../lib/repository';
import { repo } from '../lib/repository';
import { buildElements, stylesheet, GENRE_ANCHORS, passesFilters, statusClass, type Filters } from '../lib/graph';
import { RELATION_CLASS } from '../data/schema';

cytoscape.use(fcose);

export interface GraphHandle {
  centerOn(id: string): void;
  fit(): void;
  focusOn(ids: string[], inset: { right: number; bottom: number }, withNeighbours?: boolean): void;
  relayout(): void;
  shortestPath(a: string, b: string, includeInterpretation: boolean): { nodes: string[]; edges: string[] } | null;
}

interface Props {
  snap: Snapshot;
  visible: Set<string>;
  filters: Filters;
  personal: boolean;
  /** start view: only top-level genres, joined by summary lines */
  top: boolean;
  /** an opened genre: its styles are arranged in a ring around it */
  bundle: { center: string; members: string[]; ext: string[] } | null;
  selected: string | null;
  path: { nodes: string[]; edges: string[] } | null;
  onSelect(id: string, shift: boolean): void;
  onBackground(): void;
  onExpand(id: string): void;
  onBridge(a: string, b: string): void;
}

function runLayout(cy: Core, onDone: () => void) {
  const fixed = Object.entries(GENRE_ANCHORS)
    .filter(([id]) => cy.getElementById(id).nonempty())
    .map(([nodeId, position]) => ({ nodeId, position }));
  cy.nodes().forEach((n) => {
    const a = GENRE_ANCHORS[n.id()];
    if (a) n.position(a);
  });
  const layout = cy.elements().not('.agg').layout({
    name: 'fcose', quality: 'proof', randomize: true, animate: false, fit: false,
    nodeRepulsion: () => 9000, idealEdgeLength: (e: any) => (e.hasClass('t-style_of') ? 260 : e.hasClass('t-in_genre') ? 140 : 90),
    edgeElasticity: () => 0.3, gravity: 0.15, numIter: 3000, nodeSeparation: 60,
    fixedNodeConstraint: fixed,
  } as any);
  layout.one('layoutstop', onDone);
  layout.run();
}

function placeNear(n: NodeSingular) {
  const nb = n.neighborhood('node').filter((x) => x.id() !== n.id());
  if (nb.empty()) { n.position({ x: Math.random() * 400 - 200, y: Math.random() * 400 - 200 }); return; }
  let x = 0; let y = 0;
  nb.forEach((m) => { x += m.position('x'); y += m.position('y'); });
  const a = Math.random() * Math.PI * 2; const r = 70 + Math.random() * 50;
  n.position({ x: x / nb.length + Math.cos(a) * r, y: y / nb.length + Math.sin(a) * r });
}

function placeUnsaved(cy: Core, todo: NodeSingular[]) {
  const placed = new Set(cy.nodes().filter((n) => !todo.includes(n)).map((n) => n.id()));
  for (const n of todo) {
    const a = GENRE_ANCHORS[n.id()];
    if (a) { n.position(a); placed.add(n.id()); }
  }
  let rest = todo.filter((n) => !placed.has(n.id()));
  for (let pass = 0; pass < 6 && rest.length; pass++) {
    const next: NodeSingular[] = [];
    for (const n of rest) {
      const nb = n.neighborhood('node').filter((m) => placed.has(m.id()));
      if (nb.empty()) { next.push(n); continue; }
      let x = 0; let y = 0;
      nb.forEach((m) => { x += m.position('x'); y += m.position('y'); });
      const a = Math.random() * Math.PI * 2; const r = 70 + Math.random() * 50;
      n.position({ x: x / nb.length + Math.cos(a) * r, y: y / nb.length + Math.sin(a) * r });
      placed.add(n.id());
    }
    if (next.length === rest.length) break;
    rest = next;
  }
  rest.forEach(placeNear);
}

function savePositions(cy: Core) {
  const p: Record<string, { x: number; y: number }> = {};
  cy.nodes().forEach((n) => { const { x, y } = n.position(); p[n.id()] = { x: Math.round(x), y: Math.round(y) }; });
  repo.savePositions(p);
}

export const GraphView = forwardRef<GraphHandle, Props>(function GraphView(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const cbs = useRef(props);
  cbs.current = props;
  const prevVisible = useRef<Set<string>>(new Set());
  const home = useRef<Map<string, { x: number; y: number }>>(new Map()); // the shared arrangement, before any ring

  // ---- init ----
  useEffect(() => {
    const cy = cytoscape({
      container: host.current!, elements: buildElements(props.snap), style: stylesheet,
      layout: { name: 'preset' }, minZoom: 0.12, maxZoom: 3.5, wheelSensitivity: 0.25,
      boxSelectionEnabled: false, selectionType: 'single',
    });
    cyRef.current = cy;
    (window as unknown as { __cy: Core }).__cy = cy; // handy for checks from the console
    const saved = props.snap.positions;
    // the producer layer is added on top of an existing arrangement, so it does not count towards a full relayout
    const base = cy.nodes().not('.layer-producers');
    const known = base.filter((n) => !!saved[n.id()]);
    if (known.length < base.length * 0.8) {
      runLayout(cy, () => { savePositions(cy); cy.fit(cy.nodes('.genre'), 60); });
    } else {
      cy.nodes().forEach((n) => { const p = saved[n.id()]; if (p) n.position(p); });
      placeUnsaved(cy, cy.nodes().filter((n) => !saved[n.id()]).toArray() as NodeSingular[]);
      cy.fit(cy.nodes('.genre'), 60);
    }
    cy.on('tap', 'node', (e) => cbs.current.onSelect(e.target.id(), !!(e.originalEvent as MouseEvent)?.shiftKey));
    cy.on('dbltap', 'node', (e) => cbs.current.onExpand(e.target.id()));
    cy.on('tap', (e) => { if (e.target === cy) cbs.current.onBackground(); });
    // a genre ⇄ genre edge opens the bridge; the influencer goes first
    cy.on('tap', 'edge.genre-edge', (e) => {
      const ed = e.target; const t = ed.data('type');
      const [a, b] = t === 'emerged_from' ? [ed.target().id(), ed.source().id()] : [ed.source().id(), ed.target().id()];
      cbs.current.onBridge(a, b);
    });
    cy.on('mouseover', 'edge.genre-edge', (e) => { e.target.addClass('hover'); host.current!.style.cursor = 'pointer'; });
    cy.on('mouseout', 'edge.genre-edge', (e) => { e.target.removeClass('hover'); host.current!.style.cursor = ''; });
    // a drag moves the node in the shared arrangement; rings and gathered links are never saved
    cy.on('dragfree', 'node', (e) => {
      home.current.set(e.target.id(), { ...e.target.position() });
      const p: Record<string, { x: number; y: number }> = {};
      home.current.forEach((v, k) => { p[k] = { x: Math.round(v.x), y: Math.round(v.y) }; });
      repo.savePositions(p);
    });
    document.fonts?.ready.then(() => cy.style().update());
    return () => cy.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- structural sync (entities / relations added by the user) ----
  useEffect(() => {
    const cy = cyRef.current; if (!cy) return;
    const els = buildElements(props.snap);
    const ids = new Set(els.map((e) => e.data.id as string));
    cy.batch(() => {
      cy.elements().filter((e) => !ids.has(e.id())).remove();
      const fresh = els.filter((e) => cy.getElementById(e.data.id as string).empty());
      const freshNodes = fresh.filter((e) => e.group === 'nodes');
      cy.add(freshNodes);
      cy.add(fresh.filter((e) => e.group === 'edges'));
      freshNodes.forEach((e) => {
        const n = cy.getElementById(e.data.id as string); placeNear(n);
        if (home.current.size) home.current.set(n.id(), { ...n.position() });
      });
      // keep degree current for sizing
      els.forEach((e) => {
        if (e.group !== 'nodes') return;
        const n = cy.getElementById(e.data.id as string);
        n.data('degree', e.data.degree);
        if (n.data('cover') !== e.data.cover) { n.data('cover', e.data.cover); n.toggleClass('has-cover', !!e.data.cover); }
      });
    });
  }, [props.snap.entities, props.snap.relations]);

  // ---- visibility, filters, mode, focus ----
  useEffect(() => {
    const cy = cyRef.current; if (!cy) return;
    const { snap, visible, filters, personal, selected, path, top, bundle } = props;
    if (!home.current.size) cy.nodes().forEach((n) => { home.current.set(n.id(), { ...n.position() }); });
    const shown = new Set<string>();
    const appeared: string[] = [];
    cy.batch(() => {
      host.current!.classList.toggle('mode-personal', personal);
      cy.container()!.classList.toggle('mode-personal', personal);
      cy.nodes().forEach((n) => {
        const e = snap.entities.get(n.id());
        const onPath = path?.nodes.includes(n.id());
        const ok = !!e && (onPath || (visible.has(n.id()) && passesFilters(e, snap, filters, personal)));
        n.toggleClass('hidden', !ok);
        if (ok) { shown.add(n.id()); if (!prevVisible.current.has(n.id())) appeared.push(n.id()); }
        n.classes(n.classes().filter((c: string) => !c.startsWith('st-')));
        n.removeClass('hasstatus');
        if (personal && e) {
          const sc = statusClass(snap.journal.statuses[e.id]); if (sc) n.addClass(sc);
          if (sc || snap.journal.reactions.some((r) => r.target === e.id)) n.addClass('hasstatus');
        }
        if (personal) n.addClass('pmode'); else n.removeClass('pmode');
        n.toggleClass('topview', top && n.hasClass('lvl-genre'));
      });
      cy.edges().forEach((ed) => {
        const cls = RELATION_CLASS[ed.data('type') as keyof typeof RELATION_CLASS];
        const onPath = path?.edges.includes(ed.id());
        if (ed.hasClass('xg')) {
          const b = props.bundle;
          const ok = !!b && !top && shown.has(ed.source().id()) && shown.has(ed.target().id())
            && (b.ext.includes(ed.source().id()) || b.ext.includes(ed.target().id()));
          ed.toggleClass('hidden', !(onPath || ok));
          return;
        }
        if (ed.hasClass('agg') || (top && ed.source().hasClass('lvl-genre') && ed.target().hasClass('lvl-genre'))) {
          ed.toggleClass('hidden', !(onPath || (top && ed.hasClass('agg') && shown.has(ed.source().id()) && shown.has(ed.target().id()))));
          return;
        }
        const ok = onPath || (shown.has(ed.source().id()) && shown.has(ed.target().id())
          && filters.classes.has(cls) && !(filters.hideUnverified && ed.hasClass('unverified'))
          && (cls !== 'personal' || personal));
        ed.toggleClass('hidden', !ok);
      });
      // focus
      cy.elements().removeClass('faded focus neighbour lit onpath');
      if (path) {
        cy.elements().addClass('faded');
        path.nodes.forEach((id) => cy.getElementById(id).removeClass('faded').addClass('onpath'));
        path.edges.forEach((id) => cy.getElementById(id).removeClass('faded').addClass('onpath'));
      } else if (selected) {
        const n = cy.getElementById(selected);
        if (n.nonempty()) {
          const hood = n.closedNeighborhood().filter((x) => !x.hasClass('hidden'));
          cy.elements().not(hood).addClass('faded');
          n.addClass('focus');
          hood.nodes().not(n).addClass('neighbour');
          hood.edges().addClass('lit');
        }
      }
      // nodes coming back start from the shared arrangement
      appeared.forEach((id) => { const h = home.current.get(id); if (h) cy.getElementById(id).position(h); });
      // start view: genres not researched yet sit on a rim close around the others
      if (top) {
        const tops = cy.nodes('.lvl-genre').filter((n) => !n.hasClass('hidden'));
        const real = tops.filter((n) => !n.hasClass('placeholder')); const rim = tops.filter((n) => n.hasClass('placeholder'));
        // a roomy circle in the map's own geography, so every arrow between genres can be read
        if (real.nonempty()) {
          const hp = (n: NodeSingular) => home.current.get(n.id()) ?? n.position();
          let x = 0; let y = 0; real.forEach((n) => { x += hp(n).x; y += hp(n).y; }); x /= real.length; y /= real.length;
          const ang = (n: NodeSingular) => Math.atan2(hp(n).y - y, hp(n).x - x);
          const order = real.toArray().sort((a, b) => ang(a as NodeSingular) - ang(b as NodeSingular)) as NodeSingular[];
          const R = Math.max(700, 115 * order.length);
          const a0 = ang(order[0]);
          order.forEach((n, i) => { const a = a0 + (i * 2 * Math.PI) / order.length; n.position({ x: x + Math.cos(a) * R, y: y + Math.sin(a) * R }); });
          rim.forEach((n) => { const a = ang(n); n.position({ x: x + Math.cos(a) * R * 1.4, y: y + Math.sin(a) * R * 1.4 }); });
        }
      }
      const ring = new Set<string>();
      if (bundle) {
        const c = cy.getElementById(bundle.center);
        const h = home.current.get(bundle.center); if (h && c.nonempty()) c.position(h);
        const cp = c.position();
        const members = bundle.members.map((id) => cy.getElementById(id)).filter((n) => n.nonempty() && !n.hasClass('hidden'));
        // keep the map's own geography: order the styles by where they sit around the genre
        const ang = (n: NodeSingular) => { const p = home.current.get(n.id()) ?? n.position(); return Math.atan2(p.y - cp.y, p.x - cp.x); };
        members.sort((a, b) => ang(a) - ang(b));
        const k = members.length; const R = Math.max(240, 46 * k / Math.PI);
        cy.nodes().removeClass('inring');
        members.forEach((n, i) => {
          const a = ang(members[0]) + (i * 2 * Math.PI) / k; const r = k > 10 && i % 2 ? R * 0.66 : R;
          n.position({ x: cp.x + Math.cos(a) * r, y: cp.y + Math.sin(a) * r });
          n.addClass('inring'); ring.add(n.id());
        });
        ring.add(bundle.center);
        // styles of other genres linked by influence: outside the ring, next to the style they touch
        cy.nodes().removeClass('ext');
        const want: { n: NodeSingular; a: number }[] = [];
        bundle.ext.forEach((id) => {
          const n = cy.getElementById(id) as NodeSingular; if (n.empty() || n.hasClass('hidden') || id === selected) return;
          const mates = n.connectedEdges('.xg').connectedNodes().filter((m) => ring.has(m.id()) && m.id() !== bundle.center);
          let a = ang(n);
          if (mates.nonempty()) { let x = 0; let y = 0; mates.forEach((m) => { x += m.position('x') - cp.x; y += m.position('y') - cp.y; }); a = Math.atan2(y, x); }
          want.push({ n, a });
        });
        // keep them apart: at least ~0.6 rad between neighbours on the outer ring
        want.sort((p, q) => p.a - q.a);
        const gap = Math.min(0.6, (2 * Math.PI) / Math.max(want.length, 1));
        for (let i = 1; i < want.length; i++) if (want[i].a - want[i - 1].a < gap) want[i].a = want[i - 1].a + gap;
        want.forEach(({ n, a }) => {
          n.position({ x: cp.x + Math.cos(a) * R * 1.5, y: cp.y + Math.sin(a) * R * 1.5 });
          n.addClass('ext'); ring.add(n.id());
        });
      } else cy.nodes().removeClass('ext');
      if (!bundle) cy.nodes().removeClass('inring');
      // the tapped node's own links gather around it
      const s = selected && !path ? cy.getElementById(selected) : null;
      if (s && s.nonempty()) {
        const sp = s.position();
        const out = s.neighborhood('node').filter((n) => !n.hasClass('hidden') && !ring.has(n.id()) && appeared.includes(n.id()));
        const k = out.length; const R = Math.max(260, 64 * k / Math.PI);
        out.forEach((n, i) => {
          const a = (i * 2 * Math.PI) / Math.max(k, 1) - Math.PI / 2; const r = k > 12 && i % 2 ? R * 0.7 : R;
          n.position({ x: sp.x + Math.cos(a) * r, y: sp.y + Math.sin(a) * r });
        });
      }
      appeared.forEach((id) => cy.getElementById(id).addClass('fresh'));
    });
    if (appeared.length) requestAnimationFrame(() => requestAnimationFrame(() => {
      cy.batch(() => appeared.forEach((id) => cy.getElementById(id).removeClass('fresh')));
    }));
    prevVisible.current = shown;
  }, [props.snap, props.visible, props.filters, props.personal, props.selected, props.path, props.top, props.bundle?.center]);

  useImperativeHandle(ref, () => ({
    centerOn(id) {
      const cy = cyRef.current; const n = cy?.getElementById(id);
      if (!cy || !n || n.empty()) return;
      cy.animate({ center: { eles: n }, zoom: Math.max(cy.zoom(), 1.1) }, { duration: 450, easing: 'ease-in-out-cubic' });
    },
    focusOn(ids, inset, withNeighbours = true) {
      const cy = cyRef.current; if (!cy) return;
      let eles = cy.collection();
      ids.forEach((id) => { const n = cy.getElementById(id); if (n.nonempty()) eles = eles.union(withNeighbours ? n.closedNeighborhood() : n); });
      eles = eles.filter((x) => x.visible());
      if (eles.empty()) return;
      const bb = eles.boundingBox({ includeLabels: true });
      const W = cy.width() - inset.right; const H = cy.height() - inset.bottom; const pad = W < 500 ? 30 : 70;
      const zoom = Math.max(0.3, Math.min(1.6, (W - 2 * pad) / Math.max(bb.w, 1), (H - 2 * pad - 50) / Math.max(bb.h, 1)));
      const cx = (bb.x1 + bb.x2) / 2; const cyy = (bb.y1 + bb.y2) / 2;
      cy.animate({ zoom, pan: { x: W / 2 - cx * zoom, y: (H - 40) / 2 - cyy * zoom } }, { duration: 500, easing: 'ease-in-out-cubic' });
    },
    fit() {
      const cy = cyRef.current; if (!cy) return;
      cy.animate({ fit: { eles: cy.elements(':visible'), padding: cy.width() < 500 ? 20 : 60 } }, { duration: 450 });
    },
    relayout() {
      const cy = cyRef.current; if (!cy) return;
      runLayout(cy, () => {
        savePositions(cy); home.current.clear(); cy.nodes().forEach((n) => { home.current.set(n.id(), { ...n.position() }); });
        cy.fit(cy.elements(':visible'), 60);
      });
    },
    shortestPath(a, b, includeInterpretation) {
      const cy = cyRef.current; if (!cy) return null;
      const eles = cy.elements().filter((el) => el.isNode()
        || (!el.hasClass('hidden-bridge') && !el.hasClass('agg') && RELATION_CLASS[el.data('type') as keyof typeof RELATION_CLASS] !== 'personal'
          && (includeInterpretation || RELATION_CLASS[el.data('type') as keyof typeof RELATION_CLASS] !== 'interpretation')));
      const res = eles.aStar({
        root: cy.getElementById(a), goal: cy.getElementById(b), directed: false,
        // genres and cities are hubs: make passing through "based in" / city cheaper to avoid
        weight: (e) => (e.data('type') === 'based_in' || e.data('type') === 'style_of' ? 3 : e.data('type') === 'in_genre' ? 1.5 : 1),
      });
      if (!res.found) return null;
      return { nodes: res.path.nodes().map((n) => n.id()), edges: res.path.edges().map((e) => e.id()) };
    },
  }), []);

  return <div ref={host} className="graph" aria-label="Карта музичних зв’язків" />;
});
