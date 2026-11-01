# B4 — the mutation floor's first real measurement (BUG-112)

**The audit's done-when is "mutmut runs scoped in CI at the 70 % floor" over `services/api`
(sync, runs, auth) and `services/courier-voice` (the turn machine). On 2026-11-01 the lane ran
end to end for the first time and produced two scores.**

## The baseline, from run [41271228571](https://github.com/haytham26/courier/actions/runs/41271228571)

| Service | Score | Killed / tested | **Survived** |
|---|---|---|---|
| `services/api` (sync, runs, auth) | **50.8 %** | 1219 / 2401 | **1182** |
| `services/courier-voice` (the turn machine) | **54.0 %** | 360 / 667 | **307** |

The lane exits 1 on both, which is correct: the floor is 70 % and neither service reaches it.
**That is not a red pipeline — it is the measurement the audit asked for, finally existing.**
Each of the 1489 survivors is a mutant the suites do not kill, i.e. a test that does not exist yet.

Both scores are reproducible from the uploaded artefacts (`mutation-api-stats`,
`mutation-voice-stats`), 289 and 277 bytes, kept for 90 days.

## How the lane was made to run — eight defects in one function, each found by dispatching it

Every one of these was invisible until the lane was run by hand. That is the lesson worth keeping
from this file: **a floor is not a floor until it has been made to run, and a green lane over a
step that did nothing is worse than a red one.**

| # | Symptom (run) | Cause | Fix |
|---|---|---|---|
| 1 | lane `success` in 0.25 s, no output, no artefact | the entry guard resolved `new URL(import.meta.url).pathname.slice(1)` against the **working directory**, so it never matched `process.argv[1]` and `main()` never ran | `fileURLToPath(import.meta.url)`; and `check-mutation-floor-cli.test.mjs` runs the CLI as a **real process** |
| 2 | `spawnSync mutmut ENOENT` | `uv sync` puts the CLI in `<service>/.venv/bin`, which is not on the runner's PATH | run it through `uv run` |
| 3 | `Failed to spawn: mutmut` | `uv run` syncs the **default** dependencies, so mutmut (a `dev` extra) was missing | `--extra dev` |
| 4 | `RuntimeError: the s3test extra (boto3 + moto) must be installed in CI` | the API's `tests/test_pod_store.py` needs `s3test`, exactly as `ci.yml` installs | `--extra s3test` for the API |
| 5 | `Extra s3test is not defined … for courier-voice` | a shared flag list: one missing, one impossible | per-service extras (`EXTRAS_BY_SERVICE`) |
| 6 | `ModuleNotFoundError: No module named 'vacuous_guard'` | `tests/test_vacuous_guard.py` inserts `loadtests/` from `__file__`; the mutant tree has no such directory | `also_copy = ["loadtests"]` — the one case `also_copy` does fix |
| 7 | `FileNotFoundError … services/services/api/scripts/generate_api_client.py` | `tests/test_api_client.py` resolves the repo root through `parents[3]`, which the copied tree gets wrong; it also needs `node_modules` for prettier | `--ignore=tests/test_api_client.py` |
| 8 | `FileNotFoundError … services/packages/contracts/openapi.yaml`; then `scripts/data/fetch-linz.py is missing` | the same `parents[3]` shape in `test_contract.py` and `test_linz_pipeline_paths.py` | `--ignore` for both |

`also_copy` was also tried for the root-relative tests and **did not work**: it copies a directory
into the mutant tree, it does not move the tree's root, and these tests resolve their root from
`__file__` upward. That is written in each config so nobody re-derives it.

## What the ignores do and do not mean

The three ignored tests are **not weakened**: `ci.yml` runs the whole suite on every push, all of
them included, and mutmut's scope is exactly the modules the audit names. The ignores are the
harness refusing to blame the code for its own layout — the same discipline as the SLO profile's
vacuous-green guard, which learned it the same way.

## The next work item, and it is a real one

**1489 survivors, grouped by the module they live in, each becoming a red-first test.** The audit's
done-when (70 % floor) is not met, and the floor is not to be lowered to meet it
(`docs/plan/CONSTRAINTS.md`). The survivors are the work.
