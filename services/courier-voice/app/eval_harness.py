"""The harness of the scripted shift simulations.

MASTER_EXECUTION section 12 asks for scripted full-shift simulations (the
voice and the noise) in the evaluation set, and `docs/squads/voice/EVAL.md`
sets the acceptance counts. This module runs those simulations against the
service and scores them.

What the harness measures is the behaviour of the service: the intent of every
turn, the false actions on the turns that were not commands, the eight word
rule while driving, the barge-in, the offline switch and the latency of the
service.

What the harness cannot measure is written down as **not measured**, with the
reason: the word error rate, the address accuracy, the wake word rates and
the battery need the audio and a device, and the audio is not in the
repository yet (EVAL.md section 5). A number that was not measured is never
reported as a pass.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import hashlib
import json
import platform
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from httpx import ASGITransport, AsyncClient

from .auth import Principal, get_principal
from .main import create_app
from .models import Mode, Stop, Trigger
from .run_client import RunClient
from .safety import MAX_WORDS_WHILE_MOVING

#: The acceptance counts of EVAL.md.
TARGETS: dict[str, dict[str, Any]] = {
    "intent_accuracy": {"target": 0.97, "direction": "at_least", "metric": "M3"},
    "false_action_rate": {"target": 0.01, "direction": "at_most", "metric": "M9"},
    "word_rule_rate": {"target": 1.0, "direction": "at_least", "metric": "driving-safe"},
    "service_latency_p95_ms": {"target": 700.0, "direction": "at_most", "metric": "M6"},
}

#: The metrics that need the audio or a device, and why they are not measured.
NOT_MEASURED: dict[str, str] = {
    "M1_wer": "the audio of the set is not generated yet (EVAL.md section 5)",
    "M2_address_accuracy": "the address is parsed on the device, not in the service",
    "M4_wake_false_accepts": "the non-speech corpus does not exist yet",
    "M5_wake_misses": "the non-speech corpus does not exist yet",
    "M7_battery": "the battery is measured on a device, not in the service",
    "M8_tts_intelligibility": "the audio of the set is not generated yet",
}


@dataclass
class TurnExpectation:
    """What one turn of a simulation expects."""

    transcript: str
    expect_intent: str = "chat"
    expect_speech: str | None = None
    trigger: str = "push_to_talk"
    speed_kmh: float = 0.0
    audio_focus: str = "normal"
    online: bool = False
    mode: str = "offline"
    max_words: int | None = None
    expect_barge_in: bool | None = None
    expect_ended_turn: bool | None = None


@dataclass
class Simulation:
    """One scripted shift."""

    id: str
    name: str
    noise: dict[str, Any] = field(default_factory=dict)
    environment: dict[str, Any] = field(default_factory=dict)
    stops: list[dict[str, Any]] = field(default_factory=list)
    turns: list[TurnExpectation] = field(default_factory=list)
    proactive: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class ProactiveResult:
    """What the voice wanted to say first during a shift."""

    simulation: str
    event: str
    expected: str
    measured: str
    passed: bool


@dataclass
class TurnResult:
    """What the service answered for one turn."""

    simulation: str
    turn: int
    transcript: str
    expected_intent: str
    actual_intent: str
    speech: str
    expected_speech: str | None
    words: int
    max_words: int | None
    barge_in: bool
    expected_barge_in: bool | None
    ended_turn: bool
    expected_ended_turn: bool | None
    latency_ms: float
    passed: bool
    note: str = ""


def _turn_of(row: dict[str, Any]) -> TurnExpectation:
    """One turn of the manifest."""
    return TurnExpectation(
        transcript=str(row.get("transcript", "")),
        expect_intent=str(row.get("expect_intent", "chat")),
        expect_speech=row.get("expect_speech"),
        trigger=str(row.get("trigger", "push_to_talk")),
        speed_kmh=float(row.get("speed_kmh", 0.0)),
        audio_focus=str(row.get("audio_focus", "normal")),
        online=bool(row.get("online", False)),
        mode=str(row.get("mode", "offline")),
        max_words=row.get("max_words"),
        expect_barge_in=row.get("expect_barge_in"),
        expect_ended_turn=row.get("expect_ended_turn"),
    )


def _simulation_of(row: dict[str, Any]) -> Simulation:
    """One simulation of the manifest."""
    return Simulation(
        id=str(row.get("id", "")),
        name=str(row.get("name", "")),
        noise=dict(row.get("noise", {})),
        environment=dict(row.get("environment", {})),
        stops=list(row.get("stops", [])),
        turns=[_turn_of(turn) for turn in row.get("turns", [])],
        proactive=list(row.get("proactive", [])),
    )


def resolve_path(path: Path) -> Path:
    """The path of a file, whether it is given from the repo root or the service."""
    if path.is_absolute():
        return path
    root = Path(__file__).resolve().parents[3]
    candidate = root / path
    if candidate.exists():
        return candidate
    local = Path.cwd() / path
    if local.exists():
        return local
    return candidate


def load_simulations(path: Path) -> list[Simulation]:
    """The simulations of the manifest."""
    document = json.loads(resolve_path(path).read_text(encoding="utf-8"))
    rows: list[dict[str, Any]] = []
    for slice_row in document.get("slices", []):
        rows.extend(slice_row.get("simulations", []))
    return [_simulation_of(row) for row in rows]


def _intent_of(action: dict[str, Any] | None) -> str:
    """The intent of an answer: the action, or the kind of the reply."""
    if action is None:
        return "chat"
    return str(action.get("type", ""))


def _matches(expected: str, actual: str) -> bool:
    """Whether the answer is the one the simulation expected."""
    if expected in {"chat", "question"}:
        return actual == "chat"
    return actual == expected


def _passed(turn: TurnExpectation, actual_intent: str, speech: str) -> tuple[bool, str]:
    """Whether the turn passed, and why not when it did not."""
    if not _matches(turn.expect_intent, actual_intent):
        return False, f"expected the intent {turn.expect_intent}, got {actual_intent}"
    if turn.expect_speech is not None and speech != turn.expect_speech:
        return False, f"expected the words {turn.expect_speech!r}, got {speech!r}"
    limit = turn.max_words
    if limit is not None and len(speech.split()) > limit:
        return False, f"the line is longer than {limit} words"
    return True, ""


class NoNetworkRunClient(RunClient):
    """The run client of the harness: the phone's own context is the run."""

    def stops(self, shift_id: str, token: str) -> list[Stop]:
        """No stops from the API: the phone has them."""
        return []


