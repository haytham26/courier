"""The licence ledger, as a shipped surface.

ADR-004 (point 4) and D23: every engine publishes the licence of its code
and of its weights, and an engine whose licence is unknown or not commercial
is unavailable, with the reason.
"""

from __future__ import annotations

import pytest

from app import licences
from app.config import VoiceConfig
from app.engine import EngineUnavailableError
from app.engines import OmniRouteEngine, SherpaOnnxEngine
from app.models import ReasoningRequest


def test_the_on_device_engine_is_in_the_ledger():
    entry = licences.entry_for("sherpa-onnx")
    assert entry is not None
    assert entry.licence == "Apache-2.0"
    assert entry.decision == "shippable"


def test_the_voice_of_the_phone_is_in_the_ledger():
    entry = licences.entry_for("Kokoro-82M")
    assert entry is not None
    assert entry.licence == "Apache-2.0"


def test_the_turn_detector_is_in_the_ledger():
    entry = licences.entry_for("smart-turn-v3")
    assert entry is not None
    assert entry.licence == "BSD-2-Clause"


def test_the_gateway_is_in_the_ledger():
    entry = licences.entry_for("OmniRoute")
    assert entry is not None
    assert entry.licence == "MIT"


def test_the_non_commercial_weights_are_blocked():
    entry = licences.entry_for("OmniVoice pretrained weights")
    assert entry is not None
    assert entry.decision == "blocked"
    assert licences.is_shippable("OmniVoice pretrained weights") is False


def test_the_share_alike_weights_are_blocked():
    assert licences.is_shippable("openWakeWord shipped models") is False


def test_an_artefact_that_is_not_in_the_ledger_is_not_shippable():
    assert licences.is_shippable("a model nobody has read") is False


def test_the_reason_says_why():
    assert "CC-BY-NC" in licences.reason_for("OmniVoice pretrained weights")
    assert "not in the licence ledger" in licences.reason_for("a model nobody has read")


def test_every_row_of_the_ledger_is_complete():
    for entry in licences.ledger():
        assert entry.artefact.strip() != ""
        assert entry.licence.strip() != ""
        assert entry.read_on.strip() != ""
        assert entry.decision in ("shippable", "internal-only", "blocked")
        assert entry.obligations.strip() != ""
        assert entry.where_used.strip() != ""


def test_the_on_device_engine_refuses_to_run_without_a_clean_licence(monkeypatch):
    engine = SherpaOnnxEngine()
    monkeypatch.setattr(licences, "is_shippable", lambda artefact: False)
    with pytest.raises(EngineUnavailableError):
        engine.reason(ReasoningRequest(transcript="delivered"))


def test_the_on_device_engine_speaks_the_words_of_the_phone():
    engine = SherpaOnnxEngine()
    speech = engine.synthesise("Eight stops left.", voice="nz", speed=1.0)
    assert speech.text == "Eight stops left."
    assert speech.spoken_by == "device"
    assert speech.audio is None


def test_the_on_device_engine_says_why_it_cannot_transcribe():
    engine = SherpaOnnxEngine()
    with pytest.raises(EngineUnavailableError):
        engine.transcribe(b"", language="en-NZ", sample_rate=16000)


def test_the_server_brain_is_not_ready_without_a_gateway():
    engine = OmniRouteEngine(VoiceConfig())
    assert engine.capabilities().online is False
    with pytest.raises(EngineUnavailableError):
        engine.reason(ReasoningRequest(transcript="how many left?"))


def test_the_server_brain_is_not_ready_without_an_allowed_provider():
    config = VoiceConfig(
        omniroute_base_url="http://127.0.0.1:9",
        omniroute_api_key="key",
        omniroute_allowed_providers="",
    )
    engine = OmniRouteEngine(config)
    assert engine.capabilities().online is False
    assert "D25" in engine.capabilities().reason


def test_the_server_brain_is_ready_with_a_gateway_and_a_provider():
    config = VoiceConfig(
        omniroute_base_url="http://127.0.0.1:9",
        omniroute_api_key="key",
        omniroute_allowed_providers="provider-a,provider-b",
    )
    engine = OmniRouteEngine(config)
    assert engine.capabilities().online is True
    assert engine.capabilities().licence == "MIT"
