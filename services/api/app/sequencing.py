"""Master Template Lock: order today's stops by the driver's fixed street flow,
not by a TSP solver. Unknown streets are slotted next to their nearest templated neighbour."""

from __future__ import annotations

import math
from dataclasses import dataclass, field


@dataclass
class Segment:
    street_key: str
    direction: str = "asc"  # asc | desc | odd_first | even_first | zigzag


@dataclass
class Stop:
    location_id: str
    street_key: str
    number: int
    lat: float
    lon: float
    priority: bool = False
    meta: dict = field(default_factory=dict)


def _haversine(a: Stop, b: Stop) -> float:
    r = 6_371_000
    p1, p2 = math.radians(a.lat), math.radians(b.lat)
    dp, dl = p2 - p1, math.radians(b.lon - a.lon)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def _order_on_street(stops: list[Stop], direction: str) -> list[Stop]:
    asc = sorted(stops, key=lambda s: s.number)
    if direction == "desc":
        return asc[::-1]
    if direction in ("odd_first", "even_first"):
        first = 1 if direction == "odd_first" else 0
        a = [s for s in asc if s.number % 2 == first]
        b = [s for s in asc if s.number % 2 != first]
        return a + b[::-1]  # up one side, back down the other
    return asc  # asc and zigzag (zigzag = walk both sides in number order)


def sequence(stops: list[Stop], template: list[Segment]) -> list[Stop]:
    rank = {seg.street_key: i for i, seg in enumerate(template)}
    direction = {seg.street_key: seg.direction for seg in template}
    by_street: dict[str, list[Stop]] = {}
    for s in stops:
        by_street.setdefault(s.street_key, []).append(s)

    known = [k for k in by_street if k in rank]
    # Off-template streets inherit the rank of the nearest templated stop (+0.5 => right after it).
    templated_stops = [s for k in known for s in by_street[k]]
    eff_rank: dict[str, float] = {k: rank[k] for k in known}
    for k in by_street:
        if k in rank:
            continue
        probe = by_street[k][0]
        nearest = min(templated_stops, key=lambda t: _haversine(probe, t), default=None)
        eff_rank[k] = (rank[nearest.street_key] + 0.5) if nearest else len(template)

    ordered: list[Stop] = []
    for k in sorted(by_street, key=lambda k: eff_rank[k]):
        ordered += _order_on_street(by_street[k], direction.get(k, "asc"))
    # Priority stops jump the queue but keep their relative order.
    return [s for s in ordered if s.priority] + [s for s in ordered if not s.priority]


VAN_ZONES = ["REAR", "MID_RACK", "FL", "FR"]  # nearest-the-door first


def assign_van_zones(ordered: list[Stop], sizes: dict[str, str | None]) -> dict[str, str]:
    """Load in reverse delivery order: first stops near the door (REAR), late stops forward.
    Heavy/large items go to HEAVY_BASE regardless, so they never sit on top of satchels."""
    n = len(ordered)
    zones: dict[str, str] = {}
    for i, s in enumerate(ordered):
        if sizes.get(s.location_id) in ("heavy", "large"):
            zones[s.location_id] = "HEAVY_BASE"
        else:
            zones[s.location_id] = VAN_ZONES[
                min(i * len(VAN_ZONES) // max(n, 1), len(VAN_ZONES) - 1)
            ]
    return zones
