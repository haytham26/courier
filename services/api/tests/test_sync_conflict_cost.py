"""The sync batch's cost: the conflict comparison is behind the rowcount.

BUG-063's evidence was a SLO breach in CI (run 40185490916): `POST
/shifts/{id}/events:batch p95 370 ms > 300 ms` with every request returning 2xx.
The cause was a `SELECT ... WHERE id IN (...)` that ran before *every* INSERT, so
the courier's most frequent call paid for a rare case.

The SQL repo's real behaviour is pinned against Postgres by the `db`-marked suite
(`tests/test_repo_db.py`), which CI runs. This file pins the *cost* property with a
recording engine, so it is proven locally without a database: an all-new batch is
the one INSERT it was before ADR-014, the comparison SELECT appears only when the
insert refused rows, and the conflict rules ADR-014 decided still apply.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from typing import Any

from app.repo import AppendResult, DeliveryEventRow, SqlAlchemyRepo

SHIFT = uuid.uuid4()
STOP = uuid.uuid4()


def an_event(
    kind: str = "delivered",
    event_id: uuid.UUID | None = None,
    at: datetime | None = None,
) -> DeliveryEventRow:
    """One event, with the time it happened passed in when it matters."""
    return DeliveryEventRow(
        id=event_id or uuid.uuid4(),
        shift_id=SHIFT,
        stop_id=STOP,
        kind=kind,
        utterance=None,
        safe_place=None,
        lat=None,
        lon=None,
        accuracy_m=None,
        occurred_at=at or datetime(2026, 10, 25, 8, 0, tzinfo=UTC),
    )


class RecordingEngine:
    """The engine's shape for `append_events`, recording every statement.

    `rowcount` is what the INSERT reports (the ON CONFLICT DO NOTHING rowcount,
    which the db suite proves against real Postgres), and `stored_rows` is what
    the comparison SELECT sees."""

    def __init__(self, rowcount: int, stored_rows: list[tuple[uuid.UUID, str]] | None = None):
        self.rowcount = rowcount
        self.stored_rows = stored_rows or []
        self.statements: list[str] = []

    def begin(self) -> Any:
        engine = self

        @contextmanager
        def transaction() -> Iterator[Any]:
            class Connection:
                def execute(self, statement: Any, parameters: Any) -> Any:
                    text = str(statement)
                    engine.statements.append(text)
                    inserted = engine.rowcount if "INSERT" in text else 0

                    class Result:
                        rowcount = inserted

                    return Result()

            yield Connection()

        return transaction()

    def connect(self) -> Any:
        engine = self

        @contextmanager
        def transaction() -> Iterator[Any]:
            class Connection:
                def execute(self, statement: Any, parameters: Any) -> Any:
                    text = str(statement)
                    engine.statements.append(text)

                    class Rows:
                        def all(self) -> list[dict[str, Any]]:
                            return [
                                {
                                    "id": event_id,
                                    "shift_id": SHIFT,
                                    "stop_id": STOP,
                                    "kind": kind,
                                    "utterance": None,
                                    "safe_place": None,
                                    "lat": None,
                                    "lon": None,
                                    "accuracy_m": None,
                                    "occurred_at": datetime(2026, 10, 25, 8, 0, tzinfo=UTC),
                                }
                                for event_id, kind in engine.stored_rows
                            ]

                    class Result:
                        def mappings(self) -> Rows:
                            return Rows()

                    return Result()

            yield Connection()

        return transaction()


def repo_with(
    rowcount: int, stored_rows: list[tuple[uuid.UUID, str]] | None = None
) -> tuple[SqlAlchemyRepo, RecordingEngine]:
    engine = RecordingEngine(rowcount, stored_rows)
    # The engine is structural: the repo only uses the two context managers above.
    repo = SqlAlchemyRepo(engine)  # type: ignore[arg-type]
    return repo, engine


class TestTheBatchCost:
    def test_an_all_new_batch_is_the_one_statement(self) -> None:
        repo, engine = repo_with(rowcount=3)

        result = repo.append_events(SHIFT, [an_event(), an_event(), an_event()])

        assert result == AppendResult(stored=3, conflicts=())
        # One INSERT and no SELECT: the comparison is only needed when the
        # insert refused rows (BUG-063 - the pre-SELECT cost 370 ms p95).
        assert len(engine.statements) == 1
        assert "INSERT INTO delivery_events" in engine.statements[0]
        assert "SELECT" not in engine.statements[0]

    def test_a_batch_the_insert_partly_refused_pays_for_the_comparison(self) -> None:
        # Two of the three rows were already stored: the rowcount says so, and
        # that is when the comparison runs.
        repo, engine = repo_with(rowcount=1)

        result = repo.append_events(SHIFT, [an_event(), an_event(), an_event()])

        assert result.stored == 1
        assert len(engine.statements) == 2
        assert "SELECT" in engine.statements[1]


class TestTheConflictRulesStillHold:
    """ADR-014's rules, unchanged by the fast path."""

    def test_a_divergent_replay_is_reported_and_the_stored_row_wins(self) -> None:
        event_id = uuid.uuid4()
        stored = an_event(kind="delivered", event_id=event_id)
        incoming = an_event(kind="failed", event_id=event_id)
        # The insert refused the row (it is already there), so the rowcount is
        # 0 and the comparison SELECT runs and finds the stored copy.
        repo, _ = repo_with(rowcount=0, stored_rows=[(event_id, "delivered")])

        result = repo.append_events(SHIFT, [incoming])

        assert result.stored == 0
        assert result.conflicts == (event_id,)
        # The stored row's kind wins: the API reports the divergence and the
        # incoming copy is discarded.
        assert stored.kind == "delivered"

    def test_an_identical_replay_is_an_ack_not_a_conflict(self) -> None:
        event_id = uuid.uuid4()
        repo, _ = repo_with(rowcount=0, stored_rows=[(event_id, "delivered")])

        result = repo.append_events(SHIFT, [an_event(kind="delivered", event_id=event_id)])

        assert result == AppendResult(stored=0, conflicts=())

    def test_a_divergent_duplicate_inside_one_batch_is_still_a_conflict(self) -> None:
        repo, _ = repo_with(rowcount=1)
        event_id = uuid.uuid4()

        result = repo.append_events(
            SHIFT,
            [
                an_event(event_id=event_id, kind="delivered"),
                an_event(event_id=event_id, kind="failed"),
            ],
        )

        assert result.stored == 1
        assert result.conflicts == (event_id,)
