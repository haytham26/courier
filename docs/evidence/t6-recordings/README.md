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

The run that rode the pull_request trigger of the PR itself (before the
merge of PR #11) was the plumbing's first ride: the BUILD (the same E2E
recipe) succeeded, all quality gates green, and the render step produced
the reference PNGs at 390×844 (14 references, the Chrienium wait visible
in the log). Two defects were read out of its failure:

| Run | Verdict |
|---|---|
| The E2E on the same tree | RED at the readiness gate, not a flow: the emulator image's own Chromium SIGTRAPs the app 5 s into a cold launch (`libmonochrome` through the WebView factory, run 39905489019, the crash buffer in the artifact) — recorded as BUG-051; the gate gains a relaunch-once when the process dies mid-wait (the run-all.sh of the OTHER branch carries it). The app TREE here is green-on-main; the code is innocent. |
| 39905489120 (the recording job) | RED before a single frame: the `Boot the emulator` step ran without the `script` input the runner action REQUIRES (`Input required and not supplied: script`). Fixed with this commit: the Maestro install, the APK, its grants and the keeper all move INTO the boot script (the PATH export lands before maestro is called; `$GITHUB_PATH` only lands between steps). |
