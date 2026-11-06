# Evidence — the emulator jobs report skipped, not missing (BUG-218, audit item 3g)

**Step:** the 2026-11-05 audit's item 3g · **Branch:** `e2e-job-level-filter` ·
**Date:** 2026-11-05

## What was broken

`android-e2e.yml`'s `pull_request` trigger carried:

```yaml
on:
  pull_request:
    branches:
      - main
    paths:
      - 'apps/**'
      - 'packages/**'
      - 'services/**'
      - '.maestro/**'
      - 'scripts/**'
      - '.github/workflows/android-e2e.yml'
      - 'package.json'
      - 'pnpm-lock.yaml'
```

A trigger-level `paths:` keeps the whole **workflow run** from existing for a
change it does not match. The check names this workflow reports
(`Build the release APK`, `Run the Maestro flows on the emulator (api 34)`,
`Run the Maestro flows on the emulator (api 35)`, `A1: the app against the real
API (no mock)`) are then never reported at all — and a required check that is
not reported is a PR that can never be merged, forever pending.

The filter's own comment even named the risk — "a PR check set that does not
run for it is a check set that lies" — without fixing it.

## What landed

1. The trigger's `paths:` is **gone from `pull_request`**. The push trigger
   keeps it: a post-merge check on main is not a merge gate, and a docs-only
   merge need not spend the emulator minutes.
2. A **`changes` job** diffs the paths with a plain `git diff --name-only`
   step — no new action, so nothing to SHA-pin and nothing for
   `scripts/ci/check-licenses.mjs` to inventory. It fetches the whole history,
   because a shallow clone answers "unknown revision" for the base sha and the
   diff then reads as "nothing changed", silently skipping every job. A new
   branch's forty-zero `before` and a force-push's vanished sha fall back to
   `HEAD~1`. A human's nightly or dispatch asks for everything.
3. `if:` on **build**, **e2e** and **a1**, so each job names the paths it needs
   and reports `skipped` instead of not existing.
4. The build job also runs for a flow-only change — the legs download the APK
   it uploads, and the content-hash cache makes that a restore rather than a
   rebuild — and the legs gate on the build job's success so they never run
   without an APK.

`scripts/ci/check-e2e-trigger-conditions.mjs` (a step in the `Floor guard`
job) holds every half, with an 8-case test.

## The diff logic, proven

The classification, run against ten fabricated path lists (the same code the
step carries):

```
docs only:          build=false flows=false scripts=false pipeline=false e2e=false a1=false
a log entry only:   build=false flows=false scripts=false pipeline=false e2e=false a1=false
the app:            build=true  flows=false scripts=false pipeline=false e2e=true  a1=true
a shared package:   build=true  flows=false scripts=false pipeline=false e2e=true  a1=true
a flow only:        build=false flows=true  scripts=false pipeline=false e2e=true  a1=true
a script only:      build=false flows=false scripts=true  pipeline=false e2e=true  a1=true
this workflow only: build=false flows=false scripts=false pipeline=true  e2e=true  a1=true
a manifest only:    build=true  flows=false scripts=false pipeline=false e2e=true  a1=true
the api service:    build=false flows=false scripts=false pipeline=false e2e=false a1=false
the mobile CI:      build=false flows=false scripts=false pipeline=false e2e=false a1=false
```

A documentation-only push skips all four jobs; an app or shared-package change
builds and runs everything; a flow-only or script-only change runs the legs
without rebuilding; the API service and the mobile CI are not this workflow's
to watch.

The step's real body (extracted from the workflow, not a copy) was also run
against `origin/main`, and the base-sha fallback, the changed-path list and
all six outputs behaved.

## Red first (PLAYBOOK §14)

```
$ git stash push -- .github/workflows/android-e2e.yml   # the tree as it was
$ node scripts/ci/check-e2e-trigger-conditions.mjs
the e2e workflow's job-level filter is broken (8):
- the pull_request trigger still carries a paths: filter: the workflow then does
  not exist for a documentation-only change, so its check names are never
  reported …
- there is no changes job: the paths filter has nowhere to live at the job level
- the build job's if: does not read the changes job's outputs
- the build job does not need the changes job
- the e2e job's if: does not read the changes job's outputs
- the e2e job does not need the changes job
- the a1 job's if: does not read the changes job's outputs
- the a1 job does not need the changes job
(exit 1)
```

## Green

```
$ node scripts/ci/check-e2e-trigger-conditions.mjs
check-e2e-trigger-conditions: the pull_request trigger carries no paths filter,
the changes job diffs with git itself, and build/e2e/a1 name the paths they
need so they report skipped instead of not existing

$ node --test scripts/ci/__tests__/check-e2e-trigger-conditions.test.mjs
8 tests, 8 pass

$ python -c "import yaml; yaml.safe_load(open('.github/workflows/android-e2e.yml'))"   # parses
```

## Not claimed

A live run showing the four job names reported as `skipped` on a docs-only PR:
that needs a push to a branch with a docs-only change, and the workflow's
`pull_request` trigger only fires for PRs to `main`. The shape is proven by the
gate and the diff logic; the report itself is a run's consequence, and item 3j
(the required-checks list the founder sets) is where it becomes load-bearing.
