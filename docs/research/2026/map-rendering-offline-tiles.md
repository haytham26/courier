# Map rendering, offline tiles & map styles — 2026 OSS research

**Research date: 2026-10-20.** Method: V4 §12 (≥30 candidates, ≥10 shortlist, deep-review top 5,
benchmark top 2–3). Every number below was copied from the live GitHub REST/GraphQL API, the npm
registry or PyPI **on 2026-10-20**; nothing is estimated. Anything I could not read is marked
**UNVERIFIED** with the exact command that would settle it.
Card format (one line per field group): `repo · stars(+trend proxy) · created · last release/date ·
cadence · issues · maintainers/90 d · licence(code/data) · New-Arch/Expo58/API34 · size ·
on-device/server · advisories · production users · docs · CI · better than our choice · risks ·
DECISION`.

## 0. Scope, our current choice, and the bar we must clear

| Item | Today (verified 2026-10-20) |
|---|---|
| Renderer binding | `@maplibre/maplibre-react-native@11.3.7` (pinned in `apps/mobile/package.json`) — latest **11.5.0** (2026-10-04), so we are **2 releases behind** |
| App stack | Expo **58.0.14**, React Native **0.88.0**, React 19.3.0, `expo-location ~58.0.17` |
| Offline tiles | **none** — no PMTiles, no MBTiles, no offline-region code in the repo |
| Map style | **none** — `packages/map-style` does not exist yet (`docs/squads/maps/README.md`: "to be created") |
| Squad gate | 60 fps pan/zoom, full Canterbury offline, day+night styles (`docs/squads/maps/README.md`) |

So the question is **not** "which renderer" (MapLibre Native is already ours) but **which tile
container, which style base, and how a full Canterbury pack reaches the phone**.

**Correction 1 — "protomaps/PMTiles — Canterbury packs ≤ 50 MB" is UNVERIFIED.** The format is real
and the tooling exists, but I found no published Canterbury PMTiles size:
`https://build-metadata.protomaps.dev/builds.json` returns only the 62 *planet* builds (e.g.
`20230918.pmtiles` = 114,683,195,425 bytes) and every area URL I tried
(`build.protomaps.com/{2026,20261019,}/christchurch.pmtiles`, `.../nz.pmtiles`) returns **404**.
**Settle it by:** `cd protomaps/basemaps/tiles && mvn clean package && java -jar target/*-with-deps.jar
--download --force --area=christchurch` then `ls -l christchurch.pmtiles`, and budget it against the
80 MB APK ceiling in `CONSTRAINTS.md`.
**Correction 2 — "protomaps/basemaps (BSD-3; ODbL data)" is correct but incomplete.** `LICENSE.md`:
code **BSD-3-Clause**, *visual design* **CC0**, *tilesets* **ODbL** (attribute OSM), tile schema
adapted from Tilezen, and "name your fork … something different". The CC0 design clause is the
commercially important one and the shortlist omits it.

### 6-month star trend — method note (applies to all four files)

GitHub's stargazer listing is **not readable with the token in `.env.local`**: `GET
/repos/{owner}/{repo}/stargazers` and the GraphQL `stargazers` connection both return
`HTTP 403 Resource not accessible by personal access token` (the token lacks `read:user`).
**Every "6-month star trend" field below is therefore UNVERIFIED.** Verifiable proxies are quoted
in each card: **commits in the last 90 days** and **npm/PyPI downloads per month**
(`https://api.npmjs.org/downloads/point/last-month/<pkg>`).

## Queries run

All via `scripts\gh.ps1` / `gh search repos` on 2026-10-20 (search API, 30 req/min limit):

| # | Query | Sort | Result count |
|---|---|---|---|
| 1 | `pmtiles` | stars | 30 (top: maplibre/martin 4012, protomaps/PMTiles 3090) |
| 2 | `topic:maplibre` | stars | 30 (top: maplibre-gl-js 11899, GeoLibre 8049, openfreemap 6237) |
| 3 | `topic:offline-first` | stars | 25 (no map hits — "offline-first" is a sync keyword, not a tile keyword) |
| 4 | `offline map` | stars | 25 (top: organicmaps 15714, X-TRACK 6310, barefoot 693) |
| 5 | `react-native map` | stars | 20 (top: react-native-maps 16010, rnmapbox 2921) |
| 6 | `vector tile generator` | stars | 15 (top: walkerke/freestiler 153 — new 2026 repo) |
| 7 | `maplibre` | stars | 25 |
| 8 | `pmtiles offline tiles app` | updated | **0** (GitHub ANDs every term — recorded as a dead query) |
| 9 | `vector tile generator openstreetmap` | stars | **0** (dead query) |
| 10 | `react-native map offline navigation` | stars | **0** (dead query) |
| 11 | `osrm` / `navigation engine` / `topic:geojson` | stars | 12 / 15 / 8 (cross-area sweep; surfaced `routingpy`, `maplibre-gl-directions`) |

