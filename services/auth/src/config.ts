/**
 * Environment configuration for the Courier Copilot auth service.
 *
 * Rules (FINAL_PROMPT §0-D.3, §0-F.3.1):
 *  - no default secrets: a missing required variable must fail fast at startup
 *  - the error message must name every missing variable and point at .env.example
 */
import { z } from "zod";

export type NodeEnv = "development" | "test" | "production";

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
  };
  rateLimit: {
    enabled: boolean;
    window: number;
    max: number;
  };
  /**
   * Headers that may carry the client IP. Only set this when the service runs
   * behind a proxy that overwrites them; trusting a client-controlled header
   * would let anyone bypass the rate limiter.
   */
  ipAddressHeaders: string[];
  organization: {
    allowUserToCreateOrganization: boolean;
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
  AUTH_SESSION_EXPIRES_IN: z.coerce.number().int().positive().optional(),
  AUTH_TRUSTED_IP_HEADERS: z.string().optional(),
  PORT: z.coerce.number().int().positive().optional(),
});

const NODE_ENVS: NodeEnv[] = ["development", "test", "production"];

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
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
  if (trustedOrigins.length === 0) {
    if (nodeEnv === "production") {
      throw new MissingEnvError(["AUTH_TRUSTED_ORIGINS"]);
    }
    trustedOrigins.push("exp://");
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
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: values.AUTH_RATE_LIMIT_MAX ?? 100,
    },
    ipAddressHeaders: parseCsv(values.AUTH_TRUSTED_IP_HEADERS),
    organization: {
      allowUserToCreateOrganization: true,
    },
    telemetry: {
      enabled: false,
    },
  };
}
