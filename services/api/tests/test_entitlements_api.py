"""`GET /account/entitlements` (ADR-017): the app reads the server's word.

The phone never decides locally and never caches past the token: the entitlement
is one endpoint, and a courier with no subscription gets a named free answer
rather than a crash.
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.auth.jwks import get_verifier
from app.entitlements import Plan, SubscriptionState
from app.main import app
from app.repo import InMemoryRepo, SubscriptionRow, get_repo
from tests.auth.test_jwks import make_key_pair, make_verifier, sign

COURIER = "driver-7"
OTHER = "driver-8"
STARTED = datetime(2026, 10, 26, 7, 0, tzinfo=UTC)


@pytest.fixture()
def repo() -> InMemoryRepo:
    return InMemoryRepo()


@pytest.fixture()
def verifier_key(repo: InMemoryRepo) -> Iterator[object]:
    key_pair = make_key_pair()
    _, jwk = key_pair
    app.dependency_overrides[get_repo] = lambda: repo
    app.dependency_overrides[get_verifier] = lambda: make_verifier({"keys": [jwk]})
    yield key_pair[0]
    app.dependency_overrides.clear()


@pytest.fixture()
def client(verifier_key: object) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        test_client.headers.update(
            {"Authorization": f"Bearer {sign(verifier_key, subject=COURIER)}"}
        )
        yield test_client


@pytest.fixture()
def other_client(verifier_key: object) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        test_client.headers.update({"Authorization": f"Bearer {sign(verifier_key, subject=OTHER)}"})
        yield test_client


@pytest.fixture()
def anonymous_client(verifier_key: object) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


def a_subscription(
    courier_id: str = COURIER, state: SubscriptionState = SubscriptionState.ACTIVE
) -> SubscriptionRow:
    return SubscriptionRow(
        courier_id=courier_id,
        plan=Plan.SOLO,
        state=state,
        source="play",
        source_id="play-purchase-1",
        started_at=STARTED,
        renews_at=STARTED,
        ends_at=None,
    )


class TestTheEntitlementEndpoint:
    def test_an_active_subscription_opens_the_plan(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        repo.put_subscription(a_subscription())

        answer = client.get("/account/entitlements")

        assert answer.status_code == 200, answer.text
        body = answer.json()
        assert body["active"] is True
        assert body["plan"] == "solo"
        assert "routing" in body["features"]

    def test_no_subscription_is_the_free_answer(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        answer = client.get("/account/entitlements")

        assert answer.status_code == 200
        assert answer.json() == {"active": False, "plan": None, "features": []}

    def test_a_lapsed_subscription_keeps_the_plan_but_no_access(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        repo.put_subscription(a_subscription(state=SubscriptionState.EXPIRED))

        body = client.get("/account/entitlements").json()

        assert body["active"] is False
        assert body["plan"] == "solo"
        assert body["features"] == []

    def test_another_couriers_subscription_is_not_mine(
        self, other_client: TestClient, repo: InMemoryRepo
    ) -> None:
        repo.put_subscription(a_subscription(courier_id=COURIER))

        body = other_client.get("/account/entitlements").json()

        assert body["active"] is False
        assert body["plan"] is None

    def test_an_anonymous_call_is_refused(
        self, anonymous_client: TestClient, repo: InMemoryRepo
    ) -> None:
        assert anonymous_client.get("/account/entitlements").status_code == 401

    def test_two_couriers_two_subscriptions(
        self, client: TestClient, other_client: TestClient, repo: InMemoryRepo
    ) -> None:
        repo.put_subscription(a_subscription(courier_id=COURIER, state=SubscriptionState.ACTIVE))
        repo.put_subscription(a_subscription(courier_id=OTHER, state=SubscriptionState.GRACE))

        mine = client.get("/account/entitlements").json()
        theirs = other_client.get("/account/entitlements").json()

        assert mine["active"] is True
        assert theirs["active"] is True  # the grace window keeps the other courier working too
        assert mine["plan"] == theirs["plan"] == "solo"


class TestTheSubscriptionRowRoundTrip:
    """The stored row and the answer agree (the db suite proves the SQL half)."""

    def test_a_stored_row_reads_back_as_the_same_subscription(self, repo: InMemoryRepo) -> None:
        stored = a_subscription()
        repo.put_subscription(stored)

        assert repo.get_subscription(COURIER) == stored

    def test_a_correction_is_not_a_new_row(self, repo: InMemoryRepo) -> None:
        repo.put_subscription(a_subscription())
        corrected = a_subscription(state=SubscriptionState.PAST_DUE)

        assert repo.put_subscription(corrected) is False
        stored = repo.get_subscription(COURIER)
        assert stored is not None
        assert stored.state == SubscriptionState.PAST_DUE
