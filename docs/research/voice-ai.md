# Voice AI Architecture — Dictation, Correction & Commands

> **Last Updated:** October 2026
> **Goal:** Sub-300ms offline commands, high-accuracy dictation with LINZ-backed correction, < $1/shift AI cost.

---

## 1. Voice Interaction Modes

| Mode | Trigger | Latency Budget | Connectivity | Model |
|------|---------|----------------|--------------|-------|
| **Wake Word** | "Hey Courier" / "Ya Copilot" | < 100ms | Offline | Porcupine / Sherpa KWS |
| **Fast Commands** | "Delivered", "Next", "Skip", "Back", "Gate code 1234" | **< 300ms** | **Offline** | Sherpa-onnx (Zipformer) |
| **Dictation (Morning)** | "Start recording addresses" → continuous speech | < 800ms/utt | Online (WiFi/4G) | Deepgram Nova-3 `en-NZ` |
| **Conversational** | "What's next?", "Add 14 Harewood", "Park once here" | < 1.5s | Online | Pipecat + Claude Haiku |
| **Whisper Approach** | Auto at 150m / 30m geofence | < 500ms | Offline TTS | Cartesia Sonic / ElevenLabs Flash |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE DEVICE                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Audio In   │→ │  VAD (Silero)│→ │  Router (Intent)     │   │
│  │  (Mic/BT)   │  │  (On-device) │  │  ┌────────────────┐  │   │
│  └─────────────┘  └──────────────┘  │  │ Fast Commands  │  │   │
│                                     │  │ (Sherpa-onnx)  │  │   │
│  ┌─────────────┐                    │  └────────────────┘  │   │
│  │ Wake Word   │───────────────────→│  ┌────────────────┐  │   │
│  │ (Porcupine) │                    │  │ Dictation/Conv │──┼──→┐
│  └─────────────┘                    │  │ (Deepgram/Pipecat) │  │
│                                     │  └────────────────┘  │   │
│  ┌─────────────┐                    └──────────────────────┘   │
│  │  TTS Out    │←───────────────────────────────────────────────│
│  │ (Cartesia/  │              WebSocket (Pipecat)                │
│  │  ElevenLabs)│                                                 │
│  └─────────────┘                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌───────────────┐   ┌───────────────┐
            │  FAST PATH    │   │  SMART PATH   │
            │  (Offline)    │   │  (Cloud)      │
            │  • Delivered  │   │  • Dictation  │
            │  • Next/Skip  │   │  • Questions  │
            │  • Gate code  │   │  • Rules      │
            │  • Break      │   │  • Corrections│
            └───────────────┘   └───────────────┘
