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
| The flows | `.maestro/today-list.yaml`: the `today-settings` assert became the Account tab (`tab-settings`, D34); `.maestro/compat.yaml`: the settings tap got the same change (`today-settings` → `tab-settings`, the D34 consequence; the first head missed this one). The intents the flows pin stand: settings reachable on arrival, route-actions reachable in the sheet. |

## The gates (2026-10-23)

| Command | Result |
|---|---|
| `corepack pnpm --filter @courier/design-tokens build` + `test` | OK; 1857/1857 |
| `corepack pnpm --filter mobile typecheck` | clean |
| `corepack pnpm --filter mobile lint` | clean (0 findings, 0 suppressions) |
| `corepack pnpm --filter mobile test` | 383/383 (30 suites; 7 new: Today's six + the sheet's dock-inset one) |
| rerun after the bar accounting (2026-10-23) | typecheck clean, lint clean, 383/383 (30 suites) — same numbers |

## The bar accounting (the e2e of the first head, run 39892147848)

- What the run's evidence shows: Today renders (the pills, the pins, the
  sheet, the numbers) but the a11y tree carries none of the dock's ids and
  the screenshot shows no dock; every flow step that touches a slot failed.
- What the logcat caught: four 31×28 boxes at the exact quarter positions
  (x 25/105/185/265, `importantForAccessibility: false`) — the default bar's
  missing-icon placeholders, styled transparent by my `tabBarStyle`: a bar
  nobody can see or tap.
- Root cause, read in the installed fork
  (`expo-router@58.0.23/build/standard-navigation/index.js`): the fork's
  `partitionNavigatorProps` hands `screenOptions` to the router and forwards
  every other prop verbatim to `BottomTabView`; nothing reads a custom bar
  back from the descriptors, so a `tabBar` inside `screenOptions` is inert.
  The fork honours the bar only as a navigator prop
  (`BottomTabNavigationConfig.tabBar` → `BottomTabView` line 117).
- Fix (this head): the bar moved to `<Tabs tabBar={...}>` — an element prop
  — and the inert `tabBarStyle` option dropped with it. `compat.yaml`'s
  `today-settings` also became `tab-settings` (the first head missed that
  one; the D34 row above).

## Passed to CI (the §13.8.7 gate needs the device)

- The deciding run on this head (39904905360): compat, map, smoke and stops
  flows GREEN — the dock verified on device (compat tapped `tab-settings` and
  completed; the run's a11y dump carries the full dock). today-list was the
  last red: the centre-started scroll at peek lands on the map, not the sheet
  (BUG-050; the grabber-raise fix rides with this commit).
- The gate's relaunch-once (BUG-051): the image's own Chromium raced a cold
  launch on run 39905489019 (the recordings PR's e2e on green-on-main code),
  the app dead 5 s in; the first-screen loop now re-reads the process each
  round and relaunches once if it died mid-wait — the crash buffer keeps its
  evidence either way.
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