async def run_simulations(
    simulations: list[Simulation],
) -> tuple[list[TurnResult], list[ProactiveResult]]:
    """The simulations, run against the service."""
    service = create_app(run_client=NoNetworkRunClient("http://127.0.0.1:9"))
    principal = Principal(user_id="driver-sim", claims={"sub": "driver-sim"}, token="sim")
    service.dependency_overrides[get_principal] = lambda: principal
    transport = ASGITransport(app=service)

    results: list[TurnResult] = []
    proactive_results: list[ProactiveResult] = []
    async with AsyncClient(transport=transport, base_url="http://courier-voice") as client:
        for simulation in simulations:
            context = {
                # The simulation's own run: the phone is the API in a
                # simulation, so the shift is named inside the snapshot rather
                # than at the session, which the API would have to answer for
                # (BUG-148).
                "shift_id": simulation.id,
                "expected_stops": simulation.environment.get("expected_stops", 0),
                "new_addresses": simulation.environment.get("new_addresses", 0),
                "weather": simulation.environment.get("weather"),
                "returns_in_van": simulation.environment.get("returns_in_van", 0),
                "stops": simulation.stops,
            }
            opened = await client.post("/v1/sessions", json={"context": context})
            session_id = str(opened.json()["id"])

            for row in simulation.proactive:
                event = str(row.get("event", "shift_start"))
                expected = str(row.get("expect", ""))
                response = await client.post(
                    f"/v1/sessions/{session_id}/proactive", json={"event": event}
                )
                measured = str(response.json().get("text", ""))
                proactive_results.append(
                    ProactiveResult(
                        simulation=simulation.id,
                        event=event,
                        expected=expected,
                        measured=measured,
                        passed=measured == expected,
                    )
                )

            for index, turn in enumerate(simulation.turns):
                started = time.monotonic()
                response = await client.post(
                    f"/v1/sessions/{session_id}/turn",
                    json={
                        "transcript": turn.transcript,
                        "trigger": Trigger(turn.trigger).value,
                        "speed_kmh": turn.speed_kmh,
                        "audio_focus": turn.audio_focus,
                        "online": turn.online,
                        "mode": Mode(turn.mode).value,
                    },
                )
                elapsed = (time.monotonic() - started) * 1000
                body = response.json()
                actual_intent = _intent_of(body.get("action"))
                speech = str(body.get("speech", ""))
                passed, note = _passed(turn, actual_intent, speech)
                if turn.expect_barge_in is not None and (
                    bool(body.get("barge_in")) != turn.expect_barge_in
                ):
                    passed = False
                    note = f"expected the barge in {turn.expect_barge_in}"
                if turn.expect_ended_turn is not None and (
                    bool(body.get("ended_turn")) != turn.expect_ended_turn
                ):
                    passed = False
                    note = f"expected the turn to end {turn.expect_ended_turn}"
                results.append(
                    TurnResult(
                        simulation=simulation.id,
                        turn=index,
                        transcript=turn.transcript,
                        expected_intent=turn.expect_intent,
                        actual_intent=actual_intent,
                        speech=speech,
                        expected_speech=turn.expect_speech,
                        words=len(speech.split()),
                        max_words=turn.max_words,
                        barge_in=bool(body.get("barge_in")),
                        expected_barge_in=turn.expect_barge_in,
                        ended_turn=bool(body.get("ended_turn")),
                        expected_ended_turn=turn.expect_ended_turn,
                        latency_ms=elapsed,
                        passed=passed,
                        note=note,
                    )
                )
    return results, proactive_results


