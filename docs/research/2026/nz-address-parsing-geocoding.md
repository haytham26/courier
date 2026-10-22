# Research 2026 — NZ address parsing & geocoding

**Area:** Address Intelligence squad (`docs/squads/address/`) · **Role:** Researcher (V4 §1 role 2, §3, §10.3, §12, §13.1)
**Research date: 2026-10-21.** All star counts, dates, tags, issue counts, licence strings and CI states were read from the live GitHub GraphQL/REST API, PyPI and the official LINZ/OSMF pages **on 2026-10-21** (all dates are **UTC calendar dates**). The GitHub API returns `stargazers_count` as a single current value — there is no historical stargazer series on our token's scopes, so the **6-month trend PROXY** used on every card is: *releases in the last 12 months* + *commits in the last 90 days* + *distinct human maintainers in the last 90 days* (default branch, bots excluded).
**The requirement (V4 §10.3, binding):** ≥ 95 % correction accuracy on a LINZ-sampled set; **zero wrong-house auto-corrections at confidence ≥ 0.9**; every correction explained; on-device and offline.

**Our current choice (the baseline every candidate is compared against)**
- `services/api/app/address_correction.py` (505 lines) — the D8 engine: deterministic, contract `{original, corrected, reason, confidence, needs_question, options[]}`. `similarity()` at line 243 uses **`difflib.SequenceMatcher(...).ratio()`** (line 249) and `services/api/app/nz_address.py:85` uses **`difflib.get_close_matches(..., cutoff=0.75)`** — both are the RapidFuzz replacement targets.
- `packages/nz-address/src/parser.ts` (404 lines) — the TS port: number words → digits, unit `2/14`, suffix `42B`, `SPOKEN_FIXES` for Māori, `CANTERBURY_SUBURBS`.
- `services/worker/address_correction.py` (464 lines) — built the **offline SQLite FTS5** database (`nz_addresses.sqlite`) from the LINZ CSV export; the mobile app read it read-only. **Deleted** in the repository hygiene of MASTER_EXECUTION section 16: nothing imported it and the offline slice was never built. The store that reads the slice is `services/api/app/address_correction.py` (`SqliteAddressStore`).
- **Real data is present locally and counted on 2026-10-21** (line counts, not the summary files): `data/linz/addresses-christchurch.jsonl` **225,151** · `addresses-selwyn.jsonl` **194,752** · `addresses-waimakariri.jsonl` **236,141** ⇒ **656,044 real Canterbury addresses** indexed (122 / 127 / 119 distinct suburbs; 27,401 / 21,002 / 27,268 with a suffix; 52,948 / 38,936 / 52,666 with a unit).
- **The accuracy claim is NOT verifiable from this repository.** `docs/log/2026-W43.md` (2026-10-20 handoff) records "**96.9 %** (1745/1800)" over the 656,044-address index; `docs/status/QUALITY_SCORECARD.md` line 34 records "**98.3 %** (590/600 checks over 120 real addresses × 5 cases)". **Both cite `docs/evidence/phase-2.3/linz-accuracy.md`, and that file does not exist in the repo**; `services/api/tests/address/test_linz_accuracy.py` is likewise **absent** (only a stale `__pycache__/test_linz_accuracy.cpython-311-pytest-9.1.1.pyc` from an unmerged branch, `feat/t2-expo-58-decision`, "PR is not open yet"). ⇒ **the 96.9 % figure is UNVERIFIED** and the two documents disagree; this must be resolved before any accuracy number is published.
- **Licence baseline (re-read 2026-10-21, https://www.linz.govt.nz/data/licensing-and-using-data/):** "Almost all data from the LINZ Data Service is provided under the **Creative Commons Attribution 4.0 International** licence", with three stated exceptions: **aerial imagery** (LINZ does not own the copyright → a *variation* of the attribution statement is required), **property/ownership layers with personal information** (an extra licence must be applied for) and **"pending approval" cadastral data** (councils must accept an additional licence). OSM is **ODbL**.

## Queries run

| # | Query | Filters | Results returned |
|---|---|---|---|
| Q1 | `search repos "geocoding"` | `--sort stars`, limit 30 | 30 |
| Q2 | `search repos "address parser"` | `--sort stars`, limit 30 | 30 (mostly e-mail parsers; 8 real) |
| Q3 | `search repos --topic geocoding` | `--sort stars`, limit 30 | 30 |
| Q4 | `search repos "new zealand address"` | `--sort stars`, limit 30 | **7** (only 2 usable NZ projects; the NZ space is empty) |
| Q5 | `search repos "nz address new zealand"` | `--sort stars` | 0 |
| Q6 | `search repos "postal code lookup offline"` | `--sort stars` | 0 |
| Q7 | `search repos "address validation"` | `--sort stars` | 30 (polluted by e-mail validators) |
| Q8 | `api graphql` over 48 candidate repos | 1 query/repo: stars, created, pushed, licence, topics, open/closed issues, open PRs, 20 releases, 90-day history + distinct authors, `statusCheckRollup` | 48 |
| Q9 | `api graphql` issues/PRs (18 repos) | 50 oldest closed issues (first-comment delay), 30 newest open issues, 20 newest open PRs | 18 |
| Q10 | `api repos/<o>/<r>/readme` + `contents/*` (raw) | 6 READMEs + `docs/licences.mdx` + `Senzing/libpostal-data` | 8 |
| Q11 | PyPI JSON API | `rapidfuzz`, `postal`, `usaddress`, `geopy`, `pypostal` | 5 |
| Q12 | OSV API (`api.osv.dev/v1/query`) | PyPI + npm | 13 packages, 2 advisories |
| Q13 | webfetch `linz.govt.nz/data/licensing-and-using-data/` | official | 1 |
| Q14 | webfetch `operations.osmfoundation.org/policies/nominatim/` | official | 1 (quoted in the licence section) |
| Q15 | webfetch `komoot/photon` CHANGELOG (raw) | releases 1.0.0 → 1.3.0 | 1 |
| Q16 | webfetch `geolonia/normalize-japanese-addresses` README | the `level` ladder | 1 |

## Candidates (48) — evidence cards

Format: `repo · stars · created · last release @ date · rel/12m · maint(90 d) · open/closed issues · open PRs · licence (code / data) · platform · decision`. Median first-response = median delay to the **first comment** over the **50 oldest closed issues** of each repo (a stable, reproducible sample; it biases long-lived repositories downwards — read it as "how fast were the oldest complaints answered"); **UNVERIFIED** where n < 5.

1. **komoot/photon** — https://github.com/komoot/photon · 3,128 ★ · 2013-08-20 · `1.3.0` @ 2026-08-07 · 6 rel/12m · 5 maint/90 d (70 commits) · 42/504 · 0 PRs · **Apache-2.0** / OSM **ODbL** · server (Java 21 + OpenSearch) · CI SUCCESS (compile+test on Java 21 **and** 25, a Nominatim-import job, a 1.0.1 backwards-compat job) · median 7.6 h (n=49) · **KEEP** (server-side fallback, never on-device)
2. **pelias/pelias** — 3,597 ★ · 2013-11-05 · no releases (per-component tagging) · 1 maint/90 d (1 commit, last push 2026-07-24) · 234/627 · MIT · CI SUCCESS · **KEEP** (the umbrella, not a dependency)
3. **pelias/api** — 258 ★ · 2014-09-03 · `v7.11.0` @ 2026-09-25 · 10 rel/12m · 1 maint/90 d (15 commits) · 88/401 · 48 open PRs · MIT · CI SUCCESS (unit tests on Node 22/24/26 + docker images) · median **308.8 h** (n=45) · **ADOPT** (optional server geocoder)
4. **pelias/csv-importer** — 26 ★ · 2018-07-23 · `v6.2.0` @ 2026-09-24 · 5 rel/12m · 1 maint/90 d (11 commits) · 7/24 · MIT · CI SUCCESS · median 4.0 h (n=19) · **ADOPT** (the LINZ import path)
5. **pelias/openaddresses** — 68 ★ · 2014-12-16 · `v7.3.1` @ 2026-09-26 · 6 rel/12m · 1 maint/90 d (13 commits) · 12/73 · 4 PRs · MIT / ODbL · **WATCH** (redundant once csv-importer takes our LINZ export)
6. **pelias/openstreetmap** — 121 ★ · 2014-04-25 · `v9.5.0` @ 2026-09-24 · 13 rel/12m · 2 maint/90 d (23 commits) · 12/99 · 9 PRs · MIT / ODbL · **WATCH** (only if we ever want OSM house numbers)
7. **pelias/query** — 13 ★ · 2015-08-31 · `v12.0.0` @ 2026-09-18 · 2 rel/12m · 1 maint/90 d · 6/14 · MIT · **WATCH** (pulled in by api)
8. **pelias/model** — 6 ★ · 2014-11-26 · `v11.1.0` @ 2026-09-21 · 2 rel/12m · 1 maint/90 d · 4/21 · MIT · **WATCH**
9. **pelias/config** — 8 ★ · 2014-07-25 · `v7.0.0` @ 2026-09-18 · 3 rel/12m · 1 maint/90 d · 7/17 · MIT · **WATCH**
10. **pelias/pip-service** — 18 ★ · 2017-03-06 · `v5.0.0` @ 2026-09-18 · 4 rel/12m · 1 maint/90 d · 1/20 · MIT · **WATCH**
11. **pelias/wof-admin-lookup** — 12 ★ · 2015-12-22 · `v8.2.0` @ 2026-09-22 · 7 rel/12m · 1 maint/90 d (17 commits) · 10/43 · 9 PRs · MIT / Who's on First (CC BY + local variants) · **WATCH** (admin boundaries, not addresses)
12. **pelias/documentation** — 269 ★ · 2015-05-19 · no releases · 0 maint/90 d (last push 2026-07-16) · 12/65 · **CC-BY-4.0** · NO_CI · **KEEP** (a deliverable-grade docs set)
13. **pelias/docker** — 469 ★ · 2018-06-11 · no releases · 0 maint/90 d (last push 2026-03-25) · 32/165 · 17 PRs · MIT · NO_CI · **WATCH** (deployment reference)
14. **openvenues/libpostal** — 4,912 ★ · 2015-03-03 · last GitHub release `v1.1.4` @ 2025-10-18 (default-branch HEAD still 2025-12-06) · 0 rel/12m · **0 maint/90 d** (last push 2026-05-13) · 281/226 · 18 PRs · **MIT** / model data from `Senzing/libpostal-data` (**Apache-2.0**, 75 ★, pushed 2026-03-23, not archived) · server (C, ~2 GB model) · CI SUCCESS (ubuntu + macos + appveyor) · median 5.3 h (n=48) · **REJECT as a dependency; KEEP as the parse/normalize spec**
15. **openvenues/pypostal** — 877 ★ · 2016-01-26 · `1.0` @ 2017-04-06 · 0 maint/90 d (last push 2025-11-01) · 37/39 · MIT · NO_CI · **REJECT** (dead bindings; PyPI `pypostal` last upload 2010)
16. **openvenues/node-postal** — 250 ★ · 2015-12-18 · no release · 0 maint/90 d (last push 2025-09-08) · 15/18 · MIT · NO_CI · **REJECT**
17. **openvenues/address_languages** — 10 ★ · 2016-03-08 · no release · 0 maint/90 d (last push 2016) · 0/0 · MIT · **REJECT** (historical reference data)
18. **osm-search/Nominatim** — 4,525 ★ · 2012-03-03 · `v5.3.3` @ 2026-10-14 · 5 rel/12m · 7 maint/90 d (100 commits) · 98/2,166 · 4 PRs · **GPL-3.0** / ODbL · CI SUCCESS (ubuntu 24+26, windows 3.10+3.14) · median 12.1 h (n=47) · **CLEAN-ROOM STUDY ONLY (V4 §11.2)** — never in the APK, never quoted
19. **openaddresses/openaddresses** — 3,278 ★ · 2014-02-06 · no releases · 6 maint/90 d (100 commits) · 985/2,140 · 36 PRs · **BSD-3-Clause** / per-country source licences · CI SUCCESS (pre-commit) · median 0.41 h (n=46) · **KEEP** (how a national address dataset is curated; **NZ coverage UNVERIFIED**)
20. **geolonia/normalize-japanese-addresses** — 963 ★ · 2020-09-29 · `v3.1.3` @ 2024-12-24 (GitHub tag; npm publishes ahead) · 0 rel/12m · 4 maint/90 d (24 commits) · 27/105 · 10 PRs · **MIT** / Japanese GSI data (permitted) · CI SUCCESS (build+test on Node 18–24) · median 2.6 h (n=26) · **ADOPT THE PATTERN** (the `level` ladder)
21. **rapidfuzz/RapidFuzz** — 4,173 ★ · 2020-02-29 (the repo moved out of the `maxbachmann` org into `rapidfuzz`; the old URL still redirects) · `v3.14.6-1` @ 2026-08-30 · 6 rel/12m · 2 maint/90 d (14 commits) · 30/244 · 6 PRs · **MIT** (repo `LICENSE`) — the **PyPI `license` field is empty and there is no `License ::` classifier** · **CI FAILURE** · PyPI `rapidfuzz` 3.14.6 (2026-08-30), `requires_python >= 3.11` (our API allows `>=3.11,<3.13` ✔) · OSV 0 · median 3.0 h (n=49) · **ADOPT**
22. **datamade/usaddress** — 1,637 ★ · 2014-07-17 · latest GitHub release `v0.5.16` @ 2025-08-07 · 0 maint/90 d (last push 2025-08-07) · 171/184 · MIT / US USPS data · PyPI 0.5.16 (2025-08-07) · NO_CI · **REJECT** (US-only, stale, CRF model needs a download)
23. **ideal-postcodes/postcodes.io** — 1,406 ★ · 2014-01-17 · `20.1.0` @ 2026-09-29 · 15 rel/12m · 2 maint/90 d (20 commits) · 5/238 · 11 PRs · **MIT** (code) / **OS OpenData licence** + ONSPD for BT + "Contains Royal Mail data © Royal Mail copyright and database right 2025" (read from `docs/licences.mdx`, 2026-10-21 — **not** ODbL; the previous version of this file said ODbL and was wrong) · CI SUCCESS (docker + postgres) · median 10.5 h (n=32) · **WATCH** (the *dataset-distribution* model)
24. **mountain-pass/addressr** — 117 ★ · 2019-07-11 · `@mountainpass/addressr-react@0.7.5` @ 2026-08-28 · 20 rel/12m · 2 maint/90 d (100 commits) · 7/25 · 21 PRs · **Apache-2.0** / GNAF **CC BY 4.0** · **CI FAILURE** · median 17.8 h (n=24) · **WATCH — the closest analogue**: a national CC BY gazetteer behind an Apache-2.0 validation API
25. **linz/basemaps** — 128 ★ · 2019-07-29 · `v8.22.1` @ 2026-10-12 · 20 rel/12m · 5 maint/90 d (15 commits) · 9/19 · 38 PRs · **NOASSERTION** (LINZ open data; CC BY 4.0 for most layers) · CI SUCCESS (build, container tags, release-please, screenshot, smoke) · median 31.5 h (n=18) · **KEEP** (already our basemap source)
26. **linz/linz-data-importer** — 18 ★ · 2018-06-20 · `v2.3.1-beta` @ 2022-08-01 · 0 maint/90 d (last push 2026-07-06) · 23/82 · 12 PRs · BSD-3-Clause · QGIS plugin · **REJECT** (not a CI-runnable pipeline)
27. **opennewzealand/linz2osm** — 23 ★ · 2010-03-30 · no release · 0 maint/90 d (last push **2015-04-19**) · 35/87 · **ARCHIVED** · **GPL-3.0** · **REJECT / clean-room only**
28. **thecolab-ai/.skills** — 33 ★ · **created 2026-04-10** · no release · 1 maint/90 d (100 commits) · 7/67 · 3 PRs · MIT · **CI FAILURE** · **WATCH** — a 2026-born NZ-public-data project (LINZ, Stats NZ); re-read in 6 months, it may shorten our LDS access work
29. **headwaymaps/headway** — 3,007 ★ · 2020-11-15 · no release · 1 maint/90 d (100 commits) · 24/71 · 3 PRs · Apache-2.0 / ODbL · CI SUCCESS · **WATCH** (a stack, not a component)
30. **motis-project/motis** — 613 ★ · 2020-04-14 · `v2.11.3` @ 2026-09-10 · 20 rel/12m · 8 maint/90 d (75 commits) · 112/372 · 43 PRs · MIT / ODbL · CI PENDING · **WATCH** (routing squad)
31. **jordond/compass** — 459 ★ · 2024-03-15 · `4.0.1` @ 2026-10-02 · 10 rel/12m · 2 maint/90 d (40 commits) · 17/44 · 7 PRs · MIT · CI SUCCESS (Verify, Test default, Test package, Test JS in browser) · median 20.8 h (n=32) · **WATCH** — the Kotlin-Multiplatform shape if we ever want a shared JVM/native address library
32. **AReallyGoodName/OfflineReverseGeocode** — 499 ★ · 2014-06-13 · `1.0` @ 2016-02-01 · 0 maint/90 d (last push 2019-10-26) · 4/8 · **NOASSERTION** · **REJECT** (stale, no licence)
33. **symerio/pgeocode** — 270 ★ · 2018-01-04 · `v0.4.0` @ 2022-12-13 · 0 maint/90 d (last push 2026-10-05) · 16/28 · BSD-3-Clause / GeoNames (CC BY) · CI SUCCESS (wheel matrix 3.10–3.13) · **REJECT** (postcode→coordinates only; GeoNames has no NZ house numbers)
34. **dunkelstern/osmgeocoder** — 17 ★ · 2018-05-22 · `2.1.0` @ 2022-07-14 · 0 maint/90 d (last push 2022-07-15) · 3/0 · BSD-3-Clause / ODbL · **REJECT** (stale, tiny)
35. **bitlap/geocoding** — 283 ★ · 2018-05-10 · `v1.3.1` @ 2022-09-30 · 0 maint/90 d (last push 2025-07-23) · 10/35 · MIT · JVM (Kotlin) address parser + similarity · **REJECT** (JVM-only, stale)
36. **gisgraphy/gisgraphy** — 391 ★ · 2015-01-02 · no release · 0 maint/90 d (last push 2023-12-27) · 23/36 · **LGPL-3.0** · **REJECT** (copyleft + stale)
37. **alexreisner/geocoder** — 6,449 ★ · 2009-04-15 · no release · 2 maint/90 d (last push 2026-08-09) · 44/885 · 11 PRs · MIT · Ruby multi-provider · CI SUCCESS (2.7–3.4) · **REJECT** (Ruby; we need LINZ, not Google/Bing)
38. **geopy/geopy** — 4,869 ★ · 2010-03-04 · `2.5.0` @ 2026-07-12 · 1 rel/12m · 0 maint/90 d · 36/260 · 22 PRs · MIT · PyPI 2.5.0 (2026-07-12) · **CI FAILURE** · **REJECT** (hosted providers; we are offline-first)
39. **smeijer/leaflet-geosearch** — 1,130 ★ · 2012-12-24 · `v4.4.0` @ 2026-03-17 · 1 rel/12m · 1 maint/90 d (last push 2026-10-13) · 63/185 · MIT · CI PENDING · **REJECT** (a web widget)
40. **rtuszik/photon-docker** — 317 ★ · 2024-09-04 · `2.4.0` @ 2026-08-17 · 11 rel/12m · 3 maint/90 d (29 commits) · 6/88 · 24 PRs · Apache-2.0 · CI SUCCESS (incl. a **Socket Security: Project Report** job) · **WATCH** (the packaging reference for a self-hosted Photon)
41. **openeventdata/mordecai** — 765 ★ · 2016-06-23 · `v2.1.0` @ 2020-07-16 · 0 maint/90 d (last push 2021-09-17) · 27/73 · MIT / spaCy + GeoNames · NO_CI · **REJECT** (stale; geoparsing, not house-number validation)
42. **hassansin/parse-address** — 165 ★ · 2014-12-10 · `v1.0.0` @ 2018-07-14 · 0 maint/90 d (last push 2023-08-23) · 23/4 · **NOASSERTION** · **REJECT** (no licence, US-only)
43. **moneals/addresser** — 42 ★ · 2018-08-06 · no release · 1 maint/90 d (5 commits, last push 2026-08-13) · 9/4 · 13 PRs · MIT · NO_CI · **WATCH** (small Node street-address parser — reference only)
44. **addynz/Address-Lookup** — 7 ★ · 2017-11-18 · `1.6.3` @ 2025-04-12 · 0 maint/90 d (last push 2025-04-12) · 1/1 · MIT · NO_CI · **WATCH** — an **NZ** address-lookup/autocomplete widget on the commercial AddressFinder API: proof that NZ address entry is a product category, and a read of the market's NZ UX
45. **cmhh/linzgeocode** — 1 ★ · 2023-03-29 · no release · 0 maint/90 d (last push 2023-04-02) · 0/0 · **NOASSERTION** · **REJECT** (a 1-star Scala demo of the LINZ address DB)
46. **pramsey/pgsql-postal** — 145 ★ · 2016-03-12 · no release · 0 maint/90 d (last push 2021-01-27) · 0/15 · MIT · **REJECT**
47. **geokit/geokit** — 1,626 ★ · 2008-12-01 · no release · 0 maint/90 d (last push 2024-07-29) · 18/83 · MIT · Ruby · **REJECT**
48. **nchaulet/node-geocoder** — 952 ★ · 2013-08-13 · no release · 0 maint/90 d (last push 2025-10-06) · 41/125 · MIT · CI SUCCESS (Node 18/20/21) · **REJECT** (hosted providers)

**Security advisories + supply chain (OSV, 2026-10-21).** PyPI `rapidfuzz` **0** · npm `dexie` 1 (GHSA-3xgx-r9j4-qw9w) · `tesseract.js` 1 (GHSA-83rx-c8cr-6j8q) · `react-native-vision-camera` 0 · `@op-engineering/op-sqlite` 0 · `react-native-nitro-modules` 0 · `@powersync/react-native` 0 · `expo-sqlite` 0. **No supply-chain incident in any candidate we propose to adopt.** Note that RapidFuzz is a **C++ extension with binary wheels** — the wheel hash must be pinned in `uv.lock` and re-checked on upgrade.

**Production users — only what is verified (2026-10-21).**
- **Photon** — komoot's own geocoder; komoot has been owned by **Bending Spoons** since 2025 (`gcar-bendingspoons` is a Photon maintainer, visible in the 90-day author list); the project publishes weekly planet and per-country database dumps, and the "Australia-Oceania" extract includes **NZ**.
- **Pelias** — the reference open geocoder for self-hosters; a one-command Docker install (`pelias/docker`) and a documentation set that is itself a deliverable.
- **LINZ data** — the public national address dataset of New Zealand (by definition used by every NZ addressing product).
- **op-sqlite** — 417,985 npm dl/week and the SQLite layer of PowerSync's React Native SDK.
- **RapidFuzz** — the string-matching library used across the Python data ecosystem; the safest generalisation we can make without a citation. *(Adoption counts beyond the above are UNVERIFIED — the vendors' customer pages were not read in this sprint.)*

**CI status (default-branch head rollup, 2026-10-21).** SUCCESS: `photon`, `pelias/*` (all components), `libpostal`, `Nominatim`, `openaddresses`, `geolonia`, `postcodes.io`, `linz/basemaps`, `headway`, `compass`, `pgeocode`, `alexreisner/geocoder`, `node-geocoder`, `photon-docker`. **FAILURE:** `rapidfuzz/RapidFuzz`, `geopy`, `mountain-pass/addressr`, `thecolab-ai/.skills`. **NO_CI:** `pelias/documentation`, `pelias/docker`, `pypostal`, `node-postal`, `address_languages`, `usaddress`, `mordecai`, `parse-address`, `addresser`, `addynz/Address-Lookup`, `linzgeocode`, `pgsql-postal`, `geokit`. A repo with no CI gives us **no test signal**.

**Docs quality (read 2026-10-21).** Excellent: `photon` (CHANGELOG + an import/export spec), `pelias` (a documentation site), `geolonia` (a live demo page + per-level semantics), `RapidFuzz` (scorer semantics, benchmark charts, install docs), `postcodes.io` (Docusaurus + OpenAPI + a licences page). Adequate: `Nominatim` (wiki), `openaddresses` (a source registry with a per-source licence file). Thin: `libpostal` (a README and an old wiki), `thecolab-ai/.skills` (a skills repo, not a library).

## Shortlist (13)

`komoot/photon` · `pelias/api` + `pelias/csv-importer` (+ `pelias/docker`) · `openvenues/libpostal` (spec reference) · `geolonia/normalize-japanese-addresses` (pattern donor) · `rapidfuzz/RapidFuzz` · `openaddresses/openaddresses` (curation reference) · `ideal-postcodes/postcodes.io` (dataset-distribution reference) · `mountain-pass/addressr` (architecture analogue) · `linz/basemaps` · `thecolab-ai/.skills` · `jordond/compass` · `osm-search/Nominatim` (clean-room only) · `headwaymaps/headway`.

## Deep review — top 5

**1. komoot/photon (server-side typo-tolerant geocoder)** — CHANGELOG read in full for 1.0.0 → 1.3.0, issue/PR lists read.
*Architecture:* one Java 21 application over OpenSearch. **1.0.0 (2026-02-09)** removed the Elasticsearch backend, raised the Java floor to 21, introduced a git-style CLI, streamlined the DB (≈ half the size of a 0.7 DB; the current planet dump is **62.9 GB (62,865,835,326 bytes, updated 2026-10-20)** — the ≈ 95 GB figure was the 1.0 announcement and is superseded), finalised the **JSON dump format v0.1.0** (the door through which our LINZ rows could enter an instance), added categories + category filters, a `dedupe` parameter, Prometheus metrics and a query option to always include results with a house number. **1.1.0 (2026-04-18)** added a **reverse-only mode with a smaller DB** and OpenSearch result rescoring. **1.2.0 (2026-06-11)** made the import pipeline **fully parallel**. **1.3.0 (2026-08-07)** re-weighted name matches, exported **`admin_level`**, made postcodes searchable **without spaces or dashes**, and switched to Nominatim's computed postcode.
*API:* `/api?q=…`, `/structured`, `/reverse`, `/bbox`, `/osm-tag`, `/categories`; result fields include `housenumber`, `street`, `postalcode`, `countrycode`, `extent`.
*Maintenance:* 5 maintainers/90 d, 70 commits/90 d, 6 releases/12 m, CI SUCCESS, median first response 7.6 h. **Open issue #1121 "Search-as-you-type for addresses doesn't work properly while typing the street name"** and #1028 "Add `addr:unit` support" are the two that touch us.
*Verdict:* excellent, but a **server** component — it cannot satisfy "on-device, offline, FTS5 slice in op-sqlite". **KEEP as the optional server fallback** for the web dashboard's free-text search.

**2. pelias/api + pelias/csv-importer (the LINZ → geocoder path)** — csv-importer README + issues/PRs read.
*Architecture:* a micro-service mesh (api, query, model, config, wof-admin-lookup, pip-service) over OpenSearch, each repo versioned independently — api v7.11.0, query v12.0.0, model v11.1.0, config v7.0.0, csv-importer v6.2.0, all released **2026-09-18 → 2026-09-26**, i.e. an active coordinated train. CI runs unit tests on Node 22, 24 and 26 plus docker image builds.
*API ergonomics:* the csv-importer's contract is explicit and machine-checkable — `source`, `lat`, `lon`, `name` required; `street`, `housenumber`/`number`, `postalcode`/`postcode`/`zipcode`, `cross_street`, `layer` optional; lowercase column names take priority; `layer` = address/street/venue. **Our LINZ export already has `number`, `road`, `suburb`, `town`, `suffix`, `unit`** (and lat/lon in the GeoJSON), so the mapping `street`=road, `housenumber`=number+suffix, `postalcode`, `name`="<number> <road>" is mechanical. Open PR #1627 ("libpostal: discard parse containing single 'suburb' label") shows they already fight the suburb-as-city problem we have.
*Maintenance:* 1 maintainer/90 d per component (the whole train is effectively one person — `orangejulius`), 10 releases/12 m on api, but **median first response 308.8 h (n=45)** — a bus factor of one on a component we would depend on.
*Verdict:* the **only candidate that lets us serve a house-number-aware geocoder built from LINZ under MIT with no copyleft**. **ADOPT as an optional server component**; it does not replace the on-device D8 path.

**3. openvenues/libpostal (the reference implementation)** — README + issues + commit activity read.
*Code quality:* high (C, SIMD paths, careful UTF-8 handling). *Maintenance:* **0 commits and 0 maintainers in the last 90 days**; last push 2026-05-13; the last GitHub release is **v1.1.4 (2025-10-18)** and the default-branch HEAD is still 2025-12-06 (the older `v1.1` tag from 2018 was libtool versioning). Median first response 5.3 h (n=48) on the issues it still triages.
*Why not for us:* it normalises *strings*; it has **no gazetteer**, so it cannot answer "is house number 1400 on Harewood Road real?"; and it cannot run on-device (a ~2 GB model, a C library, no RN binding). Its **model data** is now `Senzing/libpostal-data` (**Apache-2.0**, 75 ★, pushed 2026-03-23) — the licence improved since the last review, but the *training corpus* provenance for NZ tokens is still UNVERIFIED.
*Verdict:* **REJECT as a dependency; KEEP as the spec** for what `parse` / `expand` / `normalize` should mean. `packages/nz-address` keeps its own deterministic NZ-specific parser.

**4. geolonia/normalize-japanese-addresses (the pattern donor)** — README read.
*Key idea:* the result object carries a **`level` ladder** (0 = prefecture not resolved … 3 = town/street … 8 = house/block number), a **`point` with its own `level`**, plus **`other`** = the part that could not be resolved. The README is explicit that *address level and point level can differ*: level 8 was resolved but no point existed, so the **town/street representative point** is returned. That is precisely the "street exists but the point is only a centroid" case our door-memory rules must never treat as a house.
*Maintenance:* 4 maintainers/90 d, 24 commits/90 d, CI SUCCESS, median 2.6 h. The last 20 commits are release-engineering quality work: npm **OIDC Trusted Publishing** (no long-lived publish token), provenance on prereleases, tag↔`package.json` version verification, and **explicit "silent fetch failure" detection** (an HTTP 200 that is really an error page must be treated as an error).
*Verdict:* **ADOPT THE PATTERN** (not the library) — it is the cleanest model we found for our `confidence` + `needs_question` + `options` contract, and its release engineering is a template for our weekly LINZ slice publishing.

**5. rapidfuzz/RapidFuzz — the difflib replacement** — README + release list + commit activity + PyPI metadata read.
*Code quality:* a C++ core with Python bindings; version **3.14.6** (2026-08-30), 6 releases/12 m, 2 maintainers/90 d, 14 commits/90 d, median first response 3.0 h (n=49). **The default-branch CI rollup is FAILURE** — we pin the version and re-check the wheel on every upgrade; we do not track `main`.
*API ergonomics for us:* `process.extract(query, choices, scorer=…, limit=…)` and `process.extractOne`; scorers `fuzz.WRatio`, `fuzz.ratio`, `fuzz.partial_ratio`, `fuzz.token_set_ratio`; `processor=None` is the right default for road names (it already handles token order and partial matches — the "Rickerton → Riccarton" case) and `processor=utils.default_process` lowercases/removes punctuation for free-text input.
*Our two call sites, and the exact replacement:*
- `services/api/app/address_correction.py:249` — `SequenceMatcher(None, left, right).ratio()` inside `similarity()`, which then takes `max(ratio, jaccard)`. ⇒ `fuzz.ratio` (or `fuzz.WRatio`) plus the existing Jaccard term; **the semantics must be preserved exactly**, because the 0.9 confidence band and the wrong-house rule depend on this number.
- `services/api/app/nz_address.py:85` — `difflib.get_close_matches(text.lower(), lowered.keys(), n=1, cutoff=0.75)` over the suburb list ⇒ `process.extractOne(text.lower(), lowered.keys(), scorer=fuzz.WRatio, score_cutoff=75)`, returning `(value, score)`.
*Performance:* vendor-claimed; our `SequenceMatcher` is O(n²) in the worst case and is applied to *every* known road for *every* correction — **UNVERIFIED on our data until measured**.
*Risks:* a new **binary wheel** in the API image (pin the hash; `pip-audit`/`uv audit` must cover it) and a `requires_python >= 3.11` floor (our API pins `>=3.11,<3.13` ✔).
*Verdict:* **ADOPT**, behind the existing `AddressStore` protocol, **A/B'd against `difflib` on the 1,000-row LINZ set** (accuracy must not move; the speed-up is a bonus).

## Benchmark

**Status: UNVERIFIED — no benchmark harness exists.** `docs/squads/address/benchmarks/README.md` = "Harness: _to be created with the first implementation_"; `docs/squads/address/STATUS.md` = "not measured yet"; `docs/squads/address/eval/` does not exist. The only accuracy evidence in the repo is the 87-address committed fixture (`docs/evidence/phase-2.3/accuracy.log`: 2 passed) — and `docs/evidence/phase-2.3/README.md` itself says the fixture's `linz_address_id`s are **placeholders**, so it "proves the engine is internally consistent, **not** that it matches LINZ ground truth".

**The set to build (named, per V4 §12.5) — the LINZ-sampled set:** `docs/squads/address/eval/`
- `linz-christchurch-1000.jsonl` — 1,000 rows sampled uniformly from `data/linz/addresses-christchurch.jsonl` (225,151 rows), stratified so the 27,401 suffix rows and 52,948 unit rows are represented, all 122 suburbs appear, and the rural / ≥ 1000-number tail is included; then the same for **selwyn** (194,752) and **waimakariri** (236,141) — the full **656,044**-address population is our sampling frame.
- `linz-mutations-1000.jsonl` — 1,000 mutations in the *spoken* register the product receives: 1,000-vs-140 trailing-zero slips, one-character street typos, "no, actually N" self-corrections, a missing suburb where the road crosses suburbs, unit forms (`2/14`, `Flat 3`, `14/2`), and RD/rural numbers.
- `linz-absent-500.jsonl` — 500 **non-existent** house numbers on real Christchurch roads (the wrong-house trap: the engine must refuse, not guess).
- `expected.jsonl` — for each input, the exact `Correction` the engine must return, including `needs_question` and the exact `options[]` set.

**Metrics (fixed before any candidate is chosen):** `correction_accuracy` = % of `linz-christchurch-1000` where `corrected` equals the LINZ display address **and** the `linz_address_id` is right · `wrong_house_rate_at_0.9` = % of corrections emitted with `confidence ≥ 0.9` that point at a *different* house than ground truth → **target 0** · `needs_question_precision` = % of `needs_question=true` cases whose `options[]` contain the truth → **target ≥ 98 %** · `p95 latency` on the CI emulator and one mid-range Android profile → **< 2 s**.

**Top-3 to benchmark on the same set:** (1) the current D8 engine as-is (the baseline); (2) D8 + **RapidFuzz** road/suburb matching; (3) D8 + RapidFuzz + the **geolonia-style `level` ladder** re-expressed as confidence bands (including a "resolved to street, not to house" marker).

**Published table + raw results →** `docs/squads/address/benchmarks/` and `docs/evidence/phase-2.3/linz-accuracy.md` — **that file must be created**: two documents currently cite it and it does not exist, and the two numbers they quote (96.9 % vs 98.3 %) disagree.

## Data-licence obligations (re-read from the official sources on 2026-10-21)

| dataset | licence | obligation | where we would use it | status |
|---|---|---|---|---|
| **LINZ NZ Addresses / NZ Roads Addresses** | **CC BY 4.0** (LINZ: "Almost all data from the LINZ Data Service is provided under the Creative Commons Attribution 4.0 International licence") | attribution: "Sourced from the LINZ Data Service and licensed for reuse under CC BY 4.0". **No share-alike.** | the on-device FTS5 slice (read-only, unencrypted — public data) | **KEEP** |
| LINZ aerial imagery / elevation | LINZ does not hold the copyright → a **different attribution statement** | variation of the standard statement | the aerial squad, not this area | n/a here |
| LINZ property & ownership layers with personal information | **an extra licence must be applied for** | accept the licence | not in the address slice | n/a here |
| LINZ "pending approval" cadastral data | councils must accept an **additional licence** | accept the terms | not in the address slice, but a parcel's *address* can be in that state | **UNVERIFIED** for our exact layers |
| **OSM** (via Photon / Pelias / OpenAddresses) | **ODbL** | attribution "© OpenStreetMap contributors" + **share-alike on the derived database** | server-side fallback geocoders only | **KEEP (server only)** |
| GNAF (Australia) | **CC BY 4.0** | attribution | reference only (addressr) | WATCH |
| GeoNames | **CC BY 4.0** | attribution | rejected candidate (pgeocode) | n/a |
| Who's on First | CC BY + local variants | attribution | `pelias/wof-admin-lookup` | WATCH |
| postcodes.io (UK) | MIT code + **OS OpenData / ONSPD / "Royal Mail © 2025"** data | attribution; **not** a share-alike OSS licence | rejected candidate (reference only) | n/a |
| OS OpenData / Ordnance Survey | OS OpenData | attribution | reference only | n/a |
| libpostal model data (`Senzing/libpostal-data`) | **Apache-2.0** | attribution + notice | rejected candidate (reference only) | n/a |
| NZ Post / AddressFinder / Google / Mapbox | proprietary, paid; Google additionally restricts bulk caching | contract + ToS | **not used** — "do not store Google data" is explicit in FINAL_PROMPT §0-F.3 | **REJECT** |

**The consequence that decides the architecture:** the on-device address slice stays **CC BY 4.0 only**. That is exactly why we must not mix OSM house numbers into the same FTS5 file — ODbL share-alike would attach to the derived database we ship in the APK. LINZ-only keeps the whole slice under CC BY 4.0 with a one-line attribution. OSM stays on the **server**, where the ODbL obligations are already met.

## What we are missing

| # | feature | family | gap (why it matters) | task id |
|---|---|---|---|---|
| 1 | a `level` ladder + a `point.level` on the result | address correctness | our `confidence` cannot say "resolved to the street, not to a house" — door memory could key on a centroid | T4 |
| 2 | an explicit `other` field (the un-resolved tail) | address correctness | we lose the part of the string we could not resolve, so the driver cannot be told *what* is wrong | T4 *(new: T4.x)* |
| 3 | RapidFuzz `process.extract` with `WRatio`/`token_set_ratio` | address performance | `difflib.SequenceMatcher` is O(n²) per candidate and is applied to every known road on every correction | T4 |
| 4 | a documented, versioned **parse/expand/normalize** contract | address spec | our parser's semantics are implicit; libpostal is the reference we can cite | T4 |
| 5 | the Pelias `csv-importer` column contract (`source/lat/lon/name`, `layer`) | address data | our worker writes JSONL; no second geocoder can index our export without a mapping | T4 |
| 6 | Photon 1.3's `admin_level` export and space/dash-insensitive postcodes | address data | our slice has no admin hierarchy and no postcode normalisation | T4 |
| 7 | Photon's reverse-only small-DB mode | address server | no reverse-geocode fallback for the web dashboard | T4 *(new)* |
| 8 | Photon 1.0's Prometheus metrics + `dedupe` + categories | address server | if we ever run a server geocoder, there is no metrics/observability contract | T4 *(new)* |
| 9 | postcodes.io's versioned + checksummed + diff-published dataset distribution | address data | our weekly LINZ slice publish has no checksum, no diff and no version contract | T4 |
| 10 | `addr:unit` as a first-class indexed field | address data | units are parsed by rule, not stored, so a unit-only query cannot be served | T4 |
| 11 | an offline "street exists, house does not" answer | address correctness | the wrong-house rule at confidence ≥ 0.9 is unproven and the gate is the squad's release blocker | T4 |
| 12 | a *released, evidenced* accuracy report | address evidence | `docs/evidence/phase-2.3/linz-accuracy.md` is cited by two docs and does not exist | T4 |
| 13 | an NZ address-entry UX reference | address UX | the only NZ projects we found (`addynz/Address-Lookup`) are commercial widgets we have not studied | T7.6 *(new)* |

## Decision

**KEEP (no change to the locked decision):** **LINZ NZ Addresses (CC BY 4.0)** + an **offline FTS5 slice in op-sqlite** + the **D8 correction engine**. It remains the product's differentiator ("NZ address auto-correction with explanation") and it is the only option that is simultaneously offline, on-device, house-number-aware, NZ-specific, permissively licensed, zero-API-cost and explainable.

**ADOPT (additions, all low-risk):**
1. **`rapidfuzz/RapidFuzz`** (MIT, PyPI 3.14.6) inside `services/api` for road and suburb matching, **behind the existing `AddressStore` protocol** so the engine is unchanged; `difflib` stays as the fallback implementation behind the same interface.
2. The **geolonia `level` ladder** re-expressed inside the D8 result: confidence bands + an explicit "resolved to street, not to house" marker, so door memory never keys on a centroid.
3. **`pelias/api` + `pelias/csv-importer` + `pelias/docker`** as an **optional self-hosted server** indexing our LINZ export for the web dashboard and admins (not on the phone). Bus factor 1 — treat it as a convenience, never as a dependency.
4. **`komoot/photon`** as the **second server fallback** (typo-tolerant free-text search), self-hosted, **never** the public instance.
5. The **postcodes.io** pattern — versioned + checksummed + diff-published dataset files — for the weekly LINZ FTS slice.
6. The **geolonia release-engineering pattern** (npm OIDC Trusted Publishing, provenance, tag↔version verification, "HTTP 200 that is an error page" detection) for our weekly LINZ slice publisher.

**WATCH:** `openaddresses/openaddresses` (NZ coverage unverified), `thecolab-ai/.skills` (a 2026-born NZ-data project), `jordond/compass` (the KMP shape), `headwaymaps/headway` (a stack), `openvenues/libpostal` (the spec), `linz/basemaps` (already in use), `rtuszik/photon-docker` (packaging), `mountain-pass/addressr` (the architecture analogue), `moneals/addresser` (a small parser reference), `addynz/Address-Lookup` (the NZ UX reference).

**REJECT:** libpostal + its bindings (server-only, no gazetteer, 0 maintainers in 90 d), the **public Nominatim API**, usaddress, pgeocode, gisgraphy (LGPL), linz2osm (GPL, archived), geopy, alexreisner/geocoder, node-geocoder, geokit, nchaulet/node-geocoder, mordecai, bitlap/geocoding, dunkelstern/osmgeocoder, pgsql-postal, symerio/pgeocode, AReallyGoodName/OfflineReverseGeocode (no licence), parse-address (no licence), cmhh/linzgeocode (no licence), openvenues/address_languages, leaflet-geosearch, linz-data-importer (QGIS-only).

**Clean-room (V4 §11.2) — behaviour only, never code:** `osm-search/Nominatim` (GPL-3.0) and `opennewzealand/linz2osm` (GPL-3.0).

**The Nominatim public instance is forbidden for us — verified from the OSMF policy read on 2026-10-21:** under **"Unacceptable Use"** it bans **"Auto-complete search … you must not implement such a service on the client side using the API"**, bans **"Systematic queries … searching for complete lists of postcodes"**, and bans **"Reselling of geocoding results — Applications and services whose primary function is related to geocoding must run their own service. This includes but is not limited to package/vehicle tracking applications and API resellers"**. A courier app that bulk-validates delivery addresses is named in that prohibition. We therefore use **no** public instance, ever — a self-hosted instance is permitted by the policy but would be a GPL liability and is redundant with Pelias/Photon.

**Risks & fallback**
- *The accuracy number is unproven* — two documents quote 96.9 % and 98.3 % and the cited report is missing. Until `docs/evidence/phase-2.3/linz-accuracy.md` exists, every accuracy claim stays "UNVERIFIED" in every doc and store listing, and the two conflicting figures must be reconciled.
- *LINZ layer IDs / schema drift* → the worker re-verifies layer IDs before every import; keep that check and fail closed.
- *Attribution* → ship "Sourced from the LINZ Data Service and licensed for reuse under CC BY 4.0" in the app and the dashboard. The aerial / pending-approval / ownership layers are not in the address slice, so their extra licences do not apply to us — **UNVERIFIED for the exact layers we import; confirm with the founder's export before the first release**.
- *Licence contamination from OSM* → keep OSM out of the on-device slice; the slice stays CC BY 4.0.
- *RapidFuzz regression* → A/B it on the 1,000-row set before switching; the semantics of `similarity()` (ratio vs Jaccard) must be preserved exactly, because the 0.9 band depends on it.
- *A new binary wheel* → pin the hash in `uv.lock`; `rapidfuzz` ships as a C++ extension and its CI rollup is currently FAILURE.

## Monthly radar filter (V4 §11.3)

- **komoot/photon** — releases (6 in 12 months is the pace) and the CHANGELOG; a 1.4 that changes the ranking model is worth re-benchmarking; watch #1121 (search-as-you-type) and #1028 (`addr:unit`).
- **pelias/api + pelias/csv-importer** — the component version train; re-validate our LINZ CSV mapping whenever the importer's column contract changes; **watch the bus factor** (1 maintainer per repo, 309 h median response).
- **openvenues/libpostal** — default-branch commits (0 in our 90-day window); if it revives, re-read the licence of the *training data*, not just the code.
- **rapidfuzz/RapidFuzz** — releases (6 in 12 months) and the CI rollup (currently FAILURE) and wheel availability for our CI image; re-check the `requires_python` floor against our `>=3.11,<3.13` pin.
- **geolonia/normalize-japanese-addresses** — the `level` ladder and its release engineering (npm OIDC Trusted Publishing is the pattern for our weekly slice publishing).
- **ideal-postcodes/postcodes.io** — the dataset-distribution model (nightly diff, checksum, versioned files) our weekly worker must copy; also its data-licence page.
- **LINZ LDS** — the layer IDs and the licence exceptions (re-verify before each import; fail closed).
- Filters: release in the last 6 months · permissive licence · ≥ 2 active maintainers in 90 days · default-branch commit in the last 90 days · no supply-chain incident · NZ data actually available under a usable licence.

## What we could not verify

- **The 96.9 % (and 98.3 %) accuracy figures** — the cited evidence file and the accuracy test do not exist in this repository; the work is on an unmerged branch. UNVERIFIED.
- **6-month star trend for every candidate** — no historical star API on our token. UNVERIFIED (releases + commits + maintainers are the stated proxy).
- **Accuracy of any candidate on LINZ data** — no harness exists. UNVERIFIED.
- **Photon / Pelias latency and memory on our hardware** — vendor claims only. UNVERIFIED.
- **libpostal's model size (≈ 2 GB)** and the *training-corpus* licensing for NZ tokens — the published model release is Apache-2.0 (verified), the corpus is not. UNVERIFIED.
- **`openaddresses` NZ coverage** — not checked; it is a source registry. UNVERIFIED.
- **The exact LINZ licence exceptions for the layers we actually import** — the address layers are not among the three stated exceptions, but a parcel's address can be in the "pending approval" state. UNVERIFIED.
- **The median first response for cards with < 5 sampled issues** — sample too small. UNVERIFIED.
- **Whether Photon's JSON-dump importer accepts a LINZ-derived dump** — the spec is published (v0.1.0) but we did not run the import. UNVERIFIED.
- **RapidFuzz's speed-up on our 656,044-address data** — vendor benchmarks only. UNVERIFIED.
- **Whether the rapidfuzz wheel hash stays stable across our CI image** — we have not added it yet. UNVERIFIED.

Corrected by the verifier pass of 2026-10-21 (VERIFICATION-C.md): 3 cards corrected.
