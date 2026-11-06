# Evidence — the `workflow_run` Semgrep finding is excluded with a written record (BUG-226)

**Step:** the 2026-11-05 audit's item 3d follow-up, on branch `deploy-gates-215` (PR #202) · **Date:** 2026-11-06

## What was red

Every PR from #202 up failed "Static analysis (Semgrep)" twice per run (e.g. run 42015970715, jobs
127206482319 / 127204763664) with:

```
.github/workflows/deploy.yml
❯❱ yaml.github-actions.security.workflow-run-target-code-checkout.workflow-run-target-code-checkout
  ❰❰ Blocking ❱❱
  This GitHub Actions workflow file uses `workflow_run` and checks out code from the incoming pull request …
```

Root cause: the rule is a **static heuristic** — any `workflow_run` workflow that checks out the
incoming head is flagged, on the assumption that PR code then runs with access to secrets. Our
`deploy.yml` checks out `${{ github.event.workflow_run.head_sha || github.sha }}` — the sha the gates
ran on, not the branch tip — and the deploy job's gate step (BUG-215) reads BOTH required workflows'
conclusions from the API and requires `completed` AND `success` on that exact sha **before** the
checkout step runs. The dynamic gate is stricter than the rule's assumption, so the finding is a false
positive *for this workflow* — and the fix is a documented exclusion, not a code change.

The second, quieter defect: exclusions lived only in the scan command's `--exclude-rule` list. The
floor's no-suppressions check (`check-floor.mjs`) only scans for `nosemgrep` comments, so a bare
`--exclude-rule` with no written reason was a suppression by another name — and two older exclusions
(the W4 loopback-HTTP and child-process rules) were not even listed in `.semgrepignore`.

## What landed

1. **`.github/workflows/quality-gates.yml` (sast job):** `--exclude-rule
   "yaml.github-actions.security.workflow-run-target-code-checkout.workflow-run-target-code-checkout"`
   added to the pinned scan command, plus a line in the "Why the excluded rules are excluded" echo
   naming W6. `deploy.yml` itself is unchanged.
2. **`.semgrepignore`:** numbered entry 7 with the reason (W6), entry 8 listing the two previously
   unrecorded W4 rule ids, and all rule ids as lines at the bottom.
3. **`docs/plan/CONSTRAINTS.md`:** a W6 row in the exceptions table — rule, path, reason (the dynamic
   gate exceeds the static heuristic, BUG-215/BUG-226), owner `lead executor`, expires 2026-12-01.
4. **`scripts/ci/check-semgrep-exclusions.mjs`** (a step in the **Floor guard** job): every
   `--exclude-rule` in the sast scan must be a line in `.semgrepignore`; `.semgrepignore` must carry
   numbered reason entries; every W-id it cites must have a row in CONSTRAINTS.md's exceptions table.
   6-case test.

## Red first (PLAYBOOK §14)

The new gate run against the **new** workflow but the **old** `.semgrepignore` / `CONSTRAINTS.md`
(741c8bd's copies, in a temp tree):

```
exit 1 — BUG-226: the Semgrep-exclusions gate fails (3):
- the scan excludes rule "typescript…react-insecure-request" but .semgrepignore has no line for it
- the scan excludes rule "javascript…detect-child-process" but .semgrepignore has no line for it
- the scan excludes rule "yaml…workflow-run-target-code-checkout" but .semgrepignore has no line for it
```

## Green

```
$ node scripts/ci/check-semgrep-exclusions.mjs
BUG-226: every --exclude-rule of the Semgrep scan is a line in .semgrepignore under a
numbered reason, and every cited W-id has a row in CONSTRAINTS.md
$ node --test scripts/ci/__tests__/check-semgrep-exclusions.test.mjs   # 6 pass
$ node scripts/ci/check-workflows.mjs && node scripts/ci/check-parity.mjs --base origin/main  # clean / 0 reopened
```

## Not claimed

That the Semgrep job is green: that is the next CI run's evidence on the new head of PR #202. The local
proof is the gate, the tests and the record links. (A scoped local `semgrep scan` of `deploy.yml` with
`p/default` found nothing today — the registry's `p/default` moves; CI with its pinned
`semgrep==1.182.1` fetching live rules is the authority for the red, and now for the green.)
