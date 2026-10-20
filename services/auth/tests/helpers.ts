import { loadConfig, type AuthConfig } from "../src/config.js";
import { createAuth, type AuthInstance } from "../src/server.js";

export const TEST_SECRET = "test-only-value-not-a-real-credential-0000";
export const BASE_URL = "http://localhost:3001";

export function testConfig(overrides: Partial<AuthConfig> = {}): AuthConfig {
  const config = loadConfig({
    BETTER_AUTH_SECRET: TEST_SECRET,
    BETTER_AUTH_URL: BASE_URL,
    AUTH_DATABASE_URL: "memory://",
    AUTH_TRUSTED_ORIGINS: "exp://",
    AUTH_TRUSTED_IP_HEADERS: "x-forwarded-for",
    NODE_ENV: "test",
  });
  return {
    ...config,
    rateLimit: {
      ...config.rateLimit,
      enabled: false,
      max: 10_000,
      customRules: {},
    },
    ...overrides,
  };
}

/** Minimal HTTP client for the Better Auth handler with a cookie jar. */
export class AuthTestClient {
  readonly auth: AuthInstance;

  private readonly cookies = new Map<string, string>();

  constructor(overrides: Partial<AuthConfig> = {}) {
    this.auth = createAuth(testConfig(overrides));
  }

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    if (init.body !== undefined && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    if (!headers.has("x-forwarded-for")) {
      headers.set("x-forwarded-for", "127.0.0.1");
    }
    if (this.cookies.size > 0) {
      headers.set(
        "cookie",
        [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; "),
      );
    }
    const url = new URL(path, BASE_URL).toString();
    const response = await this.auth.handler(new Request(url, { ...init, headers }));
    this.captureCookies(response);
    return response;
  }

  async json<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.request(path, init);
    const text = await response.text();
    return (text.length > 0 ? JSON.parse(text) : undefined) as T;
  }

  async get<T>(path: string): Promise<{ status: number; data: T }> {
    const response = await this.request(path);
    const text = await response.text();
    return {
      status: response.status,
      data: (text.length > 0 ? JSON.parse(text) : undefined) as T,
    };
  }

  async post<T>(path: string, body: unknown): Promise<{ status: number; data: T }> {
    const response = await this.request(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const text = await response.text();
    return {
      status: response.status,
      data: (text.length > 0 ? JSON.parse(text) : undefined) as T,
    };
  }

  clearCookies(): void {
    this.cookies.clear();
  }

  private captureCookies(response: Response): void {
    for (const cookie of response.headers.getSetCookie()) {
      const [pair = ""] = cookie.split(";");
      const separator = pair.indexOf("=");
      if (separator < 0) continue;
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      const expired = value === "" || /expires=thu, 01 jan 1970/i.test(cookie);
      if (expired) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }
}

export interface SignUpResponse {
  token: string;
  user: { id: string; email: string; name?: string };
}

export async function signUp(
  client: AuthTestClient,
  email = "driver@example.co.nz",
  password = "correct-horse-battery",
): Promise<SignUpResponse> {
  const { status, data } = await client.post<SignUpResponse>("/api/auth/sign-up/email", {
    email,
    password,
    name: "Test Driver",
  });
  if (status !== 200) {
    throw new Error(`sign-up failed with ${status}: ${JSON.stringify(data)}`);
  }
  return data;
}
