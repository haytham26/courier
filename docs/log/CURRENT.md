# CURRENT — the handoff

**Week:** 2026-W43. **Local `main` == `origin/main` == `76cdc02`.**

## Merged this session (each: merge commit → archive tag at the merge tip → branch deleted)

| PR | What | Tag |
|---|---|---|
| **#22** | the emulator boots with software GL (BUG-060) + the gate `scripts/ci/check-emulator-gpu.mjs` | `archive/fix/bug-052-emulator-swiftshader-gpu` |
| **#29** | the lead's five audit findings (BUG-053..BUG-057) | `archive/fix/audit-lead-findings` |
| **#24** | 09 Map style on the chosen tokens | `archive/feat/t6-09-map-style` |
| **#20** | 08 Route on the chosen tokens (the run as a timeline) | `archive/feat/t6-route` |
| **#28** | 11 Settings on the chosen tokens | `archive/feat/t6-11-settings` |
| **#15** | 06 Scan on the chosen tokens + the status precedence fix | `archive/feat/t6-scan` |

## Open, with their blockers

| PR | What | Branch | Blocker |
|---|---|---|---|
| **#30** | 10 Summary | `feat/t6-10-summary` @ `afc703b` | **BUG-062** |
| **#18** | 07 Copilot | `feat/t6-copilot` @ `6aaaf8a` | **BUG-061** |
| **#12** | the screen recordings | `feat/t6-recordings` | queued |

## The three open bugs, and what the next session starts with

- **BUG-062 (PR #30, the summary flow).** The tap on `today-end-of-day`
  COMPLETES and `summary-screen` never mounts, on both api legs, on every run,
  while every other flow in the same run passes. The app is proven right from
  three sides (the Today test asserts the navigation, the route is registered
  on the head the APK was built from, no crash in logcat), so the unknown is the
  runtime route resolution. **First experiment: deep-link it** -
  `adb shell am start -W -n com.courier.copilot/.MainActivity -d
  "courier:///summary"` - to see whether the route resolves at all.
- **BUG-061 (PR #18, the Copilot screen).** Four reds with two shapes: three
  runner deaths and one real `SIGSEGV`/gwp_asan death at cold start. The branch's
  diff is JS-only; if the SIGSEGV repeats with the same tombstone, bisect the
  APK.
- **BUG-060** is CLOSED and merged (the emulator boots with software GL; the
  gate keeps it that way).

## The trap that caught me this session, recorded once

**I force-pushed a branch that was already pushed** (`--force-with-lease` on
`feat/t6-10-summary`), which the rules forbid. Nothing was lost, but the rule
is the rule. The cause was **branch hygiene**: two commits landed on branches I
believed were `main`. Check `git branch --show-current` before every commit.

## Two real catches worth keeping

- **The scan screen's precedence**: `device === undefined` was checked before the
  reading, and the E2E emulator has `-camera-back none`, so the mock reader's
  answer could never show. The reader's answer now wins.
- **A screen nobody can open is dead code**: the summary route was never
  registered in the root `Stack`. Now registered, and
  `app/__tests__/routes.test.tsx` asserts it (a mutation check proved the test
  fails without it).

## Next items, in order

1. PR #30: follow BUG-062's first experiment; the flow's evidence is in the run
   logs, and the code side is proven.
2. PR #12 (the recordings), then PR #18 per BUG-061.
3. The remaining screens: 12 Driving at night, 13 Lock screen (the iOS parts
   stay PARTIAL), 01 Welcome, 02 Sign in.
4. Then the whole of `docs/plan/MASTER_EXECUTION.md` in its §4 order.

## The traps

- **Never use PowerShell `Add-Content`/`Set-Content`/`Out-File` on a tracked
  file** - it writes BEL/FF control bytes. Write with node or the edit tool, and
  run `node scripts/ci/check-control-chars.mjs` before every commit.
- **Rebuild the tokens before a local typecheck**:
  `node_modules/.bin/tsc -p packages/design-tokens/tsconfig.build.json`.
- **Run eslint after ADDING a file**, not only after editing one: the CI lint
  gate caught a generic call in a file I had never linted locally.
- **`git branch --show-current` before every commit.**
- Probes never live in the repo (PLAYBOOK §10): scratch goes in
  `C:\Users\DCL\AppData\Local\Temp\opencode`.
- The PowerShell console wraps `gh.ps1`'s output in error records; a push ending
  `Exited with code 1` may still have succeeded - read the output, then confirm
  with `gh run list`.
- Merging main into a PR that changed `docs/log/CURRENT.md` or the week log
  conflicts by design: take theirs.
- A jest test path containing `(tabs)` is a regex group: use
  `-c apps/mobile/jest.config.js` with a pattern without the parentheses.
- One E2E at a time; never push to a branch while its own E2E is queued.
- Merge commits only; archive tag at the merge tip before deleting the branch;
  no force-push, no rebase of pushed branches, never delete tags.

**FOUNDER_TODO (unchanged):** an Apple Developer account for the iOS build lane;
a real-device BUG-051 launch test.
