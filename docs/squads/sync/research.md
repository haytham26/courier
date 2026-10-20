# Sync & Data Squad - research

**Area:** offline-first sync, local databases, event-log engine **Research date:** 2026-10-20 · **Source file:** `docs/research/2026/offline-first-sync-local-dbs.md`

## Queries that found the candidates

`"offline-first"` · `"powersync"` · `"sqlite react native"` · `"local-first sync engine"` · `"op-sqlite"` · `"watermelondb"` · `"replicache dexie rxdb"` (0) · `"electric-sql"` · `"replicache"` · `"crsqlite"` · `"rocicorp zero"` · `"ditto
sdk"` · `"wa-sqlite"` · `"nitro-modules"` · `gh api repos/<o>/<r>` for 30 repos · `/releases?per_page=12` · `/commits?since=<90d>` · `/readme` · the service LICENSE file · npm registry + downloads for `@op-engineering/op-sqlite`,
`@powersync/react-native`, `react-native-nitro-sqlite`, `expo-sqlite`, `dexie` · webfetch of the op-sqlite installation docs and the Electric docs. Candidates examined: **31**.

## Candidates that matter

| Project | Repo | Licence | One-line reason |
|---|---|---|---|
| op-sqlite | `OP-Engineering/op-sqlite` | MIT | Our on-device DB: a JSI/Nitro native module over a compiled-from-source SQLite, with SQLCipher, FTS5 and runtime extension loading. |
| PowerSync | `powersync-ja/powersync-js` + `powersync-service` | Apache-2.0 (client) / **FSL-1.1-ALv2** (service) | The strongest off-the-shelf sync engine, and its RN client runs on op-sqlite - but the service licence is a founder decision. |
| Electric | `electric-sql/electric` | Apache-2.0 | A read-path sync engine for Postgres; writes still go through our own API. |
| loro | `loro-dev/loro` | MIT | The best CRDT for RN - a CRDT is the wrong merge model for our aggregates. |
| WatermelonDB | `Nozbe/WatermelonDB` | MIT | The reference for the pull/push sync-adapter shape; unmaintained as a dependency. |
| libsql / Turso | `tursodatabase/libsql` | MIT | A second datastore we do not need. |
| Dexie | `dexie/Dexie.js` | Apache-2.0 | Web-only IndexedDB cache, for the dashboard if it ever needs one. |
| TanStack Query | `TanStack/query` | MIT | Server state for the web dashboard only. |
| Realm JS | `realm/realm-js` | Apache-2.0 | Vendor-deprecated sync. |
| react-native-nitro-sqlite | `margelo/react-native-nitro-sqlite` | MIT | Surfaced by the nitro query; an alternative binding. |

## Deep review - top 5

1. **OP-Engineering/op-sqlite** - a JSI/Nitro native module over SQLite compiled from source on Android (the docs say every vendor "messes with sqlite or uses outdated versions"). Build-time toggles live in the **root** `package.json` under
   an `"op-sqlite"` key: `sqlcipher`, `performanceMode`, `iosSqlite`, `sqliteFlags`, `fts5`, `rtree`, `libsql`, `turso`, `sqliteVec`, `tokenizers`. **Our root `package.json` has no `"op-sqlite"` block today** - FINAL_PROMPT §0-F.3 requires
   `sqlcipher: true` and `fts5: true`, and that block is still missing. 8 maintainers/90 d, 12 releases/12 m; the last 20 commits are heavy native work, including **two memory-safety fixes inside a fortnight** (a use-after-free in a commit
   hook callback on 2026-09-18, and a libsql `executeBatch` that swallowed errors instead of rolling back on 2026-09-20). `performanceMode: true` is "almost always" recommended; `sqliteFlags: "-DSQLITE_TEMP_STORE=2"` is documented for
   **Android IO exceptions on large queries** - directly relevant to the 225,151-row LINZ FTS slice on a phone. **Verdict KEEP.**
2. **PowerSync** - a client-side SQLite database kept in sync over "sync buckets" and "sync streams", with a local write queue and server-side conflict resolution. The **React Native SDK runs on op-sqlite** and reuses our exact build
   toggles: SQLCipher via the package.json block plus an encryption key, FTS5 via `op-sqlite.fts5`, and its own core extension loaded at runtime - so **PowerSync and our LINZ FTS5 slice can live in the same database**, a genuine
   architectural win. Maintenance is healthy (15 maintainers/90 d on the client, 13 on the service, 12 releases/12 m each). The catch: the **service is FSL-1.1-ALv2** - use is granted for "any purpose other than a Competing Use", with
   automatic conversion to Apache-2.0 two years after each release. Running it internally is a permitted purpose, but it is not in our preferred licence list and it is a "no competing use" restriction on a component we would depend on for
   the sync gate. **Verdict WATCH, prototype only.**
3. **electric-sql/electric** - "Electric Sync is a **read-path** sync engine for Postgres"; clients pull subscribed slices of a table over HTTP and **writes go back through your own API**. For a courier app where the driver *writes* stops,
   events and POD on the phone, a read-path engine covers half the problem. Two 2026 signals matter: the commits of 2026-09-28 ("Remove mentions of Electric Cloud from the sync/quickstart page", "Note Electric Cloud shutdown") indicate
   **the hosted tier is being shut down**, and 2026-09-01's "promote adopted dependency consumers to transaction writes" shows the write/consistency model is still moving. **Verdict WATCH** - read-only live views of the dispatcher board,
   maybe, later.
