import { describe, expect, it } from "vitest";

import { loadConfig, MissingEnvError } from "../src/config.js";

const VALID_ENV = {
  BETTER_AUTH_SECRET: "a-secret-that-is-definitely-long-enough-32",
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
