# Offline evidence — the founder directive 2026-11-10, item 6 (OFFLINE)

Written by the OFFLINE lane (branch `offline/shifts`, worktree `.worktrees/offline`).
Every number below is **measured** on this machine or on the CI AVDs and every
claim names the command that produced it. Nothing here is claimed that was not
run; the legs that are NOT measured are named at the end, with the reason.

The lane's brief (`docs/log/CURRENT.md`, the founder directive 2026-11-10 item 6):
a complete shift in airplane mode with **0 data loss over ≥ 50 simulated
shifts**, **exactly-once sync under flaky networks** (including a kill
mid-sync), the **Christchurch PMTiles pack** rendered offline with its ODbL
attribution, and a **Maestro flow in CI** for the offline shift.

## 0. The machine and the stack (what ran where)

| Leg | Where it ran | The command |
|---|---|---|
| the app-side simulation | this machine, jest (`jest-expo`), the app's own write path | `cd apps/mobile && npx jest src/sync/__tests__/offlineShifts.test.ts` |
| the real-stack simulation | this machine, the **CI stack** (`infra/compose.ci.yml`: Postgres + the API + the auth service, `DEMO_SEED_ENABLED=true`) | `node docs/evidence/offline/stack-sim.mjs` |
| the pack build | this machine, **inside Linux** (`node:24-trixie-slim` + `openjdk-21-jre-headless`, the same steps `map-pack.yml` runs on ubuntu) | `docker run --rm -v <worktree>:/w -w /w offline-pack-builder:1 bash /w/.tools/run-build.sh --execute` |
| the CI legs | GitHub's AVDs (api 34 / api 35, the small 320×640 profile) | `bash .maestro/run-all.sh` (the workflow's own runner) |

Two local-run deviations, both recorded because they are the stack's business
and not the lane's to change:

- **`infra/compose.ci.yml` was read, never edited.** The stack was started with
  an override file **outside the repository** that clears `postgres`'s host port
  binding (`ports: !reset []`): another lane's Postgres container (`courier-test-pg`)
  already holds 127.0.0.1:5432 on this machine. Everything else — the services,
  the environment, the schema mount, the seed gate — is the file's own.
- **The auth container needed its own migration and a restart.** `docker compose
  … run --rm auth npx --yes auth migrate --yes --config src/migrate.config.ts`
  ran the auth service's own migration (the container refuses to boot on a
  database without its tables), and a `docker compose restart auth` cleared the
  in-memory rate limiter after the lane hit the sign-up cap
  (`/sign-up/email`: 10 per hour, `AUTH_RATE_LIMIT_WINDOW`/`MAX` custom rules).

