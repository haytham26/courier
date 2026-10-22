# CURRENT — the handoff

**Week:** 2026-W43 (the full log is in `docs/log/2026-W43.md`)
**Branch:** `main` at `50f1eac` (PR #4 merged). One line of work from now on: PR #5
(the lint gate) merges on green; then each queue item on its own branch from `main`.

## Where the company stands

| area | status | one line |
|---|---|---|
| P1 the Android E2E | PARTIAL | five flows green (run 39791933538); `courier:///compat` open (BUG-046) |
| P2 the research | DONE | 24 areas at full depth; the voice and scanner evals run in CI |
| P3 the map | PARTIAL | the modes, the styles, the builders in; the Canterbury pack not built |
| P4 the design | NOT STARTED | Maps First (D27): the tokens, the components, the 13 screens = T6 |
| P5 the product | PARTIAL | sync DONE; the scanner screen, the POD, the dashboard, the billing not started |
| P6 the launch readiness | PARTIAL | the runbook, the checklist, StoreReady in; the deploy is the founder's gate |
| §16 the hygiene | leftover | the restructure merged; the mangled characters and the group READMEs close on their branch |

## The queue

1. Merge PR #5 on green, archive its tag, then this branch's merge.
2. T6: Maps First — the tokens, the components, the 13 screens (light and dark).
3. The Spoke note (the founder-authorised screenshots, MASTER 17.2), then T5 → T7.

## The traps
- The mobile gates resolve `@courier/design-tokens/*` from `dist/` (not committed):
  build the package before any gate on the app (`ci.yml` does, before the gates).
- `expo/tsconfig.base` has no `strict`: `T | null` collapses and undefined-return
  callbacks widen chains — the comments in `storage.ts` and `auth-client.ts` carry it.
- Mobile jest shares `apps/mobile/jest/resolver.js` with the Reanimated/Worklets
  resolvers — re-read on any bump of either.
- No local Android emulator: the E2E runs on the GitHub Actions emulator job.
- A claim without a run in `docs/evidence/` is not done; the handoff stays ≤30 lines.
