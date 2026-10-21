import { describe, expect, it } from "vitest";

import { AuthTestClient } from "./helpers.js";
import type { SignInMethodsResponse } from "../src/sign-in-methods.js";

/**
 * The ids the founder has not supplied yet.
 *
 * They are placeholders, not credentials: the test only needs the service to
 * believe a provider is configured, and the browser is never opened.
 */
const GOOGLE_ID = "google-client-id-not-a-real-credential";
const GOOGLE_SECRET = "google-client-secret-not-a-real-credential";
const APPLE_ID = "apple-service-id-not-a-real-credential";
const APPLE_SECRET = "apple-client-secret-not-a-real-credential";

const PROVIDER_ENV = {
  AUTH_GOOGLE_CLIENT_ID: GOOGLE_ID,
  AUTH_GOOGLE_CLIENT_SECRET: GOOGLE_SECRET,
  AUTH_APPLE_CLIENT_ID: APPLE_ID,
  AUTH_APPLE_CLIENT_SECRET: APPLE_SECRET,
  AUTH_APPLE_BUNDLE_ID: "com.courier.copilot",
};

interface SocialSignInResponse {
  url: string;
  redirect: boolean;
}

/**
 * The social sign-in (MASTER_EXECUTION §14).
 *
 * Google and Apple are providers of Better Auth core. The client ids and the
 * secrets come from the environment; without them the provider is switched
 * off and the app hides the button.
 */
describe("social sign-in", () => {
  it("starts a Google sign-in", async () => {
    const client = new AuthTestClient({}, PROVIDER_ENV);

    const { status, data } = await client.post<SocialSignInResponse>(
      "/api/auth/sign-in/social",
      { provider: "google", callbackURL: "courier://" },
    );

    expect(status).toBe(200);
    expect(data.redirect).toBe(true);
    expect(data.url.startsWith("https://accounts.google.com/o/oauth2/v2/auth")).toBe(true);
    expect(data.url).toContain(`client_id=${GOOGLE_ID}`);
    // The start uses PKCE, so no client secret is ever put in the browser.
    expect(data.url).toContain("code_challenge_method=S256");
    expect(data.url).not.toContain(GOOGLE_SECRET);
  });

  it("starts an Apple sign-in", async () => {
    const client = new AuthTestClient({}, PROVIDER_ENV);

    const { status, data } = await client.post<SocialSignInResponse>(
      "/api/auth/sign-in/social",
      { provider: "apple", callbackURL: "courier://" },
    );

    expect(status).toBe(200);
    expect(data.redirect).toBe(true);
    expect(data.url.startsWith("https://appleid.apple.com/auth/authorize")).toBe(true);
    expect(data.url).toContain(`client_id=${APPLE_ID}`);
  });

  it("refuses a provider that is not configured", async () => {
    const client = new AuthTestClient();

    const { status } = await client.post("/api/auth/sign-in/social", {
      provider: "google",
      callbackURL: "courier://",
    });

    // The provider is not registered at all, so the route does not exist.
    expect(status).toBe(404);
  });

  it("refuses a callback that is not a trusted origin", async () => {
    const client = new AuthTestClient({}, PROVIDER_ENV);

    const { status } = await client.post("/api/auth/sign-in/social", {
      provider: "google",
      callbackURL: "https://not-our-app.example.co.nz",
    });

    expect(status).toBe(403);
  });
});

/**
 * The list of live methods.
 *
 * The app asks the service what it can offer, so the build works before the
 * founder has supplied the ids and the domains.
 */
describe("the sign-in methods the service offers", () => {
  it("switches the social providers and the passkeys off without the ids", async () => {
    const client = new AuthTestClient();

    const { status, data } = await client.get<SignInMethodsResponse>(
      "/api/auth/sign-in-methods",
    );

    expect(status).toBe(200);
    expect(data.methods.email.enabled).toBe(true);
    expect(data.methods.google.enabled).toBe(false);
    expect(data.methods.google.reason).not.toBe("");
    expect(data.methods.apple.enabled).toBe(false);
    expect(data.methods.passkey.enabled).toBe(false);
    expect(data.mfa).toBe(true);
    expect(data.teamRoles).toEqual(["owner", "admin", "member"]);
  });

  it("switches them on once the ids are in the environment", async () => {
    const client = new AuthTestClient(
      {},
      { ...PROVIDER_ENV, AUTH_PASSKEY_RP_ID: "auth.example.co.nz" },
    );

    const { status, data } = await client.get<SignInMethodsResponse>(
      "/api/auth/sign-in-methods",
    );

    expect(status).toBe(200);
    expect(data.methods.google.enabled).toBe(true);
    expect(data.methods.apple.enabled).toBe(true);
    expect(data.methods.passkey.enabled).toBe(true);
    expect(data.methods.google.reason).toBe("");
  });

  it("needs the Apple secret before it switches Apple on", async () => {
    const client = new AuthTestClient({}, { AUTH_APPLE_CLIENT_ID: APPLE_ID });

    const { data } = await client.get<SignInMethodsResponse>("/api/auth/sign-in-methods");

    expect(data.methods.apple.enabled).toBe(false);
  });
});
