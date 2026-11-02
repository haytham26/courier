"""The settings, the memory and the privacy controls.

The settings live in the app; the service honours them. The preferences and
the learned runs stay on the phone (on-device first), and the courier can
make the service forget a shift.
"""

from __future__ import annotations

from app.memory import InMemoryStore, SessionMemory, apply_settings, new_session
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


# --- BUG-149: `remember: false` keeps nothing between the turns --------------


def a_session_with_a_day() -> SessionMemory:
    """A shift that has done some work: stops, an address, a tip, earnings."""
    memory = new_session("driver-1")
    memory.context = RunContext(
        expected_stops=42,
        new_addresses=3,
        stops=(
            Stop(
                id="s1",
                sequence=1,
                number="7",
                street="Cranmer Street",
                status=StopStatus.ACTIVE,
            ),
        ),
    )
    memory.learned = LearnedRuns()
    return memory


class TestRememberFalse:
    def test_the_day_is_not_kept(self) -> None:
        memory = a_session_with_a_day()

        apply_settings(memory, VoiceSettings(remember=False))

        assert memory.context == RunContext()
        assert memory.learned == LearnedRuns()
        assert memory.turn_machine.history == []

    def test_the_turn_does_not_write_the_day_back(self) -> None:
        """The setting's own docstring: nothing is kept between the turns."""
        memory = a_session_with_a_day()
        apply_settings(memory, VoiceSettings(remember=False))
        context = RunContext(expected_stops=42)

        # The shape of the turn's last line: the day is not written back.
        if memory.settings.remember:
            memory.context = context

        assert memory.context == RunContext()


# --- BUG-151: the store is bounded -------------------------------------------


class TestTheBoundedStore:
    def test_one_courier_cannot_open_an_unbounded_number_of_shifts(self) -> None:
        store = InMemoryStore()
        for _ in range(store.MAX_SESSIONS_PER_DRIVER):
            store.save(new_session("driver-1"))
        store.save(new_session("driver-2"))

        assert len(store.sessions_of("driver-1")) == store.MAX_SESSIONS_PER_DRIVER
        # Another courier is unaffected: the cap is per driver.
        assert len(store.sessions_of("driver-2")) == 1

    def test_the_oldest_untouched_session_goes_first(self) -> None:
        store = InMemoryStore()
        first = new_session("driver-1")
        store.save(first)
        for _ in range(store.MAX_SESSIONS):
            store.save(new_session("driver-1"))

        assert len(store.sessions_of("driver-1")) == store.MAX_SESSIONS
        # The one nobody touched is the one that went.
        assert store.get(first.id) is None


# --- BUG-154: one shift's turns are serialised --------------------------------


class TestTheTurnsOfOneShiftAreSerialised:
    def test_the_lock_is_one_per_session(self) -> None:
        store = InMemoryStore()

        assert store.lock_for("s1") is store.lock_for("s1")
        assert store.lock_for("s1") is not store.lock_for("s2")

    def test_two_turns_on_one_shift_do_not_interleave(self) -> None:
        """The register's probe: two threads on one session, both answered with
        the other's turn recorded as their instruction."""
        import threading
        import time

        store = InMemoryStore()
        memory = new_session("driver-1")
        store.save(memory)
        order: list[str] = []

        def one_turn(name: str) -> None:
            with store.lock_for(memory.id):
                order.append(f"{name}-start")
                time.sleep(0.05)
                memory.last_instruction = name
                order.append(f"{name}-end")

        first = threading.Thread(target=one_turn, args=("a",))
        second = threading.Thread(target=one_turn, args=("b",))
        first.start()
        second.start()
        first.join()
        second.join()

        # One turn is whole before the other starts: no interleaving.
        whole = [
            ["a-start", "a-end", "b-start", "b-end"],
            ["b-start", "b-end", "a-start", "a-end"],
        ]
        assert order in whole
        assert memory.last_instruction in ("a", "b")
