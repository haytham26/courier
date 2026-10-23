# Evidence — T6 slice 3, screen 02: Driving (branch `feat/t6-driving`)

What this step is: the second of the 13 screens rebuilt against
`docs/design/chosen/screens/04-driving.html` (night per
`12-driving-night.html` via the tokens and the map style) — the map fills
the screen, the turn card and the Then strip read at a glance at the top,
the map buttons ride the right edge, and the drive panel carries the run:
the stop header, the street, the slide as the ONE action. The drive is a
root-stack route, not a tab: the D34 dock belongs to the run's launches,
the drive owns the whole screen.

## The contract sheet (the reference's geometry, read before the first line)

| Block | The reference | The build |
|---|---|---|
| The turn card | top 56, left/right 10, radius 30, `turnCard` fill, the distance in the biggest rounded type, the street under it | `TurnCard` (slice 2) with the computed distance |
| The Then strip | top 152, left 30, radius 0 0 16 16, `turnStrip`, 15/600 light, the right arrow | `TurnCard`'s `thenStreet` |
| The map buttons | right 12, top 212, gap 10: Map style, Copilot (mic) | `MapButtonColumn` + `MapButton` |
| The drive panel | left/right 8, bottom 8, radius 40, glass, padding 10 18 22, gap 14: the grabber, `STOP 43 OF 214`, the address 24/700, the receiver line 15, the right column (`2 min`, `10:42`), the chips, the slide 64/r32 with the 54 thumb | the glass panel + `SlideToDeliver` (slice 2); the grabber draws it |

## The honest numbers (never invented)

- **The stop header**: `STOP {sequence} OF {5}` — the two fixtures are the
  real run (the same `mockStops` Today reads; the same-stop contract pins
  the mock in `drive.test.ts`).
- **The distance**: the straight line from the map's home centre
  (`DRIVE_ORIGIN`) to the active stop, computed by haversine — a real
  number, not a design sample's "120 m". It reads kilometres to one
  decimal over a kilometre.
- **The street**: the address's street line (the number tokens drop, the
  unit slash '2/14' included); the panel's second line is the suburb.
- **What the slide changes becomes the test of the screen**: delivering
  hands the run to the next stop — the panel's count moves on, the map's
  markers follow (the screen's own copy of the run; the shared write
  path lands with the Route screen, the same boundary Today recorded).

## Recorded omissions (and why)

| Omitted | Why | Returns with |
|---|---|---|
| The right column's `2 min` / `10:42` | there is no traffic model; an estimate would be a made-up number on the driver's screen | the position stream + the turn-by-turn hand-off (T7.7) |
| The receiver line (`J. Morrison`) | the mock run has no receiver field | the real stop data |
| The note chips (Side gate / Shelf B3 / Dog) | `Stop` carries no notes yet; empty rows are dead rows | the stop-notes data |

## The deliverables

| Area | Where |
|---|---|
| The drive's numbers | `apps/mobile/src/maps/drive.ts` (`DRIVE_ORIGIN`, `positionOf`, `haversineMeters`, `formatDistance`, `streetLine`, `activeOf`, `nextOf`) with `__tests__/drive.test.ts` (21 tests; the same-stop pin: `activeOf(mockStops)` reads the stop Today reads) |
| The drive screen | `apps/mobile/app/driving.tsx` (ChosenProvider of its own — a root route sits outside the tabs'), the tested contracts |
| The `/driving` registration | `apps/mobile/app/_layout.tsx` |
| The entry | the REBUILT Today's Go → `router.navigate('/driving')` + the camera command (no flow pins the map destination; the recorded D34-style edit lands post merge of #11) |
| The product flow | `.maestro/driving.yaml` — joins `run-all.sh`'s glob automatically (entry on today-go, the glance asserts, the slide, the run moved on) |
| The recording flow | `.maestro/recordings/04-driving.yaml` — the keeper composes its dark pass against `12-driving-night.html` (the alias in `recordings-run.sh`) |

## The gates

| Command | Result |
|---|---|
| (pre-merge, engine only) `npx jest src/maps/__tests__/drive.test.ts` | 21/21 |
| (pre-merge) `npx eslint` on the new files | clean |
| `corepack pnpm --filter @courier/design-tokens build` | exit 0, dist fresh |
| `npx tsc --noEmit` (apps/mobile) | exit 0 — the drive screen compiles against the merged `useMapBoot` |
| `npx jest` full (32 suites) | 409 passed, 0 failed — the 5 driving tests ran GREEN against the real tree after the GestureHandlerRootView wrapper (the slide's gesture needs it, the case `SlideToDeliver.test.tsx` already named), the `Then Blenheim Road` exact string (the strip's own words), and the `mock`-prefixed mic spy (the lint's `no-require-imports`/`no-unsafe-*` bar) |
| `npx eslint` full (apps/mobile) | exit 0 |

## Passed to CI (the §13.8.7 gate needs the device)

pending (the run ids land here)
