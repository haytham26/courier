# BUG-273 evidence — MASTER §22 B + C on the backend (ADR-028 / D65)

## The change
- `services/courier-voice/app/models.py`: `TurnRequest.stt_confidence` (optional, 0..1, 422
  outside) and the new `SessionMemoryView` response model.
- `services/courier-voice/app/config.py`: `voice_ask_confidence_bar` (`VOICE_ASK_CONFIDENCE_BAR`,
  default 0.8, validated 0..1) — the ONE ask bar, in configuration.
- `services/courier-voice/app/conversation.py`: `ask_question_of(action)` — the one short
  question per command, generated from the decision context.
- `services/courier-voice/app/main.py`: `GET /v1/sessions/{id}/memory` (the visible memory;
  foreign 404, no token 401) and `_maybe_ask` applied to both the free and the paid route at
  the decision point: below the bar the reply becomes `speech`+`notice` question with
  `action: null` and `last_question = "ask:<type>"`.

## Red / green
Red (before the fix, against origin/main `b80cfb2`):
```
FAILED tests/test_s22_bc.py::test_the_memory_is_read_back - assert 405 == 200
FAILED tests/test_s22_bc.py::test_a_confident_command_acts - assert 422 == 200
FAILED tests/test_s22_bc.py::test_a_low_confidence_command_asks_instead_of_acting
(7 failed, 2 passed)
```
Green (after):
```
$ uv run --directory services/courier-voice pytest tests/test_s22_bc.py -q
9 passed in 5.81s
$ uv run --directory services/courier-voice pytest -q
364 passed in 60.44s        # was 355 on main
$ uv run --directory services/courier-voice ruff check .
All checks passed!
```

## The contract for the lead
ADR-028 (`docs/decisions/adr/ADR-028-voice-s22-bc.md`, D65) carries both contract
fragments: the turn's optional `stt_confidence` + the ask shape (`notice` with no
`action`, `last_question="ask:<type>"`), and `GET /v1/sessions/{id}/memory` →
`SessionMemoryView`. The announcement for the lead is in `docs/log/CURRENT-backend.md`.

## What stays with the founder
The held-out set (~100 real courier sentences, FOUNDER_TODO) — when it exists, the §22 B
bar is swept on it per ADR-028's tuning procedure and the number is recorded in
`packages/eval/voice/results/`. Until then the bar is a starting value, stated as such.
