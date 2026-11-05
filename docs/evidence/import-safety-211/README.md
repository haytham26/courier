# Evidence — the import safety item (BUG-211)

**Step:** the 2026-11-05 audit's item 2 · **Branch:** `import-safety-211` ·
**PR:** #195 · **Date:** 2026-11-05

## What landed

The import endpoint accepted files the planner cannot route and trusted the
spreadsheet's bytes. All of it in one PR:

1. **The cap is the planner's own.** `MAX_IMPORT_ROWS` is now `MAX_ROUTE_STOPS`
   (500), imported from `routing.py` — a file of 501 to 1000 rows used to be
   accepted and stored, and then every route call for that shift failed with a
   422. One cap, one number.
2. **The shift has a total.** All three `put_imported_stops` implementations
   (the memory repo, the in-memory fake, the SQL repo) count the shift's stops
   and raise past the cap; the endpoint's existing ValueError→409 mapping names
   the totals. Nothing lands on a refusal.
3. **The sequence is the database's.** The SQL repo takes the shift row's lock
   (`SELECT … FOR UPDATE`) before reading `MAX(sequence)`, and the schema's
   index is now `UNIQUE(shift_id, sequence)` — with an idempotent migration
   block that dedupes (lowest id wins) an existing database first, so the index
   can be built over data the unlocked window may have produced.
4. **A spreadsheet is untrusted bytes.** The zip's inflatable total is read
   from its own index (≤ 50 MiB) before the workbook opens, and openpyxl's
   exceptions — `BadZipFile`, `KeyError`, `InvalidFileException`,
   `etree.ParseError`, `ValueError`, `OSError` — map to a 422 naming the file.
   The rows and columns are capped while they stream.
5. **The trial scope's D8-correction claim is a decision, not a lie.**
   ADR-026 records that the import stores what it parsed (the correction needs
   the LINZ slice the deployment does not carry, and the stops are unlocated
   anyway), and TRIAL_SCOPE row 6 is corrected.
6. **The db fixtures now respect the invariant.** `seed_stop` assigns the next
   sequence the way production does — the old helper hardcoded 1, so it could
   not seed a second stop into a shift, which is data production cannot hold.

## Red first (PLAYBOOK §14)

```
# the unique index, proven by reverting the schema to the non-unique index:
E   Failed: DID NOT RAISE IntegrityError
1 failed

# the corrupt .xlsx (the broken-sheet case is what proved the first mapping
# incomplete: ParseError was not in the tuple):
FAILED test_a_real_workbook_with_a_broken_sheet_is_still_422
E   xml.etree.ElementTree.ParseError: unclosed token: line 1, column 0
```

(Plus the cap and 409 tests, written against the pre-change behaviour: the
501st row accepted, repeated imports unbounded.)

## Green

```
$ pytest -q -m "not db"     # services/api
585 passed, 35 deselected

$ DATABASE_URL=postgresql://courier:courier@127.0.0.1:5432/courier pytest -q -m db
35 passed, 585 deselected   # vs postgis/postgis:17-3.5

$ ruff check . / mypy .
All checks passed! / Success: no issues found in 66 source files

$ generate_api_client.py --check
check-api-client: the client is fresh   # byte-identical: the contract changes
                                         # are description-only
```

## The lead's announcement

The row cap moved 1000 → 500 (= the routing layer's own cap). The typed client
is unchanged (the descriptions are text-only), but an app that lets a planner
paste a 501-1000-row sheet will now get a 422 naming the cap instead of a 201
followed by route failures — a behaviour change on the route of
`POST /shifts/{id}/import`, and the 409 on a repeated import is new.

## Not claimed

The D8 correction on the import path (ADR-026 records the decision: it lands
with the address-intelligence slice, which owns the register the deployment
would need). The live two-replica lock behaviour is not measured here — the
index is the belt-and-braces that makes the lock's window harmless.
