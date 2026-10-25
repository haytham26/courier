"""The intake graph's view of the world: the run's own stops and depot.

The API has no geocoder yet (the address-intelligence slice owns it), so
`geocode` resolves from the stops already stored for the run - the
dispatcher-seeded manifest - and returns None otherwise; the verification
agent then asks the courier, never a guess. `in_territory` is a generous
sanity bound around the depot until the real territory service lands.
"""

from __future__ import annotations

from .. import nz_address
from ..repo import Repo, RunRecord
from ..sequencing import Segment

TERRITORY_DEGREES = 0.25
"""The sanity bound around the depot (~27 km of latitude): a pin further out
is a misread, and the verification agent asks the courier."""


class RepoGeo:
    """The `Geo` protocol of `intake_graph`, backed by the run's own data."""

    def __init__(self, repo: Repo, run: RunRecord) -> None:
        self._repo = repo
        self._run = run

    def geocode(self, address_key: str) -> tuple[float, float] | None:
        """The coordinates of a stop the run already carries, by number+street.

        The key's suburb is dropped for the match: a dispatcher-seeded stop
        may not carry one, and within one run the number+street is the door.
        """
        wanted = address_key.split(",", 1)[0]
        for row in self._repo.get_run_stops(self._run.id):
            if row.lat is None or row.lon is None or not row.address:
                continue
            if nz_address.parse(row.address).address_key.split(",", 1)[0] == wanted:
                return (row.lat, row.lon)
        return None

    def in_territory(self, run_id: str, lat: float, lon: float) -> bool:
        return (
            abs(lat - self._run.depot_lat) <= TERRITORY_DEGREES
            and abs(lon - self._run.depot_lon) <= TERRITORY_DEGREES
        )

    def template(self, run_id: str) -> list[Segment]:
        template = self._repo.get_run_template(self._run.id)
        return list(template.segments) if template is not None else []

    def notes(self, address_key: str) -> list[str]:
        # The door memory (ADR-012) is keyed by location_id and lands with the
        # locations slice; the graph does not read notes yet.
        return []
