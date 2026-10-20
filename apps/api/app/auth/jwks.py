"""JWKS-based JWT verification for the Courier Copilot API.

The API is a resource server only. Credentials are issued by the Better Auth
service in `services/auth`; this module verifies the access tokens it signs
against the JWKS that service publishes (FINAL_PROMPT §0-F.3.1, D21).

There is no local user store, no local password hashing and no default
secret: a missing `AUTH_JWKS_URL` stops the API from starting.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic_settings import BaseSettings, SettingsConfigDict


class AuthSettings(BaseSettings):
    """Configuration for token verification (no secret lives here)."""

    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    auth_jwks_url: str
    auth_jwt_audience: str = "courier-api"
    auth_jwt_issuer: str = ""
    auth_jwt_algorithms: str = "ES256"
    auth_jwks_cache_seconds: int = 300
    auth_jwks_timeout_seconds: float = 5.0

    @property
    def algorithms(self) -> list[str]:
        return [item.strip() for item in self.auth_jwt_algorithms.split(",") if item.strip()]


class InvalidTokenError(Exception):
    """Raised when a bearer token cannot be verified."""


@dataclass(frozen=True)
class AuthPrincipal:
    """The verified identity behind a request."""

    user_id: str
    claims: dict[str, Any]

    @property
    def session_id(self) -> str | None:
        value = self.claims.get("sessionId")
        return value if isinstance(value, str) else None

    @property
    def organization_id(self) -> str | None:
        value = self.claims.get("organizationId")
        return value if isinstance(value, str) else None

    @property
    def team_id(self) -> str | None:
        value = self.claims.get("teamId")
        return value if isinstance(value, str) else None


class JwksVerifier:
    """Verifies JWTs against a remote JWKS, with a short-lived key cache."""

    def __init__(self, settings: AuthSettings, client: httpx.Client | None = None) -> None:
        self._settings = settings
        self._client = client or httpx.Client(timeout=settings.auth_jwks_timeout_seconds)
        self._keys: dict[str, dict[str, Any]] = {}
        self._fetched_at = 0.0

    def _refresh(self) -> None:
        response = self._client.get(self._settings.auth_jwks_url)
        response.raise_for_status()
        document = response.json()
        keys = document.get("keys") if isinstance(document, dict) else None
        if not isinstance(keys, list) or not keys:
            raise InvalidTokenError("JWKS document contains no keys")
        self._keys = {
            key["kid"]: key
            for key in keys
            if isinstance(key, dict) and isinstance(key.get("kid"), str)
        }
        if not self._keys:
            raise InvalidTokenError("JWKS document contains no key with a 'kid'")
        self._fetched_at = time.monotonic()

    def _signing_key(self, kid: str | None) -> Any:
        stale = (time.monotonic() - self._fetched_at) > self._settings.auth_jwks_cache_seconds
        if stale or kid not in self._keys:
            self._refresh()
        if kid is None:
            if len(self._keys) != 1:
                raise InvalidTokenError("token header has no 'kid' and the JWKS has several keys")
            kid = next(iter(self._keys))
        jwk = self._keys.get(kid)
        if jwk is None:
            raise InvalidTokenError(f"unknown signing key '{kid}'")
        return jwt.PyJWK.from_dict(jwk).key

    def verify(self, token: str) -> AuthPrincipal:
        """Verifies a token and returns the principal it identifies.

        Raises:
            InvalidTokenError: when the token is malformed, expired, signed by
                an unknown key, or does not match the expected audience/issuer.
        """
        try:
            header = jwt.get_unverified_header(token)
        except jwt.PyJWTError as exc:
            raise InvalidTokenError("malformed token") from exc

        try:
            key = self._signing_key(header.get("kid"))
            claims = jwt.decode(
                token,
                key,
                algorithms=self._settings.algorithms,
                audience=self._settings.auth_jwt_audience,
                issuer=self._settings.auth_jwt_issuer or None,
                options={"require": ["exp", "sub", "aud"]},
            )
        except jwt.PyJWTError as exc:
            raise InvalidTokenError(str(exc)) from exc
        except InvalidTokenError:
            raise
        except (httpx.HTTPError, ValueError) as exc:
            raise InvalidTokenError(f"cannot reach the JWKS endpoint: {exc}") from exc

        return AuthPrincipal(user_id=claims["sub"], claims=claims)


security = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def get_auth_settings() -> AuthSettings:
    """Returns the validated settings, failing fast when they are missing."""
    try:
        return AuthSettings()
    except Exception as exc:  # pydantic ValidationError
        raise RuntimeError("Missing required env: AUTH_JWKS_URL — see .env.example") from exc


@lru_cache(maxsize=1)
def get_verifier() -> JwksVerifier:
    return JwksVerifier(get_auth_settings())


def get_current_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    verifier: JwksVerifier = Depends(get_verifier),
) -> AuthPrincipal:
    """FastAPI dependency: the verified identity of the caller."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return verifier.verify(credentials.credentials)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
