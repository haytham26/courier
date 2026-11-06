"""Tenant isolation, proved by one sweep (BUG-233, audit 2026-11-05 item 4e).

Research row 63: "the test is the proof, not the review" - every query is
scoped to the owning courier, and THIS file asserts driver A cannot read or
write driver B's data on every owner-scoped route. Existence is never
disclosed cross-courier: a foreign id is a 404, not a 403 (ASVS V4).

The fixtures: `client` is COURIER, `other_client` is OTHER, `anonymous_client`
holds no token. The run/shift below is seeded directly in the repo as
COURIER's, so every `other_client` call below is a cross-tenant attempt.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from urllib.parse import urlsplit

import pytest
from fastapi.testclient import TestClient

from app.repo import InMemoryRepo
from tests.conftest import COURIER
from tests.test_runs_api import png_bytes, seed_run_with_stops

START_AT = datetime(2026, 10, 25, 7, 30, tzinfo=UTC)


def recent_iso(minutes: int = 5) -> str:
    return (datetime.now(UTC) - timedelta(minutes=minutes)).isoformat()


@pytest.fixture()
def owned_run(repo: InMemoryRepo) -> tuple[uuid.UUID, uuid.UUID, uuid.UUID]:
    """COURIER's run with two stops: (run_id, shift_id, first stop_id)."""
    run_id, shift_id = seed_run_with_stops(repo, courier_id=COURIER)
    return run_id, shift_id, repo.run_stops[run_id][0].id


class TestCrossCourierReads:
    """Every read of COURIER's run/shift by OTHER is a 404 or an empty list."""

    def test_the_run_itself_is_not_disclosed(self, client: TestClient, other_client: TestClient, owned_run: tuple) -> None:
        run_id, _, _ = owned_run
        assert client.get(f"/runs/{run_id}").status_code == 200
        foreign = other_client.get(f"/runs/{run_id}")
        assert foreign.status_code == 404

    def test_the_runs_list_holds_only_the_caller_s_own(self, other_client: TestClient, owned_run: tuple) -> None:
        listed = other_client.get("/runs")
        assert listed.status_code == 200
        assert listed.json() == []

    def test_the_shift_route_stops_and_intake_are_not_disclosed(self, other_client: TestClient, owned_run: tuple) -> None:
        _, shift_id, _ = owned_run
        assert other_client.get(f"/shifts/{shift_id}/route").status_code == 404
        assert other_client.get(f"/shifts/{shift_id}/stops").status_code == 404
        assert other_client.post(f"/shifts/{shift_id}/intake", json={"text": "9 Nowhere Road"}).status_code == 404

    def test_the_pod_endpoints_are_not_disclosed(self, other_client: TestClient, owned_run: tuple) -> None:
        run_id, _, stop_id = owned_run
        event_id = uuid.uuid4()
        # A grant-less call is 404 (the grant check runs before the row check);
        # with a bogus grant it is still 404 - existence is not disclosed.
        assert (
            other_client.get(
                f"/runs/{run_id}/pod/{event_id}/bytes",
                params={"expires": 9999999999, "signature": "0" * 64},
            ).status_code
            == 404
        )
        assert other_client.get(f"/runs/{run_id}/stops/{stop_id}/pod/{event_id}/url").status_code == 404


class TestCrossCourierWrites:
    """Every write against COURIER's run/shift by OTHER is refused (404)."""

    def test_pod_upload_reopt_template_batch_import_manifest(self, other_client: TestClient, owned_run: tuple) -> None:
        run_id, shift_id, stop_id = owned_run
        pod = other_client.post(
            f"/runs/{run_id}/stops/{stop_id}/pod",
            files={"image": ("door.jpg", png_bytes(), "image/png")},
            data={"occurred_at": recent_iso()},
        )
        assert pod.status_code == 404
        reopt = other_client.post(f"/runs/{run_id}/route:reopt", json={"affected_stop_ids": [str(stop_id)]})
        assert reopt.status_code == 404
        template = other_client.put(
            f"/runs/{run_id}/template",
            json={"template_id": "foreign-1", "segments": [], "stop_order": [str(stop_id)]},
        )
        assert template.status_code == 404
        batch = other_client.post(
            f"/shifts/{shift_id}/events:batch",
            json=[{"id": str(uuid.uuid4()), "stop_id": str(stop_id), "kind": "delivered", "occurred_at": recent_iso()}],
        )
        assert batch.status_code == 404
        imported = other_client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.csv", b"address\n1 Elsewhere Ave\n", "text/csv")},
        )
        assert imported.status_code == 404
        manifest = other_client.post(
            f"/shifts/{shift_id}/intake/manifest",
            files={"image": ("m.jpg", png_bytes(), "image/png")},
        )
        assert manifest.status_code == 404

    def test_the_writes_did_not_land(self, other_client: TestClient, client: TestClient, repo: InMemoryRepo, owned_run: tuple) -> None:
        run_id, shift_id, stop_id = owned_run
        other_client.post(
            f"/shifts/{shift_id}/events:batch",
            json=[{"id": str(uuid.uuid4()), "stop_id": str(stop_id), "kind": "delivered", "occurred_at": recent_iso()}],
        )
        stops = client.get(f"/shifts/{shift_id}/stops")
        assert [stop["status"] for stop in stops.json()] == ["pending", "pending"]
        assert repo.get_run_template(run_id) is None


