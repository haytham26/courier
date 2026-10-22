# CURRENT — the handoff

**Week:** 2026-W43 (the full log is in `docs/log/2026-W43.md`)
**Branch:** `chore/repo-structure` (the repository hygiene of MASTER_EXECUTION section 16)
**Base:** `feat/v4-company-bootstrap`

## Where the company stands

| area | status | one line |
|---|---|---|
| P1 the Android E2E pipeline | PARTIAL | the pipeline and the readiness gates are built; the B.7 compatibility flow is the last one open |
| P2 the research | DONE | 24 areas at the full depth, with the verifier pass |
| P2 the eval sets | PARTIAL | voice and scanner exist and are checked in CI; routing is NOT STARTED |
| P3 the map | PARTIAL | the modes, the styles and the builders exist; the Canterbury pack is not built |
| P4 the design | NOT STARTED | the founder rejected the three directions; the studio restarts at section 13.6 |
| P5 the product | PARTIAL | sync is DONE; the scanner, the proof of delivery, the web dashboard and the billing are NOT STARTED |
| P6 the launch readiness | PARTIAL | the runbook, the release checklist and StoreReady are there; the deployment is the founder's gate |
| The repository hygiene (section 16) | DONE | the restructure, the deletions with their proof and the five-pass check are in the PR of this branch |

## What this branch changed

- The API moved from `apps/api` to `services/api`; the other backends were already there.
- The contracts (the OpenAPI file, the database schema) moved to `packages/contracts`.
- The evaluation data (voice, scanner) moved from `docs/` to `packages/eval`; the builders and the
  checkers moved to `scripts/eval`.
- The scripts are grouped (`ci`, `data`, `eval`, `dev`, `secrets`, `design`), each with a README
  line per script.
- The docs are grouped (`plan`, `status`, `decisions`, `product`, `design`, `research`, `study`,
  `squads`, `evidence`, `operations`, `log`, `archive`); the executor log is split per week.
- The dead code is gone: `services/worker`, the old `compat-test` scripts, the Expo template
  leftovers in the mobile app, the duplicate `.agents/` skills and the root `uv.lock`.
- The design lab and the compatibility screen are out of the release build (a build-time flag).

## The next actions, in order

1. Merge the hygiene PR into `feat/v4-company-bootstrap`.
2. Land the emulator pipeline (`feat/p1-emulator-pipeline`) on top of it: the design lab and the
   compatibility screen need `EXPO_PUBLIC_E2E=1` in the E2E build.
3. The design studio restarts at MASTER_EXECUTION section 13.6 (ten directions).
4. T4 — the real LINZ addresses and the accuracy report.

## The traps

- No local Android emulator: the E2E runs on the GitHub Actions emulator.
- The design lab is a diagnostic: it is in the dev and the E2E build only
  (`EXPO_PUBLIC_DESIGN_LAB=1` or `EXPO_PUBLIC_E2E=1`).
- The floor guard is `node scripts/ci/check-floor.mjs`; the coverage gate is
  `node scripts/ci/check-coverage.mjs`; the licence gate is `node scripts/ci/check-licenses.mjs`.
- A claim without a log in `docs/evidence/` is not done.
