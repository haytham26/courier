import { describe, expect, it } from "vitest";

import { AuthTestClient, BASE_URL, signUp } from "./helpers.js";
import {
  authenticationResponse,
  createAuthenticator,
  registrationResponse,
} from "./webauthn.js";

/**
 * The relying party of the tests.
 *
 * The origin has to match the one the service is told to expect, and the
 * relying party id has to be the host name of the base URL.
 */
const RP_ID = "localhost";
const ORIGIN = BASE_URL;

/** The environment that switches the passkey plugin on. */
const PASSKEY_ENV = {
  AUTH_PASSKEY_RP_ID: RP_ID,
  AUTH_PASSKEY_ORIGIN: ORIGIN,
};

interface RegistrationOptions {
  challenge: string;
  rp: { id: string; name: string };
}

interface AuthenticationOptions {
  challenge: string;
  rp: { id: string };
}

interface PasskeyRow {
  id: string;
  credentialID: string;
  name?: string;
}

/**
 * Passkeys (MASTER_EXECUTION §14).
 *
 * The service runs the WebAuthn plugin of Better Auth
 * (`@better-auth/passkey` 1.7.10, the same version as the core). The test
 * plays the part of the phone: it holds a key pair, answers the challenge
 * and signs the authenticator data, so the real verification of
 * `@simplewebauthn/server` decides the outcome.
 */
describe("passkeys", () => {
  it("refuses to register a passkey without a session", async () => {
    const client = new AuthTestClient({}, PASSKEY_ENV);

    const { status } = await client.get("/api/auth/passkey/generate-register-options");

    expect(status).toBe(401);
  });

  it("registers a passkey for the signed-in courier", async () => {
    const client = new AuthTestClient({}, PASSKEY_ENV);
    await signUp(client, "passkey@example.co.nz");

    const { status, data } = await client.get<RegistrationOptions>(
      "/api/auth/passkey/generate-register-options",
    );

    expect(status).toBe(200);
    expect(data.challenge).toBeTruthy();
    expect(data.rp.id).toBe(RP_ID);

    const authenticator = createAuthenticator();
    const verified = await client.post<{ id: string; credentialID: string }>(
      "/api/auth/passkey/verify-registration",
      {
        response: registrationResponse(authenticator, {
          challenge: data.challenge,
          origin: ORIGIN,
          rpId: RP_ID,
        }),
        name: "This phone",
      },
    );

    expect(verified.status).toBe(200);
    expect(verified.data.credentialID).toBe(authenticator.credentialId);

    const listed = await client.get<PasskeyRow[]>("/api/auth/passkey/list-user-passkeys");
    expect(listed.status).toBe(200);
    expect(listed.data).toHaveLength(1);
    expect(listed.data[0]?.name).toBe("This phone");
  });

  it("signs the courier in with a passkey", async () => {
    const client = new AuthTestClient({}, PASSKEY_ENV);
    await signUp(client, "passkey-signin@example.co.nz");
    const authenticator = createAuthenticator();

    const registration = await client.get<RegistrationOptions>(
      "/api/auth/passkey/generate-register-options",
    );
    await client.post("/api/auth/passkey/verify-registration", {
      response: registrationResponse(authenticator, {
        challenge: registration.data.challenge,
        origin: ORIGIN,
        rpId: RP_ID,
      }),
      name: "This phone",
    });

    await client.request("/api/auth/sign-out", { method: "POST" });
    client.clearCookies();

    const challenge = await client.get<AuthenticationOptions>(
      "/api/auth/passkey/generate-authenticate-options",
    );
    expect(challenge.status).toBe(200);
    expect(challenge.data.challenge).toBeTruthy();

    const verified = await client.post<{
      user: { email: string };
      session: { token: string };
    }>("/api/auth/passkey/verify-authentication", {
      response: authenticationResponse(authenticator, {
        challenge: challenge.data.challenge,
        origin: ORIGIN,
        rpId: RP_ID,
      }),
    });

    expect(verified.status).toBe(200);
    expect(verified.data.user.email).toBe("passkey-signin@example.co.nz");
    expect(verified.data.session.token).toBeTruthy();

    const session = await client.get<{ user: { email: string } }>("/api/auth/get-session");
    expect(session.data.user.email).toBe("passkey-signin@example.co.nz");
  });

  it("refuses a passkey sign-in without the challenge", async () => {
    const client = new AuthTestClient({}, PASSKEY_ENV);
    const authenticator = createAuthenticator();

    const { status } = await client.post("/api/auth/passkey/verify-authentication", {
      response: authenticationResponse(authenticator, {
        challenge: "a-challenge-the-server-never-issued",
        origin: ORIGIN,
        rpId: RP_ID,
      }),
    });

    expect(status).toBe(400);
  });

  it("refuses a passkey sign-in from another origin", async () => {
    const client = new AuthTestClient({}, PASSKEY_ENV);
    await signUp(client, "passkey-origin@example.co.nz");
    const authenticator = createAuthenticator();

    const registration = await client.get<RegistrationOptions>(
      "/api/auth/passkey/generate-register-options",
    );
    await client.post("/api/auth/passkey/verify-registration", {
      response: registrationResponse(authenticator, {
        challenge: registration.data.challenge,
        origin: ORIGIN,
        rpId: RP_ID,
      }),
    });
    await client.request("/api/auth/sign-out", { method: "POST" });
    client.clearCookies();

    const challenge = await client.get<AuthenticationOptions>(
      "/api/auth/passkey/generate-authenticate-options",
    );
    const { status } = await client.post("/api/auth/passkey/verify-authentication", {
      response: authenticationResponse(authenticator, {
        challenge: challenge.data.challenge,
        origin: "https://not-our-app.example.co.nz",
        rpId: RP_ID,
      }),
    });

    expect(status).toBe(400);
  });

  it("keeps the passkey plugin switched off without a relying party", async () => {
    const client = new AuthTestClient();

    const { status } = await client.get("/api/auth/passkey/generate-register-options");

    expect(status).toBe(404);
  });
});
