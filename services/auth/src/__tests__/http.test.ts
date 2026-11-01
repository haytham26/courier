/**
 * The auth service's own request chain, against a real listener.
 *
 * Three bugs, all in the same few lines of the server in front of Better Auth:
 *
 * - BUG-127: Better Auth's limiter is keyed by IP and path and its
 *   `customRules` can change neither, so 500 password guesses against one
 *   account from rotating IPs never trip a bucket;
 * - BUG-129: `void handler(req, res)` discards the promise, and a rejection
 *   with no handler ends the Node process;
 * - BUG-130: no request body limit, so an unauthenticated caller can make the
 *   service buffer a gigabyte before a 128-character check rejects it.
 *
 * The tests run the real server from `createServer` on an ephemeral port, so
 * what they prove is what the container runs.
 */
import { afterEach, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { createAuth } from "../server.js";
import { createServer, MAX_BODY_BYTES, AccountLimiter, MAX_ACCOUNT_KEYS, accountOf, authPathOf } from "../http.js";
import { testConfig } from "./helpers.js";

const DRIVER = "driver@example.co.nz";

interface FakeAuth {
  calls: number;
  handler: (request: Request) => Promise<Response>;
}

export function aFakeAuth(): FakeAuth {
  const auth: FakeAuth = {
    calls: 0,
    handler: (request: Request): Promise<Response> => {
      auth.calls += 1;
      return Promise.resolve(
        new Response(JSON.stringify({ method: request.method }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    },
  };
  return auth;
}

export function aServerOn(
  auth: FakeAuth | ReturnType<typeof createAuth>,
  extraEnv: Record<string, string> = {},
): {
  server: Server;
  base: string;
  close: () => Promise<void>;
} {
  const config = testConfig({}, extraEnv);
  const server = createServer(
    config,
    auth as unknown as ReturnType<typeof createAuth>,
  );
  server.listen(0);
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  return { server, base, close: () => new Promise<void>((done) => server.close(() => done())) };
}

afterEach(async () => {
  await new Promise((done) => setTimeout(done, 0));
});

describe("the per-account limit of the credential endpoints (BUG-127)", () => {
  it("holds against one account however many addresses the attempts come from", async () => {
    const auth = aFakeAuth();
    const { base, close } = aServerOn(auth);
    try {
      const statuses: number[] = [];
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const response = await fetch(`${base}/api/auth/sign-in/email`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": `10.0.${attempt}.1`,
          },
          body: JSON.stringify({ email: DRIVER, password: `guess-${attempt}` }),
        });
        statuses.push(response.status);
      }
      // The rule is five attempts in fifteen minutes per account: the first
      // five are answered by the handler, the rest are refused without it.
      expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
      expect(statuses.slice(5)).toEqual([429, 429, 429]);
      expect(auth.calls).toBe(5);
    } finally {
      await close();
    }
  });

  it("leaves another account alone", async () => {
    const auth = aFakeAuth();
    const { base, close } = aServerOn(auth);
    try {
      const attempt = async (email: string, from: string): Promise<number> => {
        const response = await fetch(`${base}/api/auth/sign-in/email`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": from },
          body: JSON.stringify({ email, password: "wrong" }),
        });
        return response.status;
      };
      for (let index = 0; index < 6; index += 1) await attempt(DRIVER, `10.1.0.${index}`);
      expect(await attempt("other@example.co.nz", "10.1.0.9")).toBe(200);
      expect(await attempt(DRIVER, "10.1.0.9")).toBe(429);
    } finally {
      await close();
    }
  });

  it("carries the retry-after of the window it refused in", async () => {
    const auth = aFakeAuth();
    const { base, close } = aServerOn(auth);
    try {
      for (let index = 0; index < 6; index += 1) {
        await fetch(`${base}/api/auth/sign-in/email`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: DRIVER, password: "wrong" }),
        });
      }
      const refused = await fetch(`${base}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: DRIVER, password: "wrong" }),
      });
      expect(refused.status).toBe(429);
      expect(Number(refused.headers.get("retry-after"))).toBeGreaterThan(0);
    } finally {
      await close();
    }
  });

  it("limits the two-factor verifications per account too", async () => {
    const auth = aFakeAuth();
    const { base, close } = aServerOn(auth);
    try {
      const statuses: number[] = [];
      for (let index = 0; index < 7; index += 1) {
        const response = await fetch(`${base}/api/auth/two-factor/verify-totp`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: DRIVER, code: "000000" }),
        });
        statuses.push(response.status);
      }
      expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
      expect(statuses.slice(5)).toEqual([429, 429]);
    } finally {
      await close();
    }
  });
});

describe("the body the service will read (BUG-130)", () => {
  it("answers 413 before the handler sees a body above the cap", async () => {
    const auth = aFakeAuth();
    const { base, close } = aServerOn(auth);
    try {
      const response = await fetch(`${base}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: DRIVER, password: "x".repeat(MAX_BODY_BYTES + 16) }),
      });
      expect(response.status).toBe(413);
      expect(auth.calls).toBe(0);
    } finally {
      await close();
    }
  });

  it("reads a body within the cap in full", async () => {
    const auth = aFakeAuth();
    const { base, close } = aServerOn(auth);
    try {
      const response = await fetch(`${base}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: DRIVER, password: "correct-horse-battery" }),
      });
      expect(response.status).toBe(200);
      expect(auth.calls).toBe(1);
    } finally {
      await close();
    }
  });
});

describe("a handler that fails (BUG-129)", () => {
  it("answers 500 and keeps serving the next request", async () => {
    let reject = false;
    const auth = {
      calls: 0,
      handler: (): Promise<Response> => {
        if (reject) return Promise.reject(new Error("the database blipped mid-request"));
        reject = true;
        return Promise.resolve(
          new Response("{}", { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      },
    };
    const { base, close } = aServerOn(auth);
    try {
      const first = await fetch(`${base}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: DRIVER, password: "x" }),
      });
      expect(first.status).toBe(200);

      const second = await fetch(`${base}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: DRIVER, password: "x" }),
      });
      expect(second.status).toBe(500);
      expect(await second.json()).toEqual({ message: "Internal server error" });

      // The service is still up: the third request is answered normally.
      reject = false;
      const third = await fetch(`${base}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: DRIVER, password: "x" }),
      });
      expect(third.status).toBe(200);
    } finally {
      await close();
    }
  });
});

