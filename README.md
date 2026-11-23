# Music Explorer — prototype

Personal music knowledge graph: history (canon), Arthur's journal, research hypotheses.

```
npm install
npm run dev        # local dev server
npm run me stats   # counts + pending inbox
npm run check      # validate data: ids, references, every relation has a "why"
npm run release    # check + single-file build in dist/ (+ cover files to publish)
```

## Where things live
- `data/` — **the database**. One JSON record per line, so diffs and searches stay small.
  - `entities/<type>.json` — genres/styles, scenes, labels, artists, releases, tracks, cities, events, concepts, producers
  - `relations.json` — every relation has a stable id `type:from>to` and a `why`
  - `journal/brief-2026-11.json`, `journal/notes.json` — Arthur's own reactions only (`source` = his words)
  - `hypotheses.json`, `covers.json` (file paths, not images), `spotify.json`
  - `bridges.json` — optional notes on genre ⇄ genre bridges (`diff`, `pin`, `era`); op `bridge` in `me`
- `public/covers/` — cover images (served next to the page; never read them)
- `inbox/pending/*.jsonl` — proposed changes written by research threads; `inbox/done/` after they are applied.
  Older prose notes (`inbox/*.md`) are history.
- `tools/me.ts` — the command for reading and changing data: `find`, `add`, `check`, `apply`, `release`
  (run `npx tsx tools/me.ts` for the op format)
- `src/data/index.ts` — the only loader of `data/`; `src/data/schema.ts` — types and Ukrainian UI labels
- `src/lib/repository.ts` — the only data access point for the UI (bundled data + localStorage / artifact db overlay)
- `src/lib/graph.ts` — model → Cytoscape elements, filters, visual style
- `src/components/` — GraphView, DetailPanel, BridgePanel, MapControls, PathPanel, SearchPalette, Forms
- `src/lib/bridges.ts` — genre ⇄ genre bridges: directions from `influenced`/`emerged_from` (+ optional `via` ids),
  «what they share» derived at runtime (people, scenes, records, techniques, roots, likes); hidden bridges between styles.
  Check one without the UI: `npx tsx tools/bridge-probe.ts genre:hip-hop genre:neo-soul` or `--hidden`.

## Rules that keep updates cheap
- Bridges need no upkeep: add ordinary relations (an influence with `via`, a collaboration, a style) and the bridge picks them up.
- Change data only through `tools/me.ts` (`add` or `apply`); never open whole data files to edit them.
- Never open `public/covers/`, `dist/` or the published page; publish `dist/index.html` by path.
