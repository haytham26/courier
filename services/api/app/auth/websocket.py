"""Authentication for the WebSocket surfaces.

A WebSocket handshake can carry the HTTP `Authorization` header, so the native
client sends it and nothing else is needed. Where a client cannot set the header,
the token may arrive in the **first WebSocket message** — after the socket is
open, on a channel the server already owns, so it never appears in a URL, a
proxy log or a `Referer`.

A token in the URL's **query string** is a token in a log, so it is refused
(BUG-059, the audit's B3): every proxy, access log and browser history between
the courier and the server would carry a live session, and one line read by the
wrong person holds it until it expires. The refusal names the reason, because a
client that has just been refused deserves to know what to change.

The close codes are the WebSocket's own 4000-range: **4403** for an
authentication refusal, beside **4404**, which the voice route uses for "the
token is valid but the shift is not yours" (ASVS V4). A caller can tell the two
apart.

Both halves of BUG-059 have landed. This module answers the credential question
and delivers the answer; the voice route in `app/main.py` accepts the socket
first and then calls it, which is what lets a refusal be a frame and a close
code instead of an HTTP error on the handshake. The route's own suite is
`tests/auth/test_voice_socket.py`; this module's own is
`tests/auth/test_websocket_auth.py`.
"""

from __future__ import annotations

import contextlib
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from .jwks import AuthPrincipal, InvalidTokenError, JwksVerifier

#: The frame that carries a token when the header could not. It is the first
#: message the server reads, before any other frame is answered.
AUTH_MESSAGE_TYPE = "auth"

#: The close code for an authentication refusal, beside the route's 4404.
CLOSE_UNAUTHENTICATED = 4403


class UnauthenticatedError(Exception):
    """A handshake with no usable token, with the reason the caller needs."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def _token_from_header(websocket: WebSocket) -> str | None:
    """The bearer token of the handshake, from the `Authorization` header."""
    header = websocket.headers.get("authorization")
    if not header:
        return None
    scheme, _, value = header.partition(" ")
    if scheme.lower() != "bearer":
        return None
    value = value.strip()
    return value or None


async def _token_from_first_message(websocket: WebSocket) -> str | None:
    """The token in the first message, if that is where the client put it.

    One message is read; a caller that sends nothing, or sends a frame that is
    not an `auth` frame, has nothing to authenticate with.
    """
    try:
        message = await websocket.receive_json()
    except (WebSocketDisconnect, ValueError, TypeError):
        return None
    if not isinstance(message, dict) or message.get("type") != AUTH_MESSAGE_TYPE:
        return None
    token = message.get("token")
    return token.strip() if isinstance(token, str) and token.strip() else None


def _reason_for(websocket: WebSocket) -> str:
    """Why this handshake has no token, in the words the caller needs.

    `identify` raises it, and an old query-string caller learns from it what to
    change: the URL's `token` is read **only** to name the refusal, never as a
    credential (BUG-059, and BUG-135 pins that it stays that way).
    """
    if websocket.query_params.get("token"):
        return (
            "a token in the query string is refused: it is a token in a log. "
            "Send it in the Authorization header, or in the first message's "
            "'auth' frame."
        )
    return "no token: send it in the Authorization header, or in the first message's 'auth' frame"


async def identify(websocket: Any, verifier: JwksVerifier) -> AuthPrincipal:
    """The verified identity behind a WebSocket connection.

    The token comes from the header, or from the first message — never from the
    query string (BUG-059). The query parameter is read only to say why it is
    refused, because a client that has just been told "no" deserves to know
    which of its habits to change.
    """
    token = _token_from_header(websocket)
    if token is None:
        token = await _token_from_first_message(websocket)
    if token is None:
        raise UnauthenticatedError(_reason_for(websocket))
    try:
        return verifier.verify(token)
    except InvalidTokenError as exc:
        raise UnauthenticatedError(f"the token is not valid: {exc}") from exc


async def refuse(websocket: Any, reason: str) -> None:
    """Tell the caller why the handshake was refused, then close with 4403."""
    with contextlib.suppress(Exception):
        # A caller that is already gone needs no message; the close is enough.
        await websocket.send_json(
            {"type": "error", "code": CLOSE_UNAUTHENTICATED, "detail": reason}
        )
    await websocket.close(code=CLOSE_UNAUTHENTICATED)
