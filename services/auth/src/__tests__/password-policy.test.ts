/**
 * The password policy (BUG-058, ASVS V2.1.12 / V6.2.x).
 *
 * Two gaps closed: the password had no maximum length (a megabyte body would
 * be hashed), and nothing checked the password against the breached corpus.
 * The check runs through the `haveIBeenPwned` plugin (Better Auth 1.7.10),
 * which sends only the first five characters of the SHA-1 — this suite proves
 * that shape against the stub in `setup.ts`.
 */
import { describe, expect, it } from "vitest";

import { AuthTestClient, testConfig } from "./helpers.js";
import { BREACHED_PASSWORDS, pwnedRangeCalls, sha1 } from "./setup.js";

const BREACHED = BREACHED_PASSWORDS[0]!;
const FRESH = "correct-horse-battery-staple";

async function signUpWith(password: string, env: Record<string, string> = {}) {
  const client = new AuthTestClient({}, env);
  return client.post<{ message?: string; code?: string }>("/api/auth/sign-up/email", {
    email: `policy-${Math.random().toString(36).slice(2)}@example.co.nz`,
    password,
    name: "Policy Test",
  });
}

describe("the password length policy", () => {
  it("plumbs the maximum and the breached-password switch from the environment", () => {
    const config = testConfig();
    expect(config.emailAndPassword.maxPasswordLength).toBe(128);
    expect(config.emailAndPassword.breachedPasswordCheck).toBe(true);

    const off = testConfig({}, { AUTH_HIBP_ENABLED: "false" });
    expect(off.emailAndPassword.breachedPasswordCheck).toBe(false);

    const custom = testConfig({}, { AUTH_MAX_PASSWORD_LENGTH: "256" });
    expect(custom.emailAndPassword.maxPasswordLength).toBe(256);
  });

  it("accepts a passphrase up to the maximum", async () => {
    const { status } = await signUpWith("x".repeat(128));

    expect(status).toBe(200);
  });

  it("refuses a password over the maximum", async () => {
    const { status, data } = await signUpWith("x".repeat(129));

    expect(status).toBe(400);
    expect(JSON.stringify(data).toLowerCase()).toContain("password");
  });
});

describe("the breached-password check", () => {
  it("refuses a password in the breached corpus", async () => {
    const { status, data } = await signUpWith(BREACHED);

    expect(status).toBe(400);
    expect(JSON.stringify(data)).toContain("compromised");
  });

  it("accepts a password the corpus does not carry", async () => {
    const { status } = await signUpWith(FRESH);

    expect(status).toBe(200);
  });

  it("sends only the five-character SHA-1 prefix (the k-anonymity shape)", async () => {
    pwnedRangeCalls.length = 0;

    await signUpWith(FRESH);

    expect(pwnedRangeCalls).toEqual([sha1(FRESH).slice(0, 5)]);
  });

  it("can be switched off for a deployment without the service", async () => {
    const { status } = await signUpWith(BREACHED, { AUTH_HIBP_ENABLED: "false" });

    expect(status).toBe(200);
  });
});
