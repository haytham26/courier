# CURRENT — the handoff

**Week:** 2026-W43. **Local `main` == `origin/main` == `c7e6894`. Lead session 5, 2026-10-25 into 2026-10-26.**

## Merged this session (each: merge commit → archive tag → remote branch deleted, verified with `git ls-remote`)

| PR | What | Tag |
|---|---|---|
| **#22** | the emulator boots with software GL (BUG-060) + the gate `scripts/ci/check-emulator-gpu.mjs` | `archive/fix/bug-052-emulator-swiftshader-gpu` |
| **#29** | the lead's five audit findings (BUG-053..BUG-057) | `archive/fix/audit-lead-findings` |
| **#24** | 09 Map style on the chosen tokens | `archive/feat/t6-09-map-style` |
| **#20** | 08 Route on the chosen tokens | `archive/feat/t6-route` |
| **#28** | 11 Settings on the chosen tokens | `archive/feat/t6-11-settings` |
| **#15** | 06 Scan + the status precedence fix | `archive/feat/t6-scan` |
| **#32** | 12 Driving at night | `archive/feat/t6-12-driving-night` |
| **#41** | the slide's decision = the gesture's final translation (PLAYBOOK §12) | `archive/fix/slide-decision-final-translation` |
| **#45** | the three exp/ experiments recorded in BUGS.md, their archive tags pushed and their branches deleted | `archive/chore/exp-branch-archive` |
| **#47** | the session-5 handoff in CURRENT.md | `archive/chore/current-handoff` |
| **#37** | the emulator gets 6 GB and 4 cores (its E2E was green on both legs twice) | `archive/fix/e2e-emulator-memory` |

**The merge ritual now ends at `git ls-remote --heads origin <branch>` printing nothing** — `git branch -d` only removed the local copy, and seven branches were still on GitHub after I reported them deleted.

**#49 is NOT merged.** Its state is true here: `origin/fix/e2e-determinism` is at **42b1519**, it is still OPEN, `archive/fix/e2e-determinism` does not exist, and its E2E is green on the PR head (40226628482, both legs) and on a workflow_dispatch on that same head (40238632194) — but the head moved twice afterwards (main merged in, then the BUG-064 to BUG-065 collision renumber), so **the second proof must be re-run on 42b1519 before it merges**. The renumber: the backend squad filed BUG-064 for the map-pack workflow firing on a feature push, so the E2E determinism bug is **BUG-065** and every reference to it moved with it, the collision recorded like the BUG-053 one.

## Open, with their state

| PR | What | State |
|---|---|---|
| **#40** | 13 Lock screen | both legs red on the OLD sphere (cut from main before the sphere fix) |
| **#42** | 01 Welcome | gates running |
| **#12** | the recordings | api-34 red on the OLD sphere (same cause as #40) |
| **#36** | the failure-dump runner | api-34 red on the OLD sphere |
| **#37** | the emulator gets 6 GB + 4 cores | main merged in (carries the slide fix), gates running |
| **#18** | 07 Copilot + the sphere lifecycle fix | green on the quality gates; its last E2E died on the adb daemon (§11 noise) |
| **#30** | 10 Summary (BUG-062) | **api-35 GREEN** (the provider fix proven), api-34 red on the OLD sphere |

**The one dependency that matters: everything red on the OLD sphere goes green with `feat/t6-copilot` merged.** The root-cause fix (the animations cancelled on unmount, the Skia tree built once) is proven by the scratch experiment `exp/bug-061-live-sphere`: 28 minutes with the live sphere FORCED on the emulator and no SIGSEGV, where the with-sphere runs produced it. The remaining reds are the emulator's adb-daemon instability (§11 names the noise; PR #37 gives the emulator the RAM and cores).

## The bugs and their state