Plus non-search API reads: `repos/{o}/{r}`, `/releases`, `/contents/*`, `/commits?since=`,
`/actions/runs`, `/license`, `search/code`, npm `registry.npmjs.org`, `api.npmjs.org/downloads`,
OSV `api.osv.dev/v1/query`.

## 1. Candidate pool — 38 candidates, full evidence card each

### C1 — maplibre/maplibre-react-native  ⭐ shortlist
`github.com/maplibre/maplibre-react-native` · **669 ★** /128 f · created **2022-11-03** · last release **v11.5.0, 2026-10-04** (170 releases) · cadence **≈ weekly** (11.3.7 08-22, 11.3.8 09-01, 11.3.9 09-05, 11.3.10 09-07, 11.4.0 09-19, 11.4.1 10-01, 11.5.0 10-04) · issues **364 open / 330 closed** · maintainers 90 d **4 humans** (Kilian Finger, Markus Wendorf, Kacper Golinski, crockalet) + 60 bot commits · **MIT** code / n-a data · **New Arch YES** (`codegenConfig.type="all"` + iOS `componentProvider` per component → Fabric) · **Expo SDK 58 YES** (`peerDependencies: expo >= 54, react-native >= 0.80, react >= 19.1`; we run RN 0.88) · **Android `minSdk 24 / targetSdk 34 / compileSdk 35`** (from `package/android/gradle.properties`) → **API 34 exactly as V4 requires** · ships `org.maplibre.gl:android-sdk-opengl:13.6.1` (iOS MapLibre Native 6.31.0) · on-device · OSV **0** · **877,231 npm downloads/month** · docs: Docusaurus site + `docs/` workspace · CI: Release green 2026-10-15; `Review`/`autofix.ci` = action_required · **better than our choice**: it *is* our choice, but 11.4.x/11.5.0 add the **feature-state API** + an iOS SPM fix; 11.3.8 fixed **two Android ANR deadlocks** + a camera NPE; 11.3.9 fixed a **CUICatalog heap corruption** · risks: 4 maintainers is thin; 364 open issues · **KEEP → upgrade 11.3.7 → 11.5.0** (only RN binding with New-Arch codegen, Expo 58 peers and targetSdk 34; ships `pmtiles://` sources).
### C2 — maplibre/maplibre-native  ⭐ shortlist
**2,275 ★** /653 f · created 2020-11-20 · last release **android-v13.7.1, 2026-10-15** (252; also `ios-v7.0.0-pre2` 10-14, `*-globe` 10-19) · cadence **weekly** · 1,536 open / 1,014 closed · maintainers 90 d: large (Google/Mapbox alumni + Stadia + community) · **BSD-2-Clause** · **native PMTiles since Android 11.7.0**: `pmtiles://https://`, `pmtiles://file://`, `pmtiles://asset://` (asset byte-range reads added in 13.7.1) — `src/mln/storage/pmtiles_file_source.hpp`, `platform/android/docs/data/PMTiles.md` · on-device · OSV n/a · production users: MapLibre RN/Compose/Flutter, Organic Maps · docs: `MapLibre.docc` + platform docs · CI: linux/osx/windows + codecov · **better**: it is what makes an **offline, file-backed PMTiles** possible at all — GL JS cannot open a local archive without a custom protocol handler · risks: 1,536 open issues; "**PMTiles sources do not support offline pack downloads or caching**" (we own the pack lifecycle) · **KEEP (transitive, via C1)**.
### C3 — protomaps/PMTiles  ⭐ shortlist
**3,090 ★** /200 f · created 2021-02-16 · last push **2026-09-16** · **0 GitHub releases** (they live in `go-pmtiles` + npm/PyPI) · 245 open / 237 closed · maintainers 90 d: Protomaps core (small) · licence **BSD-3-Clause** for the reference implementations, **the spec itself is public domain / CC0** · data n/a (container format) · npm **`pmtiles` 4.5.0 (2026-08-10), BSD-3-Clause, 4,324,961 downloads/month**; PyPI `pmtiles` present · on-device + server · OSV **0** · docs: spec v3 (`spec/v3/spec.md`) + CLI docs · CI: GitHub Actions · **better**: **one single-file archive** → one download, one `pmtiles://file://` URL, weekly **diff** updates (v3 supports incremental updates) · risks: the repo has had **no commit since 2026-09-16** and no tagged releases (the CLI moved to `go-pmtiles`); pin the CLI exactly · **ADOPT (container format + JS reader)**.
### C4 — protomaps/go-pmtiles  ⭐ shortlist
**615 ★** /83 f · created 2021-04-22 · last release **v1.31.2, 2026-07-22** (72) · cadence: last release ~3 months, pushed 2026-07-22 · 109 open / 96 closed · maintainers: Protomaps core · **BSD-3-Clause** · CLI `pmtiles convert|extract|show|merge|diff` · **the tool that produces our Canterbury pack and the weekly diff** · server-side build tool (CI, not the app) · OSV n/a · docs: docs.protomaps.com/pmtiles/cli · CI: releases publish binaries for every OS/arch · **better**: `pmtiles extract` gives a **z17-limited, bbox-clipped, Canterbury-only** pack — the only way to hit the 80 MB APK ceiling · risks: Go binaries must be checksum-pinned (V4 §7) · **ADOPT (build tool)**.
### C5 — protomaps/basemaps  ⭐ shortlist
**759 ★** /106 f · created 2020-04-24 · last push **2026-09-11** · **0 GitHub releases** · 169 open / 140 closed · maintainers: Protomaps (Kelso Cartography) · licence **code BSD-3-Clause / visual design CC0 / tilesets ODbL (attribute OSM)** · npm `@protomaps/basemaps` (styles package) · server-side build (Planetiler profile) + on-device style JSON · docs: README + `styles/` TS package · CI: Java/Maven + node · **better**: **day and night for free** from one themeable style source (`styles/` is a TS generator with multiple colour themes) and a **z17-ready schema** already carrying house numbers, entrances and access tags for a courier style · risks: attribution request ("attribute the Protomaps project if you use the basemap styles unmodified or with additions") and "name your fork … something different" — we ship a modified style so the ask is satisfied, but still credit · **ADOPT as the style base, forked as `courier-copilot-style`**.
### C6 — hyperknot/openfreemap
**6,237 ★** /201 f · created 2023-12-13 · last push 2026-10-14 · **0 releases** · 110 open / 99 closed · maintainers 90 d: 1–2 core · **MIT** code / **OSM ODbL** data · server-side tile hosting (Planetiler + OpenMapTiles + Martin) · **explicitly does NOT provide** routing, navigation, geocoding or search (README) · production users: MapHub since June 2024 · docs: self-hosting guide · CI: Actions · **better**: a **free, key-less, unlimited** online fallback outside the downloaded region · risks: single-maintainer, donation-funded, no SLA · **WATCH (online fallback; self-host before relying)**.
### C7 — hyperknot/openfreemap-styles
**261 ★** /26 f · created 2023-12-28 · pushed 2026-10-12 · 22 open / 12 closed · **MIT** / ODbL data · style JSON generator on the OpenMapTiles schema · **WATCH** (alternative style base; Protomaps has the courier-relevant z17 layers).
### C8 — stadiamaps/pmtiles-rs
**112 ★** /25 f · created 2022-10-21 · last release **v0.25.0, 2026-10-15** (20) · 15 open / 8 closed · **Apache-2.0** · Rust PMTiles reader/writer with **HTTP range requests** → fetch only the byte ranges needed → the only path to a *partial*/remote offline pack · risks: 5 watchers · **WATCH**.
### C9 — onthegomap/planetiler
**2,221 ★** /196 f · created 2021-10-20 · last release **v0.10.2, 2026-03-29** (24) · 264 open / 165 closed · maintainers 90 d: Michael Barry + community · **Apache-2.0** · Java, "a map of the world in a few hours on a single machine without external tools or database" · server-side tile generation (MBTiles + PMTiles) · docs: extensive (docs site) · CI: Java/Gradle · **better**: the **engine under Protomaps basemaps**, so adopting basemaps already depends on it; a **YAML profile** lets us add courier layers without forking Java · risks: last release ~7 months ago though pushed daily · **KEEP (transitive dependency of C5)**.
### C10 — felt/tippecanoe
**1,623 ★** /140 f · created 2022-08-15 · pushed 2026-09-26 · last release **2.79.0, 2025-07-24** (187) · 169 open / 51 closed · **BSD-2-Clause** · C++ vector-tile encoder · **better**: encodes straight to `.pmtiles` with per-layer feature control (house numbers, entrances, access restrictions) · risks: tagged-release cadence has slowed (15 months) · **WATCH**.
### C11 — maplibre/maputnik
**2,659 ★** /477 f · created 2016-09-08 · last release **v3.1.0, 2026-07-06** (17) · 509 open / 423 closed · **MIT** · visual style editor (web) · **better**: this is how we *design* the courier style (house numbers from z17, entrances, access restrictions) and export style JSON; `versatiles-org/maputnik` is a maintained fork · risks: browser-only, no RN value · **KEEP (design-time tool, not shipped)**.
### C12 — maplibre/maplibre-gl-js
**11,899 ★** /1,289 f · created 2020-12-08 · last release **v6.15.0, 2026-10-18** · 1,730 open / 1,470 closed · **BSD-3-Clause** (`LICENSE.txt`; GitHub reports NOASSERTION) · npm `maplibre-gl` 6.15.0 · **server/web only** — GL JS cannot read a local archive without a custom `pmtiles://` handler and cannot run on a phone · **REJECT for the app (KEEP for the web dashboard)**.
### C13 — maplibre/maplibre-rs
**1,584 ★** /97 f · created 2021-11-28 · pushed 2026-10-16 · **0 GitHub releases** · 110 open / 53 closed · **Apache-2.0** · Rust WebGPU renderer for web/mobile/desktop · risk: pre-1.0, no releases · **WATCH** (2026 novelty; would be the fastest renderer if it lands).
### C14 — maplibre/maplibre-style-spec
**262 ★** · **BSD-3-Clause** (`LICENSE.txt`) · last release **v26.4.4, 2026-09-15** · the schema every style must satisfy · **KEEP (transitive via C1)**.
### C15 — maplibre/maplibre-tile-spec
**561 ★** · **Apache-2.0** · pushed 2026-10-20 · 306 tag-driven releases · MVT/MLT spec + wasm tooling · **WATCH** (MLT would shrink packs; not ready).
### C16 — maplibre/martin
**4,012 ★** /407 f · created 2017-09-30 · last release **martin-v1.16.1, 2026-09-09** · 582 open / 552 closed · **Apache-2.0** · Rust tile server (PostGIS/MBTiles/PMTiles) · **better**: if we ever need an *online* tile API with our own styles, Martin is the self-hosted choice · **WATCH** (server-side; not needed while offline-first).
### C17 — maplibre/maplibre-compose (590 ★, BSD-3-Clause, v0.20.0 2026-10-10) and C18 — maplibre/flutter-maplibre-gl (375 ★, BSD, v0.27.1 2026-09-10)
both are **not React Native** · C17 is the reference for how a MapLibre binding is structured when we review C1's patches · **REJECT (wrong toolchain)**.
### C19 — rnmapbox/maps
**2,921 ★** /955 f · created 2019-04-07 · last release **v10.3.10, 2026-10-19** · 1,917 open / 1,860 closed · repo licence **MIT** but the wrapped **Mapbox Maps SDK is proprietary** (token + per-MAU billing) · **REJECT** (vendor lock-in; contradicts our "no Google/Mapbox keys" stance).
### C20 — react-native-maps/react-native-maps
**16,010 ★** /4,965 f · last release **v1.29.11, 2026-09-27** · 4,147 open / 4,093 closed · **MIT** · **4,865,540 npm downloads/month** · wraps Google Maps + Apple Maps → **proprietary data, no offline vector tiles, no style we control** · **REJECT**.
### C21 — mapbox/mapbox-gl-native
**4,458 ★** · **ARCHIVED** (last push 2023-07-27) · proprietary SDK terms · **REJECT (archived)**.
### C22 — mapbox/tilebelt
288 ★ · MIT · last release v2.0.3 2025-12-05 · JS tile-shuffling for **raster** tiles · **REJECT** (we are vector/PMTiles).
### C23 — tilezen/joerd
425 ★ · MIT · **last push 2021-03-22, last release 2017-11-21** · **DEAD** · **REJECT**.
### C24 — openmaptiles/openmaptiles (the Tilezen-derived schema)
**3,197 ★** · created 2016-10-04 · last release **v3.16, 2025-12-18** · pushed 2026-07-29 · schema **CC-BY** (attribution required), toolchain Apache-2.0 · **better**: more POI layers than Protomaps · risks: extra attribution burden, heavier packs · **WATCH**.
### C25 — versatiles-org/versatiles-rs
**328 ★** · **MIT** · last release **v5.4.0, 2026-10-17** (144) · 188 open / 181 closed · the Rust VersaTiles stack (spec Unlicense, style MIT) · **better**: a **single-file archive with a self-describing layout** any client can read without a native library — a plausible alternative to PMTiles · risks: 4 watchers, niche · **WATCH**.
### C26 — versatiles-org/versatiles-style
114 ★ · MIT · v7.0.1 2026-10-15 · **WATCH** (style alternative).
### C27 — opengeos/GeoLibre
**8,050 ★** · **MIT** · **created 2026-05-27** · last release **v3.4.0, 2026-10-11** · "lightweight, cloud-native GIS platform" · **a brand-new 2026 repo with 8 k stars in 5 months** — the anti-bias requirement (≥3 newer/smaller challengers) is met by this one · **WATCH** (web/analytics, not the driver app).
### C28 — maplibre/awesome-maplibre
1,094 ★ · BSD-3-Clause · the discovery index used for strategy 3 · **KEEP (research tool)**.
### C29 — maplibre/font-maker
265 ★ · BSD-3-Clause · **last release v0.0.1 (2023-08-22)**, pushed 2026-07-27 · converts fonts to MapLibre fontstacks · **WATCH** (we need a courier glyph stack; `versatiles-org/versatiles-fonts` and `protomaps/basemaps-assets` are alternatives).
### C30 — mbloch/mapshaper
**4,192 ★** · created 2013-02-19 · last release **v0.7.91, 2026-10-20** · 659 open / 542 closed · NOASSERTION (repo) · shapefile/GeoJSON ⇄ vector tiles · **better**: fastest way to cut a bbox out of an OSM extract and re-encode as MVT without Java · **WATCH** (build-time helper).
### C31 — OvertureMaps/overture-tiles
175 ★ · MIT · v1.1.4 2026-07-24 · builds PMTiles from Overture (places, **structured addresses**) · **better**: better address data than OSM for the Address squad · **WATCH (cross-squad)**.
### C32 — developmentseed/async-pmtiles (59 ★, MIT, pushed 2026-10-13) and C33 — developmentseed/tipmtiles (30 ★, MIT, pushed 2026-04-02)
async PMTiles client for Python · **WATCH** (server-side Python client for the API).
### C34 — Cyclenerd/offline-map-tile-downloader
43 ★ · MIT · created 2025-08-27 · v1.1.1 2026-06-08 · Go CLI downloading **raster** tiles for a bbox · **REJECT** (raster, not vector).
### C35 — walkerke/freestiler
**153 ★** · **created 2026-03-05** · pushed 2026-10-04 · NOASSERTION (`LICENSE` = MIT-shaped "YEAR: 2026 COPYRIGHT HOLDER: Kyle Walker") · Rust vector-tile generator for R/Python/DuckDB · **better**: DuckDB-driven tiles from a CSV of stops — interesting for a *stop-density* overlay · **WATCH**.
### C36 — PimpinPumpkin/Vela
**2,072 ★** · **created 2026-06-15** · last release **v0.5.2621, 2026-10-19** (505) · **GPL-3.0** · "Maps and turn-by-turn navigation for Android without Google Play Services" · **the single most important 2026 newcomer** — proof that a full OSM nav stack is buildable now · **CLEAN-ROOM STUDY ONLY (V4 §11.2) — never quote code**.
### C37 — organicmaps/organicmaps
**15,714 ★** · created 2020-12-27 · last release **2026.09.29-32-android, 2026-09-29** · 6,422 open / 3,215 closed · root `LICENSE` is **Apache-2.0** (GitHub: NOASSERTION) but the project ships GPL-family components and **ODbL data** — treat the tree as copyleft until per-directory headers are audited · offline maps + routing + search, 6 M+ users · **CLEAN-ROOM STUDY ONLY** (UX + offline-pack lifecycle reference).
### C38 — Framstag/libosmscout (305 ★, LGPL-3, last release v2024.06.02.1 2024-06-02) and mapsforge/mapsforge (1,416 ★, LGPL-3, v0.30.0 2026-08-20) and Akylas/alpimaps (194 ★, MIT)
native/Java offline-map stacks with their own tile formats · **REJECT** (wrong licence family for the bundle; superseded by PMTiles + MapLibre).
## 2. Shortlist (14) with decisions