```

---

## 3. Fast Command Path (Offline-First, < 300ms)

### 3.1 Sherpa-onnx Configuration

```python
# models/sherpa-onnx-config.json
{
  "tokens": "tokens.txt",
  "encoder": "encoder-epoch-99-avg-1.onnx",
  "decoder": "decoder-epoch-99-avg-1.onnx",
  "joiner": "joiner-epoch-99-avg-1.onnx",
  "provider": "cpu",  # or "coreml" / "nnapi"
  "num_threads": 2,
  "sample_rate": 16000,
  "feature_dim": 80,
  "decoding_method": "greedy_search",
  "hotwords": "delivered,next,skip,back,gate,break,priority,delivered at,left at",
  "hotwords_score": 1.5,
  "blank_penalty": 0.0,
  "rule_fsts": "commands.fst"  # FST for command grammar
}
```

### 3.2 Command Grammar (FST) — Compiled to `commands.fst`

```
# Core commands (exact match → instant)
delivered          → MARK_DELIVERED {}
delivered at <loc> → MARK_DELIVERED {safe_place: <loc>}
done               → MARK_DELIVERED {}
dropped            → MARK_DELIVERED {}
tick               → MARK_DELIVERED {}
next               → SKIP_STOP {scope: "stop", return_later: true}
skip               → SKIP_STOP {scope: "stop", return_later: true}
come back          → SKIP_STOP {scope: "stop", return_later: true}
skip street        → SKIP_STOP {scope: "street", return_later: true}
repeat             → REPEAT_DETAIL {}
what               → REPEAT_DETAIL {}
say again          → REPEAT_DETAIL {}
break <min>        → START_BREAK {minutes: <min>}
pause <min>        → START_BREAK {minutes: <min>}
resume             → END_BREAK {}
gate code <code>   → ADD_LOCATION_NOTE {kind: "gate_code", text: <code>}
side gate          → ADD_LOCATION_NOTE {kind: "entry", text: "side gate"}
dog                → ADD_LOCATION_NOTE {kind: "hazard", text: "dog"}
parcel box         → ADD_LOCATION_NOTE {kind: "safe_place", text: "parcel box"}
```

### 3.3 Earbud Button Mapping (Hands-Free)

| Press Pattern | Action | Fast Path Tool |
|---------------|--------|----------------|
| **Single press** | "Delivered" | `mark_delivered` |
| **Double press** | "Skip / Come back" | `skip_stop {return_later: true}` |
| **Long press (1.5s)** | "Talk to assistant" | Opens conversational channel |
| **Triple press** | "Emergency / Help" | `mark_failed {reason: "emergency"}` |

**Implementation:** `react-native-headset-event` + native module for iOS/Android button events.

---

## 4. Dictation Path (Morning Intake) — Continuous Speech → Corrected List

### 4.1 Flow

```
Driver: "Start recording" → Wake word confirms
         │
         ▼
    Deepgram Streaming (WebSocket)
    - Model: nova-3
    - Language: en-NZ
    - Keywords: [All street names in driver's territory + suburbs]
    - Interim results: ON (live text on screen)
    - Punctuation: ON
    - Profanity filter: OFF (drivers swear)
         │
         ▼
    Client buffers utterances → sends batch on "Finished" / 8s silence
         │
         ▼
    Server: Intake Graph (LangGraph)
    1. INGEST: LLM extracts structured parcels from raw text
    2. NORMALISE: nz_address.parse() → canonical + confidence
    3. VERIFY: Check against LINZ (geocode, territory, duplicates)
    4. ASK_DRIVER: Only for anomalies (incomplete, ungeocodable, out_of_territory, low_conf)
    5. SEQUENCE: Master Template Lock ordering
    6. ZONE: Van zone assignment
    7. BRIEF: Spoken summary + correction report
         │
         ▼
    Returns: DayList (ordered stops) + CorrectionReport
```

### 4.2 Correction Report Generation (Unique Innovation)

**Input:** List of `{original_utterance, corrected_address, confidence, changes[]}`

**Output (Spoken):**
> "Recorded 212 stops. Corrected 4:
> You said *Rickerton* → fixed to *Riccarton*.
> You said *1400 Harewood* → number doesn't exist, changed to *140*.
> You said *7 then 17 Sawyers Arms* → kept *17*.
> One I'm unsure: *Smith Street* — Redwood or Belfast?"

**Rules:**
- **Auto-correct (silent, reported):** Spelling, known ASR errors, single-suburb match, self-correction
- **Ask (max 2 options):** Ambiguous suburb, missing number, outside territory, low ASR confidence
- **Never guess:** If no clear winner → ask

### 4.3 NZ-Specific ASR Enhancements

| Challenge | Solution |
|-----------|----------|
| **Māori names** (Papanui, Mairehau, Waimairi, Ōtautahi) | Keyword boost in Deepgram + custom vocabulary in Sherpa |
| **Number formats** ("two slash fourteen" = 2/14, "one four two" = 142) | `nz_address._words_to_digits()` + FST grammar |
| **Flat/unit numbers** ("flat 3", "unit B", "2/14") | Explicit parsing in normaliser |
| **Rural Delivery (RD)** ("RD 3 Oxford") | LINZ suburb list includes RD areas |
| **Truck noise** (engine, rattle, wind) | Silero VAD + directional mic (earbud) + noise gate |

### 4.4 Dictation UX States

| State | Visual | Audio | Driver Action |
|-------|--------|-------|---------------|
| **IDLE** | Big mic button "Start Recording" | — | Tap / "Start recording" |
| **LISTENING** | Live transcript, pulsing wave, stop counter | Soft "listening" tone | Speak addresses; "No, 17" corrects last |
| **PROCESSING** | "Thinking..." spinner | — | Wait |
| **REVIEW** | Yellow/red cards only, 2 big buttons each | Question read aloud | Tap/voice "Redwood" / "Belfast" |
| **CONFIRMED** | Green check, "212 stops locked. Load rear first." | Summary + correction report | "Start loading" / "Add more" |

---

## 5. Conversational Path (Pipecat + Claude Haiku)

### 5.1 Pipecat Pipeline

```python
# server/voice/pipeline.py
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.services.deepgram import DeepgramSTTService
from pipecat.services.cartesia import CartesiaTTSService
from pipecat.services.anthropic import AnthropicLLMService
from pipecat.transports.network.websocket_server import WebsocketServerTransport

# Tools exposed to LLM (same as copilot.py TOOLS)
tools = [
    {"name": "mark_delivered", ...},
    {"name": "skip_stop", ...},
    {"name": "add_stop", ...},
    {"name": "add_location_note", ...},
    {"name": "repeat_or_detail", ...},
    {"name": "query_history", ...},  # "When did I last deliver to 14 Harewood?"
]

pipeline = Pipeline([
    transport.input(),           # WebSocket audio in
    stt,                         # Deepgram STT
    context_aggregator.user(),   # Build context
    llm,                         # Claude Haiku (with tools)
    tts,                         # Cartesia TTS
    transport.output(),          # WebSocket audio out
    context_aggregator.assistant(),
])
```

### 5.2 System Prompt (Optimized for Voice)

```python
EXECUTIVE_COPILOT_VOICE = """
You are the co-driver in the ear of a courier in Christchurch, NZ.
Driver is driving or carrying parcels. Cannot look at screen.

SPEAKING RULES:
- MAX 15 WORDS per turn. Lead with action.
- Plain spoken NZ English. Numbers as spoken: "two slash fourteen", "forty-two B".
- Te reo Māori names correct: Papanui, Mairehau, Waimairi, Ōtautahi.
- No "I", "sure", "okay", "great". No apologies. No markdown.
- Confirm destructive actions in ≤5 words ONLY if ambiguous.

TOOLS (call exactly ONE):
- mark_delivered(safe_place?) — "delivered", "left at gate"
- mark_failed(reason) — "no one home", "dog", "wrong address"
- skip_stop(scope, return_later) — "skip", "come back", "skip street"
- add_stop(raw_address, priority) — "add 14 Harewood urgent"
- start_break(minutes) / end_break()
- add_location_note(kind, text) — "gate code 1234", "side gate", "dog"
- repeat_or_detail() — "what", "where in van"
- query_history(address) — "when last at 14 Harewood"
- noop() — chatter, customer talk, radio. STAY SILENT.

IF speed > 15 km/h: NEVER ask questions. Say "Later."

AFTER STATE CHANGE, say next stop EXACTLY:
"<number> <street>. <van location>. <one tip if any>."
Example: "Forty-two B Main North Road. Mid rack, small box. Side gate left of garage."
"""
```

### 5.3 Cost Optimization (Target < $1/shift)

| Component | Cost/1M Tokens | Est. Tokens/Shift | Cost/Shift |
|-----------|----------------|-------------------|------------|
| **Claude Haiku** (prompt caching) | $0.25 / $1.25 | 50K cached + 5K new | **$0.02** |
| **Deepgram Nova-3** | $0.0043/min | 30 min dictation | **$0.13** |
| **Cartesia Sonic** | $0.0004/char | 5K chars TTS | **$0.02** |
| **Pipecat hosting** | — | — | **$0.05** |
| **Total** | | | **~$0.22/shift** |

**80% of commands hit fast path (offline) = $0 cloud cost.**

---

## 6. Voice Quality Assurance

### 6.1 Golden Test Set (200 Real Recordings)

| Category | Count | Description |
|----------|-------|-------------|
| Dictation (30 addresses) | 50 | Morning intake in truck cab |
| Fast commands | 50 | "Delivered", "Next", "Skip", "Gate code" |
| Conversational | 50 | "Add stop", "What's next", "Where in van" |
| Noisy/accented | 50 | Engine noise, Māori names, self-corrections |

**Metrics:** WER, Command Accuracy, Latency (p50/p99), False Wake Rate.

### 6.2 Regression Testing (CI)

```yaml
# .github/workflows/voice-qa.yml
- name: Run voice regression
  run: |
    python -m pytest tests/voice/ -v \
      --benchmark-min-time=10 \
      --assert-wake-false-rate<0.01 \
      --assert-command-accuracy>0.98 \
      --assert-dictation-wer<0.08
```

---

## 7. Open Questions / Risks

| Question | Status | Owner |
|----------|--------|-------|
| Sherpa-onnx v0.3 API stable? | ⚠️ Testing | Voice Lead |
| Porcupine commercial license cost at scale? | ⚠️ Quote needed | Biz Lead |
| Deepgram `en-NZ` keyword boost limit? | ✅ 1000 keywords | Voice Lead |
| Pipecat WebSocket reconnection on mobile? | ⚠️ Testing | Backend Lead |
| Battery: 12h continuous mic + GPS + BLE? | ⚠️ Field test | Mobile Lead |
| iOS background audio + mic permissions? | ✅ Works (nav apps) | Mobile Lead |

---

## 8. Sources

| Source | Date | Key Finding |
|--------|------|-------------|
| github.com/k2-fsa/sherpa-onnx | Oct 2026 | Zipformer/Moonshine/Whisper on mobile |
| github.com/XDcobra/react-native-sherpa-onnx | Sep 2026 | RN bridge, v0.3 breaking |
| github.com/pipecat-ai/pipecat | Oct 2026 | Voice orchestration, tool calling |
| Deepgram Nova-3 docs | Oct 2026 | `en-NZ` model, keyword boost |
| Cartesia Sonic docs | Oct 2026 | 90ms latency, voice cloning |
| Picovoice Porcupine pricing | Oct 2026 | $0.50/device/mo volume |
| LINZ Address API | Oct 2026 | Suburb/street lists for keyword boost |