def _proactive_lines(client: Any, simulation: Simulation, session_id: str) -> list[str]:
    """The lines the voice wants to say first during a shift."""
    lines: list[str] = []
    for row in simulation.proactive:
        event = str(row.get("event", "shift_start"))
        response = client.post(f"/v1/sessions/{session_id}/proactive", json={"event": event})
        body = response.json()
        lines.append(str(body.get("text", "")))
    return lines


def score(
    results: list[TurnResult], proactive_results: list[ProactiveResult] | None = None
) -> dict[str, Any]:
    """The scores of a run, against the acceptance counts of EVAL.md."""
    total = len(results)
    intents = [row for row in results if row.expected_intent not in ("chat", "question")]
    chatter = [row for row in results if row.expected_intent in ("chat", "question")]
    moving = [row for row in results if row.max_words == MAX_WORDS_WHILE_MOVING]

    intent_accuracy = (
        sum(1 for row in intents if row.passed) / len(intents) if intents else 1.0
    )
    false_actions = sum(1 for row in chatter if row.actual_intent != "chat")
    false_action_rate = false_actions / len(chatter) if chatter else 0.0
    word_rule_rate = sum(1 for row in moving if row.words <= MAX_WORDS_WHILE_MOVING) / len(
        moving
    ) if moving else 1.0
    latencies = [row.latency_ms for row in results] or [0.0]

    measured = {
        "intent_accuracy": round(intent_accuracy, 4),
        "false_action_rate": round(false_action_rate, 4),
        "word_rule_rate": round(word_rule_rate, 4),
        "service_latency_p95_ms": round(_percentile(latencies, 0.95), 2),
    }
    checks: dict[str, Any] = {}
    for name, target in TARGETS.items():
        value = measured[name]
        if target["direction"] == "at_least":
            passed = value >= target["target"]
        else:
            passed = value <= target["target"]
        checks[name] = {
            "metric": target["metric"],
            "target": target["target"],
            "direction": target["direction"],
            "measured": value,
            "passed": passed,
        }
    proactive = proactive_results or []
    return {
        "turns": total,
        "measured": measured,
        "checks": checks,
        "proactive": [
            {
                "simulation": row.simulation,
                "event": row.event,
                "expected": row.expected,
                "measured": row.measured,
                "passed": row.passed,
            }
            for row in proactive
        ],
        "not_measured": NOT_MEASURED,
        "passed": all(check["passed"] for check in checks.values())
        and all(row.passed for row in proactive),
    }