- **BUG-060** closed and merged: the emulator boots with software GL, and the gate keeps it that way. Renumbered past the backend audit's BUG-053; both rows are kept and the collision is recorded.
- **BUG-061** (the sphere's memory bug) — the founder's correction: it is a gwp_asan `GuardedPoolAllocator::deallocate` (a double/invalid free in how the sphere uses Skia), not only a GL problem, and it can hit real devices. The cause is fixed; the emulator fallback stays a **TEMPORARY guard**, recorded as such. Real-device testing of the sphere is a **FOUNDER_TODO** item.
- **BUG-062** SOLVED: the summary screen died at mount with "useChosen needs a ChosenProvider above it" (a root-stack route outside the tabs' provider). The fix is on `feat/t6-10-summary` and its api-35 leg is green.
- **BUG-053..057** (the audit's lead-owned findings) all closed and merged.

## The two playbook sections now in force

- **§11**: the adb-daemon, ColorBuffer and context-preempted lines are KNOWN NOISE - they appear in green runs too and are not chased.
- **§12**: an action that works most of the time is an app bug, fixed in the app and never in the flow. The slide now decides on the gesture's own final translation against 0.75 of the travel, with twelve tests driving late, partial and reordered events.

## The scratch branches: archived and deleted (lead session 5)

`exp/bug-061-no-sphere` (1de1d80), `exp/bug-061-live-sphere` (fbbaf4f) and
`exp/bug-062-failure-dump` (c7d30d3) each proved something; each is now a remote
tag `archive/exp/<branch>` and each branch is gone from origin
(`git ls-remote --heads origin 'exp/*'` prints nothing). Their results and
BUG-061's root cause are written in `docs/status/BUGS.md` (PR #45, merged).

## Open, with their state (lead session 5, 2026-10-25)

| PR | What | State |
|---|---|---|
| **#18** | 07 Copilot + the sphere lifecycle fix (1940500 pushed, the founder's correction: it was never stale) | main merged in (796774f), the copilot.yaml flow fix on top (Stop lands on driving-screen, not today-screen), **E2E red on api-34 only**: `smoke.yaml` and `stops.yaml` both died at the first-screen assert with adb-daemon failures - the 2048 MB symptom #37 fixes. `copilot.yaml` itself was GREEN on both legs |
| **#37** | the emulator gets 6 GB + 4 cores | second merge of main pushed (3650a5b); the first head's E2E was GREEN on both legs (27m0s); the Locust SLO step's red on the push run is the backend's (BUG-063, PR #46) |
| **#36** | the runner keeps the failure dump | api-34 red (the same emulator symptom), api-35 green |
| **#30** | 10 Summary (BUG-062 solved) | api-35 green (the provider fix proven), api-34 red |
| **#40** | 13 Lock screen | both legs red on the OLD sphere code |
| **#42** | 01 Welcome | api-34 green, api-35 red |
| **#12** | the screen recordings | api-35 green, api-34 red |

**The order that follows from the evidence:** #37 first. Its E2E is green with 6 GB
and 4 cores, and #18's remaining red is exactly the 2048 MB adb-daemon death, so
#18 goes green once #37 is on main. Then merge main into #36, #30, #40, #42 and
#12 one at a time and merge each as it goes green with the full ritual.

Next: PR #42 (Welcome) and 02 Sign in; the legacy token deletion, with proof; then
the rest of `docs/plan/MASTER_EXECUTION.md` to the §6 Definition of Done. The new
IOS_PLAN.md (D43) applies its I0 rules now: one code base, cross-platform
libraries only, no iOS work until its gate.

## The traps that cost me time this session

- **`git branch --show-current` before EVERY commit** — three commits landed on the wrong branch; none was lost, but each cost a recovery step.
- **`git commit -m` with backticks breaks in PowerShell** (the backtick is an escape) — write the message to a file and use `git commit -F`.
- **`Set-Content -Encoding utf8` writes a BOM**, which lands in the commit subject. Write commit messages with `node -e "fs.writeFileSync(...)"` instead.
- **`git diff > file` writes UTF-16** in PowerShell and `git apply` cannot read it. Save a diff with node, or re-apply the change with the edit tool.
- **`git diff origin/main` during a conflicted merge reads a stale worktree**; the no-deletion check (§13.3) and the two-dot PR diff (§13.4) are the ones that tell the truth. Always run BOTH.
- **A local branch can be ahead of origin without it being stale** (the founder's correction, PLAYBOOK §13.1): verify with `git log origin/<branch>..<branch>` and push the commit, never recreate the branch.
- **`gen</>` doesn't work; `requireActual` breaks the shared module** — replace the whole module with the smallest surface the component uses.
- **No `Start-Sleep` waits** — three 700-second sleeps cost 30 minutes. Check a run with `gh run view` once, then work on the next item.
- **pnpm's global shim is broken** (`AppData/Roaming/npm/pnpm.exe` missing) — use the repo's own `.\node_modules\.bin\pnpm.cmd`, and run it through `cmd /c ... > log 2>&1` or PowerShell turns the child's stderr into a parser error.

## Merged in session 5 (each: merge commit, archive tag, remote branch deleted, ls-remote proof)

| PR | What | Tag |
|---|---|---|
| **#45** | the three exp/ experiments recorded in BUGS.md, their archive tags pushed and their branches deleted | `archive/chore/exp-branch-archive` |
| **#47** | the session-5 handoff in CURRENT.md | `archive/chore/current-handoff` |
| **#37** | the emulator gets 6 GB and 4 cores - its E2E was green on both legs before and after | `archive/fix/e2e-emulator-memory` |
| **#49** | the E2E is deterministic (BUG-065): the pins, the push trigger, the nightly health run; both the PR run and a workflow_dispatch run on the final head were green on both legs | `archive/fix/e2e-determinism` |

## The bugs filed in session 5, both with their evidence

- **BUG-065** (the E2E determinism): the api-35 leg went red on four PRs that took main while the api-34 leg stayed green, with the APK bytes identical. The harness was the moving part, so the harness is pinned now: Maestro cli-2.11.0 with its release checksum verified before any byte runs, emulator build 16632760 (the stable 37.3.5), the system-image revision recorded per run, and an AVD cache key that carries all of it plus a hash of the emulator options. The number collided with the backend squad's BUG-064 (the map-pack workflow firing on a feature push) and the collision is recorded, as the BUG-053 one was.
- The map-pack workflow itself is red on every push: **the backend's**, per PLAYBOOK 16.3 (CURRENT-backend.md, ADR-016/D42, PR #43). One line, no chasing.

## Open, with their state

| PR | What | State |
|---|---|---|
| **#18** | 07 Copilot + the sphere lifecycle fix (1940500) | needs main merged in again (it now carries the pins) and its E2E re-run: its last run red on api-34 at `smoke.yaml` and `stops.yaml`, before #37 and #49 |
| **#36** | the runner keeps the failure dump (what solved BUG-062) | idem |
| **#30** | 10 Summary (BUG-062 solved) | idem |
| **#40** | 13 Lock screen | idem; its api-34 leg red is root-caused after the api-35 fix |
| **#42** | 01 Welcome | idem |
| **#12** | the screen recordings | idem |
| **#52** | 02 Sign in on the chosen tokens - the last of the 13 screens | built and green locally (44 suites, 500 tests); its E2E is running. It gained the **Sign out** row the flows need (the E2E mock now holds a session a sign-out clears, so the front door is reachable) |

## Then the queue continues (MASTER_EXECUTION and the audit's order)

1. #18, #36, #30, #40, #42 and #12 each: merge main in, re-run, merge as it goes green on both legs.
2. #52 (the sign-in) merges when its E2E is green on both legs: it closes the 13 screens.
3. A1 (the app speaks to the API), A2 (on-device voice), A4 (no mock in a release), B2 (the dead design-lab code) - the audit's P0/P1 list, before any other new feature.
4. The iOS rules of I0 apply now: one code base, cross-platform libraries only, no iOS work until the IOS_PLAN gate passes.

## The traps that cost me time this session

- **`git branch --show-current` before EVERY commit** — three commits landed on the wrong branch; none was lost, but each cost a recovery step.
- **`git commit -m` with backticks breaks in PowerShell** (the backtick is an escape, and `` `a ``/`` `f `` in a double-quoted string are BEL and FF): write the message to a file with `node -e "fs.writeFileSync(...)"` and use `git commit -F`.
- **`git diff > file` and `Set-Content` mangle text**: the redirect writes UTF-16, Set-Content adds a BOM and eats backticks; use node, or the edit tool.
- **A merge whose conflict you resolve in the worktree does not stage the rest of the worktree**: after a conflicted merge, `git add` every path you touched before the merge commit, or the fix is lost to a follow-up commit.
- **PowerShell turns a child process's stderr into a parser error**: run pnpm through `cmd /c ... > log 2>&1`.
- **A subagent's uncommitted renumber can be left behind**: check `git status` after one finishes.
- **No `Start-Sleep` waits** — check a run with `gh run view` once, then work on the next item.

**FOUNDER_TODO:** an Apple Developer account for the iOS build lane; a real-device BUG-051 launch test; the sphere's real-device check; the Play account for the internal test track.
