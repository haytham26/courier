# ADR-006 — Courier Voice: the service, the engine port and the offline-first rules

- **Status:** accepted
- **Date:** 2026-10-22
- **Decides:** D23 (the voice engine is our own product, `services/courier-voice`), the shape of the
  swappable engine interface, the turn taking, the driving-safe rules and the offline/online switch
- **Amends:** ADR-004 (the engine interface; the licence ledger stays as ADR-004 decided it)
- **Research:** `docs/research/2026/on-device-stt-tts-vad-kws.md`,
  `docs/research/2026/voice-agent-frameworks.md`, `docs/squads/voice/OWN-MODEL.md`,
  `docs/squads/voice/EVAL.md`

## Context

D23 says the voice engine is our own product: Courier Voice, in `services/courier-voice`, with the
safeguards of V4 §13.6 (the provenance in `docs/LICENSES.md`, a swappable engine interface, and the
commercially-licensed alternatives kept benchmarked). The service did not exist. The app had a voice
module (`apps/mobile/src/voice/`) that speaks on the phone with sherpa-onnx, parses the commands
offline and whispers at the geofence, but there was no service, no brain, no turn taking and no
evaluation of the behaviour.

Three things had to be decided before any code was written.

**1. Which language and which shape the service has.** The Courier API is FastAPI (Python) and the
auth service is TypeScript. The voice service needs the run of the day (from the Courier API, with
the courier's own token), the brain (behind the OmniRoute gateway, an OpenAI-compatible HTTP API)
and the behaviour rules. All three are HTTP and JSON, and the rules are deterministic code. The
service is therefore a FastAPI service like the API it reads the day from: the same auth shape
(JWKS, a principal), the same quality gates (ruff, mypy, pytest) and the same OpenAPI contract.

**2. Where the engine seam is.** D23's third condition is that a commercially-licensed model can
replace ours without a change to the app. That is only true if the app never names an engine. The
app sends the transcript and the state and receives the words and the action; the service decides
which brain answered. The port is `VoiceEngine` in `services/courier-voice/app/engine.py`:

| method | what it is |
|---|---|
| `capabilities()` | what this engine can do, and why when it cannot |
| `transcribe(audio, language, sample_rate)` | what the courier said |
| `synthesise(text, voice, speed)` | how the words are said |
| `reason(request)` | what the voice answers and what it does |

**3. How the turn is detected.** The research (`voice-agent-frameworks.md` §3.1) settled the
framework (Pipecat, BSD-2) and the turn detector (Smart Turn v3, BSD-2 for the code, the weights,
the data and the training script — the only licence-clean end-of-turn model in the pool). The
reading is that a hosted Pipecat server is not what a courier in a van needs at 06:00 with no
signal, so the *turn detection* is on the phone and the *brain* is on the server:

- the turn opens on the **wake word** (sherpa-onnx open-vocabulary keyword spotting, Apache-2.0)
  or on the **earbud press** (D9);
- the voice activity gate is sherpa's own Silero-derived VAD (the licence contradiction of the
  standalone package stays unresolved, so the standalone package is not a dependency);
- the **end of the turn** is read from the prosody by Smart Turn v3 on the phone;
- the **barge-in** stops the reply when the courier says words, not when the van makes a noise: the
  fillers ("mm", "uh") are not words, and a command ("delivered") always stops the reply because a
  command is deliberate.

## Decision

