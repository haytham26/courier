"""Tests for JWKS-based token verification.

Covers the contract between the Better Auth service (`services/auth`) and the
API: the API verifies access tokens against the published JWKS and rejects
expired, tampered, foreign and wrongly-scoped tokens.
"""
from __future__ import annotations

import base64
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
    **settings_overrides: Any,
) -> JwksVerifier:
    def default_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=jwks)

    client = httpx.Client(transport=handler or httpx.MockTransport(default_handler))
    return JwksVerifier(make_settings(**settings_overrides), client=client)


@pytest.fixture()
def key_pair() -> tuple[Any, dict[str, Any]]:
    return make_key_pair()


@pytest.fixture()
def verifier(key_pair: tuple[Any, dict[str, Any]]) -> JwksVerifier:
    _, jwk = key_pair
    return make_verifier({"keys": [jwk]})


@pytest.fixture()
def client(verifier: JwksVerifier) -> TestClient:
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


class TestAuthRoutes:
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
