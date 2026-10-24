# CURRENT — the handoff

**Week:** 2026-W43 (the full log is in `docs/log/2026-W43.md`)
**Branch:** `feat/t6-scan` — step 06 Scan, stacked on the 05 tip and carrying
it (the parent's tips are merged in through `e7ddb18`), so this PR opens clean
on main once #14 lands. Its 06 work is complete and pushed (`a645093`, the
docs-evidence fix): the real camera, the honest reader seam, the van load, the
CAMERA permission, `.maestro/scan.yaml`, the evidence sheet, all home gates
green (tokens 1860, app 442/442 over 39 suites, eslint 0), and the PR body is
drafted (`C:\Users\DCL\AppData\Local\Temp\opencode\pr15-body.md`).

**PR #14 (05 Delivered, `feat/t6-delivered` at `8750f1b`): ALL FOUR GATES
GREEN on the deciding push** — CI `40036866692`, Quality `40036866792`, CodeQL
`40036866867`, and E2E `40036866832` success on BOTH api legs. Three red runs
were triaged to two REAL causes, both fixed in the app (never the flows): the
flights are recorded in W43 — the flows asserted the bare street while the
confirm renders the street with its minute (the asserts were fixed and
STRENGTHENED, minute-shaped), and the slide had two false gates (the release
velocity, then the end event beating the updates on a busy device; the
delivery is the thumb at the end of the travel, reading the further of the
thumb and the end event's translation). The merge ritual has NOT been run —
the session stopped here at the founder's request after the close-out pushes.
The next session starts it: `gh pr merge 14 --merge`, tag
`archive/feat/t6-delivered` at `8750f1b`, delete the remote branch, ff main.

**PR #12 (recordings, `feat/t6-recordings` at `5f5b07a`, in sync):** its first
recordings run (`39963017224`) failed BOTH modes of `03-today.yaml` on a REAL
app bug this session found and fixed — at `full` the sheet's card top landed
23 dp above the 640 dp window and took the grabber (the one handle that
changes the level) off the a11y tree; the `full` height is now capped by the
usable height, with the regression test proven to catch it (`Received: -23`
with the cap removed). Its first E2E (`39963017321`) was the same-window
fleet sharing plus the slide's false gates, both fixed. Next for #12, after
#14 merges: merge main in (the sheet and slide fixes ride main), rerun the
recordings and the E2E separately, one workflow at a time.

**The two advisory catch-ups (both the gate's own mechanisms, recorded in
W43):** `zod` ACCEPTED (build-time only, `@expo/cli`'s own dep, no patched
version on the pinned expo line) and `filelock` CONSTRAINED
(`[tool.uv] constraint-dependencies`, the certifi pattern) because a patch
exists — forcing litellm 1.106.0 → 1.103.7, which the api's suite (160 passed,
run here in the new tree) proved safe.

