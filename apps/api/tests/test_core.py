from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from app import nz_address
from app.agents import copilot
from app.agents.intake_graph import build_graph
from app.sequencing import Segment, Stop, sequence


def test_parse_spoken_address():
    p = nz_address.parse("forty two B main north road papa newey")
    # R23: "42B" is number 42 with suffix B; a unit is always written "2/14".
    assert (p.unit, p.number, p.suffix, p.street, p.suburb) == (
        None,
        "42",
        "B",
        "Main North Rd",
        "Papanui",
    )


def test_parse_unit_slash_is_a_unit_not_a_suffix():
    p = nz_address.parse("2/14 Harewood Rd, Bishopdale")
    assert (p.unit, p.number, p.suffix) == ("2", "14", None)


def test_parse_unit_slash_and_digits():
    p = nz_address.parse("2/14 Harewood Rd, Bishopdale")
    assert (p.unit, p.number, p.suburb) == ("2", "14", "Bishopdale")
    assert nz_address.parse("one four two Riccarton road rick a ton").number == "142"


def test_incomplete_address():
    assert not nz_address.parse("Smith Street").complete


def test_template_lock_order():
    stops = [Stop("a", "redwood:b st", 5, 0, 0), Stop("b", "redwood:a st", 9, 0, 0),
             Stop("c", "redwood:a st", 2, 0, 0), Stop("d", "redwood:a st", 3, 0, 0)]
    out = sequence(stops, [Segment("redwood:a st", "odd_first"), Segment("redwood:b st")])
    assert [s.location_id for s in out] == ["d", "b", "c", "a"]


def test_fast_path():
    assert copilot.fast_path("Delivered").tool == "mark_delivered"
    assert copilot.fast_path("left at the side gate").args == {"safe_place": "side gate"}
    assert copilot.fast_path("there's a dog here") is None


class FakeGeo:
    def geocode(self, key): return (-43.48, 172.6)
    def in_territory(self, run_id, lat, lon): return True
    def template(self, run_id): return [Segment("papanui:main north rd")]
    def notes(self, key): return []


def test_intake_graph_interrupt_and_resume():
    def extract(src, text):
        return [{"raw": line} for line in text.splitlines()]

    graph = build_graph(extract, lambda problem, raw: f"Fix {raw}?", FakeGeo(), MemorySaver())
    cfg = {"configurable": {"thread_id": "shift-1"}}
    out = graph.invoke({"run_id": "r", "source": "voice",
                        "text": "12 main north road papanui\nsmith street"}, cfg)
    assert out["__interrupt__"][0].value["speak"] == "Fix smith street?"
    out = graph.invoke(Command(resume={"index": 1, "raw": "8 main north road papanui"}), cfg)
    assert out["briefing"].startswith("2 stops")
