# BUG-243 evidence - the mutation lane now measures the db suite too

## Why the API floor was capped
Run 42350269397 (dispatch on `a2ddf0f`): `{"killed": 1305, "survived": 396, "total": 2656, "no_tests": 941, "skipped": 0, "timeout": 14}` -> badge score (1305+14)/(2656-0) = **49.7 %**. mutmut's own badge keeps no_tests in the denominator (`__main__.py` `badge`: `tested = total - skipped`, `score = (killed + timeout) / tested * 100`), so killing all 396 survivors caps the API at (1319+396)/2656 = **64.6 %** - under the 70 % floor. The 941 no_tests mutants are almost all `app/repo.py` SqlAlchemyRepo lines reachable only through the db-marked suite, which the lane never ran: mutation.yml had no Postgres service, and the ini addopts are `-m 'not db'`.
ci.yml proves the other half: a `postgis/postgis:17-3.5` service container plus `DATABASE_URL=postgresql://courier:courier@127.0.0.1:5432/courier` and `pytest -m db` (36 db tests).

## The change
- `.github/workflows/mutation.yml` api job: same pinned PostGIS service + job-level `DATABASE_URL` as ci.yml (schema.sql needs PostGIS; never a production database).
- `services/api/pyproject.toml` `[tool.mutmut] pytest_add_cli_args`: appends `-m 'not __never__'`. mutmut appends these AFTER the ini addopts and pytest takes the LAST `-m` - verified locally: `pytest --collect-only -q -m 'not db' -m 'not __never__'` collects all 663 tests.
- `tests/test_repo_db.py` + `tests/test_demo_seed.py`: the schema fixtures read `packages/contracts/db/schema.sql` through `parents[3]`, which under mutmut's `mutants/` tree is the services directory; both now strip a trailing `mutants` via a `schema_script()` helper whose assert pins the anchor (`test_the_schema_anchor_never_resolves_into_the_mutants_copy`). Proven from an emulated mutants tree (service copy + `mutants/` copy, cwd=`mutants/`, PYTHONPATH=`mutants/`): the pin passes there.
- `tests/conftest.py::pytest_collection_modifyitems`: under the mutants tree WITHOUT `DATABASE_URL`, the db-marked items are DESSELECTED (not run) - a fixture `pytest.fail` is exit code 1, which mutmut counts as a KILL, so a database-less local lane would read a fake ~100 % floor. Verified: collect under the emulated mutants tree without DATABASE_URL deselects exactly the 37 db tests (597/634 collected); on the real tree the guard does not fire (634 collected) and the fixtures' fail-loud behaviour outside mutmut is untouched.

## Green
- `pytest -m db` against the local compose Postgres (55432): 37 passed.
- `pytest -m 'not db'`: 628 passed. ruff + mypy clean on the changed files.
- check-workflows / action-pins (the service image tag is allowed, same as ci.yml) / parity (0 reopened) / control-chars / mojibake / floor / doc-links / floor CLI suite: clean.
- Expected effect on the next dispatch: the 941 no_tests mutants become tested (killed or survived), which moves the API score toward the floor; remaining work is killing the named survivor classes.
