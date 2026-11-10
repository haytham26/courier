"""D44: the Stripe NZD side - the price catalogue, the sessions, and the webhook
translation (ADR-031 / D68).

The founder's billing decision is Stripe in NZD, test mode until the keys are
swapped. These tests pin the three things the decision adds, without a network
and without a key: the catalogue reads the environment and refuses a plan it has
no price for; the sessions are created against a RECORDED transport (the body
and the URLs this deployment would send); and Stripe's real webhook shapes come
out as this API's one fact - the same fact `app.providers` verifies and ingests.
"""

from __future__ import annotations

import hashlib
import hmac
import json
from datetime import UTC, datetime
from typing import Any

import pytest

from app import stripe_nz
from app.entitlements import Plan, SubscriptionState
from app.main import app
from app.providers import (
    fact_from_stripe_event,
    is_stripe_shape,
)
from app.repo import InMemoryRepo, get_repo
from app.stripe_nz import (
    absolute,
    checkout_session_url,
    fact_from_stripe_webhook,
    plan_of_price,
    portal_session_url,
    price_of,
)

COURIER = "driver-42"
PRICE_SOLO = "price_solo_nzd_monthly"
PRICE_TEAM = "price_team_nzd_monthly"
STARTED = int(datetime(2026, 11, 10, 2, 0, tzinfo=UTC).timestamp())
PERIOD_END = STARTED + 30 * 86400


def a_configured_deployment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_courier_founder")
    monkeypatch.setenv("STRIPE_PRICE_SOLO", PRICE_SOLO)
    monkeypatch.setenv("STRIPE_PRICE_TEAM", PRICE_TEAM)


def a_recorder(monkeypatch: pytest.MonkeyPatch, answer: dict[str, Any] | None = None):
    """Replace Stripe's transport with a recorder (no network, no key)."""
    sent: list[tuple[str, dict[str, str]]] = []

    def fake_post(path: str, data: dict[str, str]) -> dict[str, Any]:
        sent.append((path, dict(data)))
        return answer if answer is not None else {"id": "cs_test_1", "url": "https://checkout.stripe.com/session"}

    monkeypatch.setattr(stripe_nz, "_post", fake_post)
    return sent


@pytest.fixture(autouse=True)
def _no_billing_cache_leak():
    """The billing settings are cached (`billing_sources`/`webhook_secret` are
    `lru_cache`d, the same way production reads them once), and a test that sets
    `BILLING_SOURCES` must not leave "stripe" in that cache for the test that
    expects an empty deployment - the same reset `test_billing_providers.py`
    does."""
    from app.billing import billing_sources, webhook_secret

    yield
    billing_sources.cache_clear()
    webhook_secret.cache_clear()


@pytest.fixture
def web_client():
    """A client whose repo and verifier are the test's own (no database)."""

    from fastapi.testclient import TestClient

    from app.auth.jwks import get_verifier
    from tests.auth.test_jwks import make_key_pair, make_verifier

    repo = InMemoryRepo()
    app.dependency_overrides[get_repo] = lambda: repo
    app.dependency_overrides[get_verifier] = lambda: make_verifier({"keys": [make_key_pair()[1]]})
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()


