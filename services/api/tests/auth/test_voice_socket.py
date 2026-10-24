"""Tests for the authentication and the ownership of the voice WebSocket.

The voice channel is the most sensitive surface of the API: it drives the
copilot for a shift. It must be closed to anonymous callers, exactly like the
HTTP routes, and it must be closed to a caller whose token is valid but whose
shift is somebody else's - the channel carries the day's addresses.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.auth.jwks import get_verifier
from app.main import app
from app.repo import InMemoryRepo, RouteStopRow, RunRecord, get_repo
from tests.auth.test_jwks import make_key_pair, make_verifier, sign

COURIER = "driver-7"


def a_fresh_repo() -> InMemoryRepo:
    """FastAPI calls the override, so the override is a factory, not a class
    (calling the dataclass class through the injector leaks its defaults)."""
    return InMemoryRepo()

SHIFT_ID = uuid.uuid4()
STOP_ID = uuid.uuid4()


@pytest.fixture()
def key_pair() -> tuple[Any, dict[str, Any]]:
    return make_key_pair()


@pytest.fixture()
def repo() -> InMemoryRepo:
    """The owned shift: a run of the caller, with one stop."""
    repo = InMemoryRepo()
    repo.runs[uuid.uuid4()] = RunRecord(
        id=uuid.uuid4(),
        shift_id=SHIFT_ID,
        courier_id=COURIER,
        name="Hornby run",
        depot_lat=-43.5330,
        depot_lon=172.6300,
        capacity_parcels=None,
        speed_kmh=30.0,
        start_at=datetime.now(UTC),
    )
    repo.run_stops[next(iter(repo.runs))] = [
        RouteStopRow(
            id=STOP_ID,
            lat=-43.54,
            lon=172.60,
            priority=False,
            parcels=1,
            service_time_s=None,
            window_start=None,
            window_end=None,
        )
    ]
    return repo


@pytest.fixture()
def client(repo: InMemoryRepo, key_pair: tuple[Any, dict[str, Any]]) -> Iterator[TestClient]:
    _, jwk = key_pair
    app.dependency_overrides[get_repo] = lambda: repo
    app.dependency_overrides[get_verifier] = lambda: make_verifier({"keys": [jwk]})
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


class TestVoiceSocket:
    def test_refuses_an_anonymous_caller(self, client: TestClient) -> None:
        with (
            pytest.raises(WebSocketDisconnect) as refused,
            client.websocket_connect(f"/shifts/{SHIFT_ID}/voice"),
        ):
            pass
        denial = refused.value
        status_code = getattr(denial, "status_code", None)
        assert status_code in (None, 401, 403)

    def test_refuses_a_garbage_token(self, client: TestClient) -> None:
        with (
            pytest.raises(WebSocketDisconnect),
            client.websocket_connect(f"/shifts/{SHIFT_ID}/voice?token=not-a-token"),
        ):
            pass

    def test_accepts_a_verified_caller(self, client: TestClient, key_pair: tuple[Any, Any]) -> None:
        private_key, _ = key_pair
        token = sign(private_key, subject=COURIER)
        with client.websocket_connect(f"/shifts/{SHIFT_ID}/voice?token={token}"):
            pass

    def test_refuses_a_verified_caller_on_a_foreign_shift(
        self, key_pair: tuple[Any, dict[str, Any]]
    ) -> None:
        """The token is valid but the shift belongs to nobody: the socket is
        closed with 4404 - the channel carries the day's addresses, so a
        foreign shift is closed without a word (ASVS V4)."""
        _, jwk = key_pair
        app.dependency_overrides[get_repo] = a_fresh_repo
        app.dependency_overrides[get_verifier] = lambda: make_verifier({"keys": [jwk]})
        private_key, _ = key_pair
        token = sign(private_key, subject="someone-else")
        try:
            with (
                TestClient(app) as bare, pytest.raises(WebSocketDisconnect) as refused,
                bare.websocket_connect(f"/shifts/{SHIFT_ID}/voice?token={token}"),
            ):
                pass
            assert refused.value.code == 4404
        finally:
            app.dependency_overrides.clear()

    def test_a_malformed_frame_does_not_kill_the_channel(
        self, client: TestClient, key_pair: tuple[Any, dict[str, Any]]
    ) -> None:
        """A frame that is not what the protocol says is noise: the channel
        answers and stays open (the review finding - one bad frame used to
        raise out of the loop and die)."""
        private_key, _ = key_pair
        token = sign(private_key, subject=COURIER)
        with client.websocket_connect(f"/shifts/{SHIFT_ID}/voice?token={token}") as ws:
            ws.send_json({"no": "type"})  # a dict without the type
            reply = ws.receive_json()
            assert reply["type"] == "say"
            ws.send_text("not json at all")  # a frame that is not JSON
            reply = ws.receive_json()
            assert reply["text"] == "Say that again."
            ws.send_json({"type": "transcript", "final": True, "text": "how many left?"})
            reply = ws.receive_json()
            assert reply["type"] == "say"