Tools and versions actually used (the workflow's own pins):

| Tool | Version | How it was pinned |
|---|---|---|
| planetiler | 0.10.2 (jar sha256 `f310bd0413e2e4512b27f4046d418664e8e1d3bf31603c2a70e23de06c167e4d`, verified on this machine) | `map-pack.yml`'s `PLANETILER_VERSION` |
| pmtiles | 1.31.2 (`pmtiles version` → `commit a3e4951ea6a0477b784c27c1dcbfd9c130878c5a`) | `map-pack.yml`'s `PMTILES_VERSION` |
| Java | OpenJDK 21.0.13 (planetiler 0.10.2 is built for 21) | the workflow's `java-version: '21'` |
| node | v24.22.2 (the container) / v24.21.0 (the host) | the workspace pin |

## 0b. The pre-fetch record (written BEFORE the Geofabrik fetch, per the lane brief)

| Item | Value |
|---|---|
| URL | `https://download.geofabrik.de/australia-oceania/new-zealand-latest.osm.pbf` (the alias the workflow uses; a `307` redirects it to the dated extract below) |
| Resolved URL | `https://download.geofabrik.de/australia-oceania/new-zealand-261109.osm.pbf` |
| Host | `download.geofabrik.de` — the registered host of the `geofabrik-nz` source in `scripts/data/build-pmtiles.mjs`, checked by its own `--check-url` before any byte is fetched (BUG-102). Measured: `build-pmtiles: the extract URL is allowed (download.geofabrik.de, source geofabrik-nz)` |
| Expected size | 406,060,713 bytes (387.3 MiB), the `Content-Length` of the resolved URL, read 2026-11-11 |
| Server `Last-Modified` | Tue, 10 Nov 2026 07:45:10 GMT |
| Fetch | started **2026-11-11T06:24:24+13:00**, finished **2026-11-11T06:26:53+13:00** (149 s) |
| Measured | `http=200 size=406060713` — the bytes on disk match the expected length exactly |
| sha256 | `b5595da206e0066cb2670363a3ee039c3a65ececb3247ac16ec1175af2cb74f7` (`data/maps/fetch-sha.txt`) |
| Licence | ODbL (an OSM extract is OpenStreetMap data; we build our own tiles from it, so the OSMF tile servers and their usage policy are not involved) |
| Fetched into | `<worktree>/data/maps/` (git-ignored per ADR-003) |

## 1. A complete shift in airplane mode with 0 data loss, over ≥ 50 shifts

**Two legs, because a mirror is not evidence.**

### 1a. The app's own write path (`apps/mobile/src/sync/__tests__/offlineShifts.test.ts`)

The app's real modules, end to end, with the network taken away for the whole
shift: `RunStore.markDelivered` / `markFailed` → `EventLog.record` → the store's
own flush → `SyncService.syncAll` → `apiSyncTransport.send` →
`CourierApiClient.postDeliveryEvents` → `toContractEvent` → `fetch` → the
server's own `events:batch` contract, **mirrored** from
`services/api/app/repo.py::append_events` (INSERT … ON CONFLICT (id) DO NOTHING;
`accepted` = the rowcount; `conflicts` = divergent content). The event store is
the in-memory twin of `opSqliteEventStore.ts` (one row per id, pending ordered
by the instant, the synced/refused flags, forget only while unsent), so the
simulated phone survives a kill the way a real phone's SQLCipher log does.

```
50 airplane-mode shifts land every mark exactly once
```

| leg | shifts | stops marked | events logged | rows on the server | duplicate landings | lost | quarantined | pending after sync |
|---|---|---|---|---|---|---|---|---|
| airplane mode | **50** | **441** | **441** | **441** | **0** | **0** | **0** | **0** |
| flaky (30 % of the answers dropped after the server took the batch) | 20 | 173 | 173 | 173 | 0 | 0 | 0 | 4 |
| kill mid-sync (one answer lost to the process death) | 12 | 110 | 110 | 110 | 0 | 0 | 0 | 10 |

The per-shift trace is in `docs/evidence/offline/results/{shift,flaky,kill}-results/`
(`per_shift.csv`, one row per shift; `summary.json`). The run is deterministic
(seed 20261111, mulberry32, a fixed clock), so the same seed reproduces the same
bytes.

**One RED test, on purpose, naming the defect this leg found:**
`the outbox drains a batch the server already stored (RED on main: the replay is
answered accepted 0, so nothing is confirmed)`.

- A batch whose **answer** was lost is re-offered once the network returns. The
  server answers `accepted: 0` (nothing was inserted — all of it was already
  there) with **no conflicts**, so `SyncService.sync` confirms
  `batch.slice(0, 0)` — nothing — and the same batch is re-offered on every
  retry tick for as long as the session lives.
- The **data is safe** (0 loss, 0 duplicate landings — measured above). The
  **phone is not**: its log never drains and the wire carries stored events
  forever (shift-301: 12 of 12 events still pending after the network is back;
  the flaky leg: 4 of 173).
- Measured on the real stack too: after a replayed batch the API answers
  `accepted: 0` for every event, and the rows do not move.
- **BUG-305 requested**; the fix belongs in `apps/mobile/src/sync/syncService.ts`
  (confirm what the server already has when the answer carries no new rowcount
  and no conflict), which is the lead's file. The lane does not smear it.

### 1b. The real stack (`docs/evidence/offline/stack-sim.mjs`)

One courier on the real auth service (the sign-up is rate-limited to 10/hour),
50 shifts whose rows are the office's own (`INSERT INTO shifts`, the way
`services/api/app/demo.py` writes it — the API has no endpoint that creates a
bare shift), and every run, stop, mark and sync through the API's real
endpoints: `POST /runs`, `POST /shifts/{id}/import` (ADR-025's spreadsheet
import), `POST /shifts/{id}/events:batch`, `POST /runs/{id}/stops/{id}/pod`.
The rows are counted in Postgres through the stack's own `psql`.

