"""MASTER §22 techniques B and C, as the service keeps them (BUG-273).

Technique B - ask on low confidence: when the STT's own confidence in the
transcript falls below the one configured bar, the service asks one short
question (a `notice` with no `action`) instead of acting on the guess, and
records the question as the shift's `last_question` so the thread can be
answered. The bar is configuration (`VOICE_ASK_CONFIDENCE_BAR`), not prompt
text; its final tuning on the held-out set is the founder's (FOUNDER_TODO -
the ~100 real courier sentences).

Technique C - the memory read: `GET /v1/sessions/{id}/memory` returns what
the service currently believes about the shift, so the app can show it and
the courier can correct it. Only the courier the token names reads it.
"""

from __future__ import annotations

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.auth import Principal, get_principal
from app.config import VoiceConfig
from app.engines import EngineRouter, SherpaOnnxEngine
from app.main import create_app
from app.memory import InMemoryStore

from .conftest import FakeEngine, FakeRunClient


async def a_session(client: AsyncClient, **body: object) -> str:
    response = await client.post("/v1/sessions", json=body)
    assert response.status_code == 200
    return str(response.json()["id"])


def an_app(bar: float, store: InMemoryStore, principal: Principal) -> FastAPI:
    service = create_app(
        config=VoiceConfig(voice_ask_confidence_bar=bar),
        router=EngineRouter(on_device=SherpaOnnxEngine(), server=FakeEngine()),
        store=store,
        run_client=FakeRunClient(),
    )
    service.dependency_overrides[get_principal] = lambda: principal
    return service


async def a_client(service: FastAPI) -> AsyncClient:
    transport = ASGITransport(app=service)
    return AsyncClient(transport=transport, base_url="http://courier-voice")


# --- §22 C: the memory read endpoint ---------------------------------------


async def test_the_memory_is_read_back(client: AsyncClient):
    session_id = await a_session(client, shift_id=None)
    response = await client.get(f"/v1/sessions/{session_id}/memory")
    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == session_id
    assert body["remembered"] is True
    assert body["turns"] == 0
    assert body["last_instruction"] is None
    assert body["last_question"] is None
    assert body["learned"] == {
        "usual_order": [],
        "service_times_s": {},
        "door_notes": {},
        "preferences": {},
    }
    assert body["context"]["stops"] == []
    assert body["settings"]["verbosity"] == "normal"


async def test_the_memory_read_shows_what_the_shift_remembers(client: AsyncClient):
    session_id = await a_session(client)
    turn = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={
            "transcript": "how many left?",
            "mode": "offline",
            "context": {
                "stops": [
                    {
                        "id": "s1",
                        "sequence": 1,
                        "status": "pending",
                        "number": "57",
                        "street": "Poulson Street",
                    }
                ]
            },
        },
    )
    assert turn.status_code == 200
    response = await client.get(f"/v1/sessions/{session_id}/memory")
    assert response.status_code == 200
    body = response.json()
    assert body["turns"] == 1
    assert body["last_instruction"] == "1 stops left."
    assert body["context"]["stops"][0]["id"] == "s1"


async def test_the_memory_of_another_courier_is_not_there(client: AsyncClient, client_app):
    session_id = await a_session(client)
    other = Principal(user_id="driver-2", claims={"sub": "driver-2"}, token="t")
    client_app.dependency_overrides[get_principal] = lambda: other
    response = await client.get(f"/v1/sessions/{session_id}/memory")
    assert response.status_code == 404


async def test_the_memory_read_needs_a_token():
    service = create_app(
        router=EngineRouter(on_device=SherpaOnnxEngine(), server=FakeEngine()),
        store=InMemoryStore(),
        run_client=FakeRunClient(),
    )
    async with await a_client(service) as http:
        response = await http.get("/v1/sessions/whatever/memory")
    assert response.status_code == 401


# --- §22 B: ask on low confidence ------------------------------------------


async def test_a_low_confidence_command_asks_instead_of_acting(client: AsyncClient):
    session_id = await a_session(client)
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "delivered", "mode": "offline", "stt_confidence": 0.3},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["action"] is None
    assert body["notice"] is not None
    assert "delivered" in body["notice"].lower()
    assert body["speech"] == body["notice"]
    # The question is recorded as the shift's last question, so the next
    # turn can answer it (the thread is visible, §22-B property 3).
    memory = await client.get(f"/v1/sessions/{session_id}/memory")
    assert memory.json()["last_question"] == "ask:mark_delivered"


async def test_a_confident_command_acts(client: AsyncClient):
    session_id = await a_session(client)
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "delivered", "mode": "offline", "stt_confidence": 0.95},
    )
    assert response.status_code == 200
    assert response.json()["action"]["type"] == "mark_delivered"


async def test_a_turn_without_a_confidence_acts(client: AsyncClient):
    """The bar applies only when the STT reported a confidence at all."""
    session_id = await a_session(client)
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "delivered", "mode": "offline"},
    )
    assert response.status_code == 200
    assert response.json()["action"]["type"] == "mark_delivered"


async def test_the_bar_is_configuration(store: InMemoryStore, principal: Principal):
    """One bar, in configuration: the same turn asks or acts with the bar."""
    high = an_app(bar=0.99, store=store, principal=principal)
    async with await a_client(high) as http:
        session_id = await a_session(http)
        asked = await http.post(
            f"/v1/sessions/{session_id}/turn",
            json={"transcript": "delivered", "mode": "offline", "stt_confidence": 0.95},
        )
        assert asked.json()["action"] is None
        assert asked.json()["notice"] is not None

    low = an_app(bar=0.0, store=InMemoryStore(), principal=principal)
    async with await a_client(low) as http:
        session_id = await a_session(http)
        acted = await http.post(
            f"/v1/sessions/{session_id}/turn",
            json={"transcript": "delivered", "mode": "offline", "stt_confidence": 0.3},
        )
        assert acted.json()["action"]["type"] == "mark_delivered"


async def test_an_out_of_range_confidence_is_refused(client: AsyncClient):
    session_id = await a_session(client)
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "delivered", "mode": "offline", "stt_confidence": 1.5},
    )
    assert response.status_code == 422
