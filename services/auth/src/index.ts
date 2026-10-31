/**
 * Entry point for the Courier Copilot auth service.
 *
 * Fails fast when required configuration is missing (no default secrets).
 */
import { loadConfig } from "./config.js";
import { createServer as createAuthServer, installFailureHandlers } from "./http.js";
import { createAuth } from "./server.js";

function main(): void {
  const config = loadConfig(process.env);
  const auth = createAuth(config);

  // The service's own server, which owns the readiness probe, the body cap,
  // the per-account limit and the failure paths (see http.ts: BUG-127,
  // BUG-129, BUG-130).
  const server = createAuthServer(config, auth);

  server.listen(config.port, () => {
    const methods = [
      "email",
      ...(config.socialProviders.google === null ? [] : ["google"]),
      ...(config.socialProviders.apple === null ? [] : ["apple"]),
      ...(config.passkey.enabled ? ["passkey"] : []),
    ].join(", ");
    console.log(
      `[auth] listening on ${config.baseURL} (jwks ${config.jwks.path}, db ${config.database.provider})`,
    );
    console.log(`[auth] sign-in methods: ${methods}; mfa: on; team roles: ${config.organization.roles.join(", ")}`);
  });

  // A rejection with no handler ends the Node process (BUG-129).
  installFailureHandlers();

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

try {
  main();
} catch (error) {
  console.error(`[auth] failed to start: ${(error as Error).message}`);
  process.exit(1);
}
