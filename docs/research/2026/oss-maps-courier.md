# OSS maps & navigation for a courier app — the 2026 stack (V4 §13.1, redone from scratch)

**Research date: 2026-10-21.** This file **replaces** the 2026-10-20 stub (`OSS shortlist — maps/navigation`,
25 lines, marked *"Status: UNVERIFIED (compiled without live repo access)"*). Method: V4 §12 — ≥30
candidates with a full evidence card, a 13-item shortlist, the top 5 deep-reviewed against the actual
code, and benchmarks only where an eval set exists. Every number was read live from the GitHub REST API,
the npm registry, the OSMF/LINZ/provider licence pages or the project's own licence file on **2026-10-21**
unless the card says **UNVERIFIED**. Nothing is estimated.

**Card fields:** repo URL · stars + momentum proxy · created · last release + date · commits/90 d +
distinct human authors/90 d · open issues · **licence (code)** · **tile/data licence terms** ·
**offline: yes / no / self-host** · Expo SDK 58 / RN 0.88 New-Arch fit · npm downloads/30 d · better than
our current choice · risks · **DECISION**.

### 6-month star trend — method note (binding for every card)

The star *timeline* is not readable with the token in `.env.local` (`GET /repos/{o}/{r}/stargazers` →
**HTTP 403**; GraphQL `stargazers` → **FORBIDDEN**). **Every "stars gained in 6 months" figure here is
UNVERIFIED.** The proxy V4 §12.3 prescribes is used: **releases/6 m · commits/90 d · distinct human
maintainers/90 d · npm downloads/month**.

---

## 0. Scope, our current choice, the bar

### 0.1 Our locked position (read out of the repo and `docs/DECISIONS.md`, 2026-10-21)

| Item | Verified state |
|---|---|
| Renderer binding | **`@maplibre/maplibre-react-native` 11.3.7** pinned in `apps/mobile/package.json`; npm latest **11.5.0** (published 2026-10-04) → **6 releases behind** |
| App stack | **Expo ~58.0.14, RN 0.88.0, React 19.3.0**, New Architecture on; `expo-location ~58.0.17` |
| Offline map | **none in the repo** — no PMTiles, no MBTiles, no pack-download code, no `packages/map-style` |
| Routing | **none in the repo** — `services/routing` does not exist |
| Locked decisions | **D15**: the Canterbury basemap + address file are **bundled in the app** and must work **from the first launch with no internet**, refreshed **every 7 days on Wi-Fi**; aerial imagery is an optional download. **D16**: our **own professional map style** (day, night, high-contrast for sun), inspired by Petal Maps and Apple Maps. **D19**: LINZ data lives on the founder's machine in `data/linz/` (not in git). |
| Squad gate | 60 fps pan/zoom; the whole of Canterbury offline; day + night styles; **APK ≤ 80 MB** excluding the map/voice packs; **pack ≤ 50 MB** |
| Our users | an independent courier in Christchurch, **mounted phone**, driving; the map must work in a **dead spot** |

### 0.2 The four facts that decide the map for us

These were read on 2026-10-21 and they change what is buildable:

1. **OSM data is ODbL and the attribution is not optional.** https://www.openstreetmap.org/copyright :
   *"OpenStreetMap is open data, licensed under the Open Data Commons Open Database License (ODbL) by the
   OpenStreetMap Foundation… If you alter or build upon our data, you may distribute the result only under
   the same license."* Two duties: credit OpenStreetMap **and** make clear the data is under the ODbL.
2. **We may not use OSMF's tile servers for offline.** https://operations.osmfoundation.org/policies/tiles/
   : *"**Offline use is not permitted on `tile.openstreetmap.org`.** Features such as 'Download
   city/country for offline use' or 'Save area for later' rely on prefetch/bulk downloading and are
   therefore prohibited."* It also forbids bulk downloading, requires a **stable, identifying
   `User-Agent`**, and says *"If you require offline maps, use **self-hosted** tiles or a **provider that
   explicitly allows offline/prefetching**."* **Our D15 requirement is therefore only satisfiable by
   building our own tiles** — the OSMF tile server is out, permanently.
