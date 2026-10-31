"""The vacuous-green guard of the SLO profile: what "the run greets nothing" means.

The guard used to fail a run that produced fewer than 100 requests in its 60 s
window. That count is a property of the runner, not of the test: on 2026-10-31
the same healthy profile landed 99, 76 and 70 requests on three runs of one
head - the guard failed all three, in runs where every request succeeded, no
SLO was breached and every surface was exercised - while five other runs of the
same profile landed 141-197, and a slow local machine lands 31. A threshold
inside the healthy band is a coin flip, and the luck of a green is not evidence.

`run_is_vacuous` (in `loadtests/vacuous_guard.py`) now measures the property the
old floor proxied for: every surface of the day loop touched, a run claimed
with a 201 (identity, seeded day and API proven together), and a request floor
as a backstop. These cases pin each clause; the first run against the unfixed
tree fails with `ModuleNotFoundError: loadtests.vacuous_guard` - the module did
not exist.

The guard lives in its own module because importing locust monkey-patches ssl,
which turns a pytest session that already imported ssl into a RecursionError.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "loadtests"))

from vacuous_guard import VACUOUS_SURFACES, run_is_vacuous

HEALTHY = {"/runs": 20, "/stops": 60, "/events:batch": 30}


class TestTheVacuousGuard:
    def test_a_healthy_run_is_not_vacuous(self) -> None:
        assert run_is_vacuous(dict(HEALTHY), claimed=8, total=110) is False

    def test_a_dead_api_makes_no_surface_and_is_vacuous(self) -> None:
        assert run_is_vacuous({}, claimed=0, total=0) is True

    def test_a_path_mismatch_leaves_surfaces_missing_and_is_vacuous(self) -> None:
        # Only the stops list answers; the run was never claimed.
        assert run_is_vacuous({"/stops": 40}, claimed=0, total=40) is True

    def test_an_unseeded_day_is_vacuous_even_though_requests_flowed(self) -> None:
        # The shift's foreign key refuses every claim: 409s, never a 201.
        assert run_is_vacuous(dict(HEALTHY), claimed=0, total=110) is True

    def test_a_missing_identity_is_vacuous(self) -> None:
        # No token: the on_start guard stops every user before a request.
        assert run_is_vacuous({}, claimed=0, total=0) is True

    def test_a_partially_answering_api_is_vacuous_below_the_floor(self) -> None:
        # Every surface touched and a claim made, but almost nothing: the
        # backstop floor exists for this.
        assert (
            run_is_vacuous({"/runs": 1, "/stops": 1, "/events:batch": 1}, claimed=1, total=3)
            is True
        )

    def test_a_slow_but_healthy_run_is_not_vacuous(self) -> None:
        # The 2026-10-31 shape: the slowest healthy observation (31 requests on
        # a deliberately slow machine) must pass - it measured the SLOs.
        assert run_is_vacuous(dict(HEALTHY), claimed=6, total=31) is False

    def test_the_guard_watches_every_surface_of_the_day_loop(self) -> None:
        assert VACUOUS_SURFACES == ("/runs", "/stops", "/events:batch")
