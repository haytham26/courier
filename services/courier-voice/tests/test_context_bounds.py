"""How much run one turn may hold (BUG-150).

The context is the only large thing the service keeps, and it is the caller's:
one turn with 100,000 stops used to be stored in full and held until the client
deleted the session, which it may never do. The collections are bounded here,
and the bound is the day a courier actually works - not the memory of the
machine.
"""

from __future__ import annotations

import anyio
import httpx
import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError

from app.auth import Principal, get_principal
from app.main import create_app
from app.models import MAX_LEARNED_ENTRIES, MAX_STOPS_IN_A_CONTEXT, LearnedRuns, RunContext, Stop
from app.run_client import RunClient


def _a_client() -> httpx.Client:
    """A client that cannot leave the process."""

    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("no call to the API is expected in this test")

    return httpx.Client(transport=httpx.MockTransport(handler))


def _a_principal() -> Principal:
    """The courier behind the request."""
    return Principal(user_id="driver-1", claims={"sub": "driver-1"}, token="test-token")


def a_service() -> object:
    """The service, with no API to reach and a real store behind it."""
    service = create_app(run_client=RunClient("http://127.0.0.1:9", client=_a_client()))
    service.dependency_overrides[get_principal] = _a_principal
    return service


def a_stop(index: int) -> dict[str, object]:
    """One stop, as a turn carries it."""
    return {"id": f"stop-{index}", "number": str(index), "street": "Riccarton Road"}


def test_the_day_has_a_ceiling_on_its_stops():
    """A courier's day is not 100,000 stops: the contract says how many."""
    assert MAX_STOPS_IN_A_CONTEXT == 500


def test_a_turn_with_more_stops_than_the_day_holds_is_refused():
    """The bound is enforced on the request, not after it is stored."""
    with pytest.raises(ValidationError) as refused:
        RunContext(stops=tuple(Stop(**a_stop(index)) for index in range(MAX_STOPS_IN_A_CONTEXT + 1)))

    assert "stops" in str(refused.value)
    assert str(MAX_STOPS_IN_A_CONTEXT) in str(refused.value)


def test_the_ceiling_is_not_reached_by_a_real_day():
    """The bound is above any day we serve, so no courier meets it."""
    context = RunContext(stops=tuple(Stop(**a_stop(index)) for index in range(MAX_STOPS_IN_A_CONTEXT)))

    assert len(context.stops) == MAX_STOPS_IN_A_CONTEXT
    assert context.left_count == MAX_STOPS_IN_A_CONTEXT


def test_the_learned_runs_are_bounded_too():
    """What the phone learned is a door note per stop, not a dictionary of the city."""
    with pytest.raises(ValidationError) as refused:
        LearnedRuns(
            usual_order=tuple(f"stop-{index}" for index in range(MAX_LEARNED_ENTRIES + 1)),
        )

    assert "usual_order" in str(refused.value)

    with pytest.raises(ValidationError):
        LearnedRuns(door_notes={f"stop-{index}": "the gate sticks" for index in range(MAX_LEARNED_ENTRIES + 1)})

    with pytest.raises(ValidationError):
        LearnedRuns(service_times_s={f"stop-{index}": 90 for index in range(MAX_LEARNED_ENTRIES + 1)})


def test_a_turn_cannot_grow_the_retained_context_past_the_ceiling():
    """The bound holds on the HTTP surface, where the caller reaches it."""
    service = a_service()

    async def the_call() -> int:
        async with AsyncClient(
            transport=ASGITransport(app=service), base_url="http://voice"
        ) as http:
            opened = await http.post(
                "/v1/sessions",
                json={
                    "context": {
                        "stops": [a_stop(index) for index in range(MAX_STOPS_IN_A_CONTEXT + 1)]
                    }
                },
            )
            return opened.status_code

    assert anyio.run(the_call) == 422


def test_a_day_the_courier_really_works_is_kept_in_full():
    """The whole point of the bound: it does not cost a courier his run."""
    service = a_service()

    async def the_call() -> int:
        async with AsyncClient(
            transport=ASGITransport(app=service), base_url="http://voice"
        ) as http:
            opened = await http.post(
                "/v1/sessions",
                json={"context": {"stops": [a_stop(index) for index in range(120)]}},
            )
            if opened.status_code != 200:
                return opened.status_code
            session_id = str(opened.json()["id"])
            read = await http.get(f"/v1/sessions/{session_id}")
            return int(read.json()["turns"])

    assert anyio.run(the_call) == 0
