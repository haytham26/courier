# Research 2026 — offline-first sync & local databases

**Area:** Sync & Data squad (`docs/squads/sync/`) · **Role:** Researcher (V4 §1 role 2, §3, §10.3, §12, §13.1)
**Research date: 2026-10-21.** Every star count, date, release tag, issue/PR count, licence string and CI state below was read from the live GitHub GraphQL/REST API, the npm registry and the OSV API **on 2026-10-21** (all dates are **UTC calendar dates**). The GitHub API returns `stargazers_count` as a single current value (no historical stargazer series on our token's scopes), so the **6-month trend PROXY** used on every card is: *releases in the last 12 months* + *commits in the last 90 days* + *distinct human maintainers in the last 90 days* (default branch, bots excluded).
**The requirement (V4 §10.3, binding):** an **op-sqlite event log ↔ Postgres** sync; **zero data loss under airplane-mode chaos tests**; **conflict rules tested**; sync delay p95 ≤ 60 s online; migrations versioned and reversible (FINAL_PROMPT §0-F.3, §6.3, §6.5).

**Our current choice (the baseline every candidate is compared against) — verified in this tree today**
- `apps/mobile/package.json` pins **`@op-engineering/op-sqlite` 18.2.5** (MIT), **`expo-sqlite` ~58.0.13**, `react-native-nitro-modules` 0.37.1, `react-native-vision-camera` 5.2.3, `expo` ~58.0.14 (Expo SDK 58), RN 0.88.0, React 19.3.0; `apps/mobile/app.json` has `"newArchEnabled": true`.
- **`expo-sqlite` is imported nowhere in `apps/mobile/src`** — the only match in the app is its own `package.json` line. It is dead weight *and* a documented iOS compile-clash with op-sqlite.
- **The root `package.json` has NO `"op-sqlite"` block** (verified by search) ⇒ `sqlcipher: true` and `fts5: true` — both required by FINAL_PROMPT §0-F.3 — are **not enabled today**.
- `expo-updates` is **not** a direct dependency of `apps/mobile` (only `expo` and `expo-dev-client` are); whether it enters the graph transitively is UNVERIFIED.
- `packages/sync` and `services/api/app/sync` **do not exist**; `docs/squads/sync/STATUS.md` = "not measured yet"; `docs/squads/sync/eval/` does not exist.
- The LINZ FTS slice was built by `services/worker/address_correction.py` (464 lines) into `nz_addresses.sqlite` (FTS5) for a **read-only, separate, unencrypted** file. That builder was **deleted** in the repository hygiene of MASTER_EXECUTION section 16 (nothing imported it, and the slice was never built): the offline slice is NOT BUILT.

## Queries run

| # | Query | Filters | Results returned |
|---|---|---|---|
| Q1 | `search repos "offline-first"` | `--sort stars`, limit 30 | 30 |
| Q2 | `search repos "local-first sync engine"` | `--sort stars`, limit 30 | 22 (almost all 0–10 ★: the long tail of 2026 prototypes) |
| Q3 | `search repos --topic offline-first` | `--sort stars`, limit 30 | 30 |
| Q4 | `search repos "sqlite react native"` | `--sort stars`, limit 30 | 30 (only `Alvinotuya84/react-native-sqlite-react-native` has >1 ★) |
| Q5 | `search repos "powersync"` / `"op-sqlite"` / `"watermelondb"` / `"replicache"` / `"electric-sql"` / `"crsqlite"` / `"rocicorp zero"` / `"ditto"` / `"wa-sqlite"` / `"nitro-modules"` | `--sort stars`, limit 5–20 | 10 × ≤ 20 (see the cards) |
| Q6 | `api graphql` over 40 candidate repos | 1 query/repo: stars, created, pushed, licence, topics, open/closed issues, open PRs, 20 releases, 90-day history + distinct authors, `statusCheckRollup` | 40 |
| Q7 | `api graphql` issues/PRs (19 repos) | 50 oldest closed issues (first-comment delay), 30 newest open issues, 20 newest open PRs | 19 |
| Q8 | `api repos/<o>/<r>/readme` + `contents/<file>` (raw) | 4 READMEs + the PowerSync **LICENSE** files | 6 |
| Q9 | npm registry + `api.npmjs.org/downloads/point/last-week` | 12 packages | 12 |
| Q10 | `api.osv.dev/v1/query` | npm + PyPI, 13 packages | 13 (2 advisories) |
| Q11 | webfetch `op-engineering.github.io/op-sqlite/docs/installation/` | the build-toggle and compile-clash matrix | 1 |
| Q12 | webfetch `electric-sql.com/docs` | the read-path sync model | 1 |

**How to read the "median first response"** — the delay from issue creation to the **first comment**, over the **50 oldest closed issues** of each repo (a stable, reproducible sample; it deliberately biases long-lived repositories downwards, so read it as "how fast were the oldest complaints answered"). **UNVERIFIED** where n < 5.

## Candidates (40) — evidence cards

Format: `repo · stars · created · last release @ date · rel/12m · maint(90 d) · open/closed issues · open PRs · licence (code / data) · platform · decision`.

1. **OP-Engineering/op-sqlite** — https://github.com/OP-Engineering/op-sqlite · 1,049 ★ · 2023-11-06 · `18.2.5` @ 2026-09-20 · 20 rel/12m · 8 maint/90 d (76 commits) · 8 open / 216 closed · 4 open PRs · **MIT** / n/a / n/a · on-device (iOS/Android/macOS/web), JSI + Nitro · npm **417,985 dl/wk** · **NO_CI** on the head commit · median 3.5 h (n=50) · **ADOPT (already our local DB)**
2. **powersync-ja/powersync-js** — 735 ★ · 2023-10-03 · `@powersync/react-native@2.3.3` @ 2026-10-19 · 20 rel/12m · 15 maint/90 d (100 commits) · 35/154 · 24 open PRs · **Apache-2.0** (LICENSE read) · on-device · npm 39,260 dl/wk · CI SUCCESS · median 8.3 h (n=48) · **WATCH → conditional ADOPT**
3. **powersync-ja/powersync-service** — 395 ★ · 2024-05-30 · `v1.27.0` @ 2026-10-12 · 20 rel/12m · 13 maint/90 d (88 commits) · 18/61 · 26 open PRs · **FSL-1.1-ALv2** (LICENSE read — see below) · server · CI SUCCESS · median 10.3 h (n=40) · **WATCH (a licence decision for the founder)**
4. **powersync-ja/powersync-sqlite-core** — 47 ★ · 2023-08-29 · `v0.5.4` @ 2026-10-16 · 11 rel/12m · 4 maint/90 d (50 commits) · 3/36 · 3 open PRs · Apache-2.0 · on-device extension · CI SUCCESS (C++/Rust builds) · **WATCH**
5. **powersync-ja/powersync-native** — 23 ★ · 2025-10-08 · `v0.1.1` @ 2026-10-12 · 8 rel/12m · 5 maint/90 d (24 commits) · 2/9 · 2 open PRs · Apache-2.0 · on-device · CI SUCCESS · **WATCH**
6. **Nozbe/WatermelonDB** — 11,791 ★ · 2018-08-28 · no release · **0 maint/90 d** (last push 2026-09-16) · 272/788 · 31 open PRs · MIT · on-device SQLite + its own sync adapter · NO_CI · median 3.0 h (n=43) · **REJECT as a dependency; KEEP as the adapter spec**
7. **realm/realm-js** — 6,000 ★ · 2015-08-13 · `realm-react-v0.20.0` @ 2025-10-17 · 0 rel/12m · **0 maint/90 d** (last push 2026-10-20) · 601/3,088 · 62 open PRs · Apache-2.0 · on-device NoSQL · NO_CI · median 1.9 h (n=36) · **REJECT** (vendor-deprecated sync)
8. **rocicorp/replicache** — 1,173 ★ · 2020-05-27 · `v10.0.0` @ 2022-05-09 · **ARCHIVED** · 0 maint/90 d (last push 2022-05-07) · 33/262 · licence NOASSERTION · **REJECT** (dead)
9. **electric-sql/electric** — 10,407 ★ · 2022-06-01 · `agents-desktop-canary` @ 2026-05-20 · 20 rel/12m · 14 maint/90 d (47 commits) · 175/955 · 98 open PRs · Apache-2.0 · on-device + sync service · **CI FAILURE** · median 17.6 h (n=47) · **WATCH** (read-path only)
10. **dexie/Dexie.js** — 14,652 ★ · 2014-02-26 · `v4.4.7` @ 2026-10-19 · 8 rel/12m · 12 maint/90 d (34 commits) · 570/990 · 14 open PRs · Apache-2.0 · **web/IndexedDB only** · npm 1,555,766 dl/wk · CI SUCCESS · OSV **GHSA-3xgx-r9j4-qw9w** (prototype pollution) · median 2.0 h (n=44) · **REJECT for the phone; KEEP for the web dashboard**
11. **pubkey/rxdb** — 23,410 ★ · 2016-12-02 · `17.6.0` @ 2026-10-05 · 20 rel/12m · 3 maint/90 d (100 commits) · 2/902 · 17 open PRs · Apache-2.0 · browser/Node (IndexedDB, SQLite, memory) + a premium sync tier · CI SUCCESS (core, notify, storage-*) · median 2.5 h (n=50) · **WATCH**
12. **yjs/yjs** — 22,958 ★ · 2014-07-29 · `v14.0.0-rc.29` @ 2026-10-15 (a release candidate; the stable line is v13.6.x) · 20 rel/12m · 6 maint/90 d (30 commits) · 118/407 · 31 open PRs · licence NOASSERTION (the repo states MIT — **re-verify from the LICENSE file before shipping**) · **CI FAILURE** · median 22.9 h (n=42) · **REJECT**
13. **loro-dev/loro** — 6,230 ★ · 2022-07-12 · `loro-crdt@1.16.4` @ 2026-09-30 · 20 rel/12m · 13 maint/90 d (100 commits) · 43/217 · 21 open PRs · MIT · Rust core + WASM/JS CRDT · CI SUCCESS · median 3,622 h (n=23 — old-issue bias) · **WATCH**
14. **automerge/automerge** — 6,669 ★ · 2019-12-26 · `js/automerge-3.5.0` @ 2026-09-16 · 20 rel/12m · 7 maint/90 d (100 commits) · 74/255 · 39 open PRs · MIT · JS/Rust CRDT · CI SUCCESS (fmt, lint, docs, **cargo-deny advisories + bans**, build_wasm) · **REJECT** (wrong merge model)
15. **share/sharedb** — 6,539 ★ · 2013-04-01 · `v6.0.4` @ 2026-10-05 · 5 rel/12m · 2 maint/90 d (43 commits) · 151/215 · 28 open PRs · licence NOASSERTION (repo states MIT) · OT server + client · CI SUCCESS (Node 22/24/26) · **REJECT** (OT needs a central ordering)
16. **tursodatabase/libsql** — 17,279 ★ · 2022-09-29 · last GitHub release `libsql-0.10.0` @ 2026-10-13 (the `libsql-server-v0.24.32` tag is from 2025-02-14) — the project is not dormant · 3 maint/90 d (9 commits) · 412/230 · 54 open PRs · MIT · embedded SQLite fork + server + replicas · **CI FAILURE** · median 8.2 h (n=38) · **WATCH**
17. **rqlite/rqlite** — 17,807 ★ · 2014-08-23 · `v10.6.2` @ 2026-10-18 · 20 rel/12m · **1 maint/90 d** (100 commits) · 36/647 · 31 open PRs · MIT · distributed SQLite with Raft · CI SUCCESS (cross-compile matrix) · **REJECT** (a consensus cluster for one courier app)
18. **instantdb/instant** — 10,550 ★ · 2024-08-19 · no release · 4 maint/90 d (100 commits) · 21/129 · 21 open PRs · Apache-2.0 · hosted local-first DB on Postgres · CI SUCCESS (self-hosted images) · **REJECT** (our offline guarantee would depend on someone else's uptime)
19. **TanStack/query** — 50,467 ★ · 2019-09-10 · `release-2026-10-19-1659` @ 2026-10-19 · 20 rel/12m · 4 maint/90 d (100 commits) · 50/2,341 · 95 open PRs · MIT · server-state cache · CI SUCCESS (incl. a **Socket Security: Project Report**) · **KEEP as the web dashboard's server-state layer**
20. **sqlite/sqlite** — 10,733 ★ · 2019-03-18 (mirror) · no GitHub releases · 100 commits/90 d · 0/0 · 26 open PRs · licence NOASSERTION (**public domain**) · the engine itself · NO_CI on the mirror · **KEEP** (it is inside op-sqlite)
21. **rhashimoto/wa-sqlite** — 1,419 ★ · 2021-04-20 · `v1.1.2` @ 2026-08-11 · 3 rel/12m · 4 maint/90 d (48 commits) · 6/81 · 9 open PRs · MIT · WASM SQLite (OPFS/IndexedDB VFS) · CI SUCCESS · **REJECT for the phone; KEEP for the web dashboard**
22. **margelo/react-native-nitro-sqlite** — 580 ★ · 2023-04-05 · `v10.2.0` @ 2026-10-12 · 15 rel/12m · 7 maint/90 d (100 commits) · 16/94 · 8 open PRs · MIT · on-device SQLite via Nitro · npm 3,736 dl/wk · CI SUCCESS (Fast checks, Native lockfiles, Android, iOS, macOS, Vercel) · median 88.7 h (n=46) · **WATCH** (a credible alternative; no migration reason today)
23. **margelo/nitro** (react-native-nitro-modules) — 1,967 ★ · 2024-06-12 · `v0.37.1` @ 2026-08-27 · 20 rel/12m · 7 maint/90 d (100 commits) · 49/201 · 190 open PRs · MIT · the JSI/HybridObject runtime op-sqlite and VisionCamera v5 build on · npm 1,250,100 dl/wk · **CI FAILURE** · **KEEP** (already pinned)
24. **expo/expo** (`expo-sqlite` 58.0.13) — MIT · **1,123,928 dl/wk** · 20 rel/12m · 37 maint/90 d · **REJECT as the app's DB; KEEP only for local dev fixtures**
25. **tigawanna/expo-opsqlite-spatialite-demo** — 8 ★ · 2025-10-29 · no release · 0 maint/90 d (last push 2026-06-01) · 1/0 · 11 open PRs · MIT · on-device **SpatiaLite** with op-sqlite + Drizzle + an Expo config plugin · NO_CI · **WATCH** (proves op-sqlite can carry a spatial extension — relevant only if we do on-device radius queries over the LINZ slice)
26. **OP-Engineering/op-sqlite-drizzle-example** — 10 ★ · 2025-01-26 · no release · 0 maint/90 d (last push 2025-01-26) · 0/1 · licence NOASSERTION · **WATCH** (the ORM path for op-sqlite)
27. **malte-j/y-op-sqlite** — 25 ★ · 2024-04-22 · no release · 0 maint/90 d (last push 2024-06-14) · 0/1 · licence NOASSERTION · **REJECT**
28. **expo-starter/expo-opsqlite-libsql-turso** — 32 ★ · 2024-10-22 · no release · 0 maint/90 d (last push 2025-01-29) · 1/1 · Apache-2.0 · **WATCH** (a working op-sqlite + libSQL/Turso reference)
29. **powersync-ja/powersync-kotlin** — 128 ★ · 2023-10-25 · `v1.15.2` @ 2026-09-28 · 17 rel/12m · 3 maint/90 d (35 commits) · 7/50 · 4 open PRs · **licence NOASSERTION — there is NO LICENSE file in the repository root** (verified) · CI SUCCESS · **KEEP as a protocol reference only**
30. **powersync-ja/powersync-swift** — 63 ★ · 2024-10-22 · `1.16.4` @ 2026-10-08 · 20 rel/12m · 8 maint/90 d (24 commits) · 9/31 · 3 open PRs · **Apache-2.0** · CI SUCCESS · **KEEP as a protocol reference**
31. **powersync-ja/powersync-dotnet** — 52 ★ · 2024-11-29 · `PowerSync.Maui@0.1.5` @ 2026-09-10 · 16 rel/12m · 4 maint/90 d (14 commits) · 1/8 · 2 open PRs · Apache-2.0 · CI SUCCESS · **KEEP as a protocol reference**
32. **powersync-ja/powersync.dart** — 254 ★ · 2023-02-21 · `powersync-v2.5.0` @ 2026-10-19 · 15 rel/12m · 5 maint/90 d (59 commits) · 26/94 · 4 open PRs · **licence NOASSERTION — no LICENSE file at the root** (verified) · CI SUCCESS · **KEEP as a protocol reference**
33. **apache/pouchdb** — 17,622 ★ · 2010-06-10 · `9.0.0` @ 2024-06-21 · 0 rel/12m · 2 maint/90 d (3 commits) · 132/4,241 · 62 open PRs · Apache-2.0 · CI SUCCESS (lint, test-docs, shellcheck, couchdb-nodejs matrix) · **REJECT** (CouchDB replication, no RN-native path)
34. **mrousavy/StorageBenchmark** — 55 ★ · 2022-05-10 · no release · 0 maint/90 d (last push 2024-01-11) · 1/2 · licence NOASSERTION · **REJECT (stale) but KEEP its method**: benchmarking React Native storage engines on-device
35. **orbitinghail/sqlsync** — 2,921 ★ · 2023-05-26 · no release · 0 maint/90 d (last push 2025-11-19) · 27/16 · 0 open PRs · Apache-2.0 · a collaborative offline-first wrapper around SQLite · CI SUCCESS · **WATCH**
36. **MobileNativeFoundation/Store** — 3,425 ★ · 2019-12-05 · `5.1.0-beta01` @ 2026-09-08 · 4 rel/12m · 2 maint/90 d (4 commits) · 42/187 · 14 open PRs · Apache-2.0 · Kotlin Multiplatform, a repository pattern over network/disk/memory · CI SUCCESS (build-and-test, publish, codecov) · **WATCH**
37. **redux-offline/redux-offline** — 6,134 ★ · 2017-03-11 · `2.6.0-native.1` @ 2021-04-25 · **ARCHIVED** · 0 maint/90 d (last push 2025-02-26) · 54/265 · 48 open PRs · MIT · NO_CI · **REJECT**
38. **hoodiehq/hoodie** — 4,457 ★ · 2012-06-25 · `v28.2.10` @ 2019-11-05 · 0 maint/90 d (last push 2024-07-27) · 36/416 · 63 open PRs · Apache-2.0 · NO_CI · **REJECT**
39. **ndrean/ZeBridge** — 4 ★ · 2025-11-27 · `v0.2.6` @ 2026-10-17 · 14 rel/12m · 2 maint/90 d (100 commits) · 0/0 · 0 open PRs · Apache-2.0 · **Zig**; bidirectional local-first sync between Postgres and edge SQLite/PGLITE over CDC (logical decoding) + NATS · CI SUCCESS (bridge unit tests, libzb ABI, zb-client-ts typecheck/tests, zb-dart analyze) · **WATCH** — the 2026 candidate that does *change data capture* instead of a hand-written event log
40. **fajarxfce/solstice** — 0 ★ · **created 2026-09-12** · no release · 1 maint/90 d (14 commits, last push 2026-09-13) · 0/0 · 0 open PRs · Apache-2.0 · a **Rust** local-first sync engine for Flutter and Jetpack Compose, one core · **CI FAILURE** (test, msrv, sweep, bench, abi, determinism) · **WATCH** (too young, but the "one Rust core for two UI toolkits" shape is ours to copy)

**Security advisories + supply chain (OSV, 2026-10-21).** npm: `@op-engineering/op-sqlite` **0** · `react-native-nitro-modules` **0** · `react-native-nitro-sqlite` **0** · `@powersync/react-native` **0** · `expo-sqlite` **0** · `dexie` **1** (GHSA-3xgx-r9j4-qw9w) · `tesseract.js` **1** (GHSA-83rx-c8cr-6j8q). PyPI `rapidfuzz` **0**. **No supply-chain incident in any candidate we propose to adopt.** Note `op-sqlite` **compiles SQLite from source** (the docs: "On Android SQLite is always compiled from source as each vendor messes with sqlite or uses outdated versions") — so the supply chain is the **build**, not the npm tarball: the SQLite source version must be pinned and the build audited.

**CI status (default-branch head rollup, 2026-10-21).** SUCCESS: `powersync-js`, `powersync-service`, `powersync-sqlite-core`, `powersync-native`, `powersync-kotlin`, `powersync-swift`, `powersync-dotnet`, `powersync.dart`, `dexie`, `rxdb`, `loro`, `automerge`, `sharedb`, `rqlite`, `instantdb`, `TanStack/query`, `wa-sqlite`, `nitro-sqlite`, `expo`, `apache/pouchdb`, `sqlsync`, `MobileNativeFoundation/Store`, `ZeBridge`. **FAILURE:** `electric-sql/electric`, `tursodatabase/libsql`, `margelo/nitro`, `yjs/yjs`, `solstice`. **NO_CI:** `op-sqlite` (the one we depend on most!), `realm-js`, `WatermelonDB`, `sqlite/sqlite` (mirror), `redux-offline`, `hoodie`, `expo-opsqlite-spatialite-demo`, `op-sqlite-drizzle-example`, `y-op-sqlite`, `expo-opsqlite-libsql-turso`, `StorageBenchmark`. **A repo with no CI gives us no test signal — and op-sqlite is the one we trust most.**

**Production users — only what is verified (2026-10-21).**
- **op-sqlite** — 417,985 npm downloads/week, and it is the **SQLite layer of PowerSync's React Native SDK** (verified from that SDK's README: `npx expo install @powersync/react-native @op-engineering/op-sqlite`).
- **PowerSync** — a commercial product with published client SDKs for RN, Swift, Kotlin, Dart and .NET; the service is a deployable Postgres/MongoDB/MySQL/SQL Server sync tier.
- **SQLite** — public domain, embedded in every Android and iOS device.
- **Dexie** — 1,555,766 npm downloads/week, the de-facto IndexedDB wrapper.
- **TanStack Query** — 50,467 ★ and the de-facto server-state cache in React.
- *Vendor customer-page claims (Oracle/IBM, RxDB's commercial tier, Electric Cloud's customers) were not read in this sprint → UNVERIFIED.*

**Docs quality (read 2026-10-21).** Excellent: `op-sqlite` (an installation/configuration/gotchas site with the full compile-clash matrix), `PowerSync` (per-platform SDK READMEs + a client-SDK reference site), `WatermelonDB` (a docs site), `rxdb` (a docs site + a Mango-query manual), `electric` (a docs site), `wa-sqlite`. Adequate: `loro` (README + rustdoc), `dexie` (a wiki), `rqlite`. Thin: `op-sqlite-drizzle-example` (one file), `y-op-sqlite` (no licence, no docs), `StorageBenchmark` (no licence), `redux-offline` (a README).

## Shortlist (12)

`OP-Engineering/op-sqlite` · `powersync-js` + `powersync-service` + `powersync-sqlite-core` (+ the Swift/Kotlin/.NET/Dart clients as the protocol reference) · `electric-sql/electric` · `loro-dev/loro` · `yjs/yjs` · `Nozbe/WatermelonDB` (the adapter spec) · `tursodatabase/libsql` · `dexie` (web) · `TanStack/query` (web) · `realm-js` (rejection evidence) · `ndrean/ZeBridge` · `MobileNativeFoundation/Store`.

## Deep review — top 5

**1. OP-Engineering/op-sqlite — our local DB (keep).** README + the installation/configuration/gotchas docs + the last 20 commits + the open issues read.
*Architecture:* a JSI/Nitro native module over SQLite **compiled from source**; the build-time toggles live in the **root** `package.json` under an `"op-sqlite"` key: `sqlcipher`, `performanceMode`, `iosSqlite`, `sqliteFlags`, `fts5`, `rtree`, `libsql`, `turso`, `sqliteVec`, `tokenizers`. The docs are explicit that in a monorepo the block must go in the **root** `package.json` (the podspec searches upwards) — **our root `package.json` has no such block today**, so FINAL_PROMPT §0-F.3's `sqlcipher: true` + `fts5: true` are not in effect. *Compile clashes (documented):* `expo-updates`, `expo-sqlite` and `cozodb`; the documented fix for expo-updates is `"expo.updates.useThirdPartySQLitePod": "true"` in `ios/Podfile.properties.json`; the fallback `iosSqlite: true` **disables extension loading** (so it would break FTS5 and any extension we add) and forces Apple's older embedded SQLite; `use_frameworks` breaks the iOS build and forces the embedded SQLite; the SQLite temp-file fix for large Android queries is `sqliteFlags: "-DSQLITE_TEMP_STORE=2"`. *Last 20 commits (2026-09 → 10):* "Expose error codes (#463)", "Fix libsql executeBatch swallowing errors instead of rolling back", "await transaction commit and preserve finalized handles (#457)", "Fix use after free in commit hook callback (#458)", "add execute batch sync (#461)" — native memory-safety work. *Open issues that touch us:* **#469 "close() leaves the connection's worker thread running until GC (iOS background kill with 1,006 idle threads)"** (PR #470 open), **#467** "iOS reload during in-flight queries delivers results into the new runtime", **#466** "Android SQLCipher: track x86_64 OpenSSL dependency GNU_RELRO end-alignment failure" (fix published upstream in `io.github.ronickg:openssl:3.6.2-3`), **#456** "sqlite-vec: armeabi-v7a libsqlite_vec.so fails to load — undefined `ceil`, libm.so missing from NEEDED", **#452/#453** "Opt-in resumable SQLite RBU support", **#427** "existing-file open, native key providers, and validated open". *CI:* **NO_CI** on the head commit. *Verdict:* **KEEP 18.2.5**, add the `"op-sqlite"` block, and treat #469/#467 as blockers for a long-lived background sync worker.

**2. powersync-js + powersync-service — the strongest off-the-shelf sync engine.** READMEs + the service's LICENSE + the last 20 commits + the open issues read.
*Architecture:* a client-side SQLite database kept in sync with a backend over **sync buckets** (per table) and **sync streams** (dynamic), with a local write queue, a server-side checkpoint and server-side conflict resolution. **The React Native SDK runs on `@op-engineering/op-sqlite`** and reuses our exact build toggles — SQLCipher via the `op-sqlite` package.json block + `sqliteOptions.encryptionKey`, FTS5 via `op-sqlite.fts5`, and its own core extension loaded through `sqliteOptions.extensions` (path + entryPoint). That means **PowerSync and our LINZ FTS5 slice can live in the same database** — a genuine architectural win.
*Maintenance:* 15 maintainers/90 d and 100+ commits/90 d on the client; 13 maintainers/90 d and 88 commits/90 d on the service; 20 releases/12 m each; CI SUCCESS on both.
*The catch — the licence (verified by reading the LICENSE file on 2026-10-21):* the **client** `powersync-js` is **Apache-2.0** (LICENSE read). The **service** is **FSL-1.1-ALv2** — "Copyright 2023-2026 Journey Mobile, Inc."; a *Permitted Purpose* is "any purpose other than a Competing Use"; a Competing Use is "making the Software available to others in a commercial product or service that … substitutes for the Software … or offers the same or substantially similar functionality"; the Permitted Purposes explicitly include "for your internal use and access"; and there is a "Grant of Future License" — an irrevocable additional **Apache-2.0** grant "effective on the **second anniversary** of the date we make the Software available". So: internal use is permitted, we cannot resell a competing sync service, and each version converts to Apache-2.0 two years after release. **Our own `docs/product/LICENSES.md` allow-list (MIT, Apache-2.0, BSD-2/3, ISC, 0BSD, Unlicense, CC0-1.0) excludes FSL** — adopting the service therefore needs an explicit founder exception, and the file must record it. **Note also:** the PowerSync client SDKs are **not uniformly Apache-2.0** — `powersync-js`, `powersync-swift` and `powersync-dotnet` are; **`powersync-kotlin` and `powersync.dart` have no LICENSE file at the root** and the API reports NOASSERTION.
*The second catch:* it is a **new server** (Postgres + the PowerSync service) and its write semantics are **row-oriented last-write-wins with a server checkpoint** — not the "event log with documented, per-conflict-class rules" our spec asks for. Open service issues worth reading before we adopt: #700 "Postgres replication silently stops (no reconnect, no error) after a half-open source connection; health probe stays green" and #743 "Sync stream: ~20 s stall between response headers and first checkpoint on new connections".
*Verdict:* **WATCH, and prototype only.** If our own event-log engine cannot pass the chaos test, PowerSync is the fallback — but the FSL service makes the fallback a licence decision for the founder, not a technical one.

**3. electric-sql/electric — the read-path Postgres sync.** The last 20 commits, the open issues and the docs read.
*Architecture:* Electric Sync is a **read-path** sync engine for Postgres: clients pull **Shapes** (subscribed slices of a table) over HTTP; **writes go back through your own API**. For a courier app where the driver *writes* stops, events and POD on the phone, a read-path engine covers only half the problem — the write path would be our own event log anyway.
*Signals:* 14 maintainers/90 d, 47 commits/90 d, 20 releases/12 m, 175 open / 955 closed, 98 open PRs, **CI FAILURE**; open discussion **#4770 "[Discussion] Future of Electric after Databricks?"** — a real strategic-risk signal, and a good example of why our monthly radar must treat "vendor direction is unclear" as a disqualifier for anything on the critical path.
*Verdict:* **WATCH** — excellent if we later want read-only live views of the dispatcher's board on the phone; not a sync engine for us.

**4. loro-dev/loro — the best CRDT for React Native.** The last 20 commits read.
*Architecture:* a Rust core exposed to JS/WASM with a rich-text and map CRDT; the recent commits are dense, high-quality correctness work (undo/redo identity preservation, removal anchors, deep-tree traversal without stack overflow, quadratic cache-clear avoidance, cycle-closing concurrent tree moves).
*Why it is still wrong for us:* a CRDT is the right tool when **two actors edit the same logical document concurrently**. Our model is an **event log per aggregate** (a stop, a delivery event, a door-memory row) with a documented conflict rule plus a tenant-scoped read model. Using a CRDT for `stops` would also make "zero wrong-house auto-corrections" harder to reason about, because a merge would be silent.
*Verdict:* **WATCH** — the reference if the founder ever wants collaborative route editing between two dispatchers. **But the discipline, not the library, is what we adopt:** every merge/undo edge case is a named test, and that becomes a rule for our conflict rules C1–C7.

**5. Nozbe/WatermelonDB — the spec reference (rejected as a dependency).** The commit activity and the issue counts read.
*Architecture:* a reactive local database over SQLite (or LokiJS in memory) with **observables** and a pluggable **sync adapter** whose protocol is a "pull/push changes since a timestamp" contract; the server side is yours to write.
*Why the spec is worth copying:* the adapter boundary — `sync({pullChanges, pushChanges, resolvedChanges, …})` — is exactly the shape our `packages/sync` should have, and the "last_modified" pull model is a workable event-log read model. Its `resolvedChanges` concept is exactly our "the server accepted this event" channel.
*Why we reject the library:* **0 commits and 0 maintainers in the last 90 days**, 272 open issues, no release in 12 months, **NO_CI**. Betting the sync gate on it is unacceptable.
*Verdict:* **REJECT as a dependency, KEEP the adapter shape.**

## Benchmark

**Status: UNVERIFIED — no harness, no eval set.** `docs/squads/sync/benchmarks/README.md` = "Harness: _to be created with the first implementation_"; `docs/squads/sync/eval/` does not exist; `docs/squads/sync/STATUS.md` = "not measured yet". The gate is "zero data loss under airplane-mode chaos tests, conflict rules tested, sync delay p95 ≤ 60 s online" — **none of it is measured**.

**The set to build (named) — the airplane-mode chaos scenarios:** `docs/squads/sync/eval/`
- `scenarios/airplane-mode.jsonl` — a scripted timeline of driver actions (create stop → correct address → mark delivered → add POD photo → record door memory → re-optimise route) with the network state per step (online / degraded / airplane for N minutes / back), the expected final server state, and the expected client state at every step.
- `scenarios/conflicts.jsonl` — deliberate concurrent edits of the same aggregate from two clients (driver app + dispatcher web) with the documented conflict rule as the expected outcome.
- `scenarios/migration.jsonl` — one migration per schema version, with the reversible-apply assertions (the down-migration returns the prior state).
- `harness.ts` — runs the scenarios against a **real op-sqlite database** on the CI emulator and a **real Postgres** in CI, and asserts: no event lost, no event duplicated, no event applied twice, final server state == final client state, p95 sync delay ≤ 60 s.

**Metrics:** `events_lost` (0) · `events_duplicated` (0) · `conflict_rule_violations` (0) · `sync_delay_p50/p95` (≤ 60 s p95) · `db_size_mb` after 10,000 events (inside the APK budget, §6.4) · `startup_p95` with a 50 MB local DB · `replay_after_crash` (an unclean kill must not lose an acknowledged event).

**Top-3 to benchmark on the same set:** (1) **our own event-log engine** (the spec'd baseline, implemented in `packages/sync`); (2) **PowerSync client + service** (Apache-2.0 client, FSL service) as the off-the-shelf comparison; (3) **Electric (read-path) + our own write path** as the hybrid comparison.

**Published table + raw results →** `docs/squads/sync/benchmarks/` and `docs/evidence/`.

## The event-log engine this research commits us to

The research did not change the architecture; it **specified** it and removed the alternatives that could have specified it for us. The engine we own — pure TS in `packages/sync` (no RN imports, testable in Node) and FastAPI in `services/api/app/sync` — is:

**On the device (one SQLCipher-encrypted op-sqlite database, `app.db`):**
- `outbox` — append-only: `event_id` (UUIDv7, the idempotency key), `client_seq` (monotonic per device), `entity_type`, `entity_id`, `op` (create/update/delete), `payload` (JSON), `created_at`, `synced_at` (null until acknowledged). **Append-only is the whole trick:** a crash mid-write loses at most the last uncommitted row, and a duplicate send is harmless because the server keys on `event_id`.
- `sync_state` — one row: `server_cursor` (the last acknowledged cursor), `device_id`, `last_pull_at`, `schema_version`.
- The `outbox` row is written **in the same transaction** as the domain write (a delivery event, a stop, a door-memory row) — that single property is what makes "zero data loss" true rather than aspirational.
- The **LINZ FTS5 slice lives in a second, read-only, unencrypted database** attached with `ATTACH` (FINAL_PROMPT §0-F.3). The same op-sqlite instance can hold both files; the key protects only `app.db`.

**On the server (Postgres):**
- `sync_events` — the same shape, with `event_id` as the primary key (the idempotency guarantee), an assigned `cursor` (bigserial) and a per-tenant `org_id`.
- The API applies an event by dispatching to **the same domain function the HTTP handler calls** — exactly one code path can mutate a stop. A second implementation is how tenant-isolation and "never deliver the wrong house" bugs are born.
- A **cursor-based pull** (`GET /v1/sync?since=<cursor>&org_id=…`) returns the org's changes; the client applies them idempotently by `event_id` and stores the new cursor **in the same transaction** as the applied changes.

**Conflict rules to implement and test (the "conflict rules documented" deliverable):**

| # | Conflict | Rule | Why |
|---|---|---|---|
| C1 | Same stop edited on two devices | **last-write-wins by `updated_at`, then by `event_id`** (deterministic tie-break) | a driver correcting a suburb must not be overwritten by a stale copy |
| C2 | Delivery event vs stop edit | **delivery event wins** (terminal, server-timestamped) | never un-deliver a parcel |
| C3 | Two delivery events for one stop | **first server-accepted event wins**; the second is rejected as a duplicate and recorded | one parcel, one delivery |
| C4 | Door memory vs door memory | **merge per-key** (the newer value of each gate code wins) | the driver learns incrementally |
| C5 | Address correction vs correction | **server wins** (the LINZ check is authoritative) | the D8 engine must not be second-guessed on the client |
| C6 | Delete vs update on the same entity | **delete wins if it is older than 7 days, otherwise the update wins** | a resurrected parcel is a bug; a late update of a deleted stop is a race |
| C7 | Any write across orgs | **rejected at the API** (never merged) | tenant isolation |

**Schema versioning:** every migration is versioned, applied in order and **reversible** (FINAL_PROMPT §6.3). The device stores `schema_version`; a server ahead of the device sends `resync_required` rather than a payload the device cannot read. The LINZ slice ships with **its own version**, and the weekly worker publishes a checksummed slice (the postcodes.io model) that the app swaps in **atomically after the shift ends** (FINAL_PROMPT §0-C).

**Why this beats the alternatives we found:** PowerSync's write path is row-oriented (last-write-wins per row with a server checkpoint) — it does not give us the *per-conflict-class* rules above; Electric has no write path at all; the CRDT libraries merge silently, which would make C1–C7 invisible; a hand-rolled OT server (Sharedb) needs a central ordering an offline driver cannot produce; and `ndrean/ZeBridge` shows the other end of the spectrum — CDC from Postgres instead of a hand-written event log — which is attractive but means owning a Postgres extension and a Rust/Zig edge daemon instead of a TypeScript package we can test.

## What we are missing

| # | feature | family | gap (why it matters) | task id |
|---|---|---|---|---|
| 1 | op-sqlite `executeBatch` with real rollback | sync write path | atomic multi-row event writes; the libsql bug (errors swallowed instead of rolled back) is exactly the failure we must not have | T7.1 |
| 2 | op-sqlite **typed error codes** (#463) | sync error handling | V4 §6.2 asks for typed results, not string errors | T7.1 |
| 3 | op-sqlite `db.interrupt()` | sync performance | no way to cancel a long query on a slow phone when the driver changes route | T7.1 |
| 4 | op-sqlite **reactive queries** | sync read path | the app cannot observe the outbox/sync state without polling | T7.1 |
| 5 | op-sqlite **key-value store** | sync read path | small pieces of state would otherwise need a table and a migration | T7.1 |
| 6 | op-sqlite **runtime extension loading** (`sqliteOptions.extensions`) | sync extensibility | no hook for our own `sqlite3_courier_init` (a native address index or a FTS tokenizer) | T7.1 |
| 7 | op-sqlite `performanceMode` + `-DSQLITE_TEMP_STORE=2` | sync performance | the documented Android IO fix for a large local DB | T7.1 |
| 8 | op-sqlite **resumable SQLite RBU** (PR #453) | sync data | a fast, incremental update of the 656 k-address slice without a full rebuild | T7.1 |
| 9 | PowerSync's **bucket + stream** replication model | sync protocol | our event log has no per-tenant partial replication; a driver only ever needs "my stops today" | T7.1 *(new)* |
| 10 | PowerSync's **differential watched queries** (PR #1157) | sync read path | no incremental query invalidation — the whole table is re-read on any change | T7.1 *(new)* |
| 11 | Electric's **Shape** model | sync read path | no read-only live slice of the dispatcher's board on the phone | T7.1 *(new)* |
| 12 | WatermelonDB's `sync({pullChanges, pushChanges, resolvedChanges})` boundary | sync API | our `packages/sync` interface is not specified yet — this is the shape to copy | T7.1 |
| 13 | rxdb's **conflict-handler plugin** API | sync conflicts | a documented, pluggable conflict-resolution API instead of a hard-coded rule table | T7.1 |
| 14 | Loro's **named-test-per-merge-edge-case** discipline | sync QA | our conflict rules C1–C7 need the same test granularity | T7.1 |
| 15 | MobileNativeFoundation/Store's **repository pattern** (fetch/update over network+disk+memory) | sync read path | no typed, testable repository boundary between the UI and the DB | T7.1 *(new)* |
| 16 | ZeBridge's **change data capture** from Postgres | sync write path | we hand-write the event log; logical decoding would give it to us — but it costs a Rust/Zig daemon and a Postgres extension | T7.1 *(new)* |
| 17 | `sqlsync`'s collaborative SQLite-wrapper sync | sync | a third sync model to compare in the chaos test | T7.1 *(new)* |
| 18 | the documented **expo-updates / expo-sqlite compile-clash** fix | sync build | our root `package.json` still lacks the `"op-sqlite"` block ⇒ **no SQLCipher, no FTS5 in the shipped app** | T7.1 |

## Decision

**KEEP (no change):** **op-sqlite 18.2.5** as the on-device database, with our own **event-log sync engine** (`packages/sync` ↔ Postgres) exactly as FINAL_PROMPT §0-F.3 and §10.3 specify. Reasons: (a) the spec already commits to it; (b) the D8 address engine and the LINZ FTS5 slice must live in the same SQLCipher database; (c) an event log with documented conflict rules is exactly what the "wrong-house / lost delivery" risks demand; (d) every serious alternative either costs a licence (PowerSync service = FSL), lacks a write path (Electric), is web-only (Dexie), is vendor-deprecated (Realm), or is unmaintained (WatermelonDB, Replicache, redux-offline).

**ADOPT:**
1. **op-sqlite build toggles** — add to the **root** `package.json`: `"op-sqlite": { "sqlcipher": true, "fts5": true, "performanceMode": true, "sqliteFlags": "-DSQLITE_TEMP_STORE=2" }`. (FINAL_PROMPT §0-F.3 mandates the first two; `performanceMode` and the temp-store flag are the documented Android fix for large-query IO errors on the 656 k-address slice.) **This is missing today.**
2. **Remove `expo-sqlite` from `apps/mobile`** — it is imported nowhere and it is a documented iOS compile-clash with op-sqlite.
3. **`"expo.updates.useThirdPartySQLitePod": "true"`** in `ios/Podfile.properties.json` (Expo CNG) — or drop `expo-updates` — to break the duplicate-SQLite-symbol failure. (Our `expo-updates` presence is unconfirmed: it is not a direct dependency.)
4. **The WatermelonDB adapter shape** — `sync({ pullChanges, pushChanges, resolvedChanges })` as the TypeScript interface of `packages/sync`, with a fake implementation for tests (V4 §6.1).
5. **op-sqlite's `executeBatch` + typed error codes** for atomic event writes and typed failures.
6. **TanStack Query** for the **web dashboard** only (server state), and **Dexie / wa-sqlite** if the dashboard ever needs an IndexedDB cache.

**WATCH (prototype, not adopt):** **PowerSync** — the best off-the-shelf engine; the client is Apache-2.0 and runs on op-sqlite, but **the service is FSL-1.1-ALv2 (a licence decision for the founder, not for us)** and `docs/product/LICENSES.md` currently excludes FSL; run it in the chaos test as candidate #2 to get a real comparison. **Electric** (read-path only; the strategic direction is open, issue #4770). **loro** (if collaborative editing appears). **ZeBridge** (if we want CDC instead of a hand-written event log). **libsql/Turso** (a second datastore we do not need). **MobileNativeFoundation/Store** (the repository pattern). **sqlsync** (a third model to compare). **`expo-opsqlite-spatialite-demo`** (if on-device radius queries over LINZ are ever needed).

**REJECT:** Realm JS (vendor-deprecated sync), Replicache (archived), WatermelonDB (no default-branch commits for ≥ 12 months, no CI), redux-offline (archived), Sharedb (OT needs a central ordering server), Yjs/Automerge/Loro-as-a-database (CRDTs are the wrong merge model for our aggregates), rqlite (a consensus cluster), libsql as a *backend* (our backend is Postgres), InstantDB (a hosted dependency), PouchDB (no RN-native path), `mrousavy/StorageBenchmark` (stale — but copy its method), `op-sqlite-next` (not published), `y-op-sqlite` (no licence), `op-sqlite-drizzle-example` (no licence; the ORM is optional), `hoodie` (no CI, no releases since 2019).

**Risks & fallback**
- **Risk 1 — iOS duplicate SQLite symbols:** `expo-sqlite` + `expo-updates` + `op-sqlite` in one app is a **documented** clash. Mitigations in order: drop `expo-sqlite` (unused) → set `useThirdPartySQLitePod` → only as a last resort `iosSqlite: true`, which **kills extension loading** and would break FTS5 — treat as unacceptable.
- **Risk 2 — op-sqlite has no CI on its head commit, and two memory-safety fixes landed in the last fortnight** (#457, #458). Pin the exact version, subscribe to the releases, and re-check before each phase (V4 §3.4).
- **Risk 3 — op-sqlite #469:** `close()` leaves the connection's worker thread alive until GC, which an iOS background kill reports as **1,006 idle threads**. A long-lived background sync worker must not leak a thread per connection.
- **Risk 4 — FSL in the stack (if PowerSync is ever adopted):** record it in `docs/product/LICENSES.md`, get founder sign-off, and never ship the service inside the mobile bundle (it is server-side anyway).
- **Risk 5 — vendor retirement / strategic drift:** the monthly radar must treat "the vendor's direction is unclear" (as in Electric #4770) and "the hosted tier is shutting down" as **disqualifiers** for anything on the critical path.
- **Risk 6 — the two databases in one process:** the encrypted `app.db` and the read-only LINZ slice must never be attached with the same key, and the slice must be opened **read-only** so a bug cannot corrupt the public dataset.
- **Fallback chain:** our own event-log engine → (if it fails the chaos test) the PowerSync client + service → (if that is blocked on licence) a hand-rolled pull/push protocol over our own API with Postgres as the source of truth.

## Monthly radar filter (V4 §11.3)

- **OP-Engineering/op-sqlite** — releases + **default-branch commits** (not `pushed_at`); any new memory-safety fix is a same-week bump; watch #469/#467/#466 and the RBU PR #453; and re-check the **absence of CI** (if CI appears, that is good news and should be recorded).
- **powersync-ja/powersync-js** and **powersync-ja/powersync-service** — releases, and **any change to the FSL terms** (a licence change is a stop-the-line event); also the NOASSERTION licences of `powersync-kotlin` and `powersync.dart`.
- **electric-sql/electric** — issue #4770 (the Databricks question) and whether the read/write model converges.
- **loro-dev/loro** — only if collaborative editing is ever requested.
- **ndrean/ZeBridge** — only if we seriously consider CDC instead of a hand-written event log.
- **tursodatabase/libsql** / Turso — only if we ever move the backend off Postgres.
- Filters: release in the last 6 months · permissive licence · New-Arch ready · no supply-chain incident · ≥ 2 active maintainers in 90 days · default-branch commit in the last 90 days.

## What we could not verify

- **Every performance number** (sync delay, DB size, startup, thread count) — no harness exists. UNVERIFIED.
- **The FSL "Competing Use" boundary for our internal use** — we read the licence text (internal use is a Permitted Purpose), but this is a legal question and it needs the founder's explicit acceptance. UNVERIFIED (legally).
- **Whether the FSL service will convert to Apache-2.0 on the schedule we would need** — the grant is "effective on the second anniversary of the date we make the Software available"; the mechanics for a modified deployment were not checked. UNVERIFIED.
- **PowerSync's real conflict-resolution behaviour for our aggregate model** — we did not stand up the service. UNVERIFIED.
- **op-sqlite's `executeBatch` rollback semantics under SQLCipher** — the fix landed 2026-09-20 and has not been exercised by us. UNVERIFIED.
- **The Android/iOS build-time impact of adding `sqlcipher: true, fts5: true` to our root `package.json`** — we have never built the app with those toggles; the iOS clash above is the specific risk. UNVERIFIED.
- **Whether `expo-updates` is actually in our dependency graph** (it is not a direct dependency of `apps/mobile`; it may come in via `expo` or `expo-dev-client`) — the clash is therefore *possible* but not confirmed. UNVERIFIED.
- **The median first-response time** (V4 §12.3) — measured by us over the 50 oldest closed issues, which biases long-lived repositories downwards; it is **not** a "time to first response today" figure. UNVERIFIED as such.
- **6-month star trend for every candidate** — no historical star API on our token. UNVERIFIED (releases + commits + maintainers are the stated proxy).
- **Vendor customer claims** (Oracle/IBM for Electric, the RxDB premium tier) — the vendors' customer pages were not read in this sprint. UNVERIFIED.

Corrected by the verifier pass of 2026-10-21 (VERIFICATION-C.md): 3 cards corrected.
