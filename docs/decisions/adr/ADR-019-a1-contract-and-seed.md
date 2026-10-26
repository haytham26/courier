# ADR-019 - A1's backend half: the demo-run seed, and the typed client generated from the contract

- **Status:** accepted
- **Date:** 2026-10-26
- **Decides:** `docs/plan/AUDIT_2026-10-25.md` A1, the backend's half
- **Builds on:** ADR-010 (the runs/stops API and its 404 discipline), the contracts package (the
  OpenAPI and the schema the drift guard pins), the sync rules of ADR-014, ADR-012 (the derived
  location every stop carries)

## Context

A1's evidence: the app the founder would install today shows mock data - there is no HTTP client for
the runs, the stops or `events:batch` anywhere in `apps/mobile`, and `@courier/shared` is not a
dependency of the app. The lead owns the app side (sign in, attach the JWT, load the run, the
outbox, one run store). **The backend's half is two things the app side cannot build without:**

1. **A demo-run seed.** The app's core flow needs a run with stops that exist in Postgres against
   which to deliver 3 stops, go offline, deliver 1 and sync. The audit's done-when is a CI E2E job
   that starts the API and Postgres and runs that flow with no mock - which needs a deterministic,
   repeatable day to deliver.
2. **The typed client.** The contract is already pinned by the drift guard (`tests/test_contract.py`:
   served is a subset of the contract, the non-planned contract is a subset of served, the
   operationIds are equal). The app should not hand-write fetch calls against that contract; it
   should consume types generated from the same file the guard checks.

## Decision

### 1. `POST /demo/runs` - a deterministic day, seeded for the caller

An endpoint that creates (once) a shift, a run and five stops for the authenticated courier, with
deterministic ids derived from the caller's own id and a fixed namespace, and returns them. Its
properties:

- **Owner-only.** The shift, the run and every stop belong to the caller's token; nothing about the
  body can name another courier (the 404 discipline of ADR-010, in the other direction).
- **Idempotent by construction.** The same caller seeding twice gets the same run back, and the stop
  ids do not move - the app's E2E can run the flow, reset the local store and run it again. The
  second call is a 200 with the same ids, not a duplicate day.
- **Bounded.** One run per caller per reason; the reason is a request field with a small vocabulary
  (`e2e`, `demo`, `dev`), so the E2E job, the founder's demo phone and a developer's local run do
  not overwrite each other's day.
- **Gated by the environment, not by hope.** `DEMO_SEED_ENABLED` must be exactly `true`; every other
  value - `false`, `1`, `True`, `on`, a string with a stray space - answers 404, because seeding
  demo rows into a real database is not something a truthiness-reading gate should ever let through.
- **Honest in the log.** The seeded ids are uuid5-derived, so they are recognisable as demo data in
  the database and in the evidence a job writes.
- **Answered like any other run write.** The seed writes a run, so a caller who races themself on
  the same reason (a different run already on the shift, which the repo refuses) gets the API's 409
  - the same answer `POST /runs` gives - not a 500 from an uncaught `ValueError`.

The write path is direct SQL for the shift and the stops (the API's surface has no stop writer: a
day is seeded once by the dispatcher, then read), and the repo's own `put_run` for the run, so the
409 rules and the idempotence are the same as for any other run. The in-memory repo keeps no shift
table, so its day is the run and the stops - which is every question the seed exists to answer.

### 2. The typed client is generated, and the generated file is checked in

`services/api/scripts/generate_api_client.py` reads `packages/contracts/openapi.yaml` and writes
`packages/shared/src/generated/api.ts` - one interface per schema, one typed signature per
operation, `paths` typed by method and path. The generated file **is committed** (the app consumes
it without a codegen step at build time, and CI can diff it), and the same script's `check` mode
regenerates beside the committed file and diffs: a contract change that leaves a stale client is a
red gate, the same way a contract change that leaves a stale server is. That makes the drift
guard's third direction - contract to client - real.

The check is fail-closed: it formats its regenerated copy with the repo's own prettier (resolving
its config from the file's directory, so the temp file sits beside the real one), and when prettier
cannot be found the comparison is between unformatted output and the formatted file, which fails.
A missing formatter makes the gate red, never silently green. On Linux the launcher is invoked
directly; on Windows the `.cmd` launcher is run through a shell string.

The app is not yet a consumer of `@courier/shared`; making it one is the lead's A1 app-side work.
The backend's obligation is that the generated types exist, are correct against the served surface
(the drift guard proves the surface), and are fresh (the new gate proves the types).

## Consequences

- The app side can load a real run, deliver against it and sync it, with no mock anywhere: A1's
  done-when becomes reachable the moment the lead's half lands.
- A demo seed in the production database is a deliberate, env-gated act with recognisable ids, not
  an accident of an unguarded endpoint.
- The contract now has three pinned directions: served and contract (the drift guard) and contract
  to client (the new gate). A change to any one of the three without the other two is red.

## Verification

- `services/api/tests/test_demo_seed.py`: the owner-only 404, the deterministic ids on a repeat
  seed, one day per reason, the five stops' shape against the contract's stop schema, the gate's
  404 for the off value and for every near-miss (`1`, `True`, `on`, `true ` with a stray space),
  the anonymous 401, the unknown reason's 422, the 409 when a different run already owns the shift,
  and the round trip: the seeded day read back through `GET /runs/{run_id}` and
  `GET /shifts/{shift_id}/stops`, in the seeded order, with its derived location - and invisible to
  another courier. One test is `db`-marked and proves the SQL path writes the real rows and reads
  them back with the status a seeded stop starts at.
- `services/api/tests/test_api_client.py`: the committed client is byte-identical to a freshly
  generated and formatted copy, every contract path and schema appears in it, and the gate itself
  is run against both a stale and a fresh file - so it fails the day the gate stops discriminating.