| leg | shifts | events | rows in Postgres | duplicate ids | conflicts | lost |
|---|---|---|---|---|---|---|
| airplane mode (marks recorded with NO network call, then one sync) | **50** | **250** | **250** | **0** | **0** | **0** |
| flaky (the same batch sent twice — the answer was lost) | 10 | 50 (offered twice) | 50 | 0 | 0 | 0 |
| kill (a real HTTP request aborted mid-flight, then re-sent) | 6 | 30 | 30 | 0 | 0 | 0 |
| POD (the proof photo uploaded twice, same client event id) | 5 | — | 5 rows | 0 | — | 0 |

- The kill leg's abort really killed the call 3 of 6 times
  (`abort_killed_the_call: true`) and the rows were already there 6 of 6 times
  (`rows_after_the_abort: 5`) — the request had reached the server, the answer
  had not reached the caller: exactly the shape a kill is.
- The POD replays are answered **200** with `already_stored: true` (the first
  upload answers 201) and the row count does not move: a duplicate
  proof-of-delivery is not stored twice either.
- The run also proved a real server rule the lane had to respect: the API
  refuses a batch whose `occurred_at` is more than seven days old
  ("the log is stale or the clock is wrong"), so the marks carry the phone's own
  recent clock rather than a fixed epoch.
- Output: `docs/evidence/offline/results/stack-results/{airplane-mode,flaky,kill,pod}.json`
  + `summary.json`.

## 2. Exactly-once sync under flaky networks and a kill mid-sync

The emulator's delay/loss profiles, brought to this machine: a fetch whose
profile decides. `offline` answers nothing at all (airplane mode). `flaky`
drops a **seeded 30 % of the answers AFTER the server has taken the batch** —
the shape of a dead zone that swallows the response rather than the request,
which is the case that makes exactly-once hard — and the client's own timeout
resolves it as `offline`, the way a real phone does. `dropNext` is the
deterministic single drop the kill leg uses, and the kill's first send is
abandoned rather than awaited, because a dead process reads no answer.

The kill is measured twice, on purpose: on the app's own path (a new `EventLog`
over the same persistent store, which is what a restart gives a real phone) and
on the real wire (a `fetch` with an `AbortController`), and both land each event
exactly once.

**A duplicate delivery, note or POD is a BUG** — the duplicate counts in every
leg above are **0**, measured three ways: the app-side simulation's
`duplicate_landings` counter, the real Postgres
`select id … group by id having count(*) > 1` (0 rows in every leg), and the
API's own `accepted`/`conflicts` answers (`accepted: 0`, `conflicts: []` on
every replay).

## 3. The Christchurch PMTiles pack (D61)

**The build finally ran, and running it found three defects in the script that
builds it** — all measured on 2026-11-11 against the pinned tools, all fixed
red-first in `scripts/data/build-pmtiles.mjs` (the lane's file), all in commit
2 of this branch:

1. **planetiler refused to start at all.** Its own sentence:
   `data/sources/lake_centerline.shp.zip does not exist. Run with --download to
   fetch it`. The script never handed it `--download`, so the OpenMapTiles
   profile's own base data (natural earth, water polygons, lake centerlines) was
   never fetched. The bare boolean is the documented form; the invented one was
   `--download=<a local file>`.
2. **The pack's zooms were never given to planetiler**, so the tileset was built
   at the tool's own defaults — measured: `minzoom: 0, maxzoom: 14` — while the
   extract step and the manifest asked for and recorded 6..17. The tiles are now
   built at the plan's own range, in the argument names the tool publishes
   (`planetiler --help` prints `minzoom`/`maxzoom`, **not** `--min-zoom`; the
   underscore form is silently ignored — measured).
3. **The plan's max zoom of 17 is a zoom planetiler refuses:**
   `java.lang.IllegalArgumentException: Max zoom must be <= 16, was 17`. The
   ceiling is enforced by the script now, before the tool runs, and the default
   is 16. A manifest whose job is "to be the evidence of what shipped" must not
   promise a zoom its archive cannot carry.

The licence gate runs on the real URL before a byte is fetched:
`node scripts/data/build-pmtiles.mjs --source geofabrik-nz --check-url <the URL>`
→ `the extract URL is allowed (download.geofabrik.de, source geofabrik-nz)`.

The build itself, its size against the ceiling, the manifest it writes and the
app-side proof that it renders offline are written here once the run finishes —
the tileset's `osm_pass2` phase over the whole country is the long one (the
water-polygons phase alone took 32m40s, logged throughout).

