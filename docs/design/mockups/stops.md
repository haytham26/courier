# The stops of the run

The list of every stop of the run, with a filter for the status.

## 1. The job

Show the whole run at a glance, and let the courier find the stop they need
in one tap.

## 2. The layout

| Part       | Content                                                            | Size              |
| ---------- | ------------------------------------------------------------------ | ----------------- |
| Header     | "All Stops" and the count of the stops                             | 28 pt / 19 pt     |
| The filter | Six pills: All, Pending, Active, Delivered, Failed, Skipped        | 19 pt, 56 pt tall |
| The rows   | The number, the address, the suburb, the status badge and the time | 20 pt / 19 pt     |
| The list   | A flash list, 300 stops without a dropped frame                    | -                 |

The rows are grouped by street when the run is long, the way
`DayList.dc.html` shows it: a street heading, then the stops of that street.

The status of a stop is a badge with the word in it. The coloured dot next to
the row is decorative: the badge carries the status in words, so the status
is never colour-only.

## 3. The states

| State        | What the courier sees                                                                                                                                                                                          |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading      | A skeleton of ten rows, each a grey address line and a grey badge. No spinner after 300 ms.                                                                                                                    |
| Empty        | "No stops here yet" and "Change the filter to see the other stops", with the filter pills still there. The empty state says what is missing and what to do next.                                               |
| Error        | "Could not load the stops" and the action "Try again".                                                                                                                                                         |
| Offline      | The chip at the top: "Offline · 4 actions waiting". The list is on the device.                                                                                                                                 |
| Partial sync | The chip with "retry".                                                                                                                                                                                         |
| Permission   | The list needs no permission. If the location is asked for to sort the stops by distance, the one line is "Location is off, so the stops are in the order of the run" and the next step is the system setting. |

## 4. Day and night

- The day theme is `DayList.dc.html`: the paper `#F4F6F7`, the rows white,
  the number of the next stop in the blue `#0B5CAD`.
- The night theme is `Main.dc.html`: the paper `#0E1418`, the rows `#1A242B`,
  the accent `#7CC4FF`.
- The status colours are the same in every theme, and every one of them
  clears 4.5:1 on its own background: the green `#1A7341` (day) and
  `#5BD38A` (night), the red `#B42318` and `#FF8A80`, the amber `#8A5A00` and
  `#F2B04B`, the grey `#56656E` and `#9FB0BA`.

## 5. The motion

| What                 | How                                  | How long                    |
| -------------------- | ------------------------------------ | --------------------------- |
| A row is pressed     | The fill fades by 12 %               | 150 ms                      |
| The filter changes   | The new rows fade in                 | 150 ms                      |
| The stop sheet opens | The spring of the sheet              | 150 ms spring, about 225 ms |
| Less motion          | Every movement above becomes instant | 0 ms                        |

The list never animates while it scrolls, and there is no movement on the
scroll itself.

## 6. The copy

| On the screen                            | Voice prompt (while driving)            |
| ---------------------------------------- | --------------------------------------- |
| "All Stops" / "42 stops"                 | "Show me the stops" (4)                 |
| "Pending"                                | "Show the stops I have not done" (7)    |
| "Failed"                                 | "Show the failed stops" (4)             |
| "No stops here yet"                      | "No stops with that filter" (5)         |
| "Could not load the stops" / "Try again" | "The stops did not load, try again" (7) |

## 7. The accessibility

- The list is a list: `role="list"`, and every row is a `listitem` and a
  button at the same time.
- The label of a row is one sentence: "Stop 42, 14 Harewood Road, Papanui,
  Delivered".
- The filter is a tab bar: every pill is a `tab` with the state "selected".
- The number on the status disc of a row is the ink of the theme, so it
  clears 4.5:1 on the status colour in every theme.
- The focus order is the reading order: the header, the filter, the rows.
- At 200 % text a row grows to two or three lines, the badge moves under
  the address, and nothing is clipped.
- The list is a flash list, so a screen reader still walks it row by row.

## 8. The testIDs

| testID                                              | Used by                        |
| --------------------------------------------------- | ------------------------------ |
| `stops-screen`                                      | `stops.yaml`                   |
| `stop-<id>`                                         | `stops.yaml`, `delivered.yaml` |
| `stops-filter-<filter>`                             | -                              |
| `stop-detail-sheet`                                 | -                              |
| `stop-mark-delivered`, `stop-skip`, `stop-navigate` | -                              |

The Maestro flow opens `stop-2` and asserts the whole text "45 Papanui Road"
and "Merivale", so the address and the suburb stay on their own lines.

## 9. The evidence

- `stops-day.png`, `stops-night.png`, `stops-large.png`, `stops-200.png` in
  `docs/evidence/design/`, compared against `DayList.dc.html`.
