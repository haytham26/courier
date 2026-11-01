/**
 * The HTTP server of the auth service, in front of Better Auth.
 *
 * Better Auth limits a request by IP and path (`createRateLimitKey(ip, path)`)
 * and its `customRules` can change the window and the count but never the key.
 * That leaves the one bucket that matters to a courier's account without a
 * limit of its own: 500 password guesses against one address from rotating IPs
 * never trip anything (BUG-127). This file puts that bucket in front of the
 * handler, and with it two things the handler chain was missing entirely:
 *
 * - a body a caller cannot exceed, answered 413 before the handler reads it
 *   (BUG-130);
 * - a rejected handler answered 500 instead of taking the process down
 *   (BUG-129).
 *
 * The service's own server is plain Node on purpose: it already owns the
 * readiness probe, so owning the rest of the request costs nothing and makes
 * all three rules testable against the real listener.
 */

import { createHash } from "node:crypto";
import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { Readable } from "node:stream";

import type { AuthInstance } from "./server.js";
import type { AuthConfig } from "./config.js";
import { healthBody, isHealthPath } from "./health.js";

/** How much of a request body the service will read (BUG-130). */
export const MAX_BODY_BYTES = 256 * 1024;

/**
 * The paths that set a new password, where the breached check runs (BUG-128).
 *
 * The same three Better Auth's own `haveIBeenPwned` plugin names - and the
 * same reason it is not the live one any more: its outbound call carries no
 * timeout at all, so a PwnedPasswords outage made sign-up fail closed with a
 * 500 and a courier could not register during a third-party outage.
 */
export const BREACHED_PASSWORD_PATHS = ["/sign-up/email", "/change-password", "/reset-password"];

/** How long the corpus call may take before the request goes through anyway. */
export const HIBP_TIMEOUT_MS = 2_000;

const HIBP_RANGE_PREFIX = "https://api.pwnedpasswords.com/range/";

/** What the corpus answered, or `unknown` when it could not be asked. */
export type BreachVerdict = "breached" | "fresh" | "unknown";

/**
 * The SHA-1 of a password, as the k-anonymity range wants it.
 *
 * CodeQL reads this as an insecure password hash; it is not. The Have I Been
 * Pwned range API is *specified* in SHA-1, and the k-anonymity shape means
 * only the first five hex characters - 20 bits - ever leave the process, so
 * the digest is a bucket selector, not a way of storing or comparing the
 * password. There is no SHA-256 variant of the range endpoint to switch to.
 */
// lgtm [js/insufficient-password-hash] The k-anonymity range API is SHA-1 by specification; the digest is a 5-character bucket selector, not stored.
export function sha1(value: string): string {
  // codeql[js/insufficient-password-hash] The Have I Been Pwned range API is SHA-1 by specification: only the first five hex characters (20 bits) leave the process, so this digest is a bucket selector, not password storage.
  const hex = createHash("sha1").update(value).digest("hex"); // lgtm [js/insufficient-password-hash] Same reason, on the digest line itself: 20 bits leave the process.
  return hex.toUpperCase();
}

/**
 * The password a credential request sets, or null when it carries none.
 *
 * Only the three paths that set a password are read, so no other route's body
 * is parsed for a field it does not have.
 */
