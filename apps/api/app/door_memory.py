"""The door memory: what the courier taught the app about an address.

The memory belongs to the courier who wrote it. It is keyed by the courier (the
auth subject) and the normalised address key, so a second courier working the
same street never reads the first one's notes.

The address key is the normalised full address from `app/nz_address.py` (the
house number, the street and the suburb in lower case), the same key the
`locations` table stores.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from .auth.jwks import AuthPrincipal, get_current_principal
from .repo import Repo, StopRecord, get_repo

router = APIRouter(tags=["door memory"])


class DoorMemoryBody(BaseModel):
    """What the courier says about the door."""

    note: str | None = None
    safe_place: str | None = None


class DoorMemoryResponse(BaseModel):
    """The memory the API keeps for the courier and the address."""

    address_key: str
    note: str | None
    safe_place: str | None
    updated_at: datetime


def _own_stop(stop_id: uuid.UUID, principal: AuthPrincipal, repo: Repo) -> StopRecord:
    """The stop, when it is the courier's own stop (404 otherwise)."""
    stop = repo.get_stop(stop_id)
    if stop is None or stop.courier_id != principal.user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stop not found")
    return stop


@router.post("/stops/{stop_id}/door-memory", response_model=DoorMemoryResponse)
def save_door_memory(
    stop_id: uuid.UUID,
    body: DoorMemoryBody,
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
) -> DoorMemoryResponse:
    """Writes what the courier remembers about the door of this address."""
    stop = _own_stop(stop_id, principal, repo)
    memory = repo.save_door_memory(principal.user_id, stop.address_key, body.note, body.safe_place)
    return DoorMemoryResponse(
        address_key=memory.address_key,
        note=memory.note,
        safe_place=memory.safe_place,
        updated_at=memory.updated_at,
    )


@router.get("/stops/{stop_id}/door-memory", response_model=DoorMemoryResponse)
def read_door_memory(
    stop_id: uuid.UUID,
    principal: AuthPrincipal = Depends(get_current_principal),
    repo: Repo = Depends(get_repo),
) -> DoorMemoryResponse:
    """Reads what the courier remembers about the door of this address."""
    stop = _own_stop(stop_id, principal, repo)
    memory = repo.get_door_memory(principal.user_id, stop.address_key)
    if memory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No door memory for this address",
        )
    return DoorMemoryResponse(
        address_key=memory.address_key,
        note=memory.note,
        safe_place=memory.safe_place,
        updated_at=memory.updated_at,
    )
