# BUG-276 evidence — the S1-S5 task breakdown + the PARITY 213 compliance artefacts

2026-11-08, reviewed against `main` at `65d3502`.

## What landed
- `docs/plan/S1-S5-TASKS.md` — the authoritative S1-S5 breakdown (SAAS_CHECKLIST §E's rule):
  every sub-item of S1-S5 mapped to **Done** (evidence named: auth suite, BUG-128/132, restore drill
  `infra/test-restore.sh` + CI `restore-test.yml`, edge `rate_limit` + headers in
  `infra/Caddyfile.staging:42-55,71`, Dependabot `.github/dependabot.yml`, ZAP `zap-nightly.yml`
  BUG-235, ADR-010, MASVS-L2 matrix ADR-029/D66, PRIVACY-POLICY.md) or **Open** (task S1-a..h etc.
  with spec / tests / evidence / owner) or **Founder** (FOUNDER_TODO ids: Google/Apple client ids,
  Play Console, keystore, staging domain, SMTP, external pen-tester, privacy officer for the PIA).
- `SECURITY.md` (repo root) — the security policy GitHub surfaces: supported versions,
  reporting channel `security@courier.copilot.nz` with a 48-h acknowledgement / 5-day severity
  commitment, scope, the CI gates we run, hall of fame.
- `docs/operations/SECURITY-TXT.md` — the exact RFC 9116 `security.txt` content for
  `/.well-known/security.txt` on our domain (serving it = one-line Caddy task, gated on the
  domain, FOUNDER_TODO).
- `docs/operations/PEN-TEST-CHECKLIST.md` — six legs (external black-box on staging, credential
  attacks, mobile against the MASVS-L2 matrix, DAST, infra, process/tabletop), severity gate
  zero high/critical for v1.0.0, report format.
- `docs/operations/BREACH-RESPONSE.md` — NZ Privacy Act 2020 runbook: decide T+4 h, notify the
  OPC and affected couriers within 72 h, roles, templates, evidence rules (no courier data in
  git), pre-v1 tabletop. Extends RUNBOOK §10.

## Registers
- PROGRESS S1-S5 rows now point at the task file and carry the real per-row state.
- PARITY 213's note records the landed artefacts; the row stays `Planned (task)` because the
  external pen-test run itself is the v1 gate (FOUNDER_TODO).
- BUG-276 filed (before | BUG-187 |).

## Gates on the PR (docs-only)
`check-parity.mjs --base origin/main` -> 0 reopened; doc-links, control-chars, mojibake,
floor -> clean. Mutation floors skip by design (no code changed).
