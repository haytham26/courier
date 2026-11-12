"""The road geometry (the lead's 2026-11-12 ask, item 2a).

The shapes come from Valhalla (ADR-030), and the three rules that keep this
honest are the three the module's docstring states: it never fakes geometry, it
is bounded, and the transport is injectable so the tests record one - the same
pattern `test_stripe_nz.py` uses for Stripe. A network is not needed to prove
the request shape or the answer shape.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.repo import InMemoryRepo, RouteStopRow, RunRecord
from app.valhalla import (
    ValhallaClient,
    base_url,
    costing,
    engine_name,
)
from tests.conftest import COURIER, DEPOT_LAT, DEPOT_LON, make_stop


def recorded(document: dict[str, Any]) -> list[Any]:
    """The transport's calls, so a test can assert on the request it made."""
    return []


def transport_for(document: dict[str, Any], calls: list[Any]) -> ValhallaClient:
    def transport(url: str, body: dict[str, Any], timeout: float) -> dict[str, Any]:
        calls.append({"url": url, "body": body, "timeout": timeout})
        return document

    return ValhallaClient(transport)


def seed_run(repo: InMemoryRepo) -> tuple[Any, Any, list[Any]]:
    """A run with three stops, as the intake slice would leave it.

    The same shape `test_routing.py` seeds (its `seed_run`), kept local here so
    the geometry's tests do not reach into another module's helper.
    """
    run_id = uuid4()
    shift_id = uuid4()
    repo.runs[run_id] = RunRecord(
        id=run_id,
        shift_id=shift_id,
        courier_id=COURIER,
        name="Hornby run",
        depot_lat=DEPOT_LAT,
        depot_lon=DEPOT_LON,
        speed_kmh=30.0,
        start_at=datetime(2026, 10, 21, 8, 0, tzinfo=UTC),
        capacity_parcels=None,
    )
    day = [
        make_stop(lat=-43.5400, lon=172.6000),
        make_stop(lat=-43.5200, lon=172.6400),
        make_stop(lat=-43.5600, lon=172.6200),
    ]
    repo.run_stops[run_id] = [
        RouteStopRow(
            id=stop.id,
            lat=stop.lat,
            lon=stop.lon,
            priority=stop.priority,
            parcels=stop.parcels,
            service_time_s=stop.service_time_s,
            window_start=stop.window.start if stop.window is not None else None,
            window_end=stop.window.end if stop.window is not None else None,
        )
        for stop in day
    ]
    return run_id, shift_id, day


A_ROUTE = {
    "trip": {
        "legs": [
            {"shape": "asaokAum|ehF"},
            {"shape": "asaokAum|ehFasaokAum"},
        ]
    }
}


