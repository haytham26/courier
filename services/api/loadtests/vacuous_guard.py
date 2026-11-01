"""The vacuous-green guard of the SLO profile, as a pure function.

The guard used to fail a run that produced fewer than 100 requests in its 60 s
window. That count is a property of the runner, not of the test: on 2026-10-31
the same healthy profile landed 99, 76 and 70 requests on three runs of one
head - the guard failed all three, in runs where every request succeeded, no
SLO was breached and every surface was exercised - while five other runs of the
same profile landed 141-197, and a slow local machine lands 31. A threshold
inside the healthy band is a coin flip, and the luck of a green is not evidence.

`run_is_vacuous` measures the property the old floor proxied for: every surface
of the day loop touched, a run claimed with a 201 (the identity, the seeded day
and the API proven together), and a request floor as a backstop against a
half-answering API.

This module carries no locust import - locust monkey-patches ssl when it is
imported, which turns a pytest session that already imported ssl into a
RecursionError, so the default API suite tests the guard from here rather than
from the profile (where the `load` extra lives).
"""

from __future__ import annotations

from typing import Any

#: The surfaces of the day loop a run that greets nothing never touches.
VACUOUS_SURFACES = ("/runs", "/stops", "/events:batch")

#: A backstop only: the surfaces and the claim are the teeth. The measured
#: distribution on 2026-10-31 is 0-13 requests for a run that greets nothing
#: and 31-197 for a healthy one, so the floor sits well below the healthiest
#: slow machine and above every vacuous observation.
MIN_REQUESTS = 10


def run_is_vacuous(surfaces: dict[str, int], claimed: int, total: int) -> bool:
    """True when the run measured nothing, whatever the runner's speed.

    Args:
        surfaces: how many requests each surface of `VACUOUS_SURFACES` made.
        claimed: how many `POST /runs` answered 201.
        total: the run's request count, the backstop's input.

    A slow-but-healthy run measures the SLOs on the samples it got and is not
    vacuous; a run that greets nothing fails however fast the machine was.
    """
    if any(surfaces.get(name, 0) < 1 for name in VACUOUS_SURFACES):
        return True
    if claimed < 1:
        return True
    return total < MIN_REQUESTS


def missing_surfaces(surfaces: dict[str, Any]) -> list[str]:
    """The surfaces the run never touched, for the failure line's evidence."""
    return [name for name in VACUOUS_SURFACES if (surfaces.get(name) or 0) < 1]
