# Auth ecosystem — Better Auth 1.7.x and everything around it (2026, re-read to V4 depth)

**Research date: 2026-10-21.** Method: V4 §12 — ≥30 candidates with full evidence cards, 13 shortlisted, top 5
deep-reviewed from source, benchmarks only where an eval set exists, §12.6 anti-bias (newer/smaller challengers
included). Every star count, date, licence, release tag, advisory id and npm download number below was read from
the GitHub API, the npm registry, the OSV API or a vendor/primary source **on 2026-10-21** unless the line says
**UNVERIFIED**. Nothing is estimated and nothing is carried over from the 2026-10-20 sprint unread — §9 lists
what that sprint got wrong.

**Card fields:** name · repo/vendor URL · stars + forks · created · last release + date · releases/6 m ·
commits/90 d + distinct humans/90 d · open/closed issues · licence · Expo SDK 58 / RN 0.88 New-Arch verdict ·
npm version + 30-day downloads · advisories · **DECISION**.

### 6-month star trend — method note

The GitHub REST API in this environment cannot read the stargazer timeline: `GET /repos/{o}/{r}/stargazers`
returns **HTTP 403 "Resource not accessible by personal access token"** and GraphQL `stargazerCount` returns
only the cumulative total. **Every "stars gained in 6 months" figure in this document is therefore UNVERIFIED.**
The permitted proxy (V4 §12.3) is used throughout: *releases in the last 6 months · commits in the last 90 days ·
distinct human maintainers in 90 days (bots excluded) · npm downloads per 30 days*. Where a repo's `releases`
array returned exactly 100 entries the value is a **page cap**, printed as "≥100", not a count.

## 0. Scope, our current choice, the bar

| Item | Verified 2026-10-21 (read from the repo, not from memory) |
|---|---|
| **Our auth core** | `services/auth` — a standalone Better Auth service (TypeScript, Vitest, Kysely + `pg`). It is a **resource issuer only**; `apps/api` verifies. |
| **Plugins wired** (`services/auth/src/options.ts`) | `organization()` — `allowUserToCreateOrganization` from config, `creatorRole: "owner"`, `membershipLimit: 100`, `teams: { enabled: true, defaultTeam: { enabled: true }, maximumTeams: 20 }` · `expo()` · `jwt({ jwks: { jwksPath, keyPairConfig: { alg } }, jwt: { issuer, audience, expirationTime } })`. |
| **Config** (`services/auth/src/config.ts`) | `jwks.path` default `/jwks`, `alg` **ES256** (hard-coded in the type) · `jwt.expirationTime` **15 m** · `jwt.audience` `courier-api` · `jwt.issuer` = `baseURL` · `session.expiresIn` **30 d**, `updateAge` **24 h** · `rateLimit` window 60 s / max 100, custom rules: `/sign-up/email` 10/h, `/sign-in/email` 10/15 min, `/forget-password` 5/15 min · `emailAndPassword.minPasswordLength` 8, **`requireEmailVerification: false`** · `ipAddressHeaders` **empty by default** · `telemetry.enabled: false` · no default secret: a missing `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` / `AUTH_DATABASE_URL` raises `MissingEnvError` naming every missing variable; `memory://` is refused in production. |
| **API side** (`apps/api/app/auth/jwks.py`) | Resource server only. JWKS cached **300 s**, HTTP timeout **5 s**, `jwt.PyJWK`, algorithms **ES256**, `options={"require": ["exp","sub","aud"]}`, audience `courier-api`; **fails to start** when `AUTH_JWKS_URL` is missing. No local user store, no local password hashing, no shared secret. |
| **Mobile side** (`apps/mobile/src/lib/auth-client.ts`) | `expoClient({ scheme: appScheme, storage: SecureStore, storagePrefix: 'courier' })`. `appScheme` = `Constants.expoConfig?.scheme` → `courier` (`app.json`: `"scheme": "courier"`, `"newArchEnabled": true`, bundle `com.courier.copilot`). **No `cookiePrefix` set** (server default `better-auth` applies on both sides), **no `disableCache`**, **no `jwtClient()`** → the app has no path to a JWT for the FastAPI API today. An `EXPO_PUBLIC_E2E=1` mock replaces the client for the emulator run. |
| **Pins** | `better-auth` **1.7.10** and `@better-auth/expo` **1.7.10** (`services/auth/package.json`, `apps/mobile/package.json`) · `jose` 6.2.12 · `expo` ~58.0.14 (latest published `expo@58.0.16`, 2026-10-19) · `expo-secure-store` 58.0.2 · `expo-network` 58.0.3 · `expo-web-browser` 58.0.6 · `expo-linking` 58.0.13 · `expo-constants` 58.0.12. **`expo-crypto` (58.0.7) and `expo-auth-session` (58.0.13) are NOT installed.** |
| **Tests** | `services/auth/tests/{auth,config,jwt,organization,rate-limit,server}.test.ts` · `apps/api/tests/auth/test_jwks.py`. Auth-service coverage **81.4 %** lines (CONSTRAINTS.md ratchet; V4 target 90 %). |
| **Locked position** (not changed by this research) | Better Auth in `services/auth` with `organization` + `expo` + `jwt`, **ES256 + JWKS** verified by FastAPI, **no default secrets**, **no PII leaving the device**. |

**What must not be conflated.** (1) The **auth server** (Better Auth) issues sessions and JWTs. (2) The **mobile
client** (`@better-auth/expo`) stores the session cookie on the device. (3) The **resource server** (FastAPI)
verifies a JWT against a published JWKS. (4) The **device credential store** (`expo-secure-store`) is the substrate
the client plugin writes into. Every candidate below is placed in one of those four slots, because "auth" in 2026
means four different products and most of the bad decisions come from mixing them.

### The bar (V4 §7 + CONSTRAINTS.md)

- Better Auth with **rate limits, secure cookies, ES256 short-lived JWT + rotation**, **OWASP ASVS L2** for the API,
  **MASVS L1 (L2 for auth/storage)** for the app, **RBAC/org scoping on every query with tenant-isolation tests**,
  an **audit log for admin actions**, and a **NZ Privacy Act 2020 PIA**.
- `CONSTRAINTS.md`: zero high/critical advisories in the dependency tree; no GPL/AGPL/SSPL/Commons-Clause/CC-NC/
  FSL/BUSL in the shipped app; zero `any` in TS app code; ≥ 81 % coverage on the auth service as a ratchet.
- No PII leaves the device by default (`docs/PARITY.md` differentiator 5).

## Queries run

All on **2026-10-21**. GitHub reads through `scripts\gh.ps1` (`gh api`; the token is read from `.env.local` at
runtime and never printed); npm reads from `registry.npmjs.org` + `api.npmjs.org/downloads/point/last-month`;
advisories from `POST https://api.osv.dev/v1/query`; everything else from `websearch` / `webfetch`.

| # | Query | Where | What it produced |
|---|---|---|---|
| Q1 | `better auth 1.7 plugins list organization expo jwt jwks passkey 2026` | websearch | The **50+ plugin catalogue** (docs.better-auth.com/docs/plugins): two-factor, passkey, magic link, email OTP, phone number, admin, organization, SSO, SCIM, API key, JWT, bearer, one-time token, OAuth 2.1 provider, MCP, device authorization, **Stripe / Polar / Autumn / Creem / Dodo / Comet billing plugins**, captcha, have-i-been-pwned, i18n, OpenAPI, Dub. |
| Q2 | `Better Auth Expo SDK 58 React Native New Architecture expo-secure-store session storage` | websearch | The Expo guide (targets **SDK 55 / RN 0.83 / React 19.2**, New Architecture required), the SDK 55→58 gap, and the `@better-auth/expo` client source. |
| Q3 | `Auth0 vs Clerk vs Supabase Auth vs WorkOS vs Descope 2026 pricing self-hosted` | websearch | Published 2026 list prices (Clerk free 50 k MRU / $25 Pro; Auth0 25 k free then $3 500/mo at 50 k B2C; WorkOS AuthKit free to 1 M MAU + $125/SSO connection; Supabase Pro $25 / 100 k MAU; Descope free 7 500 MAU then $249 Pro). All from **vendor comparison articles** (clerk.com, workos.com) — biased by vendor, treated as indicative only. |
| Q4 | `mobile OAuth deep link redirect URI best practices 2026 RFC 8252 claimed HTTPS` | websearch | **RFC 8252** §7.1–7.3 (private-use URI scheme, claimed HTTPS, loopback) and **RFC 9700** §4.1 (exact redirect-URI matching, no pattern registration). |
| Q5 | `better-auth` docs pages: `/docs/plugins`, `/docs/plugins/jwt`, `/docs/integrations/expo`, `/changelog` | webfetch | Plugin catalogue, the JWT/JWKS contract, and the **live** Expo integration guide (fetched 2026-10-21). |
| Q6 | `docs.expo.dev/versions/v58.0.0/sdk/securestore.md` | webfetch | The **official SDK 58 SecureStore reference** (modificationDate 2026-09-15): `keychainAccessible` **default `SecureStore.WHEN_UNLOCKED`**, sync `getItem`/`setItem` block the JS thread, iOS keychain survives uninstall, Android SharedPreferences does not, large-value rejection ~2048 bytes on older iOS. |
| Q7 | `gh api repos/{o}/{r}` × 46 repos | GitHub API | Stars, forks, created/pushed, `license.spdx_id`, archived, default branch. |
| Q8 | `gh api repos/{o}/{r}/releases?per_page=100` × 40 repos | GitHub API | Last release tag + date, releases in the 6-month window. |
| Q9 | `gh api repos/{o}/{r}/commits?since=2026-07-23&per_page=100` × 40 repos | GitHub API | Commits/90 d and distinct authors/90 d (bots counted separately). |
| Q10 | `gh api search/issues?q=repo:{o}/{r}+is:issue+is:open\|closed` × 40 repos | GitHub API | Issue-only counts (`open_issues_count` includes PRs — never used). |
| Q11 | `gh api search/issues?q=repo:better-auth/better-auth+is:issue+{expo,jwks,organization,secure-store,deep+link,passkey}+created:>=2026-01-01` | GitHub API | **The 2026 window**: 57 expo issues, 68 jwks issues, 59 organisation issues, 115 secure-store issues, 52 deep-link issues, 64 passkey issues. |
| Q12 | `gh api repos/better-auth/better-auth/contents/packages/expo/src/{client,client-storage}.ts` | GitHub API | The **actual client source** read line-by-line (§4.1). |
| Q13 | `gh api repos/better-auth/better-auth/commits?per_page=20` and `/pulls?state=open` | GitHub API | Last 20 commits + 10 open PRs of the core repo (§4.1). |
| Q14 | `registry.npmjs.org/{better-auth,@better-auth/expo,@better-auth/passkey,@better-auth/stripe,@better-auth/cli,@better-auth/sso,@better-auth/api-key,expo-secure-store,expo-crypto,expo-network,expo-web-browser,expo-linking,expo-constants,expo-auth-session,jose,react-native-keychain,react-native-sensitive-info,expo-better-auth-passkey,react-native-passkey,@descope/react-native-sdk,@supabase/supabase-js,@react-native-firebase/auth,expo-apple-authentication}` | npm | Version, publish date, licence, 30-day downloads, **peer-dependency ranges** (the compatibility evidence in §4.2). |
| Q15 | `POST api.osv.dev/v1/query` × 12 packages | OSV | 22 `better-auth` advisories, 1 `@better-auth/passkey`, 1 `@better-auth/stripe`, 3 `jose`; **0** for `@better-auth/expo`, `@better-auth/cli`, `expo-secure-store`, `expo-crypto`, `expo-linking`, `expo-network`, `expo-better-auth-passkey`, `react-native-passkey`. |
| Q16 | `gh api repos/{clerk/javascript,descope/descope-node-sdk,ory/kratos,logto-io/logto,keycloak/keycloak}/commits?per_page=8` + `/pulls?state=open` | GitHub API | The deep-review commit/PR evidence for the four alternatives (§4.3–§4.5). |

