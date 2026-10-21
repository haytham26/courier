/**
 * The sign-in methods the service offers.
 *
 * The app asks the service which methods are live instead of guessing from
 * its own environment. That is what lets the build work before the founder
 * has supplied the Google and Apple client ids and the passkey domain: the
 * service answers with the methods it actually has, and the app hides the
 * other buttons with a plain sentence (MASTER_EXECUTION §14).
 *
 * The endpoint carries no secret: it says which methods exist, nothing about
 * the ids, the secrets or the accounts.
 */
import { createAuthEndpoint } from "better-auth/api";
import type { BetterAuthPlugin } from "better-auth";

/** The sign-in methods the app can offer. */
export const SIGN_IN_METHODS = ["email", "google", "apple", "passkey"] as const;

export type SignInMethod = (typeof SIGN_IN_METHODS)[number];

export interface SignInMethodState {
  /** Whether the courier can use this method right now. */
  enabled: boolean;
  /**
   * Why the method is off, in plain words. Empty when the method is on.
   * The app shows it under the button.
   */
  reason: string;
}

export interface SignInMethodsResponse {
  methods: Record<SignInMethod, SignInMethodState>;
  /** Whether multi-factor authentication is switched on for the service. */
  mfa: boolean;
  /** The team roles the service knows. */
  teamRoles: readonly string[];
}

export interface SignInMethodsOptions {
  google: boolean;
  apple: boolean;
  passkey: boolean;
  mfa: boolean;
  teamRoles: readonly string[];
}

/**
 * The plugin that publishes the endpoint.
 *
 * It is a plugin rather than a bare route so the endpoint sits next to the
 * rest of the Better Auth surface and is served on the same base path.
 */
export function signInMethods(options: SignInMethodsOptions): BetterAuthPlugin {
  const methods: Record<SignInMethod, SignInMethodState> = {
    email: { enabled: true, reason: "" },
    google: options.google
      ? { enabled: true, reason: "" }
      : { enabled: false, reason: "Google sign-in is not set up on this server yet." },
    apple: options.apple
      ? { enabled: true, reason: "" }
      : { enabled: false, reason: "Apple sign-in is not set up on this server yet." },
    passkey: options.passkey
      ? { enabled: true, reason: "" }
      : { enabled: false, reason: "Passkeys are not set up on this server yet." },
  };

  return {
    id: "courier-sign-in-methods",
    endpoints: {
      /**
       * GET `/sign-in-methods`
       *
       * **server:** `auth.api.getSignInMethods`
       *
       * **client:** `authClient.getSignInMethods`
       */
      getSignInMethods: createAuthEndpoint(
        "/sign-in-methods",
        { method: "GET" },
        async (ctx) =>
          ctx.json({
            methods,
            mfa: options.mfa,
            teamRoles: options.teamRoles,
          } satisfies SignInMethodsResponse),
      ),
    },
  };
}
