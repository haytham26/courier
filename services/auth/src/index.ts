/**
 * Entry point for the Courier Copilot auth service.
 *
 * Fails fast when required configuration is missing (no default secrets).
 */
import { createServer } from "node:http";
import { toNodeHandler } from "better-auth/node";

import { loadConfig } from "./config.js";
import { healthBody, isHealthPath } from "./health.js";
import { createAuth } from "./server.js";

function main(): void {
  const config = loadConfig(process.env);
  const auth = createAuth(config);
  const handler = toNodeHandler(auth);

  const server = createServer((req, res) => {
    // The readiness probe is answered here, before the Better Auth handler: it
    // owns no route, so it would answer 404 for a path the compose healthcheck
    // asks for and the container would never become healthy (see health.ts).
    if (isHealthPath(new URL(req.url ?? "/", "http://127.0.0.1").pathname)) {
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify(healthBody(config)));
      return;
    }
    void handler(req, res);
  });

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
