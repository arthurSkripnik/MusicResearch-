import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { repo } from './lib/repository';
import { DEFAULT_FILTERS, inProducerLayer, isTopGenre, topGenresOf, stylesOf, genreLinks, influenceOf, type Filters } from './lib/graph';
import { GraphView, type GraphHandle } from './components/GraphView';
import { DetailPanel } from './components/DetailPanel';
import { SearchPalette } from './components/SearchPalette';
import { EntityForm, RelationForm } from './components/Forms';
import { FilterPopover, DecadeBar, Legend } from './components/MapControls';
import { PathPanel } from './components/PathPanel';
import { BridgePanel } from './components/BridgePanel';
import { computeBridge } from './lib/bridges';
import { loadPref, savePref } from './lib/prefs';

type Mode = 'history' | 'personal';

function panelInset() {
  const mobile = window.innerWidth <= 760;
  return { right: mobile ? 0 : 420, bottom: mobile ? Math.round(window.innerHeight * 0.55) : 0 };
}


export default function App() {
  const snap = useSyncExternalStore(repo.subscribe, repo.getSnapshot);
  const graph = useRef<GraphHandle>(null);
  const [mode, setMode] = useState<Mode>(() => loadPref('mode', 'history'));
  // what is open lives only while the page is open: every visit starts from the genres
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [showAll, setShowAll] = useState(false);
  const [openGenre, setOpenGenre] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(() => ({ ...DEFAULT_FILTERS, producers: loadPref('producers', false) }));
  const [pathFrom, setPathFrom] = useState<string | null>(null);
  const [pathEnds, setPathEnds] = useState<[string, string] | null>(null);
  const [pathInterp, setPathInterp] = useState(false);
  const [bridge, setBridge] = useState<[string, string] | null>(null);
  const [bridgeLit, setBridgeLit] = useState<string[] | null>(null);
  const [search, setSearch] = useState<null | 'find' | 'path'>(null);
  const [form, setForm] = useState<null | { kind: 'entity' } | { kind: 'relation'; from?: string }>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const personal = mode === 'personal';

  useEffect(() => savePref('mode', mode), [mode]);
  useEffect(() => savePref('producers', filters.producers), [filters.producers]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  // Which nodes are on the map: the top-level genres, or one genre with its styles, plus the tapped node's
  // neighbourhood (only while it is selected) and, in personal mode, everything in the journal.
  // styles of other genres that shaped (or were shaped by) the opened genre: drawn on an outer ring
  const bundleExt = useMemo(() => {
    if (!openGenre) return [] as string[];
    const own = new Set([openGenre, ...stylesOf(snap, openGenre)]);
    const out = new Set<string>();
    for (const r of snap.relations) {
      const f = influenceOf(snap, r); if (!f) continue;
      const add = (x: string) => topGenresOf(snap, x).filter((g) => g !== openGenre).forEach((g) => out.add(g));
      if (own.has(f[0]) && !own.has(f[1])) add(f[1]);
      if (own.has(f[1]) && !own.has(f[0])) add(f[0]);
    }
    return [...out];
  }, [snap, openGenre]);

  const visible = useMemo(() => {
    const v = new Set<string>();
    for (const e of snap.entities.values()) {
      if (showAll || (openGenre ? false : isTopGenre(e))) v.add(e.id);
    }
    if (openGenre && !showAll) { v.add(openGenre); stylesOf(snap, openGenre).forEach((id) => v.add(id)); bundleExt.forEach((id) => v.add(id)); }
    for (const id of expanded) v.add(id);
    if (personal) {
      Object.keys(snap.journal.statuses).forEach((id) => v.add(id));
      snap.journal.reactions.forEach((r) => v.add(r.target));
    }
    if (filters.producers) {
      // the layer brings its producers, the records they worked on and those records' artists
      for (const e of snap.entities.values()) if (e.type === 'producer') v.add(e.id);
      for (const r of snap.relations) {
        if (r.type !== 'produced' && r.type !== 'mixed' && r.type !== 'member_of') continue;
        const from = snap.entities.get(r.from);
        if (!from || !inProducerLayer(from)) continue;
        v.add(r.from); v.add(r.to);
        const target = snap.entities.get(r.to);
        const owner = target?.attrs?.artist;
        if (owner) v.add(owner);
        if (target?.type === 'track' && target.attrs?.release) v.add(target.attrs.release);
      }
    }
    if (selected) v.add(selected);
    return v;
  }, [snap, expanded, showAll, openGenre, bundleExt, personal, selected, filters.producers]);

  const neighbours = useCallback((id: string) => {
    const out = new Set<string>();
    for (const r of snap.relations) {
      if (r.from === id) out.add(r.to);
      if (r.to === id) out.add(r.from);
    }
    return out;
  }, [snap.relations]);

  const expand = useCallback((id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev); n.add(id);
      neighbours(id).forEach((x) => n.add(x));
      return n;
    });
  }, [neighbours]);

  const shortest = useMemo(() => {
    if (!pathEnds) return null;
    return graph.current?.shortestPath(pathEnds[0], pathEnds[1], pathInterp) ?? null;
  }, [pathEnds, pathInterp, snap]);
  // an open bridge lights its two genres and the edges between them; «Підсвітити» adds everything they share
  const bridgePath = useMemo(() => {
    if (!bridge) return null;
    const br = computeBridge(snap, bridge[0], bridge[1]);
    if (!br) return null;
    const nodes = bridgeLit ?? [bridge[0], bridge[1]];
    const on = new Set(nodes);
    const edges = new Set(br.edges.filter((id) => !id.startsWith('hb:')));
    edges.add(`hb:${[bridge[0], bridge[1]].sort().join('~')}`);
    edges.add(`agg:${bridge[0]}>${bridge[1]}`); edges.add(`agg:${bridge[1]}>${bridge[0]}`);
    if (bridgeLit) for (const r of snap.relations) if (on.has(r.from) && on.has(r.to)) edges.add(r.id);
    return { nodes, edges: [...edges] };
  }, [bridge, bridgeLit, snap]);
  const path = shortest ?? bridgePath;

  const select = useCallback((id: string, shift = false) => {
    const from = pathFrom ?? (shift && selected ? selected : null);
    if (from && from !== id) {
      setPathEnds([from, id]); setPathFrom(null); setSelected(null);
      return;
    }
    setPathEnds(null); setBridge(null); setBridgeLit(null);
    const e = snap.entities.get(id);
    // a top-level genre opens into its styles first; a second tap selects it
    if (isTopGenre(e) && openGenre !== id && !showAll && stylesOf(snap, id).length) {
      setOpenGenre(id); setSelected(null); setExpanded(new Set());
      return;
    }
    if (isTopGenre(e) && !stylesOf(snap, id).length) setOpenGenre(null);
    if (!showAll && !isTopGenre(e)) {
      const homes = topGenresOf(snap, id);
      if (homes.length && !(openGenre && homes.includes(openGenre))) setOpenGenre(homes[0]);
    }
    setSelected(id);
    // the neighbourhood is shown only while the node is selected: nothing piles up
    setExpanded(new Set([id, ...neighbours(id)]));
  }, [pathFrom, selected, snap, openGenre, showAll, neighbours]);

  const back = useCallback(() => {
    setPathEnds(null); setPathFrom(null); setBridge(null); setBridgeLit(null);
    if (selected) { setSelected(null); setExpanded(new Set()); return; }
    setExpanded(new Set());
    setOpenGenre(null);
  }, [selected]);

  // the camera frames the genres or the opened genre when nothing is selected
  useEffect(() => {
    if (selected) return;
    const t = setTimeout(() => graph.current?.fit(), 90);
    return () => clearTimeout(t);
  }, [openGenre, showAll]);

  const links = useMemo(() => genreLinks(snap), [snap]);
  const topGenres = useMemo(() => [...snap.entities.values()].filter(isTopGenre)
    .sort((a, b) => stylesOf(snap, b.id).length - stylesOf(snap, a.id).length), [snap]);

  // camera follows the selection once its neighbourhood is on the map
  useEffect(() => {
    if (!selected) return;
    const t = setTimeout(() => graph.current?.focusOn([selected], panelInset()), 60);
    return () => clearTimeout(t);
  }, [selected]);
  useEffect(() => {
    if (!path) return;
    const t = setTimeout(() => graph.current?.focusOn(path.nodes, panelInset(), false), 60);
    return () => clearTimeout(t);
  }, [path]);
  const openBridge = useCallback((a: string, b: string) => {
    setSelected(null); setPathEnds(null); setPathFrom(null); setBridgeLit(null); setBridge([a, b]);
  }, []);

  const navigate = useCallback((id: string) => {
    select(id);
  }, [select]);

  // keyboard: ⌘K / "/" search, Esc clears
  useEffect(() => {
    const h = (ev: KeyboardEvent) => {
      const typing = (ev.target as HTMLElement)?.closest('input, textarea, select');
      if ((ev.key === 'k' && (ev.metaKey || ev.ctrlKey)) || (ev.key === '/' && !typing)) { ev.preventDefault(); setSearch('find'); }
      if (ev.key === 'Escape' && !typing) { setFiltersOpen(false); setMenuOpen(false); back(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [back]);

  const sel = selected ? snap.entities.get(selected) : undefined;
  const hiddenNeighbours = 0;
  const activeFilterCount = (filters.types.size !== DEFAULT_FILTERS.types.size ? 1 : 0)
    + (filters.classes.size !== 4 ? 1 : 0) + (filters.country ? 1 : 0) + (filters.hideUnverified ? 1 : 0)
    + (filters.statusOnly ? 1 : 0);

  const doExport = async () => {
    setMenuOpen(false);
    const filename = `music-explorer-${new Date().toISOString().slice(0, 10)}.json`;
    const data = repo.exportJSON();
    const claude = (globalThis as { claude?: { use(n: string): Promise<unknown> } }).claude;
    const dl = claude?.use ? await claude.use('downloads').catch(() => null) as { save(o: { filename: string; data: string }): Promise<unknown> } | null : null;
    if (dl) {
      try { await dl.save({ filename, data }); } catch { setToast('Збереження скасовано'); }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = filename; a.click();
  };
  const doImport = () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json';
    inp.onchange = async () => {
      const f = inp.files?.[0]; if (!f) return;
      try { repo.importJSON(await f.text()); setToast('Імпортовано'); } catch (err) { setToast(String((err as Error).message)); }
    };
    inp.click(); setMenuOpen(false);
  };

  return (
    <div className={`app ${personal ? 'is-personal' : ''} ${sel || path ? 'has-panel' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">Music Explorer</span>
          <span className="brand-sub">{snap.entities.size} вузлів · {repo.storage === 'cloud' ? 'зміни зберігаються' : 'зміни лише в цьому браузері'}</span>
        </div>
        <button className="searchbox" onClick={() => setSearch('find')}>
          <span>Пошук</span><kbd>⌘K</kbd>
        </button>
        <div className="seg" role="tablist" aria-label="Режим">
          <button role="tab" aria-selected={!personal} className={!personal ? 'on' : ''} onClick={() => setMode('history')}>Історія</button>
          <button role="tab" aria-selected={personal} className={personal ? 'on' : ''} onClick={() => setMode('personal')}>Моє</button>
        </div>
        <div className="tools">
          <button className={`btn ghost ${filtersOpen ? 'pressed' : ''}`} onClick={() => { setFiltersOpen(!filtersOpen); setMenuOpen(false); }}>
            Фільтри{activeFilterCount ? ` · ${activeFilterCount}` : ''}
          </button>
          <button className="btn ghost" onClick={() => setShowAll(!showAll)} title="Показати всі вузли разом (до закриття сторінки) або повернутися до жанрів">
            {showAll ? 'Жанри' : 'Усе'}
          </button>
          <button className={`btn ghost layer-btn ${filters.producers ? 'pressed on' : ''}`} aria-pressed={filters.producers}
            onClick={() => {
              const on = !filters.producers;
              setFilters({ ...filters, producers: on });
              setToast(on ? 'Шар продюсерів увімкнено' : 'Шар продюсерів вимкнено');
              if (on) setTimeout(() => graph.current?.focusOn(
                [...snap.entities.values()].filter((e) => e.type === 'producer').map((e) => e.id), panelInset()), 120);
            }}
            title="Продюсери і звукорежисери, що з’єднують записи різних артистів">
            <span className="dot dot-producer" />Продюсери
          </button>
          <button className="btn" onClick={() => setForm({ kind: 'entity' })}>+ Додати</button>
          <button className="icon-btn" aria-label="Меню" onClick={() => { setMenuOpen(!menuOpen); setFiltersOpen(false); }}>⋯</button>
        </div>
        {menuOpen && (
          <div className="popover menu">
            <button onClick={() => { graph.current?.fit(); setMenuOpen(false); }}>Вмістити карту в екран</button>
            <button onClick={() => { setExpanded(new Set()); setShowAll(false); setOpenGenre(null); setSelected(null); setMenuOpen(false); }}>Згорнути до жанрів</button>
            <button onClick={() => { graph.current?.relayout(); setMenuOpen(false); }}>Перерахувати розкладку</button>
            <hr />
            <button onClick={doExport}>Експорт моїх даних (JSON)</button>
            <button onClick={doImport}>Імпорт з JSON…</button>
            <hr />
            <button className="danger" onClick={() => {
              if (confirm('Скинути всі мої зміни до стану з брифу?')) { repo.resetAll(); setMenuOpen(false); setToast('Скинуто'); }
            }}>Скинути мої зміни</button>
          </div>
        )}
        {filtersOpen && <FilterPopover filters={filters} setFilters={setFilters} personal={personal} />}
      </header>

      <main className="stage">
        <GraphView ref={graph} snap={snap} visible={visible} filters={filters} personal={personal} top={!showAll && !openGenre}
          bundle={openGenre && !showAll ? { center: openGenre, members: stylesOf(snap, openGenre), ext: bundleExt } : null}
          selected={selected} path={path} onSelect={select} onExpand={expand} onBridge={openBridge}
          onBackground={() => { setSelected(null); setExpanded(new Set()); setPathEnds(null); setBridge(null); setBridgeLit(null); }} />

        {!showAll && (
          <nav className="levels" aria-label="Рівень карти">
            <div className="lv-row">
              {(openGenre || selected) && <button className="lv-back" onClick={back}>← Назад</button>}
              <div className="lv-crumbs">
                <button className={!openGenre ? 'cur' : ''} onClick={() => { setSelected(null); setExpanded(new Set()); setOpenGenre(null); }}>Усі жанри</button>
                {openGenre && <><span>›</span><button className={!selected ? 'cur' : ''} onClick={() => { setSelected(null); setExpanded(new Set()); }}>{snap.entities.get(openGenre)?.name}</button></>}
                {selected && sel && sel.id !== openGenre && <><span>›</span><b>{sel.name}</b></>}
              </div>
            </div>
            {openGenre && !selected && (
              <div className="lv-chips" aria-label="Інші жанри">
                {topGenres.filter((g) => g.id !== openGenre).map((g) => {
                  const into = links.find((l) => l.a === g.id && l.b === openGenre)?.n;
                  const from = links.find((l) => l.a === openGenre && l.b === g.id)?.n;
                  return <button key={g.id} onClick={() => select(g.id)}>{g.name}
                    {into ? <span title="вплинув на цей жанр">→{into}</span> : null}{from ? <span title="зазнав впливу цього жанру">←{from}</span> : null}</button>;
                })}
              </div>
            )}
            {!openGenre && !selected && <div className="lv-hint">Стрілка — вплив: хто кого сформував, цифра — скільки зв’язків між стилями. Тапни жанр, щоб розкрити, або стрілку — щоб побачити місток.</div>}
          </nav>
        )}

        {pathFrom && (
          <div className="banner">
            Обери другий вузол на карті —
            <button className="link" onClick={() => setSearch('path')}>або знайди пошуком</button>
            <button className="icon-btn tiny" onClick={() => setPathFrom(null)} aria-label="Скасувати">×</button>
          </div>
        )}

        <Legend personal={personal} producers={filters.producers} />
        <DecadeBar filters={filters} setFilters={setFilters} />
      </main>

      {sel && !path && (
        <DetailPanel entity={sel} snap={snap} hiddenNeighbours={hiddenNeighbours}
          onNavigate={navigate} onExpand={expand} onClose={() => setSelected(null)}
          onPathFrom={(id) => { setPathFrom(id); setToast('Тепер клікни другий вузол'); }}
          onAddRelation={(id) => setForm({ kind: 'relation', from: id })} />
      )}
      {bridge && !pathEnds && (
        <BridgePanel ends={bridge} snap={snap} lit={!!bridgeLit} onLight={setBridgeLit}
          onNavigate={navigate} onClose={() => { setBridge(null); setBridgeLit(null); }} />
      )}
      {pathEnds && (
        <PathPanel ends={pathEnds} path={path} snap={snap} interp={pathInterp} setInterp={setPathInterp}
          onNavigate={navigate} onClose={() => setPathEnds(null)} />
      )}

      {search && (
        <SearchPalette snap={snap} title={search === 'path' ? 'Шлях до…' : undefined} onClose={() => setSearch(null)}
          onPick={(id) => { setSearch(null); if (search === 'path') select(id); else navigate(id); }} />
      )}
      {form?.kind === 'entity' && (
        <EntityForm snap={snap} onClose={() => setForm(null)} onCreated={(id) => { setForm(null); navigate(id); }} />
      )}
      {form?.kind === 'relation' && <RelationForm snap={snap} fromId={form.from} onClose={() => setForm(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
