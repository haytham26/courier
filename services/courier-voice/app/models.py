"""The data of a shift, as the voice sees it.

Everything that crosses the boundary of the service is a model in this file:
the run the courier is working, the settings they chose, the turn they said and
the reply that comes back. They are frozen, so a reply that is already spoken
cannot be changed under the app's feet.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Frozen(BaseModel):
    """The base of the models that never change after they are built."""

    model_config = ConfigDict(frozen=True, extra="forbid")


class Verbosity(StrEnum):
    """How much the voice says. The courier picks it in the app."""

    MINIMAL = "minimal"
    NORMAL = "normal"
    CHATTY = "chatty"


class Trigger(StrEnum):
    """What opened the turn."""

    WAKE_WORD = "wake_word"
    EARBUD = "earbud"
    PUSH_TO_TALK = "push_to_talk"
    PROACTIVE = "proactive"


class AudioFocus(StrEnum):
    """What else is making noise on the phone."""

    NORMAL = "normal"
    CALL = "call"
    MUSIC = "music"
    NAVIGATION = "navigation"


class Mode(StrEnum):
    """Which brain answers: the one on the phone or the one on the server."""

    AUTO = "auto"
    ONLINE = "online"
    OFFLINE = "offline"


class ProactiveType(StrEnum):
    """The things the voice says before it is asked."""

    MORNING_BRIEF = "morning_brief"
    NEXT_STOP = "next_stop"
    APPROACH = "approach"
    HAZARD = "hazard"
    PARCEL_LOCATION = "parcel_location"
    ETA_CHECK = "eta_check"
    BREAK_REMINDER = "break_reminder"
    ROUTE_CHANGE = "route_change"
    END_OF_DAY = "end_of_day"


class StopStatus(StrEnum):
    PENDING = "pending"
    ACTIVE = "active"
    DELIVERED = "delivered"
    FAILED = "failed"
    SKIPPED = "skipped"


class Stop(Frozen):
    """One delivery of the run."""

    id: str
    sequence: int = 0
    number: str = ""
    street: str = ""
    suburb: str = ""
    status: StopStatus = StopStatus.PENDING
    van_zone: str | None = None
    size_class: str | None = None
    tip: str | None = None
    hazard: str | None = None
    parcel_for: str | None = None
    service_time_s: int | None = None

    @property
    def spoken_address(self) -> str:
        """The address as the voice says it."""
        parts = [part for part in (self.number, self.street) if part]
        return " ".join(parts)


class LearnedRuns(Frozen):
    """What the phone has learned about how this courier works.

    The phone keeps it (on-device first) and sends it with the turn, so the
    service never has to keep a picture of the courier.
    """

    usual_order: tuple[str, ...] = ()
    service_times_s: dict[str, int] = Field(default_factory=dict)
    door_notes: dict[str, str] = Field(default_factory=dict)
    preferences: dict[str, str] = Field(default_factory=dict)


class RunContext(Frozen):
    """The run as it is right now."""

    shift_id: str | None = None
    stops: tuple[Stop, ...] = ()
    current_stop_id: str | None = None
    new_addresses: int = 0
    weather: str | None = None
    earnings_nzd: float | None = None
    minutes_ahead: int | None = None
    returns_in_van: int = 0
    expected_stops: int | None = None
    failure_reason: str | None = None
    route_change: str | None = None
    eta: str | None = None
    local_time: str | None = None

    @property
    def total_stops(self) -> int:
        """How many stops the day has."""
        if self.expected_stops is not None:
            return self.expected_stops
        return len(self.stops)

    @property
    def done_count(self) -> int:
        """How many stops are behind the courier."""
        return sum(
            1
            for stop in self.stops
            if stop.status in (StopStatus.DELIVERED, StopStatus.FAILED, StopStatus.SKIPPED)
        )

    @property
    def delivered_count(self) -> int:
        return sum(1 for stop in self.stops if stop.status is StopStatus.DELIVERED)

    @property
    def failed_count(self) -> int:
        return sum(1 for stop in self.stops if stop.status is StopStatus.FAILED)

    @property
    def left_count(self) -> int:
        """How many stops are still to come."""
        return max(self.total_stops - self.done_count, 0)

    @property
    def current_stop(self) -> Stop | None:
        """The stop the courier is at."""
        if self.current_stop_id:
            for stop in self.stops:
                if stop.id == self.current_stop_id:
                    return stop
        for stop in self.stops:
            if stop.status is StopStatus.ACTIVE:
                return stop
        return None

    @property
    def next_stop(self) -> Stop | None:
        """The stop the courier is driving to.

        The active stop is the one being driven to; when the day has no active
        stop, the first one still to come is.
        """
        current = self.current_stop
        if current is not None:
            return current
        for stop in self.stops:
            if stop.status is StopStatus.PENDING:
                return stop
        return None

    @property
    def stops_after_next(self) -> tuple[Stop, ...]:
        """The stops that come after the next one."""
        upcoming = self.next_stop
        if upcoming is None:
            return ()
        return tuple(
            stop
            for stop in self.stops
            if stop.sequence > upcoming.sequence and stop.status is StopStatus.PENDING
        )


class ProactiveToggles(Frozen):
    """Which of the things the voice says first are on."""

    morning_brief: bool = True
    next_stop: bool = True
    approach: bool = True
    hazard: bool = True
    parcel_location: bool = True
    eta_check: bool = True
    break_reminder: bool = True
    route_change: bool = True
    end_of_day: bool = True

    def is_on(self, kind: ProactiveType) -> bool:
        """Whether one of the kinds is allowed to speak first."""
        return bool(getattr(self, kind.value, False))


class VoiceSettings(Frozen):
    """The choices the courier made in the app.

    The app owns them and the service honours them: the service never changes
    a setting behind the courier's back.
    """

    verbosity: Verbosity = Verbosity.NORMAL
    voice: str = "nz"
    speed: float = 1.0
    quiet_mode: bool = False
    essentials_only: bool = False
    language: str = "en-NZ"
    remember: bool = True
    proactive: ProactiveToggles = ProactiveToggles()


class Gps(Frozen):
    """Where the van is."""

    lat: float
    lon: float
    speed_kmh: float = 0.0
    accuracy_m: float | None = None


class VoiceAction(Frozen):
    """One thing the courier asked for, as the app understands it."""

    type: str
    stop_id: str | None = None
    reason: str | None = None
    safe_place: str | None = None
    mode: str | None = None
    on: bool | None = None
    raw_address: str | None = None
    priority: bool | None = None
    minutes: int | None = None
    kind: str | None = None
    text: str | None = None


class Transcript(Frozen):
    """What the courier said."""

    text: str
    language: str = "en-NZ"
    confidence: float = 1.0


class Speech(Frozen):
    """What the voice says.

    The audio is empty when the phone speaks the words itself: the on-device
    pack lives on the phone, so the service hands the text back.
    """

    text: str
    audio: bytes | None = None
    sample_rate: int = 24000
    voice: str = "nz"
    speed: float = 1.0
    spoken_by: Literal["device", "server"] = "device"


class TurnRecord(Frozen):
    """One turn of the conversation, as it is remembered."""

    transcript: str
    speech: str = ""
    action: str | None = None


class ReasoningRequest(Frozen):
    """What an engine is asked to answer."""

    transcript: str
    context: RunContext = RunContext()
    settings: VoiceSettings = VoiceSettings()
    history: tuple[TurnRecord, ...] = ()
    language: str = "en-NZ"
    moving: bool = False
    last_instruction: str | None = None
    last_question: str | None = None
    learned: LearnedRuns | None = None


class ReasoningReply(Frozen):
    """What an engine answers."""

    speech: str = ""
    action: VoiceAction | None = None
    source: Literal["on-device", "server"] = "on-device"
    engine: str = ""
    notice: str | None = None
    question: str | None = None
    tokens: int = 0
    cost_nzd: float = 0.0


class TurnRequest(Frozen):
    """One turn of the conversation."""

    transcript: str = Field(default="", max_length=4000)
    trigger: Trigger = Trigger.PUSH_TO_TALK
    speed_kmh: float = 0.0
    audio_focus: AudioFocus = AudioFocus.NORMAL
    language: str | None = None
    online: bool = True
    mode: Mode = Mode.AUTO
    settings: VoiceSettings | None = None
    context: RunContext | None = None
    learned: LearnedRuns | None = None
    gps: Gps | None = None
    prefer: ProactiveType | None = None
    started_at: float | None = None


class TurnResponse(Frozen):
    """The answer of the voice."""

    speech: str = ""
    action: VoiceAction | None = None
    engine: str = ""
    source: Literal["on-device", "server"] = "on-device"
    mode: Mode = Mode.AUTO
    barge_in: bool = False
    ended_turn: bool = True
    priority: Literal["now", "queue"] = "now"
    notice: str | None = None
    words: int = 0
    latency_ms: int = 0
    proactive: ProactiveType | None = None


class SessionState(Frozen):
    """What the service remembers about this shift."""

    id: str
    driver_id: str
    shift_id: str | None = None
    created_at: float = 0.0
    turns: int = 0
    last_instruction: str | None = None
    last_question: str | None = None
    engine: str = ""
    mode: Mode = Mode.AUTO
    phase: str = "idle"
    settings: VoiceSettings = VoiceSettings()
    remembered: bool = True


class EngineInfo(Frozen):
    """One engine of the swappable seam (D23 condition c)."""

    name: str
    online: bool
    stt: bool
    tts: bool
    chat: bool
    reason: str
    licence: str


class LicenceEntry(Frozen):
    """One row of the licence ledger.

    The ledger is a shipped surface, not a spreadsheet (ADR-004, point 4): the
    service publishes the licence of the code and of the weights of every
    engine it can load.
    """

    artefact: str
    kind: str
    version: str
    licence: str
    read_on: str
    decision: Literal["shippable", "internal-only", "blocked"]
    obligations: str
    where_used: str
