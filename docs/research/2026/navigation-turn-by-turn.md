# Navigation & turn-by-turn — 2026 OSS research

**Research date: 2026-10-20.** Method: V4 §12 (≥30 candidates, ≥10 shortlist, deep-review top 5,
benchmark top 2–3). Every number was read from the live GitHub API, npm, crates.io or the projects'
own docs on **2026-10-20**. Anything unread is **UNVERIFIED** with the command that would settle it.
Card format: `repo · stars(+trend proxy) · created · last release/date · cadence · issues ·
maintainers/90 d · licence · New-Arch/Expo 58/API 34 · on-device/server · advisories ·
production users · docs · CI · better than our choice · risks · DECISION`.

## 0. Scope, our current choice, and the bar

| Item | Today (verified 2026-10-20) |
|---|---|
| Turn-by-turn in the app | **none** — no navigation SDK, no route engine client, no instruction rendering |
| What we do have | `@maplibre/maplibre-react-native@11.3.7` (the map, not the nav), `expo-location ~58.0.17` (the position, not the route), `react-native-sherpa-onnx@0.4.4` (the voice, not the instruction) |
| V4 §11.1 item 1 | "**stadiamaps/ferrostar** — turn-by-turn + spoken guidance on Valhalla routes; **Expo native module**. Fallback: maplibre-navigation-android" |
| Squad target (`docs/squads/maps/README.md`) | 60 fps pan/zoom · full Canterbury offline · day/night styles; V4 §10.3 adds a "turn-by-turn flag" |
| Product requirement | hands-free driving: **voice prompts ≤ 8 words** (V4 §5), **never blocks driving**, offline-capable (V4 §6.5) |

Turn-by-turn is four separable pieces, and conflating them is the usual mistake: **(1) the
instruction engine** (route → ordered manoeuvres + voice text: OSRM/Valhalla/GraphHopper);
**(2) the client SDK** (the state machine that tracks progress, detects deviation and re-routes);
**(3) the map UI** (camera, puck, manoeuvre banner); **(4) the voice** (TTS of the instruction).
We already own (3) via MapLibre and (4) via sherpa-onnx. We need (1) and (2).

### 6-month star trend — method note

