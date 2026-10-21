"""The server brain and the rules of D25.

The gateway is the one way the courier's words leave the phone, so the rules
that guard it are tested here:

- only the providers on the allow-list may answer;
- an empty allow-list means the server brain is unavailable;
- the cost guard stops the calls when the day's budget is spent;
- the logs hold no transcript, no address and no name.
"""

from __future__ import annotations

import logging

import httpx
import pytest

from app.config import VoiceConfig
from app.cost import CostGuard
from app.engine import EngineUnavailableError
from app.engines.omniroute import OmniRouteEngine
from app.models import ReasoningRequest, RunContext, Stop


def a_config(
    base_url: str = "http://gateway.test",
    api_key: str = "key",
    providers: str = "provider-a",
) -> VoiceConfig:
    """A configuration with a gateway and an allowed provider."""
    return VoiceConfig(
        omniroute_base_url=base_url,
        omniroute_api_key=api_key,
        omniroute_allowed_providers=providers,
    )


def an_answer(text: str = "Eight stops left.", provider: str | None = None) -> dict[str, object]:
    """The body the gateway answers with."""
    document: dict[str, object] = {
        "choices": [{"message": {"content": text}}],
        "usage": {"total_tokens": 120},
    }
    if provider is not None:
        document["provider"] = provider
    return document


def an_engine(
    handler,
    *,
    guard: CostGuard | None = None,
    base_url: str = "http://gateway.test",
    api_key: str = "key",
    providers: str = "provider-a",
) -> OmniRouteEngine:
    """A server brain with a fake gateway."""
    config = a_config(base_url=base_url, api_key=api_key, providers=providers)
    client = httpx.Client(transport=httpx.MockTransport(handler))
    return OmniRouteEngine(config, client, guard)


def a_request() -> ReasoningRequest:
    """A turn of the conversation."""
    return ReasoningRequest(
        transcript="where's the parcel for Mrs Smith?",
        context=RunContext(stops=(Stop(id="s1", number="9", street="Rimu Street"),)),
    )


def test_the_server_brain_answers_with_the_words_of_the_gateway():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=an_answer())

    engine = an_engine(handler)
    reply = engine.reason(a_request())

    assert reply.speech == "Eight stops left."
    assert reply.source == "server"
    assert reply.tokens == 120


def test_the_allow_list_travels_with_the_call():
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json=an_answer())

    an_engine(handler).reason(a_request())

    assert seen[0].headers["X-Courier-Allowed-Providers"] == "provider-a"
    assert seen[0].headers["Authorization"] == "Bearer key"


def test_a_provider_that_is_not_allowed_is_refused():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=an_answer(provider="provider-b"))

    engine = an_engine(handler)
    with pytest.raises(EngineUnavailableError) as failure:
        engine.reason(a_request())
    assert "not allowed" in str(failure.value)
    assert "D25" in str(failure.value)


def test_a_provider_named_in_the_header_is_refused_too():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=an_answer(), headers={"x-omniroute-provider": "provider-b"})

    engine = an_engine(handler)
    with pytest.raises(EngineUnavailableError):
        engine.reason(a_request())


def test_without_an_allowed_provider_the_server_brain_is_unavailable():
    engine = an_engine(
        lambda request: httpx.Response(200, json=an_answer()), providers=""
    )
    assert engine.capabilities().online is False
    assert "D25" in engine.capabilities().reason
    with pytest.raises(EngineUnavailableError):
        engine.reason(a_request())


def test_without_a_gateway_the_server_brain_is_unavailable():
    engine = OmniRouteEngine(VoiceConfig())
    assert engine.capabilities().online is False
    with pytest.raises(EngineUnavailableError):
        engine.reason(a_request())


def test_the_call_is_tried_twice_and_then_given_up():
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(500, json={})

    engine = an_engine(handler)
    with pytest.raises(EngineUnavailableError):
        engine.reason(a_request())
    assert len(calls) == 2


def test_a_refusal_by_the_gateway_is_not_retried():
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(400, json={})

    engine = an_engine(handler)
    with pytest.raises(EngineUnavailableError):
        engine.reason(a_request())
    assert len(calls) == 1


def test_the_cost_guard_stops_the_calls_when_the_budget_is_spent():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=an_answer())

    guard = CostGuard(limit_nzd=0.0, price_nzd_per_1k_tokens=0.02)
    engine = an_engine(handler, guard=guard)
    with pytest.raises(EngineUnavailableError) as failure:
        engine.reason(a_request())
    assert "budget" in str(failure.value)


def test_the_cost_of_a_call_is_added_to_the_day():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=an_answer())

    engine = an_engine(handler)
    reply = engine.reason(a_request())
    assert reply.cost_nzd == pytest.approx(0.0024)
    assert engine.guard.spent_nzd == pytest.approx(0.0024)
    assert engine.guard.calls == 1


def test_the_logs_hold_no_transcript_and_no_address(caplog: pytest.LogCaptureFixture):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=an_answer())

    engine = an_engine(handler)
    with caplog.at_level(logging.INFO, logger="courier_voice.omniroute"):
        engine.reason(a_request())

    written = " ".join(record.getMessage() for record in caplog.records)
    assert "Mrs Smith" not in written
    assert "Rimu Street" not in written
    assert "where's the parcel" not in written
    assert "tokens=120" in written


def test_the_server_speech_is_not_configured_by_default():
    engine = an_engine(lambda request: httpx.Response(200, json=an_answer()))
    assert engine.capabilities().stt is False
    assert engine.capabilities().tts is False
    with pytest.raises(EngineUnavailableError):
        engine.transcribe(b"", language="en-NZ", sample_rate=16000)
    with pytest.raises(EngineUnavailableError):
        engine.synthesise("Eight stops left.", voice="nz", speed=1.0)
