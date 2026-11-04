"""The pre-classifier: the free gate in front of the paid turn (MASTER §22-A).

The clean-room spec (`docs/research/2026/andee-cleanroom-spec.md`, technique A)
asks for three properties, and this module is all three:

1. **A closed set of outcomes.** `TurnRoute` has three members and the
   classifier's job is routing, not solving: it decides whether a turn needs the
   expensive path at all, never what the answer says.
2. **A free gate in front of the paid gate.** `route_turn` is pure and local: no
   model call, no gateway, no run fetch. A command the offline brain already
   knows - and whose answer does not depend on the day - is answered without
   either, because the paid path's first act is assembling the day (an HTTP call
   to the API) and its second is calling the model.
3. **Silence is a first-class outcome with its reason recorded.** An empty turn
   routes IGNORE with "nothing was said" rather than falling through to a model
   call that would answer nothing.

The routed outcome is written on the turn's answer (`TurnResponse.gate`), so the
routing decision is reviewable after the fact rather than assumed - the spec's
"things it chose not to act on are visible after the fact".
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import StrEnum

from .models import RunContext, VoiceAction
from .offline_brain import parse_command

#: The commands whose answer does not depend on the day: the gate may answer
#: them without the run context (so without the API round trip). The
#: context-dependent ones - how many stops are left, where am I - read the day
#: the phone already holds, so they stay on the full path where the context is
#: assembled once.
CONTEXT_FREE_COMMANDS = frozenset(
    {
        "mark_delivered",
        "mark_failed",
        "skip_stop",
        "add_stop",
        "add_location_note",
        "start_break",
        "end_break",
    }
)

#: A turn with no words in it: not a command, not a conversation, nothing to
#: answer. The gate refuses to spend a model call on it.
_NO_WORDS = re.compile(r"^[\s.,!?:;'\"-]*$")


class TurnRoute(StrEnum):
    """The closed outcome set of the gate."""

    #: A known command: answered by the offline brain, no model call.
    FREE = "free"
    #: Nothing was said that needed an answer.
    IGNORE = "ignore"
    #: The expensive turn: context assembly and a model call.
    FULL = "full"


@dataclass(frozen=True)
class RoutedTurn:
    """One routing decision: the route, why, and the command it found."""

    route: TurnRoute
    reason: str
    command: VoiceAction | None = None


def route_turn(
    transcript: str, *, context: RunContext | None = None
) -> RoutedTurn:
    """Route one turn before anything is assembled or called.

    The `context` is accepted so a caller that already holds it pays nothing to
    pass it, and ignored: the gate's answer must not depend on the day (that
    dependency is exactly what makes a turn full).
    """
    del context  # see the docstring: the gate never reads the day
    said = (transcript or "").strip()
    if _NO_WORDS.match(said):
        return RoutedTurn(TurnRoute.IGNORE, "nothing was said")
    command = parse_command(said)
    if command is not None and command.type in CONTEXT_FREE_COMMANDS:
        return RoutedTurn(
            TurnRoute.FREE,
            f"the offline brain knows this command ({command.type}): no model call, no day fetch",
            command,
        )
    if command is not None:
        return RoutedTurn(
            TurnRoute.FULL,
            f"the command {command.type} reads the day the phone holds: the full path assembles it once",
        )
    return RoutedTurn(TurnRoute.FULL, "not a known command: the conversation is the model's")
