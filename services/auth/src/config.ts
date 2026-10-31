/**
 * Environment configuration for the Courier Copilot auth service.
 *
 * Rules (FINAL_PROMPT §0-D.3, §0-F.3.1):
 *  - no default secrets: a missing required variable must fail fast at startup
 *  - the error message must name every missing variable and point at .env.example
 */
import { z } from "zod";

export type NodeEnv = "development" | "test" | "production";

/**
 * One social provider, as it comes from the environment.
 *
 * The client id is public by nature (it ships inside the app), the client
 * secret never leaves the server. Both come from the environment, never from
 * the repository (MASTER_EXECUTION §14).
 */
export interface SocialProviderConfig {
  clientId: string;
  clientSecret?: string;
}

export interface AuthConfig {
  appName: string;
  nodeEnv: NodeEnv;
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  port: number;
  jwks: {
    /** Absolute path of the JWKS endpoint, e.g. "/jwks". */
    path: string;
    /** Signing algorithm for the JWKS key pair. ES256 keeps PyJWT interop trivial. */
    alg: "ES256";
  };
  jwt: {
    issuer: string;
    audience: string;
    expirationTime: string;
  };
  database:
    | { provider: "memory" }
    | { provider: "postgres"; url: string };
  session: {
    expiresIn: number;
    updateAge: number;
  };
  emailAndPassword: {
    enabled: boolean;
    minPasswordLength: number;
    /** ASVS V2.1.12: a bound, so a megabyte body is never hashed. */
    maxPasswordLength: number;
    /**
     * ASVS V6.2.x / BUG-058: the breached-password check through the
     * `haveIBeenPwned` plugin (k-anonymity; only the SHA-1's first five
     * characters leave the server). On unless switched off for a deployment
     * without the service.
     */
    breachedPasswordCheck: boolean;
    requireEmailVerification: boolean;
  };
  /**
   * The social providers that are switched on.
   *
   * `null` means the provider is not configured: the founder has not supplied
   * the client id (and the secret) yet, so the service starts without it and
   * the app disables the button with the reason (MASTER_EXECUTION §14,
   * approval gate).
   */
  socialProviders: {
    google: SocialProviderConfig | null;
    apple: (SocialProviderConfig & { bundleId?: string }) | null;
  };
  /**
   * The passkey (WebAuthn) relying party.
   *
   * Passkeys need a domain, so the plugin is only switched on when the
   * founder has supplied the relying party id.
   */
  passkey: {
    enabled: boolean;
    rpID: string;
    rpName: string;
    origin: string;
  };
  /** Multi-factor authentication (TOTP with backup codes). */
  mfa: {
    issuer: string;
    backupCodeCount: number;
    accountLockout: {
      maxFailedAttempts: number;
      durationSeconds: number;
    };
  };
  rateLimit: {
    enabled: boolean;
    window: number;
    max: number;
    /** Stricter limits for the credential endpoints (per path). */
    customRules: Record<string, { window: number; max: number }>;
  };
  /**
   * Headers that may carry the client IP. Only set this when the service runs
   * behind a proxy that overwrites them; trusting a client-controlled header
   * would let anyone bypass the rate limiter.
   */
  ipAddressHeaders: string[];
  organization: {
    allowUserToCreateOrganization: boolean;
    /**
     * The roles inside a courier company. These are the three roles Better
     * Auth ships with (`owner`, `admin`, `member`); the plugin is configured
     * with them so the contract is written down rather than assumed.
     */
    roles: readonly ["owner", "admin", "member"];
  };
  telemetry: {
    enabled: boolean;
  };
}

export class MissingEnvError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(`Missing required env: ${missing.join(", ")} — see .env.example`);
    this.name = "MissingEnvError";
    this.missing = missing;
  }
}

const MIN_SECRET_LENGTH = 32;

const envSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(MIN_SECRET_LENGTH),
  BETTER_AUTH_URL: z.url(),
  AUTH_DATABASE_URL: z.string().min(1),
  AUTH_TRUSTED_ORIGINS: z.string().optional(),
  AUTH_JWT_ISSUER: z.string().min(1).optional(),
  AUTH_JWT_AUDIENCE: z.string().min(1).optional(),
  AUTH_JWT_EXPIRATION: z.string().min(1).optional(),
  AUTH_JWKS_PATH: z.string().min(1).optional(),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),
  // BUG-132: the limiter's window and its switch are the deployment's to
  // state. The library defaults are what they are, and a deployment that
  // fronts this service with its own edge needs to say so.
  AUTH_RATE_LIMIT_WINDOW: z.coerce.number().int().positive().optional(),
  AUTH_RATE_LIMIT_ENABLED: z.enum(['true', 'false']).optional(),
  AUTH_SESSION_EXPIRES_IN: z.coerce.number().int().positive().optional(),
  AUTH_REQUIRE_EMAIL_VERIFICATION: z.enum(['true', 'false']).optional(),
  AUTH_MAX_PASSWORD_LENGTH: z.coerce.number().int().positive().optional(),
  AUTH_HIBP_ENABLED: z.enum(['true', 'false']).optional(),
  AUTH_TRUSTED_IP_HEADERS: z.string().optional(),
  PORT: z.coerce.number().int().positive().optional(),
  AUTH_GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  AUTH_GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  AUTH_APPLE_CLIENT_ID: z.string().min(1).optional(),
  AUTH_APPLE_CLIENT_SECRET: z.string().min(1).optional(),
  AUTH_APPLE_BUNDLE_ID: z.string().min(1).optional(),
  AUTH_PASSKEY_RP_ID: z.string().min(1).optional(),
  AUTH_PASSKEY_RP_NAME: z.string().min(1).optional(),
  AUTH_PASSKEY_ORIGIN: z.string().min(1).optional(),
  AUTH_MFA_ISSUER: z.string().min(1).optional(),
  AUTH_MFA_BACKUP_CODES: z.coerce.number().int().positive().optional(),
  AUTH_MFA_MAX_FAILED_ATTEMPTS: z.coerce.number().int().positive().optional(),
  AUTH_MFA_LOCKOUT_SECONDS: z.coerce.number().int().positive().optional(),
});

const NODE_ENVS: NodeEnv[] = ["development", "test", "production"];

/**
 * A concrete origin, with an optional port (BUG-134).
 *
 * `scheme://` is enough for the app's own schemes (`exp://`, `courier://`,
 * which carry no host at all), and `scheme://host[:port]` is what a web origin
 * is. What is NOT one: `*` (which Better Auth's own wildcard match compiles to
 * match any host at all), a bare host with no scheme, or anything that could
 * be read as a pattern.
 */
const CONCRETE_ORIGIN = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/(?:[a-zA-Z0-9.-]+)?(?::\d+)?$/;

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Whether an origin is the relying party's own, or one beneath it (BUG-133).
 *
 * A subdomain is allowed because WebAuthn allows one: a ceremony that began on
 * `https://auth.example.co.nz` is the same relying party as `example.co.nz`.
 * What is not allowed is a host that merely shares a suffix - so the last two
 * labels have to match exactly, and not a longer suffix string.
 */
function isOriginOfRpID(origin: string, rpID: string): boolean {
  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }
  const rp = rpID.toLowerCase();
  return host === rp || host.endsWith(`.${rp}`);
}

/**
 * The origins whose host never leaves the machine (localhost and its
 * literals). A passkey origin on such a host is the developer's own machine -
 * local dev, or the test suite - and the BUG-133 threat is the network, so
 * these are exempt from the rpID cross-check the API's JWKS hop exempts the
 * same way (BUG-131).
 */
