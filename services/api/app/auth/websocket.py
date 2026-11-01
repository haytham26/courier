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

import asyncio
import contextlib
import logging
from typing import Any

from fastapi import Depends, HTTPException, WebSocket, WebSocketDisconnect, status

from .jwks import AuthPrincipal, InvalidTokenError, JwksVerifier, get_verifier

logger = logging.getLogger("courier_api.websocket_auth")

#: The frame that carries a token when the header could not. It is the first
#: message the server reads, before any other frame is answered.
AUTH_MESSAGE_TYPE = "auth"

#: The close code for a handshake with no usable token, beside the route's
#: 4404 ("the token is valid but the shift is not yours").
CLOSE_UNAUTHENTICATED = 4403

#: The close code for a token that is not valid (BUG-125). A caller can tell
#: "no credential" from "a credential that did not verify" without the reason
#: itself travelling to anyone else.
CLOSE_INVALID_TOKEN = 4405

#: How long a client that cannot set the header has to put its token in the
#: first message (BUG-124). A client that connects and sends nothing parked
#: the coroutine - and the accepted socket - for the life of the process.
IDENTIFY_TIMEOUT_SECONDS = 10.0

#: The one sentence an unauthenticated caller ever hears about a token that
#: did not verify (BUG-125): the reason travels to the service's own log
#: instead, so the refusal is not a token-state oracle.
INVALID_TOKEN_MESSAGE = "the token is not valid"


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

    The read is bounded (BUG-124): a client that connects and never sends
    parked this coroutine - and the socket it was accepted for - forever, one
    task per idle connection. The deadline refuses it instead.
    """
    try:
        message = await asyncio.wait_for(
            websocket.receive_json(), timeout=IDENTIFY_TIMEOUT_SECONDS
        )
    except (WebSocketDisconnect, ValueError, TypeError):
        return None
    except TimeoutError:
        raise UnauthenticatedError(
            f"no credential within {IDENTIFY_TIMEOUT_SECONDS:.0f} seconds: send it in the "
            "Authorization header, or in the first message's 'auth' frame"
        ) from None
    if not isinstance(message, dict) or message.get("type") != AUTH_MESSAGE_TYPE:
        return None
    token = message.get("token")
    return token.strip() if isinstance(token, str) and token.strip() else None


def _reason_for(websocket: WebSocket) -> str:
    """Why this handshake has no token, in the words the caller needs.

    `identify` raises it and the deprecated adapter puts it in its 401's detail,
    so an old query-string caller learns what to change from either path.
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
        # BUG-125: the caller's answer is the stable sentence, and the reason
        # travels only to the service's own log. Forwarding PyJWT's message
        # made the refusal a token-state oracle: expiry, audience and clock
        # skew were distinguishable by anyone holding a socket.
        logger.info("a websocket token was refused: %s", exc)
        raise UnauthenticatedError(INVALID_TOKEN_MESSAGE) from exc


async def refuse(websocket: Any, reason: str, code: int = CLOSE_UNAUTHENTICATED) -> None:
    """Tell the caller why the handshake was refused, then close.

    BUG-125: the frame's detail is the stable sentence (not the verifier's),
    and the reason's CATEGORY rides in the close code - 4403 for a handshake
    that carries no usable token, 4405 for one that did not verify - so a
    half-closed socket, which never sees the frame, still gets an answer.
    """
    with contextlib.suppress(Exception):
        # A caller that is already gone needs no message; the close is enough.
        await websocket.send_json({"type": "error", "code": code, "detail": reason})
    await websocket.close(code=code)


async def get_websocket_principal(
    websocket: WebSocket,
    verifier: JwksVerifier = Depends(get_verifier),
) -> AuthPrincipal:
    """The old route dependency, deleted with BUG-059's route half.

    It took the token from the query string, which is exactly what the audit
    named; the route now accepts the socket and calls `identify` itself, so a
    refusal is an `error` frame and a 4403 instead of an HTTP 403 on the
    handshake. It is kept for two commits because a caller that still sends the
    token in the URL must get a 401 with a reason it can act on rather than a
    silent drop - and the audit's BUG-059 closes when that caller has no reason
    to exist.

    DEPRECATED: do not use it in a new route. `identify` answers the same
    question correctly, and the voice route in `app/main.py` is the shape every
    WebSocket surface follows from here.
    """
    token = _token_from_header(websocket)
    if token is None:
        token = websocket.query_params.get("token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_reason_for(websocket),
        )
    try:
        return verifier.verify(token)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"the token is not valid: {exc}",
        ) from exc
