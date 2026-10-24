"""Executive Voice Copilot: one tool-call per utterance, then a short spoken line.
A regex fast-path handles the ~80% of utterances that are one-word PoD so the
LLM round-trip is skipped entirely (sub-100ms response in the earbud)."""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass

import anthropic

from ..prompts import EXECUTIVE_COPILOT

MODEL = os.getenv("COPILOT_MODEL", "claude-haiku-5-5")

FAST_PATH = [
    (re.compile(r"^(delivered|done|dropped( it)?|tick)\.?$", re.I), "mark_delivered", {}),
    (
        re.compile(r"^left (at|by|in|on) (the )?(?P<place>[\w\s]+?)\.?$", re.I),
        "mark_delivered",
        None,
    ),
    (
        re.compile(r"^(skip|next|come back( to it)?)\.?$", re.I),
        "skip_stop",
        {"scope": "stop", "return_later": True},
    ),
    (re.compile(r"^(repeat|what|say again)\??$", re.I), "repeat_or_detail", {}),
]

TOOLS = [
    {
        "name": "mark_delivered",
        "description": "Current stop delivered.",
        "input_schema": {"type": "object", "properties": {"safe_place": {"type": "string"}}},
    },
    {
        "name": "mark_failed",
        "description": "Delivery attempt failed.",
        "input_schema": {
            "type": "object",
            "properties": {"reason": {"type": "string"}},
            "required": ["reason"],
        },
    },
    {
        "name": "skip_stop",
        "description": "Skip the current stop or whole street.",
        "input_schema": {
            "type": "object",
            "properties": {
                "scope": {"enum": ["stop", "street"]},
                "return_later": {"type": "boolean"},
            },
            "required": ["scope"],
        },
    },
    {
        "name": "add_stop",
        "description": "Add a stop from a spoken address.",
        "input_schema": {
            "type": "object",
            "properties": {"raw_address": {"type": "string"}, "priority": {"type": "boolean"}},
            "required": ["raw_address"],
        },
    },
    {
        "name": "start_break",
        "description": "Pause the shift.",
        "input_schema": {"type": "object", "properties": {"minutes": {"type": "integer"}}},
    },
    {
        "name": "end_break",
        "description": "Resume the shift.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "add_location_note",
        "description": "Remember access info for the current address.",
        "input_schema": {
            "type": "object",
            "properties": {
                "kind": {"enum": ["entry", "gate_code", "hazard", "safe_place", "access"]},
                "text": {"type": "string"},
            },
            "required": ["kind", "text"],
        },
    },
    {
        "name": "repeat_or_detail",
        "description": "Repeat or expand the current instruction.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "noop",
        "description": "Utterance was not for the copilot.",
        "input_schema": {"type": "object", "properties": {}},
    },
]


@dataclass
class Intent:
    tool: str
    args: dict
    speech: str | None = None


def fast_path(transcript: str) -> Intent | None:
    t = transcript.strip()
    for rx, tool, args in FAST_PATH:
        if m := rx.match(t):
            return Intent(
                tool, args if args is not None else {"safe_place": m.group("place").strip()}
            )
    return None


def fallback_intent(transcript: str) -> Intent:
    """The answer when the LLM is unreachable or unparseable: the copilot
    never dies on the courier - it says it did not catch that, and the
    offline fast paths still get their chance first."""
    return Intent("none", {}, speech="I did not catch that. Say it again.")


def interpret(transcript: str, state: dict, client=None, region: str = "Christchurch") -> Intent:
    """The transcript, bounded and wrapped in the state envelope.

    The transcript is untrusted input (a label read aloud, a caller's voice):
    it travels inside its own tagged block, never concatenated into the
    instructions, and the reply is parsed defensively - a gateway answer
    without a tool call is a fallback, not a crash.
    """
    if hit := fast_path(transcript):
        return hit
    bounded = transcript[:2000]
    client = client or anthropic.Anthropic()
    resp = client.messages.create(
        model=MODEL,
        max_tokens=200,
        tools=TOOLS,
        tool_choice={"type": "any"},
        system=EXECUTIVE_COPILOT.format(region=region),
        messages=[
            {
                "role": "user",
                "content": (
                    f"<state>{json.dumps(state)}</state>\n"
                    f"<transcript>{bounded}</transcript>"
                ),
            }
        ],
    )
    calls = [b for b in resp.content if b.type == "tool_use"]
    if not calls:
        return fallback_intent(bounded)
    speech = " ".join(b.text for b in resp.content if b.type == "text").strip() or None
    return Intent(calls[0].name, calls[0].input, speech)

