/**
 * Better Auth option construction for Courier Copilot.
 *
 * Plugins (MASTER_EXECUTION §14 — the complete sign-in):
 *  - `organization` — teams for a courier company (owner, admin, member)
 *  - `twoFactor`     — MFA with TOTP and backup codes
 *  - `passkey`       — WebAuthn sign-in (`@better-auth/passkey` 1.7.10)
 *  - `expo`          — the React Native / Expo client (mobile app)
 *  - `jwt`           — JWKS-backed access tokens that FastAPI verifies (D21)
 *  - `signInMethods` — tells the app which sign-in methods are live
 *
 * The social providers (Google, Apple) are built into Better Auth core and
 * are only switched on when the founder has put the client ids in the
 * environment.
 */
import type { BetterAuthOptions } from "better-auth";
import { jwt, organization, twoFactor } from "better-auth/plugins";
import { haveIBeenPwned } from "better-auth/plugins/haveibeenpwned";
import { expo } from "@better-auth/expo";
import { passkey } from "@better-auth/passkey";

import type { AuthConfig } from "./config.js";
import { signInMethods } from "./sign-in-methods.js";

export function buildAuthOptions(config: AuthConfig): BetterAuthOptions {
  const google = config.socialProviders.google;
  const apple = config.socialProviders.apple;

  return {
    appName: config.appName,
    secret: config.secret,
    baseURL: config.baseURL,
    trustedOrigins: config.trustedOrigins,
    emailAndPassword: {
      enabled: config.emailAndPassword.enabled,
      minPasswordLength: config.emailAndPassword.minPasswordLength,
      maxPasswordLength: config.emailAndPassword.maxPasswordLength,
      autoSignIn: true,
      requireEmailVerification: config.emailAndPassword.requireEmailVerification,
    },
    session: {
      expiresIn: config.session.expiresIn,
      updateAge: config.session.updateAge,
    },
    ...(google === null && apple === null
      ? {}
      : {
          socialProviders: {
            ...(google === null
              ? {}
              : {
                  google: {
                    clientId: google.clientId,
                    ...(google.clientSecret === undefined
                      ? {}
                      : { clientSecret: google.clientSecret }),
                  },
                }),
            ...(apple === null
              ? {}
              : {
                  apple: {
                    clientId: apple.clientId,
                    ...(apple.clientSecret === undefined
                      ? {}
                      : { clientSecret: apple.clientSecret }),
                    ...(apple.bundleId === undefined ? {} : { appBundleIdentifier: apple.bundleId }),
                  },
                }),
          },
        }),
    rateLimit: {
      enabled: config.rateLimit.enabled,
      window: config.rateLimit.window,
      max: config.rateLimit.max,
      customRules: config.rateLimit.customRules,
    },
    telemetry: {
      enabled: config.telemetry.enabled,
    },
    advanced: {
      // The origin check stays on everywhere, the test suite included: the
      // app sends its `expo-origin` header and the `expo` plugin turns it
      // into the `origin` header the check reads (the trust list holds the
      // app scheme, `courier://`).
      disableOriginCheck: false,
      ...(config.ipAddressHeaders.length > 0
        ? { ipAddress: { ipAddressHeaders: config.ipAddressHeaders } }
        : {}),
    },
    plugins: [
      organization({
        allowUserToCreateOrganization: config.organization.allowUserToCreateOrganization,
        creatorRole: "owner",
        membershipLimit: 100,
        teams: {
          enabled: true,
          defaultTeam: { enabled: true },
          maximumTeams: 20,
        },
      }),
      twoFactor({
        issuer: config.mfa.issuer,
        totpOptions: {
          digits: 6,
          period: 30,
          backupCodes: {
            amount: config.mfa.backupCodeCount,
            length: 10,
            // The backup codes are credentials: they are stored encrypted.
            storeBackupCodes: "encrypted",
          },
        },
        accountLockout: {
          enabled: true,
          maxFailedAttempts: config.mfa.accountLockout.maxFailedAttempts,
          durationSeconds: config.mfa.accountLockout.durationSeconds,
        },
      }),
      ...(config.passkey.enabled
        ? [
            passkey({
              rpID: config.passkey.rpID,
              rpName: config.passkey.rpName,
              origin: config.passkey.origin,
            }),
          ]
        : []),
      expo(),
      // BUG-128: Better Auth's own breached-password plugin is OFF by default,
      // because its outbound call to the corpus carries no timeout at all - a
      // PwnedPasswords outage made sign-up fail closed with a 500. The live
      // check is the guarded one in `src/http.ts`: bounded, and fail-open with
      // a log. A deployment that wants the plugin as well (its unbounded call
      // and all) sets AUTH_HIBP_PLUGIN=true.
      haveIBeenPwned({
        enabled:
          config.emailAndPassword.breachedPasswordCheck && config.emailAndPassword.hibpPlugin,
      }),
      jwt({
        jwks: {
          jwksPath: config.jwks.path,
          keyPairConfig: { alg: config.jwks.alg },
        },
        jwt: {
          issuer: config.jwt.issuer,
          audience: config.jwt.audience,
          expirationTime: config.jwt.expirationTime,
        },
      }),
      signInMethods({
        google: google !== null,
        apple: apple !== null,
        passkey: config.passkey.enabled,
        mfa: true,
        teamRoles: config.organization.roles,
      }),
    ],
  };
}
