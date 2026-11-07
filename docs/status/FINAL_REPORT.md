# FINAL_REPORT — Courier Copilot, for the founder

Written 2026-11-08 by the lead executor, at `origin/main` = `3525a50` (PR #266).
This is the §6 Definition-of-Done report: **what was built, the scores, how to
install, and what only you can do.** Everything claimed here names its merge PR
or CI run; the acceptance record is
[`docs/evidence/acceptance/README.md`](../evidence/acceptance/README.md), the
scores are [`docs/status/QUALITY_SCORECARD.md`](./QUALITY_SCORECARD.md), the
market position is [`docs/status/PARITY.md`](./PARITY.md), the bugs are
[`docs/status/BUGS.md`](./BUGS.md), and your to-do list is
[`docs/status/FOUNDER_TODO.md`](./FOUNDER_TODO.md).

## 1. What is built and shipped on `main`

The driver-day loop, end to end, on the CI emulator (21/21 Maestro flows on
**both** api-34 and api-35 legs, run 42380615185 on PR #261's head; A1 no-mock
green, run 42363101590):

- **Auth & account** — Better Auth service: Google, Apple, passkeys, email,
  MFA, the offline session, biometric unlock, teams
  (`docs/squads/security/STATUS.md`).
- **Today / run** — the day seeded by the real API, the list, the detail sheet,
  failed-delivery with its reason (ADR-023), end-of-day summary
  (flows `today-list`, `today-fail`, `summary`).
- **Stops / route** — the timeline with the three states, the spreadsheet
  **import** (paste CSV → count + ignored columns; BUG-197 fixed: the sheet
  rides above the soft keyboard on the small screen), **Optimise** against the
  real solver (PyVRP; the A1 `optimise` flow asserts the server-held run is
  resequenced), the planned break (server columns → cache → `stops-break`,
  asserted by `stops.yaml`).
- **Driving** — the 04 screen day/night, nav hand-off, voice camera control
  (flows `driving`, `driving-night`, `nav-handoff`).
- **Scan / POD** — label scan with the eval set (330 synthetic labels, CI-checked)
  and proof-of-delivery photos (flows `scan`, `pod`).
- **Voice** — the on-device engine (sherpa-onnx + Kokoro, Apache-2.0; Smart
  Turn v3, BSD-2-Clause) plus the live assistant in the shipped build (founder
  decision D1, PR #244) with the §22 app half (pre-classifier, ask-on-low-
  confidence, visible/clearable memory, PR #256). Eval set: 600 utterances from
  open data, measured per slice (§3 below).
- **Offline & sync** — the op-sqlite event log; proven with zero data loss by
  the A1 no-mock run: 3 deliveries online on the real API, network cut, a 4th
  delivery held on the phone, network back, the held row lands in Postgres
  (`delivery_events` asserted, `.maestro/run-a1.sh`).
- **Maps** — 2D/3D/Satellite/Auto modes with per-driver memory and 3D buildings;
  the Canterbury PMTiles pack itself is the T5 weekly job (not yet built).
- **Address** — the D8 engine over **225,151 real LINZ Christchurch addresses**:
  **98.3 %** accuracy on the sampled real data
  ([`docs/evidence/phase-2.3/linz-accuracy.md`](../evidence/phase-2.3/linz-accuracy.md)).
- **Design & quality gates** — the one token file drives every screen; the
  visual-regression gate (`scripts/ci/check-visual-baselines.mjs`, BUG-203) is
  live with 4 committed baselines (small day/night × 03-today/04-driving;
  determinism 0.077–0.186 % vs the 0.5 % tolerance); 8 large/200 % views are
  pending the second AVD profile (BUG-270). CI on every PR: lint, typecheck,
  tests, coverage ratchet (floor 81), floor guard, licences (0 copyleft),
  dependency audits, Semgrep/Bandit, CodeQL, gitleaks, the mutation floors on
  changed scopes (PR #263), the APK build, the emulator legs, A1, the
  recordings.
- **Handover** — [`docs/HANDOVER.md`](../HANDOVER.md) (BUG-034): run, deploy,
  keys, map updates, acceptance, the release order.

## 2. The scores (scorecard refreshed 2026-11-08)

| Dimension | Rating (of 10) | Headline number |
|---|---|---|
| Voice and hands-free | ■■■□□ (6) | WER 14.75 % quiet / **28.0 % van** / 12.5 % mix; false-action 0–0.83 %; intent is a template ceiling (BUG-210) |
| Address accuracy | ■■■■□ (8) | **98.3 %** D8 on real LINZ, 225,151 addresses indexed |
| Route quality and speed | ■■□□□ (4) | real solver, A1-proven; no VRP eval set yet |
| Offline and reliability | ■■■□□ (6) | **0 data loss** proven by A1; PMTiles pack pending |
| Safety, privacy and trust | ■■■■□ (8) | 0 unaccepted advisories, tenant-isolation tests green, 0 copyleft |
| Delivery, evidence and design | ■■■■□ (8) | 21/21 flows × both api legs + A1 green; APK 44.1 MB |

The §6 bar is ≥ 8/10 on every dimension: **address, safety, delivery are there;
voice (van-noise WER), routing (eval set) and offline (map pack) are measured
and below it, each with a named owner and gate** — full detail in
[`QUALITY_SCORECARD.md`](./QUALITY_SCORECARD.md).

## 3. Acceptance evidence

- Emulator: run **42380615185** (PR #261 head `20bead8`) — 21/21 flows api-34 +
  api-35, artifacts `android-e2e-evidence-api34/35`; A1 artifact
  `android-e2e-evidence-a1` (online/optimise/offline/sync junit SUCCESS +
  Postgres asserts). Earlier green head: run 42363101590 (`259f346`, PR #259).
- Screen sizes: **small (320×640) only** — every emulator lane boots the one
  pinned AVD. The large-screen leg is **BUG-270** (platform-owned: the second
  AVD profile in `.github/workflows/`; the flows need no change).
- Real phone: `docs/operations/ACCEPTANCE_TEST.md` — your 30 minutes (audit A6).

## 4. How to install

The release APK of every merge to `main` is at the stable link
**https://github.com/haytham26/courier/releases/download/latest/courier.apk**
(unsigned until the keystore secrets exist — it installs on a phone you
control). If the link 404s, set the repository variable `EXPO_PUBLIC_AUTH_URL`
to the auth service URL and re-run the Main APK workflow. Then run
[`docs/operations/ACCEPTANCE_TEST.md`](../operations/ACCEPTANCE_TEST.md) and
record the result in `docs/status/FOUNDER_TODO.md`'s A6 row. Full run/deploy/
keys instructions: [`docs/HANDOVER.md`](../HANDOVER.md).

## 5. What only the founder can do (FOUNDER_TODO.md is the full list)

1. **The keystore secrets** (`ANDROID_KEYSTORE_*`) in the protected `release`
   environment + the encrypted offline backup's location → the **signed APK**.
2. **The Play Console account**, store assets and the background-location
   disclosure video → **v1.0.0 on Google Play** (tag `v1.0.0`; the Release APK
   workflow signs and publishes with SBOM + provenance).
3. **The v1.0.0 release approval** itself (P7's last gate).
4. **The A6 acceptance pass on your phone** (section 4).
5. **The PIA legal review** (the policy itself is written).
6. **The OCI host + SSH key** for the production deploy (`infra/` is ready and
   tested against local compose).
7. **A2's 296 MB on-device voice model** choice (would pull the van-noise WER
   toward target) and **the held-out voice eval set** (BUG-210).
8. **EXPO_PUBLIC_AUTH_URL** if the APK link 404s.

Platform-owned (not founder, but not the lead session either): **BUG-270**, the
second (large-screen) AVD profile in `.github/workflows/`.

## 6. Definition-of-Done checklist (honest state, 2026-11-08)

| §6 clause | State |
|---|---|
| P1–P7 complete with evidence | P1–P6 merged with evidence (see `docs/log/CURRENT.md` history); **P7**: acceptance record written (PR #265), scorecard refreshed, BUG-197 fixed — the two-screen-size leg waits on BUG-270 (platform), `v1.0.0` waits on the founder |
| Must-haves of SAAS_CHECKLIST / COVERAGE_MAP | the driver-day core is shipped and E2E-proven; the remaining `Planned (task)` rows in PARITY (272) are the post-v1 surface — team/fleet, web dashboard, admin, go-to-market, and the named gaps (offline map pack T5, VRP eval set, large-screen AVD) |
| PARITY beats Spoke on the differentiators | 4 `Better` rows + 30 `Have` rows with merged-PR evidence; Spoke column on every row (`docs/status/PARITY.md`) |
| Scorecard ≥ 8/10 everywhere | **3 of 6 dimensions at ≥ 8/10** (address, safety, delivery); voice/routing/offline measured below, with named gaps (§2) |
| `v1.0.0` released | **founder-gated** (section 5) |
| This final report | this file |

Open bug rows on main: 8 (BUG-051, BUG-052, BUG-061, BUG-068, BUG-104,
BUG-112, BUG-137, BUG-270) — all in the backend/platform lanes or platform-
owned; the lead's reserved range (BUG-189..209, BUG-270..299) is clear apart
from BUG-270. Tracker: 236 rows — fixed 196, moved to PARITY 30, closed 2,
open 5, doing 2, testing 1.
