# ADR-010 — The runs/stops API: the run lifecycle, the stop list, the proof-of-delivery upload and the partial reopt

- **Status:** accepted
- **Date:** 2026-10-24
- **Decides:** D36 (the backend API of queue item 2: stops, runs, POD upload, sync, JWKS auth, ASVS L2)
- **Builds on:** ADR-009 §6 (the engine surface this API serves), `packages/contracts/openapi.yaml`
  (the endpoints already in contract), `packages/contracts/db/schema.sql` (the storage)
- **Note for the lead:** the NEW endpoints' OpenAPI fragments live in §4; `packages/contracts/`
  is outside the backend squad's scope, so the fragments await the contracts owner's merge (a line
  about this is in `docs/log/CURRENT-backend.md`).

## Context

The API serves three endpoints today (`PUT /runs/{run_id}/template`, `GET /shifts/{shift_id}/route`,
`POST /shifts/{shift_id}/events:batch`) and stubs `listStops` (plus the two intake stubs, which are
queue item 3's surface). The contract already specifies createRun/listRuns/getRun and the location
notes; the phone needs a proof-of-delivery upload and the partial reopt (ADR-009 §6 named the reopt
surface for exactly this). Queue item 2 wires the run lifecycle, the stop list, the POD upload and
the reopt, behind the existing JWKS auth, with an OWASP ASVS L2 pass.

## Decision

### 1. The endpoints

| Endpoint (method + path) | Status | Contract |
|---|---|---|
| `POST /runs` | **new** | in `openapi.yaml` (createRun) — implemented with the narrowed request of §3 |
| `GET /runs` | **new** | in `openapi.yaml` (listRuns) |
| `GET /runs/{run_id}` | **new** | in `openapi.yaml` (getRun) |
| `GET /shifts/{shift_id}/stops` | **implemented for real** (was a stub) | in `openapi.yaml` (listStops) |
| `POST /runs/{run_id}/stops/{stop_id}/pod` | **new** | **not in contract** — §4 fragment |
| `POST /runs/{run_id}/route:reopt` | **new** | **not in contract** — §4 fragment |
| `GET/POST /locations/{location_id}/notes` | deferred | the door_memory mapping needs its own slice; recorded as NOT STARTED, not claimed |

### 2. The storage decisions

- `RouteStopRow` gains `status: str = "pending"` and `address: str | None = None` (both columns
  exist in the `stops` table). The `SqlAlchemyRepo` reads them from the table; the `InMemoryRepo`
  derives the status from the appended delivery events (the latest `delivered` / `skipped` /
  `deferred` / `failed` event kind wins, `pending` otherwise), so the tests exercise the same
  contract without a database.
- POD bytes are written to the configured POD directory (`POD_STORAGE_DIR`, default
  `services/api/pod-store/` in development), named by the **server** (`{event_id}.bin` — the
  client's filename is never used), with the row in `delivery_events` (`kind='pod_captured'`,
  reusing lat/lon/occurred_at/safe_place). No schema change is needed, and the idempotent offline
  replay rides the existing `append_events` ON-CONFLICT semantics.
- The reopt result is stored back through `put_run_route`, so the phone's next
  `GET /shifts/{shift_id}/route` serves the reopt'd day (the `_covers` check keeps the stored plan
  honest against the run's stops).

### 3. The implemented `createRun` narrows the contract request (recorded deviation)

The contract's `CreateRunRequest` carries `territory` (GeoJSON MultiPolygon) and a GeoJSON `depot`,
but the `runs` table has no territory column. The implemented request **forbids unknown fields**
(`extra="forbid"`) and takes:

- `name` (1–120 chars), `shift_id` (uuid; the runs table is 1:1 with shifts),
- `depot` as `{lat, lon}` (numbers), `start_at` (tz-aware), `capacity_parcels` (0–9999, optional),
  `speed_kmh` (1–120, default 30).

`territory` is refused with 422 until the schema gains a home for it — silently accepting and
dropping it would be a lie. The same rule keeps the run's finish point and break window out of the
creation request until the runs table gains columns for them (they shape the plan, so they must be
storable first; today they live only on the plan request of the route endpoint). The contract
fragment in §4 replaces `CreateRunRequest` and `RunResponse` accordingly (`driver_id` in the
contract becomes `courier_id`, which is what the storage and the authz checks actually key on).

### 4. The new contract fragments (for `packages/contracts/openapi.yaml`)

```yaml
  /runs/{run_id}/stops/{stop_id}/pod:
    post:
      tags: [stops]
      summary: Upload the proof-of-delivery photo for a stop
      operationId: uploadPod
      security: [{ bearerAuth: [] }]
      parameters:
        - name: run_id
          in: path
          required: true
          schema: { type: string, format: uuid }
        - name: stop_id
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required: [image, occurred_at]
              properties:
                image:
                  type: string
                  format: binary
                  description: JPEG/PNG/HEIC, at most 10 MiB
                occurred_at:
                  type: string
                  format: date-time
                safe_place:
                  type: string
      responses:
        '201':
          description: POD stored
          content:
            application/json:
              schema: { $ref: '#/components/schemas/PodResponse' }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '404': { $ref: '#/components/responses/NotFound' }
        '413': { description: The image exceeds 10 MiB }
        '415': { description: Not a JPEG/PNG/HEIC image (checked by magic bytes, not by name) }

  /runs/{run_id}/route:reopt:
    post:
      tags: [runs]
      summary: Re-place only the affected stops; the rest of the order stays
      operationId: reoptRoute
      security: [{ bearerAuth: [] }]
      parameters:
        - name: run_id
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [affected_stop_ids]
              properties:
                affected_stop_ids:
                  type: array
                  items: { type: string, format: uuid }
      responses:
        '200':
          description: The reopt'd day with the finish-time delta (may be negative)
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ReoptResponse' }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '404': { $ref: '#/components/responses/NotFound' }
        '422': { description: An affected stop is not part of this run }

    PodResponse:
      type: object
      required: [event_id, stop_id, sha256, bytes, stored_at]
      properties:
        event_id: { type: string, format: uuid }
        stop_id: { type: string, format: uuid }
        sha256: { type: string }
        bytes: { type: integer }
        stored_at: { type: string, format: date-time }

    ReoptResponse:
      type: object
      required: [run_id, engine, finish_delta_s, stops]
      properties:
        run_id: { type: string, format: uuid }
        engine: { type: string }
        finish_delta_s: { type: number }
        stops:
          type: array
          items: { $ref: '#/components/schemas/RouteStop' }
```

### 5. The ASVS L2 mapping (what the pass enforces, endpoint by endpoint)

| ASVS concern | The control in this API |
|---|---|
| V2 Authentication | every endpoint behind `get_current_principal` (JWKS verify; 401 before any lookup) |
| V4 Access control | per-object authz: run/stop rows resolve to `courier_id == principal.user_id`, else 404 (existence is never disclosed cross-courier) |
| V5 Validation | pydantic models on every body (`extra="forbid"` on run creation); POD: 10 MiB cap, content-type allowlist, magic-byte sniff — the client's name and declared type are never trusted |
| V6 Errors | one error shape (`{"detail": ...}` via `HTTPException`); no stack traces, no internal paths |
| V7 Logging | no PII, no tokens, no image bytes in logs; POD events log ids only |
| V8 Data protection | POD bytes at rest under server-side names; sha256 recorded for integrity |
| V13 API | input caps everywhere (name ≤ 120 chars, capacity 0–9999, speed 1–120, lists bounded ≤ 500) |
| V14 Config | the POD directory comes from settings, never from the request; the hardening middleware (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`) rides **every** response — including errors and unhandled 500s (the middleware catches the exception itself and answers a clean, header-carrying 500; asserted by tests) |

### 6. Consequences

- The phone can create a run, list its stops with live statuses, upload POD offline-replayably and
  reopt a changed day — the full loop of queue item 2.
- `GET /shifts/{shift_id}/stops` returns the contract's `StopResponse` shape plus the routing
  coordinates (lat/lon) and the time window, because the phone renders the day from this list and
  the route endpoint references the same stop ids.
- The reopt endpoint is per-run (the run owns the plan); the shift routes through
  `get_run_for_shift` as today.
- A plan that costs ~5 s of CPU (the 200-stop budget) runs in FastAPI's threadpool; concurrent
  plans saturate CPU — acceptable for a single-courier API, recorded as a capacity note, not hidden.

## Verification

- TDD per slice: the endpoint tests (`tests/test_runs_api.py`) written first — the authz matrix
  (401/404), the create→get→list round-trip, the status filter, the POD validation matrix (oversize
  413, wrong magic 415, wrong courier 404, replay idempotence), the reopt determinism + 422 + the
  delta sign.
- All gates re-run on the branch; the floor guard diff-scoped against main.

## Limitations (honest)

- The reopt is O(affected x slots x stops): 500 affected ids on a 200-stop day is minutes of
  threadpool CPU - an authenticated self-DoS bounded by the 500-id cap, recorded here rather than
  hidden. The reopt also does not re-apply a locked template: its stored plan wins the next route
  read (the template path is a later slice together with the told-break-position contract).
- A crashed retry of `POST /runs` (the response never reached the phone) meets 409 on the retry -
  the client contract is "409 means read your run back", not a silent second run.

- POD storage is a local directory, not object storage — the production wiring (S3/R2 + signed
  URLs) is a later slice; the repo/storage seam isolates it.
- No rate limiter yet (single-tenant courier API); the ASVS V9 volume story is recorded, not
  silently skipped.
- The location-notes endpoints are NOT STARTED this slice (the door_memory mapping) — listed so
  the gap stays visible.
