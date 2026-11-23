import { useEffect, useMemo, useRef, useState } from 'react';
import type { Entity } from '../data/schema';
import { TYPE_LABEL, STATUS_LABEL } from '../data/schema';
import type { Snapshot } from '../lib/repository';
import { matchScore, yearsText } from '../lib/util';

interface Props { snap: Snapshot; onPick(id: string): void; onClose(): void; title?: string }

export function SearchPalette({ snap, onPick, onClose, title }: Props) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const results = useMemo(() => {
    const all = [...snap.entities.values()];
    if (!q.trim()) {
      return all.filter((e) => e.type === 'genre').sort((a, b) => a.name.localeCompare(b.name)).slice(0, 10);
    }
    return all.map((e) => [e, matchScore(e, q)] as [Entity, number]).filter(([, s]) => s > 0)
      .sort((a, b) => b[1] - a[1] || a[0].name.localeCompare(b[0].name)).slice(0, 12).map(([e]) => e);
  }, [q, snap.entities]);
  useEffect(() => setIdx(0), [q]);

  const onKey = (ev: React.KeyboardEvent) => {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (ev.key === 'ArrowUp') { ev.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    if (ev.key === 'Enter' && results[idx]) onPick(results[idx].id);
    if (ev.key === 'Escape') onClose();
  };

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(ev) => ev.stopPropagation()} role="dialog" aria-label="Пошук">
        {title && <div className="palette-title">{title}</div>}
        <input ref={input} className="palette-input" placeholder="Жанр, артист, альбом, лейбл, місто…"
          value={q} onChange={(ev) => setQ(ev.target.value)} onKeyDown={onKey} />
        <ul className="palette-list" role="listbox">
          {results.map((e, i) => {
            const st = snap.journal.statuses[e.id];
            const artist = e.attrs?.artist ? snap.entities.get(e.attrs.artist)?.name : '';
            return (
              <li key={e.id} role="option" aria-selected={i === idx} className={i === idx ? 'active' : ''}
                onMouseEnter={() => setIdx(i)} onClick={() => onPick(e.id)}>
                <span className={`dot dot-${e.type}`} />
                <span className="pl-name">{e.name}{artist && <span className="pl-sub"> — {artist}</span>}</span>
                <span className="pl-meta mono">{yearsText(e, snap)}</span>
                {st && <span className="pl-status">{STATUS_LABEL[st]}</span>}
                <span className="pl-type">{TYPE_LABEL[e.type]}</span>
              </li>
            );
          })}
          {results.length === 0 && <li className="empty">Нічого не знайдено. Можна додати через «+ Додати».</li>}
        </ul>
      </div>
    </div>
  );
}
