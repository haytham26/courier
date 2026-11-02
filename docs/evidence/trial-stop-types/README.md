# Evidence — the stop's type column (D59 server half)

**Step:** D62 queue step 4.3 · **Branch:** `feat/trial-stop-types` (head `0c4c767` +
docs commit) · **PR:** #179 · **Decision/ADR:** D63, ADR-024 · **Date:** 2026-11-02

## What the evidence is

`GET /shifts/{shift_id}/stops` answers each stop with `type` (`delivery`/`pickup`), the
`stops` table has the column (`CHECK (type IN ('delivery','pickup'))`, default `delivery`),
both `get_run_stops` paths read it, and the typed client carries
`StopResponse.type: 'delivery' | 'pickup'`.

## Red first (PLAYBOOK §14)

The new tests were run against the pre-change tree (the branch's app/contracts files
stashed back to the stack point, the tests kept):

```
$ uv run --directory services/api pytest -q tests/test_runs_api.py -k "stops_list_their_address or pickup_stop"
E   KeyError: 'type'
FAILED tests/test_runs_api.py::TestListingTheStops::test_a_pickup_stop_lists_its_type
FAILED tests/test_runs_api.py::TestListingTheStops::test_the_stops_list_their_address_and_status
2 failed, 56 deselected in 3.01s

$ DATABASE_URL=postgresql://courier:courier@127.0.0.1:5432/courier \
  uv run --directory services/api pytest -q -m db tests/test_repo_db.py -k "TestTheStops"
ProgrammingError: column "type" does not exist   (psycopg, via seed_stop's INSERT)
FAILED tests/test_repo_db.py::TestTheStops::test_a_stop_reads_back_with_its_type_and_the_default_is_delivery
FAILED tests/test_repo_db.py::TestTheStops::test_a_stop_type_outside_the_vocabulary_is_refused
... (every TestTheStops / TestTheStopStatusTheCourierReads test fails on the base tree,
     because the seed helper writes the new column: 11 failed, 20 deselected in 6.32s)
```

The db leg ran locally against `postgis/postgis:17-3.5` (the CI service image) started as
`courier-test-pg` on 127.0.0.1:5432; stopped after the run.

## Green

```
$ uv run --directory services/api pytest -q -m "not db"
560 passed, 1 skipped, 32 deselected in 38.26s

$ DATABASE_URL=... uv run --directory services/api pytest -q -m db
32 passed, 561 deselected in 15.79s

$ uv run --directory services/api ruff check app tests
All checks passed!

$ uv run --directory services/api mypy app
Success: no issues found in 27 source files

$ uv run --directory services/api python scripts/generate_api_client.py --check   (prettier on PATH)
check-api-client: the client is fresh
```

## Gates

| Gate | Command | Result |
|---|---|---|
| api suite (non-db) | `pytest -q -m "not db"` | 560 passed, 1 skipped |
| db suite | `pytest -q -m db` vs postgis/postgis:17-3.5 | 32 passed |
| lint | `ruff check app tests` | clean |
| typecheck | `mypy app` | clean (27 files) |
| client freshness | `generate_api_client.py --check` | fresh |
| floor / registers | `node scripts/ci/check-floor.mjs`, `check-parity.mjs` | clean (BUG-168 unique) |
| CI | PR #179 runs (incl. the `-m db` Postgres leg) | see the PR |

## Not verified here

The app half — presets per address and the stop card's read-out — is the lead's queue
(D62 step 4.3) and is not claimed. The package-level `tsc --noEmit` locally reports two
pre-existing `Cannot find module 'vitest'` errors in `packages/shared/src/__tests__` (the
pnpm shim is broken in this shell); CI's typecheck leg is the arbiter and the generated
`api.ts` itself reports no errors.
