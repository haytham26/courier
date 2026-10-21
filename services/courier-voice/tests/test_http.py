"""The HTTP surface of the service."""

from __future__ import annotations

from httpx import AsyncClient

from app.auth import Principal, get_principal
from app.main import create_app
from app.models import Mode, Stop, StopStatus
from app.safety import MAX_WORDS_WHILE_MOVING, word_count


async def a_session(client: AsyncClient, **body: object) -> str:
    """A shift of the service."""
    response = await client.post("/v1/sessions", json=body)
    assert response.status_code == 200
    return str(response.json()["id"])


async def test_the_service_is_up(client: AsyncClient):
    response = await client.get("/healthz")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


async def test_a_shift_starts(client: AsyncClient):
    response = await client.post("/v1/sessions", json={"shift_id": "shift-1"})
    assert response.status_code == 200
    body = response.json()
    assert body["shift_id"] == "shift-1"
    assert body["driver_id"] == "driver-1"


async def test_the_shift_is_read_back(client: AsyncClient):
    session_id = await a_session(client, shift_id="shift-1")
    response = await client.get(f"/v1/sessions/{session_id}")
    assert response.status_code == 200
    assert response.json()["id"] == session_id


async def test_the_shift_of_another_courier_is_not_there(client: AsyncClient, client_app):
    session_id = await a_session(client)
    other = Principal(user_id="driver-2", claims={"sub": "driver-2"}, token="t")
    client_app.dependency_overrides[get_principal] = lambda: other
    response = await client.get(f"/v1/sessions/{session_id}")
    assert response.status_code == 404


async def test_a_turn_answers(client: AsyncClient):
    session_id = await a_session(client)
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "how many left?", "mode": "offline"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["speech"] == "0 stops left."
    assert body["ended_turn"] is True
    assert body["engine"] == "on-device"


async def test_a_turn_while_moving_keeps_to_eight_words(client: AsyncClient):
    session_id = await a_session(client)
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={
            "transcript": "tell me about the whole day in detail",
            "speed_kmh": 60,
            "mode": "offline",
        },
    )
    assert response.status_code == 200
    assert word_count(response.json()["speech"]) <= MAX_WORDS_WHILE_MOVING


async def test_a_command_comes_back_as_an_action(client: AsyncClient):
    session_id = await a_session(client)
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "delivered", "mode": "offline"},
    )
    body = response.json()
    assert body["action"]["type"] == "mark_delivered"
    assert body["speech"] == "Delivered."


async def test_a_turn_with_no_words_keeps_the_turn_open(client: AsyncClient):
    session_id = await a_session(client)
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "", "mode": "offline"},
    )
    body = response.json()
    assert body["speech"] == ""
    assert body["ended_turn"] is False


async def test_a_turn_that_went_quiet_closes_itself(client: AsyncClient):
    session_id = await a_session(client)
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "", "started_at": 0.0, "mode": "offline"},
    )
    body = response.json()
    assert body["speech"] == ""
    assert body["ended_turn"] is True


async def test_the_barge_in_stops_the_reply(client: AsyncClient):
    session_id = await a_session(client)
    await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "delivered", "mode": "offline"},
    )
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "wait, hold on there", "mode": "offline"},
    )
    assert response.json()["barge_in"] is True


async def test_a_noise_does_not_stop_the_reply(client: AsyncClient):
    session_id = await a_session(client)
    await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "delivered", "mode": "offline"},
    )
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "mm", "mode": "offline"},
    )
    body = response.json()
    assert body["barge_in"] is False
    assert body["ended_turn"] is False


async def test_the_proactive_line_of_the_shift_start(client: AsyncClient):
    session_id = await a_session(
        client,
        context={
            "expected_stops": 214,
            "new_addresses": 3,
            "weather": "rain after 2",
        },
    )
    response = await client.post(
        f"/v1/sessions/{session_id}/proactive", json={"event": "shift_start"}
    )
    body = response.json()
    assert body["kind"] == "morning_brief"
    assert body["text"] == "214 stops, 3 new addresses, rain after 2"


async def test_the_proactive_line_stays_quiet_when_there_is_none(client: AsyncClient):
    session_id = await a_session(client)
    response = await client.post(
        f"/v1/sessions/{session_id}/proactive", json={"event": "shift_start"}
    )
    assert response.json()["kind"] is None


