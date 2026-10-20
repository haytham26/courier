/**
 * Better Auth option construction for Courier Copilot.
 *
 * Plugins (FINAL_PROMPT §0-F.3.1):
 *  - `organization` — teams/orgs for the Team plan (D11)
 *  - `expo`         — the React Native / Expo client (mobile app)
 *  - `jwt`          — JWKS-backed access tokens that FastAPI verifies (D21)
 */
import type { BetterAuthOptions } from "better-auth";
import { jwt, organization } from "better-auth/plugins";
import { expo } from "@better-auth/expo";

import type { AuthConfig } from "./config.js";

export function buildAuthOptions(config: AuthConfig): BetterAuthOptions {
  return {
    appName: config.appName,
    secret: config.secret,
    baseURL: config.baseURL,
    trustedOrigins: config.trustedOrigins,
    emailAndPassword: {
      enabled: config.emailAndPassword.enabled,
      minPasswordLength: config.emailAndPassword.minPasswordLength,
      autoSignIn: true,
      requireEmailVerification: false,
    },
    session: {
      expiresIn: config.session.expiresIn,
      updateAge: config.session.updateAge,
    },
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
      expo(),
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
    ],
  };
}