## 1. Candidate pool — 46 evidence cards

**C1 — `better-auth/better-auth`** ⭐ https://github.com/better-auth/better-auth — **30 392 ★** /2 994 f · created
**2024-05-19** · pushed **2026-10-20** · **MIT** · last release **v1.7.12 @ 2026-10-20** (and **v1.8.0-beta.1 @
2026-10-16**, prerelease) · **≥100 releases/6 m** (API page cap) · **≥100 commits/90 d, 32 distinct authors**
(30 humans + 2 bots) · issues **381 open / 3 585 closed** · npm `better-auth@1.7.12`, **44 611 654 dl/30 d** ·
**OSV: 22 advisories** (all fixed in ≤ 1.7.x — ledger in §5) · peerDeps accept our stack (`react ^18||^19` ✓ 19.3.0,
`vitest ^2–^5` ✓ 4.1.11, `pg ^8` ✓ 8.23.1) · **Expo 58**: the first-class client lives here, but the guide still
targets SDK 55 → our SDK is ahead of the documentation · **DECISION: ADOPT (locked) — but move 1.7.10 → 1.7.12.**

**C2 — `@better-auth/expo`** (npm only — there is **no separate public repo**; the source is
`packages/expo/**` inside C1) — **1.7.12 @ 2026-10-20** · MIT · **5 135 517 dl/30 d** · **OSV: 0 advisories** ·
peerDeps: `better-auth ^1.7.12`, `expo-secure-store >=12.5.0`, `expo-linking >=7.0.0`, `expo-network >=8.0.7`,
`expo-constants >=17.0.0`, `expo-web-browser >=14.0.0` → **every one of our pins satisfies the range**
(58.0.2 / 58.0.13 / 58.0.3 / 58.0.12 / 58.0.6) · **Expo 58**: peer-range compatible; runtime behaviour on RN 0.88
is **UNVERIFIED** (no CI build has run it) · **DECISION: ADOPT (locked); bump to 1.7.12 with the core.**

**C3 — `@better-auth/passkey`** — **1.7.12 @ 2026-10-20** · MIT · **7 798 983 dl/30 d** · **OSV: 1**
(GHSA-4vcf-q4xf-f48m, passkey deletion IDOR, 2025-11-25, fixed 1.4.0) · **Expo 58**: the server plugin is
platform-free, but there is **no WebAuthn API in React Native** — a native module is required (C45) ·
**DECISION: WATCH → v1.1 feature, with a native-module decision first.**

**C4 — `@better-auth/stripe`** — **1.7.12 @ 2026-10-20** · MIT · **1 065 397 dl/30 d** · **OSV: 1**
(GHSA-h3rm-78g3-j7cp, **"cross-organization billing tampering in organization subscription actions"**, 2026-07-24,
fixed 1.6.21 / 1.7.0-beta.10 — *the same tenant-isolation class V4 §10.3 demands we test*) · **DECISION: WATCH;
see the payments document for the whole billing stack.**

