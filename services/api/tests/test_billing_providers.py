"""The billing providers (ADR-018): one fact shape, three signature rules, an ingest.

The signature rules are the ones the payments squad took from the Stripe client,
enforced once here so no provider can bypass them. They are exercised against
fixtures with locally-computed signatures: no network, no keys, because the real
endpoints and secrets are the founder's switches.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.auth.jwks import get_verifier
from app.entitlements import Plan, SubscriptionState, entitlement_of
from app.main import app
from app.providers import (
    SIGNATURE_TOLERANCE,
    ProviderFact,
    StripeVerifier,
    accepted_sources,
    apply_facts,
    fact_from_stripe_event,
)
from app.repo import InMemoryRepo, get_repo
from tests.auth.test_jwks import make_key_pair, make_verifier

COURIER = "driver-7"
SECRET = "whsec_test-secret-value-long-enough-32"
PURCHASE = "sub_play_1"
STARTED = datetime(2026, 10, 26, 7, 0, tzinfo=UTC)


def a_fact(
    state: SubscriptionState = SubscriptionState.ACTIVE,
    renews_at: datetime | None = None,
    ends_at: datetime | None = None,
    courier_id: str = COURIER,
) -> ProviderFact:
    return ProviderFact(
        courier_id=courier_id,
        source="stripe",
        purchase_id=PURCHASE,
        plan=Plan.SOLO,
        state=state,
        started_at=STARTED,
        renews_at=renews_at if renews_at is not None else STARTED + timedelta(days=30),
        ends_at=ends_at,
    )


def an_event(fact: ProviderFact, at: datetime | None = None) -> dict[str, Any]:
    """A provider-shaped event carrying one fact (the shape both providers share)."""
    return {
        "id": str(uuid.uuid4()),
        "type": "billing.subscription.updated",
        "courier_id": fact.courier_id,
        "purchase": {
            "id": fact.purchase_id,
            "plan": fact.plan.value,
            "state": fact.state.value,
            "started_at": fact.started_at.isoformat(),
            "renews_at": fact.renews_at.isoformat() if fact.renews_at else None,
            "ends_at": fact.ends_at.isoformat() if fact.ends_at else None,
        },
        "updated_at": (at or STARTED).isoformat(),
    }


def sign(body: bytes, secret: str = SECRET, at: datetime | None = None) -> dict[str, str]:
    """The signature headers a provider sends (HMAC over timestamp.body).

    Defaults to now, because the tolerance is measured against the server's
    clock and a fixture's fixed timestamp would age out of it."""
    timestamp = str(int((at or datetime.now(UTC)).timestamp()))
    payload = f"{timestamp}.{body.decode('utf-8')}".encode()
    digest = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return {"X-Signature-Timestamp": timestamp, "X-Signature": f"sha256={digest}"}


