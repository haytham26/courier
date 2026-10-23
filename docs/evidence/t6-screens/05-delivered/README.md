# Evidence — T6 slice 3, screen 05: Delivered (branch `feat/t6-delivered`)

What this step is: the third of the 13 screens rebuilt against
`docs/design/chosen/screens/05-delivered.html` — the map keeps the scene and
the sheet at the bottom reads the delivery that just landed: the badge pops,
"Delivered", the address with the minute of the delivery, and the two
choices, Undo and Next Stop. A root-stack route like the drive: the confirm
takes the whole screen; the run state it reads lives ABOVE the routes.

## The contract sheet (the reference's geometry, read before the first line)

| Block | The reference | The build |
|---|---|---|
| The sheet | left/right/bottom 8, radius 40, glass, padding 8 16 24, gap 16, the grabber 36×5 | the same panel boxes the drive panel uses — `GlassSurface kind="sheet"` |
| The badge row | 52×52 r26 green circle, white check (stroke 3, 28), pop keyframe (scale .6→1.06→1, .5 s); "Delivered" 24/700; "14 Harewood Road, 10:43" 15 | `DeliveredBadge` (slice 3) + `typography.confirmTitle` (the new token row: 24/29/700); the check pops with the pin spring |
| The actions row | gap 10: Undo 110×54 r27 on the quiet grey fill, label 17/600; Next Stop flex×54 r27 on the accent, white label | gap 12 (the 4-scale step, recorded); the heights 54 (the floor is 48); the labels ride `typography.button` (18/700 — the D33 button bar) |

## The honest numbers (never invented)

- **The address line**: the delivered stop's FULL address (the reference's
  own line carries the number too, "14 Harewood Road, 10:43"), followed by
  the minute the run mark carries — `hourMinuteOf(at)`, a clock read at the
  mark, never an estimate. No mark → the line says `no delivery to confirm`
  and the Undo sits out (it cannot pretend to remove something that is not
  on the run).
- **The badge's check**: the reference paints it white on #34C759 — 2.2:1,
  under the 3:1 non-text bar — so D33's record applies the same way it did
  on the chips and the Slide to Deliver: the check rides `onSuccess`
  (black, both modes). The geometry is the reference's.
- **Next Stop** publishes the same camera command the Today Go publishes
  (`zoom_to_next_stop`) and pops back to the drive, which reads the run's
  next stop off the shared marks — `STOP 3 OF 5` after stop 2 delivers.

## The boundary shift (the recorded consequence edit)

The drive's slide used to mark the run in the SCREEN's own copy ("the same
boundary Today recorded — the shared write path lands with the Route
screen"). A confirm panel on a separate route cannot read a screen's own
state, so the shared write path lands HERE, one screen earlier than the
recorded plan: `src/maps/runState.tsx` — one provider above the stack, the
delivered marks (stop, sequence, the clock read) written by the drive's
slide and read by the confirm panel; the Route planner (08) will read the
same provider. The lifetime is one signed-in session: the root layout keys
the provider to the auth state, so a sign-out remounts it and the marks
never leak across sessions. This edit is recorded in `driving.tsx`'s
boundary note and here.

## Recorded omissions (and why)

| Omitted | Why | Returns with |
|---|---|---|
| The proof-photo card | the POD photo needs the Scan camera wired to a store (P5, step 06 is the scanner surface's own step) | the POD capture from step 06 |
| The note chips ("Side gate" / "Safe place", "Voice note" / "0:06") | the Stop mock carries no notes and `src/doorMemory` is an empty placeholder | the stop-notes data (door memory) |
| The Copilot reminder line ("Next time Copilot will remind you…") | it names the gate note — no notes model, no reminder source | the door memory + the voice proactive path |

## The deliverables

| Area | Where |
|---|---|
| The badge | `apps/mobile/src/components/chosen/DeliveredBadge.tsx` (+ the index export) with 3 tests |
| The run state | `apps/mobile/src/maps/runState.tsx` (`RunProvider`, `useRun`, `DeliveredEvent`) with 4 tests |
| The minute | `hourMinuteOf` in `apps/mobile/src/maps/drive.ts`, 2 new cases in `drive.test.ts` |
| The confirm screen | `apps/mobile/app/delivered.tsx` (map backdrop + the sheet; 7 tests: the renders, the address+minute line, the D33 pairs, the undo's run+haptic+router, the next's camera command, the no-delivery state, the fall-to-last-delivery) |
| The drive's wiring | `apps/mobile/app/driving.tsx` — the slide marks the run and pushes `/delivered?stop=` (the boundary note rewritten) |
| The registration | `apps/mobile/app/_layout.tsx` — `delivered` in the guard; `RunProvider` keyed `isAuthenticated ? 'session' : 'anon'` |
| The token | `typography.confirmTitle` in `packages/design-tokens/src/chosen.ts` + the anchor row in its test |
| The product flow | `.maestro/delivered.yaml` (21 steps: the full journey twice — deliver → undo → deliver → next stop → `STOP 3 OF 5`) |
| The edited flow | `.maestro/driving.yaml`'s tail — after the slide the confirm shows; Next Stop returns the drive at `STOP 3 OF 5` (the same intent, the new route in the middle; both YAMLs parse-checked) |

## The gates

| Command | Result |
|---|---|
| `corepack pnpm --filter @courier/design-tokens build` | exit 0, dist fresh |
| `corepack pnpm --filter @courier/design-tokens test` | 1858 passed (the `confirmTitle` anchor row included) |
| `npx tsc --noEmit` (apps/mobile) | exit 0 (after the suite's spy typing was fixed at the cause) |
| `npx jest` full (apps/mobile) | 426 passed, 35 suites — including the 14 new (runState 4, badge 3, confirm 7) and the drive suite's 2 new `hourMinuteOf` cases; `driving.test.tsx`'s render helper now wraps `RunProvider` (the layout's rule) |
| `npx eslint` full (apps/mobile) | exit 0 |
| js-yaml parse of the two flows | ok, 2 documents each, 21 + 16 steps |
| the reanimated jest mock lesson | the testID lives on the static badge view (animated views drop props through the mock), and query surfaces are not marked `accessibilityElementsHidden` — RNTL v12 queries would not find them |

## Passed to CI (the §13.8.7 gate needs the device)

pending (the run ids land here on the PR's deciding run)
