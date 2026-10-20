# Research 2026 — offline-first sync & local databases

**Area:** Sync & Data squad (`docs/squads/sync/`)
**Researcher role:** Researcher (V4 §1 role 2, V4 §3, §10.3, §12)
**Research date:** 2026-10-20 (all stars/dates/licences from the GitHub and npm APIs on this date)
**Our current choice (the baseline)**
- `@op-engineering/op-sqlite` **18.2.5** is already a dependency of `apps/mobile` (MIT). `expo-sqlite` 58.0.13 is **also** a dependency and is **not imported anywhere in `apps/mobile/src`** — it is dead weight *and* a build hazard (see "Risk 1").
- `app.json` has `"newArchEnabled": true`; Expo SDK 58, RN 0.88.0, React 19.3.0.
- The intended design is already fixed by FINAL_PROMPT §0-F.3: **"op-sqlite event log ↔ Postgres"**, "event-log sync idempotent with conflict rules documented", "migrations versioned and reversible", and §10.3's gate: **zero data loss under airplane-mode chaos tests, conflict rules tested, sync delay p95 ≤ 60 s online**.
- `packages/sync` and `apps/api/app/sync` **do not exist yet**; `docs/squads/sync/STATUS.md` = "not measured yet"; `docs/squads/sync/eval/` does not exist.

## Queries run

1. `gh search repos "offline-first" --sort stars --limit 30`
2. `gh search repos "powersync" --sort stars --limit 20`
3. `gh search repos "sqlite react native" --sort stars --limit 25`
4. `gh search repos "local-first sync engine" --sort stars --limit 25`
5. `gh search repos "op-sqlite" --sort stars --limit 20`
6. `gh search repos "watermelondb" --sort stars --limit 12`
7. `gh search repos "replicache dexie rxdb" --sort stars --limit 12` → 0 (AND semantics)
8. `gh search repos "electric-sql" --sort stars --limit 20`
9. `gh search repos "replicache" --sort stars --limit 5`
10. `gh search repos "crsqlite" --sort stars --limit 5`
11. `gh search repos "rocicorp zero" --sort stars --limit 5`
12. `gh search repos "ditto sdk" --sort stars --limit 5`
13. `gh search repos "wa-sqlite" --sort stars --limit 5`
14. `gh search repos "nitro-modules" --sort stars --limit 5`
15. `gh api repos/<owner>/<repo>` for 30 repos (stars, forks, created_at, pushed_at, `license.spdx_id`, topics, archived)
16. `gh api repos/<owner>/<repo>/releases?per_page=12` (last release + 12-month cadence)
17. `gh api repos/<owner>/<repo>/commits?since=<90d>&per_page=100` (distinct authors = active maintainers, 90 d)
18. `gh api repos/<owner>/<repo>/commits?per_page=20` (deep review: op-sqlite, electric, loro)
19. `gh api -X GET search/issues -f "q=repo:<o>/<r> is:issue is:open|closed"`
20. `gh api repos/<owner>/<repo>/readme` (raw: op-sqlite, powersync-js, `packages/react-native/README.md`)
21. `gh api repos/powersync-ja/powersync-service/license` (raw LICENSE — **FSL-1.1-ALv2**)
22. npm registry + `api.npmjs.org/downloads/point/last-week`: `@op-engineering/op-sqlite`, `@powersync/react-native`, `react-native-nitro-sqlite`, `expo-sqlite`, `dexie`
23. webfetch: `op-engineering.github.io/op-sqlite/docs/installation/` (config keys, compile clashes) · `electric-sql.com/docs` (read-path sync, Shapes)

## Candidates (31) — evidence cards

`stars · created · last release @ date · cadence · maint(90 d) · issues open/closed · licence (code / data) · platform · decision`.
**6-month star trend: UNVERIFIED for all candidates** — no historical star count in the REST API; snapshot `stargazers_count` monthly in CI. Maintainer counts and release cadence are the verified liveness proxy.

