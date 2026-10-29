# Evidence — BUG-070 cause 3: the CLI's SQLite SQL against PostgreSQL (fixed)

All of it run locally on the founder's machine (Docker capped at 3 GB), against the branch
`fix/bug-070-auth-cli-sql` from `origin/main` (`a64a291`). The container was stopped and removed
after the experiment, per the machine limits.

## The image the staging stack actually uses

`postgres:16-3.6-pgvector` is **not** a public image (the deploy-verify README's experiment named it
by mistake). The staging compose file's own image is built from `infra/postgres/Dockerfile`
(`infra/compose.staging.yml:44`), so the real one is built first:

```
docker build -t courier-postgres:16-3.6-pgvector infra/postgres
```

It is `postgis/postgis:16-3.6` plus `postgresql-16-pgvector` (0.8.7) from the repository that base
image already trusts: PostgreSQL 16.15 on Debian 13 (trixie).

## The reproduction

The postgres container ran on a docker network with the auth image built from this tree, and the
migration was run **inside the auth image** exactly as `infra/deploy.sh:migrate_auth` and the
deploy workflow do:

```
docker run --rm --network cc-probe-net \
  -e AUTH_DATABASE_URL=postgresql://courier:ci-staging-postgres@cc-probe:5432/courier \
  -e BETTER_AUTH_URL=http://localhost:3001 \
  -e BETTER_AUTH_SECRET=ci-staging-better-auth-secret-0123456789abcdef \
  -e AUTH_TRUSTED_ORIGINS="https://staging.courier.local,exp://" \
  courier-auth:local npx --yes auth migrate --yes --config src/migrate.config.ts
```

`failure.md` holds the CLI's own output: `Could not determine database type, defaulting to sqlite`,
then `syntax error at or near "WHERE"` with `position: '404'` and `routine: 'scanner_yyerror'`.

## The failing statement, read from the source the CLI loaded

`node_modules/better-auth/dist/db/get-migration.mjs`, `getDatabaseIndexMap`'s sqlite case:

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

`statement.sql` is that text, extracted verbatim. Its `WHERE` is at character **404**, which is the
server's `position: '404'` — the proof that this is the statement that failed. Postgres 16 parses
a `FROM … INNER JOIN` list of tables; `pragma_index_list(tables.name)` is a table-valued function,
not a table, so the run is never completed and the parser stops at the next keyword.

## Why the CLI chose the sqlite case

`@better-auth/kysely-adapter`'s `createKyselyAdapter` returns `databaseType` from the shape it is
given. A bare `PostgresDialect` instance matches none of the shapes that reveal a type (a `pg.Pool`
has `connect`, which the adapter reads as postgres), so `databaseType` is `undefined`,
`getMigrations` logs the warning and sets `dbType = "sqlite"`.

`services/auth/src/database.ts` was passing exactly that bare dialect:

```ts
export function createPostgresDatabase(url: string): AuthDatabase {
  const pool = new Pool({ connectionString: url });
  return new PostgresDialect({ pool });
}
```

## The fix, and its proof on the real system

`createPostgresDatabase` now returns `{ type: "postgres", dialect: new PostgresDialect({ pool }) }`
— one of the two shapes `createKyselyAdapter` reads the type from directly.

`migration-success.md` holds the same command's output with the fix: `🚀 migration was completed
successfully!`, the eleven tables listed, and a second run printing `🚀 No migrations needed.` The
eleven tables were then read back out of the database with `\dt` (`tables.txt`).

## The tests

- `services/auth/src/__tests__/database.test.ts` — four assertions over the object the service
  hands to `betterAuth()`: it declares the postgres type, it carries a real `PostgresDialect`, the
  production config path produces them, and the memory path does not claim a postgres type.
  **Red first:** with `createPostgresDatabase` reverted to the bare dialect, three of the four fail
  (`expected PostgresDialect{} to match object { type: 'postgres' }` and the `dialect` member
  missing). `red-run.txt` is that output. Green after the fix, in the same file.
- Real-system proof per PLAYBOOK §14.3: the migration ran against the real Postgres image, not a
  mock (`migration-success.md`).
- The whole auth suite: 12 files, 72 tests, all green (`suite.txt`).
