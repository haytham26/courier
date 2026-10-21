"""The money a courier made on a shift.

Every amount is a `Decimal` and never a float, and the JSON keeps two
decimals.

The rate card is a placeholder: the founder sets the real carrier rates in
`RATE_CARD` (the numbers are listed in `docs/FOUNDER_TODO.md`). The card is
GST-inclusive, the project rule for every price shown to a courier, and the
GST is shown separately with the IRD method: the GST in a GST-inclusive amount
is the amount times three divided by twenty-three, which is exactly 15 % of
the GST-exclusive base (IRD, GST guide IR375).
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal

from .repo import ShiftEvent

CURRENCY = "NZD"
CENT = Decimal("0.01")
WHOLE_SECOND = Decimal("1")
# The IRD method for a GST-inclusive amount: amount x 3 / 23.
GST_MULTIPLIER = Decimal("3")
GST_DIVISOR = Decimal("23")

# The kinds that earn money, the kinds that fail a delivery and the kind that
# skips a stop (the event kinds of packages/shared/src/types.ts).
EARNING_KINDS = frozenset({"delivered", "left_at"})
FAILED_KINDS = frozenset({"failed_access", "failed_dog", "failed_other"})
SKIPPED_KINDS = frozenset({"skipped"})
ARRIVAL_KIND = "nav_arrived"


@dataclass(frozen=True)
class RateCard:
    """What a carrier pays for one stop and for each parcel in it."""

    per_stop: Decimal
    per_parcel: Decimal


# The rate card. The founder sets the real carrier rates here before the first
# paid beta: a per-stop rate and a per-parcel bonus, both GST-inclusive NZD.
RATE_CARD = RateCard(per_stop=Decimal("1.50"), per_parcel=Decimal("0.20"))


@dataclass(frozen=True)
class EarningsLine:
    """What one stop earned."""

    stop_id: uuid.UUID
    amount: Decimal
    kind: str


@dataclass(frozen=True)
class ShiftEarnings:
    """The money of one shift."""

    currency: str
    delivered: int
    failed: int
    skipped: int
    gross: Decimal
    gst: Decimal
    net: Decimal
    rate: Decimal
    breakdown: list[EarningsLine]


@dataclass(frozen=True)
class FailedStop:
    """A stop the courier could not deliver."""

    stop_id: uuid.UUID
    kind: str
    reason: str | None
    occurred_at: datetime


@dataclass(frozen=True)
class ShiftSummary:
    """The end-of-day summary of one shift."""

    shift_id: uuid.UUID
    date: date
    currency: str
    delivered: int
    failed: int
    skipped: int
    gross: Decimal
    gst: Decimal
    net: Decimal
    average_delivery_seconds: int | None
    success_rate: float
    failed_stops: list[FailedStop]


def money(value: Decimal) -> Decimal:
    """Rounds to cents, half up (the way New Zealand money rounds)."""
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def gst_component(gross: Decimal) -> Decimal:
    """The GST inside a GST-inclusive amount (IRD: amount x 3 / 23)."""
    return gross * GST_MULTIPLIER / GST_DIVISOR


def stop_amount(parcel_count: int, rate_card: RateCard = RATE_CARD) -> Decimal:
    """What one delivered stop earns: the stop rate plus the parcel bonus."""
    return money(rate_card.per_stop + rate_card.per_parcel * parcel_count)


def outcomes(events: Sequence[ShiftEvent]) -> list[ShiftEvent]:
    """The final outcome of every stop that was attempted, oldest first.

    A delivery always wins: a stop that was delivered and then recorded as
    failed (a mis-tap in the app) still earns the money.
    """
    final: dict[uuid.UUID, ShiftEvent] = {}
    for event in sorted(events, key=lambda item: item.occurred_at):
        if event.kind in EARNING_KINDS:
            final[event.stop_id] = event
        elif event.kind in FAILED_KINDS or event.kind in SKIPPED_KINDS:
            current = final.get(event.stop_id)
            if current is None or current.kind not in EARNING_KINDS:
                final[event.stop_id] = event
    return sorted(final.values(), key=lambda item: item.occurred_at)


def compute_earnings(
    events: Sequence[ShiftEvent],
    rate_card: RateCard = RATE_CARD,
) -> ShiftEarnings:
    """What the shift earned, and the GST that sits inside it."""
    lines: list[EarningsLine] = []
    delivered = 0
    failed = 0
    skipped = 0
    gross = Decimal("0.00")
    for outcome in outcomes(events):
        if outcome.kind in EARNING_KINDS:
            delivered += 1
            amount = stop_amount(outcome.parcel_count, rate_card)
            gross += amount
        else:
            amount = Decimal("0.00")
            if outcome.kind in FAILED_KINDS:
                failed += 1
            else:
                skipped += 1
        lines.append(EarningsLine(stop_id=outcome.stop_id, amount=amount, kind=outcome.kind))
    total = money(gross)
    gst = money(gst_component(total))
    return ShiftEarnings(
        currency=CURRENCY,
        delivered=delivered,
        failed=failed,
        skipped=skipped,
        gross=total,
        gst=gst,
        net=total - gst,
        rate=rate_card.per_stop,
        breakdown=lines,
    )


def _seconds_between(start: datetime, end: datetime) -> Decimal:
    """The exact number of seconds between two moments (never a float)."""
    delta = end - start
    return (
        Decimal(delta.days) * Decimal(86400)
        + Decimal(delta.seconds)
        + Decimal(delta.microseconds) / Decimal(1000000)
    )


def average_delivery_seconds(
    events: Sequence[ShiftEvent],
    finals: Sequence[ShiftEvent] | None = None,
) -> int | None:
    """The average time from arriving at the door to walking away from it.

    A stop without an arrival event is left out of the average; when no stop
    has one the average is unknown (None), not zero.
    """
    arrivals: dict[uuid.UUID, datetime] = {}
    for event in events:
        if event.kind != ARRIVAL_KIND:
            continue
        first = arrivals.get(event.stop_id)
        if first is None or event.occurred_at < first:
            arrivals[event.stop_id] = event.occurred_at
    durations: list[Decimal] = []
    for outcome in finals if finals is not None else outcomes(events):
        if outcome.kind not in EARNING_KINDS:
            continue
        arrived = arrivals.get(outcome.stop_id)
        if arrived is None:
            continue
        seconds = _seconds_between(arrived, outcome.occurred_at)
        if seconds < 0:
            continue
        durations.append(seconds)
    if not durations:
        return None
    average = sum(durations, Decimal("0")) / Decimal(len(durations))
    return int(average.quantize(WHOLE_SECOND, rounding=ROUND_HALF_UP))


def compute_summary(
    shift_id: uuid.UUID,
    shift_date: date,
    events: Sequence[ShiftEvent],
    rate_card: RateCard = RATE_CARD,
) -> ShiftSummary:
    """The end-of-day summary: the totals, the pace and what went wrong."""
    earnings = compute_earnings(events, rate_card)
    finals = outcomes(events)
    failed_stops = [
        FailedStop(
            stop_id=outcome.stop_id,
            kind=outcome.kind,
            reason=outcome.reason,
            occurred_at=outcome.occurred_at,
        )
        for outcome in finals
        if outcome.kind in FAILED_KINDS
    ]
    attempts = earnings.delivered + earnings.failed
    rate = Decimal(earnings.delivered) / Decimal(attempts) if attempts else Decimal("0")
    return ShiftSummary(
        shift_id=shift_id,
        date=shift_date,
        currency=earnings.currency,
        delivered=earnings.delivered,
        failed=earnings.failed,
        skipped=earnings.skipped,
        gross=earnings.gross,
        gst=earnings.gst,
        net=earnings.net,
        average_delivery_seconds=average_delivery_seconds(events, finals),
        success_rate=float(rate.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)),
        failed_stops=failed_stops,
    )
