# Voice Assistant Squad

**Mission:** Always with you, all day: on-device STT/TTS/VAD/KWS, the live voice agent, every language the driver speaks.

**Product name:** Courier Voice (D23). The drivers see only "Courier Voice"; the licences stay internal.

**Code:** `services/courier-voice` (the service), `apps/mobile/src/voice` (the app)

**Tasks:** T7.4 dictation, T7.5 live agent, T7.6 tool catalogue, T7.7 driving mode

## Targets (the release gate)

- WER <= 8% (NZ English, quiet) and <= 15% (van noise) on addresses
- intent accuracy >= 97%
- wake-word false accepts <= 1/hour, misses <= 3%
- command -> action <= 700 ms on-device
- battery <= 8%/hour in driving mode
- core commands work fully offline

## What is built

| Part | Where | What it does |
|---|---|---|
| The service | `services/courier-voice` | the brain, the turn taking, the proactive lines, the safety rules, the memory, the settings and the licence ledger |
| The engine port | `services/courier-voice/app/engine.py` | the swappable seam: the on-device engine (sherpa-onnx on the phone) and the server brain (OmniRoute, D25) |
| The app | `apps/mobile/src/voice` | the client of the service, the settings, the hook, the morning brief card and the command channel |
| The evaluation | `docs/squads/voice/eval/` | the utterances, the shift simulations and the harness that runs them |

The behaviour is specified in `docs/adr/ADR-007-courier-voice-service.md` and the binding wording is
MASTER_EXECUTION section 12.

## Evaluation dataset / benchmark

docs/squads/voice/eval/ (>= 500 utterances across languages, accents, noise levels, NZ addresses, numbers, self-corrections) plus the **shift simulations** (`manifest/shift_sims.json`): three scripted full shifts with the voice and the noise of a real day, run against the service by `services/courier-voice/app/eval_harness.py` and scored against the acceptance counts of `docs/squads/voice/EVAL.md`.

## Research

docs/research/2026/on-device-stt-tts-vad-kws.md - V4 §3: >= 5-10 candidates compared, the decision and its fallback written down.
docs/research/2026/voice-agent-frameworks.md - the turn taking, the barge-in and the licence of the turn detectors.
docs/squads/voice/OWN-MODEL.md - the plan for our own weights, and the bar they have to beat.

## Working agreement

1. The benchmark exists **before** the library is chosen.
2. Every change to the squad's code updates this directory: the status, the metric and the evidence link.
3. A regression in a target blocks the merge (Release Manager role, V4 §1).
4. Two independent review passes for the critical squads (auth, payments, sync, address, voice, routing).

## Files

- `STATUS.md` - done with evidence, metrics vs targets, next, risks.
- `research.md` - the 2026 research note for this niche (or a pointer to `docs/research/2026/`).
- `decisions.md` - the ADRs this squad owns.
- `benchmarks/` - the benchmark harness and its results.
- `eval/` - the evaluation set, the manifest of the shift simulations and the results.
- `OWN-MODEL.md` - the plan of our own weights, with the licences of every corpus.
- `EVAL.md` - the scoring contract of the set (the metrics M1-M9 and the acceptance counts).
