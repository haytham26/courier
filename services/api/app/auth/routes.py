"""Authentication routes for the Courier Copilot API.

The API never issues credentials: sign-up, sign-in, session and organisation
membership live in the Better Auth service (`services/auth`). These routes
only expose the identity that a verified access token carries.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials

from .jwks import (
    AuthPrincipal,
    InvalidTokenError,
    get_current_principal,
    get_verifier,
    security,
)

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.get("/me")
async def get_me(principal: AuthPrincipal = Depends(get_current_principal)) -> dict:
    """Returns the identity behind the presented access token."""
    return {
        "user_id": principal.user_id,
        "session_id": principal.session_id,
        "organization_id": principal.organization_id,
        "team_id": principal.team_id,
    }


@router.get("/verify")
async def verify_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    verifier=Depends(get_verifier),
) -> dict:
    """Reports whether the presented token is currently valid."""
    if credentials is None:
        return {"valid": False}
    try:
        principal = verifier.verify(credentials.credentials)
    except InvalidTokenError:
        return {"valid": False}
    return {"valid": True, "user_id": principal.user_id}
