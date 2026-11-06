"""The rate limiter's own tests (BUG-229, audit 2026-11-05 item 4a).

The shared app runs with the limiter DISABLED (conftest sets
``app.state.limiter.enabled = False``) so the rest of the suite is not
throttled; these tests re-enable it per test and give every client a fresh
token, so the in-memory buckets of the module-level limiter start empty.

slowapi does not rate-limit websockets (its middleware passes non-http scopes
through), which is deliberate: the voice socket has its own budget
(COPILOT_BUDGET_SECONDS, BUG-116) and a held-open socket is not a request
flood.
"""

from __future__ import annotations

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from tests.auth.test_jwks import sign


@pytest.fixture()
def limiter_on(monkeypatch: pytest.MonkeyPatch):
    """Enable the limiter with tiny limits for the duration of one test."""
    app.state.limiter.enabled = True
    monkeypatch.setenv("RATE_LIMIT_DEFAULT", "100/minute")
    monkeypatch.setenv("RATE_LIMIT_AUTH", "100/minute")
    monkeypatch.setenv("RATE_LIMIT_UPLOADS", "100/minute")
    monkeypatch.setenv("RATE_LIMIT_WEBHOOKS", "100/minute")
    yield monkeypatch
    app.state.limiter.enabled = False


def _client(verifier_key: object, subject: str | None = None) -> TestClient:
    """A client whose bearer token is unique to this call (a fresh bucket)."""
    client = TestClient(app)
    client.headers.update(
        {"Authorization": f"Bearer {sign(verifier_key, subject=subject or f'rl-{uuid4().hex}')}"}
    )
    return client


def test_the_default_limit_answers_429_with_retry_after(verifier_key: object, limiter_on: pytest.MonkeyPatch) -> None:
    """The 100/minute default, tightened to 3: the 4th request is a 429 that
    names the limit and carries a Retry-After the client can act on."""
    limiter_on.setenv("RATE_LIMIT_DEFAULT", "3/minute")
    client = _client(verifier_key)
    for _ in range(3):
        assert client.get("/runs").status_code == 200
    answer = client.get("/runs")
    assert answer.status_code == 429
    assert answer.headers["Retry-After"] == "60"
    assert "rate limit" in answer.json()["detail"].lower()


def test_healthz_is_exempt(verifier_key: object, limiter_on: pytest.MonkeyPatch) -> None:
    """The uptime probe cannot hold a token and must never be throttled:
    1/minute, five probes, all 200."""
    limiter_on.setenv("RATE_LIMIT_DEFAULT", "1/minute")
    probe = TestClient(app)
    for _ in range(5):
        assert probe.get("/healthz").status_code == 200


def test_buckets_are_per_token_not_per_ip(verifier_key: object, limiter_on: pytest.MonkeyPatch) -> None:
    """Two tokens from the same test client (same IP) get two buckets:
    A's second request is 429 while B's first is 200."""
    limiter_on.setenv("RATE_LIMIT_DEFAULT", "1/minute")
    client_a = _client(verifier_key, subject="rl-bucket-a")
    client_b = _client(verifier_key, subject="rl-bucket-b")
    assert client_a.get("/runs").status_code == 200
    assert client_b.get("/runs").status_code == 200
    assert client_a.get("/runs").status_code == 429
    assert client_b.get("/runs").status_code == 429


def test_auth_routes_have_their_own_tighter_limit(verifier_key: object, limiter_on: pytest.MonkeyPatch) -> None:
    """The token endpoints are 20/minute in production; here 2: the third
    call to /auth/me is a 429 even though the default limit is far away."""
    limiter_on.setenv("RATE_LIMIT_AUTH", "2/minute")
    client = _client(verifier_key)
    assert client.get("/auth/me").status_code == 200
    assert client.get("/auth/me").status_code == 200
    answer = client.get("/auth/me")
    assert answer.status_code == 429
    assert answer.headers["Retry-After"] == "60"


def test_the_webhook_route_has_its_own_limit(verifier_key: object, limiter_on: pytest.MonkeyPatch) -> None:
    """The unauthenticated webhook endpoint is capped on its own (60/minute
    in production; here 2): an unsigned body is a 404, but the third call is
    a 429 - the limit runs before the signature check."""
    limiter_on.setenv("RATE_LIMIT_WEBHOOKS", "2/minute")
    client = TestClient(app)
    for _ in range(2):
        assert client.post("/billing/webhooks/stripe", content=b"{}").status_code == 404
    assert client.post("/billing/webhooks/stripe", content=b"{}").status_code == 429


def test_the_shared_suite_runs_unthrottled(verifier_key: object, client: TestClient) -> None:
    """The conftest contract: with the limiter disabled, a client can make
    many requests without a 429 (this test itself proves the flag is off)."""
    assert app.state.limiter.enabled is False
    for _ in range(20):
        assert client.get("/runs").status_code == 200