async def test_the_settings_are_read_and_written(client: AsyncClient):
    response = await client.get("/v1/settings")
    assert response.status_code == 200
    assert response.json()["settings"]["verbosity"] == "normal"

    response = await client.put(
        "/v1/settings", json={"settings": {"verbosity": "chatty", "quiet_mode": True}}
    )
    assert response.status_code == 200
    assert response.json()["settings"]["quiet_mode"] is True

    response = await client.get("/v1/settings")
    assert response.json()["settings"]["verbosity"] == "chatty"


async def test_the_engines_are_published(client: AsyncClient):
    response = await client.get("/v1/engines")
    assert response.status_code == 200
    names = [engine["name"] for engine in response.json()["engines"]]
    assert "on-device" in names
    assert len(names) == 2


async def test_the_licences_are_published(client: AsyncClient):
    response = await client.get("/v1/licences")
    assert response.status_code == 200
    artefacts = [entry["artefact"] for entry in response.json()["entries"]]
    assert "sherpa-onnx" in artefacts
    assert "OmniRoute" in artefacts


async def test_the_shift_can_be_forgotten(client: AsyncClient):
    session_id = await a_session(client)
    response = await client.delete(f"/v1/sessions/{session_id}/memory")
    assert response.status_code == 200
    assert response.json()["forgotten"] is True


async def test_a_call_without_a_token_is_refused():
    service = create_app()
    from httpx import ASGITransport

    transport = ASGITransport(app=service)
    async with AsyncClient(transport=transport, base_url="http://courier-voice") as http:
        response = await http.get("/v1/settings")
    assert response.status_code == 401


async def test_the_mode_of_the_turn_comes_back(client: AsyncClient):
    session_id = await a_session(client)
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "delivered", "mode": Mode.OFFLINE.value},
    )
    assert response.json()["mode"] == "offline"


async def test_the_context_of_the_shift_is_used(client: AsyncClient):
    session_id = await a_session(
        client,
        context={
            "stops": [
                {
                    "id": "s1",
                    "sequence": 1,
                    "number": "42",
                    "street": "Main North Road",
                    "status": "delivered",
                }
            ]
        },
    )
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "how many left?", "mode": "offline"},
    )
    assert response.json()["speech"] == "0 stops left."


async def test_the_stop_of_the_run_is_spoken(client: AsyncClient):
    session_id = await a_session(
        client,
        context={
            "stops": [
                {
                    "id": "s1",
                    "sequence": 1,
                    "number": "14",
                    "street": "Harewood",
                    "status": "active",
                    "tip": "side gate",
                    "size_class": "small",
                    "van_zone": "mid-rack",
                }
            ]
        },
    )
    response = await client.post(
        f"/v1/sessions/{session_id}/turn",
        json={"transcript": "where am i?", "mode": "offline"},
    )
    assert response.json()["speech"] == "you're at 14 Harewood."


async def test_the_run_client_reads_the_stops_of_the_api(principal):
    """The stops of the API are used when the phone sends none."""
    from httpx import ASGITransport

    from tests.conftest import FakeRunClient

    rows = [
        {
            "id": "s1",
            "sequence": 1,
            "number": "7",
            "street": "Cranmer Street",
            "status": "pending",
        }
    ]
    service = create_app(run_client=FakeRunClient(rows))
    service.dependency_overrides[get_principal] = lambda: principal
    transport = ASGITransport(app=service)
    async with AsyncClient(transport=transport, base_url="http://courier-voice") as http:
        opened = await http.post("/v1/sessions", json={"shift_id": "shift-1"})
        session_id = opened.json()["id"]
        response = await http.post(
            f"/v1/sessions/{session_id}/turn",
            json={"transcript": "what's next?", "mode": "offline"},
        )
    assert response.json()["speech"] == "next: 7 Cranmer Street."


async def test_the_stop_of_the_run_is_used_by_the_conversation():
    """The model of a stop holds what the voice says about it."""
    stop = Stop(id="s1", number="14", street="Harewood", status=StopStatus.ACTIVE)
    assert stop.spoken_address == "14 Harewood"
