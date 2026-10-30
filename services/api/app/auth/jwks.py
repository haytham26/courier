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
from urllib.parse import urlsplit

import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class AuthSettings(BaseSettings):
    """Configuration for token verification (no secret lives here)."""

    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    auth_jwks_url: str = ""
    auth_jwt_audience: str = "courier-api"
    auth_jwt_issuer: str = ""
    auth_jwt_algorithms: str = "ES256"
    auth_jwks_cache_seconds: int = 300
    auth_jwks_timeout_seconds: float = 5.0

    @field_validator("auth_jwt_issuer")
    @classmethod
    def the_issuer_matches_what_the_auth_service_signs(cls, value: str) -> str:
        """The issuer is an absolute URL and nothing else (BUG-122).

        The auth service signs with its own `config.jwt.issuer`, which is
        `AUTH_JWT_ISSUER ?? BETTER_AUTH_URL` - a bare origin, no trailing
        slash, no path. A value this side of the wire that is not exactly that
        shape can never match the `iss` claim, and every correctly issued
        token would be refused with a 401 that says nothing about why. Failing
        fast here names the value instead.
        """
        if not value:
            raise ValueError("AUTH_JWT_ISSUER is required - see .env.example")
        parts = urlsplit(value)
        if parts.scheme not in ("http", "https") or not parts.netloc:
            raise ValueError(f"AUTH_JWT_ISSUER is not an absolute URL: {value!r}")
        if parts.path.strip("/") or parts.query or parts.fragment:
            raise ValueError(
                f"AUTH_JWT_ISSUER is an origin and carries no path or query: {value!r}"
            )
        return value.rstrip("/")

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
        self._unknown_kids: set[str] = set()
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
        # A kid the document now carries is no longer one we could not find.
        self._unknown_kids -= set(self._keys)
        self._fetched_at = time.monotonic()

    def _signing_key(self, kid: str | None) -> Any:
        stale = (time.monotonic() - self._fetched_at) > self._settings.auth_jwks_cache_seconds
        known = kid is None or kid in self._keys
        # A kid we have never seen is worth one lookup: the keys may have
        # rotated since the last fetch. A kid we have already asked the JWKS
        # about is worth nothing: a caller who never presents a real key must
        # not make the API fetch once per request (BUG-121).
        if stale or (not known and kid not in self._unknown_kids):
            self._refresh()
        if kid is None:
            if len(self._keys) != 1:
                raise InvalidTokenError("token header has no 'kid' and the JWKS has several keys")
            kid = next(iter(self._keys))
        jwk = self._keys.get(kid)
        if jwk is None:
            self._unknown_kids.add(kid)
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
                issuer=self._settings.auth_jwt_issuer,
                options={"require": ["exp", "sub", "aud", "iss"]},
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
        settings = AuthSettings()
    except Exception as exc:  # pydantic ValidationError
        raise RuntimeError("Missing required env: AUTH_JWKS_URL — see .env.example") from exc
    if not settings.auth_jwks_url:
        raise RuntimeError("Missing required env: AUTH_JWKS_URL — see .env.example")
    if not settings.auth_jwt_issuer:
        # Without the issuer the token check is skipped, and any token signed by
        # the same keys would be accepted. The service stops instead.
        raise RuntimeError("Missing required env: AUTH_JWT_ISSUER — see .env.example")
    return settings


@lru_cache(maxsize=1)
def get_verifier() -> JwksVerifier:
    """The production verifier, shared by every route.

    It is NOT what a WebSocket route may call directly: a direct call bypasses
    `dependency_overrides`, so a test that overrides `get_verifier` would still
    be verified against the configured JWKS URL. The voice route uses
    `get_websocket_verifier`, which is a separate cached getter the WebSocket
    surface owns.
    """
    return JwksVerifier(get_auth_settings())


@lru_cache(maxsize=1)
def get_websocket_verifier() -> JwksVerifier:
    """The verifier the voice socket uses.

    A separate getter from `get_verifier` on purpose: the voice route accepts
    the socket first and then parses the credential itself, so it calls this
    getter directly. `dependency_overrides` cannot reach a direct call, so the
    route's suite overrides THIS getter and the object it builds is the one the
    route verifies with. Calling `get_verifier` directly instead would verify
    the route's tests against the configured JWKS URL - the first red run of
    this slice proved it (`cannot reach the JWKS endpoint`).
    """
    return JwksVerifier(get_auth_settings())
def get_verifier_override() -> JwksVerifier:
    """The single point the tests override for the WebSocket surface.

    Both getters route through here, so one `dependency_overrides` entry covers
    the voice route's direct call and the HTTP routes' `Depends`.
    """
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
