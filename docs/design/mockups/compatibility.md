# The compatibility screen

The diagnostics screen: it says which native modules of the phone are alive.
It is reached from the settings.

## 1. The job

Tell a courier, or a support agent on the phone, exactly which parts of the
app work on this phone - without a developer, a log file or a computer.

## 2. The layout

| Part                 | Content                                       | Size                  |
| -------------------- | --------------------------------------------- | --------------------- |
| Title                | "Compatibility"                               | 28 pt                 |
| One row per module   | The name of the module, the state, the detail | 20 pt / 17 pt / 17 pt |
| The state of the run | "running" or "done"                           | 17 pt                 |

The six modules are the ones the product depends on:

| Module                       | What it proves                                                     |
| ---------------------------- | ------------------------------------------------------------------ |
| sherpa-onnx (STT/TTS)        | The on-device speech engine is linked                              |
| VisionCamera                 | The camera module is linked and the permission was read            |
| MapLibre v11 + PMTiles       | The map and the offline tiles are linked                           |
| op-sqlite (SQLCipher + FTS5) | The encrypted event log works: a row is written and read back      |
| expo-audio (record/play)     | The microphone and the speaker work                                |
| Reanimated 4                 | The movement engine is alive: a value is animated on the UI thread |

The state of a row is one word: `pending`, `running`, `ok`, `skipped` or
`failed`. A module that cannot be exercised in this environment reports
`skipped` with the reason. It never reports a false `ok`.

## 3. The states

| State        | What the courier sees                                                                                                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading      | Every row starts at `pending` and moves to `running` as the check starts. The state of the run at the bottom says "running".                                                                               |
| Empty        | Not applicable: the six modules are always there.                                                                                                                                                          |
| Error        | A module that fails shows `failed` and the reason in one line: "the sherpa-onnx native module is not linked". The other rows keep their own state: one broken module does not hide the rest.               |
| Offline      | Not applicable: the screen never touches the network. It says so at the bottom: "This screen does not need a connection".                                                                                  |
| Partial sync | Not applicable.                                                                                                                                                                                            |
| Permission   | The camera and the microphone rows say what happened: "permission granted: true, devices: 2" or "recording permission not granted (denied)". The next step is the system setting, and the screen names it. |

## 4. Day and night

- The screen follows the theme: the paper, the ink and the state colours.
- The state colours are the status colours of the theme: the green for
  `ok`, the red for `failed`, the amber for `skipped`, the secondary ink for
  `pending` and `running`. Every one of them clears 4.5:1 on the paper of
  its theme.
- The state is never colour-only: the word is always there next to the
  colour.

## 5. The motion

| What                 | How                                    | How long |
| -------------------- | -------------------------------------- | -------- |
| A row changes state  | The word changes in place, no movement | -        |
| The Reanimated probe | A small block fades from 40 % to 100 % | 250 ms   |
| Less motion          | The probe appears at once.             | 0 ms     |

The probe is the only movement on the screen, and it is the proof that the
movement engine is alive.

## 6. The copy

| On the screen                                 | Voice prompt (while driving)          |
| --------------------------------------------- | ------------------------------------- |
| "Compatibility"                               | "Check the phone" (3)                 |
| "sherpa-onnx (STT/TTS): ok"                   | "Check the voice engine" (4)          |
| "the sherpa-onnx native module is not linked" | "The voice engine is not working" (6) |
| "running" / "done"                            | -                                     |

The detail line is a plain sentence. No stack traces, no error codes, no
"unknown".

## 7. The accessibility

- Every row is one accessible element with the whole story in its label:
  "sherpa-onnx (STT/TTS): ok". A screen reader reads the module and its
  state together, so the state is never separated from the name.
- The state of the run is a live region (`accessibilityLiveRegion="polite"`),
  so a screen-reader user hears when the checks are finished.
- The probes are decorative and are hidden from the screen reader.
- The focus order is the reading order of the rows.
- At 200 % text a row grows to three lines and the detail wraps. Nothing is
  clipped, and the state word stays on its own line.
- The screen is a support tool, so the copy is written for a person reading
  it over the phone: short sentences, no jargon.

## 8. The testIDs

| testID                                                                                                      | Used by                    |
| ----------------------------------------------------------------------------------------------------------- | -------------------------- |
| `compat-screen`                                                                                             | `compat.yaml`              |
| `compat-row-<module>`                                                                                       | -                          |
| `compat-sherpa`, `compat-camera`, `compat-maplibre`, `compat-opsqlite`, `compat-audio`, `compat-reanimated` | `compat.yaml`              |
| `compat-<module>-detail`                                                                                    | -                          |
| `compat-running`                                                                                            | `compat.yaml`              |
| `compat-reanimated-view`, `compat-audio-view`                                                               | -                          |
| `settings-compat`                                                                                           | `compat.yaml` (the way in) |

## 9. The evidence

- `compat-day.png`, `compat-night.png` in `docs/evidence/design/`, and the
  `b7-compat` screenshot of the Maestro flow.
