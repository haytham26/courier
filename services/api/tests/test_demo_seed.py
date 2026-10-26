"""The demo-run seed (ADR-019): a deterministic day, owner-only, gated by the environment.

The app's core flow - load the run, deliver 3 stops, go offline, deliver 1, sync -
needs a run with stops that really exist in the database. This endpoint gives the
caller one, with ids that do not move between calls, so the E2E job and the
founder's demo phone can both drive the same flow repeatedly.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.auth.jwks import get_verifier
from app.demo import (
    DEMO_REASONS,
    DEMO_STOPS,
    demo_day_for,
    demo_shift_id,
    demo_stop_id,
    write_demo_day,
)
from app.main import app
from app.repo import InMemoryRepo, SqlAlchemyRepo, get_repo
from tests.auth.test_jwks import make_key_pair, make_verifier, sign

COURIER = "driver-7"
OTHER = "driver-8"
STOPS = 5
PATH = "/demo/runs"


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
        test_client.headers.update({"Authorization": f"Bearer {sign(verifier_key, subject=OTHER)}"})
        yield test_client


@pytest.fixture()
def anonymous_client(verifier_key: object) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def seeded(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """The gate is on, as the E2E job sets it."""
    monkeypatch.setenv("DEMO_SEED_ENABLED", "true")
    yield


def a_seed(reason: str = "e2e") -> dict[str, str]:
    return {"reason": reason}


class TestTheSeedEndpoint:
    def test_a_run_with_stops_comes_back(
        self, client: TestClient, repo: InMemoryRepo, seeded: None
    ) -> None:
        answer = client.post(PATH, json=a_seed())

        assert answer.status_code == 200, answer.text
        body = answer.json()
        run_id = uuid.UUID(body["run_id"])
        assert len(body["stops"]) == STOPS
        stops = repo.get_run_stops(run_id)
        assert [stop.id for stop in stops] == [uuid.UUID(stop["id"]) for stop in body["stops"]]
        assert stops[0].address
        assert stops[0].lat is not None and stops[0].lon is not None
        run = repo.get_run(run_id)
        assert run is not None
        assert run.courier_id == COURIER

    def test_seeding_again_returns_the_same_day(
        self, client: TestClient, repo: InMemoryRepo, seeded: None
    ) -> None:
        first = client.post(PATH, json=a_seed()).json()

        second = client.post(PATH, json=a_seed()).json()

        assert second == first
        assert repo.cursor(uuid.UUID(first["shift_id"])) == 0

    def test_a_different_reason_is_a_different_day(
        self, client: TestClient, repo: InMemoryRepo, seeded: None
    ) -> None:
        e2e = client.post(PATH, json=a_seed("e2e")).json()

        demo = client.post(PATH, json=a_seed("demo")).json()

        assert demo["run_id"] != e2e["run_id"]

    def test_one_reason_is_enough(
        self, client: TestClient, repo: InMemoryRepo, seeded: None
    ) -> None:
        client.post(PATH, json=a_seed("demo"))

        again = client.post(PATH, json=a_seed("demo"))

        assert again.status_code == 200
        assert again.json()["stops"][0]["id"] == str(demo_stop_id(COURIER, "demo", 0))

    def test_another_courier_gets_their_own_day(
        self, client: TestClient, other_client: TestClient, repo: InMemoryRepo, seeded: None
    ) -> None:
        mine = client.post(PATH, json=a_seed("demo")).json()

        theirs = other_client.post(PATH, json=a_seed("demo")).json()

        assert theirs["run_id"] != mine["run_id"]
        their_run = repo.get_run(uuid.UUID(theirs["run_id"]))
        assert their_run is not None
        assert their_run.courier_id == OTHER
        assert other_client.get(PATH).status_code == 405

    def test_the_ids_are_recognisable_as_demo_data(self, seeded: None) -> None:
        """The evidence and the database can tell a demo day from a real one."""
        assert demo_shift_id(COURIER, "e2e").version == 5
        assert demo_stop_id(COURIER, "e2e", 0) != demo_stop_id(COURIER, "demo", 0)


class TestTheGate:
    def test_without_the_env_the_endpoint_is_404(
        self, client: TestClient, repo: InMemoryRepo, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.delenv("DEMO_SEED_ENABLED", raising=False)

        refused = client.post(PATH, json=a_seed())

        assert refused.status_code == 404
        assert repo.runs == {}

    def test_the_gate_is_not_truthy(
        self, client: TestClient, repo: InMemoryRepo, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """'false' is a string, and a gate that reads truthiness is not a gate."""
        monkeypatch.setenv("DEMO_SEED_ENABLED", "false")

        refused = client.post(PATH, json=a_seed())

        assert refused.status_code == 404

    def test_an_anonymous_call_is_401(
        self, anonymous_client: TestClient, repo: InMemoryRepo, seeded: None
    ) -> None:
        assert anonymous_client.post(PATH, json=a_seed()).status_code == 401

    def test_an_unknown_reason_is_422(
        self, client: TestClient, repo: InMemoryRepo, seeded: None
    ) -> None:
        refused = client.post(PATH, json={"reason": "production"})

        assert refused.status_code == 422


class TestTheVocabulary:
    def test_the_reasons_are_a_small_fixed_set(self, seeded: None) -> None:
        assert DEMO_REASONS == ("e2e", "demo", "dev")


@pytest.mark.db
class TestTheDemoSeedOnPostgres:
    """The same guarantee through the production repository (CI's db job).

    The in-memory repo answers the endpoint's contract; the SQL repo is the one a
    deployment runs, and the seed writes a real shift, a real run and real stops
    through it - so the ids the app received are the rows Postgres holds. The
    schema is applied from the contract (the same file production builds from)
    and the rows this test writes are removed in its teardown.
    """

    def test_the_seed_writes_real_rows_and_a_repeat_changes_nothing(self) -> None:
        import os
        from pathlib import Path as TestPath

        database_url = os.environ.get("DATABASE_URL", "")
        if not database_url:
            pytest.skip("the db suite needs the Postgres service container")

        from sqlalchemy import create_engine

        schema = (
            TestPath(__file__).resolve().parents[3] / "packages" / "contracts" / "db" / "schema.sql"
        ).read_text(encoding="utf-8")
        engine = create_engine(database_url)
        repo = SqlAlchemyRepo(engine)
        # The ids are derived, so the cleanup can name them even if the write
        # itself fails part-way through.
        expected = demo_day_for(COURIER, "e2e")
        try:
            with engine.begin() as connection:
                connection.execute(text(schema))
            first = write_demo_day(repo, COURIER, "e2e")
            second = write_demo_day(repo, COURIER, "e2e")

            assert second.run.id == first.run.id
            stops = repo.get_run_stops(first.run.id)
            assert len(stops) == DEMO_STOPS
            seeded_run = repo.get_run_for_shift(first.run.shift_id)
            assert seeded_run is not None
            assert seeded_run.courier_id == COURIER
            # The seeded stop reads back with the status a seeded stop starts at.
            assert stops[0].status == "pending"
            assert stops[0].address
        finally:
            with engine.begin() as connection:
                connection.execute(
                    text("DELETE FROM stops WHERE shift_id = :shift"),
                    {"shift": expected.run.shift_id},
                )
                connection.execute(
                    text("DELETE FROM runs WHERE id = :run"),
                    {"run": expected.run.id},
                )
                connection.execute(
                    text("DELETE FROM shifts WHERE id = :shift"),
                    {"shift": expected.run.shift_id},
                )
            engine.dispose()
