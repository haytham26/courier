"""The harness of the shift simulations.

The harness is the measurement of the voice behaviour, so it is tested like
one: the manifest has to hold, the simulations have to run, and the
acceptance counts of EVAL.md have to be checked.
"""

from __future__ import annotations

import json
from pathlib import Path

from app.eval_harness import (
    NOT_MEASURED,
    TARGETS,
    load_simulations,
    run_simulations,
    score,
    write_results,
)

MANIFEST = Path("packages/eval/voice/manifest/shift_sims.json")


def the_manifest() -> Path:
    """The manifest, wherever the tests are run from."""
    root = Path(__file__).resolve().parents[3]
    candidate = root / MANIFEST
    if candidate.exists():
        return candidate
    return MANIFEST


def test_the_manifest_is_there():
    assert the_manifest().exists()


def test_the_manifest_holds_the_simulations():
    document = json.loads(the_manifest().read_text(encoding="utf-8"))
    slices = document["slices"]
    assert [row["id"] for row in slices] == ["shift_sim"]
    assert len(slices[0]["simulations"]) >= 3


def test_every_simulation_has_the_voice_and_the_noise():
    simulations = load_simulations(the_manifest())
    for simulation in simulations:
        assert simulation.id.strip() != ""
        assert simulation.name.strip() != ""
        assert simulation.noise.get("bed", "") != ""
        assert len(simulation.turns) >= 5


def test_every_turn_has_the_expectation():
    simulations = load_simulations(the_manifest())
    for simulation in simulations:
        for turn in simulation.turns:
            assert turn.transcript.strip() != ""
            assert turn.expect_intent.strip() != ""
            assert turn.expect_intent in (
                "chat",
                "question",
                "mark_delivered",
                "mark_failed",
                "skip_stop",
                "add_stop",
                "add_location_note",
                "how_many_left",
                "where_am_i",
                "set_map_mode",
                "repeat_or_detail",
                "start_shift",
                "end_shift",
                "set_quiet_mode",
                "set_verbosity",
            )


def test_the_simulations_run_against_the_service():
    import asyncio

    simulations = load_simulations(the_manifest())
    results, proactive = asyncio.run(run_simulations(simulations))
    assert len(results) == sum(len(simulation.turns) for simulation in simulations)
    assert proactive


def test_the_acceptance_counts_of_the_evaluation_contract_are_met():
    simulations = load_simulations(the_manifest())
    import asyncio

    results, proactive = asyncio.run(run_simulations(simulations))
    summary = score(results, proactive)
    assert summary["measured"]["intent_accuracy"] >= TARGETS["intent_accuracy"]["target"]
    assert summary["measured"]["false_action_rate"] <= TARGETS["false_action_rate"]["target"]
    assert summary["measured"]["word_rule_rate"] >= TARGETS["word_rule_rate"]["target"]
    assert summary["passed"] is True


def test_the_metrics_that_need_the_audio_are_not_claimed():
    """A number that was not measured is never reported as a pass."""
    simulations = load_simulations(the_manifest())
    import asyncio

    results, proactive = asyncio.run(run_simulations(simulations))
    summary = score(results, proactive)
    assert "M1_wer" in summary["not_measured"]
    assert "M4_wake_false_accepts" in summary["not_measured"]
    assert summary["not_measured"] == NOT_MEASURED


def test_the_results_are_written(tmp_path: Path):
    simulations = load_simulations(the_manifest())
    import asyncio

    results, proactive = asyncio.run(run_simulations(simulations))
    summary = score(results, proactive)
    write_results(tmp_path, results, summary)
    assert (tmp_path / "summary.json").exists()
    assert (tmp_path / "per_turn.csv").exists()
    assert (tmp_path / "environment.json").exists()
    document = json.loads((tmp_path / "summary.json").read_text(encoding="utf-8"))
    assert document["turns"] == len(results)


def test_the_environment_names_the_interpreter_that_ran(tmp_path: Path):
    """BUG-158: `environment.json` must not lie about what produced it.

    The Python version was the literal string `"3.11"` regardless of the
    interpreter that ran, and the engine a fixed string regardless of the engine
    configured. It happened to be correct today, which is what makes it
    dangerous: an artifact that can lie about its own run is not evidence.
    """
    import platform

    simulations = load_simulations(the_manifest())
    import asyncio

    results, proactive = asyncio.run(run_simulations(simulations))
    write_results(tmp_path, results, score(results, proactive))

    document = json.loads((tmp_path / "environment.json").read_text(encoding="utf-8"))

    assert document["python"] == platform.python_version()
    assert document["service"] == "courier-voice"


def test_the_environment_names_the_platform_too(tmp_path: Path):
    """The same answer for the machine: an artifact nobody can place is not
    evidence (BUG-158)."""
    import platform

    simulations = load_simulations(the_manifest())
    import asyncio

    results, proactive = asyncio.run(run_simulations(simulations))
    write_results(tmp_path, results, score(results, proactive))

    document = json.loads((tmp_path / "environment.json").read_text(encoding="utf-8"))

    assert document["platform"] == platform.platform()
