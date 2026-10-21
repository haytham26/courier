"""Tests for the authentication of the voice WebSocket.

The voice channel is the most sensitive surface of the API: it drives the
copilot for a shift. It must be closed to anonymous callers, exactly like the
HTTP routes.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.auth.jwks import get_verifier
from app.main import app
from tests.auth.test_jwks import make_key_pair, make_verifier, sign

SHIFT_ID = uuid.uuid4()


@pytest.fixture()
def key_pair() -> tuple[Any, dict[str, Any]]:
    return make_key_pair()


@pytest.fixture()
def client(key_pair: tuple[Any, dict[str, Any]]) -> Iterator[TestClient]:
    _, jwk = key_pair
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
        token = sign(private_key, subject="driver-7")
        with client.websocket_connect(f"/shifts/{SHIFT_ID}/voice?token={token}"):
            pass
