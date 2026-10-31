"""The day budget: the SLO profile's request count is a property of the test.

The vacuous-green guard of the CI profile fails a run below 100 requests. The
count used to come from a 60 s wall-clock window, so it depended on the runner:
on 2026-10-31 the same healthy profile landed 99 and 70 requests on two runs
(the guard failed both) while five other runs landed 141 to 197. The budget
removes the clock from the count: each user runs a fixed number of task
executions, whatever the machine's speed.

These cases pin the parse (the module carries no locust import, so the default
suite runs them without the `load` extra). The first run against the unfixed
tree failed with `ModuleNotFoundError: loadtests.day_budget` — the module did
not exist — which is the red this suite guards.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "loadtests"))

from day_budget import UNCAPPED, iteration_budget


class TestTheIterationBudget:
    def test_an_unset_variable_is_uncapped(self) -> None:
        assert iteration_budget({}) == UNCAPPED

    def test_an_empty_variable_is_uncapped(self) -> None:
        assert iteration_budget({"LOADTEST_ITERATIONS": "  "}) == UNCAPPED

    def test_a_positive_number_is_the_budget(self) -> None:
        assert iteration_budget({"LOADTEST_ITERATIONS": "8"}) == 8

    def test_zero_stays_uncapped_rather_than_stopping_every_user(self) -> None:
        # The staging profile sets nothing: an explicit zero must not read as
        # "stop after the first task".
        assert iteration_budget({"LOADTEST_ITERATIONS": "0"}) == UNCAPPED

    def test_an_unparseable_value_is_uncapped_not_a_crash(self) -> None:
        # A typo in the gate must not kill a staging run at spawn time; it
        # fails at the vacuous floor instead, loudly.
        assert iteration_budget({"LOADTEST_ITERATIONS": "eight"}) == UNCAPPED

    def test_a_negative_value_is_uncapped(self) -> None:
        assert iteration_budget({"LOADTEST_ITERATIONS": "-3"}) == UNCAPPED
