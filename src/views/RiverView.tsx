// "Ріка": years run left to right, each genre has its lane, a style sits where it was born,
// arcs show who shaped whom. Tapping a style opens its card.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Snapshot } from '../lib/repository';
import { viewModel, riverYear, colorOf, rgba } from '../lib/views';

const Y0 = 1950; const Y1 = 2026; const PX0 = 17; const LH0 = 68; const LEFT = 70;
const ZMIN = 0.7; const ZMAX = 6;

interface Props { snap: Snapshot; selected: string | null; personal: boolean; onSelect(id: string): void; onBackground(): void }

export function RiverView({ snap, selected, personal, onSelect, onBackground }: Props) {
  const m = viewModel(snap);
  const scroller = useRef<HTMLDivElement>(null);
  // zoom: the wheel (or a pinch) stretches the years apart and gives each lane more height, so crowded styles separate
  const [z, setZ] = useState(1);
  const PX = PX0 * z; const LH = Math.round(LH0 * Math.min(2.2, Math.sqrt(z))); const MID = LH / 2 + 7; const ST = 14 * Math.min(2.2, Math.sqrt(z));
  const rx = (y: number) => (y < Y0 ? LEFT - 34 : LEFT + (y - Y0) * PX);
  const anchor = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const zoomAt = (f: number, cx: number, cy: number) => {
    const el = scroller.current; if (!el) return;
    setZ((old) => {
      const nz = Math.max(ZMIN, Math.min(ZMAX, old * f)); if (nz === old) return old;
      const oldLH = Math.round(LH0 * Math.min(2.2, Math.sqrt(old))); const newLH = Math.round(LH0 * Math.min(2.2, Math.sqrt(nz)));
      // keep the point under the cursor in place
      const wx = el.scrollLeft + cx; const wy = el.scrollTop + cy;
      anchor.current = { x: LEFT + (wx - LEFT) * (nz / old), y: wy * (newLH / oldLH), fx: cx, fy: cy };
      return nz;
    });
  };
  useLayoutEffect(() => {
    const el = scroller.current; const a = anchor.current; if (!el || !a) return;
    el.scrollLeft = a.x - a.fx; el.scrollTop = a.y - a.fy; anchor.current = null;
  }, [z]);
  useEffect(() => {
    const el = scroller.current; if (!el) return;
    const wheel = (e: WheelEvent) => {
      // a sideways swipe still scrolls through the years; an up/down wheel or a trackpad pinch zooms
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) return;
      e.preventDefault(); const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX - r.left, e.clientY - r.top);
    };
    let pinch: number | null = null;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const tstart = (e: TouchEvent) => { if (e.touches.length === 2) pinch = dist(e.touches); };
    const tmove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinch) return;
      e.preventDefault(); const d = dist(e.touches); const r = el.getBoundingClientRect();
      zoomAt(d / pinch, (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left, (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top);
      pinch = d;
    };
    const tend = (e: TouchEvent) => { if (e.touches.length < 2) pinch = null; };
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('touchstart', tstart, { passive: true }); el.addEventListener('touchmove', tmove, { passive: false });
    el.addEventListener('touchend', tend); el.addEventListener('touchcancel', tend);
    return () => {
      el.removeEventListener('wheel', wheel); el.removeEventListener('touchstart', tstart); el.removeEventListener('touchmove', tmove);
      el.removeEventListener('touchend', tend); el.removeEventListener('touchcancel', tend);
    };
  }, []);
  const zoomBtn = (f: number) => { const el = scroller.current; if (el) zoomAt(f, el.clientWidth / 2, el.clientHeight / 2); };
  // lanes: genres that have styles, the busiest in the middle of the reading order is not needed — keep the map's west→east order
  const lanes = useMemo(() => {
    const order = ['genre:jazz', 'genre:funk-soul', 'genre:latin', 'genre:reggae', 'genre:hip-hop', 'genre:electronic', 'genre:pop', 'genre:rock', 'genre:folk-world-country'];
    const used = m.genres.filter((g) => m.styles.some((s) => s.genres[0] === g.id) || m.styles.some((s) => s.genres.includes(g.id)));
    return used.map((g) => g.id).sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
  }, [m]);
  const pos = useMemo(() => {
    const p = new Map<string, { x: number; y: number; lane: number; approx: boolean }>();
    const per = new Map<number, number>();
    [...m.styles].map((s) => ({ s, ...riverYear(s, m) })).sort((a, b) => a.y - b.y).forEach(({ s, y, approx }) => {
      const lane = lanes.indexOf(s.genres.find((g) => lanes.includes(g)) ?? '');
      if (lane < 0) return;
      const k = (per.get(lane) ?? 0) + 1; per.set(lane, k);
      p.set(s.id, { x: rx(y), y: lane * LH + MID + ((k % 3) - 1) * ST, lane, approx });
    });
    // a genre that takes part in an influence itself sits at its own birth year (or its earliest style)
    lanes.forEach((g, i) => {
      if (p.has(g)) return;
      const own = snap.entities.get(g)?.years?.from;
      const first = Math.min(...m.styles.filter((s) => s.genres.includes(g) && s.year).map((s) => s.year!));
      const y = own ?? (Number.isFinite(first) ? first - 3 : Y0 - 1);
      p.set(g, { x: rx(y), y: i * LH + 24 * Math.min(1.6, LH / LH0), lane: i, approx: !own });
    });
    return p;
  }, [m, lanes, snap, z]);
  const W = LEFT + (Y1 - Y0) * PX + 160; const H = lanes.length * LH + 30;
  const sel = selected && pos.has(selected) ? selected : null;
  const touches = (id: string) => m.influence.some(([a, b]) => (a === sel && b === id) || (b === sel && a === id));
  // labels that would run into one already placed stay hidden (their dot keeps a tooltip); the selection and its links always show
  const shown = useMemo(() => {
    const out = new Set<string>(); const boxes: [number, number, number, number][] = [];
    const prio = (id: string) => (id === sel ? 0 : sel && touches(id) ? 1 : 2);
    [...m.styles].filter((s) => pos.has(s.id))
      .sort((a, b) => prio(a.id) - prio(b.id) || b.artists.length - a.artists.length)
      .forEach((s) => {
        const p = pos.get(s.id)!; const r = 5 + Math.sqrt(s.artists.length) * 2; const w = s.name.length * 6.1;
        const box: [number, number, number, number] = [p.x + r + 2, p.y - 8, p.x + r + 4 + w, p.y + 6];
        if (prio(s.id) < 2 || !boxes.some((b) => b[0] < box[2] && b[2] > box[0] && b[1] < box[3] && b[3] > box[1])) { out.add(s.id); boxes.push(box); }
      });
    return out;
  }, [m, pos, sel]);

  useEffect(() => { const el = scroller.current; if (el && !sel) el.scrollLeft = rx(1965) - 20; }, []);
  useEffect(() => {
    const el = scroller.current; const p = sel ? pos.get(sel) : null;
    if (el && p) el.scrollTo({ left: Math.max(0, p.x - el.clientWidth / 2), behavior: 'smooth' });
  }, [sel, pos]);

  return (
    <div className="river">
      <div className="rv-scroll" ref={scroller} onClick={(e) => { if ((e.target as Element).tagName === 'svg') onBackground(); }}>
        <div className="rv-lanes">{lanes.map((g, i) => <button key={g} style={{ top: i * LH + 3, color: colorOf(g, m) }} onClick={() => onSelect(g)}>{snap.entities.get(g)?.name}</button>)}</div>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ріка: стилі за роками і впливи між ними">
          <defs>
            <marker id="rv-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#e8a13a" /></marker>
            <marker id="rv-am" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke" /></marker>
          </defs>
          {lanes.map((g, i) => <g key={g}>
            <rect x={0} y={i * LH} width={W} height={LH} fill={rgba(colorOf(g, m), 0.045)} />
            <line x1={0} x2={W} y1={(i + 1) * LH} y2={(i + 1) * LH} stroke="rgba(236,230,220,.08)" />
          </g>)}
          {Array.from({ length: Math.floor((Y1 - Y0) / (z >= 2.5 ? 5 : 10)) + 1 }, (_, i) => Y0 + i * (z >= 2.5 ? 5 : 10)).map((y) => <g key={y}>
            <line x1={rx(y)} x2={rx(y)} y1={0} y2={lanes.length * LH} stroke={`rgba(236,230,220,${y % 10 ? 0.035 : 0.07})`} />
            <text x={rx(y)} y={H - 10} className="rv-year">{y}</text>
          </g>)}
          <text x={LEFT - 34} y={H - 10} className="rv-year">раніше</text>
          {m.influence.map(([a, b], i) => {
            const pa = pos.get(a); const pb = pos.get(b); if (!pa || !pb) return null;
            const hot = !!sel && (a === sel || b === sel); const dx = pb.x - pa.x; const k = Math.max(30, Math.abs(dx) * 0.5);
            return <path key={i} d={`M${pa.x},${pa.y} C${pa.x + k},${pa.y} ${pb.x - k},${pb.y} ${pb.x - 7},${pb.y}`} fill="none"
              stroke={hot ? '#e8a13a' : colorOf(a, m)} strokeOpacity={sel ? (hot ? 0.95 : 0.07) : 0.35} strokeWidth={hot ? 2 : 1.2}
              markerEnd={hot ? 'url(#rv-ah)' : 'url(#rv-am)'} />;
          })}
          {lanes.filter((g) => m.influence.some(([a, b]) => a === g || b === g)).map((g) => {
            const p = pos.get(g)!;
            return <g key={g} className="rv-style" opacity={sel && sel !== g && !touches(g) ? 0.3 : 1} onClick={() => onSelect(g)} role="button" aria-label={snap.entities.get(g)?.name}>
              <rect x={p.x - 5} y={p.y - 5} width={10} height={10} rx={2} fill={rgba(colorOf(g, m), 0.5)} stroke={sel === g ? '#e8a13a' : colorOf(g, m)} />
              <text x={p.x + 9} y={p.y + 4} className="rv-label rv-genre">{snap.entities.get(g)?.name}</text>
            </g>;
          })}
          {m.styles.map((s) => {
            const p = pos.get(s.id); if (!p) return null;
            const dim = (!!sel && sel !== s.id && !touches(s.id)) || (personal && !m.mine.has(s.id)); const r = 5 + Math.sqrt(s.artists.length) * 2;
            const mine = personal && !!snap.journal.statuses[s.id];
            return <g key={s.id} className="rv-style" opacity={dim ? 0.3 : 1} tabIndex={0} role="button" aria-label={s.name}
              onClick={() => onSelect(s.id)} onKeyDown={(e) => { if (e.key === 'Enter') onSelect(s.id); }}>
              {s.genres.filter((g) => g !== lanes[p.lane] && lanes.includes(g)).map((g) => {
                const oy = lanes.indexOf(g) * LH + MID;
                return <g key={g}><line x1={p.x} x2={p.x} y1={p.y} y2={oy} stroke="#d58a6c" strokeOpacity={0.25} strokeDasharray="2 3" />
                  <circle cx={p.x} cy={oy} r={2.5} fill="#d58a6c" fillOpacity={0.5} /></g>;
              })}
              <circle cx={p.x} cy={p.y} r={r + 8} fill="transparent" />
              <circle cx={p.x} cy={p.y} r={r} fill={mine ? 'rgba(232,161,58,.45)' : rgba(colorOf(s.id, m), 0.35)}
                stroke={sel === s.id ? '#e8a13a' : colorOf(s.id, m)} strokeWidth={sel === s.id ? 2.5 : 1.2} strokeDasharray={p.approx ? '3 2' : undefined} />
              <title>{s.name}</title>
              {shown.has(s.id) && <text x={p.x + r + 3} y={p.y + 4} className="rv-label">{s.name}</text>}
            </g>;
          })}
        </svg>
      </div>
      <div className="zv-bar rv-zoom">
        <button aria-label="Наблизити" onClick={() => zoomBtn(1.5)}>+</button>
        <button aria-label="Віддалити" onClick={() => zoomBtn(1 / 1.5)}>−</button>
      </div>
    </div>
  );
}
