# ADR-006 - The complete sign-in (MASTER_EXECUTION §14)

**Date:** 2026-10-22
**Owner:** the security squad
**Status:** accepted (the founder's items in `docs/status/FOUNDER_TODO.md` are still open)
**Binding:** MASTER_EXECUTION §14 and §10

## Context

MASTER_EXECUTION §14 asks for a complete sign-in: Google, Apple, passkeys, email and a
password, MFA, an offline session, a biometric unlock and teams. The research note
(`docs/research/2026/auth-better-auth-ecosystem.md`, 2026-10-21) read the ecosystem and the
advisories and locked Better Auth 1.7.10 with the `organization`, `expo` and `jwt` plugins.
Three things came out of that research that this ADR records, because they change how the
work is built.

1. **The service must answer what it can offer.** The founder's client ids and the passkey
   domain do not exist yet, and the build has to work without them. So the service publishes
   the live methods and the app asks.
2. **The phone has no WebAuthn API.** The passkey *server* is a library; the passkey
   *ceremony* on a phone needs the platform authenticator (Android Credential Manager, iCloud
   Keychain). The research flagged the native module as a decision of its own and put it in
   v1.1 (C45: `expo-better-auth-passkey`, "WATCH", not verified on SDK 58).
3. **The session cookie has to be readable while the phone is locked.** The default of
   `expo-secure-store` is `WHEN_UNLOCKED`, which throws when iOS wakes the app while the
   phone is locked (better-auth #10382). A courier's phone is locked in the van for the whole
   shift.

## Decision

### D1 - The service is the source of truth for the sign-in methods

`services/auth` publishes `GET /api/auth/sign-in-methods` with the enabled methods, a plain
reason for every method that is off, whether MFA is on, and the team roles. The app asks the
service and disables (never silently hides) a method it cannot offer.

The social providers are switched on only when their ids are in the environment
(`AUTH_GOOGLE_CLIENT_ID`, `AUTH_APPLE_CLIENT_ID` + `AUTH_APPLE_CLIENT_SECRET`); the passkey
plugin only when `AUTH_PASSKEY_RP_ID` is set. **No client id and no secret is ever in the
repository or in a test.**

### D2 - The MFA is TOTP with backup codes, and the account locks

The Better Auth `twoFactor` plugin: TOTP (six digits, thirty seconds) with ten backup codes
that are stored encrypted. Five wrong codes lock the account for fifteen minutes
(NIST SP 800-63B §5.2.2). The second factor cannot be turned off without the password.

### D3 - The passkeys are server-side complete, and the phone says so

`@better-auth/passkey` 1.7.10 (the same version as the core) is on the service, with the real
WebAuthn verification of `@simplewebauthn/server` 13.3.3. The test plays the part of the
phone: a P-256 key pair, the CBOR attestation, the signature. The registration, the sign-in
and the refusal of another origin are all proven.

**The phone keeps the passkey button disabled with a plain reason until the native
authenticator is in the build.** We did not adopt `expo-better-auth-passkey` (1.6.x) in this
step: the research rated it "WATCH" (its own README says "Expo SDK 55 or newer, tested with
57", our SDK is 58), it is a native module in the sign-in path that can only be checked on a
real device, and **no local emulator is allowed** (AGENTS.md). The server side, the client
plugin (`passkeyClient()`) and the button are in place, so the module is a drop-in when the
decision is made.

### D4 - The offline session is a receipt, and it is bounded

The session cookie stays in the device store (the Expo client plugin, unchanged in that
role). Next to it the app keeps a **receipt**: who the courier is and when the server last
confirmed the session. When the app opens and the server cannot be reached, the app opens
with the receipt - for **twelve hours**, a shift - and says it is offline. The receipt never
leaves the device and nothing in the app trusts it for anything the server decides.

### D5 - The biometric unlock is a convenience, never a lock-out

`expo-local-authentication` 58.0.2 asks the phone who the courier is. The unlock is offered
when the phone holds a session it cannot check; "Not now" opens the app straight away, and a
phone without a scanner never sees the screen.

### D6 - One device store wrapper, and it is readable while the phone is locked

`apps/mobile/src/lib/session-storage.ts` is a single module-level object that adds
`keychainAccessible: AFTER_FIRST_UNLOCK` to the four methods the Expo client needs. It is
exported once and used everywhere, because the Expo client keys its write queue by the
storage object (a second wrapper would split the queue and could lose a session write).

### D7 - The origin check stays on in the tests

The service keeps `advanced.disableOriginCheck` off **and** states it explicitly, so the
check runs in the test suite too. The test client sends the `expo-origin` header the phone
sends, and the service's `expo` plugin turns it into the `origin` header the check reads.
`courier://` has to be in `AUTH_TRUSTED_ORIGINS` in production.

## Consequences

- The build works without the founder's ids: the service starts, the app signs in with an
  email address and a password, and the other buttons say why they are off.
- The passkey sign-in is not usable on a phone yet. The button is honest about it and the
  server is ready.
- The teams are the three roles Better Auth ships with: owner, admin, member. A driver
  cannot change the company (tested).
- The OAuth start and the passkey challenges are rate limited like the credential endpoints
  (ten per quarter of an hour for the OAuth start and for the passkey verification).
- The offline session is a deliberate, documented behaviour with a clear state in the UI (the
  banner at the top of the app).

## What we did not do

- **E-mail verification for the invitations** (`requireEmailVerification`). Turning it on
  changes the sign-up flow for a courier who just wants to drive, and it is the founder's
  decision (the research's ADR-A). What is proven today: an invitation can only be accepted
  by the account with the **exact** invited address.
- **The `jwtClient()` path** so the phone can present a token to the FastAPI API. The API
  side is done (`services/api/app/auth/jwks.py`); the phone side is the research's next delta and
  is not part of the sign-in.
- **Account deletion in the app** (a store requirement) and the data deletion job.
- **The auth eval set** (`docs/squads/payments/eval/auth/`) - the eight JSONL sets the
  research names. The behaviour is covered by unit and integration tests; the benchmark does
  not exist yet and the squad says so.

## The references

- `docs/research/2026/auth-better-auth-ecosystem.md` (the research, the version facts, the
  advisory ledger, §3.2 the keychain finding, §7 the eval set)
- `docs/squads/security/README.md` and `STATUS.md` (the targets and the numbers)
- `docs/status/FOUNDER_TODO.md` (the ids and the secrets the founder supplies)