**Session close (2026-10-24, on the founder's request):** every local branch
with work is pushed. The three active branches pushed clean ("Everything
up-to-date": `feat/t6-delivered` at `8750f1b`, `feat/t6-scan` at `a645093`,
`feat/t6-recordings` at `5f5b07a`). Two old branches with unique commits were
pushed as NEW remote branches: `feat/b.3-navigation-tests` (2026-10-19: the
original jest setup + navigation tests, 2 commits not in main) and
`feat/b.4-voice-module` (5 commits, b.3's plus the voice-module's). Their
approach was superseded by the T-phases (the suites are rewritten under
`apps/mobile/app/__tests__`, 39 suites / 442 tests), so no PRs were opened —
the work is preserved on the remote, and the record says why. Every other
local branch is an ancestor of `origin/main` (its remote was deleted by the
merge ritual), and local `main` is behind `origin/main` with nothing
local-only. W43 stands at 48 entries.

## Where the company stands

| area | status | one line |
|---|---|---|
| P1 the Android E2E | HOW IT WORKS | the dual-image matrix (api 34 + 35) rides the gate; PR #13's deciding runs were green on both legs (api-35 first try, api-34 after one flake rerun); PR #14's first E2E went red by a REAL contract break in the 05 diff (the flows vs the address-with-minute line - fixed, the rerun decides); BUG-051's guard rides only the KNOWN signature, every relaunch is counted, a real-device test is FOUNDER_TODO |
| P2 the research | DONE | 24 areas; the Spoke analysis landed (`docs/research/competitors/spoke.md`) |
| P3 the map | PARTIAL | the modes, the styles, the builders in (`useMapBoot` is shared now); the Canterbury pack not built |
| P4 the design | T6 SLICE 3 | slices 1–2 in; step 01 Today MERGED (caf2ef4); step 02 Driving MERGED (d5793b4); step 05 Delivered ALL FOUR GATES GREEN (PR #14 at `8750f1b`, awaiting the merge ritual); step 06 Scan complete on `feat/t6-scan` (opens as PR #15 after #14); 07–13 next (per-screen PRs with the dual gate) |
| P5 the product | PARTIAL | sync done; the scanner camera, the POD, the dashboard, the billing not started |
| P6 the launch readiness | PARTIAL | the runbook, the checklist, StoreReady in; the deploy sits with the founder |
| The lint gate | DONE | 0 findings, no suppressions, at 30 suites (PR #5 and on) |

## The queue

1. The screen-recording workflow of the 13 screens (light + dark,
   side-by-side emulator-vs-reference per §13.8.7 + the Drive frame-time
   trace), replacing `design-videos.yml` in the same PR as its first run —
   PR #12 in review. Its first run red was TWO things, both handled: the
   recordings failure was the full-sheet grabber going off the top of the
   640 dp window (fixed on the parent tips, the regression test pins the
   emulator's window); its first E2E was the same-window fleet sharing plus
   the slide's false gates (both fixed). After #14 merges: merge main into
   `feat/t6-recordings`, rerun the recordings and the E2E separately, one
   workflow at a time.
2. Slice 3 steps: 05 Delivered GATES GREEN (PR #14 at `8750f1b`; the merge
   ritual is the next session's first act); 06 Scan complete on
   `feat/t6-scan` at `a645093` (the camera, the reader seam, the van load,
   the flow and the permission; the PR body drafted) — open PR #15 the
   moment #14 merges; then 07 Copilot (the transcript), 08 Route, then 09–13.
   Every step: components + tests + the E2E flow move, the evidence dir, the
   PR.
3. BUG-051 follow-ups (the founder): a real-device launch test when a device
   is available; then the mitigation decision once the api-35 leg has run -
   warm `CookieManager` on the main thread at boot, or move the voice
   session start behind a user gesture, or replace the forwarded cookie
   handler (D33: recorded consequence edits only).
4. After the 13: delete the legacy token modules (`tokens.ts`, `themes*`,
   `directions*`) — the chosen file is the only one left. Nothing but that
   file stays.

## The traps

- `@courier/design-tokens/*` must be BUILT before the app gates (the app
  resolves from `dist/`); after any token edit: `pnpm filter design-tokens build`.
- The camera: the LIBRARY declares only the camera feature — the app declares
  `CAMERA` in `app.json`'s `android.permissions` (prebuild generates
  `apps/mobile/android/`, which is GITIGNORED: a native-file edit under
  `apps/mobile/android` never ships) and the gate grants it (run-all.sh).
  VisionCamera 5.2.3's own object scanner is iOS-only; Android's reading is an
  ML Kit text-recognition plugin (its own slice), so
  `src/scans/labelReader.ts` is the seam with the mock (E2E build) and the
  honest `unavailable` camera reader. The native `Camera` takes no `testID`
  (props pick style/onLayout/pointerEvents/nativeID) and 5.2.3 exposes no
  `onError` — a missing device is a quiet dark feed, never an invented crash
  line.
- The tab slots keep the flows' testIDs: `tab-stops`, `tab-map`,
  `tab-settings`; the Today route's slot is `tab-today` (was `tab-home`).
- The screens may reach the chosen tokens only through
  `@courier/design-tokens/chosen`; the legacy `themes` styling is off limits
  in new UI (the map's style builder still speaks the old ThemeName — that
  is its own domain).
- jest-expo treats every `.ts(x)` in `__tests__` directories as a suite:
  helpers go beside them, never inside.
- Reanimated 4 house pattern: one transform key per animated style, no deps
  arrays, static Skia props.
- The D33 gate never weakens: a change edits the tokens and the record's
  reason, never the bar.
- A Maestro `text` selector is a FULL-MATCH regex (docs.maestro.dev,
  how-to-use-selectors): a screen line that gains a suffix ("45 Papanui
  Road, 14:00") breaks every flow that asserted the old bare string, and the
  fix is to assert the element with a minute-shaped regex - never to delete
  the assert, never to weaken it to a substring.
- The slide (`SlideToDeliver`) delivers on the THUMB AT THE END of the travel
  and nothing else. Two false gates are gone: the release velocity (a paused
  drag delivered nothing, run 40000405667) and the thumb's own value alone
  (RNGH's end event can be processed BEFORE the updates on a busy device, so a
  courier's slide silently delivered nothing, run 40025796086) - the delivery
  now reads the further of the thumb and the end event's translation, and a
  short drag still fails the threshold either way. A red step right after
  `waitForAnimationToEnd` means the gesture missed, not that the app crashed
  (check the crash buffer first).
- The sheet's `full` height is capped by the USABLE height (window - dock inset
  - the grabber's 24 dp), not by its 0.88 fraction: 0.88 of the CI emulator's
  640 dp window plus the 100 dp dock inset is 663 dp, which lands the card's
  top 23 dp ABOVE the window and takes the grabber (the one handle that
  changes the level) off the a11y tree with it. The regression test pins the
  emulator's 320x640 window, because the jest default window is taller and the
  cap would never bind there.
- Two advisory catch-ups in one day, handled by the gate's own rules: zod is
  ACCEPTED (build-time only, `@expo/cli`'s own dep, no patched version on the
  pinned expo line); filelock is CONSTRAINED (`tool.uv`
  constraint-dependencies, the certifi pattern) because a patch exists - and
  the constraint forces litellm 1.106.0 down to 1.103.7 (1.106.0 pins
  `filelock<4`), which the api's suite (160 passed) proved safe.
- Two 2-runner emulator E2E workflows in one window share the fleet (the api
  legs' GL preempts, flows freeze or die at `launchApp`): run one E2E at a
  time and rerun one leg at a time, per PLAYBOOK §1.
- A claim without a run in `docs/evidence/` is not done; this handoff stays
  short.