**C5 — `@better-auth/cli`** — **1.4.21 @ 2026-03-01** · MIT · **1 061 347 dl/30 d** · OSV 0 · **the version lag is
real**: the CLI is 3 minor lines behind the core (1.4.21 vs 1.7.12) and its last publish was **2026-03-01**
(7 months before the core's last release) · **DECISION: KEEP (schema generation only), and re-read the CLI
version before every `npx auth generate` — a stale CLI emits a stale schema.**

**C6 — `@better-auth/sso`** — 1.7.12 @ 2026-10-20 · MIT · 4 289 295 dl/30 d · OSV 0 · SAML enterprise SSO ·
**DECISION: REJECT for v1 (no courier company has an enterprise IdP; every extra plugin is attack surface).**

**C7 — `@better-auth/api-key`** — 1.7.12 @ 2026-10-20 · MIT · 5 577 289 dl/30 d · OSV 0 · **DECISION: REJECT
for v1** — our API authenticates with a JWT, and GHSA-99h5-pjcv-gr6v (unauthenticated API-key creation,
2025-10-09) shows the plugin has had an authz bug of exactly our shape.

**C8 — `better-auth-ui/better-auth-ui`** ⭐ https://github.com/better-auth-ui/better-auth-ui — **1 725 ★** /172 f ·
created 2024-12-29 · pushed **2026-10-11** · last release **v1.7.30 @ 2026-10-11** · MIT · **≥100 commits/90 d,
9 authors (8 humans)** · **17 open / 270 closed** · React component library (shadcn/HeroUI registries) · **Expo 58**:
web-only, not applicable · **DECISION: KEEP for the web dashboard (area 3); never for the phone.**

**C9 — `better-auth/awesome`** ⭐ https://github.com/better-auth/awesome — **394 ★** /37 f · created 2025-03-24 ·
pushed **2025-07-17** (quiet ~15 months) · MIT · **0 commits/90 d** · 12 open · curated list · **DECISION: KEEP as a
radar input only (it is a list, not a dependency).**

**C10 — `GeKorm/better-auth-harmony`** ⭐ https://github.com/GeKorm/better-auth-harmony — **383 ★** /7 f · created
2024-11-25 · pushed **2026-05-15** · MIT · **0 commits/90 d** · 3 open · normalises e-mails/phones and blocks
throwaway domains · **DECISION: WATCH — cheap signup hygiene for a public driver sign-up, but a 0-commit repo is
not something to depend on.**

**C11 — `marcellosso/better-auth-localization`** ⭐ https://github.com/marcellosso/better-auth-localization —
**184 ★** /29 f · created 2025-07-30 · pushed **2026-10-14** · MIT · 0 open · localises Better Auth error messages ·
**DECISION: WATCH — D3 ("all languages from day one") argues for localising *our* catalogue in `packages/shared`,
not for a third-party plugin that owns the copy.**

**C12 — `convex/better-auth`** ⭐ https://github.com/convex/better-auth — **765 ★** /128 f · created 2025-04-02 ·
pushed 2026-10-17 · **Apache-2.0** · 135 open · Convex backend integration · **DECISION: REJECT — we are FastAPI +
Postgres.**

**C13 — `ThallesP/nestjs-better-auth`** ⭐ https://github.com/ThallesP/nestjs-better-auth — **637 ★** /90 f ·
created 2025-06-15 · pushed 2026-10-05 · MIT · 7 open · NestJS wrapper · **DECISION: REJECT — we are FastAPI.**

**C14 — `better-auth-rs/better-auth-rs`** ⭐ https://github.com/better-auth-rs/better-auth-rs — **283 ★** /25 f ·
created 2025-07-25 · pushed **2026-10-20** · last release **v1.0.0-alpha.4 @ 2026-10-20** · **Apache-2.0** ·
**100 commits/90 d but only 2 authors (1 human + 1 bot)** · **11 open / 18 closed** · Rust port · **DECISION: WATCH
— a Rust port would let us drop the Node service, but it is an alpha with one human, and our API is Python.**

**C15 — `ory/kratos`** ⭐ https://github.com/ory/kratos — **13 924 ★** /1 201 f · created 2018-05-29 · **pushed
2026-07-29 (≈83 days ago — the OSS repo has gone quiet)** · last release **v26.2.0 @ 2026-03-20** · Apache-2.0 ·
**17 commits/90 d, 5 humans** · **151 open / 1 306 closed** · Go identity server (self-serve flows, MFA, WebAuthn,
admin API) · **Expo 58**: no RN client in this repo; the RN story is "bring your own" · **DECISION: WATCH — the
fallback, and the model to imitate for password-similarity hardening (§4.3).**

**C16 — `ory/hydra`** ⭐ https://github.com/ory/hydra — **17 620 ★** /1 613 f · created 2015-05-22 · pushed
2026-07-29 · Apache-2.0 · 94 open · OAuth2/OIDC provider · **DECISION: REJECT — we are not an IdP in v1.**

**C17 — `zitadel/zitadel`** ⭐ https://github.com/zitadel/zitadel — **15 354 ★** /1 391 f · created 2020-03-16 ·
pushed 2026-10-19 · **AGPL-3.0** · 1 298 open · **DECISION: CLEAN-ROOM STUDY ONLY (V4 §11.2) — never code.**

**C18 — `logto-io/logto`** ⭐ https://github.com/logto-io/logto — **14 732 ★** /1 225 f · created 2021-06-19 ·
pushed **2026-10-20** · last release **v1.45.0 @ 2026-10-13** · **MPL-2.0** · **≥100 commits/90 d, 11 authors
(10 humans)** · **116 open / 777 closed** · TypeScript, multi-tenant by design, cloud paid + self-host ·
**DECISION: WATCH — the reference for "tenant isolation done properly" (§4.4).**

**C19 — `casdoor/casdoor`** ⭐ https://github.com/casdoor/casdoor — **14 608 ★** /2 020 f · created 2020-10-22 ·
pushed **2026-10-20** · last release **v4.22.0 @ 2026-10-19** · Apache-2.0 · **100 commits/90 d, 7 humans** ·
**91 open / 2 491 closed** · Go, very broad (OIDC/SAML/SCIM/CAS/LDAP/RADIUS/MCP) · **DECISION: WATCH — breadth we
do not need; borrow its "record client requests in their organization" pattern (§4.5).**

**C20 — `keycloak/keycloak`** ⭐ https://github.com/keycloak/keycloak — **37 445 ★** /9 079 f · created 2013-07-02 ·
pushed **2026-10-20** · **Apache-2.0** · **≥100 commits/90 d, 47 humans** · **2 722 open / 18 147 closed** ·
*Note: the releases API returns a stale `nightly@2022-09-27` tag as the newest release — Keycloak ships tags from
the `main` branch (e.g. branch "26.8" appears in PR #54181). **The exact latest version number is UNVERIFIED via
the API.*** · Java · **Expo 58**: Keycloak ships no first-class RN client; the RN story is a community
`keycloak-js` + a custom secure-store adapter · **DECISION: WATCH — the enterprise OSS we would adopt only if a
courier company demands on-prem SSO (§4.3).**

**C21 — `supabase/auth`** ⭐ https://github.com/supabase/auth — **2 582 ★** /792 f · created 2020-07-14 · pushed
2026-10-19 · last release **rc2.198.0-rc.21 @ 2026-09-22** · MIT · **97 commits/90 d, 9 authors (8 humans)** ·
**212 open / 590 closed** · GoTrue · **DECISION: REJECT — ADR-001 compliance note: *"Supabase Auth → Better Auth
(R3: Supabase forbidden)"*.**

**C22 — `supabase/supabase`** ⭐ https://github.com/supabase/supabase — **112 254 ★** /17 326 f · pushed 2026-10-20 ·
**Apache-2.0** · last release **v1.26.08 @ 2026-08-07** · **300 open / 5 782 closed** · **DECISION: REJECT — same
R3 rule; also it would replace Postgres+Auth+Storage, i.e. our whole backend.**

**C23 — `clerk/javascript`** ⭐ https://github.com/clerk/javascript — **1 767 ★** /479 f · created 2021-12-14 ·
pushed **2026-10-20** · last release **@clerk/vue@1.17.26 @ 2026-10-19** · MIT (SDK; the service is commercial) ·
**≥100 commits/90 d, 18 humans** · **32 open / 670 closed** · **has an `expo` client**, and the expo work is
*actively shipping*: `test(expo): add behavioral native client sync suite (#9954)` (2026-10-20) and
`feat(expo-native-components): add single-token client sync bridge (#9957)` (2026-10-19) · **DECISION: REJECT —
hosted dependency (§4.3).**

**C24 — `workos/workos-node`** ⭐ https://github.com/workos/workos-node — **224 ★** /61 f · created 2019-06-13 ·
pushed 2026-10-19 · last release **v11.0.0 @ 2026-09-28** · MIT · **38 commits/90 d, 20 authors (18 humans)** ·
**18 open / 99 closed** · enterprise SSO/SCIM/Directory-Sync SDK (hosted) · **DECISION: REJECT for v1 (no
enterprise directory to serve); WATCH as the "AuthKit + our own frontend" reference.**

**C25 — `workos/authkit-js`** ⭐ https://github.com/workos/authkit-js — **27 ★** /9 f · created 2024-07-16 · pushed
2026-10-09 · MIT · 19 open · the React/Next AuthKit SDK · **DECISION: REJECT with C24.**

**C26 — `auth0/auth0.js`** ⭐ https://github.com/auth0/auth0.js — **1 062 ★** /515 f · created 2013-09-26 · pushed
2026-10-19 · last release **v10.3.0 @ 2026-10-13** · MIT · **60 commits/90 d, 5 authors (3 humans + 2 bots)** ·
**1 open / 591 closed** · browser SDK · **DECISION: REJECT — hosted; and `auth0/auth0-react-native` is
**UNVERIFIED**: `gh api repos/auth0/auth0-react-native` returns HTTP 404 in this environment, so the RN client's
stars/dates are not cited here.**

**C27 — `auth0/Auth0.swift`** ⭐ https://github.com/auth0/Auth0.swift — **466 ★** /268 f · created 2015-06-26 ·
pushed 2026-10-16 · MIT · 16 open · native iOS SDK · **DECISION: REJECT — hosted, and we need one client for both
platforms.**

**C28 — `descope/descope-node-sdk`** ⭐ https://github.com/descope/descope-node-sdk — **68 ★** /8 f · created
2022-05-10 · pushed 2026-10-19 · last release **v2.20.0 @ 2026-10-19** · MIT · **37 commits/90 d, 11 authors
(10 humans)** · **≥66 releases/6 m** · npm `@descope/react-native-sdk@0.13.1 @ 2026-09-08`, **91 985 dl/30 d** ·
hosted, passkey-first, DPoP (RFC 9449) shipped 2026-10-16 · **DECISION: WATCH — the strongest hosted passkey
story; we would use it only if we adopt passkeys (§4.5).**

**C29 — `supertokens/supertokens-node`** ⭐ https://github.com/supertokens/supertokens-node — **329 ★** /92 f ·
created 2019-11-27 · pushed **2026-09-22** · last release **v24.0.3 @ 2026-07-24** · licence **NOASSERTION** per the
API (the repo ships a custom Apache-2.0-style licence — **read the file before use**) · **10 commits/90 d, 3
humans** · **87 open / 222 closed** · **DECISION: WATCH — a real self-hostable alternative with a paid tier; the
licence must be read before it can even be considered.**

**C30 — `supertokens/supertokens-react-native`** ⭐ https://github.com/supertokens/supertokens-react-native —
**30 ★** /16 f · created 2020-03-20 · pushed **2025-11-05** · NOASSERTION · 43 open · **DECISION: REJECT — a
2023-era RN client with no 2026 activity.**

**C31 — `firebase/firebase-js-sdk`** ⭐ https://github.com/firebase/firebase-js-sdk — **5 154 ★** /1 038 f · created
2017-04-24 · pushed **2026-10-20** · last release **firebase@13.0.0 @ 2026-10-07** · licence **NOASSERTION** per
the API (Apache-2.0 in the LICENSE file) · **100 commits/90 d, 19 humans** · **456 open / 2 967 closed** ·
**DECISION: REJECT — bundled with Firebase/Google Cloud, no organisation+team model, and a second identity
system we would have to own.**

**C32 — `@react-native-firebase/auth`** ⭐ https://github.com/invertase/react-native-firebase — **12 320 ★** /
2 331 f · created 2017-02-01 · pushed **2026-10-20** · NOASSERTION (Apache-2.0 per the package metadata) · npm
**`@react-native-firebase/auth@27.0.0 @ 2026-10-19`**, **1 339 119 dl/30 d** · **DECISION: REJECT — the Expo
Firebase story is `expo-firebase` + Google Identity, which adds a native dependency and a Google account to a
flow that must work for a courier who does not use Google.**

**C33 — `panva/jose`** ⭐ https://github.com/panva/jose — **7 838 ★** /378 f · created 2018-11-06 · pushed
2026-10-20 · last release **v6.2.13 @ 2026-10-20** · MIT · **100 commits/90 d, 4 authors (2 humans + 2 bots)** ·
**0 open / 182 closed** · npm `jose@6.2.13`, **602 779 270 dl/30 d** · **OSV: 3 advisories, all JWE-only**
(padding oracle 2021-04-19; compressed-plaintext DoS 2024-03-07; JWE resource exhaustion 2022-09-16) — **we use
JWS/ES256, not JWE, so none applies** · **DECISION: KEEP as the reference JOSE implementation; the only
widely-audited option if we ever verify tokens on the device.**

**C34 — `MasterKale/SimpleWebAuthn`** ⭐ https://github.com/MasterKale/SimpleWebAuthn — **2 372 ★** /201 f ·
created 2020-05-22 · pushed 2026-10-11 · last release **v14.0.3 @ 2026-09-25** · MIT · **23 commits/90 d, 1 human**
· **9 open / 300 closed** · **DECISION: WATCH — the standard server-side WebAuthn library if we do passkeys; a
single maintainer is the risk.**

**C35 — `1Password/passkey-rs`** ⭐ https://github.com/1Password/passkey-rs — **301 ★** /40 f · created 2023-02-08 ·
pushed 2026-10-19 · last release **passkey-v0.6.0 @ 2026-10-01** · **Apache-2.0** · **100 commits/90 d, 5 authors
(4 humans + 1 bot)** · **14 open / 15 closed** · Rust WebAuthn server · **DECISION: WATCH — the strongest
maintainer base in the passkey set.**

**C36 — `webauthn4j/webauthn4j`** ⭐ https://github.com/webauthn4j/webauthn4j — **596 ★** /101 f · created
2018-05-20 · pushed 2026-10-20 · last release **0.31.11.RELEASE @ 2026-10-02** · Apache-2.0 · Java ·
**DECISION: REJECT — we have no Java service.**

**C37 — `zitadel/oidc`** ⭐ https://github.com/zitadel/oidc — **1 908 ★** /236 f · created 2019-11-15 · pushed
2026-10-19 · last release **v3.51.16 @ 2026-10-15** · Apache-2.0 · 47 open · Go OIDC library · **DECISION: REJECT
— we issue our own tokens.**

**C38 — `oblador/react-native-keychain`** ⭐ https://github.com/oblador/react-native-keychain — **3 484 ★** /
543 f · created 2015-05-20 · **pushed 2026-04-29** · last release **v10.0.0 @ 2025-03-23** · MIT · **0 commits/90 d**
· **169 open / 315 closed** · npm **10.0.0 @ 2025-03-23**, **1 944 271 dl/30 d** · **DECISION: WATCH — the classic
Keystore/Keychain bridge, but it is a JSI/TurboModule package and `expo-secure-store` already covers our use.**

**C39 — `mCodex/react-native-sensitive-info`** ⭐ https://github.com/mCodex/react-native-sensitive-info —
**1 070 ★** /237 f · created 2016-05-10 · pushed 2026-10-01 · last release **v6.1.5 @ 2026-06-30** · MIT ·
**0 commits/90 d** · 191 closed · npm **80 079 dl/30 d** · hardware-backed keys / StrongBox / Secure Enclave ·
**DECISION: WATCH — the right answer if we ever need a hardware-bound device key (C45 needs one).**

**C40 — `casbin/node-casbin`** ⭐ https://github.com/casbin/node-casbin — **2 923 ★** /231 f · created 2018-07-15 ·
pushed 2026-10-20 · last release **v5.51.1 @ 2026-06-25** · Apache-2.0 · **9 commits/90 d, 2 humans** · **1 open**
· **DECISION: ADOPT the *idea* (one policy artefact for org/team scoping), not the dependency — it is a Node
package and our policy engine belongs in the API service, in Python.**

**C41 — `openauth/openauth`** ⭐ https://github.com/openauth/openauth — **1 140 ★** /55 f · created 2024-10-27 ·
**pushed 2026-02-14** (quiet ~8 months) · MIT · **0 commits/90 d** · 21 open · a 2024-era "TypeScript for Auth" ·
**DECISION: REJECT — abandoned in practice; and "own the auth layer" is exactly what C15's story warns about.**

**C42 — `expo/expo`** ⭐ https://github.com/expo/expo — **52 874 ★** /14 665 f · created 2016-08-15 · pushed
2026-10-20 · last release **`expo@58.0.16 @ 2026-10-19`** · MIT · **≥60 releases/6 m, 100 commits/90 d, 36
authors** · 929 open · the home of `expo-secure-store`, `expo-linking`, `expo-web-browser`, `expo-constants`,
`expo-network`, `expo-auth-session` (58.0.13, **8 578 378 dl/30 d**, not installed by us) · **DECISION: ADOPT —
these are the substrate, not alternatives to it.**

**C43 — `f-23/react-native-passkey`** ⭐ https://github.com/f-23/react-native-passkey — **221 ★** /65 f · created
2022-11-01 · pushed 2026-09-08 · last release **v3.6.2 @ 2026-09-08** · MIT · **14 commits/90 d, 5 humans** ·
**3 open / 78 closed** · npm `react-native-passkey@3.6.2 @ 2026-09-08`, **531 078 dl/30 d** · **DECISION: WATCH —
the most-downloaded RN passkey module; no Expo SDK 58 statement.**

**C44 — `peterferguson/react-native-passkeys`** ⭐ https://github.com/peterferguson/react-native-passkeys —
**155 ★** /36 f · created 2023-09-20 · pushed 2026-08-05 · MIT · 23 open · **DECISION: WATCH (alternative to C43).**

**C45 — `expo-better-auth-passkey`** (npm) https://www.npmjs.com/package/expo-better-auth-passkey — **1.6.2 @
2026-10-18** · MIT · **15 364 dl/30 d** · OSV 0 · a drop-in `passkeyClient()` replacement for Expo that wraps
`ASAuthorizationController` (Apple) and Android Credential Manager · **its own README states "Expo SDK 55 or newer
(tested with 57)"** → our **SDK 58 is ahead of its tested baseline** · **DECISION: WATCH — the cheapest path to
passkeys in Expo, and the only one that states an SDK baseline we can check.**

**C46 — `mickasmt/next-saas-stripe-starter`** ⭐ https://github.com/mickasmt/next-saas-stripe-starter —
**3 006 ★** /638 f · created 2023-10-18 · pushed 2026-09-28 · MIT · 0 open · a Better Auth + org + Stripe
template · **DECISION: KEEP as a wiring reference only (Next.js/Drizzle/Neon — not our stack).**

**C47 — `BearStudio/start-ui-web`** ⭐ https://github.com/BearStudio/start-ui-web — **1 749 ★** /165 f · pushed
2026-10-16 · MIT · 21 open · TanStack Start + Better Auth template · **DECISION: KEEP as a dashboard reference.**

**C48 — `reliverse/relivator`** ⭐ https://github.com/reliverse/relivator — **1 564 ★** /277 f · pushed 2025-10-04 ·
MIT · 5 open · Better Auth + Polar template · **DECISION: KEEP as a reference; it is a year stale.**

**C49 — `Permify/permify`** ⭐ https://github.com/Permify/permify — **5 965 ★** /329 f · created 2022-07-14 ·
pushed 2026-10-15 · last release **v1.7.5 @ 2026-10-09** · **AGPL-3.0** · **100 commits/90 d, 3 humans** ·
Zanzibar-style relationship-based authorisation · **DECISION: CLEAN-ROOM STUDY ONLY (V4 §11.2) — and it is
authorisation, not authentication; our org scoping is a row filter, not a relationship graph.**

**C50 — `FusionAuth/fusionauth-jwt`** ⭐ https://github.com/FusionAuth/fusionauth-jwt — **201 ★** /51 f · pushed
2026-07-15 · last release **7.0.0 @ 2026-07-16** · Apache-2.0 · **0 commits/90 d** · **DECISION: WATCH (read) —
a compact Java JWT library; the FusionAuth *server* repo is UNVERIFIED in this environment (404).**

**C51 — `FusionAuth/fusionauth-issues`** ⭐ https://github.com/FusionAuth/fusionauth-issues — **93 ★** /13 f · pushed
2026-09-28 · licence **NOASSERTION** · **19 commits/90 d, 3 humans** · the FusionAuth issue tracker · **DECISION:
WATCH — where to read FusionAuth's behaviour without the server repo.**

**C52 — `FusionAuth/security-scripts`** ⭐ https://github.com/FusionAuth/security-scripts — **446 ★** /34 f ·
pushed 2026-04-21 · Apache-2.0 · 0 commits/90 d · **DECISION: KEEP as a reading list (password-policy recipes).**

## 2. Shortlist (13)

| # | Candidate | Decision | One-line reason (verified 2026-10-21) |
|---|---|---|---|
| C1 | **better-auth/better-auth** | **ADOPT (locked)** | 30 392 ★, MIT, ≥100 releases/6 m, 30 humans/90 d, 44.6 M dl/30 d, and the only candidate with a first-class Expo client **and** an organisation+team model that matches D11. |
| C2 | **@better-auth/expo** | **ADOPT (locked)** | 5.1 M dl/30 d, 0 advisories, and its peer ranges are satisfied by our Expo 58 pins. |
| C42 | **expo/expo** (secure-store, linking, web-browser, constants, network) | **ADOPT (substrate)** | The storage and deep-link substrate; `expo@58.0.16` is one patch ahead of our `~58.0.14`. |
| C33 | **panva/jose** | **KEEP** | 602 M dl/30 d, 0 open issues, 3 advisories that are JWE-only; the reference JOSE implementation and the only safe device-side verifier. |
| C40 | **casbin/node-casbin** | **ADOPT the idea, not the dep** | 2 923 ★, Apache-2.0, 1 open issue — one policy artefact for org/team scoping instead of scattered `if`s. |
| C34/C35 | **SimpleWebAuthn** + **passkey-rs** | **WATCH → v1.1** | The passkey server pair; 1 maintainer (SimpleWebAuthn) vs 4 (passkey-rs). |
| C45 | **expo-better-auth-passkey** | **WATCH → v1.1** | The only passkey client that names an Expo SDK baseline (55+, tested on 57). |
| C15 | **ory/kratos** | **WATCH (fallback)** | Apache-2.0, 13 924 ★, but the OSS repo went quiet on 2026-07-29 — that is the risk, not the licence. |
| C18 | **logto-io/logto** | **WATCH** | 14 732 ★, MPL-2.0, 10 humans/90 d, 100+ commits/90 d — the reference for multi-tenant isolation and invitation flows. |
| C19 | **casdoor/casdoor** | **WATCH** | 14 608 ★, Apache-2.0, active; borrow its org-scoped client-request recording. |
| C20 | **keycloak/keycloak** | **WATCH** | 37 445 ★, Apache-2.0, 47 humans/90 d — the on-prem option if a courier company demands it. |
| C23 | **clerk/javascript** | **REJECT** | Its Expo client is genuinely good (2 expo commits in the last 48 h) but it is hosted: a courier's sign-in would depend on a third party's uptime. |
| C28 | **descope/descope-node-sdk** | **WATCH** | Passkey-first with DPoP; the hosted option if we adopt passkeys in v1.1. |
| C21/C22/C31/C32 | **supabase/auth · supabase · firebase-js-sdk · @react-native-firebase/auth** | **REJECT** | ADR-001 R3 ("Supabase forbidden"), plus a second identity system and a Google-account dependency. |

## 3. Deep review — top 5

### 3.1 Better Auth core + `@better-auth/expo` (C1, C2) — the files I actually read

**Docs read (2026-10-21).** `better-auth.com/docs/integrations/expo` (full page): the callout **"This guide is
written for Expo SDK 55 (React Native 0.83, React 19.2). SDK 55 requires the New Architecture — the Legacy
Architecture is no longer supported."**; the `expoClient({ scheme, storagePrefix, storage })` recipe — **exactly our
call site**; the `trustedOrigins` section (schemes, wildcards, and the warning that `exp://**` patterns are
development-only); the Metro note (package exports are on by default since SDK 53, so **no `metro.config.js` change
is needed**); the `cookiePrefix` option and its default `"better-auth"`; the `disableCache` option; and the
documented way to call our API — `await authClient.getCookie()` then set the `Cookie` header with
`credentials: "omit"`. Also read `better-auth.com/docs/plugins` (the 50+ plugin catalogue),
`better-auth.com/docs/plugins/jwt` (the JWKS contract, the `set-auth-jwt` header, and *"the public key can be
fetched from the `/api/auth/jwks` endpoint"*), `better-auth.com/changelog`, and the Expo SDK 58 SecureStore
reference (`docs.expo.dev/versions/v58.0.0/sdk/securestore.md`, modificationDate 2026-09-15).

**Source read (2026-10-21).** `packages/expo/src/client-storage.ts` and `packages/expo/src/client.ts` (522 lines) in
`better-auth/better-auth`, fetched through the GitHub contents API and read line-by-line. What it establishes:

1. **The storage contract requires four methods, not one.**
   `export type ExpoClientStorage = Pick<typeof SecureStore, "setItem" | "setItemAsync" | "getItem" | "getItemAsync">;`
   `expo-secure-store@58.0.2` supplies all four, so **our call site satisfies the contract today** — this corrects
   the 2026-10-20 note that said "Expo secure storage access is asynchronous — provide asynchronous methods in
   custom storage".
2. **The session cookie is chunked.** `const STORAGE_VALUE_LIMIT = 1800; const MAX_STORAGE_CHUNKS = 100;` with
   `CHUNK_MARKER = "\u0001ba-chunks:"`. The reason is in the Expo docs: *"Historically, some iOS releases refused
   values above roughly 2048 bytes."* **Our session cookie jar is therefore up to 180 000 bytes spread over 100
   SecureStore keys** — the chunking is real and it changes how we size the session.
3. **Keys are normalised**: `normalizeCookieName` replaces `:` with `_` because *"Expo secure store does not support
   colons in the keys"* (upstream issue #5426). Our cookie names therefore land in the device store as
   `courier_cookie` / `courier_session_data`, with chunk keys `courier_cookie.0.0`, `courier_cookie.0.1`, …
4. **Double-slot writes.** The marker carries `{ count, slot, fallbackCount }`; a write goes to the *other* slot and
   only then flips the marker, with the previous slot kept as a fallback. That is the fix for #11082 and #11194.
   `getStorageState` keeps a `WeakMap` keyed by **the storage object**, so the storage instance must be shared
   across clients — our module-level `SecureStore` namespace object satisfies that, but a second `expoClient()`
   with a *different* wrapper object would **not** share the write queue. **This is a real constraint on any
   wrapper we add (see §3.2).**
5. **The sync path exists and is used by `setItem`.** `setItem` logs `"Cannot write synchronously while an async
   write is pending"` and **returns without writing** if a write is in flight. The request path (`init()`) uses
   `await storage.getItemAsync(cookieName)` — so the hot path is async, but a *sync* write during a pending async
   write is silently dropped.
6. **Deep links are rewritten to the scheme.** `getOrigin(scheme)` = `Linking.createURL("", { scheme })` → `courier://`
   and it is sent as the **`expo-origin` header** on every request; `options.body.callbackURL` starting with `/` is
   rewritten with `Linking.createURL(...)` → `courier://dashboard`.
7. **The browser is an external user agent.** `Browser.openAuthSessionAsync(url, redirectUrl, opts?.webBrowserOptions)`
   — this is the RFC 8252 §7 pattern, and it is the correct one.

**Commits (2026-10-19 → 2026-10-20, `gh api repos/better-auth/better-auth/commits?per_page=20`).** `f4260a9` (2026-10-20)
`chore: release v1.7.12 (#11922)` · `226fb9d` (2026-10-20) `ci(release-tooling): name affected users in release note
actions (#11938)` · `f5ea731` (2026-10-20) `fix(sso): verify OIDC ID tokens with the shared step (#11935)` ·
`2a576f3` (2026-10-20) `fix(mcp): accept only OAuth access tokens in requireMcpAuth (#11934)` · `4bc78ba` (2026-10-20)
`fix(core): reject ID tokens when the provider has no client ID (#11931)` · `b18e3b8` (2026-10-20)
`fix(oauth-proxy): run the standard callback checks on proxied callbacks (#11930)` · `fb48619` (2026-10-19)
`fix(jwt): verify tokens with the stored key's algorithm (#11925)` · `681aa5c` (2026-10-19) `fix(session): keep the
cause of session lookup failures (#11924)` · `e8defb7` (2026-10-19) `docs: add security contact email to SECURITY.md
(#11926)` · `876608d` (2026-10-19) `fix(core): verify id_tokens with one shared policy (#11919)`. **Nine of the
last twenty commits are security fixes.** That is the maintenance profile we are buying, and it is also the reason
the advisory count is 22.

**PRs open on 2026-10-21.** `#11945` (2026-10-20) `fix(oauth-provider): omit null list fields when writing device
codes` · `#11944` (2026-10-20) `feat(scim): support custom User schema extensions` · `#11823` (2026-10-15) `feat(oauth):
bind client-submitted ID tokens to a server-issued nonce` · **`#11943` (2026-10-20) `fix(stripe): return non-2xx when
a webhook can't be fully processed`** (a billing webhook error-handling bug, still open) · `#11351` (2026-09-21)
`fix(admin): infer UserWithRole types on admin plugin endpoints` · `#11704` (2026-10-12) `fix(oauth-provider): keep a
refresh family revoked when cleanup fails`. URLs: `https://github.com/better-auth/better-auth/pull/<n>`.

**ISSUES opened in the 2026 window (all verified by number, title and date).**

| # | Opened | State | Title | Why it is ours |
|---|---|---|---|---|
| **#10382** | **2026-07-13** | closed 2026-08-14 | *[@better-auth/expo: recommended SecureStore setup crashes on iOS when the keychain is locked (User interaction is not allowed)](https://github.com/better-auth/better-auth/issues/10382)* | The reporter's analysis: the plugin needs a **synchronous** `getItem`; `expo-secure-store` defaults to `kSecAttrAccessibleWhenUnlocked`; *"When iOS wakes the app in the background (push, background fetch) while the device is locked, the keychain read throws natively."* **This is our exact configuration** (§3.2). |
| **#11194** | **2026-09-06** | closed 2026-09-10 | *[[BUG] [Expo] The 1.7.3 chunk-marker migration strands the legacy chunk keys, leaving session bytes in the Keychain forever](https://github.com/better-auth/better-auth/issues/11194)* | The 1.7.3 marker migration left orphaned chunks in the device keychain. We upgrade across that boundary. |
| **#11082** | **2026-08-31** | closed 2026-09-03 | *[[BUG] [Expo] Chunked cookie-jar write is non-atomic — concurrent reads send no cookie (401s)](https://github.com/better-auth/better-auth/issues/11082)* | Present in 1.6.30 and 1.7.2: the write clears the base key first, so a concurrent read gets `""` and the request goes out **unauthenticated → 401**. A driver signing in on a bad signal would see a 401 with no explanation. |
| **#10253** | **2026-06-26** | **open** | *[expoClient: optional HTTPS origin for email / App Links (instead of scheme-only expo-origin)](https://github.com/better-auth/better-auth/issues/10253)* | `expoClient` always sends `expo-origin: courier://` and rewrites relative callback URLs to deep links. The reporter: *"mail clients do not open custom schemes reliably"* — so **every magic-link, verify-email and invitation email we send is a deep link that mail clients may not open.** We have `requireEmailVerification: false` today, but invitations do not. |
| **#10028** / **#10027** | **2026-06-12** | closed 2026-06-15 | *[@better-auth/expo dynamic imports crash Expo SDK 56 native development builds](https://github.com/better-auth/better-auth/issues/10028)* | The closest thing to an Expo-SDK compatibility statement upstream: the failure was specific to **SDK 56 native dev builds**. It was fixed in time for us. |
| **#11504** | **2026-10-01** | closed | *[better-auth 1.7.x pins @better-auth/utils 0.4.2 but better-call 1.4.0 requires ^0.5.0, so every install gets two copies](https://github.com/better-auth/better-auth/issues/11504)* | Dependency duplication inside the auth package — relevant to `docs/LICENSES.md` and to our bundle-size budget. |
| **#11160** | **2026-09-04** | **open** | *[Client: `$sessionSignal` subscription refetches with no damping and aborts the request in flight](https://github.com/better-auth/better-auth/issues/11160)* | The client refetches the session on every cookie change with no damping. On a 3G connection that is wasted radio and battery — we have a **≤ 8 %/h battery** budget. |
| **#11533** | **2026-10-02** | **open** | *[anonymous plugin: signing in while holding a stale session cookie silently signs the user out again (1.7.6)](https://github.com/better-auth/better-auth/issues/11533)* | A stale-cookie sign-out loop. We do not enable the anonymous plugin, so we are not exposed — but we must not enable it later without reading this. |
| **#11662** | **2026-10-09** | **open** | *[setActiveOrganization/setActiveTeam are typed as returning Session but can return null](https://github.com/better-auth/better-auth/issues/11662)* | Directly in our path: `organization.teams` is enabled and `apps/api/app/auth/jwks.py` reads `organizationId` / `teamId` claims. A null team must not become an unscoped query. |
| **#11740** | **2026-10-14** | **open** | *[oauth-provider: validateIssuerUrl silently rewrites a configured http:// issuer to https://](https://github.com/better-auth/better-auth/issues/11740)* | Our `issuer` defaults to `baseURL`; if anyone configures `http://` in production the issuer we *sign* differs from the issuer we *advertise*. We do not enable the oauth-provider plugin, but the same discipline applies to `AUTH_JWT_ISSUER`. |
| **#10515** | **2026-07-24** | closed | *[jwtClient() not assignable to BetterAuthClientPlugin in 1.6.24+ — createAuthClient inference collapses, authClient.token() disappears](https://github.com/better-auth/better-auth/issues/10515)* | We **have no `jwtClient()` on the mobile client today** and need one to get a JWT for the FastAPI API. The type regression was real; it is closed, but the step must be typed and tested. |

**Verdict: KEEP (locked) + a concrete delta.** Our wiring is idiomatic and already correct; the delta is
(1) bump 1.7.10 → 1.7.12, (2) fix the keychain-locked failure (§3.2), (3) add `jwtClient()` and a
`Cookie`-header→JWT path, (4) keep `session.cookieCache` off, (5) keep `advanced.trustedProxyHeaders` off, and
(6) treat `expo-origin` + deep-link rewriting as a v1.1 item once we send e-mails.

### 3.2 The one real defect in our configuration: the session cookie on a locked phone

This is the single most important finding of this research and it did not exist in the 2026-10-20 version.

**The chain, every link verified on 2026-10-21.**

1. Expo SDK 58 `expo-secure-store` reference: `keychainAccessible` — *"Default: `SecureStore.WHEN_UNLOCKED`"*, and
   the constant's description is *"The data in the keychain item can be accessed only while the device is unlocked
   by the user."*
2. Our app stores the Better Auth **session cookie** in SecureStore (`expoClient({ storage: SecureStore })`), with
   **no `keychainAccessible` override** — our `app.json` has no `expo-secure-store` config-plugin entry at all.
3. Better Auth issue **#10382** (2026-07-13, closed 2026-08-14) documents the failure: when iOS wakes the app in
   the background (push, background fetch) while the device is locked, the keychain read throws
   `KeyChainException: User interaction is not allowed`.
4. Our app **is** woken in the background: `apps/mobile/app.json` declares `"UIBackgroundModes": ["location","audio"]`
   and requests `ACCESS_BACKGROUND_LOCATION` and `FOREGROUND_SERVICE_LOCATION` — a courier's phone is locked and
   screen-off in a van for the whole shift.
5. `expo-secure-store@58.0.2` offers exactly the constant that fixes it: **`SecureStore.AFTER_FIRST_UNLOCK`** —
   *"The data in the keychain item cannot be accessed after a restart until the device has been unlocked once by the
   user. This may be useful if you need to access the item when the phone is locked."* It is **not** deprecated
   (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` is).

**The fix, and its cost.** `expoClient` takes a storage *object*, so we can pass a wrapper that adds the option:

```ts
// apps/mobile/src/lib/auth-client.ts — proposed
import * as SecureStore from 'expo-secure-store';
const sessionStorage = {
  getItem: (k: string) => SecureStore.getItem(k, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }),
  getItemAsync: (k: string) => SecureStore.getItemAsync(k, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }),
  setItem: (k: string, v: string) => SecureStore.setItem(k, v, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }),
  setItemAsync: (k: string, v: string) => SecureStore.setItemAsync(k, v, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }),
};
```

**The cost we must price:** `expoClient`'s storage contract is `Pick<typeof SecureStore, …>`, so the wrapper must
expose **all four** methods, and — because `createManagedStorage` keys its write queue on a `WeakMap` **keyed by the
storage object** — the *same* wrapper instance must be handed to every client that touches the same stored data.
A second, differently-shaped wrapper would silently split the write queue and re-open the #11082 race. **One
module-level exported constant, imported everywhere. That is the whole rule.**

**Also note (from the SDK 58 docs):** on **iOS** the keychain entry **survives app uninstall** if the bundle ID is
the same; on **Android** the SharedPreferences entry **does not**. So "the driver reinstalled the app" is a
session-survives event on iOS and a session-lost event on Android — our "device loss" story must handle both, and
the session must be revocable server-side either way.

### 3.3 Ory Kratos (C15) — the fallback, and what it teaches us

**Read.** The last 8 commits (2026-07-28 → 2026-07-29) and the 5 open PRs, read 2026-10-21.
`b86338d` (2026-07-29) `chore: separate API-only CLI packages from server code` · `c93a940` (2026-07-28) `fix: show
correct instruction on phone verification screen` · `523a593` (2026-07-28) `fix: drop glibc from the Kratos CVE-scan
image` · `56a0ec4` (2026-07-28) `fix: stop Hydra CVE scan flagging the image as its own vulnerability` ·
`8121f21` (2026-07-28) `feat: export Prometheus metrics for the Jsonnet process pool` · `362366d` (2026-07-28) `fix:
treat interrupted leaked-password lookups as network errors`.
Open PRs: `#4620` (2026-10-17) `fix: remove stale two_step_registration hook injection` · `#4616` (2026-10-08) `fix:
prevent nil-pointer panic when Jsonnet claims mapper returns non-object claims` · `#4611` (2026-09-21) `fix: move
session token exchanger to replacement flow in FromOldFlow` · `#4466` (2025-09-02) `feat: add OIDC provider for Okta`
· `#4614` (2026-09-28) `fix: honour X-Forwarded-Prefix in httpx.IncomingRequestURL`.

