"""The scale simulation's turn set (`app/eval_scale.py`): what the run drives.

What is under test is this module's own contract, with the recognizer injected
as a seam the way `app/eval_audio.py` injects its judge: the sidecar's sha256 is
verified before a file is used, a file that no longer hashes is REFUSED rather
than quietly reused, the per-turn rows carry the judge's own answer, the
summarise step counts the action and the chatter legs separately, and the
false-action leg is the count of chatter rows the offline brain answered with a
command.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from app.eval_scale import main, run, score_turns, summarise, verified_rows
from app.eval_tts import write_jsonl

ROOT = Path(__file__).resolve().parents[3]


class FakeJudge:
    """The pinned judge's own seat: it answers the text it is handed."""

    def __init__(self, answers: dict[str, str] | None = None) -> None:
        self.answers = answers or {}

    def create_stream(self) -> Any:
        return self

    def accept_waveform(self, _rate: int, _samples: list[float]) -> None:
        return None

    def decode_stream(self) -> None:
        return None

    def result(self) -> Any:
        return self


class FakeRecognizer:
    """A recognizer whose answer comes from the file's own sha256."""

    def __init__(self, answers: dict[str, str] | None = None) -> None:
        self.answers = answers or {}

    def create_stream(self) -> Any:
        return self


def _a_row(identifier: str, sha: str, intent: str = "mark_delivered") -> dict[str, Any]:
    return {
        "script_id": identifier,
        "slice": "en_nz_quiet",
        "variant": "quiet",
        "text": "delivered at 57 Poulson Street, Addington",
        "gold_intent": intent,
        "status": "built",
        "file": f"data/voice/tts/{identifier}.wav",
        "sha256": sha,
        "oov_words": [],
    }


def _the_tree(tmp_path: Path, rows: list[dict[str, Any]]) -> Path:
    root = tmp_path
    for row in rows:
        path = root / row["file"]
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(f"the samples of {row['script_id']}".encode())
    write_jsonl(root / "sidecar.jsonl", rows)
    return root


class TestThePin:
    def test_every_built_row_is_kept_when_its_file_still_hashes(self, tmp_path: Path) -> None:
        row = _a_row("S0001", sha256_of_file(b"the samples of S0001"))
        root = _the_tree(tmp_path, [row])
        kept = verified_rows(root / "sidecar.jsonl", root)
        assert [item["script_id"] for item in kept] == ["S0001"]

    def test_a_file_that_no_longer_hashes_is_refused_by_name(self, tmp_path: Path) -> None:
        row = _a_row("S0001", "0" * 64)
        root = _the_tree(tmp_path, [row])
        assert verified_rows(root / "sidecar.jsonl", root) == []

    def test_a_row_that_was_never_synthesised_is_not_a_turn(self, tmp_path: Path) -> None:
        row = {
            **_a_row("S0401", "0" * 64),
            "status": "not synthesised",
            "reason": "Kokoro-82M has no Arabic voice",
        }
        del row["sha256"]
        root = _the_tree(tmp_path, [row])
        assert verified_rows(root / "sidecar.jsonl", root) == []

    def test_a_row_with_no_audio_file_names_the_row_it_dropped(self, tmp_path: Path) -> None:
        row = _a_row("S0401", "0" * 64)
        write_jsonl(tmp_path / "sidecar.jsonl", [row])
        assert verified_rows(tmp_path / "sidecar.jsonl", tmp_path) == []


class TestTheTurns:
    def test_the_judges_own_answer_is_what_the_turn_carries(self, tmp_path: Path) -> None:
        import app.eval_scale as module

        row = _a_row("S0001", sha256_of_file(b"the samples of S0001"))
        root = _the_tree(tmp_path, [row])
        monkey = pytest.MonkeyPatch()
        monkey.setattr(module, "transcribe", lambda _judge, _path: "delivered at 57 Poulson Street")
        try:
            turns = score_turns(verified_rows(root / "sidecar.jsonl", root), root, FakeJudge())
        finally:
            monkey.undo()
        assert turns[0]["hypothesis"] == "delivered at 57 Poulson Street"
        assert turns[0]["gold_intent"] == "mark_delivered"
        assert turns[0]["intent_ok"] is True
        assert turns[0]["file"] == "data/voice/tts/S0001.wav"

    def test_a_chatter_row_is_scored_against_noop(self, tmp_path: Path) -> None:
        import app.eval_scale as module

        row = _a_row("S0701", sha256_of_file(b"the samples of S0701"), intent="noop")
        root = _the_tree(tmp_path, [row])
        monkey = pytest.MonkeyPatch()
        monkey.setattr(module, "transcribe", lambda _judge, _path: "bloody fuel prices eh")
        try:
            turns = score_turns(verified_rows(root / "sidecar.jsonl", root), root, FakeJudge())
        finally:
            monkey.undo()
        assert turns[0]["gold_intent"] == "noop"
        assert turns[0]["parsed_intent"] == "noop"
        assert turns[0]["intent_ok"] is True