GitHub's stargazer listing is **not readable with the token in `.env.local`** (`GET
/repos/{o}/{r}/stargazers` and GraphQL `stargazers` both return `HTTP 403 Resource not accessible
by personal access token`; the token lacks `read:user`). **All 6-month star trends here are
UNVERIFIED.** Verifiable proxies used instead: **commits in the last 90 days**, **release cadence**,
and **npm / crates.io downloads**.

## Queries run

`gh search repos` via `scripts\gh.ps1`, 2026-10-20:

| # | Query | Sort | Notes |
|---|---|---|---|
| 1 | `turn-by-turn navigation` | stars | 25 — PimpinPumpkin/Vela 2072, mapbox/mapbox-navigation-ios 919, navit-gps/navit 668 … |
| 2 | `maplibre-navigation` | stars | 10 — maplibre/maplibre-navigation-android 213, -ios 67, -android-legacy 37 (**archived 2022**), graphhopper-navigation-example 42 |
| 3 | `offline navigation` | stars | 20 — khoa083/map-offline-navigation 12, Volans-Map 53 (dead), PocketMaps, … |
| 4 | `navigation android osrm` | stars | **0** (dead query) |
| 5 | `osrm` | stars | 12 — osrm-backend 8156, osrm-frontend 380, maplibre/maplibre-gl-directions 173 |
| 6 | `map matching` | stars | 15 — fmm 1059, graphhopper/map-matching 808, barefoot 693 (needed for the IRD km target) |
| 7 | `navigation engine` | stars | 15 (sweep; no OSS turn-by-turn engine) |
| 8 | `headless-js` / `lightning solver scheduling` | stars | 5 / 0 (cross-area sweep) |

Plus API reads: `repos/{o}/{r}`, `/releases`, `/contents/*` (incl. `common/ferrostar/src/**`),
`/commits?since=`, `/actions/runs`, `/license`, `search/code`, npm registry + downloads, crates.io
API, OSV, and Ferrostar's own mdbook guide (`guide/src/*.md`).

## 1. Candidate pool — 36 candidates, full evidence card each

### C1 — stadiamaps/ferrostar  ⭐ shortlist
**442 ★** /82 f · created 2023-04-27 · **last release 0.58.0, 2026-10-13** (109) · cadence **≈ weekly** (0.56.0 2026-09-15, 0.57.0 2026-09-22, 0.58.0 2026-10-13) · **312 open / 188 closed** · maintainers 90 d **9 distinct humans** (Ian Wagner ×9, ianthetechie ×5, Rafał Naniewicz ×3, Ben Trounson, T.Emu, eminmapme, Patrick Wolowicz, Michael, Michael Kirk, Jacob Fielding) + 17 dependabot commits → **the healthiest maintainer spread in this file** · **BSD-3-Clause** (verified from `LICENSE.txt`: 3-clause text, "Copyright (c) 2023, Stadia Maps, Inc.") · crate **`ferrostar` 0.58.0 on crates.io, updated 2026-10-13, 71,177 downloads** · npm `@stadiamaps/ferrostar` **0.58.0 (2026-10-13)** (the WASM/web build) · **New Architecture**: the RN layer is **JS over UniFFI bindings** (`react-native/uniffi/FerrostarRN.xcframework` + an Android UniFFI lib) → **New-Arch-compatible by construction** (no old-arch bridge) · **Expo SDK 58**: the guide says "an Expo app must use a **development build** … `npx expo prebuild`" → ✓ with our `expo-dev-client ~58.0.14` · **Android min API 25** (guide: "We currently support **API level 25** and higher … covers 96 % of Android users"; API < 26 needs Java-8 desugaring) → ✓ above the API-34 requirement · on-device (Rust core in the app) + server (the route provider is HTTP) · OSV n/a · production users: Stadia Maps' hosted API and the Mapbox-Navigation-fork lineage · docs: a full **mdbook guide** (`guide/src/`: getting-started for iOS/Android/**React Native**/Web/Rust, customisation, navigation behaviour, route providers, location providers, foreground service, CarPlay, Dynamic Island, Android Auto/Car App, session recording, architecture, testing) · CI: **Android CI, iOS CI, Rust (Common), WASM (JS), typos** — all green on 2026-10-20 **except iOS CI = failure** · **better than our choice**: a **hexagonal architecture** — a *pure, functional Rust core* (route/line models, request generation and response parsing, spatial algorithms, **the navigation state machine**) → UniFFI bindings → platform code (Swift/Kotlin) → RN; **routing adapters in the Rust core** (`routing_adapters/{valhalla.rs, graphhopper.rs, osrm/}`) built as **two halves**, `RouteRequestGenerator` + `RouteResponseParser`, so **one OSRM-compatible parser reads Valhalla's JSON/Protobuf/OSRM output, plain OSRM, GraphHopper in OSRM mode and the Mapbox Directions API**; **voice + banner instructions are parsed whenever available**; **deviation detection** (`deviation_detection.rs`) and **route simulation** (`simulation.rs`) live in the core; Android foreground service, **Android Auto / Car App**, CarPlay, Dynamic Island and session recording are all documented; an **in-tree RN package** (`react-native/` with `core`, `uniffi`, `maplibreui`, `example`) made usable in Sept 2026 ("[refactor] Make react native usable (#883)") · **risks (material)**: 🔴 **the RN packages are NOT published to npm** — the guide says `npm install @stadiamaps/ferrostar-uniffi- react-native @stadiamaps/ferrostar-core-react-native @stadiamaps/ferrostar-maplibre-react-native` and **all three return HTTP 404**, while `react-native/package.json` says `"private": true`; upstream issue **#961 "Publish React Native package to NPM" is OPEN since 2026-09-15** → adopting the RN path today means building from the monorepo (or vendoring it); the guide's own caveat that "the JavaScript platform presents some unique challenges, so only Valhalla backends are supported directly from the JavaScript API" makes it **UNVERIFIED** whether the RN layer inherits the native adapters; **iOS CI was failing**; open issues include real navigation bugs — **#969 "visualInstruction goes null on route deviation"**, **#967 "puck and camera freeze on routes that overlap themselves"**, **#968 "camera bearing follows a fixed 5 m/15 m route tangent with no smoothing"**, **#951 "Recalculation on arrival/route completion can leak a trip and navigation session/cache"**, **#991 "Driving side support" (open, 2026-10-20 — NZ drives on the LEFT!)** · **ADOPT (core + route adapters), but treat the RN package as a vendored/forked dependency until upstream publishes it.**
### C2 — maplibre/maplibre-navigation-android  ⭐ shortlist
**213 ★** /83 f · created 2019-10-29 · **last release 5.0.1, 2026-10-19** (26) · cadence **active** (2026-08-20 "Fix Notifications", 2026-10-15 "Rewrite MapLibreLocationEngine", 2026-10-16 "Fix crash by empty intersections", 2026-10-19 "Allow setIndex on stopped navigation") · 86 open / 67 closed · maintainers 90 d **2 humans** (Fabian Keunecke ×5, Peter ×2) + dependabot · **MIT** — README: "**100 % Open Source · MIT License · No Telemetry**" · Java/Kotlin, published on **Maven Central** · modules `maplibre-navigation-core` (KMP), `libandroid-navigation-core`, `libandroid-navigation-ui`, `maplibre-navigation-location-gms` · **uses MapLibre Native 13.6.1** · **AGP 9.4.0 / Kotlin 2.4.21** (current toolchain → API 34/35 era ✓) · on-device · docs: README + `CHANGELOG.md` + a demo app · CI: dependabot + build workflows · **better than our choice**: a **fork of the Mapbox Navigation SDK v0.19 with the closed component and the telemetry removed**, so it contains the **entire navigation state machine and instruction engine** Mapbox spent a decade on — instructions, route progress, off-route detection, voice handling — under MIT and with **no per-MAU billing and no API key** · risks: **Android-only** (the KMP conversion is "currently active working on"), so React Native needs a **TurboModule wrapper we write**; it needs a **Directions API** (GraphHopper in OSRM mode, or our Valhalla — the repo has a GraphHopper rerouting demo); 2 maintainers · **ADOPT-AS-FALLBACK (the V4 §11.1 fallback is valid and alive).**
### C3 — maplibre/maplibre-navigation-ios
**67 ★** /47 f · created 2023-01-13 · **last release 4.1.1, 2026-08-03** (13) · pushed 2026-10-13 · 47 open / 24 closed · NOASSERTION licence file · Swift · **WATCH** (iOS is not the launch platform; NZ couriers are on Android first).
### C4 — maplibre/maplibre-navigation-android-legacy
**37 ★** · **ARCHIVED** (last push 2022-02-22) · MIT · **REJECT (archived)** — but note the *main* repo (C2) is **not** archived, so the V4 "fallback" claim still holds.
### C5 — graphhopper/graphhopper  ⭐ shortlist (routing/instruction engine)
**6,737 ★** /1,961 f · created 2012-02-18 · **last release 11.1, 2026-09-29** (47) · cadence ≈ quarterly · 1,703 open / 1,511 closed · maintainers 90 d **5** (Peter ×63, ratrun ×4, easbar ×3) · **Apache-2.0** · Java server · **an in-tree `navigation/` module** (route → instructions → voice) and a **`map-matching/` module** (HMM) · OSV n/a · production users: graphhopper.com (the commercial hosted API; the core is free) · docs: versioned per release (11.x), `CHANGELOG.md` tracks Java API changes · CI: Build and Test + Publish + a **"Trigger Benchmarks"** workflow · **better than our choice**: the **only mature engine that gives routing + map-matching + a navigation instruction engine in one Apache-2.0 codebase**, and its **OSRM-compatible output mode** is directly parseable by Ferrostar's `osrm/` adapter; `graphhopper-navigation-example` shows the MapLibre-Android combination · risks: Java service; quarterly releases; the commercial Directions API is the paid product · **ADOPT (instruction engine behind Ferrostar, or directly if we drop Ferrostar).**
### C6 — valhalla/valhalla  ⭐ shortlist
**6,343 ★** /1,010 f · created 2016-01-19 · **last release 3.9.1, 2026-10-06** (68) · cadence ≈ monthly · 2,850 open / 2,026 closed · maintainers 90 d **5+** · **MIT** (`COPYING`) · C++ server + `libvalhalla` + `valhalla_service` (on-device) · endpoints `/route`, `/matrix`, `/isochrone`, `/locate`, `/tile`, **`/trace_attributes`**, `/status`, `/optimized_route` · **better than our choice**: the best **truck** cost model (height/width/weight, surface, access restrictions, `destonly` zones) → the courier's "no entry at the back lane" reality; **voice + banner instructions are supported by Valhalla directly** (Ferrostar's guide says so) and are parsed by Ferrostar's OSRM-compatible parser · risks: 2,850 open issues; the Python bindings are stale (PyPI `valhalla` 0.1.4 = 2014) · **ADOPT (route provider) — this is what Ferrostar's `valhalla.rs` adapter talks to.**
### C7 — Project-OSRM/osrm-backend
**8,156 ★** /3,978 f · created 2011-09-22 · **last release v26.10.0, 2026-10-01** (46) · cadence ≈ monthly · 4,784 open / 4,428 closed · **BSD-2-Clause** · the fastest OSM router, the de-facto `/route` + `/match` API · **better**: the fastest matrix; the OSRM response format is the **lingua franca** that Ferrostar, the Mapbox SDKs, GraphHopper-in-OSRM-mode and Valhalla's OSRM serializer all speak · risks: **car profile only** (no truck cost model, no time windows, no instructions beyond `steps`); 4,784 open issues · **KEEP (Plan-B route provider + matrix).**
### C8 — Project-OSRM/osrm-text-instructions
**107 ★** /65 f · created 2016-09-02 · **pushed 2026-10-17** · **0 GitHub releases** · 119 open / 80 closed · **BSD-2-Clause** · the **turn-by-turn phrase library** (instruction code → English text, with translations) · **better than our choice**: the **reference phrasing** for OSRM instructions and its translations — exactly the source for "voice prompts ≤ 8 words" and for the NZ English wording · risks: no releases (the data lives in the repo, not in a package); car-oriented phrasing · **KEEP (copy-reference for our own prompt text — BSD-2 allows copying with attribution).**
### C9 — mapbox/mapbox-navigation-ios
**919 ★** /329 f · created 2016-11-16 · **last release 3.33.0, 2026-10-16** (420) · 1,875 open / 1,667 closed · **NOASSERTION** — the Mapbox Navigation SDK is **proprietary**: account, per-MAU billing and a token · **better**: the best turn-by-turn UX in existence (and the ancestor of C2) · risks: proprietary licence, per-MAU cost, token required, telemetry · **REJECT (commercial; C2 is its open fork).**
### C10 — PimpinPumpkin/Vela  ⭐ shortlist → clean-room
**2,072 ★** /104 f · **created 2026-06-15** · **last release v0.5.2621, 2026-10-19** (505) · cadence **several releases per day** · 325 open / 275 closed · **GPL-3.0** · Kotlin · "Maps and turn-by-turn navigation for Android without Google Play Services: the best of open map data, with Google lookups by choice. Runs on degoogled phones and can avoid Flock cameras" · **better than our choice**: the **most important 2026 newcomer** in this area — a complete, actively developed OSM-based nav stack for Android shipping 500+ releases in 4 months; its release cadence alone teaches us what "production nav" demands · risks: **GPL-3.0 → we may study it but must never copy its code** (V4 §11.2); single-ish maintainer; no iOS · **CLEAN-ROOM STUDY ONLY.** Read it to extract the *feature list* (glanceable HUD, speech, re-route UX, map layers) into `docs/study/vela/SPEC.md` — never into our repo.
### C11 — navit-gps/navit
**668 ★** /187 f · created 2015-02-14 · **last release v0.5.7, 2026-02-08** (17) · pushed 2026-10-20 · 529 open / 341 closed · **NOASSERTION — the repo says "open source (GPL v2)"** · C · a full TBT nav app with routing engine, voice and maps · **better**: a decades-mature, complete nav feature inventory (route profiles, waypoints, voice languages, map styles) · risks: **GPL-2 → clean-room only**; C codebase · **CLEAN-ROOM STUDY ONLY (feature inventory).**
### C12 — osmandapp/OsmAnd
**6,097 ★** /1,247 f · created 2011-01-15 · pushed 2026-10-20 · **1 GitHub release** (2.0.0, 2019-10-15 — they ship through Play Store/F-Droid, so **the release history is not on GitHub**; cadence UNVERIFIED) · **14,616 open / 11,298 closed** · NOASSERTION → **GPL-3.0** · **better**: the most complete FOSS nav product (offline maps, routing profiles, plugins, street level, own-coordinates) · risks: GPL-3 → clean-room only; enormous issue backlog · **CLEAN-ROOM STUDY ONLY (offline-map UX and plugin model).**
### C13 — hove-io/navitia
**457 ★** /130 f · created 2013-06-19 · **last release v15.119.0, 2026-10-05** (161) · 173 open / 135 closed · **AGPL-3.0** · Python · transit-first routing + **journey planning** with multi-modal itineraries · **better**: the reference for **multi-leg itinerary planning** (relevant if we ever plan "parcel → depot → parcel") · risks: AGPL → clean-room only · **CLEAN-ROOM STUDY ONLY.**
### C14 — mapsforge/mapsforge
**1,416 ★** /403 f · created 2014-11-06 · **last release 0.30.0, 2026-08-20** (16) · 1,100 open / 1,096 closed · **LGPL-3.0** · Java · offline map rendering + routing · **REJECT** (LGPL is not on our allow-list; MapLibre + PMTiles beats it).
### C15 — Framstag/libosmscout
**305 ★** /88 f · created 2015-08-31 · last release **v2024.06.02.1, 2024-06-02** (5) · 420 open / 381 closed · NOASSERTION (**LGPL-3**) · C++ · offline rendering + routing + location · **REJECT** (LGPL + 2-year release gap).
### C16 — cyang-kth/fmm
**1,059 ★** /227 f · created 2017-10-27 · **last push 2024-07-09** · **0 releases** · 227 open / 185 closed · **Apache-2.0** · C++ · **Fast Map Matching** — the reference HMM map-matching implementation with the academic papers · **better**: the algorithm behind the **IRD logbook km** and per-segment speed learning — matching a GPS trace to the road network gives real distance, not straight-line · risks: unmaintained since 2024; research code · **WATCH (algorithm reference; prefer GraphHopper's or Valhalla's production map-matching).**
### C17 — bmwcarit/barefoot
**693 ★** /185 f · created 2014-06-05 · **last push 2023-04-14** · 128 open / 86 closed · **Apache-2.0** · Java · HMM map matching for "integrating the map into software and services" · **WATCH (reference; stale).**
### C18 — bmwcarit/offline-map-matching
**126 ★** · "Matches a sequence of GPS coordinates to road segments" · **WATCH.**
### C19 — ad-freiburg/pfaedle
**294 ★** /40 f · created 2018-06-12 · pushed 2026-07-24 · 53 open / 44 closed · **GPL-3.0** · precise map-matching for public transit feeds · **REJECT (GPL + transit-specific).**
### C20 — mapbox/mapbox-directions-swift
**206 ★** /98 f · created 2014-12-04 · **last release v2.15.0, 2026-08-25** (139) · 253 open / 221 closed · **ISC** · Swift · traffic-aware directions and map matching · **better**: a clean, well-typed client for the Mapbox Directions API — **but it needs a Mapbox token** · **REJECT (token + proprietary data).**
### C21 — maplibre/maplibre-gl-directions
**173 ★** /19 f · created 2022-04-06 · **last release v0.10.1, 2026-09-22** (32) · pushed 2026-10-12 · 51 open / 49 closed · **MIT** · TypeScript · a directions plugin for MapLibre GL JS (web only) · **WATCH (web dashboard only).**
### C22 — react-native-maps/react-native-maps
**16,010 ★** /4,965 f · last release **v1.29.11, 2026-09-27** · 4,147 open / 4,093 closed · **MIT** · **4,865,540 npm downloads/month** · **REJECT** (Google/Apple Maps → proprietary data, no offline vector tiles, no control of the style, no FOSS route engine).
### C23 — bramus/react-native-maps-directions
**1,280 ★** /208 f · created 2017-11-19 · **last push 2024-06-11** · 169 open / 116 closed · MIT · a directions component for `react-native-maps` · **REJECT** (depends on C22 + the Google Directions API).
### C24 — homeeondemand/react-native-mapbox-navigation
**177 ★** /130 f · created 2020-11-02 · **last push 2024-08-13** · last release 2.0.0 (2022-02-03) · 107 open / 39 closed · MIT · a nav UI for RN, but it wraps the **proprietary Mapbox SDK** · **REJECT (proprietary dependency + stale).**
### C25 — pawan-pk/react-native-mapbox-navigation
**49 ★** /42 f · created 2024-07-08 · last push 2025-07-27 · MIT · same problem · **REJECT.**
### C26 — flyandi/react-native-maps-navigation
**140 ★** /53 f · created 2018-07-14 · **last push 2022-12-28** · **NO-LICENSE** · **REJECT (no licence + stale).**
### C27 — khoa083/map-offline-navigation
**12 ★** /1 f · created 2026-03-10 · pushed 2026-10-01 · 13 open / 1 closed · **GPL-3.0** · Kotlin · "Kblack: Offline Android navigation with GraphHopper & MapLibre" · **better**: it is **exactly our stack** (GraphHopper + MapLibre, offline) in 2026 — a *composition* proof, not a product · risks: GPL-3; 12 stars; one developer · **CLEAN-ROOM STUDY ONLY** (but read it first — it may contain the exact Gradle wiring we need for GraphHopper-in-Android).
### C28 — roadstrapp/roadstr-app
**9 ★** · **created 2026-06-27** · **last release v1.2.0, 2026-10-18** (48) · NOASSERTION · Kotlin · an open-source decentralised navigation app · **WATCH (too small to trust).**
### C29 — igalmarino/vialix
**3 ★** · created 2026-09-05 · **GPL-3.0** · "Open-source turn-by-turn navigation for Android, built entirely on open data" · **REJECT (GPL, 3 stars).**
### C30 — maplibre/maplibre-native (the renderer behind the nav UI)
**2,275 ★** · **BSD-2-Clause** · **weekly releases** (android-v13.7.1 2026-10-15, globe builds 2026-10-19) · 1,536 open / 1,014 closed · **2026 features that matter for nav**: globe projection, the **experimental C plugin API for custom style layer types** (an n-gon layer example), `globalState` expressions, rendered-feature introspection · **KEEP (already ours) — the C plugin API is the escape hatch if we need a custom "delivery zone" overlay layer.**
### C31 — k2-fsa/sherpa-onnx + XDcobra/react-native-sherpa-onnx (the voice)
**15,394 ★** /1,801 f · **last release v1.13.8, 2026-09-10** (192) · Apache-2.0 · **11 human maintainers in 90 d** (Ian Wagner ×9, ianthetechie ×5 + others) · the RN wrapper **`XDcobra/react-native-sherpa-onnx`**: **41 ★**, **MIT**, created 2026-01-25, **59 releases**, latest **v0.4.4 (2026-09-08)** — **exactly the version we already pin** (0.4.4) · npm downloads 19,638/month · **better**: on-device TTS means the **spoken guidance works with no network** (V4 §6.5) and no per-character cost · risks: a 41-★ wrapper with 2 watchers; model assets must be shipped (size vs the 80 MB APK budget) · **KEEP (already adopted) — and use it for the spoken instructions.**
### C32 — rhasspy/piper
**11,302 ★** /1,096 f · created 2023-01-10 · **ARCHIVED** · pushed 2025-08-26 · **last release 2023.11.14-2 (2023-11-14)** · MIT · **REJECT (archived).**
### C33 — OHF-Voice/piper1-gpl
**5,929 ★** /575 f · created 2025-03-28 · **last release v1.8.0, 2026-09-04** · **GPL-3.0** · the maintained Piper successor · **better**: better NZ English voices and much better CPU performance · risks: **GPL-3.0 → we cannot embed it in the APK** (`CONSTRAINTS.md`: no GPL in the shipped app); running it as a separate service is a different (and cloud) proposition · **REJECT for the bundle (GPL) — sherpa-onnx covers on-device TTS under Apache-2.0.**
### C34 — hexgrad/kokoro
**9,511 ★** /1,058 f · created 2025-01-10 · pushed 2025-08-06 · **0 GitHub releases** · **Apache-2.0** · the models live on Hugging Face, not in the repo · **better**: a very small, high-quality 82 M TTS model — attractive for the APK size budget · risks: no releases (pin a model revision); Python-first (needs ONNX conversion for the device) · **WATCH (size comparison against sherpa-onnx voices for the 80 MB APK budget).**
### C35 — coqui-ai/TTS (46,139 ★, MPL-2.0, pushed 2024-08-16, last release v0.22.0 2023-12-12) ·
**myshell-ai/MeloTTS** (7,682 ★, MIT, pushed 2024-12-24) · **SWivid/F5-TTS** (15,427 ★, MIT, pushed 2026-10-14, last release 1.1.22 2026-07-23) · **REJECT** (all are Python/server-side; they would break the "on-device, no audio leaves the phone" privacy promise, V4 §7).
### C36 — Project-OSRM/osrm-frontend (380 ★, BSD-2-Clause, pushed 2026-10-18) + osrm.js (69 ★,
2018) + osrm-text-instructions.swift (15 ★) / .java (13 ★) · **KEEP (osrm-frontend as a dev tool; the Swift/Java instruction ports as reference implementations of the phrase model).**
## 2. Shortlist (12) with decisions

