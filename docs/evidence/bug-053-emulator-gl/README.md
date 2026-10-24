# Evidence: BUG-060, the emulator boots with software GL

(The folder keeps the name `bug-053-emulator-gl`, the id the bug was filed under
before the queue-2 audit's BUG-053 landed on main: the renumber and the
collision are recorded in `docs/status/BUGS.md`.)

The claim: every workflow that boots an Android emulator sets
`-gpu swiftshader_indirect`, the setting is asserted by a gate in the floor job,
and the E2E gate that used to die now runs green. Nothing here is a memory of a
run: each block is an output captured on 2026-10-25 on this machine, and the run
identifiers are the ones GitHub assigned.

## 1. The gate catches the pre-fix file

`git show origin/main:.github/workflows/android-e2e.yml` (main has not merged the
fix yet) is the file that carried BUG-053. The gate, run over a directory holding
that one file, fails:

```
$ node scripts/ci/check-emulator-gpu.mjs <a directory with main's android-e2e.yml>
An emulator boot does not ask for software rendering (BUG-053):
  android-e2e.yml:162  emulator-options must include -gpu swiftshader_indirect
Every workflow that boots an emulator must set -gpu swiftshader_indirect in its emulator-options.
```
exit code 1.

## 2. The fixed tree passes

```
$ node scripts/ci/check-emulator-gpu.mjs
2 emulator boot(s) across 8 workflow files, every one with -gpu swiftshader_indirect.
```
exit code 0. Two boots: `android-e2e.yml` (api-34 and api-35 legs of one step)
and `design-videos.yml`. PR #12's `screen-recordings.yml` carries the flag on its
own branch (checked against `origin/feat/t6-recordings`: it passes too).

## 3. The gate's own tests

```
$ node --test scripts/ci/__tests__/check-emulator-gpu.test.mjs
ℹ tests 24
ℹ pass 24
ℹ fail 0
```

The suite drives the parser against the shapes that would fool a weaker one:
the two legal step forms, an inline value and a block scalar, a folded block
scalar, a `script:` body full of dash-lines, a comment that names the pinned
action, a second `-gpu` flag, a YAML anchor, `with:` written before `uses:`, a
workflow with no emulator, and the CLI itself (exit 0, exit 1 with the finding
named, exit 2 as one clean line for a missing directory).

## 4. The E2E runs

| Run | Branch | Conclusion | What the log says |
|---|---|---|---|
| 40083028631 | `fix/bug-052-emulator-swiftshader-gpu` (PR #22) | **success**, 26m53s | all 8 flows completed on both api legs; the readiness gate booted in 39s (api-34) and 36s (api-35); 10 GL chatter lines, no flow dying |
| 40077114264 | `feat/t6-copilot` (PR #18) | failure, 25m42s | api-35: `##[error]no first screen appeared in 90s`; api-34: `Assert that id: today-screen is visible... FAILED` in copilot.yaml and smoke.yaml, ColorBuffer `Failed to find ColorBuffer: 197` |
| 40077256396 | `main`, the nightly | success, 25m38s | green on the OLD setting: this is why the bug never looked like infrastructure |

The checklist for the run logs is run 40083028631 with the pulls above: the
fatal shapes are gone, the chatter is not, and the brief's proof line is amended
in `docs/status/BUGS.md` with the evidence rather than met by assertion.

## 5. What this evidence does not say

- It does not say the emulator's GL chatter is gone: 10 lines in a green run.
- It does not say a flake cannot return: the solo experiment
  (`gh workflow run android-e2e.yml --ref feat/t6-scan` while no android-e2e run
  is in progress) stays on the shelf for the next red, and the triage order is
  PLAYBOOK §1.
- The gate only reads `reactivecircus/android-emulator-runner` steps. A workflow
  that boots the emulator directly is not covered by it (none exists today);
  the wording of D37 is scoped to what the gate reads.
