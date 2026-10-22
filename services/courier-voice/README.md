# Courier Voice

The shift companion (D23): the service that turns what the courier said into
what the voice says, and what the app does next.

**The name the drivers see is "Courier Voice".** The licences of the code and
of the weights stay internal, in `docs/product/LICENSES.md` and in the ledger this
service publishes at `/v1/licences`.

## What is in here

| Module | What it owns |
|---|---|
| `app/engine.py` | the swappable engine port (D23 condition c) |
| `app/engines/on_device.py` | the on-device engine: sherpa-onnx (STT/TTS) on the phone |
| `app/engines/omniroute.py` | the server brain behind the OmniRoute gateway (D25) |
| `app/engines/router.py` | the online/offline switch and the fallback |
| `app/turns.py` | the turn taking: the wake word, the earbud, the barge-in, the silence |
| `app/proactive.py` | what the voice says before it is asked |
| `app/conversation.py` | the questions about the run and the driver's own data |
| `app/smalltalk.py` | the bounded small talk |
| `app/safety.py` | the driving-safe rules |
| `app/memory.py` | the day's context, the preferences, the learned runs |
| `app/licences.py` | the licence ledger, as a shipped surface |
| `app/eval_harness.py` | the harness that runs the scripted shift simulations |

## Running it

```
uv sync --directory services/courier-voice --extra dev
uv run --directory services/courier-voice uvicorn app.main:app --port 8080
uv run --directory services/courier-voice pytest -q
```

The service needs `AUTH_JWKS_URL` and `AUTH_JWT_ISSUER` (the same tokens the
Courier API accepts) and, for the server brain, `OMNIROUTE_BASE_URL` and
`OMNIROUTE_API_KEY`. Without a gateway the service still runs: the on-device
engine answers every command.

## The rules it keeps

- At most eight words while the van is moving.
- Never a demand for a touch of the screen while moving.
- The quiet mode and the essentials mode.
- A call on the phone wins over the voice.
- The voice never says it is an AI, and it speaks plain NZ English.
- No emoji, no markdown, no symbols in a spoken line.
