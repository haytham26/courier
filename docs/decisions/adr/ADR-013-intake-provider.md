# ADR-013 — The intake provider seam: OmniRoute when configured, the deterministic fake otherwise

- **Status:** accepted
- **Date:** 2026-10-25
- **Decides:** D40 (queue 2, item 5: close the two intake stubs through the fake OmniRoute provider)
- **Builds on:** D25 (the self-hosted OmniRoute gateway is the one server brain), `app/agents/intake_graph.py` (the graph and its `llm_extract`/`llm_phrase`/`Geo` seams), `app/prompts.py` (the extraction and anomaly prompts), ADR-010 (the 404 discipline, the upload caps)

## Context

The contract has carried `POST /shifts/{shift_id}/intake` (voice text) and
`POST /shifts/{shift_id}/intake/manifest` (paper-manifest photo) since the kickoff; the API shipped
them as `...` stubs returning null. The graph behind them is real and tested
(`tests/agents/test_intake_graph.py`), and it takes its model calls and its geography through
seams. What was missing is the wiring: who extracts, who phrases, who geocodes — and what happens
when the OmniRoute gateway does not exist yet (it is a FOUNDER_TODO: self-hosted on the Oracle box,
`OMNIROUTE_BASE_URL`/`OMNIROUTE_API_KEY` in the server secret manager).

## Decision

### 1. One provider protocol, two implementations

`services/api/app/agents/omniroute.py`:

- **`OmniRouteProvider`** — the OpenAI-compatible chat-completions client of the self-hosted
  gateway. `extract` sends the `INGEST_EXTRACT` prompt and parses the JSON answer defensively
  (prose around the object is tolerated); `phrase` sends `ANOMALY_QUESTION`; `ocr` sends the photo
  as an image URL with the transcription prompt. Env-only settings
  (`OMNIROUTE_BASE_URL`, `OMNIROUTE_API_KEY`, `OMNIROUTE_MODEL`, `OMNIROUTE_TIMEOUT_SECONDS`);
  keys are never logged.
- **`FakeOmniRoute`** — the deterministic provider, selected whenever the gateway address or key
  is absent (`get_intake_provider()`). Voice dictation is split one parcel per non-empty line:
  a real transcription shape, not a fabrication. Its OCR raises `ProviderUnavailableError` — the
  fake never invents a manifest from a photo; a test may configure `ocr_text` to drive the same
  graph.

The failure paths are deliberately asymmetric: an unparseable extraction raises `OmniRouteError`
(an invented manifest is worse than an honest error; the endpoint answers 502), while a phrasing
failure falls back to `"Confirm <raw>?"` — the courier must always get a question.

### 2. The endpoints

- Both are owner-only: a shift that is not the caller's run is 404, before any model call.
- `IntakeText` is bounded (`text` 1–50,000 characters, `source` the contract's enum); the manifest
  upload keeps the POD rules (10 MiB cap read first, JPEG/PNG/HEIC by magic bytes, never by the
  client's name).
- The response is the contract's `BriefingResponse` or `InterruptQuestion`. Answers to a question
  resume the graph; **the voice-socket resume wiring is the next slice** (the socket already
  routes transcripts to the copilot).
- Provider outcomes: extraction failure 502, OCR unavailable without a gateway 503 — never a
  silent empty manifest.

### 3. The interrupt state

A process-wide `MemorySaver`, `thread_id = shift_id`. A restart loses a pending question and the
courier simply repeats it; the persistent checkpointer (Postgres) rides with the staging
deployment, together with the worker-count decision (an in-process saver pins a shift to one
worker).

### 4. The geography the graph sees

`services/api/app/agents/intake_geo.py`: `geocode` resolves from the stops the run already carries
(number+street within the run; the suburb is dropped because a dispatcher-seeded stop may lack
one) and returns None otherwise — the verification agent asks the courier, never a guess.
`in_territory` is a ±0.25° box around the depot (a misread detector, not a real territory);
`template` reads the run's Master Template Lock; `notes` returns nothing until the door memory
(ADR-012) is wired. The real geocoder is the address-intelligence slice; the graph's contract does
not change when it lands.

## Consequences

- The phone can run morning intake today: the voice path works end-to-end with the fake, and the
  manifest path reports honestly that OCR awaits the gateway.
- The gateway decision (D25, the provider allow-list, the cost guard in the voice service) is
  unchanged; the API speaks the same OpenAI-compatible shape.
- When the gateway lands, only environment settings change — no client update.

## Verification

- `tests/agents/test_omniroute.py`: the wire shape on an `httpx.MockTransport` gateway, the
  prose-wrapped JSON, the error paths, the fake's determinism and OCR refusal, the env selection.
- `tests/test_intake_api.py`: the question and briefing responses, the OCR-unavailable 503, the
  same graph through `ocr_text`, the 502, the owner 404, the anonymous 401, and the upload bounds.
- The contract drift guard (the paths were already served; no contract change).
