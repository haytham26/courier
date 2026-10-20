import { describe, expect, it } from "vitest";

import { AuthTestClient, signUp } from "./helpers.js";

describe("email and password authentication", () => {
  it("signs up a new driver and returns a session token", async () => {
    const client = new AuthTestClient();

    const { status, data } = await client.post<{ user: { id: string; email: string } }>(
      "/api/auth/sign-up/email",
      { email: "driver@example.co.nz", password: "correct-horse-battery", name: "Test Driver" },
    );

    expect(status).toBe(200);
    expect(data.user.email).toBe("driver@example.co.nz");
    expect(data.user.id).toBeTruthy();
  });

  it("rejects a duplicate sign-up", async () => {
    const client = new AuthTestClient();
    await signUp(client, "dup@example.co.nz");

    const { status } = await client.post("/api/auth/sign-up/email", {
      email: "dup@example.co.nz",
      password: "correct-horse-battery",
    });

    expect(status).toBe(400);
  });

  it("rejects a sign-up with a password that is too short", async () => {
    const client = new AuthTestClient();

    const { status } = await client.post("/api/auth/sign-up/email", {
      email: "short@example.co.nz",
      password: "abc",
    });

    expect(status).toBe(400);
  });

  it("signs in with valid credentials", async () => {
    const client = new AuthTestClient();
    await signUp(client, "signin@example.co.nz");
    client.clearCookies();

    const { status, data } = await client.post<{ user: { email: string }; token: string }>(
      "/api/auth/sign-in/email",
      { email: "signin@example.co.nz", password: "correct-horse-battery" },
    );

    expect(status).toBe(200);
    expect(data.user.email).toBe("signin@example.co.nz");
    expect(data.token).toBeTruthy();
  });

  it("rejects a wrong password", async () => {
    const client = new AuthTestClient();
    await signUp(client, "wrongpw@example.co.nz");
    client.clearCookies();

    const { status } = await client.post("/api/auth/sign-in/email", {
      email: "wrongpw@example.co.nz",
      password: "not-the-password",
    });

    expect(status).toBe(401);
  });

  it("returns the session for a valid session cookie", async () => {
    const client = new AuthTestClient();
    await signUp(client, "session@example.co.nz");

    const { status, data } = await client.get<{ user: { email: string }; session: { id: string } }>(
      "/api/auth/get-session",
    );

    expect(status).toBe(200);
    expect(data.user.email).toBe("session@example.co.nz");
    expect(data.session.id).toBeTruthy();
  });

  it("returns no session when the cookie is missing", async () => {
    const client = new AuthTestClient();

    const { status, data } = await client.get<null>("/api/auth/get-session");

    expect(status).toBe(200);
    expect(data).toBeNull();
  });

  it("invalidates the session on sign-out", async () => {
    const client = new AuthTestClient();
    await signUp(client, "logout@example.co.nz");

    const signOut = await client.request("/api/auth/sign-out", { method: "POST" });
    expect(signOut.status).toBe(200);

    const { data } = await client.get<null>("/api/auth/get-session");
    expect(data).toBeNull();
  });
});
