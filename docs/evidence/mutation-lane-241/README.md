# BUG-241 evidence - the B4 mutation lane repaired and the survivor list exported

## The breakage (red)
Nightly runs 41821954541, 42019403364, 42210602994 (2026-11-04..06) each failed in 10-36 s with NO artifact:
- API job 127868023494 (run 42210602994): mutmut's stats pass ran `tests/auth/test_websocket_auth.py::TestTheDeletedDependency::test_the_query_string_is_read_only_to_explain_the_refusal`, whose `app_sources()` anchored at `Path(__file__).parents[2]` - under mutmut that is `<service>/mutants`, the copied tree - and the copy held several readers of `query_params.get("token")`, so `len(readers) == 1` failed: `AssertionError: [(.../mutants/app/auth/websocket.py, 996), ..., (.../mutants/app/auth/websocket.py, 1124), ...]` then `failed to collect stats. runner returned 1`.
- Voice job 127868023242: `ERROR collecting tests/test_eval_audio.py ... ModuleNotFoundError: No module named 'numpy'` (numpy/soundfile are the `eval` extra; the lane syncs `--extra dev` only; ci.yml line 86 syncs `--extra dev --extra eval`), then `failed to collect stats`.

Reproduced locally (mutmut cannot run on Windows, boxed/mutmut#397): emulated the runner's `mutants/` tree in a temp dir (copy of `app/`+`tests/`, cwd = `mutants/`, PYTHONPATH = `mutants/`, one stale extra reader appended to the copied websocket.py): pre-fix the test fails with `len(readers) == 2` (rc 1); post-fix it passes (rc 0), because the helper now strips the trailing `mutants` component and scans the real tree.

## The fix
- `services/api/tests/auth/test_websocket_auth.py` + `test_jwks.py`: `app_sources()`/`_app_sources()` strip a trailing `mutants` component; new invariant tests `test_app_sources_never_resolves_into_the_mutants_copy` in both files pin it.
- `services/courier-voice/pyproject.toml`: `pytest_add_cli_args` now also `--ignore=tests/test_eval_audio.py` (`app/eval_audio.py` is outside the floor's `source_paths`; ci.yml proves the test with the eval extra).
- `scripts/ci/check-mutation-floor.mjs`: `run` mode now also runs `mutmut results` and writes `mutants/mutmut-results.txt` (`writeResults`, `buildMutmutCommand` exported); the extras lookup normalises the path separator (Windows `path.relative` silently dropped the API's `s3test` extra). 4 new CLI tests; the suite is 11/11.
- `.github/workflows/mutation.yml`: both jobs upload `mutmut-cicd-stats.json` AND `mutmut-results.txt`.
- `.gitignore`: `services/*/mutants/`, `.mutmut-cache`.

## Green
- `pytest tests/auth/test_websocket_auth.py tests/auth/test_jwks.py -m "not db"`: 66 passed.
- Same files under the emulated `mutants/` tree: 4 passed (the fixed tests + the new invariant tests).
- `node --test scripts/ci/__tests__/check-mutation-floor-cli.test.mjs`: 11/11.
- Full API suite `-m "not db"`: 624 passed. ruff + mypy clean on the changed files. Voice collects 312 tests.
- check-workflows / action-pins / parity (0 reopened) / control-chars / mojibake / floor / doc-links: clean.
