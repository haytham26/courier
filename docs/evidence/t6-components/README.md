# Evidence — T6 slice 2: the components (branch `feat/t6-components`)

What this slice is: the components of `docs/design/chosen/README.md` rebuilt on
the ONE token file (`@courier/design-tokens/chosen`), including the D34 Copilot
sphere in the centre of the floating tab bar. Screens stay in slice 3.

## The deliverables

| Area | Where |
|---|---|
| The 15 components + the barrel | `apps/mobile/src/components/chosen/` (context, GlassSurface, CopilotSphere, TabBar, BottomSheet, MapButton + column, TopPills, StatRow, NoteChips, SlideToDeliver, TurnCard + strip, Segmented + Timeline, StopPin, ScanOverlay, index) |
| The token extensions + the D33 gate growth | `packages/design-tokens/src/chosen.ts` (+ `tabActiveFill`, `grabber`, `scanRing`, 6 radii, 4 type sizes), `packages/design-tokens/src/__tests__/chosen-contrast.test.ts` (the pill composited into the glass worst case; 2 registry rows), `chosen.test.ts` anchors |
| The jest mocks | `apps/mobile/jest.setup.js` (expo-glass-effect — switchable availability, expo-blur, Skia passthrough, haptics) |
| The tests | `apps/mobile/src/components/chosen/__tests__/` (4 suites + `test-support.ts` with the typed style reader) |

## The design changes this slice recorded (never a weakened gate)

1. The active tab's quiet pill was in the HTML but not in the token table →
   tokenised as `tabActiveFill` and pushed into the gate's worst case. The D33
   maths then failed the reference-style dark value (10 % white over the worst
   glass branch = 4.03 < 4.5), so the design changed: dark pill = 6 % white
   (≈5.10). The test's bar never moved.
2. The scanner ring `scanRing` and the sheet `grabber` got token rows + a
   non-text registry reason each (SC 1.4.11 stays the follow-up review, not a
   D33 text bar).

## The gates (commands → results, 2026-10-23)

| Command | Result |
|---|---|
| `corepack pnpm --filter @courier/design-tokens build` then `test` | build OK; **1857/1857** (8 files) — includes the stricter glassControls record, light 5.36 / dark ≈5.10 |
| `corepack pnpm --filter mobile typecheck` | clean (`tsc --noEmit`, 0 errors) |
| `corepack pnpm --filter mobile lint` | clean (50 slice-2 findings fixed at the cause; 0 suppressions) |
| `corepack pnpm --filter mobile test` | **376/376** (29 suites) |

The gate outputs are kept in the CI run of the PR; the local numbers above were
the inputs to the push decision.

## Not verified here (passed to slice 3)

- The on-device glass fallbacks (BlurView rendering on a real Android surface),
  the sphere's real frame time, and the side-by-side emulator-vs-reference
  screenshots — slice 3's gates (§13.8.7) produce those.
