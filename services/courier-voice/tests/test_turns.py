"""The turn taking: the wake word, the earbud, the barge-in and the silence."""

from __future__ import annotations

from app.models import Trigger
from app.turns import TurnMachine, TurnPhase


def test_the_wake_word_opens_the_turn():
    machine = TurnMachine()
    machine.open(Trigger.WAKE_WORD, now=100.0)
    assert machine.phase is TurnPhase.LISTENING
    assert machine.trigger is Trigger.WAKE_WORD


def test_the_earbud_opens_the_turn():
    machine = TurnMachine()
    machine.open(Trigger.EARBUD, now=100.0)
    assert machine.trigger is Trigger.EARBUD


def test_the_turn_closes_when_the_courier_stops_talking():
    machine = TurnMachine(silence_timeout_s=6.0)
    machine.open(Trigger.WAKE_WORD, now=100.0)
    machine.heard(words=3, now=100.0)
    assert machine.should_close(now=103.0, moving=True) is False
    assert machine.should_close(now=107.0, moving=True) is True


def test_the_turn_closes_when_the_courier_says_nothing():
    machine = TurnMachine(silence_timeout_s=6.0)
    machine.open(Trigger.WAKE_WORD, now=100.0)
    assert machine.should_close(now=107.0, moving=True) is True


def test_a_parked_courier_is_given_more_time():
    machine = TurnMachine(silence_timeout_s=6.0, parked_silence_timeout_s=10.0)
    machine.open(Trigger.WAKE_WORD, now=100.0)
    assert machine.should_close(now=107.0, moving=True) is True
    assert machine.should_close(now=107.0, moving=False) is False
    assert machine.should_close(now=111.0, moving=False) is True


def test_a_silence_does_not_close_a_turn_that_is_not_listening():
    machine = TurnMachine(silence_timeout_s=1.0)
    assert machine.should_close(now=100.0, moving=True) is False


def test_the_barge_in_stops_the_reply():
    machine = TurnMachine(barge_in_min_words=2)
    machine.open(Trigger.EARBUD, now=100.0)
    machine.begin_speaking("Eight stops left.")
    assert machine.barge_in(words=2) is True


def test_a_noise_does_not_stop_the_reply():
    machine = TurnMachine(barge_in_min_words=2)
    machine.open(Trigger.EARBUD, now=100.0)
    machine.begin_speaking("Eight stops left.")
    assert machine.barge_in(words=1) is False


def test_nothing_barges_in_when_the_voice_is_not_speaking():
    machine = TurnMachine(barge_in_min_words=2)
    machine.open(Trigger.EARBUD, now=100.0)
    assert machine.barge_in(words=5) is False


def test_the_last_instruction_is_kept_for_the_repeat():
    machine = TurnMachine()
    machine.remember("Forty-two B Main North Road.")
    assert machine.last_reply == "Forty-two B Main North Road."


def test_the_turn_is_idle_again_after_the_voice_has_spoken():
    machine = TurnMachine()
    machine.open(Trigger.EARBUD, now=100.0)
    machine.begin_speaking("Delivered.")
    machine.end_speaking()
    assert machine.phase is TurnPhase.IDLE
    assert machine.words == 0


class TestTheStateIsPinned:
    """The machine's attributes, exactly (BUG-244: the mutation floor's
    survivors here were `opened_at = None`, `words = 1`, `words = None`,
    `last_reply = None` and `history.append(None)` - the earlier tests read
    phase/trigger only, so those mutants survived)."""

    def test_open_records_the_moment_and_resets_the_words(self):
        machine = TurnMachine()
        machine.open(Trigger.WAKE_WORD, now=100.0)
        assert machine.opened_at == 100.0
        assert machine.last_word_at == 100.0
        assert machine.words == 0

    def test_heard_keeps_the_most_words(self):
        machine = TurnMachine()
        machine.open(Trigger.WAKE_WORD, now=100.0)
        machine.heard(words=3, now=101.0)
        machine.heard(words=2, now=102.0)
        assert machine.words == 3
        assert machine.last_word_at == 102.0

    def test_the_turn_closes_at_exactly_the_timeout(self):
        machine = TurnMachine(silence_timeout_s=6.0)
        machine.open(Trigger.WAKE_WORD, now=100.0)
        assert machine.should_close(now=105.999, moving=True) is False
        assert machine.should_close(now=106.0, moving=True) is True

    def test_begin_speaking_remembers_the_reply(self):
        machine = TurnMachine()
        machine.open(Trigger.EARBUD, now=100.0)
        machine.begin_speaking("Eight stops left.")
        assert machine.phase is TurnPhase.SPEAKING
        assert machine.last_reply == "Eight stops left."

    def test_remember_keeps_the_instruction_stripped_in_the_history(self):
        machine = TurnMachine()
        machine.remember("  Eight stops left.  ")
        assert machine.history == ["Eight stops left."]
        assert machine.last_reply == "Eight stops left."
        machine.remember("   ")
        assert machine.history == ["Eight stops left."]
