"""The cost guard and the client of the Courier API.

The guard keeps the day's spend in New Zealand dollars and stops the calls
when the cap is reached. The client reads the day from the API with the
courier's own token and never keeps a list of stops of its own.
"""

from __future__ import annotations

import httpx
import pytest

from app.cost import CostGuard
from app.models import RunContext, Stop
from app.run_client import RunClient


def test_the_guard_starts_empty():
    guard = CostGuard(limit_nzd=20.0, price_nzd_per_1k_tokens=0.02)
    assert guard.spent_nzd == 0.0
    assert guard.remaining_nzd == 20.0
    assert guard.may_spend() is True


def test_the_cost_of_a_call_is_the_price_of_its_tokens():
    guard = CostGuard(limit_nzd=20.0, price_nzd_per_1k_tokens=0.02)
    assert guard.cost_of(1000) == pytest.approx(0.02)
    assert guard.cost_of(120) == pytest.approx(0.0024)


def test_the_guard_counts_the_calls():
    guard = CostGuard(limit_nzd=20.0, price_nzd_per_1k_tokens=0.02)
    guard.charge(1000)
    guard.charge(1000)
    assert guard.calls == 2
    assert guard.spent_nzd == pytest.approx(0.04)
    assert guard.remaining_nzd == pytest.approx(19.96)


def test_the_guard_stops_the_calls_at_the_cap():
    guard = CostGuard(limit_nzd=0.01, price_nzd_per_1k_tokens=0.02)
    guard.charge(1000)
    assert guard.may_spend() is False


def test_the_guard_starts_again_on_a_new_day():
    guard = CostGuard(limit_nzd=20.0, price_nzd_per_1k_tokens=0.02)
    guard.charge(1000)
    guard.reset_for_a_new_day(now=guard.day_started + 86_401)
    assert guard.spent_nzd == 0.0
    assert guard.calls == 0


def the_stops() -> list[dict[str, object]]:
    """The stops the API answers with."""
    return [
        {
            "id": "s1",
            "sequence": 1,
            "number": "7",
            "street": "Cranmer Street",
            "suburb": "Addington",
            "status": "pending",
            "size_class": "small",
            "van_zone": "mid-rack",
        }
    ]


def test_the_client_reads_the_stops_with_the_token_of_the_courier():
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json=the_stops())

    client = RunClient("http://api.test", client=httpx.Client(transport=httpx.MockTransport(handler)))
    stops = client.stops("shift-1", "token-1")

    assert len(stops) == 1
    assert stops[0].spoken_address == "7 Cranmer Street"
    assert seen[0].headers["Authorization"] == "Bearer token-1"


def test_the_client_survives_an_api_that_is_not_there():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("the api is down")

    client = RunClient("http://api.test", client=httpx.Client(transport=httpx.MockTransport(handler)))
    assert client.stops("shift-1", "token-1") == []


def test_the_client_survives_an_answer_that_is_not_a_run():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="<html>the proxy says hello</html>")

    client = RunClient("http://api.test", client=httpx.Client(transport=httpx.MockTransport(handler)))
    assert client.stops("shift-1", "token-1") == []


def test_the_phone_context_is_used_when_the_api_has_nothing():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={})

    client = RunClient("http://api.test", client=httpx.Client(transport=httpx.MockTransport(handler)))
    fallback = RunContext(stops=(Stop(id="s9", number="3", street="Kowhai Street"),))
    context = client.context("shift-1", "token-1", fallback=fallback)
    assert context.stops[0].spoken_address == "3 Kowhai Street"
    assert context.shift_id == "shift-1"
