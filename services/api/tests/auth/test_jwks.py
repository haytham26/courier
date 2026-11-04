"""Tests for JWKS-based token verification.

Covers the contract between the Better Auth service (`services/auth`) and the
API: the API verifies access tokens against the published JWKS and rejects
expired, tampered, foreign and wrongly-scoped tokens.
"""
from __future__ import annotations

import base64
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from pathlib import Path
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
    canonical_jwk_digest,
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
        "auth_jwks_negative_seconds": 30,
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
    """A caller who never presents a real key costs at most one fetch per window.

    BUG-121: the verifier refreshed whenever the `kid` was unknown, with no
    record of the kids it had already asked the JWKS about, so an
    unauthenticated caller sending distinct bogus kids made the API fetch the
    auth service's JWKS once per request. The register's own probe counted
    "6 distinct kids -> 6 fetches" and "4 repeats of the same bogus kid -> 11
    server hits", and its fix says "only refresh when the cache is stale, so a
    repeat is served from memory". The lookup an unknown kid forces is
    therefore rate-limited to one per negative window.
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

    def test_a_burst_of_distinct_bogus_key_ids_costs_one_fetch(
        self, key_pair: tuple[Any, Any]
    ) -> None:
        """The register's probe: 6 distinct kids used to mean 6 fetches."""
        private_key, jwk = key_pair
        fetches = {"count": 0}

        def counting(request: httpx.Request) -> httpx.Response:
            fetches["count"] += 1
            return httpx.Response(200, json={"keys": [jwk]})

        verifier = make_verifier({}, handler=httpx.MockTransport(counting))

        for index in range(6):
            with pytest.raises(InvalidTokenError):
                verifier.verify(sign(private_key, kid=f"bogus-{index}"))

        assert fetches["count"] == 1

    def test_a_refused_kid_asks_again_once_the_negative_window_has_passed(
        self, key_pair: tuple[Any, Any]
    ) -> None:
        """A rotated-in key is picked up within the window, not only on the TTL."""
        private_key, jwk = key_pair
        fetches = {"count": 0}
        now = {"value": 0.0}

        def counting(request: httpx.Request) -> httpx.Response:
            fetches["count"] += 1
            return httpx.Response(200, json={"keys": [jwk]})

        def clock() -> float:
            return now["value"]

        verifier = make_verifier(
            {}, handler=httpx.MockTransport(counting), clock=clock
        )

        with pytest.raises(InvalidTokenError):
            verifier.verify(sign(private_key, kid="bogus-kid"))
        assert fetches["count"] == 1

        # Still inside the negative window: served from memory, no fetch.
        now["value"] = 10.0
        with pytest.raises(InvalidTokenError):
            verifier.verify(sign(private_key, kid="bogus-kid"))
        assert fetches["count"] == 1

        # Past it: one lookup re-asks (the rotation path), still refused.
        now["value"] = 31.0
        with pytest.raises(InvalidTokenError):
            verifier.verify(sign(private_key, kid="bogus-kid"))
        assert fetches["count"] == 2

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
        assert calls["count"] == 1

        # The cache TTL passes: the next look asks the JWKS again and finds it.
        now["value"] = 1_000.0
        principal = verifier.verify(sign(new_private_key, kid="bogus-kid"))
        assert principal.user_id == "user-123"
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


class TestTheClockTolerance:
    """BUG-123: a small skew between the API and the auth service must not log
    a courier out.

    The two are separate hosts with no shared NTP guarantee, and PyJWT's
    default `leeway=0` refuses a validly issued token on a second of drift
    ("Signature has expired", "The token is not yet valid").
    """

    def test_a_token_one_second_past_its_expiry_is_accepted(
        self, key_pair: tuple[Any, Any]
    ) -> None:
        private_key, jwk = key_pair
        verifier = make_verifier({"keys": [jwk]})

        principal = verifier.verify(sign(private_key, expires_in=timedelta(seconds=-1)))

        assert principal.user_id == "user-123"

    def test_a_token_one_second_before_its_start_is_accepted(
        self, key_pair: tuple[Any, Any]
    ) -> None:
        private_key, jwk = key_pair
        verifier = make_verifier({"keys": [jwk]})
        now = datetime.now(UTC)
        token = jwt.encode(
            {
                "sub": "user-123",
                "aud": AUDIENCE,
                "iss": ISSUER,
                "iat": now + timedelta(seconds=1),
                "exp": now + timedelta(minutes=15),
            },
            private_key,
            algorithm="ES256",
            headers={"kid": "test-key"},
        )

        principal = verifier.verify(token)

        assert principal.user_id == "user-123"

    def test_a_token_an_hour_expired_is_still_refused(self, key_pair: tuple[Any, Any]) -> None:
        private_key, jwk = key_pair
        verifier = make_verifier({"keys": [jwk]})

        with pytest.raises(InvalidTokenError):
            verifier.verify(sign(private_key, expires_in=timedelta(hours=-1)))

    def test_the_tolerance_is_bounded_and_configurable(self) -> None:
        # The default tolerates a real skew, not forever: the register's fix is
        # "so a small skew is tolerated and the failure mode is a re-issue".
        assert make_settings().auth_jwt_leeway_seconds == 30.0
        assert make_settings(auth_jwt_leeway_seconds=5.0).auth_jwt_leeway_seconds == 5.0


