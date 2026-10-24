# Backend ops evidence (§18.4: the SLOs, the load test, the restore drill)

Date: 2026-10-24 · Branch: `feat/backend-ops` · `docs/operations/RUNBOOK.md` §8–§13

## What landed

| Deliverable | What it is |
|---|---|
| `docs/operations/RUNBOOK.md` §8–§13 | the SLO table (availability 99.9 %, route p95 ≤ 5 s, sync p95 ≤ 300 ms, POD p95 ≤ 2 s, voice ≤ 700 ms), the error-budget rule, the incident process, the on-call quiet-hours policy, the alert payload contract, the load-test model, the DR drill procedure |
| `GET /healthz` | the uptime probe's target: unauthenticated, **data-free by construction** (status, version, engine names — nothing else), asserted by a test |
| `services/api/loadtests/locustfile.py` | the 1,000-driver day-loop model (create once, route every few minutes, stops list, 2–8-event sync batches every minute, POD uploads) with the SLOs **encoded as the run's thresholds** — a breach fails the run, never a lowered number; the `load` extra carries locust 2.47.0 |
| `services/api/ops/restore_drill.py` | the rehearsed restore: refuses a non-empty target (a drill never aims at a live system), restores the dump with `ON_ERROR_STOP`, runs the API round-trip (write → sync → read back → plan) and prints the verdict + timings for this directory |

## What has NOT run yet (honest)

- **The SLO load run**: the dev machine has no database daemon, so the measured run is the
  application layer only. The DB-backed run (a Postgres service container in CI or the staging
  server) is the **launch gate** — the script and its thresholds are the deliverable that is
  verified here (the file compiles, imports and its thresholds match §8; the locust extra resolves
  and imports: `locust 2.47.0`).
- **The DR drill run**: the drill script refuses honestly when no clean Postgres is reachable
  (`DRILL NOT RUN: the target is not reachable`), which is the state of this machine (the Docker
  daemon never comes up — the same finding as the VROOM leg in `docs/evidence/backend-solver/`).
  The first drill runs on staging or CI and its log lands in `drill-<date>/` here.

## Reproduction

```
uv sync --directory services/api --extra load --extra dev
uv run --directory services/api locust -f loadtests/locustfile.py --headless --host http://127.0.0.1:8000 -u 1000 -r 100 --run-time 15m
uv run --directory services/api python ops/restore_drill.py --dump backup.sql --target postgresql://.../drill
```
