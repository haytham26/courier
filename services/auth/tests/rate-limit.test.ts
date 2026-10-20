import { describe, expect, it } from "vitest";

import { AuthTestClient } from "./helpers.js";

/**
 * The credential endpoints are rate limited (Better Auth applies a built-in
 * rule to /sign-in* and /sign-up*, and the service tightens it further).
 * This file runs on its own so the shared in-memory limiter is not polluted
 * by the other suites.
 */
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
});
