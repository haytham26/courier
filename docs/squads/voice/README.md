# Voice Assistant Squad

**Mission:** Always with you, all day: on-device STT/TTS/VAD/KWS, the live voice agent, every language the driver speaks.

**Code:** `apps/mobile/src/voice, apps/mobile/modules/voice`

**Tasks:** T7.4 dictation, T7.5 live agent, T7.6 tool catalogue, T7.7 driving mode

## Targets (the release gate)

- WER <= 8% (NZ English, quiet) and <= 15% (van noise) on addresses
- intent accuracy >= 97%
- wake-word false accepts <= 1/hour, misses <= 3%
- command -> action <= 700 ms on-device
- battery <= 8%/hour in driving mode
- core commands work fully offline

## Evaluation dataset / benchmark

docs/squads/voice/eval/ (>= 500 utterances across languages, accents, noise levels, NZ addresses, numbers, self-corrections)

## Research

docs/research/2026/on-device-stt-tts-vad-kws.md - V4 §3: >= 5-10 candidates compared, the decision and its fallback written down.

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
