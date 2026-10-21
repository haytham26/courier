"""The HTTP layer of the earnings; the money rules live in `app/earnings.py`.

A shift always belongs to one courier, so a courier who asks about a shift
that is not theirs gets the same 404 as for a shift that does not exist.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from .auth.jwks import AuthPrincipal, get_current_principal
from .earnings import ShiftEarnings, ShiftSummary, compute_earnings, compute_summary
from .repo import Repo, ShiftRecord, get_repo

router = APIRouter(tags=["earnings"])


class EarningsLineModel(BaseModel):
    """What one stop earned."""

    stop_id: uuid.UUID
    amount: Decimal
    kind: str


class EarningsResponse(BaseModel):
    """The money of one shift. The amounts are strings with two decimals."""

    currency: str
    delivered: int
    failed: int
    skipped: int
    gross: Decimal
    gst: Decimal
    net: Decimal
    rate: Decimal
    breakdown: list[EarningsLineModel]


class FailedStopModel(BaseModel):
    """A stop the courier could not deliver."""

    stop_id: uuid.UUID
    kind: str
    reason: str | None
    occurred_at: datetime


class EarningsSummaryResponse(BaseModel):
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
    failed_stops: list[FailedStopModel]


def _own_shift(shift_id: uuid.UUID, principal: AuthPrincipal, repo: Repo) -> ShiftRecord:
    """The shift, when it is the courier's own shift (404 otherwise)."""
    shift = repo.get_shift(shift_id)
    if shift is None or shift.courier_id != principal.user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
    return shift


@router.get("/shifts/{shift_id}/earnings", response_model=EarningsResponse)
def shift_earnings(
    shift_id: uuid.UUID,
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
) -> EarningsResponse:
    """What the courier earned on this shift, with the GST shown separately."""
    _own_shift(shift_id, principal, repo)
    earnings: ShiftEarnings = compute_earnings(repo.list_shift_events(shift_id))
    return EarningsResponse(
        currency=earnings.currency,
        delivered=earnings.delivered,
        failed=earnings.failed,
        skipped=earnings.skipped,
        gross=earnings.gross,
        gst=earnings.gst,
        net=earnings.net,
        rate=earnings.rate,
        breakdown=[
            EarningsLineModel(stop_id=line.stop_id, amount=line.amount, kind=line.kind)
            for line in earnings.breakdown
        ],
    )


@router.get("/shifts/{shift_id}/earnings/summary", response_model=EarningsSummaryResponse)
def shift_earnings_summary(
    shift_id: uuid.UUID,
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
) -> EarningsSummaryResponse:
    """The end-of-day summary: the totals, the pace and what went wrong."""
    shift = _own_shift(shift_id, principal, repo)
    summary: ShiftSummary = compute_summary(
        shift_id, shift.shift_date, repo.list_shift_events(shift_id)
    )
    return EarningsSummaryResponse(
        shift_id=summary.shift_id,
        date=summary.date,
        currency=summary.currency,
        delivered=summary.delivered,
        failed=summary.failed,
        skipped=summary.skipped,
        gross=summary.gross,
        gst=summary.gst,
        net=summary.net,
        average_delivery_seconds=summary.average_delivery_seconds,
        success_rate=summary.success_rate,
        failed_stops=[
            FailedStopModel(
                stop_id=stop.stop_id,
                kind=stop.kind,
                reason=stop.reason,
                occurred_at=stop.occurred_at,
            )
            for stop in summary.failed_stops
        ],
    )
