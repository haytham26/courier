# Evidence — the spreadsheet import endpoint (D52 server half)

**Step:** D62 queue step 4.3 · **Branch:** `feat/trial-import` (head `3bf815f` +
docs commit) · **PR:** #180 · **Decision/ADR:** D63, ADR-025 · **Date:** 2026-11-03

## What the evidence is

`POST /shifts/{shift_id}/import` accepts a capped (5 MiB / 1000 rows) `.csv` or `.xlsx`
whose name and bytes agree, validates the whole file before storing anything, and lands
the stops in file order; `GET /shifts/{shift_id}/stops` reads them back with their
`type`/`priority`/`parcels` (unlocated, so `lat`/`lon` are null). Bad rows refuse the
import with the file row named and store nothing; unknown columns come back in
`ignored_columns`. The typed client carries the path and `ImportResponse`.

## Red first (PLAYBOOK §14)

The new tests were run against the pre-change tree (the branch's app/contracts/pyproject
files stashed back to the stack point, the tests kept):

```
$ uv run --directory services/api pytest -q tests/test_import_api.py
FAILED ... (12 of 13: the route is absent, the POSTs answer 404)
12 failed, 1 passed in 8.66s        # the 1 pass is the anonymous-caller 401, which the
                                    # auth layer answers before routing on both trees

$ DATABASE_URL=postgresql://courier:courier@127.0.0.1:5432/courier \
  uv run --directory services/api pytest -q -m db tests/test_repo_db.py -k imported_stops
E   ImportError: cannot import name 'ImportedStopRow' from 'app.repo'
1 error in 0.60s
```

The db leg ran against `postgis/postgis:17-3.5` started locally as `courier-test-pg`.

## Green

```
$ uv run --directory services/api pytest -q -m "not db"
573 passed, 1 skipped, 33 deselected in 45.54s

$ DATABASE_URL=... uv run --directory services/api pytest -q -m db
33 passed, 574 deselected in 15.93s

$ uv run --directory services/api ruff check .
All checks passed!

$ uv run --directory services/api mypy .
Success: no issues found in 73 source files

$ uv run --directory services/api python scripts/generate_api_client.py --check   (prettier on PATH)
check-api-client: the client is fresh
```

## Gates

| Gate | Command | Result |
|---|---|---|
| api suite (non-db) | `pytest -q -m "not db"` | 573 passed, 1 skipped |
| db suite | `pytest -q -m db` vs postgis/postgis:17-3.5 | 33 passed |
| lint | `ruff check .` | clean |
| typecheck | `mypy .` | clean (73 files) |
| client freshness | `generate_api_client.py --check` | fresh |
| floor / registers | `node scripts/ci/check-floor.mjs`, `check-parity.mjs` | clean (BUG-169 unique) |
| licence | `node scripts/ci/check-licenses.mjs` | not runnable in this shell (the pnpm shim is broken, so every `pnpm view` fails — pre-existing, the lock is untouched); openpyxl 3.1.5 and et_xmlfile 2.0.0 both report MIT from the installed metadata and are recorded in LICENSES.md; CI judges |
| CI | PR #180 runs (incl. the `-m db` Postgres leg and Dependency audits on the uv lock) | see the PR |

## Not verified here

Geocoding of the imported addresses (the address-intelligence slice owns it): imported
stops are deliberately unlocated and reported via `unroutable_stop_ids`. The app half —
the picker and the column-mapping UI — is the lead's queue (D62 step 4.3) and is not
claimed.