| # | Project | Decision | One-line reason |
|---|---|---|---|
| C1 | **stadiamaps/ferrostar** | **ADOPT (core)** | BSD-3, weekly releases, 9 maintainers, 71 k crates.io downloads, a pure Rust core with Valhalla/OSRM/GraphHopper adapters and the navigation state machine. |
| C6 | **valhalla/valhalla** | **ADOPT (route provider)** | MIT, monthly, the truck cost model and OSRM-format output Ferrostar parses. |
| C5 | **graphhopper/graphhopper** | **ADOPT (instruction engine)** | Apache-2.0, routing + HMM map-matching + instruction engine in one codebase. |
| C2 | **maplibre/maplibre-navigation-android** | **ADOPT-AS-FALLBACK** | MIT, telemetry-free Mapbox-Nav fork with the full navigation engine — but Android-only, so it needs our TurboModule. |
| C8 | **Project-OSRM/osrm-text-instructions** | **KEEP** | BSD-2 phrase library — the reference for our ≤ 8-word voice prompts. |
| C7 | **Project-OSRM/osrm-backend** | **KEEP** | Fastest matrix; the OSRM format everyone speaks. |
| C31 | **k2-fsa/sherpa-onnx** + `XDcobra/react-native-sherpa-onnx` | **KEEP (already adopted)** | Apache-2.0 on-device TTS → spoken guidance works offline. |
| C30 | **maplibre/maplibre-native** | **KEEP (already ours)** | The renderer; the 2026 C plugin API is our overlay escape hatch. |
| C21 | **maplibre/maplibre-gl-directions** | **WATCH** | Web-only directions plugin. |
| C16 | **cyang-kth/fmm** | **WATCH** | The map-matching algorithm reference for IRD km. |
| C34 | **hexgrad/kokoro** | **WATCH** | Small high-quality TTS model; size comparison for the APK budget. |
| C10–C13, C19, C27, C29 | Vela · navit · OsmAnd · navitia · pfaedle · khoa083 · vialix | **CLEAN-ROOM STUDY ONLY** | GPL/AGPL — capture the *behaviour* in `docs/study/<project>/SPEC.md`, never the code (V4 §11.2). |

