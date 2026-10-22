"""What the voice says before it is asked.

MASTER_EXECUTION section 12 is the binding behaviour spec, and it gives the
wording of the lines the voice speaks first. The wording below is that
wording, with the numbers of the day put in.

Every rule has a trigger (when it fires) and an exact wording, and both are
tested. The rules are deliberately few and deliberately short: the voice
speaks first only when it is useful, and it never speaks first about
something the courier did not need to know.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from enum import StrEnum

from .models import ProactiveType, RunContext, Stop, VoiceSettings


class ProactiveEvent(StrEnum):
    """What happened that makes the voice think of speaking first."""

    SHIFT_START = "shift_start"
    STOP_COMPLETED = "stop_completed"
    APPROACH = "approach"
    ETA_CHECK = "eta_check"
    BREAK_DUE = "break_due"
    ROUTE_CHANGE = "route_change"
    SHIFT_END = "shift_end"


@dataclass(frozen=True)
class ProactiveRule:
    """One rule of the proactive voice."""

    kind: ProactiveType
    trigger: str
    wording: str
    essential: bool = True


#: The rules, with the trigger and the exact wording of each.
RULES: tuple[ProactiveRule, ...] = (
    ProactiveRule(
        kind=ProactiveType.MORNING_BRIEF,
        trigger="the shift starts, before the first delivery of the day",
        wording="{stops} stops, {new_addresses} new addresses, {weather}",
    ),
    ProactiveRule(
        kind=ProactiveType.NEXT_STOP,
        trigger="a stop is completed and the next stop is set",
        wording="next: {number} {street}, {tip}, {parcel_location}",
    ),
    ProactiveRule(
        kind=ProactiveType.APPROACH,
        trigger="the van is inside the approach radius of the next stop",
        wording="next: {number} {street}, {tip}, {parcel_location}",
    ),
    ProactiveRule(
        kind=ProactiveType.HAZARD,
        trigger="the van approaches a stop that has a door memory note",
        wording="{hazard}",
    ),
    ProactiveRule(
        kind=ProactiveType.PARCEL_LOCATION,
        trigger="the courier asks where a parcel is in the van",
        wording="{parcel_location}",
    ),
    ProactiveRule(
        kind=ProactiveType.ETA_CHECK,
        trigger="the schedule is checked and the courier is ahead or behind",
        wording="you're {minutes} minutes {direction}",
    ),
    ProactiveRule(
        kind=ProactiveType.BREAK_REMINDER,
        trigger="the courier has been driving for two hours without a break",
        wording="break's due, you've been going two hours",
    ),
    ProactiveRule(
        kind=ProactiveType.ROUTE_CHANGE,
        trigger="the route changes: a closure, a delay or a detour",
        wording="{route_change}",
    ),
    ProactiveRule(
        kind=ProactiveType.END_OF_DAY,
        trigger="the last stop of the day is done and the van is parked",
        wording="{delivered} delivered, {failed} failed, {returns} returns in the van",
    ),
)


def rule_for(kind: ProactiveType) -> ProactiveRule:
    """The rule of one kind of line."""
    for rule in RULES:
        if rule.kind is kind:
            return rule
    raise KeyError(kind)


#: How the size of a parcel is said: "small box", "satchel".
SPOKEN_SIZE = {
    "satchel": "satchel",
    "small": "small box",
    "medium": "medium box",
    "large": "large box",
    "heavy": "heavy box",
}


def spoken_size(size_class: str | None) -> str:
    """The size of a parcel as the voice says it."""
    if not size_class:
        return ""
    return SPOKEN_SIZE.get(size_class.lower(), size_class.lower())


def parcel_location(stop: Stop | None) -> str:
    """Where the parcel is in the van: "small box mid-rack"."""
    if stop is None:
        return ""
    parts = []
    size = spoken_size(stop.size_class)
    if size:
        parts.append(size)
    if stop.van_zone:
        parts.append(stop.van_zone)
    return " ".join(parts)


def morning_brief(context: RunContext) -> str:
    """The line the voice says when the day starts.

    The wording is the wording of the spec: "214 stops, 3 new addresses, rain
    after 2". A part the day does not have is left out rather than said as a
    zero.
    """
    if context.total_stops == 0:
        # There is no day to talk about.
        return ""
    parts = [f"{context.total_stops} stops"]
    if context.new_addresses:
        parts.append(f"{context.new_addresses} new addresses")
    if context.weather:
        parts.append(context.weather)
    return ", ".join(parts)


def next_stop_line(context: RunContext, stop: Stop | None = None) -> str:
    """The line the voice says when the next stop is set.

    The wording is the wording of the spec: "next: 14 Harewood, side gate,
    small box mid-rack". A stop without a tip or without a parcel in the van
    leaves that part out.
    """
    target = stop or context.next_stop
    if target is None:
        return ""
    parts = [f"next: {target.spoken_address}"]
    if target.tip:
        parts.append(target.tip)
    location = parcel_location(target)
    if location:
        parts.append(location)
    return ", ".join(parts)


def hazard_line(stop: Stop | None) -> str:
    """The line the voice says about a door note: "dog at this address"."""
    if stop is None or not stop.hazard:
        return ""
    return stop.hazard


def eta_line(context: RunContext) -> str:
    """The line the voice says about the schedule: "you're 12 minutes ahead"."""
    if context.minutes_ahead is None:
        return ""
    direction = "ahead" if context.minutes_ahead >= 0 else "behind"
    return f"you're {abs(context.minutes_ahead)} minutes {direction}"


def break_line() -> str:
    """The line the voice says when a break is due."""
    return "break's due, you've been going two hours"


def route_change_line(context: RunContext) -> str:
    """The line the voice says when the route changes."""
    return context.route_change or ""


def end_of_day_line(context: RunContext) -> str:
    """The line the voice says when the day is done.

    The wording is the wording of the spec: "206 delivered, 8 failed, 3
    returns in the van". It is spoken when the van is parked, so it is not
    held to the eight word rule.
    """
    delivered = context.delivered_count
    failed = context.failed_count
    return f"{delivered} delivered, {failed} failed, {context.returns_in_van} returns in the van"


#: The builder of the line of each kind.
BUILDERS: dict[ProactiveType, Callable[[RunContext], str]] = {
    ProactiveType.MORNING_BRIEF: morning_brief,
    ProactiveType.NEXT_STOP: next_stop_line,
    ProactiveType.APPROACH: next_stop_line,
    ProactiveType.HAZARD: lambda context: hazard_line(context.current_stop),
    ProactiveType.PARCEL_LOCATION: lambda context: parcel_location(context.current_stop),
    ProactiveType.ETA_CHECK: eta_line,
    ProactiveType.BREAK_REMINDER: lambda _context: break_line(),
    ProactiveType.ROUTE_CHANGE: route_change_line,
    ProactiveType.END_OF_DAY: end_of_day_line,
}


def line_for(kind: ProactiveType, context: RunContext) -> str:
    """The line of one kind, with the numbers of the day put in."""
    builder = BUILDERS.get(kind)
    if builder is None:
        return ""
    return builder(context)


def proactive_line(
    kind: ProactiveType, context: RunContext, settings: VoiceSettings
) -> str | None:
    """The line the voice may speak first, or None when it stays quiet.

    The courier turns each kind on and off in the app, and a line that is not
    there is not said.
    """
    if not settings.proactive.is_on(kind):
        return None
    line = line_for(kind, context)
    if line.strip() == "":
        return None
    return line


def for_event(
    event: ProactiveEvent, context: RunContext, settings: VoiceSettings
) -> tuple[ProactiveType, str] | None:
    """The line the voice speaks for an event, or None when it stays quiet.

    The voice speaks first only when it is useful: the day it starts, the next
    stop, an approach, a hazard, the schedule, a break, a change of route and
    the end of the day. Nothing else.
    """
    wanted = {
        ProactiveEvent.SHIFT_START: ProactiveType.MORNING_BRIEF,
        ProactiveEvent.STOP_COMPLETED: ProactiveType.NEXT_STOP,
        ProactiveEvent.APPROACH: ProactiveType.APPROACH,
        ProactiveEvent.ETA_CHECK: ProactiveType.ETA_CHECK,
        ProactiveEvent.BREAK_DUE: ProactiveType.BREAK_REMINDER,
        ProactiveEvent.ROUTE_CHANGE: ProactiveType.ROUTE_CHANGE,
        ProactiveEvent.SHIFT_END: ProactiveType.END_OF_DAY,
    }.get(event)
    if wanted is None:
        return None
    line = proactive_line(wanted, context, settings)
    if line is None:
        return None
    return wanted, line
