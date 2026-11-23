// Map controls: filter popover, decade bar, legend.
import { useEffect, useState } from 'react';
import type { EntityType, ClaimClass, CountryCode } from '../data/schema';
import { TYPE_LABEL, CLASS_LABEL, COUNTRY_LABEL } from '../data/schema';
import { ALL_TYPES, DEFAULT_FILTERS, type Filters } from '../lib/graph';
import { loadPref, savePref } from '../lib/prefs';

const DECADES = [1960, 1970, 1980, 1990, 2000, 2010, 2020];

export function FilterPopover({ filters, setFilters, personal }: { filters: Filters; setFilters(f: Filters): void; personal: boolean }) {
  const toggleType = (t: EntityType) => {
    const s = new Set(filters.types); if (s.has(t)) s.delete(t); else s.add(t); setFilters({ ...filters, types: s });
  };
  const toggleClass = (c: ClaimClass) => {
    const s = new Set(filters.classes); if (s.has(c)) s.delete(c); else s.add(c); setFilters({ ...filters, classes: s });
  };
  return (
    <div className="popover filters">
      <div className="pf-group">
        <div className="pf-title">Типи вузлів</div>
        <div className="chips">
          {ALL_TYPES.map((t) => <button key={t} className={`chip ${filters.types.has(t) ? 'on' : ''}`} onClick={() => toggleType(t)}>
            <span className={`dot dot-${t}`} />{TYPE_LABEL[t]}</button>)}
        </div>
      </div>
      <div className="pf-group">
        <div className="pf-title">Типи зв’язків</div>
        <div className="chips">
          {(['fact', 'history', 'interpretation', 'personal'] as ClaimClass[]).map((c) => (
            <button key={c} className={`chip ${filters.classes.has(c) ? 'on' : ''}`} onClick={() => toggleClass(c)}>
              <span className={`line-sample ls-${c}`} />{CLASS_LABEL[c]}</button>
          ))}
        </div>
      </div>
      <div className="pf-group row">
        <label className="field"><span>Країна</span>
          <select value={filters.country} onChange={(ev) => setFilters({ ...filters, country: ev.target.value as CountryCode | '' })}>
            <option value="">Усі</option>
            {Object.entries(COUNTRY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      <label className="check"><input type="checkbox" checked={filters.hideUnverified}
        onChange={(ev) => setFilters({ ...filters, hideUnverified: ev.target.checked })} /> Сховати неперевірене</label>
      {personal && <label className="check"><input type="checkbox" checked={filters.statusOnly}
        onChange={(ev) => setFilters({ ...filters, statusOnly: ev.target.checked })} /> Лише те, що має мій статус чи реакцію</label>}
      <button className="btn ghost small" onClick={() => setFilters({ ...DEFAULT_FILTERS, producers: filters.producers })}>Скинути фільтри</button>
    </div>
  );
}

export function DecadeBar({ filters, setFilters }: { filters: Filters; setFilters(f: Filters): void }) {
  const [a, b] = filters.decades;
  const pick = (d: number) => {
    // click logic: first click narrows to one decade, shift-range by clicking an edge
    if (a === d && b === d) setFilters({ ...filters, decades: [1960, 2020] });
    else if (a === 1960 && b === 2020) setFilters({ ...filters, decades: [d, d] });
    else if (d < a) setFilters({ ...filters, decades: [d, b] });
    else if (d > b) setFilters({ ...filters, decades: [a, d] });
    else setFilters({ ...filters, decades: [d, d] });
  };
  const all = a === 1960 && b === 2020;
  return (
    <nav className="decades" aria-label="Десятиліття">
      {DECADES.map((d) => (
        <button key={d} className={`decade ${d >= a && d <= b ? 'in' : ''} ${all ? 'all' : ''}`} onClick={() => pick(d)}>
          {String(d).slice(2)}<span>-ті</span>
        </button>
      ))}
      {!all && <button className="decade reset" onClick={() => setFilters({ ...filters, decades: [1960, 2020] })}>усі</button>}
    </nav>
  );
}

export function Legend({ personal, producers }: { personal: boolean; producers: boolean }) {
  const [open, setOpen] = useState(() => loadPref('legend', true));
  useEffect(() => savePref('legend', open), [open]);
  if (!open) return <button className="legend-toggle" onClick={() => setOpen(true)}>Легенда</button>;
  return (
    <div className="legend">
      <button className="icon-btn tiny legend-close" onClick={() => setOpen(false)} aria-label="Сховати легенду">×</button>
      <div className="lg-col">
        {(['genre', 'scene', 'label', 'artist', 'release', 'track'] as EntityType[]).map((t) => (
          <div key={t} className="lg-row"><span className={`dot dot-${t}`} />{TYPE_LABEL[t]}</div>
        ))}
        {producers && <div className="lg-row"><span className="dot dot-producer" />{TYPE_LABEL.producer}</div>}
      </div>
      <div className="lg-col">
        {(['fact', 'history', 'interpretation'] as ClaimClass[]).map((c) => (
          <div key={c} className="lg-row"><span className={`line-sample ls-${c}`} />{CLASS_LABEL[c]}</div>
        ))}
        {personal ? <>
          <div className="lg-row"><span className="st-sample liked" />подобається</div>
          <div className="lg-row"><span className="st-sample ring" />послухати / цікаво</div>
          <div className="lg-row"><span className="st-sample off" />не зараз</div>
        </> : <div className="lg-hint">Подвійний клік — розкрити.<br />Shift+клік — шлях.</div>}
      </div>
    </div>
  );
}