function isLoopbackOrigin(origin: string): boolean {
  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

/**
 * Builds the service configuration from the process environment.
 *
 * @throws {MissingEnvError} when a required variable is absent or invalid.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".") || "env");
    throw new MissingEnvError([...new Set(missing)].sort());
  }

  const values = parsed.data;
  const rawNodeEnv = env.NODE_ENV ?? "development";
  if (!NODE_ENVS.includes(rawNodeEnv as NodeEnv)) {
    throw new Error(
      `Invalid NODE_ENV: ${rawNodeEnv} — expected one of ${NODE_ENVS.join(", ")}`,
    );
  }
  const nodeEnv = rawNodeEnv as NodeEnv;

  const database: AuthConfig["database"] = values.AUTH_DATABASE_URL === "memory://"
    ? { provider: "memory" }
    : { provider: "postgres", url: values.AUTH_DATABASE_URL };

  if (database.provider === "memory" && nodeEnv === "production") {
    throw new Error(
      "AUTH_DATABASE_URL=memory:// is not allowed in production — point it at Postgres",
    );
  }

  const baseURL = values.BETTER_AUTH_URL.replace(/\/+$/, "");
  const trustedOrigins = parseCsv(values.AUTH_TRUSTED_ORIGINS);
  // BUG-134: an entry that is not a concrete scheme+host is refused, because
  // Better Auth's `matchesOriginPattern` compiles `*` to match ANY host - the
  // origin check is then disabled for every route while `options.ts` still
  // reports it as on, so a reviewer reading the options concludes it is
  // protected. A wildcard therefore never boots.
  for (const origin of trustedOrigins) {
    if (!CONCRETE_ORIGIN.test(origin)) {
      throw new Error(
        `AUTH_TRUSTED_ORIGINS carries ${JSON.stringify(origin)}: every entry must be a `
        + "concrete scheme://host (a wildcard, or a bare host, disables the origin check "
        + "while reporting it as on)",
      );
    }
  }
  if (trustedOrigins.length === 0) {
    if (nodeEnv === "production") {
      throw new MissingEnvError(["AUTH_TRUSTED_ORIGINS"]);
    }
    trustedOrigins.push("exp://");
  }

  // Google signs the courier in with a public client id; the secret is
  // optional because the native apps use PKCE.
  const google =
    values.AUTH_GOOGLE_CLIENT_ID === undefined
      ? null
      : {
          clientId: values.AUTH_GOOGLE_CLIENT_ID,
          ...(values.AUTH_GOOGLE_CLIENT_SECRET === undefined
            ? {}
            : { clientSecret: values.AUTH_GOOGLE_CLIENT_SECRET }),
        };

  // Apple needs the signed client secret as well as the service id, so the
  // provider stays off until both are in the environment.
  const apple =
    values.AUTH_APPLE_CLIENT_ID === undefined || values.AUTH_APPLE_CLIENT_SECRET === undefined
      ? null
      : {
          clientId: values.AUTH_APPLE_CLIENT_ID,
          clientSecret: values.AUTH_APPLE_CLIENT_SECRET,
          ...(values.AUTH_APPLE_BUNDLE_ID === undefined
            ? {}
            : { bundleId: values.AUTH_APPLE_BUNDLE_ID }),
        };

  // Passkeys need a relying party domain; the founder supplies it.
  const passkeyEnabled = values.AUTH_PASSKEY_RP_ID !== undefined;
  const rpID = values.AUTH_PASSKEY_RP_ID ?? "localhost";
  // BUG-133: the WebAuthn origin is derived from the service's own URL rather
  // than defaulting to the apex of the relying party. The apex default let a
  // deployment whose `BETTER_AUTH_URL` is `https://auth.example.co.nz` and
  // whose `rpID` is `example.co.nz` accept a ceremony replayed from
  // `https://example.co.nz` - a page the organisation does not serve from here.
  // Whatever the value is, its host has to be the relying party's own host or
  // one beneath it - and the check runs on the derived value too, not only on
  // the one the operator typed: a derived origin whose host is off the rpID is
  // the same misconfiguration, reached without anyone naming
  // AUTH_PASSKEY_ORIGIN at all. Loopback is exempt, the same way the API's
  // JWKS hop exempts it (BUG-131): the threat is the network, and a loopback
  // origin is the developer's own machine - including the test suite, which
  // runs the service on localhost with a production rpID.
  const passkeyOrigin = values.AUTH_PASSKEY_ORIGIN ?? baseURL;
  if (passkeyEnabled && !isLoopbackOrigin(passkeyOrigin) && !isOriginOfRpID(passkeyOrigin, rpID)) {
    throw new Error(
      `AUTH_PASSKEY_ORIGIN=${passkeyOrigin} is not an origin of AUTH_PASSKEY_RP_ID=${rpID}: `
      + "the passkey origin must be the relying party's own host (or one beneath it)",
    );
  }

  return {
    appName: "Courier Copilot",
    nodeEnv,
    secret: values.BETTER_AUTH_SECRET,
    baseURL,
    trustedOrigins,
    port: values.PORT ?? 3001,
    jwks: {
      path: values.AUTH_JWKS_PATH ?? "/jwks",
      alg: "ES256",
    },
    jwt: {
      issuer: values.AUTH_JWT_ISSUER ?? baseURL,
      audience: values.AUTH_JWT_AUDIENCE ?? "courier-api",
      expirationTime: values.AUTH_JWT_EXPIRATION ?? "15m",
    },
    database,
    session: {
      expiresIn: values.AUTH_SESSION_EXPIRES_IN ?? 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: values.AUTH_MAX_PASSWORD_LENGTH ?? 128,
      breachedPasswordCheck: values.AUTH_HIBP_ENABLED !== "false",
      requireEmailVerification:
        values.AUTH_REQUIRE_EMAIL_VERIFICATION === "true",
    },
    socialProviders: {
      google,
      apple,
    },
    passkey: {
      enabled: passkeyEnabled,
      rpID,
      rpName: values.AUTH_PASSKEY_RP_NAME ?? "Courier Copilot",
      origin: passkeyOrigin,
    },
    mfa: {
      issuer: values.AUTH_MFA_ISSUER ?? "Courier Copilot",
      backupCodeCount: values.AUTH_MFA_BACKUP_CODES ?? 10,
      accountLockout: {
        maxFailedAttempts: values.AUTH_MFA_MAX_FAILED_ATTEMPTS ?? 5,
        durationSeconds: values.AUTH_MFA_LOCKOUT_SECONDS ?? 900,
      },
    },
    rateLimit: {
      enabled: values.AUTH_RATE_LIMIT_ENABLED !== "false",
      window: values.AUTH_RATE_LIMIT_WINDOW ?? 60,
      max: values.AUTH_RATE_LIMIT_MAX ?? 100,
      // Credential endpoints get the strict treatment (OWASP: ~10 attempts
      // per 15 minutes); sign-up is even tighter because it is anonymous.
      // The OAuth start and the passkey ceremonies are limited as well: they
      // are the two ways into an account that do not carry a password.
      customRules: {
        "/sign-up/email": { window: 3600, max: 10 },
        "/sign-in/email": { window: 900, max: 10 },
        "/forget-password": { window: 900, max: 5 },
        "/sign-in/social": { window: 900, max: 10 },
        "/passkey/generate-register-options": { window: 900, max: 20 },
        "/passkey/verify-registration": { window: 900, max: 10 },
        "/passkey/generate-authenticate-options": { window: 900, max: 20 },
        "/passkey/verify-authentication": { window: 900, max: 10 },
      },
    },
    ipAddressHeaders: parseCsv(values.AUTH_TRUSTED_IP_HEADERS),
    organization: {
      allowUserToCreateOrganization: true,
      roles: ["owner", "admin", "member"],
    },
    telemetry: {
      enabled: false,
    },
  };
}