1. **OP-Engineering/op-sqlite** — https://github.com/OP-Engineering/op-sqlite · 1,049 ★ · 2023-11-06 · `18.2.5` @ 2026-09-20 · 12 rel/12 m · 8 maintainers/90 d (76 commits) · 8 open / 216 closed · **MIT** / n/a / n/a · **on-device** (iOS/Android/macOS/web), JSI/Nitro · npm **417,985 dl/week** · features verified from the README: vanilla SQLite, **SQLCipher**, **FTS5**, Rtree, sqlite-vec, **Turso**, **LibSQL**, reactive queries, custom tokenizers, runtime extension loading, JSONB, `db.interrupt()`, built-in KV store · **ADOPT (already our local DB)**
2. **powersync-ja/powersync-js** — 735 ★ · 2023-10-03 · `@powersync/react-native@2.3.3` @ 2026-10-19 · 12 rel/12 m · 15 maintainers/90 d (100+ commits) · 34 open / 154 closed · **Apache-2.0** / n/a / n/a · **on-device** · npm `@powersync/react-native` 2.3.3, **39,260 dl/week** · **the RN SDK is built on `@op-engineering/op-sqlite`** (verified from its README: `npx expo install @powersync/react-native @op-engineering/op-sqlite`; SQLCipher via `"op-sqlite": {"sqlcipher": true}` + `sqliteOptions.encryptionKey`; FTS5 via `"op-sqlite": {"fts5": true}`; its own extension loaded as `sqlite3_powersync_init`) · **WATCH → conditional ADOPT**
3. **powersync-ja/powersync-service** — 395 ★ · 2024-05-30 · `v1.27.0` @ 2026-10-06 · 12 rel/12 m · 13 maintainers/90 d (88 commits) · 18 open / 61 closed · **licence = "Other": FSL-1.1-ALv2 (Functional Source License)** — verified by reading the LICENSE file: "Copyright 2023-2026 Journey Mobile, Inc.", permitted use = "any purpose other than a Competing Use", converts to Apache-2.0 after two years · server · **WATCH** (see the licence discussion below)
4. **powersync-ja/powersync-sqlite-core** — 47 ★ · 2023-08-29 · `v0.5.4` @ 2026-10-16 · 6 open · **Apache-2.0** · on-device extension · **WATCH** (only if PowerSync is adopted)
5. **powersync-ja/powersync-native** — 23 ★ · 2025-10-08 · `v0.1.1` @ 2026-10-12 · 3 open · **Apache-2.0** · on-device · **WATCH**
6. **Nozbe/WatermelonDB** — 11,791 ★ · 2018-08-28 · **last default-branch commit 2025-08-11** (≥ 12 months stale; the 2026-09-16 `pushed_at` came from a non-default branch) · 0 maintainers/90 d · 0 rel/12 m · 272 open / 788 closed · **MIT** / n/a · on-device SQLite + its own sync protocol and server adapters · **REJECT** (maintenance), **KEEP as a spec reference** for the "local DB with observable reactive queries + a pluggable sync adapter" shape
7. **realm/realm-js** — 6,000 ★ · 2015-08-13 · `realm-react-v0.20.0` @ 2025-10-17 · 0 maint/90 d (HEAD 2025-10-16) · 601 open / 3,088 closed · **Apache-2.0** · on-device NoSQL · README (read): "We announced the deprecation of Atlas Device Sync + Realm SDKs in September 2024" · **REJECT** (vendor-deprecated sync)
8. **rocicorp/replicache** — 1,173 ★ · **ARCHIVED** · last rel `v10.0.0` @ 2022-05-07 · HEAD 2022-04-22 · 33 open · licence none · **REJECT** (dead)
9. **electric-sql/electric** — 10,407 ★ · 2022-06-01 · last release tags `@electric-sql/y-electric@0.1.54` @ 2026-09-09 (12 rel/12 m) · 14 maintainers/90 d (48 commits) · 175 open / 955 closed · **Apache-2.0** / n/a · on-device + sync service · docs (read): "Electric Sync is a **read-path** sync engine for Postgres… syncs data out of Postgres into local clients over HTTP using a primitive called a Shape… **Writes go back through your API**" · commits 2026-09-28: "Remove mentions of Electric Cloud from the sync/quickstart page", "Note **Electric Cloud shutdown** in the agents app READMEs", "Stop dispatching release events to the Cloud repo"; 2026-09-01: "promote adopted dependency consumers to **transaction writes**" · **WATCH** (read-path only — our sync needs a write path; hosted tier is shutting down)
10. **dexie/Dexie.js** — 14,652 ★ · 2014-02-26 · `v4.4.7` @ 2026-10-19 · 8 rel/12 m · 12 maintainers/90 d (34 commits) · 570 open / 990 closed · **Apache-2.0** / n/a · **web/IndexedDB only** (npm `dexie` 4.4.6, 1,555,766 dl/week) · OSV: **GHSA-3xgx-r9j4-qw9w** prototype pollution (2022-05-03) · **REJECT for the phone** (IndexedDB), **KEEP for the web dashboard**
11. **pubkey/rxdb** — 23,409 ★ · 2016-12-02 · `17.6.0` @ 2026-10-05 · 12 rel/12 m · 3 maintainers/90 d (100+ commits) · 2 open / 902 closed · **Apache-2.0** · browser/Node (IndexedDB, SQLite, memory, storage) with a premium sync service · **WATCH** (excellent engineering; commercial sync tier, wrong platform)
12. **yjs/yjs** — 22,957 ★ · 2014-07-29 · `v14.0.0-rc.29` @ 2026-10-15 (stable `v13.6.33` @ 2026-09-23) · 12 rel/12 m · 6 maintainers/90 d (30 commits) · 117 open / 407 closed · licence "Other" (repo states MIT; API reports NOASSERTION — **treat as MIT, but re-verify from the LICENSE file before shipping**) · CRDT for collaborative editing · **REJECT** (we have single-writer-per-entity semantics, not collaborative text)
13. **loro-dev/loro** — 6,231 ★ · 2022-07-12 · `loro-crdt@1.16.4` @ 2026-09-30 · 12 rel/12 m · 13 maintainers/90 d (100+ commits) · 42 open / 217 closed · **MIT** · Rust core + WASM/JS, CRDT with rich-text and map semantics · **WATCH** (the only CRDT with a credible RN story; but our data is records, not documents)
14. **automerge/automerge** — 6,668 ★ · 2019-12-26 · `js/automerge-3.5.0` @ 2026-09-16 · 12 rel/12 m · 7 maintainers/90 d (100+ commits) · 74 open / 255 closed · **MIT** · JS/Rust CRDT · **REJECT** (same reason as Yjs; Rust/WASM build weight on mobile)
15. **share/sharedb** — 6,539 ★ · 2013-04-01 · `v6.0.4` @ 2026-10-05 · 5 rel/12 m · 2 maintainers/90 d (43 commits) · 151 open / 214 closed · licence "Other" (MIT per repo) · OT/JSON operational transform server + client · **REJECT** (OT needs a central server ordering; we are offline-first)
16. **tursodatabase/libsql** — 17,278 ★ · 2022-09-29 · last GitHub release `libsql-server-v0.24.32` @ 2025-02-14 · 0 rel/12 m · 3 maintainers/90 d (9 commits) · 412 open / 230 closed · **MIT** · embedded SQLite fork with a server and embedded replicas · **WATCH** — note op-sqlite can compile against **Turso** and then exposes `openRemote`/`openSync`, and `expo-starter/expo-opsqlite-libsql-turso` (32 ★, Apache-2.0) is a working reference. Our backend is Postgres, so a Turso backend would be a second datastore — reject unless we move the backend.
17. **rqlite/rqlite** — 17,808 ★ · 2014-08-23 · `v10.6.2` @ 2026-10-18 · 12 rel/12 m · 1 maintainer/90 d · 67 open · **MIT** · distributed SQLite with Raft consensus · **REJECT** (a consensus cluster for one courier app)
18. **instantdb/instant** — 10,550 ★ · 2024-08-19 · no GitHub releases · 4 maintainers/90 d (100+ commits) · 42 open · **Apache-2.0** · hosted local-first DB with a Postgres backend · **REJECT** (hosted dependency; the offline guarantee would then depend on someone else's uptime)
19. **TanStack/query** — 50,465 ★ · 2019-09-10 · `release-2026-10-19-1659` @ 2026-10-19 · 12 rel/12 m · 4 maintainers/90 d · 146 open · **MIT** · server-state cache (not a local-first database) · **KEEP as the web dashboard's server-state layer**, **REJECT as our offline store**
20. **sqlite/sqlite** — 10,732 ★ · 2019-03-18 (mirror) · no GitHub releases · 100+ commits/90 d · 26 open · licence "Other" (**public domain**) · the engine itself · **KEEP** (it is inside op-sqlite)
21. **rhashimoto/wa-sqlite** — 1,419 ★ · 2021-04-20 · `v1.1.2` @ 2026-08-11 · 3 rel/12 m · 4 maintainers/90 d (48 commits) · 15 open · **MIT** · WASM SQLite with OPFS/IndexedDB VFS · **REJECT for the phone** (op-sqlite is native), **KEEP for the web dashboard** (where WASM is the only option)
22. **margelo/react-native-nitro-sqlite** — 580 ★ · 2023-04-05 · `v10.2.0` @ 2026-10-12 · 12 rel/12 m · 7 maintainers/90 d (100+ commits) · 16 open / 94 closed · **MIT** · on-device SQLite via Nitro · **WATCH** — a credible alternative to op-sqlite; **but it does not list SQLCipher/FTS5 build toggles** in the same way and op-sqlite is already installed → no migration reason
23. **margelo/nitro** (react-native-nitro-modules) — 1,967 ★ · 2024-06-12 · `v0.37.1` @ 2026-08-27 · 12 rel/12 m · 238 open · **MIT** · the JSI/HybridObject runtime that VisionCamera v5 and op-sqlite build on · **KEEP** (already pinned 0.37.1)
24. **expo/expo** (`expo-sqlite` 58.0.13) — 1,123,928 npm dl/week · **MIT** · on-device SQLite with a Expo-friendly API · **REJECT as the app's DB** (no SQLCipher toggle + FTS5 build control in the same package; conflicts with op-sqlite on iOS), **KEEP only for local dev fixtures**
25. **tigawanna/expo-opsqlite-spatialite-demo** — 8 ★ · MIT · pushed 2026-06-01 · on-device **SpatiaLite** with op-sqlite + Drizzle + an Expo config plugin · **WATCH** — proves op-sqlite can carry a spatial extension; relevant only if we ever do on-device radius queries over the LINZ slice
26. **OP-Engineering/op-sqlite-drizzle-example** — 10 ★ · pushed 2025-01-26 · no licence · **WATCH** — the ORM path for op-sqlite if we want typed queries
27. **malte-j/y-op-sqlite** — 25 ★ · pushed 2024-06-14 · no licence · Yjs persistence provider for op-sqlite · **REJECT**
28. **expo-starter/expo-opsqlite-libsql-turso** — 32 ★ · Apache-2.0 · pushed 2025-01-29 · reference app for op-sqlite + libSQL/Turso · **WATCH** (reference)
29. **gapless/others** — `powersync-ja/powersync-kotlin` (128 ★), `powersync-swift` (63 ★), `powersync-dotnet` (52 ★), `powersync.dart` (254 ★): **REJECT** (other platforms), **KEEP as a protocol reference** — the client SDKs document the sync protocol and the bucket/stream model, which is exactly the spec we need for our own event-log service.
30. **`pouchdb/pouchdb`** — 17,622 ★ · Apache-2.0 · pushed 2026-10-17 · last GitHub release `9.0.0` @ 2024-06-21 · 194 open · **REJECT** (CouchDB replication model, no RN-native path, heavy)
31. **`maddy`/`mrousavy` ecosystem** — `mrousavy/StorageBenchmark` (55 ★, no licence, pushed 2024-01-11): **REJECT** (stale), but its *method* (benchmarking React Native storage engines on-device) is the harness we should copy for the sync squad's p95 gate.

## Shortlist (12)

`OP-Engineering/op-sqlite` · `powersync-js` + `powersync-service` + `powersync-sqlite-core` · `electric-sql/electric` · `loro-dev/loro` · `yjs/yjs` · `Nozbe/WatermelonDB` (spec reference) · `tursodatabase/libsql` · `dexie` (web) · `TanStack/query` (web) · `realm-js` (rejection evidence) · `margelo/react-native-nitro-sqlite`.

## Deep review — top 5

**1. OP-Engineering/op-sqlite (our local DB — keep)** — README + docs page + last 20 commits read.
*Architecture:* JSI/Nitro native module over a compiled-from-source SQLite (the docs say "On Android SQLite is always compiled from source as each vendor messes with sqlite or uses outdated versions"). Build-time toggles live in the **root** `package.json` under an `"op-sqlite"` key: `sqlcipher`, `performanceMode`, `iosSqlite`, `sqliteFlags`, `fts5`, `rtree`, `libsql`, `turso`, `sqliteVec`, `tokenizers`. **Our root `package.json` has no `"op-sqlite"` block today** — FINAL_PROMPT §0-F.3 requires `sqlcipher: true` and `fts5: true`; that block is still missing and must be added before the first native build.
*Code quality:* 8 maintainers/90 d, 12 releases/12 m, 76 commits/90 d; the last 20 commits are heavy native work — "Fix use after free in commit hook callback (#458)" (2026-09-18), "await transaction commit and preserve finalized handles (#457)", "Expose error codes (#463)", "add execute batch sync (#461)" and "Fix libsql executeBatch swallowing errors instead of rolling back" (2026-09-20). **Two memory-safety fixes inside a fortnight** — a risk to record, not a blocker.
*API ergonomics:* `execute`/`executeSync`/`executeBatch`, `transaction`, `db.interrupt()`, reactive queries, a KV store, `openAsync` for web.
*Extensibility:* runtime extension loading (`sqliteOptions.extensions`) — that is the hook PowerSync uses for its core extension, and the hook we would use for our own `sqlite3_courier_init` if we ever need one.
*Performance:* `performanceMode: true` is "almost always" recommended by the docs but "test your app thoroughly"; `sqliteFlags: "-DSQLITE_TEMP_STORE=2"` is documented for **Android IO exceptions on large queries** — directly relevant to the 225,151-row LINZ FTS slice on a phone.

**2. powersync-js + powersync-service (the strongest off-the-shelf sync engine)** — READMEs + the service's LICENSE read.
*Architecture:* a client-side SQLite database kept in sync with a backend over "sync buckets" (per-table) and "sync streams" (dynamic), with a local write queue and server-side conflict resolution. The **React Native SDK runs on `@op-engineering/op-sqlite`** and reuses our exact build toggles: SQLCipher via the `op-sqlite` package.json block + `sqliteOptions.encryptionKey`, FTS5 via `op-sqlite.fts5`, and its own core extension loaded as `sqlite3_powersync_init`. That means **PowerSync and our LINZ FTS5 slice can live in the same database** — a genuine architectural win.
*Maintenance:* 15 maintainers/90 d on the client, 13 on the service, 12 releases/12 m on each, 100+ commits/90 d on the client, 88 on the service. Healthy.
*The catch — licence:* the **client** is Apache-2.0, but the **service is FSL-1.1-ALv2** (verified by reading the LICENSE file): use is granted for "any purpose other than a Competing Use", with automatic conversion to Apache-2.0 two years after each release. Running it internally is a Permitted Purpose, but (a) it is **not** in our preferred licence list (MIT/BSD/Apache/MPL), (b) it must be recorded in `docs/LICENSES.md`, and (c) it is a "no competing use" restriction on a component we would depend on for the sync gate.
*Second catch:* it is a **new server** (Postgres + PowerSync service) on the free-tier stack, and its write-path semantics (last-write-wins per row with a server-side checkpoint) are **not** the "event-log with documented conflict rules" our spec asks for.
*Verdict:* **WATCH, and prototype only.** If our own event-log engine cannot pass the chaos test, PowerSync is the fallback — but the FSL service means the fallback has a licence cost that the founder must accept explicitly.

**3. electric-sql/electric (read-path Postgres sync)** — docs + last 20 commits read.
*Architecture:* "Electric Sync is a **read-path** sync engine for Postgres"; clients pull **Shapes** (subscribed slices of a table) over HTTP; **writes go back through your own API**. For a courier app where the driver *writes* stops, events and POD on the phone, a read-path engine only covers half the problem — the write path would be our own event log anyway.
*Maintenance:* 14 maintainers/90 d, 48 commits/90 d, 12 releases/12 m, 175 open / 955 closed issues.
*Two 2026 signals that matter:* the commits of 2026-09-28 ("Remove mentions of Electric Cloud from the sync/quickstart page", "Note Electric Cloud shutdown in the agents app READMEs") indicate the **hosted tier is being shut down**; and 2026-09-01's "promote adopted dependency consumers to **transaction writes**" shows the write/consistency model is still moving. Adopting a component whose hosted tier is disappearing and whose write semantics are in flux is a bad bet for a v1.0 product.
*Verdict:* **WATCH** — excellent if we later want read-only live views of the dispatcher's board on the phone.

**4. loro-dev/loro (the best CRDT for RN)** — last 20 commits read.
*Architecture:* Rust core exposed to JS/WASM with a rich-text and map CRDT; the last 20 commits (2026-10-09 → 2026-10-19) are dense, high-quality correctness work: "roll back failed undo and redo applications", "preserve MovableList undo identities and removal anchors", "traverse deep trees without overflowing the stack", "prevent quadratic cache clears", "skip cycle-closing concurrent tree moves".
*Why it is still wrong for us:* a CRDT is the right tool when **two actors edit the same logical document concurrently**. Our model is closer to an **event log per aggregate** (a stop, a delivery event, a door-memory row) with a documented conflict rule, plus a *tenant-scoped* read model. Using a CRDT for `stops` would also make "zero wrong-house auto-corrections" harder to reason about, because a merge would be silent.
*Verdict:* **WATCH** — keep as the reference if the founder ever wants collaborative route editing between two dispatchers.

**5. Nozbe/WatermelonDB (the spec reference, rejected as a dependency)** — last 20 default-branch commits + issue counts read.
*Architecture:* a reactive local database over SQLite (or LokiJS in memory) with **observables** and a pluggable **sync adapter** whose protocol is a simple "pull/push changes since a timestamp" contract; the server side is yours to write.
*Why the spec is worth copying:* the adapter boundary (`sync({pullChanges, pushChanges, resolvedChanges, ...})`) is exactly the shape our `packages/sync` should have, and the "last_modified" pull model is a workable event-log read model.
*Why we reject the library:* the last commit on the default branch is **2025-08-11** — over 12 months of no default-branch work — with 272 open issues and 0 releases in 12 months. Betting the sync gate on it is unacceptable.
*Verdict:* **REJECT as a dependency, KEEP the adapter shape.**

## Benchmark

**Status: UNVERIFIED — no harness, no eval set.** `docs/squads/sync/benchmarks/README.md` = "Harness: _to be created with the first implementation_"; `docs/squads/sync/eval/` does not exist. The squad's gate is "zero data loss under airplane-mode chaos tests, conflict rules tested, sync delay p95 ≤ 60 s online" — none of it is measured.

**The set to build (named):** `docs/squads/sync/eval/`
- `scenarios/airplane-mode.jsonl` — a scripted timeline of driver actions (create stop → correct address → mark delivered → add POD photo → record door memory → re-optimise route) with the network state per step (online / degraded / airplane for N minutes / back), the expected final server state, and the expected client state at every step.
- `scenarios/conflicts.jsonl` — deliberate concurrent edits of the same aggregate from two clients (driver app + dispatcher web) with the documented conflict rule as the expected outcome.
- `scenarios/migration.jsonl` — one migration per schema version, with the reversible-apply assertions (down-migration returns the prior state).
- `harness.ts` — runs the scenarios against a real op-sqlite database on the CI emulator and against a real Postgres in CI, and asserts: **no event lost, no event duplicated (idempotence), no event applied twice, final server state == final client state, p95 sync delay ≤ 60 s**.

**Metrics:** `events_lost` (must be 0) · `events_duplicated` (must be 0) · `conflict_rule_violations` (must be 0) · `sync_delay_p50/p95` (≤ 60 s p95) · `db_size_mb` after 10 000 events (must stay inside the APK budget, §6.4) · `startup_p95` with a 50 MB local DB.

**Top-3 to benchmark on the same set:** (1) **our own event-log engine** (the spec'd baseline, implemented in `packages/sync`); (2) **PowerSync client + service** (Apache-2.0 client, FSL service) as the off-the-shelf comparison; (3) **Electric (read-path) + our own write path** as the hybrid comparison.

**Published table + raw results →** `docs/squads/sync/benchmarks/` and `docs/evidence/`.

## What's new in 2026 and what we adopt

1. **PowerSync on op-sqlite (2026)** — the RN SDK is now a first-class op-sqlite consumer with SQLCipher + FTS5 + extension loading. *We adopt:* the **"sync engine on top of our own SQLite, not on top of its own"** architecture; our LINZ FTS5 slice and the sync tables can share one encrypted database.
2. **op-sqlite's 2026 release train (12 releases/12 m)** — `executeBatch` with real rollback, exposed error codes, a fixed use-after-free in the commit hook, `performanceMode`, `sqliteVec`, Turso's `openSync`. *We adopt:* `executeBatch` (atomic event writes) and the **error-code** API (typed errors instead of strings) — V4 §6.2 asks for typed results.
3. **Electric Cloud shutdown (2026-09-28) + "transaction writes" (2026-09-01).** *We adopt:* the rule that **a local-first dependency must be self-hostable** — if the vendor retires the hosted tier, our offline guarantee dies with it. This is a first-class selection criterion from now on.
4. **op-sqlite's documented iOS compile clashes (2026 docs).** *We adopt:* the **"remove the unused `expo-sqlite` dependency"** action and the `"expo.updates.useThirdPartySQLitePod": "true"` recipe, plus the ban on `iosSqlite: true` (it disables extension loading, which we need for FTS5).
5. **Loro's 2026 correctness work.** *We adopt:* the *discipline* (every merge/undo edge case is a named test), not the library.
6. **watermelondb's silence (2025-08 →).** *We adopt:* the *rule* — a sync engine that stops shipping releases is disqualified regardless of its stars; our monthly radar must check **default-branch commits**, not `pushed_at`.

## The event-log engine this research commits us to

The research did not change the architecture; it **specified** it, and removed the alternatives that could have specified it for us. The engine we own, in `packages/sync` (pure TS, no RN imports, testable in Node) and `apps/api/app/sync` (FastAPI), is:

**On the device (one SQLCipher-encrypted op-sqlite database, `app.db`):**
- `outbox` — append-only: `event_id` (UUIDv7, the idempotency key), `client_seq` (monotonic per device), `entity_type`, `entity_id`, `op` (create/update/delete), `payload` (JSON), `created_at`, `synced_at` (null until the server acknowledges). **Append-only is the whole trick**: a crash mid-write loses at most the last uncommitted row, and a duplicate send is harmless because the server keys on `event_id`.
- `sync_state` — one row: `server_cursor` (the last acknowledged cursor), `device_id`, `last_pull_at`, `schema_version`.
- `outbox` is written **in the same transaction** as the domain write (a delivery event, a stop, a door-memory row) — that single property is what makes "zero data loss" true rather than aspirational.
- The **LINZ FTS5 slice lives in a second, read-only, unencrypted database** attached with `ATTACH` (FINAL_PROMPT §0-F.3: "a read-only slice of LINZ addresses, a separate unencrypted database for reading (public CC BY data)"). The same op-sqlite instance can hold both files; the key protects only `app.db`.

**On the server (Postgres):**
- `sync_events` — the same shape, with `event_id` as the primary key (the idempotency guarantee), an assigned `cursor` (bigserial), and a per-tenant `org_id`.
- The API applies an event by dispatching to the same domain function the HTTP handler calls, so there is exactly **one** code path that can mutate a stop. A second implementation is how tenant-isolation and "never deliver the wrong house" bugs are born.
- A **cursor-based pull** (`GET /v1/sync?since=<cursor>&org_id=…`) returns the org's changes; the client applies them idempotently by `event_id` and stores the new cursor in the same transaction as the applied changes.

**Conflict rules to implement and test (this is the "conflict rules documented" deliverable):**

| # | Conflict | Rule | Why |
|---|---|---|---|
| C1 | Same stop edited on two devices | **last-write-wins by `updated_at`, then by `event_id`** (deterministic tie-break) | a driver correcting a suburb must not be overwritten by a stale copy |
| C2 | Delivery event vs stop edit | **delivery event wins** (it is terminal and has a server timestamp) | never un-deliver a parcel |
| C3 | Two delivery events for one stop | **first server-accepted event wins**; the second is rejected as a duplicate and recorded | one parcel, one delivery |
| C4 | Door memory vs door memory | **merge per-key** (the newer value of each gate code wins) | the driver learns incrementally |
| C5 | Address correction vs correction | **server wins** (the LINZ check is authoritative) | the D8 engine must not be second-guessed on the client |
| C6 | Delete vs update on the same entity | **delete wins if it is older than 7 days, otherwise the update wins** | a resurrected parcel is a bug; a late update of a deleted stop is a race |
| C7 | Any write across orgs | **rejected at the API** (never merged) | tenant isolation |

**Schema versioning:** every migration is versioned, applied in order, and **reversible** (FINAL_PROMPT §6.3). The device stores `schema_version`; a server that is ahead of the device sends a `resync_required` signal rather than a payload the device cannot read. The device ships a **read-only LINZ slice with its own version**, and the weekly worker publishes a checksummed slice (the `postcodes.io` model) that the app swaps in **atomically after the shift ends** (FINAL_PROMPT §0-C).

**Why this is better than the alternatives we found:** PowerSync's write path is server-side and row-oriented (last-write-wins per row with a server checkpoint) — it does not give us the *documented, per-conflict-class* rules above; Electric has no write path at all; the CRDT libraries merge silently, which would make C1–C6 invisible; and a hand-rolled OT server (Sharedb) needs a central ordering that an offline driver cannot produce.

## Decision

**KEEP (no change):** **op-sqlite 18.2.5** as the on-device database, with our own **event-log sync engine** (`packages/sync` ↔ Postgres) exactly as FINAL_PROMPT §0-F.3 and §10.3 specify. Reasons: (a) the spec already commits to it; (b) the D8 address engine and the LINZ FTS5 slice must live in the same SQLCipher database; (c) an event log with documented conflict rules is exactly what the "wrong-house / lost delivery" risks demand; (d) every serious alternative either costs a licence (PowerSync service = FSL), lacks a write path (Electric), is web-only (Dexie), is vendor-deprecated (Realm), or is unmaintained (WatermelonDB, Replicache).

**ADOPT:**
1. **op-sqlite build toggles** — add to the **root** `package.json`: `"op-sqlite": { "sqlcipher": true, "fts5": true, "performanceMode": true, "sqliteFlags": "-DSQLITE_TEMP_STORE=2" }`. (FINAL_PROMPT §0-F.3 already mandates the first two; `performanceMode` and the temp-store flag are the documented Android fix for large-query IO errors on the 225 k-address slice.)
2. **Remove `expo-sqlite` from `apps/mobile`** — it is unused in code and it is a documented iOS compile-clash with op-sqlite.
3. **`"expo.updates.useThirdPartySQLitePod": "true"`** in `ios/Podfile.properties.json` (Expo CNG) — or drop `expo-updates` — to break the duplicate-SQLite-symbol failure.
4. **The WatermelonDB adapter shape** — `sync({ pullChanges, pushChanges, resolvedChanges })` as the TypeScript interface of `packages/sync`, with a fake implementation for tests (V4 §6.1).
5. **op-sqlite's `executeBatch` + error codes** for atomic event writes and typed failures.
6. **TanStack Query** for the **web dashboard** only (server state), and **Dexie/wa-sqlite** if the dashboard ever needs an IndexedDB cache.

**WATCH (prototype, not adopt):** **PowerSync** (best off-the-shelf engine; the client is Apache-2.0 and runs on op-sqlite; **but the service is FSL-1.1-ALv2 — a licence decision for the founder, not for us**; run it in the chaos test as candidate #2 to get a real comparison); **Electric** (read-path only; hosted tier shutting down); **loro** (if collaborative editing appears); **libsql/Turso** (a second datastore we do not need); **`expo-opsqlite-spatialite-demo`** (if on-device radius queries over LINZ are ever needed).

**REJECT:** Realm JS (vendor-deprecated sync), Replicache (archived), WatermelonDB (unmaintained default branch), Sharedb (OT needs a central ordering server), Yjs/Automerge/Loro-as-a-database (CRDTs are the wrong merge model for our aggregates), rqlite (consensus cluster), libsql (different backend), InstantDB (hosted dependency), PouchDB (no RN-native path), `mrousavy/StorageBenchmark` (stale — but copy its method), op-sqlite-next (not published), `y-op-sqlite` (no licence), `op-sqlite-drizzle-example` (no licence; ORM optional).

**Risks & fallback**
- *Risk 1 — iOS duplicate SQLite symbols:* `expo-sqlite` + `expo-updates` + `op-sqlite` in one app is a **documented** clash. Mitigations, in order: drop `expo-sqlite` (unused) → set `useThirdPartySQLitePod` → only as a last resort `iosSqlite: true` (which **kills extension loading**, so FTS5/our extension would break — treat as unacceptable).
- *Risk 2 — memory-safety fixes in op-sqlite within the last fortnight:* pin the exact version, subscribe to the repo's releases, and re-check before each phase (V4 §3.4).
- *Risk 3 — FSL in the stack (if PowerSync is ever adopted):* record it in `docs/LICENSES.md`, get founder sign-off, and never ship the service inside the mobile bundle (it is server-side anyway).
- *Risk 4 — vendor retirement:* our monthly radar must treat "hosted tier shutting down" (as Electric did) as a **disqualifier** for anything on the critical path.
- *Risk 5 — the two databases in one process:* the encrypted `app.db` and the read-only LINZ slice must never be attached with the same key, and the slice must be opened **read-only** (`?mode=ro` equivalent) so a bug cannot corrupt the public dataset.
- *Fallback chain:* our own event-log engine → (if it fails the chaos test) PowerSync client + service → (if that is blocked on licence) a hand-rolled pull/push protocol over our own API with Postgres as the source of truth.

## Monthly radar filter (V4 §11.3) — what we will re-check for this area

Re-run on the first Monday of each month and update this file:
- `OP-Engineering/op-sqlite` — releases + **default-branch commits** (not `pushed_at`); any new memory-safety fix is a **same-week** bump.
- `powersync-ja/powersync-js` and `powersync-ja/powersync-service` — releases, and **any change to the FSL terms** (a licence change is a stop-the-line event).
- `electric-sql/electric` — whether the hosted tier stays shut and whether the read/write model converges.
- `loro-dev/loro` — only if collaborative editing is ever requested.
- `tursodatabase/libsql` / Turso — only if we ever move the backend off Postgres.
- Filters to apply: release in the last 6 months · permissive licence · New-Arch ready · no supply-chain incident · ≥ 2 active maintainers in 90 days · default-branch commit in the last 90 days.


## What we could not verify

- **Every performance number** (sync delay, DB size, startup) — no harness. UNVERIFIED.
- **PowerSync's real conflict-resolution behaviour for our aggregate model** — we did not stand up the service. UNVERIFIED.
- **The FSL "Competing Use" boundary for our internal use** — we read the licence text but this is a legal question; it needs the founder's explicit acceptance. UNVERIFIED (legally).
- **Whether the PowerSync FSL licence will convert to Apache-2.0 on the schedule we would need** — the licence says two years per version; the exact mechanics for a modified deployment were not checked. UNVERIFIED.
- **op-sqlite's `executeBatch` rollback semantics under SQLCipher** — the fix landed 2026-09-20; not exercised by us. UNVERIFIED.
- **6-month star trend for every candidate.** UNVERIFIED.
- **Median issue response time for every candidate.** UNVERIFIED.
- **The exact Android/iOS build-time impact of adding `sqlcipher: true, fts5: true` to our root `package.json`** — we have never built the app with those toggles; the iOS clash above is the specific risk. UNVERIFIED.
- **Whether `expo-updates` is actually in our dependency graph** (it is not a direct dependency; it may come in via `expo` or `expo-dev-client`) — the clash is therefore *possible* but not confirmed. UNVERIFIED.
