"""The cost guard of the server brain.

D25 and MASTER_EXECUTION section 7 put a ceiling on what the voice may spend:
the free tiers first, the paid fallback with alerts and caps. The guard keeps
the day's spend, in New Zealand dollars, and stops the calls when the cap is
reached, so the service cannot run up a bill nobody watched.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field


@dataclass
class CostGuard:
    """The daily spend of the voice service."""

    limit_nzd: float = 20.0
    price_nzd_per_1k_tokens: float = 0.02
    spent_nzd: float = 0.0
    calls: int = 0
    day_started: float = field(default_factory=time.time)

    def reset_for_a_new_day(self, now: float | None = None) -> None:
        """The counters start again when the day turns over."""
        moment = now if now is not None else time.time()
        if moment - self.day_started >= 86_400:
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