1. **The service is `services/courier-voice`** — FastAPI, the same auth shape as the Courier API
   (the courier's token, verified against the JWKS of `services/auth`), and the run comes from the
   Courier API with that token, so a courier only ever hears about their own day.

2. **Two engines ship, one port.**
   - `SherpaOnnxEngine` (the on-device engine): the phone holds the sherpa-onnx runtime
     (Apache-2.0), the Kokoro voice pack (Apache-2.0) and the Smart Turn model (BSD-2-Clause). The
     service answers from the run the phone has, with no network at all.
   - `OmniRouteEngine` (the server brain): the only thing in the service that talks to the OmniRoute
     gateway (MIT), which is the single gateway for our server AI (D25). It carries the D25 policy
     in code: an empty provider allow-list means the server brain is unavailable (not that
     everything is allowed), a provider that is not on the list is refused, the cost guard stops the
     calls when the day's budget is spent, and the logs hold no transcript, no address and no name.
   - `EngineRouter` picks between them and falls back: the courier never notices the switch, and is
     told only when a capability is missing ("I need the internet for that").

3. **The turn taking is a state machine** (`app/turns.py`): idle, listening, thinking, speaking. A
   turn opens on the wake word, the earbud or the button; it closes on the end of the sentence or on
   the silence timeout (six seconds while the van is moving, ten when it is parked), so a turn that
   never gets a word closes itself instead of hanging.

4. **The driving-safe rules are code, not a prompt** (`app/safety.py`): at most **eight words**
   while the van is moving, never a demand for a touch of the screen while moving, the quiet mode,
   the essentials mode, and the audio focus (a call wins, the music and the navigation make the
   voice wait its turn). The prompt asks for brevity; the code makes sure of it.

5. **The proactive voice says first, short and only when it is useful** (`app/proactive.py`): the
   morning brief, the next stop, the approach, a hazard, the parcel in the van, the schedule, a
   break, a change of route and the end of the day. Each rule has a trigger and the exact wording
   of MASTER_EXECUTION §12, and each is tested word for word.

6. **The memory is on the device first** (`app/memory.py`): the preferences and the learned runs
   live on the phone and travel with the turn; the service holds the day's context for the shift
   and nothing else; a courier can turn the memory off and can make the service forget a shift.

7. **The settings live in the app** (`apps/mobile/src/voice/settings.ts`): the verbosity, the voice,
   the speed, the quiet mode, the essentials mode and the alerts that may speak first. The service
   honours what it is given and never changes a setting behind the courier's back.

8. **The HTTP surface** is four calls and two publications: `POST /v1/sessions`,
   `POST /v1/sessions/{id}/turn`, `POST /v1/sessions/{id}/proactive`, `GET`/`PUT /v1/settings`, plus
   `GET /v1/engines` (the swappable seam) and `GET /v1/licences` (the ledger as a shipped surface,
   ADR-004 point 4).

9. **The evaluation is the shift simulations** (`docs/squads/voice/eval/manifest/shift_sims.json`):
   three scripted shifts with the voice and the noise of a real day, run against the service by
   `app/eval_harness.py`, scored against the acceptance counts of `docs/squads/voice/EVAL.md`. The
   metrics that need the audio or a device are reported as **not measured**, with the reason; a
   number that was not measured is never reported as a pass.

## Consequences

- The app never names an engine, so the licence-safe path (sherpa-onnx + Kokoro on the phone, the
  server brain behind OmniRoute) can be replaced by a commercially-licensed model without a change
  to the app. That is the condition D23 sets.
- The rules of the voice are testable without a device, without a model and without a network: the
  eight word rule, the barge-in, the silence timeout, the proactive wording, the offline switch and
  the small talk bounds are all unit tests.
- The service adds a Python package to the tree, so `pnpm test`, `pnpm lint` and `pnpm typecheck`
  now cover it, and CI installs its dependencies.
- The on-device pack is still not in the tree: the phone speaks with the sherpa-onnx runtime and
  the Kokoro pack, which the voice squad downloads and checksums into the app (ADR-004).

## Risks

| Risk | Mitigation |
|---|---|
| The voice pack and the wake model are not in the tree yet | the on-device engine reports what it can do; the app keeps its own parser as the offline path |
| Smart Turn runs on the phone and costs battery | it only runs in the silence between the words (the research's own note), and the duty cycle is measured in the battery benchmark |
| The server brain is a new cost | the cost guard caps the day, the allow-list keeps the training providers out, and the on-device brain answers every command |
| The small talk drifts into advice | the subjects that are refused are in code with tests, and the refusal lines are plain |
| The barge-in cuts a sentence in half | the fillers are not words, and a reply only stops for words or a command |

## Verification

- The service: `uv run --directory services/courier-voice pytest -q` (the contracts, the eight word
  rule, the barge-in, the silence timeout, the proactive rules, the settings, the memory, the
  offline switch, the licence ledger and the harness).
- The harness: `uv run --directory services/courier-voice python -m app.eval_harness` over the
  shift simulations, with the results in `docs/squads/voice/eval/results/shift-sim/`.
- The app: `pnpm --filter mobile test` (the client, the settings and the command catalogue).
- The licences: `node scripts/check-licenses.mjs` and the ledger of the service
  (`GET /v1/licences`).
