// Shortest-path panel between two entities.
import { useMemo } from 'react';
import { RELATION_LABEL } from '../data/schema';
import type { repo } from '../lib/repository';
import { ConfidenceBadge } from './DetailPanel';
export function PathPanel({ ends, path, snap, interp, setInterp, onNavigate, onClose }: {
  ends: [string, string]; path: { nodes: string[]; edges: string[] } | null; snap: ReturnType<typeof repo.getSnapshot>;
  interp: boolean; setInterp(v: boolean): void; onNavigate(id: string): void; onClose(): void;
}) {
  const [a, b] = ends.map((id) => snap.entities.get(id)!);
  const relById = useMemo(() => new Map(snap.relations.map((r) => [r.id, r])), [snap.relations]);
  return (
    <aside className="panel path-panel" aria-label="Шлях">
      <header className="panel-head">
        <div className="eyebrow">Шлях</div>
        <button className="icon-btn close" onClick={onClose} aria-label="Закрити">×</button>
      </header>
      <h2 className="title">{a.name} <span className="arrow">→</span> {b.name}</h2>
      <label className="check"><input type="checkbox" checked={interp} onChange={(ev) => setInterp(ev.target.checked)} /> Враховувати інтерпретації (подібність)</label>
      {!path && <p className="empty">Зв’язку через факти й історичні тези не знайдено.{!interp && ' Спробуй увімкнути інтерпретації.'}</p>}
      {path && (
        <ol className="path-steps">
          {path.nodes.map((id, i) => {
            const e = snap.entities.get(id)!;
            const r = i < path.edges.length ? relById.get(path.edges[i]) : undefined;
            const forward = r ? r.from === id : true;
            return (
              <li key={id}>
                <button className="link step-node" onClick={() => onNavigate(id)}><span className={`dot dot-${e.type}`} />{e.name}</button>
                {r && (
                  <div className="step-edge">
                    <span className="rel-verb">{RELATION_LABEL[r.type][forward ? 0 : 1]}</span> <ConfidenceBadge c={r.confidence} />
                    {!r.id.startsWith('drv:') && <div className="why">{r.why}</div>}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <p className="hint">Шлях — найкоротший ланцюжок зв’язків. Він показує, як речі пов’язані, а не доводить вплив.</p>
    </aside>
  );
}
