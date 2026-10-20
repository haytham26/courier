# Research 2026 — auth (Better Auth ecosystem)

**Area:** Payments & Accounts squad (`docs/squads/payments/`) — auth half only
**Researcher role:** Researcher (V4 §1 role 2, V4 §3, §10.3, §7 product security, §12)
**Research date:** 2026-10-20 (all stars/dates/licences/advisories from the GitHub, npm and OSV APIs on this date)
**Our current choice (the baseline)**
- `services/auth` — a standalone Better Auth service (TypeScript, Vitest). `src/options.ts` builds the options with **three plugins: `organization` (teams, `creatorRole: "owner"`, `membershipLimit: 100`, `teams.enabled` + `defaultTeam`, `maximumTeams: 20`), `expo()` (the RN client), and `jwt` with `jwks: { jwksPath, keyPairConfig: { alg } }`** plus `issuer` / `audience` / `expirationTime`; `emailAndPassword` on; `session.expiresIn` + `updateAge`; `rateLimit` with custom rules; `trustedOrigins`; `advanced.ipAddress.headers`.
- `apps/api/app/auth/jwks.py` — the API is a **resource server only**: it fetches the JWKS (300 s cache, 5 s timeout), verifies with `jwt.PyJWK`, requires `exp`, `sub`, `aud`, audience `courier-api`, algorithms `ES256`, and **fails to start when `AUTH_JWKS_URL` is missing** ("no local user store, no local password hashing and no default secret").
- Pins: `better-auth` **1.7.10**, `@better-auth/expo` **1.7.10** (`apps/mobile/package.json`); `expo-secure-store` 58.0.2, `expo-network` 58.0.3, `expo-web-browser` 58.0.6, `expo-linking` 58.0.13, `expo-constants` 58.0.12. **`expo-crypto` is not installed** (58.0.7 available) — we need it for any on-device key/entropy work.
- Tests already exist: `services/auth/tests/{auth,config,jwt,organization,rate-limit,server}.test.ts` and `apps/api/tests/auth/test_jwks.py`.
- Requirements we must satisfy (V4 §7): Better Auth with **rate limits, secure cookies, JWT ES256 short-lived + rotation**, **OWASP ASVS L2** for the API and **MASVS L1 (L2 for auth/storage)** for the app, **RBAC/org scoping on every query with tenant-isolation tests**, audit log for admin actions, and a NZ Privacy Act 2020 PIA.

## Queries run

1. `gh search repos "better auth" --sort stars --limit 30`
2. `gh search repos "expo auth session" --sort stars --limit 30` → empty for the multi-word form
3. `gh search repos "webauthn passkey" --sort stars --limit 30` → empty for the multi-word form
4. `gh search repos "webauthn-framework" --sort stars --limit 5`
5. `gh search repos "simple-webauthn" --sort stars --limit 5`
6. `gh search repos "scure" --sort stars --limit 5`
7. `gh search repos "postcodes.io"` etc. were for area 1; for this area also: `gh search repos "usaddress"` (area 1), and `gh search repos "authentication" --topic` (the `--topic authentication` form was used for the area-1 sweep; here we resolved individual names directly).
8. `gh api repos/<owner>/<repo>` for 30 repos (stars, forks, created_at, pushed_at, `license.spdx_id`, topics, archived)
9. `gh api repos/<owner>/<repo>/releases?per_page=12` (last release + 12-month cadence)
10. `gh api repos/<owner>/<repo>/commits?since=<90d>&per_page=100` (distinct authors = active maintainers, 90 d)
11. `gh api repos/<owner>/<repo>/commits?per_page=12` (deep review)
12. `gh api -X GET search/issues -f "q=repo:<o>/<r> is:issue is:open|closed"`
13. `gh api repos/<owner>/<repo>/readme` (raw: better-auth, realm-js)
14. npm registry + `api.npmjs.org/downloads/point/last-week`: `better-auth`, `@better-auth/expo`, `@better-auth/passkey`, `@better-auth/cli`, `expo-secure-store`, `expo-crypto`, `expo-network`, `jose`, `react-native-keychain`
15. **OSV query API** (`POST https://api.osv.dev/v1/query`) for 10 npm packages, then `GET /v1/vulns/<GHSA>` for 11 advisories to extract the **fixed versions**
16. webfetch/websearch: `better-auth.com/docs/integrations/expo` (Expo integration guide) · `better-auth.com/blog/1-7` (1.7 release notes) · `better-auth.com/blog/1-7-rc` (RC breaking changes) · `better-auth.com/changelog` (1.7.8) · `better-auth.com/docs/guides/1-7-upgrade-guide` · npm `@better-auth/expo` README · `docs.expo.dev/develop/authentication/` · LogRocket's 2026-06-09 Better Auth + Expo walkthrough

## Candidates (31) — evidence cards

`stars · created · last release @ date · cadence · maint(90 d) · issues open/closed · licence (code / model) · platform · decision`.
**6-month star trend: UNVERIFIED for all candidates** — the GitHub REST API exposes no historical star count without a full stargazer pagination scan; snapshot `stargazers_count` monthly in CI. Maintainer counts and release cadence are the verified liveness proxy.

