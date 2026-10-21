"""The door memory: what the courier taught the app about an address.

The memory belongs to the courier who wrote it, so the tests check that a
second courier never reads it, that an address without a memory is a 404 and
that both routes need a token.
"""

from __future__ import annotations

import uuid
from collections.abc import Callable
from datetime import UTC, date, datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app import nz_address
from app.repo import InMemoryRepo

COURIER = "courier-1"
OTHER_COURIER = "courier-2"
ADDRESS = "14 Harewood Rd, Bishopdale"
ADDRESS_KEY = "14 harewood rd, bishopdale"
SHIFT_DATE = date(2026, 10, 21)


def seed_shift(repo: InMemoryRepo, courier: str = COURIER) -> tuple[uuid.UUID, uuid.UUID]:
    """A shift with one stop, owned by a courier."""
    shift_id = uuid.uuid4()
    stop_id = uuid.uuid4()
    repo.add_shift(shift_id, courier, SHIFT_DATE)
    repo.add_stop(stop_id, shift_id, ADDRESS)
    return shift_id, stop_id


def auth(token: str) -> dict[str, str]:
    """The header that carries a token."""
    return {"Authorization": f"Bearer {token}"}


def test_the_note_is_stored_and_read_back(
    api_client: TestClient, sign: Callable[..., str], repo: InMemoryRepo
) -> None:
    _, stop_id = seed_shift(repo)
    token = sign(COURIER)

    written = api_client.post(
        f"/stops/{stop_id}/door-memory",
        json={"note": "side gate left of the garage", "safe_place": "under the mat"},
        headers=auth(token),
    )

    assert written.status_code == 200
    body = written.json()
    assert body["note"] == "side gate left of the garage"
    assert body["safe_place"] == "under the mat"
    assert body["updated_at"]

    read = api_client.get(f"/stops/{stop_id}/door-memory", headers=auth(token))

    assert read.status_code == 200
    assert read.json() == body


def test_the_address_key_is_the_normalised_key(
    api_client: TestClient, sign: Callable[..., str], repo: InMemoryRepo
) -> None:
    """The key is the normalised address, not a second normalisation."""
    _, stop_id = seed_shift(repo)

    response = api_client.post(
        f"/stops/{stop_id}/door-memory",
        json={"note": "dog", "safe_place": None},
        headers=auth(sign(COURIER)),
    )

    assert response.status_code == 200
    assert response.json()["address_key"] == ADDRESS_KEY
    assert response.json()["address_key"] == nz_address.parse(ADDRESS).address_key


def test_another_courier_never_sees_the_memory(
    api_client: TestClient, sign: Callable[..., str], repo: InMemoryRepo
) -> None:
    _, stop_id = seed_shift(repo)
    first = api_client.post(
        f"/stops/{stop_id}/door-memory",
        json={"note": "mine", "safe_place": "in the porch"},
        headers=auth(sign(COURIER)),
    )
    assert first.status_code == 200

    other = api_client.get(f"/stops/{stop_id}/door-memory", headers=auth(sign(OTHER_COURIER)))

    assert other.status_code == 404


def test_a_second_courier_writes_their_own_memory(
    api_client: TestClient, sign: Callable[..., str], repo: InMemoryRepo
) -> None:
    """The same address, two couriers, two memories."""
    shift_id, stop_id = seed_shift(repo)
    other_shift_id = uuid.uuid4()
    other_stop_id = uuid.uuid4()
    repo.add_shift(other_shift_id, OTHER_COURIER, SHIFT_DATE)
    repo.add_stop(other_stop_id, other_shift_id, ADDRESS)

    api_client.post(
        f"/stops/{stop_id}/door-memory",
        json={"note": "theirs", "safe_place": None},
        headers=auth(sign(COURIER)),
    )
    written = api_client.post(
        f"/stops/{other_stop_id}/door-memory",
        json={"note": "mine", "safe_place": None},
        headers=auth(sign(OTHER_COURIER)),
    )

    assert written.status_code == 200
    assert written.json()["note"] == "mine"

    first_read = api_client.get(f"/stops/{stop_id}/door-memory", headers=auth(sign(COURIER)))
    second_read = api_client.get(
        f"/stops/{other_stop_id}/door-memory", headers=auth(sign(OTHER_COURIER))
    )

    assert first_read.json()["note"] == "theirs"
    assert second_read.json()["note"] == "mine"


