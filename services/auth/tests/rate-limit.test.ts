import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";
import { AuthTestClient, testEnv } from "./helpers.js";

/**
 * The rate limits of the sign-in attempts.
 *
 * The credential endpoints are limited by the service and the second factor
 * by the two-factor plugin; this file adds the two ways into an account that
 * do not carry a password: the OAuth start and the passkey challenge.
 *
 * The file runs on its own so the shared in-memory limiter is not polluted
 * by the other suites.
 */
const customRules = loadConfig(testEnv()).rateLimit.customRules;

function limitedClient(env: Record<string, string> = {}): AuthTestClient {
  return new AuthTestClient(
    {
      rateLimit: {
        enabled: true,
        window: 60,
        max: 1000,
        customRules,
      },
    },
    env,
  );
}

describe("rate limiting of the credential endpoints", () => {
  it("stops a burst of sign-up attempts with 429", async () => {
    const client = new AuthTestClient({
      rateLimit: {
        enabled: true,
        window: 60,
        max: 1_000,
        customRules: {},
      },
    });

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { status } = await client.post("/api/auth/sign-up/email", {
        email: `burst-${attempt}@example.co.nz`,
        password: "correct-horse-battery",
        name: "Burst Driver",
      });
      statuses.push(status);
    }

    expect(statuses).toContain(429);
    expect(statuses[0]).toBe(200);
  });

  it("stops a burst of OAuth starts with 429", async () => {
    const client = limitedClient({
      AUTH_GOOGLE_CLIENT_ID: "google-client-id-not-a-real-credential",
      AUTH_GOOGLE_CLIENT_SECRET: "google-client-secret-not-a-real-credential",
    });

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const { status } = await client.post("/api/auth/sign-in/social", {
        provider: "google",
        callbackURL: "courier://",
      });
      statuses.push(status);
    }

    expect(statuses[0]).toBe(200);
    expect(statuses).toContain(429);
  });

  it("stops a burst of passkey challenges with 429", async () => {
    const client = limitedClient({ AUTH_PASSKEY_RP_ID: "localhost" });

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const { status } = await client.get("/api/auth/passkey/generate-authenticate-options");
      statuses.push(status);
    }

    expect(statuses[0]).toBe(200);
    expect(statuses).toContain(429);
  });
});