| # | Project | Decision | One-line reason |
|---|---|---|---|
| C1 | maplibre/maplibre-react-native | **KEEP → upgrade 11.3.7 → 11.5.0** | Only RN binding with New-Arch codegen, Expo 58 peer range and targetSdk 34. |
| C3 | protomaps/PMTiles | **ADOPT** | Single-file archive; BSD-3 code + CC0 spec; on-device `pmtiles://file://`. |
| C4 | protomaps/go-pmtiles | **ADOPT** | `pmtiles extract` is the only way to cut a bbox-limited Canterbury pack. |
| C5 | protomaps/basemaps | **ADOPT (fork as `courier-copilot-style`)** | BSD-3 code + **CC0 design** + ODbL data; day/night themes and z17 courier layers. |
| C2 | maplibre/maplibre-native | **KEEP (transitive)** | Provides the native `pmtiles://file://` / `asset://` reader that makes offline possible. |
| C11 | maplibre/maputnik | **KEEP (design tool)** | Where the courier style is authored; MIT. |
| C9 | onthegomap/planetiler | **KEEP (transitive)** | Generates the pack from OSM; YAML profiles add courier layers without forking Java. |
| C6 | hyperknot/openfreemap | **WATCH** | Free key-less online fallback; single-maintainer risk. |
| C8 | stadiamaps/pmtiles-rs | **WATCH** | HTTP range reader → partial/remote offline packs. |
| C25/26 | versatiles-org/versatiles-rs + style | **WATCH** | Client-library-free single-file alternative. |
| C27 | opengeos/GeoLibre | **WATCH** | New 2026 GIS platform, 8 k stars; analytics value, not driver-app value. |
| C31 | OvertureMaps/overture-tiles | **WATCH (cross-squad)** | Structured addresses for the Address squad. |
| C36 | PimpinPumpkin/Vela | **CLEAN-ROOM ONLY** | GPL-3; the 2026 proof that a full OSM nav stack is feasible. |
| C37 | organicmaps/organicmaps | **CLEAN-ROOM ONLY** | Reference for offline-pack download/resume UX. |

