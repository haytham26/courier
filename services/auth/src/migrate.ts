/**
 * The tables of the auth service.
 *
 * Better Auth does not create them by itself when the service is given a
 * Kysely dialect: the service starts and then refuses the first sign-in
 * with "relation user does not exist". The migration runs before the
 * service is built, so it is never reachable without its tables.
 *
 * The plan only holds what is missing, so running it again is safe: the
 * second replica of the service finds the tables already there.
 */
import { getMigrations } from "better-auth/db/migration";

import type { AuthConfig } from "./config.js";
import { buildAuthConfig } from "./server.js";

export async function prepareDatabase(config: AuthConfig): Promise<void> {
  // The in-memory adapter creates its own tables; there is nothing to do.
  if (config.database.provider !== "postgres") {
    return;
  }
  const { runMigrations, toBeCreated, toBeAdded } = await getMigrations(
    buildAuthConfig(config),
  );
  await runMigrations();
  console.log(
    `[auth] the tables are ready (${toBeCreated.length} created, ${toBeAdded.length} columns added)`,
  );
}
