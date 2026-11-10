"""D44's cost guard (COST_PLAN's الميزانيات): the budget before the paid call,
the recorded spend, and the answer to "what is left?".

The rule the plan states, in one line: a virtual key per courier with a daily
and a monthly max_budget, a budget per tenant and a global cap - and on reaching
the limit the budget falls back to the cheaper cascade and then to the local
path with a spoken warning, never cutting a courier off mid-shift. The tests
pin each half: the arithmetic and the refusal (a spent budget blocks the call
and names WHICH budget), the estimation (from characters, stated as an estimate
everywhere), the recording (one event per spend, and the four windows read back
from it), and the endpoint (the caller's own remaining budget, unbounded
windows answered as null rather than a fake infinity).
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from app.cost_guard import (
    CostGuardSettings,
    Spend,
    day_start,
    estimate_usd,
    month_start,
    remaining,
    tokens_of,
    verdict_for,
)


def settings(**kwargs: object) -> CostGuardSettings:
    return CostGuardSettings(**kwargs)


class TestTheVerdict:
    """What blocks a call, and what does not."""

    def test_no_budget_configured_is_unbounded_not_zero(self) -> None:
        verdict = verdict_for(Spend(courier_daily=99.0), 0.5, settings())

        assert verdict.allowed
        assert verdict.blocked is False

    def test_a_call_over_the_couriers_daily_budget_is_refused_with_the_window(self) -> None:
        verdict = verdict_for(Spend(courier_daily=0.95), 0.10, settings(courier_daily_usd=1.0))

        assert verdict.allowed is False
        assert "courier's daily" in verdict.reason
        assert "local path" in verdict.reason

    def test_the_exact_remaining_budget_is_allowed(self) -> None:
        # The boundary: a call that uses exactly what is left is allowed (the
        # guard blocks a call that would CROSS the limit, not one that meets it).
        verdict = verdict_for(Spend(courier_daily=0.9), 0.10, settings(courier_daily_usd=1.0))

        assert verdict.allowed

    def test_a_call_that_would_cross_by_a_hair_is_refused(self) -> None:
        verdict = verdict_for(Spend(courier_daily=0.9), 0.100001, settings(courier_daily_usd=1.0))

        assert verdict.allowed is False

    def test_the_monthly_budget_blocks_independently_of_the_daily(self) -> None:
        verdict = verdict_for(
            Spend(courier_daily=0.0, courier_monthly=29.0), 2.0, settings(courier_monthly_usd=30.0)
        )

        assert verdict.allowed is False
        assert "monthly" in verdict.reason

    def test_the_tenants_budget_blocks_the_courier(self) -> None:
        verdict = verdict_for(Spend(tenant_daily=49.0), 2.0, settings(tenant_daily_usd=50.0))

        assert verdict.allowed is False
        assert "tenant" in verdict.reason

    def test_the_global_cap_blocks_everyone(self) -> None:
        verdict = verdict_for(Spend(global_daily=499.0), 2.0, settings(global_daily_usd=500.0))

        assert verdict.allowed is False
        assert "deployment" in verdict.reason

    def test_a_free_call_is_never_the_budgets_business(self) -> None:
        verdict = verdict_for(Spend(courier_daily=99.0), 0.0, settings(courier_daily_usd=1.0))

        assert verdict.allowed


class TestTheEstimate:
    """The estimate is from characters, and states that it is an estimate."""

    def test_the_estimate_scales_with_the_price_per_million(self) -> None:
        cheap = estimate_usd(40_000, 0, settings(input_price_per_mtoken=1.0))
        dearer = estimate_usd(40_000, 0, settings(input_price_per_mtoken=2.0))

        # 40,000 characters is ~10,000 tokens; at $1/MTok that is $0.01.
        assert cheap == pytest.approx(0.01)
        assert dearer == pytest.approx(0.02)

    def test_the_output_prices_separately(self) -> None:
        call = estimate_usd(0, 40_000, settings(output_price_per_mtoken=2.0))

        assert call == pytest.approx(0.02)

    def test_the_token_count_is_an_approximation_and_says_so(self) -> None:
        assert tokens_of(4) == 1
        assert tokens_of(5) == 2  # ceil, never an under-estimate


class TestTheRemainingAnswer:
    """The budget screen: what is left, unbounded as null."""

    def test_an_unbounded_window_answers_null_not_infinity(self) -> None:
        left = remaining(Spend(), settings())

        assert left["courier_daily_usd"] is None
        assert left["global_daily_usd"] is None

    def test_a_spent_budget_answers_its_remainder_and_never_negative(self) -> None:
        left = remaining(Spend(courier_daily=1.4), settings(courier_daily_usd=1.0))

        assert left["courier_daily_usd"] == 0.0
        assert left["spent"]["courier_daily_usd"] == 1.4

    def test_the_remainder_never_goes_negative(self) -> None:
        left = remaining(Spend(courier_daily=3.0), settings(courier_daily_usd=1.0))

        assert left["courier_daily_usd"] >= 0


class TestTheWindows:
    """The windows' edges are UTC, and a naive instant is read as UTC."""

    def test_the_day_starts_at_utc_midnight(self) -> None:
        start = day_start(datetime(2026, 11, 10, 22, 30, tzinfo=UTC))

        assert start == datetime(2026, 11, 10, 0, 0, tzinfo=UTC)

    def test_the_month_starts_at_the_first(self) -> None:
        start = month_start(datetime(2026, 11, 10, 22, 30, tzinfo=UTC))

        assert start == datetime(2026, 11, 1, 0, 0, tzinfo=UTC)

    def test_a_naive_instant_is_read_as_utc(self) -> None:
        start = day_start(datetime(2026, 11, 10, 22, 30))

        assert start == datetime(2026, 11, 10, 0, 0, tzinfo=UTC)
