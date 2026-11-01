/**
 * The password policy (BUG-058, ASVS V2.1.12 / V6.2.x) and the breached
 * password check's reachability policy (BUG-128).
 *
 * Two gaps closed: the password had no maximum length (a megabyte body would
 * be hashed), and nothing checked the password against the breached corpus.
 *
 * BUG-128 moved this suite onto the service's own server. The check used to
 * run in Better Auth's own `haveIBeenPwned` plugin, whose outbound call to the
 * corpus carries no timeout at all - a PwnedPasswords outage made sign-up fail
 * closed with a 500 - and the old suite drove `auth.handler` directly, so it
 * could not prove any of the reachability policy. The live check is now the
 * guarded one in `src/http.ts`: bounded by `AUTH_HIBP_TIMEOUT_MS`, fail-open
 * with a log, and the same k-anonymity shape (only the SHA-1's first five
 * characters leave the service, still recorded by the stub in `setup.ts`).
 */
import { describe, expect, it } from "vitest";

import { HIBP_TIMEOUT_MS } from "../http.js";
import { aFakeAuth, aServerOn } from "./http.test.js";
import { AuthTestClient } from "./helpers.js";
import { BREACHED_PASSWORDS, pwnedRangeCalls, setPwnedBehaviour, sha1 } from "./setup.js";

const BREACHED = BREACHED_PASSWORDS[0]!;
const FRESH = "correct-horse-battery-staple";
const A_HANGING_PASSWORD = "a-password-the-corpus-never-answers-for";

async function signUpWith(
  password: string,
  env: Record<string, string> = {},
): Promise<{ status: number; data: unknown }> {
  const { base, close } = aServerOn(aFakeAuth(), env);
  try {
    const response = await fetch(`${base}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: `policy-${Math.random().toString(36).slice(2)}@example.co.nz`,
        password,
        name: "Policy Test",
      }),
    });
    return { status: response.status, data: await response.json().catch(() => null) };
  } finally {
    await close();
  }
}

describe("the password length policy", () => {
  it("accepts a passphrase up to the maximum", async () => {
    const { status } = await signUpWith("x".repeat(128));

    expect(status).toBe(200);
  });

  it("refuses a password over the maximum", async () => {
    // The length bound is Better Auth's own handler behaviour, so this one
    // drives the handler through the same client the rest of the auth suite
    // uses (the guarded check below runs on the service's own server, where
    // BUG-128 moved the reachability questions).
    const client = new AuthTestClient();
    const { status, data } = await client.post<{ message?: string }>(
      "/api/auth/sign-up/email",
      {
        email: `policy-${Math.random().toString(36).slice(2)}@example.co.nz`,
        password: "x".repeat(129),
        name: "Policy Test",
      },
    );

    expect(status).toBe(400);
    expect(JSON.stringify(data).toLowerCase()).toContain("password");
  });
});

describe("the breached-password check, bounded", () => {
  it("refuses a password in the breached corpus", async () => {
    const { status, data } = await signUpWith(BREACHED);

    expect(status).toBe(400);
    expect(JSON.stringify(data).toLowerCase()).toContain("compromised");
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

  it("carries a deadline the plugin never had (BUG-128)", () => {
    // The register's row: the plugin's outbound call has no timeout at all.
    // The guarded check states one, and a deployment can state its own.
    expect(HIBP_TIMEOUT_MS).toBeGreaterThan(0);
    expect(HIBP_TIMEOUT_MS).toBeLessThanOrEqual(5_000);
  });
});

describe("when the corpus cannot be asked (BUG-128)", () => {
  it("lets the sign-up through instead of failing closed", async () => {
    // The outage: the range endpoint never answers within the deadline. The
    // old behaviour was a 500 on the courier's screen.
    setPwnedBehaviour({ hangFor: [A_HANGING_PASSWORD] });

    const { status } = await signUpWith(A_HANGING_PASSWORD, {
      AUTH_HIBP_TIMEOUT_MS: "50",
    });

    // Fail open: the courier registers, and the reason is in the log.
    expect(status).toBe(200);
  });

  it("lets a breached-looking password through when the corpus is down", async () => {
    setPwnedBehaviour({ hangFor: [BREACHED] });

    const { status } = await signUpWith(BREACHED, { AUTH_HIBP_TIMEOUT_MS: "50" });

    expect(status).toBe(200);
  });

  it("refuses a breached password again once the corpus answers", async () => {
    setPwnedBehaviour({ hangFor: [] });

    const { status } = await signUpWith(BREACHED);

    expect(status).toBe(400);
  });
});
