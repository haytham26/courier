# CURRENT — backend squad (read this first)

Updated: 2026-10-25 · main at `c50a083` · **The founder's backend queue (items 1–4) is COMPLETE.**

## Merged (all with merge commits + archive tags, branches deleted)

- **Item 1** — the routing solver: PR #19, ADR-009/D35 (`archive/feat/routing-solver`). PyVRP 0.14.1
  behind the seam; 174-stop break-day 4.7 s / 0 violations; 200-stop budget 3.2 s ≤ 5 s.
- **Item 2** — the runs/stops API: PR #21, ADR-010/D36 (`archive/feat/backend-api`). Runs CRUD, the
  live stop list, the POD upload (event-id ownership per run after the review's POC), the partial
  reopt, the V14 hardening headers; the review's three must-fixes landed pre-merge.
- **Item 3** — the Courier Voice brain through OmniRoute: verified BUILT (166 tests, the fake-gateway
  tests); the real gateway + keys are the FOUNDER_TODO row (`docs/status/FOUNDER_TODO.md`).
- **Item 4** — §18.4 reliability: PR #23 (`archive/feat/backend-ops`). The RUNBOOK §8–§13 (SLOs,
  error budget, incident process, on-call quiet hours, the alert payload contract), `GET /healthz`
  (data-free), the 1,000-driver Locust model with the SLOs as thresholds, the restore drill script.

## Honest gaps (recorded, not hidden)

- The SLO load run + the first DR drill have NOT executed (no DB daemon on the dev machine) — both
  scripts refuse honestly; they are the launch gates on staging/CI (`docs/evidence/backend-ops/`).
- The location-notes endpoints (door_memory mapping) are NOT STARTED; POD object storage and the
  rate limiter are later slices (ADR-010 §Limitations).
- The two intake stubs remain for the next voice slice.

## For the lead (contract note)

- The OpenAPI fragments for the runs/stops/POD/reopt endpoints live in ADR-010 §4;
  `packages/contracts/openapi.yaml` needs the contracts owner to merge them. The n8n alert lanes
  (RUNBOOK §11) are the infra squad's; the API's duty (healthz + the payload contract) is shipped.
