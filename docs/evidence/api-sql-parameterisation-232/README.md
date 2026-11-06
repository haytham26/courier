# BUG-232 evidence - the SQL-parameterisation gate (audit item 4d, research row 62)

## The gap
`services/api` was already fully parameterised by habit (`text(...)` + `execute(statement, params)` in `app/repo.py`/`app/demo.py`, DBAPI `?` + tuple in `app/address_correction.py`), but no CI gate looked at the SQL, so one future edit could interpolate a value into a query string.

## Red first
The gate's own test fixtures: f-string SQL, `"..." + var` concatenation, `.format(...)` SQL, and placeholder SQL executed without params all PASSED (exit 0) before the gate existed. After a first naive implementation the gate flagged 31 false positives on the real tree (prose containing `text(`, `read_text(`, `text.replace(`, multi-line `text(` assignments) - fixed by only classifying RHS that IS a SQL literal/text(...) and reading whole logical lines.

## Green after
- `node scripts/ci/check-sql-parameterisation.mjs` on the real tree: **65 SQL statements in 31 files of services/api/app, clean**.
- `scripts/ci/__tests__/check-sql-parameterisation.test.mjs` 9/9: f-string refused; concat-with-variable refused; .format refused; placeholders-without-params refused; text()+params dict passes; qmark+tuple passes; static placeholder-free SQL passes; SQL-mentioning docstring not flagged; the real tree passes.
- Wired into the `floor` job of `.github/workflows/quality-gates.yml` (step after the conflict-marker gate); row in `scripts/ci/README.md`; `check-workflows.mjs` still clean (15 workflows).
- `node --test "scripts/*/__tests__/*.test.mjs"` all pass; parity 0 reopened vs origin/main.
