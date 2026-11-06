# BUG-236 evidence - the trial server's seeded day carries the day-one fields (audit item 5)

## The gap
`POST /demo/runs` (`services/api/app/demo.py`) seeded a day of bare ids and addresses: the run had no
`break_start_at`/`break_end_at`/`finish_lat`/`finish_lon`, every stop was `priority=false` with NULL windows
and `type='delivery'`, and `_STOP_SQL` did not even have the `type`/`time_window_*` columns. The read side
already carried the fields (`RunResponse.break_window/finish`, `StopResponse.type/window_*`), so GET /runs and
GET /shifts/{id}/stops answered null/defaults for a day the A1 job drives as the trial's own proof.

## Red first
- `TestTheSeededDayCarriesTheDayOneFields` (3 tests in `services/api/tests/test_demo_seed.py`):
  `3 failed` on the pre-fix tree - e.g. `assert by_seq[2]["priority"] is True` → `assert False is True`.
- The A1 rows assert's new pin in `scripts/ci/assert-a1-rows.sh` (run carries break window + depot finish;
  three stops carry a priority flag, a window or a pickup type) failed against the suite's old fixture:
  `::error::expected the seeded run to carry its break window and its depot finish (BUG-236), found 0`.

## Green after
- `demo_day_for`: run gets break (start+4h..+5h) and finish=depot; stops get priority (index 1), window
  (index 2, start+6h..+8h), pickup type (index 3). `_STOP_SQL`/`_write_stops` write `type`,
  `time_window_start`, `time_window_end`. `demo_day_body` + `DemoStopResponse` + contract `DemoStop` carry
  them on the seed answer; typed client regenerated (`generate_api_client.py check`: fresh).
- `pytest tests/test_demo_seed.py -m "not db"`: 27 passed. Full suite `-m "not db"`: 624 passed.
- `node --test scripts/ci/__tests__/a1/assert-a1-rows.test.mjs` (compose Postgres, the A1 job's own stack):
  pass 2 fail 0, with the fixture day at the day-one shape.
- ruff clean; mypy 81 files clean; check-sql-parameterisation 65 statements clean; contract/api-client/
  response-model tests 14 passed; all node gates pass; parity 0 reopened vs origin/main.
- Seed shape unchanged (1 run / 1 shift / 5 stops / 4 delivery events), so the existing A1 asserts hold.
