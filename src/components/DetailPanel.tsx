import { useMemo, useState } from 'react';
import type { Entity, Relation, Status, Polarity, ReactionScope, NegativeReason, ListeningAxis, ClaimClass } from '../data/schema';
import {
  typeLabel, VINYL_LABEL, RELATION_LABEL, RELATION_CLASS, CONFIDENCE_LABEL, CLASS_LABEL, STATUS_LABEL, LISTENING_STATUSES,
  EXPLORATION_STATUSES, POLARITY_LABEL, REASON_LABEL, SCOPE_LABEL, AXIS_LABEL, isListeningType,
} from '../data/schema';
import { repo, SPOTIFY, type Snapshot } from '../lib/repository';
import { yearsText, placeText, hashHue, fmtTime } from '../lib/util';

interface Props {
  entity: Entity;
  snap: Snapshot;
  hiddenNeighbours: number;
  onNavigate(id: string): void;
  onExpand(id: string): void;
  onPathFrom(id: string): void;
  onAddRelation(id: string): void;
  onClose(): void;
}

const CLASS_ORDER: ClaimClass[] = ['fact', 'history', 'interpretation', 'personal'];

export function ConfidenceBadge({ c }: { c: Relation['confidence'] }) {
  if (c === 'established') return null;
  return <span className={`conf conf-${c}`} title="Рівень впевненості">{CONFIDENCE_LABEL[c]}</span>;
}

// Downscale a picked image to a small JPEG so it fits the page's storage.
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const size = Math.min(400, Math.max(bmp.width, bmp.height));
  const k = size / Math.max(bmp.width, bmp.height);
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((res) => c.toBlob((b) => res(b!), 'image/jpeg', 0.82));
}
const toDataUri = (b: Blob) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(b); });

function Cover({ e, snap }: { e: Entity; snap: Snapshot }) {
  const artist = e.attrs?.artist ? snap.entities.get(e.attrs.artist)?.name : '';
  const hue = hashHue(e.id);
  const cover = snap.covers[e.id];
  const [busy, setBusy] = useState(false);
  const sp = SPOTIFY[e.id];
  const pick = () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      const f = inp.files?.[0]; if (!f) return;
      setBusy(true);
      try {
        const blob = await shrink(f);
        const claude = (globalThis as { claude?: { use(n: string): Promise<unknown> } }).claude;
        const assets = claude?.use ? await claude.use('assets').catch(() => null) as { upload(b: Blob): Promise<{ url: string }> } | null : null;
        const src = assets ? (await assets.upload(blob)).url : await toDataUri(blob);
        repo.setCover(e.id, { src, source: 'моє завантаження' });
      } catch { alert('Не вдалося завантажити обкладинку'); }
      setBusy(false);
    };
    inp.click();
  };
  return (
    <>
    <div className="cover-wrap">
      {cover ? <img className="cover cover-img" src={cover.src} alt={`Обкладинка ${e.name}`} /> : (
        <div className="cover" style={{ ['--h' as string]: hue }} aria-hidden>
          <span className="cover-artist">{artist}</span>
          <span className="cover-title">{e.name}</span>
          <span className="cover-year">{yearsText(e, snap)}</span>
        </div>
      )}
      <div className="cover-meta">
        {sp && <a className="link" href={sp.link} target="_blank" rel="noreferrer">Відкрити в Spotify ↗</a>}
        {!sp && cover?.link && <a className="link" href={cover.link} target="_blank" rel="noreferrer">Слухати на {cover.source}</a>}
        {cover && cover.source !== 'Spotify' && !cover.link && <span className="meta">Обкладинка: {cover.source}</span>}
        {e.type === 'release' && <button className="btn ghost small" onClick={pick} disabled={busy}>
          {busy ? 'Завантажую…' : cover ? 'Замінити обкладинку' : 'Завантажити обкладинку'}</button>}
      </div>
    </div>
    {sp && <div className="sp-note meta">У Spotify: {sp.artist} — {sp.title}{sp.date ? `, ${sp.date.slice(0, 4)}` : ''}</div>}
    </>
  );
}

