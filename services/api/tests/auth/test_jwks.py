"""Tests for JWKS-based token verification.

Covers the contract between the Better Auth service (`services/auth`) and the
API: the API verifies access tokens against the published JWKS and rejects
expired, tampered, foreign and wrongly-scoped tokens.
"""
from __future__ import annotations

import base64
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from app.auth.jwks import (
    AuthSettings,
    InvalidTokenError,
    JwksVerifier,
    get_verifier,
)
from app.main import app

ISSUER = "http://localhost:3001"
AUDIENCE = "courier-api"
JWKS_URL = "https://auth.test/api/auth/jwks"


def _b64(value: int) -> str:
    return base64.urlsafe_b64encode(value.to_bytes(32, "big")).rstrip(b"=").decode()


def make_key_pair(kid: str = "test-key") -> tuple[Any, dict[str, Any]]:
    private_key = ec.generate_private_key(ec.SECP256R1())
    numbers = private_key.public_key().public_numbers()
    jwk = {
        "kty": "EC",
        "crv": "P-256",
        "x": _b64(numbers.x),
        "y": _b64(numbers.y),
        "kid": kid,
        "alg": "ES256",
        "use": "sig",
    }
    return private_key, jwk


def sign(
    private_key: Any,
    *,
    kid: str = "test-key",
    subject: str = "user-123",
    audience: str = AUDIENCE,
    issuer: str = ISSUER,
    expires_in: timedelta = timedelta(minutes=15),
    extra: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(UTC)
    claims: dict[str, Any] = {
        "sub": subject,
        "aud": audience,
        "iss": issuer,
        "iat": now,
        "exp": now + expires_in,
    }
    if extra:
        claims.update(extra)
    return jwt.encode(claims, private_key, algorithm="ES256", headers={"kid": kid})


def make_settings(**overrides: Any) -> AuthSettings:
    values: dict[str, Any] = {
        "auth_jwks_url": JWKS_URL,
        "auth_jwt_audience": AUDIENCE,
        "auth_jwt_issuer": ISSUER,
        "auth_jwt_algorithms": "ES256",
        "auth_jwks_cache_seconds": 300,
        "auth_jwks_timeout_seconds": 5.0,
    }
    values.update(overrides)
    return AuthSettings(**values)


def make_verifier(
    jwks: dict[str, Any],
    *,
    handler: httpx.MockTransport | None = None,
    clock: Any | None = None,
    **settings_overrides: Any,
) -> JwksVerifier:
    def default_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=jwks)

    client = httpx.Client(transport=handler or httpx.MockTransport(default_handler))
    kwargs: dict[str, Any] = {}
    if clock is not None:
        kwargs["clock"] = clock
    return JwksVerifier(make_settings(**settings_overrides), client=client, **kwargs)


@pytest.fixture()
def key_pair() -> tuple[Any, dict[str, Any]]:
    return make_key_pair()


@pytest.fixture()
def verifier(key_pair: tuple[Any, dict[str, Any]]) -> JwksVerifier:
    _, jwk = key_pair
    return make_verifier({"keys": [jwk]})


@pytest.fixture()
def client(verifier: JwksVerifier) -> Iterator[TestClient]:
    app.dependency_overrides[get_verifier] = lambda: verifier
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


