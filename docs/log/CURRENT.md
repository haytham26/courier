# CURRENT — the handoff

**Week:** 2026-W43 (the full log is in `docs/log/2026-W43.md`)
**Branch:** `main` at `f9a647f` (PRs #5, #6, #7 merged today; each carries its
`archive/<branch>` tag pushed before the branch's deletion). One line of work from
now on, each item on its own branch from `main`.

## Where the company stands

| area | status | one line |
|---|---|---|
| P1 the Android E2E | PARTIAL | five flows green (runs 39791933538, 39818447287, 39819117879); `courier:///compat` open (BUG-046) |
| P2 the research | DONE | 24 areas; the Spoke analysis landed (`docs/research/competitors/spoke.md`) |
| P3 the map | PARTIAL | the modes, the styles, the builders in; the Canterbury pack not built |
| P4 the design | STARTING | Maps First chosen (`docs/design/chosen/`); ADR + token file + the 13 screens are T6 (§13.7, §13.8) |
| P5 the product | PARTIAL | sync done; the scanner screen, the POD, the dashboard, the billing not started |
| P6 the launch readiness | PARTIAL | the runbook, the checklist, StoreReady in; the deploy sits with the founder |
| The lint gate | DONE | the app runs the shared config: 0 findings, no suppressions (PR #5) |

## The queue

1. T6 Maps First in slices: ADR-008 ("Design system: Maps First") and the ONE token
   file (light and dark, motion durations and curves included) first.
   The token file ships WITH the §13.9 contrast test (D33: 3:1 only for large
   text, buttons 18 px bold, 4.5:1 other text, 7:1 driving, every pair asserted).
   Also delete the leftover branch `docs/status-report` after its archive tag.
2. The components of `docs/design/chosen/README.md` (glass, tab bar, sheet, map
   buttons, slide-to-deliver), then the 13 screens light and dark — each with the
   side-by-side emulator-vs-reference gate and the Drive frame-time trace (§13.8.7).
3. After T6: T5 per plan order; the Spoke table's tasks enter via INNOVATION.md.

## The traps

- The mobile gates resolve `@courier/design-tokens/*` from `dist/` (not committed):
  the package builds before the app gates (`ci.yml` now does).
- CI compiles the program of a fresh clone: a generated-but-committed file (like
  `expo-env.d.ts`) must stay tracked — a lived-in machine hides exactly this class.
- Mobile jest shares `apps/mobile/jest/resolver.js` with the Reanimated/Worklets
  resolvers — re-read all three on any version bump of either.
- A claim without a run in `docs/evidence/` is not done; this handoff stays ≤30 lines.
