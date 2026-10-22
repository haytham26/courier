"""The switch between the two brains.

The courier does not care which brain answers, and the app does not either:
the shape of the answer is the same either way. The switch is what makes the
offline and the online paths seamless (MASTER_EXECUTION section 12).

The rules:

- the courier chose offline: the on-device brain answers, always;
- the courier chose online and the gateway is there: the server brain
  answers, and if it falls over the on-device brain takes the turn;
- the switch is on automatic: the server brain answers while there is a
  network and the on-device brain answers when there is not.

The driver is told about a missing capability once, and only when the
on-device brain could not answer either.
"""

from __future__ import annotations

from ..engine import EngineUnavailableError, VoiceEngine
from ..models import Mode, ReasoningReply, ReasoningRequest

#: What the voice says when a question needs the internet and there is none.
NEEDS_INTERNET = "I need the internet for that."


class EngineRouter:
    """Picks the brain of a turn and falls back when it falls over."""

    def __init__(self, on_device: VoiceEngine, server: VoiceEngine | None = None) -> None:
        self._on_device = on_device
        self._server = server

    @property
    def on_device(self) -> VoiceEngine:
        """The engine that works with no network."""
        return self._on_device

    @property
    def server(self) -> VoiceEngine | None:
        """The server brain, when there is one."""
        return self._server

    def reason(
        self,
        request: ReasoningRequest,
        *,
        mode: Mode = Mode.AUTO,
        online: bool = True,
    ) -> ReasoningReply:
        """The answer of the turn, and the brain that gave it."""
        if mode is Mode.OFFLINE:
            return self._on_device.reason(request)

        if self._server is None or not online:
            return self._on_device.reason(request)

        try:
            return self._server.reason(request)
        except EngineUnavailableError:
            fallback = self._on_device.reason(request)
            if fallback.action is None and fallback.speech.strip() == "":
                # Neither brain could answer: the driver is told once, and only
                # then. A command that worked offline says nothing.
                return fallback.model_copy(update={"notice": NEEDS_INTERNET})
            return fallback