export function passwordOf(path: string, body: string): string | null {
  if (!BREACHED_PASSWORD_PATHS.includes(path)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const candidate = (parsed as Record<string, unknown>).password;
  if (typeof candidate !== "string") return null;
  return candidate.length > 0 ? candidate : null;
}

/**
 * Whether the password appears in the breached corpus - BOUNDED (BUG-128).
 *
 * The k-anonymity shape is unchanged (only the SHA-1's first five characters
 * leave the service); what the row asked for and the plugin could not give is
 * the deadline and the policy: the call is raced by `AbortSignal.timeout`, and
 * any failure - a timeout, a reset, an outage, a non-200 - answers `unknown`
 * so the caller can let the request through instead of failing closed.
 */
export async function breachedPasswordVerdict(
  password: string,
  options: {
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
    sha1Of?: (value: string) => string;
  } = {},
): Promise<BreachVerdict> {
  const timeoutMs = options.timeoutMs ?? HIBP_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const digest = (options.sha1Of ?? sha1)(password);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // The deadline is raced explicitly rather than left to the signal: a
    // caller that ignores `AbortSignal` (a proxy, a stub, a connection that
    // accepted) would otherwise park the request even with a timeout set.
    const response = await Promise.race([
      fetchImpl(`${HIBP_RANGE_PREFIX}${digest.slice(0, 5)}`, {
        signal: AbortSignal.timeout(timeoutMs),
      }),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("the breached-password corpus did not answer in time")),
          timeoutMs,
        );
      }),
    ]);
    if (!response.ok) return "unknown";
    const suffix = digest.slice(5);
    for (const line of (await response.text()).split(/\r?\n/)) {
      const [hash, count] = line.split(":");
      if (hash === suffix && Number(count) > 0) return "breached";
    }
    return "fresh";
  } catch {
    // The third party could not be asked in time: fail open (BUG-128). A
    // deployment's sign-up must not be hostage to a corpus outage.
    return "unknown";
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** How many accounts the limiter remembers before it forgets the oldest. */
export const MAX_ACCOUNT_KEYS = 10_000;

/**
 * The limits of an account, per path (BUG-127).
 *
 * Keyed by the account the caller names, so the limit holds however many
 * addresses a guesser burns. These are deliberately stricter than the IP
 * buckets the same paths already carry in `config.ts` (`/sign-in/email` is
 * 10 per 900 s there), because the account is the rarer key: an attacker
 * rotates IPs freely and cannot rotate a mailbox. Sign-up is NOT keyed by the
 * account - the register's row named sign-in, forget-password and the
 * two-factor verifications, and an account bucket on sign-up would let anyone
 * burn a chosen mailbox for its whole window and lock the real owner out of
 * registering.
 */
export const ACCOUNT_RULES: Record<string, { window: number; max: number }> = {
  "/sign-in/email": { window: 900, max: 5 },
  "/forget-password": { window: 900, max: 3 },
  "/reset-password": { window: 900, max: 5 },
  "/two-factor/verify-totp": { window: 900, max: 5 },
  "/two-factor/verify-backup-code": { window: 900, max: 5 },
  "/two-factor/verify-otp": { window: 900, max: 5 },
};

/** The path Better Auth would see: the base path and `/api/auth` stripped. */
export function authPathOf(url: URL): string {
  const normalised = url.pathname.replace(/^\/api\/auth/, "");
  return normalised.startsWith("/") ? normalised : `/${normalised}`;
}

/**
 * The account a credential request names, or null when it names none.
 *
 * A request that carries no account cannot be keyed by one, and it stays where
 * it was: the IP bucket. Sign-up is not in `ACCOUNT_RULES`, so it stays there
 * entirely: an account bucket on registration would let anyone burn a chosen
 * mailbox for the bucket's whole window and lock the real owner out.
 */
export function accountOf(path: string, body: string): string | null {
  if (!(path in ACCOUNT_RULES)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const candidate = (parsed as Record<string, unknown>).email;
  if (typeof candidate !== "string") return null;
  const trimmed = candidate.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * The per-account limiter.
 *
 * The count is held in the memory of the process. Better Auth's own limiter
 * does the same today, and Valkey is what the compose stack already provides
 * for the shared store (BUG-132 carries that); what this class fixes is the
 * key, not where the counters live.
 */
export class AccountLimiter {
  private readonly counts = new Map<string, { count: number; expiresAt: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  /** One attempt, and whether the account may make it. */
  consume(path: string, account: string): { allowed: boolean; retryAfter: number } {
    const rule = ACCOUNT_RULES[path];
    if (rule === undefined) return { allowed: true, retryAfter: 0 };
    const key = `${path} ${account}`;
    const moment = this.now();
    const existing = this.counts.get(key);
    if (existing === undefined || moment >= existing.expiresAt) {
      this.remember(key, { count: 1, expiresAt: moment + rule.window * 1_000 });
      return { allowed: true, retryAfter: 0 };
    }
    if (existing.count >= rule.max) {
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((existing.expiresAt - moment) / 1_000)),
      };
    }
    this.remember(key, { count: existing.count + 1, expiresAt: existing.expiresAt });
    return { allowed: true, retryAfter: 0 };
  }

  private remember(key: string, entry: { count: number; expiresAt: number }): void {
    if (this.counts.size >= MAX_ACCOUNT_KEYS && !this.counts.has(key)) {
      const oldest = this.counts.keys().next();
      if (oldest.done !== true) this.counts.delete(oldest.value);
    }
    this.counts.set(key, entry);
  }
}

interface ReadRequest {
  url: URL;
  method: string;
  headers: Headers;
  body: string;
}

/**
 * The request as Better Auth reads it, or a status when the caller sent too
 * much (BUG-130).
 */
async function readRequest(
  req: IncomingMessage,
  base: URL,
): Promise<{ request: ReadRequest } | { status: 413 | 400 }> {
  const url = new URL(req.url ?? "/", base);
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else {
      headers.set(name, value);
    }
  }
  const method = (req.method ?? "GET").toUpperCase();
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const piece = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    size += piece.length;
    if (size > MAX_BODY_BYTES) {
      return { status: 413 };
    }
    chunks.push(piece);
  }
  return {
    request: {
      url,
      method,
      headers,
      body: Buffer.concat(chunks).toString("utf8"),
    },
  };
}

