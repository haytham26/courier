"""The Courier API's run, as the voice reads it (BUG-147, BUG-148, BUG-160).

The run is the only part of a turn that is not the courier's own words, and it
crosses two service boundaries: the voice service's URL and the API's answer
shape. Both are pinned here, because both were wrong in the audit:

- BUG-147: the caller's `shift_id` reached the run client's URL unvalidated, so
  a value with dot segments made the service issue a request to another of the
  API's own paths with the driver's own token;
- BUG-148: a refusal from the API came back as "no stops", and the caller's own
  snapshot of the run was then read instead;
- BUG-160: the client parsed the phone's row shape and not the API's, so every
  stop the API answered with arrived with an empty address.
"""

from __future__ import annotations

import anyio
import httpx
from httpx import ASGITransport, AsyncClient, MockTransport, Response

from app.auth import Principal, get_principal
from app.main import create_app
from app.run_client import RunClient, RunForbiddenError, checked_shift_id, shift_stops_url

DRIVER = "driver-1"
A_SHIFT = "8b1f6f2e-0000-4000-8000-00000000dead"


def a_principal() -> Principal:
    """The courier behind the request."""
    return Principal(user_id=DRIVER, claims={"sub": DRIVER}, token="test-token")


def a_server(answer: Response) -> httpx.Client:
    """An API that answers the same thing every time, in process."""
    return httpx.Client(transport=MockTransport(lambda request: answer))


def a_service(answer: Response) -> object:
    """The voice service, against an API that answers as told."""
    service = create_app(run_client=RunClient("http://api.test", client=a_server(answer)))
    service.dependency_overrides[get_principal] = a_principal
    return service


async def posted(service, body: dict[str, object]) -> Response:
    """One call to the service, in process."""
    async with AsyncClient(
        transport=ASGITransport(app=service), base_url="http://voice"
    ) as http:
        return await http.post("/v1/sessions", json=body)


async def turned(service, session_id: str, body: dict[str, object]) -> Response:
    """One turn of a shift, in process."""
    async with AsyncClient(
        transport=ASGITransport(app=service), base_url="http://voice"
    ) as http:
        return await http.post(f"/v1/sessions/{session_id}/turn", json=body)


# --- BUG-147: the shift id is one segment of the API's path ---------------


def test_a_shift_id_that_is_not_a_path_segment_is_refused_by_name():
    """A caller who names his own shift cannot name the API's route (BUG-147)."""
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> Response:
        seen.append(request)
        return Response(200, json=[])

    client = RunClient("http://api.test", client=a_server_of(handler))

    try:
        client.stops("../../../v1/admin", "token-1")
    except ValueError as exc:
        assert "path segment" in str(exc)
    else:  # pragma: no cover - the test fails if nothing is raised
        raise AssertionError("the request was not refused")
    finally:
        assert seen == [], "the request left the service"


def a_server_of(handler) -> httpx.Client:
    """An API that records what it was actually asked for."""
    return httpx.Client(transport=MockTransport(handler))


def test_the_url_keeps_a_hostile_value_inside_one_segment():
    """A value that skipped the boundary is still asked for as one segment."""
    url = shift_stops_url("http://api.test", "..%2F..%2Fv1%2Fadmin")

    assert url == "http://api.test/shifts/..%252F..%252Fv1%252Fadmin/stops"
    assert url.count("/shifts/") == 1
    assert "/v1/admin" not in url


def test_the_path_the_api_sees_carries_the_value_as_one_segment():
    """A shift the courier named is asked for as that shift's own stops."""
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> Response:
        seen.append(request)
        return Response(200, json=[])

    client = RunClient("http://api.test", client=a_server_of(handler))
    client.stops(A_SHIFT, "token-1")

    assert len(seen) == 1
    assert seen[0].url.raw_path.decode("ascii") == f"/shifts/{A_SHIFT}/stops"


def test_a_hostile_shift_id_is_refused_at_the_boundary():
    """A value the API's own route parameter would refuse is refused here."""
    response = anyio.run(posted, a_service(Response(200, json=[])), {"shift_id": "../../../v1/admin"})
    assert response.status_code == 422


def test_the_check_names_the_value_it_refused():
    """The refusal says what was wrong with it, so the caller can fix it."""
    try:
        checked_shift_id("not a segment")
    except ValueError as exc:
        assert "not a segment" in str(exc)
    else:  # pragma: no cover - the test fails if nothing is raised
        raise AssertionError("the value was accepted")


# --- BUG-148: a refusal is not "no stops" ---------------------------------


def test_a_refusal_is_distinguishable_from_no_stops():
    """403 asks the run client to say so, not to answer an empty list."""
    client = RunClient("http://api.test", client=a_server(Response(403, json={"detail": "no"})))

    try:
        client.stops(A_SHIFT, "token-1")
    except RunForbiddenError as refused:
        assert "403" in str(refused)
    else:  # pragma: no cover - the test fails if nothing is raised
        raise AssertionError("the refusal was answered as no stops")


