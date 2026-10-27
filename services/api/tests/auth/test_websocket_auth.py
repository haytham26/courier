"""The WebSocket handshake's token (BUG-059, B3's first item).

A token in a URL's query string is a token in a log: any proxy, any access log,
any browser history and any `Referer` header carries it, and one line of a log
read by the wrong person holds a courier's session until it expires. The audit
(BUG-059) asks for the token to move out of the query string, into the first
WebSocket message or the `Sec-WebSocket-Protocol` header.

These tests drive `app/auth/websocket.py` itself, through a handshake the tests
construct: a fake WebSocket whose headers and query parameters are the ones the
test wants, and the real `JwksVerifier` over a real key pair. That keeps the auth
question — where may a token come from — apart from the voice channel's own loop.

The query-string test is the one that was **red before this change**: the module
read `websocket.query_params.get("token")`, and this file is what makes it green.
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import Any

import pytest
from fastapi import WebSocketDisconnect

from app.auth.jwks import AuthPrincipal, JwksVerifier, get_verifier
from app.auth.websocket import UnauthenticatedError, identify, refuse
from tests.auth.test_jwks import make_key_pair, make_verifier, sign

COURIER = "driver-7"


class FakeWebSocket:
    """The handshake as the tests want it: headers, query parameters, messages."""

    def __init__(
        self,
        headers: dict[str, str] | None = None,
        query: str = "",
        messages: list[Any] | None = None,
    ) -> None:
        self.headers = {key.lower(): value for key, value in (headers or {}).items()}
        self.query_params: dict[str, str] = {}
        if query:
            for pair in query.split("&"):
                key, _, value = pair.partition("=")
                self.query_params[key] = value
        self._messages = list(messages or [])
        self.sent: list[Any] = []
        self.accepted = False
        self.closed_with: int | None = None

    async def accept(self) -> None:
        self.accepted = True

    async def close(self, code: int = 1000) -> None:
        self.closed_with = code

    async def receive_json(self) -> Any:
        # A caller that sends nothing is a caller that hung up: the WebSocket's
        # own disconnect, not a frame the server has to guess at.
        if not self._messages:
            raise WebSocketDisconnect(1000, "no message")
        return self._messages.pop(0)

    async def send_json(self, message: Any) -> None:
        self.sent.append(message)


@pytest.fixture()
def verifier_pair() -> Iterator[tuple[JwksVerifier, object]]:
    key_pair = make_key_pair()
    _, jwk = key_pair
    app_dependency = get_verifier
    if hasattr(app_dependency, "cache_clear"):
        app_dependency.cache_clear()
    yield make_verifier({"keys": [jwk]}), key_pair[0]
    if hasattr(app_dependency, "cache_clear"):
        app_dependency.cache_clear()


async def _identify(websocket: FakeWebSocket, verifier: JwksVerifier) -> AuthPrincipal:
    """The route accepts the socket, then identifies the handshake; these tests
    drive the identification, which is the question BUG-059 asks."""
    return await identify(websocket, verifier)


class TestWhereTheTokenMayComeFrom:
    async def test_the_authorization_header_still_works(
        self, verifier_pair: tuple[JwksVerifier, object]
    ) -> None:
        """The native client sends the header; nothing about it changes."""
        verifier, key = verifier_pair
        websocket = FakeWebSocket(headers={"Authorization": f"Bearer {sign(key, subject=COURIER)}"})

        principal = await _identify(websocket, verifier)

        assert principal.user_id == COURIER
        # The header is enough: no message is read and nothing is closed, so
        # the route's own channel is untouched by the identification.
        assert websocket._messages == []
        assert websocket.closed_with is None

    async def test_the_first_message_may_carry_the_token(
        self, verifier_pair: tuple[JwksVerifier, object]
    ) -> None:
        """The audit's first alternative: the token in the first message."""
        verifier, key = verifier_pair
        websocket = FakeWebSocket(messages=[{"type": "auth", "token": sign(key, subject=COURIER)}])

        principal = await _identify(websocket, verifier)

        assert principal.user_id == COURIER
        assert websocket.closed_with is None

    async def test_a_token_in_the_query_string_is_refused(
        self, verifier_pair: tuple[JwksVerifier, object]
    ) -> None:
        """The query string is a log, and a token there is a token that leaks."""
        verifier, key = verifier_pair
        websocket = FakeWebSocket(query=f"token={sign(key, subject=COURIER)}")

        with pytest.raises(UnauthenticatedError) as refused:
            await _identify(websocket, verifier)

        assert refused.value.reason
        assert "query string" in refused.value.reason
        # `identify` does not close the socket: the route calls `refuse` for
        # that, and the route's own test asserts the 4403 it delivers.
        assert websocket.closed_with is None

    async def test_no_token_at_all_is_refused(self, verifier_pair: tuple[JwksVerifier, object]) -> None:
        verifier, _ = verifier_pair
        websocket = FakeWebSocket()

        with pytest.raises(UnauthenticatedError) as refused:
            await _identify(websocket, verifier)

        assert refused.value.reason
        assert "no token" in refused.value.reason
        assert websocket.closed_with is None

    async def test_an_invalid_token_anywhere_is_refused(
        self, verifier_pair: tuple[JwksVerifier, object]
    ) -> None:
        verifier, _ = verifier_pair
        websocket = FakeWebSocket(headers={"Authorization": "Bearer not-a-token"})

        with pytest.raises(UnauthenticatedError) as refused:
            await _identify(websocket, verifier)

        assert refused.value.reason
        assert "not valid" in refused.value.reason
        assert websocket.closed_with is None

    async def test_refuse_closes_with_the_code_and_names_the_reason(
        self, verifier_pair: tuple[JwksVerifier, object]
    ) -> None:
        """`refuse` is the module's half of the answer: the caller is told why
        the handshake was refused, in a frame and in the close code."""

        websocket = FakeWebSocket()
        await refuse(websocket, "no token")

        assert websocket.closed_with == 4403
        assert websocket.sent == [{"type": "error", "code": 4403, "detail": "no token"}]

    async def test_a_first_message_that_is_not_an_auth_frame_is_not_a_token(
        self, verifier_pair: tuple[JwksVerifier, object]
    ) -> None:
        """A transcript arriving first is a transcript, not a credential."""
        verifier, _ = verifier_pair
        websocket = FakeWebSocket(messages=[{"type": "transcript", "text": "hello"}])

        with pytest.raises(UnauthenticatedError):
            await _identify(websocket, verifier)
