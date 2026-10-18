# Courier Copilot — voice-first multi-agent run platform (MVP)

Hands-free co-driver for independent couriers on fixed runs (Christchurch first).
Self-contained Python service; it does not touch the Sinatra app in the repo root.

```
db/schema.sql               PostgreSQL + PostGIS + pgvector schema (with entry-point learning trigger)
app/nz_address.py           Deterministic NZ address parser (spoken numbers, te reo ASR fixes, suburb fuzzy-match)
app/sequencing.py           Master Template Lock sequencing + van zoning
app/agents/intake_graph.py  LangGraph morning-intake state machine (with voice interrupt for anomalies)
app/agents/copilot.py       Executive Voice Copilot: regex fast-path + Claude tool-calling
app/prompts.py              System prompts (copilot, anomaly question, manifest extraction)
app/main.py                 FastAPI REST + voice WebSocket surface
tests/test_core.py          pytest (parser, template lock, fast-path, graph interrupt/resume)
```

Run: `pip install -r requirements.txt && pytest -q && uvicorn app.main:app --reload`

## 1. System design

```
 Earbud ─ Phone (Expo) ── on-device VAD + Deepgram streaming STT ─┐   ┌─ TTS (Cartesia / device)
          │ local SQLite event log (offline-first)                │   │
          └─────────── WSS /shifts/{id}/voice ────────────────────▼───┴───────────────┐
                                                              FastAPI gateway          │
              REST (intake, template, sync)                  │                         │
                         │                     ┌─────────────┴────────────┐            │
                         ▼                     ▼                          ▼            │
                LangGraph Intake Graph   Executive Copilot      Approach watcher (GPS) │
                (Ingest→Normalise→Verify  (fast-path / LLM tools)  ST_DWithin 50 m ─────┘
                 →[ask driver]→Sequence
                 →Zone→Brief)
                         │                      │
                         └──── Postgres + PostGIS + pgvector (Redis Streams for async jobs) ────
```

Design rules that keep it safe and fast:
* **LLMs extract and phrase; code decides.** Territory checks, sequencing and zoning are PostGIS/Python, so
  results are reproducible and testable.
* **Most utterances never reach an LLM.** "Delivered", "Left at the gate", "Skip" go through the regex fast path.
* **Every state change is an idempotent event** (client UUID). The phone works offline and replays via `events:batch`.
* **Spatial memory learns only from good GPS fixes** (≤15 m accuracy), as an EWMA toward the observed drop point
  (`learn_entry_point` trigger). Text lore (gate codes, dogs) lives in `location_notes`, embedded for retrieval.

### API

| Method | Path | Purpose |
|---|---|---|
| PUT  | `/runs/{run_id}/template` | Master Template Lock: ordered street segments + walking direction |
| POST | `/shifts/{shift_id}/intake` | Voice or text manifest → intake graph; returns briefing or first question |
| POST | `/shifts/{shift_id}/intake/manifest` | Photo of a paper manifest → vision extraction → intake graph (`source=ocr`) |
| GET  | `/shifts/{shift_id}/stops` | Ordered stops with van zone + micro-entry tip |
| POST | `/shifts/{shift_id}/events:batch` | Offline sync of delivery events (`ON CONFLICT (id) DO NOTHING`) |
| WS   | `/shifts/{shift_id}/voice` | Final transcripts + 1 Hz GPS in; `say` / `state` frames out |

WebSocket frames:
```jsonc
// client → server
{"type":"transcript","text":"left at the side gate","final":true,"gps":{"lat":-43.47,"lon":172.60,"acc":6,"speed":0}}
{"type":"gps","lat":-43.47,"lon":172.60,"acc":8,"speed":32}
// server → client
{"type":"say","text":"Forty-two B Main North Road. Mid rack, small box. Side gate left of garage.","priority":"now"}
{"type":"state","stop":{"seq":41,"remaining":187}}
```

## 2. Agent state machine

See `app/agents/intake_graph.py`. Mapping to the five agents:

| Agent | Where |
|---|---|
| Manifest & Voice Ingestion | `ingest` node (LLM, `INGEST_EXTRACT`) + `normalise` (`nz_address.parse`) |
| Anomaly & Territory Verification | `verify` node (geocode + `ST_Covers(run.territory, point)`) → `ask_driver` uses LangGraph `interrupt()` to speak a question and resume with the driver's answer |
| Cargo Placement & Van Zoning | `zone` node (`assign_van_zones`: reverse load order, heavy to base) |
| Spatial Mapping & Micro-Entry Memory | `delivery_events` trigger + approach watcher on the voice socket |
| Executive Voice Copilot | `app/agents/copilot.py` (on-shift loop, separate from intake) |

The graph is compiled with a checkpointer keyed by `thread_id = shift_id`, so intake survives app restarts and
the driver can answer questions minutes later while loading.

## 3. Voice prompt engineering

All prompts are in `app/prompts.py`. Key choices in `EXECUTIVE_COPILOT`:
* Hard 15-word budget and a fixed next-stop shape: *number + street → van location → one tip*.
* Spoken-form numbers ("two slash fourteen"), correct te reo spelling so TTS pronounces Papanui/Mairehau properly.
* The last self-correction wins ("14 — no, 41").
* Exactly one tool call per turn, with `noop` for chatter, so mishearing does not change state.
* No questions above 15 km/h; ambiguity is deferred ("Later.").
* Gate codes are only read back on arrival at that address.

## 4. MVP implementation plan

1. **Week 1–2: data + parser.** Apply `schema.sql`; load LINZ street/suburb data for the run's territory into
   the parser dictionaries; write the PostGIS `Geo` repo (geocode via LINZ/Addressfinder with cache in `locations`).
2. **Week 3: intake.** Wire `POST /intake` to the graph with `PostgresSaver`; voice dictation from the app
   (Deepgram nova streaming, `en-NZ`, keyword-boost suburbs); speak interrupts back.
3. **Week 4: template lock.** Template editor = "record my run once": derive segment order from yesterday's
   delivered GPS trace, then the driver corrects by voice ("swap Grimseys and Sawyers Arms").
4. **Week 5: on-shift loop.** Voice socket + fast path + copilot tools + `next_stop_line`; local SQLite event log
   and `events:batch` sync.
5. **Phase 2:** approach whispers (`ST_DWithin(entry_point, gps, 50)`), notes retrieval via pgvector,
   manifest photo OCR through a vision model.
6. **Phase 3:** van-zone voice tagging during loading ("this one mid rack"), skip-street / priority / break
   commands, traffic re-routing that only reorders *within* the template, never across it.

Success metrics to instrument from day one: intake minutes per 100 parcels, seconds parked per stop,
touches per shift, and fast-path hit rate.
