"""The on-device engine: sherpa-onnx on the phone.

The speech happens on the phone. `react-native-sherpa-onnx` (MIT) runs the
sherpa-onnx runtime (Apache-2.0) with the Kokoro voice pack (Apache-2.0) and
the Smart Turn v3 end-of-turn model (BSD-2-Clause). The service never sees
the audio of the driver: the phone transcribes, the phone speaks.

That is why this engine holds a bridge to the phone rather than a model: the
model is in the courier's hand. The bridge is what a device session replaces
in production, and the tests replace it with a fake.
"""

from __future__ import annotations

from typing import Protocol

from .. import licences
from ..engine import EngineUnavailableError
from ..models import (
    EngineInfo,
    ReasoningReply,
    ReasoningRequest,
    Speech,
    Transcript,
)
from ..offline_brain import offline_reason


class DeviceBridge(Protocol):
    """The phone, as the service sees it."""

    def transcribe(self, audio: bytes, *, language: str, sample_rate: int) -> Transcript:
        """What the courier said, as the phone heard it."""
        ...

    def synthesise(self, text: str, *, voice: str, speed: float) -> Speech:
        """How the phone says the words."""
        ...


class SherpaOnnxEngine:
    """The engine that works with no network at all.

    The turn detection of this engine is the one the research settled on: the
    sherpa-onnx keyword spotting opens the turn (the wake word or the earbud
    press), the Silero voice activity gate that sherpa ships closes it, and
    Smart Turn v3 reads the prosody to tell that the courier has finished
    talking. All three are licence clean (Apache-2.0 and BSD-2-Clause).
    """

    name = "on-device"

    def __init__(self, bridge: DeviceBridge | None = None) -> None:
        self._bridge = bridge

    def capabilities(self) -> EngineInfo:
        """What this engine can do."""
        return EngineInfo(
            name=self.name,
            online=False,
            stt=self._bridge is not None,
            tts=self._bridge is not None,
            chat=True,
            reason="the on-device brain answers from the run the phone has",
            licence=licences.licence_of("sherpa-onnx"),
        )

    def _check_licence(self) -> None:
        if not licences.is_shippable("sherpa-onnx"):
            raise EngineUnavailableError(licences.reason_for("sherpa-onnx"))

    def transcribe(self, audio: bytes, *, language: str, sample_rate: int) -> Transcript:
        """What the courier said."""
        self._check_licence()
        if self._bridge is None:
            raise EngineUnavailableError(
                "the speech runs on the phone; send the transcript with the turn"
            )
        return self._bridge.transcribe(audio, language=language, sample_rate=sample_rate)

    def synthesise(self, text: str, *, voice: str, speed: float) -> Speech:
        """How the words are said."""
        self._check_licence()
        if self._bridge is None:
            # The phone holds the voice pack: the service hands the words back.
            return Speech(text=text, audio=None, voice=voice, speed=speed, spoken_by="device")
        return self._bridge.synthesise(text, voice=voice, speed=speed)

    def reason(self, request: ReasoningRequest) -> ReasoningReply:
        """What the voice answers, with no internet at all."""
        self._check_licence()
        reply = offline_reason(request)
        return reply.model_copy(update={"engine": self.name})
