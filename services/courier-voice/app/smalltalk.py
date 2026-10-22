"""The small talk, and the rules that keep it in bounds.

The courier is in a van for eight hours. The voice is company. Small talk is
welcome, and it is deliberately bounded: there are subjects the voice speaks
about and subjects it does not, and the rules are in code with tests.

The voice never says it is an AI, it never gives advice that belongs to a
doctor, a lawyer or an advisor, it never talks about the people in the
courier's life, and it never takes sides.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .models import RunContext

#: The lines the voice can say with no internet at all.
OFFLINE_LINES: tuple[str, ...] = (
    "Long road ahead. Coffee would help.",
    "Radio's on in the background there.",
    "Rain's the only thing keeping Christchurch honest.",
    "Good to have company on the long legs.",
    "Take it steady through the roundabout.",
)

#: The jokes the voice knows without an internet.
OFFLINE_JOKES: tuple[str, ...] = (
    "A delivery is a parcel with a schedule attached.",
    "The van is just a very slow tram with better music.",
    "Parcel post: where every parcel becomes a person.",
)


@dataclass(frozen=True)
class SmalltalkRule:
    """One rule of the small talk."""

    pattern: re.Pattern[str]
    reply: str
    reason: str


#: The subjects the voice does not go into, and what it says instead.
REFUSALS: tuple[SmalltalkRule, ...] = (
    SmalltalkRule(
        pattern=re.compile(
            r"\b(medical|doctor|hospital|medication|medicine|painkiller|symptom|diagnos|"
            r"prescription|sick|injury|injur)\w*"
        ),
        reply="that's a call for a doctor, not me",
        reason="medical",
    ),
    SmalltalkRule(
        pattern=re.compile(r"\b(lawyer|solicitor|legal|court|lawsuit|police)\b"),
        reply="that's a call for a lawyer, not me",
        reason="legal",
    ),
    SmalltalkRule(
        pattern=re.compile(
            r"\b(invest|investment|tax|taxes|loan|mortgage|superannuation|insurance|money advice)\b"
        ),
        reply="that's money advice, ask a proper advisor",
        reason="financial",
    ),
    SmalltalkRule(
        pattern=re.compile(
            r"\b(my (wife|husband|partner|girlfriend|boyfriend|kids?|children|family|mum|mum's|mother|dad|father|brother|sister))\b"
        ),
        reply="that's yours to talk about, not me",
        reason="other people",
    ),
    SmalltalkRule(
        pattern=re.compile(
            r"\b(who are you|what are you|are you (an? )?(robot|human|ai|assistant|machine))\b"
        ),
        reply="I'm Courier Voice, your shift companion",
        reason="identity",
    ),
    SmalltalkRule(
        pattern=re.compile(r"\b(where do you live|your address|where are you from)\b"),
        reply="I'm on the phone, in the van with you",
        reason="identity",
    ),
    SmalltalkRule(
        pattern=re.compile(r"\b(politics|political|party|vote|election|coalition)\b"),
        reply="I don't go into that",
        reason="politics",
    ),
    SmalltalkRule(
        pattern=re.compile(r"\b(kill myself|hurt myself|suicide|self harm)\b"),
        reply="if things get that heavy, talk to someone who can help",
        reason="safety",
    ),
)

#: The questions that need the internet.
NEEDS_INTERNET_TOPICS = re.compile(
    r"\b(weather|rain|forecast|news|sport|score|rugby|football|all blacks|"
    r"cricket|headlines|stock|traffic)\b"
)

#: What the voice says when a subject needs the internet and there is none.
NEEDS_INTERNET_REPLY = "I need the internet for that."

#: The greetings and the thanks.
GREETINGS = re.compile(r"^\s*(good morning|morning|gidday|hello|hi|hey)\b")
THANKS = re.compile(r"^\s*(thanks|thank you|cheers|ta|good on ya)\b")
JOKE = re.compile(r"\b(tell me a joke|joke|make me laugh|something funny)\b")
HOW_ARE_YOU = re.compile(
    r"\bhow(?:'s| is)\s+the day\b|\bhow are you\b|\bhow'?s it going\b|\bhow you doing\b"
)


def refusal_for(transcript: str) -> str | None:
    """The line the voice says when the subject is not one of its own."""
    for rule in REFUSALS:
        if rule.pattern.search(transcript.lower()):
            return rule.reply
    return None


def _known_offline(said: str, context: RunContext) -> str | None:
    """The small talk the voice can do with no internet at all."""
    if THANKS.match(said):
        return "No worries."
    if JOKE.search(said):
        return OFFLINE_JOKES[0]
    if GREETINGS.match(said):
        return "Morning. Let's get through it."
    if HOW_ARE_YOU.search(said):
        return f"{context.done_count} done, {context.left_count} to go."
    return None


def smalltalk_reply(transcript: str, context: RunContext, *, online: bool) -> str | None:
    """The line of the small talk, or None when there is nothing to say.

    `online` says whether the server brain is there. The offline small talk is
    a small, fixed set: the day, a joke, a greeting, and the truth that the
    internet is needed for the rest. A subject the voice does not know is not
    answered with a canned line: the voice stays quiet and the caller decides
    what to say.
    """
    said = transcript.strip()
    refusal = refusal_for(said)
    if refusal is not None:
        return refusal

    if NEEDS_INTERNET_TOPICS.search(said.lower()) and not online:
        return NEEDS_INTERNET_REPLY

    return _known_offline(said.lower(), context)
