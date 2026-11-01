"""The cost guard of the server brain.

D25 and MASTER_EXECUTION section 7 put a ceiling on what the voice may spend:
the free tiers first, the paid fallback with alerts and caps. The guard keeps
the day's spend, in New Zealand dollars, and stops the calls when the cap is
reached, so the service cannot run up a bill nobody watched.

The day is a **New Zealand calendar day** (BUG-155): the budget turns over on
the local midnight, which is the day a courier's shift and a New Zealand
invoice both live on. It is not a rolling 86,400 s window from the first call -
on the 25-hour day (the clocks go back on the first Sunday in April) a rolling
window resets in the middle of the calendar day, and the last hour of that day
starts from a fresh budget.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

#: The zone the budget is accounted in. A New Zealand deployment is billed by
#: the New Zealand day, so that is the day a cap covers.
BUDGET_ZONE = ZoneInfo("Pacific/Auckland")


def _local_date(epoch_seconds: float) -> datetime:
    """The New Zealand wall-clock date of an epoch moment."""
    return datetime.fromtimestamp(epoch_seconds, tz=UTC).astimezone(BUDGET_ZONE)


@dataclass
class CostGuard:
    """The daily spend of the voice service."""

    limit_nzd: float = 20.0
    price_nzd_per_1k_tokens: float = 0.02
    spent_nzd: float = 0.0
    calls: int = 0
    day_started: float = field(default_factory=time.time)

    def reset_for_a_new_day(self, now: float | None = None) -> None:
        """The counters start again when the New Zealand day turns over.

        BUG-155: the reset is a calendar rollover, not an elapsed interval. A
        moment on the same New Zealand date as `day_started` keeps the budget
        it has, however many hours have passed.
        """
        moment = now if now is not None else time.time()
        if _local_date(moment).date() > _local_date(self.day_started).date():
            self.spent_nzd = 0.0
            self.calls = 0
            self.day_started = moment

    @property
    def remaining_nzd(self) -> float:
        """How much of the day's budget is left."""
        return max(self.limit_nzd - self.spent_nzd, 0.0)

    def may_spend(self) -> bool:
        """Whether another call fits in the budget."""
        return self.remaining_nzd > 0

    def cost_of(self, tokens: int) -> float:
        """What a call of so many tokens costs."""
        return round(tokens / 1000 * self.price_nzd_per_1k_tokens, 6)

    def charge(self, tokens: int, cost_nzd: float | None = None) -> float:
        """The cost of a call that has been made, added to the day's spend."""
        self.calls += 1
        cost = self.cost_of(tokens) if cost_nzd is None else cost_nzd
        self.spent_nzd = round(self.spent_nzd + cost, 6)
        return cost
