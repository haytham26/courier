"""The load test of the Courier API: 1,000 drivers doing the day loop.

MASTER_EXECUTION section 18.4: load test the API and sync for 1,000 drivers
before launch. The model is a courier's day, not a hammer: create the run
once, read the route every few minutes, list the stops, sync a small batch of
events every minute, upload a proof of delivery a handful of times per shift.

The stop ids come from the run's own stops list: the day is seeded before the
run (the intake flow, or SQL as `ops/restore_drill.py` does) - without a
seeded day the loop honestly exercises runs/route/stops-list only, and the
POD and sync tasks step aside instead of hammering ids that do not exist.

The thresholds ARE the SLOs (docs/operations/RUNBOOK.md section 8): the route
p95 at 5 s (the written 200-stop budget is the floor), the sync p95 at
300 ms, the POD p95 at 2 s, the global error rate at 0.1 percent (the
strictest budget of section 8). A red threshold fails the run - never a
lowered number.

Run against a reachable API (the SLO run is the DB-backed one; a local run
against the in-memory repo measures the application layer honestly):

    uv run --directory services/api --extra load \
      locust -f loadtests/locustfile.py --headless \
             --host http://127.0.0.1:8000 -u 1000 -r 100 --run-time 15m

The CI profile pins `LOADTEST_ITERATIONS` so the request count is a property
of the test, not of the runner's speed: each user's day is a fixed number of
task executions (the budget is `loadtests/day_budget.py`), so a healthy run
lands ~users x iterations requests whatever the machine, and the vacuous floor
of 100 (the vacuous-green guard in `assert_the_slos`) stays far below it. Before
that, a wall-clock run of the same profile landed 141-197 requests on five
runs and 99 and 70 on two healthy ones, and the floor read the difference as a
broken API — a threshold inside the healthy band is a coin flip, and the luck
of a green is not evidence.
"""

from __future__ import annotations

