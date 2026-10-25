# BACKEND_LOG — 2026-W43 (the backend squad's own log; the lead's W43/CURRENT are not touched)

## 2026-10-24 — Queue item 1 CLOSED, queue item 2 built (branch `feat/backend-api`)

### Queue item 1 — the real routing solver (PR #19, MERGED as `8995f3c`, tag `archive/feat/routing-solver`)

- The engine, the benchmark, ADR-009/D35, the evidence — see the PR and `docs/evidence/backend-solver/`.
- The merge of `origin/main` into the branch kept both sides of the W43 log conflict (the lead's
  dual-image/delivered entries and the solver entry), resolved chronologically.
- The independent fresh-context review returned **no blockers**; its three must-fix doc-contract
  items were applied (`224c69d`): the told break position now raises (RED-GREEN), the abandoned-
  encoding sentence in the test docstring rewritten, ADR-009 §6 completed (`partial-reopt` named,
  either-phase fallback), the creep probe committed with its real output (which CORRECTED the ADR's
  evidence sentence: direct builds flat, long in-process solves creep, production 250-iter flat).
- The five-pass record is posted on PR #19; Android E2E green on the tip (both legs, run
  40075990203; the first api-34 red was the known flake family, the rerun went green).

### Queue item 2 — the runs/stops API (this branch, ADR-010/D36)

| Slice | What | Tests (RED first) |
|---|---|---|
| 1 | `POST /runs`, `GET /runs`, `GET /runs/{id}`; owner from the token; foreign run 404; `extra="forbid"` | the authz matrix, the round-trip, the list scoping, the validation bounds (7 tests) |
| 2 | `GET /shifts/{shift_id}/stops` for real; `RouteStopRow` + status/address; in-memory derives status from events, SQL reads the table | the listing, the event flip, the status filter, the unknown filter 422, the foreign shift 404 (5 tests) |
| 3 | `POST /runs/{run_id}/stops/{stop_id}/pod`; `app/pod.py` (cap, sniff, server-side names); replay-idempotent | the round-trip (sha256/bytes/row/file), the replay, the foreign 404, the stray stop 404, the oversize 413 with nothing stored, the non-image 415 (6 tests) |
| 4 | `POST /runs/{run_id}/route:reopt`; the stored plan anchors the delta; the stored route refreshed | places-and-delta, kept order, determinism + zero reapplication delta, unknown 422, foreign 404, the phone serves the reopted day (6 tests) |
| 5 | the ASVS V14 hardening headers on every response (async middleware — the first sync draft failed its own suite in seconds) | headers on a success and on a 401 (2 tests) |

- Suite: **217 passed + 1 skipped**; ruff/mypy clean; the format scoped to the four files this
  branch authored (the pre-existing dirt on main stays untouched).
- Two fixture lessons recorded for the next slice: a second auth-fixture override kills the first
  client's tokens (one shared verifier fixture, identities by subject); and the reopt's determinism
  assert is about the DAY (same stops, same length, delta 0 on reapplication), not a naive
  whole-body equality.

### Queue item 3 — the Courier Voice brain through OmniRoute: VERIFIED BUILT, one founder item added

