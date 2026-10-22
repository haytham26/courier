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


#: The command catalogue, in the order the sentences are read.
COMMANDS: tuple[CommandRule, ...] = (
    CommandRule(
        pattern=re.compile(
            r"^(?:delivered|done|dropped(?: it)?|tick|left it(?: with the neighbour)?)\.?$",
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
        pattern=re.compile(r"^start (?:a )?break(?: for (?P<minutes>\d+) minutes?)?\.?$", re.IGNORECASE),
        action=_action("start_break"),
        speech="Break started.",
    ),
    CommandRule(
        pattern=re.compile(r"^(?:end break|break'?s over|back to work)\.?$", re.IGNORECASE),
        action=_action("end_break"),
        speech="Break over.",
    ),
    CommandRule(
        pattern=re.compile(
            r"^(?:add|also got|drop off|priority|urgent)\s+(?:stop\s+)?(?P<address>.+)$",
            re.IGNORECASE,
        ),
        action=_action("add_stop"),
        speech="Stop added.",
    ),
    CommandRule(
        pattern=re.compile(
            r"^(?:note|gate code is|watch the dog|dog here|side gate|parcel is|remember)\s*:?\s*"
            r"(?P<text>.+)$",
            re.IGNORECASE,
        ),
        action=_action("add_location_note", kind="note"),
        speech="Note saved.",
    ),
    CommandRule(
        pattern=re.compile(r"^(?:repeat|say again|what)\??$", re.IGNORECASE),
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
        groups = match.groupdict()
        if "place" in groups and groups["place"]:
            return rule.action.model_copy(update={"safe_place": groups["place"].strip()})
        if "address" in groups and groups["address"]:
            return rule.action.model_copy(update={"raw_address": groups["address"].strip()})
        if "text" in groups and groups["text"]:
            return rule.action.model_copy(update={"text": groups["text"].strip()})
        if "minutes" in groups and groups["minutes"]:
            return rule.action.model_copy(update={"minutes": int(groups["minutes"])})
        return rule.action
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
