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
    area = clean(suburb or "")
    return f"{street}|{area}" if area else street


def location_id_for(address: str, suburb: str | None) -> uuid.UUID:
    """The stable id of the door at `address` (ADR-012 §1)."""
    return uuid.uuid5(LOCATION_NAMESPACE, canonical_address(address, suburb))