## 3. Deep review — top 5

**3.1 stadiamaps/ferrostar** — *Architecture* (`guide/src/architecture.md`): `Core (Rust,
pure/functional)` → `UniFFI bindings (Swift/Kotlin)` → `platform code (Swift/Kotlin: state, UI,
sensors, networking)` → `React Native` (JS over the same bindings). "As much as possible, we try to
keep the API similar across platforms." *Rust core contents* (`common/ferrostar/src/`): `models.rs`,
`algorithms.rs`, **`deviation_detection.rs`**, **`simulation.rs`**, `navigation_controller/`,
`navigation_session/`, `routing_adapters/{valhalla.rs, graphhopper.rs, osrm/}`, `snapshots/`,
`proptest-regressions/` → **property-based testing and snapshot tests are present**, a strong quality
signal for a state machine. *Route-provider design*: `RouteAdapter` = `RouteRequestGenerator` +
`RouteResponseParser`; the **OSRM-compatible response parser handles every OSRM-ish API**, including
**Valhalla's OSRM serializer**, GraphHopper in OSRM mode and Mapbox Directions; voice and banner
instructions are parsed whenever present → **we can self-host Valhalla and change nothing in the
client**. *Voice*: the `SpokenInstructionObserver` has configurable audio-session management (issue
#960 made it opt-out); combined with sherpa-onnx we can speak the instruction ourselves. *RN reality
check*: `react-native/` has `core`, `uniffi` (`FerrostarRN.xcframework`, a podspec,
`ubrn.config.yaml`), `maplibreui` and `example`; the package is **`"private": true`** and the three
documented npm names **404**; upstream issue #961 is open. *Open issues that matter for a NZ courier*:
**#991 "Driving side support"** (left-hand driving!) is **open and brand new**; #969 (visual
instruction null on deviation), #967 (puck/camera freeze on self-overlapping routes), #951
(session/cache leak on recalculation). *Verdict*: the best-engineered option and the one V4 already
chose; the *packaging* is the problem, not the software.