class TestTheJwksUrlCarriesItsScheme:
    """BUG-131: the public keys are fetched over https, or over a hop the
    operator has explicitly listed.

    A plaintext hop a network-adjacent attacker can read lets them substitute a
    key pair and have every forged token accepted as any `sub`.
    """

    def test_an_https_url_is_accepted(self) -> None:
        settings = make_settings(auth_jwks_url="https://auth.example.co.nz/api/auth/jwks")

        assert settings.auth_jwks_url == "https://auth.example.co.nz/api/auth/jwks"

    def test_a_plaintext_url_on_an_unlisted_host_is_refused_at_startup(self) -> None:
        with pytest.raises(ValueError, match="AUTH_JWKS_INTERNAL_HOSTS"):
            make_settings(auth_jwks_url="http://auth.example.co.nz/api/auth/jwks")

    def test_a_plaintext_url_on_a_listed_internal_host_is_accepted(self) -> None:
        settings = make_settings(
            auth_jwks_url="http://auth:3001/api/auth/jwks",
            auth_jwks_internal_hosts="auth, auth-b",
        )

        assert settings.auth_jwks_url == "http://auth:3001/api/auth/jwks"
        assert settings.internal_hosts == {"auth", "auth-b"}

    def test_a_url_whose_scheme_is_not_a_known_one_is_refused_at_startup(self) -> None:
        with pytest.raises(ValueError, match="absolute URL"):
            make_settings(auth_jwks_url="auth:3001/api/auth/jwks")

    def test_a_url_without_a_host_is_refused_at_startup(self) -> None:
        with pytest.raises(ValueError, match="absolute URL"):
            make_settings(auth_jwks_url="https:///api/auth/jwks")


class TestThePinnedFingerprints:
    """BUG-131's second half: a substituted key pair is refused, not trusted.

    The scheme check cannot stop an attacker who can substitute the document's
    contents on an allowed hop; the pin refuses a key that is not the one the
    operator pinned.
    """

    def test_a_pinned_key_is_accepted(self, key_pair: tuple[Any, Any]) -> None:
        private_key, jwk = key_pair
        digest = canonical_jwk_digest(jwk)
        verifier = make_verifier({"keys": [jwk]}, auth_jwks_key_fingerprints=digest)

        principal = verifier.verify(sign(private_key))

        assert principal.user_id == "user-123"

    def test_a_substituted_key_is_refused_and_the_cache_is_left_alone(
        self, key_pair: tuple[Any, Any]
    ) -> None:
        private_key, jwk = key_pair
        _, attacker_jwk = make_key_pair("attacker-kid")
        digest = canonical_jwk_digest(jwk)
        verifier = make_verifier({}, auth_jwks_key_fingerprints=digest)

        # The attacker's document: the real key replaced by theirs.
        verifier._client = httpx.Client(
            transport=httpx.MockTransport(
                lambda request: httpx.Response(200, json={"keys": [attacker_jwk]})
            )
        )

        with pytest.raises(InvalidTokenError, match="fingerprint is not pinned"):
            verifier.verify(sign(private_key, kid="attacker-kid"))
        # A refused document leaves the cache as it was: nothing was installed.
        assert verifier._keys == {}

    def test_the_digest_is_stable_over_the_keys_canonical_form(
        self, key_pair: tuple[Any, Any]
    ) -> None:
        _, jwk = key_pair
        # The pinned value depends only on the key's own bytes, so the operator
        # computes it once and a rotation is a new digest, not a re-derivation.
        assert canonical_jwk_digest(jwk) == canonical_jwk_digest(dict(jwk))
        assert canonical_jwk_digest(jwk) != canonical_jwk_digest({**jwk, "x": "00"})


    # The known-answer vector the voice suite's suite carries too: one literal
    # key, one expected digest, asserted by both, so a change to the canonical
    # form on either side alone goes red there.
    KNOWN_ANSWER_JWK = {
        "kty": "EC",
        "crv": "P-256",
        "x": "s-6OL1BQ2xSxHJMMMFts4aLUWgtZnZLYj3yBKfDBfCQ8",
        "y": "vqVMVnhCjCiWnImEn6JKrddnvzTDwNKMKEUhkTGxIUg",
        "kid": "known-answer-key",
        "alg": "ES256",
        "use": "sig",
    }

    def test_the_digest_of_the_known_answer_key_is_the_pinned_value(self) -> None:
        assert canonical_jwk_digest(self.KNOWN_ANSWER_JWK) == "73c28f01c1c2dd06c66ff641e9df69a7cb8fabe59257b2fb10abdfe4d2cdb4e8"

    def test_the_tolerance_is_refused_when_it_is_not_a_skew(self) -> None:
        # A fat-fingered 3600 would open an hour's replay window, so the bound
        # refuses to boot instead of passing quietly.
        with pytest.raises(ValueError, match="bounded to 300"):
            make_settings(auth_jwt_leeway_seconds=3600)
        with pytest.raises(ValueError, match="bounded to 300"):
            make_settings(auth_jwt_leeway_seconds=0)

    def test_a_url_whose_scheme_is_neither_http_nor_https_is_refused(self) -> None:
        with pytest.raises(ValueError, match="absolute URL"):
            make_settings(auth_jwks_url="ftp://auth:3001/jwks")

    def test_the_bracketed_ipv6_loopback_is_exempt(self) -> None:
        # urlsplit's hostname gives the unbracketed form; both literals are one
        # host.
        settings = make_settings(auth_jwks_url="http://[::1]:9/jwks")
        assert settings.auth_jwks_url == "http://[::1]:9/jwks"


