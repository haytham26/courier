# BUG-198 evidence - a human dispatch of android-e2e.yml runs the whole set (audit item 5)

## The gap
The `changes` job of `.github/workflows/android-e2e.yml` diffs paths on pull_request/push, but on any other event (workflow_dispatch, schedule) a human asked for the run and the branch echoed only `build/flows/scripts/pipeline=true` before `exit 0` - never `e2e`/`a1`, the outputs the emulator legs and the A1 job gate on. Observed: runs 42166994398 and 42167332868 reported `Run the Maestro flows` and `A1` as `skipped` while pull_request runs of the same heads executed them - a manual dispatch was not E2E evidence, and the founder could not run the trial's own proof (the A1 job) by hand.

## Red first
`node scripts/ci/check-e2e-dispatch.mjs <tmp root with HEAD's workflow>` exits 1 naming both missing outputs: "the human-dispatch branch does not echo e2e=true" and "... a1=true". The gate's own test fixtures (the exact pre-fix echo line, e2e-without-a1, a job gating on `pipeline` instead of `a1`, a removed human branch) all fail before/without the fix.

## Green after
- The human branch now echoes all six outputs: `{ echo "build=true"; ... echo "e2e=true"; echo "a1=true"; }`.
- Gate `scripts/ci/check-e2e-dispatch.mjs` in the floor job of quality-gates.yml: the human branch must echo e2e=true and a1=true, and the A1 job / legs must gate on exactly those outputs. 5/5 tests in `scripts/ci/__tests__/check-e2e-dispatch.test.mjs`; gate on the real tree exits 0.
- check-workflows 16 clean; check-action-pins 121 pinned; all node gates pass; control-chars/mojibake/floor/doc-links clean; parity 0 reopened vs origin/main.
