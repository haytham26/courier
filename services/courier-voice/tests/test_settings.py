"""The settings, the memory and the privacy controls.

The settings live in the app; the service honours them. The preferences and
the learned runs stay on the phone (on-device first), and the courier can
make the service forget a shift.
"""

from __future__ import annotations

from app.memory import InMemoryStore, apply_settings, new_session
from app.models import LearnedRuns, RunContext, Stop, StopStatus, Verbosity, VoiceSettings
from app.turns import TurnMachine


def test_the_settings_have_the_shape_the_app_holds():
    settings = VoiceSettings()
    assert settings.verbosity is Verbosity.NORMAL
    assert settings.voice == "nz"
    assert settings.speed == 1.0
    assert settings.quiet_mode is False
    assert settings.essentials_only is False
    assert settings.language == "en-NZ"
    assert settings.remember is True


def test_the_settings_are_honoured_by_the_service():
    memory = new_session("driver-1")
    settings = VoiceSettings(verbosity=Verbosity.CHATTY, quiet_mode=True)
    apply_settings(memory, settings)
    assert memory.settings.verbosity is Verbosity.CHATTY
    assert memory.settings.quiet_mode is True


def test_the_memory_of_the_shift_is_kept():
    store = InMemoryStore()
    memory = new_session("driver-1", "shift-1")
    memory.context = RunContext(stops=(Stop(id="s1", status=StopStatus.DELIVERED),))
    store.save(memory)
    found = store.get(memory.id)
    assert found is not None
    assert found.context.done_count == 1


def test_the_shift_of_one_courier_is_not_the_shift_of_another():
    store = InMemoryStore()
    first = new_session("driver-1")
    second = new_session("driver-2")
    store.save(first)
    store.save(second)
    assert [item.id for item in store.sessions_of("driver-1")] == [first.id]


def test_forgetting_clears_the_shift():
    memory = new_session("driver-1", "shift-1")
    memory.context = RunContext(stops=(Stop(id="s1", status=StopStatus.DELIVERED),))
    memory.last_instruction = "Eight stops left."
    memory.forget()
    assert memory.context.stops == ()
    assert memory.last_instruction is None


def test_the_memory_can_be_turned_off():
    memory = new_session("driver-1")
    memory.last_instruction = "Eight stops left."
    memory.last_question = "how_many_left"
    apply_settings(memory, VoiceSettings(remember=False))
    assert memory.last_instruction is None
    assert memory.last_question is None


def test_the_learned_runs_travel_with_the_turn():
    learned = LearnedRuns(
        usual_order=("s2", "s1"),
        service_times_s={"s1": 90},
        door_notes={"s2": "side gate"},
    )
    assert learned.usual_order == ("s2", "s1")
    assert learned.door_notes["s2"] == "side gate"


def test_the_turn_machine_belongs_to_the_shift():
    memory = new_session("driver-1")
    assert isinstance(memory.turn_machine, TurnMachine)