class TestTheSignatureRules:
    def setup_method(self) -> None:
        self.verifier = StripeVerifier()

    def test_a_correct_signature_verifies(self) -> None:
        body = json.dumps(an_event(a_fact()), separators=(",", ":")).encode("utf-8")

        facts = self.verifier.verify(body, sign(body), SECRET)

        assert len(facts) == 1
        assert facts[0].courier_id == COURIER
        assert facts[0].purchase_id == PURCHASE
        assert facts[0].plan is Plan.SOLO

    def test_an_empty_secret_is_refused_before_any_comparison(self) -> None:
        body = json.dumps(an_event(a_fact()), separators=(",", ":")).encode("utf-8")
        headers = sign(body)

        for secret in ("", "   "):
            with pytest.raises(ValueError, match="no signing secret"):
                self.verifier.verify(body, headers, secret)

    def test_a_stale_signature_is_refused(self) -> None:
        body = json.dumps(an_event(a_fact()), separators=(",", ":")).encode("utf-8")
        # A signature from well beyond the tolerance: a replay.
        headers = sign(body, at=datetime.now(UTC) - timedelta(seconds=SIGNATURE_TOLERANCE + 5))

        with pytest.raises(ValueError, match="outside the tolerance"):
            self.verifier.verify(body, headers, SECRET)

    def test_the_tolerance_is_a_constant_not_a_per_call_window(self) -> None:
        """The squad's rule: a per-call window is how a replay becomes possible."""
        assert isinstance(SIGNATURE_TOLERANCE, int)
        assert SIGNATURE_TOLERANCE == 300
        # The verifier takes no tolerance argument at all.
        import inspect

        parameters = inspect.signature(StripeVerifier().verify).parameters
        assert not any("tolerance" in name for name in parameters)

    def test_a_truncated_body_is_not_an_event(self) -> None:
        body = json.dumps(an_event(a_fact()), separators=(",", ":")).encode("utf-8")
        truncated = body[: len(body) // 2]

        with pytest.raises(ValueError):
            self.verifier.verify(truncated, sign(truncated), SECRET)

    def test_a_modified_body_does_not_verify(self) -> None:
        body = json.dumps(an_event(a_fact()), separators=(",", ":")).encode("utf-8")
        tampered = body.replace(COURIER.encode("utf-8"), b"driver-8")

        with pytest.raises(ValueError, match="signature"):
            self.verifier.verify(tampered, sign(body), SECRET)

    def test_a_missing_signature_header_is_refused(self) -> None:
        body = json.dumps(an_event(a_fact()), separators=(",", ":")).encode("utf-8")

        with pytest.raises(ValueError):
            self.verifier.verify(body, {}, SECRET)

    def test_a_provider_payload_becomes_a_fact(self) -> None:
        """The wire shape both providers share is coerced in one place."""
        event = an_event(a_fact())

        fact = fact_from_stripe_event(event)

        assert fact.courier_id == COURIER
        assert fact.purchase_id == PURCHASE
        assert fact.plan is Plan.SOLO
        assert fact.state is SubscriptionState.ACTIVE
        assert fact.renews_at == STARTED + timedelta(days=30)
        assert fact.ends_at is None


class TestTheIngest:
    def test_a_fact_is_stored_and_answers_active(self) -> None:
        repo = InMemoryRepo()

        created = apply_facts(repo, [a_fact()])

        assert created is True
        stored = repo.get_subscription(COURIER)
        assert stored is not None
        assert stored.state is SubscriptionState.ACTIVE
        assert entitlement_of(stored).active is True

    def test_a_replay_is_a_no_op(self) -> None:
        repo = InMemoryRepo()
        apply_facts(repo, [a_fact()])

        again = apply_facts(repo, [a_fact()])

        assert again is False

    def test_a_stale_fact_does_not_move_the_subscription(self) -> None:
        """A stale webhook is a fact, not a state (ADR-017 §3)."""
        repo = InMemoryRepo()
        apply_facts(repo, [a_fact(renews_at=STARTED + timedelta(days=1))])

        apply_facts(
            repo, [a_fact(renews_at=STARTED - timedelta(days=1), state=SubscriptionState.EXPIRED)]
        )

        stored = repo.get_subscription(COURIER)
        assert stored is not None
        assert stored.state is SubscriptionState.ACTIVE
        assert stored.renews_at == STARTED + timedelta(days=1)

    def test_a_revoked_fact_removes_access(self) -> None:
        repo = InMemoryRepo()
        apply_facts(repo, [a_fact()])

        # The revocation ends the paid period now: the money went back.
        apply_facts(
            repo,
            [
                a_fact(
                    state=SubscriptionState.CANCELED, ends_at=datetime.now(UTC) - timedelta(days=1)
                )
            ],
        )

        stored = repo.get_subscription(COURIER)
        assert stored is not None
        assert entitlement_of(stored).active is False

    def test_an_unaccepted_source_is_refused_at_the_boundary(self) -> None:
        repo = InMemoryRepo()
        fact = a_fact()
        rejected = ProviderFact(
            courier_id=fact.courier_id,
            source="appstore",
            purchase_id=fact.purchase_id,
            plan=fact.plan,
            state=fact.state,
            started_at=fact.started_at,
            renews_at=fact.renews_at,
        )

        with pytest.raises(ValueError, match="not accepted"):
            apply_facts(repo, [rejected], accepted={"stripe"})
        assert repo.get_subscription(COURIER) is None

    def test_the_accepted_sources_come_from_the_deployment(self) -> None:
        assert accepted_sources("stripe") == {"stripe"}
        assert accepted_sources("") == set()
        assert accepted_sources("stripe,play") == {"stripe", "play"}

    def test_another_couriers_fact_is_theirs(self) -> None:
        repo = InMemoryRepo()

        apply_facts(repo, [a_fact(courier_id="driver-8")])

        assert repo.get_subscription(COURIER) is None
        assert repo.get_subscription("driver-8") is not None


@pytest.fixture(autouse=True)
def _clear_billing_cache() -> Iterator[None]:
    """The settings are cached per process; a test must not inherit another's."""
    from app import billing

    billing.billing_sources.cache_clear()
    billing.webhook_secret.cache_clear()
    yield
    billing.billing_sources.cache_clear()
    billing.webhook_secret.cache_clear()


@pytest.fixture()
def web_client() -> Iterator[TestClient]:
    """A client whose repo and verifier are the test's own (no database)."""
    repo = InMemoryRepo()
    app.dependency_overrides[get_repo] = lambda: repo
    app.dependency_overrides[get_verifier] = lambda: make_verifier({"keys": [make_key_pair()[1]]})
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()


class TestTheWebhookEndpoint:
    """The endpoint's contract: refuse a bad request before it reaches the ingest."""

    def test_a_deployment_with_no_sources_is_404(
        self, web_client: TestClient, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("BILLING_SOURCES", "")

        refused = web_client.post("/billing/webhooks/stripe", content=b"{}")

        assert refused.status_code == 404

    def test_a_body_without_a_signature_is_400(
        self, web_client: TestClient, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("BILLING_SOURCES", "stripe")
        monkeypatch.setenv("BILLING_WEBHOOK_SECRET_STRIPE", SECRET)
        body = json.dumps(an_event(a_fact()), separators=(",", ":")).encode("utf-8")

        refused = web_client.post("/billing/webhooks/stripe", content=body)

        assert refused.status_code == 400
        assert "signature" in refused.json()["detail"]

    def test_a_signed_fact_is_accepted_and_stored(
        self, web_client: TestClient, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("BILLING_SOURCES", "stripe")
        monkeypatch.setenv("BILLING_WEBHOOK_SECRET_STRIPE", SECRET)
        body = json.dumps(an_event(a_fact()), separators=(",", ":")).encode("utf-8")

        accepted = web_client.post("/billing/webhooks/stripe", content=body, headers=sign(body))

        assert accepted.status_code == 200, accepted.text
        assert accepted.json() == {"accepted": True}
