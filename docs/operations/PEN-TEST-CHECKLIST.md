# Pen-test checklist — before v1.0.0

**Date:** 2026-11-08 · **Gate:** v1.0.0 does not ship until this checklist has been run
against the release build and staging, with **zero high/critical findings open**
(CONSTRAINTS.md's bar). **Owner:** the founder commissions the external tester
(FOUNDER_TODO); the security squad runs the in-house legs. PARITY 213.

## 1. Scope

| Surface | What | How it is already covered in CI |
|---|---|---|
| Courier API (`services/api`) | every route: authz per tenant, input validation, SSRF guard, rate limits, headers/CORS | ASVS L2 table ADR-010; PARITY 205/206/207/209; Semgrep/Bandit/CodeQL gates |
| Auth service (`services/auth`) | sign-in methods, MFA, passkey ceremony, session revocation, JWKS | auth suite (59 tests), rate-limit + lockout tests |
| Voice service (`services/courier-voice`) | token per route, foreign-session 404s, bounded stores | voice suite (364), mutation floor |
| Android release APK | MASVS L2 matrix (`docs/security/MASVS-L2.md`), no secrets in the APK, backup rules, pinning, root signal | gitleaks gate; MASVS-L2 matrix rows; E2E on the CI emulator |
| Staging stack (edge → services) | TLS config, headers, edge rate limits, DAST | `infra/Caddyfile.staging`; `zap-nightly.yml` |
| Supply chain | pinned actions/lockfiles, SBOM diff per release | action-pins + licence + audit gates; PARITY 202/204 |

## 2. The test legs (each produces a written result in `docs/evidence/pen-test/`)

1. **External black-box pass** on the staging domain: auth bypass attempts, IDOR
   across tenants (PARITY 208's test is the in-house proof; the external pass tries
   the creative ones), injection (SQL/command/SSRF via the address and webhook
   inputs), the unauthenticated surface (health must be the only public route).
2. **Credential attacks**: password spraying against the rate limits
   (`/sign-in/email` 10/15 min, sign-up 10/h), MFA lockout (5/900 s), HIBP refusal,
   session revocation after sign-out, refresh-reuse (S1-f), account recovery abuse
   (enumeration, single-use tokens).
3. **Mobile**: the MASVS L2 matrix rows one by one on the release APK — DB at rest,
   backup rules, pinning behaviour on a bad cert (must fail closed, not crash),
   root/emulator signal (must inform, never block), FLAG_SECURE screens, deep-link
   hijack of `courier://`.
4. **DAST**: the nightly ZAP baseline (`zap-nightly.yml`) run on demand against
   staging, findings triaged into BUG rows within 2 business days.
5. **Infra**: edge TLS grade (A or better), headers present, rate limits enforced,
   no debug endpoints, backups encrypted and the restore drill green
   (`infra/test-restore.sh`).
6. **Process**: secrets rotation drill (RUNBOOK), breach-response tabletop
   (`docs/operations/BREACH-RESPONSE.md` — walk the 72-hour clock with the founder).

## 3. Severity and the gate

- **Critical/high**: fix before v1.0.0, no exceptions; a fix PR re-runs this leg.
- **Medium**: fixed before v1.0.0 or accepted in writing with an owner and a review
  date (CONSTRAINTS.md's accepted-advisory rule — an acceptance with no owner or review
  date fails the gate).
- **Low/informational**: triaged into BUGS.md, not gating.

## 4. Report format

One page per finding: title, severity, surface, reproduction, impact, fix suggestion,
and whether the in-house gates should have caught it (if yes, a gate-gap BUG is
filed too). The summary table goes to `docs/status/FINAL_REPORT.md`'s security section.
