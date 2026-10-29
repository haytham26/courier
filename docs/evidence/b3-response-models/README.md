# Evidence — B3's response_model slice, and the auth readiness route it needed

Run locally on the founder's machine (Docker capped at 3 GB), against
`fix/b3-response-models` after `origin/main` was merged into it. Every claim below
has the command that produced it beside it.

## 1. The API's shapes are declared (the slice itself)

- `services/api/app/responses.py` is new: seventeen models, every field one the
  handler already filled, every name the contract's.
- `pytest services/api/tests`: **438 passed**, 1 skipped, 17 deselected.
- `ruff check .`: clean. `mypy app`: clean (26 files).
- `deploy-verify.log` also holds the local reproduction of the deploy verify leg
  (see §3), which is where the whole stack is proven.

The generated client, regenerated from the new document rather than hand-edited:

```
packages/shared/src/generated/api.ts   (regenerated; test_the_committed_client_is_fresh passes)
```

## 2. Red first (PLAYBOOK §14)

`red-first.mjs` is the experiment. It copies `origin/main`'s `app/` over the
branch's inside a scratch tree, with the branch's new test, and runs it:

```
FAILED tests/test_response_models.py::test_every_operation_declares_its_response_schema
FAILED tests/test_response_models.py::test_the_guard_itself_is_not_vacuous
FAILED tests/test_response_models.py::test_a_handler_without_a_model_is_caught
FAILED tests/test_response_models.py::test_the_documented_models_match_the_responses_module
4 failed in 4.05s
```

Four of four. On the branch: all four pass.

## 3. The stack the API's answers serve, and the route it was missing

The local reproduction of `infra/deploy.sh apply --from infra/ci-staging.env`
(this machine has no bash; the steps are the script's own, driven by
`docker compose` from `infra/`): postgres up and waiting, the contract's schema,
the Better Auth migration **inside the auth image**, then the whole stack up.

`deploy-verify.log` — the migration, and the containers:

```
== the auth service tables: the migration inside the auth image ==
 🚀 migration was completed successfully!          (in an earlier run of the same file:
 == starting the stack ==                             Error: syntax error at or near "WHERE" — the run
  Container courier-staging-auth_a-1 Healthy          before origin/main was merged into the branch,
  Container courier-staging-api_a-1 Healthy           which is the proof that the fix was needed)
  Container courier-staging-postgres-1 Healthy
```

`tables.txt` — the eleven Better Auth tables beside the contract's own
(`runs`, `shifts`, `delivery_events`, `run_routes`, `run_route_stops`,
`run_templates`, `door_memory`).

`readiness.txt` — the auth container's answer, `200 {"status":"ok","db":"postgres"}`,
which is what `infra/compose.staging.yml`'s healthcheck has always asked for and
which the service did not serve until this PR. The same container answers `200`
for `/api/auth/jwks`, which is Better Auth's own route: the probe does not
swallow it.

## What this proved, and what it did not

**Proved:** the API's answers are shaped and enforced at runtime; the stack builds
and comes up fully healthy (the auth container included) with the branch's code;
the migration creates the auth tables through the compose network.

**Not proved here:** the smoke test's authenticated round trip (it needs a staging
identity), and the `Deploy to the staging host` leg (FOUNDER_TODO carries the OCI
host). The CI verify leg re-runs the same procedure on every push to main.
