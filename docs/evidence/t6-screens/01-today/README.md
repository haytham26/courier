# Evidence — T6 slice 3, screen 01: Today (branch `feat/t6-screens`)

What this step is: the first of the 13 screens rebuilt to
`docs/design/chosen/screens/03-today.html` on the chosen tokens — the map
backdrop, the floating D34 tab bar with the five slots, the glass sheet
(grabber, three heights, the dock inset), the run pills, the three numbers,
the next stop with its Go, and the day's actions. The scanner surface that
Today's Scan button navigates to is the same PR (`/scan`, the ScrollOverlay
chrome; the camera lands with the delivered slice).

## The deliverables

| Area | Where |
|---|---|
| The tabs' layout with the D34 bar | `apps/mobile/app/(tabs)/_layout.tsx` (the navigator's bar replaced by the chosen `TabBar`; the sphere is the voice: tap toggles the mic, long press says the brief, the caption is the last thing heard) |
| Today rebuilt | `apps/mobile/app/(tabs)/index.tsx` (the `today-*` testIDs kept; the run actions move the day on with the contract's haptics) |
| The shared map boot | `apps/mobile/src/maps/useMapBoot.ts` (the pack/tiles/glyphs fallback story of SYSTEM §6, adopted by both the Map tab and Today — one boot, not two) |
| The scanner surface | `apps/mobile/app/scan.tsx` (`today-scan` has a destination; the overlay is the real recipe, the camera lands later) |
| The new token row | `packages/design-tokens/src/chosen.ts`: radii + `ghostButton` 22 (the sheet's 44 pt secondary actions; the reference's raw 22 was never a token) |
| The sheet API | `BottomSheet` + `bottomInset` (the sheet floor sits above the dock: 64 + 32 + 4 of the spacing scale) |
| The flow | `.maestro/today-list.yaml`: the `today-settings` assert became the Account tab (`tab-settings`, D34); the intent the flow pins — settings reachable on arrival — stands |

## The gates (2026-10-23)

| Command | Result |
|---|---|
| `corepack pnpm --filter @courier/design-tokens build` + `test` | OK; 1857/1857 |
| `corepack pnpm --filter mobile typecheck` | clean |
| `corepack pnpm --filter mobile lint` | clean (0 findings, 0 suppressions) |
| `corepack pnpm --filter mobile test` | 383/383 (30 suites; 7 new: Today's six + the sheet's dock-inset one) |

## Passed to CI (the §13.8.7 gate needs the device)

- The E2E job's `today-list` flow now runs against the REBUILT screen; its
  `takeScreenshot` lands in `.maestro/evidence/` (the run-all keeper) and rides
  the `android-e2e-evidence` artifact of the PR run.
- The side-by-side emulator-vs-reference composition and the per-screen
  recording: the dedicated screen-recording workflow of the 13 screens
  (which will replace `design-videos.yml` per ADR-008) is the NEXT step in
  slice 3; the flows' screenshots are the first half of that gate.
- The dark-mode Today and the map's real tiles on the device: the emulator
  run is light by default; the D33 test pins the pairs, the CI screenshot is
  the visual proof to come.
