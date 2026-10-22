import { createLocalJWKSet, generateKeyPair, jwtVerify, SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { AuthTestClient, signUp } from "./helpers.js";

interface Jwk {
  kid: string;
  kty: string;
  alg?: string;
  crv?: string;
  x?: string;
  y?: string;
  d?: string;
}

interface Jwks {
  keys: Jwk[];
}

async function fetchJwks(client: AuthTestClient): Promise<Jwks> {
  const response = await client.request("/api/auth/jwks");
  expect(response.status).toBe(200);
  return (await response.json()) as Jwks;
}

/**
 * The jwt plugin exposes `verifyJWT` as a server-only endpoint, so it is not
 * part of the inferred public API type even though it is callable.
 */
function verifyJwt(
  client: AuthTestClient,
  token: string,
): Promise<{ payload: { sub: string } | null }> {
  const api = client.auth.api as unknown as {
    verifyJWT: (args: { body: { token: string } }) => Promise<{ payload: { sub: string } | null }>;
  };
  return api.verifyJWT({ body: { token } });
}

describe("JWKS and JWT issuance", () => {
  it("publishes a JWKS with a public ES256 signing key", async () => {
    const client = new AuthTestClient();

    const jwks = await fetchJwks(client);

    expect(jwks.keys.length).toBeGreaterThan(0);
    const key = jwks.keys[0];
    expect(key?.kty).toBe("EC");
    expect(key?.crv).toBe("P-256");
    expect(key?.kid).toBeTruthy();
    expect(key?.x).toBeTruthy();
    expect(key?.y).toBeTruthy();
  });

  it("never publishes private key material", async () => {
    const client = new AuthTestClient();

    const jwks = await fetchJwks(client);

    for (const key of jwks.keys) {
      expect(key.d).toBeUndefined();
    }
  });

  it("issues a session JWT that verifies against the published JWKS", async () => {
    const client = new AuthTestClient();
    const { user } = await signUp(client, "jwt@example.co.nz");

    const { status, data } = await client.get<{ token: string }>("/api/auth/token");
    expect(status).toBe(200);
    expect(data.token).toBeTruthy();

    const jwks = await fetchJwks(client);
    const keySet = createLocalJWKSet(jwks);
    const { payload } = await jwtVerify(data.token, keySet, {
      issuer: "http://localhost:3001",
      audience: "courier-api",
    });

    expect(payload.sub).toBe(user.id);
    expect(payload.aud).toBe("courier-api");
    expect(payload.exp).toBeGreaterThan(payload.iat ?? 0);
  });

  it("refuses to issue a token without a session", async () => {
    const client = new AuthTestClient();

    const response = await client.request("/api/auth/token");

    expect(response.status).toBe(401);
  });

  it("verifies a valid token through the plugin endpoint", async () => {
    const client = new AuthTestClient();
    await signUp(client, "verify@example.co.nz");
    const { data } = await client.get<{ token: string }>("/api/auth/token");

    const result = await verifyJwt(client, data.token);

    expect(result.payload?.sub).toBeTruthy();
  });

  it("rejects a malformed token", async () => {
    const client = new AuthTestClient();
    await signUp(client, "malformed@example.co.nz");

    const result = await verifyJwt(client, "not-a-jwt");
    expect(result.payload).toBeNull();
  });

  it("rejects a token signed by a foreign key", async () => {
    const client = new AuthTestClient();
    await signUp(client, "foreign@example.co.nz");

    const { privateKey } = await generateKeyPair("ES256");
    const foreign = await new SignJWT({ sub: "someone-else" })
      .setProtectedHeader({ alg: "ES256", kid: "foreign-key" })
      .setIssuedAt()
      .setIssuer("http://localhost:3001")
      .setAudience("courier-api")
      .setExpirationTime("15m")
      .sign(privateKey);

    const result = await verifyJwt(client, foreign);
    expect(result.payload).toBeNull();
  });

  it("rejects an expired token", async () => {
    const client = new AuthTestClient({
      jwt: { issuer: "http://localhost:3001", audience: "courier-api", expirationTime: "1s" },
    });
    await signUp(client, "expired@example.co.nz");
    const { data } = await client.get<{ token: string }>("/api/auth/token");

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const jwks = await fetchJwks(client);
    const keySet = createLocalJWKSet(jwks);

    await expect(
      jwtVerify(data.token, keySet, {
        issuer: "http://localhost:3001",
        audience: "courier-api",
      }),
    ).rejects.toThrow();

    const result = await verifyJwt(client, data.token);
    expect(result.payload).toBeNull();
  });
});
