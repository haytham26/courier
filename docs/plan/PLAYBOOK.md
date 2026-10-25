# The problem-solving playbook

Binding with MASTER_EXECUTION §19. Use it for every failure, before you think for a long time. It turns most failures into a 10 to 20 minute job.

## 1. Triage in 3 minutes: what kind of failure is it?
Ask these questions in order, and stop at the first yes.

| Question | If yes |
|---|---|
| Did the same check pass on main or on the previous commit of this branch? | Not a flake. Something in this diff broke it. Go to §3 (bisect the diff). |
| Did it fail on BOTH emulator images (api-34 and api-35)? | Treat it as a real regression, not the known api-34 flake. |
| Did it fail before any test ran (checkout, install, build, emulator boot, runner lost)? | Infrastructure. One rerun is allowed; a second failure is real. |
| Is there a crash in logcat-crash.txt, or relaunches > 0? | App crash. Read the first stack frame from our code (`com.courier` or `apps/mobile`), not the library frames. |
| Did the failure appear right after a step that changed the screen (launch, navigate, slide, tap)? | A state or navigation contract changed. Compare what the flow expects with what the screen now does (§4). |
| Only api-34, no crash, GL noise (ColorBuffer, context preempted), and the same commit was green on api-34 before? | The known flake (BUG-051 family). One rerun of the failed leg only, recorded in the log. |

Never call something a flake without the last row being true. The words "flake" and "random" need evidence.

## 2. Read evidence in this order (fastest signal first)
1. The run summary (`summary.txt`, the job summary): which flow, status, relaunches.
2. The failing flow's last 20 lines in the job log: the exact command that failed and what it expected.
3. `screen.png` and `window.xml` from the artifact: what was actually on screen and which testIDs existed.
4. `logcat-crash.txt`, then `logcat.txt`, grepped for `FATAL`, `Error`, `ReactNativeJS` and our tag.
5. Only then the code.

Download an artifact once. Keep it in the temp folder named by run id, and reuse it.

## 3. Bisect, do not theorise
- List what changed since the last green run: `git diff <green-sha>..HEAD --stat`.
- The failure is almost always in a file of that list, or in a contract between two of them (a testID, a route, a state shape, a token row).
- If the list is long, split it. Revert half locally (never push the revert) and run the failing check. Repeat until one change is left.

## 4. Contract check for UI changes
When a screen changes, every consumer of its contract must change in the same PR:
- **testIDs** used by Maestro flows (`grep -rn "<id>" .maestro apps/mobile`);
- **routes** and where navigation lands after an action (for example, where the app goes after Slide to Deliver);
- **visible text** that flows assert;
- **state** that other screens read (the run state, the active stop);
- **token rows**: rebuild `@courier/design-tokens` before the app gates.

A failed assert right after an action means the screen now does something else. Decide which is right by the design and the plan, then fix the app or update the flow to the new, intended contract. Record the decision. Never delete the assert.

## 5. Hypotheses: write them, rank them, test the cheapest first
Before changing code, write 3 hypotheses in the log, each with:
- the evidence for it;
- the evidence against it;
- the cheapest test that would prove or kill it.

Run the cheapest decisive test first. Two failed fixes on one hypothesis means it is dead (§19.1).

## 6. Make local equal CI before trusting local
- Same lockfile and `--frozen-lockfile`, same pnpm settings, `CI=true`, tokens built.
- If something passes locally but fails in CI, the difference IS the bug. Find what differs (paths, environment, generated files, OS) before touching the code.

## 7. Thinking budget
- Spend the first 10 minutes collecting evidence (§2), not reasoning in the abstract.
- If you have thought for more than 10 minutes without new evidence, stop and run the cheapest experiment.
- Prefer one decisive experiment over long analysis.

## 8. Fix once, prevent forever
After every fix:
- add the regression test that would have caught it;
- add the trap to `docs/log/CURRENT.md` ("The traps");
- if a whole class of bug is possible, add a gate, as was done for the conflict markers, control characters and hex colours.

## 9. Known patterns in this repo (read before debugging)
| Symptom | Usual cause |
|---|---|
| jest passes on Windows, fails on CI | module resolution differs by pnpm virtual store names, or a generated file is ignored locally (expo-env.d.ts) |
| `@courier/design-tokens/*` undefined in the app | dist not rebuilt after a token edit |
| Maestro parse error | selector outside `element:`, wrong command schema; check docs.maestro.dev |
| a scroll in a flow does nothing | the gesture starts on the map above a peek sheet; raise the sheet first |
| a tap lands on the dock | the element is partly under the tab bar at peek; raise the sheet first |
| app dies seconds after a cold launch on api-34 | the image's Chromium CookieManager crash (BUG-051); counted relaunch only for the known signature |
| `gh pr checks --watch` never exits | a stuck duplicate check row; read `gh run view <id>` instead |
| a push did not reach GitHub | redirected output hid the error; push with the output on screen and confirm with `gh run list` |

