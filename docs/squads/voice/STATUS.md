# Voice Assistant Squad - status

Updated: 2026-10-22 (Courier Voice: the service, the engine port and the shift simulations)

## Done (with evidence)

- **The service** `services/courier-voice`: FastAPI, the same auth shape as the Courier API (the
  courier's token against the JWKS of `services/auth`), the run read from the Courier API with that
  token. The HTTP surface: `POST /v1/sessions`, `GET /v1/sessions/{id}`,
  `POST /v1/sessions/{id}/turn`, `POST /v1/sessions/{id}/proactive`, `DELETE
  /v1/sessions/{id}/memory`, `GET`/`PUT /v1/settings`, `GET /v1/engines`, `GET /v1/licences`.
- **The engine port** (`app/engine.py`): `capabilities`, `transcribe`, `synthesise`, `reason`. Two
  engines ship: the on-device engine (sherpa-onnx on the phone, Apache-2.0, with the Kokoro voice
  pack, Apache-2.0, and the Smart Turn v3 end-of-turn model, BSD-2-Clause) and the server brain
  behind the OmniRoute gateway (MIT, D25). The router switches between them and falls back without
  the courier noticing; the driver is told only when a capability is missing.
- **The turn taking**: the wake word or the earbud opens the turn, the barge-in stops the reply for
  words and for commands but not for the fillers ("mm"), and the silence timeout closes a turn that
  never gets a word (six seconds moving, ten parked).
- **The driving-safe rules in code** (`app/safety.py`): eight words while moving, never a demand for
  a touch of the screen while moving, the quiet mode, the essentials mode, a call on the phone wins,
  and the music and the navigation make the voice wait its turn.
- **The proactive voice** (`app/proactive.py`): the morning brief ("214 stops, 3 new addresses, rain
  after 2"), the next stop and the approach ("next: 14 Harewood, side gate, small box mid-rack"), a
  hazard, the parcel in the van, the schedule ("you're 12 minutes ahead"), a break, a change of route
  and the end of the day ("206 delivered, 8 failed, 3 returns in the van"). Each rule has a trigger
  and the exact wording of MASTER_EXECUTION section 12, and each is tested word for word.
- **The conversational layer**: the questions about the run and the courier's own data (how many are
  left, what is next, where the parcel for Mrs Smith is, what was earned, when the day is finished),
  the corrections ("no, seventeen" corrects the last answer) and one short question only when it has
  to.
- **The bounded small talk**: the day, a joke, a greeting and the thanks are answered offline; the
  weather and the news need the internet; the medical, the legal, the money, the people of the
  courier, the politics and the harm are refused, and the voice never says it is an AI.
- **The memory, on the device first**: the preferences and the learned runs live on the phone and
  travel with the turn; the service holds the day's context for the shift; the memory can be turned
  off and a shift can be forgotten.
- **The settings in the app**: the verbosity, the voice, the speed, the quiet mode, the essentials
  mode and the alerts that may speak first, kept in the driver's own preference file and honoured by
  the service.
- **The app**: the client of the service (`courierVoiceClient.ts`), the settings
  (`settings.ts`), the hook that wires the service, the on-device speech and the command channel
  (`useCourierVoice.ts`), the morning brief card (`MorningBriefCard.tsx`) on the Today screen and the
  voice settings on the Settings screen. The command catalogue grew with the tools of the product, so
  a sentence the service understands does something on the phone.
- **The evaluation**: the shift simulations (`docs/squads/voice/eval/manifest/shift_sims.json`) - three
  scripted shifts with the voice and the noise - and the harness
  (`services/courier-voice/app/eval_harness.py`) that runs them against the service and writes the
  three result files of the evaluation contract.
- **The licence ledger**: every model and every library of the voice service is in
  `docs/LICENSES.md` with its provenance, and the service publishes the ledger itself at
  `GET /v1/licences`. The blocked weights (OmniVoice CC-BY-NC, the community codec, the openWakeWord
  models) are blocked in code.

## Metrics vs targets

| Metric | Target | Today | Evidence |
|--------|--------|-------|----------|
| Intent accuracy (the shift simulations, M3) | >= 97 % | **100 %** (22 of 22 command turns) | `docs/squads/voice/eval/results/shift-sim/summary.json` |
| False action rate (M9) | <= 1 % | **0 %** (0 of 10 non-command turns) | the same summary |
| The eight word rule while moving | every line | **100 %** (8 of 8 moving turns) | the same summary |
| Service latency (the part of M6 that is not the phone) | <= 700 ms p95 | **0.0 ms p95** (in process) | the same summary |
| WER (M1), address accuracy (M2) | <= 8 % / >= 97 % | **not measured** - the audio of the set is not generated yet | `summary.json` (not_measured) |
| Wake word false accepts (M4), misses (M5) | <= 1 /h, <= 3 % | **not measured** - the non-speech corpus does not exist yet | the same summary |
| Battery (M7) | <= 8 % / h | **not measured** - it is a device measurement | the same summary |
| TTS intelligibility (M8) | the upstream CER per language | **not measured** - the audio is not generated yet | the same summary |
| Command -> action on the phone (M6) | <= 700 ms | **not measured** - no device in this session | - |

A number that was not measured is never reported as a pass.

## Next

1. Generate the audio of the eval set with a licence-clean voice and the licence-checked noise beds,
   so M1, M2 and M8 can be measured on the real set.
2. Record the non-speech corpus (8 hours) for M4 and M9.
3. Download the on-device voice pack (Kokoro int8) and the wake model into the app, with the
   checksums, and measure the command -> action latency and the battery on a mid-range Android.
4. Build the on-device LLM pack (the optional offline brain of the spec) behind the same port.
5. Point the service at a self-hosted OmniRoute on the Oracle server and measure the cost guard.

## Risks

- The evaluation data for some squads needs founder-provided material (redacted label photos, real
  shift days); until then the benchmark uses synthetic and public data and says so.
- The on-device voice pack is not in the tree yet, so the app speaks with the system voice until it
  is downloaded; the licence check of the pack is a gate before it ships.
- The wake word needs a model for the NZ accent: sherpa's open-vocabulary keyword spotting works
  with a text file, but the false-accept rate is not measured yet (M4).
- The barge-in rule counts the fillers as no words; on a very noisy recording a real word could be
  lost, which would only mean a slower answer, never a wrong action.
