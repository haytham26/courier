"""The utterance measurement (A3): the scoring maths and the manifest update.

What is under test is the module's own contract - the normalisation, the WER,
the SNR mixing, which clip builds which utterance, and how the manifest rows
are rewritten - with the models injected as seams. The recognizer itself is a
file on disk and a native library; it is not under test here.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np
import pytest
import soundfile as sf

from app.eval_audio import (
    assign_clips,
    intent_of,
    normalise,
    run,
    score_intents,
    snr_mix,
    update_utterances,
    wer,
)


def _append_jsonl(path: Path, row: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(row) + "\n")


class TestNormalise:
    def test_it_lowers_and_drops_punctuation(self) -> None:
        assert normalise("Left it at the porch, mate!") == "left it at the porch mate"

    def test_it_keeps_the_numbers_a_courier_says(self) -> None:
        assert normalise("Delivered at 57 Poulson St.") == "delivered at 57 poulson st"

    def test_it_folds_the_diacritics_of_the_te_reo_names(self) -> None:
        assert normalise("Ōtautahi") == "otautahi"


class TestWer:
    def test_an_identical_pair_scores_zero(self) -> None:
        assert wer("delivered at 57 poulson", "delivered at 57 poulson") == 0.0

    def test_one_wrong_word_out_of_four(self) -> None:
        assert wer("delivered at 57 poulson", "delivered at 57 austin") == 0.25

    def test_an_empty_hypothesis_scores_one(self) -> None:
        assert wer("delivered at 57 poulson", "") == 1.0

    def test_a_missing_word_costs_one_edit(self) -> None:
        # five reference words, one deletion
        assert wer("delivered at 57 poulson street", "delivered at 57 poulson") == pytest.approx(0.2)


class TestSnrMix:
    def test_the_bed_goes_quiet_at_plus_infinity(self) -> None:
        signal = [0.5, -0.25, 0.125]
        mixed = snr_mix(signal, [1.0, -1.0, 1.0], float("inf"))
        assert mixed == pytest.approx(signal)

    def test_a_zero_db_mix_holds_signal_power(self) -> None:
        signal = [1.0, -1.0, 1.0, -1.0]
        bed = [0.25, -0.25, 0.25, -0.25]
        mixed = snr_mix(signal, bed, 0.0)
        # At 0 dB the bed's power equals the signal's: the noise component
        # (mixed minus signal) has the same RMS as the signal itself.
        noise = [value - original for value, original in zip(mixed, signal, strict=False)]
        signal_rms = sum(value**2 for value in signal) / len(signal)
        noise_rms = sum(value**2 for value in noise) / len(noise)
        assert noise_rms == pytest.approx(signal_rms)

    def test_a_negative_snr_lets_the_bed_be_louder(self) -> None:
        signal = [1.0, -1.0, 1.0, -1.0]
        bed = [0.25, -0.25, 0.25, -0.25]
        mixed = snr_mix(signal, bed, -10.0)
        noise = [value - original for value, original in zip(mixed, signal, strict=False)]
        signal_rms = (sum(value**2 for value in signal) / len(signal)) ** 0.5
        noise_rms = (sum(value**2 for value in noise) / len(noise)) ** 0.5
        # 10x the power, so about 3.16x the RMS
        assert noise_rms / signal_rms == pytest.approx(10 ** 0.5, rel=0.01)

    def test_the_length_is_the_signal_length(self) -> None:
        assert len(snr_mix([0.1, 0.2, 0.3], [1.0], 10.0)) == 3


class TestAssignClips:
    @staticmethod
    def utterance(identifier: str, script_id: str, slice_id: str, snr) -> dict:
        return {
            "id": identifier,
            "script_id": script_id,
            "slice": slice_id,
            "snr_db": snr,
            "bed": "quiet" if snr is None else "van",
            "status": "planned",
        }

    def test_the_nz_pool_round_robins_over_quiet_and_van_rows(self) -> None:
        clips = [
            {"clip_id": "nz-1", "kind": "nz"},
            {"clip_id": "nz-2", "kind": "nz"},
            {"clip_id": "mix-1", "kind": "mix"},
        ]
        rows = [
            self.utterance("U1", "S1", "en_nz_quiet", None),
            self.utterance("U2", "S2", "en_nz_quiet", None),
            self.utterance("U3", "S3", "en_nz_van", 0),
            self.utterance("U4", "S4", "en_nz_van", 5),
            self.utterance("U5", "S5", "en_nz_van", 10),
            self.utterance("U6", "S6", "en_mix", None),
        ]

        mapping = assign_clips(rows, clips)

        # the pool is spent over the quiet rows, then it returns for the van
        assert mapping["U1"]["clip_id"] == "nz-1"
        assert mapping["U2"]["clip_id"] == "nz-2"
        assert [mapping[row]["clip_id"] for row in ("U3", "U4", "U5")] == ["nz-1", "nz-2", "nz-1"]
        assert mapping["U6"]["clip_id"] == "mix-1"

    def test_every_van_row_builds(self) -> None:
        clips = [{"clip_id": f"nz-{index}", "kind": "nz"} for index in range(3)]
        rows = [
            self.utterance(f"U{index}", f"S{index}", "en_nz_van", 0) for index in range(10)
        ]
        mapping = assign_clips(rows, clips)
        assert len(mapping) == 10

    def test_a_missing_clip_leaves_the_row_unbuilt(self) -> None:
        rows = [self.utterance("U1", "S1", "en_nz_quiet", None)]
        assert assign_clips(rows, []) == {}


class TestUpdateUtterances:
    def test_the_built_row_keeps_its_fields_and_gains_the_audio(self, tmp_path: Path) -> None:
        path = tmp_path / "utterances.jsonl"
        path.write_text(
            '{"id":"U1","script_id":"S1","slice":"en_nz_quiet","snr_db":null,"bed":"quiet","status":"planned"}\n'
            '{"id":"U2","script_id":"S1","slice":"en_nz_van","snr_db":0,"bed":"van","status":"planned"}\n',
            encoding="utf-8",
        )
        update_utterances(
            path,
            {
                "U1": {"file": "data/voice/audio/U1.wav", "sha256": "a" * 64, "clip_id": "nz-1"},
                "U2": {"file": "data/voice/audio/U2.wav", "sha256": "b" * 64, "clip_id": "nz-1"},
            },
        )
        rows = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]
        assert rows[0]["status"] == "built"
        assert rows[0]["file"] == "data/voice/audio/U1.wav"
        assert rows[0]["sha256"] == "a" * 64
        assert rows[1]["snr_db"] == 0
        assert rows[1]["status"] == "built"

    def test_an_unbuilt_row_is_left_planned(self, tmp_path: Path) -> None:
        path = tmp_path / "utterances.jsonl"
        path.write_text('{"id":"U1","script_id":"S1","slice":"mi_places","snr_db":null,"bed":"quiet","status":"planned"}\n', encoding="utf-8")
        update_utterances(path, {})
        rows = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]
        assert rows[0]["status"] == "planned"
        assert "file" not in rows[0]


class TestTheBuild:
    """The end-to-end build with the audio seams faked.

    A clip and a bed are synthetic wav files; the judge is a recorder that
    answers a fixed string, so the whole run - build, mix, manifest update,
    scoring and the result files - is exercised without a model or a network.
    """

    @staticmethod
    def first_line() -> str:
        return "delivered at 57 Poulson Street, Addington\n"

    def make_manifest(self, root: Path) -> Path:
        manifest = root / "manifest"
        manifest.mkdir(parents=True)
        _append_jsonl(manifest / "addresses.jsonl", {"id": "A1", "number": "57", "street": "Poulson Street", "suburb": "Addington"})
        for slice_id in ("en_nz_quiet", "en_nz_van", "en_mix", "chatter"):
            for index in range(3):
                _append_jsonl(
                    manifest / "scripts.jsonl",
                    {
                        "id": f"S-{slice_id}-{index}",
                        "slice": slice_id,
                        "text": f"{slice_id} {index}",
                        "gold_intent": "noop",
                        "gold_slots": {},
                        "tags": ["t"],
                        "address_id": "A1",
                    },
                )
        for slice_id, snrs in (("en_nz_quiet", [None]), ("en_nz_van", [0, 5, 10]), ("en_mix", [None]), ("chatter", [None])):
            index = 0
            for script_index in range(3):
                for snr in snrs:
                    _append_jsonl(
                        manifest / "utterances.jsonl",
                        {
                            "id": f"U-{slice_id}-{index}",
                            "script_id": f"S-{slice_id}-{script_index}",
                            "slice": slice_id,
                            "snr_db": snr,
                            "bed": "quiet" if snr is None else "van",
                            "status": "planned",
                        },
                    )
                    index += 1
        return manifest

    def make_data(self, manifest: Path) -> None:
        voice = manifest / "data"
        for name in ("nz-1", "nz-2", "mix-1"):
            kind = "mix" if name.startswith("mix") else "nz"
            samples = np.sin(np.linspace(0, 8 * np.pi, 24000)) * 0.2
            file = voice / "common-voice" / "clips" / f"{kind}-{name}.wav"
            file.parent.mkdir(parents=True, exist_ok=True)
            sf.write(str(file), samples.astype(np.float32), 24000)
            _append_jsonl(
                voice / "common-voice" / "clips.jsonl",
                {
                    "kind": kind,
                    "clip_id": name,
                    "accent": "New Zealand English" if kind == "nz" else "Australian English",
                    "sentence": f"a sentence for {name}",
                    "file": f"manifest/data/common-voice/clips/{kind}-{name}.wav",
                    "bytes": file.stat().st_size,
                    "sha256": "?" * 64,
                },
            )
        bed = voice / "noise" / "bed-01.wav"
        bed.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(bed), (np.random.RandomState(1).rand(48000) - 0.5) * 0.3, 48000)
        _append_jsonl(
            voice / "noise" / "noise.jsonl",
            {"file": "manifest/data/noise/bed-01.wav", "source": "test", "original": "test/bed-01.wav", "bytes": bed.stat().st_size, "sha256": "!" * 64},
        )

    class FakeJudge:
        """A recognizer that answers what it is told, and remembers the calls."""

        def __init__(self, answer: str = "a sentence for nz-1") -> None:
            self.answer = answer
            self.calls: list[int] = []

        def create_stream(self) -> Any:
            class Stream:
                def __init__(self, judge: TestTheBuild.FakeJudge) -> None:
                    self.judge = judge

                def accept_waveform(self, rate: int, samples: list[float]) -> None:
                    self.judge.calls.append(len(samples))

                @property
                def result(self) -> Any:
                    class Result:
                        def __init__(self, answer: str) -> None:
                            self.text = answer

                    return Result(self.judge.answer)

            return Stream(self)

        def decode_stream(self, stream: Any) -> None:
            return None

    def test_the_open_slices_are_built_and_scored(self, tmp_path: Path) -> None:
        manifest = self.make_manifest(tmp_path)
        self.make_data(manifest)
        args = argparse.Namespace(
            manifest="manifest",
            data="manifest/data",
            out="results",
            root=str(tmp_path),
            no_judge=False,
        )

        code = run(args, judge=self.FakeJudge(), judge_label="a fake judge (the tests)")

        assert code == 0
        rows = [json.loads(line) for line in (manifest / "utterances.jsonl").read_text(encoding="utf-8").splitlines() if line]
        built = [row for row in rows if row["status"] == "built"]
        # 3 quiet + 9 van + 3 mix: the chatter slice stays planned
        assert len(built) == 15
        assert all(row["sha256"] for row in built)
        assert len(list((manifest / "data" / "audio").glob("*.wav"))) == 15
        summary = json.loads((tmp_path / "results" / "summary.json").read_text(encoding="utf-8"))
        assert summary["built"] == 15
        assert summary["judge"] == "a fake judge (the tests)"
        assert summary["open_slices"]["en_nz_van"]["utterances"] == 9
        # the WER of the judge's answer against each clip's own sentence
        assert summary["open_slices"]["en_nz_quiet"]["wer_mean"] > 0
        assert (tmp_path / "results" / "per_utterance.csv").exists()
        assert (tmp_path / "results" / "environment.json").exists()


class TestIntentScoring:
    def test_the_no_command_is_the_noop(self) -> None:
        assert intent_of(None) == "noop"

    def test_the_action_type_is_the_intent(self) -> None:
        assert intent_of({"type": "mark_delivered"}) == "mark_delivered"

    def test_the_rate_counts_each_slice(self) -> None:
        rows = [
            {"slice": "en_nz_quiet", "expected": "mark_delivered", "actual": "mark_delivered"},
            {"slice": "en_nz_quiet", "expected": "mark_delivered", "actual": "skip_stop"},
            {"slice": "chatter", "expected": "noop", "actual": "noop"},
        ]
        scored = score_intents(rows)
        assert scored["en_nz_quiet"] == {"correct": 1, "total": 2, "rate": 0.5}
        assert scored["chatter"] == {"correct": 1, "total": 1, "rate": 1.0}
