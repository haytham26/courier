/**
 * The module the migration CLI reads (A5's next slice; the auth service's own
 * schema).
 *
 * Better Auth creates its tables (user, session, account, verification,
 * organization, team, teamMember, member, invitation, twoFactor, jwks) with its
 * own migration, and the contract's `schema.sql` does not carry them: the API's
 * tables and the auth service's tables are two migrations in one database.
 * Without it the auth container comes up and then logs
 * `Database schema mismatch … Missing tables user, session, …` and goes
 * unhealthy — which is exactly where the first staging deploy stopped (the API
 * reached `Healthy` and the stack stopped at the auth service).
 *
 * The CLI (`npx auth migrate --config <file>`) reads a module that exports the
 * better-auth options, so this file is that module: it loads the same validated
 * configuration the service loads (so a deployment's environment is the only
 * input), and it starts no server.
 *
 * Run it (the deploy script does, from the repository root):
 *
 *   pnpm --filter @courier/auth exec npx --yes auth migrate --yes \
 *     --config services/auth/migrate.config.ts
 */
import { loadConfig } from "./config.js";
import { createAuth } from "./server.js";

export const auth = createAuth(loadConfig());
