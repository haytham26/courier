# Acceptance evidence — P7 (MASTER_EXECUTION §4 P7, V4 §9)

Written 2026-11-08 (lead session, `docs/p7-acceptance`). P7's done-when is:
**acceptance on the CI emulator at two screen sizes, online/offline/transition,
every module ≥ 8/10 on the scorecard, zero known defects, and the `v1.0.0`
GitHub Release with the signed APK + SBOM.** This file is the acceptance record
so far — every line names the run, the artifact and the job that proves it.

## 1. Emulator E2E — green, 21/21 flows on both API legs

- **Run 42363101590** ("Android E2E (emulator + Maestro)", head `259f346`, PR
  #259, 2026-11-07/08, conclusion success). Artifacts:
  `android-e2e-evidence-api34` (#13571179551) and `android-e2e-evidence-api35`
  (#13571019928), each with `.maestro/evidence/flows.txt`, `logcat.txt`,
  `am-start.txt`, `pid.txt`.
- `flows.txt` on the api-34 leg lists **21 flows, all `status=pass`**
  (compat, copilot, delivered, disclosure, driving, driving-night, import,
  lock-screen, map, nav-handoff, pod, scan, sign-in, smoke, stops, summary,
  today-fail, today-list, voice-memory, voice-samples, voice-turn). The api-35
  leg is the same 21/21 (check-run success).
- The CI workflow run for the same head (42363098107 / 42363101811) is
  success across all 16 check-runs, including `Run the Maestro flows on the
  emulator (api 34)` and `(api 35)`, `A1: the app against the real API (no
  mock)`, `Build the release APK`, `Record the screens on the emulator`.

## 2. A1 — the app against the real API, no mock, online → offline → sync

- Same run 42363101590, artifact `android-e2e-evidence-a1` (#13571374943):
  `a1-run.txt` records the four flows and that **the network was taken away
  between the online and offline halves and returned before the sync half**.
- JUnit: `online-result.xml`, `optimise-result.xml`, `offline-result.xml`,
  `sync-result.xml` — all four `SUCCESS`:
  - online: the app signs up on the real auth service and delivers the seeded
    day (3 deliveries with signal);
  - optimise: the solver resequences the run the server holds;
  - offline: with no network, a fourth delivery is recorded on the phone and
    held in the outbox;
  - sync: the network returns and the held delivery sends.
- The job then **asserts the rows in Postgres** (`.maestro/run-a1.sh`:
  `delivery_events` counted with a bounded wait that fails loudly — BUG-237's
  lesson — plus runs/shifts/stops/users/sessions counts). A1 is the
  online/offline/transition half of the acceptance, on the real stack
  (`infra/compose.ci.yml`: Postgres + the API + auth + voice), not on mocks.

## 3. Screen size matrix — the one open gap (BUG-270)

- Every emulator lane (the two Maestro api-34/35 legs, the A1 job, the
  screen-recordings job) boots the **single pinned AVD profile, the small
  320×640** one. All acceptance evidence above is therefore on the small
  screen.
- The **large-screen half has never run**: no flow has been proven on a large
  screen, and the visual baselines' large/200 % cells are `pending` for the
  same reason (`docs/evidence/design/baselines/manifest.json` — 4 committed
  small day/night baselines of screens 03-today and 04-driving, 8 pending
  large/200 % views).
- Filed as **BUG-270** (2026-11-08): the second AVD profile lives in
  `.github/workflows/android-e2e.yml` — lead-owned since the founder directive
  2026-11-08; the BUG-270 PR adds the `large` (Nexus 6, 1440×2560 — the profile screen-recordings.yml already boots) leg to the
  matrix on both api legs, with the profile in the pins fingerprint and the AVD
  cache key — and in `screen-recordings.yml` (the backend's; asked in
  `docs/log/CURRENT.md`). The flows
  are size-agnostic (id/text selectors; `scrollUntilVisible` with
  `centerElement` where the dock could swallow a tap), so closing BUG-270 is
  a workflow-matrix change plus promoting the large baselines
  (`check-visual-baselines.mjs --update --allow-new`), not an app change.

## 4. Screen recordings + visual baselines (P4, BUG-203 fixed in PR #259)

- The screen-recordings workflow is green (e.g. run 42371008261 on PR #261:
  13 reference screens captured light+dark, 1440×2560 device px of the small
  AVD).
- `scripts/ci/check-visual-baselines.mjs` verifies the committed baselines
  (sha256 + dimensions + source run/artifact per entry in the manifest) and
  compares fresh captures against them (tolerance 8/255 per channel, ≤ 0.5 %
  of pixels, resize always fails). Cross-run determinism measured
  0.077–0.186 % per view across two independent green runs (42350703397 vs the
  42353916218 re-run, artifact #13567763595) — see
  `docs/evidence/design/README.md`.

## 5. What is still founder/platform-gated (not defects)

- **v1.0.0 release + signed APK**: the keystore secrets (`ANDROID_KEYSTORE_*`)
  live in the protected `release` environment; Play App Signing, the Play
  account and the store assets are the founder's. Until then every merge
  republishes the unsigned APK at
  `releases/download/latest/courier.apk` (measured 44.1 MB,
  `courier-release-apk` artifact #13570583049) and the real-phone acceptance
  run (`docs/operations/ACCEPTANCE_TEST.md`, audit A6) is the founder's —
  both in `docs/status/FOUNDER_TODO.md`.
- The held-out voice eval set (BUG-210) and A2's 296 MB model choice.
- The second AVD profile (BUG-270, platform-owned).

## 6. How to re-run / verify

```bash
# the E2E + A1 legs of a head:
gh api "repos/haytham26/courier/actions/runs?head_sha=<sha>&per_page=30"
gh run download <e2e-run-id> -n android-e2e-evidence-api34 -D /tmp/ev
gh run download <e2e-run-id> -n android-e2e-evidence-a1   -D /tmp/ev-a1

# the flows: every lane runs bash .maestro/run-all.sh (21 flows);
# A1 runs .maestro/run-a1.sh (a1/{online,optimise,offline,sync}.yaml, no mock)
# the visual gate:
node scripts/ci/check-visual-baselines.mjs            # verify committed baselines
node scripts/ci/check-visual-baselines.mjs --fresh <captures-dir>
```

The scorecard leg of P7 is `docs/status/QUALITY_SCORECARD.md` (refreshed
2026-11-08 on the same branch).
