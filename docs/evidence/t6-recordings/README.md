# Evidence — T6 slice 3: the screen-recording workflow (the 13 screens)

What this step is: the runner of the §13.8.7 dual gate — the workflow that
produces, for every rebuilt screen, the emulator recording beside its
reference in light AND dark, plus the frame-time files the motion tokens
tune against (ADR-008 §4: the tuning lands in that file, never in a
screen). It replaces `design-videos.yml` in this same PR: the ten
directions are history the founder keeps read-only; the 13 chosen screens
are the product.

## The deliverables

| Area | Where |
|---|---|
| The workflow | `.github/workflows/screen-recordings.yml` (PR + dispatch; the build job is the E2E recipe; the record job boots the emulator with the animations ON — the recording is the evidence of the motion) |
| The keeper | `.maestro/recordings-run.sh` (per flow two passes — light and dark via `adb shell cmd uimode night`, the way a courier flips the phone — mp4 + final screencap + frame stats per pass, then the composition) |
| The first flow | `.maestro/recordings/03-today.yaml`: the sheet's three levels (grabber pan up, up, down, down) settling at peek, the state the reference shows; every screen PR adds its own flow, named after its reference |
| The deletion | `.github/workflows/design-videos.yml` (its old header recorded the founder's note; ADR-008/P4 sanctions the replacement in the same PR) |

## What lands in the artifact (`screen-recordings`)

| File | What it is |
|---|---|
| `NN-<slug>-light.mp4` / `-dark.mp4` | the screenrecord of each pass |
| `NN-<slug>-light.png` / `-dark.png` | the final screencap (the resting state, two s after the last spring) |
| `NN-<slug>-light-beside.png` / `-dark-beside.png` | the screencap beside the reference render (Chromium at 390×844), equal heights |
| `fps-NN-<slug>-light.txt` / `-dark.txt` | `dumpsys gfxinfo framestats`; the Drive slice's §13.8.7 trace when the driving flow lands |

The night driving has its own reference: the dark pass of the driving flow
composes against `12-driving-night.png` (the alias lives in the keeper
script, next to the case that names it).

## The first run

Pending by design: the workflow dispatches on this branch after PR #11 (the
rebuilt Today, `feat/t6-screens`) merges and main is merged in — the first
run then records the REBUILT screen, which is what the side-by-side has to
show. The rows below fill with the run id, the artifact and the verdict.

| Run | Verdict |
|---|---|
| — | pending |
