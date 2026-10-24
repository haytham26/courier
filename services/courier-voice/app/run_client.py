"""The run, as the Courier API has it.

The questions the courier asks are about their own day, so the day comes from
the Courier API and is fetched with the courier's own token: the service never
holds a list of stops of its own and never shows a courier another courier's
run.

The API is the source of truth and the phone is the fallback: when the API
cannot be reached the phone's own snapshot of the run is used, so a dead spot
in rural Canterbury does not take the voice away.
"""

from __future__ import annotations

import logging

import httpx

from .models import RunContext, Stop, StopStatus

logger = logging.getLogger("courier_voice.run_client")


def _text_of(value: object) -> str | None:
    """A display field as text, or None when the row carries junk there."""
    if isinstance(value, str) and value.strip():
        return value
    return None


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
        """The stops of the shift, or an empty list when the API has none."""
        url = f"{self._base_url}/shifts/{shift_id}/stops"
        try:
            response = self._client.get(url, headers=self._headers(token))
        except httpx.HTTPError as exc:
            logger.info("the run cannot be read from the API: %s", type(exc).__name__)
            return []
        if response.status_code >= 400:
            logger.info("the API refused the run: %s", response.status_code)
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
            sequence = int(row.get("sequence") or 0)
        except (TypeError, ValueError):
            return None
        status = row.get("status")
        return Stop(
            id=identifier,
            sequence=sequence,
            number=str(row.get("number") or ""),
            street=str(row.get("street") or ""),
            suburb=str(row.get("suburb") or ""),
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
        snapshot is used, so the voice keeps working in a dead spot.
        """
        stops = self.stops(shift_id, token)
        if not stops:
            if fallback is None:
                return RunContext(shift_id=shift_id)
            return fallback.model_copy(update={"shift_id": shift_id})
        base = fallback if fallback is not None else RunContext()
        return base.model_copy(update={"shift_id": shift_id, "stops": tuple(stops)})
