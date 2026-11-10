"""The cost guard's storage half and its endpoint (COST_PLAN's الميزانيات).

The decider is `test_cost_guard.py`'s; these tests pin the halves that make it
a guard rather than an arithmetic module: the ledger (one row per call, read
back as the four windows), the endpoint (the caller's own remaining budget, an
unbounded window answered as null), and the wiring (a paid call is refused when
the budget is spent - with the reason naming WHICH budget - and the estimate
recorded after).
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.cost_guard import BudgetSpentError, day_start, estimate_usd, verdict_for
from app.main import app
from app.repo import CostEventRow, InMemoryRepo, get_repo
from tests.test_cost_guard import settings as guard_settings

COURIER = "driver-9"
# The token the suite's client fixture carries names ITS courier: the guard and
# the endpoint scope by the caller, so the ledger rows the endpoint reads back
# belong to that courier, not to a literal written here.
TOKEN_COURIER = __import__("tests.conftest", fromlist=["COURIER"]).COURIER


@pytest.fixture(autouse=True)
def _no_cache_leak():
    from app.billing import billing_sources, webhook_secret
    from app.main import cost_settings

    yield
    billing_sources.cache_clear()
    webhook_secret.cache_clear()
    cost_settings.cache_clear()


@pytest.fixture
def repo() -> InMemoryRepo:
    return InMemoryRepo()


@pytest.fixture
def web_client(client: TestClient) -> Iterator[TestClient]:
    """The authenticated client from the suite's own fixture (its bearer token
    names the courier the guard scopes by)."""
    repo = app.dependency_overrides.get(get_repo)
    if repo is None:
        repo = InMemoryRepo()
        app.dependency_overrides[get_repo] = lambda: repo
    yield client


def a_spend(usd: float, *, courier_id: str = COURIER, tenant_id: str | None = None) -> CostEventRow:
    return CostEventRow(
        courier_id=courier_id, usd_estimate=usd, chars_in=100, chars_out=40, tenant_id=tenant_id
    )


class TestTheLedger:
    """One row per call, and the four windows read back from it."""

    def test_nothing_spent_is_zero(self, repo: InMemoryRepo) -> None:
        assert repo.cost_spend_since(day_start()) == 0.0

    def test_a_spend_inside_the_window_is_summed(self, repo: InMemoryRepo) -> None:
        repo.record_cost_event(a_spend(0.50))

        assert repo.cost_spend_since(day_start(), courier_id=COURIER) == 0.50

    def test_a_spend_before_the_window_is_not(self, repo: InMemoryRepo) -> None:
        repo.record_cost_event(
            CostEventRow(
                courier_id=COURIER,
                usd_estimate=0.50,
                created_at=datetime.now(UTC) - timedelta(days=2),
            )
        )

        assert repo.cost_spend_since(day_start(), courier_id=COURIER) == 0.0

    def test_the_windows_scope_by_courier(self, repo: InMemoryRepo) -> None:
        repo.record_cost_event(a_spend(0.50))
        repo.record_cost_event(a_spend(0.70, courier_id="driver-other"))

        assert repo.cost_spend_since(day_start(), courier_id=COURIER) == 0.50

    def test_the_tenants_window_sums_only_the_scoped_rows(self, repo: InMemoryRepo) -> None:
        repo.record_cost_event(a_spend(0.50, tenant_id="team-a"))
        repo.record_cost_event(a_spend(0.70, courier_id="driver-other", tenant_id="team-b"))

        assert repo.cost_spend_since(day_start(), tenant_id="team-a") == 0.50

    def test_a_replay_is_a_second_row_not_an_overwrite(self, repo: InMemoryRepo) -> None:
        repo.record_cost_event(a_spend(0.50))
        repo.record_cost_event(a_spend(0.50))

        assert len(repo.cost_events) == 2
        assert repo.cost_spend_since(day_start(), courier_id=COURIER) == 1.0


class TestTheEndpoint:
    """GET /account/cost: the caller's own remaining, unbounded as null."""

    def test_a_deployment_with_no_budget_is_unbounded_and_says_so(
        self, web_client: TestClient, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("app.main.cost_settings", guard_settings)

        allowed = web_client.get("/account/cost")

        assert allowed.status_code == 200, allowed.text
        body = allowed.json()
        assert body["courier_daily_usd"] is None
        assert body["global_daily_usd"] is None

    def test_the_remaining_never_goes_negative(
        self, web_client: TestClient, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("app.main.cost_settings", lambda: guard_settings(courier_daily_usd=0.10))
        repo = app.dependency_overrides[get_repo]()
        repo.record_cost_event(a_spend(0.40, courier_id=TOKEN_COURIER))

        left = web_client.get("/account/cost").json()

        assert left["courier_daily_usd"] == 0.0
        assert left["spent"]["courier_daily_usd"] == 0.40

    def test_a_courier_sees_their_own_spend_not_anothers(
        self, web_client: TestClient, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("app.main.cost_settings", lambda: guard_settings(courier_daily_usd=1.0))
        repo = app.dependency_overrides[get_repo]()
        repo.record_cost_event(a_spend(0.30, courier_id="driver-someone-else"))

        left = web_client.get("/account/cost").json()

        # the courier on the token is the fixture's own; another courier's spend
        # is not theirs
        assert left["spent"]["courier_daily_usd"] == 0.0


class TestTheWiring:
    """A paid call is refused when the budget is spent - with the window named."""

    def test_a_spent_budget_blocks_the_call(self) -> None:
        verdict = verdict_for(
            __import__("app.cost_guard", fromlist=["Spend"]).Spend(courier_daily=0.99),
            0.50,
            guard_settings(courier_daily_usd=1.0),
        )

        assert verdict.blocked
        error = BudgetSpentError(verdict)
        assert "courier's daily" in str(error)

    def test_the_estimate_is_from_characters_and_says_so(self) -> None:
        # 400 characters in, 40 out at $1/MTok in and $2 out: ~0.00012.
        cost = estimate_usd(400, 40, guard_settings(input_price_per_mtoken=1.0, output_price_per_mtoken=2.0))

        assert cost == pytest.approx(0.00012)
        assert 0 < cost < 0.01
