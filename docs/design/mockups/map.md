# The map

The map of the run. The mockup is the night half of `Main.dc.html`.

## 1. The job

Show the courier where the run is going, what is next, and whether the map
works without a network.

## 2. The layout

| Part                | Content                                                        | Size          |
| ------------------- | -------------------------------------------------------------- | ------------- |
| The map             | The whole screen, under the safe area                          | -             |
| The offline chip    | Top right: "Offline map · Canterbury" with a status dot        | 17 pt         |
| The turn card       | The distance and the next turn, when the navigation is running | 28 pt / 17 pt |
| The bottom controls | The theme choice, "My location" and "Next stop"                | 56 pt         |
| The attribution     | The OpenStreetMap and the LINZ credit, always visible          | 17 pt         |
| The stop markers    | A pin with the number of the stop, at most 40 of them          | 20 pt         |

The stop markers are the stops of the run, the active one first. The number
on the pin is the sequence of the stop, and it is read on the pin of the
status colour - the ink of the day theme, the ink of the night theme - so the
number is always legible.

## 3. The states

| State        | What the courier sees                                                                                                                                                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading      | The map draws as soon as the style is ready. The offline chip says "Looking for the offline map" until the pack is found. No spinner over the map.                                                                                       |
| Empty        | No stops to show: the map stays, and the chip says "No stops for this run yet".                                                                                                                                                          |
| Error        | The map is still there; the chip says "The map could not load" with the action "Try again". The stops of the run are still on the device, so the courier is never stuck.                                                                 |
| Offline      | The chip says "Offline map · Canterbury" when the pack is on the device, and "Online map · the offline pack is not on the device" when it is not.                                                                                        |
| Partial sync | The chip carries the count of the queued actions and a "retry".                                                                                                                                                                          |
| Permission   | The location permission is asked for once, with one line: "The map needs your location to show where you are", and the next step is the system setting. Without the permission the map still works, it just does not follow the courier. |

## 4. Day and night

- The map has its own style per theme, and the style comes from the token
  package (`components.map`), not from a hand-picked palette.
- The day style: the paper `#F4F6F7`, the roads white, the highway amber
  `#F2B04B`, the route line blue `#0B5CAD`.
- The night style: the map `#121A1F`, the roads `#1E2A31`, the highway amber,
  the route line `#4FA8FF`, the labels `#F2F5F7` with a `#121A1F` halo.
- The high-contrast style: black, white roads, yellow highways, a cyan route
  line.
- The theme choice on the map is a manual override of the automatic
  day/night switch, and it is remembered.

## 5. The motion

| What                | How                                                  | How long                    |
| ------------------- | ---------------------------------------------------- | --------------------------- |
| The map moves       | The camera follows the courier, no easing of its own | -                           |
| The theme changes   | The map style swaps, no cross-fade                   | -                           |
| A marker is pressed | The pin grows by 10 % and the stop sheet opens       | 150 ms                      |
| The sheet opens     | The spring of the sheet                              | 150 ms spring, about 225 ms |
| Less motion         | The camera and the sheet become instant              | 0 ms                        |

Nothing loops. The map does not pulse, ping or breathe.

## 6. The copy

| On the screen                           | Voice prompt (while driving)          |
| --------------------------------------- | ------------------------------------- |
| "Offline map · Canterbury"              | "You are on the offline map" (6)      |
| "120 m" / "Turn right onto Harewood Rd" | "Turn right onto Harewood Road" (5)   |
| "My location"                           | "Show me where I am" (5)              |
| "Next stop"                             | "Take me to the next stop" (6)        |
| "The map could not load" / "Try again"  | "The map did not load, try again" (7) |

## 7. The accessibility

- The map itself is one image for a screen reader, with the label "The map of
  the run, 42 stops, the next one is 14 Harewood Road".
- Each marker is a button with the label "Stop 42, 14 Harewood Road,
  Papanui, next".
- The theme buttons are buttons with the label "Day map", "Night map" and
  "Contrast map", and the state "selected".
- The offline chip is a live region: it says when the map changes from
  online to offline.
- The attribution is text, never an image, so it is read out.
- At 200 % text the bottom controls grow and the attribution keeps its own
  line; the map itself does not change.
- The focus order: the map, the markers from the top of the screen down, the
  theme buttons, "My location", "Next stop".

## 8. The testIDs

| testID                                                       | Used by       |
| ------------------------------------------------------------ | ------------- |
| `map-screen`                                                 | `map.yaml`    |
| `courier-map`                                                | -             |
| `map-pack-status`                                            | -             |
| `map-attribution`                                            | -             |
| `map-theme-day`, `map-theme-night`, `map-theme-highContrast` | the unit test |
| `stop-marker-<sequence>`                                     | the unit test |
| `map-stop-sheet`                                             | -             |

## 9. The evidence

- `map-day.png`, `map-night.png`, `map-large.png`, `map-200.png` in
  `docs/evidence/design/`, compared against the night half of
  `Main.dc.html`.
