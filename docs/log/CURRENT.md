# CURRENT — the handoff

**Week:** 2026-W43. **Local `main` == `origin/main` == `1dbddf5`.**

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

**The merge ritual now ends at `git ls-remote --heads origin <branch>` printing nothing** — `git branch -d` only removed the local copy, and seven branches were still on GitHub after I reported them deleted.

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

## The scratch branches (never merged, to be tagged and deleted)

`exp/bug-061-no-sphere`, `exp/bug-061-live-sphere`, `exp/bug-062-failure-dump` — each proved something; each needs `git tag archive/<branch> origin/<branch>`, `git push origin refs/tags/<tag>`, then `git push origin --delete <branch>`.

## Next items, in order

1. Merge PR #18 (the sphere fix) as soon as a clean E2E lands; then merge main into #37, #36, #12, #40 and #30 and merge each as it goes green with the full ritual.
2. PR #42 (Welcome) and 02 Sign in.
3. The legacy token deletion, with proof.
4. Then the rest of `docs/plan/MASTER_EXECUTION.md` to the §6 Definition of Done.

## The traps that cost me time this session

- **`git branch --show-current` before EVERY commit** — three commits landed on the wrong branch; none was lost, but each cost a recovery step.
- **`git commit -m` with backticks breaks in PowerShell** (the backtick is an escape) — write the message to a file and use `git commit -F`.
- **`gen</>` doesn't work; `requireActual` breaks the shared module** — replace the whole module with the smallest surface the component uses.
- **No `Start-Sleep` waits** — three 700-second sleeps cost 30 minutes. Check a run with `gh run view` once, then work on the next item.

**FOUNDER_TODO:** an Apple Developer account for the iOS build lane; a real-device BUG-051 launch test; the sphere's real-device check.
