"""The swappable engine port.

D23 says the voice engine has to be replaceable without touching the app: a
commercially-licensed model can take the place of ours at any time. That is
only true if every engine answers the same questions, so the port below is the
whole contract:

  - what can this engine do (the capabilities),
  - what did the courier say (the transcription),
  - what should the voice say (the reasoning).

An engine that cannot serve a turn raises `EngineUnavailableError` with the reason.
The reason is never swallowed: the driver is told when a capability is not
there, and the ledger says why.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from .models import (
    EngineInfo,
    ReasoningReply,
    ReasoningRequest,
    Speech,
    Transcript,
)


class EngineUnavailableError(RuntimeError):
    """An engine cannot serve this turn, and it says why."""


@runtime_checkable
class VoiceEngine(Protocol):
    """The port every engine of Courier Voice answers to."""

    name: str

    def capabilities(self) -> EngineInfo:
        """What this engine can do, and why when it cannot."""
        ...

    def transcribe(self, audio: bytes, *, language: str, sample_rate: int) -> Transcript:
        """What the courier said."""
        ...

    def synthesise(self, text: str, *, voice: str, speed: float) -> Speech:
        """How the words are said."""
        ...

    def reason(self, request: ReasoningRequest) -> ReasoningReply:
        """What the voice answers, and what it does."""
        ...
