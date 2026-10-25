"""Seed the deterministic load-test day: shifts and stops the users claim.

Queue 2, item 2: the load test's users create runs for shifts that must
EXIST (the schema's foreign key), so the CI profile seeds a fixed set of
shifts (each with five pending stops) through the same DATABASE_URL the API
uses. The ids are deterministic (uuid5 of the loadtest namespace), so
`locustfile.py` computes the same ids without reading the database.

Usage (the CI step in .github/workflows/ci.yml):

    python loadtests/seed_day.py --shifts 60 --stops-per-shift 5
"""

from __future__ import annotations

import argparse
import os
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine, text

NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "courier-copilot/loadtest")
"""The namespace of the deterministic load-test ids."""


def loadtest_shift_id(index: int) -> uuid.UUID:
    """The shift id of the index-th seeded courier."""
    return uuid.uuid5(NAMESPACE, f"shift/{index}")


def loadtest_stop_id(index: int, k: int) -> uuid.UUID:
    """The k-th stop of the index-th seeded courier."""
    return uuid.uuid5(NAMESPACE, f"stop/{index}/{k}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the load-test day")
    parser.add_argument("--shifts", type=int, default=60)
    parser.add_argument("--stops-per-shift", type=int, default=5)
    args = parser.parse_args()

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is not set: the seeder runs against the test database")

    engine = create_engine(database_url)
    started = datetime.now(UTC)
    with engine.begin() as connection:
        for index in range(args.shifts):
            shift_id = loadtest_shift_id(index)
            connection.execute(
                text(
                    "INSERT INTO shifts (id, courier_id, started_at) VALUES (:id, :c, :s) "
                    "ON CONFLICT (id) DO NOTHING"
                ),
                {
                    "id": shift_id,
                    "c": f"loadtest-driver-{index}",
                    "s": started - timedelta(minutes=30),
                },
            )
            for k in range(args.stops_per_shift):
                connection.execute(
                    text(
                        "INSERT INTO stops (id, shift_id, sequence, address, latitude, longitude, "
                        "status, priority, parcels) "
                        "VALUES (:id, :shift, :seq, :address, -43.54, 172.60, 'pending', false, 1) "
                        "ON CONFLICT (id) DO NOTHING"
                    ),
                    {
                        "id": loadtest_stop_id(index, k),
                        "shift": shift_id,
                        "seq": k + 1,
                        "address": f"{12 + k} Loadtest Street",
                    },
                )
    print(
        f"seeded {args.shifts} shifts x {args.stops_per_shift} stops "
        f"(ids deterministic from the loadtest namespace)"
    )


if __name__ == "__main__":
    main()