## 3. Deep review — top 5

**3.1 maplibre/maplibre-react-native** — Yarn-4 monorepo (`package/`, `docs/`, `examples/`, `scripts/`),
`react-native-builder-bob` 0.41 building CJS+ESM+TS, npm `publishConfig.provenance: true`.
`codegenConfig { name: "MapLibreReactNativeSpec", type: "all" }` + an iOS `componentProvider` per
component → **Fabric-ready**, with the old architecture still supported. Ships `app.plugin.js` and a
`./plugin` export → `expo prebuild` works; `peerDependencies` cover SDK 58. Android
`minSdk 24 / target 34 / compile 35`; MapLibre Native `android-sdk-opengl:13.6.1`. `VectorSource`
accepts a `pmtiles://` URL (example `examples/shared/src/examples/protocols/PMTilesVectorSource.tsx`),
so `pmtiles://file:///…` works through the RN binding with MapLibre Native ≥ 11.7 on the device.
Quality: ESLint `--max-warnings 0`, `tsc` over src *and* tests, Prettier + clang-format + ktlint,
Jest + `@testing-library/react-native` + snapshot-diff; the CHANGELOG shows real bug-fix cadence
(two ANR deadlocks in 11.3.8). Risk: ~4 human maintainers, 364 open issues.

**3.2 protomaps/PMTiles** — v3 spec (`spec/v3/spec.md`); reference JS/Python/Go implementations
**BSD-3**, **the spec public domain/CC0** (that is why the format can be re-implemented freely).
`go-pmtiles` is the maintained CLI; npm `pmtiles` 4.5.0 the JS reader; `stadiamaps/pmtiles-rs` the
Rust reader. It fits us because the archive is a *file*: MapLibre Native reads it with byte-range
requests (`pmtiles://file://`), so **no tile server, no CORS, no API key** for the offline pack.
Weakness: the repo has **no tagged releases and no commit since 2026-09-16** — the format is stable
but the reference repo is quiet; pin `go-pmtiles` exactly and checksum it.

