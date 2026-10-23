# CURRENT — the handoff

**Week:** 2026-W43 (the full log is in `docs/log/2026-W43.md`)
**Branch:** `feat/t6-tokens` — T6 slice 1 (ADR-008 + the ONE token file + the D33
contrast gate) pushed as PR #9. Merge: `gh pr merge 9 --merge` when green, then push
the `archive/feat/t6-tokens` tag at the tip, delete the remote branch, ff main.

## Where the company stands

| area | status | one line |
|---|---|---|
| P1 the Android E2E | PARTIAL | five flows green (runs 39791933538, 39818447287, 39819117879); `courier:///compat` open (BUG-046) |
| P2 the research | DONE | 24 areas; the Spoke analysis landed (`docs/research/competitors/spoke.md`) |
| P3 the map | PARTIAL | the modes, the styles, the builders in; the Canterbury pack not built |
| P4 the design | IN T6 | slice 1 in: the token file + ADR-008 + the D33 gate (48 pairs); slices 2–3 = components then the 13 screens |
| P5 the product | PARTIAL | sync done; the scanner screen, the POD, the dashboard, the billing not started |
| P6 the launch readiness | PARTIAL | the runbook, the checklist, StoreReady in; the deploy sits with the founder |
| The lint gate | DONE | the app runs the shared config: 0 findings, no suppressions (PR #5) |

## The queue

1. T6 slice 2 — the components of `docs/design/chosen/README.md` (glass sheet, tab
   bar with D34's sphere in the centre, map buttons, chips, slide-to-deliver,
   scanner overlay with the scrim) rebuilt on the token file; start immediately
   after the merge (§19.2b), one branch.
2. T6 slice 3 — the 13 screens light and dark, each with the side-by-side
   emulator-vs-reference gate and the Drive frame-time trace (§13.8.7); then the
   legacy token modules (`tokens.ts`, `themes*`, `directions*`) are deleted.
3. After T6: T5 per plan order; the Spoke table's tasks enter via INNOVATION.md.

## The traps

- The mobile gates resolve `@courier/design-tokens/*` from `dist/` (not committed):
  the package builds before the app gates (`ci.yml` now does).
- `expo-env.d.ts` is generated and tracked — never gitignore it again (BUG: the 13
  `no-unsafe-*` were a missing-ambient-file artifact, not a real finding).
- Mobile jest shares `apps/mobile/jest/resolver.js` with the Reanimated/Worklets
  resolvers — re-read all three on any version bump of either.
- The D33 gate never weakens: a design change edits the tokens and the record's
  reason, not the bar; a colour may not leave the table without a registry reason.
- A claim without a run in `docs/evidence/` is not done; this handoff stays ≤30 lines.