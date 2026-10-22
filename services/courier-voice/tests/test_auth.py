"""The token of the courier.

The service is a resource server: the tokens are issued by the auth service in
`services/auth` and verified here against the JWKS it publishes. A token that
is not ours, that is for another audience, that has expired or that is signed
by another key must not open the voice.
"""

from __future__ import annotations

import base64
import time

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

from app.auth import InvalidTokenError, JwksVerifier
from app.config import VoiceConfig

ISSUER = "http://localhost:3001"
AUDIENCE = "courier-api"


def _b64(value: int) -> str:
    """A coordinate of the public key, as the JWKS wants it."""
    raw = value.to_bytes(32, byteorder="big")
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def a_key_pair(kid: str = "key-1") -> tuple[bytes, dict[str, object]]:
    """A private key and its JWKS entry."""
    key = ec.generate_private_key(ec.SECP256R1())
    private = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    numbers = key.public_key().public_numbers()
    jwk: dict[str, object] = {
        "kty": "EC",
        "crv": "P-256",
        "x": _b64(numbers.x),
        "y": _b64(numbers.y),
        "kid": kid,
        "alg": "ES256",
        "use": "sig",
    }
    return private, jwk


def a_token(
    private: bytes,
    *,
    kid: str = "key-1",
    audience: str = AUDIENCE,
    issuer: str = ISSUER,
    expires_in: int = 60,
    subject: str = "driver-1",
) -> str:
    """A token of the courier."""
    return jwt.encode(
        {
            "sub": subject,
            "aud": audience,
            "iss": issuer,
            "exp": int(time.time()) + expires_in,
        },
        private,
        algorithm="ES256",
        headers={"kid": kid},
    )


def a_verifier(jwk: dict[str, object]) -> JwksVerifier:
    """A verifier with a JWKS that answers with the key."""
    config = VoiceConfig(
        auth_jwks_url="http://auth.test/jwks",
        auth_jwt_issuer=ISSUER,
        auth_jwt_audience=AUDIENCE,
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"keys": [jwk]})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    return JwksVerifier(config, client)


def test_the_token_of_the_courier_is_verified():
    private, jwk = a_key_pair()
    verifier = a_verifier(jwk)
    token = a_token(private)

    principal = verifier.verify(token)

    assert principal.user_id == "driver-1"
    assert principal.token == token


def test_a_token_for_another_audience_is_refused():
    private, jwk = a_key_pair()
    verifier = a_verifier(jwk)

    with pytest.raises(InvalidTokenError):
        verifier.verify(a_token(private, audience="another-service"))


def test_a_token_from_another_issuer_is_refused():
    private, jwk = a_key_pair()
    verifier = a_verifier(jwk)

    with pytest.raises(InvalidTokenError):
        verifier.verify(a_token(private, issuer="http://somewhere.else"))


def test_an_expired_token_is_refused():
    private, jwk = a_key_pair()
    verifier = a_verifier(jwk)

    with pytest.raises(InvalidTokenError):
        verifier.verify(a_token(private, expires_in=-10))


def test_a_token_signed_by_another_key_is_refused():
    private, _ = a_key_pair()
    _, other_jwk = a_key_pair(kid="key-2")
    verifier = a_verifier(other_jwk)

    with pytest.raises(InvalidTokenError):
        verifier.verify(a_token(private))


def test_a_malformed_token_is_refused():
    _, jwk = a_key_pair()
    verifier = a_verifier(jwk)

    with pytest.raises(InvalidTokenError):
        verifier.verify("not-a-token")


def test_the_key_is_cached_between_the_calls():
    private, jwk = a_key_pair()
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json={"keys": [jwk]})

    config = VoiceConfig(
        auth_jwks_url="http://auth.test/jwks",
        auth_jwt_issuer=ISSUER,
        auth_jwt_audience=AUDIENCE,
    )
    verifier = JwksVerifier(config, httpx.Client(transport=httpx.MockTransport(handler)))

    verifier.verify(a_token(private))
    verifier.verify(a_token(private))

    assert len(calls) == 1


def test_a_jwks_with_no_keys_is_refused():
    config = VoiceConfig(
        auth_jwks_url="http://auth.test/jwks",
        auth_jwt_issuer=ISSUER,
        auth_jwt_audience=AUDIENCE,
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"keys": []})

    verifier = JwksVerifier(config, httpx.Client(transport=httpx.MockTransport(handler)))
    with pytest.raises(InvalidTokenError):
        verifier.verify("not-a-token")
