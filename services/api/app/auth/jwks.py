"""JWKS-based JWT verification for the Courier Copilot API.

The API is a resource server only. Credentials are issued by the Better Auth
service in `services/auth`; this module verifies the access tokens it signs
against the JWKS that service publishes (FINAL_PROMPT §0-F.3.1, D21).

There is no local user store, no local password hashing and no default
secret: a missing `AUTH_JWKS_URL` stops the API from starting.
"""

from __future__ import annotations

import hashlib
import json
import time
from collections.abc import Callable
from dataclasses import dataclass
from functools import lru_cache
from typing import Any
from urllib.parse import urlsplit

import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def canonical_jwk_digest(key: dict[str, Any]) -> str:
    """The sha256 of one JWK's canonical form, lowercase hex.

    The fingerprint the operator pins. It is taken over the key exactly as the
    JWKS served it, byte-stable through `sort_keys`, so the same key always
    produces the same digest and a substituted key pair does not.
    """
    return hashlib.sha256(
        json.dumps(key, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


#: The hosts whose plaintext hop has no network to be adjacent to: the fetch
#: never leaves the machine. BUG-131's threat is the hop between hosts, so
#: loopback is exempt - a production deployment pointing at a real network host
#: still needs https or the explicit allow-list.
LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "::1", "[::1]"}


class AuthSettings(BaseSettings):
    """Configuration for token verification (no secret lives here)."""

    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    auth_jwks_url: str = ""
    auth_jwt_audience: str = "courier-api"
    auth_jwt_issuer: str = ""
    auth_jwt_algorithms: str = "ES256"
    auth_jwks_cache_seconds: int = 300
    # BUG-121: how often an unknown kid is allowed to force a lookup. Inside
    # this window a refused kid is served from memory; after it, one lookup
    # re-asks, so a rotated-in key is picked up without an unauthenticated
    # caller being able to make the API fetch once per request.
    auth_jwks_negative_seconds: int = 30
    auth_jwks_timeout_seconds: float = 5.0
    # BUG-123: the API and the auth service are separate hosts with no shared
    # NTP guarantee, so PyJWT's default `leeway=0` logs a courier out on a
    # second of drift. A small explicit tolerance turns the failure mode into
    # a re-issue instead of a hard 401.
    auth_jwt_leeway_seconds: float = 30.0
    # BUG-131: the public keys are fetched over one hop. `https://` is always
    # accepted; a plaintext `http://` hop only from a host the operator has
    # explicitly listed here (the compose network's `auth` service, for one).
    # An unlisted plaintext host is a network-adjacent attacker who can
    # substitute a key pair and have every forged token accepted as any `sub`.
    auth_jwks_internal_hosts: str = ""
    # The pinned fingerprints of the keys the JWKS may serve (BUG-131): when
    # set, every key in a refreshed document must carry one of these digests,
    # so a substituted document is refused rather than trusted. Empty means
    # unpinned (the scheme check above still applies); the production value is
    # an operator decision, recorded in `infra/env.example`.
    auth_jwks_key_fingerprints: str = ""

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

    @field_validator("auth_jwt_leeway_seconds")
    @classmethod
    def the_tolerance_is_bounded(cls, value: float) -> float:
        """The clock tolerance is a skew, not a window (BUG-123).

        A typo in the value would silently open a replay window: an hour of
        leeway is a token valid for an hour after it expired. The bound is
        generous for a real skew and small enough that a fat-fingered 3600
        refuses to boot instead of passing quietly.
        """
        if value <= 0 or value > 300:
            raise ValueError(
                f"AUTH_JWT_LEEWAY_SECONDS is a skew bounded to 300 s, not {value}"
            )
        return value

    @field_validator("auth_jwks_url")
    @classmethod
    def the_jwks_url_is_absolute(cls, value: str) -> str:
        """The URL is absolute, scheme and host and all (BUG-131's shape half)."""
        if not value:
            raise ValueError("AUTH_JWKS_URL is required - see .env.example")
        parts = urlsplit(value)
        if parts.scheme not in ("http", "https") or not parts.netloc:
            raise ValueError(f"AUTH_JWKS_URL is not an absolute URL: {value!r}")
        return value

    @model_validator(mode="after")
    def the_plaintext_jwks_host_is_listed_on_purpose(self) -> AuthSettings:
        """A plaintext JWKS hop is fetched only from an explicitly-listed host (BUG-131).

        `https://` is always fine, and loopback is exempt (the fetch never
        leaves the machine, so there is no hop for a network-adjacent attacker
        to read - that is also what the tests' placeholder URL uses). A
        plaintext `http://` URL to any other host is an explicit, visible
        decision: the host must be named in `AUTH_JWKS_INTERNAL_HOSTS` (the
        compose tree names its `auth` service there). Anything else refuses to
        boot rather than fetching the public keys over a readable hop.
        """
        parts = urlsplit(self.auth_jwks_url)
        if parts.scheme == "https":
            return self
        host = parts.hostname or ""
        if host.lower() in LOOPBACK_HOSTS:
            return self
        listed = {
            item.strip().lower()
            for item in self.auth_jwks_internal_hosts.split(",")
            if item.strip()
        }
        if host.lower() not in listed:
            raise ValueError(
                "AUTH_JWKS_URL is plaintext http and its host is not listed in "
                f"AUTH_JWKS_INTERNAL_HOSTS: {self.auth_jwks_url!r} "
                "(use https, or name the internal host)"
            )
        return self

    @property
    def internal_hosts(self) -> set[str]:
        """The hosts the operator has explicitly listed for a plaintext JWKS hop."""
        return {
            item.strip().lower()
            for item in self.auth_jwks_internal_hosts.split(",")
            if item.strip()
        }

    @property
    def pinned_fingerprints(self) -> set[str]:
        """The sha256 digests the JWKS's keys are allowed to carry (empty: unpinned)."""
        return {
            item.strip().lower()
            for item in self.auth_jwks_key_fingerprints.split(",")
            if item.strip()
        }

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

    def __init__(
        self,
        settings: AuthSettings,
        client: httpx.Client | None = None,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._settings = settings
        self._client = client or httpx.Client(timeout=settings.auth_jwks_timeout_seconds)
        self._keys: dict[str, dict[str, Any]] = {}
        # BUG-121: the clock reading of the last lookup an UNKNOWN kid forced.
        # A burst of distinct bogus kids is worth one lookup per negative
        # window, not one per request, and a repeat is served from memory for
        # the rest of that window. The resource it bounds is the fetch itself,
        # so the set of refused kids needs no storage of its own.
        self._last_unknown_refresh = float("-inf")
        self._clock = clock
        self._fetched_at = 0.0

    def _refresh(self) -> None:
        response = self._client.get(self._settings.auth_jwks_url)
        response.raise_for_status()
        document = response.json()
        keys = document.get("keys") if isinstance(document, dict) else None
        if not isinstance(keys, list) or not keys:
            raise InvalidTokenError("JWKS document contains no keys")
        fresh = {
            key["kid"]: key
            for key in keys
            if isinstance(key, dict) and isinstance(key.get("kid"), str)
        }
        if not fresh:
            raise InvalidTokenError("JWKS document contains no key with a 'kid'")
        # BUG-131: when fingerprints are pinned, every key the document serves
        # must carry one of them. A substituted key pair (the MITM the scheme
        # check alone cannot stop) is refused here, per refresh, whatever the
        # document claims about itself. The check runs before the keys are
        # installed: a refused document must not leave its keys in the cache.
        pinned = self._settings.pinned_fingerprints
        if pinned:
            for kid, key in fresh.items():
                digest = canonical_jwk_digest(key)
                if digest not in pinned:
                    raise InvalidTokenError(
                        f"the JWKS serves key '{kid}' whose fingerprint is not pinned"
                    )
        self._keys = fresh
        self._fetched_at = self._clock()

    def _signing_key(self, kid: str | None) -> Any:
        now = self._clock()
        stale = (now - self._fetched_at) > self._settings.auth_jwks_cache_seconds
        known = kid is None or kid in self._keys
        # A lookup an unknown kid forces is rate-limited to one per negative
        # window (BUG-121): a caller who never presents a real key must not
        # make the API fetch once per request, and the register's own probe of
        # that defect counted "6 distinct kids -> 6 fetches" and "4 repeats ->
        # 11 server hits". A repeat inside the window is served from memory;
        # a rotated-in key is picked up when the window (or the cache) goes
        # stale, which the rotation test pins through the injected clock.
        unknown_allowed = (
            not stale
            and kid is not None
            and not known
            and (now - self._last_unknown_refresh) > self._settings.auth_jwks_negative_seconds
        )
        if stale or unknown_allowed:
            self._refresh()
            if kid is not None and kid not in self._keys:
                # Whatever made us look, a lookup that still does not know the
                # kid opens the window: the next unknown kid waits it out.
                self._last_unknown_refresh = now
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
                issuer=self._settings.auth_jwt_issuer,
                # BUG-123: the API and the auth service are separate hosts with
                # no shared NTP guarantee, so the library default `leeway=0`
                # refuses a validly issued token on a second of drift. A small
                # explicit tolerance makes the failure mode a re-issue.
                leeway=self._settings.auth_jwt_leeway_seconds,
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
        # The validation message names the variable and the problem (a value
        # that is set but plaintext-unlisted is not "missing"), so it is
        # carried rather than flattened: an operator grepping the log for the
        # real value finds it (BUG-131's startup refusal).
        raise RuntimeError(f"Invalid auth configuration: {exc}") from exc
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
