# CURRENT — the handoff

**Week:** 2026-W43 (the full log is in `docs/log/2026-W43.md`)
**Branch:** `feat/t6-components` — T6 slice 2 (the components of
`docs/design/chosen/README.md` on the ONE token file) ready to push as PR #10.
After merge: `archive/feat/t6-components` tag at the tip, delete the remote
branch, ff main.

## Where the company stands

| area | status | one line |
|---|---|---|
| P1 the Android E2E | PARTIAL | five flows green (runs 39791933538, 39818447287, 39819117879, 39881988810); `courier:///compat` open (BUG-046) |
| P2 the research | DONE | 24 areas; the Spoke analysis landed (`docs/research/competitors/spoke.md`) |
| P3 the map | PARTIAL | the modes, the styles, the builders in; the Canterbury pack not built |
| P4 the design | IN T6 | slice 1 + 2 in: the token file + ADR-008 + the D33 gate (48 pairs) and the 15 chosen components + the D34 sphere; slice 3 = the 13 screens |
| P5 the product | PARTIAL | sync done; the scanner screen, the POD, the dashboard, the billing not started |
| P6 the launch readiness | PARTIAL | the runbook, the checklist, StoreReady in; the deploy sits with the founder |
| The lint gate | DONE | the app runs the shared config: 0 findings, no suppressions (PR #5) |

## The queue

1. T6 slice 3 — the 13 screens light and dark on the chosen components, each with
   the side-by-side emulator-vs-reference gate and the Drive frame-time trace
   (§13.8.7); then the legacy token modules (`tokens.ts`, `themes*`, `directions*`)
   are deleted (Nothing but the chosen file stays).
2. Screens to wire: Today, Route, Stop, Scan, Delivered, Turn-by-turn, Copilot,
   Account — the component prop surfaces are in `apps/mobile/src/components/chosen/index.ts`.
3. After T6: T5 per plan order; the Spoke table's tasks enter via INNOVATION.md.

## The traps

- The mobile gates resolve `@courier/design-tokens/*` from `dist/` (not committed):
  build the package before the app gates or typecheck fails with phantom errors.
- The chosen components import ONLY `@courier/design-tokens/chosen`; screens may
  not import the legacy `themes` modules (the import edge is the rule).
- The envelope keys are `sheet`/`controls` (`GlassKind` = sheet/control maps onto
  them by direct property access — never index with the component kind).
- Reanimated 4 house pattern: one transform key per `useAnimatedStyle`, no deps
  arrays, static Skia props (motion rides the wrappers).
- The pull-to-refresh of the D33 gate never weakens: a colour change edits the
  tokens and the record's reason, not the bar; the slice-2 catch (dark pill
  10 % → 6 %) is the worked example.
- A claim without a run in `docs/evidence/` is not done; this handoff stays ≤30 lines.
