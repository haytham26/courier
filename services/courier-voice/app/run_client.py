"""The run, as the Courier API has it.

The questions the courier asks are about their own day, so the day comes from
the Courier API and is fetched with the courier's own token: the service never
holds a list of stops of its own and never shows a courier another courier's
run.

The API is the source of truth and the phone's own snapshot is the fallback,
for the sessions the phone owns (no named shift): when the API cannot be
reached the snapshot keeps the voice working in a dead spot. A refusal is not
"cannot be reached" (BUG-148): when the API answers about the shift and says
the courier may not see it, that answer is carried to the caller and no
snapshot is read in its place. A session that NAMES a shift never carries a
snapshot (the boundary refuses one), so a named shift in a dead spot is an
empty run rather than a fabricated one - the register's own trade for
BUG-148, pinned by the tests.
"""

from __future__ import annotations

import logging
import re
from urllib.parse import quote

import httpx

from .models import RunContext, Stop, StopStatus

logger = logging.getLogger("courier_voice.run_client")


class RunForbiddenError(Exception):
    """The API answered about this shift and refused it.

    The answer is not "no stops": the courier who asked does not hold the
    token that may see this run, and a turn about it is refused rather than
    answered from data the caller supplied (BUG-148).
    """


#: A shift id is one path segment of the API's own route. Its route parameter
#: is a `uuid.UUID`, so this is the same shape the API itself demands: letters,
#: digits and a hyphen. It is checked here because the value reaches another
#: service's URL (BUG-147).
SHIFT_ID = r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$"

#: The refusals the API's own 404 discipline gives for a run that is not the
#: caller's: an unauthenticated or unauthorised token.
_REFUSALS = (401, 403)


def _text_of(value: object) -> str | None:
    """A display field as text, or None when the row carries junk there."""
    if isinstance(value, str) and value.strip():
        return value
    return None


def _segment(value: object) -> str:
    """The shift id as one quoted path segment.

    The quoting is the invariant: whatever this is given, the API is asked for
    one segment and not for a path of the caller's choosing (BUG-147).
    """
    if not isinstance(value, str):
        raise TypeError("a shift id is one path segment of text")
    return quote(value, safe="")


def checked_shift_id(value: str) -> str:
    """The shift id as the API's own route parameter accepts it.

    The API's `GET /shifts/{shift_id}` takes a `uuid.UUID`; this is the same
    shape (letters, digits and a hyphen), checked at the boundary a caller
    reaches so the refusal names the field rather than dying inside a URL
    (BUG-147).
    """
    if not re.fullmatch(SHIFT_ID, value):
        raise ValueError(
            f"a shift id is one path segment (letters, digits and a hyphen), not {value!r}"
        )
    return value


def _address_parts(address: str) -> tuple[str, str, str]:
    """`number street, suburb` as the three fields the voice speaks.

    The API answers a stop's `address` as one line ("12 Riccarton Road,
    Riccarton"); the voice says the number and the street on their own. The
    first token is the number and the comma starts the suburb, which is how
    the API's own rows are written (BUG-160).
    """
    text = address.strip()
    if not text:
        return "", "", ""
    street_and_suburb = text.split(",", 1)
    street = street_and_suburb[0].strip()
    suburb = street_and_suburb[1].strip() if len(street_and_suburb) > 1 else ""
    number, _, road = street.partition(" ")
    if not road:
        # "12" alone on a line: the number is all there is.
        return number, "", suburb
    return number, road, suburb


def shift_stops_url(base_url: str, shift_id: str) -> str:
    """The URL of one shift's stops, with the id kept inside one segment.

    The id is quoted, so a value that reaches this function from anywhere but
    the boundary check still cannot put another path in front of the API
    (BUG-147): `..%2Fv1%2Fadmin` is asked for as the encoded segment it is.
    """
    return f"{base_url.rstrip('/')}/shifts/{_segment(shift_id)}/stops"


class RunClient:
    """Reads the day from the Courier API."""

    def __init__(
        self,
        base_url: str,
        timeout_seconds: float = 8.0,
        client: httpx.Client | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._client = client or httpx.Client(timeout=timeout_seconds)

    def _headers(self, token: str) -> dict[str, str]:
        """The headers of a call to the API: the courier's own token."""
        return {"Authorization": f"Bearer {token}"}

    def stops(self, shift_id: str, token: str) -> list[Stop]:
        """The stops of the shift, or an empty list when the API has none.

        Raises:
            RunForbiddenError: when the API answers that this courier may not see
                this shift. A refusal is not "no stops" (BUG-148).
        """
        try:
            url = shift_stops_url(self._base_url, checked_shift_id(shift_id))
        except ValueError as exc:
            raise ValueError(f"the shift id will not reach the API: {exc}") from exc
        try:
            response = self._client.get(url, headers=self._headers(token))
        except httpx.HTTPError as exc:
            logger.info("the run cannot be read from the API: %s", type(exc).__name__)
            return []
        if response.status_code in _REFUSALS:
            raise RunForbiddenError(f"the API refused this shift ({response.status_code})")
        if response.status_code >= 400:
            logger.info("the API could not answer about the run: %s", response.status_code)
            return []
        try:
            document = response.json()
        except ValueError:
            logger.info("the API did not answer with a run")
            return []
        if not isinstance(document, list):
            return []
        return [stop for stop in (self._stop_of(row) for row in document) if stop is not None]

    def _stop_of(self, row: object) -> Stop | None:
        """One stop of the API, or None when the row is not one."""
        if not isinstance(row, dict):
            return None
        identifier = row.get("id") or row.get("stop_id")
        if not isinstance(identifier, str):
            return None
        try:
            # The API answers `seq`; the phone's own snapshot says
            # `sequence`. Both are the day's order (BUG-160).
            sequence = int(row.get("seq") or row.get("sequence") or 0)
        except (TypeError, ValueError):
            return None
        status = row.get("status")
        # The API answers `address`; the phone's own snapshot says the three
        # fields on their own (BUG-160).
        address = _text_of(row.get("address")) or ""
        number = _text_of(row.get("number")) or ""
        street = _text_of(row.get("street")) or ""
        suburb = _text_of(row.get("suburb")) or ""
        if address and not (number or street):
            number, street, found = _address_parts(address)
            suburb = suburb or found
        return Stop(
            id=identifier,
            sequence=sequence,
            number=number,
            street=street,
            suburb=suburb,
            status=StopStatus(str(status)) if status in set(StopStatus) else StopStatus.PENDING,
            van_zone=_text_of(row.get("van_zone")),
            size_class=_text_of(row.get("size_class")),
            tip=_text_of(row.get("tip")),
            hazard=_text_of(row.get("hazard")),
            parcel_for=_text_of(row.get("parcel_for")),
        )

    def context(self, shift_id: str, token: str, fallback: RunContext | None = None) -> RunContext:
        """The run of the shift.

        The API has the day. When it cannot be reached the phone's own
        snapshot is used, so the voice keeps working in a dead spot. When the
        API refuses the shift there is no snapshot to fall back to: the
        refusal travels to the caller instead (BUG-148).
        """
        stops = self.stops(shift_id, token)
        if not stops:
            if fallback is None:
                return RunContext(shift_id=shift_id)
            return fallback.model_copy(update={"shift_id": shift_id})
        base = fallback if fallback is not None else RunContext()
        return base.model_copy(update={"shift_id": shift_id, "stops": tuple(stops)})
