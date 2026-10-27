# ADR-021 — the auth service's own tables, migrated by the deploy (A5's next slice)

- **Status:** accepted
- **Date:** 2026-10-28
- **Decides:** `docs/plan/AUDIT_2026-10-25.md` A5, the part the first staging deploy proved
- **Builds on:** ADR-020 (the staging stack, the deploy, the smoke test), the contracts package
  (the API's schema), Better Auth's own migration CLI

## Context

The first staging deploy (the verify leg of `.github/workflows/deploy.yml`, run 40534562766) ran all
the way to a **healthy API container** and then stopped:

```
Container courier-staging-api_a-1  Healthy
dependency failed to start: container courier-staging-auth_a-1 is unhealthy
```

The auth container's own logs say why, in Better Auth's words:
`Database schema mismatch … Missing tables user, session, account, verification, organization,
team, teamMember, member, invitation, twoFactor, jwks` and its help line, `Run npx auth migrate`.

The contract's `packages/contracts/db/schema.sql` — which the deploy applies — carries the API's
tables. The auth service's tables are a **second migration in the same database**, created by Better
Auth's own CLI from the options the service is configured with. Nothing in the repository ran them.

## Decision

**The deploy runs both migrations, in their own lanes.**

- `infra/deploy.sh apply` keeps applying `packages/contracts/db/schema.sql` (the API's tables,
  idempotently, with `ON_ERROR_STOP=1`) and then runs the auth service's CLI:
  `pnpm --filter @courier/auth exec -- npx --yes auth migrate --yes --config
  services/auth/migrate.config.ts`.
- `services/auth/migrate.config.ts` is the module the CLI reads: it exports the same
  `createAuth(loadConfig())` the service builds, so the deployment's environment is the only input
  and no server is started.
- A failure in either migration stops the deploy **before any image is changed**, which is the same
  rule the API's migration already had: a half-migrated database is not a place to swap an image.

## Consequences

- A staging deploy brings up both services healthy, and the smoke test can drive the seeded round
  trip through the edge.
- The two migrations are visibly two: the API's is a file in the contracts package, the auth
  service's is a CLI run in its own workspace. A change to one does not touch the other.
- `infra/monitoring` and the founder's OCI host, key and domain remain the next items (the audit's
  founder input).

## Verification

- `infra/deploy.sh apply` runs both migrations locally and the stack reaches two healthy services
  (the local VM's proof, once the machine's prettier-independent gates allow it).
- `.github/workflows/deploy.yml`'s verify leg runs the same script on the runner: the proof run is
  the one that had stopped at the auth service.