## 10. Experiments never live in the repo
- Probe files, bisect scripts and scratch files go in the approved temp folder OUTSIDE the repo (C:\Users\DCL\AppData\Local\Temp\opencode), never in apps/mobile/app (that is the router: every file there is a screen), apps/mobile/src, docs/ or any tracked folder.
- Before every commit, `git status` must show no `tmp-*`, `probe` or scratch file. Cleaning up means deleting only UNTRACKED files you created (`??` in git status). A tracked file is removed only with `git rm` in a commit that says why.
- A harness is code too: check its spelling and imports first. A probe that fails for its own reason proves nothing.
- Every experiment counts against the 45-minute time box of §19.1.

## 11. Known noise in the emulator log (never chase these)
These lines appear in GREEN runs too. They are not a cause unless a flow fails on the same step AND the evidence ties them to it.
- `ERROR | Unable to connect to adb daemon on port: 5037` at emulator start: adb has simply not started yet. A few seconds later the log says `daemon started successfully`.
- `Failed to find ColorBuffer`, `Failed to bind to texture: invalid color buffer`, `DisplaySurfaceGlContextHelper context was preempted`, `Failed to restore previous context`: software GL chatter (swiftshader). Flows pass right after them.
- `stop: Not implemented`, `Emulator client has not yet been configured`, and the netsim and snapshot lines at shutdown.

How to read a red E2E run, in this order:
1. List the flows that FAILED (`##[error]the flow failed:`) and the exact failed step of each.
2. Compare with the same flow in other legs and runs. Does the same step fail, and does an identical step pass elsewhere in the same run?
3. Only then look at the app evidence of that flow (screen.png, window.xml, logcat-crash.txt).

## 12. Known app pattern: an action that works most of the time is an app bug
If the same gesture or tap passes in one flow and fails in another of the same run, the app is not robust under load. A courier on a slow phone hits the same thing. Make the app robust, never the flow:
- Reproduce it in jest with late, missing or reordered events.
- Fix the decision so it never depends on timing.
- Never slow the flow down, add waits, or retry the gesture to hide it.

Example (BUG-061 family, 2026-10-25): the first Slide to Deliver after a cold launch did not deliver, while the identical swipe in the next flow did.

## 13. Branch safety: handoffs, local commits and merges of main

1. **A handoff claim is verified on origin before it is used.** "The fix is on #N" means: `git ls-remote origin refs/heads/<branch>` shows a SHA, and `git branch -r --contains <sha>` lists `origin/<branch>`. If not, the claim is false; the fix is local only and is pushed first.
2. **A local commit that is not on origin is never "stale".** Before abandoning or recreating a branch, run `git log --oneline origin/<branch>..<branch>`. Every commit listed is pushed (fast-forward, never force) or written down in the handoff with the reason it is dropped. Never create a second branch (`-green`, `-v2`) for the same PR.
3. **After every merge of main into a branch, before the commit is pushed, prove nothing on main was lost:**
   - `git diff --name-status --diff-filter=D origin/main HEAD -- services packages docs infra scripts db .github` must print nothing that the PR did not intend to delete.
   - If a path is listed, `git checkout origin/main -- <path>` and amend the merge before pushing (the merge is not yet pushed, so this is allowed).
   - If the merge shows unexpected deletions while still in progress: `git merge --abort` and start again from the right branch.
4. **The PR diff is read before merging:** `git diff --stat origin/main...origin/<branch>` lists only files the PR owns. A backend path in a mobile PR (or the reverse) blocks the merge.

## 14. A test must prove what its name says (founder directive 2026-10-25)

A test that passes without proving anything is worse than no test: it hides the gap. Every PR that adds or changes a test:

1. **Red first.** Run the new test against the code before the fix (or with the fix reverted) and paste the failing output in the PR. A test that was never red proves nothing. The only exception is a test that pins behaviour that already works, and the PR says so.
2. **The name is the claim.** The assertions must prove exactly what the test's name says. If the setup cannot produce the case (for example a fake that returns no stored rows for a "divergent replay" test), fix the setup or rename the test.
3. **Fakes are not proof of real behaviour.** When a fix depends on what the real system returns (a database rowcount, a platform API), add one test against the real thing too (the `db`-marked Postgres suite, the emulator).
4. **The reviewer pass checks 1 to 3** for every new test, as part of the 5-pass check.
5. **Mutation testing covers the core.** CONSTRAINTS runs Stryker on the address engine and the auth service. The backend squad extends it to the Python services that hold money, sync and routing (`services/api`: sync, runs, auth; `services/courier-voice`: the turn machine) with mutmut, scoped to the changed files on each PR, with the same ≥ 70 % floor. Until that lands, the reviewer flips one comparison in the changed code by hand and confirms a test goes red.

## 15. No silent waits (founder directive 2026-10-25)

1. **15 minutes without output is a stop.** Any wait (a subagent, a CI poll, a build) that produces no new output for 15 minutes is stopped, and the session writes what hung and what it does instead. A wait is never left open-ended.
2. **Size the review to the change.** A docs-only or config-only PR gets pass 5 done inline by the session in under 10 minutes. A fresh-context review subagent is for code changes, with a 20-minute budget and an explicit output (the findings list), never "review until satisfied".
3. **The founder sees progress.** A session that has worked 30 minutes without a commit, a push or a PR comment writes a one-line status in its own output: what it is doing and what it waits on.
