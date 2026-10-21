# Security Squad - decisions

The decisions this squad owns, with the reason and the date.

| # | Decision | Why | Where |
|---|----------|-----|-------|
| S1 | The app asks the **service** which sign-in methods are live (`GET /api/auth/sign-in-methods`) instead of reading its own environment | The build has to work before the founder supplies the Google and Apple client ids and the passkey domain, and the ids must never be in the app's own configuration | `services/auth/src/sign-in-methods.ts` |
| S2 | A method that is off keeps its place on the screen with a plain reason | The courier is never left wondering why a button does nothing | `apps/mobile/app/(auth)/login.tsx` |
| S3 | The **origin check stays on in the tests** (`advanced.disableOriginCheck: false`) and the test client sends the `expo-origin` header | The suite has to prove the request shape the phone really uses, not a shape the test invented | `services/auth/src/options.ts`, `services/auth/tests/helpers.ts` |
| S4 | One device store wrapper, shared everywhere, with `AFTER_FIRST_UNLOCK` | The Expo client keys its write queue by the storage object; a second wrapper would split the queue. The default `WHEN_UNLOCKED` fails while the phone is locked in the van (better-auth #10382) | `apps/mobile/src/lib/session-storage.ts` |
| S5 | The offline session is a **receipt** next to the cookie, bounded to twelve hours, and the app says it is offline | A courier has to keep working in the dead zones, but the app must never pretend the server confirmed the session | `apps/mobile/src/lib/offline-session.ts` |
| S6 | The biometric unlock is a convenience: "Not now" opens the app, and a phone without a scanner never shows it | A convenience must never become a lock-out | `apps/mobile/src/lib/biometric.ts`, `apps/mobile/src/components/BiometricUnlock.tsx` |
| S7 | The passkey **server** side is complete; the phone keeps the button disabled with a reason until the native authenticator is in | React Native has no WebAuthn API. The research flagged the native module as a decision of its own (ADR) | `docs/adr/ADR-006-complete-sign-in.md` |
| S8 | The three team roles are the ones Better Auth ships with: owner, admin, member | No custom role system until a courier company asks for one | `services/auth/src/options.ts` |
| S9 | The backup codes are stored encrypted | A backup code is a credential | `services/auth/src/options.ts` |

## The decisions that belong to the founder

| # | Open question | Where |
|---|---------------|-------|
| A | E-mail verification for the invitations (`requireEmailVerification`) | `docs/research/2026/auth-better-auth-ecosystem.md` §9 (ADR-A) |
| B | The native passkey module for the phone | `docs/adr/ADR-006-complete-sign-in.md` |
| C | The bump of Better Auth 1.7.10 to 1.7.12 | `docs/research/2026/auth-better-auth-ecosystem.md` §9 (ADR-D) |
