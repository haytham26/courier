"""The conversational layer: the questions about the run and the driver's data.

The courier asks a question in the middle of a delivery and expects an
answer, not a form. This module answers the questions the day's data can
answer, keeps the thread of the conversation (so "no, seventeen" corrects the
last answer instead of starting a new one) and asks one short question only
when it has to.

The answers are built from the run context, and the run context comes from the
Courier API with the courier's own token, so a courier can only ever hear
about their own day.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .models import RunContext, Stop, VoiceAction
from .proactive import spoken_size

#: The questions the run can answer.
HOW_MANY_LEFT = re.compile(r"\bhow many\b.*\b(left|to go|remaining|left to do)\b")
WHAT_IS_NEXT = re.compile(r"\b(what'?s|what is|whats)\s+(next|after this|after)\b")
WHERE_AM_I = re.compile(r"\bwhere am i\b|\bwhich stop\b")
WHERE_IS_THE_PARCEL = re.compile(r"\bwhere(?:'s| is)\s+(the\s+)?(parcel|box|mail|package)\b")
HOW_MUCH_EARNED = re.compile(r"\bhow much\b.*\b(earn|paid|made|money)\b")
HOW_IS_THE_DAY = re.compile(r"\bhow(?:'s| is)\s+the day\b|\bhow are you going\b")
WHEN_DONE = re.compile(r"\bwhen (do i|will i|am i)\b.*\b(finish|done|home)\b")
WHAT_TIME = re.compile(r"\bwhat time\b|\bwhat'?s the time\b")
REPEAT = re.compile(r"^\s*(repeat|say again|what)\s*\??\s*$")
STAY_QUIET = re.compile(r"\b(be quiet|stop talking|quiet mode)\b")
BE_CHATTY = re.compile(r"\b(be chatty|talk more)\b")
BE_BRIEF = re.compile(r"\b(be brief|less talking|shut up)\b")
CORRECTION = re.compile(r"\bno,?\s+(?P<number>[\w-]+)\b|\bnot\s+(?P<number2>[\w-]+)\b")
A_NUMBER = re.compile(r"^\s*(?P<number>[\w-]+)\s*$")


@dataclass(frozen=True)
class Answer:
    """What the voice answers, and what it does."""

    speech: str
    action: VoiceAction | None = None
    question: str | None = None
    asks: str | None = None


def _spoken_number(text: str) -> str:
    """The number as it is said: "17" stays "17"."""
    return text.strip()


def _find_stop_by_parcel(context: RunContext, transcript: str) -> Stop | None:
    """The stop whose parcel is the one the courier asked about."""
    wanted = transcript.lower()
    for stop in context.stops:
        if stop.parcel_for and stop.parcel_for.lower() in wanted:
            return stop
    return None


def _repeat(said: str, context: RunContext, last_instruction: str | None) -> Answer | None:
    """The repeat of the last instruction."""
    if not REPEAT.match(said):
        return None
    if last_instruction:
        return Answer(speech=last_instruction, question="repeat")
    return Answer(speech="nothing to repeat yet", question="repeat")


def _quiet(said: str, context: RunContext, last_instruction: str | None) -> Answer | None:
    """The quiet mode, asked for by voice."""
    if not STAY_QUIET.search(said):
        return None
    return Answer(
        speech="quiet mode on",
        action=VoiceAction(type="set_quiet_mode", on=True),
        question="quiet_mode",
    )


def _verbosity(said: str, context: RunContext, last_instruction: str | None) -> Answer | None:
    """The verbosity, asked for by voice."""
    if BE_CHATTY.search(said):
        return Answer(
            speech="chatty it is",
            action=VoiceAction(type="set_verbosity", text="chatty"),
            question="verbosity",
        )
    if BE_BRIEF.search(said):
        return Answer(
            speech="I'll keep it short",
            action=VoiceAction(type="set_verbosity", text="minimal"),
            question="verbosity",
        )
    return None


def _how_many(said: str, context: RunContext, last_instruction: str | None) -> Answer | None:
    """How many stops are left."""
    if not HOW_MANY_LEFT.search(said):
        return None
    return Answer(speech=f"{context.left_count} stops left.", question="how_many_left")


def _what_next(said: str, context: RunContext, last_instruction: str | None) -> Answer | None:
    """The stop that is next, and the one after it."""
    if not WHAT_IS_NEXT.search(said):
        return None
    upcoming = context.next_stop
    if upcoming is None:
        return Answer(speech="that's the last stop.", question="next_stop")
    after = context.stops_after_next
    line = f"next: {upcoming.spoken_address}"
    if after:
        line += f", then {after[0].spoken_address}"
    return Answer(speech=line + ".", question="next_stop")


def _where_am_i(said: str, context: RunContext, last_instruction: str | None) -> Answer | None:
    """Where the van is."""
    if not WHERE_AM_I.search(said):
        return None
    current = context.current_stop
    if current is None:
        return Answer(speech="you're between stops.", question="where_am_i")
    return Answer(speech=f"you're at {current.spoken_address}.", question="where_am_i")


def _where_parcel(said: str, context: RunContext, last_instruction: str | None) -> Answer | None:
    """Where a parcel is in the van."""
    if not WHERE_IS_THE_PARCEL.search(said):
        return None
    stop = _find_stop_by_parcel(context, said)
    if stop is None:
        return Answer(speech="I can't find that parcel.", question="parcel_location")
    zone = " ".join(part for part in (spoken_size(stop.size_class), stop.van_zone) if part)
    if not zone:
        return Answer(speech="it's not in the van list.", question="parcel_location")
    return Answer(speech=f"{zone}, {stop.spoken_address}.", question="parcel_location")


def _how_much(said: str, context: RunContext, last_instruction: str | None) -> Answer | None:
    """What the courier has earned today."""
    if not HOW_MUCH_EARNED.search(said):
        return None
    if context.earnings_nzd is None:
        return Answer(speech="I can't see today's pay yet.", question="earnings")
    return Answer(speech=f"{context.earnings_nzd:.2f} dollars so far.", question="earnings")


def _how_the_day(said: str, context: RunContext, last_instruction: str | None) -> Answer | None:
    """How the day is going."""
    if not HOW_IS_THE_DAY.search(said):
        return None
    return Answer(
        speech=f"{context.done_count} done, {context.left_count} to go.",
        question="how_is_the_day",
    )


def _when_done(said: str, context: RunContext, last_instruction: str | None) -> Answer | None:
    """When the day is finished."""
    if not WHEN_DONE.search(said):
        return None
    if not context.eta:
        return Answer(speech="I don't have an end time yet.", question="eta")
    return Answer(speech=f"you should be done by {context.eta}.", question="eta")


def _what_time(said: str, context: RunContext, last_instruction: str | None) -> Answer | None:
    """What time it is."""
    if not WHAT_TIME.search(said):
        return None
    if not context.local_time:
        return Answer(speech="I can't see the time.", question="time")
    return Answer(speech=f"it's {context.local_time}.", question="time")


#: The questions of the run, in the order they are read.
HANDLERS = (
    _repeat,
    _quiet,
    _verbosity,
    _how_many,
    _what_next,
    _where_am_i,
    _where_parcel,
    _how_much,
    _how_the_day,
    _when_done,
    _what_time,
)


def answer_run_question(
    transcript: str,
    context: RunContext,
    *,
    last_question: str | None = None,
    last_instruction: str | None = None,
) -> Answer | None:
    """Answers a question about the run, or None when it is not one."""
    said = transcript.strip().lower()
    for handler in HANDLERS:
        answer = handler(said, context, last_instruction)
        if answer is not None:
            return answer
    return None


def answer_correction(
    transcript: str,
    context: RunContext,
    last_question: str | None,
) -> Answer | None:
    """Answers a correction of the last question.

    "No, seventeen" after "how many left?" is an answer of seventeen, not a
    new question. The thread of the conversation is what makes the voice feel
    like it is listening.
    """
    if last_question is None:
        return None
    match = CORRECTION.search(transcript.strip().lower()) or A_NUMBER.match(
        transcript.strip().lower()
    )
    if match is None:
        return None
    groups = match.groupdict()
    number = groups.get("number") or groups.get("number2")
    if not number:
        return None
    if last_question == "how_many_left":
        return Answer(speech=f"{_spoken_number(number)} stops left.", question="how_many_left")
    return None
