# CURRENT — the handoff

**Week:** 2026-W43 (the full log is in `docs/log/2026-W43.md`)
**Branch:** `feat/t6-screens` — T6 slice 3 ("the 13 screens"), step 01 Today
(plus the `/scan` surface and the shared map boot) in review as a PR. Merge:
`gh pr merge --merge` when green, `archive/feat/t6-screens` tag at the tip,
delete the remote branch, ff main.

## Where the company stands

| area | status | one line |
|---|---|---|
| P1 the Android E2E | RERUN | BUG-049 verified on device (compat green, the full dock in the a11y dump; run 39904905360); the flow fix (BUG-050, the grabber raise) and the gate's relaunch-once (BUG-051, the image's Chromium race on run 39905489019) are pushed together; the fresh deciding run carries both |
| P2 the research | DONE | 24 areas; the Spoke analysis landed (`docs/research/competitors/spoke.md`) |
| P3 the map | PARTIAL | the modes, the styles, the builders in (`useMapBoot` is shared now); the Canterbury pack not built |
| P4 the design | T6 SLICE 3 | slices 1–2 in; step 01 Today in review; 02–13 next (per-screen PRs with the dual gate) |
| P5 the product | PARTIAL | sync done; the scanner camera, the POD, the dashboard, the billing not started |
| P6 the launch readiness | PARTIAL | the runbook, the checklist, StoreReady in; the deploy sits with the founder |
| The lint gate | DONE | 0 findings, no suppressions, at 30 suites (PR #5 and on) |

## The queue

1. The screen-recording workflow of the 13 screens (light + dark,
   side-by-side emulator-vs-reference per §13.8.7 + the Drive frame-time
   trace), replacing `design-videos.yml` in the same PR as its first run.
2. Slice 3 steps: 04 Driving (TurnCard + slide over the map), 05 Delivered,
   06 Scan (the camera), 07 Copilot (the transcript), 08 Route, then the
   smaller ones (09–13). Every step: components + tests + the E2E flow move,
   the evidence dir, the PR.
3. After the 13: delete the legacy token modules (`tokens.ts`, `themes*`,
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