class TestTheSummary:
    def test_the_action_and_chatter_legs_are_counted_separately(self) -> None:
        turns = [
            {
                "turn_id": "a",
                "slice": "en_nz_quiet",
                "variant": "quiet",
                "gold_intent": "mark_delivered",
                "parsed_intent": "mark_delivered",
                "intent_ok": True,
                "hypothesis": "",
                "held_out": False,
                "oov_words": [],
            },
            {
                "turn_id": "b",
                "slice": "chatter",
                "variant": "quiet",
                "gold_intent": "noop",
                "parsed_intent": "mark_delivered",
                "intent_ok": False,
                "hypothesis": "",
                "held_out": False,
                "oov_words": ["x"],
            },
        ]
        summary = summarise(turns, "the judge")
        assert summary["turns"] == 2
        assert summary["action_turns"] == 1
        assert summary["chatter_turns"] == 1
        # The chatter row the parser answered with a command is the false action.
        assert summary["false_actions"] == 1
        assert summary["false_action_turns"] == ["b"]
        assert summary["turns_with_oov_words"] == 1

    def test_a_summary_with_no_turns_has_no_false_zero(self) -> None:
        summary = summarise([], "the judge")
        assert summary["false_action_rate"] is None
        assert summary["turns"] == 0


class TestTheRunner:
    def _args(self, tmp_path: Path) -> Any:
        import argparse

        return argparse.Namespace(
            root=str(tmp_path),
            sidecar="sidecar.jsonl",
            data="data/voice",
            out="turns.jsonl",
            results="results",
            no_judge=False,
        )

    def test_a_sidecar_that_is_missing_is_two_not_a_crash(self, tmp_path: Path) -> None:
        assert run(self._args(tmp_path)) == 2

    def test_the_run_writes_the_turn_set_and_the_summary(self, tmp_path: Path) -> None:
        import app.eval_scale as module

        row = _a_row("S0001", sha256_of_file(b"the samples of S0001"))
        root = _the_tree(tmp_path, [row])
        monkey = pytest.MonkeyPatch()
        monkey.setattr(module, "transcribe", lambda _judge, _path: "delivered at 57 Poulson Street")
        monkey.setattr(module, "ensure_judge", lambda _p: root / "the judge's dir")
        monkey.setattr(module, "load_judge", lambda _p: FakeRecognizer())
        try:
            assert run(self._args(root)) == 0
        finally:
            monkey.undo()
        turns = read_turns(root / "turns.jsonl")
        assert len(turns) == 1
        summary = json.loads((root / "results/summary.json").read_text(encoding="utf-8"))
        assert summary["turns"] == 1
        assert (root / "results/per_turn.csv").exists()

    def test_a_run_with_no_verifiable_file_refuses(self, tmp_path: Path) -> None:
        write_jsonl(tmp_path / "sidecar.jsonl", [_a_row("S0001", "0" * 64)])
        assert run(self._args(tmp_path)) == 2

    def test_main_parses_the_arguments_and_refuses_without_a_sidecar(self, tmp_path: Path) -> None:
        assert main(["--root", str(tmp_path), "--out", "turns.jsonl"]) == 2


def sha256_of_file(payload: bytes) -> str:
    """The sha256 of the bytes a fixture file holds (the sidecar's own form)."""
    import hashlib

    return hashlib.sha256(payload).hexdigest()


def read_turns(path: Path) -> list[dict[str, Any]]:
    return [
        json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()
    ]
