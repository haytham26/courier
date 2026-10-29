import { describe, expect, it } from "vitest";

import { loadConfig } from "../config.js";
import { createPostgresDatabase, createDatabase } from "../database.js";
import { buildAuthOptions } from "../options.js";

/**
 * BUG-070, cause 3: the deploy's `npx auth migrate` died with
 * `syntax error at or near "WHERE"` (42601, position 404) against the staging
 * Postgres.
 *
 * The root cause is not the Postgres, not the connection and not a missing
 * variable: Better Auth's kysely adapter derives the SQL dialect from
 * `database.type`, and this service passed a bare `PostgresDialect` — which has
 * no `type`. The adapter logged "Could not determine database type, defaulting
 * to sqlite" and generated SQLite SQL:
 *
 *   SELECT ... FROM sqlite_master AS tables
 *   INNER JOIN pragma_index_list(tables.name) AS index_list
 *   INNER JOIN pragma_index_info(index_list.name) AS index_info
 *   WHERE tables.type = 'table'
 *
 * PostgreSQL parses up to that `WHERE` — character 404 of the statement, which
 * is exactly the position the server reported — and stops.
 *
 * These tests read the same field the adapter reads (`database.type`) through
 * the object this service hands to `betterAuth()`, so they go red if the wiring
 * ever drops the type again.
 */

const VALID_PG_ENV = {
  BETTER_AUTH_SECRET: "test-only-value-not-a-real-credential-0000",
  BETTER_AUTH_URL: "https://auth.example.co.nz",
  AUTH_DATABASE_URL: "postgresql://courier:courier@localhost:5432/courier",
  NODE_ENV: "production",
  AUTH_TRUSTED_ORIGINS: "exp://,https://app.example.co.nz",
} satisfies Record<string, string>;

describe("the postgres database option", () => {
  it("declares the dialect's type, so Better Auth generates Postgres SQL", () => {
    const database = createPostgresDatabase("postgresql://courier:x@localhost:5432/courier");

    // The name of the case the adapter switches on; a bare dialect has none.
    expect(database).toMatchObject({ type: "postgres" });
  });

  it("carries a real Postgres dialect, not just the type", () => {
    const database = createPostgresDatabase("postgresql://courier:x@localhost:5432/courier");

    expect("dialect" in database && database.dialect).toBeTruthy();
    // A PostgresDialect's constructor name is how the adapter's dialect checks
    // are expressed; asserting on the instance keeps the wiring honest.
    expect((database as { dialect: object }).dialect.constructor.name).toBe("PostgresDialect");
  });

  it("reaches the production path with the postgres type when configured with a url", () => {
    const config = loadConfig(VALID_PG_ENV);
    const options = buildAuthOptions(config);

    const database = createDatabase(config, options);

    expect(config.database.provider).toBe("postgres");
    expect(database).toMatchObject({ type: "postgres" });
  });

  it("keeps the memory adapter on its own path (no postgres type to declare)", () => {
    // `memory://` is banned in production by loadConfig itself, so this is the
    // one place it is legal: the test environment.
    const config = loadConfig({ ...VALID_PG_ENV, NODE_ENV: "test", AUTH_DATABASE_URL: "memory://" });
    const options = buildAuthOptions(config);

    const database = createDatabase(config, options);

    expect(config.database.provider).toBe("memory");
    // An adapter instance, not the { type, dialect } shape: the memory adapter
    // needs no dialect, and claiming a postgres type would be a lie.
    expect("type" in database).toBe(false);
  });
});
