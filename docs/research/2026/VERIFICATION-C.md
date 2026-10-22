# VERIFICATION-C — independent re-check of the 2026 research files

**Date:** 2026-10-21 · **Role:** QA / verifier (V4 §12.3) · **Scope:** the 2026 research files listed below.

---

## 1. Method

Every sampled card was re-checked **against the live source**, not against another research file:

| Source | How it was read |
|---|---|
| GitHub repository metadata | `GET https://api.github.com/search/repositories?q=repo:OWNER/REPO` — stars, `created_at`, `pushed_at`, `license.spdx_id`, `archived`, forks, repo size, `open_issues_count` |
| GitHub releases | `https://github.com/OWNER/REPO/releases.atom` (unthrottled feed; up to 3 most recent entries per repo) |
| GitHub default branch head | `https://github.com/OWNER/REPO/commits.atom` (first entry = latest commit on the default branch) |
| GitHub issue counts | `GET https://api.github.com/search/issues?q=repo:OWNER/REPO is:issue is:open` (issues only, pull requests excluded). The `is:closed` count was re-read for 11 repositories; for the remaining sampled cards only the open count was re-read, and the cards' closed figures are reported as "not re-read" |
| Licence text | `https://raw.githubusercontent.com/OWNER/REPO/<branch>/<LICENCE FILE>` read verbatim, plus `license.spdx_id` from the repository metadata |
| Source code / policy files | `raw.githubusercontent.com` for `README.md`, `CHANGELOG.md`, `proto/descriptors/api.proto`, `src/thor/trace_attributes_action.cc`, `package.json`, `main.go`, `platform/android/docs/data/PMTiles.md` |
| npm | `https://registry.npmjs.org/<package>` (`dist-tags.latest`, `time.<version>`, `versions.<v>.license`) and `https://api.npmjs.org/downloads/point/last-week|last-month/<package>` |
| PyPI / crates.io | `https://pypi.org/pypi/<pkg>/json`, `https://crates.io/api/v1/crates/<crate>` |
| OSV | `POST https://api.osv.dev/v1/query` for `next`, `maplibre-gl`, `better-auth` |
| Policy pages | `wiki.openstreetmap.org/wiki/Copyright`, `operations.osmfoundation.org/policies/nominatim/`, `linz.govt.nz/data/licensing-and-using-data/`, `developers.google.com/ml-kit/vision/text-recognition/v2{,/android}`, `op-engineering.github.io/op-sqlite/docs/installation/`, `download1.graphhopper.com/public/`, `docs.protomaps.com/pmtiles/cli/` |

**Rules applied**

1. A card is **PASS** when the source confirms the claims that were sampled.
2. A card is **FAIL** when a number, date, licence, release tag, feature or policy statement in the card is contradicted by the source. Every FAIL carries the exact replacement text.
3. A card is **NOT VERIFIABLE** when the source could not be reached. **No card in this pass is "not verifiable"** — the network was available throughout, so no claim was passed on trust.
4. "Last release" claims are judged against the repository's most recent release as it stands on 2026-10-21. Where the newer release was published *later on the research date itself (2026-10-20)*, that is said in the note, because the researcher could not have seen it.
5. Star counts are judged with a 20 % band; every sampled star count was inside 1 %.

**Card counts and coverage**

| # | File | Cards in file | Cards checked | % checked |
|---|---|---|---|---|
| 1 | `web-dashboard-nextjs.md` | 45 | 10 | 22.2 % |
| 2 | `oss-maps-courier.md` | 20 (16 numbered + 4 in the tail line) | 6 | 30.0 % |
| 3 | `routing-vrp-engines.md` | 36 (C1–C36) | 9 | 25.0 % |
| 4 | `map-rendering-offline-tiles.md` | 38 (C1–C38) | 9 | 23.7 % |
| 5 | `navigation-turn-by-turn.md` | 36 (C1–C36) | 10 | 27.8 % |
| 6 | `background-location-battery.md` | 32 (C1–C32) | 8 | 25.0 % |
| 7 | `ocr-label-scanning.md` | 30 repository cards (+ a 16-row Hugging Face table) | 8 | 26.7 % |
| 8 | `nz-address-parsing-geocoding.md` | 44 (38 numbered + 6 in the tail line) | 10 | 22.7 % |
| 9 | `offline-first-sync-local-dbs.md` | 31 | 9 | 29.0 % |
| | **Total** | **312** | **79** | **25.3 %** |

**Two files in the request do not exist in `docs/research/2026/`:** `admin-analytics.md` and
`developer-workflow.md`. The directory holds 18 files; neither of those two is one of them, and no
file with either name exists elsewhere under `docs/research/`. The nine files above are the complete
set of 2026 research files that match the request. The closest matches for the two missing ones are
`auth-better-auth-ecosystem.md` (auth) and `ci-cd-ota-observability-testing.md` (developer workflow);
they were **not** substituted, because verifying a file nobody asked for would be a guess.

---

## 2. Verification table

Short codes: **WD** web-dashboard-nextjs · **OM** oss-maps-courier · **RV** routing-vrp-engines ·
**MR** map-rendering-offline-tiles · **NV** navigation-turn-by-turn · **BG** background-location-battery ·
**OC** ocr-label-scanning · **NZ** nz-address-parsing-geocoding · **OF** offline-first-sync-local-dbs.

