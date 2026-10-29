# ADR-020 — A5's slice: the staging stack, the two images, and the deploy with its smoke test

- **Status:** partial (the deploy is proven through the migrations and the API's health; the auth
  service's own schema is the next slice, and the OCI host is still the founder's)
- **Date:** 2026-10-27
- **Decides:** `docs/plan/AUDIT_2026-10-25.md` A5, the staging deploy
- **Builds on:** `infra/compose.prod.yml` and `infra/zero-downtime.md` (the stack and the swap),
  `infra/monitoring` (the heartbeat), the API's healthchecks, ADR-019 (the demo seed the smoke test
  drives), BUG-067 (the map-pack workflow-file lesson: a workflow that cannot start says nothing)

## Context

A5's evidence: `infra/compose.prod.yml`, `backup.sh` and the restore drill exist, but there is no
deploy job and no running environment. The audit's founder input is the OCI host and key
(FOUNDER_TODO), and it says plainly: build and test the workflow against a local VM until then.

Two things in the existing stack were false before this slice:

- **The compose file named paths that do not exist.** `apps/api` (the API has lived in `services/api`
  since the first restructure) and `../db/schema.sql` (the schema is
  `packages/contracts/db/schema.sql`). The stack could not build, let alone deploy.
- **The API and the auth service had no images.** `infra/postgres`, `infra/caddy` and
  `infra/monitoring` carry Dockerfiles; the two services the deployment exists to run did not.

## Decision

### 1. The staging stack is a complete file, not an override of production's

`infra/compose.staging.yml` defines its own five services (postgres, valkey, one API replica, one
auth replica, the edge). It is deliberately **not** a delta on `compose.prod.yml`:

- The zero-downtime swap (`infra/zero-downtime.md`) is a production guarantee: two replicas so the
  edge's retry has somewhere to go. Staging proves the images, the migrations and the wiring, and one
  replica does that.
- Compose's `depends_on` is a **deep merge**, so an override cannot drop `api_b` from the edge's
  dependencies — `api_b` is still defined, and the merge keeps the reference. Staging states its own
  stack instead of subtracting from production's.
- Its network is **172.29**, not production's 172.28, so both stacks can run on one host (a local VM,
  or a production host that also carries a canary).

### 2. Two images, both pinned and both built in CI

`services/api/Dockerfile` and `services/auth/Dockerfile`:

- the API's dependencies are installed by **uv from the lock** (`uv sync --frozen` when the lock is
  committed, the resolver otherwise), and the runtime carries no test, ops or load-test package;
- the auth service's build context is the repository root (its `@courier/eslint-config` sibling is a
  workspace package) and its output is `dist/`, which the healthcheck's `node` starts;
- both use the repo's pinning convention for base images, and the versions are stated where the
  tools that need them can be read.

### 3. The deploy is three steps, and each one can fail alone

`infra/deploy.sh apply --from <env>` (default staging, `--prod` for the production stack):

1. **The migrations.** `packages/contracts/db/schema.sql`, applied with `ON_ERROR_STOP=1` against a
   database the script waits for (`docker compose up -d --wait postgres`, because `up -d` returns when
   the container is up, not when the server accepts connections — the first attempt failed with the
   socket's "no such file or directory").
2. **The state file.** The images that were running, recorded by the names the compose files read,
   so a rollback re-applies exactly what was there rather than a guessed "previous" tag.
3. **The swap.** `docker compose up -d --remove-orphans`.

`infra/deploy.sh rollback` re-applies the recorded images, and `infra/smoke.sh` drives a real round
trip through the edge: TLS, the deployed version, the health endpoints' 404, and the demo-seed round
trip ADR-019 made possible. The token is optional and that is honest: the CI **verify** leg has no
staging identity, so it runs what it can prove without one and says which checks it skipped. A smoke
test that faked a token to make itself green would be worse than no test.

### 4. The workflow is the same procedure, on a host that does not exist yet

`.github/workflows/deploy.yml` has two legs:

- **verify** runs on every push: it builds both images, brings the whole staging stack up on the
  runner (which is the local VM the audit names), and runs the smoke test.
- **deploy** runs the same two scripts over SSH — rsync of `infra/`, `services/` and `packages/`,
  then `deploy.sh apply` and `smoke.sh` — and rolls back on a failed smoke test. When the OCI host
  and key are not configured it prints the exact secrets it is waiting for: a deploy leg that
  silently did nothing would be worse than one that says it has nowhere to go.

## Consequences

- A push to main now **starts** the staging deployment path (the verify leg), which is the only part
  of the audit's done-when that can exist before the OCI host: `a push to main deploys to staging`.
- The stack's paths are real, so the next slice's work is the auth service's schema rather than a
  build that cannot start.
- The rollback is one command with a recorded truth, not a guess.

## What this slice does not do (and why)

- **The auth service's own schema.** The service runs on Kysely's `PostgresDialect`, and Better Auth
  creates its tables with its own migration, which the deploy does not yet run: the container came
  up healthy but its logs end with `missing-table "jwks"`. The fix belongs to the auth service's
  slice (a `migrate` step in the deploy, or a migration the entrypoint runs on start), and this slice
  records the finding rather than inventing a table.
- **The monitoring.** `infra/monitoring` exists and is not wired in; the heartbeat needs a domain
  and a mailbox, which is the same FOUNDER_TODO the deploy leg waits for.
- **The licence-gated map-pack dispatch.** BUG-067's proof runs stop at the founder's own gate
  (`--confirm-offline-use`), which is a founder decision and is not taken here.

## Verification

- The staging compose renders against `infra/env.example` and `infra/ci-staging.env`
  (`docker compose … config --quiet`), and it asks for 1664 MB — inside the founder's 3 GB VM.
- Both images build locally: `courier-api:local` and `courier-auth:local`, plus the pinned PostGIS
  and Caddy images.
- `infra/deploy.sh apply` carried the stack through the migrations to a healthy API container (the
  auth service's missing table is the recorded gap), and `bash -n` parses both scripts.
- `.github/workflows/deploy.yml` parses as YAML, and BUG-067's own gate (`check-workflows.mjs`)
  passes over the repository's nine workflows.