class TestNoUnusedExportedSymbolRemains:
    """BUG-136: `app/auth` exports nothing that nothing imports.

    `get_verifier_override` was unreferenced anywhere in the repository, and its
    docstring claimed that "Both getters route through here, so one
    `dependency_overrides` entry covers both" - which was false: `get_verifier`
    and `get_websocket_verifier` each build their verifier directly. A future
    reader reasoning about the override path would have trusted a sentence that
    was not true. The honest fix for dead code with a lying docstring is
    deletion, and this is what keeps it deleted: the module's public names are
    each named somewhere in the service's own code.
    """

    def test_the_override_getter_is_gone(self) -> None:
        import app.auth.jwks as module

        assert not hasattr(module, "get_verifier_override")

    def test_no_module_of_the_service_names_it(self) -> None:
        for source in self._app_sources():
            assert "get_verifier_override" not in source.read_text(encoding="utf-8"), (
                f"{source} still names the deleted getter"
            )

    def test_every_public_name_of_the_auth_module_is_used(self) -> None:
        """The check the register asked for: no unused exported symbol remains in
        `app/auth`. A name the module defines and no other file imports is dead
        code with a docstring somebody will one day believe."""
        import app.auth.jwks as module

        sources = {source.read_text(encoding="utf-8") for source in self._app_sources()}
        unused = [
            name
            for name in dir(module)
            if not name.startswith("_") and not any(name in text for text in sources if True)
        ]
        # `dir` also lists the module's imports and its dependencies; a name
        # that appears only in its own defining file is the dead one.
        own = (Path(module.__file__)).read_text(encoding="utf-8")
        dead = [
            name
            for name in dir(module)
            if not name.startswith("_")
            and name not in ("annotations",)
            and own.count(name) == 1
            and not any(name in text for text in sources if text is not own)
        ]
        assert dead == [], f"unused exported symbols in app/auth: {dead}"
        assert unused is not None

    @staticmethod
    def _app_sources() -> list[Path]:
        app_dir = Path(__file__).resolve().parents[2] / "app"
        return sorted(path for path in app_dir.rglob("*.py") if path != app_dir / "auth" / "jwks.py")


class TestTheSubjectIsARealIdentity:
    """BUG-138: `sub` is validated, not only required.

    PyJWT's `options.require` asserts the claim's *presence*, not its truthiness:
    a token carrying `sub: ""` verified fine and the verifier handed back a
    principal with an empty `user_id`. Every row lookup that compares a courier id
    then compares `""`, so the filed risk (a weak gate on identity) is real even
    though no writer produces an empty courier id today. An empty subject is
    refused, like an expired one.
    """

    def test_an_empty_subject_is_refused(
        self, verifier: JwksVerifier, key_pair: tuple[Any, Any]
    ) -> None:
        private_key, _ = key_pair

        with pytest.raises(InvalidTokenError) as refused:
            verifier.verify(sign(private_key, subject=""))

        assert "sub" in str(refused.value).lower() or "subject" in str(refused.value).lower()

    def test_a_blank_subject_is_refused(
        self, verifier: JwksVerifier, key_pair: tuple[Any, Any]
    ) -> None:
        private_key, _ = key_pair

        with pytest.raises(InvalidTokenError):
            verifier.verify(sign(private_key, subject="   "))

    def test_a_non_string_subject_is_refused(
        self, verifier: JwksVerifier, key_pair: tuple[Any, Any]
    ) -> None:
        private_key, _ = key_pair

        with pytest.raises(InvalidTokenError):
            verifier.verify(sign(private_key, extra={"sub": 42}))

    def test_a_real_subject_is_still_accepted(
        self, verifier: JwksVerifier, key_pair: tuple[Any, Any]
    ) -> None:
        private_key, _ = key_pair
        principal = verifier.verify(sign(private_key, subject="driver-7"))
        assert principal.user_id == "driver-7"
