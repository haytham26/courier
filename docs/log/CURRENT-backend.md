# CURRENT — backend squad (read this first)

Updated: 2026-10-24 · Branch: `feat/backend-api` (queue item 2, PR pending) · item 1 MERGED as PR #19 (archive/feat/routing-solver)
## Done — queue item 1 (the real routing solver) — MERGED
- `PyVRPEngine` (ADR-009, D35): 174-stop break-day 4.7 s / 0 violations vs the heuristic's 50 s / 17;
  200-stop budget 3.2 s ≤ 5 s. Reviewer-verified (no blockers); the five-pass record is on PR #19.
- The told break position now RAISES outside the day (RED-GREEN test); ADR-009 §6 lists all five
  engine names; `creep_probe.py` committed with its real output.
## Done this session — queue item 2 (the runs/stops API, ADR-010, D36)
- Slices 1-5, TDD each: `POST/GET /runs`, `GET /runs/{id}` (owner-from-token; foreign run 404);
  `GET /shifts/{id}/stops` for real (status derived from delivery events in-memory, read from the
  table in SQL); `POST /runs/{run_id}/stops/{stop_id}/pod` (10 MiB cap, magic-byte sniff, server-named
  file, replay-idempotent); `POST /runs/{run_id}/route:reopt` (stored plan anchors the delta; stored
  route refreshed); the V14 hardening headers on every response incl. errors.
- Suite: 217 passed + 1 skipped; ruff/mypy clean.
## For the lead (contract note)
- The NEW endpoints' OpenAPI fragments (pod upload, route:reopt, the narrowed createRun/run response —
  `territory` refused 422 until the schema gains a column; finish/break deferred likewise) live in
  ADR-010 §4. `packages/contracts/openapi.yaml` needs the contracts owner to merge them; until then
  the implementation is the contract of record for these endpoints.
- Honest gaps (ADR-010 §Limitations): POD storage is a local dir (not object storage); no rate
  limiter; the location-notes endpoints (door_memory mapping) are NOT STARTED; the two intake stubs
  stay for queue item 3.
## Next (queue items 3-4)
3. Courier Voice server brain through OmniRoute — a fake provider in the tests; real keys FOUNDER_TODO.
4. §18.4 SLOs, the load test and the restore drill.
