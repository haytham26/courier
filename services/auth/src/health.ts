/**
 * The auth service's readiness answer, before the Better Auth handler sees it.
 *
 * `infra/compose.staging.yml` gates `caddy` on the auth container's healthcheck,
 * and that healthcheck asks for `/health/ready` — which this service did not
 * serve until this module existed. Every request went to the Better Auth
 * handler, which answers 404 for a path it does not own, so the container came
 * up healthy-looking and then went `unhealthy` forever: the deploy could never
 * reach its smoke test. (A5's first slice recorded the auth container's
 * unhealthiness as the missing tables; the tables are created now by
 * `npx auth migrate`, and the container still went unhealthy, which is how the
 * real cause was found — the register says so.)
 *
 * The answer is data-free by construction, the same bar the API's `/healthz`
 * holds (RUNBOOK §9): it carries no request data, no id and no address. It is
 * 200 only once the process is serving, and the process only reaches `listen`
 * after the configuration is validated and the auth instance (plugins, JWKS
 * keys, database adapter) is built — a configuration that fails fast never gets
 * here, so a 200 is a fact and not a hope.
 */

import type { AuthConfig } from "./config.js";

/** The paths the readiness answer owns. */
export const HEALTH_PATHS = ["/health/ready", "/healthz"] as const;

/** The readiness answer's body: what the service is, and what it is on. */
export interface HealthBody {
  status: "ok";
  db: AuthConfig["database"]["provider"];
}

/** Whether this request is the readiness probe (the compose healthcheck). */
export function isHealthPath(pathname: string): boolean {
  // A trailing slash, a query string or a fragment is the same probe: the
  // healthcheck's URL is fixed, but a browser's is not, and a 404 here would
  // read as a dead service. The caller passes `URL.pathname`, but a caller that
  // passes the whole `req.url` must get the same answer.
  const [path = "/"] = pathname.split(/[?#]/, 1);
  const trimmed = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return (HEALTH_PATHS as readonly string[]).includes(trimmed);
}

/** The body the readiness probe is answered with. */
export function healthBody(config: AuthConfig): HealthBody {
  return { status: "ok", db: config.database.provider };
}
