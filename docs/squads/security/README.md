# Security Squad

**Mission:** the complete sign-in and the account behind it: Google, Apple, passkeys, email,
the second factor, the offline session, the biometric unlock and the teams of a courier company.

**Code:** `services/auth`, `apps/mobile/src/lib/auth-client.ts`, `apps/mobile/src/lib/offline-session.ts`,
`apps/mobile/src/lib/biometric.ts`, `apps/mobile/src/providers/AuthProvider.tsx`,
`apps/mobile/app/(auth)`, `apps/api/app/auth`

**Binding:** MASTER_EXECUTION §14 (the founder's own text) and §10 (the conflict rules).
`docs/SAAS_CHECKLIST.md` §A is the squad's checklist.

## Targets (the release gate)

- every sign-in method the app offers is proven by a test on the service and a test on the app
- the MFA challenge works: the time code, the backup code, the account lockout
- the passkey registration and the passkey sign-in pass the real WebAuthn verification
- the OAuth start and the passkey challenge are rate limited like the credential endpoints
- the offline session is bounded, deliberate and visible in the UI
- the biometric unlock is a convenience: the app never refuses to open because of it
- the team roles are owner, admin and member, and a driver cannot change the company
- no secret, no key and no real credential in the repository or in a test

## Evaluation dataset / benchmark

`docs/squads/payments/eval/auth/` is **not built yet** (the research names the eight JSONL sets
that have to exist: session-lifecycle, tenant-isolation, rate-limit, rotation, offline-revoke,
locked-device, deep-link, a11y-i18n). The unit and integration tests cover the behaviour; the
benchmark numbers do not exist yet and the squad says so rather than inventing them.

## Research

`docs/research/2026/auth-better-auth-ecosystem.md` - V4 §12: 52 candidates, the Better Auth
decision, the version facts, the advisory ledger and the findings that became this work
(the `AFTER_FIRST_UNLOCK` store, the `expo-origin` header, the passkey native module).

## Working agreement

1. A method that the founder cannot supply yet is **disabled with a plain reason**, never hidden
   silently and never half-wired.
2. Every change to the squad's code updates this directory: the status, the metric and the
   evidence link.
3. The security review is a merge gate for every PR (the checklist, §A).
4. Two independent review passes for the critical squads (auth, payments, sync, address, voice,
   routing).

## Files

- `STATUS.md` - done with evidence, metrics vs targets, next, risks.
- `decisions.md` - the decisions this squad owns.
- `benchmarks/` - the benchmark harness and its results (not built yet).

## Where the work sits

| Piece | Where | Note |
|---|---|---|
| The auth service | `services/auth` | Better Auth 1.7.10, the plugins, the tests |
| The sign-in screen | `apps/mobile/app/(auth)/login.tsx` | the methods, the second factor, the teams |
| The offline session | `apps/mobile/src/lib/offline-session.ts` | the receipt, the twelve hour bound |
| The biometric unlock | `apps/mobile/src/lib/biometric.ts` | `expo-local-authentication` |
| The device store | `apps/mobile/src/lib/session-storage.ts` | one wrapper, `AFTER_FIRST_UNLOCK` |
| The token check | `apps/api/app/auth/jwks.py` | the API is a resource server only |