def test_an_address_without_a_memory_is_a_404(
    api_client: TestClient, sign: Callable[..., str], repo: InMemoryRepo
) -> None:
    _, stop_id = seed_shift(repo)

    response = api_client.get(f"/stops/{stop_id}/door-memory", headers=auth(sign(COURIER)))

    assert response.status_code == 404


def test_an_unknown_stop_is_a_404(api_client: TestClient, sign: Callable[..., str]) -> None:
    unknown = uuid.uuid4()

    read = api_client.get(f"/stops/{unknown}/door-memory", headers=auth(sign(COURIER)))
    written = api_client.post(
        f"/stops/{unknown}/door-memory",
        json={"note": "nowhere", "safe_place": None},
        headers=auth(sign(COURIER)),
    )

    assert read.status_code == 404
    assert written.status_code == 404


def test_a_stop_of_another_courier_is_a_404(
    api_client: TestClient, sign: Callable[..., str], repo: InMemoryRepo
) -> None:
    _, stop_id = seed_shift(repo)

    response = api_client.get(f"/stops/{stop_id}/door-memory", headers=auth(sign(OTHER_COURIER)))

    assert response.status_code == 404


def test_the_note_can_be_cleared(
    api_client: TestClient, sign: Callable[..., str], repo: InMemoryRepo
) -> None:
    """A courier can wipe what they wrote."""
    _, stop_id = seed_shift(repo)
    token = sign(COURIER)
    api_client.post(
        f"/stops/{stop_id}/door-memory",
        json={"note": "dog", "safe_place": None},
        headers=auth(token),
    )

    cleared = api_client.post(
        f"/stops/{stop_id}/door-memory",
        json={"note": None, "safe_place": None},
        headers=auth(token),
    )

    assert cleared.status_code == 200
    assert cleared.json()["note"] is None
    read = api_client.get(f"/stops/{stop_id}/door-memory", headers=auth(token))
    assert read.status_code == 200
    assert read.json()["note"] is None


def test_both_routes_need_a_token(api_client: TestClient, repo: InMemoryRepo) -> None:
    _, stop_id = seed_shift(repo)

    read = api_client.get(f"/stops/{stop_id}/door-memory")
    written = api_client.post(
        f"/stops/{stop_id}/door-memory", json={"note": "dog", "safe_place": None}
    )

    assert read.status_code == 401
    assert written.status_code == 401


def test_the_sql_repository_stores_the_memory(
    sql_api_client: TestClient, sign: Callable[..., str], fake_db: Any
) -> None:
    """The PostgreSQL implementation keeps the same memory."""
    stop_id = uuid.uuid4()
    shift_id = uuid.uuid4()
    fake_db.stops.append([stop_id, shift_id, ADDRESS_KEY, COURIER, 1])
    fake_db.shifts.append([shift_id, SHIFT_DATE, COURIER])
    token = sign(COURIER)

    written = sql_api_client.post(
        f"/stops/{stop_id}/door-memory",
        json={"note": "side gate", "safe_place": "behind the bin"},
        headers=auth(token),
    )

    assert written.status_code == 200
    assert written.json()["address_key"] == ADDRESS_KEY
    assert written.json()["note"] == "side gate"
    assert any("INSERT INTO door_memory" in query for query in fake_db.statements())

    read = sql_api_client.get(f"/stops/{stop_id}/door-memory", headers=auth(token))

    assert read.status_code == 200
    assert read.json()["note"] == "side gate"


