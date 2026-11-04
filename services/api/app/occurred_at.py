"""The one rule for a delivery event's `occurred_at` (ADR-014 §3, BUG-143/144).

Two paths write `DeliveryEventRow`, and they disagreed about what a timestamp
is: the sync event's validator carried the naive check and the clock bounds,
while the POD upload's hand-rolled gate carried neither. A POD photo stamped
two years ahead was accepted and a sync event with the same stamp refused.

The naive check and the bounds live here, once, in the words a caller can act
on. POD stays exempt from the **bounds** - ADR-014 §3 says so, because
`pod_captured` never flips a stop and the photo is evidence the upload
timestamp does not order - and the exemption is a test rather than a comment,
so the next kind added to both paths cannot drift.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

#: The shape a moment must have, in the words of the field's own contract: an
#: ISO-8601 stamp that names its offset, which is what every phone already
#: sends (the app's own gate in `apps/mobile/src/sync/eventSchema.ts` requires
#: the suffix too).
OCCURRED_AT_EXAMPLE = "2026-10-30T08:00:00+13:00"
NAIVE_MESSAGE = (
    f"occurred_at must carry its timezone: an ISO-8601 moment with an offset, "
    f"e.g. {OCCURRED_AT_EXAMPLE}"
)
FUTURE_HOURS = 1
PAST_DAYS = 7


def require_aware_occurred_at(field: str, value: datetime) -> None:
    """The naive check, with the words that name the field and the shape.

    BUG-143: the old texts said "occurred_at must carry its timezone" and "the
    phone's clock is wrong", which told a courier whose stamp was perfectly
    well-formed that his clock was broken. The field is named, and the expected
    shape is shown.
    """
    if value.tzinfo is None or value.tzinfo.utcoffset(value) is None:
        raise ValueError(
            f"{field} must carry its timezone: an ISO-8601 moment with an offset, e.g. {OCCURRED_AT_EXAMPLE}"
        )


def bound_occurred_at(field: str, value: datetime, now: datetime | None = None) -> None:
    """The clock bounds (ADR-014 §3), in the same words."""
    moment = now or datetime.now(UTC)
    if value > moment + timedelta(hours=FUTURE_HOURS):
        raise ValueError(
            f"{field} is more than an hour in the future: send a moment within an hour of now, "
            f"e.g. {OCCURRED_AT_EXAMPLE}"
        )
    if value < moment - timedelta(days=PAST_DAYS):
        raise ValueError(
            f"{field} is more than 7 days old: the log is stale or the clock is wrong, and the "
            f"earliest moment it accepts is {(moment - timedelta(days=PAST_DAYS)).isoformat()}"
        )
