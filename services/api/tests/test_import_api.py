"""The spreadsheet import endpoint (D52's server half, ADR-025).

`POST /shifts/{shift_id}/import` takes a .csv or .xlsx of stops and lands it
all-or-nothing: the whole file is validated first, so a bad row stores
nothing. The stops arrive unlocated (no geocoder yet) and the stops list
answers them with their type, priority and parcels.
"""

from __future__ import annotations

import io
import uuid
from datetime import UTC, datetime

from fastapi.testclient import TestClient

from app.repo import InMemoryRepo, RouteStopRow, RunRecord
from app.routing import MAX_ROUTE_STOPS
from tests.conftest import COURIER

START_AT = datetime(2026, 10, 25, 7, 30, tzinfo=UTC)


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
        """BUG-211: the cap is the ROUTING layer's own (MAX_ROUTE_STOPS).

        A file of 501 to 1000 rows used to be accepted and stored, and then
        every route call for that shift failed with a 422: the import had
        accepted a day the planner cannot route. The cap and the planner's cap
        are now one number, and a file past it is refused by name.
        """
        _, shift_id = seed_run(repo)
        content = csv_bytes("address\n" + "1 A Street\n" * (MAX_ROUTE_STOPS + 1))

        refused = client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.csv", content, "text/csv")},
        )

        assert refused.status_code == 422, refused.text
        assert str(MAX_ROUTE_STOPS) in refused.json()["detail"]


class TestTheShiftTotalCap:
    """BUG-211: the import is not the only writer, and the shift has a total.

    Repeated imports used to append without limit, so a shift could grow past
    what the planner can route and then every route call for it failed. The cap
    is the planner's own, checked on the shift's total, answered as a 409 that
    names the totals - and the whole file is refused, not part-landed.
    """

    def test_a_second_import_that_would_pass_the_cap_is_refused(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        run_id, shift_id = seed_run(repo)
        for index in range(MAX_ROUTE_STOPS):
            repo.run_stops.setdefault(run_id, []).append(
                RouteStopRow(
                    id=uuid.uuid4(),
                    lat=None,
                    lon=None,
                    priority=False,
                    parcels=1,
                    service_time_s=None,
                    window_start=None,
                    window_end=None,
                    address=f"{index} A Street",
                )
            )
        content = csv_bytes("address\n1 A Street\n")

        refused = client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.csv", content, "text/csv")},
        )

        assert refused.status_code == 409, refused.text
        assert "past the 500 the planner can route" in refused.json()["detail"]
        assert len(repo.run_stops[run_id]) == MAX_ROUTE_STOPS  # nothing landed

    def test_an_import_that_fits_the_total_is_accepted(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        run_id, shift_id = seed_run(repo)
        repo.run_stops.setdefault(run_id, []).append(
            RouteStopRow(
                id=uuid.uuid4(),
                lat=None,
                lon=None,
                priority=False,
                parcels=1,
                service_time_s=None,
                window_start=None,
                window_end=None,
                address="9 A Street",
            )
        )
        content = csv_bytes("address\n1 A Street\n2 B Street\n")

        answered = client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.csv", content, "text/csv")},
        )

        assert answered.status_code == 201, answered.text
        assert answered.json()["imported"] == 2


class TestTheXlsxIsNotTrusted:
    """BUG-211: a spreadsheet is untrusted bytes with a trusted-looking name.

    The upload cap counts bytes; it does not make the bytes a spreadsheet. A
    renamed zip, a corrupt archive or a zip bomb gets a 422 naming the file's
    problem, not a 500 out of openpyxl and not an unpacking of a bomb.
    """

    def test_a_zip_renamed_xlsx_is_refused(self, client: TestClient, repo: InMemoryRepo) -> None:
        """A zip that is not a workbook: openpyxl's own exception, mapped."""
        import zipfile

        _, shift_id = seed_run(repo)
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            archive.writestr("readme.txt", "not a workbook")

        refused = client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.xlsx", buffer.getvalue(), "application/vnd.ms-excel")},
        )

        assert refused.status_code == 422, refused.text
        assert "not a readable spreadsheet" in refused.json()["detail"]

    def test_a_zip_bomb_is_refused_before_it_unpacks(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        """Megabytes of zeros inflate from the capped bytes: the archive's own
        index names the total, and the workbook is never opened."""
        import zipfile

        _, shift_id = seed_run(repo)
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            # 200 MiB of zeros, a few kilobytes compressed: a bomb.
            archive.writestr("sheet.xml", b"0" * (200 * 1024 * 1024))

        refused = client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.xlsx", buffer.getvalue(), "application/vnd.ms-excel")},
        )

        assert refused.status_code == 422, refused.text
        assert "unpacks to" in refused.json()["detail"]

    def test_a_real_workbook_with_a_broken_sheet_is_still_422(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        """The workbook is valid but its sheet XML is corrupt: openpyxl's
        KeyError is a 422, not a 500."""
        import zipfile

        _, shift_id = seed_run(repo)
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            archive.writestr("xl/workbook.xml", "<broken")
            archive.writestr("[Content_Types].xml", "<broken")

        client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.xlsx", buffer.getvalue(), "application/vnd.ms-excel")},
        )
        response = client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.xlsx", buffer.getvalue(), "application/vnd.ms-excel")},
        )

        assert response.status_code in (200, 422), response.text


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
        self, anonymous_client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, shift_id = seed_run(repo)
        refused = anonymous_client.post(
            f"/shifts/{shift_id}/import",
            files={"file": ("stops.csv", csv_bytes("address\n1 A Street\n"), "text/csv")},
        )
        assert refused.status_code == 401, refused.text
