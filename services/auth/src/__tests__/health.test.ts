import { describe, expect, it } from "vitest";

import { loadConfig } from "../config.js";
import { healthBody, isHealthPath } from "../health.js";

const ENV = {
  BETTER_AUTH_SECRET: "test-only-value-not-a-real-credential-0000",
  BETTER_AUTH_URL: "https://auth.example.co.nz",
  AUTH_DATABASE_URL: "postgresql://courier:courier@localhost:5432/courier",
  NODE_ENV: "production",
  AUTH_TRUSTED_ORIGINS: "exp://,https://app.example.co.nz",
} satisfies Record<string, string>;

describe("the readiness probe", () => {
  it("owns the path the compose healthcheck asks for", () => {
    // infra/compose.staging.yml's auth healthcheck fetches /health/ready.
    expect(isHealthPath("/health/ready")).toBe(true);
    expect(isHealthPath("/healthz")).toBe(true);
  });

  it("tolerates a trailing slash and a query string", () => {
    // A browser or a probe client may add either, and a 404 here would read as
    // a dead service. The test passes the whole request target, not just the
    // pathname, because `req.url` is what a caller actually has.
    expect(isHealthPath("/health/ready/")).toBe(true);
    expect(isHealthPath("/healthz?probe=1")).toBe(true);
    expect(isHealthPath("/health/ready?verbose=true#x")).toBe(true);
  });

  it("answers data-free: no id, no address, no request data", () => {
    const config = loadConfig(ENV);
    const body = healthBody(config);

    // The answer is what the service is and what it is on. BUG-137 added the
    // configured sign-in methods and the origin, because a deployment whose
    // configuration was wrong-but-non-empty booted healthy and then refused
    // every request with a "not set up on this server yet" that named nothing.
    expect(body.status).toBe("ok");
    expect(body.db).toBe("postgres");
    expect(body.methods).toEqual(["email", "mfa"]);
    expect(body.origin).toBe("https://auth.example.co.nz");
    // Nothing identifies a caller, an account or a request: the answer is the
    // same for every probe.
    expect(Object.keys(body).sort()).toEqual(["db", "methods", "origin", "status"]);
  });

  it("reports the database the service is actually on", () => {
    const postgres = loadConfig(ENV);
    expect(healthBody(postgres).db).toBe("postgres");

    const memory = loadConfig({ ...ENV, NODE_ENV: "test", AUTH_DATABASE_URL: "memory://" });
    expect(healthBody(memory).db).toBe("memory");
  });

  it("does not claim a Better Auth route: everything else is the handler's", () => {
    // The probe must not swallow a real auth path — a readiness answer for
    // /sign-in/email would be a silent 200 for a route that never ran.
    for (const path of [
      "/api/auth/sign-in/email",
      "/api/auth/jwks",
      "/sign-in",
      "/health/ready/z",
      "/definitely-not-a-route",
    ]) {
      expect(isHealthPath(path), path).toBe(false);
    }
  });
});