export function DetailPanel({ entity: e, snap, onNavigate, onPathFrom, onAddRelation, onClose }: Props) {
  const rels = useMemo(() => snap.relations.filter((r) => r.from === e.id || r.to === e.id), [snap.relations, e.id]);
  const grouped = useMemo(() => {
    const m = new Map<ClaimClass, Relation[]>();
    for (const r of rels) {
      const c = RELATION_CLASS[r.type];
      if (!m.has(c)) m.set(c, []);
      m.get(c)!.push(r);
    }
    for (const list of m.values()) list.sort((a, b) => a.type.localeCompare(b.type));
    return CLASS_ORDER.filter((c) => m.has(c)).map((c) => [c, m.get(c)!] as const);
  }, [rels]);
  const artist = e.attrs?.artist ? snap.entities.get(e.attrs.artist) : undefined;
  const release = e.attrs?.release ? snap.entities.get(e.attrs.release) : undefined;
  const parent = e.attrs?.parent ? snap.entities.get(e.attrs.parent) : undefined;
  const parentGenres = (e.attrs?.genres ?? []).map((g) => snap.entities.get(g)).filter((g): g is Entity => !!g);
  const meta = [yearsText(e, snap), placeText(e, snap)].filter(Boolean).join(' · ');
  const hyps = snap.hypotheses.filter((h) => h.related.includes(e.id));

  return (
    <aside className="panel" aria-label={`Деталі: ${e.name}`}>
      <header className="panel-head">
        <div className="eyebrow">
          <span className={`dot dot-${e.type}`} />{typeLabel(e)}
          {e.attrs?.placeholder && <span className="conf conf-unverified">ще не досліджено</span>}
          <ConfidenceBadge c={e.confidence} />
          {e.author === 'arthur' && <span className="conf conf-mine">додано мною</span>}
        </div>
        <button className="icon-btn close" onClick={onClose} aria-label="Закрити">×</button>
      </header>

      {(e.type === 'release' || e.type === 'track') && <Cover e={e} snap={snap} />}

      <h2 className="title">{e.name}</h2>
      {(artist || release || parent || parentGenres.length > 0) && (
        <p className="byline">
          {artist && <button className="link" onClick={() => onNavigate(artist.id)}>{artist.name}</button>}
          {release && <> · <button className="link" onClick={() => onNavigate(release.id)}><i>{release.name}</i></button></>}
          {parentGenres.length > 0 && <>{parentGenres.length > 1 ? 'жанри' : 'жанр'} {parentGenres.map((g, i) => (
            <span key={g.id}>{i > 0 && ', '}<button className="link" onClick={() => onNavigate(g.id)}>{g.name}</button></span>))}</>}
          {parent && <>{parentGenres.length > 0 && ' · '}гілка <button className="link" onClick={() => onNavigate(parent.id)}>{parent.name}</button></>}
        </p>
      )}
      {meta && <p className="meta mono">{meta}</p>}
      {e.aliases?.length ? <p className="meta">також: {e.aliases.join(', ')}</p> : null}
      {e.attrs?.discogs && <p className="meta">Discogs: {e.attrs.discogs}</p>}
      {snap.journal.vinyl?.[e.id] && <p className="meta">◉ {VINYL_LABEL[snap.journal.vinyl[e.id]]}</p>}

      <div className="actions">
        <button className="btn" onClick={() => onPathFrom(e.id)} title="Потім клікни другий вузол на карті">Шлях до…</button>
        <button className="btn ghost" onClick={() => onAddRelation(e.id)}>+ Зв’язок</button>
      </div>

      <section className="sec">
        <h3 className="sec-title">Історія</h3>
        {e.summary && <p className="summary">{e.summary}</p>}
        {e.note && <p className="uncertain"><span className="q">?</span>{e.note}</p>}
        {grouped.map(([cls, list]) => (
          <div key={cls} className={`rel-group rel-${cls}`}>
            <div className="rel-group-title"><span className={`line-sample ls-${cls}`} />{CLASS_LABEL[cls]}</div>
            <ul className="rels">
              {list.map((r) => {
                const out = r.from === e.id;
                const otherId = out ? r.to : r.from;
                const other = snap.entities.get(otherId);
                if (!other) return null;
                return (
                  <li key={r.id} className="rel">
                    <div className="rel-line">
                      <span className="rel-verb">{RELATION_LABEL[r.type][out ? 0 : 1]}</span>
                      <button className="link rel-target" onClick={() => onNavigate(otherId)}>
                        <span className={`dot dot-${other.type}`} />{other.name}
                      </button>
                      <ConfidenceBadge c={r.confidence} />
                      {r.author === 'arthur' && !r.id.startsWith('drv:') && (
                        <button className="icon-btn tiny" title="Видалити мій зв’язок" onClick={() => repo.removeUserRelation(r.id)}>×</button>
                      )}
                    </div>
                    {!r.id.startsWith('drv:') && <div className="why">{r.why}</div>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <MineSection e={e} snap={snap} />

      {hyps.length > 0 && (
        <section className="sec lab">
          <h3 className="sec-title">Гіпотези</h3>
          {hyps.map((h) => <p key={h.id} className="hyp">«{h.text}» <span className="conf conf-unverified">відкрита</span></p>)}
        </section>
      )}
    </aside>
  );
}

function MineSection({ e, snap }: { e: Entity; snap: Snapshot }) {
  const status = snap.journal.statuses[e.id];
  const reactions = snap.journal.reactions.filter((r) => r.target === e.id);
  const options = isListeningType(e.type) ? LISTENING_STATUSES : EXPLORATION_STATUSES;
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState(snap.journal.notes[e.id] ?? '');
  const [noteFor, setNoteFor] = useState(e.id);
  if (noteFor !== e.id) { setNoteFor(e.id); setNote(snap.journal.notes[e.id] ?? ''); setAdding(false); }

  return (
    <section className="sec mine">
      <h3 className="sec-title">Моє</h3>
      <div className="chips" role="radiogroup" aria-label="Статус">
        {options.map((s) => (
          <button key={s} role="radio" aria-checked={status === s}
            className={`chip st-chip ${status === s ? 'on' : ''}`}
            onClick={() => repo.setStatus(e.id, status === s ? null : (s as Status))}>
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {reactions.length > 0 && (
        <ul className="reactions">
          {reactions.map((r) => (
            <li key={r.id} className={`reaction pol-${r.polarity ?? 'anchor'}`}>
              <div className="reaction-head">
                {r.anchor && <span className="tag">орієнтир смаку</span>}
                {r.polarity && <span className="tag strong">{POLARITY_LABEL[r.polarity]}</span>}
                <span className="tag">{SCOPE_LABEL[r.scope]}</span>
                {r.reason && <span className="tag reason">{REASON_LABEL[r.reason]}</span>}
                {r.segment?.tracks && <span className="tag">{r.segment.tracks}</span>}
                {r.segment?.fromSec !== undefined && <span className="tag mono">від {fmtTime(r.segment.fromSec)}</span>}
              </div>
              <p className="reaction-text">{r.text}</p>
              <div className="reaction-foot mono">
                {r.date} · {r.origin === 'brief-2026-11' ? 'з брифу' : r.origin === 'note' ? 'з повідомлення' : 'додано в застосунку'}
                {r.axes?.length ? ` · ${r.axes.map((a) => AXIS_LABEL[a]).join(', ')}` : ''}
                {r.origin === 'app' && <button className="icon-btn tiny" onClick={() => repo.removeReaction(r.id)} aria-label="Видалити реакцію">×</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {reactions.length === 0 && !adding && <p className="empty">Реакцій ще немає.</p>}

      {adding ? <ReactionForm target={e} onDone={() => setAdding(false)} />
        : <button className="btn ghost small" onClick={() => setAdding(true)}>+ Реакція</button>}

      <label className="field">
        <span>Нотатка</span>
        <textarea rows={3} value={note} placeholder="Що почув, з чим порівняти, куди далі…"
          onChange={(ev) => setNote(ev.target.value)} onBlur={() => repo.setNote(e.id, note)} />
      </label>
    </section>
  );
}

const POLARITIES: Polarity[] = ['strong_positive', 'positive', 'mixed', 'neutral', 'negative'];
const REASONS: NegativeReason[] = ['disliked', 'not_now', 'too_intense', 'too_light', 'not_explored', 'uncertain'];
const AXES: ListeningAxis[] = ['atmosphere', 'texture', 'space', 'development', 'melody', 'groove'];

function ReactionForm({ target, onDone }: { target: Entity; onDone(): void }) {
  const defaultScope: ReactionScope = target.type === 'release' ? 'album' : target.type === 'track' ? 'track' : 'artist';
  const [polarity, setPolarity] = useState<Polarity>('positive');
  const [scope, setScope] = useState<ReactionScope>(defaultScope);
  const [reason, setReason] = useState<NegativeReason | ''>('');
  const [axes, setAxes] = useState<ListeningAxis[]>([]);
  const [text, setText] = useState('');
  const [from, setFrom] = useState('');
  const needsReason = polarity === 'negative' || polarity === 'mixed' || polarity === 'neutral';
  const submit = () => {
    if (!text.trim()) return;
    const m = from.match(/^(\d+):(\d{1,2})$/);
    repo.addReaction({
      target: target.id, date: new Date().toISOString().slice(0, 10), polarity, scope,
      reason: needsReason && reason ? reason : undefined, axes: axes.length ? axes : undefined, text: text.trim(),
      segment: m ? { fromSec: Number(m[1]) * 60 + Number(m[2]) } : undefined,
    });
    onDone();
  };
  return (
    <div className="form-card">
      <div className="row">
        <select value={polarity} onChange={(ev) => setPolarity(ev.target.value as Polarity)} aria-label="Реакція">
          {POLARITIES.map((p) => <option key={p} value={p}>{POLARITY_LABEL[p]}</option>)}
        </select>
        <select value={scope} onChange={(ev) => setScope(ev.target.value as ReactionScope)} aria-label="Обсяг">
          {(['album', 'track', 'artist', 'part'] as ReactionScope[]).map((s) => <option key={s} value={s}>{SCOPE_LABEL[s]}</option>)}
        </select>
      </div>
      {needsReason && (
        <select value={reason} onChange={(ev) => setReason(ev.target.value as NegativeReason)} aria-label="Причина">
          <option value="">Причина…</option>
          {REASONS.map((r) => <option key={r} value={r}>{REASON_LABEL[r]}</option>)}
        </select>
      )}
      {scope === 'part' && <input placeholder="Від хвилини, напр. 4:00" value={from} onChange={(ev) => setFrom(ev.target.value)} />}
      <div className="chips">
        {AXES.map((a) => (
          <button key={a} className={`chip ${axes.includes(a) ? 'on' : ''}`}
            onClick={() => setAxes(axes.includes(a) ? axes.filter((x) => x !== a) : [...axes, a])}>{AXIS_LABEL[a]}</button>
        ))}
      </div>
      <textarea rows={3} placeholder="Що саме спрацювало чи ні" value={text} onChange={(ev) => setText(ev.target.value)} />
      <div className="row end">
        <button className="btn ghost small" onClick={onDone}>Скасувати</button>
        <button className="btn small" onClick={submit} disabled={!text.trim()}>Зберегти</button>
      </div>
    </div>
  );
}
