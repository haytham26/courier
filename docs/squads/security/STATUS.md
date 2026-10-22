# Security Squad - status

Updated: 2026-10-22 (MASTER_EXECUTION §14 - the complete sign-in)

## Done (with evidence)

- **The auth service** (`services/auth`): the Better Auth plugins for MFA (TOTP with backup
  codes), passkeys (`@better-auth/passkey` 1.7.10), the social providers (Google and Apple, both
  from the environment), the teams (owner, admin, member - the three roles Better Auth ships with)
  and the rate limits (the OAuth start and the passkey challenges are limited like the credential
  endpoints).
- **The live-methods endpoint** `GET /api/auth/sign-in-methods`: the app asks the service what it
  can offer, so the build works before the founder has supplied the ids and the domains. A method
  that is off says why, in plain words.
- **The MFA challenge**: the enrolment (the secret and the backup codes, then the first code),
  the time code, the backup code, the account lockout after five wrong codes, and the refusal to
  turn the second factor off without the password.
- **The passkey ceremony**: the test plays the part of the phone - a P-256 key pair, the CBOR
  attestation, the signature - so the real verification of `@simplewebauthn/server` decides. The
  registration and the sign-in both pass; a challenge from another origin is refused.
- **The offline session** (`apps/mobile/src/lib/offline-session.ts`): the phone keeps a receipt of
  the last session the server confirmed. The app opens with it when there is no network, for
  twelve hours, and the app says it is offline.
- **The biometric unlock** (`apps/mobile/src/lib/biometric.ts`, `expo-local-authentication`
  58.0.2): a fingerprint or a face opens the app instead of a password. It is a convenience:
  "Not now" opens the app straight away.
- **The device store** (`apps/mobile/src/lib/session-storage.ts`): one wrapper with
  `AFTER_FIRST_UNLOCK`, so the session is readable while the phone is locked in the van (the
  upstream issue is better-auth #10382).
- **The sign-in screen** (`apps/mobile/app/(auth)/login.tsx`): Google, Apple, a passkey and the
  email address; the second factor step; the team picker; the error with a way out; the testIDs.
- **The CSRF check stays on in the tests**: the service keeps `advanced.disableOriginCheck` off
  and the test client sends the `expo-origin` header the app sends, so the suite proves the
  shape the phone really uses.

## Metrics vs targets

| Metric | Target | Today | Evidence |
|--------|--------|-------|----------|
| Auth service tests | all green, no skips | 59 pass | `pnpm --filter @courier/auth test` |
| Mobile tests | all green, no skips | 167 pass | `pnpm --filter mobile test` |
| Auth service coverage | >= 81 % lines | not measured this step | `pnpm coverage` |
| Sign-in methods on the service | Google, Apple, passkey, email | 4 (email live now, the other three need the founder's ids) | `services/auth/tests/social.test.ts`, `services/auth/tests/passkey.test.ts` |
| MFA | TOTP and backup codes | done | `services/auth/tests/mfa.test.ts` |
| Team roles | owner, admin, member | done | `services/auth/tests/organization.test.ts` |
| Rate limit on the OAuth start and the passkey challenge | limited | done | `services/auth/tests/rate-limit.test.ts` |
| Offline session | bounded, visible | 12 hours, banner in the app | `apps/mobile/src/lib/__tests__/offline-session.test.ts` |
| Biometric unlock | never required | done | `apps/mobile/src/lib/__tests__/biometric.test.ts` |
| Auth eval set (`docs/squads/payments/eval/auth/`) | 8 JSONL sets | **not built** | - |

## Next

1. The founder's ids and domains (`docs/status/FOUNDER_TODO.md`): Google and Apple client ids and
   secrets, the Apple team id, the passkey domain, the app store ids.
2. The passkey native module for the phone: React Native has no WebAuthn API, so the ceremony on
   a device needs the platform authenticator (Android Credential Manager, iCloud Keychain). Until
   then the passkey button says so and the rest of the sign-in carries on. See the ADR.
3. The `jwtClient()` path so the phone can present a token to the FastAPI API (the research's
   delta, not needed by the sign-in itself).
4. The auth eval set: the eight JSONL sets the research names.
5. E-mail verification for the invitations (ADR-A of the research is still a founder decision).
6. Account deletion in the app and on the web (a store requirement) and the data deletion job.

## Risks

- **The passkey button is honest but not usable on a phone yet.** The service side is complete and
  tested; the device needs the native authenticator. The button says so instead of failing.
- **No e-mail is verified.** `requireEmailVerification` is off, so an invitation can only be
  accepted by the account with the exact invited address (that is tested) but not by a *verified*
  address. The research calls this the highest-value regression test we owe (ADR-A).
- **The mobile app is not linted in CI** (`apps/mobile/package.json` has no `lint` script and
  `@courier/eslint-config` is not a dependency of the app). The new files were checked with the
  shared config by hand; the gap is a release risk.
- **A single test file cannot be run on its own** in the mobile app (`@babel/runtime` is only in
  the store, not hoisted): the whole suite has to run.
- The service still trusts the clock for the time code and the offline bound.
- The sign-in screen follows the mockup, but the shared `Button` swaps the label for the spinner
  while it works, and the mockup says the label stays. That is the component's behaviour, not
  this screen's; the design squad owns the fix.