1. **better-auth/better-auth** — https://github.com/better-auth/better-auth · 30,385 ★ · 2024-05-19 · `v1.7.11` @ 2026-10-19 (a `v1.8.0-beta.0/beta.1` pair is also in the last 12 months) · 12 rel/12 m · **31 maintainers/90 d** (100+ commits/90 d) · 381 open / 3,585 closed · **MIT** / n/a · server (TypeScript; framework-agnostic) + an Expo/RN client package · npm **7,801,856 dl/week** · **OSV: 22 advisories on the `better-auth` package** (2024-12-30 → 2026-07-24) — all fixed in ≤ 1.7.x, so our 1.7.10/1.7.11 pin is patched (see the security table) · **ADOPT (locked decision)**
2. **@better-auth/expo** (npm package; **no public GitHub repo** — `gh api repos/better-auth/expo` → 404) · 1.7.11 @ 2026-10-19 · **846,885 dl/week** · **MIT** · mobile client: deep-link OAuth callbacks + **secure cookie storage in `expo-secure-store`**, network state via `expo-network` · **ADOPT (already installed)**
3. **@better-auth/passkey** · 1.7.11 @ 2026-10-19 · 1,422,832 dl/week · **MIT** · **OSV: 1 advisory** (GHSA-4vcf-q4xf-f48m, passkey deletion IDOR, fixed in 1.4.0 → we are patched) · **WATCH** (passkeys are a 2026-era expectation for a driver app; RN passkey support still needs verification)
4. **@better-auth/cli** · 1.4.21 @ 2026-08-19 · 148,080 dl/week · **MIT** · schema generation + `npx auth create-admin` · **KEEP** — but note the **version lag** (CLI 1.4.21 vs core 1.7.11): the CLI is versioned independently, so "upgrade all Better Auth packages together" (their own 1.7 guidance) is not automatic
5. **better-auth-ui/better-auth-ui** — 1,725 ★ · 2024-12-29 · `v1.7.30` @ 2026-10-11 · 12 rel/12 m · 8 maintainers/90 d · 17 open / 270 closed · **MIT** · web React components (shadcn/HeroUI registries) · **REJECT for the phone**, **KEEP for the web dashboard**
6. **better-auth/awesome** — 394 ★ · 2025-03-24 · pushed 2025-07-17 · 0 maint/90 d · 12 open · **MIT** · curated list · **WATCH** (our monthly radar input)
7. **GeKorm/better-auth-harmony** — 383 ★ · 2024-11-25 · `1.3.2` @ 2026-04-16 · 9 rel/12 m · 0 maint/90 d · 3 open · **MIT** · normalises e-mails/phone numbers and blocks throwaway domains · **WATCH** (cheap signup hygiene for a public driver sign-up)
8. **marcellosso/better-auth-localization** — 184 ★ · 2025-07-30 · `v4.0.0` @ 2026-10-14 · 7 rel/12 m · 2 maintainers/90 d · 0 open · **MIT** · localises Better Auth error messages · **WATCH** (D3 is "all languages from day one"; our own i18n catalogue is in `packages/shared`)
9. **convex/better-auth** — 765 ★ · 2025-04-02 · no releases · 5 maintainers/90 d · 135 open · **Apache-2.0** · Convex backend · **REJECT** (we are FastAPI + Postgres)
10. **ThallesP/nestjs-better-auth** — 637 ★ · 2025-06-15 · `v2.8.0` @ 2026-09-03 · 12 rel/12 m · 3 maintainers/90 d · 7 open · **MIT** · NestJS wrapper · **REJECT** (we are FastAPI)
11. **better-auth-rs/better-auth-rs** — 283 ★ · 2025-07-25 · `v1.0.0-alpha.3` @ 2026-09-26 · 12 rel/12 m · 3 maintainers/90 d · 11 open / 18 closed · **Apache-2.0** · Rust port · **WATCH** (alpha; would let us drop the Node service — but the API is Python and our own FastAPI would then be the only TS-free service)
12. **ory/kratos** — 13,921 ★ · 2018-05-29 · `v26.2.0` @ 2026-03-20 · 2 rel/12 m · 5 maintainers/90 d (19 commits) · 151 open / 1,306 closed · **Apache-2.0** · Go identity server (self-serve signup, MFA, WebAuthn, admin API) · **WATCH** (best-in-class identity engine; but it is a *separate service* with its own DB and session model — a big migration for a benefit we mostly do not need)
13. **zitadel/zitadel** — 15,353 ★ · 2020-03-16 · `v4.19.5` @ 2026-10-15 · 12 rel/12 m · 19 maintainers/90 d · 1,006 open / 2,838 closed · **AGPL-3.0** · **CLEAN-ROOM STUDY ONLY (V4 §11.2)** — never code
14. **logto-io/logto** — 14,729 ★ · 2021-06-19 · `v1.45.0` @ 2026-10-13 · 12 rel/12 m · 11 maintainers/90 d · 116 open / 777 closed · **MPL-2.0** (weak copyleft, file-level) · TypeScript, B2B multi-tenant, cloud paid + self-host · **WATCH** (best DX for org/tenant + enterprise SSO; MPL is file-level so a self-hosted deployment is acceptable — but the console/admin surface is a large surface we do not need)
15. **casdoor/casdoor** — 14,608 ★ · 2020-10-22 · `v4.22.0` @ 2026-10-19 · 12 rel/12 m · 6 maintainers/90 d · 97 open / 2,486 closed · **Apache-2.0** · Go, very broad (OIDC/SAML/SCIM/MCP/RADIUS) · **WATCH** (breadth over depth; Go)
16. **lucia-auth/lucia** — 10,450 ★ · 2022-07-18 · **no releases**; README carries a deprecation announcement (commit 2026-07-29 "add deprecation announcement link to readme") · 1 maintainer/90 d (9 commits) · 12 open / 515 closed · **MIT** · **REJECT (deprecated)**
17. **supabase/auth** (GoTrue) — 2,581 ★ · 2020-07-14 · `v2.197.0` @ 2026-09-09 · 12 rel/12 m · 9 maintainers/90 d · 211 open / 590 closed · **MIT** · Go · **REJECT** (tied to the Supabase stack; ours is FastAPI + Postgres)
18. **panva/jose** — 7,837 ★ · 2018-11-06 · `v6.2.13` @ 2026-10-20 · 12 rel/12 m · 4 maintainers/90 d · 0 open / 182 closed · **MIT** · npm `jose` 6.2.13, **93,410,128 dl/week** · **OSV: 3 advisories**, all **JWE**-only (GHSA-58f5-hfqc-jgch padding oracle 2021-04-19; GHSA-hhhv-q57g-882q compressed-plaintext DoS 2024-03-07; GHSA-jv3g-j58f-9mq9 JWE resource exhaustion 2022-09-16) — **we use JWS ES256, not JWE, so none applies** · **KEEP as the reference JOSE implementation** (and the only widely-audited option if we ever verify tokens on the device)
19. **MasterKale/SimpleWebAuthn** — 2,372 ★ · 2020-05-22 · `v14.0.3` @ 2026-09-25 · 9 rel/12 m · 1 maintainer/90 d (23 commits) · 9 open / 300 closed · **MIT** · TypeScript server + browser WebAuthn helpers · **WATCH** (the standard if we add passkeys; a single maintainer is a risk)
20. **1Password/passkey-rs** — 301 ★ · 2023-02-08 · `passkey-v0.6.0` @ 2026-10-01 · 2 rel/12 m · 4 maintainers/90 d · 14 open / 15 closed · **Apache-2.0** · Rust WebAuthn server · **WATCH** (2026-new, strong maintainers)
21. **webauthn4j/webauthn4j** — 596 ★ · 2018-05-20 · `0.31.11.RELEASE` @ 2026-10-02 · 12 rel/12 m · 5 maintainers/90 d · 8 open / 162 closed · **Apache-2.0** · Java WebAuthn · **REJECT** (we have no Java service)
22. **zitadel/oidc** — 1,908 ★ · 2019-11-15 · `v3.51.16` @ 2026-10-15 · 12 rel/12 m · 22 maintainers/90 d · 44 open · **Apache-2.0** · Go OIDC client/server library (certified) · **REJECT** (we issue our own tokens)
23. **clerk/javascript** — 1,767 ★ · 2021-12-14 · `@clerk/vue@1.17.26` @ 2026-10-19 · 12 rel/12 m · 19 maintainers/90 d · 32 open / 670 closed · **MIT** (SDK) · hosted SaaS with an `expo` client · **REJECT** (hosted dependency; a courier app must not depend on a third party's uptime for sign-in; also the auth logic would leave our codebase, which breaks the OWASP-ASVS-L2 review we must own)
24. **workos/workos-node** — 224 ★ · 2019-06-13 · `v11.0.0` @ 2026-09-28 · 12 rel/12 m · 20 maintainers/90 d (38 commits) · 18 open / 99 closed · **MIT** · enterprise SSO/SCIM/Directory-Sync SDK (hosted service) · **REJECT** (we have no enterprise directory in v1)
25. **oblador/react-native-keychain** — 3,484 ★ · 2015-05-20 · `v10.0.0` @ 2025-03-23 · **0 maintainers/90 d** (last commit 2026-04-29) · 196 open · **MIT** · npm 10.0.0 @ 2025-03-23, 253,957 dl/week · **WATCH** (the classic Keystore/Keychain bridge; but `expo-secure-store` already covers our use and is newer)
26. **mCodex/react-native-sensitive-info** — 1,070 ★ · 2016-05-10 · `v6.1.5` @ 2026-06-30 · 12 rel/12 m · 0 maintainers/90 d (single author) · 25 open · **MIT** · Expo-aware secure storage with biometrics / Secure Enclave / StrongBox · **WATCH** (the right answer if we ever need hardware-backed key storage for a device key; `expo-secure-store` is simpler today)
27. **casbin/node-casbin** — 2,923 ★ · 2018-07-15 · `v5.51.1` @ 2026-06-25 · 12 rel/12 m · 2 maintainers/90 d · 1 open · **Apache-2.0** · RBAC/ABAC policy engine · **WATCH** (a strong candidate for the "RBAC/org scoping on every query" requirement, expressed as one policy file instead of scattered `if` statements)
28. **vercel/next.js** — 143,102 ★ · MIT · pushed 2026-10-20 · 3,706 open issues · framework · **REJECT** (not an auth product; listed because the NextAuth/Auth.js repos `authjs/next.js` and `authjs/auth.js` **could not be located through the API with this token (404)** — their GitHub stats are **UNVERIFIED**. NextAuth is in any case a Next.js-specific solution and we are FastAPI + Expo.) **REJECT**
29. **mickasmt/next-saas-stripe-starter** — 3,006 ★ · MIT · pushed 2026-09-28 · a Better Auth SaaS template (Next.js 16, Drizzle, Neon, Stripe) · **WATCH** as a *reference implementation* of Better Auth + org + Stripe in one codebase — the closest thing to a "known-good wiring" for our Payments & Accounts squad
30. **BearStudio/start-ui-web** — 1,749 ★ · MIT · pushed 2026-10-16 · a TanStack Start + Better Auth + Drizzle + shadcn template · **WATCH** (reference)
31. **reliverse/relivator** — 1,564 ★ · MIT · pushed 2025-10-04 · a Next.js 15 + Better Auth + Drizzle + Polar + shadcn template · **WATCH** (reference; the Polar/Stripe pattern is relevant to NZD billing)

## Shortlist (13)

`better-auth/better-auth` + `@better-auth/expo` + `@better-auth/passkey` + `@better-auth/cli` · `better-auth-ui` (web only) · `better-auth-harmony` · `better-auth-localization` · `ory/kratos` · `logto-io/logto` · `casdoor/casdoor` · `panva/jose` · `MasterKale/SimpleWebAuthn` · `1Password/passkey-rs` · `casbin/node-casbin` · `mickasmt/next-saas-stripe-starter` (wiring reference) · `lucia-auth/lucia` (rejection evidence) · `zitadel` (clean-room only).

## Deep review — top 5

**1. better-auth/better-auth (our auth core)** — README, 1.7 release notes, 1.7 RC breaking-change table, the 1.7 upgrade guide, the changelog (1.7.8) and the last 12 commits read; 22 OSV advisories pulled with their fixed versions.
*Architecture:* one TypeScript core, framework-agnostic, with a **plugin system** (organization, teams, expo, jwt+jwks, passkey, two-factor, admin, api-key, phone-number, sso/saml, scim, mcp, oauth-provider, stripe, oidc-provider, one-time-token, email-otp, multi-session, have-i-been-pwned, localization). It is a **self-contained service**: our `services/auth` is exactly the intended deployment.
*Our wiring is idiomatic:* `organization` + `expo` + `jwt` matches their documented mobile recipe; `jwt.jwks` + `keyPairConfig.alg` is the ES256/JWKS path, and our `apps/api/app/auth/jwks.py` is a correct resource-server implementation of it (requires `exp`, `sub`, `aud`; 300 s key cache; fails closed when `AUTH_JWKS_URL` is absent). That pairing — **ES256 + JWKS + no shared secret** — is exactly what V4 §7 asks for.
*Maintenance:* 31 maintainers/90 d, 12 releases/12 m, 7.8 M npm downloads/week, 881 open issues (380 issues + PRs) against 3,585 closed — a very active project with a visible backlog.
*Performance claims:* vendor-stated, UNVERIFIED for us.
*Our 1.7 readiness gap (from the official 1.7 RC table):* "**Expo secure storage access is asynchronous** — await `getCookie()`, provide asynchronous methods in custom storage, and use `storageAdapter.setItemAsync()` when writes must be awaited." Our `expoClient({ storage: SecureStore })` must satisfy the async interface. Also: "**Custom-scheme trusted origins match by host** — a host-bearing entry like `myapp://callback` no longer accepts `myapp://callback.attacker.tld`", so our `trustedOrigins` (`courier://…`) must be re-checked; "**Proxy headers are not trusted by default**" (`advanced.trustedProxyHeaders: true` only if our proxy needs it); "`enableTwoFactor` now returns a discriminated `{ method: "otp" | "totp" }`"; "`jwt.sign` callbacks must match `keyPairConfig.alg`"; "organization.updateTeam rejects immutable fields" and "updateMemberRole checks role existence *after* authorization".
*Verdict:* **ADOPT / KEEP** — but the 1.7 migration checklist above is now a required ticket, and the advisory velocity is a permanent operational obligation.

**2. ory/kratos (the best-in-class identity engine)** — last 12 commits read.
*Architecture:* a Go identity server with self-service signup/login/registration, sessions, WebAuthn/MFA, recovery, and a Hydra-backed OAuth2/OIDC provider, plus a JSON-config-driven "identity schema" (flows as code).
*Maintenance:* 5 maintainers/90 d, 19 commits/90 d, **2 releases/12 m** (`v26.2.0` @ 2026-03-20, `v25.4.0`) — a slower cadence than Better Auth, which fits a mature server.
*Quality signals in the last 12 commits:* "bound password identifier-similarity check by length", "reject PATCH on OIDC and SAML identity credential nodes", "export Prometheus metrics for the Jsonnet process pool", "trace exemplars on HTTP and transaction retry metrics", CVE-scan image hygiene.
*Why we do not adopt it:* it would replace **two** of our components (`services/auth` and the `jwt` plugin) with a second service that has its own database, its own session model and its own admin API, and it does not give us the Better Auth *organization/teams* model that our Team plan (D11) is built on. The migration cost dwarfs the benefit at our scale.
*Verdict:* **WATCH** — the model to imitate for *password-similarity hardening* and *CVE-scanning discipline*; the component to adopt only if we ever need a full enterprise IdP.

**3. logto-io/logto** — last 12 commits read.
*Architecture:* TypeScript, MIT-style community + **MPL-2.0** for the core, multi-tenant by design (organizations, applications, roles/permissions, RBAC, SAML/OIDC social connectors, audit logs, "just-in-time provisioning"), with a polished Console and a paid cloud.
*Maintenance:* 11 maintainers/90 d, 100+ commits/90 d, 12 releases/12 m (`v1.45.0` @ 2026-10-13), 116 open / 777 closed issues.
*What the last 12 commits show:* "reserve authentication context claims against the JWT customizer", "read-only tenant access on cloud", "accept array scope in token responses", "confirm invitation record deletion with its own copy" — i.e. active, careful work on multi-tenant isolation and token customisation, which is precisely our risk area.
*Why we do not adopt it:* a large Console/Admin surface we would have to own, MPL-2.0 (file-level copyleft — acceptable for self-hosting, but not in our preferred list), and its native unit of tenancy is the *application*, not the *organisation+team* shape our product spec locks (D11 + `organization` plugin with teams).
*Verdict:* **WATCH** — the reference for "tenant isolation done properly" and for the invitation/revocation flows we will need in the Team plan.

**4. casdoor/casdoor** — last 12 commits read.
*Architecture:* Go, Apache-2.0, an "identity and access management" platform with a very wide surface: OIDC, SAML, SCIM, CAS, LDAP, WebAuthn, MCP client credentials, RADIUS, AI-gateway, per-organisation applications, and a "database syncer".
*Maintenance:* 6 maintainers/90 d, 100+ commits/90 d, 12 releases/12 m (`v4.22.0` @ 2026-10-19), 97 open / 2,486 closed.
*Quality signals in the last 12 commits:* "skip MFA after WebAuthn sign-in that verified the user", "validate the DPoP proof of refresh_token requests against the refresh_token endpoint", "expire tokens and clear the forced password change when update-user changes the password", "require a global admin to delete sites", "treat client ID metadata document clients as dynamic clients and record their requests in their organization" — the last one is *exactly* our tenant-isolation concern, solved in an identity server.
*Why we do not adopt it:* breadth we do not need (RADIUS, CAS, AI gateway), Go, and a database-syncer model that would duplicate our Postgres.
*Verdict:* **WATCH** — borrow the *tenant-scoping of client requests* idea for our org-scoped queries.

**5. lucia-auth/lucia (the rejection, and what it teaches)** — last 12 commits read.
*Facts:* 10,450 ★, MIT, but **no releases at all**, **1 maintainer/90 d (9 commits)**, and the HEAD commits of 2026-07-29 are literally "**add deprecation announcement link to readme**", "clean up repo", "update website" — a project retiring itself.
*Why it matters:* Lucia was the "bring-your-own-session" library many people would reach for when they want to own the auth logic completely. Its deprecation is a **signal about the whole category**: a bespoke, self-rolled auth layer is a liability, not an asset, unless you are prepared to own session rotation, passkeys, OAuth provider quirks and a permanent security response rota.
*What we take from it:* our V4 §7 decision (Better Auth with rate limits, secure cookies, ES256 + rotation) is the right call, and the reason it is right is precisely what Lucia's retirement demonstrates.
*Verdict:* **REJECT** — and a documented reason for keeping the locked decision.

## Security review — the advisory ledger (OSV, queried 2026-10-20)

`better-auth` — **22 advisories**; `@better-auth/passkey` — 1; `jose` — 3 (JWE only); `dexie` — 1 (2022, web only). `better-auth` advisories with their **fixed versions** (from the OSV API):

| GHSA | summary (abridged) | published | fixed in |
|---|---|---|---|
| GHSA-9x4v-xfq5-m8x5 | URL parameter HTML injection (reflected XSS) | 2025-02-05 | (pre-1.4 line) |
| GHSA-hjpm-7mrm-26w8 | open redirect via scheme-less callback parameter | 2025-02-24 | (pre-1.4 line) |
| GHSA-vp58-j275-797x | trustedOrigins bypass → account takeover | 2025-02-24 | (pre-1.4 line) |
| GHSA-8jhw-6pjj-8723 | open redirect in the verify-email endpoint | 2024-12-30 | (pre-1.4 line) |
| GHSA-36rg-gfq2-3h56 | open redirect in originCheck middleware | 2025-07-07 | (pre-1.4 line) |
| GHSA-99h5-pjcv-gr6v | unauthenticated API-key creation (api-key plugin) | 2025-10-09 | (pre-1.4 line) |
| GHSA-wmjr-v86c-m9jj | multi-session sign-out hook accepts forged cookies | 2025-11-26 | **1.4.0** |
| GHSA-x732-6j76-qmhm | `rou3` double-slash path normalisation bypasses `disabledPaths` + rate limits | 2025-12-16 | **1.4.5** |
| GHSA-569q-mpph-wgww | external `basePath` modification DoS | 2025-12-01 | (pre-1.4 line) |
| GHSA-xg6x-h9c9-2m83 | **2FA bypass via premature session caching (`session.cookieCache`)** | 2026-04-03 | **1.4.9** |
| GHSA-wxw3-q3m9-c3jr | OAuth callback accepts mismatched `state` without PKCE | 2026-05-15 | (pre-1.6 line) |
| GHSA-p6v2-xcpg-h6xw | **rate limiter keys IPv6 per address → bypass via prefix rotation** | 2026-05-15 | **1.4.17** / 1.5.0-beta.9 |
| GHSA-cq3f-vc6p-68fh | device authorization approve/deny accepts any authenticated session | 2026-06-04 | (pre-1.6 line) |
| GHSA-2vg6-77g8-24mp | stale sessions persist after user deletion (admin/anonymous/SCIM) | 2026-07-07 | **1.6.11** |
| GHSA-392p-2q2v-4372 | OAuth refresh-token rotation forks the token family on concurrent redemption | 2026-07-07 | **1.6.11** / 1.6.0 |
| GHSA-7w99-5wm4-3g79 | OAuth authorization-code grant allows concurrent redemption | 2026-07-07 | (pre-1.7 line) |
| GHSA-86j7-9j95-vpqj | stored XSS via `javascript:` redirect_uri (oidc-provider, mcp) | 2026-07-07 | **1.6.13** / 1.7.0-beta.4 |
| GHSA-9h47-pqcx-hjr4 | insecure crypto defaults in oidcProvider (`alg=none`, plain PKCE) | 2026-07-07 | (pre-1.7 line) |
| GHSA-fmh4-wcc4-5jm3 | **unauthorized invitation acceptance (organization plugin)** | 2026-07-07 | **1.6.11** |
| GHSA-g38m-r43w-p2q7 | account takeover via OAuth auto-link to an unverified pre-registered e-mail | 2026-07-07 | **1.6.11** |
| GHSA-pw9m-5jxm-xr6h | OAuth refresh-token replay (oidc-provider, mcp) | 2026-07-07 | (pre-1.7 line) |
| GHSA-qq9h-g4jm-xgf3 | account takeover via pre-account hijacking on magic-link / e-mail OTP | 2026-07-24 | **1.6.22** / 1.7.0-beta.10 |
| GHSA-4vcf-q4xf-f48m (`@better-auth/passkey`) | passkey deletion through IDOR | 2025-11-25 | **1.4.0** |

**Every fixed version is ≤ 1.7.x → our pinned 1.7.10 / 1.7.11 are patched.** But five of these are *directly in our path*: the **organization-plugin invitation** bug (we use `organization`), the **rate-limiter IPv6 bypass** (we enable `rateLimit` with custom rules), the **2FA session-cache bypass**, the **stale-session-after-deletion** bug, and the **`trustedOrigins` bypass → ATO** (we use `trustedOrigins` for the `courier://` scheme). Consequences, to be written into our ADR:
1. **Never enable `session.cookieCache`** (the 2FA bypass) — our `options.ts` does not set it; keep it that way and add a test.
2. **Rate-limit keys must not be IPv6-naive** — our `rateLimit` config must be reviewed against 1.4.17+ behaviour, and our own API must not trust a forwarded IP we do not control (`advanced.ipAddressHeaders` is already configurable in our config).
3. **`trustedOrigins` must list the scheme without a host**, and must never include a wildcard in production.
4. **Organisation invitations must be verified** — our org plugin usage needs a test that an unverified e-mail cannot accept an invitation.
5. **Monthly OSV re-check is a release gate**, not a nice-to-have (V4 §3.4 "re-check before each phase that pinned versions are current and not compromised").

## The org / tenant model we need (D11) and what each candidate gives us

Our product locks a two-level tenancy: an **organisation** (the courier company) containing **teams** (routes, branches, shifts), with **drivers** as members. The API must scope **every** query by `org_id` (+ `team_id`), and the Payments & Accounts squad's release gate is "tenant isolation proven by tests".

| capability | **Better Auth** (`organization` plugin — ours) | Logto | Casdoor | Ory Kratos | Zitadel |
|---|---|---|---|---|---|
| organisation | `organization()` with `allowUserToCreateOrganization`, `creatorRole: "owner"`, `membershipLimit: 100` — **already configured in `services/auth/src/options.ts`** | built-in "organization" + applications + roles | per-organisation apps, admin roles | identity + Hydra, **no native multi-tenant org model** | built-in orgs + project/org resources |
| teams | `teams: { enabled, defaultTeam, maximumTeams: 20 }` — **already configured** | roles/permissions inside an org (not the same shape) | per-app roles | no | IAM-ish roles per project |
| invitations | built-in (and the subject of **GHSA-fmh4-wcc4-5jm3**, unauthorized acceptance via unverified e-mail — fixed in 1.6.11) | built-in + invitation records | built-in | built-in (identity verification traits) | built-in |
| RBAC on the API side | the plugin's membership roles, consumed by `apps/api` as claims (`organizationId`, `teamId` in `AuthPrincipal`) | role/permission sets | roles | Hydra scopes | project roles |
| audit log | Better Auth 1.7 added a "Dash" audit-log client (`dashClient()`) and a native entry point `@better-auth/infra/native` for Expo/RN | full audit-log console | operation logs | admin events | audit trail |
| admin UI | **we build ours** on the web dashboard (`better-auth-ui` components) | full Console (large surface we would own) | full admin UI | Kratos admin API (no UI) | full console |
| our verdict | **KEEP** — the only candidate whose org+team shape matches the locked design, and it is already wired and tested | WATCH — the best isolation implementation to copy | WATCH — the "record client requests in their organization" pattern to copy | WATCH — best identity primitives, wrong tenancy model | CLEAN-ROOM ONLY (AGPL) |

**The concrete consequence for us:** the D11 tenancy model is a *reason to keep Better Auth*, not just an implementation detail. Swapping to Logto or Casdoor would mean re-specifying the tenancy model, the API's claim extraction (`AuthPrincipal.organization_id` / `team_id` in `apps/api/app/auth/jwks.py`) and the tenant-isolation test set. That is the kind of change that must be an ADR, not a sprint task.

## Expo SDK 58 readiness checklist (Better Auth's mobile client)

The official Expo guide targets **SDK 55 (RN 0.83, React 19.2)** and states that SDK 55 requires the New Architecture. We are on **SDK 58 / RN 0.88 / React 19.3** — ahead of the documentation. Items to verify in one ticket, not four:

1. `expoClient({ scheme: "courier", storagePrefix: "courier", storage: SecureStore })` — the **1.7 async storage interface** (`await getCookie()`, `storageAdapter.setItemAsync()`); our call site is a synchronous `SecureStore` import today.
2. `expo-secure-store` 58.0.2 — confirm it satisfies the async contract (it is already a dependency, MIT, 4.6 M dl/week).
3. `expo-network` 58.0.3 — the plugin's connectivity detection; we already depend on it.
4. `expo-web-browser` 58.0.6 + `expo-linking` 58.0.13 — only needed for social sign-in; we have no social provider in v1, so the OAuth path is optional.
5. `expo-crypto` 58.0.7 — **not installed**; add it if we need on-device randomness for a device-bound key or a TOTP secret.
6. `app.json` already sets `"scheme": "courier"` and `"newArchEnabled": true`; the `trustedOrigins` list must contain `courier://` **without a host-bearing entry** (the 1.7 host-matching change) and **no wildcard in production**.
7. The docs are silent on SDK 58 → **UNVERIFIED** until the first CI Android build with `@better-auth/expo@1.7.11` is green.

## Benchmark

**Status: UNVERIFIED — the auth eval set does not exist.** `docs/squads/payments/eval/` (Stripe test-mode scenarios) does not exist; `docs/squads/payments/benchmarks/README.md` = "Harness: _to be created with the first implementation_". There *are* unit tests (`services/auth/tests/*.test.ts`, `apps/api/tests/auth/test_jwks.py`), but they are not the squad's metrics.

**The set to build (named):** `docs/squads/payments/eval/auth/`
- `session-lifecycle.jsonl` — signup → verify → sign-in → refresh → sign-out → device-loss, with the expected session row state, the expected token `exp`, and the expected revocation.
- `tenant-isolation.jsonl` — N tenants × M users × K resources; the expected result of every cross-tenant request is 404/403, **never** a leaked row. This is the "tenant isolation proven by tests" gate.
- `rate-limit.jsonl` — the auth endpoints under burst, IPv4, **IPv6 (prefix rotation)**, and behind-proxy traffic; the expected allow/deny counts.
- `rotation.jsonl` — JWKS key rotation: sign with key A, rotate, sign with key B, verify both, expire A.
- `offline-revoke.jsonl` — a driver loses the phone mid-shift: the session must be revocable server-side and the app must degrade to a locked state, never to a "logged in" state that it cannot prove.
- `a11y-i18n.jsonl` — error messages in the five pilot languages, with the exact codes from our catalogue.

**Metrics:** `auth_p95_ms` (sign-in and token refresh) · `session_ttl_compliance` (short-lived, rotated) · `cross_tenant_leaks` (must be 0) · `rate_limit_bypass_rate` (must be 0) · `jwt_verify_p95_ms` in `apps/api` (including the JWKS cache path) · `advisory_age_at_release` (max age of an unpatched advisory in our dependency tree — must be 0 high/critical).

**Top-3 to benchmark:** (1) our current Better Auth 1.7.10/1.7.11 + `expoClient` (baseline); (2) the same after the **1.7 async SecureStore + trustedOrigins + cookieCache-off** migration (the version we should ship); (3) **Ory Kratos** as the off-the-shelf comparison on the same `session-lifecycle` and `tenant-isolation` sets (it is a *different* architecture, so it is a feasibility reference, not a drop-in).

**Published table + raw results →** `docs/squads/payments/benchmarks/` and `docs/evidence/`.

## What's new in 2026 and what we adopt

1. **Better Auth 1.7 (2026-08-17)** — the biggest release yet: OAuth/OIDC provider hardening (DPoP RFC 9449, device authorization RFC 8628, `private_key_jwt`, `at_hash`, back-channel logout, protected resources replacing `validAudiences`), SCIM rebuilt around isolated connections with Groups and role projections, MCP authorization (`@better-auth/mcp` now requires an explicit `resource`), passkey onboarding that can create a session, OTP-or-TOTP two-factor enrollment, a **signed session cache** (verify with a public key), `hydrateSession` (no first-request round trip), `user.validateUserInfo` (reject an identity *before* creation/linking), 22 languages in `@better-auth/i18n`, and atomic adapter operations (`incrementOne`, `consumeOne`). *We adopt:* the 1.7 upgrade guide as a checklist; `hydrateSession` for the mobile session cache; `user.validateUserInfo` for the driver sign-up; and we **do not** adopt the OAuth-provider surface (we are not an IdP in v1).
2. **The advisory velocity (22 GHSAs in 22 months, 8 of them in 2026)** — *We adopt:* OSV in CI as a blocking gate, a monthly re-check ticket per squad, and a "no new high/critical advisory" release rule.
3. **The Expo integration guide (SDK 55 / RN 0.83 / React 19.2)** — *We adopt:* the documented mobile wiring (expo plugin + `expoClient` + `expo-secure-store` + `expo-network` + `expo-linking`/`expo-web-browser`/`expo-constants` for social providers). Our Expo SDK 58 / RN 0.88 is **ahead of the documented target** — the guide has not been updated to 58 (UNVERIFIED).
4. **The `@better-auth/expo` package at 846,885 dl/week and `better-auth` at 7.8 M dl/week** — *We adopt:* the ecosystem, not a single-purpose product: the ecosystem is where the 2026 fixes land.
5. **`@better-auth/passkey` (1.42 M dl/week) + `passkey-rs` + SimpleWebAuthn v14** — *We adopt:* passkeys as a **v1.1** feature (they are expected in 2026) and evaluate `passkey-rs`/SimpleWebAuthn when we do.
6. **`casbin/node-casbin` (Apache-2.0, 12 rel/12 m, 1 open issue)** — *We adopt:* the **policy-file** idea for org/team scoping so the check is one artefact, not scattered code.
7. **`marcellosso/better-auth-localization` (7 rel/12 m, 0 open)** — *We adopt:* the idea of localising **error messages at the auth layer**, aligned with D3 (all languages from day one) — but from our own catalogue, not a third-party plugin.

## Decision

**KEEP (locked decision, unchanged):** **Better Auth** as the single auth core, with the `organization` (teams) + `expo` + `jwt`/`jwks` plugin set, ES256 + JWKS, rate limits, secure cookies, and a **resource-server-only API** that verifies tokens with zero shared secrets. Reasons: it is MIT; it is the only candidate with a first-class Expo client (846 k dl/week, maintained); it is the only candidate whose *organisation + team* model matches our locked Team-plan design; it is the fastest-moving project in the space (31 maintainers/90 d, 12 releases/12 m); and our existing `services/auth` + `apps/api/app/auth/jwks.py` + tests already implement it correctly.

**ADOPT (concrete work items that follow from this research):**
1. **Complete the 1.7 migration checklist:** async `expo-secure-store` interface for `expoClient`; re-check `trustedOrigins` for the `courier://` scheme (host-bearing entries are no longer safe); keep `session.cookieCache` **off**; keep `advanced.trustedProxyHeaders` **off** unless our proxy demands it; branch on `enableTwoFactor`'s new `method` field.
2. **Add OSV to CI as a blocking gate** and re-check all Better Auth packages monthly (V4 §3.4, V4 §2 "Dependency audit — zero high/critical").
3. **Write the four missing regression tests** that map to real advisories: organisation invitation with an unverified e-mail; rate-limit behaviour under IPv6 prefix rotation; stale sessions after user deletion; trustedOrigins rejection of a host-bearing `courier://` entry.
4. **Add `expo-crypto` 58.0.7** if we need on-device entropy/keys; keep `expo-secure-store` as the only device-credential store for now.
5. **Use `casbin`-style policy modelling** for org/team scoping, expressed in one policy artefact and proven by the tenant-isolation set.
6. **Record every Better Auth package + its licence in `docs/LICENSES.md`** and pin exact versions (already the repo convention).

**WATCH:** `ory/kratos` (best identity engine; adopt only for a full enterprise IdP), `logto-io/logto` (best multi-tenant console; MPL-2.0), `casdoor/casdoor` (breadth + tenant-scoped client requests), `MasterKale/SimpleWebAuthn` + `1Password/passkey-rs` + `webauthn4j` (passkeys for v1.1), `casbin/node-casbin` (policy engine), `better-auth-ui` (web dashboard), `better-auth-harmony` (signup hygiene), `better-auth-localization` (i18n), `better-auth-rs` (Rust port, alpha), `mickasmt/next-saas-stripe-starter` + `BearStudio/start-ui-web` + `reliverse/relivator` (known-good Better Auth + org + Stripe wiring to copy), `better-auth/awesome` (radar).

**REJECT:** `lucia-auth/lucia` (**deprecated** — no releases, retirement commits), `clerk/javascript` and `workos/workos-node` (hosted dependency; our auth logic must stay in our codebase for the ASVS L2 review and for offline-grade reliability), `supabase/auth` (Supabase stack), `zitadel/oidc` + `webauthn4j` (no Java/Go service in our stack), `convex/better-auth` + `ThallesP/nestjs-better-auth` (wrong backend), `nextjs/next.js` (a framework, not an auth product) and NextAuth/Auth.js (Next.js-specific; its GitHub repos could not be located with our token — UNVERIFIED stats), `react-native-keychain` (we already have `expo-secure-store`; react-native-sensitive-info is the better watch item for hardware-backed keys).

**Clean-room (V4 §11.2) — behaviour only, never code:** `zitadel/zitadel` (AGPL-3.0).

**Risks & fallback**
- *Advisory velocity* → OSV in CI, monthly re-check, and a documented "bump Better Auth within N days of a high/critical advisory" rule. Fallback: pin the last known-good version and disable the affected feature (e.g. `rateLimit` rules, OAuth provider) until the bump lands.
- *1.7 breaking changes* → the Expo async-storage change is the one that will actually break our build; do it on a branch with the existing auth tests green first.
- *Rate-limit correctness* → do not rely on Better Auth's IP keying alone for the sign-in endpoint; our API and the auth service both need an independent throttle.
- *Offline driver* → the mobile client caches the session in `expo-secure-store`; a driver who loses the phone must be revoked server-side, and the app must show a locked state, never a "logged in" state it cannot prove.
- *Fallback chain* → Better Auth (self-hosted) → (if Better Auth becomes unmaintainable) **Ory Kratos** (Apache-2.0, self-hosted) → (last) a hand-rolled session service (we know from Lucia's retirement that this is a liability, not an asset).

## Monthly radar filter (V4 §11.3) — what we will re-check for this area

Re-run on the first Monday of each month and update this file:
- **better-auth** — releases (12 in the last 12 months is the pace), the CHANGELOG and the **OSV feed for `better-auth`, `@better-auth/expo`, `@better-auth/passkey` and `@better-auth/cli`**; a high/critical advisory is a same-week bump, and the 1.8 line (beta.0/beta.1 exist) must be re-read for breaking changes before we move.
- **@better-auth/expo** — npm release cadence and any change to the storage interface or the peer-dependency set (`expo-secure-store`, `expo-network`, `expo-web-browser`).
- **@better-auth/cli** — the version lag (CLI 1.4.21 vs core 1.7.11) must be re-checked before every `npx @better-auth/cli generate`, because a stale CLI emits a stale schema.
- **panva/jose** — only if we ever verify tokens on the device; the three open advisories are JWE-only and do not affect our JWS/ES256 use, but re-read on every bump.
- **MasterKale/SimpleWebAuthn / 1Password/passkey-rs** — for the v1.1 passkey work.
- **casbin/node-casbin** — if we adopt it for org/tenant policy.
- **lucia-auth/lucia** — only to confirm it stays deprecated (do not re-adopt).
- Filters to apply: release in the last 6 months · permissive licence · 2 or more active maintainers in 90 days · default-branch commit in the last 90 days · **no unpatched high/critical OSV advisory** · self-hostable (a hosted-only dependency is disqualifying) · no supply-chain incident.

## What we could not verify

- **6-month star trend for every candidate.** UNVERIFIED.
- **Median issue response time for every candidate** (the REST API does not expose it). UNVERIFIED.
- **The GitHub stats for NextAuth / Auth.js** — `authjs/next.js`, `authjs/auth.js` and `authjs/next-auth` all returned 404 through our token, so the project is cited without numbers. UNVERIFIED.
- **Better Auth under Expo SDK 58 / RN 0.88** — the official guide targets SDK 55 (RN 0.83, React 19.2). Our version is ahead of the documentation. UNVERIFIED.
- **The 1.7 async-SecureStore migration in our own code** — we have not read `@better-auth/expo@1.7.11`'s storage interface in detail; the change is documented but our `expoClient({ storage: SecureStore })` call site is unverified against it. UNVERIFIED.
- **`@better-auth/expo` has no public GitHub repository** — its maintenance is inferred from the npm release cadence (1.7.11, 2026-10-19) and the monorepo's commit activity. UNVERIFIED as a separate signal.
- **Whether every Better Auth advisory in the OSV list has a published "fixed" version** — for the entries where OSV returned no `fixed` event in the 1.x line I did not read the full affected-range object; the table therefore shows the version only where the API returned one. UNVERIFIED for the 11 rows marked "(pre-1.4/pre-1.6/pre-1.7 line)".
- **Rate-limit and tenant-isolation behaviour under load** — no harness. UNVERIFIED.
- **`logto` MPL-2.0 obligations for a self-hosted deployment** — the file-level copyleft reading is ours, not counsel's. UNVERIFIED (legally).
