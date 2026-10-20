"""Morning intake as a deterministic LangGraph state machine:

  ingest -> normalise -> verify --(anomalies & driver_present)--> ask_driver -> (interrupt) -> verify
                                 \\-> sequence -> zone -> brief -> END

LLMs only touch `ingest` (extraction) and `ask_driver` (phrasing); everything that
decides where a parcel goes is plain code and PostGIS."""
from __future__ import annotations

import operator
from collections.abc import Callable
from typing import Annotated, Any, Literal, Protocol, TypedDict

from langgraph.graph import END, StateGraph
from langgraph.types import interrupt

from .. import nz_address, sequencing


class Geo(Protocol):
    """Implemented by the PostGIS repository; fakeable in tests."""
    def geocode(self, address_key: str) -> tuple[float, float] | None: ...
    def in_territory(self, run_id: str, lat: float, lon: float) -> bool: ...
    def template(self, run_id: str) -> list[sequencing.Segment]: ...
    def notes(self, address_key: str) -> list[str]: ...


class Parcel(TypedDict, total=False):
    raw: str
    parsed: dict[str, Any]
    lat: float
    lon: float
    size_class: str | None
    anomaly: str | None
    van_zone: str


class IntakeState(TypedDict, total=False):
    run_id: str
    source: Literal["voice", "ocr"]
    text: str
    parcels: list[Parcel]
    pending_questions: list[str]
    answers: Annotated[list[dict], operator.add]
    ordered: list[str]          # address_keys in delivery order
    briefing: str


def build_graph(llm_extract, llm_phrase, geo: Geo, checkpointer=None):
    def ingest(s: IntakeState) -> dict[str, Any]:
        rows = llm_extract(s["source"], s["text"])            # list[{"raw":..., "size_class":...}]
        return {"parcels": [{"raw": r["raw"], "size_class": r.get("size_class")} for r in rows]}

    def normalise(s: IntakeState) -> dict[str, Any]:
        out = []
        for p in s["parcels"]:
            pa = nz_address.parse(p["raw"])
            out.append({**p, "parsed": pa.__dict__ | {"address_key": pa.address_key,
                                                     "street_key": pa.street_key,
                                                     "complete": pa.complete}})
        return {"parcels": out}

    def verify(s: IntakeState) -> dict[str, Any]:
        for a in s.get("answers", []):                          # apply driver corrections
            s["parcels"][a["index"]]["raw"] = a["raw"]
        seen, questions, out = set(), [], []
        for i, p in enumerate(s["parcels"]):
            if any(a["index"] == i for a in s.get("answers", [])):
                pa = nz_address.parse(p["raw"])
                p["parsed"] = pa.__dict__ | {"address_key": pa.address_key,
                                             "street_key": pa.street_key, "complete": pa.complete}
            if p.get("anomaly") == "set_aside":
                out.append(p)
                continue
            pp, p["anomaly"] = p["parsed"], None
            if not pp["complete"] or pp["confidence"] < 0.6:
                p["anomaly"] = "incomplete"
            elif (pt := geo.geocode(pp["address_key"])) is None:
                p["anomaly"] = "ungeocodable"
            else:
                p["lat"], p["lon"] = pt
                if not geo.in_territory(s["run_id"], *pt):
                    p["anomaly"] = "out_of_territory"
            if p["anomaly"] is None and pp["address_key"] in seen:
                p["anomaly"] = "duplicate"   # informational: same stop, multiple parcels
            seen.add(pp["address_key"])
            if p["anomaly"] in ("incomplete", "ungeocodable", "out_of_territory"):
                questions.append(f"{i}|{llm_phrase(p['anomaly'], p['raw'])}")
            out.append(p)
        return {"parcels": out, "pending_questions": questions}

    def ask_driver(s: IntakeState) -> dict[str, Any]:
        # Pauses the graph; the voice socket speaks the question and resumes with
        # Command(resume={"index": i, "raw": corrected text} | {"index": i, "raw": None} for "pull it").
        idx, question = s["pending_questions"][0].split("|", 1)
        reply = interrupt({"speak": question, "index": int(idx)})
        if reply.get("raw") is None:  # driver set the parcel aside (return to depot)
            s["parcels"][int(idx)]["anomaly"] = "set_aside"
            return {"parcels": s["parcels"], "pending_questions": s["pending_questions"][1:]}
        return {"answers": [reply], "pending_questions": []}  # re-verify everything

    def route_after_verify(s: IntakeState) -> str:
        return "ask_driver" if s.get("pending_questions") else "sequence"

    def route_after_ask(s: IntakeState) -> str:
        return "ask_driver" if s.get("pending_questions") else "verify"

    def sequence(s: IntakeState) -> dict[str, Any]:
        good = [p for p in s["parcels"] if p.get("anomaly") in (None, "duplicate")]
        stops: dict[str, sequencing.Stop] = {}
        for p in good:
            k = p["parsed"]["address_key"]
            num = int("".join(c for c in (p["parsed"]["number"] or "0") if c.isdigit()) or 0)
            stops.setdefault(k, sequencing.Stop(k, p["parsed"]["street_key"], num, p["lat"], p["lon"]))
        ordered = sequencing.sequence(list(stops.values()), geo.template(s["run_id"]))
        return {"ordered": [st.location_id for st in ordered]}

    def zone(s: IntakeState) -> dict[str, Any]:
        sizes = {p["parsed"]["address_key"]: p.get("size_class") for p in s["parcels"] if "parsed" in p}
        dummy = [sequencing.Stop(k, "", 0, 0, 0) for k in s["ordered"]]
        zones = sequencing.assign_van_zones(dummy, sizes)
        for p in s["parcels"]:
            if (k := p["parsed"]["address_key"]) in zones:
                p["van_zone"] = zones[k]
        return {"parcels": s["parcels"]}

    def brief(s: IntakeState) -> dict[str, Any]:
        n_ok = len(s["ordered"])
        aside = sum(p.get("anomaly") == "set_aside" for p in s["parcels"])
        msg = f"{n_ok} stops locked to your run."
        if aside:
            msg += f" {aside} set aside."
        return {"briefing": msg + " Load rear first."}

    g = StateGraph(IntakeState)
    nodes: list[tuple[str, Callable[[IntakeState], dict[str, Any]]]] = [
        ("ingest", ingest),
        ("normalise", normalise),
        ("verify", verify),
        ("ask_driver", ask_driver),
        ("sequence", sequence),
        ("zone", zone),
        ("brief", brief),
    ]
    for name, fn in nodes:
        # langgraph's add_node overloads do not accept a plain TypedDict
        # callable, so the call is checked by mypy but the overload is not
        # resolvable; the behaviour is covered by tests/test_core.py.
        g.add_node(name, fn)  # type: ignore[call-overload]
    g.set_entry_point("ingest")
    g.add_edge("ingest", "normalise")
    g.add_edge("normalise", "verify")
    g.add_conditional_edges("verify", route_after_verify, ["ask_driver", "sequence"])
    g.add_conditional_edges("ask_driver", route_after_ask, ["ask_driver", "verify", "sequence"])
    g.add_edge("sequence", "zone")
    g.add_edge("zone", "brief")
    g.add_edge("brief", END)
    return g.compile(checkpointer=checkpointer)
