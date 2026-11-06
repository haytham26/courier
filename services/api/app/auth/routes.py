"""Authentication routes for the Courier Copilot API.

The API never issues credentials: sign-up, sign-in, session and organisation
membership live in the Better Auth service (`services/auth`). These routes
only expose the identity that a verified access token carries.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.security import HTTPAuthorizationCredentials

from ..rate_limit import AUTH_LIMIT, limiter
from ..responses import AuthMeResponse, AuthVerifyResponse
from .jwks import (
    AuthPrincipal,
    InvalidTokenError,
    get_current_principal,
    get_verifier,
    security,
)

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.get("/me", response_model=AuthMeResponse)
@limiter.limit(AUTH_LIMIT)
async def get_me(
    request: Request, principal: AuthPrincipal = Depends(get_current_principal)
) -> dict:
    """Returns the identity behind the presented access token."""
    return {
        "user_id": principal.user_id,
        "session_id": principal.session_id,
        "organization_id": principal.organization_id,
        "team_id": principal.team_id,
    }


@router.get("/verify", response_model=AuthVerifyResponse)
@limiter.limit(AUTH_LIMIT)
async def verify_session(
    request: Request,
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
