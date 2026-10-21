"""The driving-safe rules.

A courier driving a van can look at nothing. The rules here are short and
they are enforced in code, not in a prompt that a model may forget:

  - while the van is moving, the voice says **at most eight words**;
  - while the van is moving, the voice never asks for a touch of the screen;
  - the quiet mode says nothing at all except what keeps the courier safe;
  - the essentials mode says the essentials and no more;
  - a call on the phone wins over the voice, and music and navigation make the
    voice wait its turn.

Every one of these has a test. The tests are the contract; this file is the
implementation of that contract.
"""

from __future__ import annotations

import re
from typing import Literal

from .models import AudioFocus, Frozen, Verbosity

#: The word limit while the van is moving (MASTER_EXECUTION section 12).
MAX_WORDS_WHILE_MOVING = 8

#: The speed above which the courier counts as moving (the same rule the
#: copilot prompt uses: above 15 km/h nothing is asked).
MOVING_SPEED_KMH = 15.0

#: The words that mean the voice wants a finger on the screen.
_SCREEN_DEMAND = re.compile(
    r"\b(tap|swipe|press|click|touch|look at the screen|on the screen|"
    r"open the app|on your phone|your phone|screen)\b",
    re.IGNORECASE,
)

#: The words a courier says when they clear their throat, not words.
FILLERS = frozenset({"mm", "mmh", "hmm", "mhm", "uh", "um", "erm", "ah", "eh", "huh", "m'"})

#: The clauses a spoken line is made of.
_CLAUSE_SPLIT = re.compile(r"(?<=[.!?;])\s+|\s*,\s+|\s+-\s+")

#: The sentences a spoken line is made of.
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


class SafetyOutcome(Frozen):
    """What the safety rules did to a reply."""

    speech: str = ""
    priority: Literal["now", "queue"] = "now"
    suppressed: bool = False
    reason: str | None = None


def is_moving(speed_kmh: float) -> bool:
    """Whether the van is moving."""
    return speed_kmh > MOVING_SPEED_KMH


def word_count(text: str) -> int:
    """How many words a spoken line has.

    A hyphenated pair is one word ("mid-rack"), and a number with a unit is
    one word ("42B"), because that is how the voice says it.
    """
    cleaned = re.sub(r"[.!?;,]", " ", text)
    return len([word for word in cleaned.split() if word])


def real_word_count(text: str) -> int:
    """How many words the courier really said.

    The fillers ("mm", "uh") are what a cough sounds like in a transcript, so
    they do not count: a cough must not stop a sentence that is being spoken.
    """
    words = [word.strip(".,!?;:").lower() for word in text.split()]
    return len([word for word in words if word and word not in FILLERS])


def demands_a_tap(text: str) -> bool:
    """Whether the line asks the courier to touch the screen."""
    return bool(_SCREEN_DEMAND.search(text))


def strip_screen_demands(text: str) -> str:
    """Takes the sentences that want a touch of the screen out of the line."""
    sentences = _SENTENCE_SPLIT.split(text)
    kept = [sentence for sentence in sentences if not demands_a_tap(sentence)]
    return " ".join(part.strip() for part in kept if part.strip())


def _clauses_within(text: str, limit: int) -> str:
    """The leading clauses of the line that fit in the limit."""
    kept: list[str] = []
    for clause in _CLAUSE_SPLIT.split(text):
        piece = clause.strip()
        if piece == "":
            continue
        if word_count(" ".join([*kept, piece])) > limit:
            break
        kept.append(piece)
    return " ".join(kept)


def enforce_word_limit(text: str, limit: int = MAX_WORDS_WHILE_MOVING) -> str:
    """Shortens the line to the word limit.

    The line is cut at a clause boundary first, so the voice says a whole
    thought. Only when a single clause is longer than the limit is it cut at
    the limit itself: a half sentence is better than a sentence that cannot be
    listened to while driving.
    """
    trimmed = text.strip()
    if trimmed == "" or word_count(trimmed) <= limit:
        return trimmed

    clauses = _clauses_within(trimmed, limit)
    if clauses:
        return clauses
    return " ".join(trimmed.split()[:limit])


def tidy(text: str) -> str:
    """The line as it is spoken: no trailing space, no doubled punctuation."""
    trimmed = " ".join(text.split())
    trimmed = re.sub(r"\s+([.!?;])", r"\1", trimmed)
    trimmed = re.sub(r"([.!?;])\1+", r"\1", trimmed)
    return trimmed.strip()


def quiet_reply(speech: str) -> str:
    """The quiet version of a line: the words, without the extras."""
    return tidy(enforce_word_limit(strip_screen_demands(speech), MAX_WORDS_WHILE_MOVING))


def apply_safety(
    speech: str,
    *,
    moving: bool,
    quiet_mode: bool = False,
    essentials_only: bool = False,
    audio_focus: AudioFocus = AudioFocus.NORMAL,
    verbosity: Verbosity = Verbosity.NORMAL,
    essential: bool = False,
) -> SafetyOutcome:
    """Applies the driving-safe rules to a line.

    `essential` marks the lines that are allowed through the quiet mode: the
    next stop, an approach, a hazard, a safety alert.
    """
    if audio_focus is AudioFocus.CALL:
        # A call on the phone wins. The courier will hear the voice again.
        return SafetyOutcome(speech="", priority="now", suppressed=True, reason="a_call_is_on")

    cleaned = strip_screen_demands(speech) if moving else speech
    cleaned = tidy(cleaned)

    if quiet_mode and not essential:
        return SafetyOutcome(speech="", priority="now", suppressed=True, reason="quiet_mode")

    if moving or essentials_only and not essential:
        cleaned = enforce_word_limit(cleaned, MAX_WORDS_WHILE_MOVING)

    priority: Literal["now", "queue"] = "now"
    if audio_focus in (AudioFocus.MUSIC, AudioFocus.NAVIGATION):
        # The music and the navigation have the road. The voice waits.
        priority = "queue"

    if verbosity is Verbosity.MINIMAL and not moving and not essential:
        cleaned = enforce_word_limit(cleaned, 6)

    return SafetyOutcome(speech=cleaned, priority=priority, suppressed=False)