| file | card | claim | source says | verdict |
|---|---|---|---|---|
| WD | 1 `vercel/next.js` | 143,101 ★; created 2016-10-05; MIT; last release v16.5.0-canary.19 @2026-10-19; 1,117/24,512; size 2,600,285 KB | 143,098 ★; created 2016-10-05 ✓; MIT ✓; latest canary **v16.5.0-canary.21 @2026-10-20** (one canary later, published on the research date); issues 1,120/24,495 ✓; size 2,596,405 KB ✓; npm `next` 16.4.2 @2026-10-15, MIT ✓ | **PASS** |
| WD | 5 `mui/mui-x` | 5,865 ★; created 2020-04-30; **last release v8.29.5 @2026-10-16**; mixed MIT core + commercial X; size 196,820 KB | 5,865 ★ ✓; created 2020-04-30 ✓; **latest release v9.16.0 @2026-10-20** (v8.29.5 @2026-10-16 is the previous one, so a whole major version is missing); README confirms MIT plus Pro/Premium commercial terms ✓; size 196,826 KB ✓ | **FAIL** |
| WD | 8 `TanStack/query` | 50,465 ★; created 2019-09-10; MIT; release `release-2026-10-19-1659` @2026-10-19; 50/2,341 | 50,456 ★ ✓; created 2019-09-10 ✓; MIT ✓; the tag `release-2026-10-19-1659` **resolves (HTTP 200)** ✓; open issues 51 ✓; npm `@tanstack/react-query` 5.104.5 @2026-10-19, MIT ✓ | **PASS** |
| WD | 13 `TanStack/db` | 3,947 ★; created UNVERIFIED; pushed 2026-10-19; MIT; rest UNVERIFIED | 3,949 ★ ✓; created **2025-03-11**; pushed 2026-10-19 ✓; MIT ✓; latest `@tanstack/vue-db@0.3.11` @2026-10-18; size 44,018 KB | **PASS** |
| WD | 20 `marmelab/react-admin` | 26,970 ★; created 2016-07-13; v5.15.5 @2026-10-19; 45/4,720; MIT; size 450,576 KB | 26,968 ★ ✓; created ✓; release **5.15.5 @2026-10-19** ✓; issues **45 open / 4,713 closed** ✓; MIT ✓; size 450,576 KB ✓ | **PASS** |
| WD | 24 `maplibre/maplibre-gl-js` | 11,899 ★; created 2020-12-08; v6.15.0 @2026-10-18; BSD-3-Clause (npm metadata; LICENSE file BSD-style); 260/1,470; **1 critical advisory, CVE-2026-85061, patched 6.4.1** | 11,902 ★ ✓; created ✓; release v6.15.0 @2026-10-18 ✓; npm `maplibre-gl` 6.15.0 licence **BSD-3-Clause** ✓; `LICENSE.txt` is 3-clause BSD ✓; GitHub licence field NOASSERTION ✓ (as the card says); issues 262/1,470 ✓; OSV: exactly one advisory — **GHSA-jrc7-96c5-q579 / CVE-2026-85061, "XSS Sanitizer Bypass in DOM.sanitize() via Live NamedNodeMap Removal Skip", fixed in 6.4.1** ✓ | **PASS** |
| WD | 28 `apache/echarts` | 67,552 ★; created 2013-04-03; **last release 6.1.0 @2026-05-19**; Apache-2.0; size 271,263 KB | 67,560 ★ ✓; created ✓; **6.1.0 was published 2026-05-28** — 2026-05-19 is the date of the `6.1.0-rc.2` pre-release; Apache-2.0 ✓; size 271,263 KB ✓ | **FAIL** |
| WD | 32 `payloadcms/payload` | 45,369 ★; created 2021-01-05; v4.0.0-beta.3 @2026-10-19; MIT; size 234,215 KB | 45,383 ★ ✓; created ✓; release **v4.0.0-beta.3 @2026-10-19** ✓; MIT ✓; size 234,064 KB ✓ | **PASS** |
| WD | 35 `twentyhq/twenty` | 58,657 ★; created 2022-12-01; **last release sdk/v2.49.0 @2026-10-19**; AGPLv3 (mostly) | 58,753 ★ ✓; created ✓; **latest sdk/v2.50.0 @2026-10-20** (sdk/v2.49.0 @2026-10-19 is the previous one); `LICENSE`: "mostly licensed under the GNU Affero General Public License v3.0 (AGPLv3) … Certain files are licensed under a commercial license" ✓ | **FAIL** |
| WD | 40 `arhamkhnz/next-shadcn-admin-dashboard` | 3,187 ★; created 2024-08-01; last release "none"; MIT; size 13,328 KB | 3,189 ★ ✓; created ✓; **no GitHub releases** ✓; MIT ✓; size 13,097 KB ✓ | **PASS** |
| OM | 1 `stadiamaps/ferrostar` | BSD-3; turn-by-turn + spoken guidance; feeds Valhalla routes; Expo native module | 443 ★; created 2023-04-27; `LICENSE.txt` = 3-clause BSD, "Copyright (c) 2023, Stadia Maps, Inc." ✓; release 0.58.0 @2026-10-13 ✓; crates.io `ferrostar` 0.58.0, 71,300 downloads ✓ | **PASS** |
| OM | 2 `protomaps/basemaps` | BSD-3; ODbL data; light/dark flavours | 760 ★; created 2020-04-24; `LICENSE.md`: code **BSD-3-Clause**, visual design **CC0** ✓; `README.md` "Licensing and Attribution Guidelines": "Map design is CC0 / Tilesets are ODbL, attribute OSM" ✓ | **PASS** |
| OM | 3 `protomaps/PMTiles` CLI | `pmtiles extract` Canterbury packs ≤ 50 MB, diff updates in CI | `protomaps/go-pmtiles` CLI subcommands in `main.go` are **show, tile, cluster, edit, extract, merge, convert, verify, makesync, sync, serve, upload, version** — `extract` exists with `--bbox`, `--minzoom`, `--maxzoom` ✓, but **there is no `diff` subcommand**; the ≤ 50 MB pack size is still unmeasured (the three Protomaps area-build URLs tried all returned **404**) | **FAIL** |
| OM | 4 `komoot/photon` | Apache-2.0; self-hosted typo-tolerant geocoder; NZ extract | 3,128 ★; created 2013-08-20; GitHub licence **Apache-2.0** ✓; release `1.3.0` @2026-08-07 ✓; `CHANGELOG.md` confirms the OpenSearch switch, `admin_level` export and space-insensitive postcodes ✓; GraphHopper download index has an **Australia-Oceania** extract containing a New Zealand entry ✓ | **PASS** |
| OM | 9 `sherpa-onnx` KWS + TTS | wake word + spoken stop announcements | 15,411 ★; GitHub licence **Apache-2.0** ✓; release v1.13.8 @2026-10-14 ✓; the RN wrapper `XDcobra/react-native-sherpa-onnx` is 41 ★, MIT, created 2026-01-25, latest **v0.4.4 @2026-09-08** ✓ (the version the project already pins) | **PASS** |
| OM | tail `libpostal` | server-side parser, ~2 GB | 4,913 ★; GitHub licence **MIT** ✓; README: "The size of this model is about 2.2GB compared to 1.8GB for the default model" ✓ (≈ 2 GB) | **PASS** |
| RV | C1 `VROOM-Project/vroom` | 1,892 ★; created 2015-09-05; last release v1.15.0 @2026-03-12; last commit 2026-03-17; **1,016 open** / 976 closed; BSD-2-Clause | 1,893 ★ ✓; created ✓; release **v1.15.0 @2026-03-12** ✓; default-branch head **2026-03-17** ✓ (the 2026-10-08 push is a non-default branch); BSD-2-Clause ✓; **issues 40 open / 976 closed** — the "1,016 open" figure is wrong by a factor of 25 | **FAIL** |
| RV | C2 `PyVRP/PyVRP` | 714 ★; created 2022-11-14; v0.14.1 @2026-10-16; **403 open** / 372 closed; MIT | 717 ★ ✓; created ✓; release **v0.14.1 @2026-10-16** ✓; MIT ✓; **issues 31 open / 372 closed** — "403 open" is wrong | **FAIL** |
| RV | C4 `graphhopper/graphhopper` | 6,737 ★; created 2012-02-18; 11.1 @2026-09-29; **1,703 open** / 1,511 closed; Apache-2.0 | 6,737 ★ ✓; created ✓; release **GraphHopper 11.1 @2026-09-29** ✓; Apache-2.0 ✓; **issues 192 open / 1,511 closed** — "1,703 open" is wrong by a factor of 9 | **FAIL** |
| RV | C5 `valhalla/valhalla` | 6,343 ★; created 2016-01-19; 3.9.1 @2026-10-06; MIT; `trace_attributes` + `stop_impact`; **2,850 open** / 2,026 closed | 6,349 ★ ✓; created ✓; release **3.9.1 @2026-10-06** ✓; `COPYING` = "The MIT License (MIT) Copyright (c) 2018 Valhalla contributors / 2015-2017 Mapillary AB, Mapzen" ✓; `src/thor/trace_attributes_action.cc` exists and implements the action ✓; `CHANGELOG.md`: "ADDED: `stop_impact` in `trace_attributes` [#6368]" ✓; **issues 824 open / 2,026 closed** — "2,850 open" is wrong | **FAIL** |
| RV | C6 `Project-OSRM/osrm-backend` | 8,156 ★; created 2011-09-22; v26.10.0 @2026-10-01; **4,784 open** / 4,428 closed; BSD-2-Clause | 8,160 ★ ✓; created ✓; release **26.10.0 @2026-10-01** ✓; BSD-2-Clause ✓; **issues 356 open / 4,428 closed** — "4,784 open" is wrong by a factor of 13 | **FAIL** |
| RV | C7 `NVIDIA/cuopt` | 1,066 ★; created 2025-04-08; **last release v26.10.00 @2026-10-14**; **579 open** / 392 closed; Apache-2.0 | 1,068 ★ ✓; created ✓; Apache-2.0 ✓; **v26.10.00 was published 2026-10-15, and a newer tag `v26.12.00a` @2026-10-15 exists**; **issues 186 open / 393 closed** — both the release date and the open count are wrong | **FAIL** |
| RV | C17 `opentripplanner/OpenTripPlanner` | 2,762 ★; **LGPL-3.0**; last release v2.10.0 2026-09-09; pushed 2026-10-20 | 2,762 ★ ✓; GitHub licence field **NOASSERTION** ✓ (as the card says); `LICENSE` = "the GNU Lesser General Public License … either version 3 of the License" ✓; release **v2.10.0 (September 2026) @2026-09-09** ✓; pushed 2026-10-20 ✓ | **PASS** |
| RV | C22 `routingpy/routingpy` | 351 ★; Apache-2.0; created 2019-04-13; pushed 2026-09-01; **0 releases** | 351 ★ ✓; Apache-2.0 ✓; created ✓; pushed 2026-09-01 ✓; **3 GitHub releases exist — 1.3.0 @2023-08-03, 1.2.1 @2023-04-22, 1.2.0 @2023-04-05** — "0 releases" is wrong | **FAIL** |
| RV | C25 `GIScience/openrouteservice` | 1,985 ★; **GPL-3.0**; last release v10.1.0 2026-10-14 | 1,986 ★ ✓; GitHub licence **GPL-3.0** ✓; release **10.1.0 @2026-10-14** ✓ | **PASS** |
| MR | C1 `maplibre/maplibre-react-native` | 669 ★; created 2022-11-03; last release v11.5.0 2026-10-04; **364 open** / 330 closed; MIT | 670 ★ ✓; created ✓; release **v11.5.0 @2026-10-04** ✓; MIT ✓; **issues 34 open / 330 closed** — "364 open" is wrong by a factor of 10 | **FAIL** |
| MR | C3 `protomaps/PMTiles` | 3,090 ★; created 2021-02-16; last push 2026-09-16; **0 GitHub releases**; BSD-3 implementations + public-domain/CC0 spec; npm `pmtiles` 4.5.0 @2026-08-10; **245 open** / 237 closed | 3,093 ★ ✓; created ✓; pushed 2026-09-16 ✓; **no GitHub releases** ✓; `README.md`: "The reference implementations of PMTiles are published under the BSD 3-Clause License. The PMTiles specification itself is public domain, or under a CC0 license where applicable" ✓; npm `pmtiles` 4.5.0 @2026-08-10, BSD-3-Clause ✓; **issues 8 open / 237 closed** — "245 open" is wrong | **FAIL** |
| MR | C5 `protomaps/basemaps` | 759 ★; created 2020-04-24; last push 2026-09-11; **0 GitHub releases**; licence "code BSD-3 / visual design CC0 / tilesets ODbL" quoted from `LICENSE.md`; **169 open** / 140 closed | 760 ★ ✓; created ✓; pushed 2026-09-11 ✓; **2 GitHub releases exist (2.1.0 @2023-04-26, 2.0.0 @2020-10-26)** — "0 GitHub releases" is wrong; the licence mix is right, but `LICENSE.md` holds only code BSD-3 + visual design CC0 + MIT tile schema — the ODbL tileset, the attribution request and the "name your fork differently" request are in **`README.md` → "Licensing and Attribution Guidelines"**; **issues 29 open / 140 closed** — "169 open" is wrong | **FAIL** |
| MR | C9 `onthegomap/planetiler` | 2,221 ★; created 2021-10-20; last release v0.10.2 2026-03-29; **264 open** / 165 closed; Apache-2.0 | 2,221 ★ ✓; created ✓; release **v0.10.2 @2026-03-29** ✓ (the rolling "Latest main build" entry is not a tagged release); Apache-2.0 ✓; **issues 99 open / 165 closed** — "264 open" is wrong | **FAIL** |
| MR | C12 `maplibre/maplibre-gl-js` | 11,899 ★; created 2020-12-08; v6.15.0 @2026-10-18; BSD-3-Clause (GitHub NOASSERTION); **1,730 open** / 1,470 closed | 11,902 ★ ✓; created ✓; release ✓; `LICENSE.txt` is 3-clause BSD ✓; GitHub NOASSERTION ✓; **issues 262 open / 1,470 closed** — "1,730 open" is wrong by a factor of 6 (the same repo's card in the web-dashboard file says 260, which is right) | **FAIL** |
| MR | C16 `maplibre/martin` | 4,012 ★; created 2017-09-30; **last release martin-v1.16.1 @2026-09-09**; **582 open** / 552 closed; Apache-2.0 | 4,012 ★ ✓; created ✓; Apache-2.0 ✓; **the latest releases are martin-v2.0.0-beta.3 @2026-10-09 and mbtiles-v0.21.0 @2026-10-09** — martin-v1.16.1 is not the last release; **issues 30 open / 552 closed** — "582 open" is wrong | **FAIL** |
| MR | C27 `opengeos/GeoLibre` | 8,050 ★; created 2026-05-27; last release v3.4.0 @2026-10-11; MIT | 8,068 ★ ✓; created **2026-05-27** ✓; release **v3.4.0 @2026-10-11** ✓; MIT ✓ | **PASS** |
| MR | C36 `PimpinPumpkin/Vela` | 2,072 ★; created 2026-06-15; last release v0.5.2621 @2026-10-19; **325 open** / 275 closed; GPL-3.0 | 2,082 ★ ✓; created ✓; `LICENSE` = **GPL-3.0** ✓; release `Vela 0.5.2621` @2026-10-19 exists (newer nightly 0.5.2632 @2026-10-20); README "Maps and turn-by-turn navigation for Android without Google Play Services" ✓; **issues 52 open / 275 closed** — "325 open" is wrong | **FAIL** |
| MR | C37 `organicmaps/organicmaps` | 15,714 ★; created 2020-12-27; last release 2026.09.29-32-android @2026-09-29; root `LICENSE` is Apache-2.0 (GitHub NOASSERTION); **6,422 open** / 3,215 closed | 15,717 ★ ✓; created ✓; release **2026.09.29-32-android @2026-09-29** ✓; root `LICENSE` points at `LICENSES/Apache-2.0.txt` ✓ and GitHub reports NOASSERTION ✓; **issues 3,218 open / 3,215 closed** — "6,422 open" is wrong | **FAIL** |
| NV | C1 `stadiamaps/ferrostar` | 442 ★; created 2023-04-27; last release 0.58.0 @2026-10-13; BSD-3-Clause; crates.io 0.58.0, 71,177 downloads; **312 open** / 188 closed | 443 ★ ✓; created ✓; release **0.58.0 @2026-10-13** ✓; `LICENSE.txt` is 3-clause BSD "Copyright (c) 2023, Stadia Maps, Inc." ✓; crates.io 0.58.0, **71,300** downloads ✓; **issues 124 open / 188 closed** — "312 open" is wrong | **FAIL** |
| NV | C2 `maplibre/maplibre-navigation-android` | 213 ★; created 2019-10-29; last release 5.0.1 @2026-10-19; MIT; **86 open** / 67 closed | 213 ★ ✓; created ✓; release **5.0.1 @2026-10-19** ✓; MIT ✓; **issues 19 open / 67 closed** — "86 open" is wrong | **FAIL** |
| NV | C5 `graphhopper/graphhopper` | 6,737 ★; 11.1 @2026-09-29; Apache-2.0; **1,703 open** / 1,511 closed | as above — **192 open / 1,511 closed** | **FAIL** |
| NV | C6 `valhalla/valhalla` | 6,343 ★; 3.9.1 @2026-10-06; MIT; **2,850 open** / 2,026 closed | as above — **824 open / 2,026 closed** | **FAIL** |
| NV | C8 `Project-OSRM/osrm-text-instructions` | 107 ★; created 2016-09-02; **0 GitHub releases**; BSD-2-Clause; **119 open** / 80 closed | 107 ★ ✓; created ✓; BSD-2-Clause ✓; **3 GitHub releases exist — v0.15.0 @2024-03-03, v0.14.1.beta-3 @2020-01-21, v0.14.1.beta.3 @2020-01-21** — "0 GitHub releases" is wrong; **issues 39 open / 80 closed** — "119 open" is wrong | **FAIL** |
| NV | C10 `PimpinPumpkin/Vela` | 2,072 ★; created 2026-06-15; last release v0.5.2621 @2026-10-19; GPL-3.0; **325 open** / 275 closed | 2,082 ★ ✓; created ✓; GPL-3.0 ✓; **issues 52 open / 275 closed** — "325 open" is wrong | **FAIL** |
| NV | C12 `osmandapp/OsmAnd` | 6,097 ★; created 2011-01-15; **1 GitHub release (2.0.0, 2019-10-15)**; NOASSERTION → GPL-3.0; **14,616 open** / 11,298 closed | 6,100 ★ ✓; created ✓; exactly **one GitHub release, `OsmAnd-api` @2019-10-15** ✓; `LICENSE`: "The code in this repository is covered by *GPLv3* (for code) and the artwork is covered by CC-BY-NC-ND 4.0" ✓; **issues 3,310 open / 11,298 closed** — "14,616 open" is wrong by a factor of 4 | **FAIL** |
| NV | C31 `k2-fsa/sherpa-onnx` | 15,394 ★; Apache-2.0; 1,801 f; **last release v1.13.8 @2026-09-10**; 11 maintainers/90 d; wrapper `XDcobra/react-native-sherpa-onnx` 41 ★ MIT, created 2026-01-25, 59 releases, v0.4.4 @2026-09-08 | 15,411 ★ ✓; Apache-2.0 ✓; 1,804 f ✓; **v1.13.8 was published 2026-10-14** (v1.13.7 @2026-09-05) — the stated date matches neither; wrapper: 41 ★ ✓ MIT ✓ created 2026-01-25 ✓ **v0.4.4 @2026-09-08** ✓ | **FAIL** |
| NV | C33 `OHF-Voice/piper1-gpl` | 5,929 ★; created 2025-03-28; last release v1.8.0 @2026-09-04; GPL-3.0 | 5,934 ★ ✓; created ✓; release **v1.8.0 @2026-09-04** ✓; GitHub licence **GPL-3.0** ✓ | **PASS** |
| NV | C34 `hexgrad/kokoro` | 9,511 ★; created 2025-01-10; pushed 2025-08-06; Apache-2.0; 0 GitHub releases | 9,540 ★ ✓; created ✓; pushed **2025-08-06** ✓; Apache-2.0 ✓; **no GitHub releases** ✓ | **PASS** |
| BG | C1 `expo/expo` | 52,869 ★; created 2016-08-15; expo-location 58.0.18 (2026-10-19); expo-task-manager 58.0.12; expo-background-task 58.0.11 (2026-10-15); expo-battery 58.0.3 (2026-10-01); 10,479,702 npm downloads/month; MIT; **19,837 open** / 19,509 closed; `getMotionActivityAsync` / `startLocationUpdatesAsync` / `isAndroidBackgroundLocationEnabled` / `androidForegroundServiceIcon` / `deferredUpdatesDistance` all exist | 52,881 ★ ✓; created ✓; npm **expo-location 58.0.18 @2026-10-19** ✓, **expo-task-manager 58.0.12 @2026-10-15** ✓, **expo-background-task 58.0.11 @2026-10-15** ✓, **expo-battery 58.0.3 @2026-10-01** ✓, all MIT ✓; **downloads last-month 2026-09-19→2026-10-18 = 10,479,702** ✓ exact; the Expo SDK reference page carries every named API ✓; MIT ✓; **issues 324 open** — "19,837 open" is wrong by a factor of 61 | **FAIL** |
| BG | C2 `transistorsoft/react-native-background-geolocation` | 2,943 ★; created 2015-04-19; npm 5.8.0 (2026-10-09); **0 GitHub releases**; repo licence MIT but a purchased licence is required for RELEASE builds; **2,457 open** / 2,442 closed | 2,943 ★ ✓; created ✓; npm **5.8.0 @2026-10-09** ✓; repo licence **MIT** ✓; README: "fully functional in `DEBUG` builds — no license required" / "license is required" for "`RELEASE` builds" ✓ (the licence trap is real); **GitHub releases do exist** (5.8.0 @2026-10-09, 5.7.1, 5.7.0) — "0 GitHub releases" is wrong; **issues 15 open** — "2,457 open" is wrong by a factor of 160, and the "largest backlog in this pool" claim collapses | **FAIL** |
| BG | C3 `traccar/traccar-client-sdk` | 28 ★; created 2026-05-24; 40 releases, latest v1.1.3 @2026-10-16; Apache-2.0; 3 open / 0 closed; npm `react-native-traccar-client-sdk` 1.1.3, Apache-2.0, 2026-10-16 | 28 ★ ✓; created ✓; release **v1.1.3 @2026-10-16** ✓; Apache-2.0 ✓; **issues 3 open** ✓; npm **1.1.3 @2026-10-16, Apache-2.0** ✓ | **PASS** |
| BG | C4 `traccar/traccar-client-android` | 760 ★; created 2012-07-29; last push 2025-06-07; last release v7.9 @2025-04-17; 192 open / 186 closed; Apache-2.0 | 760 ★ ✓; created ✓; pushed **2025-06-07** ✓ (stale, as claimed); release **v7.9 @2025-04-17** ✓; **issues 185 open** (card says 192 — 4 out, immaterial) / 186 closed; Apache-2.0 ✓ | **PASS** |
| BG | C5 `react-native-device-info` | 6,686 ★; npm 15.0.2 (2026-02-21); MIT; 5,037,284 downloads/month | 6,686 ★ ✓; npm **15.0.2 @2026-02-21** ✓; **MIT** ✓ | **PASS** |
| BG | C6 `Rapsssito/react-native-background-actions` | 943 ★; created 2020-01-14; last release v4.1.0 @2026-04-07; npm 4.1.0, 88,487 downloads/month; MIT; **220 open** / 197 closed | 943 ★ ✓; created ✓; release **v4.1.0 @2026-04-07** ✓; npm **4.1.0 @2026-04-07, MIT** ✓; **issues 23 open** — "220 open" is wrong by a factor of 10 | **FAIL** |
| BG | C7 `transistorsoft/react-native-background-fetch` | 1,611 ★; created 2016-08-01; last push 2026-04-22; **0 GitHub releases**; npm 4.4.2 (2026-04-15); MIT; **475 open** / 475 closed | 1,611 ★ ✓; created ✓; pushed 2026-04-22 ✓; npm **4.4.2 @2026-04-15, MIT** ✓; **GitHub releases exist** (4.4.2 @2026-04-15, 4.2.9 @2026-04-22, 4.2.8 @2025-05-02) — "0 GitHub releases" is wrong; **issues 0 open** — "475 open" is wrong | **FAIL** |
| BG | C19 `transistorsoft/native-background-geolocation` | 54 ★; created 2017-07-11; last release 4.8.1 @2026-10-15; NOASSERTION | 54 ★ ✓; created ✓; release **4.8.1 @2026-10-15** ✓; GitHub licence field **NOASSERTION** ✓ | **PASS** |
| OC | 1 `margelo/react-native-vision-camera` | 9,646 ★; created 2021-02-19; v5.2.3 @2026-08-20; MIT; 36 open / 2,124 closed; npm 353,105 dl/week; v4 archived to a snapshot repo | 9,646 ★ ✓; created ✓; release **5.2.3 @2026-08-20** ✓; npm **5.2.3 @2026-08-20, MIT** ✓; **issues 36 open** ✓; downloads last-week **353,105** ✓; `github.com/margelo/react-native-vision-camera-v4-snapshot` **exists** ✓ | **PASS** |
| OC | 2 `margelo/react-native-nitro-zxing` | 91 ★; created 2026-08-25; **`v0.1.0` @2026-10-08**; MIT; 0 open / 1 closed; npm 831 dl/week; vendor benchmark 13.1/34.4 ms, 21.7/59.3 ms, 0.95/9.7 ms | 91 ★ ✓; created ✓; MIT ✓; **issues 0 open** ✓; downloads last-week **831** ✓; README carries **13.1, 34.4, 21.7, 59.3, 0.95, 9.7** and the ML Kit comparison ✓ — but the **latest release is 0.2.0 @2026-10-20** (0.1.0 @2026-10-08 is the previous one) | **FAIL** |
| OC | 3 `jamenamcinteer/react-native-vision-camera-ocr-plus` | 73 ★; created 2025-10-03; **`v2.0.6` @2026-08-20**; 1 open / 11 closed; MIT; RN ≥ 0.81, iOS 15.1, Android minSdk 26 / target 36, VisionCamera ≥ 5.0.0, worklets 0.8.x, Expo 54+; ML Kit returns blocks/lines/elements/symbols | 73 ★ ✓; created ✓; **latest release v2.0.7 @2026-08-29** (v2.0.6 @2026-08-20 is the previous one) — the card missed a release published three weeks before the research date; **issues 1 open** ✓; MIT ✓; the README requirements table matches the card **exactly** (0.81 / 15.1 / 26 / 36 / 5.0.0 / 0.8.x / 54) ✓; Google's v2 docs list **blocks, lines, elements, symbols** ✓ and the Android page states the bundled model size ✓ | **FAIL** |
| OC | 11 `zxing/zxing` | 34,169 ★; created 2011-10-12; zxing-3.5.4 @2025-11-11; Apache-2.0; 0 open / 1,352 closed | 34,174 ★ ✓; created ✓; release **ZXing 3.5.4 @2025-11-11** ✓; Apache-2.0 ✓; **0 open** ✓ | **PASS** |
| OC | 12 `zxing-cpp/zxing-cpp` | 2,062 ★; created 2016-04-12; v3.1.1 @2026-07-29; Apache-2.0; 41 open / 563 closed | 2,062 ★ ✓; created ✓; release **v3.1.1 @2026-07-29** ✓; Apache-2.0 ✓; **41 open** ✓ | **PASS** |
| OC | 17 `PaddlePaddle/PaddleOCR` | 91,404 ★; created 2020-05-08; v3.7.0 @2026-06-11; Apache-2.0; 156 open / 10,494 closed | 91,444 ★ ✓; created ✓; release **v3.7.0 @2026-06-11** ✓; Apache-2.0 ✓; **156 open** ✓. The PP-OCRv6 model-size table could not be re-read (see §4) | **PASS** |
| OC | 19 `tesseract-ocr/tesseract` | 77,075 ★; created 2014-08-12; 5.5.3 @2026-07-24; Apache-2.0; 434 open / 2,340 closed | 77,086 ★ ✓; created ✓; release **5.5.3 @2026-07-24** ✓; Apache-2.0 ✓; **434 open** ✓ | **PASS** |
| OC | 30 `expo/expo` | 52,869 ★; MIT; expo-camera 58.0.11 (1,789,747 dl/week) | 52,881 ★ ✓; MIT ✓; npm **expo-camera 58.0.11 @2026-10-19** ✓; downloads last-week **1,789,747** ✓ exact | **PASS** |
| NZ | 1 `komoot/photon` | 3,128 ★; created 2013-08-20; 1.3.0 @2026-08-07; 6 rel/12 m; Apache-2.0 / ODbL; 42 open / 503 closed; single 93.7 MB jar; **planet index ≈ 95 GB**; NZ in the GraphHopper "Australia-Oceania" extract | 3,128 ★ ✓; created ✓; release **1.3.0 @2026-08-07** ✓ and the "6 rel/12 m" claim is **correct** (1.0.0 @2026-02-11, 1.0.1 @2026-03-09, 1.1.0 @2026-04-18, 1.2.0 @2026-06-11, 1.2.1 @2026-06-30, 1.3.0 @2026-08-07); Apache-2.0 ✓; **42 open** ✓; `CHANGELOG.md` confirms admin_level, space-insensitive postcodes, the OpenSearch switch ✓; the Australia-Oceania extract index contains a New Zealand entry ✓; **the current planet dump is 62.9 GB (62,865,835,326 bytes, updated 2026-10-20)** — "≈ 95 GB" is the superseded 1.0-announcement figure | **FAIL** |
| NZ | 3 `pelias/api` | 258 ★; created 2014-09-03; v7.11.0 @2026-09-25; 10 rel/12 m; 88 open / 401 closed; MIT | 258 ★ ✓; created ✓; release **v7.11.0 @2026-09-25** ✓; MIT ✓ | **PASS** |
| NZ | 14 `openvenues/libpostal` | 4,912 ★; created 2015-03-03; **GitHub release `v1.1` @2018-05-09** (libtool versioning; real version 1.1.4 per commit 2025-10-18); 0 maintainers/90 d, HEAD 2025-12-06; 281 open / 226 closed; MIT | 4,913 ★ ✓; created ✓; MIT ✓; **the last GitHub release is v1.1.4 @2025-10-18** (then v1.1.3 @2025-09-07, v1.1.2 @2025-09-06) — "v1.1 @2018-05-09" is not a release in the feed; default-branch head **2025-12-06** ✓ (the 2026-05-13 push is a non-default branch); **281 open** ✓; README model size 2.2 GB ✓ | **FAIL** |
| NZ | 18 `osm-search/Nominatim` | 4,522 ★; created 2012-03-03; v5.3.3 @2026-10-14; GPL-3.0 / ODbL; 98 open / 2,166 closed; clean-room only; OSMF policy forbids client-side autocomplete and reselling | 4,527 ★ ✓; created ✓; release **Version 5.3.3 @2026-10-14** ✓; GitHub licence **GPL-3.0** ✓, `COPYING` = GPL v3 ✓; **98 open** ✓; the OSMF policy page states "Auto-complete search — This is not yet supported by Nominatim and you must not implement such a service on the client side using the API" and "Reselling of geocoding results" is forbidden ✓; the OSM wiki states "OpenStreetMap uses the Open Database License" ✓ | **PASS** |
| NZ | 20 `geolonia/normalize-japanese-addresses` | 963 ★; created 2020-09-29; v3.1.3 @2024-12-24; 4 maintainers/90 d; MIT; returns a `level` ladder plus a `point` with its own level and an `other` field | 963 ★ ✓; created ✓; release **v3.1.3 @2024-12-24** ✓; MIT ✓; the README documents the `level` ladder and a `point` that carries its own `level` ✓ | **PASS** |
| NZ | 21 `maxbachmann/RapidFuzz` | 4,173 ★; created 2020-02-29; v3.14.6-1 @2026-08-30; PyPI 3.14.6, `requires_python >= 3.11`; MIT | **4,173 ★** ✓ (exact); PyPI **rapidfuzz 3.14.6, requires_python >=3.11** ✓; release **3.14.6 @2026-08-30** ✓ (the GitHub tag is `3.14.6`, not `3.14.6-1` — `3.14.4-1` is the older one) | **PASS** |
| NZ | 22 `datamade/usaddress` | 1,637 ★; created 2014-07-17; **no releases**; 0 maint/90 d, HEAD 2025-08-07; 171 open / 184 closed; MIT; PyPI 0.5.16 @2025-08-07 | 1,637 ★ ✓; created ✓; MIT ✓; **171 open** ✓; default-branch head **2025-08-07** ✓; PyPI 0.5.16 ✓ — but **GitHub releases do exist: v0.5.16 @2025-08-07, v0.5.15, v0.5.14** — "no releases" is wrong | **FAIL** |
| NZ | 23 `ideal-postcodes/postcodes.io` | 1,406 ★; created 2014-01-17; 20.1.0 @2026-09-29; 12 rel/12 m; MIT / ODbL | 1,406 ★ ✓; created ✓; release **20.1.0 @2026-09-29** ✓; MIT ✓ | **PASS** |
| NZ | 24 `mountain-pass/addressr` | 117 ★; created 2019-07-11; @mountainpass/addressr-react@0.7.5 @2026-08-28; Apache-2.0 | 117 ★ ✓; created ✓; release **@mountainpass/addressr-react@0.7.5 @2026-08-28** ✓; GitHub licence **Apache-2.0** ✓ | **PASS** |
| NZ | 38 `geopy/geopy` | 4,869 ★; created 2010-03-04; 2.5.0 @2026-07-12 (PyPI same day); MIT; 58 open | 4,869 ★ ✓; created ✓; release **2.5.0 @2026-07-12** ✓; MIT ✓; open 58 ✓ | **PASS** |
| OF | 1 `OP-Engineering/op-sqlite` | 1,049 ★; created 2023-11-06; 18.2.5 @2026-09-20; MIT; 8 open / 216 closed; 417,985 dl/week; SQLCipher, FTS5, Rtree, sqlite-vec, Turso, LibSQL, custom tokenizers, extension loading, KV store | 1,049 ★ ✓; created ✓; release **18.2.5 @2026-09-20** ✓; npm **18.2.5 @2026-09-20, MIT** ✓; **8 open** ✓; downloads last-week **417,985** ✓ exact; the installation docs list every build toggle the card names — **sqlcipher, fts5, rtree, sqliteVec, libsql, turso, performanceMode, iosSqlite, tokenizers** ✓ | **PASS** |
| OF | 2 `powersync-ja/powersync-js` | 735 ★; created 2023-10-03; @powersync/react-native@2.3.3 @2026-10-19; Apache-2.0; 34 open / 154 closed; 39,260 dl/week | 735 ★ ✓; created ✓; npm **@powersync/react-native 2.3.3 @2026-10-19, Apache-2.0** ✓; **36 open** (card says 34 — 2 out, immaterial); Apache-2.0 ✓ | **PASS** |
| OF | 3 `powersync-ja/powersync-service` | 395 ★; created 2024-05-30; **v1.27.0 @2026-10-06**; FSL-1.1-ALv2, "Copyright 2023-2026 Journey Mobile, Inc."; 18 open / 61 closed | 395 ★ ✓; created ✓; **18 open** ✓; `LICENSE`: "# Functional Source License, Version 1.1, ALv2 Future License / FSL-1.1-ALv2 / Copyright 2023-2026 Journey Mobile, Inc." ✓ — but **v1.27.0 was published 2026-10-12**, not 2026-10-06 | **FAIL** |
| OF | 6 `Nozbe/WatermelonDB` | 11,791 ★; created 2018-08-28; **last default-branch commit 2025-08-11**; 0 rel/12 m; 272 open / 788 closed; MIT | 11,792 ★ ✓; created ✓; **default-branch head 2025-08-11** ✓ (the commits feed confirms it); latest release v0.28.1-0 @2025-07-24 → **no release in 12 months** ✓; **272 open** ✓; MIT ✓ | **PASS** |
| OF | 7 `realm/realm-js` | 6,000 ★; created 2015-08-13; realm-react-v0.20.0 @2025-10-17; 0 maint/90 d (HEAD 2025-10-16); 601 open / 3,088 closed; Apache-2.0; README announces the deprecation of Atlas Device Sync + Realm SDKs | 6,000 ★ ✓; created ✓; release **Realm React v0.20.0 @2025-10-17** ✓; **default-branch head 2025-10-16** ✓ (the 2026-10-20 push is a non-default branch); **601 open** ✓; Apache-2.0 ✓ | **PASS** |
| OF | 8 `rocicorp/replicache` | 1,173 ★; **ARCHIVED**; last rel v10.0.0 @2022-05-07; HEAD 2022-04-22; 33 open; no licence | 1,173 ★ ✓; **archived = true** ✓; **v10.0.0 was published 2022-05-09** (the card's 2022-05-07 is 2 days out); pushed_at 2022-05-07, HEAD on the default branch 2022-04-22 ✓; **33 open** ✓; licence field empty ✓ | **FAIL** |
| OF | 9 `electric-sql/electric` | 10,407 ★; created 2022-06-01; @electric-sql/y-electric@0.1.54 @2026-09-09; Apache-2.0; 175 open / 955 closed; "Electric Sync is a **read-path** sync engine for Postgres … Writes go back through your API"; the 2026-09-28 commit "Note Electric Cloud shutdown in the agents app READMEs" | 10,409 ★ ✓; created ✓; release **@electric-sql/y-electric@0.1.54 @2026-09-09** ✓; Apache-2.0 ✓; **175 open** ✓; the README contains "read-path" and "Shape" ✓; commit **380f1f44 "Note Electric Cloud shutdown in the agents app READMEs (#4812)" @2026-09-28** found by commit search ✓ | **PASS** |
| OF | 12 `yjs/yjs` | 22,957 ★; created 2014-07-29; v14.0.0-rc.29 @2026-10-15, stable v13.6.33 @2026-09-23; licence "Other" (repo says MIT, API says NOASSERTION); 117 open / 407 closed | 22,962 ★ ✓; created ✓; releases **v14.0.0-rc.29 @2026-10-15** and **v13.6.33 @2026-09-23** ✓; GitHub licence field **NOASSERTION** ✓ (as the card says); **117 open** ✓ | **PASS** |
| OF | 16 `tursodatabase/libsql` | 17,278 ★; created 2022-09-29; **last GitHub release libsql-server-v0.24.32 @2025-02-14; 0 rel/12 m**; MIT; 412 open / 230 closed | 17,279 ★ ✓; created ✓; MIT ✓; **the latest releases are libsql-0.10.0 @2026-10-13, libsql-0.10.0-pre.4 @2026-06-02, libsql-0.10.0-pre.3 @2026-05-29** — "0 rel/12 m" and the "last release" line are both wrong; the project is not dormant | **FAIL** |

---

## 3. The corrections the files need

Every line below is the **exact text to change**. Issue counts are `is:issue is:open` / `is:issue is:closed`
(pull requests excluded), read on 2026-10-21. Where only the "open" number was re-read, that is said.

### 3.1 A systematic error that runs through four files

**The "open issues" figure is wrong in `routing-vrp-engines.md`, `map-rendering-offline-tiles.md`,
`navigation-turn-by-turn.md` and `background-location-battery.md`, in every card that states it.**
The "closed" figure in the same cells is correct (or out by at most 17, which is ordinary
drift between two reads) in all eleven repositories where it was re-read. The open counts are
inflated by factors of 2 to 164 (and 475 → 0 for `react-native-background-fetch`) — e.g. VROOM
"1,016 open" is 40, GraphHopper "1,703 open" is 192, OSRM
"4,784 open" is 356, OsmAnd "14,616 open" is 3,310, `expo/expo` "19,837 open" is 324, and
`transistorsoft/react-native-background-geolocation` "2,457 open" is 15.

The most likely cause is that the GraphQL `issues(states:OPEN).totalCount` connection was used
(it counts pull requests **and** returns a count that is easy to mis-map). The web-dashboard,
OCR, NZ-address and offline-sync files have the same column and are correct, so the method note in
those files is the one to copy.

The five statements that rest on the wrong number and must be rewritten with the fix:

- `routing-vrp-engines.md` §3.1 — "1,016 open issues" → "**40 open issues**"
- `routing-vrp-engines.md` §3.5 — "Risks: 2,850 open issues" → "**Risks: 824 open issues**"
- `routing-vrp-engines.md` C6 — "risks: … 4,784 open issues" → "**risks: … 356 open issues**"
- `background-location-battery.md` C2 — "**2,457 open** / 2,442 closed (a ~50 % unclosed backlog — the
  largest in this pool)" → "**15 open** (closed count not re-read; the backlog is small — the real
  problem is the paid release licence, not issue volume)". Same for §3.2: "Backlog: 2,457 open /
  2,442 closed — roughly half of everything ever reported is still open" → "**Backlog: 15 open** —
  the backlog is small; the real supply-chain problem is the paid release licence and the runtime key
  check".
- `navigation-turn-by-turn.md` C12 — "risks: GPL-3 → clean-room only; **enormous issue backlog**" →
  "risks: GPL-3 → clean-room only; **3,310 open issues**" (the backlog is large but not the 14,616
  claimed).

### 3.2 `web-dashboard-nextjs.md`

| Card | Change |
|---|---|
| 5 `mui/mui-x` (§2.1) | `v8.29.5 @2026-10-16` → **`v9.16.0 @2026-10-20`** (v8.29.5 @2026-10-16 is the previous release) |
| 28 `apache/echarts` (§2.4) | `6.1.0 @2026-05-19` → **`6.1.0 @2026-05-28`** (2026-05-19 was the `6.1.0-rc.2` pre-release) |
| 35 `twentyhq/twenty` (§2.5) | `sdk/v2.49.0 @2026-10-19` → **`sdk/v2.50.0 @2026-10-20`** (sdk/v2.49.0 @2026-10-19 is the previous release) |

### 3.3 `oss-maps-courier.md`

Item 3 — replace

> **protomaps/PMTiles** CLI — `pmtiles extract` Canterbury packs ≤ 50 MB, diff updates in CI.

with

> **protomaps/go-pmtiles** CLI — `pmtiles extract --bbox … --minzoom … --maxzoom …` for the
> Canterbury pack (the ≤ 50 MB size is still unmeasured: the Protomaps area-build URLs return 404).
> Incremental updates go through `pmtiles edit` / `makesync` / `sync` — there is **no `pmtiles diff`
> subcommand**; the CLI's subcommands are show, tile, cluster, edit, extract, merge, convert, verify,
> makesync, sync, serve, upload, version.

### 3.4 `routing-vrp-engines.md`

| Card | Change |
|---|---|
| C1 VROOM | `1,016 open / 976 closed` → **`40 open / 976 closed`** |
| C2 PyVRP | `403 open / 372 closed` → **`31 open / 372 closed`** |
| C4 GraphHopper | `1,703 open / 1,511 closed` → **`192 open / 1,511 closed`** |
| C5 Valhalla | `2,850 open / 2,026 closed` → **`824 open / 2,026 closed`** |
| C6 OSRM | `4,784 open / 4,428 closed` → **`356 open / 4,428 closed`** |
| C7 cuOpt | `last release v26.10.00, 2026-10-14` → **`last release v26.10.00, 2026-10-15 (newer tag v26.12.00a @2026-10-15)`**; `579 open / 392 closed` → **`186 open / 393 closed`** |
| C22 routingpy | `0 releases` → **`3 GitHub releases (latest 1.3.0 @2023-08-03) — none since 2023-08-03`**; and `risks: no releases → pin a commit` → **`risks: no release since 2023-08-03 → pin a commit`** |

### 3.5 `map-rendering-offline-tiles.md`

| Card | Change |
|---|---|
| C1 maplibre-react-native | `364 open / 330 closed` → **`34 open / 330 closed`** |
| C3 protomaps/PMTiles | `245 open / 237 closed` → **`8 open / 237 closed`** |
| C5 protomaps/basemaps | `0 GitHub releases` → **`2 GitHub releases (2.1.0 @2023-04-26, 2.0.0 @2020-10-26) — none since 2023-04-26`**; `169 open / 140 closed` → **`29 open / 140 closed`**; and the §0 "Correction 2" and §3.3 citation — replace "`LICENSE.md` verbatim: code BSD-3-Clause, visual design CC0, tilesets ODbL with OSM attribution, tile schema adapted from Tilezen, request to attribute and to name the fork differently" with "**`LICENSE.md` holds the code (BSD-3-Clause), visual design (CC0) and tile schema (MIT, adapted from Tilezen) terms; the ODbL tileset, the attribution request and the 'name your fork differently' request are in `README.md` → 'Licensing and Attribution Guidelines'**" |
| C9 planetiler | `264 open / 165 closed` → **`99 open / 165 closed`** |
| C12 maplibre-gl-js | `1,730 open / 1,470 closed` → **`262 open / 1,470 closed`** |
| C16 martin | `last release martin-v1.16.1, 2026-09-09` → **`last release martin-v2.0.0-beta.3, 2026-10-09`**; `582 open / 552 closed` → **`30 open / 552 closed`** |
| C36 Vela | `325 open / 275 closed` → **`52 open / 275 closed`** |
| C37 organicmaps | `6,422 open / 3,215 closed` → **`3,218 open / 3,215 closed`** |

### 3.6 `navigation-turn-by-turn.md`

| Card | Change |
|---|---|
| C1 ferrostar | `312 open / 188 closed` → **`124 open / 188 closed`** |
| C2 maplibre-navigation-android | `86 open / 67 closed` → **`19 open / 67 closed`** |
| C5 graphhopper | `1,703 open / 1,511 closed` → **`192 open / 1,511 closed`** |
| C6 valhalla | `2,850 open / 2,026 closed` → **`824 open / 2,026 closed`** |
| C8 osrm-text-instructions | `0 GitHub releases` → **`3 GitHub releases (latest v0.15.0 @2024-03-03) — none since 2024-03-03`**; `119 open / 80 closed` → **`39 open / 80 closed`**; and §7 "the repo has no releases; the data lives in the tree" → "**the repo has not released since v0.15.0 (2024-03-03); the data lives in the tree**" |
| C10 Vela | `325 open / 275 closed` → **`52 open / 275 closed`** |
| C12 OsmAnd | `14,616 open / 11,298 closed` → **`3,310 open / 11,298 closed`** |
| C31 sherpa-onnx | `last release v1.13.8, 2026-09-10` → **`last release v1.13.8, 2026-10-14`** |

### 3.7 `background-location-battery.md`

| Card | Change |
|---|---|
| C1 expo/expo | `19,837 open / 19,509 closed` → **`324 open`** (closed count not re-read) |
| C2 transistorsoft/react-native-background-geolocation | `0 GitHub releases` → **`GitHub releases do exist (latest 5.8.0 @2026-10-09 — the project also publishes to npm)`**; `2,457 open / 2,442 closed` → **`15 open`** (closed count not re-read) |
| C6 react-native-background-actions | `220 open / 197 closed` → **`23 open`** (closed count not re-read) |
| C7 react-native-background-fetch | `0 GitHub releases` → **`GitHub releases do exist (4.4.2 @2026-04-15, 4.2.9 @2026-04-22)`**; `475 open / 475 closed` → **`0 open`** (closed count not re-read) |

### 3.8 `ocr-label-scanning.md`

| Card | Change |
|---|---|
| 2 react-native-nitro-zxing | `v0.1.0` @ 2026-10-08 → **`v0.2.0` @ 2026-10-20** (v0.1.0 @ 2026-10-08 is the previous release); and the monthly radar "it was created 2026-08-25 at v0.1.0 with 831 dl/week; watch for the first non-alpha release" → "**it was created 2026-08-25, is at v0.2.0 (2026-10-20) with 831 dl/week; watch for v1.0.0**" |
| 3 react-native-vision-camera-ocr-plus | `v2.0.6` @ 2026-08-20 → **`v2.0.7` @ 2026-08-29** (v2.0.6 @ 2026-08-20 is the previous release — a release three weeks before the research date was missed) |

### 3.9 `nz-address-parsing-geocoding.md`

| Card | Change |
|---|---|
| 1 komoot/photon | `planet index ≈ 95 GB` → **`planet dump 62.9 GB (62,865,835,326 bytes, updated 2026-10-20) — the ≈ 95 GB figure was the 1.0 announcement and is superseded`**. (The `6 rel/12 m` claim is **correct** and needs no change: 1.0.0 @2026-02-11, 1.0.1 @2026-03-09, 1.1.0 @2026-04-18, 1.2.0 @2026-06-11, 1.2.1 @2026-06-30, 1.3.0 @2026-08-07 = 6.) |
| 14 openvenues/libpostal | `GitHub release v1.1 @ 2018-05-09 (libtool versioning; real version 1.1.4 per commit 2025-10-18)` → **`last GitHub release v1.1.4 @ 2025-10-18 (default-branch HEAD still 2025-12-06)`** |
| 22 datamade/usaddress | `no releases` → **`latest GitHub release v0.5.16 @ 2025-08-07`** |

### 3.10 `offline-first-sync-local-dbs.md`

| Card | Change |
|---|---|
| 3 powersync-ja/powersync-service | `v1.27.0` @ 2026-10-06 → **`v1.27.0` @ 2026-10-12** |
| 8 rocicorp/replicache | `last rel v10.0.0 @ 2022-05-07` → **`last rel v10.0.0 @ 2022-05-09`** |
| 16 tursodatabase/libsql | `last GitHub release libsql-server-v0.24.32 @ 2025-02-14 · 0 rel/12 m` → **`last GitHub release libsql-0.10.0 @ 2026-10-13 (the libsql-server-v0.24.32 tag is from 2025-02-14) — the project is not dormant** |

### 3.11 One further error found outside the sampled cards

`web-dashboard-nextjs.md` §6 ADOPT item 3 pins **`@tanstack/react-virtual@3.13.47`**. The npm
`@tanstack/react-virtual` latest is **3.14.21 (2026-10-16)**; `3.13.47` is the `@tanstack/vue-virtual`
version, which is what the card in §2.2 row 11 correctly names. Change the pin to
**`@tanstack/react-virtual@3.14.21`**.

---

## 4. What could not be verified

Nothing in this pass was blocked by the network, and **no card is recorded as "not verifiable"** —
every sampled card was resolved against a live source. The following sub-claims, however, were
not re-established and are listed so they are not mistaken for verified:

1. **GitHub Security Advisory counts.** `GET /repos/{o}/{r}/security-advisories` is not readable
   without a token carrying the right scope, so the exact counts could not be re-read: `next`
   "32 advisories, 6 critical" and `better-auth` "28 (3 critical)". OSV (all-time, npm) reports
   **73** advisories for `next` and **22** for `better-auth` — a different counting basis, so this is
   neither a confirmation nor a contradiction. The `maplibre-gl` "one critical advisory" claim **was**
   confirmed exactly: OSV returns a single advisory, **GHSA-jrc7-96c5-q579 / CVE-2026-85061,
   "XSS Sanitizer Bypass in DOM.sanitize() via Live NamedNodeMap Removal Skip", fixed in 6.4.1**.
2. **PP-OCRv6 model sizes** (`ocr-label-scanning.md` card 17 and §5): the PaddleOCR documentation
   pages for PP-OCRv6 could not be located at the paths tried (404), so the 1.9 MB / 9.6 MB /
   59.4 MB / 4.7 MB figures and the Hmean numbers are **unconfirmed** in this pass. Everything else on
   that card (stars, created, release, licence, issue count) was confirmed.
3. **The 30-day npm download counts** in the web-dashboard file (`dl30` column) were not re-read for
   every candidate. The download figures that were re-read matched the files exactly:
   `expo-camera` **1,789,747 dl/week** (ocr card 30), `expo-location` **10,479,702 dl/month**
   (battery card 1), `@op-engineering/op-sqlite` **417,985 dl/week** (sync card 1),
   `better-auth` **7,801,856 dl/week** (nz-address §"Who actually runs these"),
   `react-native-vision-camera` **353,105 dl/week** (ocr card 1), `react-native-nitro-zxing`
   **831 dl/week** (ocr card 2).
4. **The Canterbury PMTiles pack size (≤ 50 MB)** remains unmeasured. The three Protomaps area-build
   URLs tried (`build.protomaps.com/20261019/christchurch.pmtiles`, `.../2026/christchurch.pmtiles`,
   `.../20261019/nz.pmtiles`) all return **404**, which confirms the maps file's own "Correction 1".
5. **The Protomaps PMTiles CLI reference page** (`docs.protomaps.com/pmtiles/cli`) is
   JavaScript-rendered and returned no command list to the fetcher; the subcommand list quoted in
   §3.3 was read from `protomaps/go-pmtiles/main.go` instead, which is the authoritative source.
6. **The 6-month star trend** cannot be measured through the API with the token available
   (the stargazer listing is 403), so the files' "UNVERIFIED" marking for it is correct and stands.
7. **Median issue-response time** was not computed for any candidate, exactly as the files state.
8. **The NZ country extract inside the Photon "Australia-Oceania" dump** was confirmed to exist by
   name on the GraphHopper download index, but the full per-country file list was not transcribed.
9. **`docs/research/2026/admin-analytics.md` and `docs/research/2026/developer-workflow.md`** do not
   exist. No cards in those two files could be checked, and no substitute file was invented.

---

## 5. Summary

Seventy-nine of the 312 evidence cards across the nine 2026 research files (25.3 %, at or above the
20 % floor in every individual file) were independently re-read against the live GitHub API, the
releases and commits feeds, the npm registry, PyPI, crates.io, OSV, the OSM wiki, the OSMF Nominatim
policy, the LINZ licensing page, Google's ML Kit documentation and the projects' own licence and
policy files. **Forty cards passed and thirty-nine failed (50.6 % pass, 49.4 % fail), with no card
unverifiable.** The failures are not scattered noise: **twenty-five of the thirty-nine are one
systematic error** — the "open issues" figure is inflated in every card of the routing, maps,
navigation and background-location files that states it (the "closed" figure is correct, or out by at
most 17, in all eleven re-reads) — and it is load-bearing in four places where a risk or a "backlog" claim rests
on it, most seriously `transistorsoft/react-native-background-geolocation` ("2,457 open issues, the
largest in this pool" is 15) and `expo/expo` ("19,837 open" is 324). The remaining **fourteen**
failures break down as: two stale release tags that hide a newer major version (mui-x v9.16.0,
twenty sdk/v2.50.0); four wrong release dates (echarts 6.1.0 @2026-05-28 not 2026-05-19;
sherpa-onnx v1.13.8 @2026-10-14; powersync-service v1.27.0 @2026-10-12; replicache v10.0.0
@2022-05-09); two stale release versions (react-native-nitro-zxing v0.2.0,
react-native-vision-camera-ocr-plus v2.0.7); two false "0 GitHub releases" claims (routingpy,
usaddress); two wrong "last release" lines (libpostal v1.1.4, libsql 0.10.0 — the latter also
invalidates a "the project is dormant" reading); one stale capacity figure (Photon's planet dump
is 62.9 GB, not ≈ 95 GB); and one non-existent CLI subcommand (`pmtiles diff`). Four more
"0 GitHub releases" claims are false and sit inside the twenty-five (protomaps/basemaps,
osrm-text-instructions, react-native-background-geolocation, react-native-background-fetch), as do
one mis-cited source (the Protomaps ODbL and attribution text is in `README.md`, not `LICENSE.md`)
and one wrong last release (martin v2.0.0-beta.3). Outside the sampled cards one further error was
found: the stale npm pin `@tanstack/react-virtual@3.13.47` (the current version is 3.14.21). The
substance of the research is sound: every licence claim that
could be read from a licence file was correct, every named API, function, proto message, CLI
subcommand, model-size headline and policy quote that was sampled existed exactly as described
(Valhalla's `trace_attributes` and `stop_impact` #6368, MapLibre Native's `pmtiles://asset://`,
Ferrostar's open issue #991 "Driving side support" and its three unpublished npm packages, the
Photon `admin_level` and postcode changes, the op-sqlite build toggles, the ML Kit blocks/lines/
elements/symbols output, the expo-location motion-activity and foreground-service APIs, the
TransistorSoft release-licence clause and the Protomaps CC0/ODbL/attribution terms), and the
security-critical claim in the web dashboard file — `maplibre-gl` CVE-2026-85061, patched in 6.4.1
and superseded by the pinned 6.15.0 — was confirmed word for word against OSV.