3. **NZ data in OSM is LINZ data, and LINZ is CC BY 4.0.** The same OSM copyright page: *"**New Zealand**:
   Contains data sourced from the **LINZ Data Service** and licensed for reuse under **CC BY 4.0**."* LINZ's
   own attribution page (https://www.linz.govt.nz/products-services/data/licensing-and-using-data/attributing-linz-data)
   requires *"Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence"*, and
   for adapted collections *"Contains data sourced from the LINZ Data Service licensed for reuse under CC
   BY 4.0"*. **Aerial imagery and elevation need a different attribution** because LINZ does not own that
   copyright — including the **Canterbury – Mackenzie LiDAR 1m DEM (2015)** and **(2026)** layers, which
   are exactly our region.
4. **The free hosted tile providers cap or price offline use.** OpenFreeMap's Terms
   (https://openfreemap.org/tos/, *"Last Updated: October 14, 2026"*) allow offline downloads only if each
   is *"at most **3,000 tiles or 50 MB**"*, with *"at most 4 parallel requests"* and *"a unique User-Agent
   identifying your app"*; *"For anything larger, please contact us."* Protomaps' hosted API
   (https://protomaps.com/api) is *"free for non-commercial use. For commercial use, become a GitHub
   Sponsor."* Stadia Maps (https://stadiamaps.com/terms-of-service, effective 2026-03-18) requires an
   **active paid subscription** for any commercial use, and MapTiler
   (https://www.maptiler.com/copyright/) is commercial throughout. **The only free, self-hosted, offline-
   capable route is: OSM/Geofabrik extract → our own tile build → our own pack.**

### 0.3 The bar

60 fps on a mounted phone in daylight and at night; the whole of Canterbury offline in ≤ 50 MB; our own
day/night style; **attribution visible even when the only map on screen is the downloaded pack**; zero
copyleft in the APK (`CONSTRAINTS.md`); routing accurate enough for a courier in NZ urban **and** rural
roads; and no API key required to start (D17).

---

## Queries run

`scripts\gh.ps1` → `gh api`, 2026-10-21 (search API 30 req/min; the searches were run serially with a 4 s
gap after two parallel calls returned HTTP 403).

| #   | Query (filters) | Sort / limit | Results | What it produced |
| --- | ---------------- | ------------ | ------- | ---------------- |
| 1   | `topic:offline-maps` | stars / 25 | 25 | organicmaps 15 716, X-TRACK 6 310, IceNav-v3 473, libosmscout 305, osmscout-server 189, osmin 164, MapCache 139 |
| 2   | `topic:maplibre` | stars / 25 | 25 | maplibre-gl-js 11 902, GeoLibre 8 060, openfreemap 6 239, martin 4 012, maputnik 2 659, maplibre-native 2 276, **Vela 2 079**, basemaps 760, maplibre-react-native 670, maplibre-compose 590, flutter-maplibre-gl 375, traccar-web 1 198 |
| 3   | `openstreetmap navigation` | stars / 25 | 25 | **headway 3 007** (2020-born, Apache-2.0), **Vela 2 079**, navit 668, osmscout-server 189, graphhopper-navigation-example 42 |
| 4   | `topic:openstreetmap stars:>400` | stars / 25 | 25 | OSRM 8 159, GraphHopper 6 737, Valhalla 6 348, openfreemap 6 239, osmnx 5 880, StreetComplete 5 072, Nominatim 4 525, iD 3 906, openmaptiles 3 198, **photon 3 128**, openstreetmap-website 2 856 |
| 5   | `traccar` | stars / 20 | 20 | traccar 7 892, traccar-web 1 198, traccar-client-android 760, traccar-sms-gateway 700 (GPL), traccar-docker 368, traccar-client 194, **traccar-geocoder 255 (created 2026-03-14)** |
| 6   | `maps.me` | stars / 20 | 20 | **mapsme/omim 4 599** — and its own issue **#14206** says *"THIS REPOSITORY IS NOT USED ANYMORE — MAPS.ME IS CLOSED SOURCE NOW"* |
| 7   | `marble kde maps` | stars / 20 | 20 | **no GitHub repo** — KDE Marble lives on `invent.kde.org`; the GitHub mirror is `kde/marble` (170 ★, LGPL-2.1-or-later) |
| 8   | `tile server vector` | stars / 20 | 20 | tileserver-gl 2 911, tegola 1 502, t-rex 577, timvt 197 (archived) |
| 9   | `navitia` | stars / 12 | 12 | **hove-io/navitia 457** (AGPL-3.0) — the AGPL transit engine, cleanly separated from the routing engines |
| 10  | `ferrostar navigation sdk` | stars / 12 | 12 | **stadiamaps/ferrostar 442** — BSD-3-Clause (the API says "Other" because the file is `LICENSE.txt`) |
| 11  | `delivery driver openstreetmap` | stars / 8 | 8 | **all ≤ 1 ★** — the OSS *courier* product layer on top of OSM is **empty**; every serious courier product is closed (see §1.4) |
| 12  | `api repos/{o}/{r}` × 47, `/releases`, `/commits?since=2026-07-22`, `/issues?state=open`, `/pulls?sort=created` | — | — | every number in §1 and §3 |
| 13  | npm `registry.npmjs.org` + `api.npmjs.org/downloads/point/last-month` | 4 packages | — | `@maplibre/maplibre-react-native` **877 231**, `maplibre-gl` **23 780 110**, `pmtiles` **4 324 961** dl/mo (window 2026-09-19 → 2026-10-18) |
| 14  | Licence pages fetched directly | — | — | osm.org/copyright · operations.osmfoundation.org/policies/tiles/ · linz.govt.nz attribution · openfreemap.org/tos/ · protomaps.com/api · stadiamaps.com/terms-of-service · maptiler.com/copyright/ · apps.kde.org/marble · the project `DATA_LICENSE.txt` files |

---
## 1. Candidate pool — 50 evidence cards

### 1.1 Renderers and React Native / mobile bindings (8)

**M1 — `maplibre/maplibre-react-native`** ⭐ **our choice** https://github.com/maplibre/maplibre-react-native —
**670 ★** /129 f · created **2022-11-03** · last release **v11.5.0 (npm, 2026-10-04)**, GitHub tag `v11.5.0`
· 72 commits/90 d, **9 humans** · 53 open (REST 62 incl. PRs) · **MIT** · npm **877 231 dl/mo** ·
**New Arch YES** — `codegenConfig { name: "MapLibreReactNativeSpec", type: "all" }` with an iOS
`componentProvider` per component (MLRNMapView, MLRNVectorSource, MLRNGeoJSONSource, MLRNLayer, MLRNCamera,
…) → **Fabric on both platforms** · **Expo SDK 58 YES** — `peerDependencies: { expo: ">=54.0.0",
react: ">=19.1.0", "react-native": ">=0.80.0" }`, and we run RN 0.88 · npm tarball **2 186 031 bytes
unpacked, 979 files**, `publishConfig.provenance: true` (SLSA) · **tile terms**: none of its own — it
renders whatever style we give it · **offline: yes**, because MapLibre Native underneath reads a local
PMTiles file · better than ours: 11.3.8→11.5.0 add **two Android ANR deadlocks**, a camera NPE, an iOS
CUICatalog heap-corruption fix and the **feature-state API** · risks: 9 humans; 7 open crash/recycle bugs ·
**DECISION: KEEP → upgrade 11.3.7 → 11.5.0 (blocking).**

**M2 — `maplibre/maplibre-native`** https://github.com/maplibre/maplibre-native — **2 276 ★** /655 f · created
**2020-11-20** · releases **android-v13.7.1 (2026-10-15)**, **ios-v2026.10.19-globe (2026-10-19)**,
**ios-v7.0.0-pre2 (2026-10-14)**, **ios-v6.31.0 (2026-09-23)** · ≥100 commits/90 d, **23 humans** · 655 open ·
**BSD-2-Clause** · **tile terms**: none of its own · **offline: yes — this is the component that makes it
possible at all** (`pmtiles://file://`, `pmtiles://asset://<name>.pmtiles`, `pmtiles://https://`, supported
since Android 11.7.0) · Expo SDK 58 fit: it is the native library our binding wraps; `android-v13.7.1`
adds **asset byte-range reads**, so an in-APK city core is possible · risks: 655 open issues; iOS 7.0.0
is still a pre-release · **DECISION: KEEP (transitive) and pin the version used in the eval.**

**M3 — `maplibre/maplibre-gl-js`** https://github.com/maplibre/maplibre-gl-js — **11 902 ★** /1 290 f ·
created **2020-12-08** · **v6.15.0, 2026-10-18** · ≥100 commits/90 d, 23 humans · 297 open · **BSD-3-Clause**
(the `LICENSE.txt`; the API reports NOASSERTION) · npm **23 780 110 dl/mo** · **tile terms**: none of its
own · **offline: NO** — the web renderer cannot read a local archive without a custom `pmtiles://` handler,
so it can never be the offline path · **CVE-2026-85061 / GHSA-jrc7-96c5-q579** (critical, CVSS 10.0) affects
`maplibre-gl <= 6.4.0`, fixed in **6.4.1** · Expo SDK 58 fit: n/a (web) · **DECISION: KEEP for the web
dashboard only, pinned `>= 6.4.1`; REJECT for the app.**

**M4 — `maplibre/maplibre-style-spec`** https://github.com/maplibre/maplibre-style-spec — **262 ★** /127 f ·
created **2023-02-19** · **v26.4.4, 2026-09-15** · ≥100 commits/90 d, 16 humans · 78 open · **BSD-3-Clause**
· **tile terms**: n/a · **offline: n/a** · better than ours: the schema every style must satisfy (our RN
binding pins `26.2.1`) · **DECISION: KEEP (transitive via M1).**

**M5 — `maplibre/maplibre-tile-spec`** https://github.com/maplibre/maplibre-tile-spec — **561 ★** /74 f ·
created **2022-10-01** · last release **rust-mlt-wasm-v0.2.1, 2026-10-18** · ≥100 commits/90 d, 7 humans ·
51 open · **Apache-2.0** · **tile terms**: n/a · **offline: n/a** · better than ours: **MLT** (MapLibre
Tiles) would shrink the pack materially versus MVT · risks: not yet the default tile format ·
**DECISION: WATCH (the pack-size lever, once a renderer reads it).**

**M6 — `maplibre/maplibre-compose`** https://github.com/maplibre/maplibre-compose — **590 ★** /71 f ·
created **2024-10-29** · **v0.20.0, 2026-10-10** · ≥100 commits/90 d, 2 humans · 49 open · **BSD-3-Clause** ·
**offline: yes** (same native engine) · Expo SDK 58 fit: **NO** — Kotlin/Compose, not React Native ·
**DECISION: REJECT (wrong toolchain).**

**M7 — `maplibre/flutter-maplibre-gl`** https://github.com/maplibre/flutter-maplibre-gl — **375 ★** /223 f ·
created **2021-03-06** · **v0.27.1, 2026-09-10** · 11 commits/90 d, 2 humans · 45 open · licence
**NOASSERTION** → **UNVERIFIED** · **offline: yes** (it supports offline regions and PMTiles) · Expo SDK 58
fit: **NO** — Flutter · **DECISION: REJECT (wrong toolchain), but read its offline-region implementation.**

**M8 — `maplibre/maputnik`** https://github.com/maplibre/maplibre-style-spec → https://github.com/maplibre/maputnik
— **2 659 ★** /477 f · created **2016-09-08** · **v3.1.0, 2026-07-06** · ≥100 commits/90 d, 7 humans · 95 open
· **MIT** · **offline: n/a** (a design-time editor) · better than ours: where the courier style is authored
and exported · **DECISION: KEEP (design-time tool); the maintained fork is `versatiles-org/maputnik`.**

### 1.2 Tile servers, vector-tile schemas, styles and offline containers (10)

**M9 — `protomaps/PMTiles`** ⭐ https://github.com/protomaps/PMTiles — **3 091 ★** /200 f · created
**2021-02-16** · last push **2026-09-16** · **no GitHub releases** (the CLI lives in `go-pmtiles`; the JS
reader is npm `pmtiles`) · 8 commits/90 d, 2 humans · 10 open · **licence: BSD-3 for the reference
implementations; the SPECIFICATION is public domain / CC0** (verbatim from the repo `LICENSE`) · npm
`pmtiles` **4 324 961 dl/mo** · **tile terms**: the container is format-neutral — the data inside carries
its own licence · **offline: yes, by design** — one single-file archive, one download, one
`pmtiles://file://` URL, and v3 supports **diffs** for the weekly refresh without re-downloading ·
better than ours: the format is public domain, so we may write our own reader if Protomaps stops shipping
one · risks: **no commit since 2026-09-16 and no tagged release since 2021** — the format is stable, the
reference repo is quiet · **DECISION: ADOPT (container format).**

**M10 — `protomaps/go-pmtiles`** ⭐ https://github.com/protomaps/go-pmtiles — **615 ★** /83 f · created
**2021-04-22** · **v1.31.2, 2026-07-22** · **1 commit/90 d, 1 human** · 19 open · **BSD-3-Clause** ·
**offline: this is the tool that cuts the pack** (`pmtiles extract --bbox --min-zoom --max-zoom`) · better
than ours: it is the **only** way we have to produce a bbox-clipped, zoom-capped Canterbury pack ·
risks: **one maintainer**; open issues [#269](https://github.com/protomaps/go-pmtiles/issues/269) "Timeout
when using `pmtiles extract`" (2026-01-15) and [#276](https://github.com/protomaps/go-pmtiles/issues/276)
"'Resume' for remote pmtiles extract" (2026-04-09); PR
[#289](https://github.com/protomaps/go-pmtiles/pull/289) "Fix large extract pmtiles from large source file"
(2026-10-06, **open**) and
[#288](https://github.com/protomaps/go-pmtiles/pull/288) "Add `--no-tmpfile` flag to convert command for
disk-space-constrained e…" (2026-08-24, **open**) — **the pack build is exactly the case these two open
items describe** · **DECISION: ADOPT (build tool), pinned by SHA-256.**

**M11 — `protomaps/basemaps`** ⭐ https://github.com/protomaps/basemaps — **760 ★** /106 f · created
**2020-04-24** · last push **2026-09-11** · **no GitHub releases** · 5 commits/90 d, **1 human** · 43 open ·
**licence: code BSD-3-Clause; visual design CC0; tilesets ODbL (OSM attribution mandatory); tangram icons
MIT; the Daylight landcover layer = ESA WorldCover CC-BY 4.0 (needs its own credit)** · **offline: yes** —
the style JSON and the tiles are what we pack · better than ours: **day and night from one generated
theme** (the style is *generated*, so night is a theme swap) and a z17-ready schema carrying house
numbers, entrances and access tags — the courier layers · risks: one maintainer; a fork must be
**renamed**; the planet Maven build is a CI killer (use `--area=christchurch`) ·
**DECISION: ADOPT as the style base, forked and renamed.**

**M12 — `hyperknot/openfreemap`** https://github.com/hyperknot/openfreemap — **6 239 ★** /201 f · created
**2023-12-13** · last push **2026-10-20** · **no GitHub releases** · 35 commits/90 d, **1 human** · 12 open ·
**licence: MIT code / OSM ODbL data** · **tile terms: the hosted service's ToS
(https://openfreemap.org/tos/, updated 2026-10-14) caps offline downloads at 3 000 tiles or 50 MB, ≤ 4
parallel requests, unique User-Agent; the *self-hosted* version has no such cap** · **offline: yes via the
self-hosted stack; the hosted service is capped** · better than ours: a **free, key-less** tile source and
weekly full-planet PMTiles builds · honest limits (from the README): no search, no routing, no raster, no
satellite, no elevation, and *"OpenFreeMap is not something you can install locally"* (it is a deploy
script) · risks: one maintainer, donation-funded, no SLA · **DECISION: WATCH → self-host before relying;
never use the hosted service for a pack above 50 MB.**

**M13 — `maplibre/martin`** https://github.com/maplibre/martin — **4 012 ★** /407 f · created **2017-09-30** ·
last release **mbtiles-v0.21.0, 2026-10-09** · ≥100 commits/90 d, 9 humans · 39 open · **Apache-2.0** ·
**tile terms**: none of its own · **offline: serves local MBTiles/PMTiles; it is a server, so "offline"
means "no internet, our own box"** · better than ours: the Rust tile server behind openfreemap ·
risks: 2.0 is a beta · **DECISION: WATCH (server-side; not needed while offline-first).**

**M14 — `maptiler/tileserver-gl`** https://github.com/maptiler/tileserver-gl — **2 911 ★** /713 f · created
**2016-02-29** · last release **v5.7.0-pre.1, 2026-08-31** · 31 commits/90 d, 6 humans · 268 open ·
licence **NOASSERTION** → **UNVERIFIED** · **tile terms**: it serves tiles the operator supplies ·
**offline: no** (a hosted server) · better than ours: server-side rendering by MapLibre GL Native, so one
style renders for every client · risks: the v5 line is a **pre-release**; licence not machine-detectable ·
**DECISION: WATCH.**

**M15 — `go-spatial/tegola`** https://github.com/go-spatial/tegola — **1 502 ★** /224 f · created
**2016-05-20** · last release **v0.21.2, 2025-01-08** · **5 commits/90 d, 3 humans** · 188 open · **MIT** ·
**offline: server-side only** · better than ours: a Go MVT server, small and readable · risks: **21 months
since the last release** · **DECISION: WATCH.**

**M16 — `openmaptiles/openmaptiles`** https://github.com/openmaptiles/openmaptiles — **3 198 ★** /677 f ·
created **2016-10-04** · **v3.16, 2025-12-18** · 4 commits/90 d, 4 humans · 233 open · **schema licence
CC-BY (attribution required)**, toolchain Apache-2.0 · **tile terms: the schema itself requires a visible
"© OpenMapTiles" credit** — and MapTiler holds written permission to substitute its own name
(https://www.maptiler.com/copyright/) · **offline: the schema packs; the tiles are ours to build** ·
better than ours: more POI layers than Protomaps · risks: an extra attribution duty, heavier packs ·
**DECISION: WATCH.**

**M17 — `onthegomap/planetiler`** https://github.com/onthegomap/planetiler — **2 221 ★** /196 f · created
**2021-10-20** · last release `latest-main` **2026-10-17** (CI publishes continuously) · 40 commits/90 d,
5 humans · 115 open · **Apache-2.0** · **tile terms**: produces tiles from OSM data → ODbL applies to the
output · **offline: the pack builder** · better than ours: **the engine under `protomaps/basemaps`**; its
YAML profile adds courier layers without forking Java · **DECISION: KEEP (transitive via M11) — and
build with `--area=christchurch`.**

**M18 — `headwaymaps/headway`** ⭐ https://github.com/headwaymaps/headway — **3 007 ★** /78 f · created
**2020-11-15** · last push **2026-10-19** · **no GitHub releases** · ≥100 commits/90 d, **1 human** ·
27 open · **Apache-2.0** · **tile terms**: OSM data → ODbL; the stack ships its own styles ·
**offline: yes** — it is a self-hosted maps stack (frontend + basemap + **geocoder + routing engine**) from
one OSM extract, with 200+ predefined cities · better than ours: **one command brings up a working map,
search, POI and directions** — i.e. it is the reference implementation of what our self-hosted fallback
would be · risks: **one maintainer** (michaelkirk), no releases, and the README is explicit about the
cost: *"at least 8 GB of memory"* and *"50 GB–100 GB of disk space during the build"* ·
**DECISION: WATCH → evaluate as our self-hosted fallback, not as the app's map.**

### 1.3 Routing, navigation and geocoding engines (9)

**M19 — `Project-OSRM/osrm-backend`** https://github.com/Project-OSRM/osrm-backend — **8 159 ★** /3 980 f ·
created **2011-09-22** · **v26.10.0, 2026-10-01** (14 releases in 6 m) · 63 commits/90 d, 9 humans ·
373 open (incl. PRs) · **BSD-2-Clause** · **offline: self-hosted only** (server) · better than ours: the
fastest matrix and the de-facto `/route` `/match` `/nearest` API every other tool speaks · risks: **car
profile only** · **DECISION: KEEP (matrix + Plan-B router).**

**M20 — `valhalla/valhalla`** https://github.com/valhalla/valhalla — **6 348 ★** /1 012 f · created
**2016-01-19** · **3.9.1, 2026-10-06** (7 in 6 m) · 79 commits/90 d, **19 humans** · 944 open (incl. PRs) ·
**MIT** (verified in the repo `COPYING`) · **offline: self-hosted (C++ server) or on-device via
`valhalla_service`** · better than ours: the best **truck cost model** (height/width/weight, surface,
access), **isochrones**, `/matrix`, `/trace_attributes` (the IRD logbook) and it reads the OSM
`driving_side` tag — decisive for NZ · **DECISION: ADOPT (routing engine).**

**M21 — `graphhopper/graphhopper`** https://github.com/graphhopper/graphhopper — **6 737 ★** /1 961 f ·
created **2012-02-18** · **11.1, 2026-09-29** · 72 commits/90 d, 5 humans · 243 open (incl. PRs) ·
**Apache-2.0** · **offline: self-hosted** · better than ours: routing + HMM map-matching + a **navigation
instruction engine** in one codebase, plus customizable contraction hierarchies for a cheap matrix ·
**DECISION: ADOPT (routing + map-matching + instructions).**

**M22 — `hove-io/navitia`** https://github.com/hove-io/navitia — **457 ★** /130 f · created **2013-06-19** ·
**v15.119.0, 2026-10-05** · 70 commits/90 d, 7 humans · 42 open · **AGPL-3.0** · **tile terms: n/a** ·
**offline: self-hosted** · better than ours: the strongest **transit** engine (GTFS/NeTEx) — a courier on a
bus route in Christchurch is a real case · risks: **AGPL-3.0 → copyleft; clean-room study only** ·
**DECISION: CLEAN-ROOM ONLY.**

**M23 — `GIScience/openrouteservice`** https://github.com/GIScience/openrouteservice — **1 985 ★** /484 f ·
created **2017-09-11** · last push **2026-10-20** · 168 open · **GPL-3.0** · **offline: self-hosted** ·
better than ours: a rich hosted-style routing API with isochrones and matrix · risks: **GPL-3.0 → never
in the APK; never point a config at it** · **DECISION: CLEAN-ROOM ONLY.**

**M24 — `komoot/photon`** https://github.com/komoot/photon — **3 128 ★** /380 f · created **2013-08-20** ·
**1.3.0, 2026-08-07** · 70 commits/90 d, 5 humans · 42 open · **Apache-2.0** · **tile terms: indexes OSM
data → ODbL applies to any published result** · **offline: self-hosted** · better than ours: a
**typo-tolerant** geocoder for OSM — the search a courier types with one hand on a mounted phone ·
**DECISION: ADOPT (server-side geocoder); on-device we use the LINZ FTS5 index (D19/T4).**

**M25 — `osm-search/Nominatim`** https://github.com/osm-search/Nominatim — **4 525 ★** /866 f · created
**2012-03-03** · **v5.3.3, 2026-10-14** · ≥100 commits/90 d, 7 humans · 102 open · **GPL-3.0** ·
**offline: self-hosted** · risks: **GPL-3.0 → clean-room only**; the OSMF Nominatim usage policy also caps
heavy use · **DECISION: CLEAN-ROOM ONLY.**

**M26 — `stadiamaps/ferrostar`** https://github.com/stadiamaps/ferrostar — **442 ★** /82 f · created
**2023-04-27** · **0.58.0, 2026-10-13** · 41 commits/90 d, **10 humans** · 149 open · **BSD-3-Clause**
(verified in `LICENSE.txt`: *"Copyright (c) 2023, Stadia Maps, Inc."* — the API reports "Other" only
because the file is not named `LICENSE`) · **tile terms: none of its own**; Stadia's *hosted* tiles are
paid and commercial-use-only · **offline: yes** — it is a Rust navigation SDK with a **React Native
module** in the same repo (`react-native/`) · better than ours: **turn-by-turn + spoken guidance in Rust**,
fed by any Valhalla-compatible router · risks: Stadia's own ToS forbids commercial use of their hosted
tiles without a paid plan, but the **SDK itself is BSD-3** · **DECISION: ADOPT behind a flag (T7.7
fallback); keep the hand-off to Google/Apple/Waze as the default, per PARITY row 22.**

**M27 — `graphhopper/graphhopper-navigation-example`** https://github.com/graphhopper/graphhopper-navigation-example
— **42 ★** /6 f · created **2023-11-25** · last push **2026-05-26** · **0 commits/90 d** · 1 open · **MIT** ·
**offline: yes** (MapLibre Android) · better than ours: the reference wiring of GraphHopper's instruction
engine to a MapLibre renderer — the same pairing we would build · risks: 42 stars; it is an example, not
a product · **DECISION: KEEP as a reference implementation to read.**

### 1.4 The OSS map products — the comparison the brief asks for (14)

**M28 — `organicmaps/organicmaps`** ⭐ https://github.com/organicmaps/organicmaps — **15 716 ★** /1 651 f ·
created **2020-12-27** · last release **2026.09.29-32-android (2026-09-29)** · ≥100 commits/90 d,
**8 humans** · 3 628 open · **licence: the root `LICENSE` is reported NOASSERTION by the API; the README
says the *code* is Apache-2.0** and the **binary data files (`.mwm`, `packed_polygons.bin`) are under a
separate licence** (`DATA_LICENSE.txt`) · **tile terms (verbatim from `DATA_LICENSE.txt`):** the data files
contain OSM data under the **ODbL**, Wikipedia text under CC BY-SA, SRTM/ASTER elevation, UK postcodes
under the OGL and US TIGER; *".mwm and `packed_polygons.bin` files are **Produced Works** under the terms
of the ODbL"*; the conditions are **(1) attribution required** — show *"Map data © OpenStreetMap and
Organic Maps"* on the map **and** in user-visible areas (About, Main Menu) **with clickable links** to
https://organicmaps.app and https://openstreetmap.org/copyright; **(2) no redistribution without
attribution**; **(3) no white-labelling or branding removal without explicit written permission**
(`legal@organicmaps.app`) · **offline: yes — it is the reference offline product** (region download,
resume, region management) · Expo SDK 58 fit: **NO** (its own C++/Qt stack) · better than ours: **the best
written offline-pack download / resume / region-management UX in the market**, plus its own routing and
POI search on OSM · risks: the data-file licence forbids white-labelling without written permission, so
we may **study the UX but not redistribute their `.mwm` files** · **DECISION: CLEAN-ROOM STUDY ONLY —
study the UX, not the code or the data.**

**M29 — `mapsme/omim`** https://github.com/mapsme/omim — **4 599 ★** /1 139 f · created **2015-09-20** ·
last push **2022-10-05** · last release `py-modules-10.0.0` (2020-03-13) · **0 commits/90 d** · 997 open ·
**Apache-2.0** (the code) · **tile terms: the `.mwm` data files are under Organic Maps' separate data
licence, and the project is closed** · **offline: yes (historically)** · better than ours: nothing —
**the project says so itself**: issue
[#14206](https://github.com/mapsme/omim/issues/14206) (2023-09-02) *"**THIS REPOSITORY IS NOT USED
ANYMORE — MAPS.ME IS CLOSED SOURCE NOW**"*, and
[#14205](https://github.com/mapsme/omim/issues/14205) (2023-08-31) *"iOS no more support"* ·
**DECISION: REJECT (dead, closed).**

**M30 — `osmandapp/OsmAnd`** https://github.com/osmandapp/OsmAnd — **6 098 ★** /1 249 f · created
**2011-01-15** · last push **2026-10-20** · last *tagged* release **2.0.0 (2019)** but **≥100 commits/90 d,
11 humans** (the tags are not the releases) · 3 494 open · root `LICENSE` reports **NOASSERTION** →
**treat as copyleft until the per-directory headers are audited** · **tile terms: mixed; the app ships its
own vector format** · **offline: yes** — the oldest, most complete offline map+nav+POI app · better than
ours: 14 years of offline behaviour · risks: a 3 494-issue backlog and a licence we cannot read ·
**DECISION: CLEAN-ROOM STUDY ONLY.**

**M31 — `navit-gps/navit`** https://github.com/navit-gps/navit — **668 ★** /187 f · created **2015-02-14** ·
**v0.5.7, 2026-02-08** · ≥100 commits/90 d, 6 humans · 218 open · **GPL v2** (per the project; the API
reports NOASSERTION) · **offline: yes** — turn-by-turn with its own OSM routing engine · better than ours:
a **complete offline navigation stack** in one codebase, from the OSM data to the voice prompt ·
risks: GPL; open issue
[#1648](https://github.com/navit-gps/navit/issues/1648) (2026-10-04) *"No TTS voice v0.5.7"* — the voice
layer is thin · **DECISION: CLEAN-ROOM STUDY ONLY (the offline-routing reference).**

**M32 — `PimpinPumpkin/Vela`** https://github.com/PimpinPumpkin/Vela — **2 079 ★** /104 f · created
**2026-06-15** · last release **v0.5.2632, 2026-10-20** · ≥100 commits/90 d, 8 humans · 58 open ·
**GPL-3.0** · **tile terms: OSM/ODbL data** · **offline: yes** — *"Maps and turn-by-turn navigation for
Android without Google Play Services"* · better than ours: **proof that a complete OSM navigation stack is
buildable in 2026**, on a de-googled phone, with **daily release numbers** (v0.5.2632) · risks:
**GPL-3.0** · **DECISION: CLEAN-ROOM STUDY ONLY — never quote its code.**

**M33 — `kde/marble`** https://github.com/kde/marble (the canonical home is `invent.kde.org/edu/marble`) —
**170 ★** /60 f · created **2015-09-18** · last push **2026-10-17** · **no GitHub releases** · 37
commits/90 d, 5 humans · 0 open issues · **LGPL-2.1-or-later** (per https://apps.kde.org/en-gb/marble) ·
**tile terms: OSM themes + historical maps under CC BY-SA 2.0 / public domain** · **offline: yes**
(OSM themes downloaded in-app; offline routing via Monav) · better than ours: a **virtual globe** with
elevation, historical maps and offline routing — nothing a courier needs · risks: **C++/Qt**, a desktop
and N900 heritage; LGPL means it is a legal question for us to ship ·
**DECISION: REJECT (wrong platform, wrong product).**

**M34 — `traccar/traccar`** ⭐ https://github.com/traccar/traccar — **7 892 ★** /3 443 f · created
**2012-04-16** · **v6.16.0, 2026-09-27** · ≥100 commits/90 d, **12 humans** · 404 open · **Apache-2.0** ·
**tile terms: none of its own; it renders OSM raster tiles from any configured OSM tile layer, so the
tile provider's terms apply** · **offline: the server can run with no internet; the clients can cache
tiles** · better than ours: **real-time GPS tracking, geofencing, alarms, detailed reports, driver-behaviour
monitoring** — the *dispatcher* half of a courier product, for free, self-hosted, with a REST API ·
risks: it is a **fleet-tracking** product, not a routing product; the Android client is a separate repo
**DECISION: WATCH — the reference for background location + geofences + the dispatcher view (T7.12).**

**M35 — `traccar/traccar-web`** https://github.com/traccar/traccar-web — **1 198 ★** /1 514 f · created
**2012-11-02** · last push **2026-10-20** · ≥100 commits/90 d, 4 humans · 88 open · **Apache-2.0** ·
**offline: n/a** · better than ours: a real **dispatcher dashboard** (map, status, reports) ·
**DECISION: WATCH (design reference for T7.12).**

**M36 — `traccar/traccar-client-android`** https://github.com/traccar/traccar-client-android — **760 ★**
/782 f · created **2012-07-29** · last push **2025-06-07** · last release **v7.9 (2025-04-17)** ·
**0 commits/90 d** · 192 open · **Apache-2.0** · **offline: yes, it caches tiles** · better than ours: the
**foreground-service + battery-whitelist** pattern for background location (our ≤ 8 %/h budget) ·
risks: the client is **stale since 2025-06-07** — read it as a **pattern**, not as code to copy ·
**DECISION: WATCH (the background-location pattern only).**

**M37 — `traccar/traccar-geocoder`** https://github.com/traccar/traccar-geocoder — **255 ★** /29 f ·
created **2026-03-14** · last push **2026-10-20** · 6 commits/90 d, 2 humans · 4 open · **Apache-2.0** ·
**offline: self-hosted** · better than ours: a **2026-born** reverse geocoder split out of Traccar ·
risks: 7 months old · **DECISION: WATCH.**

**M38 — `streetcomplete/StreetComplete`** https://github.com/streetcomplete/StreetComplete — **5 072 ★** /
472 f · created **2016-07-02** · **v64.0, 2026-10-19** · ≥100 commits/90 d, 9 humans · 129 open ·
**GPL-3.0** · **tile terms: OSM/ODbL** · **offline: yes — it edits OSM from the field** · better than ours:
**the QA logic for OSM tags, written by people who look at real streets all day** — this is where the
"access restriction" and "entrance" tags our courier layers depend on get validated ·
**DECISION: CLEAN-ROOM STUDY ONLY (a tag-quality reference).**

**M39 — `openstreetmap/iD`** https://github.com/openstreetmap/iD — **3 906 ★** /1 499 f · created
**2012-07-11** · **v2.42.2, 2026-08-19** · ≥100 commits/90 d, 12 humans · 1 011 open · **ISC** ·
**tile terms: OSM/ODbL** · **offline: yes** · better than ours: the **tag vocabulary** our courier layers
must select from · **DECISION: KEEP as a reference (tag semantics).**

**M40 — `Framstag/libosmscout`** https://github.com/Framstag/libosmscout — **305 ★** /88 f · created
**2015-08-31** · last release tag `latest`, 2026-10-19 · ≥100 commits/90 d, 2 humans · 43 open · licence
**NOASSERTION** → **UNVERIFIED (LGPL family)** · **offline: yes** — a C++ library for **offline map
rendering, routing and location lookup** from OSM data · better than ours: the one library that does
rendering + routing + lookup **offline from an OSM extract**, which is exactly the D15 shape ·
risks: LGPL-family, 2 maintainers, no versioned releases · **DECISION: WATCH (the closest thing to a
C++-only offline stack).**

**M41 — `rinigus/osmscout-server`** https://github.com/rinigus/osmscout-server — **189 ★** /28 f · created
**2016-09-18** · **3.1.7, 2026-05-30** · 10 commits/90 d, 1 human · 34 open · **GPL-3.0** ·
**offline: self-hosted tiles + geocoder + router** · better than ours: tiles, geocoder and router in one
service · risks: GPL-3.0, one maintainer · **DECISION: CLEAN-ROOM ONLY.**

### 1.5 The rejected / wrong-toolchain / dead ends (9)

**M42 — `react-native-maps/react-native-maps`** https://github.com/react-native-maps/react-native-maps —
**16 010 ★** /4 964 f · created **2015-12-29** · **v1.29.11, 2026-09-27** · 25 commits/90 d, 15 humans ·
104 open · **MIT** (the wrapper) · **tile terms: the wrapped Google Maps / Apple Maps data is proprietary**
· **offline: no vector tiles, no style we control** · Expo SDK 58 fit: **yes, but irrelevant** ·
**DECISION: REJECT — proprietary data, and it cannot show an offline pack.**

**M43 — `rnmapbox/maps`** https://github.com/rnmapbox/maps — **2 921 ★** /955 f · created **2019-04-07** ·
**v10.3.10, 2026-10-19** · 77 commits/90 d, 19 humans · 107 open · repo **MIT** but the wrapped Mapbox
SDK is proprietary (token + per-MAU billing) · **offline: Mapbox has its own offline SDK, but it is a
vendor lock-in and needs a key** · **DECISION: REJECT — contradicts D17 (no keys).**

**M44 — `mapbox/mapbox-gl-native`** https://github.com/mapbox/mapbox-gl-native — **4 457 ★** /1 319 f ·
created **2014-01-01** · **ARCHIVED**, last push **2023-07-27**, last release `maps-v1.6.0` (2020-05-01) ·
0 commits/90 d · 295 open · proprietary SDK terms · **DECISION: REJECT (archived).**

**M45 — `osmdroid/osmdroid`** https://github.com/osmdroid/osmdroid — **3 078 ★** /1 017 f · created
**2014-03-06** · **ARCHIVED**, last release `osmdroid-parent-6.1.20` (2024-08-18), last push 2024-11-20 ·
0 commits/90 d · 306 open · **Apache-2.0** · **offline: yes (raster tile cache)** · better than ours:
nothing · **DECISION: REJECT (dead).**

**M46 — `FASTSHIFT/X-TRACK`** https://github.com/FASTSHIFT/X-TRACK — **6 310 ★** · created 2020-ish ·
last push **2025-11-08** · last release **v2.7 (2022-07-23)** · 0 commits/90 d · **MIT** · **offline:
yes** (GPS tracks + maps) · better than ours: nothing for routing · **DECISION: REJECT (stale).**

**M47 — `gboeing/osmnx`** https://github.com/gboeing/osmnx — **5 880 ★** /895 f · created **2016-07-24** ·
last push **2026-07-31** · 17 commits/90 d, 2 humans · 5 open · **MIT** · **offline: yes (a Python
library over downloaded OSM extracts)** · better than ours: the right tool for **analysis**, not for a
driver's map · **DECISION: WATCH (analysis; e.g. to build our NZ rural-routing benchmark set).**

**M48 — `merlos/MapCache`** https://github.com/merlos/MapCache — **139 ★** /31 f · created **2019-06-04** ·
**0.11.0, 2026-07-07** · 2 commits/90 d, 1 human · 5 open · **MIT** · **offline: yes — a Swift package
that caches map tiles for offline use** · better than ours: the iOS half of the offline question (we are
Android-first but iOS ships too) · risks: 139 stars, one author · **DECISION: WATCH (iOS offline cache).**

**M49 — `atlasdatatech/tiler`** https://github.com/atlasdatatech/tiler — **508 ★** /84 f · created
**2018-12-13** · last push **2024-06-02** · 0 commits/90 d · 15 open · **no licence detected** →
**UNVERIFIED** · **offline: yes** (a vector-tile downloader, Chinese-first) · risks: **no licence file**
and stale · **DECISION: REJECT.**

**M50 — `openstreetmap/openstreetmap-website`** https://github.com/openstreetmap/openstreetmap-website —
**2 856 ★** /1 100 f · created **2010-05-01** · last push **2026-10-19** · ≥100 commits/90 d, 11 humans ·
675 open · **GPL-2.0** · **offline: n/a** · better than ours: **the reference for how OSM's own data
licence is implemented in code** (the attribution renderer, the ODbL share-alike flow) · risks: GPL ·
**DECISION: KEEP as a legal/attribution reference only.**

---
## 2. Shortlist (13)

| # | Project | Decision | One-line reason |
|---|---------|----------|-----------------|
| M1  | **maplibre/maplibre-react-native** 11.5.0 | **KEEP → upgrade 11.3.7 → 11.5.0 (blocking)** | The only RN binding with New-Arch codegen, Expo 58 peers and targetSdk 34; the six missed releases carry two ANR fixes and a heap-corruption fix. |
| M2  | **maplibre/maplibre-native** 13.7.1 | **KEEP (transitive)** | `pmtiles://file://` and `pmtiles://asset://` — the reader that makes an offline, file-backed map possible at all. |
| M9  | **protomaps/PMTiles** (spec = public domain) | **ADOPT** | One single-file archive; the **spec** is public domain, so we may write our own reader; v3 diffs make the weekly refresh cheap. |
| M10 | **protomaps/go-pmtiles** v1.31.2 | **ADOPT (pinned by SHA-256)** | `pmtiles extract` is the only route to a bbox-clipped, zoom-capped Canterbury pack. |
| M11 | **protomaps/basemaps** | **ADOPT (fork, renamed)** | BSD-3 code + **CC0 visual design** + ODbL data; day and night from one generated theme; a z17 courier schema. |
| M17 | **onthegomap/planetiler** | **KEEP (transitive)** | Builds the pack from the Geofabrik NZ extract; the YAML profile adds courier layers without forking Java. |
| M20 | **valhalla/valhalla** 3.9.1 | **ADOPT** | The truck cost model, `/matrix`, `/trace_attributes` for the IRD logbook, and it reads OSM `driving_side` — decisive for NZ. |
| M21 | **graphhopper/graphhopper** 11.1 | **ADOPT** | Routing + HMM map-matching + an instruction engine in one Apache-2.0 codebase; customizable CH for a cheap matrix. |
| M26 | **stadiamaps/ferrostar** 0.58.0 | **ADOPT behind a flag** | BSD-3 Rust turn-by-turn with spoken guidance and a **React Native module**; the SDK is free even though Stadia's hosted tiles are not. |
| M24 | **komoot/photon** 1.3.0 | **ADOPT (server-side)** | Typo-tolerant OSM geocoding for one-handed search; on-device we keep the LINZ FTS5 index (D19). |
| M18 | **headwaymaps/headway** | **WATCH → evaluate** | The only self-hosted stack that brings up map + search + directions in one command — our fallback, not our app. |
| M12 | **hyperknot/openfreemap** | **WATCH (self-host)** | Key-less tiles and weekly planet PMTiles; but one maintainer and a ToS that caps the **hosted** service at 3 000 tiles / 50 MB. |
| M19 | **Project-OSRM/osrm-backend** v26.10.0 | **KEEP (matrix + Plan B)** | The fastest matrix and the API every other tool speaks; car profile only. |

### Also considered — the watchlist and the rejections

| # | Project | Decision | One-line reason |
|---|---------|----------|-----------------|
| M34 | **traccar/traccar** v6.16.0 | **WATCH (T7.12 reference)** | Self-hosted tracking, geofences, alarms and reports — the dispatcher half of a courier product, Apache-2.0. |
| M16 | **openmaptiles/openmaptiles** v3.16 | **WATCH** | More POI layers than Protomaps, but it adds a **CC-BY attribution duty** and heavier packs. |
| M8  | **maplibre/maputnik** v3.1.0 | **KEEP (design-time)** | Where the courier style is authored and exported. |
| M5  | **maplibre/maplibre-tile-spec** | **WATCH (MLT = the pack-size lever)** | MLT would shrink the pack materially; not yet the default tile format. |
| M28 / M30 / M31 / M32 / M33 / M38 | Organic Maps · OsmAnd · Navit · Vela · KDE Marble · StreetComplete | **CLEAN-ROOM STUDY ONLY** | The best-written offline and navigation implementations, and every one of them is copyleft or closed. |
| M22 / M23 / M25 / M41 | Navitia · OpenRouteService · Nominatim · osmscout-server | **CLEAN-ROOM ONLY** | GPL/AGPL — study, never ship, never point a config at them. |
| M42 / M43 / M44 / M45 / M46 / M49 | react-native-maps · rnmapbox · mapbox-gl-native · osmdroid · X-TRACK · tiler | **REJECT** | Proprietary data, archived, dead, or no licence file. |
| M39 / M47 / M48 / M50 | iD · osmnx · MapCache · openstreetmap-website | **KEEP (reference only)** | Tag vocabulary, analysis, the iOS offline cache, and the ODbL attribution reference. |

---

## 3. Deep review — top 5 (code read, commits, PRs and issues opened in the 2026 window)

### 3.1 `maplibre/maplibre-react-native` (M1) — our locked choice

**Code read.** `package.json` (npm `11.5.0`, fetched 2026-10-21): `codegenConfig` is
`{ name: "MapLibreReactNativeSpec", type: "all", jsSrcsDir: "src" }` with an **iOS
`componentProvider`** map that names every Fabric component (`MLRNMapView`, `MLRNVectorSource`,
`MLRNGeoJSONSource`, `MLRNRasterDEMSource`, `MLRNLayer`, `MLRNCamera`, `MLRNImages`, `MLRNCallout`,
`MLRNPointAnnotation`, `MLRNNativeUserLocation`) — that is the New Architecture on both platforms.
`peerDependencies` are `expo >= 54.0.0`, `react >= 19.1.0`, `react-native >= 0.80.0` — **our Expo 58 /
RN 0.88 / React 19.3.0 tree is inside the supported range**. `publishConfig.provenance: true` with a
Sigstore attestation, `gitHead 059f46b2dc728fb6259af91b27a071bcda19a2ae`, **979 files, 2 186 031 bytes
unpacked**. The package also ships `./plugin` and `./app.plugin.js` exports, so `expo prebuild` works in
our monorepo.

**Behaviour checked against our own pin.** We are on **11.3.7**; npm latest is **11.5.0** (published
2026-10-04, GitHub tag `v11.5.0`). The six missed releases carry, per `CHANGELOG.md`: 11.3.8 *"Android:
prevent two map ANR deadlocks and a camera NullPointerException"* and *"iOS: prevent NaN edge insets"*;
11.3.9 *"iOS: serialize style image loads to avoid CUICatalog heap corruption"*; 11.3.10 *"iOS: GeoJSONSource
recycling"*; 11.4.0 *"Android: upgrade MapLibre Native to 13.6.1 / iOS: 6.31.0"*; 11.4.1 *"iOS: only add
MLRN SPM to requiring targets"*; 11.5.0 *"add feature state API"*. **Two ANR deadlocks, a camera NPE and a
heap-corruption fix are already ours and are not deployed.**

**Commits (2026-10-13 → 2026-10-20, 72 in 90 d):** the release-shaped ones are
`feat: add feature state API (#1651)` and `fix(iOS): only add MLRN SPM to requiring targets (#1703)`;
the rest of the 90-day window is Dependabot bumps and releases. **Feature work per release is thin; the
value of upgrading is the backported fixes.**

**Open issues (2026 window, issues only):** #1738 Fabric mount abort · #1736 ignored `initialViewState` ·
#1735 SIGSEGV on style reload · #1734 stale inline GeoJSON · #1733 recycled source views · #1732 sprite
eviction · #1729 Android Marker long-press. **None blocks us, but #1733 and #1735 mean we must not
recycle source components ourselves.**

**Verdict:** **KEEP; upgrade to 11.5.0 is blocking** — not for a feature, for the two ANR deadlocks a
driver would feel as a frozen map.

### 3.2 `maplibre/maplibre-native` (M2) — the component that makes offline possible

**Code read: `platform/android/docs/data/PMTiles.md`, in full.** The behaviour it documents is the whole
offline story: *"Starting MapLibre Android 11.7.0, PMTiles archives are supported as tile sources. Prefix
any tile source URL with `pmtiles://` to read from a PMTiles archive"* — `pmtiles://https://` (stream from
a remote file), `pmtiles://file://` (**read a file from device storage**; *"use `getExternalFilesDir` or
`filesDir` for the path"*), and `pmtiles://asset://<name>.pmtiles` (an **in-APK** archive) or
`file:///android_asset/<name>.pmtiles`. It works with **any tile source type** (vector, raster,
raster-dem), from a style JSON or added programmatically. Two constraints that matter: *"Unlike MapLibre
GL JS, which resolves relative URLs against the style's base URL, MapLibre Native **requires the URL inside
`pmtiles://` to be fully specified**"*, and *"**PMTiles sources do not support offline pack downloads or
caching**"* — **we own the pack lifecycle end to end**.

**Commits (2026-10-12 → 2026-10-19):** `2eb591a38` 2026-10-19 louwers "ci: run CI on pull requests targeting
any branch (#4797)" · `254d0a872` 2026-10-16 johncarmack1984 "fix(core): draw line-gradient together with
line-dasharray (#4725)" · `ba9b9163b` 2026-10-15 graysail "core: avoid unneccessary per-frame vertex data
uploads for 'fill' layers (#4765)" · `4cf121e51` 2026-10-14 louwers "android: publish to Maven Central
after all builds and release 13.7.1 (#4772)" · `c14d96fb6` 2026-10-14 deniial00 "Core: Add support for
colorized SDF fill patterns (#4551)" · `377584fb4` 2026-10-14 louwers "ios: distribute a plugin-enabled
XCFramework and release 7.0.0-pre2 (#4769)" · `18ceb9c99` 2026-10-14 louwers "android: publish
-with-plugin-api artifacts and release 13.7.0 (#4770)" · `9b4b5bcc2` 2026-10-13 louwers "ci: request a
4 hour AWS session for sccache (#4764)" · `49537ef24` 2026-10-13 sargunv "fix(core): maintain renderer frame
and draw statistics (#4719)" · `29c98e927` 2026-10-12 sargunv "fix(core): handle platform locale expression
failures (#4745)".

**Behaviour checked:** `4cf121e51` and `18ceb9c99` are the releases; `ba9b9163b` and `49537ef24` are
**frame-time** work (per-frame vertex uploads, renderer statistics) — the exact area our 60 fps gate
lives in; `2eb591a38` changes CI policy for PRs. `android-v13.7.1` adds the **asset byte-range reads**, so
an in-APK city core is possible as well as a downloaded file.

**Open issues (2026 window):** #4804 (2026-10-19) *"Metal: the first tile of a clip-mask render can use
the previous render's UBO…"* · #4802 (2026-10-19) *"Support fill-extrusion shadows"* · **#4796
(2026-10-19) *"iOS: SIGABRT from uncaught mbgl::LatLng NaN when user-location tracking runs on a zero-size
MLNMapView"*** · #4794 (2026-10-18) *"iOS crash in eventAttributesForURL: 'attempt to insert nil object'"* ·
#4793 (2026-10-18) *"GeoJSONSource ignores setURL after setGeoJSON cancels a URL load"*. **#4796 is a
crash in user-location tracking — the thing a courier's app does constantly.**

**Verdict:** **KEEP (transitive), and pin the version used in the eval.** The file-backed reader is the
reason D15 is buildable at all; the reader's own limits (fully-specified URLs, no pack caching) are the
spec for our pack manager.

### 3.3 `organicmaps/organicmaps` (M28) — the reference offline product, and its data licence

**Licence read in full: `DATA_LICENSE.txt`.** This is the most decision-relevant licence text in the whole
map pool, because it is the clearest statement of what "an offline OSM map product" owes its users:
the data files contain OSM under the **ODbL**, Wikipedia text under CC BY-SA, SRTM/ASTER elevation, UK
postcodes under the OGL and US TIGER; *".mwm and `packed_polygons.bin` files are **Produced Works** under
the terms of the ODbL license"*; and then three conditions — **(1) Attribution Required**: *"you must
clearly and visibly credit Organic Maps and OpenStreetMap in your application: on the map, and in
user-visible areas such as the **About screen** and **Main Menu**, show text 'Map data © OpenStreetMap
and Organic Maps' … include **clickable links** to https://organicmaps.app and
https://openstreetmap.org/copyright"*; **(2) No Redistribution Without Attribution**; **(3) No White-Labeling
or Branding Removal** — *"Any white-labeling or rebranding use requires **explicit written permission**
from the Organic Maps team."*

**The lesson we take from it (and it is a licence, not a code reading):** the attribution must be
**visible on the map**, in **two or more user-visible places**, with **clickable links**, and it must work
**offline**. That is exactly the requirement we wrote into the maps research file for our own pack, and
Organic Maps' formulation is the clearest statement of it anywhere.

**Commits (2026-09-23 → 2026-10-20):** `58f227886` 2026-10-14 biodranik "[coding] Accept signed
tessellator edge sides" · `e0b75508c` 2026-10-19 kirylkaveryn "[ios] Preserve route point replacement on
Place Page" · `ebeef6e38` 2026-10-20 biodranik "[github] Fix ubuntu CI" · `0d60be4f6` 2026-10-16 biodranik
"[geometry] Clarify canonical rectangle coverage and seam contacts" · `031155bf5` 2026-10-16 biodranik
"**[routing] Stop MWM proximity queries at the first match**" (an allocation-free proximity search — the
*routing* engine, not just the map) · `29fbeac9b` 2026-10-16 biodranik "[storage] Find country polygons
contained by rectangle queries" · `8b8e3562a` 2026-10-16 biodranik "[storage] Index countries added to the
test info getter" · `aedead7cf` / `5282b5386` 2026-10-19 vng "[borders] Regenerate packed polygons" /
"[borders] Fix the top 20 most overlapped polys" · `93bcbe140` 2026-10-02 strider-dunadan "[android] Add
track recording home screen widget".

**Open issues (2026 window):** #13932 (2026-10-20) *"Linux UI: Implementation Process of (voiceless) Turn
By Turn Navigation and Lane Guidance"* — **note "voiceless"**: Organic Maps' turn-by-turn is **not**
voice-first, which is our differentiator (D1/D2) · #13927 (2026-10-19) *"Opening hours on places page show
'noon' instead of '12:00'"* · #13925 (2026-10-19) *"Convergent Linux UI: feature parity with Android and
iOS"* · #13920 (2026-10-19) *"Business hours are displayed as 'Closed' when opening and closing times are
identical"*.

**PRs (2026 window):** [#13931](https://github.com/organicmaps/organicmaps/pull/13931) 2026-10-20 ·
[#13928](https://github.com/organicmaps/organicmaps/pull/13928) 2026-10-20 (**merged** 2026-10-20T09:13:53Z) ·
[#13926](https://github.com/organicmaps/organicmaps/pull/13926) 2026-10-19 ·
[#13924](https://github.com/organicmaps/organicmaps/pull/13924) 2026-10-19 (**merged** 2026-10-19T12:45:40Z) ·
[#13923](https://github.com/organicmaps/organicmaps/pull/13923) 2026-10-19 ·
[#13921](https://github.com/organicmaps/organicmaps/pull/13921) 2026-10-19 ·
[#13918](https://github.com/organicmaps/organicmaps/pull/13918) 2026-10-18 ·
[#13917](https://github.com/organicmaps/organicmaps/pull/13917) 2026-10-18 (**merged** 2026-10-18T18:44:18Z) ·
[#13914](https://github.com/organicmaps/organicmaps/pull/13914) 2026-10-18 (**merged** 2026-10-18T18:45:39Z) ·
[#13913](https://github.com/organicmaps/organicmaps/pull/13913) 2026-10-17.

**Verdict:** **CLEAN-ROOM STUDY ONLY.** Study the UX — the region download, the resume, the region
management, the "voiceless navigation" gap — and **copy the attribution requirements into our own design
(D16/T5.4)**. Do not take their code, and **do not redistribute their `.mwm` files**: their data licence
requires attribution *and* forbids rebranding without written permission.

### 3.4 `headwaymaps/headway` (M18) — the 2026 self-hosted maps stack

**README read in full.** *"Headway is a maps stack in a box that makes it easy to take your location data
into your own hands. With just a few commands you can bring up your own fully functional maps server. This
includes a frontend, basemap, geocoder and routing engine. Choose one of the 200+ predefined cities or
provide your own OpenStreetMap extract covering any area: from a neighborhood to the whole planet."*
Status: *"capable of showing a map, searching for points of interest and addresses within an OpenStreetMap
extract and providing directions between any two places within that extract. Supported modes include
driving, cycling and walking. Transit directions are a work-in-progress."* Licence: **Apache-2.0**.
**Cost, stated by the project:** *"The machine used for generation of the data files needs to have at least
8GB of memory, potentially more for larger areas … Expect to need around 4GB for a medium sized metro area.
Additionally, you should expect to need **50GB-100GB of disk space during the build process**."* And, a
detail we care about because it is a *workflow* fact: *"`.githooks/pre-commit` runs the formatting, linting
and test checks. Run it by hand, or automatically before each commit by setting this once per clone: `git
config core.hooksPath .githooks`"* — **a self-hosted maps stack that ships the pre-commit hook we do not
have.**

**Repo shape read:** `Cargo.toml` + `Cargo.lock` (the Rust services), `dagger/` + `dagger.json` (Dagger for
the reproducible build), `bin/`, `builds/`, `services/`, `tests/`, `k8s/`, `docker-compose.yaml`,
`docker-compose-with-transit.yaml`, `BUILD.md`, `ARCHITECTURE.md`, `FULL_PLANET.md`, `TRANSIT_ZONER.md`,
`VALUES.md`, `.githooks/`, `.earthlyignore`, `.arg`.

**Commits (2026-10-08 → 2026-10-15):** `49b9657f1` 2026-10-15 michaelkirk "Merge pull request #464 from
headwaymaps/mkirk/rust-cache-export-timeout" · `9ed26a507` 2026-10-15 "Carry the Rust build caches as one
compressed archive" · `64e691dcb` 2026-10-14 "Time out the Rust cache export instead of hanging until the
job dies" · `46282772f` 2026-10-14 "strip custom dataHost from pelias config" · `72ab0a545` 2026-10-14
"Merge pull request #458 from headwaymaps/mkirk/k8s-wait-for-delete" · `144f02785` 2026-10-14 "Merge pull
request #463 from headwaymaps/mkirk/map-url-zoom" · `552465f99` 2026-10-14 "Show each volume as the
provisioner reclaims it" · `062a398e4` 2026-10-08 "avoid printing scary error message when we simply
haven't waited for it to complete".

**PRs (2026 window):** [#464](https://github.com/headwaymaps/headway/pull/464) 2026-10-14 (**merged**
2026-10-15) · [#463](https://github.com/headwaymaps/headway/pull/463) 2026-10-14 (**merged** 2026-10-14) ·
[#462](https://github.com/headwaymaps/headway/pull/462) 2026-10-13 (**merged** 2026-10-13) ·
[#461](https://github.com/headwaymaps/headway/pull/461) 2026-10-13 (**merged** 2026-10-13) ·
[#460](https://github.com/headwaymaps/headway/pull/460) 2026-10-12 (**merged** 2026-10-13) ·
[#459](https://github.com/headwaymaps/headway/pull/459) 2026-10-12 (**merged** 2026-10-12) ·
[#458](https://github.com/headwaymaps/headway/pull/458) 2026-10-08 (**merged** 2026-10-14) ·
[#457](https://github.com/headwaymaps/headway/pull/457) 2026-10-08 (**merged** 2026-10-08).

**Open issues:** only 27 open, and the five newest are old — [#402](https://github.com/headwaymaps/headway/issues/402)
2025-12-08 *"Source layer 'park' does not exist on source 'openmaptiles'"*, and
[#295](https://github.com/headwaymaps/headway/issues/295) 2023-11-08, [#178](https://github.com/headwaymaps/headway/issues/178)
2022-10-10, [#163](https://github.com/headwaymaps/headway/issues/163) 2022-09-19,
[#157](https://github.com/headwaymaps/headway/issues/157) 2022-09-16. **A project with 3 007 stars and a
27-issue backlog, one maintainer and no releases** — the maintenance signal is *thin*, not broad.

**Verdict:** **WATCH → evaluate.** It is the best-documented answer to "we need a map, a geocoder and
directions for one region on our own box", and it is **Apache-2.0**, which matters (no copyleft). But the
**8 GB RAM / 50–100 GB disk** build cost and **one maintainer** mean we would be depending on a single
person's spare time. Use it for the **web dashboard** (T7.12) before using it for anything else.

### 3.5 `traccar/traccar` (M34) — the OSM-based courier product

**README read in full.** *"Traccar is a free, open source GPS tracking platform … supports more than 200
GPS protocols and 2000+ models of GPS tracking devices out of the box … works with any major SQL database
and provides an easy to use REST API."* The feature list is the courier-dispatch list: **real-time GPS
tracking, driver behaviour monitoring, detailed and summary reports, geofencing functionality, alarms and
notifications, account and device management, email and SMS support**. Licence: **Apache License 2.0**
(`LICENSE.txt`). It is self-hostable with Docker Compose and runs on **port 8082**.

**Commits (2026-10-17 → 2026-10-20):** `6ed68bd4d` 2026-10-20 tananaev "Use shorter sample from doc" ·
`56f0a034d` 2026-10-20 sodenr "Decode JC dashcam command response (#6084)" · `0745a8c22` 2026-10-19 tananaev
"Fix HLS segment timing and buffer lifecycle" · `3117f977a` 2026-10-19 tananaev "Support Firebase
registration ids" · `5bcd7dadb` 2026-10-18 tananaev "Add business calendar handler" · `bae35900e` 2026-10-18
"Add business trip property" · `92122e7b6` 2026-10-18 "Add business attribute" · `11024e6a5` 2026-10-18
xiaowu-iot "Check JT808 0xDA extension length (#6082)" · `d9e14b0cf` 2026-10-17 tananaev "Improve CSV
escaping in report exports" · `6ac19037e` 2026-10-17 tananaev "Add standard EV energy attributes".

**Open issues (2026 window):** [#6079](https://github.com/traccar/traccar/issues/6079) 2026-10-15
*"Feature: Generate and attach SBOM (CycloneDX) to releases"* — **the same supply-chain ask we already have
in CONSTRAINTS.md** · [#6073](https://github.com/traccar/traccar/issues/6073) 2026-10-12 (EGTS decoder) ·
[#6056](https://github.com/traccar/traccar/issues/6056) 2026-10-02 (custom alarm types) ·
[#6052](https://github.com/traccar/traccar/issues/6052) 2026-09-29 *"Battery level not present"* — **the
battery signal is exactly our ≤ 8 %/h budget** · [#6045](https://github.com/traccar/traccar/issues/6045)
2026-09-27 (GL200 / Queclink low-power alarm).

**Verdict:** **WATCH — the reference for T7.12 (dispatcher) and for the background-location/battery
pattern.** It is Apache-2.0, self-hostable, and it answers three questions our product must answer
without a vendor: how a background location service behaves on a phone, how geofences become
auto-arrivals (PARITY row 32), and how a trip report is produced from a GPS trace (PARITY row 39). It is
**not** a routing product and it is **not** a mobile app we would ship — it is a **server** and a
**reference**.

---
## 4. Benchmarks — offline tile storage, zoom/tilt smoothness, vector tile size, NZ routing accuracy, licence cost

**No eval set exists for this area, so no benchmark was run and none is claimed.**
`docs/squads/maps/eval/` does not exist; there is no pack in the repo, no style, and no measured frame
time. Every number below is **UNVERIFIED** and the measurement is named.

| # | Benchmark | Candidates | Metric | Target | Status | How we would measure it |
|---|---|---|---|---|---|---|
| M-B1 | **Offline tile storage** | PMTiles single file vs MBTiles vs a tiled cache | bytes on disk for the full Canterbury pack at z14–z17; bytes **resident** after a pan across Christchurch CBD; cold-read latency of a random tile from a local file | pack ≤ 50 MB; p95 tile read < 50 ms on a mid-range device; resident set ≤ 120 MB | **UNVERIFIED** — the only published number we have is the **planet** PMTiles at **139 013 292 063 bytes** (`build-metadata.protomaps.dev/builds.json`, read 2026-10-21), which tells us nothing about a city | `docs/squads/maps/eval/pack-matrix.md`: build `{z14…z17} × {basemap, basemap+courier-entrances} × {MBTiles, PMTiles, PMTiles+style-reduce}` from **the same** Geofabrik NZ extract, record the byte size and the SHA-256 of each artefact, then measure random-access read latency with `perfetto` on the CI emulator profile **and** on one mid-range Android device |
| M-B2 | **Zoom / tilt smoothness** | MapLibre Native 13.7.1 | frame time p50/p95 during a scripted z12→z17 pan across the CBD and a 60° tilt | 60 fps (16.7 ms) p95, no frame drop > 2 frames | **UNVERIFIED** — no `perfetto` trace exists in `docs/evidence/` | `docs/squads/maps/eval/frame-traces/`: a scripted camera path, recorded on the CI emulator profile and on one mid-range Android, with the tile source being the **local pack** (not the network) — the network case is a different benchmark |
| M-B3 | **Vector tile size** | Protomaps schema vs OpenMapTiles schema vs MLT | mean and p95 compressed bytes per tile at z17 for the same bbox; total pack bytes | the pack that satisfies M-B1 at the highest zoom that keeps courier layers | **UNVERIFIED** | the same build matrix as M-B1; record per-layer byte contributions so we can see what the courier layers actually cost |
| M-B4 | **Routing accuracy — NZ urban** | OSRM vs Valhalla vs GraphHopper | metres of route deviation between engines on **50 real Christchurch courier runs**, and stops "inside the correct driveway" | ≤ 10 m median deviation; ≥ 95 % of stops routed to the correct entrance | **UNVERIFIED** — no eval set exists | `docs/squads/maps/eval/christchurch/`: 50 real runs from the Address squad (coordinates only, no personal data), each run through all three engines with the same costing; a human checks the entrance on the screenshot. The metric is **deviation in metres on the road geometry**, not in travel time |
| M-B5 | **Routing accuracy — NZ rural** | same three engines | the same, on **20 rural Canterbury runs** (Selwyn, Waimakariri, Banks Peninsula) where the road class is thinner and the turn restrictions matter | ≤ 25 m median deviation; **zero** routes that are impossible on a sealed road | **UNVERIFIED** | the same harness with the rural bbox; **add a "sealed road only" profile**, because a courier van must not be sent down a forestry track |
| M-B6 | **Licence cost** | the whole stack | the money and the legal work each option creates | **NZ$0** for the shipped app, and no copyleft in the APK | **UNVERIFIED** (the commercial prices are not in the repos) | the commercial facts are published: Stadia Maps' paid plans **start at $20/month** (https://stadiamaps.com/faqs) and its ToS requires an active paid subscription for commercial use; MapTiler and Protomaps' hosted API are commercial too; the self-hosted route is $0 but costs our own build minutes. **The licence cost of the self-hosted route is the engineering time in M-B1** — that is the number to write down |
| M-B7 | **Pack build reproducibility** | `pmtiles extract` v1.31.2 | can two runs on different machines produce a byte-identical pack? | yes, or a recorded reason why not | **UNVERIFIED** | build twice with a pinned SHA-256 of the CLI and of the extract, compare the SHA-256 of the two archives; this is the evidence `docs/evidence/` wants |

**Why these six:** M-B1 and M-B3 decide whether D15 is achievable at all; M-B2 decides whether the map is
usable on a mounted phone; M-B4 and M-B5 decide whether a courier is sent down the wrong street (the
single worst thing this product can do); M-B6 decides the bill. The two **licence-cost** sub-numbers in
M-B6 are the only ones in this file that could be read without an experiment — and they are the reason
the decision in §6 is "self-host or stay free", never "use the free hosted tier".

## 5. What we are missing → rows for `docs/PARITY.md`

The CEO merges these. Every cell in the **Spoke (2026-10-20)** column is quoted or paraphrased from
`docs/study/spoke/TEARDOWN.md` (read 2026-10-21) — source IDs are given so the claim can be re-checked.
Where TEARDOWN says nothing, the cell is **empty**.

| # | Family | Feature | Status | Spoke (2026-10-20) | Our edge | Task |
|---|--------|---------|--------|----------|------|
| 1 | Offline maps | **Offline vector map for the whole of Canterbury**, read from a local file, working from the first launch with no internet | Planned (task) | no offline map of the driver's region and no offline tile product (S2, S10) | D15: the map is bundled and refreshed weekly on Wi-Fi — not a paid download | **T5** |
| 2 | Offline maps | **Weekly incremental tile refresh** (PMTiles v3 diffs) instead of a full re-download | Planned (task) | | the refresh is 1/50th of the traffic and works on a phone plan | **T5.5** |
| 3 | Offline maps | **Day, night and high-contrast-sun styles generated from one theme source** | Planned (task) | | D16: our own professional style, one source, three variants | **T5.1** |
| 4 | Offline maps | **Courier layers**: house numbers at z17, entrances, access restrictions | Planned (task) | | the map answers "which door", not just "which street" | **T5.2** |
| 5 | Offline maps | **Style-driven pack reduction** so the pack fits the 50 MB ceiling with the courier layers kept | Planned (task) | | the size ceiling is met without dropping the layers the job needs | **T5.3** |
| 6 | Offline maps | **Offline attribution**: "(c) OpenStreetMap contributors" + the ODbL notice, visible on the map **and** in ≥ 2 user-visible places, with links, working with no network | Planned (task) | | the licence is honoured in the one situation where the user has no internet to read it | **T5.4** |
| 7 | Offline maps | **LINZ parcel boundaries, address points, contours and aerial** as basemap layers | Planned (task) | | NZ-native data: OSM's NZ data is LINZ-derived under CC BY 4.0, so the source is first-party | **T4** + **T5.6** |
| 8 | Navigation | **In-app turn-by-turn with spoken guidance** (behind a flag) | Planned (task) | match - internal navigation powered by Google Maps; no turn-by-turn engine of their own (S6, S10) | voice-first: the assistant reads the door note on arrival; the screen is optional (D2) | **T7.7** (Ferrostar behind a flag) |
| 9 | Navigation | **Offline navigation in a dead spot** (routing inside the downloaded area with no signal) | Planned (task) | no offline navigation of their own (S6) | a courier in a rural gully still gets to the next stop | **T7.7** + **T5** |
| 10 | Navigation | **Vehicle profile in the router** (bike / scooter / car / small truck / large truck) | Planned (task) | match - Bicycle, Scooter, Car, Small Truck, Large Truck (S11) | the profile is learned per driver and per run | **T7.2** |
| 11 | Navigation | **Stop side of the road** (either / right only / left only), aware of NZ left-hand traffic | Planned (task) | match - the setting exists but is generic (S11) | a left-hand-traffic-aware default is an NZ-only opening | **T7.3** |
| 12 | Driver tools | **Satellite / aerial layer** for driveways and rural drop-offs | Planned (task) | match - a satellite layer toggle in the map view (S9) | the aerial download is optional, so the data cost stays with the user who wants it (D15) | **T5.6** |
| 13 | Earnings | **GPX / trace export** of the driven route for the IRD mileage logbook | Planned (task) | match - mileage logbook (S11) | the km come from the same trace the router used | **T7.11** |
| 14 | Tracking | **Geofence auto-arrival** driven by the map's own address and parcel data | Planned (task) | match - geofence arrival (S2, S10) | arrival triggers the **spoken** door memory | **T7.3** |
| 15 | Dispatch | **Self-hosted map + geocoder + routing for the web dashboard** (no key, no vendor bill) | Planned (task) | match - dispatcher dashboard with an interactive map (S9) | the same stack the driver app uses, so dispatch and driver see one map | **T7.12** |
| 16 | Offline maps | **A pack download manager with resume, a region list and progress** (the Organic Maps UX) | Planned (task) | | a 50 MB pack on a phone signal needs resume and a visible state | **T5.9** (new) |
| 17 | QA | **A measured pack-size + frame-time benchmark published with the decision** | Planned (task) | | the map claim is a measurement, not a promise | **T5.8** |
| 18 | Offline maps | **A map that stays correct when OSM changes** — a weekly rebuild with a diff, not a silent replacement | Planned (task) | | the pack updates without the driver re-downloading 50 MB | **T5.5** + **T7.1** |

**Task id note:** `T5` and `T4` exist in `docs/PARITY.md` and in `docs/KICKOFF_V3_EN.md`; `T5.1`–`T5.9` are
the sub-ids proposed by the sibling file `docs/research/2026/map-rendering-offline-tiles.md` and are reused
here so the two map files do not compete for numbers. The CEO owns the numbering.

---

## 6. Decision

1. **Renderer: KEEP `@maplibre/maplibre-react-native` and upgrade 11.3.7 → 11.5.0 (blocking).** The
   missed releases carry two Android ANR deadlocks, a camera NPE and an iOS heap-corruption fix. **No ADR
   needed — the locked position (MapLibre 11) is unchanged.**
2. **Offline container: ADOPT PMTiles v3** — the **specification is public domain**, so we may write our
   own reader; `protomaps/go-pmtiles` v1.31.2 is the build tool, pinned by SHA-256. The pack is read with
   `pmtiles://file://` (downloaded) and `pmtiles://asset://` (the in-APK city core).
3. **Style: ADOPT `protomaps/basemaps`** `styles/`, forked and **renamed** — BSD-3 code, **CC0 visual
   design** (so our own name is fine), ODbL data (OSM attribution mandatory), and **ESA WorldCover CC-BY
   4.0** for the landcover layer. Day, night and the high-contrast sun variant are **one theme source**
   (D16).
4. **Packs: we build them ourselves**, from the Geofabrik NZ extract, with a Planetiler profile
   (`--area=christchurch`) → `pmtiles extract` (bbox + zoom cap) → a style-driven reduction step. **The
   OSMF tile server is excluded by their own Tile Usage Policy**, which forbids offline use and bulk
   downloading — this is not a choice, it is a rule that applies to us.
5. **Fallback tiles: self-host, do not depend on a free hosted tier.** OpenFreeMap's ToS caps the hosted
   service at **3 000 tiles / 50 MB**; Protomaps' hosted API is free for non-commercial use only;
   Stadia and MapTiler require a paid commercial plan. For the **web dashboard** (T7.12), evaluate
   **headway** (Apache-2.0, one command, map + geocoder + directions) first and **openfreemap** second.
   **ADR proposal for the CEO:** if the dashboard's tile use ever exceeds the free terms, the fallback is
   a self-hosted Martin, not a paid plan.
6. **Routing: Valhalla (truck cost model, `/matrix`, `/trace_attributes`, `driving_side`) + GraphHopper
   (map-matching + instructions + CH matrix) + OSRM (fast matrix, Plan B).** This repeats the routing
   research file's conclusion; the map file adds only the **map-matching** and **instruction-engine**
   requirements, which are what the map needs.
7. **In-app turn-by-turn: ADOPT `stadiamaps/ferrostar` (BSD-3) behind a flag**, and keep the hand-off to
   Google / Apple / Waze as the default (PARITY row 22 stays *Skip*, with the flag as the exception). The
   SDK is BSD-3 and has a **React Native module**; **Stadia's hosted tiles are not free for commercial
   use**, so Ferrostar must be fed by **our own** router and **our own** style.
8. **Geocoding: Photon (Apache-2.0) server-side; LINZ FTS5 on the device** (D19 / T4). Nominatim and
   OpenRouteService are **GPL/AGPL** — clean-room only.
9. **Dispatcher + background location: study `traccar/traccar` (Apache-2.0)** for the geofence → auto-arrival
   behaviour, the foreground-service/battery pattern and the trip report. It is a reference, not a
   dependency.
10. **Attribution: adopt the Organic Maps formulation** — the credit visible **on the map** **and** in ≥ 2
    user-visible places, with **clickable links**, plus the ODbL notice, plus the LINZ CC BY 4.0 credit
    when LINZ data is in the pack, plus the ESA WorldCover credit if landcover ships. It must work with
    the device offline (T5.4).
11. **Clean-room only, never in the APK and never pointed at by a config:** Organic Maps, OsmAnd, Navit,
    Vela, KDE Marble, StreetComplete, Navitia, OpenRouteService, Nominatim, osmscout-server.
12. **The locked decisions are not changed by this research.** D15 (bundle the Canterbury map, weekly
    refresh on Wi-Fi, optional aerial), D16 (our own style), D19 (LINZ data on the founder's machine) and
    D17 (no keys to start) all stand. **One ADR proposal:** D16 says our style is *inspired by* Petal Maps
    and Apple Maps; this research says we should **build it on a generated style source** (Protomaps,
    CC0 design) so day/night/sun are one generator — that is an addition to D16, not a change to it, and
    it needs the CEO's signature.

## 7. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| The Canterbury pack exceeds 50 MB with the courier layers | **High** | Build it (M-B1); if it exceeds the ceiling, drop to z16 and lean on the style-driven reduction step, **not** on dropping the courier layers |
| The ODbL share-alike applies to our on-device cached tiles | **High** | **Legal question, UNVERIFIED.** We ship a renderer + a style + our own overlay and consume OSM-derived tiles on the device. Whether a cached tile set on a user's phone is a "Produced Work" is a question for counsel, not for us. Protomaps' own wording covers us if the attribution is visible |
| Attribution must be visible **offline** — a downloaded region may be the only map on screen | **High** | Attribution in the map footer **and** in About and the main menu, offline-capable, with links (T5.4); the Organic Maps formulation is the reference |
| We use a hosted tile service and hit its offline cap (3 000 tiles / 50 MB) | Medium | **Never** rely on a hosted tier for the pack; build it ourselves; self-host for the dashboard |
| Aerial imagery has a **different** LINZ attribution, and LINZ does not own that copyright | Medium | A separate credit string per layer; the aerial download stays optional (D15) |
| The OSM tile server is used by accident (e.g. a style's default source) | Medium | A CI check that no `tile.openstreetmap.org` / `*.tile.openstreetmap.org` URL appears in any style, pack script or config — the policy forbids our use of it |
| MapLibre Native's file-backed reader is young (PMTiles support since 11.7.0) | Medium | Test random access into a large archive on a mid-range device; pin the MapLibre Native version used in the eval |
| `maplibre-gl` CVE-2026-85061 (critical, CVSS 10.0) reaches the web dashboard | Medium | Pin `maplibre-gl >= 6.4.1`; never render untrusted attribution strings into a style |
| The iOS user-location crash (maplibre-native #4796) hits the driving screen | Medium | Test with a **zero-size** map view during location tracking in the Maestro flow; upgrade to 13.7.1 and check whether the fix is in |
| Valhalla / GraphHopper send a van down a forestry track (NZ rural) | Medium | A "sealed road only" costing profile and the M-B5 rural benchmark; a route the van cannot take is a failed delivery |
| A single-maintainer upstream (headway 1, openfreemap 1, go-pmtiles 1) | Medium | Pin exact versions + checksums; be ready to vendor the style generator |
| The OSM-based products we want to copy are copyleft | Medium | Clean-room list in §6; the CI licence gate already scans the bundle; `docs/LICENSES.md` records every exception |
| The prototype bucket is a **forestry track with a name**: a courier's whole day depends on one OSM tag | Medium | Door memory (T7.3) learns the real entrance from two deliveries, so a wrong OSM tag is corrected by use |

## 8. Monthly radar filter

| Watch | Trigger | Action |
|---|---|---|
| `maplibre/maplibre-react-native` | a release newer than 11.5.0, or a New-Arch/Expo-58 regression | bump the pin; re-run the Maestro flows; re-check the APK size |
| `maplibre/maplibre-native` | `android-v13.x` or `ios-v7.0.0` final | re-test `pmtiles://file://` and `pmtiles://asset://` in the eval |
| `protomaps/PMTiles` / `go-pmtiles` | a new major, or a fix to the open extract issues (#269, #276, #289, #288) | re-pin; re-run M-B7 |
| `protomaps/basemaps` | a new style release, a schema change, or the 1-maintainer risk changing | re-fork; re-run the style diff against the mockups |
| `maplibre/maplibre-tile-spec` (MLT) | a renderer that reads MLT | re-run M-B3; MLT may halve the pack |
| `hyperknot/openfreemap` | a change to the ToS, or a self-host release | re-read the offline clause; re-cost |
| `headwaymaps/headway` | a **release** (they have none), or a second maintainer | re-evaluate as the dashboard stack (T7.12) |
| `valhalla/valhalla` · `graphhopper/graphhopper` · `Project-OSRM/osrm-backend` | a release, or a change to the `driving_side` / truck-cost behaviour | re-pin; re-run M-B4 and M-B5 |
| `stadiamaps/ferrostar` | a release, or an RN module change for RN 0.88 | re-evaluate the flag |
| `komoot/photon` | a release | re-pin the geocoder |
| `traccar/traccar` | a release, or a change to the Android client's background-location behaviour | re-read the pattern for T7.1/T7.12 |
| `organicmaps/organicmaps` | a release, or a change to `DATA_LICENSE.txt` | re-read the attribution conditions; a change there changes our T5.4 copy |
| **OSMF** (operations.osmfoundation.org) | any change to the **Tile Usage Policy** or to the ODbL guidance | re-read; this is the rule that forbids us using their tiles |
| **LINZ** (linz.govt.nz) | a change to the attribution page, or a new Canterbury elevation/imagery layer | re-read the attribution; a 2026 Mackenzie LiDAR DEM for Canterbury is a candidate for the pack |
| `openstreetmap/iD` · `StreetComplete` | a tag-semantics change | re-check the courier layer tags |
| `mapbox/*` · `rnmapbox/maps` | any change that removes the per-MAU billing | **re-evaluate, but only with an ADR** — D17 (no keys) is a founder decision |

## 9. What we could not verify

- **The 6-month star trend for every candidate** — the star timeline is 403 with our token (re-verified
  2026-10-21). Proxies used: releases/6 m, commits/90 d, distinct human maintainers/90 d, npm downloads.
- **Every measurement in §4** — M-B1 to M-B7 are all **UNVERIFIED**. No pack was built, no APK was built,
  no route was run, no frame was traced. The only published pack number we have is the **planet** PMTiles
  at **139 013 292 063 bytes**; **no area/Canterbury artefact exists upstream**, so the 50 MB ceiling is
  an engineering target, not a fact.
- **The New Zealand routing accuracy** — M-B4 (urban) and M-B5 (rural) are unmeasured. **We do not know
  whether OSM's road geometry in Christchurch is good enough for a courier**, and we do not know the
  **left-hand-traffic** behaviour of each engine on NZ data beyond Valhalla's `driving_side` support.
- **Whether a cached on-device OSM tile set is a "Produced Work"** that must itself be ODbL-licensed —
  **a legal question, UNVERIFIED**, and it goes to the founder + counsel.
- **The commercial prices** for Stadia Maps, MapTiler and Protomaps' hosted API beyond what their public
  pages state on 2026-10-21 (Stadia's paid plans start at $20/month per its FAQ; the others quote
  "commercial use" without a published number on the pages we read). **Self-hosting cost** in engineering
  time is likewise unmeasured.
- **The licences read as NOASSERTION** — `maplibre/maplibre-gl-js` (BSD-3 in `LICENSE.txt`),
  `maplibre/maplibre-style-spec`, `protomaps/basemaps`, `protomaps/PMTiles`, `protomaps/go-pmtiles`,
  `hyperknot/openfreemap`, `openmaptiles/openmaptiles`, `maptiler/tileserver-gl`, `organicmaps/organicmaps`
  (root), `osmandapp/OsmAnd`, `navit-gps/navit`, `Framstag/libosmscout`, `maplibre/flutter-maplibre-gl`,
  `kde/marble` and `atlasdatatech/tiler` — for each, the **code** licence was confirmed only where the
  repo states it in a file we read (Protomaps' `LICENSE.md`/`LICENSE_DATA.md`, Organic Maps'
  `DATA_LICENSE.txt`, Ferrostar's `LICENSE.txt`, MapLibre GL JS's `LICENSE.txt`); the rest remain
  **UNVERIFIED** and must be read before any use.
- **The LINZ tile licence string** — the `linz/basemaps` repo is MIT (Crown/LINZ) but does not state the
  **tile** licence in-repo; we read LINZ's attribution pages instead, and the aerial/elevation credits are
  separate. **Read the LINZ Data Service terms before T4 relies on them.**
- **Whether the RN binding passes `pmtiles://file://` through unchanged** — the upstream example shows
  `pmtiles://https://` only. **Prove it in the eval before T5 closes.**
- **Whether `headway`'s build actually fits a 1 GB CI runner** — the project states 8 GB RAM and
  50–100 GB of disk for the build; we did not measure it.
- **Organic Maps' `.mwm` format** — we did not read the format, and under their `DATA_LICENSE.txt` we may
  not redistribute the files without attribution and may not white-label without written permission. The
  study is **UX-only**.
- **KDE Marble's licence in the GitHub mirror** — apps.kde.org states **LGPL-2.1-or-later**; the mirror's
  `LICENSE` is not machine-detectable and the canonical source is `invent.kde.org` (which returned HTTP
  501 to our fetch). **UNVERIFIED.**
- **The exact New Zealand OSM coverage quality** for **entrances** and **access restrictions** — the tags
  our courier layers depend on are community-validated and **spotty in NZ**; the extent is **UNVERIFIED**
  and is a T5.2 measurement.
