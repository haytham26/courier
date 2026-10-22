"""Tests for the intake graph (the agent that asks the courier again)."""
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from app.agents.intake_graph import build_graph
from app.sequencing import Segment


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