**The fact that matters: the OSS repo has been quiet since 2026-07-29** (last push 2026-07-29; 17 commits/90 d,
5 humans). A mature project with a quiet quarter is normal; a project whose PRs from October sit unmerged
(#4620 opened 2026-10-17) is a governance signal. **This is the reason Kratos is the *fallback* and not the
*plan*** — the fallback has to still be maintained when we need it, and today it is not obviously moving.

**What we take from it regardless:** (a) *password-similarity hardening by length* — our
`minPasswordLength: 8` is below the bar most identity systems set; (b) *CVE-scan the images we ship* — our
`services/auth` image must be scanned in CI, not just the npm tree; (c) *never leak a password-leaked check into an
error path* (the "interrupted leaked-password lookups as network errors" fix is a fail-open/fail-closed decision
we must make explicitly too).

**Why not now:** Kratos is a **separate service with its own database and its own session model**. Swapping it in
means re-specifying the tenancy model, the claim extraction in `apps/api/app/auth/jwks.py`
(`AuthPrincipal.organization_id` / `team_id`) and the whole tenant-isolation test set. That is an ADR, not a sprint
task.

### 3.4 Logto (C18) — the reference for tenant isolation

**Read.** The last 8 commits (2026-10-19 → 2026-10-20) and 5 open PRs, read 2026-10-21.
`156e002` (2026-10-20) `feat(core,console,phrases): reserve authentication context claims against the JWT customizer`
· `ef5e62c` (2026-10-20) `feat(core): report usage on license refresh unless disabled by environment variable`
· `c690ba2` (2026-10-20) `feat(console): release read-only tenant access on cloud` · `d382f0c` (2026-10-19) `fix(console):
confirm invitation record deletion with its own copy` · `9ac0585` (2026-10-20) `feat(console): integrate Console SSO
creation billing` · `5deefb4` (2026-10-20) `fix(console): use consistent client name in Swift integration guide`.
Open PRs: `#9797` (2026-10-20) `feat(console): show Console SSO subscriptions on the Subscription page` · `#9784`
(2026-10-19) `fix(core,console): unblock security verification lockouts manually` · `#9793` (2026-10-20) `feat(core):
support searching users by custom data` · `#9796` (2026-10-20) `feat(connector,experience): add EVM wallet sign-in with
SIWE` · `#9786` (2026-10-19) `feat(core,console,schemas): require MFA setup for individual users`.

**Two of those commits are our risk area written down.** *"reserve authentication context claims against the JWT
customizer"* and *"release read-only tenant access on cloud"* are both about **a claim or a role that must not leak
across a tenant boundary** — exactly the class of bug in GHSA-h3rm-78g3-j7cp (cross-organization billing tampering)
and GHSA-fmh4-wcc4-5jm3 (unauthorized invitation acceptance). Logto's `read-only tenant access` is the pattern to
copy for our dispatcher role.

**Why not now:** MPL-2.0 (file-level copyleft — acceptable for a self-hosted deployment, but not on our preferred
list), a large Console/admin surface we would have to own, and its native unit of tenancy is the *application*, not
the **organisation + team** shape D11 locks.

### 3.5 Casdoor (C19) — the pattern to steal

**Read.** The last 8 commits of `master` and the release line, read 2026-10-21; last release **v4.22.0 @ 2026-10-19**;
91 open / 2 491 closed; 7 human maintainers; 100 commits/90 d.
**What we take:** Casdoor's client-registration records are **scoped to the organization that registered them**, and
its admin actions are audited. For us the equivalent artefact is: *every API request carries `organizationId`
from the verified token, and the organisation is never taken from the request body.* Our `AuthPrincipal` already
exposes `organization_id` and `team_id` — the rule is that no query may read them from anywhere else.

**Why not now:** breadth we do not need (CAS, LDAP, RADIUS, an AI gateway), Go, and a database-syncer model that
would duplicate our Postgres.

### 3.6 (Bonus deep read) Clerk's Expo client — the reference for what "good" looks like

Clerk ships an `expo` package and shipped two expo-specific commits in the last 48 hours:
`56f6356` (2026-10-20) `test(expo): add behavioral native client sync suite (#9954)` and `1d435be` (2026-10-19)
`feat(expo-native-components): add single-token client sync bridge (#9957)`. **We do not have a behavioural test
suite for our Expo session path.** That is the single most transferable thing in this document: a behavioural
(black-box) native-client test that signs in, kills the app, restarts it, and asserts the session survives and
the cookie is read from the device store — plus the locked-phone variant from §3.2.

## 4. The advisory ledger (OSV, queried 2026-10-21)

`better-auth` — **22 advisories** (oldest 2024-12-30, newest 2026-07-24). `@better-auth/passkey` — **1**.
`@better-auth/stripe` — **1**. `jose` — **3** (all JWE-only). **0** for `@better-auth/expo`, `@better-auth/cli`,
`expo-secure-store`, `expo-crypto`, `expo-linking`, `expo-network`.

| GHSA | Summary (abridged) | Published | Fixed in | In our path? |
|---|---|---|---|---|
| GHSA-9x4v-xfq5-m8x5 | URL parameter HTML injection (reflected XSS) | 2025-02-05 | 1.1.16 | no |
| GHSA-8jhw-6pjj-8723 | Open redirect in the verify-email endpoint | 2024-12-30 | 1.1.6 | no (we do not verify e-mail) |
| GHSA-hjpm-7mrm-26w8 | Open redirect via scheme-less callback parameter | 2025-02-24 | 1.1.20 | no |
| GHSA-vp58-j275-797x | Bypassing `trustedOrigins` → account takeover | 2025-02-24 | 1.1.21 | **yes** — we use `trustedOrigins` |
| GHSA-36rg-gfq2-3h56 | Open redirect in the `originCheck` middleware | 2025-07-07 | 1.2.10 | **yes** |
| GHSA-99h5-pjcv-gr6v | Unauthenticated API-key creation (api-key plugin) | 2025-10-09 | 1.3.26 | no (plugin off) |
| GHSA-569q-mpph-wgww | External `basePath` modification DoS | 2025-12-01 | 1.4.2 | no |
| GHSA-wmjr-v86c-m9jj | Multi-session sign-out hook accepts forged cookies | 2025-11-26 | 1.4.0 | no (plugin off) |
| GHSA-x732-6j76-qmhm | `rou3` double-slash normalisation bypasses `disabledPaths` + rate limits | 2025-12-16 | 1.4.5 | **yes** — our `rateLimit` is on |
| GHSA-xg6x-h9c9-2m83 | **2FA bypass via premature session caching (`session.cookieCache`)** | 2026-04-03 | 1.4.9 | no — we never set `cookieCache`; **keep a test that it stays unset** |
| GHSA-wxw3-q3m9-c3jr | OAuth callback accepts mismatched `state` without PKCE | 2026-05-15 | 1.6.2 | no (no social login in v1) |
| GHSA-p6v2-xcpg-h6xw | **Rate limiter keys IPv6 per address → bypass via prefix rotation** | 2026-05-15 | 1.4.17 / 1.5.0-beta.9 | **yes** — our rate limits are IPv6-relevant; our pin 1.7.10 > 1.4.17 so we are patched, but the test is missing |
| GHSA-cq3f-vc6p-68fh | Device authorization approve/deny accepts any authenticated session | 2026-06-04 | 1.6.11 | no (plugin off) |
| GHSA-2vg6-77g8-24mp | Stale sessions persist after user deletion (admin/anonymous/SCIM) | 2026-07-07 | 1.6.11 | **yes** — "delete the driver" must kill the session |
| GHSA-392p-2q2v-4372 | OAuth refresh-token rotation forks the token family on concurrent redemption | 2026-07-07 | 1.6.11 / 1.6.0 | no (we use e-mail+password) |
| GHSA-7w99-5wm4-3g79 | OAuth authorization-code grant allows concurrent redemption | 2026-07-07 | 1.6.11 | no |
| GHSA-86j7-9j95-vpqj | Stored XSS via `javascript:` redirect_uri (oidc-provider, mcp) | 2026-07-07 | 1.6.13 / 1.7.0-beta.4 | no |
| GHSA-9h47-pqcx-hjr4 | Insecure crypto defaults in `oidcProvider` (`alg=none`, plain PKCE) | 2026-07-07 | 1.6.11 | no |
| GHSA-fmh4-wcc4-5jm3 | **Unauthorized invitation acceptance via unverified e-mail match (organization plugin)** | 2026-07-07 | 1.6.11 | **yes — and we set `requireEmailVerification: false`, so no e-mail is ever verified. Highest-value regression test we owe.** |
| GHSA-g38m-r43w-p2q7 | Account takeover via OAuth auto-link to an unverified pre-registered e-mail | 2026-07-07 | 1.6.11 | no (no OAuth) |
| GHSA-pw9m-5jxm-xr6h | OAuth refresh-token replay (oidc-provider, mcp) | 2026-07-07 | 1.6.11 | no |
| GHSA-qq9h-g4jm-xgf3 | Account takeover via pre-account hijacking on magic-link / e-mail OTP | 2026-07-24 | 1.6.22 / 1.7.0-beta.10 | no |
| GHSA-4vcf-q4xf-f48m (`@better-auth/passkey`) | Passkey deletion through IDOR | 2025-11-25 | 1.4.0 | v1.1 only |
| GHSA-h3rm-78g3-j7cp (`@better-auth/stripe`) | **Cross-organization billing tampering in organization subscription actions** | 2026-07-24 | 1.6.21 / 1.7.0-beta.10 | **yes — the billing side of tenant isolation (payments doc)** |

**Our pin 1.7.10 is above every fixed version in the list**, so we are patched. **But the fixed version is not the
point — the *class* is.** Four of these advisories are in code we actually enable (`trustedOrigins`, `rateLimit`,
`organization`, session revocation). Three consequences, written into the ADR:

1. **Never enable `session.cookieCache`** — our `options.ts` does not set it; add a test that fails if it is ever set.
2. **Our `rateLimit` must be IPv6-proof** — add a test that rotates the IPv6 prefix and asserts the limiter still trips.
3. **Organisation invitations must reject unverified e-mails** — and since we do not verify e-mails at all, the test
   must assert that an invitation can only be accepted by the exact invited address *and* that the invited address
   is verified. Either turn `requireEmailVerification` on for org members, or forbid invitations until it is.
4. **Monthly OSV re-check is a release gate** (CONSTRAINTS.md: zero high/critical advisories), not a nice-to-have.

## 5. The org / tenant model (D11) and what each candidate gives us

Our product locks a two-level tenancy: an **organisation** (the courier company) containing **teams** (routes,
branches, shifts), with **drivers** as members. Every API query must be scoped by `org_id` (+ `team_id`).

| Capability | **Better Auth (`organization`) — ours** | Logto | Casdoor | Ory Kratos | Keycloak | Clerk | WorkOS |
|---|---|---|---|---|---|---|---|
| organisation | `organization()` with `creatorRole: "owner"`, `membershipLimit: 100` — **already configured** | built-in orgs + applications | per-org apps, admin roles | identity + Hydra, **no native multi-tenant org model** | realms + clients + groups | Organizations (hosted) | organisations (hosted) |
| teams | `teams: { enabled, defaultTeam, maximumTeams: 20 }` — **already configured** | roles/permissions inside an org (not the same shape) | per-app roles | no | groups + realm roles | org roles | org roles |
| invitations | built-in — and the subject of **GHSA-fmh4-wcc4-5jm3** | built-in + invitation records | built-in | built-in (identity traits) | built-in | built-in | built-in (SCIM) |
| RBAC on the API side | plugin membership roles consumed by `apps/api` as claims (`organizationId`, `teamId` in `AuthPrincipal`) | role/permission sets | roles | Hydra scopes | realm/client roles | org roles | RBAC + fine-grained |
| audit log | we build ours (V4 §7 requires it) | full audit-log console | operation logs | admin events | admin events | built-in (hosted) | built-in, $99/mo + $125/mo SIEM |
| admin UI | we build ours | full Console (large surface) | full admin UI | Kratos admin API (no UI) | full admin console | hosted | Admin Portal |
| Expo/RN client | **first-party `@better-auth/expo`, 5.1 M dl/30 d** | none first-party | none | none | none (community `keycloak-js`) | **first-party `expo` package, actively shipped** | none first-party |
| self-hostable | **yes** | yes (MPL-2.0) | yes (Apache-2.0) | yes (Apache-2.0) | yes (Apache-2.0) | no | no |
| our verdict | **KEEP** — the only candidate whose org+team shape matches the locked design **and** that ships an Expo client | WATCH — best isolation implementation to copy | WATCH — the org-scoped client-request pattern | WATCH — best identity primitives, wrong tenancy model | WATCH — on-prem only | REJECT — hosted | REJECT — hosted, no RN client |

**The concrete consequence:** the D11 tenancy model is a **reason to keep Better Auth**, not an implementation
detail. Swapping to Logto, Casdoor or Keycloak would mean re-specifying the tenancy model, the claim extraction in
`apps/api/app/auth/jwks.py`, and the tenant-isolation test set. That is an ADR, not a sprint task.

## 6. Expo SDK 58 / RN 0.88 New-Architecture readiness

The official guide targets **SDK 55 (RN 0.83, React 19.2)** and says SDK 55 requires the New Architecture. We are on
**SDK 58 / RN 0.88 / React 19.3** — ahead of the documentation, and `app.json` already sets
`"newArchEnabled": true`.

| # | Item | Status on 2026-10-21 | Action |
|---|---|---|---|
| 1 | `@better-auth/expo@1.7.12` peer ranges vs our Expo pins | **SATISFIED** — `expo-secure-store >=12.5.0` (58.0.2), `expo-linking >=7.0.0` (58.0.13), `expo-network >=8.0.7` (58.0.3), `expo-constants >=17.0.0` (58.0.12), `expo-web-browser >=14.0.0` (58.0.6) | bump the pin with the core |
| 2 | Storage contract `Pick<SecureStore, setItem\|setItemAsync\|getItem\|getItemAsync>` | **SATISFIED** — `expo-secure-store@58.0.2` provides all four | none (but see the wrapper rule in §3.2) |
| 3 | **Locked-phone keychain read** | **FAILS by default** — SDK 58 default `keychainAccessible` is `WHEN_UNLOCKED`; upstream issue **#10382** (2026-07-13) | **wrapper storage with `AFTER_FIRST_UNLOCK`** (§3.2) |
| 4 | Chunked cookie jar | 1800-byte chunks, ≤ 100 chunks; iOS historically refused >~2048-byte values | size the session so it stays under one chunk; measure the real cookie length |
| 5 | Deep-link scheme | `courier://` (`app.json`), sent as the `expo-origin` header on every request | add `courier://` to `AUTH_TRUSTED_ORIGINS` in production (no wildcard, no host-bearing entry) |
| 6 | OAuth browser | `openAuthSessionAsync` — RFC 8252 external user agent | none; we have no social provider in v1 |
| 7 | Metro / package exports | on by default since SDK 53 | none |
| 8 | `expo-auth-session` | 58.0.13 available, **not installed** | install only if we adopt a provider that needs it |
| 9 | `expo-crypto` | 58.0.7 available, **not installed** | install when we need on-device entropy (a device-bound key, a TOTP secret) |
| 10 | Passkey client | no WebAuthn API in RN; `expo-better-auth-passkey` states **"Expo SDK 55 or newer (tested with 57)"** | v1.1; verify on SDK 58 before committing |
| 11 | `expo` package | our `~58.0.14` vs published `expo@58.0.16 @ 2026-10-19` | patch bump (ADR-001 rows to refresh) |

## 7. Benchmark — **UNVERIFIED: no auth eval set exists**

`docs/squads/payments/eval/` does not exist; `docs/squads/payments/benchmarks/README.md` reads "Harness: _to be
created with the first implementation_". There **are** unit tests (`services/auth/tests/*.test.ts`,
`apps/api/tests/auth/test_jwks.py`), but they are not the squad's metrics and they do not run on a device.
**Nothing below has been measured. Every row is UNVERIFIED and names the set we must build.**

