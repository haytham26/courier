/**
 * Database wiring for the auth service.
 *
 * Production talks to Postgres (the product's single source of truth, see
 * FINAL_PROMPT §3.3). Tests and local development may use the in-memory
 * adapter, which is explicitly forbidden in production by `loadConfig`.
 */
import type { BetterAuthOptions, DBAdapterInstance } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { getSchema } from "better-auth/db";
import { PostgresDialect, type Dialect } from "kysely";
import { Pool } from "pg";

import type { AuthConfig } from "./config.js";

/**
 * The subset of Better Auth's `database` option this service produces.
 *
 * `BetterAuthOptions["database"]` is typed as `any` upstream because the
 * union includes a Bun-only type (`bun:sqlite`), so the concrete members are
 * spelled out here instead.
 *
 * The `type` member is not decoration: Better Auth's kysely adapter reads
 * `database.type` to learn which SQL dialect to speak (BUG-070, cause 3). A
 * bare dialect object leaves it `undefined`, the adapter logs
 * "Could not determine database type, defaulting to sqlite" and generates
 * SQLite SQL (`FROM sqlite_master AS tables INNER JOIN pragma_index_list(…)`)
 * against PostgreSQL — which the server rejects with `syntax error at or near
 * "WHERE"` (42601) at the statement's 404th character.
 */
export type AuthDatabase =
  | DBAdapterInstance
  | { type: "postgres"; dialect: Dialect }
  | Dialect;

type MemoryStore = Record<string, unknown[]>;

/**
 * The in-memory adapter resolves tables by name and clones the store with
 * `structuredClone` when it opens a transaction, so the store must be a plain
 * object holding one array per model.
 */
function createMemoryStore(options: BetterAuthOptions): MemoryStore {
  const schema = getSchema(options);
  const store: MemoryStore = {};
  for (const modelName of Object.keys(schema)) {
    store[modelName] = [];
  }
  return store;
}

export function createMemoryDatabase(options: BetterAuthOptions): AuthDatabase {
  return memoryAdapter(createMemoryStore(options));
}

export function createPostgresDatabase(url: string): AuthDatabase {
  const pool = new Pool({ connectionString: url });
  return { type: "postgres", dialect: new PostgresDialect({ pool }) };
}

/** Builds the Better Auth `database` option from the validated configuration. */
export function createDatabase(config: AuthConfig, options: BetterAuthOptions): AuthDatabase {
  if (config.database.provider === "memory") {
    return createMemoryDatabase(options);
  }
  return createPostgresDatabase(config.database.url);
}
