"""The memory of the shift.

Three kinds of memory, and they live in three different places:

- the **day's context** (what has been done, what is next, what was said)
  belongs to the shift and lives in the session;
- the **preferences** (the verbosity, the voice, the quiet mode) belong to the
  courier and live on the phone: the app sends them with every turn and the
  service never writes them down;
- the **learned runs** (the door spots, the usual order, the service times)
  are learned on the device first and travel with the turn.

The privacy controls are here too: a courier can turn the memory off, and a
courier can make the service forget a shift.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Protocol

from .models import LearnedRuns, RunContext, VoiceSettings
from .turns import TurnMachine


@dataclass
class SessionMemory:
    """What the service remembers about one shift."""

    id: str
    driver_id: str
    shift_id: str | None = None
    created_at: float = field(default_factory=time.time)
    settings: VoiceSettings = field(default_factory=VoiceSettings)
    context: RunContext = field(default_factory=RunContext)
    last_instruction: str | None = None
    last_question: str | None = None
    turns: int = 0
    learned: LearnedRuns = field(default_factory=LearnedRuns)
    turn_machine: TurnMachine = field(default_factory=TurnMachine)

    def forget(self) -> None:
        """Everything about this shift is let go of."""
        self.context = RunContext()
        self.last_instruction = None
        self.last_question = None
        self.learned = LearnedRuns()


class MemoryStore(Protocol):
    """Where the memory of a shift is kept."""

    def get(self, session_id: str) -> SessionMemory | None:
        """The memory of a shift, or None when there is none."""
        ...

    def save(self, memory: SessionMemory) -> None:
        """Keeps the memory of a shift."""
        ...

    def delete(self, session_id: str) -> bool:
        """Removes the memory of a shift. Returns whether there was one."""
        ...


class InMemoryStore:
    """The memory of the shifts, in the memory of the process.

    The service is a resource server and the day lives in the courier's
    session; when the process restarts, the day is still on the phone, which
    is where it was kept all along.
    """

    def __init__(self) -> None:
        self._sessions: dict[str, SessionMemory] = {}

    def get(self, session_id: str) -> SessionMemory | None:
        return self._sessions.get(session_id)

    def save(self, memory: SessionMemory) -> None:
        self._sessions[memory.id] = memory

    def delete(self, session_id: str) -> bool:
        return self._sessions.pop(session_id, None) is not None

    def sessions_of(self, driver_id: str) -> list[SessionMemory]:
        """Every shift of one courier."""
        return [item for item in self._sessions.values() if item.driver_id == driver_id]


def new_session(driver_id: str, shift_id: str | None = None) -> SessionMemory:
    """A new shift of memory."""
    return SessionMemory(
        id=str(uuid.uuid4()),
        driver_id=driver_id,
        shift_id=shift_id,
    )


def apply_settings(memory: SessionMemory, settings: VoiceSettings) -> None:
    """The settings of the courier are honoured.

    When the courier has turned the memory off, nothing is kept between the
    turns: the day is still on the phone, the service simply stops holding it.
    """
    memory.settings = settings
    if not settings.remember:
        memory.last_instruction = None
        memory.last_question = None