class TestJwksVerifier:
    def test_accepts_a_valid_token(self, verifier: JwksVerifier, key_pair: tuple[Any, Any]) -> None:
        private_key, _ = key_pair
        principal = verifier.verify(sign(private_key, subject="driver-7"))
        assert principal.user_id == "driver-7"
        assert principal.claims["aud"] == AUDIENCE
        assert principal.claims["iss"] == ISSUER

    def test_exposes_organisation_and_team_claims(
        self, verifier: JwksVerifier, key_pair: tuple[Any, Any]
    ) -> None:
        private_key, _ = key_pair
        token = sign(
            private_key,
            extra={"organizationId": "org-1", "teamId": "team-1", "sessionId": "sess-1"},
        )
        principal = verifier.verify(token)
        assert principal.organization_id == "org-1"
        assert principal.team_id == "team-1"
        assert principal.session_id == "sess-1"

    def test_rejects_an_expired_token(self, verifier: JwksVerifier, key_pair: tuple[Any, Any]) -> None:
        private_key, _ = key_pair
        token = sign(private_key, expires_in=timedelta(seconds=-30))
        with pytest.raises(InvalidTokenError):
            verifier.verify(token)

    def test_rejects_a_token_signed_by_another_key(
        self, verifier: JwksVerifier, key_pair: tuple[Any, Any]
    ) -> None:
        other_private_key, _ = make_key_pair("other-key")
        with pytest.raises(InvalidTokenError):
            verifier.verify(sign(other_private_key, kid="other-key"))

    def test_rejects_a_tampered_token(self, verifier: JwksVerifier, key_pair: tuple[Any, Any]) -> None:
        private_key, _ = key_pair
        token = sign(private_key)
        header, payload, signature = token.split(".")
        tampered = f"{header}.{payload}.{signature[:-4]}AAAA"
        with pytest.raises(InvalidTokenError):
            verifier.verify(tampered)

    def test_rejects_a_token_with_the_wrong_audience(
        self, verifier: JwksVerifier, key_pair: tuple[Any, Any]
    ) -> None:
        private_key, _ = key_pair
        with pytest.raises(InvalidTokenError):
            verifier.verify(sign(private_key, audience="some-other-api"))

    def test_rejects_a_token_with_the_wrong_issuer(
        self, verifier: JwksVerifier, key_pair: tuple[Any, Any]
    ) -> None:
        private_key, _ = key_pair
        with pytest.raises(InvalidTokenError):
            verifier.verify(sign(private_key, issuer="https://evil.test"))

    def test_rejects_a_token_with_an_unknown_key_id(
        self, verifier: JwksVerifier, key_pair: tuple[Any, Any]
    ) -> None:
        private_key, _ = key_pair
        with pytest.raises(InvalidTokenError):
            verifier.verify(sign(private_key, kid="rotated-away"))

    def test_rejects_a_malformed_token(self, verifier: JwksVerifier) -> None:
        with pytest.raises(InvalidTokenError):
            verifier.verify("not-a-jwt")

    def test_reports_a_broken_jwks_endpoint(self, key_pair: tuple[Any, Any]) -> None:
        private_key, _ = key_pair

        def broken(request: httpx.Request) -> httpx.Response:
            return httpx.Response(500, text="boom")

        verifier = make_verifier({}, handler=httpx.MockTransport(broken))
        with pytest.raises(InvalidTokenError):
            verifier.verify(sign(private_key))

    def test_picks_up_a_rotated_signing_key(
        self, key_pair: tuple[Any, Any]
    ) -> None:
        private_key, old_jwk = key_pair
        new_private_key, new_jwk = make_key_pair("rotated-key")
        documents = [{"keys": [old_jwk]}, {"keys": [new_jwk]}]
        calls = {"count": 0}

        def rotating(request: httpx.Request) -> httpx.Response:
            index = min(calls["count"], len(documents) - 1)
            calls["count"] += 1
            return httpx.Response(200, json=documents[index])

        verifier = make_verifier({}, handler=httpx.MockTransport(rotating))
        verifier.verify(sign(private_key))

        principal = verifier.verify(sign(new_private_key, kid="rotated-key"))
        assert principal.user_id == "user-123"
        assert calls["count"] >= 2


class TestTheNegativeCache:
    """A caller who never presents a real key costs one fetch, not one per request.

    BUG-121: the verifier refreshed whenever the `kid` was unknown, with no
    record of the kids it had already asked the JWKS about, so an
    unauthenticated caller sending distinct bogus kids made the API fetch the
    auth service's JWKS once per request.
    """

    def test_a_bogus_key_id_is_refused_from_memory_after_the_first_lookup(
        self, key_pair: tuple[Any, Any]
    ) -> None:
        private_key, jwk = key_pair
        fetches = {"count": 0}

        def counting(request: httpx.Request) -> httpx.Response:
            fetches["count"] += 1
            return httpx.Response(200, json={"keys": [jwk]})

        verifier = make_verifier({}, handler=httpx.MockTransport(counting))

        for _ in range(4):
            with pytest.raises(InvalidTokenError):
                verifier.verify(sign(private_key, kid="bogus-kid"))

        assert fetches["count"] == 1

    def test_distinct_bogus_key_ids_cost_one_fetch_each(self, key_pair: tuple[Any, Any]) -> None:
        private_key, jwk = key_pair
        fetches = {"count": 0}

        def counting(request: httpx.Request) -> httpx.Response:
            fetches["count"] += 1
            return httpx.Response(200, json={"keys": [jwk]})

        verifier = make_verifier({}, handler=httpx.MockTransport(counting))

        for index in range(6):
            with pytest.raises(InvalidTokenError):
                verifier.verify(sign(private_key, kid=f"bogus-{index}"))

        assert fetches["count"] == 6

    def test_a_key_that_rotates_in_is_accepted_again(
        self, key_pair: tuple[Any, Any]
    ) -> None:
        """The cache remembers what it refused; it does not remember it forever.

        The JWKS answers with the old key and then with both, so the order of
        the calls does not decide the outcome - the first look does not know the
        key, and the next one does. The staleness is advanced through the
        verifier's own clock rather than by poking `_fetched_at`, so the proof
        does not depend on how long the machine running the suite has been up
        (the 2026-10-31 CI failure: a young runner's monotonic clock read below
        the cache TTL, so the faked staleness never became stale and the rotated
        key stayed refused).
        """
        private_key, old_jwk = key_pair
        new_private_key, new_jwk = make_key_pair("bogus-kid")
        calls = {"count": 0}
        now = {"value": 0.0}

        def clock() -> float:
            return now["value"]

        def rotating(request: httpx.Request) -> httpx.Response:
            calls["count"] += 1
            keys = [old_jwk] if calls["count"] == 1 else [old_jwk, new_jwk]
            return httpx.Response(200, json={"keys": keys})

        verifier = make_verifier({}, handler=httpx.MockTransport(rotating), clock=clock)

        with pytest.raises(InvalidTokenError):
            verifier.verify(sign(new_private_key, kid="bogus-kid"))
        assert "bogus-kid" in verifier._unknown_kids

        # The cache TTL passes: the next look asks the JWKS again and finds it.
        now["value"] = 1_000.0
        principal = verifier.verify(sign(new_private_key, kid="bogus-kid"))
        assert principal.user_id == "user-123"
        assert "bogus-kid" not in verifier._unknown_kids
        assert calls["count"] == 2


