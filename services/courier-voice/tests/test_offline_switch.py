"""The switch between the on-device brain and the server brain.

The courier does not notice the switch: the shape of the answer is the same
either way. What the courier is told is only that a capability is not there.
"""

from __future__ import annotations

from httpx import AsyncClient

from app.engine import EngineUnavailableError
from app.engines import EngineRouter, SherpaOnnxEngine
from app.models import Mode, ReasoningReply, ReasoningRequest


async def a_session(client: AsyncClient) -> str:
    """A shift of the service."""
    response = await client.post("/v1/sessions", json={})
    assert response.status_code == 200
    return str(response.json()["id"])


async def test_the_online_turn_goes_to_the_server_brain(client: AsyncClient, server_engine):
    session_id = await a_session(client)
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "how many left?", "mode": "online", "online": True},
    )
    body = response.json()
    assert body["source"] == "server"
    assert body["engine"] == "fake"
    assert body["speech"] == "Eight stops left."


async def test_the_offline_turn_stays_on_the_phone(client: AsyncClient, server_engine):
    session_id = await a_session(client)
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "how many left?", "mode": "offline", "online": True},
    )
    body = response.json()
    assert body["source"] == "on-device"
    assert server_engine.requests == []


async def test_the_automatic_turn_goes_offline_when_there_is_no_network(
    client: AsyncClient, server_engine
):
    session_id = await a_session(client)
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "how many left?", "mode": "auto", "online": False},
    )
    assert response.json()["source"] == "on-device"
    assert server_engine.requests == []


async def test_a_command_works_without_the_network(client: AsyncClient, server_engine):
    session_id = await a_session(client)
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "delivered", "mode": "auto", "online": False},
    )
    body = response.json()
    assert body["action"]["type"] == "mark_delivered"
    assert body["speech"] == "Delivered."


async def test_the_server_brain_falls_over_and_the_phone_answers(
    client: AsyncClient, server_engine
):
    server_engine.fail = True
    session_id = await a_session(client)
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "how many left?", "mode": "online", "online": True},
    )
    body = response.json()
    assert body["source"] == "on-device"
    assert body["speech"] == "0 stops left."
    assert body["notice"] is None


async def test_the_driver_is_told_when_neither_brain_can_answer(
    client: AsyncClient, server_engine
):
    server_engine.fail = True
    session_id = await a_session(client)
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "what is the meaning of life?", "mode": "online", "online": True},
    )
    body = response.json()
    assert body["speech"] == "I need the internet for that."


def test_the_router_never_calls_the_server_in_the_offline_mode():
    """The rule itself, without the service around it."""

    class Failing:
        name = "failing"

        def capabilities(self):
            raise AssertionError("the capabilities are not needed here")

        def transcribe(self, audio, *, language, sample_rate):
            raise AssertionError("not needed")

        def synthesise(self, text, *, voice, speed):
            raise AssertionError("not needed")

        def reason(self, request: ReasoningRequest) -> ReasoningReply:
            raise EngineUnavailableError("the server brain is down")

    router = EngineRouter(on_device=SherpaOnnxEngine(), server=Failing())
    reply = router.reason(
        ReasoningRequest(transcript="delivered"),
        mode=Mode.OFFLINE,
        online=True,
    )
    assert reply.action is not None
    assert reply.action.type == "mark_delivered"
