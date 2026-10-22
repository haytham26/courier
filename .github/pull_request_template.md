## What

<!-- The user story and the acceptance criteria (Given/When/Then). -->

## Why

<!-- The driver-day scenario this solves, and the link to the task in docs/archive/KICKOFF_V3_EN.md. -->

## Research

<!-- Link to docs/research/2026/<area>.md (V4 §3). What did you compare, and what did you decide? -->

## Parity

<!-- Link to the row in docs/status/PARITY.md and its new status (Have / Better / Planned / Skip). -->

## Design

<!-- Link to the screen spec, and to docs/design/SYSTEM.md when the design system changed. -->

## Evidence

<!-- Every claim needs a link: CI run URL, logs in docs/evidence/, screenshots, benchmark numbers. -->

- [ ] CI (lint, typecheck, test, audits) is green — run link:
- [ ] Android emulator E2E is green — run link:
- [ ] Two independent review passes (critical modules: auth, payments, sync, address, voice, routing)
- [ ] `pnpm check:full` passes locally
- [ ] Coverage and mutation scores are at or above the floor in docs/plan/CONSTRAINTS.md
- [ ] No new floor violations (`node scripts/ci/check-floor.mjs`)
- [ ] PROGRESS.md and the log of the week are updated (including the skills and squads applied)

## Screenshots

<!-- Maestro screenshots for any UI change: day/night, small/large, 200% text (docs/evidence/design/). -->

## Risk and rollback

<!-- What breaks if this is wrong, and how to roll it back. -->

## Checklist

- [ ] No secrets, no PII in logs
- [ ] No banned dependency or pattern (`node scripts/check-banned.mjs` equivalent: `scripts/ci/grep-banned.ps1`)
- [ ] Offline behaviour defined (does the feature work with no network?)
- [ ] The tenant scoping of every query is proven by a test
