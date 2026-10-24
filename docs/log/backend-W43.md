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

### Skills applied (AGENTS.md map)

| Step | Skills read and followed | How they changed the work |
| --- | --- | --- |
| Designing the API | `api-and-interface-design` | Contract-first with the recorded deviations (the narrowed createRun; `territory` refused, not dropped); consistent 401/404 discipline; the error shape kept single. |
| Hardening | `security-and-hardening` | The STRIDE pass per endpoint became the ASVS L2 table in ADR-010; the POD upload treats the client's name/type as hostile (magic sniff, server-side name, cap-before-store); the abuse cases (oversize, replay, foreign ids) are the tests. |
| Building the slices | `test-driven-development`, `incremental-implementation` | Five RED→GREEN slices, each committed atomically; the suite ran between slices. |
| Planning | `planning-and-task-breakdown` | The recon (contract, schema, repo protocol, auth) preceded the code; the plan named the slices, the ADR named the decisions. |

### Not verified / honest gaps

- The location-notes endpoints: NOT STARTED (the door_memory mapping needs its own slice).
- POD storage is a local directory; object storage is a later slice (the seam isolates it).
- No rate limiter (recorded in ADR-010 §Limitations, not silently skipped).
