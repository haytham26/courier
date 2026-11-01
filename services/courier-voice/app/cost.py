"""The cost guard of the server brain.

D25 and MASTER_EXECUTION section 7 put a ceiling on what the voice may spend:
the free tiers first, the paid fallback with alerts and caps. The guard keeps
the day's spend, in New Zealand dollars, and stops the calls when the cap is
reached, so the service cannot run up a bill nobody watched.

Two defects were fixed on the check-then-call shape the guard was written
with, because the turn handlers are sync `def` and FastAPI runs them in a
thread pool:

- **BUG-152:** `may_spend()` ran, then the blocking HTTP POST to the gateway
  happened, then `charge()` ran - nothing reserved the cost in between, so
  concurrent turns all passed the check and overspent the cap. The register's
  probe: 16 turns against a cap of 3 calls, all 16 let through, 5.3x the cap.
  The reserve now happens inside the lock, before the call.
- **BUG-153:** `may_spend()` checked only that some budget remained, never the
  cost of the pending call, so one call could exceed the entire daily cap
  (with a 0.01 limit, a 0.02 call was charged in full). The check now compares
  the pending call's worst case against what is left.
"""

from __future__ import annotations

import threading
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

    #: The most tokens one call may be charged for. Both the reserve (BUG-152)
    #: and the per-call bound (BUG-153) need a number before the gateway's
    #: answer arrives, so the worst case is stated rather than guessed.
    max_tokens_per_call: int = 8_000

    def __post_init__(self) -> None:
        self._lock = threading.Lock()
        #: The reserves outstanding: `may_spend` takes one, `charge` settles
        #: one. A charge that never had a reserve (a test, a direct caller) is
        #: simply added, so the old shape still works.
        self._reserved = 0

    def reset_for_a_new_day(self, now: float | None = None) -> None:
        """The counters start again when the day turns over."""
        moment = now if now is not None else time.time()
        with self._lock:
            if moment - self.day_started >= 86_400:
                self.spent_nzd = 0.0
                self.calls = 0
                self.day_started = moment

    @property
    def remaining_nzd(self) -> float:
        """How much of the day's budget is left."""
        return max(self.limit_nzd - self.spent_nzd, 0.0)

    @property
    def worst_case_nzd(self) -> float:
        """What one more call could cost at most."""
        return self.cost_of(self.max_tokens_per_call)

    def may_spend(self, tokens: int | None = None) -> bool:
        """Whether one more call fits in the budget, reserving its worst case.

        The check and the reserve are one operation under the lock (BUG-152):
        the moment a call is allowed, its worst case is already counted, so a
        concurrent turn sees a budget this call has consumed. The per-call
        bound (BUG-153) compares the pending call's own cost against what is
        left rather than only asking whether anything is left.

        A refused call reserves nothing: the caller pays for the call it did
        not make only if it went through.
        """
        wanted = tokens if tokens is not None else self.max_tokens_per_call
        with self._lock:
            if self.remaining_nzd < self.cost_of(wanted):
                return False
            self.spent_nzd = round(self.spent_nzd + self.worst_case_nzd, 6)
            self._reserved += 1
            return True

    def cost_of(self, tokens: int) -> float:
        """What a call of so many tokens costs."""
        return round(tokens / 1000 * self.price_nzd_per_1k_tokens, 6)

    def charge(self, tokens: int, cost_nzd: float | None = None) -> float:
        """The cost of a call that was made, settled against its reserve.

        The reserve `may_spend` took is given back and the real cost is charged
        in its place, so the day's spend never exceeds the worst cases plus the
        truth.
        """
        with self._lock:
            self.calls += 1
            cost = self.cost_of(tokens) if cost_nzd is None else cost_nzd
            if self._reserved > 0:
                # The worst case comes back and the real cost takes its place.
                self._reserved -= 1
                self.spent_nzd = round(self.spent_nzd - self.worst_case_nzd + cost, 6)
            else:
                # No reserve was ever taken: the cost is simply added, the shape
                # every existing caller (and the suite) has always had.
                self.spent_nzd = round(self.spent_nzd + cost, 6)
            if self.spent_nzd < 0:
                self.spent_nzd = 0.0
            return cost
