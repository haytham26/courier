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
| 6 | Stop import: a spreadsheet (CSV/Excel) | In the trial — scheduled | **D62** (supersedes D52): in the trial, queue step 4.3, with its own format tests and the D8 engine correcting every extracted stop |
| 7 | Voice-first: the assistant answers and acts | Built (mock), on-device models pending | `.maestro/copilot.yaml` and #18 (07 Copilot); the on-device STT/TTS models are A2's slice (MASTER §21's order), with the server path as the fallback (D25) |
| 8 | Drive: the turn instruction, the map, Slide to Deliver | Built | #41 (the slide's decision), #32 (12 Driving at night); `.maestro/driving.yaml`, `.maestro/driving-night.yaml`, `.maestro/delivered.yaml` |
| 9 | Mark a stop done, with its minute, from either screen | Built | #135 (one mark, one fact: Today and Driving share the run state) and #146 (BUG-080: a stop delivered on the drive is Done on the list, with its minute) |
| 10 | Re-optimise mid-route | Built (server), app surface in the trial | PR #21 (`POST /runs/{id}/route:reopt`); **D62** (supersedes D53): the app surface is in the trial, queue step 4.2 |
| 11 | Time windows | Built (server), app surface in the trial | PR #19 (`Client(tw_early, tw_late)`); **D62** (supersedes D54): the courier-facing window is in the trial, queue step 4.2 |
| 12 | Planned breaks | Built (solver core), app half in the trial | PR #19 (the break placement); **D62** (supersedes D55): in the trial, queue step 4.3 — the runs columns, the migration, the contract + regenerated client and the app's break row in one PR, as the backend's contract change lands |
| 13 | Priority stops | Built (server), app surface in the trial | PR #19 (the two-phase priority tour); **D62** (supersedes D54): the courier-facing priority is in the trial, queue step 4.2 |
| 14 | The end location / a round trip | Built (solver core), app half in the trial | PR #19 (the finish point); **D62** (supersedes D56): in the trial, queue step 4.3, same one-PR contract change as the break |
| 15 | Navigation hand-off to Google / Apple / Waze | In the trial — scheduled | **D62** (supersedes D57): in the trial, queue step 4.1, first of the deferred set — a deep link with the destination to each maps app, no API key and no cost |
| 16 | POD: a photo, a signature, a safe place | Built (server + the safe place), capture surface in the trial | PR #21 (ADR-010/D36: the upload with the magic-byte sniff), #131 (BUG-073: the spoken safe place is carried through); **D62** (supersedes D58): the capture surface (photo/signature on the phone) is in the trial, queue step 4.3 |
| 17 | Failed-delivery reasons | Built (statuses), reason field in the trial | PR #21 (the stop statuses); **D62** (supersedes D58): the structured reason is in the trial, queue step 4.3, as one contract change (the field, the validation, the app's picker, the sync's carry) |
| 18 | End-of-day summary | Built (mock numbers) | #30 (10 Summary) and `.maestro/summary.yaml`; the earnings ledger is **D60** (P5 slice 13) |
| 19 | Offline: the shift carries on with no signal | Built (sync + event log) | PR #3 (the offline event log), #108 (the cached run store), #155's neighbours (the outbox's bounds, BUG-093); the offline **map** pack is **D61** (P3, Courier Maps) |
| 20 | Dark mode | Built | `src/providers/ThemeProvider.tsx` + the tokens (D16); `.maestro/driving-night.yaml`; `packages/design-tokens/src/__tests__/contrast.test.ts` (all three themes) |
| 21 | Stop types (reusable presets on an address) | In the trial — scheduled | **D62** (supersedes D59): in the trial, queue step 4.3, riding the address squad's door memory — one slice, not two |

## What the trial deliberately leaves out, and why

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
