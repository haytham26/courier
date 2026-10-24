# STATUS - Courier Copilot

**Day:** 2026-10-25. **Branch:** `main` at `d4da3b7` (PR #22 merged). One branch, one line of
work; every new task starts from `main`.

Labels: **DONE** (works, with the run or the test count as the evidence), **PARTIAL** (what
exists and what is missing, both named), **NOT STARTED**. Full detail: `docs/status/PROGRESS.md`.
Open defects: `docs/status/BUGS.md`. Contract: `docs/plan/MASTER_EXECUTION.md`.

## DONE (the evidence is a green run)

| The thing | The evidence |
|---|---|
| One repository tree (`apps/`, `packages/`, `services/`, `infra/`, `scripts/`, the grouped docs) and main green | PR #3 merged as `4fb3578d`; 20 of 20 checks green |
| The mobile jest suites run on every machine (the platform split, BUG-047, fixed at the root) | 25 suites / 339 tests green on the Linux workers (runs 39791921375 and 39791933552) and locally on Node 24 and Node 22 |
| The Android E2E: all five Maestro flows complete on the CI emulator | run 39791933538 (the APK 14m49s, the flows 4m38s); the flow schema defect BUG-048 fixed |
| The auth service (Better Auth 1.7.10: MFA, passkeys, the OAuth starts, the teams) and the app's sign-in screens | 59 tests in `services/auth`; ADR-006 |
| The LINZ ground truth and the D8 address engine | 225,151 real addresses indexed; 98.3% accuracy on the sampled data (`docs/evidence/phase-2.3/linz-accuracy.md`) |
| The runs, the shifts, the live stop list and the POD upload (PR #21, ADR-010) on the sync spine, with the security fixes | `services/api` green in CI (the contract, the runs API, the solver and the sync suites) |
| The research (24 areas) and the voice and scanner eval sets | `docs/research/2026/`, `packages/eval`, their checks in CI |
| The CI system (ci, quality gates, CodeQL, the restore test, the Android E2E) | every workflow green on the wave of PR #3 |
| The branch forest closed | 12 branches archived as `archive/*` tags and deleted; origin carries only `main` |

## PARTIAL (what exists and what is missing, both named)

| The thing | What exists | What is missing |
|---|---|---|
| The Android E2E pipeline (P1) | all eight flows green on both api legs (run 40112419901) | the deep link `courier:///compat` still does not navigate from outside the app (BUG-046) |
| The offline map (P3) | the styles, the pack contract, the pack builder | the Canterbury pack is not built; nothing ran on a device |
| The voice service (P5) | `services/courier-voice` with 166 tests and the shift simulations | no model packs bundled; never heard on a device |
| The routing (P5) | PyVRP 0.14.1 behind the RouteEngine seam (PR #19, ADR-009): the 200-stop day in 3.2 to 3.3 s against the 5 s budget, +7.8 min of day per 174-stop run against the 1000-iteration reference | the VROOM comparison leg is unverified on this machine |
| The sign-in (P5) | the service and the app screens | no native Google or Apple sign-in in the app; magic link, HIBP, device binding, session list and refresh rotation open |
| The driving mode, the door memory, the earnings | the code and the tests | nothing proven on a device; no payouts, no IRD or Xero export |
| The store readiness (S2) | the policy, the listing draft, 9 checker tests | the founder's store assets and the legal review |
| The mobile lint (BUG-045) | the config file `apps/mobile/eslint.config.mjs` exists | the app does not yet declare the config package or eslint, so the gate has not run: join the gate, fix the findings, then turn the lint script on |

## NOT STARTED

The scanner screen and its pipeline (the label eval set is built in `packages/eval`), the proof
of delivery, the web dashboard, the billing (Stripe), the push notifications.

## Next (in order)

1. The lint and contrast follow-ups (BUG-045 first, one branch from `main`).
2. The section 16 leftover audit (one branch: the READMEs, the stray files, the ignores).
3. T6: build the chosen design (Maps First, D27, `docs/design/chosen/`): the token file, the
   components, then the 13 screens, every state, light and dark.
4. T5 then T7 in the plan order (the offline pack, the scanner, the routing engine, the voice
   on device, the backend, the store steps).
