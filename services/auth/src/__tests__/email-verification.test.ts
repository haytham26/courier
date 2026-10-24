import { describe, expect, it } from "vitest";
import { buildAuthOptions } from "../options.js";
import { loadConfig } from "../config.js";

const baseEnv = {
  BETTER_AUTH_SECRET: "test-only-value-not-a-real-credential-0000",
  BETTER_AUTH_URL: "https://auth.example.co.nz",
  AUTH_DATABASE_URL: "postgresql://courier:courier@127.0.0.1:5432/courier",
};

describe("the email-verification option", () => {
  it("is off by default (no email-sending lane exists yet)", () => {
    const config = loadConfig(baseEnv);
    const options = buildAuthOptions(config);
    expect(options.emailAndPassword?.requireEmailVerification).toBe(false);
  });

  it("turns on with AUTH_REQUIRE_EMAIL_VERIFICATION=true", () => {
    const config = loadConfig({
      ...baseEnv,
      AUTH_REQUIRE_EMAIL_VERIFICATION: "true",
    });
    const options = buildAuthOptions(config);
    expect(options.emailAndPassword?.requireEmailVerification).toBe(true);
  });
});