4. **loro-dev/loro** - a Rust core exposed to JS/WASM with a rich-text and map CRDT; the last 20 commits (2026-10-09 to 2026-10-19) are dense correctness work (rollback of failed undo/redo, preserving MovableList undo identities, preventing
   quadratic cache clears). Why it is still wrong for us: a CRDT is the right tool when **two actors edit the same logical document concurrently**. Our model is an **event log per aggregate** with a documented conflict rule plus a
   tenant-scoped read model, and a CRDT merge would be silent - which makes "zero wrong-house auto-corrections" harder to reason about. **Verdict WATCH** - the reference if collaborative route editing is ever requested.
5. **Nozbe/WatermelonDB** - a reactive local database over SQLite with observables and a pluggable **sync adapter** whose protocol is a simple "pull/push changes since a timestamp" contract; the server side is yours to write. The adapter
   boundary is exactly the shape our `packages/sync` should have. Why we reject the library: the last commit on the default branch is **2025-08-11** - over 12 months with 272 open issues and 0 releases in 12 months. **Verdict REJECT as a
   dependency, KEEP the adapter shape.**

## Decisions

- **KEEP (no change)** op-sqlite 18.2.5 as the on-device database, with our own **event-log sync engine** (`packages/sync` -> Postgres) exactly as FINAL_PROMPT §0-F.3 and §10.3 specify. Reasons: the spec already commits to it; the D8
  address engine and the LINZ FTS5 slice must live in the same SQLCipher database; an event log with documented conflict rules is what the wrong-house risk demands; and every serious alternative either costs a licence (PowerSync service =
  FSL), lacks a write path (Electric), is web-only (Dexie), is vendor-deprecated (Realm), or is unmaintained (WatermelonDB, Replicache).
- **ADOPT** the op-sqlite **build toggles** in the root `package.json`: `"op-sqlite": { "sqlcipher": true, "fts5": true, "performanceMode": true, "sqliteFlags": "-DSQLITE_TEMP_STORE=2" }`. **Remove `expo-sqlite`** from `apps/mobile` (unused
  in code and a documented iOS compile clash with op-sqlite). Set `"expo.updates.useThirdPartySQLitePod": "true"` in `ios/Podfile.properties.json` (Expo CNG), or drop `expo-updates`, to break the duplicate-SQLite-symbol failure.
- **ADOPT** the WatermelonDB adapter shape - `sync({ pullChanges, pushChanges, resolvedChanges })` as the TypeScript interface of `packages/sync`, with a fake for tests - plus op-sqlite's `executeBatch` and error codes for atomic event
  writes and typed failures. **ADOPT** TanStack Query for the **web dashboard** only, and Dexie/wa-sqlite if the dashboard ever needs an IndexedDB cache.
- **WATCH (prototype, not adopt)** PowerSync (run it in the chaos test as candidate #2 to get a real comparison; the FSL service is a licence decision for the founder) · Electric (read-path only; hosted tier shutting down) · loro ·
  libsql/Turso · `expo-opsqlite-spatialite-demo` (if on-device radius queries over LINZ are ever needed).
- **REJECT** Realm JS (vendor-deprecated sync) · Replicache (archived) · WatermelonDB (unmaintained default branch) · Sharedb (OT needs a central ordering server) · Yjs/Automerge/Loro-as-a-database (CRDTs are the wrong merge model for our
  aggregates) · rqlite · libsql · InstantDB · PouchDB · `mrousavy/StorageBenchmark` (stale, but copy its method) · op-sqlite-next (not published) · `y-op-sqlite` (no licence) · `op-sqlite-drizzle-example` (no licence).
- **Monthly radar** op-sqlite releases + **default-branch** commits (a memory-safety fix is a same-week bump) · PowerSync releases and **any change to the FSL terms** (a licence change is a stop-the-line event) · Electric's hosted tier ·
  loro only if collaborative editing is requested.

## UNVERIFIED

1. **Every performance number** (sync delay, DB size, startup) is unmeasured - no harness exists. PowerSync's real conflict-resolution behaviour for our aggregate model was never exercised, because the service was never stood up.
   UNVERIFIED.
2. The FSL "Competing Use" boundary for our internal use is a **legal** question, not an engineering one - it needs the founder's explicit acceptance. Whether the FSL licence converts to Apache-2.0 on the schedule we would need (the text
   says two years per version; the mechanics for a modified deployment were not checked). UNVERIFIED.
3. op-sqlite's `executeBatch` rollback semantics under SQLCipher (the fix landed 2026-09-20) - not exercised by us. UNVERIFIED.
4. The **exact Android/iOS build-time impact** of adding `sqlcipher: true, fts5: true` to the root `package.json` - we have never built the app with those toggles. Whether `expo-updates` is actually in our dependency graph (it is not a
   direct dependency; it may come in via `expo` or `expo-dev-client`), so the duplicate-SQLite-symbol clash is *possible* but not confirmed. UNVERIFIED.
5. 6-month star trend, median issue response time and closed-issue ratios for every candidate. UNVERIFIED.
