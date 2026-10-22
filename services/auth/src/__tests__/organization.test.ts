import { describe, expect, it } from "vitest";

import { AuthTestClient, signIn, signUp } from "./helpers.js";

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

  it("invites a driver into the company and the driver joins it", async () => {
    // One client, so both couriers share the same database.
    const client = new AuthTestClient();
    await signUp(client, "boss@example.co.nz");
    const { data: organization } = await client.post<Organization>(
      "/api/auth/organization/create",
      { name: "Hornby Couriers", slug: "hornby-couriers" },
    );

    const invitation = await client.post<{ id: string; email: string; role: string }>(
      "/api/auth/organization/invite-member",
      { email: "driver@example.co.nz", role: "member", organizationId: organization.id },
    );

    expect(invitation.status).toBe(200);
    expect(invitation.data.email).toBe("driver@example.co.nz");
    expect(invitation.data.role).toBe("member");

    await client.request("/api/auth/sign-out", { method: "POST" });
    client.clearCookies();
    await signUp(client, "driver@example.co.nz");

    const accepted = await client.post<{ id: string }>(
      "/api/auth/organization/accept-invitation",
      { invitationId: invitation.data.id },
    );
    expect(accepted.status).toBe(200);

    await client.request("/api/auth/sign-out", { method: "POST" });
    client.clearCookies();
    await signIn(client, "boss@example.co.nz");

    const members = await client.get<{ members: { role: string }[] }>(
      "/api/auth/organization/list-members?organizationId=" + organization.id,
    );
    expect(members.status).toBe(200);
    expect(members.data.members.map((member) => member.role)).toContain("member");
  });

  it("refuses an invitation that belongs to another email address", async () => {
    const client = new AuthTestClient();
    await signUp(client, "boss2@example.co.nz");
    const { data: organization } = await client.post<Organization>(
      "/api/auth/organization/create",
      { name: "Riccarton Couriers", slug: "riccarton-couriers" },
    );

    const invitation = await client.post<{ id: string }>(
      "/api/auth/organization/invite-member",
      { email: "driver@example.co.nz", role: "member", organizationId: organization.id },
    );

    await client.request("/api/auth/sign-out", { method: "POST" });
    client.clearCookies();
    await signUp(client, "somebody-else@example.co.nz");

    const { status } = await client.post("/api/auth/organization/accept-invitation", {
      invitationId: invitation.data.id,
    });

    expect(status).toBe(403);
  });

  it("lets the owner make a driver an admin of the company", async () => {
    const client = new AuthTestClient();
    await signUp(client, "boss3@example.co.nz");
    const { data: organization } = await client.post<Organization>(
      "/api/auth/organization/create",
      { name: "Fendalton Couriers", slug: "fendalton-couriers" },
    );

    const invitation = await client.post<{ id: string }>(
      "/api/auth/organization/invite-member",
      { email: "driver2@example.co.nz", role: "member", organizationId: organization.id },
    );

    await client.request("/api/auth/sign-out", { method: "POST" });
    client.clearCookies();
    await signUp(client, "driver2@example.co.nz");
    await client.post("/api/auth/organization/accept-invitation", {
      invitationId: invitation.data.id,
    });

    await client.request("/api/auth/sign-out", { method: "POST" });
    client.clearCookies();
    await signIn(client, "boss3@example.co.nz");

    const members = await client.get<{ members: { id: string; role: string }[] }>(
      "/api/auth/organization/list-members?organizationId=" + organization.id,
    );
    const member = members.data.members.find((row) => row.role === "member");
    expect(member).toBeTruthy();

    const updated = await client.post<{ role: string }>(
      "/api/auth/organization/update-member-role",
      { memberId: member?.id, role: "admin", organizationId: organization.id },
    );

    expect(updated.status).toBe(200);
    expect(updated.data.role).toBe("admin");
  });

  it("does not let a driver change the company", async () => {
    const client = new AuthTestClient();
    await signUp(client, "boss4@example.co.nz");
    const { data: organization } = await client.post<Organization>(
      "/api/auth/organization/create",
      { name: "New Brighton Couriers", slug: "new-brighton-couriers" },
    );

    const invitation = await client.post<{ id: string }>(
      "/api/auth/organization/invite-member",
      { email: "driver3@example.co.nz", role: "member", organizationId: organization.id },
    );

    await client.request("/api/auth/sign-out", { method: "POST" });
    client.clearCookies();
    await signUp(client, "driver3@example.co.nz");
    await client.post("/api/auth/organization/accept-invitation", {
      invitationId: invitation.data.id,
    });

    const { status } = await client.post("/api/auth/organization/update", {
      data: { name: "A Name I Chose" },
      organizationId: organization.id,
    });

    expect(status).toBe(403);
  });
});
