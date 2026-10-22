/**
 * Better Auth server factory for Courier Copilot.
 */
import { betterAuth } from "better-auth";

import type { AuthConfig } from "./config.js";
import { createDatabase } from "./database.js";
import { buildAuthOptions } from "./options.js";

export function createAuth(config: AuthConfig) {
  const options = buildAuthOptions(config);
  const database = createDatabase(config, options);
  return betterAuth({ ...options, database });
}

export type AuthInstance = ReturnType<typeof createAuth>;
