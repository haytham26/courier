"""What the voice says before it is asked.

The wording of MASTER_EXECUTION section 12 is binding, so the wording here is
checked word for word.
"""

from __future__ import annotations

from app.models import ProactiveType, RunContext, Stop, StopStatus, VoiceSettings
from app.proactive import (
    RULES,
    ProactiveEvent,
    end_of_day_line,
    for_event,
    morning_brief,
    next_stop_line,
    proactive_line,
)
from app.safety import MAX_WORDS_WHILE_MOVING, word_count


def a_run() -> RunContext:
    """A day with two stops behind the courier."""
    return RunContext(
        shift_id="shift-1",
        expected_stops=214,
        new_addresses=3,
        weather="rain after 2",
        returns_in_van=3,
        stops=(
            Stop(
                id="s1",
                sequence=1,
                number="42",
                street="Main North Road",
                suburb="Papanui",
                status=StopStatus.DELIVERED,
            ),
            Stop(
                id="s2",
                sequence=2,
                number="14",
                street="Harewood",
                suburb="Bishopdale",
                status=StopStatus.ACTIVE,
                tip="side gate",
                size_class="small",
                van_zone="mid-rack",
            ),
        ),
    )


def test_the_morning_brief_has_the_wording_of_the_spec():
    assert morning_brief(a_run()) == "214 stops, 3 new addresses, rain after 2"


def test_the_morning_brief_leaves_out_what_the_day_does_not_have():
    run = RunContext(expected_stops=40, new_addresses=0, weather="dry")
    assert morning_brief(run) == "40 stops, dry"


def test_the_next_stop_has_the_wording_of_the_spec():
    assert next_stop_line(a_run()) == "next: 14 Harewood, side gate, small box mid-rack"


def test_the_next_stop_leaves_out_what_is_not_known():
    run = RunContext(stops=(Stop(id="s1", sequence=1, number="7", street="Cranmer Street"),))
    assert next_stop_line(run) == "next: 7 Cranmer Street"


def test_the_end_of_day_has_the_wording_of_the_spec():
    run = RunContext(
        stops=(
            Stop(id="s1", status=StopStatus.DELIVERED),
            Stop(id="s2", status=StopStatus.FAILED),
        ),
        returns_in_van=3,
    )
    assert end_of_day_line(run) == "1 delivered, 1 failed, 3 returns in the van"


def test_the_lines_that_are_spoken_while_driving_keep_to_eight_words():
    run = a_run()
    for kind in (ProactiveType.MORNING_BRIEF, ProactiveType.NEXT_STOP, ProactiveType.APPROACH):
        line = proactive_line(kind, run, VoiceSettings())
        assert line is not None
        assert word_count(line) <= MAX_WORDS_WHILE_MOVING


def test_the_hazard_line_is_the_door_note():
    run = RunContext(
        stops=(Stop(id="s1", status=StopStatus.ACTIVE, hazard="dog at this address"),)
    )
    assert proactive_line(ProactiveType.HAZARD, run, VoiceSettings()) == "dog at this address"


def test_the_eta_line_says_ahead_or_behind():
    assert proactive_line(
        ProactiveType.ETA_CHECK, RunContext(minutes_ahead=12), VoiceSettings()
    ) == "you're 12 minutes ahead"
    assert proactive_line(
        ProactiveType.ETA_CHECK, RunContext(minutes_ahead=-12), VoiceSettings()
    ) == "you're 12 minutes behind"


def test_a_rule_the_courier_turned_off_is_not_spoken():
    run = a_run()
    settings = VoiceSettings()
    toggled = settings.model_copy(
        update={"proactive": settings.proactive.model_copy(update={"morning_brief": False})}
    )
    assert proactive_line(ProactiveType.MORNING_BRIEF, run, toggled) is None
    assert proactive_line(ProactiveType.NEXT_STOP, run, toggled) is not None


def test_the_shift_start_speaks_the_brief():
    chosen = for_event(ProactiveEvent.SHIFT_START, a_run(), VoiceSettings())
    assert chosen is not None
    kind, text = chosen
    assert kind is ProactiveType.MORNING_BRIEF
    assert text == "214 stops, 3 new addresses, rain after 2"


def test_the_stop_completed_speaks_the_next_stop():
    chosen = for_event(ProactiveEvent.STOP_COMPLETED, a_run(), VoiceSettings())
    assert chosen is not None
    kind, text = chosen
    assert kind is ProactiveType.NEXT_STOP
    assert text == "next: 14 Harewood, side gate, small box mid-rack"


def test_the_approach_speaks_the_same_line():
    chosen = for_event(ProactiveEvent.APPROACH, a_run(), VoiceSettings())
    assert chosen is not None
    kind, text = chosen
    assert kind is ProactiveType.APPROACH
    assert text == "next: 14 Harewood, side gate, small box mid-rack"


def test_the_end_of_the_day_speaks_the_summary():
    run = RunContext(
        stops=(Stop(id="s1", status=StopStatus.DELIVERED),),
        returns_in_van=1,
    )
    chosen = for_event(ProactiveEvent.SHIFT_END, run, VoiceSettings())
    assert chosen is not None
    kind, text = chosen
    assert kind is ProactiveType.END_OF_DAY
    assert text == "1 delivered, 0 failed, 1 returns in the van"


def test_every_rule_has_a_trigger_and_a_wording():
    for rule in RULES:
        assert rule.trigger.strip() != ""
        assert rule.wording.strip() != ""
        assert rule.kind in {item.kind for item in RULES}
