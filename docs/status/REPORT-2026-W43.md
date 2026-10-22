# Weekly report - 2026-W43 (2026-10-19 to 2026-10-22)

The founder's weekly report (MASTER_EXECUTION §7.10). What shipped, with the CI
link; what the scorecard says; where we stand against Spoke; the risks; the next
week. Every claim here is DONE, PARTIAL or NOT STARTED - nothing that was
scaffolded is called built.

## What shipped (with the CI link)

| What | Status | Evidence |
|---|---|---|
| The Android E2E pipeline, rebuilt at the root (two jobs, the readiness gates, the E2E mode on local mocks, the evidence every run) | PARTIAL | the run 39721702505: the app renders, four of the five flows green, the B.7 flow fixed afterwards |
| The app opens on the emulator at all (it never had: the entry was the old `App.js`, so the route map was never built) | DONE | the screenshot in the run's evidence |
| The research: the 24 areas at the full V4 depth, then the verifier pass (271 cards re-checked, 129 corrected) | DONE | `docs/research/2026/`, the four VERIFICATION files |
| The voice evaluation set (600 scripts over 240 real LINZ addresses) and the scanner set (330 synthetic labels with their ground truth) | PARTIAL | `scripts/ci/check-voice-eval.mjs`, `scripts/ci/check-scanner-eval.mjs` |
| Courier Voice (the service, the engine seam, the proactive rules, the 8-word driving-safe rule, the shift simulations) | PARTIAL | `services/courier-voice/` (166 tests) - on the phone the streaming STT is still a TODO |
| The complete sign-in (MFA, passkeys, the OAuth starts, the teams, the offline session, the biometric unlock) | PARTIAL | `services/auth/` (59 tests) - no native Google or Apple in the app yet |
| The map view modes (2D, 3D, Satellite, Auto), the toggles, the 3D buildings builder | PARTIAL | `apps/mobile/src/maps/` (144 tests) - the pack itself is not built |
| The Design Studio restarted at §13.6: the research (122 repositories, 36 award apps), the ten teams, ten directions as real screens | PARTIAL | `docs/design/RESEARCH-2.md`, `docs/design/directions-2/` - the founder picks, we do not |
| The repository hygiene (§16) and the five-pass check | DONE | PR #3 |
| Two security holes closed (the voice WebSocket, the JWT issuer) and the audit that was hiding its findings | DONE | `apps/api/tests/auth/test_voice_socket.py` |

## The scorecard, honestly

- The voice row moves from "no eval set exists" to "the set exists, the audio does not": 600 scripts with the gold intents, 840 planned files, the harness runs 24 turns of the shift simulations (the intent 100 %, no false actions, the 8-word rule 100 %, the p95 15 ms). The WER and the M1/M2 numbers stay UNVERIFIED: there is no audio.
- The address row stays where it was: 96.9 % over 656 044 real LINZ addresses (the D8 engine), measured.
- The map row stays UNVERIFIED: the pack is not built and the frame times were never measured on a device.

## Against Spoke (the number one NZ competitor)

- We are ahead on the address correction (the D8 engine with an explanation, 96.9 % on the real data) and on the door memory (the API and the app exist).
- We are behind on the thing Spoke has and we do not: the scanner (no screen at all), the proof of delivery, and the native Google or Apple sign-in.
- The parity matrix carries 357 rows; the 259 gap rows the research produced are in it, and the ones we have not built are marked Planned, never Done.

## The risks

1. **The private Actions minutes**: the emulator run is ~20 minutes of build plus 5 of emulator, and it is the gate for everything. A red run costs half an hour of the budget.
2. **The voice is not proven on a device**: the service is tested, the phone is not. The bundled models (sherpa-onnx, Kokoro) are still to be added and verified on the emulator.
3. **The map pack and the brain pack** are the two pieces that need a data download and a licence, not code.
4. **The design**: the founder has not picked a direction yet; the ten candidates are built, the final screens wait for the pick.

## Next week

1. The emulator green, B.7 marked PASS, the evidence in `docs/evidence/b7/`, PR #2 and PR #1 merged.
2. P5 in order: the on-device voice (the streaming STT and the bundled models, verified on the emulator), the native Google and Apple sign-in, the scanner, the driving mode, the real routing engine (PyVRP and VROOM over a Valhalla matrix), the proof of delivery, the earnings with the IRD and Xero export, the web dashboard, the billing.
3. Then P6: the deployment with the founder's approval, the restore drill, the monitoring.

## The founder's decisions we are waiting for

- The look: **A, B or C** out of the ten directions (`docs/design/directions-2/`, the renders and the PNGs are there).
- The store ids, the signing keys, the service accounts, the domain and the published privacy policy.
- The background-location video, the store assets and the legal review.
- The map pack's delivery (the Play asset delivery and the twice-weekly update are decided in D26; the Geofabrik terms still need a read).
