# Evidence — the emulator jobs have a retry budget of one (BUG-219, audit item 3h)

**Step:** the 2026-11-05 audit's item 3h · **Branch:** `e2e-retry-budget` ·
**Date:** 2026-11-05

## What was broken

`android-e2e.yml`'s `e2e` and `a1` jobs had no cap on `github.run_attempt`, so a
flake could be "fixed" by pressing re-run until green. PLAYBOOK 17.1 — *a
re-run is not a diagnosis; a red is a root cause* — was enforced by memory
alone, and the audit is exactly about prose that nothing asserts.

The recurring case here is the harness, not the code: the same APK green on
api-35 and red on api-34 four times with the app, the flows and the workflow
byte-identical (BUG-065). Each re-run hid a harness change.

## What landed

A `The retry budget` step is the **first step** of both the `e2e` and the `a1`
job:

```bash
attempt="${{ github.run_attempt }}"
if [ "$attempt" -gt 2 ]; then
  echo "::error::this is attempt $attempt and the flake budget is spent: the job fails now, before it boots an emulator."
  echo "PLAYBOOK 17.1: a re-run is not a diagnosis. ..."
  exit 1
fi
if [ "$attempt" -eq 2 ]; then
  { echo "## This is run attempt 2 - the budget is one more"
    echo "..."
    echo "**Attempt 3 will fail immediately**, by design ..."
    echo "- what changed since attempt 1 ..."
    echo "- what the root cause is ..."
    echo "- and if the answer is \"a re-run\", then the answer is not an answer."
  } >> "$GITHUB_STEP_SUMMARY"
fi
```

Being the first step matters: a third attempt fails **before** it boots an
emulator, so the budget saves the minutes it exists to save. The budget is one
re-run, which is what the recurring harness flake needs.

`scripts/ci/check-e2e-retry-budget.mjs` (a step in the `Floor guard` job) holds
every half, with a 6-case test.

## The budget step's real body, run with the three attempt numbers

```
=== attempt 1: exit=0            (nothing written)
=== attempt 2: exit=0
   out: ::notice::attempt 2: the job summary asks for the justification, and attempt 3 will fail by design.
   summary:
      ## This is run attempt 2 - the budget is one more
      Attempt 1 failed. This attempt is allowed because a red can be the harness
      rather than the code, and one retry catches that: the recurring case in this
      workflow is the emulator's first screen never appearing, which is the system
      image and the AVD the audit's 3e and 3f now pin.
=== attempt 3: exit=1
   out: ::error::this is attempt 3 and the flake budget is spent: the job fails now, before it boots an emulator.
   out: PLAYBOOK 17.1: a re-run is not a diagnosis. ...
```

## Red first (PLAYBOOK §14)

```
$ git stash push -- .github/workflows/android-e2e.yml   # the tree as it was
$ node scripts/ci/check-e2e-retry-budget.mjs
the retry budget is broken (2):
- the e2e job has no retry budget step: a re-run of it is silent
- the a1 job has no retry budget step: a re-run of it is silent
(exit 1)
```

## Green

```
$ node scripts/ci/check-e2e-retry-budget.mjs
check-e2e-retry-budget: the e2e and a1 jobs fail past their second attempt, and
the second attempt asks for the justification in the job summary

$ node --test scripts/ci/__tests__/check-e2e-retry-budget.test.mjs
6 tests, 6 pass
```

## A bug the test caught in the gate itself

The gate's first draft anchored its step regex with `\Z` ("end of string"),
which **JavaScript does not have** — `\Z` there is the literal letter `Z`, so
a budget step that is the job's *last* step never matched and the gate said
"no retry budget step" about a job that had one. The 6-case test caught it
(the fixture puts the budget last); the 3d gate's identical anchor was fixed
in the same commit. `\Z` is a PCRE-ism; JS uses `$`.

## Not claimed

That every future flake will now be diagnosed: the budget only stops the third
attempt. The diagnosis is the attempt-2 summary, which a human reads.
