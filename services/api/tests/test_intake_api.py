"""The intake endpoints (ADR-013): the two stubs wired to the graph.

The graph runs with the deterministic fake provider when no OmniRoute gateway
is configured; the tests override the provider only to exercise the OCR path
(a fake with text) and the failure paths. The answer is always the contract's
shape: a briefing or the first interrupt question.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.agents.omniroute import (
    FakeOmniRoute,
    OmniRouteError,
    get_intake_provider,
)
from app.auth.jwks import get_verifier
from app.main import app
from app.repo import InMemoryRepo, RouteStopRow, RunRecord, get_repo
from tests.auth.test_jwks import make_key_pair, make_verifier, sign

COURIER = "driver-7"
OTHER = "driver-8"
START_AT = datetime(2026, 10, 25, 7, 30, tzinfo=UTC)
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
SPOKEN = "12 Riccarton Road Riccarton"


@pytest.fixture(autouse=True)
def no_gateway(monkeypatch: pytest.MonkeyPatch) -> None:
    """The default provider is the deterministic fake, never a real gateway."""
    monkeypatch.delenv("OMNIROUTE_BASE_URL", raising=False)
    monkeypatch.delenv("OMNIROUTE_API_KEY", raising=False)


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


def seed_run(
    repo: InMemoryRepo,
    *,
    courier_id: str = COURIER,
    stop_address: str | None = None,
) -> tuple[uuid.UUID, uuid.UUID]:
    """A run, with one geocoded stop when the dispatcher seeded one."""
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
    if stop_address is not None:
        repo.run_stops[run_id] = [
            RouteStopRow(
                id=uuid.uuid4(),
                lat=-43.5400,
                lon=172.6000,
                priority=False,
                parcels=1,
                service_time_s=None,
                window_start=None,
                window_end=None,
                address=stop_address,
            )
        ]
    return run_id, shift_id


class TestTheVoiceIntake:
    def test_an_address_the_api_cannot_place_asks_the_courier(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        """No geocoder yet: the verification agent asks, never guesses."""
        _, shift_id = seed_run(repo)

        started = client.post(f"/shifts/{shift_id}/intake", json={"text": SPOKEN})

        assert started.status_code == 200, started.text
        assert started.json() == {"speak": f"Confirm {SPOKEN}?", "index": 0}

    def test_a_dispatcher_seeded_stop_briefs_the_run(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, shift_id = seed_run(repo, stop_address="12 Riccarton Road")

        started = client.post(
            f"/shifts/{shift_id}/intake", json={"text": SPOKEN, "source": "voice"}
        )

        assert started.status_code == 200, started.text
        body = started.json()
        assert body["stops_count"] == 1
        assert body["set_aside_count"] == 0
        assert body["briefing"].startswith("1 stops locked")

    def test_an_empty_text_is_refused_before_the_graph(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, shift_id = seed_run(repo)

        assert client.post(f"/shifts/{shift_id}/intake", json={"text": ""}).status_code == 422

    def test_an_unknown_source_is_refused(self, client: TestClient, repo: InMemoryRepo) -> None:
        _, shift_id = seed_run(repo)

        refused = client.post(
            f"/shifts/{shift_id}/intake", json={"text": SPOKEN, "source": "telepathy"}
        )

        assert refused.status_code == 422

    def test_an_oversized_text_is_refused(self, client: TestClient, repo: InMemoryRepo) -> None:
        _, shift_id = seed_run(repo)

        refused = client.post(f"/shifts/{shift_id}/intake", json={"text": "x" * 50_001})

        assert refused.status_code == 422

    def test_a_provider_failure_is_an_honest_502(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        class BrokenProvider:
            def extract(self, source: str, text: str) -> list[dict[str, object]]:
                raise OmniRouteError("the extraction provider did not answer")

            def phrase(self, problem: str, raw: str) -> str:
                return "Confirm it?"

            def ocr(self, image: bytes) -> str:
                raise OmniRouteError("no")

        app.dependency_overrides[get_intake_provider] = BrokenProvider
        _, shift_id = seed_run(repo)

        failed = client.post(f"/shifts/{shift_id}/intake", json={"text": SPOKEN})

        assert failed.status_code == 502
        assert "did not answer" in failed.json()["detail"]

    def test_another_couriers_shift_is_404(
        self, other_client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, shift_id = seed_run(repo)

        assert (
            other_client.post(f"/shifts/{shift_id}/intake", json={"text": SPOKEN}).status_code
            == 404
        )

    def test_an_anonymous_call_is_refused(
        self, anonymous_client: TestClient, repo: InMemoryRepo
    ) -> None:
        _, shift_id = seed_run(repo)

        started = anonymous_client.post(f"/shifts/{shift_id}/intake", json={"text": SPOKEN})

        assert started.status_code == 401


class TestTheManifestIntake:
    def test_without_the_ocr_provider_the_endpoint_says_so(
        self, client: TestClient, repo: InMemoryRepo
    ) -> None:
        """No gateway, no invention: the photo path waits for the founder item."""
        _, shift_id = seed_run(repo)

        uploaded = client.post(
            f"/shifts/{shift_id}/intake/manifest",
            files={"image": ("manifest.png", PNG, "image/png")},
        )

        assert uploaded.status_code == 503
        assert "OCR" in uploaded.json()["detail"]

    def test_the_ocr_text_runs_the_same_graph(self, client: TestClient, repo: InMemoryRepo) -> None:
        app.dependency_overrides[get_intake_provider] = lambda: FakeOmniRoute(ocr_text=SPOKEN)
        _, shift_id = seed_run(repo, stop_address="12 Riccarton Road")

        uploaded = client.post(
            f"/shifts/{shift_id}/intake/manifest",
            files={"image": ("manifest.png", PNG, "image/png")},
        )

        assert uploaded.status_code == 200, uploaded.text
        assert uploaded.json()["stops_count"] == 1

    def test_a_non_image_upload_is_refused(self, client: TestClient, repo: InMemoryRepo) -> None:
        app.dependency_overrides[get_intake_provider] = lambda: FakeOmniRoute(ocr_text=SPOKEN)
        _, shift_id = seed_run(repo)

        refused = client.post(
            f"/shifts/{shift_id}/intake/manifest",
            files={"image": ("notes.txt", b"not an image", "text/plain")},
        )

        assert refused.status_code == 415

    def test_an_oversized_photo_is_refused(self, client: TestClient, repo: InMemoryRepo) -> None:
        app.dependency_overrides[get_intake_provider] = lambda: FakeOmniRoute(ocr_text=SPOKEN)
        _, shift_id = seed_run(repo)
        oversized = PNG + b"\x00" * (10 * 1024 * 1024)

        refused = client.post(
            f"/shifts/{shift_id}/intake/manifest",
            files={"image": ("manifest.png", oversized, "image/png")},
        )

        assert refused.status_code == 413