**The set to build (named, shape):** `docs/squads/payments/eval/auth/`

| File | Contents | Gate |
|---|---|---|
| `session-lifecycle.jsonl` | signup → verify → sign-in → refresh → sign-out → device-loss; expected session row state, expected token `exp`, expected revocation | exactly one state change per step |
| `tenant-isolation.jsonl` | N tenants × M users × K resources; expected result of every cross-tenant request | **404/403, never a leaked row; 0 leaks** |
| `rate-limit.jsonl` | credential endpoints under burst, IPv4, **IPv6 prefix rotation**, and behind-proxy traffic | expected allow/deny counts, **0 bypasses** |
| `rotation.jsonl` | sign with key A → rotate → sign with key B → verify both → expire A | both keys verify during the overlap |
| `offline-revoke.jsonl` | a driver loses the phone mid-shift | server-side revoke works; the app shows a **locked** state, never a "logged in" state it cannot prove |
| `locked-device.jsonl` | app woken in the background while the device is locked | **the session cookie is readable** (§3.2) — this is the new test |
| `deep-link.jsonl` | OAuth callback / magic link / invitation opened from a mail client | the deep link is reached; a scheme-only link is flagged as unreliable (#10253) |
| `a11y-i18n.jsonl` | error messages in the pilot languages, with the exact codes from our catalogue | every code localised |

**Metrics.** `auth_p95_ms` (sign-in and token refresh) · `session_ttl_compliance` (short-lived, rotated) ·
`cross_tenant_leaks` (must be 0) · `rate_limit_bypass_rate` (must be 0) · `jwt_verify_p95_ms` in `apps/api`
(including the JWKS-cache path) · `advisory_age_at_release` (max age of an unpatched advisory in our tree — must be 0
high/critical) · `locked_device_session_read_rate` (must be 1.0 after §3.2).

**How we would measure each (so the row is reproducible, not aspirational).**

| Metric | How it is measured | Where it runs |
|---|---|---|
| `auth_p95_ms` | 200 scripted sign-ins against `services/auth` in the CI profile; p95 of the wall time from request to `set-cookie` | `services/auth` vitest + a CI job |
| `cross_tenant_leaks` | the tenant-isolation JSONL replayed against the running API; **a leak is any row returned for a foreign `organizationId`** — count, must be 0 | `apps/api` pytest + CI |
| `rate_limit_bypass_rate` | for each limit rule: N requests with rotating IPv6 prefixes; count the requests that were **allowed** past the limit | `services/auth` vitest, against a real Redis |
| `jwt_verify_p95_ms` | 1 000 `Authorization: Bearer` requests with a warm JWKS cache, then 1 000 after a forced refresh; p95 of `get_current_principal` | `apps/api` pytest |
| `advisory_age_at_release` | `POST https://api.osv.dev/v1/query` for every package in `pnpm-lock.yaml`; max(publish date of an unfixed high/critical advisory) | CI, blocking |
| `locked_device_session_read_rate` | an iOS device with the screen off, an `EXPO_PUBLIC_E2E` build woken by a background fetch; assert `getSession()` succeeds | **manual, on a real device — no local emulator (AGENTS.md)** |
| `deep-link` reachability | a signed magic-link e-mail opened in Mail/Gmail on iOS and Android; assert the app is foregrounded | manual + one Maestro flow for the custom scheme |

**Top-3 to benchmark once the set exists:** (1) our current 1.7.10 baseline; (2) the same after the
**1.7.12 + `AFTER_FIRST_UNLOCK` + `jwtClient()`** migration (the version we should ship); (3) **Ory Kratos** on the
same `session-lifecycle` and `tenant-isolation` sets — it is a different architecture, so it is a feasibility
reference, not a drop-in.

## 8. What we are missing → rows for `docs/PARITY.md`

The CEO merges these. The **Spoke** column is filled **only** where `docs/study/spoke/TEARDOWN.md` states the fact
(read 2026-10-21; the PARITY header still says 2026-10-20 — the teardown is one day newer). Where the teardown is
silent the cell is left empty. Note one contradiction to resolve at the CEO's desk: PARITY rows 38–40 claim Spoke
"match" on earnings tracking, mileage logbook and client invoicing, while **TEARDOWN §17 states "No earnings,
mileage logbook, IRD/GST export, invoicing or client statement in either product (S2, S3, S5)"** — the teardown is
the sourced document and wins; the rows below use the teardown.

| # | Family | Feature | Status | Spoke (2026-10-20) | Our edge | Task |
|---|---|---|---|---|---|---|
| 1 | Accounts | Sign-in / sign-up on the phone with e-mail + password | Planned (task) | Free tier with a 10-stop cap; Lite/Standard subscriptions gate the rest (S2, S5) | voice-first sign-in, no password typing while driving | T7.5 |
| 2 | Accounts | Organisation + team model for a courier company | Planned (task) | Dispatch has workspaces, unlimited dashboard members, driver settings and permissions (S3, S4) | org + team + `org_id` scoping on every query, proven by tenant-isolation tests | T7.14 |
| 3 | Accounts | Session that survives a locked phone / background wake | Planned (task) | | `AFTER_FIRST_UNLOCK` device store so a courier's phone can be locked in the van | T7.1 |
| 4 | Accounts | Server-side session revocation (driver loses the phone) | Planned (task) | | revoked server-side; the app degrades to a locked state, never to a "logged in" state it cannot prove | T7.15 |
| 5 | Accounts | Passkeys on the phone | Planned (task) | | passkey sign-in without a password; no RN WebAuthn today, needs a native module | T7.15 |
| 6 | Accounts | Organisation invitations that only the invited person can accept | Planned (task) | | invitation bound to a verified address (upstream GHSA-fmh4-wcc4-5jm3 class) | T7.14 |
| 7 | Accounts | Rate limiting on the credential endpoints | Planned (task) | | IPv6-proof limiter plus an independent throttle at the API | T7.15 |
| 8 | Accounts | JWT for the API, verified from a published JWKS | Planned (task) | | ES256 + JWKS, no shared secret, `apps/api` is a resource server only | T7.13 |
| 9 | Accounts | Audit log of admin actions | Planned (task) | | an audit row per admin action, with NZ Privacy Act retention | T7.15 |
| 10 | Accounts | Multilingual error and auth messages | Planned (task) | 19 languages, phone-language driven; no te reo Māori, Mandarin, Hindi, Samoan or Tongan (S13) | all languages from day one (D3), errors localised at the auth layer | T7.15 |
| 11 | Accounts | Accessibility declaration and behaviour | Planned (task) | the NZ and AU listings state "The developer has not yet indicated which accessibility features this app supports" (S13, S14) | we declare and meet it; VoiceOver/TalkBack and 200 % text | T7.6 |
| 12 | Accounts | Privacy: no driver PII leaves the device by default | Planned (task) | no statement about where audio or photos are processed; the stores declare identifiers + usage data used to track (S13, S14) | audio and images stay on the phone; NZ Privacy Act 2020 PIA | T7.15 |
| 13 | Accounts | Deep-link sign-in reachable from an e-mail client | Planned (task) | | HTTPS App Links for e-mail instead of a scheme-only deep link | T7.5 |
| 14 | Accounts | Behavioural (black-box) test of the native session | Planned (task) | | sign in → kill → restart → session survives, proven on a device | T7.15 |

## 9. Decision

**KEEP (locked decision, unchanged): Better Auth as the single auth core, with the `organization` (teams) + `expo`
+ `jwt`/`jwks` plugin set, ES256 + JWKS, rate limits, secure cookies, and a resource-server-only API with zero
shared secrets.** Reasons, all verified on 2026-10-21: it is MIT; it is the only candidate with a **first-class
Expo client** (5.1 M dl/30 d) **and** an organisation+team model that matches D11; it moves fastest (30 humans/90 d,
≥100 releases/6 m, 44.6 M dl/30 d); and `services/auth` + `apps/api/app/auth/jwks.py` + the test suite already
implement it correctly.

**ADOPT (the concrete delta this research produces).**

1. **Bump `better-auth` and `@better-auth/expo` 1.7.10 → 1.7.12** (both released 2026-10-20) and re-read the
   changelog for `v1.7.10…v1.7.12` before merging. Refresh the ADR-001 row that still records `better-auth 1.0.0`.
2. **Ship the `AFTER_FIRST_UNLOCK` storage wrapper** (§3.2). One module-level object, shared by every client.
   This is the difference between "the driver lost the app mid-shift" and "the driver lost the shift".
3. **Add `jwtClient()` to the mobile client** and a `Cookie`→JWT step, with the typing trap of #10515 handled in a
   test. Until then the mobile app cannot call our API as a resource server.
4. **Write the four regression tests** that map to advisories in code we actually enable: (a) an organisation
   invitation cannot be accepted by an unverified e-mail — and decide whether `requireEmailVerification` goes to
   `true`; (b) the rate limiter survives IPv6 prefix rotation; (c) deleting a user kills their sessions;
   (d) `trustedOrigins` rejects a host-bearing `courier://` entry and no wildcard is present in production.
5. **Add `session.cookieCache` to the forbidden-options test** (it is the 2FA-bypass vector) and keep
   `advanced.trustedProxyHeaders` off unless a proxy demands it.
6. **Model org/team scoping as one policy artefact** (the Casbin idea) so the check is data, not scattered code.
7. **Record every Better Auth package and its licence in `docs/LICENSES.md`** and keep the exact-version pin.
8. **OSV in CI as a blocking gate** + a monthly re-read of the advisory list.

**ADR PROPOSALS (flagged, not applied — the locked decision stands).**

| # | Proposal | Why it needs an ADR | Status |
|---|---|---|---|
| **ADR-A** | Enable **e-mail verification** for accounts that hold an organisation membership (`requireEmailVerification: true` for org members, optional for solo) | It changes the sign-up flow for the customer (a tradesperson who just wants to drive) and it is the only clean fix for the GHSA-fmh4-wcc4-5jm3 class with `requireEmailVerification: false` | **PROPOSED — CEO decision** |
| **ADR-B** | Keep the **session cookie out of the device keychain** by storing only an opaque device token and exchanging it for a short-lived JWT on the network path | It is the strongest answer to the locked-keychain problem, but it adds an exchange endpoint and an offline path that must degrade safely | **PROPOSED — evaluate after the `AFTER_FIRST_UNLOCK` wrapper ships** |
| **ADR-C** | Pin `better-auth` to the **1.8 line** when it goes stable | v1.8.0-beta.0/beta.1 exist (2026-10-15/16); 1.8 moves the MCP plugin, decouples SCIM from the organisation plugin and decouples the session cookie cache from the JWT plugin — all three touch us | **PROPOSED — re-read the 1.8 notes when beta.2 lands** |
| **ADR-D** | Refresh **ADR-001**'s `better-auth 1.0.0` row and the `expo 58.0.14` row | ADR-001 records versions that no longer match the tree; ADR-001 is the version contract | **PROPOSED — doc maintenance, no code change** |

**Fallback chain.** Better Auth (self-hosted) → (if Better Auth becomes unmaintainable or its advisory velocity
becomes unmanageable) **Ory Kratos** (Apache-2.0, self-hosted — but note the OSS repo went quiet on 2026-07-29) →
(last) a hand-rolled session service, which we know from Lucia's retirement (C41's predecessor) is a liability, not
an asset.

