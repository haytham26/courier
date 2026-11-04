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

import threading
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

    def sessions_of(self, driver_id: str) -> list[SessionMemory]:
        """Every shift of one courier."""
        ...

    def lock_for(self, session_id: str) -> threading.Lock:
        """The lock that serialises the turns of one shift (BUG-154)."""
        ...

    @property
    def max_sessions_per_driver(self) -> int:
        """How many shifts one courier may hold open at a time (BUG-151)."""
        ...


class InMemoryStore:
    """The memory of the shifts, in the memory of the process.

    The service is a resource server and the day lives in the courier's
    session; when the process restarts, the day is still on the phone, which
    is where it was kept all along.

    Two bounds, because the store shipped as the production store and nothing
    reclaimed it (BUG-151): the sessions are kept in a bounded LRU (the oldest
    untouched one goes first), and one courier may not open an unbounded number
    of shifts. The per-driver cap is a refusal at the door (the route names
    it), not a silent eviction of a working day.
    """

    #: How many shifts this process holds. The register's probe: 5,000 `POST
    #: /v1/sessions` with no `DELETE` left 5,000 sessions resident.
    MAX_SESSIONS = 1_000

    #: The shifts one courier may hold open at a time (BUG-151).
    MAX_SESSIONS_PER_DRIVER = 20

    def __init__(self) -> None:
        self._sessions: dict[str, SessionMemory] = {}
        self._locks: dict[str, threading.Lock] = {}
        self._locks_guard = threading.Lock()

    @property
    def max_sessions_per_driver(self) -> int:
        """How many shifts one courier may hold open at a time."""
        return self.MAX_SESSIONS_PER_DRIVER

    def get(self, session_id: str) -> SessionMemory | None:
        return self._sessions.get(session_id)

    def save(self, memory: SessionMemory) -> None:
        if memory.id in self._sessions:
            # Touch it: the LRU order follows use, not only creation.
            self._sessions[memory.id] = self._sessions.pop(memory.id)
        self._sessions[memory.id] = memory
        self._evict_while_over_the_cap()

    def _evict_while_over_the_cap(self) -> None:
        """Drop the oldest untouched session while the global bound is exceeded."""
        while len(self._sessions) > self.MAX_SESSIONS:
            oldest = next(iter(self._sessions))
            del self._sessions[oldest]

    def delete(self, session_id: str) -> bool:
        return self._sessions.pop(session_id, None) is not None

    def sessions_of(self, driver_id: str) -> list[SessionMemory]:
        """Every shift of one courier, oldest first."""
        return [item for item in self._sessions.values() if item.driver_id == driver_id]

    def lock_for(self, session_id: str) -> threading.Lock:
        """The one lock that serialises the turns of one shift (BUG-154).

        Two concurrent turns on one session share one mutable `SessionMemory`
        and one `TurnMachine`, so the last write wins and each caller can be
        answered with the other's turn recorded as its instruction. The lock is
        per session and created under a guard, so two threads asking for the
        same shift's lock get the same object.
        """
        with self._locks_guard:
            lock = self._locks.get(session_id)
            if lock is None:
                lock = threading.Lock()
                self._locks[session_id] = lock
            return lock


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

    BUG-149: it used to clear only the two string fields, while the stops, the
    addresses, the hazard, the tip and the earnings stayed in `context` and were
    re-saved on every later turn - the setting's docstring and ADR-007 §6 promise
    "nothing is kept between the turns", so the whole session is let go of (the
    turn machine's history included).
    """
    memory.settings = settings
    if not settings.remember:
        memory.forget()
        memory.turn_machine = TurnMachine()
