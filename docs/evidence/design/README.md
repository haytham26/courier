# Design evidence — the visual-regression baselines

**Step:** PARITY row 187 / T6 / T3.3, BUG-203 (2026-11-07). The screenshots
stay in our CI and in this repository; no vendor ever sees a courier's screen.

## What is committed

`baselines/` holds the approved emulator captures, one PNG per screen and
view, named `<screen>-<day|night>-<small|large>[-<n>pct].png`, plus
`manifest.json`: every baseline entry carries its sha256, its dimensions and
its **source** (the CI run, the artifact, the flow and the uimode it was
captured with), so a baseline is evidence, not a blob. `pending` entries are
the views the CI matrix does not capture yet — they are listed, never silently
skipped.

Today: 4 baselines (screens `03-today` and `04-driving`, day and night, on
the small 320×640 AVD, captured by the screen-recordings workflow run
42353916218's re-run, artifact `screen-recordings` #13567763595, head
`9119687`) and 8 pending views (large screen, 200 % text, per screen).

## The gate

```
node scripts/ci/check-visual-baselines.mjs                  # verify the committed baselines (sha256, decodes, dimensions)
node scripts/ci/check-visual-baselines.mjs --fresh <dir>    # compare fresh captures against them; exit 1 on regression
node scripts/ci/check-visual-baselines.mjs --fresh <dir> --update --source "run <id> artifact <name>" [--allow-new]
```

The comparison is per-pixel over R, G, B with a per-channel tolerance of 8/255
and a maximum of 0.5 % of pixels differing; a dimension change is always a
regression. There is no image library in this workspace, so the PNG codec is
in the script itself (8-bit non-interlaced RGB/RGBA, all five scanline
filters — what `adb shell screencap -p` writes). Exit codes: 0 pass, 1 fail,
2 misuse. The tests (`scripts/ci/__tests__/check-visual-baselines.test.mjs`,
10 tests) build their fixtures with the script's own encoder.

## The determinism measurement (B8)

The gate's tolerance is only honest if the same view captured twice is the
same picture. Measured on the pinned emulator image (MAESTRO cli-2.11.0,
EMULATOR_BUILD 16632760, google-apis x86_64), two independent green runs —
42350703397 (head `8ac875b`) and the 42353916218 re-run (head `9119687`) —
compared with the gate itself (`--fresh` over the first run's captures
against the second run's baselines):

| view | pixels differing | percentage |
|------|------------------|------------|
| 03-today day small   | 4693 / 3 686 400 | 0.127 % |
| 03-today night small | 6866 / 3 686 400 | 0.186 % |
| 04-driving day small   | 3092 / 3 686 400 | 0.084 % |
| 04-driving night small | 2847 / 3 686 400 | 0.077 % |

All four under the 0.5 % gate; the residual is the status-bar clock and the
greeting/time-of-day line, which change between runs by nature. The full B8
protocol — the same view 20 times on the same emulator image, counting the
diff rate, gate blocking only at a measured zero false-positive rate — needs
the CI lane to run it (wiring lives in `.github/`, platform-owned); until
then this gate is run per PR by hand over the screen-recordings artifact and
the 2-run measurement above is its calibration evidence.

## Capturing the pending views

The screen-recordings AVD is the small one (320×640 logical, 1440×2560 device
px). The remaining cells of the matrix are captured on the CI emulator with
the same flow and these device settings:

- **large screen**: a second AVD with a larger profile (e.g. 1080×2400
  logical), same system image pins — one `avdmanager create avd` in the
  workflow, same `recordings-run.sh` loop.
- **200 % text**: the same small AVD with `adb shell settings put system
  font_scale 2.0` before the flow and `font_scale 1.0` after (the app's
  `maxFontSizeMultiplier` caps apply per control; the capture proves them).
- **day/night**: `adb shell cmd uimode night yes|no` around the flow, exactly
  as `recordings-run.sh` already does.

A capture becomes a baseline only through `--update --source …` in a PR that
names the run — the manifest then carries that run, so a re-baseline is a
reviewed event, not a silent overwrite.
