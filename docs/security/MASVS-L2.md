# OWASP MASVS L2 review — `apps/mobile` (the matrix PARITY 195's done-when asks for)

**What:** the MASVS **L2** control review that the founder's 2026-11-05 audit queue item 7
("MASVS L2 or a recorded decision") asks for. **When:** 2026-11-08, reviewed against `main`
at `7fdccd2` (PR #272's head). **Owner:** backend squad (this document); the app-side
controls it names are the **lead's app slice**. **Method:** manual review of
`apps/mobile` (`app.json`, `plugins/`, `src/`) and of the pinned dependencies against the
OWASP MASVS v2.1.0 L2 expectations (the control set adopted in
`docs/research/2026/security-hardening.md` V2), each row carrying its evidence (file:line)
or its gap and where the gap is tracked. **Scope:** the shipped Android app
(`com.courier.copilot`); iOS is the same code with the same plugins (D43).

A row is **Pass** only when the evidence names the code that satisfies the control. This
document is the **matrix**: every L2-relevant control is mapped to its MASVS id, its
status, its evidence or test id, and its owner. The recorded scope decision is
ADR-029 (D66). PARITY rows 195–198 stay `Planned (task)` (T7.16) until the lead's app slice
lands — publishing the matrix is row 195's done-when, not the hardening itself.

## The headline finding

**The on-device database is not actually encrypted.** op-sqlite 18.2.5 is pinned
(`apps/mobile/package.json:12`) and its Android build **links SQLCipher**
(`node_modules/@op-engineering/op-sqlite/android/CMakeLists.txt:6,54-58` —
`USE_SQLCIPHER` compiles `cpp/sqlcipher/sqlite3.c` and defines
`OP_SQLITE_USE_SQLCIPHER=1`; `isSQLCipher()` exists at
`lib/typescript/src/functions.d.ts:59`). But encryption only engages when an
`encryptionKey` is passed (`lib/typescript/src/types.d.ts:14-16`: "Encryption key when
used against backends that support encryption (sqlcipher or libsql)" — **optional**), and
the app's one open site passes none: `sharedDatabase` calls `open({ name })`
(`apps/mobile/src/sync/dbConnections.ts:50`). So `courier.db` is a **plaintext** file,
while the comments in `dbConnections.ts:8` and `opSqliteEventStore.ts:4` call it "the
SQLCipher file" — an overclaim this review corrects. The fix is the app slice's: generate
the key with `expo-crypto` (adopted in the research shortlist C1+C2; **not yet a
dependency**) and keep it in the Android Keystore through the existing
`expo-secure-store` wrapper (`src/lib/session-storage.ts:27-29,42-50`), then open with
`open({ name, encryptionKey })`, plus `android:allowBackup="false"` in `app.json`.
A grep of `apps/mobile/src`, `apps/mobile/plugins` and `app.json` for `encryptionKey`
returns zero matches.

## Summary

| MASVS group | L2-relevant rows | Pass | Gap |
|---|---|---|---|
| MASVS-STORAGE | 2 | 0 | 2 |
| MASVS-CRYPTO | 1 | 1 | 0 |
| MASVS-NETWORK | 2 | 1 | 1 |
| MASVS-PLATFORM | 3 | 1 | 2 |
| MASVS-CODE | 2 | 1 | 1 |
| MASVS-RESILIENCE | 1 | 0 | 1 |
| MASVS-PRIVACY | 1 | 0 | 1 |

## The matrix

### MASVS-STORAGE

| Control | L2 requirement | Status | Evidence / test id | Owner, tracked at |
|---|---|---|---|---|
| MASVS-STORAGE-1 | Sensitive data in system credential storage (Keystore) | **Pass** | `src/lib/session-storage.ts:27-29,42-50` — the one `deviceStore` wrapper over `expo-secure-store` with `keychainAccessible: AFTER_FIRST_UNLOCK`; test `src/lib/__tests__/auth-client-storage.test.ts` (BUG-078) | done (L1 review, PR #181) |
| MASVS-STORAGE-2 | No sensitive data in backups or external storage; local DB encrypted at rest | **Gap** | DB opened with no `encryptionKey` (`src/sync/dbConnections.ts:50`; package contract `types.d.ts:14-16`, `CMakeLists.txt:6,54-58`); `app.json:23-44` sets no `android:allowBackup`, so Android auto-backup to Drive applies to the plaintext DB. Grep for `encryptionKey`/`allowBackup` in `src`, `plugins`, `app.json`: zero matches. Fix: `expo-crypto` CSPRNG key in Keystore via `session-storage.ts`, `open({ name, encryptionKey })`, one-line `allowBackup: false` + an E2E assertion | lead's app slice — **PARITY 195**, `Planned (task)`, T7.16 |

### MASVS-CRYPTO

| Control | L2 requirement | Status | Evidence / test id | Owner, tracked at |
|---|---|---|---|---|
| MASVS-CRYPTO-1 | No hard-coded keys; platform-approved crypto only; keys in Keystore | **Pass** (session) / **Gap** (DB key, see STORAGE-2) | App holds no keys: session credential in Keystore (above), tokens verified server-side by JWKS (`services/api/app/auth/jwks.py`, `services/courier-voice/app/auth.py`); no custom crypto in `src/`. The DB key does not exist yet because the DB is not encrypted yet — same fix as STORAGE-2 | lead's app slice — PARITY 195 |

### MASVS-NETWORK

| Control | L2 requirement | Status | Evidence / test id | Owner, tracked at |
|---|---|---|---|---|
| MASVS-NETWORK-1 | Cleartext refused platform-wide; TLS everywhere | **Pass (scoped)** | `plugins/withEmulatorCleartext.js:16-22,31,46` writes a `network-security-config` permitting cleartext **only to `10.0.2.2`** (the emulator's alias for the host loopback, reachable only inside an emulator); the base config blocks cleartext everywhere else, and no `usesCleartextTraffic` is set (`app.json` grep: zero). Production base URLs are https, inlined at build time (`src/lib/api-client.ts:37-40,79`; A5 pins them to the staging domain, BUG-272). Test: `plugins/__tests__/withEmulatorCleartext.test.js:29,45` | done on main (the E2E exception is deliberate: run 41407217039's register submit failed on cleartext to 10.0.2.2) |
| MASVS-NETWORK-2 | Certificate pinning for the app's own API host, with a rotation procedure so a pinned app cannot be bricked | **Gap** | No pinning anywhere (`ssl-pinning` grep: zero matches; `expo-network` is present but unused for this). Candidate: `react-native-ssl-pinning` or `expo-build-properties` + pin set, both on the research radar (`security-hardening.md` "on the radar") | lead's app slice — **PARITY 197**, `Planned (task)`, T7.16 |

### MASVS-PLATFORM

| Control | L2 requirement | Status | Evidence / test id | Owner, tracked at |
|---|---|---|---|---|
| MASVS-PLATFORM-1 | Only intended components exported; deep links verified (App Link / Universal Link, not a bare custom scheme) | **Pass (exported components)** / **Gap (link verification)** | One scheme `courier` (`app.json:9`) used only as the OAuth redirect; no exported activities beyond expo-router screens; no `Linking` handler consumes untrusted URLs. But `courier://` is a hijackable custom scheme — App Link / Universal Link is not built | lead's app slice — **PARITY 196**, `Planned (task)`, T7.16 |
| MASVS-PLATFORM-2 | WebViews not used with exposed bridges | **Pass** | No WebView anywhere (`react-native-webview` absent; no `WebView` import) — L1 row, still true | done |
| MASVS-PLATFORM-3 | Root/emulator/hook detection as a **signal** (never blocking the CI emulator) | **Gap** | No detection (`device-info` grep: zero matches; `react-native-device-info` on the radar). Constraint from SAAS_CHECKLIST: signal only, the CI emulator must keep working | lead's app slice — **PARITY 195**, `Planned (task)`, T7.16 |

### MASVS-CODE

| Control | L2 requirement | Status | Evidence / test id | Owner, tracked at |
|---|---|---|---|---|
| MASVS-CODE-2 | No secrets in the release artefact | **Pass** | CI `no secrets in git` gate (gitleaks) on every PR; `EXPO_PUBLIC_*` carries only public base URLs; server keys in `.env.local`/GitHub Secrets (FOUNDER_TODO) | done (gate) |
| MASVS-CODE-3 | No debug/diagnostic artefacts in the release bundle; release obfuscated (R8) | **Pass (debug screens)** / **Gap (obfuscation)** | `src/config/buildFlags.ts:13-14` + `metro.config.js:32-33` keep dev screens out of the bundle. But no Proguard/R8 config exists in the repo (`proguard`/`minifyEnabled`/`enableR8` grep: zero matches; `expo-build-properties` on the radar) — release builds ship un-obfuscated | lead's app slice / EAS build config — **PARITY 195** |

### MASVS-RESILIENCE

| Control | L2 requirement | Status | Evidence / test id | Owner, tracked at |
|---|---|---|---|---|
| MASVS-RESILIENCE-3 | Tamper/integrity detection with a server-side verdict; a blank verdict is a signal, not a block | **Gap** | No attestation (`app-integrity`/`playIntegrity` grep: zero matches). Adopted path: `@expo/app-integrity` 58.0.2 (research V7+V8) with the verdict checked server-side and blank = log, never block, so the CI emulator keeps working. Needs the Play Console (FOUNDER_TODO: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64`) | lead's app slice + founder (Play Console) — **PARITY 198**, `Planned (task)`, T7.16 |

### MASVS-PRIVACY

| Control | L2 requirement | Status | Evidence / test id | Owner, tracked at |
|---|---|---|---|---|
| MASVS-PRIVACY-4 | Sensitive screens protected from screenshots/recents (`FLAG_SECURE`) | **Gap** | `FLAG_SECURE` grep over `src`: zero matches | lead's app slice — with PARITY 195 (screenshot protection is in the SAAS_CHECKLIST mobile line) |

## What this review delivers vs what stays open

- **Delivered now (this PR):** this matrix — every L2-relevant control mapped to a MASVS
  id, a status, an evidence/test id and an owner (PARITY 195's done-when, published) —
  plus the recorded scope decision ADR-029 (D66). The headline finding (SQLCipher linked
  but not enabled; the "SQLCipher file" comments overclaim) is corrected here and filed as
  BUG-275.
- **Stays open, owned by the lead's app slice:** DB `encryptionKey` + `allowBackup:
  false` + FLAG_SECURE (PARITY 195), deep-link verification (PARITY 196), certificate
  pinning with rotation (PARITY 197), root/emulator signal (PARITY 195), R8 via
  `expo-build-properties` (PARITY 195), Play Integrity attestation with a server-side
  verdict (PARITY 198 — also founder-blocked on the Play Console).
- **Unchanged:** PARITY 195–198 keep `Planned (task)` / T7.16 — no status is flipped by
  publishing the matrix; the hardening itself is the app slice's work, and the beta bar
  is recorded in ADR-029.
