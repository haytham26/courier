import { describe, expect, it } from "vitest";

import { AuthTestClient, signUp } from "./helpers.js";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

describe("organization and team membership", () => {
  it("creates an organization owned by the signed-in driver", async () => {
    const client = new AuthTestClient();
    await signUp(client, "owner@example.co.nz");

    const { status, data } = await client.post<Organization>("/api/auth/organization/create", {
      name: "Christchurch Couriers",
      slug: "christchurch-couriers",
    });

    expect(status).toBe(200);
    expect(data.slug).toBe("christchurch-couriers");
    expect(data.id).toBeTruthy();
  });

  it("lists the organizations the driver belongs to", async () => {
    const client = new AuthTestClient();
    await signUp(client, "lister@example.co.nz");
    await client.post("/api/auth/organization/create", {
      name: "Canterbury Couriers",
      slug: "canterbury-couriers",
    });

    const { status, data } = await client.get<Organization[]>("/api/auth/organization/list");

    expect(status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0]?.slug).toBe("canterbury-couriers");
  });

  it("refuses to create an organization without a session", async () => {
    const client = new AuthTestClient();

    const { status } = await client.post("/api/auth/organization/create", {
      name: "No Session Ltd",
      slug: "no-session-ltd",
    });

    expect(status).toBe(401);
  });

  it("creates a team inside an organization", async () => {
    const client = new AuthTestClient();
    await signUp(client, "team-owner@example.co.nz");
    const { data: organization } = await client.post<Organization>(
      "/api/auth/organization/create",
      { name: "Hornby Run", slug: "hornby-run" },
    );

    const { status, data } = await client.post<{ id: string; name: string }>(
      "/api/auth/organization/create-team",
      { name: "North Run", organizationId: organization.id },
    );

    expect(status).toBe(200);
    expect(data.name).toBe("North Run");
    expect(data.id).toBeTruthy();
  });

  it("lists the teams of an organization", async () => {
    const client = new AuthTestClient();
    await signUp(client, "team-lister@example.co.nz");
    const { data: organization } = await client.post<Organization>(
      "/api/auth/organization/create",
      { name: "Riccarton Run", slug: "riccarton-run" },
    );
    await client.post("/api/auth/organization/create-team", {
      name: "West Run",
      organizationId: organization.id,
    });

    const { status, data } = await client.get<{ id: string; name: string }[]>(
      "/api/auth/organization/list-teams",
    );

    expect(status).toBe(200);
    expect(data.length).toBeGreaterThan(0);
    expect(data.map((team) => team.name)).toContain("West Run");
  });

  it("exposes the active member role of the signed-in driver", async () => {
    const client = new AuthTestClient();
    await signUp(client, "role@example.co.nz");
    await client.post("/api/auth/organization/create", {
      name: "Role Couriers",
      slug: "role-couriers",
    });

    const { status, data } = await client.get<{ role: string }>(
      "/api/auth/organization/get-active-member-role",
    );

    expect(status).toBe(200);
    expect(data.role).toBe("owner");
  });
});
