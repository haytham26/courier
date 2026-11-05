import { describe, expect, it } from "vitest";

import { buildAuthOptions } from "../options.js";
import { loadConfig, type AuthConfig } from "../config.js";
import { testEnv } from "./helpers.js";

/**
 * BUG-132's second half: the store the limiter uses.
 *
 * The library default is a module-level `Map`, so two replicas count into two
 * buckets and a restart resets them. `storage: "database"` is the shared store
 * Better Auth offers (its own migration adds the `rateLimit` table when it is
 * selected), and the options builder has to hand it through.
 */
function configWith(storage: AuthConfig["rateLimit"]["storage"]): AuthConfig {
  const config = loadConfig(testEnv());
  return { ...config, rateLimit: { ...config.rateLimit, storage } };
}

describe("the rate limiter's store reaches Better Auth (BUG-132)", () => {
  it("hands the database store through", () => {
    const options = buildAuthOptions(configWith("database"));

    expect(options.rateLimit?.storage).toBe("database");
  });

  it("hands the memory store through when the deployment says so", () => {
    const options = buildAuthOptions(configWith("memory"));

    expect(options.rateLimit?.storage).toBe("memory");
  });

  it("keeps the numbers it was given next to the store", () => {
    const base = loadConfig(testEnv({ AUTH_RATE_LIMIT_MAX: "25", AUTH_RATE_LIMIT_WINDOW: "30" }));
    const options = buildAuthOptions({
      ...base,
      rateLimit: { ...base.rateLimit, storage: "database" },
    });

    expect(options.rateLimit).toMatchObject({
      storage: "database",
      max: 25,
      window: 30,
    });
  });
});
