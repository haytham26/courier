# CURRENT — the handoff

**Week:** 2026-W43 (the full log is in `docs/log/2026-W43.md`)
**Branch:** `feat/t6-recordings` — the screen-recording workflow of the 13
screens (PR #12, this branch): ADR-008/P4 replaces `design-videos.yml`, and
the first dispatch can now record the REBUILT Today and the REBUILT Driving,
because main carries T6 steps 01–02 (`caf2ef4`, `d5793b4`). In parallel, PR
#14 (step 05 Delivered, `feat/t6-delivered`) is in review. After merge: ff
main.

## Where the company stands

| area | status | one line |
|---|---|---|
| P1 the Android E2E | HOW IT WORKS | the dual-image matrix (api 34 + 35) rides the gate; the first dual run (39915958261) was green on api-35 (the newer image does NOT hit the BUG-051 crash) and red on api-34 by an emulator GL flake with NO crash — the failed-leg rerun was GREEN, so #13 merged; every relaunch is counted in the run summary and an unknown crash signature stops the run immediately; a real-device test is FOUNDER_TODO |
| P2 the research | DONE | 24 areas; the Spoke analysis landed (`docs/research/competitors/spoke.md`) |
| P3 the map | PARTIAL | the modes, the styles, the builders in (`useMapBoot` is shared now); the Canterbury pack not built |
| P4 the design | T6 SLICE 3 | slices 1–2 in; step 01 Today MERGED (caf2ef4); step 02 Driving MERGED (d5793b4, the dual-api gate); step 05 Delivered in review (PR #14: the confirm + the run state above the stack); 06–13 next (per-screen PRs with the dual gate) |
| P5 the product | PARTIAL | sync done; the scanner camera, the POD, the dashboard, the billing not started |
| P6 the launch readiness | PARTIAL | the runbook, the checklist, StoreReady in; the deploy sits with the founder |
| The lint gate | DONE | 0 findings, no suppressions, at 30 suites (PR #5 and on) |

## The queue

1. This PR: the recording workflow (queue item 1) — main now carries the
   REBUILT Today and Driving, so the first dispatch records both against
   their references (light + dark, side-by-side per §13.8.7 + the Drive
   frame-time trace).
2. Slice 3 steps: 05 Delivered in review (PR #14 — the confirm + the run
   state above the stack); next to stage are 06 Scan (the camera), 07 Copilot
   (the transcript), 08 Route, then the smaller ones (09–13). Every step:
   components + tests + the E2E flow move, the evidence dir, the PR.
3. BUG-051 follow-ups (the founder): a real-device launch test when a device
   is available (FOUNDER_TODO); then the mitigation decision — warm
   `CookieManager` on the main thread at boot, or move the voice session
   start behind a user gesture, or replace the forwarded cookie handler (D33:
   recorded consequence edits only). The CI side is answered: api-35 does not
   hit the crash, and the api-34 leg is green after one rerun.
4. After the 13: delete the legacy token modules (`tokens.ts`, `themes*`,
   `directions*`) — the chosen file is the only one left. Nothing but that
   file stays.

## The traps

- `@courier/design-tokens/*` must be BUILT before the app gates (the app
  resolves from `dist/`); after any token edit: `pnpm filter design-tokens build`.
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
- A claim without a run in `docs/evidence/` is not done; this handoff stays
  short.