function json(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(payload);
}

async function copyWebResponse(target: ServerResponse, response: Response): Promise<void> {
  const headers: Record<string, string | string[]> = {};
  for (const [name, value] of response.headers.entries()) {
    if (name === "set-cookie") continue;
    headers[name] = value;
  }
  const cookies = response.headers.getSetCookie();
  if (cookies.length > 0) headers["set-cookie"] = cookies;
  target.writeHead(response.status, headers);
  const body = response.body;
  if (body === null) {
    target.end();
    return;
  }
  for await (const chunk of Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0])) {
    target.write(chunk);
  }
  target.end();
}

/** The server, with everything it owns in front of the handler. */
export function createServer(config: AuthConfig, auth: AuthInstance): Server {
  const limiter = new AccountLimiter();

  const server = createHttpServer((req: IncomingMessage, res: ServerResponse) => {
    if (isHealthPath(new URL(req.url ?? "/", config.baseURL).pathname)) {
      // The readiness probe is answered here, before the Better Auth handler:
      // it owns no route, so it would answer 404 for a path the compose
      // healthcheck asks for and the container would never become healthy.
      json(res, 200, healthBody(config));
      return;
    }

    void (async () => {
      const read = await readRequest(req, new URL(config.baseURL));
      if ("status" in read) {
        json(res, 413, { message: "The request body is too large." });
        return;
      }
      const { request } = read;
      const path = authPathOf(request.url);
      // BUG-128: the breached-password check runs here, bounded and fail-open.
      // Better Auth's own plugin still exists (a deployment can turn it back
      // on with AUTH_HIBP_ENABLED=true), but its outbound call carries no
      // timeout, so the guarded check in front of the handler is the live one.
      if (config.emailAndPassword.breachedPasswordCheck) {
        const password = passwordOf(path, request.body);
        if (password !== null) {
          const verdict = await breachedPasswordVerdict(password, {
            timeoutMs: config.emailAndPassword.hibpTimeoutMs,
          });
          if (verdict === "breached") {
            // The wording is Better Auth's own (the plugin this replaces), so
            // the phone's copy and the existing contract do not change.
            json(res, 400, {
              message: "Password is compromised. Please choose another.",
            });
            return;
          }
          if (verdict === "unknown") {
            // The corpus could not be asked in time: the request goes through
            // (fail open), with the reason in the log rather than a 500 on the
            // courier's screen.
            console.warn(
              `[auth] the breached-password corpus could not be reached for ${path}; the request goes through (BUG-128, fail open)`,
            );
          }
        }
      }
      const account = accountOf(path, request.body);
      if (account !== null) {
        const decision = limiter.consume(path, account);
        if (!decision.allowed) {
          json(
            res,
            429,
            { message: "Too many requests. Please try again later." },
            { "retry-after": String(decision.retryAfter) },
          );
          return;
        }
      }
      const web = new Request(request.url.toString(), {
        method: request.method,
        headers: request.headers,
        ...(request.body.length > 0 && request.method !== "GET" && request.method !== "HEAD"
          ? { body: request.body }
          : {}),
      });
      try {
        await copyWebResponse(res, await auth.handler(web));
      } catch {
        // BUG-129: a rejected handler is answered, not thrown away. Node's
        // default for an unhandled rejection is to end the process, which
        // would take the container down and gate the whole stack behind its
        // healthcheck.
        json(res, 500, { message: "Internal server error" });
      }
    })();
  });

  return server;
}

/**
 * The process handlers that keep the container up (BUG-129).
 *
 * A rejection with no handler ends the Node process; the service has none of
 * its own, and one route rejection would take the whole auth container down
 * with no line of log to say why.
 */
export function installFailureHandlers(): void {
  process.on("unhandledRejection", (reason) => {
    console.error(`[auth] unhandled rejection: ${(reason as Error)?.message ?? reason}`);
  });
  process.on("uncaughtException", (error) => {
    console.error(`[auth] uncaught exception: ${error.message}`);
  });
}
