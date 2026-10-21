/**
 * Entry point for the Courier Copilot auth service.
 *
 * Fails fast when required configuration is missing (no default secrets).
 */
import { createServer } from "node:http";
import { toNodeHandler } from "better-auth/node";

import { loadConfig } from "./config.js";
import { handleHealth, healthPath } from "./health.js";
import { prepareDatabase } from "./migrate.js";
import { createAuth } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  // The tables have to be there before the service is built, or the first
  // sign-in is refused.
  await prepareDatabase(config);
  const auth = createAuth(config);
  const handler = toNodeHandler(auth);
  const version = process.env.APP_VERSION ?? "0.1.0";
  const startedAt = Date.now();

  const server = createServer((req, res) => {
    // The health endpoints never reach the auth handler: the edge and the
    // heartbeat ask them, and they must answer even when the database is down.
    const path = healthPath(req.url);
    if (path) {
      void handleHealth(res, path, config, version, startedAt);
      return;
    }
    void handler(req, res);
  });

  server.listen(config.port, () => {
    console.log(
      `[auth] listening on ${config.baseURL} (jwks ${config.jwks.path}, db ${config.database.provider})`,
    );
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

try {
  await main();
} catch (error) {
  console.error(`[auth] failed to start: ${(error as Error).message}`);
  process.exit(1);
}
