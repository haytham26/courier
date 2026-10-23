# CURRENT — the handoff

**Week:** 2026-W43 (the full log is in `docs/log/2026-W43.md`)
**Branch:** `feat/t6-recordings` — the screen-recording workflow of the 13
screens (this PR): ADR-008/P4 replaces `design-videos.yml`, and the first
dispatch waits for T6 step 01 (PR #11 on `feat/t6-screens`) to merge so the
first side-by-side records the REBUILT Today. After merge: ff main.

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

1. In review: T6 slice 3 step 01 — Today on the chosen tokens (PR
   `feat/t6-screens`, the D34 dock as a navigator prop; BUG-049 has the
   bar's accounting).
2. This PR: the recording workflow (queue item 1); after both merge, the
   first dispatch records the rebuilt Today beside `03-today.html`.
3. Slice 3 steps: 04 Driving (TurnCard + slide over the map), 05 Delivered,
   06 Scan (the camera), 07 Copilot (the transcript), 08 Route, then the
   smaller ones (09–13). Every step adds ITS flow to
   `.maestro/recordings/` with the PR.
4. After the 13: delete the legacy token modules (`tokens.ts`, `themes*`,
   `directions*`) — the chosen file is the only one left.

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
