# Today's list

The opening screen of the app. The mockup is `DayList.dc.html`.

## 1. The job

One glance tells the courier where they are in the run: how many stops are
left, which one is next, and what the voice engine is doing.

## 2. The layout

From the top down:

| Part                   | Content                                                                      | Size          |
| ---------------------- | ---------------------------------------------------------------------------- | ------------- |
| Header                 | The run name and the date ("Monday · Northwood AM"), the time and the driver | 19 pt / 34 pt |
| Settings               | One icon button, top right, 56 pt                                            | 24 pt icon    |
| The big number         | **Stops remaining**, 48-76 pt, tabular numerals                              | 64 pt         |
| The delivered count    | "18 delivered" below the number                                              | 20 pt         |
| The next stop          | The address, semibold, two lines at most, shrink to fit                      | 28 pt         |
| The suburb and the ETA | Below the address                                                            | 20 pt         |
| The primary action     | **Next stop**, one per screen                                                | 72 pt         |
| The voice bar          | The state of the voice engine, always at the bottom                          | 64 dp         |

The tab bar (64 dp) sits under the voice bar.

The screen is one scroll view, and the first screen of the day never scrolls:
the number, the next stop and the primary action are above the fold on a
small phone.

## 3. The states

| State        | What the courier sees                                                                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading      | A skeleton of the number, the address and the button. No spinner after 300 ms. The number shows a skeleton block, never "0", because a wrong zero is worse than no number. |
| Empty        | "No stops left for today" and the run name, with the button "See the stops". Never an empty screen with nothing on it.                                                     |
| Error        | "Could not load today's run" and the action "Try again". One plain sentence, one action.                                                                                   |
| Offline      | The chip at the top: "Offline · 4 actions waiting". The stops of the run are on the device, so the screen still works.                                                     |
| Partial sync | The same chip with "retry" next to it: "Syncing · 2 of 6 done · retry".                                                                                                    |
| Permission   | Only if the location is needed for the ETA: one line, "Location is off, so the ETA is missing", and the next step is the system setting ("Turn on location in Settings").  |

## 4. Day and night

- The day theme is the mockup: the paper is `#F4F6F7`, the cards are white,
  the accent is the blue of the "NEXT" badge (`#0B5CAD`).
- The night theme follows `Main.dc.html`: the background is `#0E1418` (never
  pure black), the card is `#1A242B`, the accent is `#7CC4FF`.
- The night theme turns on by itself at sunset, and the courier can pin it
  in the settings.
- In the night theme the number and the address are the only bright things
  on the screen. Everything else drops back to the secondary ink.

## 5. The motion

| What                  | How                                                                                      | How long         |
| --------------------- | ---------------------------------------------------------------------------------------- | ---------------- |
| The number changes    | The digits roll, no bounce                                                               | 250 ms, ease out |
| The next stop changes | The address fades in place, no slide                                                     | 150 ms           |
| The primary action    | Pressing it fades the fill by 12 %                                                       | 150 ms           |
| The voice bar         | It is always there; the state changes with a colour and a word, no movement              | -                |
| Less motion           | Every movement above becomes instant. The number still changes, it just arrives at once. | 0 ms             |

No movement on the list when it scrolls. No loop, no pulse.

## 6. The copy

| On the screen                              | Voice prompt (while driving)                    |
| ------------------------------------------ | ----------------------------------------------- |
| "Monday · Northwood AM"                    | "Next stop is 14 Harewood Road" (6)             |
| "18 left"                                  | "Eighteen stops left" (3)                       |
| "14 Harewood Road"                         | "Skip this stop" (3)                            |
| "Papanui · 10:42"                          | "Mark this one delivered" (4)                   |
| "Next stop"                                | "Open the last stop" (4)                        |
| "Offline · 4 actions waiting"              | "You are offline, four actions are waiting" (7) |
| "Could not load today's run" / "Try again" | "Try the list again" (4)                        |

Every voice prompt is at most eight words. The numbers are read the way a
courier says them. No emoji, anywhere.

## 7. The accessibility

- The big number is a heading: `role="heading"`, and it is read as "18 stops
  left".
- The primary action is a button, 72 pt, with the label "Next stop" and the
  hint "Opens the next stop".
- The settings button is a button with the label "Settings" and the hint
  "Opens the settings".
- The stop rows are buttons. The label of a row is one sentence: "Stop 42,
  14 Harewood Road, Papanui, next". The status dot next to the row is
  decorative and is hidden from the screen reader - the badge carries the
  status in words, so the status is never colour-only.
- The focus order is the reading order: the number, the next stop, the
  primary action, the voice bar, the tab bar.
- At 200 % text the number shrinks to 48 pt, the address wraps to three
  lines and the primary action keeps its 72 pt. Nothing is clipped and
  nothing is cut off with an ellipsis.
- The live region: when a delivery is confirmed, the count is announced with
  `accessibilityLiveRegion="polite"`.

## 8. The testIDs

| testID                                              | Used by           |
| --------------------------------------------------- | ----------------- |
| `today-screen`                                      | `today-list.yaml` |
| `today-settings`                                    | -                 |
| `today-mark-delivered`                              | -                 |
| `today-skip`                                        | -                 |
| `today-fail`                                        | -                 |
| `today-see-all`                                     | -                 |
| `today-stop-<id>`                                   | -                 |
| `tab-index`, `tab-map`, `tab-stops`, `tab-settings` | the tab bar       |

The Maestro flow asserts the words "Delivered", "Remaining" and
"Success Rate", so the three counts keep those labels.

## 9. The evidence

The design review gate wants four screenshots in `docs/evidence/design/`:

- `today-list-day.png` - the day theme, a small phone (360 × 800).
- `today-list-night.png` - the night theme, a small phone.
- `today-list-large.png` - the day theme, a large phone (430 × 932).
- `today-list-200.png` - the day theme at 200 % text.

Each one is compared against `DayList.dc.html`. A screenshot that contradicts
the mockup is fixed in the screen, not in the screenshot.
