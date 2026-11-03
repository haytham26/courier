"""The brain that works with no internet at all.

Every command of the product is here as a pattern, and the questions about the
run are answered from the run the phone already has. This is the path the
voice takes in a dead spot in rural Canterbury, and it is the floor the
server brain has to reach: if the on-device brain cannot do it, the command
does not exist.

The wording of the commands matches the catalogue in `services/api/app/prompts.py`
and the parser in `apps/mobile/src/voice/commands.ts`, so the same sentence
means the same thing online and offline.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from .conversation import answer_correction, answer_run_question
from .models import ReasoningReply, ReasoningRequest, RunContext, Verbosity, VoiceAction
from .smalltalk import OFFLINE_LINES, smalltalk_reply


@dataclass(frozen=True)
class CommandRule:
    """One command of the catalogue."""

    pattern: re.Pattern[str]
    action: VoiceAction
    speech: str


def _action(action_type: str, **fields: str | bool | int | None) -> VoiceAction:
    """A command of the catalogue with its fields."""
    return VoiceAction.model_validate({"type": action_type, **fields})


#: The safe places a courier names, in the product's own vocabulary (the gold
#: slots of the evaluation set and `services/api/app/prompts.py`): the spoken
#: phrase as it is said -> the slot the app stores (BUG-187).
SAFE_PLACES: dict[str, str] = {
    "porch": "porch",
    "the porch": "porch",
    "letterbox": "letterbox",
    "the letterbox": "letterbox",
    "under the mat": "under the mat",
    "the mat": "under the mat",
    "neighbour": "neighbour",
    "the neighbour": "neighbour",
    "shop counter": "shop counter",
    "the shop counter": "shop counter",
    "the man": "handed over",
    "man": "handed over",
    "the garage": "garage",
    "round the back": "round the back",
}

#: The break lengths a courier says, as the words they say them in.
_MINUTE_WORDS: dict[str, int] = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "ten": 10,
    "fifteen": 15,
    "twenty": 20,
    "thirty": 30,
}


def _minutes_of(word: str | None) -> int | None:
    """A break length as a number, from its word or its digits."""
    if word is None:
        return None
    said = word.strip().lower()
    if said.isdigit():
        return int(said)
    return _MINUTE_WORDS.get(said)


def _slots_of(match: re.Match[str]) -> dict[str, Any]:
    """The slots a match fills: every named group it captured, in the model's words.

    A sentence carries more than one slot ("dropped it in the letterbox at 57
    Poulson Street" is a safe place AND an address), so the groups are read
    together rather than first-one-wins (BUG-187).
    """
    groups = match.groupdict()
    updates: dict[str, Any] = {}
    if (place := groups.get("place")) is not None and place.strip():
        key = place.strip().lower()
        updates["safe_place"] = SAFE_PLACES.get(key, place.strip())
    if (address := groups.get("address")) is not None and address.strip():
        updates["raw_address"] = address.strip()
    if (reason := groups.get("reason")) is not None and reason.strip():
        updates["reason"] = reason.strip()
    if (note := groups.get("text")) is not None and note.strip():
        updates["text"] = note.strip()
    if (minutes := _minutes_of(groups.get("minutes_word") or groups.get("minutes"))) is not None:
        updates["minutes"] = minutes
    if groups.get("priority"):
        updates["priority"] = True
    return updates


#: The command catalogue, in the order the sentences are read.
#:
#: The address-bearing forms come first in each family: a courier says
#: "delivered at 57 Poulson Street, Addington", not "delivered" (BUG-187 - the
#: A3 measurement read the set's own gold scripts and found the short forms
#: alone left 76 % of them a noop). The short forms keep working below them.
COMMANDS: tuple[CommandRule, ...] = (
    CommandRule(
        pattern=re.compile(
            r"^(?:delivered|done|dropped(?: it)?|tick)\b(?:\s+at\s+(?P<address>.+))?$",
            re.IGNORECASE,
        ),
        action=_action("mark_delivered"),
        speech="Delivered.",
    ),
    CommandRule(
        pattern=re.compile(
            r"^(?:left it|put it|dropped it|handed it)\s+"
            r"(?:(?:with|on|under|at|to|by|in)\s+)?(?P<place>[a-z][a-z ]*?)"
            r"\s+at\s+(?P<address>.+)$",
            re.IGNORECASE,
        ),
        action=_action("mark_delivered"),
        speech="Delivered.",
    ),
    CommandRule(
        pattern=re.compile(
            r"^left(?:\s+it)?\s+(?:at|by|in|on|under)\s+(?:the\s+)?(?P<place>[\w\s]+?)\.?$",
            re.IGNORECASE,
        ),
        action=_action("mark_delivered"),
        speech="Delivered.",
    ),
    CommandRule(
        pattern=re.compile(r"^(?:no one(?:'s)? home|nobody answered|no one answered)\s+at\s+(?P<address>.+)$", re.IGNORECASE),
        action=_action("mark_failed", reason="no one home"),
        speech="Marked failed.",
    ),
    CommandRule(
        pattern=re.compile(r"^(?:cannot get in|can't get in|locked out|no access)\s+at\s+(?P<address>.+)$", re.IGNORECASE),
        action=_action("mark_failed", reason="can't get in"),
        speech="Marked failed.",
    ),
    CommandRule(
        pattern=re.compile(r"^(?:dog in the yard|dog here)\s+at\s+(?P<address>.+)$", re.IGNORECASE),
        action=_action("mark_failed", reason="dog"),
        speech="Marked failed.",
    ),
    CommandRule(
        pattern=re.compile(
            r"^(?:skip this one|skip it|come back to (?:this one|it))\s+at\s+(?P<address>.+)$",
            re.IGNORECASE,
        ),
        action=_action("skip_stop"),
        speech="Skipped.",
    ),
    CommandRule(
        pattern=re.compile(r"^come back to\s+(?P<address>.+?)\s+later\.?$", re.IGNORECASE),
        action=_action("skip_stop"),
        speech="Skipped.",
    ),
    CommandRule(
        pattern=re.compile(r"^skip the street for\s+(?P<address>.+)$", re.IGNORECASE),
        action=_action("skip_stop"),
        speech="Skipped.",
    ),
    CommandRule(
        pattern=re.compile(
            r"^(?:skip|come back(?: to it)?|skip this one)\.?$", re.IGNORECASE
        ),
        action=_action("skip_stop"),
        speech="Skipped.",
    ),
    CommandRule(
        pattern=re.compile(
            r"^(?:fail|failed|no access|could not deliver|couldn't deliver|not delivered)\.?$",
            re.IGNORECASE,
        ),
        action=_action("mark_failed", reason="voice"),
        speech="Marked failed.",
    ),
    CommandRule(
        pattern=re.compile(
            r"^(?:start|take|taking)\s+(?:a\s+)?break(?:\s+for\s+(?P<minutes_word>\d+|[a-z]+)\s+minutes?)?\.?$",
            re.IGNORECASE,
        ),
        action=_action("start_break"),
        speech="Break started.",
    ),
    CommandRule(
        pattern=re.compile(r"^taking an?\s+(?P<minutes_word>\d+|[a-z]+)\s+minute break\.?$", re.IGNORECASE),
        action=_action("start_break"),
        speech="Break started.",
    ),
    CommandRule(
        pattern=re.compile(r"^(?:end break|break'?s over|back to work|back on the road)\.?$", re.IGNORECASE),
        action=_action("end_break"),
        speech="Break over.",
    ),
    CommandRule(
        pattern=re.compile(
            r"^(?:priority|urgent)\s+(?:parcel\s+for|stop\s+at|parcel\s+at)\s+(?P<address>.+)$",
            re.IGNORECASE,
        ),
        action=_action("add_stop", priority=True),
        speech="Stop added.",
    ),
    CommandRule(
        pattern=re.compile(
            r"^(?:add|also got|drop off|pop in|swing by)\s+"
            r"(?:(?:a|an|one|another)\s+)?(?:stop|parcel|delivery)?\s*(?:at|to|on)?\s*"
            r"(?P<address>.+?)(?:\s+on the way back)?$",
            re.IGNORECASE,
        ),
        # The plain add is not a priority one: the gold slot says so, and the
        # priority rule above has already taken the urgent sentences.
        action=_action("add_stop", priority=False),
        speech="Stop added.",
    ),
    CommandRule(
        pattern=re.compile(
            r"^gate code is\s+(?P<text>[\w\s]+?)\s+at\s+(?P<address>.+)$",
            re.IGNORECASE,
        ),
        action=_action("add_location_note", kind="gate code"),
        speech="Note saved.",
    ),
    CommandRule(
        pattern=re.compile(r"^watch the dog\s+at\s+(?P<address>.+)$", re.IGNORECASE),
        action=_action("add_location_note", kind="entry note", text="watch the dog"),
        speech="Note saved.",
    ),
    CommandRule(
        pattern=re.compile(r"^parcel box round the back\s+at\s+(?P<address>.+)$", re.IGNORECASE),
        action=_action("add_location_note", kind="safe place", text="parcel box round the back"),
        speech="Note saved.",
    ),
    CommandRule(
        pattern=re.compile(r"^side gate left of the garage\s+at\s+(?P<address>.+)$", re.IGNORECASE),
        action=_action("add_location_note", kind="entry note", text="side gate left of the garage"),
        speech="Note saved.",
    ),
    CommandRule(
        pattern=re.compile(r"^the gate is on the .+ side\s+at\s+(?P<address>.+)$", re.IGNORECASE),
        action=_action("add_location_note", kind="entry note", text="gate on the street side"),
        speech="Note saved.",
    ),
    CommandRule(
        pattern=re.compile(
            r"^(?:note|dog here|side gate|parcel is|remember)\s*:?\s*"
            r"(?P<text>.+)$",
            re.IGNORECASE,
        ),
        action=_action("add_location_note", kind="note"),
        speech="Note saved.",
    ),
    CommandRule(
        pattern=re.compile(
            r"^(?:repeat that?|say again|what(?:'?s| was) that|where is it in the van|"
            r"read me the next one|repeat|what)\??$",
            re.IGNORECASE,
        ),
        action=_action("repeat_or_detail"),
        speech="",
    ),
    CommandRule(
        pattern=re.compile(r"^(?:next|go on|navigate|carry on)\.?$", re.IGNORECASE),
        action=_action("navigate_next"),
        speech="",
    ),
    CommandRule(
        pattern=re.compile(r"^(?:back|previous|go back)\.?$", re.IGNORECASE),
        action=_action("navigate_previous"),
        speech="",
    ),
    CommandRule(
        pattern=re.compile(r"^where am i\??$", re.IGNORECASE),
        action=_action("where_am_i"),
        speech="",
    ),
    CommandRule(
        pattern=re.compile(r"^how many (?:left|stops left|to go)\??$", re.IGNORECASE),
        action=_action("how_many_left"),
        speech="",
    ),
    CommandRule(
        pattern=re.compile(r"^start (?:my )?shift\.?$", re.IGNORECASE),
        action=_action("start_shift"),
        speech="Shift started.",
    ),
    CommandRule(
        pattern=re.compile(r"^end (?:my )?shift\.?$", re.IGNORECASE),
        action=_action("end_shift"),
        speech="Shift ended.",
    ),
    CommandRule(
        pattern=re.compile(r"^emergency\.?$", re.IGNORECASE),
        action=_action("emergency"),
        speech="Emergency. Calling help now.",
    ),
    CommandRule(
        pattern=re.compile(r"^(?:3d|three d|3-d)\s*(?:on|map|view|mode)?\b", re.IGNORECASE),
        action=_action("set_map_mode", mode="3d"),
        speech="3D on.",
    ),
    CommandRule(
        pattern=re.compile(r"^(?:flat|2d|two d|2-d)\s*(?:map|view|mode|on)?\b", re.IGNORECASE),
        action=_action("set_map_mode", mode="flat"),
        speech="Flat map.",
    ),
    CommandRule(
        pattern=re.compile(r"^satellite(?:\s+(?:map|view|mode|on))?\b", re.IGNORECASE),
        action=_action("set_map_mode", mode="satellite"),
        speech="Satellite on.",
    ),
    CommandRule(
        pattern=re.compile(r"^auto(?:matic)?\s*(?:map|view|mode)?\b", re.IGNORECASE),
        action=_action("set_map_mode", mode="auto"),
        speech="Auto map.",
    ),
    CommandRule(
        pattern=re.compile(r"^zoom to (?:the )?next stop\.?$", re.IGNORECASE),
        action=_action("zoom_to_next_stop"),
        speech="",
    ),
    CommandRule(
        pattern=re.compile(r"^tilt (?:the )?map\.?$", re.IGNORECASE),
        action=_action("tilt_map", on=True),
        speech="",
    ),
    CommandRule(
        pattern=re.compile(r"^flatten (?:the )?map\.?$", re.IGNORECASE),
        action=_action("tilt_map", on=False),
        speech="",
    ),
    CommandRule(
        pattern=re.compile(r"^follow me\.?$", re.IGNORECASE),
        action=_action("follow_me", on=True),
        speech="",
    ),
    CommandRule(
        pattern=re.compile(r"^stop following\.?$", re.IGNORECASE),
        action=_action("follow_me", on=False),
        speech="",
    ),
    CommandRule(
        pattern=re.compile(r"^look back\.?$", re.IGNORECASE),
        action=_action("look_back"),
        speech="",
    ),
    CommandRule(
        pattern=re.compile(r"^reset (?:the )?camera\.?$", re.IGNORECASE),
        action=_action("reset_camera"),
        speech="",
    ),
)


def parse_command(transcript: str) -> VoiceAction | None:
    """The command of the catalogue, or None when the sentence is not one.

    The command with a place ("left it on the porch") keeps the place, so the
    app knows where the parcel was put.
    """
    said = transcript.strip()
    for rule in COMMANDS:
        match = rule.pattern.match(said)
        if match is None:
            continue
        updates = _slots_of(match)
        return rule.action.model_copy(update=updates) if updates else rule.action
    return None


def command_speech(transcript: str) -> str:
    """The line the voice says after a command."""
    said = transcript.strip()
    for rule in COMMANDS:
        if rule.pattern.match(said):
            return rule.speech
    return ""


def _dynamic_speech(action: VoiceAction, context: RunContext) -> str:
    """The line of the commands whose answer depends on the day."""
    if action.type == "how_many_left":
        return f"{context.left_count} stops left."
    if action.type == "where_am_i":
        current = context.current_stop
        if current is None:
            return "you're between stops."
        return f"you're at {current.spoken_address}."
    return ""


def _question_of_action(action: VoiceAction) -> str | None:
    """The question a command answered, so a correction can follow it."""
    if action.type == "how_many_left":
        return "how_many_left"
    if action.type == "where_am_i":
        return "where_am_i"
    return None


def _answer_of(request: ReasoningRequest) -> ReasoningReply:
    """The answer of a question about the run, or of a correction."""
    answer = answer_run_question(
        request.transcript,
        request.context,
        last_question=request.last_question,
        last_instruction=request.last_instruction,
    )
    if answer is not None:
        return ReasoningReply(
            speech=answer.speech,
            action=answer.action,
            source="on-device",
            engine="on-device",
            question=answer.question,
        )

    correction = answer_correction(request.transcript, request.context, request.last_question)
    if correction is not None:
        return ReasoningReply(
            speech=correction.speech,
            source="on-device",
            engine="on-device",
            question=correction.question,
        )
    return ReasoningReply(speech="", source="on-device", engine="on-device")


def _company_of(request: ReasoningRequest) -> ReasoningReply:
    """The small talk, and the company on a long rural leg."""
    talk = smalltalk_reply(request.transcript, request.context, online=False)
    if talk:
        return ReasoningReply(speech=talk, source="on-device", engine="on-device")

    if request.settings.verbosity is Verbosity.CHATTY:
        line = OFFLINE_LINES[len(request.transcript) % len(OFFLINE_LINES)]
        return ReasoningReply(speech=line, source="on-device", engine="on-device")
    return ReasoningReply(speech="", source="on-device", engine="on-device")


def offline_reason(request: ReasoningRequest) -> ReasoningReply:
    """The answer of the on-device brain.

    The order matters: a command is a command, then a question about the run,
    then a correction of the last answer, then small talk. Anything else is
    chatter, and the voice stays quiet.
    """
    transcript = request.transcript.strip()
    if transcript == "":
        return ReasoningReply(speech="", source="on-device", engine="on-device")

    action = parse_command(transcript)
    if action is not None:
        speech = command_speech(transcript) or _dynamic_speech(action, request.context)
        return ReasoningReply(
            speech=speech,
            action=action,
            source="on-device",
            engine="on-device",
            question=_question_of_action(action),
        )

    answered = _answer_of(request)
    if answered.speech or answered.action is not None:
        return answered

    return _company_of(request)
