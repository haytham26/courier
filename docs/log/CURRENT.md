# CURRENT — the handoff

**Week:** 2026-W43. Local `main` == `origin/main` == `b06b20e`.
**Merged this session:** PR #14 (05 Delivered, `da3ef19`), PR #16 (the audit allowlist), PR #17
(status + handoff).

## Open PRs, in queue order

| PR | Screen | Branch | State |
|---|---|---|---|
| **#15** | 06 Scan | `feat/t6-scan` @ `d408ce5` | flow fixed (3rd), **waiting for the BUG-052 solo run** |
| **#18** | 07 Copilot | `feat/t6-copilot` @ `d8141e7` | flow fixed (2nd), E2E re-running |
| **#20** | 08 Route | `feat/t6-route` @ `b9a62d6` | E2E red on the **fleet**, not on code (see below) |
| **#12** | recordings | `feat/t6-recordings` | next |
| **#19** | **the backend session's** routing solver | `feat/routing-solver` | **NOT MINE** |

## The fleet is the blocker (BUG-052)

Every E2E red this session has the same shape: **`launchApp` never completes** on the first one to
three flows (`DisplaySurfaceGlContextHelper context was preempted by others`, `Failed to restore
previous context: 12297`), then the emulator settles and the later flows pass. PR #20's run
`40074433462` is the proof it is not code: `compat`, `delivered` and `driving` all died at
`launchApp`, while `map`, `smoke` and `stops` (the Route screen I had just rewritten) **passed** in
the same run.

**Do not push to a branch while its own E2E is queued, and run E2E ONE at a time.** The founder's
solo experiment for #15 — `gh workflow run android-e2e.yml --ref feat/t6-scan` **only when
`gh run list --workflow android-e2e.yml --status in_progress` is empty** — is still untried. It is the
only experiment that can separate "fleet" from "image".

## DONE: the shared Maestro convention (founder's item 4)

`.maestro/common/reveal-and-tap.yaml` — **ONE** subflow for tapping a row inside Today's sheet
(raise the grabber → `scrollUntilVisible` → tap). It sits in `common/` on purpose: `run-all.sh`
discovers flows with a top-level glob (`.maestro/*.yaml`), so a subflow at the top level would be
executed on its own and fail. `scan.yaml` (the flow that learned the contract on both legs) and
`copilot.yaml` (the flow that then hit the identical trap) both ride it via `runFlow` with
`env: TARGET:`. **Every remaining flow that taps inside the sheet must use it.**

## Next items, in order

1. **The BUG-052 solo run** for #15 (above), then the merge ritual for #15, #18 and #20 as they go
   green (merge commit → `archive/<branch>` at it → delete the branch → ff main).
2. **PR #12** — merge `main` in, then the recordings and the E2E one workflow at a time.
3. **The screens**, each on its own branch from `main`, `origin/main` merged in before the PR:
   09 Map style (`(tabs)/map.tsx` — 669 lines, still on the LEGACY theme; the real modules
   `viewModes` / `offlinePack` / `styles` already exist, so it is a re-skin plus the reference's mode
   sheet with its four descriptions, not new map logic) · 10 Summary · 11 Settings ·
   12 Driving at night · 13 Lock screen (Android built + E2E-tested; **iOS Live Activity stays
   PARTIAL** — FOUNDER_TODO needs an Apple developer account for a build lane) · 01 Welcome ·
   02 Sign in (neither is rebuilt on the chosen tokens — only the legacy `(auth)/login` + `register`
   are on main).
4. **The legacy token deletion**, with proof.
5. **§17.3, §17.7, §18, Part C** on the app side.

## The traps

- **Never use PowerShell `Add-Content`/`Set-Content`/`Out-File` on a tracked file** — it writes
  BEL/FF control bytes (a word-initial `a` or `f` collapsing). It has done so 4+ times this session.
  Write with node (`fs.writeFileSync`, utf8, no BOM) or the edit tool, and run
  `node scripts/ci/check-control-chars.mjs` **before every commit**.
- **Never commit to `main`** — commit to the branch you are pushing. That cost two recovery steps.
- A Maestro flow that was never run on the emulator is not proven: a first run is when
  below-the-fold rows and not-yet-answered statuses surface.
- A `text` selector is a full-match regex — copy the app's exact string, never retype it.
- `braces` no longer produces a high/critical advisory; its allowlist entry is kept and still dated.
- Push with the output on screen, and confirm the runs with `gh run list --branch <branch>`.

**FOUNDER_TODO (unchanged):** an Apple Developer account for the iOS build lane; a real-device
BUG-051 launch test.
