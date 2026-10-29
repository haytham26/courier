# Evidence — A5's first slice: the staging stack, the two images, and the deploy

All of it run locally, on the founder's machine (Docker capped at 3 GB), against the branch
`feat/a5-staging-deploy`. Nothing here is a claim without a command beside it.

| # | Command | Result |
|---|---|---|
| 1 | `docker compose --env-file infra/env.example -f infra/compose.staging.yml config --quiet` | `compose-renders.log` — the staging stack renders, and its services are postgres, valkey, api_a, auth_a, caddy |
| 2 | `docker compose --env-file infra/ci-staging.env -f infra/compose.staging.yml build …` | `images-build.log` — `courier-api:local`, `courier-auth:local`, `courier-postgres:16-3.6-pgvector` and `courier-caddy:2.10.2` all build |
| 3 | `bash -n infra/deploy.sh` and `bash -n infra/smoke.sh` | `scripts-parse.log` — both scripts parse |
| 4 | `infra/deploy.sh apply --from infra/ci-staging.env` | `deploy-local.log` — the migrations run, `up -d --wait` brings postgres and valkey up healthy, and the **API container reaches `Healthy`** |
| 5 | `docker inspect courier-staging-api_a-1` and its logs | `api-container.log` — `Application startup complete`, then `GET /healthz 200` from the healthcheck |
| 6 | `docker logs courier-staging-auth_a-1` | `auth-gap.log` — the recorded gap, printed by Better Auth itself |
| 7 | `node scripts/ci/check-workflows.mjs` | `gate.log` — the repository's ten workflows (including the new deploy one) pass the key and input checks |
| 8 | `node --test "scripts/*/__tests__/*.test.mjs"` | `all-tests.log` — 53 tests pass |

## What the deploy proved, and what it did not

**Proved:** the stack renders with the repository's real paths; both service images build; the
migrations apply; the API boots inside the stack with its environment and becomes healthy; the
healthcheck, the smoke script and the workflow file are all syntactically honest.

**Not proved, and named rather than glossed:**

1. **The auth service's own schema.** Its container logs end with Better Auth's own diagnosis:
   `Missing tables user, session, account, verification, organization, team, teamMember, member,
   invitation, twoFactor, jwks` and its help line `Run npx auth migrate`. The migration needs the
   service's options module (`--config`), which is the next slice's work; inventing tables here would
   be worse than the gap.
2. **The smoke test's authenticated round trip.** `infra/smoke.sh` runs its unauthenticated checks
   (TLS, the version, the health endpoints' 404, the anonymous 401 on the seed) and reports the
   ones it skipped, because the local VM has no staging identity.
3. **The OCI host.** `deploy.yml`'s deploy leg names the secrets it waits for instead of doing
   nothing; nothing in this evidence claims a staging deployment.

## The three defects this slice found in the existing stack

1. **`infra/compose.prod.yml` named paths that do not exist** — `apps/api` (the API lives in
   `services/api`) and `../db/schema.sql` (the schema is `packages/contracts/db/schema.sql`). The
   stack could not build.
2. **The API's healthcheck asked for `/health/ready`**, which this API does not serve: its contract
   carries `/healthz` (the Caddyfile answers 404 for `/health*` in front of it, deliberately). The
   container booted and then reported unhealthy. Both compose files are corrected.
3. **The API's boot refused a POD store with no signing grant** (`POD_URL_SIGNING_SECRET must be at
   least 32 characters`), and the compose files did not pass the variable through. Staging now sets
   it from the environment, with the local backend.
