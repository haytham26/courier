# OWASP MASVS L1 self-review — `apps/mobile`

**What:** the MASVS L1 self-review AUDIT_2026-10-25 §B3 required before the beta ("Run an
OWASP MASVS L1 self-review of the app … the MASVS checklist with its evidence is in
`docs/security/`"). **When:** 2026-11-03, reviewed against `main` at `0d8431f` (PR #181's
base). **Owner:** backend squad. **Method:** manual review of `apps/mobile` (the Expo app:
`app.json`, `metro.config.js`, `src/`) against the OWASP MASVS v2 L1 controls, each row
carrying its evidence (file:line) or its gap. **Scope:** the shipped Android app
(`com.courier.copilot`); iOS is the same code with the same plugins (D43 plans the port).

A row is **Pass** only when the evidence names the code that satisfies the control; a
**Gap** names where the fix is tracked. Nothing here claims L2 (PARITY rows 195/197 hold
the L2 hardening — SQLCipher, Keystore key wrapping beyond the session, pinning, root
detection — as `Planned (task)`, T7.16).

## Summary

| MASVS group | L1 rows | Pass | Gap |
|---|---|---|---|
| MASVS-STORAGE | 2 | 1 | 1 |
| MASVS-CRYPTO | 1 | 1 | 0 |
| MASVS-AUTH | 3 | 3 | 0 |
| MASVS-NETWORK | 2 | 1 | 1 |
| MASVS-PLATFORM | 3 | 3 | 0 |
| MASVS-CODE | 3 | 3 | 0 |
| MASVS-RESILIENCE | 2 | 2 | 0 |
| MASVS-PRIVACY | 3 | 3 | 0 |

## MASVS-STORAGE

| Control | L1 requirement | Status | Evidence |
|---|---|---|---|
| MASVS-STORAGE-1 | Sensitive data (the session credential) is stored in the system credential storage (Keystore/Keychain), not in plaintext | **Pass** | `src/lib/session-storage.ts:27-29,42-50` — the one `deviceStore` wrapper over `expo-secure-store` with `keychainAccessible: AFTER_FIRST_UNLOCK` (the deliberate, documented change from `WHEN_UNLOCKED`: a courier's phone is locked in the van all shift; upstream better-auth #10382). Test: `src/lib/__tests__/auth-client-storage.test.ts` (BUG-078: the raw module was handed over before, so the options never reached the client's writes). |
| MASVS-STORAGE-2 | No sensitive data in backups or external storage | **Gap** | The on-device run cache and event log are plaintext op-sqlite (`src/sync/eventSchema.ts`, `src/run/opSqliteRunCache.ts`) — acceptable for L1 only because the data is the courier's own day, but encryption at rest is the L2 item: **PARITY 195** (`Planned (task)`, T7.16: SQLCipher). `app.json`'s `android` block does not set `allowBackup: false`, so Android's default (auto backup to Drive) applies to that plaintext DB — flagged for the lead's app slice; the fix is one line in `app.json` plus a test in the E2E build. |

## MASVS-CRYPTO

| Control | L1 requirement | Status | Evidence |
|---|---|---|---|
| MASVS-CRYPTO-1 | No hard-coded keys; only platform-approved crypto | **Pass** | The app holds no keys at all: the session credential lives in the Keystore via `expo-secure-store`, tokens are verified server-side by JWKS (`services/api/app/auth/jwks.py`, `services/courier-voice/app/auth.py`); no custom crypto anywhere in `src/` (reviewed — no `crypto`/`createHash`/`pbkdf2` usage). |

## MASVS-AUTH

| Control | L1 requirement | Status | Evidence |
|---|---|---|---|
| MASVS-AUTH-1 | The app enforces the server-side auth: every API call carries the credential | **Pass** | `src/lib/api-client.ts:78-84` — `getToken` defaults to `sessionToken()` and the request builds the `Authorization: Bearer` header per call; a 401 maps to the `unauthorized` outcome and the app never retries with a different identity (`ApiOutcome`, lines 42-52). |
| MASVS-AUTH-2 | The credential is not stored in plaintext (see STORAGE-1) and is not logged | **Pass** | Keystore via `session-storage.ts`; log review: the only session-related log lines are `console.warn` carrying an error message, never a token (`src/sync/driverSession.ts:45`, `src/providers/AuthProvider.tsx:413`). |
| MASVS-AUTH-3 | Logout invalidates the local session | **Pass** | `clearStoredValue` (`session-storage.ts:88-107`): sign-out deletes the receipt and a failed delete is surfaced to the caller, not swallowed (BUG-077); the warn at `AuthProvider.tsx:413` is that surfacing. |

## MASVS-NETWORK

| Control | L1 requirement | Status | Evidence |
|---|---|---|---|
| MASVS-NETWORK-1 | All network traffic uses TLS | **Pass (release config)** | The release base URL comes from `EXPO_PUBLIC_API_URL`, inlined at build time (`src/lib/api-client.ts:37-40,79`); the dev fallback `http://localhost:8000` (line 28) is loopback-only and not shippable. Note for the lead: no `networkSecurityConfig` is set, so cleartext is not globally refused — the app only ever calls the configured base URL, and refusing cleartext platform-wide is a one-line manifest addition queued with the app slice. |
| MASVS-NETWORK-2 | Certificate pinning for the app's own host | **Gap** | Not built — **PARITY 197** (`Planned (task)`, T7.16: pinning plus a documented rotation procedure so a pinned app cannot be bricked by an expiring cert). |