describe("the real handler, through the real server", () => {
  it("signs a courier up and hands back the session cookie", async () => {
    // Not a fake: this is the Better Auth handler the container runs, reached
    // the same way - a web Request built from the node request, and the
    // answer copied back - so the cookies, the status and the body are the
    // real ones and not this file's idea of them.
    const auth = createAuth(testConfig());
    const { base, close } = aServerOn(auth);
    try {
      const response = await fetch(`${base}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "content-type": "application/json", "expo-origin": "courier://" },
        body: JSON.stringify({
          email: "real-driver@example.co.nz",
          password: "correct-horse-battery",
          name: "Real Driver",
        }),
      });
      expect(response.status).toBe(200);
      expect(response.headers.getSetCookie().length).toBeGreaterThan(0);
      const signed = (await response.json()) as { token?: string };
      expect(signed.token).toBeTruthy();

      const ready = await fetch(`${base}/health/ready`);
      expect(ready.status).toBe(200);
      const body = (await ready.json()) as { status?: string };
      expect(body.status).toBe("ok");
    } finally {
      await close();
    }
  });
});

describe("the limiter's own arithmetic", () => {
  it("keys by the path and the account, and opens a fresh window", () => {
    const limiter = new AccountLimiter(() => 1_000);
    const path = "/sign-in/email";
    expect(limiter.consume(path, "a@example.co.nz").allowed).toBe(true);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      expect(limiter.consume(path, "a@example.co.nz").allowed).toBe(true);
    }
    expect(limiter.consume(path, "a@example.co.nz").allowed).toBe(false);
    expect(limiter.consume(path, "b@example.co.nz").allowed).toBe(true);
  });

  it("the refusal carries what is left of the fifteen-minute window", () => {
    const start = 1_000;
    let now = start;
    const limiter = new AccountLimiter(() => now);
    const path = "/sign-in/email";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(limiter.consume(path, "a@example.co.nz").allowed).toBe(true);
    }
    // Four hundred seconds of the fifteen-minute window gone.
    now = start + 400_000;
    expect(limiter.consume(path, "a@example.co.nz")).toEqual({ allowed: false, retryAfter: 500 });

    // The window opens on its own: a new attempt after it is allowed again.
    now = start + 900_000;
    expect(limiter.consume(path, "a@example.co.nz").allowed).toBe(true);
  });

  it("does not remember more accounts than it is sized for", () => {
    const limiter = new AccountLimiter(() => 1_000);
    const path = "/forget-password";
    for (let index = 0; index < MAX_ACCOUNT_KEYS; index += 1) {
      expect(limiter.consume(path, `driver-${index}@example.co.nz`).allowed).toBe(true);
    }
    // One more account than the limiter holds, and the first is forgotten: its
    // three attempts are spent again, so a fourth is refused.
    expect(limiter.consume(path, "one-more@example.co.nz").allowed).toBe(true);
    expect(limiter.consume(path, "driver-0@example.co.nz").allowed).toBe(true);
    expect(limiter.consume(path, "driver-0@example.co.nz").allowed).toBe(true);
    expect(limiter.consume(path, "driver-0@example.co.nz").allowed).toBe(true);
    expect(limiter.consume(path, "driver-0@example.co.nz").allowed).toBe(false);
  });

  it("takes the account out of a JSON body", () => {
    expect(accountOf("/sign-in/email", JSON.stringify({ email: "  A@Example.co.nz " }))).toBe(
      "a@example.co.nz",
    );
    expect(accountOf("/sign-in/email", "not json")).toBeNull();
    expect(accountOf("/sign-in/email", JSON.stringify({ password: "x" }))).toBeNull();
    expect(accountOf("/auth/unknown", JSON.stringify({ email: DRIVER }))).toBeNull();
  });

  it("strips the base path the way Better Auth's own rules do", () => {
    expect(authPathOf(new URL("http://x/api/auth/sign-in/email"))).toBe("/sign-in/email");
    expect(authPathOf(new URL("http://x/healthz"))).toBe("/healthz");
  });
});
