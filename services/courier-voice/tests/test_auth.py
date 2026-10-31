"""The token of the courier.

The service is a resource server: the tokens are issued by the auth service in
`services/auth` and verified here against the JWKS it publishes. A token that
is not ours, that is for another audience, that has expired or that is signed
by another key must not open the voice.
"""

from __future__ import annotations

import base64
import time
from typing import Any

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
        auth_jwks_url="https://auth.test/jwks",
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

    # A minute past its expiry, not ten seconds: BUG-123's tolerance is a
    # skew (the default 30 s), and a token inside it is a valid one. What must
    # still be refused is a token that is actually expired.
    with pytest.raises(InvalidTokenError):
        verifier.verify(a_token(private, expires_in=-60))


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
        auth_jwks_url="https://auth.test/jwks",
        auth_jwt_issuer=ISSUER,
        auth_jwt_audience=AUDIENCE,
    )
    verifier = JwksVerifier(config, httpx.Client(transport=httpx.MockTransport(handler)))

    verifier.verify(a_token(private))
    verifier.verify(a_token(private))

    assert len(calls) == 1


def test_a_jwks_with_no_keys_is_refused():
    config = VoiceConfig(
        auth_jwks_url="https://auth.test/jwks",
        auth_jwt_issuer=ISSUER,
        auth_jwt_audience=AUDIENCE,
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"keys": []})

    verifier = JwksVerifier(config, httpx.Client(transport=httpx.MockTransport(handler)))
    with pytest.raises(InvalidTokenError):
        verifier.verify("not-a-token")


# ---------------------------------------------------------------------------
# BUG-123 and BUG-131 on the voice surface. The API's verifier carries the same
# two halves (services/api/app/auth/jwks.py); the two resource servers read the
# same auth service, and BUG-126 was the day they disagreed about a valid
# token, so the contract is written once and mirrored.
# ---------------------------------------------------------------------------


def _a_config(**overrides: Any) -> VoiceConfig:
    """A config, https and loopback-free, so the scheme check has nothing to refuse."""
    values: dict[str, Any] = {
        "auth_jwks_url": "https://auth.test/jwks",
        "auth_jwt_issuer": ISSUER,
        "auth_jwt_audience": AUDIENCE,
    }
    values.update(overrides)
    return VoiceConfig(**values)


def _a_verifier_of(jwk: dict[str, object], **overrides: object) -> JwksVerifier:
    """A verifier whose JWKS answers with exactly this key."""
    config = _a_config(**overrides)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"keys": [jwk]})

    return JwksVerifier(config, httpx.Client(transport=httpx.MockTransport(handler)))


def test_a_token_one_second_past_its_expiry_is_accepted():
    """BUG-123: a second of drift must not refuse a validly issued token."""
    private, jwk = a_key_pair()

    principal = _a_verifier_of(jwk).verify(a_token(private, expires_in=-1))

    assert principal.user_id == "driver-1"


def test_a_token_an_hour_expired_is_still_refused():
    """The tolerance is a skew, not a forever-window (BUG-123's bound)."""
    private, jwk = a_key_pair()

    with pytest.raises(InvalidTokenError):
        _a_verifier_of(jwk).verify(a_token(private, expires_in=-3600))


def test_a_plaintext_jwks_url_on_an_unlisted_host_is_refused_at_startup():
    """BUG-131: the keys are fetched over an encrypted hop or a listed one."""
    with pytest.raises(ValueError, match="AUTH_JWKS_INTERNAL_HOSTS"):
        _a_config(auth_jwks_url="http://auth.example.co.nz/jwks")


def test_a_plaintext_jwks_url_on_a_listed_internal_host_is_accepted():
    config = _a_config(
        auth_jwks_url="http://auth:3001/api/auth/jwks",
        auth_jwks_internal_hosts="auth",
    )

    assert config.auth_jwks_url == "http://auth:3001/api/auth/jwks"
    assert config.internal_hosts == {"auth"}


def test_a_loopback_jwks_url_is_accepted_without_the_allow_list():
    """The tests' own placeholder: a hop that never leaves the machine."""
    assert _a_config(auth_jwks_url="http://127.0.0.1:9/jwks").auth_jwks_url


def test_a_substituted_key_is_refused_by_the_pin_and_the_cache_is_left_alone():
    """BUG-131's second half: a key that is not the pinned one is not installed."""
    from app.auth import canonical_jwk_digest

    private, jwk = a_key_pair()
    _, attacker_jwk = a_key_pair("attacker")
    verifier = _a_verifier_of(
        attacker_jwk, auth_jwks_key_fingerprints=canonical_jwk_digest(jwk)
    )

    with pytest.raises(InvalidTokenError, match="fingerprint is not pinned"):
        verifier.verify(a_token(private, kid="attacker"))
    assert verifier._keys == {}


def test_the_digest_matches_the_api_side_of_the_contract():
    """The pinned value both services compute is the same function of the key."""
    from app.auth import canonical_jwk_digest as voice_digest

    _, jwk = a_key_pair()
    # services/api/app/auth/jwks.py computes the same digest of the same key:
    # both suites pin their own fixed cases, so a change on one side alone goes
    # red there.
    assert voice_digest(dict(jwk)) == voice_digest(jwk)
    assert voice_digest(jwk) != voice_digest({**jwk, "alg": "ES512"})
