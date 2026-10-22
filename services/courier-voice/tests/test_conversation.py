"""The questions about the run, and the corrections that follow them."""

from __future__ import annotations

from app.conversation import answer_correction, answer_run_question
from app.models import RunContext, Stop, StopStatus


def a_run() -> RunContext:
    """A day in the middle."""
    return RunContext(
        shift_id="shift-1",
        stops=(
            Stop(
                id="s1",
                sequence=1,
                number="42",
                street="Main North Road",
                status=StopStatus.DELIVERED,
            ),
            Stop(
                id="s2",
                sequence=2,
                number="14",
                street="Harewood",
                status=StopStatus.ACTIVE,
                tip="side gate",
                size_class="small",
                van_zone="mid-rack",
            ),
            Stop(
                id="s3",
                sequence=3,
                number="3",
                street="Kowhai Street",
                status=StopStatus.PENDING,
            ),
            Stop(
                id="s4",
                sequence=4,
                number="9",
                street="Rimu Street",
                status=StopStatus.PENDING,
                parcel_for="Mrs Smith",
                size_class="large",
                van_zone="front",
            ),
        ),
        earnings_nzd=84.50,
        minutes_ahead=12,
        eta="3:30 pm",
        local_time="10:42 am",
    )


def test_how_many_are_left():
    answer = answer_run_question("how many left?", a_run())
    assert answer is not None
    assert answer.speech == "3 stops left."


def test_what_is_next():
    answer = answer_run_question("what's next?", a_run())
    assert answer is not None
    assert answer.speech == "next: 14 Harewood, then 3 Kowhai Street."


def test_where_am_i():
    answer = answer_run_question("where am I?", a_run())
    assert answer is not None
    assert answer.speech == "you're at 14 Harewood."


def test_where_is_the_parcel_for_mrs_smith():
    answer = answer_run_question("where's the parcel for Mrs Smith?", a_run())
    assert answer is not None
    assert answer.speech == "large box front, 9 Rimu Street."


def test_a_parcel_that_is_not_in_the_run():
    answer = answer_run_question("where's the parcel for Mr Jones?", a_run())
    assert answer is not None
    assert answer.speech == "I can't find that parcel."


def test_how_much_was_earned():
    answer = answer_run_question("how much did I earn today?", a_run())
    assert answer is not None
    assert answer.speech == "84.50 dollars so far."


def test_the_pay_the_service_cannot_see():
    answer = answer_run_question("how much did I earn today?", RunContext())
    assert answer is not None
    assert answer.speech == "I can't see today's pay yet."


def test_how_the_day_is_going():
    answer = answer_run_question("how's the day going?", a_run())
    assert answer is not None
    assert answer.speech == "1 done, 3 to go."


def test_when_the_day_is_finished():
    answer = answer_run_question("when do I finish?", a_run())
    assert answer is not None
    assert answer.speech == "you should be done by 3:30 pm."


def test_the_time():
    answer = answer_run_question("what time is it?", a_run())
    assert answer is not None
    assert answer.speech == "it's 10:42 am."


def test_a_correction_of_the_last_answer():
    answer = answer_correction("no, seventeen", a_run(), "how_many_left")
    assert answer is not None
    assert answer.speech == "seventeen stops left."


def test_a_correction_without_a_question_is_not_a_correction():
    assert answer_correction("no, seventeen", a_run(), None) is None


def test_the_repeat_uses_the_last_instruction():
    answer = answer_run_question("repeat", a_run(), last_instruction="Eight stops left.")
    assert answer is not None
    assert answer.speech == "Eight stops left."


def test_a_correction_of_the_answer_keeps_the_thread():
    first = answer_run_question("how many left?", a_run())
    assert first is not None
    second = answer_correction("no, three", a_run(), first.question)
    assert second is not None
    assert second.speech == "three stops left."


def test_the_quiet_mode_can_be_asked_for():
    answer = answer_run_question("be quiet", a_run())
    assert answer is not None
    assert answer.action is not None
    assert answer.action.type == "set_quiet_mode"
    assert answer.action.on is True


def test_the_verbosity_can_be_asked_for():
    answer = answer_run_question("be chatty", a_run())
    assert answer is not None
    assert answer.action is not None
    assert answer.action.type == "set_verbosity"
    assert answer.action.text == "chatty"


def test_a_sentence_that_is_not_a_question():
    assert answer_run_question("the radio is playing", a_run()) is None
