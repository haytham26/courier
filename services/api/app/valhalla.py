"""The road geometry (the lead's 2026-11-12 ask, item 2a; ADR-030's engine).

The planner (`app/routing.py`) answers with the ORDER and the TIMES: a
great-circle distance and a road factor, which is what the tests and a CI with
no router can prove end to end. What it cannot answer is the SHAPE of the road
between two stops — the line a map draws, the one that follows the actual
streets rather than the straight line between the doors.

Valhalla is the chosen router (ADR-030: the engine the routing evaluation
measured against PyVRP and OR-Tools, MIT-licensed, and the one whose road
matrix the eval's 560-stop pool was built from). This module is the API's one
call into it, and it keeps three rules the rest of the codebase keeps:

1. **It never fakes geometry.** A call that fails, times out, or answers a
   shape that does not fit the legs it was asked about returns `None` for those
   legs, and the answer says so (`RouteResponse.geometry_engine` is `none`,
   each leg's `shape` is null). A straight line drawn as a road would be a lie
   the founder's couriers would drive by.
2. **It is bounded.** One call per route, with a timeout, and the locations are
   capped at the route's own cap (`routing.MAX_ROUTE_STOPS` + 1) — an
   unbounded request is a free amplifier, the same reasoning as the webhook
   body's cap.
3. **The transport is injectable.** The tests record one, exactly as
   `app/stripe_nz.py` records Stripe's: the shape of the request and the shape
   of the answer are the contract, and a network is not needed to prove them.

The configuration is two environment values and nothing else:
`VALHALLA_BASE_URL` (the service's root) and `VALHALLA_COSTING` (the costing
model, `auto` by default). A deployment with no URL has no geometry engine and
says so, rather than degrading silently.
"""

from __future__ import annotations

import os
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Any

import httpx

#: The transport the client calls out through. Injectable for the tests; the
#: default is a real HTTP POST (through the same httpx the Stripe side uses).
#: It takes the URL, the JSON body and the timeout, and answers the decoded
#: document — or raises, which the client turns into "no geometry".
Transport = Callable[[str, dict[str, Any], float], dict[str, Any]]

#: The one call's timeout. A route read is not a place to wait for a router
#: that is having a bad day: the answer degrades to no-shape and the courier
#: still gets the order and the times.
TIMEOUT_SECONDS = 8.0

#: Valhalla's encoded-polyline precision. 6 is the service's own default and
#: the one the eval's matrix was built with, so the shapes and the matrix agree
#: about what a metre is.
POLYLINE_PRECISION = 6


@dataclass(frozen=True)
class RouteLeg:
    """One leg of the day: the shape of the road between two consecutive stops.

    `distance_m` and `duration_s` come from the planner's own walk — the legs
    carry them so a phone does not have to join two shapes to learn how long
    the hop is. `shape` is Valhalla's encoded polyline (precision 6), or None
    when no geometry engine answered: the caller can tell a real road from an
    absent one without asking.
    """

    from_stop_id: str | None
    to_stop_id: str | None
    distance_m: float
    duration_s: float
    shape: str | None = None


def costing() -> str:
    """The costing model the geometry is asked for (`VALHALLA_COSTING`)."""
    return os.getenv("VALHALLA_COSTING", "auto").strip() or "auto"


def base_url() -> str:
    """The geometry engine's root, or the empty string when there is none."""
    return os.getenv("VALHALLA_BASE_URL", "").strip().rstrip("/")


def engine_name() -> str:
    """What the answer says produced the shapes: the engine, or `none`."""
    configured = base_url()
    return f"valhalla ({configured})" if configured else "none"


def _default_transport(url: str, body: dict[str, Any], timeout: float) -> dict[str, Any]:
    """The real call, through the same httpx the Stripe side uses."""
    response = httpx.post(url, json=body, timeout=timeout)
    response.raise_for_status()
    document: dict[str, Any] = response.json()
    return document


class ValhallaClient:
    """The one caller of the geometry engine.

    `transport` is the seam the tests record; the default is a real POST.
    """

    def __init__(self, transport: Transport | None = None) -> None:
        self._transport = transport or _default_transport

    def shapes(
        self,
        locations: Sequence[tuple[float, float]],
    ) -> list[str | None] | None:
        """The encoded shapes for the legs between `locations`, or None.

        One call, one answer: Valhalla's `/route` returns the whole trip's legs
        in a single response, so a day with twenty stops is one request rather
        than nineteen. The answer is `len(locations) - 1` entries, or None when
        the engine did not answer or answered something that does not fit — a
        shape list that is the wrong length is not a partial answer, it is a
        broken one, and the caller degrades instead of guessing.
        """
        configured = base_url()
        if not configured or len(locations) < 2:
            return None
        body = {
            "locations": [{"lat": lat, "lon": lon} for lat, lon in locations],
            "costing": costing(),
            # The shapes are the point of this call; the distances and times the
            # engine also returns are NOT used (the planner's own walk is the
            # answer for those), so the directions are asked for nothing else.
            "directions_options": {"units": "kilometers", "shape_format": "polyline6"},
        }
        try:
            document = self._transport(f"{configured}/route", body, TIMEOUT_SECONDS)
        except Exception:  # noqa: BLE001 — a router that did not answer is not an error here
            return None
        legs = (document or {}).get("trip", {}).get("legs", [])
        if not isinstance(legs, list) or len(legs) != len(locations) - 1:
            return None
        shapes: list[str | None] = []
        for leg in legs:
            shape = leg.get("shape") if isinstance(leg, dict) else None
            shapes.append(shape if isinstance(shape, str) and shape else None)
        return shapes