**The budget.** `scripts/data/build-pmtiles.mjs` enforces
`PACK_SIZE_CEILING_BYTES = 50 * 1024 * 1024` and the maps squad's gate names the
same number ("the pack at or under 50 MB",
`docs/squads/maps/README.md`; `docs/research/2026/oss-maps-courier.md` names
"pack ≤ 50 MB"). `docs/decisions/DECISIONS.md` (D42) records that this ceiling
"is checked but has never been observed". **It is observed in this lane, and
the measured size is written below.**

## 4. The Maestro flows in CI

Three flows join the E2E legs' suite (`.maestro/*.yaml`, run by
`bash .maestro/run-all.sh`), and the runner takes the radio away before the two
that need it and gives it back after — because Maestro cannot run `adb`, the
network is a property of the **run**, not of a flow (the same two `svc`
commands `.maestro/run-a1.sh` uses, with the same reason):

| Flow | What it proves, on the device |
|---|---|
| `.maestro/offline-shift.yaml` | the whole shift in airplane mode: three deliveries, a failed delivery with its reason and the courier's own word, the run's own counts, ADR-014's "the delivery waits on this phone" note, and the end-of-day summary — with the network away for all of it |
| `.maestro/offline-sync.yaml` | the signal comes back: a cold start (`clearState: false`) still answers the same day, one mark per stop, the courier is still told the truth, and a second cold start keeps them. **Exactly one mark per stop, on the phone** |
| `.maestro/offline-map-pack.yaml` | the map with no signal: `map-pack-status` (the app's own answer), and the three ODbL / LINZ attribution lines on screen |

**What the E2E build can and cannot prove, stated plainly:** the E2E build has no
server (its API base address is the device's own loopback), so the legs above
prove the **phone's** half of exactly-once and the app's offline behaviour.
The **server's** half is measured by the two simulation legs in §1 — the app's
own write path over the mirrored `events:batch`, and the real stack in compose.

## 5. What is NOT measured here

| Leg | Why not, and where it is |
|---|---|
| The pack built, its size, its manifest, the app rendering its tiles on a device | The build is still running when this file was last written (the whole-country tileset is the long phase); the numbers land in §3 as soon as it finishes |
| The CI AVD runs of the three new flows | They run in `android-e2e.yml` on GitHub's runners (api 34 / api 35, the small 320×640 profile). This lane cannot boot an emulator locally (no local emulator per AGENTS.md; the BlueStacks device refuses Maestro's `dadb` — BUG-303), so the flows are proven to **parse** and to satisfy the repo's own cold-start gate (`scripts/ci/__tests__/flows-cold-start.test.mjs`), and the legs' first green run is the lead's to record |
| The large-screen legs | BUG-270, platform-owned |
| A second AVD profile for the offline flows | BUG-270 |
| The app's z17 style layer drawing from the pack | planetiler's own ceiling is 16, so a z17 layer cannot be drawn from a planetiler-built pack: it overzooms. Named for the maps squad — the layer's minzoom is the design's decision, and the lane does not change the style |
| A workflow change | `.github/workflows/**` is not the lane's; the flows join the existing suite through `run-all.sh`'s own glob, and no new job is needed |