class TestTheRequest:
    def test_the_call_asks_the_route_endpoint_for_the_polyline(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("VALHALLA_BASE_URL", "https://valhalla.test/")
        monkeypatch.setenv("VALHALLA_COSTING", "bicycle")
        calls: list[Any] = []
        client = transport_for(A_ROUTE, calls)

        shapes = client.shapes([(-43.53, 172.60), (-43.54, 172.61), (-43.55, 172.62)])

        assert shapes == ["asaokAum|ehF", "asaokAum|ehFasaokAum"]
        assert calls[0]["url"] == "https://valhalla.test/route"
        assert calls[0]["body"]["costing"] == "bicycle"
        assert calls[0]["body"]["directions_options"]["shape_format"] == "polyline6"
        assert calls[0]["body"]["locations"] == [
            {"lat": -43.53, "lon": 172.60},
            {"lat": -43.54, "lon": 172.61},
            {"lat": -43.55, "lon": 172.62},
        ]

    def test_one_call_for_the_whole_day(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """A day with twenty stops is one request, not nineteen."""
        monkeypatch.setenv("VALHALLA_BASE_URL", "https://valhalla.test")
        calls: list[Any] = []
        client = transport_for(A_ROUTE, calls)

        client.shapes([(-43.5, 172.6)] * 21)

        assert len(calls) == 1


class TestTheRefusals:
    def test_a_router_that_did_not_answer_is_no_geometry(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """A timeout or a 500 degrades to None: a route read is not the place to
        fail a courier's day, and a missing shape is an absent road, never a
        straight line drawn as one."""

        def broken(url: str, body: dict[str, Any], timeout: float) -> dict[str, Any]:
            raise RuntimeError("the router is having a bad day")

        monkeypatch.setenv("VALHALLA_BASE_URL", "https://valhalla.test")
        assert ValhallaClient(broken).shapes([(-43.53, 172.6), (-43.54, 172.61)]) is None

    def test_an_answer_that_does_not_fit_the_legs_is_refused(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """A shape list of the wrong length is not a partial answer."""
        monkeypatch.setenv("VALHALLA_BASE_URL", "https://valhalla.test")
        calls: list[Any] = []
        client = transport_for({"trip": {"legs": [{"shape": "only-one"}]}}, calls)

        assert client.shapes([(-43.53, 172.6), (-43.54, 172.61), (-43.55, 172.62)]) is None

    def test_no_engine_configured_makes_no_request_at_all(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.delenv("VALHALLA_BASE_URL", raising=False)
        calls: list[Any] = []
        client = transport_for(A_ROUTE, calls)

        assert client.shapes([(-43.53, 172.6), (-43.54, 172.61)]) is None
        assert calls == []

    def test_one_point_is_not_a_leg(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("VALHALLA_BASE_URL", "https://valhalla.test")
        calls: list[Any] = []
        client = transport_for(A_ROUTE, calls)

        assert client.shapes([(-43.53, 172.6)]) is None
        assert calls == []


class TestTheConfiguration:
    def test_the_engine_says_so_when_there_is_none(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """`geometry_engine: none` is how an answer says the shapes are absent."""
        monkeypatch.delenv("VALHALLA_BASE_URL", raising=False)
        assert engine_name() == "none"
        assert base_url() == ""

    def test_the_engine_names_itself_and_its_url(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("VALHALLA_BASE_URL", "https://valhalla.test")
        assert engine_name() == "valhalla (https://valhalla.test)"
        assert costing() == "auto"

    def test_the_costing_is_the_release_lever(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("VALHALLA_BASE_URL", "https://valhalla.test")
        monkeypatch.setenv("VALHALLA_COSTING", "truck")
        assert costing() == "truck"


class TestTheRouteAnswer:
    def test_the_route_carries_the_legs_and_the_engine(
        self, client: TestClient, repo: InMemoryRepo, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """The end-to-end answer the lead's ask is about: the road into each
        stop, with the shapes the engine returned and the times the planner
        produced - and `geometry_engine` naming which of the two it is."""
        monkeypatch.setenv("VALHALLA_BASE_URL", "https://valhalla.test")
        monkeypatch.setattr(
            "app.main._geometry_client",
            lambda: transport_for(
                {
                    "trip": {
                        "legs": [{"shape": "shape-0"}, {"shape": "shape-1"}, {"shape": "shape-2"}]
                    }
                },
                [],
            ),
        )
        run_id, shift_id, day = seed_run(repo)

        body = client.get(f"/shifts/{shift_id}/route").json()

        assert body["geometry_engine"] == "valhalla (https://valhalla.test)"
        shapes = [leg["shape"] for leg in body["legs"]]
        assert "shape-0" in shapes
        # the first leg starts at the depot, which has no stop id
        assert body["legs"][0]["from_stop_id"] is None
        assert body["legs"][0]["to_stop_id"] is not None
        # the times are the planner's own, so they match the stops' answer
        for leg, stop in zip(body["legs"], body["stops"], strict=False):
            assert leg["distance_m"] == stop["distance_m"]

    def test_with_no_engine_the_legs_are_absent_roads(
        self, client: TestClient, repo: InMemoryRepo, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """A local stack and a CI runner both have no router: the legs are there
        with the planner's own numbers and null shapes, and the answer says
        `none` - so nobody mistakes the distance for a road."""
        monkeypatch.delenv("VALHALLA_BASE_URL", raising=False)
        run_id, shift_id, day = seed_run(repo)

        body = client.get(f"/shifts/{shift_id}/route").json()

        assert body["geometry_engine"] == "none"
        assert body["legs"], "the legs are still the day's hops"
        assert all(leg["shape"] is None for leg in body["legs"])
