/**
 * Health endpoints for the auth service.
 *
 * The edge (Caddy, `infra/Caddyfile`) and the heartbeat
 * (`infra/monitoring/heartbeat.sh`) ask the same three questions:
 *
 * - `/health/live`  - is the process up? It never touches the database.
 * - `/health/ready` - can the service sign a token? The database has to answer.
 * - `/health`       - both, plus the version the deployment is running.
 *
 * The answer is always JSON. A failing dependency is reported by the name of
 * the error, never by its message: the endpoint is reachable from outside and
 * the message of a connection error carries the password of the database.
 */
import type { ServerResponse } from "node:http";

import { Pool } from "pg";

import type { AuthConfig } from "./config.js";

export const HEALTH_PATHS = [
  "/health",
  "/health/live",
  "/health/ready",
] as const;

export type HealthPath = (typeof HEALTH_PATHS)[number];

export interface HealthCheck {
  status: "ok" | "skipped" | "failed";
  detail: string | null;
}

export interface HealthDocument {
  status: "ok" | "degraded";
  version: string;
  uptime_seconds: number;
  checks: {
    live: boolean;
    ready: boolean;
    database: HealthCheck;
  };
}

/** The path of a health request, or null when the request is not one. */
export function healthPath(url: string | undefined): HealthPath | null {
  if (!url) return null;
  const path = url.split("?")[0] ?? "";
  const known = HEALTH_PATHS as readonly string[];
  return known.includes(path) ? (path as HealthPath) : null;
}

/**
 * Asks the database whether it is there. It never throws.
 *
 * A failure is reported by the name of the error only: the message of a
 * connection error carries the DSN, and the DSN carries the password.
 */
export async function databaseCheck(config: AuthConfig): Promise<HealthCheck> {
  if (config.database.provider === "memory") {
    return {
      status: "skipped",
      detail: "the in-memory adapter: there is no database to check",
    };
  }
  const pool = new Pool({
    connectionString: config.database.url,
    connectionTimeoutMillis: 2000,
    max: 1,
  });
  pool.on("error", (error: Error) => {
    // The pool reports the failure on the query as well. Without this
    // listener the same error would arrive as an unhandled event and would
    // stop the whole service.
    void error;
  });
  try {
    await pool.query("SELECT 1");
    return { status: "ok", detail: null };
  } catch (error) {
    return {
      status: "failed",
      detail: error instanceof Error ? error.name : "UnknownError",
    };
  } finally {
    await pool.end();
  }
}

/** The whole document: the version, the uptime and every check. */
export async function buildHealthDocument(
  config: AuthConfig,
  version: string,
  startedAt: number,
): Promise<HealthDocument> {
  const database = await databaseCheck(config);
  const ready = database.status === "ok";
  return {
    status: ready ? "ok" : "degraded",
    version,
    uptime_seconds: Math.round((Date.now() - startedAt) / 100) / 10,
    checks: {
      live: true,
      ready,
      database,
    },
  };
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(payload);
}

/** Answers a health request. It never throws. */
export async function handleHealth(
  res: ServerResponse,
  path: HealthPath,
  config: AuthConfig,
  version: string,
  startedAt: number,
): Promise<void> {
  if (path === "/health/live") {
    sendJson(res, 200, {
      status: "ok",
      version,
      uptime_seconds: Math.round((Date.now() - startedAt) / 100) / 10,
    });
    return;
  }
  const document = await buildHealthDocument(config, version, startedAt);
  sendJson(res, document.status === "ok" ? 200 : 503, document);
}
