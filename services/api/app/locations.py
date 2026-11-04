"""The stable address identity behind the location notes (ADR-012 §1).

The door memory must attach to the same door across days and stops. This
module derives that identity from the canonical address text — deterministic,
no proximity, no nearest-neighbour — until the LINZ address ids land (the
address-intelligence slice), when a matched address uses its LINZ id and the
derived id stays the fallback for manual pins.
"""

from __future__ import annotations

import re
import uuid

LOCATION_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "courier-copilot/location")
"""The uuid5 namespace of every derived location id."""

_PUNCTUATION = re.compile(r"[^a-z0-9]+")


def canonical_address(address: str, suburb: str | None) -> str:
    """The address key the location id is derived from.

    Lower-case, punctuation collapsed to single spaces, whitespace collapsed;
    `address|suburb` when a suburb is present. Two spellings that differ only
    in case, commas or spacing are the same door.
    """

    def clean(text: str) -> str:
        return " ".join(_PUNCTUATION.sub(" ", text.lower()).split())

    street = clean(address)
    if not street:
        # Every empty pin would otherwise share one derived id (the review):
        # a location cannot be derived from nothing.
        raise ValueError("the address text is empty: a location id cannot be derived")
    area = clean(suburb or "")
    return f"{street}|{area}" if area else street


def location_id_for(address: str, suburb: str | None) -> uuid.UUID:
    """The stable id of the door at `address` (ADR-012 §1)."""
    return uuid.uuid5(LOCATION_NAMESPACE, canonical_address(address, suburb))


def location_id_for_stop(
    stop_id: uuid.UUID, address: str | None, suburb: str | None
) -> uuid.UUID:
    """The location id of one stop row, without a raise for an empty address.

    A row the schema seeds carries both a `location_id` and an address, and the
    two callers of this function (`main.py`'s stops route and the in-memory
    repo's `courier_location_key`) reach for the derived id only as the
    fallback for a row that does not. When that fallback is asked of an address
    with no text, the derivation has nothing to derive from: the stop still
    needs one stable id for the phone's notes endpoint, and the only stable
    identity such a row carries is its own id.

    BUG-118: the route called `location_id_for` unguarded, so a stop with an
    empty (or NULL) address turned the whole stop list into a 500. This is the
    same derivation, guarded, and it is the one place both callers share.
    """
    text = (address or "").strip()
    if not text:
        return uuid.uuid5(LOCATION_NAMESPACE, f"stop/{stop_id}")
    return location_id_for(text, suburb)
