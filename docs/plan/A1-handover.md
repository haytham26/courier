# A1's handover to the app side (the lead's half of the audit's first finding)

- **From:** the backend squad
- **To:** the lead squad (`apps/mobile`, `.maestro`, the Android E2E workflow)
- **Date:** 2026-10-27
- **Builds on:** `docs/plan/AUDIT_2026-10-25.md` A1, ADR-019 / D47 (PR #57, merged as `b0cfd6b`)

The audit's A1 says the app the founder would install today shows mock data: it does not speak to the
API. The backend's half is done — a demo-run seed endpoint that gives the app a real day to deliver
against, and a typed client generated from the contract the server is checked against. This note is
the handover: what the backend now provides, what the app side still owns, and what the done-when
looks like when it is done.

## 1. What the backend has shipped

### The demo-run seed — `POST /demo/runs`

A deterministic day, seeded for the authenticated caller and nobody else:

| Property                              | What it means                                                                                                                                                                                |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner-only**                        | The shift, the run and every stop belong to the caller's token. Nothing in the body can name another courier, and another courier's day answers 404 on every read.                           |
| **Deterministic ids**                 | uuid5 over the caller's own id and one reason, so the ids do not move between calls: run the flow, reset the local store, run it again, and the day is exactly where it was.                 |
| **One run per reason**                | `e2e`, `demo`, `dev` are the three reasons, so the CI job's day, the founder's demo phone and a developer's local run never overwrite each other.                                            |
| **Gated**                             | `DEMO_SEED_ENABLED` must be exactly `true`. Anything else (absent, `false`, `1`, `True`, `on`, a string with a stray space) answers 404 — the seed writes into the same tables as real data. |
| **Idempotent**                        | The same caller seeding twice gets the same day back, a 200 with the same ids.                                                                                                               |
| **Answered like any other run write** | A caller racing themself on one reason (a different run already on the shift, which the repo refuses) gets the API's **409**, not a 500.                                                     |

The request and the response, in the contract's own words:

```http
POST /demo/runs HTTP/1.1
Authorization: Bearer <the courier's JWT>
Content-Type: application/json

{ "reason": "e2e" }        # optional; "e2e" is the default

200 OK
{
  "run_id":   "8f2c…",
  "shift_id": "5feb…",
  "stops": [
    { "id": "ead6…", "address": "12 Riccarton Road, Riccarton",
      "lat": -43.532, "lon": 172.599, "priority": false, "parcels": 1 }
    … five stops, in the seeded order …
  ]
}
```

The five stops are real Canterbury addresses near the Hornby depot, and each carries the derived
`location_id` ADR-012 is about (the door/park/entry identity the notes endpoints take).

The two reads the app drives after seeding:

```http
GET /runs/{run_id}                       → 200 the run, 404 another courier's
GET /shifts/{shift_id}/stops             → the stops in the seeded order, with
                                           `seq`, `status: "pending"` and `location_id`
GET /shifts/{shift_id}/stops?status=…    → the same, filtered by the contract's vocabulary
```

### The typed client — `packages/shared/src/generated/api.ts`

One interface per schema, one typed signature per operation, generated from
`packages/contracts/openapi.yaml` (the file the drift guard pins the served surface against). The
generated file is committed, so the app consumes it with no codegen step at build time, and a CI step
(`scripts/ci/generate_api_client.py check`) fails on a stale file — the drift guard's third direction:
a change to the server, the contract or the client without the other two is red.

`@courier/shared` is **not yet a dependency of `apps/mobile`**. Making it one is the app side's work,
and it is the first line of the checklist below.

### The contract

`packages/contracts/openapi.yaml` carries `/demo/runs` (including the 409) and its three schemas
(`DemoSeedRequest`, `DemoRun`, `DemoStop`). The paths, the operationIds and the response shapes in
this note are that file, not a paraphrase.

## 2. What the app side owns (the audit's done-when)

The audit's A1 is done when a courier can work a shift with no mock anywhere. The app side:

1. **Sign in and attach the token.** `apps/mobile/src/lib/auth-client.ts` already talks to the auth
   service over `EXPO_PUBLIC_AUTH_URL`; the API calls need the same session's JWT on
   `Authorization: Bearer …`, from a configured API base URL (a sibling of `EXPO_PUBLIC_AUTH_URL`).
2. **Load the run.** After seeding (or on the app's first launch with the gate on), read
   `GET /runs/{run_id}` and `GET /shifts/{shift_id}/stops` through one run store — one fact, not
   three caches. `apps/mobile/app/(tabs)/index.tsx` still imports `mockStops` from
   `src/maps/stops.ts`; that import is the audit's own first piece of evidence, and it goes when the
   store answers.
3. **Deliver and go offline.** The outbox already exists (`src/sync/opSqliteEventStore.ts`, ADR-014's
   rules); the deliveries it stores must reach `POST /shifts/{shift_id}/events:batch`, whose
   deduplication and conflict rules the server proves in CI.
4. **Sync.** The batch endpoint's 200 answers the stored rowcounts (the API's contract); the app's
   local state converges on them.
5. **One E2E job with no mock.** `android-e2e.yml` (the lead's workflow) runs the emulator flows
   against the API and Postgres the CI job starts, with `DEMO_SEED_ENABLED=true` on the API's
   environment — so the flow delivers a real seeded day and syncs it. The audit's done-when is that
   job, not a unit test.

## 3. What the backend has already proven

| Claim                            | Where it is proven                                                                                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The seeded day is real data      | `services/api/tests/test_demo_seed.py`, the `db`-marked test: the shift, the run and the stops written through the production `SqlAlchemyRepo` and read back with the status a seeded stop starts at |
| The ids do not move              | the same file: a repeat seed returns byte-identical ids                                                                                                                                              |
| The gate refuses every near-miss | the parametrized test: `1`, `True`, `TRUE`, `yes`, `on`, `"true "`, `" true"` each answer 404, and the repo holds no run afterwards                                                                  |
| The day is the caller's alone    | 404 for another courier on `GET /runs/{run_id}`                                                                                                                                                      |
| The round trip the app drives    | the seeded day read back through both read endpoints, in the seeded order, with its derived location                                                                                                 |
| The client is fresh and typed    | `services/api/tests/test_api_client.py`, and the CI step that regenerates and diffs                                                                                                                  |

`docs/evidence/a1-contract-seed/` holds the command outputs, and `docs/decisions/adr/ADR-019…` the
decision itself.

## 4. What is deliberately not in this handover

- **The paywall, the entitlements, the billing flows** — those are D44's and wait until the audit's
  order says so (`docs/plan/AUDIT_2026-10-25.md` §"The order").
- **The demo seed in production.** The gate is exact-match and 404 by default; the staging deploy
  (A5) turns it on where the data is disposable, and production never does.
- **The `dev` reason's lock.** `e2e`, `demo` and `dev` are three days by design; if the app side
  wants fewer, it is a contract change (a new ADR), not a slice of this one.