The queue said "the server brain through OmniRoute, a fake provider in the tests, real keys are a
FOUNDER_TODO item". The service already carries all of it (`services/courier-voice`, built
2026-10-22 per `docs/squads/voice/STATUS.md`): the `OmniRouteEngine` holds the D25 rules (the
allow-list travels with the call, an empty allow-list means unavailable — never "everything is
allowed", the cost guard, no transcript/address/name in any log line) and is tested against a
**fake gateway** (`httpx.MockTransport`) in 12 tests. This session's verification:

- the voice suite on this tree: **166 passed**;
- the wiring (`app/main.py` builds the `EngineRouter` with both engines and falls back without the
  courier noticing) read and confirmed;
- the one real gap: no FOUNDER_TODO row for the production gateway — added (self-host on Oracle
  Sydney per D25, `OMNIROUTE_BASE_URL`/`OMNIROUTE_API_KEY` in the server secret manager, the
  provider allow-list pick). The server brain stays dormant without it; the on-device engine
  answers everything, so nothing is broken while the row is OPEN.

### Skills applied (AGENTS.md map)

| Step | Skills read and followed | How they changed the work |
| --- | --- | --- |
| Designing the API | `api-and-interface-design` | Contract-first with the recorded deviations (the narrowed createRun; `territory` refused, not dropped); consistent 401/404 discipline; the error shape kept single. |
| Hardening | `security-and-hardening` | The STRIDE pass per endpoint became the ASVS L2 table in ADR-010; the POD upload treats the client's name/type as hostile (magic sniff, server-side name, cap-before-store); the abuse cases (oversize, replay, foreign ids) are the tests. |
| Building the slices | `test-driven-development`, `incremental-implementation` | Five RED→GREEN slices, each committed atomically; the suite ran between slices. |
| Planning | `planning-and-task-breakdown` | The recon (contract, schema, repo protocol, auth) preceded the code; the plan named the slices, the ADR named the decisions. |
| Verifying "already built" honestly (item 3) | `doubt-driven-development` | The claim "it exists" was tested, not trusted: the suite ran (166), the wiring was read, and the FOUNDER_TODO gap was found by looking for the deliverable the queue actually names (real keys). |

### Queue item 4 — section 18.4 reliability: the SLOs, the load test, the restore drill (branch `feat/backend-ops`)

- The RUNBOOK gains sections 8-13: the SLO table (availability 99.9 %, route p95 at 5 s, sync p95
  at 300 ms, POD p95 at 2 s, voice at 700 ms — every number anchored to an existing budget or the
  load test), the error-budget rule, the six-step incident process, the on-call quiet hours, the
  alert payload contract, the load-test model and the DR drill procedure.
- `GET /healthz`: the probe's target — unauthenticated and data-free by construction, with a test
  that asserts the whole body shape.
- `services/api/loadtests/locustfile.py` + the `load` extra (locust 2.47.0): the 1,000-driver
  day-loop model with the SLOs encoded AS the run's thresholds (a breach fails the run).
- `services/api/ops/restore_drill.py`: the rehearsed restore — refuses a non-empty target, restores
  with ON_ERROR_STOP, runs the API round-trip, prints the verdict for the evidence file.
- Honest: the SLO RUN and the DR RUN have not executed on this machine (no DB daemon — the same
  environment finding as the VROOM leg). Both scripts refuse honestly, the evidence README
  (`docs/evidence/backend-ops/`) says so, and the DB-backed runs are the launch gates on
  staging/CI. The queue is otherwise EMPTY: items 1-4 delivered or verified.

### Skills applied (AGENTS.md map) — item 4

| Step | Skills read and followed | How they changed the work |
| --- | --- | --- |
| The SLOs and the budget | `constraint-driven-development` | The thresholds in the load test ARE the written numbers (the 5 s budget, the 700 ms voice budget) — the same values, never a relaxed copy; a breach fails the run. |
| The ops tools | `observability-and-instrumentation` | The healthz endpoint is data-free by construction (asserted), the drill prints verdicts + timings shaped for the evidence file, and the alert payload contract keeps PII out. |
| Honest not-run | `doubt-driven-development` | The scripts REFUSE honestly when their venue is missing (no DB, non-empty target) instead of simulating success; the evidence README records what has and has not run. |

### Not verified / honest gaps

- The location-notes endpoints: NOT STARTED (the door_memory mapping needs its own slice).
- POD storage is a local directory; object storage is a later slice (the seam isolates it).
- No rate limiter (recorded in ADR-010 §Limitations, not silently skipped).

## 2026-10-25 — Queue 2, item 1: the quality audit (branch `chore/audit-backend`)

- **The founder findings fixed**: (a) the generated coverage summaries untracked (.gitignore
  already listed them - the entries never took effect on tracked files); (b) the contract whole
  again (it never had the route endpoint the app reads daily, the auth routes or /healthz; the
  /locations path was a duplicate YAML key) + the drift guard (`tests/test_contract.py' + chr(96) +
  ': served subset-of contract, non-planned contract subset-of served, operationIds equal -
  reconciled to the API route names).
- **The deep audit (services/)**: 8 must-fixes, all applied - the sync batch bound + the event
  stop-id ownership, the voice-WS ownership (4404 on a foreign shift) + malformed-frame honesty +
  the transcript bound, the LLM failure paths (fallback_intent; the OmniRoute malformed-JSON
  fallback), the middleware exception logging, the POD replay-on-another-stop 409, the timezone
  honesty, the auth email-verification option (tested, env-gated), litellm + alembic dropped.
- **The repo-wide sweep (read-only, item 1c)**: findings filed as BUG-053..BUG-057 (lead-owned) +
  BUG-058/059 (the auth items + the backend backlog). The short list for the lead is in
  CURRENT-backend.md.
- Verified by running: both suites green (api 236+1, voice 166), pip-audit clean on both runtime
  trees, the licence sweep (one psycopg LGPL note for the lead ledger), ruff/mypy clean.

### Skills applied (AGENTS.md map) - item 1

| Step | Skills read and followed | How they changed the work |
| --- | --- | --- |
| The audit | `code-review-and-quality`, `security-and-hardening` | Two fresh-context auditors (services/ deep, repo-wide read-only) ran BEFORE any new feature, per the founder order; the route-by-route authz walk and the STRIDE pass produced the findings. |
| The fixes | `test-driven-development` | The stop-ownership and the WS-frame fixes carry tests that reproduce the abuse (the invented stop, the foreign shift, the malformed frame); the drift guard carries a not-vacuous test. |
| The findings ledger | `constraint-driven-development`, `documentation-and-adrs` | Nothing parked in memory: BUG-053..059 carry file, evidence and owner; the lead list is in CURRENT-backend.md. |

## 2026-10-25 - Queue 2, item 2: the database in CI (branch `feat/db-in-ci`, merged PR #27)

- The PostGIS 17.2 service container on the quality job (plain Postgres failed: the contract
  schema needs PostGIS), the DB-backed \SqlAlchemyRepo\ suite (10 tests, the \db\ marker;
  `addopts = -m 'not db'` deselects by default - a selection, never a skip), the restore drill
  (seed -> dump inside the container -> restore into a clean DB -> the API round-trip) and the
  short Locust SLO profile (minted throwaway ES256 identity, 50 users / 60 s, thresholds as the
  failure criteria).
- CI taught the truth three times: the lying-409 conflation (the constraint suffix now decides),
  the runner's pg_dump 16 cannot read the server 17.5 (the dump runs inside the container), and
  the vacuous green (the review's must-fix: a 2-request run printed 'SLOs met'; the floor is 100
  and the first seeded run landed 180 requests, 0 failures).
- Verified by CI (run 40127627265): DB suite 10 passed, drill \VERDICT: PASS | restore 0.4s\,
  \SLOs met\. The E2E record: both legs green on a4e947a; later single-leg reds carried the
  environment signature (BUG-060) with byte-identical app content.

### Skills applied - item 2

| Step | Skills read and followed | How they changed the work |
| --- | --- | --- |
| The CI wiring | \ci-cd-and-automation\ | Service-container pinning, health gates, no secret beyond the container-local throwaway, evidence logged. |
| The DB suite | \	est-driven-development\, \source-driven-development\ | The executemany-rowcount and IntegrityError behaviours were verified against psycopg3/SQLAlchemy docs, then pinned by DB tests that only CI can run. |
| The review | \code-review-and-quality\, \doubt-driven-development\ | The fresh-context reviewer found the vacuous green (a gate that greets nothing); its guard then caught the unseeded run in the very next CI pass. |

## 2026-10-25 - Queue 2, item 3: POD object storage (branch `feat/pod-storage`)

- ADR-011: one \PodStore\ interface, \LocalPodStore\ (default) + \S3PodStore\ (boto3, any
  S3-compatible store; MinIO banned - AGPL-3.0; moto in tests - Apache-2.0).
- The contract gained the presign URL (owner-only; foreign run/stop/event 404) and the local
  streaming grant (HMAC over run+event+expiry, constant-time, 15 min). The upload writes through
  the store, so the backend choice moves the bytes and the URL together.
- Retention is a store primitive (\delete_run\), the seam the run/account deletion slices call.

### Skills applied - item 3

| Step | Skills read and followed | How it changed the work |
| --- | --- | --- |
| The design | `api-and-interface-design`, \documentation-and-adrs\ | The ADR first (the founder's rule), then the interface; two implementations behind one protocol. |
| The storage | \security-and-hardening\, \source-driven-development\ | Signed URLs (short TTL), server-side key names, constant-time HMAC compare, magic-byte sniff kept ahead of storage; boto3 presign semantics checked against the docs. |
| The tests | \	est-driven-development\ | The authz matrix (foreign run/stop/event), the tampered and expired grants, the moto-backed S3 lifecycle; the suite caught the duplicated settings class immediately. |