class TestThePriceCatalogue:
    """Which price sells which plan - read from the founder's switches."""

    def test_a_plan_with_no_price_is_refused(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("STRIPE_PRICE_SOLO", raising=False)

        with pytest.raises(ValueError, match="STRIPE_PRICE_SOLO"):
            price_of(Plan.SOLO)

    def test_the_trial_is_not_sold(self) -> None:
        with pytest.raises(ValueError, match="not sold"):
            price_of(Plan.TRIAL)

    def test_the_catalogue_reverses_a_price_to_its_plan(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        a_configured_deployment(monkeypatch)

        assert plan_of_price(PRICE_SOLO) is Plan.SOLO
        assert plan_of_price(PRICE_TEAM) is Plan.TEAM
        assert plan_of_price("price_someone_elses") is None
        assert plan_of_price("") is None


class TestTheSessions:
    """The Checkout and portal sessions, against a recorded transport."""

    def test_the_checkout_session_carries_the_courier_and_the_price(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        a_configured_deployment(monkeypatch)
        sent = a_recorder(monkeypatch)

        url = checkout_session_url(COURIER, Plan.SOLO, "https://staging.courier.nz/")

        assert url == "https://checkout.stripe.com/session"
        path, data = sent[0]
        assert path == "/v1/checkout/sessions"
        assert data["mode"] == "subscription"
        assert data["client_reference_id"] == COURIER
        assert data["line_items[0][price]"] == PRICE_SOLO
        assert data["success_url"] == "https://staging.courier.nz/billing/stripe/return?session={CHECKOUT_SESSION_ID}"
        assert data["cancel_url"] == "https://staging.courier.nz/billing/stripe/cancelled"

    def test_a_return_base_that_is_not_absolute_is_refused(self) -> None:
        with pytest.raises(ValueError, match="absolute"):
            absolute("staging.courier.nz", "/billing/stripe/return")

    def test_a_session_with_no_key_refuses(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)
        a_recorder(monkeypatch)

        with pytest.raises(ValueError, match="STRIPE_SECRET_KEY"):
            checkout_session_url(COURIER, Plan.SOLO, "https://staging.courier.nz")

    def test_a_portal_without_a_recorded_customer_refuses(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        a_configured_deployment(monkeypatch)
        a_recorder(monkeypatch, answer={"url": "https://billing.stripe.com/portal"})

        with pytest.raises(ValueError, match="customer"):
            portal_session_url(COURIER, "https://staging.courier.nz", None)


class TestTheWebhookTranslation:
    """Stripe's real shapes, as this API's one fact."""

    def test_a_completed_checkout_is_an_active_subscription(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        a_configured_deployment(monkeypatch)

        fact = fact_from_stripe_webhook(
            {
                "type": "checkout.session.completed",
                "created": STARTED,
                "data": {
                    "object": {
                        "id": "cs_test_1",
                        "client_reference_id": COURIER,
                        "subscription": "sub_nzd_1",
                        "created": STARTED,
                        "current_period_end": PERIOD_END,
                        "line_items": {"data": [{"price": {"id": PRICE_SOLO}}]},
                    }
                },
            }
        )

        assert fact.courier_id == COURIER
        assert fact.plan is Plan.SOLO
        assert fact.state is SubscriptionState.ACTIVE
        assert fact.purchase_id == "sub_nzd_1"
        assert fact.started_at == datetime.fromtimestamp(STARTED, UTC)
        assert fact.renews_at == datetime.fromtimestamp(PERIOD_END, UTC)

    def test_the_plan_comes_from_the_price_never_the_payload(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        a_configured_deployment(monkeypatch)

        with pytest.raises(ValueError, match="does not sell"):
            fact_from_stripe_webhook(
                {
                    "type": "checkout.session.completed",
                    "created": STARTED,
                    "data": {
                        "object": {
                            "client_reference_id": COURIER,
                            "plan": "team",  # a field a client could write
                            "line_items": {"data": [{"price": {"id": "price_not_ours"}}]},
                        }
                    },
                }
            )

    def test_a_cancelled_subscription_is_canceled(self, monkeypatch: pytest.MonkeyPatch) -> None:
        a_configured_deployment(monkeypatch)

        fact = fact_from_stripe_webhook(
            {
                "type": "customer.subscription.deleted",
                "created": STARTED,
                "data": {
                    "object": {
                        "id": "sub_nzd_1",
                        "client_reference_id": COURIER,
                        "status": "canceled",
                        "start_date": STARTED,
                        "canceled_at": STARTED + 3600,
                        "items": {"data": [{"price": {"id": PRICE_SOLO}}]},
                    }
                },
            }
        )

        assert fact.state is SubscriptionState.CANCELED
        assert fact.ends_at == datetime.fromtimestamp(STARTED + 3600, UTC)

    def test_a_failed_invoice_is_past_due_and_that_is_live(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        a_configured_deployment(monkeypatch)

        fact = fact_from_stripe_webhook(
            {
                "type": "invoice.payment_failed",
                "created": STARTED,
                "data": {
                    "object": {
                        "id": "in_nzd_1",
                        "subscription": "sub_nzd_1",
                        "client_reference_id": COURIER,
                        "lines": {"data": [{"price": {"id": PRICE_TEAM}}]},
                    }
                },
            }
        )

        assert fact.state is SubscriptionState.PAST_DUE
        assert fact.plan is Plan.TEAM

    def test_an_event_this_deployment_does_not_apply_is_a_refusal(self) -> None:
        with pytest.raises(ValueError, match="not a fact"):
            fact_from_stripe_webhook(
                {"type": "payment_intent.succeeded", "data": {"object": {}}}
            )

    def test_an_event_with_no_courier_is_a_refusal(self) -> None:
        with pytest.raises(ValueError, match="no courier"):
            fact_from_stripe_webhook(
                {"type": "checkout.session.completed", "data": {"object": {"id": "cs_1"}}}
            )

    def test_a_naive_timestamp_refuses_rather_than_mis_answering(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        a_configured_deployment(monkeypatch)

        with pytest.raises(ValueError, match="timezone"):
            fact_from_stripe_webhook(
                {
                    "type": "checkout.session.completed",
                    "created": "2026-11-10T02:00:00",  # no offset
                    "data": {
                        "object": {
                            "client_reference_id": COURIER,
                            "line_items": {"data": [{"price": {"id": PRICE_SOLO}}]},
                        }
                    },
                }
            )


class TestTheSignerSeesStripe:
    """The existing verifier now takes Stripe's own shapes too."""

    def test_a_signed_stripe_event_is_ingested(
        self, monkeypatch: pytest.MonkeyPatch, web_client
    ) -> None:

        a_configured_deployment(monkeypatch)
        monkeypatch.setenv("BILLING_SOURCES", "stripe")
        monkeypatch.setenv("BILLING_WEBHOOK_SECRET_STRIPE", "whsec_test-secret-value-long-enough-32")
        repo = InMemoryRepo()
        app.dependency_overrides[get_repo] = lambda: repo
        try:
            event = {
                "type": "checkout.session.completed",
                "created": STARTED,
                "data": {
                    "object": {
                        "id": "cs_test_1",
                        "client_reference_id": COURIER,
                        "subscription": "sub_nzd_1",
                        "created": STARTED,
                        "current_period_end": PERIOD_END,
                        "line_items": {"data": [{"price": {"id": PRICE_SOLO}}]},
                    }
                },
            }
            body = json.dumps(event, separators=(",", ":")).encode("utf-8")
            timestamp = int(datetime.now(UTC).timestamp())
            payload = f"{timestamp}.".encode() + body
            secret = "whsec_test-secret-value-long-enough-32"
            signature = "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()

            accepted = web_client.post(
                "/billing/webhooks/stripe",
                content=body,
                headers={"X-Signature": signature, "X-Signature-Timestamp": str(timestamp)},
            )

            assert accepted.status_code == 200, accepted.text
            stored = repo.get_subscription(COURIER)
            assert stored is not None
            assert stored.plan is Plan.SOLO
            assert stored.state is SubscriptionState.ACTIVE
        finally:
            app.dependency_overrides.clear()

    def test_the_shape_detection_is_exclusive(self) -> None:
        assert is_stripe_shape({"type": "x", "data": {"object": {}}})
        assert not is_stripe_shape({"type": "x", "courier_id": "d", "data": {}})
        assert not is_stripe_shape({"courier_id": "d"})

    def test_a_canonical_fact_still_reads(self) -> None:
        fact = fact_from_stripe_event(
            {
                "id": "evt_1",
                "type": "billing.subscription.updated",
                "courier_id": COURIER,
                "purchase": {
                    "id": "sub_1",
                    "plan": "solo",
                    "state": "active",
                    "started_at": datetime(2026, 11, 1, tzinfo=UTC).isoformat(),
                },
            }
        )

        assert fact.courier_id == COURIER
        assert fact.plan is Plan.SOLO
