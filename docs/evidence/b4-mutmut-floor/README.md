# B4 — the mutation floor (BUG-112, `docs/plan/AUDIT_2026-10-25.md` §B4)

**The audit's done-when:** "mutmut runs scoped in CI at the 70 % floor" over
`services/api` (sync, runs, auth) and `services/courier-voice` (the turn machine).

## What is on main

| Piece | Where |
|---|---|
| mutmut, both services | `services/api/pyproject.toml`, `services/courier-voice/pyproject.toml` (the `dev` extra) |
| the scope | `[tool.mutmut] source_paths` in each: the API mutates `app/main.py`, `app/repo.py`, `app/routing.py` and `app/auth/{jwks,routes,websocket}.py`; the voice service mutates `app/turns.py`, `app/conversation.py`, `app/safety.py` and `app/offline_brain.py` |
| the floor | `scripts/ci/check-mutation-floor.mjs` — runs mutmut, exports its own stats, and exits 1 below 70 % |
| the CI lane | `.github/workflows/mutation.yml` — nightly (03:40 UTC) and `workflow_dispatch`, two jobs (api, voice), each uploading its stats artefact for 90 days |
| the proof | `scripts/ci/__tests__/check-mutation-floor.test.mjs`, 10 tests |

## The score is mutmut's, not ours

Read from the installed source — `mutmut/__main__.py`'s `badge` command:

```
tested = total - skipped
score  = ((killed + timeout) / tested) * 100
```

A timeout counts as killed (a mutant that hangs the suite has no surviving
assertion), and the skipped are not tested. The floor script uses exactly that
arithmetic, and the tests pin it: the boundary at exactly 70 %, a mutant below
it naming the survived count, the skipped not counting as tested, a stats object
with no mutants at all **failing** rather than passing, and a truncated or
non-numeric stats object refusing to be scored rather than defaulting to green.

## What is proved, and where

- **The arithmetic** is proved locally, ten tests, red first (the first run of
  the suite failed on two expectations I had written wrong — `77.7` and a
  missing phrase — and the tests were corrected, not the code they describe).
- **The mutmut run itself cannot be proved locally**: mutmut exits on Windows
  with `To run mutmut on Windows, please use the WSL` (`platform.system() ==
  "Windows"`, boxed/mutmut#397) and this machine has no WSL. So the CI lane is
  the harness for the run — the same division the restore drill already uses
  (Postgres in a service container, not on the workstation).
- **`source_paths` is mutmut 3's name for the scope**; `paths_to_mutate` is
  deprecated and warns (read from `mutmut/configuration.py`). `do_not_mutate`
  takes file globs, not `module:function` names, so nothing is excluded — a
  mutant in `healthz` that survives is a real gap, not noise.

## What this slice does NOT do yet

- **The PR-time scoping.** `mutmut run` takes mutant names, not file paths, so
  the changed-files variant needs the mutant names for the changed files read
  out of the `mutants/*.meta` files a first run writes — a follow-up slice, and
  one that wants the first nightly run's measured duration before it decides
  whether a PR can afford it. The workflow's header says so, and
  `check-mutation-floor.mjs check <service>` is already the command that reads
  the uploaded artefact.
- **The first green baseline.** Nothing has run mutmut yet, so no score exists;
  the lane's first nightly run is the baseline, and a lane that fails on its
  first run with survivors is doing its job (the survivors become tests, and
  BUG-112's row records them).