**3.2 maplibre/maplibre-navigation-android** — *Lineage*: forked from the **Mapbox Navigation SDK
v0.19**; the README lists exactly what they removed — the closed-source component, the telemetry, the
per-MAU billing and the API-key requirement. "All issues are covered with this SDK." *Scope*: the
**UI was removed** so the library is *logic only*: routing, instructions, route progress, off-route
handling and the `NavigationRoute` request interceptor. *Structure*: `maplibre-navigation-core` (KMP in
progress), `libandroid-navigation-core`, `libandroid-navigation-ui`,
`maplibre-navigation-location-gms`; published to **Maven Central**; on MapLibre Native **13.6.1**;
AGP 9.4.0 / Kotlin 2.4.21 (current toolchain, so **API 34/35**). *Activity*: release **5.0.1 on
2026-10-19**, including "Rewrite MapLibreLocationEngine (#247)" and "Fix crash by empty intersections
(#261)" — real navigation bugs fixed weekly. *Ergonomics for us*: it needs a **Directions API**
(GraphHopper OSRM mode or our Valhalla); the repo contains a GraphHopper rerouting demo; the RN
binding is **ours to write** (a TurboModule over `libandroid-navigation-core`). *Verdict*: the best
fallback, and a viable **primary for Android only** if Ferrostar's RN packaging does not land.

**3.3 graphhopper** — *What it is*: a Java library *and* a standalone web server that computes
distance, time, **turn-by-turn instructions** and road attributes; beyond A-to-B it does **snap-to-road
(map matching)**, isochrones, **mobile navigation** and more. *Module layout*: `core/`,
`map-matching/`, `navigation/`, `reader-gtfs/`, `web-api/`, `web-bundle/`, `client-hc/`,
`benchmark/`. The `navigation/` module is the instruction engine. *Benchmarks in CI*: a dedicated
**"Trigger Benchmarks"** workflow plus a `benchmark/` module — we should mirror this in our own
harness. *Ergonomics*: a YAML `config.yml` drives the whole server; the Java API is versioned and the
`CHANGELOG.md` tracks API changes; the **OSRM-compatible output mode** makes it consumable by
Ferrostar and by the MapLibre Navigation SDK. *Verdict*: adopt as the route/voice-instruction provider
behind Ferrostar (or directly).

**3.4 valhalla** — *Why it earns its place*: the **truck** cost model (height/width/weight, surface,
access, `destonly`, `emergency only`) is the only candidate that models a courier van's constraints;
plus `trace_attributes` for the IRD logbook, `/matrix` for the VRP, `/isochrone`. *2026 activity*:
3.9.1 (2026-10-06) with `stop_impact` added to `trace_attributes`, a new `steps_factor` bicycle
costing option, `allow` for `linear_cost_factors`, tzdb 2026e. *Ergonomics*: HTTP JSON or Protobuf;
`valhalla_service` for on-device; **OSRM serializer** so Ferrostar's parser can read it. *Engineering*:
`SECURITY.md`, `codecov.yml`, `.clang-tidy`, pre-commit, a pinned timezone-db artifact, and an explicit
**AI-contribution policy** (human-written PR descriptions; contrarian AI code is rewritten); 5+
maintainers, ~82 commits/90 d. *Verdict*: the route provider for Ferrostar.

**3.5 sherpa-onnx + the RN wrapper** — *Upstream*: `k2-fsa/sherpa-onnx` — **15,394 ★**, Apache-2.0,
**192 releases**, **11 human maintainers in 90 days**, v1.13.8 (2026-09-10). *Wrapper*:
`XDcobra/react-native-sherpa-onnx` — **MIT**, created 2026-01-25, **59 releases**, v0.4.4 (2026-09-08),
built against RN 0.83-style tooling; **we already pin 0.4.4** — the voice side of turn-by-turn is
*already solved*. *Why it matters*: spoken guidance must work **offline** (V4 §6.5) and must not send
audio to a provider (V4 §7); on-device TTS is the only way to keep both promises. *Verdict*: keep; the
remaining work is the *instruction text* and the *trigger logic*, not the synthesiser.

## 4. Benchmarks — top 3

**I did not run a navigation benchmark.** There is no navigation eval set in the repo
(`docs/squads/maps/benchmarks/README.md`: "Harness: _to be created with the first implementation_"),
there is no nav squad, and a turn-by-turn benchmark needs a real device, a driven route and a human.
Everything below is **UNVERIFIED** with the set that must be built.

**The set that must be built — `docs/squads/maps/eval/nav/`:**
1. **`routes/` — a fixed route corpus.** 10 Christchurch routes (5 urban, 3 motorway, 2 rural), each a
   **GeoJSON linestring** + the expected manoeuvre list; the **public OSRM demo server** as the neutral
   geometry generator, then hand-annotate the expected turn sequence.
2. **`trace/` — replayed GPS traces.** The same routes with realistic noise: 5 Hz, urban-canyon
   multipath, tunnel dropouts, 30 s stops, and one deliberate **off-route** deviation.
3. **`expected/` — the golden files.** Ordered manoeuvres, distance-to-manoeuvre, instruction text and
   the expected voice utterance for each.
4. **`harness/` — the runner.** Feed the trace to the SDK at 1 Hz (simulated) and record:
   **instruction accuracy** (% of manoeuvres announced correctly and in order); **announcement timing**
   (seconds before the manoeuvre — target 5–15 s, never late); **re-route correctness** (after the
   deliberate deviation, the new route announced within X s); **voice latency** (instruction → audio
   out, target ≤ 700 ms on-device, V4 §6.4); **offline behaviour** (the whole run with the radio off);
   **battery** (see `background-location-battery.md` §4, ≤ 8 %/h, shared harness).
5. **`compat/` — provider matrix.** The same route rendered from **our Valhalla**, **our GraphHopper**
   and **OSRM**, so the instruction-text differences are visible — this is where "≤ 8 words" gets
   enforced.

| Metric | Gate | Source |
|---|---|---|
| Manoeuvre sequence correctness | **≥ 99 %** on the 10-route corpus | our harness vs `expected/` |
| Voice prompt length | **≤ 8 words** while driving | lint on the instruction strings (V4 §5) |
| Voice latency (instruction → audio) | **≤ 700 ms** | on-device timing |
| Re-route after deviation | correct new route announced within **≤ 10 s** | our harness |
| Offline | **100 %** of the above with the radio off | our harness |
| Battery while navigating | **≤ 8 %/h** | shared battery harness |
| Frame rate | **60 fps** during camera follow | perfetto traces (maps eval set) |

**The reference set that already exists (control):** `maplibre/maplibre-navigation-android`'s `sample/`
app and its GraphHopper rerouting demo; `graphhopper/graphhopper-navigation-example` (42 ★, MIT, pushed
2026-05-26); the **OSRM demo server** (`router.project-osrm.org`) for neutral reference geometry; and
Ferrostar's own `simulation.rs` + `test_utils.rs` + snapshot tests in the Rust core — a ready-made
pattern for headless navigation testing.

## 5. Decision

1. **ADOPT Ferrostar's core** (the Rust crate, BSD-3) as the navigation engine, driven by **our own
   self-hosted Valhalla** through the `valhalla.rs` adapter, with **GraphHopper** as the second
   adapter (and the source of the instruction text we will trim to ≤ 8 words).
2. **Fork/vendor `react-native/ferrostar` into the repo** until upstream publishes the three npm
   packages (issue #961). Budget the UniFFI build into the Expo prebuild pipeline (`npx expo prebuild`
   + the `build-android.ps1`/`build-ios.sh` scripts that ship in the repo). **Re-evaluate monthly**;
   if it publishes, switch to the published packages.
3. **The voice layer is done**: sherpa-onnx 0.4.4 (already pinned) speaks the instruction offline;
   Ferrostar's `SpokenInstructionObserver` gives us the trigger and the audio-session control.
4. **Fallback**: `maplibre/maplibre-navigation-android` (MIT, telemetry-free) if Ferrostar's RN
   packaging slips — we would write the TurboModule ourselves.
5. **Do not build our own navigation state machine.** Ferrostar's Rust core already has deviation
   detection, simulation and property-based tests; that is a year of work we should not repeat.

## 6. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| 🔴 **Ferrostar's RN packages are not on npm** (#961 open) | **High** | Vendor the `react-native/` workspace from the monorepo at a pinned commit; automate the vendoring with a script + checksum; re-check monthly. |
| 🔴 **Ferrostar issue #991 "Driving side support" is OPEN** (2026-10-20) — NZ drives on the **left** | **High** | **Block release on this**: either upstream fixes it or we patch the fork. Add a left-hand-driving route to the nav eval corpus **before** we write any UI. |
| **iOS CI failing** on Ferrostar (2026-10-20) | Medium | We ship Android first; track the CI status in the monthly radar; do not depend on the iOS path in v1.0.0. |
| **Open Ferrostar bugs that hit a courier**: #969 (visual instruction null on deviation), #967 (puck/camera freeze on self-overlapping routes), #951 (session/cache leak on recalculation) | Medium | Reproduce each in our harness; pin the version where they are fixed; keep the fallback path viable. |
| **Voice prompt length > 8 words** | Medium | Post-process every instruction string through our own `shortenInstruction()` in `packages/` (pure, testable) — never trust the provider's wording. |
| Route provider API cost/latency | Medium | Self-host Valhalla (MIT) — no per-call cost; cache matrices for the VRP. |
| **OSM/ODbL attribution** in the nav UI | Medium | "© OpenStreetMap contributors" must be visible on the map, offline. |
| No API key ⇒ no traffic data | Low | Traffic is a paid add-on everywhere; our differentiator is *offline + voice*, not live traffic. |
| TTS model size vs the 80 MB APK budget | Low | sherpa-onnx models are small; measure and pick one voice (NZ English) only. |
| GPL/AGPL contamination | High | Ferrostar is BSD-3 ✓. **Vela / navit / OsmAnd / navitia / pfaedle are GPL/AGPL → clean-room study only**, never in the repo, never in the APK. |

## 7. What I could not verify

* **6-month star trend** — blocked by token scope (no `read:user`); proxies used instead.
* **Median issue-response time** — not computed.
* **Whether the RN layer of Ferrostar inherits the native route adapters** (the guide says the
  *JavaScript platform* only supports Valhalla) — **UNVERIFIED**. Settle it by reading
  `react-native/core/src` and by running the RN example against our Valhalla.
* **Whether `react-native/maplibreui` is compatible with our pinned
  `@maplibre/maplibre-react-native@11.3.7`** — the Ferrostar RN workspace has its own `maplibreui`
  workspace with its own MapLibre version. **UNVERIFIED**; check `react-native/maplibreui/package.json`.
* **The RN example app's Expo SDK** — issue #947 is titled "**Expo SDK 57**: CocoaPods notes from
  wrapping FerrostarCore (no SPM)" → the upstream example targets **SDK 57**, ours is **58**.
  Compatibility **UNVERIFIED**; this is the concrete work item for the vendoring.
* **Valhalla's and GraphHopper's instruction-text quality for NZ left-hand driving** — no measurement.
* **Whether OSRM's instruction library is complete enough to copy from** (BSD-2 allows it) — the repo
  has no releases; the data lives in the tree.
* **npm download counts for Ferrostar's RN packages** — they do not exist, so there is no number.
* **Whether `kokoro`'s model revision** can be pinned and converted to on-device ONNX within the APK
  budget — UNVERIFIED.

## 8. Corrections to the V4 §11.1 adopt list (navigation-related)

| V4 §11.1 item | Verified reality on 2026-10-20 | Correction |
|---|---|---|
| 1. **stadiamaps/ferrostar** — "turn-by-turn + spoken guidance on Valhalla routes; Expo native module" | 442 ★, **BSD-3-Clause** ✓, weekly releases (0.58.0 2026-10-13), 9 maintainers/90 d, crates.io `ferrostar` 0.58.0 (71,177 downloads) | ✅ **keep — but two material corrections: (a) the RN packages are NOT published to npm** (`react-native/package.json` is `"private": true`; `@stadiamaps/ferrostar-{uniffi,core,maplibre}-react-native` all 404; upstream issue **#961** open) → **vendor the `react-native/` workspace from the monorepo until published**; (b) **issue #991 "Driving side support" is open** → NZ drives on the left, so this is a **release blocker**. Also: the route provider is **not Valhalla-only** — the core ships `routing_adapters/{valhalla.rs, graphhopper.rs, osrm/}`, and one OSRM-compatible parser reads Valhalla, OSRM, GraphHopper-in-OSRM-mode and Mapbox Directions. |
| 1b. "Fallback: maplibre-navigation-android" | **maplibre/maplibre-navigation-android** — 213 ★, **MIT**, **release 5.0.1 on 2026-10-19**, "100 % Open Source, No Telemetry", a telemetry-stripped fork of the Mapbox Navigation SDK v0.19 | ✅ **the fallback is alive and correct.** ⚠️ Two caveats: it is **Android-only** (KMP conversion "in progress") so React Native needs a TurboModule we write, and it needs a **Directions API** (GraphHopper OSRM mode or our Valhalla). ⚠️ The **legacy** repo `maplibre/maplibre-navigation-android-legacy` **is archived (2022)** — do not link to it. |
| 10. **maplibre/maputnik** (style for the courier mode) | 2,659 ★, MIT, v3.1.0 2026-07-06 | ✅ keep (see `map-rendering-offline-tiles.md`). |
| (not in the list) | **sherpa-onnx KWS + TTS** — `k2-fsa/sherpa-onnx` 15,394 ★ Apache-2.0 v1.13.8 2026-09-10; the RN wrapper `XDcobra/react-native-sherpa-onnx` is **MIT, v0.4.4 (2026-09-08) — the exact version we already pin** | ✅ keep, and note: **on-device TTS is what makes spoken guidance work offline** (V4 §6.5). |
| (not in the list) | **Project-OSRM/osrm-text-instructions** (107 ★, BSD-2-Clause, pushed 2026-10-17) — the instruction **phrase** library | **Add → ADOPT (copy-reference)** for the ≤ 8-word NZ English prompts. |
| (not in the list) | **PimpinPumpkin/Vela** — 2,072 ★, **created 2026-06-15**, 505 releases, **GPL-3.0** | **Add → CLEAN-ROOM STUDY ONLY.** It is the 2026 proof that a complete OSM nav stack is buildable. |
| (not in the list) | `rhasspy/piper` is **ARCHIVED** (last release 2023-11-14); the live successor **`OHF-Voice/piper1-gpl` is GPL-3.0** | Correct any reference to Piper: it is **not** adoptable for the APK (GPL). Use sherpa-onnx. |
| (not in the list) | `mapbox/mapbox-navigation` → **404**; the real repo is **`mapbox/mapbox-navigation-ios`** (919 ★, proprietary, per-MAU) | Correct the name and **reject** on licence/cost. |
