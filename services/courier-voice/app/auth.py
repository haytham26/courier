"""The courier behind a request.

The service is a resource server: the tokens are issued by the Better Auth
service in `services/auth` and verified here against the JWKS that service
publishes. The principal is what the run data is fetched with, so a courier
never sees another courier's run.
"""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import VoiceConfig


def canonical_jwk_digest(key: dict[str, Any]) -> str:
    """The sha256 of one JWK's canonical form, lowercase hex.

    This mirrors `app/auth/jwks.py`'s helper in the API service exactly — the
    two resource servers read the same auth service and must pin with the same
    digest. Both suites pin the same fixed vector, so a change on one side
    alone goes red.
    """
    return hashlib.sha256(
        json.dumps(key, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


class InvalidTokenError(Exception):
    """Raised when a bearer token cannot be verified."""


@dataclass(frozen=True)
class Principal:
    """The verified identity behind a request."""

    user_id: str
    claims: dict[str, Any]
    token: str = ""

    @property
    def organization_id(self) -> str | None:
        """The team the courier belongs to, when there is one."""
        value = self.claims.get("organizationId")
        return value if isinstance(value, str) else None

    @property
    def team_id(self) -> str | None:
        """The team the courier is working for, when there is one."""
        value = self.claims.get("teamId")
        return value if isinstance(value, str) else None


class JwksVerifier:
    """Verifies the courier's tokens against the JWKS of the auth service."""

    def __init__(self, config: VoiceConfig, client: httpx.Client | None = None) -> None:
        self._config = config
        self._client = client or httpx.Client(timeout=config.auth_jwks_timeout_seconds)
        self._keys: dict[str, dict[str, Any]] = {}
        self._fetched_at = 0.0

    def _refresh(self) -> None:
        response = self._client.get(self._config.auth_jwks_url)
        response.raise_for_status()
        document = response.json()
        keys = document.get("keys") if isinstance(document, dict) else None
        if not isinstance(keys, list) or not keys:
            raise InvalidTokenError("the JWKS document holds no keys")
        fresh = {
            key["kid"]: key
            for key in keys
            if isinstance(key, dict) and isinstance(key.get("kid"), str)
        }
        if not fresh:
            raise InvalidTokenError("the JWKS holds no key with a kid")
        # BUG-131, the same half the API's verifier carries: when fingerprints
        # are pinned, every key the document serves must carry one of them.
        # The check runs before the keys are installed, so a refused document
        # leaves the cache as it was.
        pinned = self._config.pinned_fingerprints
        if pinned:
            for kid, key in fresh.items():
                if canonical_jwk_digest(key) not in pinned:
                    raise InvalidTokenError(
                        f"the JWKS serves key '{kid}' whose fingerprint is not pinned"
                    )
        self._keys = fresh
        self._fetched_at = time.monotonic()

    def _signing_key(self, kid: str | None) -> Any:
        stale = (time.monotonic() - self._fetched_at) > self._config.auth_jwks_cache_seconds
        if stale or kid not in self._keys:
            self._refresh()
        if kid is None:
            if len(self._keys) != 1:
                raise InvalidTokenError("the token has no kid and the JWKS has several keys")
            kid = next(iter(self._keys))
        jwk = self._keys.get(kid)
        if jwk is None:
            raise InvalidTokenError(f"unknown signing key '{kid}'")
        return jwt.PyJWK.from_dict(jwk).key

    def verify(self, token: str) -> Principal:
        """Verifies a token and returns the courier it identifies."""
        try:
            header = jwt.get_unverified_header(token)
        except jwt.PyJWTError as exc:
            raise InvalidTokenError("the token is malformed") from exc

        try:
            key = self._signing_key(header.get("kid"))
            claims = jwt.decode(
                token,
                key,
                algorithms=list(self._config.algorithms),
                audience=list(self._config.audiences),
                issuer=self._config.auth_jwt_issuer,
                # BUG-123: the API and the voice surface read the same auth
                # service over separate hops, so they carry the same small
                # clock tolerance rather than disagreeing about a valid token.
                leeway=self._config.auth_jwt_leeway_seconds,
                options={"require": ["exp", "sub", "aud", "iss"]},
            )
        except jwt.PyJWTError as exc:
            raise InvalidTokenError(str(exc)) from exc
        except InvalidTokenError:
            raise
        except (httpx.HTTPError, ValueError) as exc:
            raise InvalidTokenError(f"the JWKS endpoint cannot be reached: {exc}") from exc

        return Principal(user_id=claims["sub"], claims=claims, token=token)


security = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def get_config() -> VoiceConfig:
    """The configuration of the service."""
    return VoiceConfig()


@lru_cache(maxsize=1)
def get_verifier() -> JwksVerifier:
    """The verifier of the courier's tokens."""
    return JwksVerifier(get_config())


def get_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    verifier: JwksVerifier = Depends(get_verifier),
) -> Principal:
    """The FastAPI dependency: the courier behind the request."""
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
