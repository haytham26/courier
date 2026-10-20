# Maps & Navigation Squad - research

**Area:** map rendering, offline tiles, map styles (day/night courier style) **Research date:** 2026-10-20 · **Source files:** `docs/research/2026/{map-rendering-offline-tiles, navigation-turn-by-turn}.md`

## Queries that found the candidates

`"pmtiles"` · `topic:maplibre` · `topic:offline-first` (no map hits) · `"offline map"` · `"react-native map"` · `"vector tile generator"` · `"maplibre"` · `"pmtiles offline tiles app"` (0) · `"vector tile generator openstreetmap"` (0) ·
`"react-native map offline navigation"` (0) · `"osrm"` / `"navigation engine"` / `topic:geojson` · `"turn-by-turn navigation"` · `"maplibre-navigation"` · `"offline navigation"` · `gh api repos/<o>/<r>` · `/releases` · `/contents/*` ·
`/commits?since=` · `/license` · npm + OSV. Candidates: **38** (maps) · **36** (navigation).

## Candidates that matter

| Project | Repo | Licence | One-line reason |
|---|---|---|---|
| MapLibre React Native | `maplibre/maplibre-react-native` | BSD-3-Clause | Only RN binding with New-Arch codegen, an Expo 58 peer range and targetSdk 34; we are on 11.3.7. |
| MapLibre Native | `maplibre/maplibre-native` | BSD-3-Clause | The renderer; its PMTiles file/asset source with byte-range reads is what makes offline possible. |
| PMTiles | `protomaps/PMTiles` | BSD-3 implementations, **spec public domain (CC0)** | A single-file archive - no tile server, no CORS, no API key for the offline pack. |
| go-pmtiles | `protomaps/go-pmtiles` | BSD-3-Clause | `pmtiles extract` is the only way to cut a bbox-limited Canterbury pack. |
| Protomaps basemaps | `protomaps/basemaps` | BSD-3 code, **CC0 visual design**, ODbL tilesets | The style base; day and night are a theme swap of one generated style. |
| Maputnik / Planetiler | `maplibre/maputnik`, `onthegomap/planetiler` | MIT / Apache-2.0 | Where the courier style is authored, and the pack builder (YAML profiles add courier layers without forking Java). |
| openfreemap | `hyperknot/openfreemap` | MIT | A complete, key-less online fallback stack - but one primary maintainer and a "best effort" SLA. |
| pmtiles-rs / versatiles | `stadiamaps/pmtiles-rs`, `versatiles-org/versatiles-rs` | Apache-2.0 / MIT | HTTP range reader and the client-library-free container alternative. |
| GeoLibre / Overture tiles | `opengeos/GeoLibre`, `OvertureMaps/overture-tiles` | MIT / Apache-2.0 | 2026 GIS platform (analytics value); structured addresses for the Address squad. |
| Ferrostar | `stadiamaps/ferrostar` | BSD-3-Clause | The navigation engine and its state machine (see `routing/research.md`). |
| OrganicMaps / Vela | `organicmaps/organicmaps`, `PimpinPumpkin/Vela` | mixed / GPL-3.0 | Clean-room references for offline-pack download UX; never a dependency. |

## Deep review - top 5

1. **maplibre/maplibre-react-native** - a Yarn-4 monorepo, `react-native-builder-bob` 0.41 producing CJS + ESM + TS, npm `publishConfig.provenance: true`; `codegenConfig` plus an iOS component provider per component = **Fabric-ready**, with
   the old architecture still supported. Ships `app.plugin.js` so `expo prebuild` works; peer dependencies cover SDK 58. Android `minSdk 24 / target 34 / compile 35`; `VectorSource` accepts a `pmtiles://` URL, so `pmtiles://file:///...`
   works through the binding. Quality: ESLint `--max-warnings 0`, `tsc` over src *and* tests, Jest + snapshot diffs; the changelog shows real bug-fix cadence (two ANR deadlocks in 11.3.8). Risk: ~4 human maintainers, 364 open issues.
   **Verdict KEEP, upgrade 11.3.7 -> 11.5.0 (an ANR fix + the feature-state API).**
2. **protomaps/PMTiles** - the v3 spec with reference JS/Python/Go implementations under BSD-3 and a **public-domain spec**, which is why the format can be re-implemented freely; `go-pmtiles` is the maintained CLI, npm `pmtiles` 4.5.0 the
   JS reader, `pmtiles-rs` the Rust reader. It fits us because the archive is a *file*: MapLibre Native reads it with byte-range requests, so there is no tile server for the offline pack. Weakness: the repo has **no tagged releases and no
   commit since 2026-09-16** - the format is stable but the reference repo is quiet; pin `go-pmtiles` exactly and checksum it. **Verdict ADOPT (v3).**
