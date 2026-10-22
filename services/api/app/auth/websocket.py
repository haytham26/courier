"""Authentication for the WebSocket surfaces.

A WebSocket handshake cannot use the HTTP `Authorization` header in every
client, so the token is accepted from the header (the native client) or from
the `token` query parameter (the fallback). Either way the token is verified
against the JWKS: an unverified caller never reaches the copilot.
"""

from __future__ import annotations

from fastapi import Depends, HTTPException, WebSocket, status

from .jwks import AuthPrincipal, InvalidTokenError, JwksVerifier, get_verifier


def _token_from(websocket: WebSocket) -> str | None:
    """The bearer token of the handshake, from the header or the query string."""
    header = websocket.headers.get("authorization")
    if header:
        scheme, _, value = header.partition(" ")
        if scheme.lower() == "bearer" and value.strip():
            return value.strip()
    return websocket.query_params.get("token")


async def get_websocket_principal(
    websocket: WebSocket,
    verifier: JwksVerifier = Depends(get_verifier),
) -> AuthPrincipal:
    """FastAPI dependency: the verified identity behind a WebSocket connection."""
    token = _token_from(websocket)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        return verifier.verify(token)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc
