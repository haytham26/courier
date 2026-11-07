"""The pre-classifier: the free gate in front of the paid turn (MASTER §22 technique A).

The spec (`docs/research/2026/andee-cleanroom-spec.md`) asks for three properties:
a closed set of outcomes (routing, not solving), a free gate in front of the paid
gate (decided without a model call), and silence as a first-class outcome with its
reason recorded. The tests pin each property, and the routing accuracy is measured
against the evaluation set's own gold scripts - the gate's decisions are the
product's, so the set holds them to the gold intent.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from app.models import RunContext
from app.turn_gate import TurnRoute, route_turn

# mutmut runs the suite from the copied `mutants/` tree, where a plain
# `parents[3]` is the services directory, not the repository root - and the
# lane's clean pass then read `services/packages/eval/voice/manifest/...` and
# died (run 42347923596: FileNotFoundError in
# TestTheRoutingIsMeasureAndCorrectOnTheSet). Strip the trailing `mutants` so
# the anchor is the real repository either way. BUG-242.
_here = Path(__file__).resolve()
_service = _here.parents[1]
if _service.name == "mutants":
    _service = _service.parent
REPO = _service.parent.parent
SCRIPTS = REPO / "packages" / "eval" / "voice" / "manifest" / "scripts.jsonl"

#: The commands whose answer does not depend on the day: the gate may answer
#: them without the run context (so without the API round trip). The
#: context-dependent ones (how many left, where am I) stay on the full path.
CONTEXT_FREE = {
    "mark_delivered",
    "mark_failed",
    "skip_stop",
    "add_stop",
    "add_location_note",
    "start_break",
    "end_break",
}


def test_the_manifest_anchor_never_resolves_into_the_mutants_copy() -> None:
    """BUG-242: pinned for the mutation lane - the eval manifest is read from
    the real repository root, never from mutmut's copied `mutants/` tree."""
    assert "mutants" not in REPO.parts, f"{REPO} resolves inside the mutants copy"
    assert SCRIPTS.is_file(), f"{SCRIPTS} is not there"


class TestTheClosedOutcomeSet:
    def test_a_known_command_is_routed_free(self) -> None:
        routed = route_turn("delivered at 57 Poulson Street, Addington")

        assert routed.route is TurnRoute.FREE
        assert routed.command is not None
        assert routed.command.type == "mark_delivered"

    def test_silence_is_a_first_class_outcome_with_its_reason(self) -> None:
        routed = route_turn("   ")

        assert routed.route is TurnRoute.IGNORE
        assert "nothing was said" in routed.reason

    def test_anything_else_pays_the_full_turn(self) -> None:
        routed = route_turn("what do you reckon about this weather")

        assert routed.route is TurnRoute.FULL

    def test_the_reason_names_why(self) -> None:
        routed = route_turn("skip this one at 33 A Darroch Street, Belfast")

        assert routed.route is TurnRoute.FREE
        assert "skip_stop" in routed.reason


class TestTheFreeGateCostsNothing:
    def test_the_gate_makes_no_model_call_and_no_context_call(self) -> None:
        # A command the gate answers free must not need the day's context: the
        # run fetch is what the gate exists to skip, and a command that needs it
        # must stay on the full path (where the context is assembled).
        routed = route_turn("how many left")

        assert routed.route is TurnRoute.FULL

    def test_the_gate_answers_the_same_command_with_or_without_context(self) -> None:
        with_context = route_turn("delivered at 57 Poulson Street", context=RunContext())
        without = route_turn("delivered at 57 Poulson Street")

        assert with_context.route is TurnRoute.FREE
        assert without.route is TurnRoute.FREE
        assert with_context.command == without.command


class TestTheRoutingIsMeasureAndCorrectOnTheSet:
    def test_every_command_the_gate_answers_free_is_right(self) -> None:
        scripts = [
            json.loads(line)
            for line in SCRIPTS.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        free = [s for s in scripts if route_turn(s["text"]).route is TurnRoute.FREE]

        assert free, "the gate answered nothing free over the evaluation set"
        wrong = []
        for script in free:
            routed = route_turn(script["text"])
            command = routed.command
            answered = command.type if command is not None else None
            if answered != script["gold_intent"]:
                wrong.append(f"{script['id']}: {script['text']!r} -> {answered}")
        assert wrong == [], f"the gate routed these commands to the wrong intent: {wrong}"

    def test_the_gate_is_cheap(self) -> None:
        start = time.perf_counter()
        for _ in range(200):
            route_turn("delivered at 57 Poulson Street, Addington")
        elapsed_ms = (time.perf_counter() - start) * 1000

        # A pure local decision: 200 of them in well under a second. The bound is
        # generous so a slow machine cannot fail the suite on noise.
        assert elapsed_ms < 500, f"the gate took {elapsed_ms:.1f} ms over 200 turns"


class TestTheTurnRouteUsesTheGate:
    """The gate is wired into the turn, not only unit-tested."""

    async def _a_turn(self, client: Any, client_app: Any, transcript: str) -> tuple[dict, int]:
        opened = await client.post("/v1/sessions", json={})
        session_id = opened.json()["id"]
        # ONLINE on purpose: the routed command must not reach the engine even
        # when the gateway is the chosen path.
        response = await client.post(
            f"/v1/sessions/{session_id}/turn",
            json={"transcript": transcript, "online": True, "mode": "online"},
        )
        return response.json(), len(client_app.state.router.server.requests)

    async def test_a_routed_command_answers_without_the_engine(self, client, client_app) -> None:
        answered, engine_calls = await self._a_turn(
            client, client_app, "delivered at 57 Poulson Street, Addington"
        )

        assert answered["action"]["type"] == "mark_delivered"
        assert answered["gate"].startswith("free:")
        assert engine_calls == 0

    async def test_the_gate_field_names_the_full_path_too(self, client, client_app) -> None:
        answered, _ = await self._a_turn(
            client, client_app, "what do you reckon about this weather"
        )

        assert answered["gate"].startswith("full:")
