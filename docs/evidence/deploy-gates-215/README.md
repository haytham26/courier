# Evidence — the deploy waits for CI and Quality gates (BUG-215, audit item 3d)

**Step:** the 2026-11-05 audit's item 3d · **Branch:** `deploy-gates-215` ·
**Date:** 2026-11-05

## What was broken

`deploy.yml`'s deploy job ran on the same push that started CI and Quality
gates:

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
    …
jobs:
  verify:            # runs on the push
  deploy:
    if: github.event_name == 'workflow_dispatch' || github.ref == 'refs/heads/main'
    needs: verify    # the only ordering in the file, and it is this workflow's own leg
```

So the staging host could be deployed a tree that CI was about to call red, and
the checkout took the branch tip rather than the sha anything had tested. The
deploy leg has never run against a real host (the OCI host and key are a
FOUNDER_TODO item), which is why its trigger was never reviewable against a
real deploy.

## What landed

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:      # kept: a human may always ask
    …
  workflow_run:
    workflows: ["CI", "Quality gates"]
    types: [completed]
permissions:
  contents: read
  actions: read           # the API read below
jobs:
  verify:
    if: github.event_name != 'workflow_run'   # the push already built this
  deploy:
    if: github.event_name == 'workflow_dispatch' || github.event_name == 'workflow_run'
    steps:
      - name: The gates are green on this sha
        if: github.event_name == 'workflow_run'
        run: |
          runs="$(gh api "repos/$REPO/actions/runs?head_sha=$SHA" --paginate …)"
          for workflow in "CI" "Quality gates"; do
            … awk: $1 == want && $2 == "completed" && $3 == "success" …
          done
      - uses: actions/checkout@… # v4
        with:
          ref: ${{ github.event.workflow_run.head_sha || github.sha }}
```

Two deliberate choices:

- **The gate step reads the API rather than trusting the event.** `workflow_run`
  fires when *either* named workflow completes; a deploy that waited for CI
  alone while Quality gates was red is the same bug as no gate at all. The step
  reads the runs on the sha and requires both.
- **The deploy no longer `needs: verify`.** `verify` runs on the push event
  only, so a `workflow_run` event would skip the deploy job forever. The
  ordering guarantee is the gate step, not the job dependency.

`scripts/ci/check-deploy-gate.mjs` (a step in the `Floor guard` job) holds every
half, with an 8-case test.

## The gate's decision, proven against four shapes

The awk predicate in the gate step, run by hand:

```
--- both green ---                 GATE PASSES
--- CI green, Quality gates
    still in_progress ---          GATE FAILS: Quality gates has not passed
--- CI failed, Quality
    gates green ---                GATE FAILS: CI has not passed
--- neither has run yet ---        GATE FAILS: CI has not passed
```

## Red first (PLAYBOOK §14)

```
$ node scripts/ci/check-deploy-gate.mjs    # the tree as it was
the deploy's gate is broken (…):
- the workflow has no workflow_run trigger: the deploy starts on a push, before
  the gates have a verdict
- the deploy job's if: (github.event_name == 'workflow_dispatch' || github.ref ==
  'refs/heads/main') does not run on workflow_run: …
- the deploy job still runs on a push to main: a deploy on a push is a deploy of
  a tree nobody has tested yet
- the deploy job `needs: verify`, which runs on the push event only: on a
  workflow_run event the deploy would never run
- the deploy job does not check out `github.event.workflow_run.head_sha`
(exit 1)
```

## Green

```
$ node scripts/ci/check-deploy-gate.mjs
check-deploy-gate: the deploy runs on the gates' conclusion (CI and Quality
gates) and on a human dispatch, on the sha they ran on, and never on a push

$ node --test scripts/ci/__tests__/check-deploy-gate.test.mjs
8 tests, 8 pass

$ node scripts/ci/check-workflows.mjs      # the changed workflow, included
check-workflows: 14 workflows read their inputs through the github context and
carry only keys GitHub accepts
```

## Not claimed

A live `workflow_run` deploy: the leg needs the OCI host and key
(`FOUNDER_TODO.md`), so the trigger shape is proven by the gate and the API
read is proven by the four awk shapes, not by a run against the real host.
`gh api` pagination on a repository with many runs is assumed (the
`--paginate` flag is what the step passes); the sha filter narrows it to the
few runs of the commit.
