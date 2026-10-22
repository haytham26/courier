# The stop detail

The sheet that opens over the stops list (and over the map). The mockup is
the bottom sheet of `Main.dc.html`.

## 1. The job

Tell the courier everything about the stop in front of them, and let them
act on it without leaving the screen.

## 2. The layout

| Part             | Content                                                         | Size       |
| ---------------- | --------------------------------------------------------------- | ---------- |
| The handle       | The drag affordance, 40 × 4 dp                                  | -          |
| The header       | "Stop 42 of 214" and the ETA, or the stop number and the status | 19 pt      |
| The number       | The sequence of the stop, in the accent colour                  | 34 pt      |
| The address      | The street, semibold, two lines at most                         | 28 pt      |
| The suburb       | Below the address                                               | 20 pt      |
| The notes        | The door note and the place of the parcel, as chips             | 20 pt      |
| The actions      | **Delivered** (72 pt) and **Skip** (72 pt)                      | 72 pt      |
| The close button | Top right, 56 pt                                                | 24 pt icon |

The sheet takes half the screen, or three quarters when the notes are long.
It never takes the whole screen: the courier has to see the run underneath.

## 3. The states

| State        | What the courier sees                                                                                                                                                                                     |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading      | The sheet opens with the address that is already on the device and the rest in skeleton lines. The Delivered button is there from the first frame, because a courier must never wait to deliver a parcel. |
| Empty        | There is no such stop any more: "This stop is not in the run any more" and the action "Close".                                                                                                            |
| Error        | "Could not load the details of this stop" and the action "Try again". The Delivered button still works: the delivery is written to the event log and synced later.                                        |
| Offline      | The chip in the sheet: "Offline · this delivery is saved on the device". The Delivered button never fails offline.                                                                                        |
| Partial sync | The chip with "retry" and the count of the queued actions.                                                                                                                                                |
| Permission   | The photo of the delivery needs the camera: one line, "The camera is off, so there is no photo", and the next step is the system setting. The delivery itself does not need the camera.                   |

## 4. Day and night

- The sheet is the surface of the theme: `#FFFFFF` over `#F4F6F7` in the day,
  `#1A242B` over `#0E1418` at night, as in `Main.dc.html`.
- The Delivered button is the green of the mockup in the night theme
  (`#5BD38A` with the ink `#0E1418`, 9.83:1) and the green of the day theme
  (`#1A7341` with the white label, 5.88:1).
- The Skip button is a surface with a border, never a second brand colour:
  one primary action per screen.
- The handle is the border colour of the theme.

## 5. The motion

| What                 | How                                                                                                                                                | How long                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| The sheet opens      | A critically damped spring, no overshoot                                                                                                           | 150 ms spring, about 225 ms |
| The sheet closes     | The same spring                                                                                                                                    | 150 ms spring, about 225 ms |
| The drag             | The sheet follows the finger on the UI thread. Past a quarter of its height, or a flick over 900 px/s, it is dismissed; otherwise it springs back. | -                           |
| The Delivered button | The fill fades by 12 % and the haptic fires                                                                                                        | 150 ms                      |
| Less motion          | The sheet opens and closes instantly. The drag still works, it just has no spring.                                                                 | 0 ms                        |

The sheet is a modal for the screen reader: the content under it is hidden
(`accessibilityViewIsModal` on iOS, `importantForAccessibility` on Android).

## 6. The copy

| On the screen                                    | Voice prompt (while driving)           |
| ------------------------------------------------ | -------------------------------------- |
| "Stop 42 of 214" / "ETA 10:42"                   | "Stop 42 of 214" (4)                   |
| "14 Harewood Road"                               | "Mark this one delivered" (4)          |
| "Side gate, left of garage"                      | "Read the note again" (4)              |
| "Delivered"                                      | "Skip this stop" (3)                   |
| "Skip"                                           | "Open the map" (3)                     |
| "Offline · this delivery is saved on the device" | "Saved on the phone, it will sync" (7) |

## 7. The accessibility

- The title of the sheet is a heading (`role="heading"`), so a screen reader
  announces "Stop 42, heading".
- The close button is a button with the label "Close" and the hint "Closes
  this sheet". It is the way out for a courier who cannot drag.
- The sheet is a modal: the content below it is not reachable while it is
  open, and the escape gesture closes it.
- The Delivered and Skip buttons are buttons with their labels; the Delivered
  button fires a success haptic, which a screen-reader user feels as well.
- The notes are text, not icons: the door note is a chip with the words in
  it, so the information is not carried by the picture.
- The focus order inside the sheet: the heading, the address, the notes, the
  Delivered button, the Skip button, the close button.
- At 200 % text the sheet grows, the address wraps to three lines and the
  actions stay 72 pt. The sheet never becomes taller than the screen.

## 8. The testIDs

| testID                | Used by                                      |
| --------------------- | -------------------------------------------- |
| `stop-detail-sheet`   | -                                            |
| `stop-mark-delivered` | `delivered.yaml` (the text "Mark Delivered") |
| `stop-skip`           | -                                            |
| `stop-navigate`       | -                                            |
| `sheet-close`         | -                                            |
| `sheet-backdrop`      | -                                            |

## 9. The evidence

- `stop-detail-day.png`, `stop-detail-night.png`, `stop-detail-large.png`,
  `stop-detail-200.png` in `docs/evidence/design/`, compared against the
  bottom sheet of `Main.dc.html`.
