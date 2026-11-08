# S1–S5 task breakdown — SAAS_CHECKLIST §A security rows, every line a task

**Date:** 2026-11-08 · **Owner:** backend squad (this file); each task names its owner ·
**Rule it satisfies:** SAAS_CHECKLIST §E ("every line must become a task with spec, tests
and evidence; nothing may be silently skipped"). **Reviewed against `main` at `65d3502`**
(PR #273's head).

State legend: **Done** (evidence named) · **Open** (a task below: branch + PR, spec,
tests, evidence) · **Founder** (in `docs/status/FOUNDER_TODO.md`, not attempted).
PARITY links are the register rows; PROGRESS S-rows point here.

---

## S1 — Auth (P5, Better Auth) — state: In progress (security squad since 2026-10-22)

Done, with evidence (`docs/squads/security/STATUS.md`, `services/auth/src/options.ts`,
`services/auth/src/config.ts`):

- email+password sign-in, rate-limited (`customRules`: `/sign-in/email` 10/15 min,
  `/sign-up/email` 10/h, `/forget-password` 5/15 min; DB storage in production — BUG-132);
- Google + Apple social providers, env-gated (client ids are **Founder**:
  `AUTH_GOOGLE_CLIENT_ID/SECRET`, Apple team id);
- passkeys, service side complete + tested (`@better-auth/passkey` 1.7.10; native
  Credential Manager on the phone is the app slice);
- MFA: TOTP + encrypted backup codes + account lockout (5 attempts / 900 s);
- teams via the `organization` plugin (owner/admin/member);
- offline session receipt on the phone (12 h, visible banner);
- biometric unlock (convenience only);
- session credential in the Android Keystore (`session-storage.ts`, AFTER_FIRST_UNLOCK);
- breached-password check, guarded + fail-open (BUG-128; the plugin stays off unless
  `AUTH_HIBP_PLUGIN=true`); JWKS access tokens verified by FastAPI (D21).

Open — tasks (each = one branch + PR with red-first tests):

| Task | Spec | Tests / evidence | Owner |
|---|---|---|---|
| S1-a magic link / OTP | `magicLink` (and/or `emailOTP`) plugin; mailer: a dev/log mailer in-repo now, real SMTP is **Founder** | sign-in by link in tests; `services/auth` suite | backend |
| S1-b email verification | `requireEmailVerification` default **on** (today off unless `AUTH_REQUIRE_EMAIL_VERIFICATION=true`, config.ts:394); send-verification flow; invitation acceptance stays exact-address | verification round-trip test (STATUS.md's "highest-value regression test, ADR-A") | backend |
| S1-c password policy ≥ 12 | checklist floor is ≥ 12; today `minPasswordLength: 8` hardcoded (config.ts:384) — make it env-driven, default 12, keep HIBP | length + HIBP refusal tests | backend |
| S1-d device binding + new-device alerts | bind the session receipt to a device key (Keystore); a sign-in from an unbound device raises an alert (signal, and an email when the mailer exists) | unbound-device test | backend + app slice |
| S1-e session list + remote sign-out | expose Better Auth core `list-sessions` / `revoke-session` / `revoke-other-sessions` (on by default; the app just does not call them yet) | revoke test: a revoked session's JWKS token stops working (voice service already honours revocation) | backend + app slice |
| S1-f refresh rotation + reuse detection | short-lived ES256 access tokens (jwt plugin) + rotated refresh with reuse detection (a presented old refresh revokes the family) | reuse test | backend |
| S1-g logout everywhere on password change | revoke all other sessions on password change | password-change test asserting old sessions die | backend |
| S1-h account recovery | `forget-password` → reset (route exists, rate-limited); needs the mailer (S1-a); must not be abusable: single-use token, expiry, no account enumeration (generic response) | recovery tests incl. enumeration | backend |

## S2 — Google Play integration (P6 launch readiness) — state: Planned

| Sub-item | State |
|---|---|
| Play Integrity attestation, server-side verdict, blank = signal | **Open** — PARITY 198; adopted path `@expo/app-integrity` 58.0.2 (research V7+V8); needs Play Console (**Founder**: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64`) |
| Billing policy decision | **Open** — this is the queue's next item after this one: D44, Stripe NZD test mode on `services/api/app/entitlements.py` |
| Data Safety form | **Partly done** — `docs/operations/DATA-SAFETY.md` exists; store labels PARITY 212 (app slice + founder) |
| In-app updates / in-app review APIs | **Open** — app slice (P6) |
| Play App Signing, store ids | **Founder** — keystore + `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64` in FOUNDER_TODO |
| Target API level policy | **Open** — app slice (android `targetSdk` in the EAS/prebuild config) |

## S3 — Authorization + ASVS/MASVS (P5 + P6) — state: Planned

- RBAC driver/lead/dispatcher/admin/owner: **Open** — the `organization` plugin ships
  owner/admin/member (config.ts:442); the five courier roles need custom role
  definitions + the API's role checks. Backend task.
- Tenant isolation proved by tests: **Open** — PARITY 208 (driver A cannot read team B;
  the test is the proof). Backend task, pairs with the role work.
- Admin audit log: **Open** — admin actions audited (who did what, when). Backend task.
- ASVS L2 API rules: **Partly done** — the route-by-route authz walk + STRIDE pass became
  ADR-010's ASVS L2 table; security headers on every API response (PARITY 209 note, PR
  #21); still open: CORS allow-list, trusted-host check, request-size limit (PARITY 209).
  Backend task.
- MASVS L2 mobile: **matrix Done today** — `docs/security/MASVS-L2.md` + ADR-029/D66
  (BUG-275); the hardening itself is the **lead's app slice** (PARITY 195–198 stay
  `Planned (task)`).

## S4 — Data & privacy (P6) — state: Planned

- PIA (NZ Privacy Act 2020, incl. IPP 3A in force 2026-05-01): **Open** — PARITY 211;
  privacy officer / **Founder**.
- Store privacy labels from one data map + a test against the privacy policy: **Open** —
  PARITY 212 (app slice + founder).
- Retention + deletion: **Open** — account deletion in-app + a server data-deletion job
  (store requirement; STATUS.md "Next" #6). Backend + app slice.
- Data export (user right): **Open** — backend task.
- Consent for analytics/voice improvement: **Open** — no analytics SDK exists (L1), so
  the consent surface rides on the first collection; app slice.
- Audio not stored on the device: **Done** — MASVS-L1 PRIVACY-3 (no audio file written).
- Privacy policy: **Done** — `docs/operations/PRIVACY-POLICY.md`.
- DPA for team customers: **Open** — docs task (operations).
- Breach-response plan with the 72-hour clock: **Done in this PR** —
  `docs/operations/BREACH-RESPONSE.md` (aligns with RUNBOOK §10).

## S5 — Infra & process (P6 + P7) — state: Planned

- Secrets manager: **Partly done** — `.env.local` + GitHub Secrets (gitleaks gate every
  PR); sops for encrypted config at rest is on the radar. **Open** task: document the
  rotation procedure in the RUNBOOK.
- Key rotation: **Open** — same RUNBOOK task (AUTH_SECRET, DB, edge TLS).
- Backup restore drill: **Done** — `infra/backup.sh`, `infra/restore.sh`,
  `infra/test-restore.sh`, CI `restore-test.yml` + the drill step in `ci.yml`
  (RUNBOOK §13).
- WAF basics: **Partly done** — the edge (Caddy) sends the production security headers
  and `rate_limit`s (`infra/Caddyfile.staging:42-55,71`); API-side per-route limits are
  PARITY 205 (backend task).
- Patching: **Partly done** — `.github/dependabot.yml` + the dependency-audit gates
  (npm + PyPI) + container images pinned. **Open**: OS/container patch cadence note in
  the RUNBOOK.
- Least privilege: **Open** — prod compose review (services run as non-root, minimal
  caps). Infra task.
- Audit logs + intrusion alerts: **Open** — pairs with S3's admin audit log; alerting
  on the 5xx/rate-limit dashboards (infra/monitoring exists). Infra task.
- SBOM per release + signed releases: **Open** — PARITY 202/204; `release-apk.yml` builds
  the release APK (unsigned until the keystore exists — **Founder**); sigstore/cosign
  adopted (research S5+S6). P6/P7.
- Threat model per module (STRIDE): **Partly done** — ADR-010 holds the API's ASVS/STRIDE
  table; per-module STRIDE docs are an **open** task (one page per service).
- DAST with OWASP ZAP: **Done** — `.github/workflows/zap-nightly.yml` (BUG-235), skips
  with a notice until `COURIER_STAGING_DOMAIN` exists (**Founder**).
- Pen-test checklist before v1: **Done in this PR** — `docs/operations/PEN-TEST-CHECKLIST.md`;
  the external pen-test run itself is a v1 gate (**Founder**: tester).
- `security.txt`: **Done in this PR** — `SECURITY.md` at the repo root (GitHub's surface)
  + `docs/operations/SECURITY-TXT.md` holding the exact RFC 9116 file for
  `/.well-known/security.txt` on our domain (serving it is a one-line edge task, gated on
  the staging domain — **Founder**).

## What this PR does

Publishes this breakdown (the register's "every line becomes a task"), lands the three
backend-owned S5 compliance artefacts (`SECURITY.md`, `SECURITY-TXT.md`,
`PEN-TEST-CHECKLIST.md`, `BREACH-RESPONSE.md`), updates the PROGRESS S-rows and PARITY 213's
note, and files BUG-276. No code changes; no PARITY status flips (the open items keep
their rows until their own PRs land).
