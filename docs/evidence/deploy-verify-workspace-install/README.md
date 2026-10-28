# `Deploy staging` red on every push to main (BUG-070 — **FIXED 2026-10-29**)

Five runs, three causes. All three are fixed; main is green on this workflow since the merge of
`fix/bug-070-auth-cli-sql`. This folder is the record of all of it, so nobody has to re-derive it.

| Run | Push | Failure | Cause |
|---|---|---|---|
| [40603133483](https://github.com/haytham26/courier/actions/runs/40603133483) | `1684ea3` | `MODULE_NOT_FOUND`, `requireStack: [services/auth/src/config.ts]` | 1 — **fixed** |
| [40612562455](https://github.com/haytham26/courier/actions/runs/40612562455) | `811e7df` | the same | 1 — **fixed** |
| [40645435652](https://github.com/haytham26/courier/actions/runs/40645435652) | `4132768` | `MissingEnvError: Missing required env: AUTH_DATABASE_URL, BETTER_AUTH_URL` | 2 — **fixed** |
| [40650186974](https://github.com/haytham26/courier/actions/runs/40650186974) | `da7dd98` | `Error running Better Auth CLI: error: syntax error at or near "WHERE"`, `routine: 'scanner_yyerror'` | 3 — **fixed** |
| the run on this branch | the merge of `fix/bug-070-auth-cli-sql` | none: the deploy reaches the smoke test | 3 — **fixed** |

All four in the `Build and smoke-test the staging stack (the local VM)` job at the
`Bring the staging stack up` step. The `Deploy to the staging host` job was **skipped, correctly**,
every time: `COURIER_STAGING_HOST` is not set, so the leg printed its notice and did nothing.
**This was never a secrets problem** — the workflow already does the right thing there. It was
§17.2's nightmare: main red on every push, four times, and each cause read like something else.

## Cause 1 — the migration ran on a host with no `node_modules` (fixed)

`infra/deploy.sh:migrate_auth` ran `npx auth migrate --yes --config src/migrate.config.ts` on the
runner, and the config chain is:

```
services/auth/src/migrate.config.ts:24  import { loadConfig } from "./config.js"
services/auth/src/config.ts:8           import { z } from "zod"
```

A GitHub runner checks out the tree with **no `node_modules`**, so jiti/c12's module loader raised
the raw `MODULE_NOT_FOUND`. The first fix added `pnpm install --frozen-lockfile` to the verify leg,
which removed the cause — and exposed the second.

## Cause 2 — the migration ran where the service's configuration does not exist (fixed)

With the workspace installed, the CLI loaded the service's own validated configuration
(`loadConfig` in `src/config.ts`) and stopped on `AUTH_DATABASE_URL` and `BETTER_AUTH_URL`.
`infra/compose.staging.yml:169-170` gives those two variables to the **auth container**
(`BETTER_AUTH_URL: https://${COURIER_DOMAIN}`,
`AUTH_DATABASE_URL: postgresql://…@postgres:5432/…`). `infra/ci-staging.env` carries neither, and
the host shell has no business inventing them: the compose file is the one definition of the
service's environment.

**The fix for causes 1 and 2 together:** the migration now runs **inside the auth image, on the
compose network** — `run_compose run --rm --no-deps -T auth_a npx --yes auth migrate --yes --config
src/migrate.config.ts`. The image carries the service's own source and its dependencies
(`services/auth/Dockerfile`), the service's compose environment is the container's environment,
and `postgres:5432` resolves inside the network. The host needs nothing but Docker, which is the
same on a runner and on the founder's VM. The pnpm install and the gate that pinned it were removed
with it: a gate over an install the workflow no longer performs is a gate over nothing.

## Cause 3 — the CLI generated the **SQLite** dialect, against Postgres (**FIXED 2026-10-29**)

With the migration inside the image, it connects to postgres and the CLI's own generated statement
fails the server's parser:

```
Error running Better Auth CLI: error: syntax error at or near "WHERE"
  severity: 'ERROR',
  routine: 'scanner_yyerror',
  position: '404'
```

What is already established: it is **not** a connection, **not** a missing variable, and **not** a
permission — the CLI reached the database and sent a statement the server parsed.

**The experiment** (the README's plan, corrected: `postgres:16-3.6-pgvector` is not a public image;
the one the staging compose file uses at `infra/compose.staging.yml:44` is built from
`infra/postgres/Dockerfile`, so the real one is built first):

```
docker build -t courier-postgres:16-3.6-pgvector infra/postgres
docker run -d --name cc-probe --network cc-probe-net -e POSTGRES_PASSWORD=ci-staging-postgres \
  -e POSTGRES_USER=courier -e POSTGRES_DB=courier courier-postgres:16-3.6-pgvector
docker build -t courier-auth:local -f services/auth/Dockerfile .
docker run --rm --network cc-probe-net -e AUTH_DATABASE_URL=postgresql://courier:ci-staging-postgres@cc-probe:5432/courier \
  -e BETTER_AUTH_URL=http://localhost:3001 -e BETTER_AUTH_SECRET=ci-staging-better-auth-secret-0123456789abcdef \
  courier-auth:local npx --yes auth migrate --yes --config src/migrate.config.ts
```

The built image is `postgis/postgis:16-3.6` + `postgresql-16-pgvector` (0.8.7): PostgreSQL 16.15 on
Debian 13 (trixie). The CLI's own first line is the answer:

```
WARN [Better Auth]: Could not determine database type, defaulting to sqlite.
```

`services/auth/src/database.ts` passed a bare `PostgresDialect` as Better Auth's `database` option.
Better Auth's kysely adapter (`@better-auth/kysely-adapter` `createKyselyAdapter`) reads
`database.type` to choose the dialect; a bare dialect object has none, so `databaseType` is
`undefined`, the adapter defaults to `sqlite`, and `getMigrations` runs
`getDatabaseIndexMap`'s **sqlite** case:

```sql
SELECT
  tables.name AS "tableName",
  index_list.name AS "indexName",
  index_info.name AS "columnName",
  index_list."unique" AS "isUnique",
  index_list.partial AS "isPartial",
  index_info.seqno AS "columnPosition"
FROM sqlite_master AS tables
INNER JOIN pragma_index_list(tables.name) AS index_list
INNER JOIN pragma_index_info(index_list.name) AS index_info
WHERE tables.type = 'table'
```

PostgreSQL parses that statement as far as the `WHERE` keyword and stops: `pragma_index_list(...)`
in a join list is not a Postgres construct, so the `FROM … INNER JOIN` run is never completed. The
`WHERE` sits at character **404** of the statement — the exact `position: '404'` the server
reported, which is the proof of the statement. It was never a grammar the Postgres was imposing;
it was SQLite SQL sent to Postgres.

**The fix** (`services/auth/src/database.ts`): `createPostgresDatabase` returns
`{ type: "postgres", dialect: new PostgresDialect({ pool }) }`, which is one of the shapes the
adapter reads directly. On the real image and the real Postgres the same command then prints
`🚀 migration was completed successfully!`, creates the eleven tables (`user, session, account,
verification, organization, team, teamMember, member, invitation, twoFactor, jwks`) and is
idempotent (`🚀 No migrations needed.` on a second run). The regression test is
`services/auth/src/__tests__/database.test.ts` (red first: three of its four assertions fail
against the reverted fix, because `{ type: "postgres" }` is exactly what was missing).

## The gates that pass

`bash -n infra/deploy.sh` parses; `node --test "scripts/*/__tests__/*.test.mjs"` 53/53;
`check-workflows.mjs` 10 workflows; `check-doc-links.mjs` 38 links;
`check-conflict-markers.mjs` and `check-control-chars.mjs` 1243 files each; `check-floor.mjs` clean
against `origin/main`. **None of them is a proof for cause 3**, and the register says so.