def test_the_sql_repository_keeps_the_couriers_apart(sql_repo: Any, fake_db: Any) -> None:
    """The memory is read back for the courier who wrote it, and for nobody else."""
    memory = sql_repo.save_door_memory(COURIER, ADDRESS_KEY, "dog", None)
    fake_db.memories.append([COURIER, ADDRESS_KEY, "dog", None, memory.updated_at])

    assert sql_repo.get_door_memory(COURIER, ADDRESS_KEY) is not None
    assert sql_repo.get_door_memory(OTHER_COURIER, ADDRESS_KEY) is None


def test_the_sql_repository_reads_the_stop(sql_repo: Any, fake_db: Any) -> None:
    """The stop carries the address key and the courier who owns it."""
    stop_id = uuid.uuid4()
    shift_id = uuid.uuid4()
    fake_db.stops.append([stop_id, shift_id, ADDRESS_KEY, COURIER, 2])

    stop = sql_repo.get_stop(stop_id)

    assert stop is not None
    assert stop.address_key == ADDRESS_KEY
    assert stop.courier_id == COURIER
    assert stop.parcel_count == 2
    assert sql_repo.get_stop(uuid.uuid4()) is None


def test_the_sql_repository_has_no_shift_when_the_database_has_none(
    sql_repo: Any,
) -> None:
    assert sql_repo.get_shift(uuid.uuid4()) is None


def test_the_repository_follows_the_database_url(monkeypatch: pytest.MonkeyPatch) -> None:
    """Without a database the API keeps its records in memory."""
    from app import repo as repo_module

    monkeypatch.setenv("DATABASE_URL", "")
    repo_module.get_repo.cache_clear()
    assert isinstance(repo_module.get_repo(), repo_module.InMemoryRepo)

    monkeypatch.setenv("DATABASE_URL", "postgresql://courier@localhost:5432/courier")
    repo_module.get_repo.cache_clear()
    assert isinstance(repo_module.get_repo(), repo_module.SqlRepo)

    repo_module.get_repo.cache_clear()


class FakeCursor:
    """The cursor of the stand-in connection."""

    def __init__(self, rows: list[tuple[object, ...]]) -> None:
        self.rows = rows
        self.statements: list[tuple[str, object]] = []

    def __enter__(self) -> FakeCursor:
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def execute(self, query: str, params: object = None) -> None:
        self.statements.append((query, params))

    def fetchall(self) -> list[tuple[object, ...]]:
        return self.rows


class FakeConnection:
    """The stand-in connection: the shape psycopg gives the runner."""

    def __init__(self, rows: list[tuple[object, ...]]) -> None:
        self.rows = rows
        self.cursors: list[FakeCursor] = []

    def __enter__(self) -> FakeConnection:
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def cursor(self) -> FakeCursor:
        cursor = FakeCursor(self.rows)
        self.cursors.append(cursor)
        return cursor


def test_the_postgres_runner_uses_the_connection(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The runner opens a connection, runs the statement and hands back the rows."""
    from app import repo as repo_module

    connection = FakeConnection([("14 harewood rd, bishopdale",)])
    opened: list[str] = []

    def fake_connect(dsn: str) -> FakeConnection:
        opened.append(dsn)
        return connection

    monkeypatch.setattr(repo_module.psycopg, "connect", fake_connect)
    runner = repo_module._psycopg_runner("postgresql://courier@localhost:5432/courier")

    rows = runner("SELECT address_key FROM door_memory", ("courier-1",))

    assert rows == [("14 harewood rd, bishopdale",)]
    assert opened == ["postgresql://courier@localhost:5432/courier"]
    assert connection.cursors[0].statements[0][0] == "SELECT address_key FROM door_memory"


def test_seeding_an_unknown_shift_is_refused(repo: InMemoryRepo) -> None:
    with pytest.raises(KeyError):
        repo.add_stop(uuid.uuid4(), uuid.uuid4(), ADDRESS)


def test_seeding_an_unknown_stop_is_refused(repo: InMemoryRepo) -> None:
    with pytest.raises(KeyError):
        repo.add_event(uuid.uuid4(), "delivered", datetime(2026, 10, 21, 9, 0, tzinfo=UTC))