## MASVS-PLATFORM

| Control | L1 requirement | Status | Evidence |
|---|---|---|---|
| MASVS-PLATFORM-1 | The app only exports the components it intends; deep links are validated | **Pass** | `app.json` declares one scheme (`courier`, line 9) and it is used only as the OAuth redirect target of the Better Auth client (`src/lib/auth-client.ts:61,286`) — no `Linking` handler consumes untrusted URLs as data (reviewed: the only `scheme` reads are that redirect). No exported activities beyond the expo-router screens. |
| MASVS-PLATFORM-2 | WebViews are not used with exposed JS bridges | **Pass** | No WebView anywhere (`react-native-webview` absent from `package.json`; no `WebView` import in `src/`). |
| MASVS-PLATFORM-3 | Every permission has a user-facing purpose string | **Pass** | `app.json:14-20` (iOS `NS*UsageDescription` for location, microphone, speech recognition, camera) and `:33-43` (Android permissions) with the plugin strings at `:52-68` (location always-and-when-in-use, microphone). |

## MASVS-CODE

| Control | L1 requirement | Status | Evidence |
|---|---|---|---|
| MASVS-CODE-1 | No debug/diagnostic screens in the release bundle | **Pass** | `src/config/buildFlags.ts:13-14` — `DEV_SCREENS_IN_BUNDLE` is true only when `EXPO_PUBLIC_DESIGN_LAB`/`EXPO_PUBLIC_E2E` are inlined as `1` (dev/E2E builds); `metro.config.js:32-33` excludes `app/design/**` and `app/compat.tsx` from the bundle entirely. |
| MASVS-CODE-2 | No secrets embedded in the app | **Pass** | The CI `no secrets in git` gate scans every PR; all secrets are server-side or EAS env (`EXPO_PUBLIC_*` carries only the public base URL). No API keys in `src/` (reviewed; the server keys live in `services/*/.env.local` / GitHub Secrets). |
| MASVS-CODE-3 | No test keys or backdoors | **Pass** | Test-only placeholders exist solely in test conftests (`services/api/tests/conftest.py:15-21`, `services/courier-voice/tests/conftest.py:11-13`) and never reach a build; the E2E gate `EXPO_PUBLIC_E2E=1` build is the only one that carries the diagnostics, per `buildFlags.ts`. |

## MASVS-RESILIENCE

| Control | L1 requirement | Status | Evidence |
|---|---|---|---|
| MASVS-RESILIENCE-1 | Input from the server/IPC is validated before use | **Pass** | The generated client validates every response with its type guards before handing it on (`src/lib/api-client.ts:97` — `isRun` and siblings in `packages/shared/src/generated/api.ts`); the OCR/intake answer is discriminated by shape on the server (`services/api/app/responses.py`), and the phone branches on the union, never on optional fields. |
| MASVS-RESILIENCE-2 | The app degrades safely on bad input (no crash on malformed server answers) | **Pass** | A non-contract 200 is the `server` outcome (`api-client.ts:67,50`), an unmappable event is `unmappable` (line 52), and offline/timeout are first-class outcomes (lines 48-49) — the sync layer replays the event log instead of dropping it (`src/sync/`). |

## MASVS-PRIVACY

| Control | L1 requirement | Status | Evidence |
|---|---|---|---|
| MASVS-PRIVACY-1 | The app explains and minimises what it collects (location, mic, camera) | **Pass** | Purpose strings for every permission (`app.json:14-20`, plugin strings `:52-68`); location is used for door memory and geofences during shifts only (background modes `location`, `audio`, line 15); no analytics, tracking or crash-reporting SDK exists in `package.json` (reviewed — no posthog/segment/sentry/crashlytics). |
| MASVS-PRIVACY-2 | No unique device identifiers are shared with third parties | **Pass** | No analytics/ads SDK (above); the only outbound calls are to the Courier API and the voice service with the courier's own token (`src/lib/api-client.ts`, `src/voice/courierVoiceClient.ts`). |
| MASVS-PRIVACY-3 | Audio is not stored on the device by default | **Pass** | The microphone streams to the voice service as bytes in the turn request; no audio file is written anywhere in `src/` (reviewed: no `expo-file-system` write of audio, no `writeAsStringAsync` in `src/voice/`); the POD photo goes to the API's object store, not the gallery. |

## Gaps and where they are tracked

| Gap | Tracked at |
|---|---|
| Local DB encryption at rest (SQLCipher) | PARITY 195, `Planned (task)`, T7.16 |
| `android:allowBackup: false` + a network-security config refusing cleartext | the lead's app slice (one line each in `app.json` / `android/`), noted here so the L2 pass picks them up |
| Certificate pinning for our API host | PARITY 197, `Planned (task)`, T7.16 |
| Root/emulator/hook detection (signal, not CI-blocking) | PARITY 195, T7.16 |

## B3's done-when

AUDIT_2026-10-25 §B3: "BUG-059 is closed with tests, and the MASVS checklist with its
evidence is in `docs/security/`." Both halves land in PR #181: the tests are
`services/api/tests/test_fixture_hoist.py` (the fixture pin) and
`services/courier-voice/tests/test_http.py::test_the_driver_settings_store_is_bounded`
(the bounded store), and this file is the checklist with its evidence.
