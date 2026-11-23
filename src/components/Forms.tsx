import { useMemo, useState } from 'react';
import type { Entity, EntityType, Confidence, RelationType, CountryCode } from '../data/schema';
import { TYPE_LABEL, CONFIDENCE_LABEL, RELATION_LABEL, RELATION_CLASS, CLASS_LABEL, COUNTRY_LABEL } from '../data/schema';
import { repo, type Snapshot } from '../lib/repository';
import { slugify } from '../lib/util';

const CONFS: Confidence[] = ['established', 'likely', 'disputed', 'unverified'];
const NEW_TYPES: EntityType[] = ['artist', 'release', 'track', 'genre', 'scene', 'label', 'city', 'event', 'concept'];
// derived relations (released, track_of, based_in) are created from entity fields instead
const REL_TYPES = (Object.keys(RELATION_CLASS) as RelationType[]).filter((t) => !['released', 'track_of'].includes(t));

function EntityPicker({ snap, value, onChange, label, exclude }: {
  snap: Snapshot; value: string; onChange(id: string): void; label: string; exclude?: string;
}) {
  const [q, setQ] = useState(value ? snap.entities.get(value)?.name ?? '' : '');
  const listId = useMemo(() => `dl-${Math.random().toString(36).slice(2)}`, []);
  const options = useMemo(() => [...snap.entities.values()].filter((e) => e.id !== exclude), [snap.entities, exclude]);
  return (
    <label className="field">
      <span>{label}</span>
      <input list={listId} value={q} placeholder="Почни вводити назву…" onChange={(ev) => {
        setQ(ev.target.value);
        const hit = options.find((e) => `${e.name} · ${TYPE_LABEL[e.type]}` === ev.target.value || e.name === ev.target.value);
        onChange(hit?.id ?? '');
      }} />
      <datalist id={listId}>
        {options.map((e) => <option key={e.id} value={`${e.name} · ${TYPE_LABEL[e.type]}`} />)}
      </datalist>
    </label>
  );
}

