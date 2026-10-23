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
