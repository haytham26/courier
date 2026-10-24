# Evidence — the api-34 E2E leg's GL preemption (BUG-052)

PR #15 (06 Scan) could not be driven green on the emulator. This sheet records
what was actually wrong, because three runs were spent deciding it, and the
decision is the point.

## What the three runs showed

| Run | api-34 | api-35 | The failing step | Signature |
|---|---|---|---|---|
| `40060608949` | red | red | `Tap on id: today-scan` | `Element not found: Id matching regex: today-scan` — no GL noise |
| `40063068694` | red | red | `Assert that "Address found. Hold steadily" is visible` | the reading had not landed yet; api-35's `driving.yaml` also died at `launchApp` on `context was preempted by others` |
| `40067145473` | red | red | `Launch app "com.courier.copilot" with clear state` | `DisplaySurfaceGlContextHelper context was preempted by others, current=0x3, needed=0x3` + `Failed to restore previous context: 12297` + `Failed to find ColorBuffer` / `Failed to bind to texture: invalid color buffer` |

**Both of the first two were REAL, and both are fixed** in the app's contract
and the flow — see PR #15's commits `54d86ee` (the sheet raise-then-scroll) and
`776816a` (waiting for the reading with the repo's own `extendedWaitUntil`
idiom). Neither was a flake: the first failed on both legs with a plain
`Element not found` and no GL noise at all, and the second's ring and pills
were on screen while the status was still honest about the reading.

**The third is the infrastructure, and it is where the parking line was
crossed.** The app never reached a Maestro step: it died at `launchApp`. The
GL context was preempted by *another* runner on the same machine — which is
exactly the trap `docs/log/CURRENT.md` has carried since BUG-051: *"two
2-runner emulator E2E workflows in one window share the fleet (the api legs' GL
preempts, flows freeze or die at `launchApp`)"*. At the time of run
`40067145473`, PR #18's (Copilot) and PR #20's (Route) E2E runs were in flight
**at the same time**, which is what makes the verdict here not "the emulator is
flaky" but "the fleet is contended".

## The single-leg rerun, and the founder's rule

Per the founder's directive the failed api-34 job was rerun **alone**
(`gh run rerun --job 120796702622`, run id `120809879261`). It failed again,
in 5m59s, with the **same** signature, again at `launchApp`.

Two attempts is where the two-attempt rule of `MASTER_EXECUTION` §19.1 and
`docs/plan/PLAYBOOK.md` §1 stops: the hypothesis (a contended fleet) was tested,
it failed twice on the same signature with no new evidence, and per the
founder's instruction this is now **parked in `docs/status/BUGS.md` as BUG-052**
with this evidence, and the work moved on.

## What was NOT done, deliberately

- No gate was weakened. The app's own fixes (`54d86ee`, `776816a`) are in and
  they are the two real defects the first two runs found.
- No rerun-without-a-change: every rerun above is recorded with what changed
  first.
- No claim that the api-34 leg is green. It is not.

## What the next attempt should be

Run the api-34 leg **with no other E2E in flight** (a `workflow_dispatch` on
`feat/t6-scan` when PR #12's, #18's and #20's runs are all finished). The
signature names a contended fleet, so a solo run is the decisive experiment and
it has not been tried yet. A third identical failure under a solo run would
move this from "fleet" to "the image itself", which would then be a BUG-051
family extension and needs the api-34 leg's own tombstone read (PLAYBOOK §2
step 4).
