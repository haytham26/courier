# CURRENT — backend squad (read this first)

Updated: 2026-10-24 · Branch: `feat/backend-ops` (queue item 4, PR pending)
## Merged
- PR #19 (queue item 1, the routing solver — ADR-009/D35, `archive/feat/routing-solver`).
- PR #21 (queue item 2, the runs/stops API — ADR-010/D36, `archive/feat/backend-api`): runs CRUD,
  the live stop list, the POD upload (event-id ownership enforced per run after the review's POC),
  the partial reopt, the V14 hardening headers; 227 tests. The review's three must-fixes landed
  before the merge (`b4e902e`).
- Queue item 3 verified BUILT (`services/courier-voice`, 166 tests, the fake-gateway OmniRoute
  tests); the real gateway + keys are the FOUNDER_TODO row added this session.
## Done this session — queue item 4 (§18.4 reliability, on this branch)
- `docs/operations/RUNBOOK.md` §8–§13: the SLO table, the error-budget rule, the incident process,
  the on-call quiet hours, the alert payload contract, the load-test model, the DR drill procedure.
- `GET /healthz`: the probe's target, unauthenticated and data-free by construction (tested).
- `services/api/loadtests/locustfile.py`: the 1,000-driver day-loop model with the SLOs AS the run's
  thresholds; the `load` extra (locust 2.47.0).
- `services/api/ops/restore_drill.py`: the rehearsed restore — refuses a non-empty target, restores,
  runs the API round-trip, prints the verdict for the evidence file.
- Honest: the SLO RUN and the DR RUN have not executed (no DB daemon on this machine — the same
  environment finding as the VROOM leg); both scripts refuse honestly, and the DB-backed runs are
  the launch gates on staging/CI. Evidence: `docs/evidence/backend-ops/README.md`.
## For the lead (contract note)
- The OpenAPI fragments for the runs/stops/POD/reopt endpoints live in ADR-010 §4;
  `packages/contracts/openapi.yaml` needs the contracts owner to merge them.
- The n8n alert lanes (RUNBOOK §11) are the infra squad's; the API's duty (the healthz endpoint and
  the alert payload contract) is shipped.
## The queue is EMPTY
- Items 1–4 of the founder's backend brief are delivered or verified; the remaining gaps are
  recorded as FOUNDER_TODO (the OmniRoute gateway + keys) and launch gates (the DB-backed load run,
  the first DR drill, the location-notes endpoints, object storage for POD).
