# CURRENT — the handoff

**Week:** 2026-W43. **Local `main` == `origin/main` == `8b098e0`** (PR #21, the
backend runs/stops API, merged by the BACKEND session).

## The two PRs of this session, in queue order

| PR | What | Branch | State |
|---|---|---|---|
| **#24** | 09 Map style on the chosen tokens | `feat/t6-09-map-style` @ `f90b93d` | E2E running |
| **#22** | BUG-053: the emulator boots with software GL | `fix/bug-052-emulator-swiftshader-gpu` @ `9012fd4` | all checks green, merge after the review fixes are pushed |

## Open PRs of the previous sessions, in queue order

| PR | Screen | Branch | State |
|---|---|---|---|
| **#20** | 08 Route | `feat/t6-route` @ `b9a62d6` | waiting for #22 to merge in |
| **#18** | 07 Copilot | `feat/t6-copilot` @ `d8141e7` | waiting for #22 to merge in |
| **#15** | 06 Scan | `feat/t6-scan` @ `d408ce5` | waiting for #22 to merge in |
| **#12** | recordings | `feat/t6-recordings` | next |

## BUG-053 is FIXED (the emulator's GL mode), and the evidence is honest

The reds were never fleet contention: the nightly on `main` and PR #19's E2E were
green on the same workflow while PR #18 was failing. The workflow booted the
emulator with no `-gpu` flag, the emulator picked its own host GL mode, and the
headless runner lost it (`no first screen appeared in 90s` on the api-35 leg of
run 40077114264, `today-screen` asserting false on api-34). PR #22 adds
`-gpu swiftshader_indirect` (what `design-videos.yml` already used) plus the gate
`scripts/ci/check-emulator-gpu.mjs` in the floor job, and its run 40083028631 is
green on both legs with all 8 flows. **The GL chatter lines survive (10 in a
green run) and no flow dies**, so the brief's proof line is amended with the
evidence in `docs/status/BUGS.md` and recorded in
`docs/evidence/bug-053-emulator-gl/`. The solo experiment stays on the shelf for
the next red; no fleet-wide concurrency group, ever (the founder's instruction).

## Next items, in order

1. Push the review fixes on #22, then the merge ritual: `main` merged in first,
   then merge → `archive/<branch>` tag at the merge tip → delete the branch → ff
   main. #24 then follows the same ritual.
2. `main` merged into #15, #18 and #20 (so they carry the BUG-053 fix), each one
   at a time; the merge ritual as each goes green. Then PR #12.
3. The screens, each on its own branch from `main`, using
   `.maestro/common/reveal-and-tap.yaml` in every flow that taps inside the
   sheet: 10 Summary · 11 Settings · 12 Driving at night · 13 Lock screen (the
   iOS parts stay PARTIAL) · 01 Welcome · 02 Sign in.
4. The legacy token deletion, with proof.
5. Then the whole of `docs/plan/MASTER_EXECUTION.md` in its §4 order (§13.8 3D
   and motion, D34's sphere, §17.3's first run, §17.7, §17.7's automation,
   §18's company gaps, Part C on the app side). The BACKEND session owns
   `services/` only (the founder's brief, D37); the app and the docs are ours.

## The traps

- **Never use PowerShell `Add-Content`/`Set-Content`/`Out-File` on a tracked
  file** — it writes BEL/FF control bytes. Write with node or the edit tool, and
  run `node scripts/ci/check-control-chars.mjs` **before every commit**.
- **A jest test path with `(tabs)` in it is a regex group**: run jest with a
  pattern that avoids the parentheses (`jest map.test`, or
  `-c apps/mobile/jest.config.js`), or it finds no tests.
- The locale's PowerShell wraps `gh.ps1`'s output in error records: a push that
  ends with `Exited with code 1` has still succeeded — read the output, then
  confirm with `gh run list`.
- **Never push to a branch while its own E2E is queued;** one E2E at a time.
- A Maestro flow that was never run on the emulator is not proven.
- A `text` selector is a full-match regex — copy the app's exact string.
- Merge commits only; archive tag at the merge tip before deleting the branch;
  no force-push, no rebase of pushed branches, never delete tags.

**FOUNDER_TODO (unchanged):** an Apple Developer account for the iOS build lane;
a real-device BUG-051 launch test.
