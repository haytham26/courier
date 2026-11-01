import { describe, expect, it } from "vitest";

import { loadConfig, MissingEnvError } from "../config.js";

const VALID_ENV = {
  BETTER_AUTH_SECRET: "test-only-value-not-a-real-credential-0000",
  BETTER_AUTH_URL: "https://auth.example.co.nz",
  AUTH_DATABASE_URL: "postgresql://courier:courier@localhost:5432/courier",
  NODE_ENV: "production",
  AUTH_TRUSTED_ORIGINS: "exp://,https://app.example.co.nz",
} satisfies Record<string, string>;

describe("auth service configuration", () => {
  it("fails fast when the secret is missing", () => {
    const { BETTER_AUTH_SECRET: _secret, ...env } = VALID_ENV;

    try {
      loadConfig(env);
      throw new Error("expected loadConfig to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(MissingEnvError);
      expect((error as Error).message).toContain("Missing required env: BETTER_AUTH_SECRET");
      expect((error as Error).message).toContain(".env.example");
    }
  });

  it("fails fast when the database url is missing", () => {
    const { AUTH_DATABASE_URL: _url, ...env } = VALID_ENV;

    try {
      loadConfig(env);
      throw new Error("expected loadConfig to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(MissingEnvError);
      expect((error as Error).message).toContain("AUTH_DATABASE_URL");
    }
  });

  it("fails fast when the base url is missing", () => {
    const { BETTER_AUTH_URL: _url, ...env } = VALID_ENV;

    try {
      loadConfig(env);
      throw new Error("expected loadConfig to throw");
    } catch (error) {
      expect((error as Error).message).toContain("BETTER_AUTH_URL");
    }
  });

  it("rejects a secret that is too short", () => {
    try {
      loadConfig({ ...VALID_ENV, BETTER_AUTH_SECRET: "short" });
      throw new Error("expected loadConfig to throw");
    } catch (error) {
      expect((error as Error).message).toContain("BETTER_AUTH_SECRET");
    }
  });

  it("refuses trusted origins to be empty in production", () => {
    try {
      loadConfig({ ...VALID_ENV, AUTH_TRUSTED_ORIGINS: "" });
      throw new Error("expected loadConfig to throw");
    } catch (error) {
      expect((error as Error).message).toContain("AUTH_TRUSTED_ORIGINS");
    }
  });

  it("refuses the in-memory database in production", () => {
    try {
      loadConfig({ ...VALID_ENV, AUTH_DATABASE_URL: "memory://" });
      throw new Error("expected loadConfig to throw");
    } catch (error) {
      expect((error as Error).message).toContain("memory://");
    }
  });

  it("builds a valid configuration from the environment", () => {
    const config = loadConfig(VALID_ENV);

    expect(config.secret).toBe(VALID_ENV.BETTER_AUTH_SECRET);
    expect(config.baseURL).toBe("https://auth.example.co.nz");
    expect(config.trustedOrigins).toEqual(["exp://", "https://app.example.co.nz"]);
    expect(config.database).toEqual({
      provider: "postgres",
      url: VALID_ENV.AUTH_DATABASE_URL,
    });
    expect(config.jwt.issuer).toBe("https://auth.example.co.nz");
    expect(config.jwt.audience).toBe("courier-api");
    expect(config.jwks.path).toBe("/jwks");
    expect(config.jwks.alg).toBe("ES256");
  });

  it("allows the in-memory database outside production", () => {
    const config = loadConfig({
      ...VALID_ENV,
      NODE_ENV: "test",
      AUTH_DATABASE_URL: "memory://",
    });

    expect(config.database).toEqual({ provider: "memory" });
  });
});


// BUG-134: a trusted origin that is a wildcard disables the origin and the
// CSRF check for every Better Auth route.
describe("the trusted origins are concrete hosts (BUG-134)", () => {
  it("refuses a wildcard, naming the value that carries it", () => {
    const { AUTH_TRUSTED_ORIGINS: _empty, ...env } = VALID_ENV;

    try {
      loadConfig({ ...env, AUTH_TRUSTED_ORIGINS: "*" });
      throw new Error("expected loadConfig to refuse a wildcard");
    } catch (error) {
      expect((error as Error).message).toContain("AUTH_TRUSTED_ORIGINS");
      expect((error as Error).message).toContain("scheme://host");
    }
  });

  it("refuses an entry that has no scheme, because it is not a host", () => {
    const { AUTH_TRUSTED_ORIGINS: _empty, ...env } = VALID_ENV;

    try {
      loadConfig({ ...env, AUTH_TRUSTED_ORIGINS: "app.example.co.nz" });
      throw new Error("expected loadConfig to refuse a bare host");
    } catch (error) {
      expect((error as Error).message).toContain("AUTH_TRUSTED_ORIGINS");
    }
  });

  it("takes the concrete origins the app and the edge use", () => {
    const config = loadConfig({
      ...VALID_ENV,
      AUTH_TRUSTED_ORIGINS: "exp://,https://staging.courier.local",
    });

    expect(config.trustedOrigins).toEqual(["exp://", "https://staging.courier.local"]);
  });
});

// BUG-133: the passkey origin is derived from the service's own URL, so a
// phishing page served from the relying party's apex cannot be the origin a
// ceremony is replayed against.
describe("the passkey origin is the service's own URL (BUG-133)", () => {
  it("defaults to BETTER_AUTH_URL", () => {
    const config = loadConfig({
      ...VALID_ENV,
      AUTH_PASSKEY_RP_ID: "example.co.nz",
    });

    expect(config.passkey.origin).toBe("https://auth.example.co.nz");
  });

  it("is cross-checked against the rpID, and refuses one that does not match", () => {
    try {
      loadConfig({
        ...VALID_ENV,
        AUTH_PASSKEY_RP_ID: "example.co.nz",
        AUTH_PASSKEY_ORIGIN: "https://example.co.nz.phishing.test",
      });
      throw new Error("expected loadConfig to refuse an origin off the rpID");
    } catch (error) {
      expect((error as Error).message).toContain("AUTH_PASSKEY_ORIGIN");
      expect((error as Error).message).toContain("example.co.nz");
    }
  });

  it("accepts an origin whose host is the rpID itself", () => {
    const config = loadConfig({
      ...VALID_ENV,
      AUTH_PASSKEY_RP_ID: "example.co.nz",
      AUTH_PASSKEY_ORIGIN: "https://example.co.nz",
    });

    expect(config.passkey.origin).toBe("https://example.co.nz");
  });
});

// BUG-132: the limiter's window and its switch are the deployment's, not the
// library's defaults, so a deployment can state its own numbers.
describe("the rate limit is the deployment's own (BUG-132)", () => {
  it("can be switched off in a deployment that fronts it with its own edge", () => {
    const config = loadConfig({ ...VALID_ENV, AUTH_RATE_LIMIT_ENABLED: "false" });

    expect(config.rateLimit.enabled).toBe(false);
  });

  it("carries its window and its bound from the environment", () => {
    const config = loadConfig({
      ...VALID_ENV,
      AUTH_RATE_LIMIT_MAX: "25",
      AUTH_RATE_LIMIT_WINDOW: "30",
    });

    expect(config.rateLimit.max).toBe(25);
    expect(config.rateLimit.window).toBe(30);
  });

  it("stays on with its own numbers by default", () => {
    const config = loadConfig(VALID_ENV);

    expect(config.rateLimit.enabled).toBe(true);
  });
});

// BUG-137: a variable that is set but empty is a misconfiguration, not a
// default, and a production boot names it.
describe("an empty variable is refused (BUG-137)", () => {
  it("refuses an empty BETTER_AUTH_URL rather than booting with a default", () => {
    const { AUTH_TRUSTED_ORIGINS: _empty, ...env } = VALID_ENV;

    try {
      loadConfig({ ...env, BETTER_AUTH_URL: "" });
      throw new Error("expected loadConfig to refuse an empty URL");
    } catch (error) {
      expect((error as Error).message).toContain("BETTER_AUTH_URL");
    }
  });

  it("refuses a variable that is only whitespace", () => {
    const { AUTH_TRUSTED_ORIGINS: _empty, ...env } = VALID_ENV;

    try {
      loadConfig({ ...env, AUTH_TRUSTED_ORIGINS: "   " });
      throw new Error("expected loadConfig to refuse a whitespace list");
    } catch (error) {
      expect((error as Error).message).toContain("AUTH_TRUSTED_ORIGINS");
    }
  });
});


  // BUG-133: the check used to run only on the value the operator typed. A
  // derived origin (BETTER_AUTH_URL's own host) that is off the rpID is the
  // same misconfiguration, reached without anyone naming
  // AUTH_PASSKEY_ORIGIN, and it booted silently.
  it("refuses a derived origin whose host is not the rpID", () => {
    expect(() =>
      loadConfig({
        ...VALID_ENV,
        BETTER_AUTH_URL: "https://phishing.example.co.nz.phishing.test",
        AUTH_PASSKEY_RP_ID: "example.co.nz",
      }),
    ).toThrow(/is not an origin of AUTH_PASSKEY_RP_ID/);
  });

  it("accepts a derived origin that belongs to the rpID", () => {
    const config = loadConfig({
      ...VALID_ENV,
      BETTER_AUTH_URL: "https://auth.example.co.nz",
      AUTH_PASSKEY_RP_ID: "example.co.nz",
    });
    expect(config.passkey.origin).toBe("https://auth.example.co.nz");
  });


  it("exempts a loopback origin from the rpID cross-check", () => {
    // The developer's own machine, and the test suite's: the BUG-133 threat is
    // the network, so localhost is exempt the way the API's JWKS hop exempts
    // it (BUG-131).
    const config = loadConfig({
      ...VALID_ENV,
      BETTER_AUTH_URL: "http://localhost:3001",
      AUTH_PASSKEY_RP_ID: "auth.example.co.nz",
    });
    expect(config.passkey.origin).toBe("http://localhost:3001");
  });
