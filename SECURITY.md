# Security policy — Courier Copilot

**Last updated:** 2026-11-08 · **Owner:** the founder (security squad executes) ·
This is the repository's security policy (GitHub surfaces this file on the repo). The
machine-readable `security.txt` for our domain is `docs/operations/SECURITY-TXT.md`
(RFC 9116, served at `https://courier.copilot.nz/.well-known/security.txt` by the edge —
a one-line Caddy task gated on the staging domain, FOUNDER_TODO).

## Supported versions

| Version | Supported |
|---|---|
| v1.x (the release train from P6/P7, `v1.0.0` and later) | yes — security fixes only |
| 0.x (the beta builds published by the Main APK workflow) | best effort; the beta is for the founder's own phone and the closed beta couriers |

## Reporting a vulnerability

Email **security@courier.copilot.nz** (the privacy contact is
`privacy@courier.copilot.nz` for data questions — see
`docs/operations/PRIVACY-POLICY.md`). Please include:

- what you found and where (endpoint, screen, build sha — the APK's build sha is in
  the app's About screen and in the release artefacts),
- how to reproduce it, and what you think the impact is,
- whether any courier data was involved.

**What you get back:** an acknowledgement within **48 hours**, a severity assessment
within **5 business days**, and a fix or a dated plan. We will not take legal action
against you for a good-faith report that stays within this scope: no data exfiltration
beyond what is needed to prove the issue, no social engineering of couriers, no
testing against the production OmniRoute keys or the founder's accounts.

**Scope:** the Courier API and auth service (`services/api`, `services/auth`), the
voice service (`services/courier-voice`), the Android app (`apps/mobile`), and the
deployed staging stack. Out of scope: the CI runners themselves (report those to
GitHub), third-party services we call (LINZ, OmniRoute providers) — report those to
them, though a pointer is welcome.

## Our side of the bargain (what we run on every PR)

- secret scanning (gitleaks), SAST (Semgrep + Bandit), CodeQL, dependency audits
  (npm + PyPI), licence inventory — all gates in `.github/workflows/quality-gates.yml`;
- nightly DAST with OWASP ZAP against staging (`.github/workflows/zap-nightly.yml`);
- the ASVS L2 table for the API (ADR-010) and the MASVS L1/L2 reviews of the app
  (`docs/security/`);
- the pre-v1 pen-test checklist is `docs/operations/PEN-TEST-CHECKLIST.md`; the
  breach-response runbook with the 72-hour clock is `docs/operations/BREACH-RESPONSE.md`.

## Hall of fame

None yet — the beta has not been pen-tested. Reports will be listed here with the
reporter's consent.
