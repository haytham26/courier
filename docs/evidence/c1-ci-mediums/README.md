# C1's CI mediums — the evidence for PR #155 (fix/c1-ci-mediums-2)

Every claim below was produced by running the real thing: the workflows on the
branch, the gate against the summaries CI produces, and the tests against the
pre-fix code.

## BUG-100 — the App Store Connect key is a job-level env (`store-ready.yml`)

The key trio (`APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`,
`APP_STORE_CONNECT_KEY_P8_BASE64`) sat in the job's `env:`, so it was present in
every step's process environment — including each third-party action the job
runs. The fix keeps the app id (a repository *variable*, not a secret) at the
job level, because the steps' `if:` conditions need it, reports the credential's
**presence** as a job output from a step that never exports the value, and sets
the trio only in the one step that reads and decodes the key.

Gate: `scripts/ci/check-workflows.mjs` (new in this PR, in the floor job) reads
the workflow tree and fails any job-level `env:` that carries a secret:

```
check-workflows: 13 workflows read their inputs through the github context and carry only keys GitHub accepts
```

That gate is what found BUG-162 (below) on this PR's own tree while it was being
written — a finding produced by the gate, not by hand.

## BUG-101 — the restore drill's DROP/CREATE pair (`ci.yml:124-127`)

`psql` continues after a failed statement by default, so a failed
`DROP DATABASE drill` let `CREATE DATABASE drill` run against the very database
the DROP existed to remove: the drill then "restored" into a populated database
and reported success, the one outcome a restore drill exists to catch. Both
calls now carry `-v ON_ERROR_STOP=1`.

## BUG-162 — `linz-changeset.yml:49`, a backend workflow (PLAYBOOK §16)

The LINZ weekly import is the backend's workflow, so this row says so first
(§16.3): the lead does not own `linz-changeset.yml`, and its fix rides this PR
only because the gate added for BUG-100 caught the job-level
`LINZ_LDS_API_KEY: ${{ secrets.LINZ_LDS_API_KEY }}` automatically, on this
repo, at line 49's job-level indent. The gate's own output, with no finding
written by hand:

```
linz-changeset.yml:49: a job-level env: carries a secret, so every step (and every third-party action) can read it
```

**The weekly run stays correct** (the same script, the same two arguments, the
same outputs — only the credential's reach shrinks):

- the credential moved from the job `env:` into the two steps that dial the LINZ
  API (`Fetch the week's changeset`, `Rebuild the address index`), and presence
  is reported by a step that reads the secret only to test that it is non-empty
  and writes `configured=yes|no` to `$GITHUB_OUTPUT` — never the value;
- every `if: env.LINZ_LDS_API_KEY != ''` condition became
  `if: steps.linz-key.outputs.configured == 'yes'`, and the skip-notice step the
  mirror image (`!= 'yes'`), so an unconfigured repository is still a skip with
  a notice, never a failure;
- `LINZ_LDS_AREAS` (the workflow input, defaulting to
  `chch,waimakariri,selwyn`) stayed at the job level: it is not a secret and the
  steps need it, exactly as before.

The run's schedule, its `workflow_dispatch` inputs and its three Python steps
are unchanged.

## BUG-104 — the coverage gate, and the false positive this PR first wrote

The PR's first enforcement of BUG-104 read "a file the summary names with no
statements to measure" as discovered-but-unmeasured. The real gate failed the
real repo on it — the Quality gates run
[41252213583](https://github.com/haytham26/courier/actions/runs/41252213583)
on the final head:

```
check-coverage: below the floor:
  the voice service: incomplete coverage — the summary named these files with no statements to measure: services/courier-voice/app/__init__.py
```

`services/courier-voice/app/__init__.py` is 50 bytes of docstring — zero
statements. A file with nothing in it is measured **in full by construction**,
so the rule misread the one shape that is always complete as the one shape that
is never measured. Red first, against the enforcement as written
(`scripts/ci/__tests__/check-coverage-groups.test.mjs`'s new case, run against
the pre-fix gate):

```
✖ a docstring-only file the summary names is measured in full, not incomplete (64.55ms)
  ...
    the voice service: incomplete coverage — the summary named these files with no statements to measure: services/courier-voice/app/__init__.py
ℹ tests 3   ℹ pass 2   ℹ fail 1
```

GREEN after the fix: `ℹ tests 3   ℹ pass 3   ℹ fail 0` (the whole
`scripts/*/__tests__` suite: 136 tests, 136 pass, 0 fail), and the gate's local
run is clean. The honest limit is recorded in the gate's header and on
BUG-104's row: vitest is started without `all:`, so a partial closure cannot be
seen from a JS summary at all — the fix for that half is the missing tests, not
a rule that fails on empty files.

## The gates on this branch

- `node --test scripts/*/__tests__/*.test.mjs` — 136 tests, 136 pass, 0 fail.
- `check-workflows.mjs`, `check-floor.mjs origin/main`,
  `check-conflict-markers.mjs` (1216 tracked files), `check-mojibake.mjs`
  (882 tracked text files) — clean.