**3.3 protomaps/basemaps** — `tiles/` (Planetiler/Maven profile), `styles/` (TypeScript style
generator with multiple colour themes), `app/` (Vite viewer + build browser). `LICENSE.md` verbatim:
code BSD-3-Clause, **visual design CC0**, tilesets ODbL with OSM attribution, tile schema adapted
from Tilezen, request to attribute and to name the fork differently. The style is generated from a
TS package, so a day/night pair is a theme swap rather than two hand-written styles;
`basemaps-assets` hosts fonts + sprites (we must mirror those into the APK — measure the size!).
Risk: the Maven/Planetiler build is heavy for CI — for Canterbury we use `--area=christchurch`, not
the planet.

**3.4 maplibre/maplibre-native** — PMTiles file source + Android/iOS docs support `https://`,
`file://` and (13.7.1) `asset://` with **byte-range reads of APK assets** → we can ship a *small*
city pack inside the APK and a *large* region pack as a downloadable file. Weekly releases
(android-v13.7.1 10-15, android-v13.5.3 10-08, android-v2026.10.19-globe 10-19, ios-v7.0.0-pre2
10-14). 2026 features worth knowing: globe projection, the experimental **C plugin API** for custom
style layer types (n-gon example), `globalState` expressions, `interpolate-lab`/`hcl` colour ramps,
`semiliteral` expressions, SDF images in `fill-pattern`, and **rendered-feature introspection**
(`RenderingStats.getRenderedFeatures()`) — the last one is exactly what we need to prove "the
courier style only draws house numbers at z17". Risks: 1,536 open issues; breaking iOS changes in
the 7.0.0 pre-releases.