3. **protomaps/basemaps** - `tiles/` (a Planetiler/Maven profile), `styles/` (a TypeScript style generator with multiple colour themes) and `app/` (a viewer). The licence is explicit: code BSD-3-Clause, **visual design CC0**, tilesets ODbL
   with OSM attribution, with a request to attribute and to name the fork differently. Because the style is generated from a TS package, a day/night pair is a theme swap rather than two hand-written styles; `basemaps-assets` hosts fonts and
   sprites we must mirror into the APK - measure the size. Risk: the Planetiler build is heavy for CI, so for Canterbury we use `--area=christchurch`, not the planet. **Verdict ADOPT, forked as `courier-copilot-style`.**
4. **maplibre/maplibre-native** - the PMTiles file source plus Android/iOS docs support `https://`, `file://` and (13.7.1) `asset://` with **byte-range reads of APK assets**, so a small city pack can ship inside the APK and a large region
   pack is a downloadable file. Weekly releases. 2026 features worth knowing: globe projection, the experimental C plugin API for custom style layer types, `globalState` expressions, and **rendered-feature introspection** - exactly what we
   need to prove "the courier style only draws house numbers at z17". Risks: 1,536 open issues, breaking iOS 7.0.0 pre-releases. **Verdict KEEP (transitive).**
5. **hyperknot/openfreemap** - a complete, open production tile-hosting stack (Planetiler profile + OpenMapTiles schema + Martin + MapLibre styles) with weekly planet builds. Its README is honest about the limits: **no search/geocoding, no
   route calculation, navigation or directions**, no raster/satellite or elevation. Fit for us: an online fallback outside the downloaded region, removing Google/Mapbox entirely. Risks: one primary maintainer, donation-funded, "best effort"
   SLA - if we depend on it we must self-host, and the repo ships the whole production setup. **Verdict WATCH; self-hosted fallback only.**

## Decisions

- **KEEP** `@maplibre/maplibre-react-native`, upgrade **11.3.7 -> 11.5.0**; **KEEP** MapLibre Native (transitive); **KEEP** `maplibre/maputnik` as the design tool; **KEEP** `onthegomap/planetiler`.
- **ADOPT** PMTiles v3 (the spec is public domain, so we may write our own reader) with `go-pmtiles` pinned by SHA-256 as the build tool.
- **ADOPT** Protomaps basemaps `styles/` forked as `courier-copilot-style` (BSD-3 code, **CC0 design**, so we may publish a modified courier style), with a day and a night theme generated from one theme source.
- **ADOPT** the server-side Planetiler profile (`--area=christchurch`) -> `pmtiles extract` to the agreed bbox/zoom -> a file the app reads via `pmtiles://file://`.
- **FALLBACK** self-hosted `hyperknot/openfreemap`, not their public instance, for out-of-region.
- **WATCH** `stadiamaps/pmtiles-rs`, `versatiles-org/versatiles-rs` + style, `opengeos/GeoLibre`, `OvertureMaps/overture-tiles` (cross-squad), `maplibre-gl-directions`, `cyang-kth/fmm`.
- **REJECT / CLEAN-ROOM** `PimpinPumpkin/Vela` (GPL-3.0) and `organicmaps/organicmaps` (mixed licence) are **clean-room study material only**; `Framstag/libosmscout` and `mapsforge/mapsforge` (LGPL-3.0), `Akylas/alpimaps` (stale).

## UNVERIFIED

1. **No benchmark exists**, so **60 fps pan/zoom, the <= 50 MB Canterbury pack and the day/night style parity are all unmeasured**.
2. **The Canterbury PMTiles size is unknown** - no published figure; the Protomaps area-build URL pattern is undocumented and every candidate URL 404s. We must build it.
3. Whether the MapLibre Native **RN wrapper needs a patch for `pmtiles://file://`** - the RN example only demonstrates `pmtiles://https://`; the file and asset variants are documented at the native layer but no end-to-end RN test was found.
   Prove it in the eval harness.
4. **ODbL share-alike on derived tilesets** - whether an on-device cached OSM tile set is a "produced work" that must be ODbL-licensed is **UNVERIFIED and needs a legal opinion**.
5. The `protomaps/basemaps` npm package name and version; the **font/sprite asset size** we must mirror into the APK; MapLibre Native iOS pre-release breakage; the per-directory licence split inside OrganicMaps. UNVERIFIED.
6. 6-month star trend, median maintainer response time and closed-issue ratios for every candidate. UNVERIFIED.
