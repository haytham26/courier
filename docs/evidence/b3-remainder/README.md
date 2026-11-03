# Evidence — B3's remainder (BUG-059 closed, BUG-170)

**Step:** audit item B3's done-when · **Branch:** `b3-remainder` (impl `bea622e` + docs) ·
**PR:** #181 · **Date:** 2026-11-03 · **Registers:** BUG-059 → fixed, BUG-170 filed+fixed,
PARITY 311 added

## What landed

1. **The fixture hoist** (BUG-059): the shared `repo`, `verifier_key`, `client`,
   `other_client`, `anonymous_client` fixtures and the `make_stop`/`make_request`
   routing helpers live once in `services/api/tests/conftest.py`; nine test modules now
   import them (the solver binds its own 22-Oct start_at onto the shared
   `make_request` via `functools.partial`). Pinned by `tests/test_fixture_hoist.py`,
   which scans every API test module and refuses a redefinition outside `conftest.py`
   (the socket, JWKS and db-leg modules are excepted by name, with their reasons, in
   the pin's docstring).
2. **The bounded settings store** (BUG-059): `MAX_DRIVER_SETTINGS = 1000` in
   `services/courier-voice/app/main.py`; `remember_settings()` re-inserts on update
   (an active courier is never evicted) and evicts the oldest entry past the cap. All
   three write paths (turn settings, session-create settings, `PUT /v1/settings`) go
   through it. Pinned by `test_the_driver_settings_store_is_bounded` in
   `tests/test_http.py`, which drives `MAX_DRIVER_SETTINGS + 1` distinct drivers
   through the real route and asserts the store holds exactly the cap, oldest gone.
3. **The psycopg linking note**: `docs/product/LICENSES.md` records psycopg +
   psycopg-binary 3.3.6 as LGPL-3.0-only (PEP 503 expression read from the installed
   metadata on 2026-11-03) with the note BUG-059 asked for — a runtime-loaded driver
   library, never statically linked or distributed, LGPL-3.0 §4(d).
4. **The MASVS L1 self-review**: `docs/security/MASVS-L1.md`, reviewed against main
   `0d8431f` — every L1 control mapped to evidence (file:line) or to its tracked gap
   (PARITY 195/197 hold SQLCipher, `allowBackup:false`/network-security-config,
   pinning, root detection as the L2 items).

## Red first (PLAYBOOK §14)

Both new tests were run against the pre-change tree (the branch's app/test files
stashed back to `origin/main`, the new tests kept):

```
$ uv run --directory services/api pytest -q tests/test_fixture_hoist.py
FAILED tests/test_fixture_hoist.py::test_no_test_module_redefines_a_hoisted_name
E   Left contains 38 more items, first extra item:
    'test_demo_seed.py:45 (def repo() -> InMemoryRepo:)'
FAILED tests/test_fixture_hoist.py::test_conftest_defines_every_hoisted_name
2 failed in 0.22s

$ uv run --directory services/courier-voice pytest -q tests/test_http.py -k bounded
E   ImportError: cannot import name 'MAX_DRIVER_SETTINGS' from 'app.main'
1 failed, 28 deselected in 0.39s
```

## Green

```
$ uv run --directory services/api pytest -q -m "not db"
575 passed, 1 skipped, 33 deselected in 42.31s        # 573 before + the 2 pin tests

$ DATABASE_URL=postgresql://courier:courier@127.0.0.1:5432/courier \
  uv run --directory services/api pytest -q -m db
33 passed, 576 deselected in 14.46s                    # vs postgis/postgis:17-3.5

$ uv run --directory services/courier-voice pytest -q
229 passed in 17.59s                                   # includes the bounded-store test

$ uv run --directory services/api ruff check .
All checks passed!
$ uv run --directory services/api mypy .
Success: no issues found in 74 source files
$ uv run --directory services/courier-voice ruff check .
All checks passed!
$ uv run --directory services/courier-voice mypy .
Success: no issues found in 41 source files
```

## Gates

| Gate | Command | Result |
|---|---|---|
| api suite (non-db) | `pytest -q -m "not db"` | 575 passed, 1 skipped |
| db suite | `pytest -q -m db` vs postgis/postgis:17-3.5 | 33 passed |
| voice suite | `pytest -q` | 229 passed |
| lint | `ruff check .` both services | clean |
| typecheck | `mypy .` both services | clean (74 + 41 files) |
| floor / registers | `node scripts/ci/check-floor.mjs`, `check-parity.mjs` | clean (BUG-170 unique, PARITY 311 well-formed) |
| mojibake | `node scripts/ci/check-mojibake.mjs` | clean |
| CI | PR #181 runs | see the PR |

## Not claimed

The MASVS L2 hardening (SQLCipher, pinning, root detection, `allowBackup: false`) stays
`Planned (task)` at PARITY 195/197 — the review records them as gaps with their tracking
rows; it does not implement them. The app-side one-liners (`app.json`) belong to the
lead's slice.