def _percentile(values: list[float], fraction: float) -> float:
    """The percentile of a list of numbers."""
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, int(round(fraction * (len(ordered) - 1))))
    return ordered[index]


def write_results(out_dir: Path, results: list[TurnResult], summary: dict[str, Any]) -> None:
    """The three files the evaluation contract asks for."""
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    with (out_dir / "per_turn.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "simulation",
                "turn",
                # BUG-157: the transcript is hashed, never written verbatim. The
                # results directory is git-tracked, and the moment the
                # real-courier slice is recorded a driver's own words and the
                # addresses of his run would land in a tracked artifact. A
                # 16-hex-character digest still lets a reader see that two runs
                # scored the same words (and that a change in the engine moved
                # a turn) without storing anybody's words.
                "transcript_sha256",
                "expected_intent",
                "actual_intent",
                "speech",
                "words",
                "barge_in",
                "ended_turn",
                "latency_ms",
                "passed",
                "note",
            ]
        )
        for row in results:
            writer.writerow(
                [
                    row.simulation,
                    row.turn,
                    hashlib.sha256(row.transcript.encode("utf-8")).hexdigest()[:16],
                    row.expected_intent,
                    row.actual_intent,
                    row.speech,
                    row.words,
                    row.barge_in,
                    row.ended_turn,
                    round(row.latency_ms, 2),
                    row.passed,
                    row.note,
                ]
            )
    environment = {
        "service": "courier-voice",
        "engine": "on-device (the deterministic brain of the service)",
        "audio": "none: the simulations are scored on the text of the turns",
        # BUG-158: what actually ran, not what the harness was written on. An
        # artifact that can lie about its own run is not evidence, and a
        # hardcoded "3.11" was correct only by luck.
        "python": platform.python_version(),
        "platform": platform.platform(),
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    (out_dir / "environment.json").write_text(json.dumps(environment, indent=2), encoding="utf-8")


def _say(line: str) -> None:
    """A line on the standard output of the command."""
    sys.stdout.write(f"{line}\n")


def main(argv: list[str] | None = None) -> int:
    """The command line of the harness."""
    parser = argparse.ArgumentParser(description="Runs the shift simulations of the voice.")
    parser.add_argument(
        "--manifest",
        default="packages/eval/voice/manifest/shift_sims.json",
        help="the manifest of the simulations",
    )
    parser.add_argument(
        "--out",
        default="packages/eval/voice/results/shift-sim",
        help="where the results are written",
    )
    arguments = parser.parse_args(argv)

    simulations = load_simulations(Path(arguments.manifest))
    if not simulations:
        _say("the manifest holds no simulation")
        return 1

    results, proactive_results = asyncio.run(run_simulations(simulations))
    summary = score(results, proactive_results)
    write_results(resolve_path(Path(arguments.out)), results, summary)
    _say(f"the shift simulations: {summary['turns']} turns, passed={summary['passed']}")
    for name, check in summary["checks"].items():
        verdict = "ok" if check["passed"] else "FAILED"
        _say(f"  {name}: {check['measured']} (target {check['target']}) {verdict}")
    return 0 if summary["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
