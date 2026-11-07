# BUG-275 evidence — the MASVS L2 review (matrix) + the recorded scope decision (ADR-029 / D66)

2026-11-08, reviewed against `main` at `7fdccd2`. All findings below are grep-verifiable
against the pinned tree; every command was run read-only in the repo.

## 1. The headline finding: SQLCipher is linked but NOT enabled (the DB is plaintext)

- `apps/mobile/package.json:12` — `@op-engineering/op-sqlite` pinned at `18.2.5`.
- `apps/mobile/node_modules/@op-engineering/op-sqlite/android/CMakeLists.txt:6,54-58` —
  the Android build compiles `../cpp/sqlcipher/sqlite3.c` under `if (USE_SQLCIPHER)` and
  defines `OP_SQLITE_USE_SQLCIPHER=1` / `SQLITE_EXTRA_INIT=sqlcipher_extra_init`:
  **SQLCipher is linked into the APK.**
- `apps/mobile/node_modules/@op-engineering/op-sqlite/lib/typescript/src/types.d.ts:14-16`
  — `encryptionKey?: string;` with the doc "Encryption key when used against backends
  that support encryption (sqlcipher or libsql)": the key is **optional**; without it the
  file is plain sqlite. `isSQLCipher()` exists at `lib/typescript/src/functions.d.ts:59`.
- `apps/mobile/src/sync/dbConnections.ts:50` — the app's ONE open site:
  `entry = { database: open({ name }), users: 0 };` — **no `encryptionKey`**.
- Grep `encryptionKey` over `apps/mobile/src` → **zero matches**. So `courier.db` is
  plaintext at rest, while `dbConnections.ts:8` and `src/sync/opSqliteEventStore.ts:4`
  call it "the SQLCipher file" — the overclaim the L2 matrix corrects (the fix:
  `expo-crypto` CSPRNG key kept in the Android Keystore via `session-storage.ts`, then
  `open({ name, encryptionKey })`, plus `android:allowBackup="false"`).

## 2. Already satisfied (recorded as Pass in the matrix)

- Cleartext refused platform-wide except the emulator's own loopback alias:
  `apps/mobile/plugins/withEmulatorCleartext.js:16-22` (config permits
  `cleartextTrafficPermitted="true"` **only** for domain `10.0.2.2`,
  `includeSubdomains="false"`), wired at `:31` (`android:networkSecurityConfig`) and
  written at `:46`. Test: `apps/mobile/plugins/__tests__/withEmulatorCleartext.test.js:29,45`.
  Grep `usesCleartextTraffic` in `apps/mobile/app.json` → zero matches. Production base
  URLs are https, inlined at build time (`src/lib/api-client.ts:37-40,79`; A5 pins them to
  the staging domain, BUG-272).
- Session credential in the Android Keystore: `apps/mobile/src/lib/session-storage.ts:27-29`
  (`keychainAccessible: AFTER_FIRST_UNLOCK`) and `:42-50` (the one `deviceStore` wrapper
  over `expo-secure-store 58.0.2`, `apps/mobile/package.json`); test
  `src/lib/__tests__/auth-client-storage.test.ts` (BUG-078).
- No secrets in the release artefact: CI `no secrets in git` (gitleaks) gate on every PR;
  `EXPO_PUBLIC_*` carries only public base URLs.
- No WebView (`react-native-webview` absent from `package.json`); dev screens out of the
  release bundle (`src/config/buildFlags.ts:13-14`, `metro.config.js:32-33`).

## 3. The gaps (zero-match greps over `apps/mobile/src`, `apps/mobile/plugins`, `app.json`)

Case-insensitive grep for
`allowBackup|proguard|minifyEnabled|enableR8|FLAG_SECURE|playIntegrity|app-integrity|ssl-pinning|device-info|encryptionKey`
over `apps/mobile/src` and `apps/mobile/plugins`, and for `allowBackup|usesCleartextTraffic`
in `apps/mobile/app.json`: **zero matches everywhere**. So none of these L2 controls is
built: `allowBackup: false` (Android auto-backup to Drive applies to the plaintext DB),
certificate pinning (PARITY 197), root/emulator/hook signal (PARITY 195), R8 obfuscation
(PARITY 195), FLAG_SECURE on sensitive screens, Play Integrity attestation (PARITY 198),
App Link / Universal Link for `courier://` (PARITY 196). `expo-crypto` is **not** a
dependency yet (it is the adopted CSPRNG for the DB key, research shortlist C1+C2);
`@expo/app-integrity`, `react-native-ssl-pinning`, `react-native-device-info` are absent —
all on the radar in `docs/research/2026/security-hardening.md`.

## 4. Where the gaps are tracked

`docs/status/PARITY.md:257-260` — rows 195 (L2 mobile hardening), 196 (deep-link
protection), 197 (certificate pinning), 198 (app attestation), all `Planned (task)`,
T7.16. They stay `Planned (task)`: the matrix (PARITY 195's done-when) is published by
this PR (`docs/security/MASVS-L2.md`), the hardening itself is the lead's app slice per
ADR-029 / D66. Founder-blocked pieces (Play Console, release keystore) are already in
`docs/status/FOUNDER_TODO.md`.

## 5. Gates on the PR (docs-only)

`node scripts/ci/check-parity.mjs --base origin/main` → 0 reopened;
`check-doc-links.mjs`, `check-control-chars.mjs`, `check-mojibake.mjs`,
`check-floor.mjs origin/main` → all clean. Mutation floors skip by design (no code
changed).
