# ADR-028 — Courier Voice §22 B (ask on low confidence) and §22 C (the memory read), with the contracts for the app

**Date:** 2026-11-08 · **Status:** Accepted · **Deciders:** backend squad, per the
2026-11-05 audit's item 7 ("section 22 B … and section 22 C (the memory read endpoint
plus its contract for the lead)") · **Extends:** D48 (the Andee adoption),
`docs/research/2026/andee-cleanroom-spec.md` (techniques B and C)

## Context

MASTER_EXECUTION §22 step 2 builds three techniques from the clean-room spec. Technique A
(the pre-classifier) is on main (`app/turn_gate.py`). The app side of technique C (the
clearable memory switch and the forget row) is on main from PR #256 (BUG-202). What was
missing on the backend is **B** (the ask-on-low-confidence rule) and **C** (the read half
of the visible memory, plus its written contract for the lead).

The queue asks for B's threshold to be "tuned on the HELD-OUT set". That set — ~100 real
courier sentences — does not exist yet and only the founder can supply it (FOUNDER_TODO,
the held-out row). So this ADR ships the rule with the bar as **configuration** and
records the tuning procedure; the final number waits for the founder's set. The bar is
not claimed to be held-out-tuned today.

## Decision

### §22 B — ask on low confidence

- **One bar, in configuration:** `VoiceConfig.voice_ask_confidence_bar`
  (`VOICE_ASK_CONFIDENCE_BAR`), default `0.8`, validated to 0.0–1.0. Not prompt text, not
  a per-feature decision — the spec's property 1 and its internal rule "the bar is
  configuration, not prompt text".
- **The signal:** `TurnRequest.stt_confidence` (optional, 0.0–1.0, 422 outside the
  range) — the STT's own confidence in the transcript, sent by the phone. Absent means
  the STT reported nothing and **no bar is applied** (a turn is acted on as before).
- **The decision point:** `_maybe_ask` in `app/main.py`, applied to the reply of both
  the free route and the paid route, at the moment an action is about to be taken —
  not by the model deciding whether it feels sure.
- **The question:** one short line generated from the decision context
  (`ask_question_of` in `app/conversation.py`, e.g. mark_delivered → "Delivered, yes?"),
  returned as `speech` **and** `notice` with `action=None`. The app already reads
  `notice != null && action == null` as a question (`useCourierVoice.ts`) — this is the
  existing contract, kept.
- **Recorded, not silent:** the question is stored as the shift's
  `last_question = "ask:<action.type>"`, so the asking is a visible, recorded event in
  the running transcript (spec property 3) and the next turn can answer it.
- **Declining costs no model:** the ask rides the free route when the command was
  routed free, so "no" closes the question without waking the paid path (spec property
  4).

**Contract (for the app):** `POST /v1/sessions/{id}/turn` accepts an optional
`stt_confidence` (0..1). A turn below the bar answers `200` with `action: null` and a
one-line question in `speech`/`notice`; `GET /v1/sessions/{id}/memory` then shows
`last_question: "ask:<type>"`. A turn at or above the bar — or with no `stt_confidence`
at all — acts exactly as before.

**Tuning procedure (recorded, awaiting the founder's held-out set):** with
`packages/eval/voice/manifest/held_out.jsonl` present, run the audio eval
(`app/eval_audio.py`) with the bar swept over the held-out slice; pick the bar that
maximises correct asks (ask when the parse would have been wrong) minus wrong asks
(ask when the parse was right), and record the number in
`packages/eval/voice/results/`. Until then the published number stays the parser
ceiling on its own templates and the bar is a starting value, stated as such.

### §22 C — the memory read endpoint, and its contract for the lead

- **Endpoint:** `GET /v1/sessions/{session_id}/memory` → `SessionMemoryView`
  (`app/models.py`): `session_id`, `shift_id`, `remembered`, `turns`,
  `last_instruction`, `last_question`, `learned` (the bounded `LearnedRuns`),
  `context` (the bounded `RunContext`), `settings`. This is the "what I think is true
  right now" surface of the spec — short and current, not an archive.
- **Privacy:** the same rule as every other route — the caller is the courier the token
  names (`session_of`), a foreign shift is a 404, no token is a 401. The day's data
  never leaves the caller's own session.
- **Pairing:** the clear half already exists — `DELETE /v1/sessions/{id}/memory`
  (BUG-202's app half drives it). Read + clear together are the spec's "every entry is
  correctable and clearable".

**Contract (for the lead — this is the fragment to merge into the app's voice client):**

```
GET /v1/sessions/{session_id}/memory   (Bearer: the courier's token)
200 SessionMemoryView {
  session_id: string, shift_id: string | null, remembered: bool, turns: int,
  last_instruction: string | null, last_question: string | null,
  learned: { usual_order: string[], service_times_s: {string:int},
             door_notes: {string:string}, preferences: {string:string} },
  context: RunContext, settings: VoiceSettings }
404 another courier's session · 401 no token
```

The app's `CourierVoiceClient` gains `readMemory(sessionId)` against this route; the
visible-memory screen renders `learned` + `last_instruction` + `last_question` + the
day summary from `context`, and the existing forget row clears it.
`packages/contracts/openapi.yaml` is the Courier API's contract and stays out of the
backend squad's scope (D-record convention, ADR-010's note); this ADR §"Contract" is
the voice service's fragment, and the announcement for the lead is logged in
`docs/log/CURRENT-backend.md`.

## Consequences

- Red-first tests: `services/courier-voice/tests/test_s22_bc.py` (9 tests) — the memory
  read (fields, after-a-turn state, foreign 404, no-token 401), and the ask rule
  (low confidence asks with `action: null` + the question + `last_question` recorded,
  confident acts, no-confidence acts, the bar as configuration, out-of-range 422).
  Suite: 364 passed (was 355), `ruff check .` clean.
- Evidence: `docs/evidence/s22-bc/`.
- The held-out tuning of the bar stays a FOUNDER_TODO row (the ~100 real courier
  sentences); the FOUNDER_TODO row now names this ADR.
