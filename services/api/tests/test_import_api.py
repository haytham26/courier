"""The spreadsheet import endpoint (D52's server half, ADR-025).

`POST /shifts/{shift_id}/import` takes a .csv or .xlsx of stops and lands it
all-or-nothing: the whole file is validated first, so a bad row stores
nothing. The stops arrive unlocated (no geocoder yet) and the stops list
answers them with their type, priority and parcels.
"""

from __future__ import annotations

import io
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.auth.jwks import get_verifier
from app.main import app
from app.repo import InMemoryRepo, RunRecord, get_repo
from tests.auth.test_jwks import make_key_pair, make_verifier, sign

COURIER = "driver-7"
OTHER = "driver-8"
START_AT = datetime(2026, 10, 25, 7, 30, tzinfo=UTC)


@pytest.fixture()
def repo() -> InMemoryRepo:
    return InMemoryRepo()


@pytest.fixture()
def verifier_key(repo: InMemoryRepo) -> Iterator[object]:
    key_pair = make_key_pair()
    _, jwk = key_pair
    app.dependency_overrides[get_repo] = lambda: repo
    app.dependency_overrides[get_verifier] = lambda: make_verifier({"keys": [jwk]})
    yield key_pair[0]
    app.dependency_overrides.clear()


@pytest.fixture()
def client(verifier_key: object) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        test_client.headers.update(
            {"Authorization": f"Bearer {sign(verifier_key, subject=COURIER)}"}
        )
        yield test_client


@pytest.fixture()
def other_client(verifier_key: object) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        test_client.headers.update(
            {"Authorization": f"Bearer {sign(verifier_key, subject=OTHER)}"}
        )
        yield test_client


def seed_run(repo: InMemoryRepo, *, courier_id: str = COURIER) -> tuple[uuid.UUID, uuid.UUID]:
    run_id, shift_id = uuid.uuid4(), uuid.uuid4()
    repo.runs[run_id] = RunRecord(
        id=run_id,
        shift_id=shift_id,
        courier_id=courier_id,
        name="Hornby run",
        depot_lat=-43.5330,
        depot_lon=172.6300,
        capacity_parcels=None,
        speed_kmh=30.0,
        start_at=START_AT,
    )
    return run_id, shift_id


def csv_bytes(text: str) -> bytes:
    return text.encode("utf-8")


def xlsx_bytes(rows: list[list[object]]) -> bytes:
    import openpyxl

    workbook = openpyxl.Workbook()
    sheet = workbook.active
    for row in rows:
        sheet.append(row)
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


class TestTheCsvImport:
    def test_the_import_lands_and_the_stops_list_answers_it(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, shift_id = seed_run(repo)
        content = csv_bytes(
            "address,type,priority,parcels\n"
            "12 Riccarton Road Riccarton,delivery,false,2\n"
            "1 Colombo Street Christchurch Central,pickup,true,1\n"
        )

        answered = client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.csv", content, "text/csv")},
        )

        assert answered.status_code == 201, answered.text
        body = answered.json()
        assert body["shift_id"] == str(shift_id)
        assert body["imported"] == 2
        assert len(body["stop_ids"]) == 2
        assert body["ignored_columns"] == []

        listed = client.get(f"/shifts/{shift_id}/stops")
        assert listed.status_code == 200, listed.text
        stops = listed.json()
        assert [stop["address"] for stop in stops] == [
            "12 Riccarton Road Riccarton",
            "1 Colombo Street Christchurch Central",
        ]
        assert [stop["type"] for stop in stops] == ["delivery", "pickup"]
        assert [stop["priority"] for stop in stops] == [False, True]
        assert [stop["parcels"] for stop in stops] == [2, 1]
        assert [stop["status"] for stop in stops] == ["pending", "pending"]
        assert [stop["lat"] for stop in stops] == [None, None]
        assert [stop["seq"] for stop in stops] == [1, 2]

    def test_a_row_without_an_address_refuses_the_whole_import(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, shift_id = seed_run(repo)
        content = csv_bytes(
            "address,parcels\n"
            "12 Riccarton Road Riccarton,1\n"
            ",2\n"
        )

        refused = client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.csv", content, "text/csv")},
        )

        assert refused.status_code == 422, refused.text
        assert "row 3" in refused.json()["detail"]
        assert "no address" in refused.json()["detail"]
        listed = client.get(f"/shifts/{shift_id}/stops")
        assert listed.json() == []  # nothing was stored

    def test_a_bad_type_value_is_refused(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, shift_id = seed_run(repo)
        content = csv_bytes("address,type\n12 Riccarton Road,bogus\n")

        refused = client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.csv", content, "text/csv")},
        )

        assert refused.status_code == 422, refused.text
        assert "type must be one of" in refused.json()["detail"]
        assert client.get(f"/shifts/{shift_id}/stops").json() == []

    def test_a_naive_window_is_refused(self, client: TestClient, repo: InMemoryRepo) -> None:
        _, shift_id = seed_run(repo)
        content = csv_bytes(
            "address,window_start,window_end\n"
            "12 Riccarton Road,2026-11-03T08:00:00,2026-11-03T12:00:00+13:00\n"
        )

        refused = client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.csv", content, "text/csv")},
        )

        assert refused.status_code == 422, refused.text
        assert "timezone" in refused.json()["detail"]

    def test_a_header_without_an_address_column_is_refused(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, shift_id = seed_run(repo)
        content = csv_bytes("name,parcels\nwhatever,1\n")

        refused = client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.csv", content, "text/csv")},
        )

        assert refused.status_code == 422, refused.text
        assert "no address column" in refused.json()["detail"]

    def test_unknown_columns_are_answered_not_dropped(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, shift_id = seed_run(repo)
        content = csv_bytes("address,notes\n12 Riccarton Road,gate code 1234\n")

        answered = client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.csv", content, "text/csv")},
        )

        assert answered.status_code == 201, answered.text
        assert answered.json()["ignored_columns"] == ["notes"]
        assert answered.json()["imported"] == 1

    def test_over_the_row_cap_is_refused(self, client: TestClient, repo: InMemoryRepo) -> None:
        _, shift_id = seed_run(repo)
        content = csv_bytes("address\n" + "1 A Street\n" * 1001)

        refused = client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.csv", content, "text/csv")},
        )

        assert refused.status_code == 422, refused.text
        assert "1000" in refused.json()["detail"]


