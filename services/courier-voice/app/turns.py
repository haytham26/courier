"""The turn taking.

The voice is with the courier for the whole shift, so the turn has to work
without a finger on the screen and without the courier thinking about it:

- the turn opens on the **wake word** or on the **earbud press** (D9);
- the turn closes on the end of the sentence, and the silence timeout makes
  sure a turn that never gets a word closes itself instead of hanging;
- the **barge-in** stops the reply when the courier speaks over it, and a
  noise does not: the research settled on a minimum number of words for an
  interruption (the same idea as Pipecat's min-words user turn start), so a
  cough or a radio burst never cuts a sentence in half.

The end of the turn is read from the prosody by Smart Turn v3 (BSD-2-Clause)
on the phone; this module is the state that follows from it.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum

from .models import Trigger


class TurnPhase(StrEnum):
    """Where the voice is in a turn."""

    IDLE = "idle"
    LISTENING = "listening"
    THINKING = "thinking"
    SPEAKING = "speaking"


@dataclass
class TurnMachine:
    """The state of the turn taking."""

    silence_timeout_s: float = 6.0
    parked_silence_timeout_s: float = 10.0
    barge_in_min_words: int = 1
    phase: TurnPhase = TurnPhase.IDLE
    trigger: Trigger | None = None
    opened_at: float = 0.0
    last_word_at: float = 0.0
    words: int = 0
    last_reply: str = ""
    history: list[str] = field(default_factory=list)

    def open(self, trigger: Trigger, now: float) -> None:
        """A turn starts: the wake word, the earbud or the button."""
        self.phase = TurnPhase.LISTENING
        self.trigger = trigger
        self.opened_at = now
        self.last_word_at = now
        self.words = 0

    def heard(self, words: int, now: float) -> None:
        """The courier said something."""
        self.words = max(self.words, words)
        self.last_word_at = now

    def timeout_for(self, *, moving: bool) -> float:
        """How long the voice waits for the words of the courier.

        A courier who is driving is busy, so the wait is short. A courier who
        is parked is thinking, so the wait is longer.
        """
        return self.silence_timeout_s if moving else self.parked_silence_timeout_s

    def should_close(self, now: float, *, moving: bool) -> bool:
        """Whether the turn has gone quiet for too long.

        A turn that closes on the timeout says nothing: there was no question,
        so there is no answer.
        """
        if self.phase is not TurnPhase.LISTENING:
            return False
        waited = now - self.last_word_at
        return waited >= self.timeout_for(moving=moving)

    def barge_in(self, words: int, deliberate: bool = False) -> bool:
        """Whether what the courier said stops the reply.

        The reply stops for words, not for noise. A cough, a "mm" or a radio
        burst leaves the sentence alone, and a command ("delivered", "skip")
        always stops it, because a command is deliberate.
        """
        if self.phase is not TurnPhase.SPEAKING:
            return False
        return deliberate or words >= self.barge_in_min_words

    def begin_speaking(self, reply: str) -> None:
        """The voice starts speaking."""
        self.phase = TurnPhase.SPEAKING
        self.last_reply = reply

    def end_speaking(self) -> None:
        """The voice has finished."""
        self.phase = TurnPhase.IDLE
        self.words = 0

    def remember(self, instruction: str) -> None:
        """The last instruction is kept, so "repeat" has something to repeat."""
        if instruction.strip():
            self.history.append(instruction.strip())
            self.last_reply = instruction.strip()
