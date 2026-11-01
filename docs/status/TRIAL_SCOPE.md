# TRIAL_SCOPE — what a Christchurch courier can do on day one of the trial

The audit's C2, done when this file lists the day-one competitor features, each
either built with the PR that built it and the flow that proves it, or carrying a
written decision in `docs/decisions/DECISIONS.md` for why it is not in the trial
(D52–D62 below). The list is the audit's own day-one list plus the B1 gap list,
and it was verified against `origin/main` feature by feature — not by PARITY's
status column, which B1 proved stale. Where PARITY claimed something the code
does not carry, the row was corrected in the same pass (PR #168).

**How to read the states:**

- **Built** — a courier can do it on main today; the PR and the proof are named.
- **Built (server only)** — the engine or the API models it and the tests prove
  it, but no app surface sets it yet; the decision names the slice that adds one.
- **Deferred** — not in the trial, with the DECISIONS entry and the scheduled
  slot.

## The day-one list

| # | Feature | State | What proves it / the decision |
|---|---|---|---|
| 1 | Sign in with the account they drive with | Built | PR #52 (02 Sign in) and `.maestro/sign-in.yaml` (the four ways in, the email form, the two sentences); the real auth client's URL fix is #130 (D43/BUG-072) |
| 2 | Load the run: the day's stops, in order | Built | PR #108 (A1 slice 2, the run store) and #135 (slice 3: Today and the drive read it); `.maestro/smoke.yaml`, `.maestro/today-list.yaml`, `.maestro/stops.yaml` |
| 3 | The map as the backdrop, with the run on it | Built | PR #24 (09 Map style) and #37 (the emulator's memory/cores); `.maestro/map.yaml` |
| 4 | Scan a label into the day | Built (camera), the reader is a seam | PR #15 (06 Scan) and `.maestro/scan.yaml`; `src/scans/labelReader.ts` — the camera, the lock ring and the mock reader; the on-device OCR model rides A2 |
| 5 | Stop import: paste, messy text, a photo of a manifest | Built (server) | ADR-013/D40 (PR #34): `POST /shifts/{id}/intake` and `/intake/manifest`; `services/api/tests/test_intake_api.py`; the courier-facing surface lands with the routing slice (D53) |
| 6 | Stop import: a spreadsheet (CSV/Excel) | Deferred | **D52** — not in the trial; scheduled in P5 slice 15 (import from Spoke and other planners), with its own format tests |
| 7 | Voice-first: the assistant answers and acts | Built (mock), on-device models pending | `.maestro/copilot.yaml` and #18 (07 Copilot); the on-device STT/TTS models are A2's slice (MASTER §21's order), with the server path as the fallback (D25) |
| 8 | Drive: the turn instruction, the map, Slide to Deliver | Built | #41 (the slide's decision), #32 (12 Driving at night); `.maestro/driving.yaml`, `.maestro/driving-night.yaml`, `.maestro/delivered.yaml` |
| 9 | Mark a stop done, with its minute, from either screen | Built | #135 (one mark, one fact: Today and Driving share the run state) and #146 (BUG-080: a stop delivered on the drive is Done on the list, with its minute) |
| 10 | Re-optimise mid-route | Built (server), no app surface | PR #21 (`POST /runs/{id}/route:reopt`); **D53** schedules the app's surface with the routing slice |
| 11 | Time windows | Built (server), no app surface | PR #19 (`Client(tw_early, tw_late)`); **D54** schedules the courier-facing window with the routing slice |
| 12 | Planned breaks | Built (solver core), unreachable | PR #19 (the break placement); **D55** — the contract refuses the break window until the runs table gains columns, so it is not in the trial |
| 13 | Priority stops | Built (server), no app surface | PR #19 (the two-phase priority tour); **D54** schedules the courier-facing priority with the routing slice |
| 14 | The end location / a round trip | Built (solver core), unreachable | PR #19 (the finish point); **D56** — the contract refuses it for the same schema reason as D55 |
| 15 | Navigation hand-off to Google / Apple / Waze | Deferred | **D57** — not in the trial's first slice; the in-app map with its own turn instruction covers the drive, and the hand-off ships with Courier Nav (P5 slice 7) |
| 16 | POD: a photo, a signature, a safe place | Built (server + the safe place) | PR #21 (ADR-010/D36: the upload with the magic-byte sniff), #131 (BUG-073: the spoken safe place is carried through); **D58** — the capture surface (photo/signature on the phone) is P5 slice 9 |
| 17 | Failed-delivery reasons | Built (statuses), no reason field | PR #21 (the stop statuses); **D58** — a structured reason is a contract change scheduled with the POD slice |
| 18 | End-of-day summary | Built (mock numbers) | #30 (10 Summary) and `.maestro/summary.yaml`; the earnings ledger is **D60** (P5 slice 13) |
| 19 | Offline: the shift carries on with no signal | Built (sync + event log) | PR #3 (the offline event log), #108 (the cached run store), #155's neighbours (the outbox's bounds, BUG-093); the offline **map** pack is **D61** (P3, Courier Maps) |
| 20 | Dark mode | Built | `src/providers/ThemeProvider.tsx` + the tokens (D16); `.maestro/driving-night.yaml`; `packages/design-tokens/src/__tests__/contrast.test.ts` (all three themes) |
| 21 | Stop types (reusable presets on an address) | Deferred | **D59** — not in the trial; the safe place the courier speaks covers the same need today, and the presets are scheduled with the address squad's door memory |

## What the trial deliberately leaves out, and why

The four surfaces the server already models (re-optimise, time windows,
priority, breaks and the finish point) are deferred together, for one reason
each but the same shape: **the contract refuses them** — `CreateRunRequest`
carries no break window and no finish point, and the app's client carries no way
to set a window or a priority — so the engine's work is real and waiting for the
contract's own change (a column, a regeneration of the typed client, and the app
surface, in one PR). Spreading those halves across PRs is how a feature ends up
"Have" in PARITY and absent from the phone, which is the staleness this pass
corrected (PARITY rows 309, 12, 25).

## The proof, end to end

The audit's A1 job is the trial's own proof: it starts the API and Postgres,
seeds a real day, signs up, delivers three stops with signal, takes the network
away, delivers a fourth, and lets the outbox sync it — then asserts the rows in
Postgres. Until that job is green on main it is the first task of every session
(`docs/log/CURRENT.md`).
