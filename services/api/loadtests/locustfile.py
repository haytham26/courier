"""The load test of the Courier API: 1,000 drivers doing the day loop.

MASTER_EXECUTION section 18.4: load test the API and sync for 1,000 drivers
before launch. The model is a courier's day, not a hammer: create the run
once, read the route every few minutes, list the stops, sync a small batch of
events every minute, upload a proof of delivery a handful of times per shift.

The thresholds ARE the SLOs (docs/operations/RUNBOOK.md section 8): the route
p95 at 5 s (the written 200-stop budget is the floor), the sync p95 at
300 ms, the POD p95 at 2 s, the error rate at 0.1 percent. A red threshold
fails the run - never a lowered number.

Run against a reachable API (the SLO run is the DB-backed one; a local run
against the in-memory repo measures the application layer honestly):

    uv run --directory services/api --extra load \
      locust -f loadtests/locustfile.py --headless \
             --host http://127.0.0.1:8000 -u 1000 -r 100 --run-time 15m
"""

from __future__ import annotations

import os
import random
import uuid
from datetime import UTC, datetime
from typing import Any

from locust import HttpUser, between, events, task
from locust.exception import StopUser

# The SLO thresholds, encoded as this test's own contract.
ROUTE_P95_MS = 5_000
SYNC_P95_MS = 300
POD_P95_MS = 2_000
MAX_ERROR_RATE = 0.001

# A single request this far over its SLO fails outright; the p95 itself is
# asserted at the stop listener, against the same numbers.
SINGLE_REQUEST_BREACH_X = 10

_PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 1020


class DriverDay(HttpUser):
    """One courier doing a day."""

    wait_time = between(30, 90)  # a courier acts, then drives

    def on_start(self) -> None:
        token = os.environ.get("LOADTEST_TOKEN")
        if not token:
            raise StopUser("LOADTEST_TOKEN is not set: the load test runs against a real JWKS")
        self.client.headers.update({"Authorization": f"Bearer {token}"})
        self.run_id: uuid.UUID | None = None
        self.shift_id = uuid.uuid4()
        self.stop_ids: list[uuid.UUID] = []

    def _slo(self, response: Any, p95_ms: int) -> None:
        """The per-request SLO: a 5xx or a 10x-SLO request is a failure."""
        if response.status_code >= 500:
            response.failure(f"{response.status_code}")
        elif response.elapsed.total_seconds() * 1000 > p95_ms * SINGLE_REQUEST_BREACH_X:
            response.failure("over 10x the SLO")

    @task(1)
    def create_run(self) -> None:
        if self.run_id is not None:
            return
        body = {
            "name": f"Loadtest {self.shift_id}",
            "shift_id": str(self.shift_id),
            "depot": {"lat": -43.5330, "lon": 172.6300},
            "start_at": datetime.now(UTC).isoformat(),
            "speed_kmh": 30.0,
        }
        with self.client.post("/runs", json=body, catch_response=True) as response:
            if response.status_code == 409:
                response.success()  # a retried create: the shift already has its run
                return
            if response.status_code == 201:
                self.run_id = uuid.UUID(response.json()["id"])

    @task(6)
    def read_the_route(self) -> None:
        if self.run_id is None:
            return
        with self.client.get(f"/shifts/{self.shift_id}/route", catch_response=True) as response:
            self._slo(response, ROUTE_P95_MS)

    @task(8)
    def list_the_stops(self) -> None:
        if self.run_id is None:
            return
        with self.client.get(f"/shifts/{self.shift_id}/stops", catch_response=True) as response:
            self._slo(response, SYNC_P95_MS)

    @task(10)
    def sync_a_batch(self) -> None:
        if self.run_id is None:
            return
        batch = [
            {
                "id": str(uuid.uuid4()),
                "stop_id": str(random.choice(self.stop_ids) if self.stop_ids else uuid.uuid4()),
                "kind": random.choice(("delivered", "skipped", "failed")),
                "occurred_at": datetime.now(UTC).isoformat(),
            }
            for _ in range(random.randint(2, 8))
        ]
        with self.client.post(
            f"/shifts/{self.shift_id}/events:batch", json=batch, catch_response=True
        ) as response:
            self._slo(response, SYNC_P95_MS)

    @task(2)
    def upload_a_pod(self) -> None:
        if self.run_id is None:
            return
        stop_id = random.choice(self.stop_ids) if self.stop_ids else uuid.uuid4()
        with self.client.post(
            f"/runs/{self.run_id}/stops/{stop_id}/pod",
            files={"image": ("door.jpg", _PNG_BYTES, "image/png")},
            data={"occurred_at": datetime.now(UTC).isoformat()},
            catch_response=True,
        ) as response:
            self._slo(response, POD_P95_MS)


@events.test_stop.add_listener
def assert_the_slos(environment: Any, **_kwargs: Any) -> None:
    """The run's verdict: the SLOs as thresholds, red on breach."""
    failures = 0
    wanted = (
        ("GET", "/shifts/", ROUTE_P95_MS),
        ("POST", "/events:batch", SYNC_P95_MS),
        ("POST", "/pod", POD_P95_MS),
    )
    for method, fragment, threshold in wanted:
        for entry in environment.stats.entries.values():
            if entry.method == method and fragment in entry.name:
                p95 = entry.get_response_time_percentile(0.95)
                if p95 > threshold:
                    environment.process_exit_code = 1
                    print(f"SLO BREACH: {method} {entry.name} p95 {p95:.0f} ms > {threshold} ms")
                    failures += 1
    total = environment.stats.total
    if total.num_requests and total.fail_ratio > MAX_ERROR_RATE:
        environment.process_exit_code = 1
        print(f"ERROR BUDGET BREACH: fail ratio {total.fail_ratio:.4f} > {MAX_ERROR_RATE}")
        failures += 1
    if not failures:
        print("SLOs met: the run is green")
