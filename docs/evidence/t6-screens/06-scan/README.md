# Evidence — T6 slice 3, screen 06: Scan (branch `feat/t6-scan`)

What this step is: the fourth of the 13 screens rebuilt against
`docs/design/chosen/screens/06-scan.html` — a courier points the phone at a
parcel label, the camera fills the screen, the lock ring lands on the
address block, and the sheet at the bottom reads it: the matched address,
where the parcel sits in the van, and the one action, "Add and Scan Next".

The route is a root-stack screen like the drive and the confirm (opened
from Today's action row, `today-scan` → `/scan`), and the van's load lives
ABOVE the routes so the parcels outlive the scanner.

## The contract sheet (the reference's geometry, read before the first line)

| Block | The reference | The build |
|---|---|---|
| The camera | fills the 390×844 frame behind everything; the paper label is the reference's own prop | `react-native-vision-camera` 5.2.3: `useCameraDevice('back')` + `<Camera isActive>` over `StyleSheet.absoluteFill` |
| The pills | top 58, left/right 16, height 36, padding 0 14, r18, `rgba(28,28,30,.72)` glass, 15/600 labels, one check icon, tabular figures | the overlay's pills: `colors.dark.glass` + `onDarkGlass`, `typography.body` (15/600); the Done pill is a real button (twin), the count is display-only |
| The status line | top 430, centred, 15/600, `rgba(255,255,255,.8)` | the same box; `colors.dark.onDarkGlass` (the D33 pair over the scrim) |
| The lock ring | 36/228, 200×112, r12, a 2.5 px `#FFD60A` ring with a 999 px scrim hole, rotate −4°, the `lock` .5 s ease-out | the overlay's reticle: the bounds constant, r12, the ring in `colors.dark.scanRing`, the hole in the dark `scrim` in both modes (the rotate is the reference's prop-driven tilt, not the app's) |
| The sheet | left/right/bottom 8, r40, padding 10 20 22, gap 14, white `.95`, grabber 36×5 | `GlassSurface kind="sheet"` (the same one surface of the design) + `ScanMatchSheet`; the padding is the 4-scale's 8/20/24 and the gap 12 - recorded drift: the reference's 10 and 14 are off the 4 pt scale (→ 8 and 12) and its 22 is a 2 pt outlier (→ 24), the same accounting the 05 sheet's row records |
| The match row | 44 r22 green circle, white check; "14 Harewood Road" 20/700; "Papanui 8053. Matched to the map." 15, `rgba(60,60,67,.6)` | `DeliveredBadge size={44}` (the shared badge, its check scaled 28:52 proportionally); `typography.matchTitle` 20/700 and `typography.matchSubtitle` 15/400 (the two new token rows + anchors) |
| "WHERE IN THE VAN" | 13/600, `rgba(60,60,67,.6)` | `typography.secondary` 13/600 in `colors.secondaryLabel` (D33's .9, the raised alpha) |
| The segmented | track r12, fill `rgba(120,120,128,.12)`, the active segment white r9 h34, labels 15/600 | the chosen `Segmented` (its token rows: track 12/9, `chipLabel` 14/600 — the slice-2 pinned row; the reference's 15 is the recorded drift) |
| The action | 54, r27, `#0A7CFF`, white 17/600, "Add and Scan Next" | height 54, `radii.button` 27, `colors.accent`, the label on `typography.button` 18/700 (the D33 button bar) |

## The honest numbers (never invented)

- **The reading is a seam, not a pretend.** The library's own object scanner
  (`useObjectOutput`, `CameraObjectOutput`) is marked `@platform iOS` in the
  installed 5.2.3 and has NO Android sources: Android's real recognition is
  an ML Kit text-recognition plugin — a native dependency and its own slice
  (P5). So `src/scans/labelReader.ts` is the seam with two honest
  implementations: the mock reader the E2E build drives (the mock run's own
  labels — stop 2 "45 Papanui Road", then stop 3 "120 Blenheim Road"), and a
  camera reader that answers **`unavailable`** with the reason instead of
  pretending it read a label. A new recognizer is a new implementation of
  that one interface.
- **The camera is REAL, and so is the permission.** The app's manifest
  declares `android.permission.CAMERA` (the library declares only the camera
  *feature*), the E2E gate grants it up front (`run-all.sh`), and the route
  asks for it while the system still allows it. Before this step the camera
  had never opened in this app.
- **A device with no back camera is a quiet dark feed, never a crash.** 5.2.3
  exposes no error callback for a session that fails to start, so the screen
  reports what the library actually delivers — no fabricated `onError`, no
  invented crash text.
- **The van's load is real state.** `ScanLoadProvider` holds the parcels
  (address, suburb, van position, the clock read), keyed to the auth session
  like the run marks, so a sign-out empties the van. The pill counts it: "1
  scanned" after the first parcel.
- **The D33 pairs.** The sheet keeps the LIGHT recipe in BOTH modes (the
  nested `ChosenProvider mode="light"`, the reference's white sheet), the
  overlay keeps the DARK one: the address on the sheet (label on card), the
  subtitle and the section label on `secondaryLabel` (.9), the action's label
  `onAccent` on `accent` (18/700, the large-text pair), the overlay's labels
  `onDarkGlass` on the dark glass over the `scrim` (9.88 asserted over the
  brightest possible feed), and the check `onSuccess` black on the green
  (the reference's white is 2.2:1 — the recorded D33 chip consequence).

## Recorded omissions (and why)

| Omitted | Why | Returns with |
|---|---|---|
| Reading a label on a real Android device | the camera library's scanner is iOS-only; the recognizer is an ML Kit text-recognition plugin (a native slice) | the P5 scanner/recognizer slice — one new `LabelReader` implementation and nothing else |
| The postcode in the match subtitle ("Papanui **8053**") | the mock stop carries no postcode; a number the data cannot give is never invented | the NZ address pack's postcode on the stop |
| The paper label's tilt (rotate −4°) | it is the reference's prop angle on its own mockup label | the recognizer's real bounding box, which rotates with the parcel |
| The POD proof-photo capture | the POD store is P5 and the captured image needs a destination | the POD capture wired to the Scan camera |
| The emulator feed in CI is the emulator's own virtual scene, not the reference's parcel label | the emulator renders an AVD room; the §13.8.7 feed comparison is a device matter | the side-by-side recording (P4's §13.8.7 gate) |

## The deliverables

| Area | Where |
|---|---|
| The reader seam | `apps/mobile/src/scans/labelReader.ts` (`LabelMatch`, `LabelReading`, `LabelReader`, `createMockLabelReader`, `createCameraLabelReader`, `readerForThisBuild`) with 4 tests |
| The van load | `apps/mobile/src/scans/scanLoad.tsx` (`ScanLoadProvider`, `useScanLoad`, `VanPosition`) with 4 tests |
| The overlay | `apps/mobile/src/components/chosen/ScanOverlay.tsx` (the pills, the scrim, the reticle — slice 3's step-06 work) |
| The match sheet | `apps/mobile/src/components/chosen/ScanMatchSheet.tsx` (+ the index export) with 4 tests |
| The shared badge's size | `DeliveredBadge` gains `size` (52 default — the 05 slice unchanged — 44 for the scan; the check scales its proportion) |
| The scanner screen | `apps/mobile/app/scan.tsx` (the real camera, the permission path, one read at a time, the lock ring, the status line, the sheet) with 4 tests |
| The run state's wiring | `apps/mobile/app/_layout.tsx` — `ScanLoadProvider` inside the auth-keyed `RunProvider`; `today-scan` opens `/scan` from the Today action row |
| The token rows | `typography.matchTitle` (20/24/700) and `typography.matchSubtitle` (15/19/400) in the ONE file + their anchor rows |
| The permission | `android.permissions` in `apps/mobile/app.json` (the SHIPPING path — the CI runs `expo prebuild`, which generates `apps/mobile/android/`, and that directory is gitignored: the manifest it produces carries the CAMERA permission prebuild merges; the local checked-out copy was updated too, but it is a build artifact) + `NSCameraUsageDescription` for the iOS side (where the library's own scanner actually exists) |
| The gate grant | the CAMERA `pm grant` in `.maestro/run-all.sh` beside the voice and location grants |
| The product flow | `.maestro/scan.yaml` (launch → raise the sheet → `today-scan` → the scanner → the match sheet → the van segment → `1 scanned` → the next label → `scan-done` → Today), parse-checked (no tabs, even indents, balanced quotes, the name colon-free per the delivered lesson) |

## The gates

| Command | Result |
|---|---|
| `corepack pnpm --filter @courier/design-tokens build` | exit 0, dist fresh |
| `corepack pnpm --filter @courier/design-tokens test` | 1860 passed (8 files — the two new anchor rows included) |
| `npx tsc --noEmit` (apps/mobile) | exit 0 (after three real fixes: the camera's `testID` moved to its holder — `CameraViewProps` picks only `style/onLayout/pointerEvents/nativeID`; a non-existent `onError` prop REMOVED rather than faked; `StyleSheet.absoluteFill` for RN 0.88) |
| `npx jest` full (apps/mobile) | 442 passed, 39 suites — including the 20 new (reader 4, load 4, sheet 4, badge's new size path, scanner 4) |
| `npx eslint` full (apps/mobile) | exit 0 (after four real fixes: typed `requireActual` generics as the sibling suites do, `Promise.resolve` where no await belongs, the unused `t` removed, the selected-state read typed) |
| The flow's contract check | every testID/string/id the flow asserts traced to the app (the composed ones included: `${load.count} scanned`, `${match.suburb}. Matched to the map.`, the segmented's `${testID}-${key}`) |

## Passed to CI (the §13.8.7 gate needs the device)

pending (the run ids land here on this branch's deciding run — stacked behind
PR #14, so its PR opens on main once 05 merges)
