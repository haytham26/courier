import { spawn, type ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  buildHealthDocument,
  databaseCheck,
  healthPath,
} from "../src/health.js";
import { testConfig } from "./helpers.js";

describe("the health paths", () => {
  it("knows the three health endpoints", () => {
    expect(healthPath("/health")).toBe("/health");
    expect(healthPath("/health/live")).toBe("/health/live");
    expect(healthPath("/health/ready")).toBe("/health/ready");
  });

  it("ignores the query string", () => {
    expect(healthPath("/health?verbose=1")).toBe("/health");
  });

  it("leaves every other path alone", () => {
    expect(healthPath("/api/auth/jwks")).toBeNull();
    expect(healthPath("/api/auth/sign-in/email")).toBeNull();
    expect(healthPath(undefined)).toBeNull();
  });
});

describe("the database check", () => {
  it("skips the in-memory adapter", async () => {
    const result = await databaseCheck(testConfig());

    expect(result.status).toBe("skipped");
  });

  it("reports a failure without leaking the password", async () => {
    const config = testConfig({
      database: {
        provider: "postgres",
        url: "postgresql://courier:hunter2@127.0.0.1:1/courier",
      },
    });

    const result = await databaseCheck(config);

    expect(result.status).toBe("failed");
    expect(result.detail).not.toContain("hunter2");
    expect(result.detail).not.toContain("127.0.0.1");
  });
});

describe("the health document", () => {
  it("is degraded when the database is not there", async () => {
    const document = await buildHealthDocument(
      testConfig(),
      "1.2.3",
      Date.now(),
    );

    expect(document.status).toBe("degraded");
    expect(document.version).toBe("1.2.3");
    expect(document.checks.live).toBe(true);
    expect(document.checks.ready).toBe(false);
    expect(document.checks.database.status).toBe("skipped");
  });
});

const PORT = 3398;
// The test server listens on the loopback interface: the request never leaves
// the machine (the W4 exception in CONSTRAINTS.md).
// nosemgrep: typescript.react.security.react-insecure-request (W4)
const BASE_URL = `http://127.0.0.1:${PORT}`;

let server: ChildProcess;

async function waitForServer(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/health/live`); // nosemgrep: loopback only (W4)
      if (response.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

describe("the auth service health endpoints over HTTP", () => {
  beforeAll(async () => {
    server = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], {
      env: {
        ...process.env,
        PORT: String(PORT),
        APP_VERSION: "7.7.7",
        AUTH_DATABASE_URL: "memory://",
        BETTER_AUTH_SECRET: "test-only-value-not-a-real-credential-0000",
        BETTER_AUTH_URL: BASE_URL,
        AUTH_TRUSTED_ORIGINS: "exp://",
      },
      stdio: "pipe",
    });

    const started = await waitForServer(30_000);
    expect(started).toBe(true);
  }, 40_000);

  afterAll(() => {
    server?.kill();
  });

  it("answers the liveness probe with the version", async () => {
    const response = await fetch(`${BASE_URL}/health/live`); // nosemgrep: loopback only (W4)
    const body = (await response.json()) as { status: string; version: string };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.version).toBe("7.7.7");
  });

  it("answers the readiness probe with 503 when the database is the memory one", async () => {
    const response = await fetch(`${BASE_URL}/health/ready`); // nosemgrep: loopback only (W4)
    const body = (await response.json()) as { status: string };

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
  });

  it("does not let the health paths reach the auth handler", async () => {
    const response = await fetch(`${BASE_URL}/health`); // nosemgrep: loopback only (W4)

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
