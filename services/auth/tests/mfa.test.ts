import { describe, expect, it } from "vitest";

import { AuthTestClient, signUp } from "./helpers.js";
import { secretFromTotpUri, totpCode } from "./totp.js";

const PASSWORD = "correct-horse-battery";

interface TwoFactorEnableResponse {
  totpURI: string;
  backupCodes: string[];
}

interface TwoFactorChallengeResponse {
  twoFactorRedirect: boolean;
  twoFactorMethods: string[];
}

/**
 * Turns the second factor on for the signed-in courier.
 *
 * The enrolment is two steps: the service hands out the secret and the
 * backup codes, and the courier proves the authenticator app works by
 * entering the first code. Only then is the second factor switched on.
 */
async function enableTwoFactor(
  client: AuthTestClient,
): Promise<TwoFactorEnableResponse> {
  const { status, data } = await client.post<TwoFactorEnableResponse>(
    "/api/auth/two-factor/enable",
    { password: PASSWORD, method: "totp" },
  );
  if (status !== 200) {
    throw new Error(`the second factor could not be switched on: ${status}`);
  }
  const secret = secretFromTotpUri(data.totpURI);
  const verified = await client.post("/api/auth/two-factor/verify-totp", {
    code: totpCode(secret),
  });
  if (verified.status !== 200) {
    throw new Error(`the enrolment code was refused: ${verified.status}`);
  }
  return data;
}

/**
 * Multi-factor authentication (MASTER_EXECUTION §14).
 *
 * The service uses the Better Auth two-factor plugin: TOTP with a time code
 * from the courier's authenticator app, and backup codes for the phone that
 * is at the bottom of the van with no signal.
 */
describe("multi-factor authentication", () => {
  it("enables TOTP and hands back the URI and the backup codes", async () => {
    const client = new AuthTestClient();
    await signUp(client, "mfa@example.co.nz");

    const { status, data } = await client.post<TwoFactorEnableResponse>(
      "/api/auth/two-factor/enable",
      { password: PASSWORD, method: "totp" },
    );

    expect(status).toBe(200);
    expect(data.totpURI.startsWith("otpauth://totp/")).toBe(true);
    expect(data.backupCodes).toHaveLength(10);
  });

  it("asks for the second factor when the courier signs in again", async () => {
    const client = new AuthTestClient();
    await signUp(client, "challenge@example.co.nz");
    const enabled = await enableTwoFactor(client);
    await client.request("/api/auth/sign-out", { method: "POST" });
    client.clearCookies();

    const { status, data } = await client.post<TwoFactorChallengeResponse>(
      "/api/auth/sign-in/email",
      { email: "challenge@example.co.nz", password: PASSWORD },
    );

    expect(status).toBe(200);
    expect(data.twoFactorRedirect).toBe(true);
    expect(data.twoFactorMethods).toContain("totp");

    const code = totpCode(secretFromTotpUri(enabled.totpURI));
    const verified = await client.post<{ token: string }>("/api/auth/two-factor/verify-totp", {
      code,
    });

    expect(verified.status).toBe(200);
    expect(verified.data.token).toBeTruthy();
  });

  it("accepts a backup code when the authenticator app is not to hand", async () => {
    const client = new AuthTestClient();
    await signUp(client, "backup@example.co.nz");
    const enabled = await enableTwoFactor(client);
    await client.request("/api/auth/sign-out", { method: "POST" });
    client.clearCookies();
    await client.post("/api/auth/sign-in/email", {
      email: "backup@example.co.nz",
      password: PASSWORD,
    });

    const backupCode = enabled.backupCodes[0];
    expect(backupCode).toBeTruthy();

    const { status, data } = await client.post<{ token: string }>(
      "/api/auth/two-factor/verify-backup-code",
      { code: backupCode },
    );

    expect(status).toBe(200);
    expect(data.token).toBeTruthy();
  });

  it("refuses a wrong time code", async () => {
    const client = new AuthTestClient();
    await signUp(client, "wrong-code@example.co.nz");
    await enableTwoFactor(client);
    await client.request("/api/auth/sign-out", { method: "POST" });
    client.clearCookies();
    await client.post("/api/auth/sign-in/email", {
      email: "wrong-code@example.co.nz",
      password: PASSWORD,
    });

    const { status } = await client.post("/api/auth/two-factor/verify-totp", {
      code: "000000",
    });

    expect(status).toBe(401);
  });

  it("locks the account after five wrong codes", async () => {
    const client = new AuthTestClient();
    await signUp(client, "locked@example.co.nz");
    await enableTwoFactor(client);
    await client.request("/api/auth/sign-out", { method: "POST" });
    client.clearCookies();
    await client.post("/api/auth/sign-in/email", {
      email: "locked@example.co.nz",
      password: PASSWORD,
    });

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { status } = await client.post("/api/auth/two-factor/verify-totp", {
        code: "000000",
      });
      statuses.push(status);
    }

    expect(statuses.every((status) => status === 401)).toBe(true);

    // The account is locked now: a fresh sign-in cannot get past the second
    // factor until the lock runs out.
    await client.request("/api/auth/sign-out", { method: "POST" });
    client.clearCookies();
    await client.post("/api/auth/sign-in/email", {
      email: "locked@example.co.nz",
      password: PASSWORD,
    });

    const { status } = await client.post("/api/auth/two-factor/verify-totp", {
      code: "000000",
    });

    expect(status).toBe(429);
  });

  it("does not let a courier turn the second factor off without the password", async () => {
    const client = new AuthTestClient();
    await signUp(client, "disable@example.co.nz");
    await enableTwoFactor(client);

    const { status } = await client.post("/api/auth/two-factor/disable", {
      password: "not-the-password",
    });

    expect(status).toBe(400);
  });
});
