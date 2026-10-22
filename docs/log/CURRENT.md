# CURRENT — the handoff

**Week:** 2026-W43 (the full log is in `docs/log/2026-W43.md`)
**Branch:** `main` at `4fb3578d` (PR #3 merged). There is one line of work from now on: every
new task starts from `main` on one short-lived branch.

## Where the company stands

| area | status | one line |
|---|---|---|
| P1 the Android E2E pipeline | PARTIAL | all five Maestro flows green on the CI emulator (run 39791933538); the deep link `courier:///compat` is the last one open (BUG-046) |
| P2 the research | DONE | 24 areas at the full depth with the verifier pass; the voice and the scanner eval sets are checked in CI |
| P3 the map | PARTIAL | the modes, the styles and the builders exist; the Canterbury pack is not built |
| P4 the design | NOT STARTED | the founder chose Maps First (D27, MASTER_EXECUTION §13.7, `docs/design/chosen/`); building the chosen direction is T6 |
| P5 the product | PARTIAL | sync is DONE; the scanner screen, the proof of delivery, the web dashboard and the billing are NOT STARTED |
| P6 the launch readiness | PARTIAL | the runbook, the release checklist and StoreReady are there; the deployment is the founder's gate |
| The repository hygiene (§16) | DONE | PR #3 merged into main with 20 of 20 checks green; the branch forest is closed (12 branches archived as `archive/*` tags and deleted; origin carries only `main`) |

## What the last fix proved

- The jest platform split (BUG-047) is fixed at the root: `virtualStoreDirMaxLength: 60` in
  `pnpm-workspace.yaml` makes Windows and the Linux workers name the virtual store identically,
  and `apps/mobile/jest/resolver.js` no longer decides with a substring on that directory name.
  Proof: 25 suites / 339 tests green on the workers (runs 39791921375 and 39791933552) and
  locally on Node 24 and Node 22.
- The Maestro flow defect (BUG-048) is fixed: `scrollUntilVisible` requires its selector inside
  the `element` field; the app itself was healthy all along.
- `docs/STATUS.md` is the one-screen truth; `docs/status/PROGRESS.md` and `docs/status/BUGS.md`
  carry the same numbers.

## The next actions, in order

1. The lint and contrast follow-ups (BUG-045): fix the mobile ESLint findings, then turn the
   lint script on. The floor guard forbids suppressions and skipped tests.
2. The §16 leftover audit: the README per top-level folder, the stray and temp files, the
   ignores, the mangled characters in the old errands of the docs.
3. T6: the design to `docs/design/chosen/` (Maps First, D27): the token file, the components,
   then the 13 screens, every state, light and dark, with the side-by-side design gate.
4. T5 then T7 in the plan order (the offline pack, the scanner, the routing engine, the voice
   on device, the backend, the store steps).

## The traps

- On a version bump of Reanimated or Worklets, re-read both upstream resolvers
  (`react-native-reanimated@<version>/jest/resolver.js` and
  `react-native-worklets@<version>/jest/resolver.js`) and keep `apps/mobile/jest/resolver.js`
  in step. Its header says the same.
- pnpm 12 reads the node-modules settings from `pnpm-workspace.yaml`; `.npmrc` carries only the
  auth and registry settings.
- After any `node_modules` wipe: reinstall with `--frozen-lockfile`, then run
  `node node_modules/pnpm/install.js` once, or the repo-local pnpm shim has no binary to exec.
- No local Android emulator: the E2E runs on the GitHub Actions emulator.
- The design lab and the compatibility screen are dev-only
  (`EXPO_PUBLIC_DESIGN_LAB=1` or `EXPO_PUBLIC_E2E=1`).
- The floor guard is `node scripts/ci/check-floor.mjs`; the coverage gate is
  `node scripts/ci/check-coverage.mjs`; the licence gate is
  `node scripts/ci/check-licenses.mjs`.
- A claim without a log in `docs/evidence/` is not done.
