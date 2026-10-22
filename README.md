# Courier Copilot — voice-first app for independent couriers

Hands-free co-driver for independent parcel couriers on fixed runs (Christchurch first).

The full contract is `docs/plan/MASTER_EXECUTION.md`; the quality bar is
`docs/plan/CONSTRAINTS.md`; the index of the documentation is `docs/README.md`.

## The tree

```
apps/        mobile/                    the Expo app (SDK 58, expo-router, Unistyles 3)
services/    api/                       the FastAPI gateway (Python)
             auth/                      Better Auth (the sign-in service)
             courier-voice/             Courier Voice, the shift companion (Python)
packages/    shared/                    the types and the schemas both sides share
             design-tokens/             the tokens, the themes and the contrast maths
             nz-address/                the NZ address parser
             eslint-config/             the shared ESLint flat config
             contracts/                 openapi.yaml + the database schema
             eval/                      the voice, scanner and routing evaluation sets
scripts/     ci/  data/  eval/  design/  dev/  secrets/     the gates, the builders, the tools
docs/        plan/  status/  decisions/  product/  design/  research/  study/  squads/
             evidence/  operations/  log/  archive/
```

## The API

The FastAPI service is `services/api`. It plans the run, takes the delivery events and speaks to
the courier over the voice WebSocket. It has no secret of its own: it verifies the tokens of the
Better Auth service against the published JWKS and refuses to start without it.

| Method | Path | Purpose |
|---|---|---|
| PUT  | `/runs/{run_id}/template` | Master Template Lock: ordered street segments + walking direction |
| POST | `/shifts/{shift_id}/intake` | Voice or text manifest → intake graph; returns briefing or first question |
| POST | `/shifts/{shift_id}/intake/manifest` | Photo of a paper manifest → vision extraction → intake graph (`source=ocr`) |
| GET  | `/shifts/{shift_id}/stops` | Ordered stops with van zone + micro-entry tip |
| POST | `/shifts/{shift_id}/events:batch` | Offline sync of delivery events (`ON CONFLICT (id) DO NOTHING`) |
| WS   | `/shifts/{shift_id}/voice` | Final transcripts + 1 Hz GPS in; `say` / `state` frames out |

The full contract is `packages/contracts/openapi.yaml`; the schema it runs against is
`packages/contracts/db/schema.sql`.

## Running it

```
pnpm install
pnpm test          # the JS/TS suites, the two Python suites and the store-readiness suite
pnpm lint
pnpm typecheck
```

The API: `uv run --directory services/api uvicorn app.main:app --reload`.
The auth service: `pnpm --filter @courier/auth dev`.
The voice service: `uv run --directory services/courier-voice uvicorn app.main:app --reload`.

There is no local Android emulator: the emulator runs on the GitHub Actions runner.

## The design rules that keep it safe and fast

* **LLMs extract and phrase; code decides.** Territory checks, sequencing and zoning are PostGIS/Python, so
  the results are reproducible and testable.
* **Most utterances never reach an LLM.** "Delivered", "Left at the gate", "Skip" go through the regex fast path.
* **Every state change is an idempotent event** (client UUID). The phone works offline and replays via `events:batch`.
* **Spatial memory learns only from good GPS fixes** (≤15 m accuracy), as an EWMA toward the observed drop point
  (`learn_entry_point` trigger). Text lore (gate codes, dogs) lives in `location_notes`, embedded for retrieval.

## The agent state machine

See `services/api/app/agents/intake_graph.py`. Mapping to the five agents:

| Agent | Where |
|---|---|
| Manifest & Voice Ingestion | `ingest` node (LLM, `INGEST_EXTRACT`) + `normalise` (`nz_address.parse`) |
| Anomaly & Territory Verification | `verify` node (geocode + `ST_Covers(run.territory, point)`) → `ask_driver` uses LangGraph `interrupt()` to speak a question and resume with the driver's answer |
| Cargo Placement & Van Zoning | `zone` node (`assign_van_zones`: reverse load order, heavy to base) |
| Spatial Mapping & Micro-Entry Memory | `delivery_events` trigger + approach watcher on the voice socket |
| Executive Voice Copilot | `services/api/app/agents/copilot.py` (on-shift loop, separate from intake) |

The graph is compiled with a checkpointer keyed by `thread_id = shift_id`, so the intake survives the
app restarts and the driver can answer the questions minutes later while loading.

## The voice prompts

All the prompts of the API are in `services/api/app/prompts.py`; the ones of the voice service are in
`services/courier-voice/app/prompts.py`. The key choices in `EXECUTIVE_COPILOT`:
* A hard 15-word budget and a fixed next-stop shape: *number + street → van location → one tip*.
* Spoken-form numbers ("two slash fourteen"), correct te reo spelling so the TTS pronounces Papanui/Mairehau properly.
* The last self-correction wins ("14 — no, 41").
* Exactly one tool call per turn, with `noop` for chatter, so a mishearing does not change the state.
* No questions above 15 km/h; the ambiguity is deferred ("Later.").
* Gate codes are only read back on arrival at that address.
