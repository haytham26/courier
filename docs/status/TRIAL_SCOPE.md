# TRIAL_SCOPE — what a Christchurch courier can do on day one of the trial

The audit's C2, done when this file lists the day-one competitor features, each
either built with the PR that built it and the flow that proves it, or carrying a
written decision in `docs/decisions/DECISIONS.md` for why it is not in the trial
(D60, D61 below; D52–D59 were superseded by **D62**). The list is the audit's own
day-one list plus the B1 gap list, and it was verified against `origin/main`
feature by feature — not by PARITY's status column, which B1 proved stale. Where
PARITY claimed something the code does not carry, the row was corrected in the
same pass (PR #168).

**How to read the states:**

- **Built** — a courier can do it on main today; the PR and the proof are named.
- **Built (server only)** — the engine or the API models it and the tests prove
  it, but no app surface sets it yet; the decision names the slice that adds one.
- **In the trial — scheduled** — in the trial per **D62** (the trial build IS the
  product; nothing on the day-one list is deferred), with the queue step that
  builds it. D62 supersedes the deferrals D52–D59.
- **Deferred** — not in the trial, with the DECISIONS entry and the scheduled
  slot. Only D60 (earnings) and D61 (the offline map pack) may use this word on
  the day-one list.

## The day-one list

| # | Feature | State | What proves it / the decision |
|---|---|---|---|
| 1 | Sign in with the account they drive with | Built | PR #52 (02 Sign in) and `.maestro/sign-in.yaml` (the four ways in, the email form, the two sentences); the real auth client's URL fix is #130 (D43/BUG-072) |
| 2 | Load the run: the day's stops, in order | Built | PR #108 (A1 slice 2, the run store) and #135 (slice 3: Today and the drive read it); `.maestro/smoke.yaml`, `.maestro/today-list.yaml`, `.maestro/stops.yaml` |
| 3 | The map as the backdrop, with the run on it | Built | PR #24 (09 Map style) and #37 (the emulator's memory/cores); `.maestro/map.yaml` |
| 4 | Scan a label into the day | Built (camera), the reader is a seam | PR #15 (06 Scan) and `.maestro/scan.yaml`; `src/scans/labelReader.ts` — the camera, the lock ring and the mock reader; the on-device OCR model rides A2 |
| 5 | Stop import: paste, messy text, a photo of a manifest | Built (server) | ADR-013/D40 (PR #34): `POST /shifts/{id}/intake` and `/intake/manifest`; `services/api/tests/test_intake_api.py`; the courier-facing surface is in the trial, queue step 4.3 (D62) |
| 6 | Stop import: paste a spreadsheet of stops | Built | PR #180 (0d8431f, the server's `POST /shifts/{id}/import` and its format tests) + **#215** (491af4d, the app half: the route screen's import sheet, `writeImportFile`, the spelled count/ignored/refusal answers); `.maestro/import.yaml` drives it (BUG-194; the small-screen keyboard fix is BUG-197, PR #261) |
| 7 | Voice-first: the assistant answers and acts | Turn flow wired (D1 app side, BUG-199): routing free/ignore/full, voice→run bridge, E2E seam; on-device models pending | `.maestro/voice-turn.yaml` + `.maestro/copilot.yaml` and #18 (07 Copilot); this PR on `feat/d1-voice-turn-flow` wires `src/voice` (turnRouter, voiceConfig, turnForThisBuild, the layout's bridge); the on-device STT/TTS models are A2's slice (MASTER §21's order, founder-gated), with the server path as the fallback (D25) |
| 8 | Drive: the turn instruction, the map, Slide to Deliver | Built | #41 (the slide's decision), #32 (12 Driving at night); `.maestro/driving.yaml`, `.maestro/driving-night.yaml`, `.maestro/delivered.yaml` |
| 9 | Mark a stop done, with its minute, from either screen | Built | #135 (one mark, one fact: Today and Driving share the run state) and #146 (BUG-080: a stop delivered on the drive is Done on the list, with its minute) |
| 10 | Re-optimise the run | Built | PR #21 (the server's `POST /runs/{id}/route:reopt`) + **#193** (343081f, the app applies the solver's answer through the run store's one write path and re-reads the day); `.maestro/a1/optimise.yaml` proves it on the real stack, `.maestro/stops.yaml` on the emulator |
| 11 | Time windows on stops | Built | PR #19 (the server's `Client(tw_early, tw_late)` and the contract's `time_window_start`/`time_window_end`) + **#198** (b81ad23, the window reaches the courier's screen); `.maestro/stops.yaml` |
| 12 | A planned break in the day | Built | PR #177 (ADR-022's server half: the runs `break_start_at`/`break_end_at` columns and the regenerated contract) + **#214** (a6dffe7, the app: `RunDay.breakWindow`, the `stops-break` row on the route screen); `.maestro/stops.yaml` asserts it (BUG-193) |
| 13 | Priority stops | Built | PR #19 (the two-phase priority tour and the contract's `priority` field) + **#198** (b81ad23, the app reads the run's own value on the courier's screen); `.maestro/stops.yaml` |
| 14 | Finish point at the depot | Built | PR #177 (`finish_lat`/`finish_lon` on the contract) + **#214** (a6dffe7, the app: `stops-finish` on the route screen); `.maestro/stops.yaml` |
| 15 | Built | In the trial — built | PR #191 (f9781fb): `src/maps/navHandoff.ts` builds the key-free Google Maps direction URL and opens it through expo-linking, and the drive's panel carries the hand-off (`driving-nav-handoff`) with the run's own stop. Its unit suites prove the link, the "nowhere" answer for a stop with no coordinates and the "failed" answer when nothing takes the link; the flow landed in this PR (queue step 4.3g): `.maestro/nav-handoff.yaml` drives the press on the emulator and asserts the drive is still the screen afterwards (no nav app answers there, and the app does not take itself down). **D62** (supersedes D57). |
| 16 | POD photo on the delivered confirm | Built | PR #21 (ADR-010/D36: the upload with the magic-byte sniff) + **#216** (938cf26, the photo control on the delivered confirm through the `podForThisBuild` seam); `.maestro/pod.yaml` drives it (BUG-196) |
| 17 | Failed delivery with its reason | Built | PR #178 (1f596b1, the server's bounded structured reason, ADR-023) + **#206** (1fc952a, the app picker and the reason travelling in the synced event); `.maestro/today-fail.yaml` |
| 18 | End-of-day summary | Built (mock numbers) | #30 (10 Summary) and `.maestro/summary.yaml`; the earnings ledger is **D60** (P5 slice 13) |
| 19 | Offline: the shift carries on with no signal | Built (sync + event log) | PR #3 (the offline event log), #108 (the cached run store), #155's neighbours (the outbox's bounds, BUG-093); the offline **map** pack is **D61** (P3, Courier Maps) |
| 20 | Dark mode | Built | `src/providers/ThemeProvider.tsx` + the tokens (D16); `.maestro/driving-night.yaml`; `packages/design-tokens/src/__tests__/contrast.test.ts` (all three themes) |
| 21 | Stop types: pickup vs delivery | Built | PR #179 (the contract's required `type` field, seeded) + **#213** (c484353, the app read-out: "Pickup" on the row and the card, Today chips the next stop's type); `.maestro/stops.yaml` proves the word on the emulator (BUG-192) |

## What the trial deliberately leaves out, and why

Queue steps 4.2 and 4.3 landed 2026-11-02..08 — PRs #193, #198, #206, #213, #214, #215, #216 (named per row above) — so every row of the day-one list below reads **Built**.

Per **D62** (2026-11-02), nothing on the day-one list is deferred: the trial
build IS the product, and the features D52–D59 used to defer are in the trial,
scheduled on the lead's queue in this order — step 4.1 the navigation hand-off
(a deep link with the destination, no API key, no cost), step 4.2 the app
surfaces for re-optimise, time windows and priority (the server already models
them; the contract's own change — a column, a regeneration of the typed client
and the app surface, in one PR — is what the breaks and the finish point wait
for), step 4.3 the app halves of the spreadsheet import, failed-delivery
reasons, stop types, breaks and the finish point, as the backend's contract
changes land. Spreading those halves across PRs is how a feature ends up "Have"
in PARITY and absent from the phone, which is the staleness the 2026-11-01 pass
corrected (PARITY rows 309, 12, 25).

What remains out is what D60 and D61 record, and they are not day-one deferrals:
the earnings ledger (D60, P5 slice 13) and the offline map pack (D61, P3).

## The proof, end to end

The audit's A1 job is the trial's own proof: it starts the API and Postgres,
seeds a real day, signs up, delivers three stops with signal, takes the network
away, delivers a fourth, and lets the outbox sync it — then asserts the rows in
Postgres. Until that job is green on main it is the first task of every session
(`docs/log/CURRENT.md`).