class TestTheFileShape:
    def test_an_xlsx_import_lands(self, client: TestClient, repo: InMemoryRepo) -> None:
        _, shift_id = seed_run(repo)
        content = xlsx_bytes(
            [
                ["Address", "Type", "Parcels"],
                ["12 Riccarton Road Riccarton", "delivery", 2],
                ["1 Colombo Street", "pickup", 1],
            ]
        )

        answered = client.post(
            f"/shifts/{shift_id}/import",
            files={
                "file": (
                    "stops.xlsx",
                    content,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )

        assert answered.status_code == 201, answered.text
        assert answered.json()["imported"] == 2
        stops = client.get(f"/shifts/{shift_id}/stops").json()
        assert [stop["type"] for stop in stops] == ["delivery", "pickup"]
        assert [stop["parcels"] for stop in stops] == [2, 1]

    def test_a_zip_named_csv_is_refused(self, client: TestClient, repo: InMemoryRepo) -> None:
        _, shift_id = seed_run(repo)

        refused = client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.csv", xlsx_bytes([["address"], ["1 A Street"]]), "text/csv")},
        )

        assert refused.status_code == 415, refused.text

    def test_an_unknown_extension_is_refused(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, shift_id = seed_run(repo)

        refused = client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.txt", csv_bytes("address\n1 A Street\n"), "text/plain")},
        )

        assert refused.status_code == 415, refused.text

    def test_an_oversized_file_is_refused(self, client: TestClient, repo: InMemoryRepo) -> None:
        _, shift_id = seed_run(repo)

        refused = client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.csv", b"x" * (5 * 1024 * 1024 + 1), "text/csv")},
        )

        assert refused.status_code == 413, refused.text


class TestTheOwnership:
    def test_a_foreign_shift_is_not_found(
        self, client: TestClient, other_client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, shift_id = seed_run(repo)
        content = csv_bytes("address\n12 Riccarton Road\n")

        refused = other_client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.csv", content, "text/csv")},
        )

        assert refused.status_code == 404, refused.text
        assert client.get(f"/shifts/{shift_id}/stops").json() == []

    def test_an_anonymous_caller_is_unauthorized(
        self, verifier_key: object, repo: InMemoryRepo
    ) -> None:
        _, shift_id = seed_run(repo)
        with TestClient(app) as anonymous:
            refused = anonymous.post(
                f"/shifts/{shift_id}/import",
                files={"file": ("stops.csv", csv_bytes("address\n1 A Street\n"), "text/csv")},
            )
        assert refused.status_code == 401, refused.text