class TestTheIssuerTheApiAccepts:
    """The issuer is the one thing a misconfigured deployment gets wrong silently.

    BUG-122: the API reads `AUTH_JWT_ISSUER` from its own environment while the
    auth service signs with its own `config.jwt.issuer`, and nothing compares
    the two - a deployment where they disagree answers 401 for every correctly
    issued token with no diagnosis at all. The gate on the value's shape
    catches the classes of that mistake here, and `scripts/ci/check-auth-issuer.mjs`
    catches the rest in the compose files.
    """

    def test_an_issuer_that_is_not_a_url_is_refused_at_startup(self) -> None:
        with pytest.raises(ValueError, match="issuer"):
            make_settings(auth_jwt_issuer="not-a-url")

    def test_an_issuer_carrying_a_path_never_matches_a_claim(self) -> None:
        with pytest.raises(ValueError, match="issuer"):
            make_settings(auth_jwt_issuer="https://auth.example.com/issuer")

    def test_an_issuer_with_a_query_never_matches_a_claim(self) -> None:
        with pytest.raises(ValueError, match="issuer"):
            make_settings(auth_jwt_issuer="https://auth.example.com?who=me")

    def test_the_auth_services_own_issuer_is_accepted(self) -> None:
        # What the auth service signs with when AUTH_JWT_ISSUER is unset:
        # BETTER_AUTH_URL exactly, no trailing slash.
        settings = make_settings(auth_jwt_issuer="https://courier.co.nz")
        assert settings.auth_jwt_issuer == "https://courier.co.nz"

    def test_a_missing_issuer_still_stops_the_service(self) -> None:
        with pytest.raises(ValueError):
            make_settings(auth_jwt_issuer="")


    def test_me_requires_a_token(self, client: TestClient) -> None:
        response = client.get("/auth/me")
        assert response.status_code == 401

    def test_me_returns_the_verified_identity(
        self, client: TestClient, key_pair: tuple[Any, Any]
    ) -> None:
        private_key, _ = key_pair
        token = sign(private_key, subject="driver-42")

        response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        assert response.json()["user_id"] == "driver-42"

    def test_me_rejects_an_expired_token(
        self, client: TestClient, key_pair: tuple[Any, Any]
    ) -> None:
        private_key, _ = key_pair
        token = sign(private_key, expires_in=timedelta(seconds=-30))

        response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 401

    def test_me_rejects_a_garbage_token(self, client: TestClient) -> None:
        response = client.get("/auth/me", headers={"Authorization": "Bearer garbage"})

        assert response.status_code == 401

    def test_verify_reports_an_invalid_token(self, client: TestClient) -> None:
        response = client.get("/auth/verify", headers={"Authorization": "Bearer garbage"})

        assert response.status_code == 200
        assert response.json() == {"valid": False}

    def test_verify_reports_a_valid_token(
        self, client: TestClient, key_pair: tuple[Any, Any]
    ) -> None:
        private_key, _ = key_pair
        token = sign(private_key, subject="driver-9")

        response = client.get("/auth/verify", headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        assert response.json() == {"valid": True, "user_id": "driver-9"}
