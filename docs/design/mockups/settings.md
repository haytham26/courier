# The settings

The settings of the app. No mockup: the screen follows the token package.

## 1. The job

Let the courier change the three things that matter while driving - the
theme, the voice and the haptics - and reach the diagnostics.

## 2. The layout

| Part            | Content                                                      | Size              |
| --------------- | ------------------------------------------------------------ | ----------------- |
| Title           | "Settings"                                                   | 34 pt             |
| Appearance      | The theme choice: Day, Night, High Contrast                  | 19 pt, 56 pt tall |
| Voice Assistant | Voice Commands, Driving Mode, Auto Navigate, Haptic Feedback | 20 pt / 17 pt     |
| Earbud Controls | The four shortcuts: 1x, 2x, 3x and hold                      | 20 pt / 17 pt     |
| Data and Sync   | Sync Now, Offline Maps, Clear Cache                          | 20 pt / 17 pt     |
| Diagnostics     | Compatibility                                                | 20 pt / 17 pt     |
| About           | The version, the build, the voice engine, the maps, the sync | 19 pt             |
| Danger Zone     | Reset All Data, Sign Out                                     | 19 pt             |

The sections are cards on the surface of the theme. The settings are grouped
so that the three that matter while driving are at the top.

## 3. The states

| State        | What the courier sees                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading      | The settings are on the device, so there is no loading state. If a setting comes from the server, its row shows a skeleton line until it arrives.                   |
| Empty        | Not applicable: the settings never have an empty state.                                                                                                             |
| Error        | A setting that could not be saved says "Could not save this" under the row, with the action "Try again". The rest of the screen keeps working.                      |
| Offline      | Every setting except the account one works offline. The chip says "Offline · your settings are on this phone".                                                      |
| Partial sync | The chip with "retry" and the count of the settings that are waiting.                                                                                               |
| Permission   | The microphone permission is asked for the first time the voice is used, not here. The row says "Voice Commands" and the switch; the system asks when it is needed. |

## 4. Day and night

- The settings follow the theme like every other screen: the paper, the
  cards and the ink of the three palettes.
- The theme choice is a radio group. The chosen one has the accent border
  and the accent icon; the others have the border of the theme. The choice
  is never colour-only: the name is written next to the icon.
- The switches use the accent of the theme when they are on, so the state is
  carried by the switch position as well as by the colour.

## 5. The motion

| What               | How                                                                                      | How long |
| ------------------ | ---------------------------------------------------------------------------------------- | -------- |
| A switch is turned | The knob moves                                                                           | 150 ms   |
| The theme changes  | The screen repaints in the new theme                                                     | 200 ms   |
| A row is pressed   | The fill fades by 12 %                                                                   | 150 ms   |
| Less motion        | The switch still moves, it does not jump across the screen. The theme change is instant. | 0 ms     |

No movement on the scroll.

## 6. The copy

| On the screen                         | Voice prompt (while driving)      |
| ------------------------------------- | --------------------------------- |
| "Theme" / "Day, Night, High Contrast" | "Turn on the night mode" (5)      |
| "Voice Commands"                      | "Turn the voice commands off" (5) |
| "Driving Mode"                        | "Turn the driving mode on" (5)    |
| "Haptic Feedback"                     | "Turn the vibration off" (4)      |
| "Sync Now"                            | "Sync my run" (3)                 |
| "Compatibility"                       | "Check the phone" (3)             |
| "Reset All Data"                      | "Erase everything" (2)            |
| "Sign Out"                            | "Sign out" (2)                    |

## 7. The accessibility

- The theme choice is a radio group: every option is a `radio` with the state
  "selected" and the label "Day", "Night" or "High Contrast".
- Every switch names the setting it turns on or off, with a hint that says
  what it does: "Vibrate when a voice command is understood".
- The three data rows are buttons with a label and a hint: "Sync Now - Syncs
  the run with the server".
- The earbud rows are read as one sentence: "1x press, Mark Delivered.
  Confirm the delivery at the current stop".
- The icons are decorative next to a label, so they are hidden from the
  screen reader.
- The focus order is the reading order of the sections.
- At 200 % text a row grows to two or three lines, the switch stays 56 pt
  wide, and nothing is clipped.
- The "Danger Zone" is last and its actions are outlined buttons with the
  error colour, so they are not mistaken for the primary action.

## 8. The testIDs

| testID                                                                                           | Used by       |
| ------------------------------------------------------------------------------------------------ | ------------- |
| `settings-screen`                                                                                | -             |
| `settings-theme-day`, `settings-theme-night`, `settings-theme-highContrast`                      | -             |
| `settings-voice-commands`, `settings-driving-mode`, `settings-auto-navigate`, `settings-haptics` | -             |
| `settings-sync-now`, `settings-offline-maps`, `settings-clear-cache`                             | -             |
| `settings-compat`                                                                                | `compat.yaml` |

## 9. The evidence

- `settings-day.png`, `settings-night.png`, `settings-large.png`,
  `settings-200.png` in `docs/evidence/design/`.