import os
import random
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from day_budget import iteration_budget
from locust import HttpUser, between, events, task
from locust.exception import StopUser
from seed_day import loadtest_shift_id, loadtest_stop_id

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

    # The day-loop cadence is 30-90 s; the CI profile tightens it (env) so
    # a 60 s gate produces real volume. The staging run keeps the day shape.
    wait_time = between(
        float(os.environ.get("LOADTEST_WAIT_MIN", "30")),
        float(os.environ.get("LOADTEST_WAIT_MAX", "90")),
    )

    def on_start(self) -> None:
        token_file = os.environ.get("LOADTEST_TOKEN_FILE")
        token = os.environ.get("LOADTEST_TOKEN") or (
            Path(token_file).read_text(encoding="utf-8").strip()
            if token_file and Path(token_file).exists()
            else ""
        )
        if not token:
            raise StopUser(
                "no load-test identity: set LOADTEST_TOKEN or LOADTEST_TOKEN_FILE "
                "(mint_token.py writes the file)"
            )
        self.client.headers.update({"Authorization": f"Bearer {token}"})
        self.run_id: uuid.UUID | None = None
        # The claim: one of the seeded shifts (deterministic ids from
        # seed_day.py, which the CI step ran before this test). Two users
        # claiming the same shift meet the API's honest 409 and read back.
        self.shift_index = DriverDay._next_index() % int(os.environ.get("LOADTEST_SHIFTS", "60"))
        self.shift_id = loadtest_shift_id(self.shift_index)
        self.stop_ids = [
            loadtest_stop_id(self.shift_index, k)
            for k in range(int(os.environ.get("LOADTEST_STOPS_PER_SHIFT", "5")))
        ]
        self._delivered: set[uuid.UUID] = set()
        self._tasks_done = 0

    def _another_task(self) -> None:
        """One task execution against the user's day budget.

        The CI profile sets `LOADTEST_ITERATIONS` (the staging run leaves it
        unset and uncapped): a user whose budget is spent stops, so the request
        count is a property of the test and not of how fast the runner is — the
        2026-10-31 incident, where the same healthy profile landed 141-197
        requests on five runs and 99 and 70 on two, and the vacuous floor of 100
        read the difference as a broken API.
        """
        self._tasks_done += 1
        budget = iteration_budget()
        if budget and self._tasks_done >= budget:
            raise StopUser("the day's task budget is spent")

    _user_counter = 0

    @classmethod
    def _next_index(cls) -> int:
        cls._user_counter += 1
        return cls._user_counter - 1

    def _slo(self, response: Any, p95_ms: int) -> None:
        """The per-request SLO: a 5xx or a 10x-SLO request is a failure."""
        if response.status_code >= 500:
            response.failure(f"{response.status_code}")
        elif response.elapsed.total_seconds() * 1000 > p95_ms * SINGLE_REQUEST_BREACH_X:
            response.failure("over 10x the SLO")

    @task(1)
    def create_run(self) -> None:
        self._another_task()
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
                self._discover_stops()

    def _discover_stops(self) -> None:
        """The day's stop ids, from the run's own stops list.

        The day is seeded before the load run (the intake flow, or SQL as
        the restore drill does). Without a seeded day the ids stay empty and
        the POD and sync tasks step aside - they never hammer ids that do
        not exist, so a healthy API can pass the gate.
        """
        if self.run_id is None:
            return
        with self.client.get(f"/shifts/{self.shift_id}/stops", catch_response=True) as response:
            if response.status_code == 200:
                self.stop_ids = [
                    uuid.UUID(item["id"])
                    for item in response.json()
                    if item.get("status") == "pending"
                ]

    @task(2)
    def read_the_route(self) -> None:
        self._another_task()
        if self.run_id is None:
            return
        with self.client.get(f"/shifts/{self.shift_id}/route", catch_response=True) as response:
            self._slo(response, ROUTE_P95_MS)

    @task(5)
    def list_the_stops(self) -> None:
        self._another_task()
        if self.run_id is None:
            return
        # No separate SLO in RUNBOOK section 8: the stop list shares the
        # sync surface's latency class, so it is held to the same number.
        with self.client.get(f"/shifts/{self.shift_id}/stops", catch_response=True) as response:
            self._slo(response, SYNC_P95_MS)

    @task(10)
    def sync_a_batch(self) -> None:
        self._another_task()
        if self.run_id is None or not self.stop_ids:
            return  # no seeded day: nothing honest to sync
        batch = [
            {
                "id": str(uuid.uuid4()),
                "stop_id": str(random.choice(self.stop_ids)),
                "kind": random.choice(("delivered", "skipped", "failed")),
                "occurred_at": datetime.now(UTC).isoformat(),
            }
            for _ in range(random.randint(2, 8))
        ]
        with self.client.post(
            f"/shifts/{self.shift_id}/events:batch", json=batch, catch_response=True
        ) as response:
            self._slo(response, SYNC_P95_MS)

    @task(1)
    def upload_a_pod(self) -> None:
        self._another_task()
        if self.run_id is None or not self.stop_ids:
            return  # no seeded day: nothing honest to upload against
        pending = [
            stop_id for stop_id in self.stop_ids if stop_id not in self._delivered
        ] or self.stop_ids
        stop_id = random.choice(pending)
        with self.client.post(
            f"/runs/{self.run_id}/stops/{stop_id}/pod",
            files={"image": ("door.jpg", _PNG_BYTES, "image/png")},
            data={"occurred_at": datetime.now(UTC).isoformat()},
            catch_response=True,
        ) as response:
            self._slo(response, POD_P95_MS)
            if response.status_code == 201:
                self._delivered.add(stop_id)


@events.test_stop.add_listener
def assert_the_slos(environment: Any, **_kwargs: Any) -> None:
    """The run's verdict: the SLOs as thresholds, red on breach."""
    failures = 0
    wanted = (
        ("GET", "/route", ROUTE_P95_MS),
        ("GET", "/stops", SYNC_P95_MS),
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
    # The vacuous-green guard (the review's must-fix): a run that greets
    # nothing - no identity, a path mismatch, a dead API, unseeded shifts -
    # measures nothing, and "nothing failed" is not "the SLOs are met".
    # The CI evidence: the broken run lands ~2 requests (two 409s), the
    # seeded healthy run lands ~180. The floor sits between them.
    if total.num_requests < 100:
        environment.process_exit_code = 1
        print(
            f"VACUOUS RUN: only {total.num_requests} requests - the gate needs a seeded, reachable API"
        )
        failures += 1
    elif total.fail_ratio > MAX_ERROR_RATE:
        environment.process_exit_code = 1
        print(f"ERROR BUDGET BREACH: fail ratio {total.fail_ratio:.4f} > {MAX_ERROR_RATE}")
        failures += 1
    if not failures:
        print("SLOs met: the run is green")