def test_a_dead_spot_is_still_no_stops_and_not_a_refusal():
    """The offline design keeps its shape: unreachable is not refused."""
    client = RunClient("http://api.test", client=a_server(Response(404, json={})))

    assert client.stops(A_SHIFT, "token-1") == []


def test_a_session_cannot_name_a_shift_and_carry_its_own_snapshot():
    """The boundary where a caller could put a run in the API's place."""
    response = anyio.run(
        posted,
        a_service(Response(200, json=[])),
        {
            "shift_id": A_SHIFT,
            "context": {"stops": [{"id": "s1", "number": "3"}]},
        },
    )
    assert response.status_code == 422


def test_a_turn_cannot_carry_a_snapshot_of_a_named_shift():
    """The same rule, on the turn a caller could send it with instead."""
    service = a_service(Response(200, json=[]))

    async def the_call() -> int:
        opened = await posted(service, {"shift_id": A_SHIFT})
        session_id = str(opened.json()["id"])
        response = await turned(
            service,
            session_id,
            {"transcript": "how many left?", "context": {"stops": [{"id": "s1"}]}},
        )
        return response.status_code

    assert anyio.run(the_call) == 422


def test_a_refused_shift_is_never_answered_from_the_callers_snapshot():
    """The turn fails; no run of the caller's is read in the API's place."""
    service = a_service(Response(403))

    async def the_call() -> tuple[int, dict[str, object]]:
        opened = await posted(service, {"shift_id": A_SHIFT})
        session_id = str(opened.json()["id"])
        response = await turned(service, session_id, {"transcript": "how many left?"})
        return response.status_code, response.json()

    status, body = anyio.run(the_call)
    assert status == 403
    assert body.get("speech") in (None, "")


def test_the_phone_snapshot_still_answers_when_no_shift_is_named():
    """The offline design stands: the phone's own run, unnamed, is its own."""
    service = a_service(Response(403))

    async def the_call() -> dict[str, object]:
        opened = await posted(service, {"context": {"stops": [{"id": "s1", "number": "3"}]}})
        session_id = str(opened.json()["id"])
        response = await turned(
            service, session_id, {"transcript": "how many left?", "mode": "offline"}
        )
        body: dict[str, object] = response.json()
        return body

    assert anyio.run(the_call)["speech"] == "1 stops left."


# --- BUG-160: the API's row shape is the one the client reads -------------


def test_the_apis_own_stop_shape_is_read():
    """`seq` and `address` are the fields the API answers with (BUG-160)."""
    rows = [
        {
            "id": "9d3c1f0e-0000-4000-8000-000000000001",
            "address": "12 Riccarton Road, Riccarton",
            "seq": 1,
            "status": "pending",
            "location_id": "9d3c1f0e-0000-4000-8000-0000000000aa",
        }
    ]
    client = RunClient("http://api.test", client=a_server(Response(200, json=rows)))

    stops = client.stops(A_SHIFT, "token-1")

    assert len(stops) == 1
    assert stops[0].sequence == 1
    assert stops[0].number == "12"
    assert stops[0].street == "Riccarton Road"
    assert stops[0].suburb == "Riccarton"
    assert stops[0].spoken_address == "12 Riccarton Road"


def test_a_unit_address_is_split_before_the_suburb():
    """`2/14 Harewood Road, Harewood` says the unit and the number."""
    rows = [{"id": "s1", "address": "2/14 Harewood Road, Harewood", "seq": 1}]
    client = RunClient("http://api.test", client=a_server(Response(200, json=rows)))

    stops = client.stops(A_SHIFT, "token-1")

    assert stops[0].number == "2/14"
    assert stops[0].street == "Harewood Road"
    assert stops[0].suburb == "Harewood"


def test_the_phones_own_row_shape_still_reads():
    """The snapshot the phone keeps is the same data, so it is still read."""
    rows = [
        {
            "id": "s1",
            "sequence": 2,
            "number": "8",
            "street": "Smith Street",
            "suburb": "Papanui",
            "status": "delivered",
        }
    ]
    client = RunClient("http://api.test", client=a_server(Response(200, json=rows)))

    stops = client.stops(A_SHIFT, "token-1")

    assert stops[0].spoken_address == "8 Smith Street"
    assert stops[0].status.value == "delivered"


def test_a_row_with_no_address_and_no_fields_is_not_a_stop():
    """The API's row is read as it comes; nothing is invented for it."""
    rows = [{"id": "s1", "seq": 1}]
    client = RunClient("http://api.test", client=a_server(Response(200, json=rows)))

    stops = client.stops(A_SHIFT, "token-1")

    assert stops[0].number == ""
    assert stops[0].street == ""
