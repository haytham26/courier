"""One courier's day is a bounded number of task executions, not a wall-clock guess.

The CI gate of the SLO profile used to count the requests a fixed 60 s window
produced and fail a "vacuous" run below a floor of 100. The count was a property
of the runner, not of the test: on 2026-10-31 two runs of the same head landed
99 and 70 requests (both healthy — 0 failed requests, no SLO breach, every
surface exercised) while five other runs of the same profile landed 141 to 197,
and a deliberately slow machine lands under 100. A threshold inside the healthy
band is a coin flip, and a green that luck produces is not evidence.

The budget makes the count a property of the test: each spawned user runs its
day-loop a fixed number of task executions and then stops, so the request count
is (users x iterations) whatever the machine's speed. The long staging run
leaves the budget uncapped (the default) and keeps the day shape: 1,000 drivers
for 15 minutes, not 8 tasks each.

This module carries no locust import so the default API suite can test it (the
`load` extra is not installed there).
"""

from __future__ import annotations

import os

#: The default: uncapped, the staging shape. The CI profile sets its own number.
UNCAPPED = 0


def iteration_budget(env: dict[str, str] | None = None) -> int:
    """How many task executions one user runs before its day ends (0 = uncapped).

    An unset, empty or unparseable value is `UNCAPPED` rather than an error: a
    misconfigured gate must not stop a staging run at spawn time — it fails
    loudly at the vacuous floor instead, which is the check that exists.
    """
    source = os.environ if env is None else env
    raw = source.get("LOADTEST_ITERATIONS", "").strip()
    if not raw:
        return UNCAPPED
    try:
        value = int(raw)
    except ValueError:
        return UNCAPPED
    return value if value > 0 else UNCAPPED