**3.5 hyperknot/openfreemap** — a *complete, open* production tile-hosting stack (Planetiler profile
+ OpenMapTiles schema + Martin + MapLibre styles) with weekly planet builds in Btrfs and MBTiles.
Honest limits from the README: **no search/geocoding, no route calculation, navigation or
directions**, no raster/satellite/elevation. Fit for us: an online fallback outside the downloaded
region, removing Google/Mapbox entirely. Risks: one primary maintainer, donation-funded, "best
effort" SLA — if we depend on it we must self-host (the repo ships the whole production setup).

## 4. Benchmarks — top 3

**No published benchmark exists for our scenario, so I did NOT run one; UNVERIFIED, and the set that
must be built is named below** (V4 §12.5).

| Metric | Target | Status |
|---|---|---|
| Pan/zoom frame time, 60 fps | `docs/squads/maps/eval/` frame-time traces per screen size | **UNVERIFIED — set does not exist** |
| Full Canterbury offline pack size | ≤ 50 MB (V4 §11.1) / ≤ 80 MB APK excl. packs (CONSTRAINTS.md) | **UNVERIFIED** |
| Day/night style parity | Maestro screenshots vs mockups | **UNVERIFIED** |

**The set that must be built (per the squad working agreement "the benchmark exists before the
library is chosen"):**
1. `docs/squads/maps/eval/canterbury.mbtiles` — an OSM extract for the Christchurch City Council
   boundary (LINZ/Geofabrik) + Natural Earth, built with the same Planetiler profile the app uses.
2. `docs/squads/maps/eval/pack-matrix.md` — pack sizes for `{z14..z17}` × `{basemap,
   basemap+courier-entrances}` × `{MBTiles, PMTiles}`; the decision rule is "pick the highest zoom
   that keeps the pack under the agreed ceiling".
3. `docs/squads/maps/eval/frame-traces/` — perfetto traces of a scripted pan+zoom over the stop list
   at z17, on the CI emulator profile **and** one mid-range Android profile.
4. `docs/squads/maps/eval/style-diff/` — day/night screenshots of the same bbox from the mockups.

**Control set that already exists elsewhere:** the Protomaps `basemaps --area=` builds and MapLibre
Native's own PMTiles sample apps.

## 5. Decision

1. **Renderer: keep `@maplibre/maplibre-react-native`, upgrade 11.3.7 → 11.5.0** (the two missed
   releases contain an ANR fix and the feature-state API).
2. **Tile container: ADOPT PMTiles v3** (spec = public domain → we may write our own reader) with
   `go-pmtiles` pinned by SHA-256 as the build tool.
3. **Style base: ADOPT Protomaps basemaps `styles/`** forked as `courier-copilot-style` (BSD-3 code,
   **CC0 design**, so we may publish a modified courier style), with a day and a night theme
   generated from the same theme source.
4. **Packs: server-side Planetiler profile** (`--area=christchurch`) → `pmtiles extract` to the
   agreed bbox/zoom → a file the app reads via `pmtiles://file://`.
5. **Fallback: self-hosted `hyperknot/openfreemap`**, not their public instance, for out-of-region.

## 6. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| "Canterbury ≤ 50 MB" is unproven | **High** | Build the pack first (§4); the plan changes if a z17 courier pack exceeds the ceiling. |
| ODbL share-alike on derived tilesets | **High** | We ship a renderer + style + our own POI overlay and consume OSM-derived tiles on-device. Get legal sign-off on whether an on-device cached OSM tile set is a "produced work" that must be ODbL-licensed. **UNVERIFIED — legal opinion required.** |
| OSM trademark | Medium | Never say "OpenStreetMap" in the UI; only "© OpenStreetMap contributors" in the attribution; no OSM logo. |
| Attribution plumbing | Medium | Attribution must be visible **offline** (a downloaded region may be the only map on screen). Put "© OpenStreetMap contributors · ODbL" in the map footer and in About. |
| Font/sprite asset size | Medium | Mirror `protomaps/basemaps-assets` fonts + sprites into the APK; measure against the 80 MB budget. |
| Single-maintainer upstream | Medium | Pin exact versions; vendor the style generator if Protomaps goes quiet. |
| PMTiles native reader maturity | Medium | MapLibre Native's PMTiles file source is new (11.7.0, 2025) — test large-archive random access on a mid-range device. |

## 7. What I could not verify

* **6-month star trend** — blocked: the repo token lacks `read:user`, so no stargazer timestamps.
  Proxies used: commits/90 d + release cadence + npm downloads/month.
* **Canterbury PMTiles size** — no published figure; the Protomaps area-build URL pattern is not
  documented and every candidate URL 404s. Build it.
* **Median issue-response time** — not computed (needs per-issue timeline sampling across ~40 repos);
  exact open/closed ratios are given instead.
* **`protomaps/basemaps` npm package** — the styles package name/version was not confirmed from the
  registry in this pass.
* **Whether MapLibre Native's RN wrapper needs a patch for `pmtiles://file://`** — the RN example
  only demonstrates `pmtiles://https://`; the file/asset variants are documented at the native layer
  but I could not confirm an end-to-end RN test exists. **Prove it in the eval harness.**
* **organicmaps per-directory licence split** — root LICENSE says Apache-2.0, but the project also
  ships GPL/ODbL components; treat as copyleft until audited.

## 8. Corrections to the V4 §11.1 adopt list (maps-related)

| V4 §11.1 item | Verified reality on 2026-10-20 | Correction |
|---|---|---|
| 2. `protomaps/basemaps` | 759 ★, BSD-3 code, **CC0 visual design**, ODbL tilesets, last push 2026-09-11, **no GitHub releases** | ✅ keep, but add the **CC0 design** clause and the "name your fork differently" request. |
| 3. `protomaps/PMTiles` | 3,090 ★, **BSD-3 implementations + CC0/public-domain spec**, npm `pmtiles` 4.5.0 (2026-08-10) | ✅ keep — but the **CLI lives in `protomaps/go-pmtiles`** (BSD-3, v1.31.2, 2026-07-22), not in `protomaps/PMTiles`; name both. |
| 10. `maplibre/maputnik` | 2,659 ★, MIT, **v3.1.0 2026-07-06**, pushed 2026-10-19 | ✅ keep. Note the maintained fork `versatiles-org/maputnik`. |
| — (not in the list) | `PimpinPumpkin/Vela` — **2,072 ★, created 2026-06-15, 505 releases, GPL-3.0** | **New 2026 entry → clean-room study list (§11.2).** |
| — (not in the list) | `opengeos/GeoLibre` — **8,050 ★, created 2026-05-27, MIT** | **New 2026 entry → WATCH** (analytics/web). |
| — (not in the list) | `versatiles-org/versatiles-rs` — 328 ★, MIT, v5.4.0 2026-10-17 | **Add as the alternative tile container.** |
| "Also evaluate: versatiles" | the project is `versatiles-org/versatiles-rs` + `-style` + `-spec` (Unlicense) | Correct the name. |
