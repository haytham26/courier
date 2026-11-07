# ADR-029 — MASVS L2 scope decision: the backend publishes the control matrix now; the hardening is the lead's app slice; PARITY 195–198 stay Planned

**Date:** 2026-11-08 · **Status:** Accepted · **Deciders:** backend squad, per the
2026-11-05 audit queue item 7 ("MASVS L2 **or a recorded decision**") · **Extends:**
D43 (the app's port plan), the MASVS v2.1.0 adoption in
`docs/research/2026/security-hardening.md` (V2), the L1 review
`docs/security/MASVS-L1.md` (PR #181, B3's done-when)

## Context

The queue allows "MASVS L2 **or a recorded decision**". The L2 mobile controls are
almost all app-side (SQLCipher at rest, `allowBackup`, cleartext policy, pinning,
root/emulator signal, R8, Play Integrity, FLAG_SECURE), and the app is the lead's slice —
the L1 review already flagged `allowBackup` + the network-security config as "the lead's
app slice". What the backend squad owns is `docs/security/`: the review itself. So this
PR delivers **both** halves the queue allows: the L2 control review
(`docs/security/MASVS-L2.md` — the matrix mapping every L2-relevant control to a MASVS
id, a status, an evidence/test id and an owner, which is PARITY 195's done-when) and
this recorded decision scoping the work.

The review's headline finding: op-sqlite 18.2.5 links SQLCipher on Android
(`USE_SQLCIPHER` in its CMakeLists) but encryption engages only with an
`encryptionKey`, and the app's one open site (`src/sync/dbConnections.ts:50`) passes
none — so `courier.db` is plaintext while the sync comments call it "the SQLCipher
file". Filed as BUG-275; the fix is in the app slice below.

## Decision

1. **The backend squad delivers the L2 matrix now** (`docs/security/MASVS-L2.md`):
   summary per MASVS group, per-control rows with status/evidence/gap, and the mapping
   control → MASVS id → test id → owner. This satisfies the queue item as a review plus
   a recorded decision; no control status in PARITY is flipped by it.
2. **The L2 hardening itself is the lead's app slice**, each item with its file target:
   - DB at rest: `expo-crypto` (CSPRNG, adopted in the research shortlist, not yet a
     dependency) generates the key, `expo-secure-store` via the existing
     `session-storage.ts` wrapper keeps it in the Android Keystore, and
     `open({ name, encryptionKey })` in `dbConnections.ts` turns SQLCipher on;
     `android:allowBackup="false"` in `app.json` + an E2E assertion (PARITY 195).
   - Cleartext: **already satisfied** — `plugins/withEmulatorCleartext.js` refuses
     cleartext platform-wide except the emulator's own `10.0.2.2` (tested); recorded as
     Pass in the matrix.
   - Certificate pinning for the API host with a documented rotation procedure
     (`react-native-ssl-pinning` or `expo-build-properties`; PARITY 197).
   - Root/emulator/hook detection as a **signal only, never blocking the CI emulator**
     (`react-native-device-info`; PARITY 195).
   - R8 obfuscation via `expo-build-properties` in the EAS build config (PARITY 195).
   - FLAG_SECURE on sensitive screens (with PARITY 195).
   - Deep-link verification via Android App Link / iOS Universal Link instead of the
     bare `courier://` scheme (PARITY 196).
   - Play Integrity attestation via `@expo/app-integrity` 58.0.2 with a **server-side
     verdict and a blank verdict treated as a signal, not a block**, so the CI emulator
     keeps working (PARITY 198; needs the Play Console — FOUNDER_TODO).
3. **PARITY 195–198 stay `Planned (task)` (T7.16)** until the app slice lands. The beta
   bar is: matrix published (done here) + the app slice merged with its tests. The
   signing keystore and Play Console stay founder-blocked (FOUNDER_TODO) and gate only
   the *store* release (P6/P7), not the L2 review.
4. **The overclaim is corrected, not hidden:** the sync module comments that call
   `courier.db` "the SQLCipher file" are wrong until the key exists; the matrix states
   the true state (linked-but-inert SQLCipher, plaintext file) and BUG-275 carries the
   fix. The comments get corrected in the app slice's PR, not silently here.

## Consequences

- `docs/security/MASVS-L2.md` is the L2 checklist with evidence, beside `MASVS-L1.md`;
  `docs/README.md` names both.
- BUG-275 filed (the L2 state was unverified + the SQLCipher overclaim); evidence in
  `docs/evidence/masvs-l2/` (the grep trail: no `encryptionKey`/`allowBackup`/pinning/
  R8/FLAG_SECURE/attestation in the app; the package contract that encryption is
  key-gated; the network-security-config scope).
- No code changes in this PR (docs + registers only), so the mutation floors skip by
  design; parity guard 0 reopened; doc-links/control-chars/mojibake/floor clean.
- The lead's slice, when it lands, flips PARITY 195–198 per their own done-whens with
  tests, and the matrix rows flip to Pass with the same evidence standard as L1.
