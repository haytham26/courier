# Research 2026 — NZ address parsing & geocoding

**Area:** Address Intelligence squad (`docs/squads/address/`)
**Researcher role:** Researcher (V4 §1 role 2, V4 §3, §12)
**Research date:** 2026-10-20 (all star counts, dates and release tags copied from the GitHub/npm/PyPI/OSV APIs on this date)
**Our current choice (the baseline every candidate is compared against)**
- `apps/api/app/address_correction.py` — D8 engine, deterministic, contract `{original, corrected, reason, confidence, needs_question, options[]}`.
- `packages/nz-address` — TS port of the parser (`src/parser.ts`, 404 lines): number words → digits, unit `2/14`, suffix `42B`, `SPOKEN_FIXES` for Māori, `CANTERBURY_SUBURBS` list.
- `SqliteAddressStore` reads an offline FTS slice built by `services/worker` into op-sqlite.
- **Real data is present locally:** `data/linz/addresses-christchurch.jsonl` = **225,151** Christchurch addresses, 30.8 MB, 27,401 with suffix, 52,948 with unit, 122 distinct suburbs (`data/linz/summary-christchurch.json`).
- **Accuracy against real LINZ ids is still NOT VERIFIED** (`docs/PROGRESS.md` PHASE2.3, `docs/squads/address/STATUS.md`: "not measured yet"). The 100 % figure in PROGRESS is over the 87-address committed fixture, which is not the ≥ 95 % LINZ target.
- **Licence baseline:** LINZ data is **CC BY 4.0** (verified, https://www.linz.govt.nz/data/licensing-and-using-data/: "Almost all data from the LINZ Data Service is provided under the Creative Commons Attribution 4.0 International licence"), with three stated exceptions — aerial imagery needs a variation attribution, property/ownership layers with personal information need an extra licence, and "pending approval" cadastral data needs an extra licence. OSM data is **ODbL** (https://wiki.openstreetmap.org/wiki/Copyright: "OpenStreetMap uses the Open Database License").

## Queries run

All via `powershell -ExecutionPolicy Bypass -File scripts\gh.ps1 search repos ...` unless stated.

1. `gh search repos "geocoding" --sort stars --limit 30`
2. `gh search repos "address parser" --sort stars --limit 30`
3. `gh search repos "nz address new zealand" --sort stars --limit 30` → 0 results
4. `gh search repos "address validation" --sort stars --limit 30` → polluted by e-mail validators; kept 1 useful hit
5. `gh search repos --topic geocoding --sort stars --limit 30`
6. `gh search repos "postal code lookup offline" --sort stars --limit 30` → 0
7. `gh search repos "street address parse normalize" --sort stars --limit 30`
8. `gh search repos "postcode address lookup" --sort stars --limit 30`
9. `gh search repos --topic geocoding "new zealand" --sort stars --limit 30` → 0
10. `gh search repos "address intelligence structured parsing" --sort stars --limit 30` → 0
11. `gh search repos "LINZ" --sort stars --limit 30`
12. `gh search repos "libpostal" --sort stars --limit 30`
13. `gh search repos "pelias" --sort stars --limit 30`
14. `gh search repos "photon geocoder" --sort stars --limit 30`
15. `gh search repos "usaddress" --sort stars --limit 5`
16. `gh search repos "postcodes.io" --sort stars --limit 5`
17. `gh api repos/<owner>/<repo>` for 40 repos (stars, forks, created_at, pushed_at, license.spdx_id, open_issues_count, topics, archived)
18. `gh api repos/<owner>/<repo>/releases?per_page=12` (last release + 12-month release count)
19. `gh api repos/<owner>/<repo>/commits?since=<90d>&per_page=100` (distinct commit authors = active maintainers, 90 d)
20. `gh api repos/<owner>/<repo>/commits?per_page=20` (last 20 commits for the deep review)
21. `gh api -X GET search/issues -f "q=repo:<owner>/<repo> is:issue is:open|closed"` (open/closed issue counts)
22. `gh api repos/<owner>/<repo>/readme` (raw README, deep review)
23. PyPI JSON API: `postal`, `rapidfuzz`, `pypostal`, `geopy`, `usaddress`, `phonenumbers`
24. Hugging Face models API: `search=ocr`, `trocr`, `address`, `pp-ocr`, `layout`
25. webfetch: linz.govt.nz licensing page · wiki.openstreetmap.org/wiki/Copyright · operations.osmfoundation.org/policies/nominatim/ · komoot/photon CHANGELOG.md + 1.0.0/1.3.0 release notes · graphhopper Photon download index
26. websearch: "Photon geocoder 1.3 release 2026 features OSM New Zealand support"

## Candidates (44 — 38 numbered cards + 6 more listed in the tail line) — evidence cards

Format: `stars · created · last release @ date · cadence · maint(90 d) · issues open/closed · licence (code / data) · platform · decision`.
`6-month star trend` is **UNVERIFIED for every candidate**: the GitHub REST API exposes no historical star count without a full stargazer pagination scan. Recommendation: snapshot `stargazers_count` monthly in CI (`docs/squads/address/`) so the trend becomes measurable from 2027-01 onward. Commit-author counts and release cadence below are the verified proxy for "is it alive".

1. **komoot/photon** — https://github.com/komoot/photon · 3,128 ★ · 2013-08-20 · `1.3.0` @ 2026-08-07 · 6 rel/12 m · 5 maintainers/90 d (70 commits) · 42 open / 503 closed · **Apache-2.0** code / OSM **ODbL** data · server (Java 21 + OpenSearch), single 93.7 MB jar; planet index ≈ 95 GB; NZ included in the GraphHopper "Australia-Oceania" extract · OSV: 0 advisories queried · docs: good (CHANGELOG, import/export spec) · **KEEP** (server-side fallback, not on-device)
2. **pelias/pelias** — 3,597 ★ · 2013-11-05 · no GitHub releases (per-component tagging) · 1 maintainer/90 d on the root repo · 234 open issues · **MIT** / OSM ODbL + WOF · server · **KEEP** (platform umbrella, not a dependency)
3. **pelias/api** — 258 ★ · 2014-09-03 · `v7.11.0` @ 2026-09-25 · 10 rel/12 m · 1 maintainer/90 d (15 commits) · 88 open / 401 closed · **MIT** · server · **ADOPT as the LINZ-import path** (see below)
4. **pelias/csv-importer** — 26 ★ · 2018-07-23 · `v6.2.0` @ 2026-09-24 · 5 rel/12 m · 1 maintainer/90 d (11 commits) · 7 open / 24 closed · **MIT** · server · **ADOPT** — imports our LINZ CSV directly (verified column contract: `source`, `lat`, `lon`, `name` required; `street`, `housenumber`/`number`, `postalcode`/`postcode`/`zipcode`, `cross_street` optional; `layer` = address/street/venue)
5. **pelias/openaddresses** — 68 ★ · 2014-12-16 · `v7.3.1` @ 2026-09-26 · 1 maintainer/90 d · 16 open · **MIT** / ODbL · server · **WATCH** (redundant once csv-importer takes our LINZ export)
6. **pelias/openstreetmap** — 121 ★ · 2014-04-25 · `v9.5.0` @ 2026-09-24 · 21 open · **MIT** / ODbL · server · **WATCH** (only if we ever want OSM house numbers)
7. **pelias/query** — 13 ★ · `v12.0.0` @ 2026-09-18 · 12 open · **MIT** · server · **WATCH** (library, pulled in by api)
8. **pelias/model** — 6 ★ · `v11.1.0` @ 2026-09-21 · 9 open · **MIT** · server · **WATCH**
9. **pelias/config** — 8 ★ · `v7.0.0` @ 2026-09-18 · 9 open · **MIT** · server · **WATCH**
10. **pelias/pip-service** — 18 ★ · `v5.0.0` @ 2026-09-18 · 2 open · **MIT** · server · **WATCH**
11. **pelias/wof-admin-lookup** — 12 ★ · `v8.2.0` @ 2026-09-22 · 19 open · **MIT** / WOF-NaturalEarth-CC-BY · server · **WATCH** (admin boundary lookup, not addresses)
12. **pelias/documentation** — 269 ★ · pushed 2026-07-16 · 18 open · **CC-BY-4.0** docs · **WATCH** (docs only)
13. **pelias/docker** — 469 ★ · pushed 2026-03-25 · 49 open · **MIT** · server · **KEEP** (deployment reference for the self-hosted fallback)
14. **openvenues/libpostal** — 4,912 ★ · 2015-03-03 · GitHub release `v1.1` @ 2018-05-09 (libtool versioning; real version 1.1.4 per commit 2025-10-18) · 0 maintainers/90 d (0 commits; HEAD 2025-12-06) · 281 open / 226 closed · **MIT** code / address model data via `Senzing/libpostal-data` (**Apache-2.0**, `1.2.0` @ 2025-11-07) · server (C, ~2 GB model, needs a trained NLP model) · **REJECT for us** (huge, server-only, no NZ gazetteer, no house-number validation) but **the reference implementation** for parse/normalize semantics
15. **openvenues/pypostal** — 877 ★ · pushed 2025-11-01 · last rel `1.0` @ 2017-04-06 · 0 maint/90 d · 45 open · **MIT** / as libpostal · server · **REJECT** (dead bindings, PyPI `pypostal` last upload 2010)
16. **openvenues/node-postal** — 250 ★ · pushed 2025-09-08 · 17 open · **MIT** · server · **REJECT** (same reason; `postal` on PyPI 1.1.11 @ 2025-10-29 is the maintained fork, still server-only)
17. **openvenues/address_languages** — 10 ★ · last push 2016 · **MIT** · reference data · **WATCH** (historical only)
18. **osm-search/Nominatim** — 4,522 ★ · 2012-03-03 · `v5.3.3` @ 2026-10-14 · 5 rel/12 m · 7 maintainers/90 d (100+ commits) · 98 open / 2,166 closed · **GPL-3.0** / ODbL · server · **CLEAN-ROOM STUDY ONLY** (V4 §11.2) — never in the APK, never quoted
19. **openaddresses/openaddresses** — 3,278 ★ · 2014-02-06 · no releases · 6 maintainers/90 d · 985 open / 2,140 closed · **BSD-3-Clause** / source data CC BY per-country · server-side data pipeline · **KEEP** (reference for how a country address dataset is curated; NZ coverage not verified)
20. **geolonia/normalize-japanese-addresses** — 963 ★ · 2020-09-29 · `v3.1.3` @ 2024-12-24 (npm releases are ahead of GitHub tags) · 4 maintainers/90 d (24 commits) · 27 open / 105 closed · **MIT** / Japanese GSI data (permitted) · server (Node) + npm · **ADOPT THE PATTERN** (see "ideas we adopt"): a national-address DB that returns a **`level` ladder** (0 = prefecture not resolved … 8 = down to the block/house) plus a `point` with its own level, and an `other` field for the unresolved tail. That is exactly our `confidence` + `needs_question` + `options` contract, and it is the cleanest model we found.
21. **maxbachmann/RapidFuzz** — 4,173 ★ · 2020-02-29 · `v3.14.6-1` @ 2026-08-30 · 6 rel/12 m · 2 maintainers/90 d (14 commits) · **MIT** · PyPI `rapidfuzz` 3.14.6 @ 2026-08-30, `requires_python >= 3.11` (our API venv is Python 3.11.9 ✔) · CPU, in-process, C++ core · **ADOPT** — replaces `difflib.SequenceMatcher` in `address_correction.py` (O(n) `process.extract` over the road list instead of an O(n) full scan per keystroke)
22. **datamade/usaddress** — 1,637 ★ · 2014-07-17 · no releases · 0 maint/90 d (HEAD 2025-08-07) · 171 open / 184 closed · **MIT** / US USPS data · PyPI `usaddress` 0.5.16 @ 2025-08-07 · server · **REJECT** (US-only, stale, CRF model needs a download)
23. **ideal-postcodes/postcodes.io** — 1,406 ★ · 2014-01-17 · `20.1.0` @ 2026-09-29 · 12 rel/12 m · 2 maintainers/90 d (20 commits) · 5 open / 238 closed · **MIT** / **ODbL** (OSM-derived UK postcodes) · server, periodic bulk CSV+API · **REJECT** (UK, ODbL share-alike on derived data) — but the **model** to copy: a nightly-diffed, checksummed, address dataset published as versioned files and pulled by the app
24. **mountain-pass/addressr** — 117 ★ · 2019-07-11 · `@mountainpass/addressr-react@0.7.5` @ 2026-08-28 · 12 rel/12 m · 2 maintainers/90 d (100+ commits) · 7 open / 25 closed · **Apache-2.0** / **GNAF = CC BY 4.0** · server + React client · **WATCH — the closest analogue**: an Apache-2.0, free, self-hostable, address-*validation* service built on a national CC BY 4.0 gazetteer (Australia GNAF). It is the proof that the "national gazetteer + validation API" shape works under a permissive licence
25. **linz/basemaps** — 128 ★ · 2019-07-29 · `v8.22.1` @ 2026-10-12 · 12 rel/12 m · 5 maintainers/90 d (15 commits) · 9 open / 19 closed · licence **NOASSERTION** (LINZ open data, CC BY 4.0 for most layers) · server + vector tiles · **KEEP** (already the basemap source per FINAL_PROMPT §0-C; the address work reuses the same LDS changeset feed)
26. **linz/linz-data-importer** — 18 ★ · 2018-06-20 · `v2.3.1-beta` @ 2022-08-01 · pushed 2026-07-06 · 35 open · **BSD-3-Clause** · QGIS plugin · **REJECT** (QGIS-only, not a pipeline we can run in CI)
27. **opennewzealand/linz2osm** — 23 ★ · last push 2015-04-19 · **ARCHIVED** · 35 open · **GPL-3.0** · **REJECT** (dead, copyleft)
28. **thecolab-ai/.skills** — 33 ★ · **created 2026-04-10** (2026 newcomer) · pushed 2026-10-12 · 10 open · **MIT** · agent skills for NZ public data (LINZ, Stats NZ) · **WATCH** — a 2026-born NZ-data project worth re-reading in 6 months; it may shorten our LDS access work
29. **headwaymaps/headway** — 3,007 ★ · 2020-11-15 · pushed 2026-10-19 · no GitHub releases · 27 open · **Apache-2.0** / ODbL · self-hostable map stack with geocoding · **WATCH** (stack reference, not a component)
30. **motis-project/motis** — 613 ★ · 2020-04-14 · `v2.11.3` @ 2026-09-10 · pushed 2026-10-20 · 153 open · **MIT** / ODbL · multimodal routing + geocoding · **WATCH** (routing squad, not addresses)
31. **jordond/compass** — 458 ★ · 2024-03-15 · `4.0.1` @ 2026-10-02 · 10 rel/12 m · 2 maintainers/90 d (40 commits) · 24 open · **MIT** / platform geocoder · **WATCH** (Kotlin Multiplatform — the right shape if we ever need a shared JVM/native address lib)
32. **AReallyGoodName/OfflineReverseGeocode** — 499 ★ · last push 2019-10-26 · 5 open · licence **NOASSERTION** · **REJECT** (stale, no licence)
33. **symerio/pgeocode** — 270 ★ · 2018-01-04 · `v0.4.0` @ 2022-12-13 · pushed 2026-10-05 · 21 open · **BSD-3-Clause** / GeoNames (CC BY) · Python, offline postcode→coords · **REJECT** (GeoNames has no NZ house numbers)
34. **dunkelstern/osmgeocoder** — 17 ★ · `2.1.0` @ 2022-07-14 · 3 open · **BSD-3-Clause** / ODbL · **REJECT** (stale, tiny)
35. **bitlap/geocoding** — 283 ★ · 2018-05-10 · `v1.3.1` @ 2022-09-30 · pushed 2025-07-23 · 11 open · **MIT** / JVM (Kotlin) address parser + similarity · **WATCH** (JVM-side parser, not on-device)
36. **gisgraphy/gisgraphy** — 391 ★ · pushed 2023-12-27 · 27 open · **LGPL-3.0** · **REJECT** (copyleft + stale)
37. **alexreisner/geocoder** — 6,449 ★ · 2009-09-15 · pushed 2026-08-09 · 55 open · **MIT** · Ruby multi-provider geocoder · **REJECT** (Ruby; we need LINZ, not Google/Bing)
38. **geopy/geopy** — 4,869 ★ · 2010-03-04 · `2.5.0` @ 2026-07-12 (PyPI same day) · 58 open · **MIT** · Python client for hosted geocoders · **REJECT** (hosted providers; we are offline-first)
   — plus `smeijer/leaflet-geosearch` (1,130 ★, MIT, `v4.4.0` @ 2026-03-17, 64 open) **REJECT** (web widget); `pramsey/pgsql-postal` (145 ★, MIT, pushed 2021) **REJECT**; `rtuszik/photon-docker` (317 ★, Apache-2.0, `2.4.0` @ 2026-08-17) **KEEP** as the packaging reference for the Photon fallback.

## Shortlist (13)

`komoot/photon` · `pelias/api` + `pelias/csv-importer` (+ `pelias/docker`) · `openvenues/libpostal` (reference only) · `geolonia/normalize-japanese-addresses` (pattern donor) · `maxbachmann/RapidFuzz` · `openaddresses/openaddresses` (data-curation reference) · `ideal-postcodes/postcodes.io` (dataset-distribution reference) · `mountain-pass/addressr` (architecture analogue) · `linz/basemaps` · `thecolab-ai/.skills` · `jordond/compass` · `osm-search/Nominatim` (clean-room only) · `headwaymaps/headway`.

## Deep review — top 5

**1. komoot/photon (server-side typo-tolerant geocoder)** — README, CHANGELOG, 1.0.0 and 1.3.0 release notes, last 20 commits, issue counts read.
*Code quality / architecture:* single Java 21 application, Elasticsearch backend removed in 1.0.0 (2026-02-09) in favour of OpenSearch; the 1.0 announcement says the internal DB is "about half the size" of a 0.7 database and a planet needs ≈ 95 GB; 1.0 also added a revamped git-style CLI, `/structured` by default, categories, a `dedupe` parameter, Prometheus metrics and a finalised JSON dump spec. 1.1.0 (2026-04-18) added a **reverse-only mode with a smaller DB** and result rescoring; 1.2.0 (2026-06-11) made the import pipeline fully parallel; 1.3.0 (2026-08-07) re-weighted name matches, exported `admin_level`, and made postcodes searchable without spaces/dashes.
*API ergonomics:* `/api?q=…`, `/structured`, `/reverse`, `/bbox`, `/osm-tag`, `/categories`; result fields include `housenumber`, `street`, `postalcode`, `countrycode`, `extent`.
*Extensibility:* import from Nominatim export, OpenAddresses, **or your own JSON dump** — the JSON spec is the door through which our LINZ rows can enter a Photon instance.
*Performance claims:* vendor-claimed, not our measurement — UNVERIFIED on our hardware.
*Last 20 commits:* almost entirely `lonvia` porting Photon to **Jackson 3** and migrating tests to AssertJ (2026-09-23 → 2026-10-19) — modernising, but **single-maintainer bus factor on the release line** (5 distinct authors/90 d overall).
*Verdict:* excellent, but a **server** component. It cannot satisfy "on-device, offline, offline slice in op-sqlite". Keep as the optional server fallback for web/dashboard address autocomplete.

**2. pelias/api + pelias/csv-importer (the LINZ→geocoder path)** — README of the csv-importer read, release list, commit list, issue counts.
*Code quality / architecture:* Pelias is a micro-service mesh (api, query, model, config, wof-admin-lookup, pip-service) over OpenSearch; each repo is versioned independently (api v7.11.0, query v12.0.0, model v11.1.0, config v7.0.0, csv-importer v6.2.0 — all released 2026-09-18 → 2026-09-26, i.e. an active coordinated train).
*API ergonomics:* the csv-importer's contract is explicit and machine-checkable: `source`, `lat`, `lon`, `name` required; `street`, `housenumber`/`number`, `postalcode`/`postcode`/`zipcode`, `cross_street`, `layer` optional; lowercase column names take priority. **Our LINZ export already has `number`, `road`, `suburb`, `town`, `suffix`, `unit` and (in the GeoJSON) `latitude`/`longitude`** — mapping to `street`=road, `housenumber`=number+suffix, `postalcode`, `name`=`<number> <road>` is mechanical.
*Extensibility:* the `layer` field lets us keep LINZ addresses in the `address` layer and OSM streets in the `street` layer, so the interpolation engine can fill gaps.
*Maintenance:* 1 maintainer/90 d per component, 10 releases/12 m on api — the monorepo is quiet but the components ship.
*Verdict:* **the only candidate that lets us serve a *house-number-aware* geocoder built from LINZ, under MIT, without copyleft.** Adopt as an optional server component; it does not replace the on-device D8 path.

**3. openvenues/libpostal (reference implementation)** — README + last 20 commits + release history read.
*Code quality:* high (C, SIMD paths, careful UTF-8 handling; commit 2025-07-02 fixed a hang on invalid UTF-8 — "will not hang", issue #448; 2025-08-25 fixed a memcpy in geohash; 2025-10-18 fixed a parser-separator leak).
*Maintenance:* **0 commits and 0 maintainers in the last 90 days**; last HEAD 2025-12-06; the GitHub "release" tag is stale (libtool versioning forced `major.minor.0`).
*Why not for us:* it normalises *strings*; it has no gazetteer, so it cannot answer "is house number 1400 on Harewood Road real?", and it cannot run on-device (2 GB model, C library, no RN binding for the model).
*Verdict:* **REJECT as a dependency; KEEP as the spec for what `parse`/`expand`/`normalize` should mean** — our `packages/nz-address` should keep its own deterministic NZ-specific parser.

**4. geolonia/normalize-japanese-addresses (pattern donor)** — README read, last 20 commits read, release list read.
*Key idea:* the returned object carries a **`level` ladder** (0 prefecture → 1 city → 2 ward → 3 town/street → 8 house/block) **and a `point` with its own `level`**, plus `other` = the part that could not be resolved, plus an optional `level` cap for speed.
*Code quality / maintenance:* 4 maintainers/90 d, 24 commits/90 d; the last 20 commits (2026-08 → 2026-09) are release-engineering quality work: npm **OIDC Trusted Publishing** (no long-lived publish token), provenance on prereleases, tag↔`package.json` version verification, dropping npm pin in favour of `allowScripts`, and **explicit "silent fetch failure" detection** (an HTTP 200 error page must be treated as an error).
*Why it matters to us:* that is the exact shape of the D8 contract. Mapping: `level` → our `confidence` buckets, `other` → the "no known street called X" branch, `point.level` → the "street exists but the point is only a suburb centroid" case that our door-memory rules must not treat as a house.
*Verdict:* **ADOPT THE PATTERN** (not the library). It also gives us a model for a *staged* address resolution pipeline instead of a single boolean.

**5. maxbachmann/RapidFuzz** — release list, commit activity, PyPI metadata read.
*Code quality:* C++ core with Python bindings; version 3.14.6 (2026-08-30), 6 releases/12 m, 2 maintainers/90 d.
*API ergonomics for us:* `process.extract` / `process.extractOne` with a `scorer` (WRatio, partial_ratio, token_set_ratio) and a `limit`; `WRatio` with `processor=None` is the right default for road names because it already handles token order and partial matches — exactly the "Rickerton → Riccarton" case.
*Performance claim:* vendor-claimed; our own `SequenceMatcher` is O(n²) in the worst case and is currently applied to *every* known road for *every* correction. **UNVERIFIED** on our data until measured.
*Risks:* C++ wheel availability on Windows/macOS/Linux + Python 3.11 (satisfied), and it is a *new* native dependency in the API image (wheel pinning + `pip-audit` needed).
*Verdict:* **ADOPT** with a measured A/B against `difflib` on the 225,151-address Christchurch set.

## Benchmark

**Status: UNVERIFIED — no benchmark harness exists yet.** `docs/squads/address/benchmarks/README.md` says "Harness: _to be created with the first implementation_"; `docs/squads/address/STATUS.md` records "not measured yet"; `docs/PROGRESS.md` confirms the 100 % figure is over the 87-address fixture, **not** the ≥ 95 % LINZ target.

**The set to build (named, per V4 §12.5):** `docs/squads/address/eval/`
- `linz-christchurch-1000.jsonl` — 1,000 rows sampled uniformly from `data/linz/addresses-christchurch.jsonl` (225,151 rows; stratify so that the 27,401 suffix rows and 52,948 unit rows are represented, plus all 122 suburbs, plus the rural/≥1000-number tail).
- `linz-mutations-1000.jsonl` — 1,000 mutations of the above in the *spoken* register the product actually receives: 1,000-vs-140 style trailing-zero slips, one-character street typos, "no, actually N" self-corrections, missing suburb where the road crosses suburbs, unit forms (`2/14`, `Flat 3`, `14/2`), and RD/rural numbers.
- `linz-absent-500.jsonl` — 500 **non-existent** house numbers on real Christchurch roads (the wrong-house trap: the engine must refuse, not guess).
- `expected.jsonl` — for each input, the exact `Correction` the engine must return, including `needs_question` and the exact `options[]` set.

**Metric definitions (must be fixed before any candidate is chosen):**
- `correction_accuracy` = % of `linz-christchurch-1000` where `corrected` equals the LINZ display address **and** `linz_address_id` is right.
- `wrong_house_rate_at_0.9` = % of corrections emitted with `confidence ≥ 0.9` that point at a *different* house than ground truth — target **0**.
- `needs_question_precision` = % of `needs_question=true` cases where the offered `options[]` actually contain the truth — target ≥ 98 % (a wrong option list wastes a driver interaction).
- `p95 latency` on the CI emulator and one mid-range Android profile — target < 2 s (squad README).

**Top-3 to benchmark (per §12.5, on the same set):** (1) current D8 engine as-is; (2) D8 + RapidFuzz road matching; (3) D8 + RapidFuzz + the geolonia-style `level` ladder re-expressed as confidence bands.

**Published table + raw results →** `docs/squads/address/benchmarks/` and `docs/evidence/`. Until that table exists, no candidate in this file may be claimed as "better than our current choice" on accuracy.

## What's new in 2026 and what we adopt

1. **Photon 1.0 → 1.3 (2026)** — Elasticsearch dropped for OpenSearch, DB halved, reverse-only small DB mode (1.1.0), fully parallel import (1.2.0), name-match re-weighting + `admin_level` export + space-insensitive postcodes (1.3.0). *We adopt:* the idea of a **purpose-built small index** — our FTS slice is already exactly that; Photon proves the pattern.
2. **Pelias component train (Sept 2026)** — api v7.11.0, query v12.0.0, model v11.1.0, csv-importer v6.2.0, config v7.0.0 released within 8 days. *We adopt:* the **csv-importer column contract** for a LINZ-fed instance.
3. **geolonia's release engineering (Aug–Sep 2026)** — npm OIDC Trusted Publishing, provenance, tag↔version verification, silent-fetch-failure detection. *We adopt:* provenance-signed dataset builds + explicit "200 but actually an error page" detection in our LINZ fetcher (`scripts/fetch-linz.py`).
4. **RapidFuzz 3.14 (Aug 2026)** — *We adopt:* replace `difflib` in `address_correction.py`.
5. **Addressr / GNAF (Apache-2.0, 12 releases/12 m)** — a national CC BY 4.0 gazetteer behind a permissive validation service. *We adopt:* the **shape** (gazetteer + validation API + permissive licence) and use it to argue internally that LINZ CC BY 4.0 + our own code is a safe combination.
6. **postcodes.io (MIT, 12 releases/12 m, 5 open issues)** — *We adopt:* the **versioned, checksummed, diff-published dataset** distribution model already specified in FINAL_PROMPT §0-C (weekly rebuild, checksum, atomic swap).

## Data-licence obligations we must honour (read from the official sources on 2026-10-20)

| dataset | licence | obligation | where we would use it | status |
|---|---|---|---|---|
| **LINZ NZ Addresses / NZ Roads Addresses** | **CC BY 4.0** — LINZ: "Almost all data from the LINZ Data Service is provided under the Creative Commons Attribution 4.0 International licence" | attribution: "Sourced from the LINZ Data Service and licensed for reuse under CC BY 4.0". **No share-alike.** | the on-device FTS5 slice (read-only, unencrypted — it is public data) | **KEEP** |
| LINZ aerial imagery / elevation | LINZ does not hold the copyright → a **different attribution statement** is required | variation of the standard statement | aerial/orthophoto squad, not this area | n/a here |
| LINZ property & ownership layers with personal information | **an extra licence must be applied for** | accept the licence | not in the address slice | n/a here |
| LINZ "pending approval" cadastral data | **an extra licence must be accepted** | accept the terms | not in the address slice — but a parcel's *address* can be in that state | **UNVERIFIED** |
| **OSM** (via Photon / Pelias / OpenAddresses) | **ODbL** | attribution "© OpenStreetMap contributors" + **share-alike on the derived database** | server-side fallback geocoders only | **KEEP (server only)** |
| GNAF (Australia) | **CC BY 4.0** | attribution | reference only (addressr) | WATCH |
| GeoNames | **CC BY 4.0** | attribution | rejected candidate (pgeocode) | n/a |
| Who's on First | CC BY + local variants | attribution | `pelias/wof-admin-lookup` (admin boundaries) | WATCH |
| postcodes.io (UK) | MIT code + **ODbL data** | both | rejected candidate | n/a |
| NZ Post / Addressfinder / Google / Mapbox | proprietary, paid; Google additionally restricts bulk caching | contract + ToS | **not used** — and the "do not store Google data" rule is explicit in FINAL_PROMPT §0-F.3 | **REJECT** |

**The consequence that decides the architecture:** the on-device address slice stays **CC BY 4.0 only**. That is exactly *why* we must not mix OSM house numbers into the same FTS5 file — ODbL share-alike would then attach to the derived database we ship in the APK. LINZ-only keeps the whole slice under CC BY 4.0 with a one-line attribution. OSM is allowed on the **server**, where the ODbL obligations are already met (attribution in the map, and the derived database is a server artefact, not a distributed file).

## Who actually runs these (production users — only what is verified)

- **komoot/photon** — started by **komoot** for its outdoor-navigation app; **komoot has been owned by Bending Spoons since 2025**; the project now publishes weekly planet and per-country database dumps through GraphHopper's download service, and the "Australia-Oceania" region explicitly includes **NZ**. This is a geocoder with a corporate owner and a production download pipeline, not a hobby project (sources: the Photon 1.0.0 announcement and the GraphHopper Photon download index, both read 2026-10-20).
- **pelias/pelias** — the reference open geocoder for self-hosters, with a one-command Docker install (`pelias/docker`) and a documentation set (`pelias/documentation`, CC-BY-4.0) that is itself a deliverable-grade artefact.
- **op-sqlite** — 417,985 npm downloads/week (2026-10-20) **and** it is the SQLite layer of PowerSync's React Native SDK, which is a production sync product in its own right.
- **better-auth** — 7,801,856 npm downloads/week (2026-10-20): the de-facto TypeScript auth framework by adoption alone.
- **Ory Kratos / Logto / Casdoor / Keycloak** — production identity servers with published enterprise customers, **not enumerated here** (the vendors' customer pages were not read in this sprint) → UNVERIFIED.

## Decision

**KEEP (no change to the locked decision):** LINZ NZ Addresses (CC BY 4.0) + an **offline FTS5 slice in op-sqlite** + the **D8 correction engine**. This remains the product's differentiator ("NZ address auto-correction with explanation") and it is the only option that satisfies: offline, on-device, house-number-aware, NZ-specific, permissive data licence, zero API cost, and the ability to explain every correction.

**ADOPT (additions, all low-risk):**
- `maxbachmann/RapidFuzz` (MIT, PyPI) inside `apps/api` for road-name matching, behind the existing `AddressStore` protocol so the engine is unchanged. Fallback: keep `difflib` behind the same interface if the wheel cannot be installed in the API image.
- The **geolonia `level` ladder** concept re-expressed inside the D8 result: `confidence` bands + an explicit "resolved to street, not to house" marker, so door memory never keys on a centroid.
- `pelias/api` + `pelias/csv-importer` + `pelias/docker` as an **optional self-hosted server** that indexes our LINZ export for the web dashboard and for admins (not on the phone).
- `komoot/photon` as the **second server fallback** (typo-tolerant free-text search) for non-LINZ areas, self-hosted, never the public instance.
- `postcodes.io`-style **versioned + checksummed dataset publishing** for the weekly LINZ FTS slice (already specified; now with a reference implementation).

**WATCH:** `openaddresses/openaddresses` (NZ coverage unverified), `thecolab-ai/.skills` (2026 NZ-data newcomer), `jordond/compass` (KMP shape), `headwaymaps/headway` (stack), `openvenues/libpostal` (spec reference), `linz/basemaps` (already in use).

**REJECT:** libpostal + bindings (server-only, no gazetteer, stale), Nominatim public API (**OSMF policy forbids client-side autocomplete and reselling geocoding results** — https://operations.osmfoundation.org/policies/nominatim/; a self-hosted instance is allowed but is a clean-room/GPL liability and redundant with Pelias), usaddress, pgeocode, gisgraphy (LGPL), linz2osm (GPL, archived), geopy, alexreisner/geocoder, gisgraphy, AReallyGoodName (no licence), bitlap/geocoding, dunkelstern/osmgeocoder, pramsey/pgsql-postal, symerio/pgeocode, headway (not a component), semver/old-lander wrappers.

**Clean-room (V4 §11.2) — behaviour only, never code:** `osm-search/Nominatim` (GPL-3.0) and `opennewzealand/linz2osm` (GPL-3.0).

**Risks & fallback**
- *LINZ layer IDs / schema drift* → the worker already re-verifies layer IDs before every import; keep that check and fail closed.
- *Attribution* → ship "Sourced from the LINZ Data Service and licensed for reuse under CC BY 4.0" in the app and the dashboard; the aerial/pending-approval/ownership layers are **not** in the address slice, so their extra licences do not apply to us — **UNVERIFIED for the exact layers we import; confirm with the founder's export before the first release**.
- *Licence contamination from OSM* → if Photon/Pelias index OSM features, ODbL share-alike applies to the *derived database*; keep OSM out of the on-device address slice (LINZ only) so the FTS5 slice stays CC BY 4.0.
- *RapidFuzz regression* → A/B it on the 1,000-row set before switching; keep `difflib` as the fallback implementation behind the protocol.
- *No ≥ 95 % yet* → until the benchmark publishes a number, the accuracy claim stays "NOT VERIFIED" in every doc and store listing.

## Monthly radar filter (V4 §11.3) — what we will re-check for this area

Re-run on the first Monday of each month and update this file:
- **komoot/photon** — releases (6 in the last 12 months is the pace to beat) and the CHANGELOG; a 1.4 that changes the ranking model is worth re-benchmarking.
- **pelias/api + pelias/csv-importer** — the component version train; our LINZ CSV mapping must be re-validated whenever the importer's column contract changes.
- **openvenues/libpostal** — default-branch commits (it was at 0 in our 90-day window); if it revives, re-read the licence of the *training data*, not just the code.
- **maxbachmann/RapidFuzz** — new releases (6 in 12 months) and wheel availability for our CI image.
- **geolonia/normalize-japanese-addresses** — the `level` ladder and its release engineering (npm OIDC Trusted Publishing is the pattern to copy for our weekly LINZ slice publishing).
- **ideal-postcodes/postcodes.io** — the dataset-distribution model (nightly diff, checksum, versioned files) our weekly worker must copy.
- **LINZ LDS** — the layer IDs and the licence exceptions (re-verify before each import; fail closed).
- Filters to apply: release in the last 6 months · permissive licence · ≥ 2 active maintainers in 90 days · default-branch commit in the last 90 days · no supply-chain incident · NZ data actually available under a usable licence.
- *No ≥ 95 % yet* → until the benchmark publishes a number, the accuracy claim stays "NOT VERIFIED" in every doc and store listing.

## What we could not verify

- **6-month star trend for every candidate** (no historical star API). UNVERIFIED.
- **Accuracy of any candidate on LINZ data** — no harness exists. UNVERIFIED.
- **Photon/Pelias latency and memory on our hardware** — vendor claims only. UNVERIFIED.
- **libpostal model size (≈ 2 GB) and training-data licence for NZ** — the Senzing data release is Apache-2.0 (repo metadata), but the *training corpus* licensing for NZ tokens is UNVERIFIED.
- **`openaddresses` NZ coverage** — not checked; the repo is a data registry, NZ presence UNVERIFIED.
- **Exact LINZ licence exceptions for the layers we actually import** — the licensing page lists three categories of exception; the address layers are not among them, but the *pending-approval* state of a parcel may be. UNVERIFIED.
- **Median issue response time** (V4 §12.3 asks for it) — the REST API does not expose it; computed comment-interval sampling was out of scope for this sprint. UNVERIFIED.
- **Whether Photon's importer accepts a LINZ-derived JSON dump** — the JSON spec is published but we did not run the import. UNVERIFIED.
