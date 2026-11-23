// Genre ⇄ genre bridge: influence both ways + what the two share. Opened by clicking an edge between two genres/styles.
import { useMemo, useState } from 'react';
import { typeLabel } from '../data/schema';
import { SPOTIFY, type Snapshot } from '../lib/repository';
import { computeBridge, type Flow, type Item } from '../lib/bridges';
import { ConfidenceBadge } from './DetailPanel';

interface Props {
  ends: [string, string];
  snap: Snapshot;
  lit: boolean;
  onLight(ids: string[] | null): void;
  onNavigate(id: string): void;
  onClose(): void;
}

const GROUPS: { key: 'people' | 'scenes' | 'releases' | 'concepts' | 'roots'; label: string }[] = [
  { key: 'people', label: 'Люди' },
  { key: 'scenes', label: 'Сцени' },
  { key: 'releases', label: 'Альбоми-містки' },
  { key: 'concepts', label: 'Прийоми і звук' },
  { key: 'roots', label: 'Спільне коріння' },
];
const SHOW = 5;
const RANK = ['unverified', 'disputed', 'likely', 'established'] as const;

export function BridgePanel({ ends, snap, lit, onLight, onNavigate, onClose }: Props) {
  const br = useMemo(() => computeBridge(snap, ends[0], ends[1]), [snap, ends]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  if (!br) return null;
  const { a, b } = br;
  const name = (id: string) => snap.entities.get(id)?.name ?? id;
  const Ent = ({ id }: { id: string }) => {
    const e = snap.entities.get(id); if (!e) return null;
    return <button className="link bridge-ent" onClick={() => onNavigate(id)}><span className={`dot dot-${e.type}`} />{e.name}</button>;
  };
  const Dir = ({ from, to, flows }: { from: string; to: string; flows: Flow[] }) => (
    <div className={`bridge-dir ${flows.length ? '' : 'none'}`}>
      <div className="bridge-dir-head">
        <span>{from} <span className="arrow">→</span> {to}</span>
        {flows.length > 0 && <ConfidenceBadge c={RANK.find((c) => flows.some((f) => f.rel.confidence === c))!} />}
      </div>
      {!flows.length && <p className="why">Впливу в цей бік не зафіксовано.</p>}
      {flows.map((f) => {
        const ends2 = [f.rel.from, f.rel.to].filter((x) => x !== a.id && x !== b.id);
        return (
          <div key={f.rel.id} className="bridge-flow">
            {ends2.length > 0 && <div className="meta small">через стиль {ends2.map(name).join(', ')}</div>}
            <p className="bridge-why">{f.rel.why}</p>
            {f.via.length > 0 && <div className="bridge-via"><span className="meta">через</span> {f.via.map((v) => <Ent key={v} id={v} />)}</div>}
          </div>
        );
      })}
    </div>
  );
  const levelText = (id: string) => typeLabel(snap.entities.get(id)!);
  const groups = GROUPS.map((g) => ({ ...g, items: br[g.key] as Item[] })).filter((g) => g.items.length);
  const highlightIds = [a.id, b.id, ...groups.flatMap((g) => g.items.slice(0, SHOW).map((x) => x.id))];
  const sharedCount = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <aside className="panel bridge-panel" aria-label={`Місток: ${a.name} і ${b.name}`}>
      <header className="panel-head">
        <div className="eyebrow">Місток · {levelText(a.id)} і {levelText(b.id).toLowerCase()}</div>
        <button className="icon-btn close" onClick={onClose} aria-label="Закрити">×</button>
      </header>
      <h2 className="title">
        <button className="link" onClick={() => onNavigate(a.id)}>{a.name}</button>
        <span className="arrow"> ⇄ </span>
        <button className="link" onClick={() => onNavigate(b.id)}>{b.name}</button>
      </h2>
      {br.era && <p className="meta mono">{br.era[0] === br.era[1] ? br.era[0] : `${br.era[0]}–${br.era[1]}`}</p>}

      {br.ab.length + br.ba.length > 0 ? (
        <div className="bridge-dirs">
          <Dir from={a.name} to={b.name} flows={br.ab} />
          <Dir from={b.name} to={a.name} flows={br.ba} />
        </div>
      ) : (
        <p className="bridge-hidden-note">Прямого впливу на карті немає. Це прихований місток: карта знайшла в цих стилів спільних людей, сцени або записи.</p>
      )}
      {br.alike.length > 0 && (
        <div className="bridge-alike">
          <div className="rel-group-title">Схожість без прямого впливу</div>
          {br.alike.map((f) => <p key={f.rel.id} className="why"><i>{f.rel.why}</i> <ConfidenceBadge c={f.rel.confidence} /></p>)}
        </div>
      )}

      <section className="sec">
        <h3 className="sec-title">Що спільного</h3>
        {!groups.length && <p className="empty">Спільних людей, альбомів чи прийомів на карті поки немає.</p>}
        <dl className="bridge-groups">
          {groups.map((g) => {
            const all = open[g.key];
            const shown = all ? g.items : g.items.slice(0, SHOW);
            return (
              <div key={g.key} className="bridge-group">
                <dt>{g.label}</dt>
                <dd>
                  {shown.map((x) => (
                    <span key={x.id} className={`bridge-item ${x.confidence === 'likely' ? 'is-likely' : ''}`}
                      title={x.confidence === 'likely' ? 'ймовірно: частина зв’язків не перевірена остаточно' : undefined}>
                      <Ent id={x.id} />{x.confidence !== 'established' && x.confidence !== 'likely' && <ConfidenceBadge c={x.confidence} />}
                    </span>
                  ))}
                  {g.items.length > SHOW && (
                    <button className="link more" onClick={() => setOpen({ ...open, [g.key]: !all })}>
                      {all ? 'менше' : `ще ${g.items.length - SHOW}`}
                    </button>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
        {br.note?.diff && (
          <div className="bridge-diff"><span className="rel-group-title">Відмінність</span><p className="summary">{br.note.diff}</p></div>
        )}
        <div className="actions">
          <button className={`btn ${lit ? 'ghost pressed' : ''}`} disabled={!sharedCount}
            onClick={() => onLight(lit ? null : highlightIds)}>
            {lit ? 'Прибрати підсвічування' : 'Підсвітити місток на графі'}
          </button>
        </div>
      </section>

      {br.likes.length > 0 && (
        <section className="sec mine">
          <h3 className="sec-title">У твоїх лайках · {br.likes.length}</h3>
          <ul className="rels">
            {br.likes.map((id) => {
              const e = snap.entities.get(id)!;
              const artist = e.attrs?.artist ? name(e.attrs.artist)
                : e.attrs?.release ? name(snap.entities.get(e.attrs.release)?.attrs?.artist ?? '') : '';
              const sp = SPOTIFY[id];
              return (
                <li key={id} className="rel rel-line">
                  <button className="link rel-target" onClick={() => onNavigate(id)}>
                    <span className={`dot dot-${e.type}`} />{artist ? `${artist} — ` : ''}{e.name}
                  </button>
                  {sp && <a className="link meta sp-link" href={sp.link} target="_blank" rel="noreferrer">Spotify ↗</a>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {groups.some((g) => g.items.some((x) => x.confidence === 'likely')) && (
        <p className="hint">Пунктирне підкреслення означає «ймовірно»: частина зв’язків ще не перевірена остаточно.</p>
      )}
      <p className="hint">Спільне карта обчислює сама з усіх зв’язків. Що більше фактів додаємо, то повніший місток.</p>
    </aside>
  );
}
