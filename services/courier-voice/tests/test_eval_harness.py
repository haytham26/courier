"""The harness of the shift simulations.

The harness is the measurement of the voice behaviour, so it is tested like
one: the manifest has to hold, the simulations have to run, and the
acceptance counts of EVAL.md have to be checked.
"""

from __future__ import annotations

import json
import re
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


def test_the_results_carry_a_digest_and_never_the_words(tmp_path: Path):
    """BUG-157: a driver's words must never reach a tracked artifact.

    The results directory is git-tracked, and the harness wrote each turn's
    transcript verbatim. Today it holds only our own synthetic script bank, so
    the hazard is latent - but the real-courier slice is added during the beta,
    and the whole point of a results directory nobody reads before committing
    is that it will hold somebody's words one day.
    """
    simulations = load_simulations(the_manifest())
    import asyncio

    results, proactive = asyncio.run(run_simulations(simulations))
    write_results(tmp_path, results, score(results, proactive))

    rows = (tmp_path / "per_turn.csv").read_text(encoding="utf-8").splitlines()
    header = rows[0].split(",")
    assert "transcript" not in header, header
    assert "transcript_sha256" in header, header
    column = header.index("transcript_sha256")
    # Every cell of that column is the digest, and nothing that looks like a
    # sentence: a driver's words never reach the file.
    for line in rows[1:]:
        cell = line.split(",")[column]
        assert re.fullmatch(r"[0-9a-f]{16}", cell), cell
    # And a long verbatim line from the manifest is nowhere in the body.
    body = "\n".join(rows[1:])
    for spoken in (row.transcript for row in results):
        if len(spoken) > 12:
            assert spoken not in body, f"a verbatim transcript reached the results: {spoken}"


def test_the_digest_identifies_the_same_words_across_runs(tmp_path: Path):
    """The digest is not a hash of nothing: the same words hash the same, so a
    reader can still tell a run scored the same turn twice."""
    import hashlib

    simulations = load_simulations(the_manifest())
    import asyncio

    results, proactive = asyncio.run(run_simulations(simulations))
    write_results(tmp_path, results, score(results, proactive))

    rows = (tmp_path / "per_turn.csv").read_text(encoding="utf-8").splitlines()
    header = rows[0].split(",")
    column = header.index("transcript_sha256")
    written = [line.split(",")[column] for line in rows[1:]]

    assert written[0] == hashlib.sha256(results[0].transcript.encode("utf-8")).hexdigest()[:16]
