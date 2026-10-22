# SaaS completeness checklist — every item must become a task with spec, tests and evidence

Owner: CEO. Each line → status in PARITY/PROGRESS (Have / Planned (task) / N/A (reason)). Nothing may be silently skipped.

## A. Security squad (highest priority — security review is a merge gate for every PR)
Roles: AppSec lead, mobile security, cloud/infra security, privacy officer, red-team reviewer.
- **Auth**: email+password, **Sign in with Google** (Android Credential Manager + Better Auth social provider), Apple sign-in (iOS later), magic link/OTP; email verification; password policy (length ≥ 12, breached-password check via k-anonymity HIBP); **login attempt limits** (per account + per IP + per device: progressive delay, lockout after N failures with unlock by email, CAPTCHA/Turnstile after threshold); **MFA** (TOTP + passkeys/WebAuthn); device binding + "new device" alerts; session list with remote sign-out; short-lived JWT (ES256) + refresh rotation + reuse detection; logout everywhere on password change; account recovery flow that can't be abused.
- **Google Play integration**: Play Integrity API (device/app attestation on sign-in and sensitive calls), Play Billing (if in-app subscriptions are used) or Stripe web checkout per Play policy, in-app updates API, in-app review API, Play App Signing, Data Safety form, target SDK policy.
- **Authorization**: RBAC (driver, team lead, dispatcher, admin, owner), org/tenant isolation on every query + tests proving it, least privilege API keys, admin actions audited.
- **API**: OWASP ASVS L2 — input validation (zod/pydantic), output encoding, rate limits per route/user/IP, request size limits, CORS allow-list, security headers, CSRF where cookies, idempotency keys, webhook signature verification (Stripe), replay protection, no verbose errors.
- **Mobile**: OWASP MASVS L2 for auth/storage — SQLCipher DB, keys in Android Keystore (expo-secure-store), certificate pinning for our API, root/emulator/hook detection (signal only, not block CI emulator), screenshot protection on sensitive screens, no secrets in the APK, obfuscation (R8), tamper detection via Play Integrity.
- **Data & privacy**: encryption at rest + in transit (TLS 1.3), PII minimisation, retention + deletion (account delete in-app, Play requirement), data export (user right), consent for analytics/voice improvement, audio not stored by default, NZ Privacy Act 2020 PIA, privacy policy, DPA for team customers, breach response plan (72h).
- **Infra**: secrets manager, key rotation, backups encrypted + restore drills, WAF/DDoS basics, OS/container patching, least-privilege IAM, audit logs, intrusion alerts, dependency + container scanning, SBOM, signed releases.
- **Process**: threat model per module (STRIDE), security tests in CI (SAST, DAST against staging with OWASP ZAP, secret scanning, dependency audit), pen-test checklist before v1, bug-bounty-ready security.txt.

## B. Driver-app runtime essentials
- **Keep screen awake** in driving/navigation/dictation modes (expo-keep-awake), configurable; dim-but-on option; auto-release when idle off-route to save battery.
- Foreground service + persistent notification while driving (location + voice), survives Doze/OEM battery killers (guided battery-optimisation whitelist per manufacturer).
- Audio focus handling (calls, music, nav prompts), Bluetooth/earbud buttons, headset disconnect behaviour.
- Lock-screen / notification controls (Delivered, Skip, Next), Android widget, Android Auto readiness (post-v1).
- Offline/online indicator, sync status, conflict prompts; low-storage and low-battery modes; large-text/one-hand mode; glove/wet-screen friendly targets.
- Crash-free recovery: restore route state after app kill or reboot.

## C. SaaS business essentials
Plans & billing (Trial/Solo/Team, NZD, GST invoices, proration, dunning, cancellation, refunds), entitlements/feature flags, usage limits, coupons/referrals, customer portal; onboarding & activation funnel; in-app support (help centre, chat later), status page; transactional email/SMS (verification, receipts, alerts) with templates; notifications centre; admin console (users, orgs, subscriptions, impersonation with audit, support tools); analytics (product events, funnels, retention, cohort), feature flags/A-B; NPS/feedback; changelog/what's new; localisation; accessibility statement; legal (terms, privacy, cookie notice web, acceptable use); multi-tenant data model; backups/DR; observability (errors, traces, logs, uptime, SLOs + alerts, on-call runbooks); cost monitoring; release management (staged rollouts, OTA channels, rollback); data migrations; API versioning + public API/webhooks for teams (post-v1).

## D. "SaaS brain" — automation & company operations
Research (V4 §12) GitHub 2025–2026 for complete SaaS starter kits/boilerplates, SaaS ops checklists, agent skill packs and automation (e.g. production-ready Next.js/Expo SaaS starters, Better Auth + Stripe templates, open-source admin/billing/feature-flag/analytics/status-page projects, AI agent workflows for triage, code review, release notes, support). Adopt permissive ones per D24, clean-room the copyleft ones. Build automations: issue triage, dependency updates, release notes, changelog, weekly metrics report to the founder, error-to-issue pipeline, support-to-bug pipeline.

## E. Completeness rule
At every CEO loop, scan this checklist + PARITY.md + research "what we are missing". Any unchecked item without a task gets a task. v1.0.0 cannot ship with an unchecked must-have in A or B.

## F. Company completeness (added 2026-10-23, see MASTER_EXECUTION §18 and D31)
Legal and NZ compliance (driver distraction rule, Privacy Act 2020, carrier terms, store billing rules, company basics); customers and market (interviews, closed beta, pricing, B2B); growth and launch; SRE (SLOs, status page, load tests, DR drills, release engineering, crash and cost monitoring); analytics and AI governance; support and customer success; engineering organisation; Courier Ops console and AI ops agents (§17.5).