**Risk.**

| Risk | Severity | Mitigation |
|---|---|---|
| **Session cookie unreadable on a locked phone** (verified: SDK 58 default `WHEN_UNLOCKED`; upstream #10382) | **High** | the `AFTER_FIRST_UNLOCK` wrapper (§3.2) + the `locked-device.jsonl` test on a real device |
| Advisory velocity (22 GHSAs; 9 of the last 20 commits are security fixes) | **High** | exact pin, OSV blocking gate, monthly re-read, a documented "bump within N days of a high/critical advisory" rule |
| Two patch versions behind (1.7.10 vs 1.7.12) | Medium | bump now; the changelog for `v1.7.10…v1.7.12` must be read before merging |
| `organization` invitation + `requireEmailVerification: false` | **High** | ADR-A + the invitation regression test |
| A wrapper storage object breaks the shared write queue | Medium | one module-level exported constant; a test that asserts both clients share it |
| `expo-origin: courier://` in e-mails | Medium | HTTPS App Links (issue #10253) — v1.1 |
| 1.8 churn (MCP/SCIM/session-cache decoupling) | Medium | ADR-C; stay on 1.7.x until 1.8 is stable and the notes are read |
| The `@better-auth/cli` version lag (1.4.21 vs 1.7.12) | Low | re-read the CLI version before every `npx auth generate` |

## 10. Monthly radar filter (V4 §11.3)

Re-run on the first Monday of each month and update this file:

- **better-auth** — releases (≥100/6 m is the pace), the CHANGELOG, and the **OSV feed for `better-auth`,
  `@better-auth/expo`, `@better-auth/passkey`, `@better-auth/stripe`, `@better-auth/cli`**. A high/critical advisory
  is a same-week bump. Re-read the **1.8 notes** before we move off 1.7.x.
- **@better-auth/expo** — the peer-dependency set and the storage interface. A change to `ExpoClientStorage` (the
  four-method `Pick`) is a breaking change for our wrapper.
- **@better-auth/cli** — the version lag must be re-checked before every schema generation.
- **expo-secure-store** — the `keychainAccessible` default and any change to the sync/async pair. **A default change
  is our §3.2 regression.**
- **expo / React Native** — the SDK 58 → 59 move, and whether Better Auth's Expo guide catches up.
- **panva/jose** — only if we ever verify tokens on the device; the three advisories are JWE-only.
- **SimpleWebAuthn / passkey-rs / expo-better-auth-passkey** — for the v1.1 passkey work.
- **luc… (lucia)** — only to confirm it stays deprecated. Do not re-adopt.
- **Filters:** release in the last 6 months · permissive licence · ≥ 2 active human maintainers in 90 days ·
default-branch commit in the last 90 days · **no unpatched high/critical OSV advisory** · self-hostable (a
hosted-only dependency is disqualifying) · no supply-chain incident · a first-party Expo/RN client if the slot is
the mobile client.

## 11. What we could not verify

- **6-month star trend for every candidate** — the star timeline is not readable with the token in `.env.local`
  (403, re-checked 2026-10-21). The releases/commits/humans/downloads proxy was used instead.
- **Median issue first-response time** — the REST API does not expose it and we did not sample closed-issue
  timelines. **UNVERIFIED** for every card.
- **Keycloak's exact latest version** — the releases API returns a stale `nightly@2022-09-27` tag. The `main`
  branch line "26.8" appears in PR #54181; the exact release string is **UNVERIFIED**.
- **`auth0/auth0-react-native`, `panva/oidc-provider`, `FusionAuth/fusionauth`, `descope/*` RN SDK repos, and the
  NextAuth/Auth.js repos** — all returned **HTTP 404** through the GitHub API in this environment (verified both
  with and without the token). Their stars, dates and licences are **UNVERIFIED** and are not cited above.
- **Better Auth under Expo SDK 58 / RN 0.88 at runtime** — the peer ranges are satisfied and the guide targets SDK
  55; **no CI Android build has run `@better-auth/expo@1.7.12` on SDK 58.** UNVERIFIED until it is green.
- **The `AFTER_FIRST_UNLOCK` fix** — verified from the SDK 58 docs and upstream issue #10382 that the *default*
  fails and the *constant* exists; **not yet reproduced on a locked iOS device**. UNVERIFIED.
- **Whether every Better Auth advisory has a complete affected-range object** — for entries where OSV returned more
  than one `fixed` event we list every fixed version the API gave; the 11 rows that show a single pre-1.4/1.6/1.7
  version are the OSV `fixed` events as returned, not our reading of the range.
- **Vendor pricing in §2's Q3** (Auth0 / Clerk / WorkOS / Supabase / Descope) — taken from **vendor-authored
  comparison articles** (clerk.com, workos.com), which are biased by the seller. The Stripe/RevenueCat/Apple/Google/
  IRD figures in the payments document are read from primary sources and are not affected by this caveat.
- **Logto's MPL-2.0 obligations for a self-hosted deployment** — our reading (file-level copyleft) is not counsel's.
  UNVERIFIED (legally).
- **`superTokens`' licence** — the API reports NOASSERTION; the LICENSE file has not been read. UNVERIFIED.
- **The rate limiter's behaviour under IPv6 rotation on our configuration** — upstream is patched since 1.4.17, our
  pin is above it, but **no test of ours proves it**. UNVERIFIED.
- **The vendor-stated performance of every candidate** — no benchmark was run. UNVERIFIED.