class TestPodBytesStayWithTheOwner:
    """A POD COURIER uploaded: OTHER can neither read the bytes nor mint a URL."""

    def test_foreign_read_of_the_bytes_and_url_is_404(
        self,
        client: TestClient,
        other_client: TestClient,
        repo: InMemoryRepo,
        owned_run: tuple,
        *,
        tmp_path: object,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        run_id, _, stop_id = owned_run
        monkeypatch.setenv("POD_STORAGE_DIR", str(tmp_path))
        uploaded = client.post(
            f"/runs/{run_id}/stops/{stop_id}/pod",
            files={"image": ("door.jpg", png_bytes(), "image/png")},
            data={"occurred_at": recent_iso()},
        )
        assert uploaded.status_code == 201, uploaded.text
        event_id = uploaded.json()["event_id"]

        # The owner mints a streaming grant through the presign endpoint; the
        # bytes route itself requires the grant's query params (a bare GET is
        # a 422, not a grant-less 404).
        grant = client.get(f"/runs/{run_id}/stops/{stop_id}/pod/{event_id}/url")
        assert grant.status_code == 200, grant.text
        query = urlsplit(grant.json()["url"]).query

        mine = client.get(f"/runs/{run_id}/pod/{event_id}/bytes?{query}")
        assert mine.status_code == 200
        assert mine.content == png_bytes()

        # ADR-011 §2: the bytes route's authority IS the HMAC grant (the
        # phone's image loader sends no bearer), so a valid grant serves the
        # bytes to whoever holds the URL - but the rows are still checked and
        # the grant is minted only for the owner: OTHER cannot presign, and a
        # bogus or foreign grant serves nothing.
        assert other_client.get(f"/runs/{run_id}/stops/{stop_id}/pod/{event_id}/url").status_code == 404
        bogus = other_client.get(
            f"/runs/{run_id}/pod/{event_id}/bytes",
            params={"expires": 9999999999, "signature": "0" * 64},
        )
        assert bogus.status_code == 404
        foreign_event = other_client.get(
            f"/runs/{run_id}/pod/{uuid.uuid4()}/bytes",
            params={"expires": 9999999999, "signature": "0" * 64},
        )
        assert foreign_event.status_code == 404


class TestLocationNotesStayWithTheOwner:
    """ADR-012: the door memory is private to the courier who had the stop."""

    def test_a_location_the_foreign_courier_never_stopped_at_is_404(
        self, client: TestClient, other_client: TestClient, repo: InMemoryRepo, owned_run: tuple
    ) -> None:
        run_id, _, _ = owned_run
        location_id = repo.run_stops[run_id][0].location_id
        assert location_id is not None
        note = client.post(
            f"/locations/{location_id}/notes",
            json={"kind": "gate_code", "body": "1234"},
        )
        assert note.status_code == 201, note.text

        foreign_get = other_client.get(f"/locations/{location_id}/notes")
        assert foreign_get.status_code == 404
        foreign_put = other_client.post(
            f"/locations/{location_id}/notes", json={"kind": "gate_code", "body": "9999"}
        )
        assert foreign_put.status_code == 404

        mine = client.get(f"/locations/{location_id}/notes")
        assert mine.status_code == 200
        assert "1234" in mine.text
        assert "9999" not in mine.text


class TestEntitlementsArePerCourier:
    def test_each_courier_sees_only_their_own_record(self, client: TestClient, other_client: TestClient, repo: InMemoryRepo) -> None:
        mine = client.get("/account/entitlements")
        theirs = other_client.get("/account/entitlements")
        assert mine.status_code == 200
        assert theirs.status_code == 200
        assert COURIER not in theirs.text


class TestAnonymousGetsNothing:
    """No token: 401 on every protected route, before any scoping matters."""

    def test_the_protected_routes_all_answer_401(self, anonymous_client: TestClient, owned_run: tuple) -> None:
        run_id, shift_id, stop_id = owned_run
        event_id = uuid.uuid4()
        gets = [f"/runs/{run_id}", "/runs", f"/shifts/{shift_id}/stops"]
        posts = [
            (f"/shifts/{shift_id}/intake", {"text": "x"}),
            (f"/shifts/{shift_id}/events:batch", []),
        ]
        for path in gets:
            answer = anonymous_client.get(path)
            assert answer.status_code == 401, f"GET {path} -> {answer.status_code}"
        for path, body in posts:
            answer = anonymous_client.post(path, json=body)
            assert answer.status_code == 401, f"POST {path} -> {answer.status_code}"

        # The one grant-authenticated route (ADR-011 §2 - the image loader
        # sends no bearer): anonymous gets a 404 on a bogus grant, never the
        # bytes and never a 401-shaped leak.
        grantless = anonymous_client.get(
            f"/runs/{run_id}/pod/{event_id}/bytes",
            params={"expires": 9999999999, "signature": "0" * 64},
        )
        assert grantless.status_code == 404
