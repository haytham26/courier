/**
 * Better Auth server factory for Courier Copilot.
 */
import { betterAuth } from "better-auth";

import type { AuthConfig } from "./config.js";
import { createDatabase } from "./database.js";
import { buildAuthOptions } from "./options.js";

/**
 * The options of the service, with the database, exactly as the instance
 * gets them. The migration needs the same options, so they are built here
 * once and used by both.
 */
export function buildAuthConfig(config: AuthConfig) {
  const options = buildAuthOptions(config);
  const database = createDatabase(config, options);
  return { ...options, database };
}

export function createAuth(config: AuthConfig) {
  return betterAuth(buildAuthConfig(config));
}

export type AuthInstance = ReturnType<typeof createAuth>;
