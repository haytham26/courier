"""The cost guard (COST_PLAN's `الميزانيات`): the API's own budget accounting
before a paid LLM call is made, and the answer to "may this courier spend?".

COST_PLAN's rule, in one line: **a virtual key per courier with a daily and a
monthly max_budget, a budget per tenant, and a global cap with an alert - and
on reaching the limit the budget falls back to a cheaper cascade and then to
the offline path with a spoken warning, never cutting a courier off
mid-shift.** The entitlement layer's `past_due`/`grace` rule and this one are
the same shape: a payment problem is never a reason to strand a courier.

What this module does NOT do: it does not decide WHICH cheaper model to try (the
cascade is the gateway's job, OmniRoute, and the app's `Ordinal`-free scoring
already prefers the local parser). What it does: estimate the cost of the call
about to be made, refuse it when the budget is spent (a `BudgetSpent` the caller
turns into a 4xx and into the offline path), and record what was spent so the
next call knows.

The estimate is from the CHARACTERS of the request and the answer at ~4
characters per token - the common approximation, stated so nobody reads it as
an invoice. The exact usage is the gateway's; this is the budget basis.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Final

from pydantic_settings import BaseSettings, SettingsConfigDict

#: The characters-per-token the estimate uses (the common approximation).
CHARS_PER_TOKEN: Final = 4.0

#: The budget windows the plan names.
DAILY = "daily"
MONTHLY = "monthly"


class CostGuardSettings(BaseSettings):
    """The founder's budget switches, read from the environment.

    A budget that is not set is not zero - it is UNBOUNDED, and the guard says
    so rather than pretending a deployment has no ceiling. A founder who sets
    one has a guard; a founder who has not, has one less thing to be surprised
    by."""

    model_config = SettingsConfigDict(env_prefix="COST_", extra="ignore")

    courier_daily_usd: float | None = None
    courier_monthly_usd: float | None = None
    tenant_daily_usd: float | None = None
    global_daily_usd: float | None = None

    # The gateway's price, per million tokens, for the estimate. A model switch
    # moves these two numbers, not the arithmetic.
    input_price_per_mtoken: float = 0.15
    output_price_per_mtoken: float = 0.60


@dataclass(frozen=True)
class Spend:
    """What a courier, a tenant and the deployment have already spent today and this month."""

    courier_daily: float = 0.0
    courier_monthly: float = 0.0
    tenant_daily: float = 0.0
    global_daily: float = 0.0


@dataclass(frozen=True)
class Verdict:
    """Whether a call may be made, and what is left after it."""

    allowed: bool
    reason: str = ""

    @property
    def blocked(self) -> bool:
        return not self.allowed


class BudgetSpentError(Exception):
    """Raised (by `guarded_call`) when the budget is spent; the caller turns it
    into a 4xx and into the offline path, never a 500 the gateway retries."""

    def __init__(self, verdict: Verdict) -> None:
        super().__init__(verdict.reason)
        self.verdict = verdict


def estimate_usd(input_chars: int, output_chars: int, settings: CostGuardSettings) -> float:
    """The estimated cost of one call, from its characters.

    Stated as an estimate everywhere it is used: it is the budget basis, and the
    gateway's own usage is the invoice."""
    input_tokens = max(0, input_chars) / CHARS_PER_TOKEN
    output_tokens = max(0, output_chars) / CHARS_PER_TOKEN
    return (
        input_tokens * settings.input_price_per_mtoken
        + output_tokens * settings.output_price_per_mtoken
    ) / 1_000_000


def verdict_for(
    spend: Spend, about_to_spend: float, settings: CostGuardSettings
) -> Verdict:
    """Is `about_to_spend` allowed, given what is already spent?

    The windows are checked in the order the plan names - the courier's own
    daily and monthly budgets, then the tenant's, then the global cap - and the
    first one the call would cross is the reason. An unlimited window never
    blocks (`None` means unbounded, not zero)."""
    if about_to_spend <= 0:
        # A call we can price at nothing (a cached answer, a local model) is
        # never the thing the budget is about.
        return Verdict(True)
    windows: tuple[tuple[str, float, float | None], ...] = (
        ("the courier's daily budget", spend.courier_daily, settings.courier_daily_usd),
        ("the courier's monthly budget", spend.courier_monthly, settings.courier_monthly_usd),
        ("the tenant's daily budget", spend.tenant_daily, settings.tenant_daily_usd),
        ("the deployment's daily cap", spend.global_daily, settings.global_daily_usd),
    )
    for label, spent, limit in windows:
        if limit is None:
            continue
        if spent + about_to_spend > limit:
            return Verdict(
                False,
                f"{label} is spent (${spent:.4f} of ${limit:.4f} used; this call would "
                f"add ${about_to_spend:.4f}): the local path answers instead (COST_PLAN)",
            )
    return Verdict(True)


def remaining(spend: Spend, settings: CostGuardSettings) -> dict[str, Any]:
    """What is left, per window, for the budget screen (the app shows it).

    An unbounded window answers `null`, not a fake infinity: the app shows "no
    limit" rather than a number the deployment never set."""
    windows: tuple[tuple[str, float, float | None], ...] = (
        ("courier_daily_usd", spend.courier_daily, settings.courier_daily_usd),
        ("courier_monthly_usd", spend.courier_monthly, settings.courier_monthly_usd),
        ("tenant_daily_usd", spend.tenant_daily, settings.tenant_daily_usd),
        ("global_daily_usd", spend.global_daily, settings.global_daily_usd),
    )
    out: dict[str, Any] = {}
    for name, spent, limit in windows:
        out[name] = None if limit is None else round(max(0.0, limit - spent), 6)
    out["spent"] = {
        "courier_daily_usd": round(spend.courier_daily, 6),
        "courier_monthly_usd": round(spend.courier_monthly, 6),
        "tenant_daily_usd": round(spend.tenant_daily, 6),
        "global_daily_usd": round(spend.global_daily, 6),
    }
    return out


def day_start(now: datetime | None = None) -> datetime:
    """The UTC midnight this day's window started at."""
    moment = now or datetime.now(UTC)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=UTC)
    return moment.replace(hour=0, minute=0, second=0, microsecond=0)


def month_start(now: datetime | None = None) -> datetime:
    """The UTC first-of-the-month this month's window started at."""
    moment = now or datetime.now(UTC)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=UTC)
    return moment.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def window_starts(now: datetime | None = None) -> dict[str, datetime]:
    """The four windows' start instants, as the recorder's keys."""
    return {DAILY: day_start(now), MONTHLY: month_start(now)}


def tokens_of(chars: int) -> int:
    """The token estimate for a character count (the approximation, stated)."""
    return int(math.ceil(max(0, chars) / CHARS_PER_TOKEN))
