// "Наближення": one canvas, three depths. Far: genres and influence arrows. Closer: styles inside their genre's
// territory and who shaped whom. Closest: artists. What you see depends on how close you look.
import { useEffect, useRef } from 'react';
import type { Snapshot } from '../lib/repository';
import { viewModel, zoomLayout, colorOf, rgba } from '../lib/views';

const C = { bg: '#12110f', ink: '#ece6dc', ink2: '#c9c1b5', muted: '#8f877b', accent: '#e8a13a' };
const L1: [number, number] = [0.32, 0.5]; const L2: [number, number] = [1.1, 1.5];
const LEVEL_S = [0.2, 0.75, 1.8];
const ramp = (v: number, [a, b]: [number, number]) => Math.max(0, Math.min(1, (v - a) / (b - a)));
type Rect = [number, number, number, number];
const hit = (a: Rect, b: Rect) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

interface Props {
  snap: Snapshot; selected: string | null; personal: boolean;
  inset: { right: number; bottom: number }; sheet?: string;
  onSelect(id: string): void; onBackground(): void;
}

export function ZoomView(props: Props) {
  const cv = useRef<HTMLCanvasElement>(null);
  const level = useRef<HTMLDivElement>(null);
  const P = useRef(props); P.current = props;
  const api = useRef<{ draw(): void; focus(id: string, s?: number): void; fit(): void; level(i: number): void } | null>(null);

  useEffect(() => {
    const c = cv.current!; const ctx = c.getContext('2d')!;
    let W = 0; let H = 0; let dpr = 1;
    let view = { s: 0.2, x: 0, y: 0 };
    let anim = 0;
    const hull = document.createElement('canvas'); const hctx = hull.getContext('2d')!;
    const imgs = new Map<string, HTMLImageElement | null>();
    const img = (src: string) => {
      if (imgs.has(src)) return imgs.get(src);
      const im = new Image(); imgs.set(src, null);
      im.onload = () => { imgs.set(src, im); draw(); };
      im.src = src; return null;
    };
    const m = () => viewModel(P.current.snap);
    const L = () => zoomLayout(m());
    const sx = (x: number) => x * view.s + view.x; const sy = (y: number) => y * view.s + view.y;
    const styleCount = (g: string) => m().styles.filter((s) => s.genres.includes(g)).length;
    const gr = (id: string) => {
      const g = m().genres.find((x) => x.id === id);
      const k = Math.max(0.7, Math.min(1.5, view.s / 0.2));
      return g?.placeholder ? 22 * k : (16 + Math.sqrt(styleCount(id)) * 7) * k;
    };
    const sr = (id: string) => {
      if (m().genres.some((g) => g.id === id)) return gr(id);
      const n = (m().artistsOf.get(id) ?? []).length;
      return (6 + Math.sqrt(n) * 2.4) * Math.max(0.8, Math.min(2.2, view.s / 0.6));
    };
    const name = (id: string) => P.current.snap.entities.get(id)?.name ?? id;
    let taken: Rect[] = [];
    // a label is drawn only where it does not cover one already drawn; `force` labels always draw
    const room = (r: Rect, force = false) => { if (!force && taken.some((t) => hit(t, r))) return false; taken.push(r); return true; };

    function curve(x1: number, y1: number, x2: number, y2: number, r1: number, r2: number) {
      const dx = x2 - x1; const dy = y2 - y1; const d = Math.hypot(dx, dy); if (d < r1 + r2 + 6) return null;
      const ux = dx / d; const uy = dy / d; const bend = Math.min(26, d * 0.08); const ox = -uy * bend; const oy = ux * bend;
      const ax = x1 + ux * r1; const ay = y1 + uy * r1; const bx = x2 - ux * (r2 + 2); const by = y2 - uy * (r2 + 2);
      return { ax, ay, bx, by, mx: (ax + bx) / 2 + ox, my: (ay + by) / 2 + oy };
    }
    function arrow(x1: number, y1: number, x2: number, y2: number, w: number, col: string, alpha: number, r1: number, r2: number) {
      const q = curve(x1, y1, x2, y2, r1, r2); if (!q || alpha <= 0.01) return null;
      const { ax, ay, bx, by, mx, my } = q;
      ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
      const tx = bx - mx; const ty = by - my; const tl = Math.hypot(tx, ty) || 1; const hx = tx / tl; const hy = ty / tl; const hs = 4 + w * 1.6;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.lineTo(bx - hx * hs - hy * hs * 0.6, by - hy * hs + hx * hs * 0.6); ctx.lineTo(bx - hx * hs + hy * hs * 0.6, by - hy * hs - hx * hs * 0.6); ctx.fill();
      ctx.globalAlpha = 1;
      return q;
    }
    function text(t: string, x: number, y: number, font: string, col: string, alpha: number, force = false) {
      if (alpha <= 0.01) return false;
      ctx.font = font; const w = ctx.measureText(t).width; const hgt = parseFloat(font.match(/(\d+(\.\d+)?)px/)?.[1] ?? '12');
      if (!room([x - w / 2 - 2, y - hgt, x + w / 2 + 2, y + 3], force)) return false;
      ctx.globalAlpha = alpha; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = C.bg;
      ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y); ctx.globalAlpha = 1;
      return true;
    }
    // genre names: two lines when one would run far past the circle
    function genreLabel(t: string, x: number, y: number, size: number, col: string, alpha: number, maxW: number) {
      const font = `600 ${size}px Fraunces, Georgia, serif`; ctx.font = font;
      if (ctx.measureText(t).width <= maxW || !t.includes(' ')) { text(t, x, y, font, col, alpha, true); return; }
      const cut = t.includes(' & ') ? t.indexOf(' & ') + 2 : t.lastIndexOf(' ', Math.ceil(t.length / 2) + 2);
      text(t.slice(0, cut).trim(), x, y - size * 0.55, font, col, alpha, true);
      text(t.slice(cut).trim(), x, y + size * 0.6, font, col, alpha, true);
    }

    function draw() {
      const { snap, selected, personal } = P.current; const mm = m(); const lay = L();
      taken = [];
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      const aS = ramp(view.s, L1); const aA = ramp(view.s, L2);
      const lv = aA > 0.5 ? 2 : aS > 0.5 ? 1 : 0;
      level.current?.querySelectorAll('button').forEach((e, i) => e.classList.toggle('on', i === lv));
      const focus = selected && lay.pos.has(selected) ? selected : null;
      const isGenre = (id: string) => mm.genres.some((g) => g.id === id);
      const touches = (id: string) => mm.influence.some(([a, b]) => (a === focus && b === id) || (b === focus && a === id));
      const dimMine = (id: string) => personal && !mm.mine.has(id);
      // context for style-level arrows: the selected node, or else the genre nearest the middle of the screen
      let ctxGenre: string | null = null;
      if (focus && isGenre(focus)) ctxGenre = focus;
      else if (!focus && aS > 0.5) {
        let bd = 1e9; const cx = (W - P.current.inset.right) / 2; const cy = (H - P.current.inset.bottom) / 2;
        mm.genres.forEach((g) => { if (g.placeholder) return; const p = lay.pos.get(g.id)!; const d = Math.hypot(sx(p[0]) - cx, sy(p[1]) - cy); if (d < bd) { bd = d; ctxGenre = g.id; } });
      }
      const inCtx = (id: string) => !!ctxGenre && (id === ctxGenre || (mm.byId.get(id) as { genres?: string[] } | undefined)?.genres?.includes(ctxGenre));

      // genre territories: one soft shape per genre around its own styles
      if (aS > 0.05) {
        hull.width = c.width; hull.height = c.height;
        mm.genres.forEach((g) => {
          const own = mm.styles.filter((s) => s.genres[0] === g.id); if (!own.length) return;
          hctx.setTransform(dpr, 0, 0, dpr, 0, 0); hctx.clearRect(0, 0, W, H); hctx.fillStyle = colorOf(g.id, mm);
          const pad = 62 * view.s;
          const pts = [lay.pos.get(g.id)!, ...own.map((s) => lay.pos.get(s.id)!)];
          pts.forEach((p) => { hctx.beginPath(); hctx.arc(sx(p[0]), sy(p[1]), pad + 6, 0, 7); hctx.fill(); });
          const dim = (ctxGenre && ctxGenre !== g.id && focus) || dimMine(g.id);
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = aS * (dim ? 0.05 : ctxGenre === g.id ? 0.17 : 0.12);
          ctx.drawImage(hull, 0, 0); ctx.globalAlpha = 1; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        });
      }

      // genre-level arrows fade as styles come in; their counts sit where they fit
      const counts: { t: string; x: number; y: number }[] = [];
      mm.genreLinks.forEach(({ a, b, n }) => {
        const pa = lay.pos.get(a); const pb = lay.pos.get(b); if (!pa || !pb) return;
        const al = 0.75 * (1 - aS) * (personal && (!mm.mine.has(a) || !mm.mine.has(b)) ? 0.35 : 1);
        const q = arrow(sx(pa[0]), sy(pa[1]), sx(pb[0]), sy(pb[1]), 1 + n * 1.1, colorOf(a, mm), al, gr(a), gr(b));
        if (q && aS < 0.3) counts.push({ t: String(n), x: (q.ax + q.bx) / 2 * 0.4 + q.mx * 0.6, y: (q.ay + q.by) / 2 * 0.4 + q.my * 0.6 + 4 });
      });
      if (aS > 0) mm.influence.forEach(([a, b]) => {
        const pa = lay.pos.get(a); const pb = lay.pos.get(b); if (!pa || !pb) return;
        const hot = !!focus && !isGenre(focus) && (a === focus || b === focus);
        const near = !hot && (inCtx(a) || inCtx(b));
        const alpha = focus && !isGenre(focus) ? (hot ? 0.95 : 0.05) : near ? 0.5 : 0.06;
        arrow(sx(pa[0]), sy(pa[1]), sx(pb[0]), sy(pb[1]), hot ? 2 : 1.2, hot ? C.accent : colorOf(a, mm), aS * alpha * (1 - aA * 0.5), sr(a), sr(b));
      });

      // genres: circles first, names reserve their room before anything smaller
      mm.genres.forEach((g) => {
        const [x, y] = lay.pos.get(g.id)!; const r = gr(g.id) * (1 - aS * 0.75); const dm = dimMine(g.id);
        ctx.globalAlpha = (g.placeholder ? 0.5 : 1) * (dm ? 0.35 : 1); ctx.beginPath(); ctx.arc(sx(x), sy(y), r, 0, 7);
        ctx.fillStyle = g.placeholder ? 'rgba(143,135,123,.06)' : rgba(colorOf(g.id, mm), 0.3 * (1 - aS * 0.55) + 0.05); ctx.fill();
        ctx.setLineDash(g.placeholder ? [4, 4] : []); ctx.strokeStyle = focus === g.id ? C.accent : g.placeholder ? C.muted : colorOf(g.id, mm); ctx.lineWidth = focus === g.id ? 2.5 : g.placeholder ? 1 : 1.5; ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      });
      mm.genres.forEach((g) => {
        const [x, y] = lay.pos.get(g.id)!; const r = gr(g.id) * (1 - aS * 0.75); const dm = dimMine(g.id);
        const big = aS > 0.5;
        if (big) {
          // the name sits on the top edge of the genre's territory
          const own = mm.styles.filter((s) => s.genres[0] === g.id).map((s) => lay.pos.get(s.id)![1]);
          const top = own.length ? Math.min(y, ...own) : y; const ty = sy(top) - (own.length ? 62 * view.s + 10 : r + 8);
          text(g.name.toUpperCase(), sx(x), ty, '600 12px Fraunces, Georgia, serif', g.placeholder ? C.muted : colorOf(g.id, mm), (g.placeholder ? 0.5 : 0.7) * (dm ? 0.4 : 1), true);
        } else {
          const size = Math.max(10, Math.min(15, gr(g.id) * 0.42));
          genreLabel(g.name.toUpperCase(), sx(x), sy(y) + 4, size, g.placeholder ? C.muted : C.ink, (g.placeholder ? 0.6 : 1) * (dm ? 0.4 : 1), Math.max(78, r * 2.6));
        }
      });
      counts.forEach((k) => text(k.t, k.x, k.y, '600 11px "IBM Plex Mono", monospace', C.ink2, 0.9 * (1 - aS)));

      if (aS > 0) {
        const order = [...mm.styles].sort((p, q) => {
          const rank = (s: typeof p) => (s.id === focus ? 0 : touches(s.id) || inCtx(s.id) ? 1 : 2);
          return rank(p) - rank(q) || q.artists.length - p.artists.length;
        });
        mm.styles.forEach((s) => {
          const p = lay.pos.get(s.id)!; const r = sr(s.id);
          const dim = (!!focus && focus !== s.id && !touches(s.id) && !inCtx(s.id)) || dimMine(s.id);
          const mine = personal && mm.mine.has(s.id);
          ctx.globalAlpha = aS * (dim ? 0.3 : 1); ctx.beginPath(); ctx.arc(sx(p[0]), sy(p[1]), r, 0, 7);
          ctx.fillStyle = mine ? 'rgba(232,161,58,.45)' : rgba(colorOf(s.id, mm), 0.32); ctx.fill();
          ctx.strokeStyle = focus === s.id ? C.accent : colorOf(s.id, mm); ctx.lineWidth = focus === s.id ? 2.5 : 1.2;
          ctx.setLineDash(s.genres.length > 1 ? [3, 2] : []); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        });
        order.forEach((s) => {
          const p = lay.pos.get(s.id)!; const r = sr(s.id);
          const dim = (!!focus && focus !== s.id && !touches(s.id) && !inCtx(s.id)) || dimMine(s.id);
          text(s.name, sx(p[0]), sy(p[1]) + r + 13, `${s.id === focus ? 600 : 500} 12.5px "IBM Plex Sans", sans-serif`, s.id === focus ? C.accent : C.ink,
            aS * (dim ? 0.35 : 1), s.id === focus);
        });
      }
      if (aA > 0) {
        const vis = lay.artistPos.filter((a) => { const x = sx(a.x); const y = sy(a.y); return x > -60 && x < W + 60 && y > -40 && y < H + 40; });
        const rad = Math.max(5, Math.min(13, 7 * view.s / 1.4));
        vis.forEach((a) => {
          const x = sx(a.x); const y = sy(a.y); const st = snap.journal.statuses[a.id]; const on = a.id === selected;
          const dm = dimMine(a.id); const r = on ? rad + 2 : rad;
          ctx.globalAlpha = aA * (dm ? 0.35 : 1);
          const src = mm.artistCover.get(a.id); const im = src ? img(src) : null;
          ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
          if (im) { ctx.save(); ctx.clip(); ctx.drawImage(im, x - r, y - r, r * 2, r * 2); ctx.restore(); }
          else { ctx.fillStyle = '#2a2622'; ctx.fill(); ctx.fillStyle = C.ink2; ctx.font = `600 ${Math.round(r * 0.9)}px "IBM Plex Sans", sans-serif`; ctx.textAlign = 'center';
            ctx.fillText(name(a.id).replace(/^the\s+/i, '').charAt(0).toUpperCase(), x, y + r * 0.33); }
          ctx.beginPath(); ctx.arc(x, y, r + 1, 0, 7);
          const loved = st === 'liked' || st === 'favorite';
          ctx.strokeStyle = on || loved ? C.accent : st ? 'rgba(232,161,58,.6)' : 'rgba(236,230,220,.35)';
          ctx.lineWidth = on ? 2.5 : st ? 1.8 : 1; ctx.setLineDash(st && !loved ? [2.5, 2] : []); ctx.stroke(); ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          room([x - r - 1, y - r - 1, x + r + 1, y + r + 1], true);
        });
        [...vis].sort((p, q) => (p.id === selected ? -1 : q.id === selected ? 1 : 0)).forEach((a) => {
          const x = sx(a.x); const y = sy(a.y); const on = a.id === selected;
          text(name(a.id), x, y - rad - 6, `${on ? 600 : 400} 11px "IBM Plex Sans", sans-serif`, on ? C.accent : C.ink2, aA * (dimMine(a.id) ? 0.4 : 1), on);
        });
      }
    }

    const visibleCentre = () => { const { right, bottom } = P.current.inset; return [(W - right) / 2, (H - bottom) / 2]; };
    function go(t: typeof view, ms = 420) {
      const f = { ...view }; const t0 = performance.now(); cancelAnimationFrame(anim);
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / ms); const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        view = { s: f.s + (t.s - f.s) * e, x: f.x + (t.x - f.x) * e, y: f.y + (t.y - f.y) * e }; draw();
        if (k < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    }
    const centreOn = (x: number, y: number, s: number) => { const [cx, cy] = visibleCentre(); return { s, x: cx - x * s, y: cy - y * s }; };
    // fit every genre and its name, with room for the labels that stick out of small circles
    const fitAll = () => {
      const ps = m().genres.map((g) => L().pos.get(g.id)!);
      const x0 = Math.min(...ps.map((p) => p[0])); const x1 = Math.max(...ps.map((p) => p[0]));
      const y0 = Math.min(...ps.map((p) => p[1])); const y1 = Math.max(...ps.map((p) => p[1]));
      const padX = W < 500 ? 52 : 90; const padY = 40;
      const s = Math.min((W - padX * 2) / (x1 - x0), (H - padY * 2) / (y1 - y0));
      return { s, x: W / 2 - ((x0 + x1) / 2) * s, y: H / 2 - ((y0 + y1) / 2) * s };
    };
    function zoomAt(px: number, py: number, f: number) {
      const s = Math.max(0.06, Math.min(4, view.s * f)); const wx = (px - view.x) / view.s; const wy = (py - view.y) / view.s;
      view = { s, x: px - wx * s, y: py - wy * s }; draw();
    }
    function tap(px: number, py: number) {
      const mm = m(); const lay = L(); const aS = ramp(view.s, L1); const aA = ramp(view.s, L2);
      let best: { id: string; kind: 'g' | 's' | 'a' } | null = null; let bd = 1e9;
      const consider = (id: string, kind: 'g' | 's' | 'a', x: number, y: number, r: number) => {
        const d = Math.hypot(sx(x) - px, sy(y) - py); if (d < r && d < bd) { bd = d; best = { id, kind }; }
      };
      if (aA > 0.4) lay.artistPos.forEach((a) => consider(a.id, 'a', a.x, a.y, 22));
      if (aS > 0.3) mm.styles.forEach((s) => { const p = lay.pos.get(s.id)!; consider(s.id, 's', p[0], p[1], Math.max(22, sr(s.id) + 8)); });
      mm.genres.forEach((g) => { const p = lay.pos.get(g.id)!; consider(g.id, 'g', p[0], p[1], Math.max(22, gr(g.id) * (1 - aS * 0.75) + 6)); });
      const b = best as { id: string; kind: 'g' | 's' | 'a' } | null;
      if (!b) { P.current.onBackground(); return; }
      const p = lay.pos.get(b.id)!;
      if (b.kind === 'g') {
        const g = mm.genres.find((x) => x.id === b.id)!;
        if (g.placeholder || aS > 0.5) { P.current.onSelect(b.id); return; }
        go(centreOn(p[0], p[1], 0.62)); return;
      }
      P.current.onSelect(b.id);
      go(centreOn(p[0], p[1], b.kind === 's' ? Math.max(view.s, 1.7) : Math.max(view.s, 2)));
    }

    const ptrs = new Map<number, [number, number]>(); let moved = 0; let pinch: number | null = null;
    const down = (e: PointerEvent) => { c.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.offsetX, e.offsetY]); moved = 0; cancelAnimationFrame(anim); };
    const move = (e: PointerEvent) => {
      const p = ptrs.get(e.pointerId); if (!p) return;
      if (ptrs.size === 2) {
        ptrs.set(e.pointerId, [e.offsetX, e.offsetY]); const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch) zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d / pinch); pinch = d; moved += 10; return;
      }
      view.x += e.offsetX - p[0]; view.y += e.offsetY - p[1]; moved += Math.abs(e.offsetX - p[0]) + Math.abs(e.offsetY - p[1]);
      ptrs.set(e.pointerId, [e.offsetX, e.offsetY]); draw();
    };
    const up = (e: PointerEvent) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (moved < 6 && e.type === 'pointerup') tap(e.offsetX, e.offsetY); };
    const wheel = (e: WheelEvent) => { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.0015)); };
    c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up); c.addEventListener('wheel', wheel, { passive: false });
    let fitted = false;
    const resize = () => {
      dpr = window.devicePixelRatio || 1; W = c.clientWidth; H = c.clientHeight; c.width = W * dpr; c.height = H * dpr;
      if (!fitted && W > 0) { view = fitAll(); fitted = true; }
      draw();
    };
    const ro = new ResizeObserver(resize); ro.observe(c);
    resize();
    document.fonts?.ready.then(draw);
    api.current = {
      draw,
      focus(id, s) { const p = L().pos.get(id); if (p) go(centreOn(p[0], p[1], s ?? Math.max(view.s, 1.7))); },
      fit() { go(fitAll()); },
      // jump to a depth around what is in the middle of the screen now
      level(i) {
        if (i === 0) { go(fitAll()); return; }
        const [cx, cy] = visibleCentre(); const wx = (cx - view.x) / view.s; const wy = (cy - view.y) / view.s;
        go(centreOn(wx, wy, LEVEL_S[i]));
      },
    };
    (window as unknown as { __zoom: unknown }).__zoom = { get view() { return view; }, set view(v) { view = v; draw(); }, pos: () => L().pos };
    return () => {
      ro.disconnect(); cancelAnimationFrame(anim);
      c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move);
      c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up); c.removeEventListener('wheel', wheel);
    };
  }, []);

  useEffect(() => { api.current?.draw(); }, [props.snap, props.selected, props.personal]);
  // follow a selection made elsewhere (search, a link in the card), and keep it above the card when the card grows
  useEffect(() => { if (props.selected) api.current?.focus(props.selected); }, [props.selected, props.sheet]);

  return (
    <div className="zoomview">
      <canvas ref={cv} aria-label="Карта з плавним наближенням: жанри, стилі, артисти" />
      <div className="zv-level" ref={level} role="group" aria-label="Глибина">
        {['жанри', 'стилі', 'артисти'].map((t, i) => <button key={t} onClick={() => api.current?.level(i)}>{t}</button>)}
      </div>
      <div className="zv-bar">
        <button aria-label="Показати все" onClick={() => api.current?.fit()}>⤢</button>
      </div>
    </div>
  );
}
