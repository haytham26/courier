"""Tests for the authentication and the ownership of the voice WebSocket.

The voice channel is the most sensitive surface of the API: it drives the
copilot for a shift. It must be closed to anonymous callers, exactly like the
HTTP routes, and it must be closed to a caller whose token is valid but whose
shift is somebody else's - the channel carries the day's addresses.

BUG-059's second half is here: the route no longer takes a token from the query
string. The credential arrives in the `Authorization` header, or in the first
`auth` message once the socket is open, and every refusal is answered with one
`error` frame that says which of the two to use.

The two refusal paths are driven with the header ABSENT and one frame sent, so
`identify` reads that one frame and refuses on it. A test that sends nothing
would block in `receive_json`, which is exactly the hang this suite stopped on
(§15) - so every refusal test below writes one frame first.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.auth.jwks import get_websocket_verifier
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
    app.dependency_overrides[get_websocket_verifier] = lambda: make_verifier({"keys": [jwk]})
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def bearer(token: str) -> dict[str, str]:
    """The one header shape the voice socket accepts a token in."""
    return {"Authorization": f"Bearer {token}"}


class TestVoiceSocket:
    def test_refuses_an_anonymous_caller(
        self, client: TestClient, key_pair: tuple[Any, Any]
    ) -> None:
        """No credential at all: the socket is accepted (the route owns the
        channel), answered with one `error` frame that names what to send, and
        closed with BUG-059's 4403."""
        with client.websocket_connect(f"/shifts/{SHIFT_ID}/voice") as session:
            session.send_json({"type": "gps"})
            frame = session.receive_json()
        assert frame["type"] == "error"
        assert frame["code"] == 4403
        assert frame["detail"].startswith("no token:")

    def test_refuses_a_token_in_the_query_string(
        self, client: TestClient, key_pair: tuple[Any, Any]
    ) -> None:
        """A token in the URL is a token in a log, and a VALID one is refused
        exactly like a broken one - the caller has to know why, so the `error`
        frame names the query string and both ways to send it instead."""
        private_key, _ = key_pair
        token = sign(private_key, subject=COURIER)
        with client.websocket_connect(f"/shifts/{SHIFT_ID}/voice?token={token}") as session:
            session.send_json({"type": "gps"})
            frame = session.receive_json()
        assert frame["type"] == "error"
        assert frame["code"] == 4403
        assert "query string" in frame["detail"]

    def test_refuses_a_first_message_that_is_not_an_auth_frame(
        self, client: TestClient
    ) -> None:
        """A client that puts its token somewhere other than an `auth` frame
        has sent nothing usable, and the refusal says exactly what to send."""
        with client.websocket_connect(f"/shifts/{SHIFT_ID}/voice") as session:
            session.send_json({"type": "transcript", "text": "deliver this"})
            frame = session.receive_json()
        assert frame["type"] == "error"
        assert frame["code"] == 4403
        assert "'auth'" in frame["detail"]

    def test_accepts_a_verified_caller(self, client: TestClient, key_pair: tuple[Any, Any]) -> None:
        private_key, _ = key_pair
        token = sign(private_key, subject=COURIER)
        with client.websocket_connect(
            f"/shifts/{SHIFT_ID}/voice", headers=bearer(token)
        ) as session:
            session.send_json({"type": "transcript", "final": True, "text": "how many left?"})
            reply = session.receive_json()
        assert reply["type"] == "say", reply

    def test_accepts_the_token_in_the_first_message(
        self, client: TestClient, key_pair: tuple[Any, Any]
    ) -> None:
        """The native client always has the header; a client that cannot set
        one sends the token in the first `auth` message, and the channel opens
        and keeps working."""
        private_key, _ = key_pair
        token = sign(private_key, subject=COURIER)
        with client.websocket_connect(f"/shifts/{SHIFT_ID}/voice") as session:
            session.send_json({"type": "auth", "token": token})
            session.send_json({"type": "transcript", "final": True, "text": "how many left?"})
            reply = session.receive_json()
        assert reply["type"] == "say"

    def test_refuses_a_verified_caller_on_a_foreign_shift(
        self, key_pair: tuple[Any, dict[str, Any]]
    ) -> None:
        """The token is valid but the shift belongs to nobody: the socket is
        closed with 4404 - the channel carries the day's addresses, so a
        foreign shift is closed without a word (ASVS V4)."""
        _, jwk = key_pair
        app.dependency_overrides[get_repo] = a_fresh_repo
        app.dependency_overrides[get_websocket_verifier] = lambda: make_verifier({"keys": [jwk]})
        private_key, _ = key_pair
        token = sign(private_key, subject="someone-else")
        try:
            with TestClient(app) as bare, bare.websocket_connect(
                f"/shifts/{SHIFT_ID}/voice", headers=bearer(token)
            ) as session:
                # The accept lands, then the close. One read per frame.
                first_frame = session.receive()
                if first_frame["type"] == "websocket.send":
                    first_frame = session.receive()
                assert first_frame["type"] == "websocket.close"
                assert first_frame["code"] == 4404  # delivered: accepted first
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
        with client.websocket_connect(
            f"/shifts/{SHIFT_ID}/voice", headers=bearer(token)
        ) as ws:
            ws.send_json({"no": "type"})  # a dict without the type
            reply = ws.receive_json()
            assert reply["type"] == "say"
            ws.send_text("not json at all")  # a frame that is not JSON
            reply = ws.receive_json()
            assert reply["text"] == "Say that again."
            ws.send_bytes(b"\x00\x01binary")  # a binary frame is noise too
            raw = ws.receive()  # the raw frame: the transport's mode handling
            # is not what this test proves - the channel's survival is.
            assert raw["type"] == "websocket.send"
            assert "Say that again." in raw.get("text", "")
            ws.send_json({"type": "transcript", "final": True, "text": "how many left?"})
            reply = ws.receive_json()
            assert reply["type"] == "say"