export function EntityForm({ snap, onClose, onCreated }: { snap: Snapshot; onClose(): void; onCreated(id: string): void }) {
  const [type, setType] = useState<EntityType>('artist');
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [country, setCountry] = useState<CountryCode | ''>('');
  const [city, setCity] = useState('');
  const [artist, setArtist] = useState('');
  const [summary, setSummary] = useState('');
  const [confidence, setConfidence] = useState<Confidence>('likely');
  const cities = [...snap.entities.values()].filter((e) => e.type === 'city');
  const id = `${type}:${slugify(name)}`;
  const exists = snap.entities.has(id);
  const ok = name.trim() && !exists && (!(type === 'release' || type === 'track') || artist);

  const submit = () => {
    if (!ok) return;
    const e: Entity = {
      id, type, name: name.trim(), confidence, author: 'arthur',
      years: from ? { from: Number(from), to: to ? Number(to) : undefined } : undefined,
      country: country || undefined, city: city || undefined, summary: summary.trim() || undefined,
      attrs: artist ? { artist, releaseType: type === 'release' ? 'album' : undefined } : undefined,
    };
    repo.addEntity(e);
    onCreated(id);
  };

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(ev) => ev.stopPropagation()} role="dialog" aria-label="Нова сутність">
        <h2 className="modal-title">Додати на карту</h2>
        <div className="chips">
          {NEW_TYPES.map((t) => <button key={t} className={`chip ${type === t ? 'on' : ''}`} onClick={() => setType(t)}>
            <span className={`dot dot-${t}`} />{TYPE_LABEL[t]}</button>)}
        </div>
        <label className="field"><span>Назва (англійською)</span>
          <input value={name} onChange={(ev) => setName(ev.target.value)} autoFocus />
          {exists && <small className="warn">Така сутність уже є.</small>}
        </label>
        {(type === 'release' || type === 'track') && (
          <EntityPicker snap={snap} value={artist} onChange={setArtist} label="Артист" />
        )}
        <div className="row">
          <label className="field"><span>Рік</span><input inputMode="numeric" value={from} onChange={(ev) => setFrom(ev.target.value.replace(/\D/g, ''))} /></label>
          {type !== 'release' && type !== 'track' && (
            <label className="field"><span>До</span><input inputMode="numeric" value={to} onChange={(ev) => setTo(ev.target.value.replace(/\D/g, ''))} /></label>
          )}
        </div>
        <div className="row">
          <label className="field"><span>Країна</span>
            <select value={country} onChange={(ev) => setCountry(ev.target.value as CountryCode)}>
              <option value="">—</option>
              {Object.entries(COUNTRY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          {type !== 'city' && (
            <label className="field"><span>Місто</span>
              <select value={city} onChange={(ev) => setCity(ev.target.value)}>
                <option value="">—</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}
        </div>
        <label className="field"><span>Опис (українською, об’єктивно)</span>
          <textarea rows={3} value={summary} onChange={(ev) => setSummary(ev.target.value)} />
        </label>
        <label className="field"><span>Наскільки впевнений у фактах</span>
          <select value={confidence} onChange={(ev) => setConfidence(ev.target.value as Confidence)}>
            {CONFS.map((c) => <option key={c} value={c}>{CONFIDENCE_LABEL[c]}</option>)}
          </select>
        </label>
        <div className="row end">
          <button className="btn ghost" onClick={onClose}>Скасувати</button>
          <button className="btn" disabled={!ok} onClick={submit}>Додати</button>
        </div>
      </div>
    </div>
  );
}

export function RelationForm({ snap, fromId, onClose }: { snap: Snapshot; fromId?: string; onClose(): void }) {
  const [from, setFrom] = useState(fromId ?? '');
  const [to, setTo] = useState('');
  const [type, setType] = useState<RelationType>('influenced');
  const [why, setWhy] = useState('');
  const [confidence, setConfidence] = useState<Confidence>('likely');
  const ok = from && to && from !== to && why.trim();
  const submit = () => {
    if (!ok) return;
    repo.addRelation({ id: `user:${Date.now().toString(36)}`, type, from, to, why: why.trim(), confidence, author: 'arthur' });
    onClose();
  };
  const fromName = fromId ? snap.entities.get(fromId)?.name : undefined;
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(ev) => ev.stopPropagation()} role="dialog" aria-label="Новий зв’язок">
        <h2 className="modal-title">Новий зв’язок</h2>
        {fromName ? <p className="meta">Від: <b>{fromName}</b></p>
          : <EntityPicker snap={snap} value={from} onChange={setFrom} label="Від" />}
        <label className="field"><span>Тип</span>
          <select value={type} onChange={(ev) => setType(ev.target.value as RelationType)}>
            {(['fact', 'history', 'interpretation', 'personal'] as const).map((cls) => (
              <optgroup key={cls} label={CLASS_LABEL[cls]}>
                {REL_TYPES.filter((t) => RELATION_CLASS[t] === cls).map((t) => <option key={t} value={t}>{RELATION_LABEL[t][0]}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <EntityPicker snap={snap} value={to} onChange={setTo} label="До" exclude={from} />
        <label className="field"><span>Чому (обов’язково)</span>
          <textarea rows={2} value={why} onChange={(ev) => setWhy(ev.target.value)} placeholder="Одне речення: на чому ґрунтується зв’язок" />
        </label>
        <label className="field"><span>Впевненість</span>
          <select value={confidence} onChange={(ev) => setConfidence(ev.target.value as Confidence)}>
            {CONFS.map((c) => <option key={c} value={c}>{CONFIDENCE_LABEL[c]}</option>)}
          </select>
        </label>
        {RELATION_CLASS[type] === 'interpretation' && <p className="hint">Інтерпретація показується пунктиром і не вважається історичним впливом.</p>}
        <div className="row end">
          <button className="btn ghost" onClick={onClose}>Скасувати</button>
          <button className="btn" disabled={!ok} onClick={submit}>Додати</button>
        </div>
      </div>
    </div>
  );
}
