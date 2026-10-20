import { spawn, type ChildProcess } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const PORT = 3399;
// The test server listens on the loopback interface: the request never leaves
// the machine (the W4 exception in CONSTRAINTS.md).
// nosemgrep: typescript.react.security.react-insecure-request
const BASE_URL = `http://127.0.0.1:${PORT}`;

let server: ChildProcess;

async function waitForServer(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/jwks`); // nosemgrep: loopback only (W4)
      if (response.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

describe("the auth service over HTTP", () => {
  beforeAll(async () => {
    server = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
      env: {
        ...process.env,
        PORT: String(PORT),
        AUTH_DATABASE_URL: 'memory://',
        BETTER_AUTH_SECRET: 'test-only-value-not-a-real-credential-0000',
        BETTER_AUTH_URL: BASE_URL,
        AUTH_TRUSTED_ORIGINS: 'exp://',
        AUTH_TRUSTED_IP_HEADERS: 'x-forwarded-for',
      },
      stdio: 'pipe',
    });

    const started = await waitForServer(30_000);
    expect(started).toBe(true);
  }, 40_000);

  afterAll(() => {
    server?.kill();
  });

  it('publishes the JWKS', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/jwks`); // nosemgrep: loopback only (W4)
    const document = (await response.json()) as { keys: { kid: string; kty: string }[] };

    expect(response.status).toBe(200);
    expect(document.keys.length).toBeGreaterThan(0);
    expect(document.keys[0]?.kty).toBe('EC');
  });

  it('serves the sign-up and sign-in endpoints', async () => {
    const signUp = await fetch(`${BASE_URL}/api/auth/sign-up/email`, { // nosemgrep: loopback only (W4)
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'http@example.co.nz', password: 'correct-horse-battery', name: 'HTTP Driver' }),
    });
    expect(signUp.status).toBe(200);

    const signIn = await fetch(`${BASE_URL}/api/auth/sign-in/email`, { // nosemgrep: loopback only (W4)
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'http@example.co.nz', password: 'correct-horse-battery' }),
    });
    expect(signIn.status).toBe(200);
    const body = (await signIn.json()) as { token?: string };
    expect(body.token).toBeTruthy();
  });

  it('refuses to start without a secret', async () => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
      env: {
        ...process.env,
        PORT: String(PORT + 1),
        AUTH_DATABASE_URL: 'memory://',
        BETTER_AUTH_SECRET: '',
        BETTER_AUTH_URL: `http://127.0.0.1:${PORT + 1}`,
      },
      stdio: 'pipe',
    });

    const output = await new Promise<string>((resolve) => {
      let text = '';
      child.stdout?.on('data', (chunk) => {
        text += String(chunk);
      });
      child.stderr?.on('data', (chunk) => {
        text += String(chunk);
      });
      child.on('close', () => resolve(text));
    });

    expect(output).toContain('BETTER_AUTH_SECRET');
    expect(child.exitCode).not.toBe(0);
  }, 30_000);
});
