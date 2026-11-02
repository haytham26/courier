# Evidence — the run carries its break window and finish point (D55/D56 server half)

**Step:** D62 queue step 4.3, first server half · **Branch:** `feat/trial-run-break-finish`
(head `b3ee3ab` + the docs commit) · **PR:** #177 · **Decision/ADR:** D63, ADR-022 ·
**Date:** 2026-11-02

## What the evidence is

`POST /runs` accepts the day's planned break window and finish point and reads them back;
the `runs` table stores them; the typed client is regenerated from the contract. Unknown
fields are still refused.

## Red first (PLAYBOOK §14)

The six new tests in `services/api/tests/test_runs_api.py` were run against `origin/main`'s
code (the branch's app/contracts files reverted in the worktree, tests kept):

```
$ uv run --directory services/api pytest tests/test_runs_api.py -q -k "break or finish"
E  AssertionError: {"detail":[{"type":"extra_forbidden","loc":["body","break_window"],...},
E                                {"type":"extra_forbidden","loc":["body","finish"],...}]}
E  assert 422 == 201
E  KeyError: 'break_window'
FAILED tests/test_runs_api.py::TestCreatingARun::test_the_break_window_and_the_finish_are_stored_and_read_back
FAILED tests/test_runs_api.py::TestCreatingARun::test_a_run_without_break_or_finish_answers_nulls
2 failed, 4 passed, 51 deselected in 3.39s
```

The 4 passing tests are the refusal pins (inverted/naive/partial break window, out-of-bounds
finish → 422): they pin behaviour that already worked on both trees, and the PR says so.

## Green

```
$ uv run --directory services/api pytest tests/test_runs_api.py -q -k "break or finish"
6 passed, 51 deselected in 2.53s

$ uv run --directory services/api pytest -q
553 passed, 1 skipped, 30 deselected, 1 warning in 41.86s

$ uv run --directory services/api python scripts/generate_api_client.py check
(the committed packages/shared/src/generated/api.ts is fresh; the regeneration wrote
 CreateRunRequest.break_window/finish and RunResponse.break_window/finish)
```

The db-marked round-trip
(`tests/test_repo_db.py::TestTheRunLifecycle::test_the_break_window_and_the_finish_survive_the_sql_round_trip`,
`-m db` against the CI Postgres) exercises the four new columns through
`INSERT INTO runs` / `SELECT` / `list_runs`.

## Gates

| Gate | Command | Result |
|---|---|---|
| api suite | `uv run --directory services/api pytest -q` | 553 passed, 1 skipped |
| client freshness | `generate_api_client.py check` | fresh (regenerated in the PR) |
| contract drift | `pytest tests/test_contract.py tests/test_api_client.py` | pass (66 with test_runs_api) |
| floor | `node scripts/ci/check-floor.mjs` | clean (base origin/main) |
| registers | `node scripts/ci/check-parity.mjs` | clean (BUG-166 added, unique number) |
| CI | PR #177 quality gates + ci.yml (incl. `-m db` Postgres leg, client-fresh step) | see the PR's runs |

## Not verified here

The db-marked suite needs the Postgres service (Docker is capped at 3 GB on this machine), so
it runs on CI, not locally; the in-memory suite covers the same behaviours without the
columns. The app half (break row, finish picker, E2E) is the lead's queue and is not claimed.
