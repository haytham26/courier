"""The utterance measurement (A3): the scoring maths and the manifest update.

What is under test is the module's own contract - the normalisation, the WER,
the SNR mixing, which clip builds which utterance, and how the manifest rows
are rewritten - with the models injected as seams. The recognizer itself is a
file on disk and a native library; it is not under test here.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import logging
import tarfile
from pathlib import Path
from typing import Any

import numpy as np
import pytest
import soundfile as sf

from app.eval_audio import (
    _safe_unpack,
    assign_clips,
    ensure_judge,
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
        assert wer("delivered at 57 poulson street", "delivered at 57 poulson") == pytest.approx(
            0.2
        )


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
        assert noise_rms / signal_rms == pytest.approx(10**0.5, rel=0.01)

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
        rows = [self.utterance(f"U{index}", f"S{index}", "en_nz_van", 0) for index in range(10)]
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
        path.write_text(
            '{"id":"U1","script_id":"S1","slice":"mi_places","snr_db":null,"bed":"quiet","status":"planned"}\n',
            encoding="utf-8",
        )
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
        _append_jsonl(
            manifest / "addresses.jsonl",
            {"id": "A1", "number": "57", "street": "Poulson Street", "suburb": "Addington"},
        )
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
        for slice_id, snrs in (
            ("en_nz_quiet", [None]),
            ("en_nz_van", [0, 5, 10]),
            ("en_mix", [None]),
            ("chatter", [None]),
        ):
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
            {
                "file": "manifest/data/noise/bed-01.wav",
                "source": "test",
                "original": "test/bed-01.wav",
                "bytes": bed.stat().st_size,
                "sha256": "!" * 64,
            },
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
        rows = [
            json.loads(line)
            for line in (manifest / "utterances.jsonl").read_text(encoding="utf-8").splitlines()
            if line
        ]
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


class TestTheSafeUnpack:
    """The judge archive is untrusted input: a member that escapes is refused."""

    @staticmethod
    def make_archive(path: Path, member_name: str, content: str = "payload") -> None:
        with tarfile.open(path, "w:bz2") as archive:
            data = content.encode("utf-8")
            info = tarfile.TarInfo(member_name)
            info.size = len(data)
            archive.addfile(info, io.BytesIO(data))

    def test_a_member_that_leaves_the_target_is_refused(self, tmp_path: Path) -> None:
        archive = tmp_path / "model.tar.bz2"
        self.make_archive(archive, "../escape.txt")
        with pytest.raises(ValueError, match="escapes the target"):
            _safe_unpack(archive, tmp_path / "out")

    def test_an_absolute_member_is_refused(self, tmp_path: Path) -> None:
        archive = tmp_path / "model.tar.bz2"
        self.make_archive(archive, "/etc/passwd")
        with pytest.raises(ValueError, match="escapes the target"):
            _safe_unpack(archive, tmp_path / "out")

    def test_a_named_member_lands_inside_the_target(self, tmp_path: Path) -> None:
        archive = tmp_path / "model.tar.bz2"
        self.make_archive(archive, "whisper-tiny.en/tiny.en-encoder.onnx")
        target = tmp_path / "out"
        _safe_unpack(archive, target)
        assert (target / "whisper-tiny.en" / "tiny.en-encoder.onnx").read_text(
            encoding="utf-8"
        ) == "payload"


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


class TestTheHeldOutMeasurement:
    """The held-out manifest, measured like everything else (directive item 4).

    Two claims the lane refuses to leave unpinned:

    1. a held-out manifest scores with every row TAGGED held_out, and the
       shared street list (the one `scripts/eval/check-voice-eval.mjs` reads,
       in the manifest's parent) is what proves the tag, by street key;
    2. the intent leg is the parser's answer to the HYPOTHESIS the judge
       actually returned, never to the gold text (BUG-210's rule: a number
       that was not measured on the STT output is never reported as a pass).

    The seams are `TestTheBuild`'s: a synthetic clip, a synthetic bed and a
    judge that answers a fixed string. Here that string is a COMMAND, so the
    STT leg and the gold-text leg disagree on purpose - which is exactly what
    makes the second claim observable.
    """

    #: What the judge answers: a command the offline brain routes.
    ANSWER = "delivered at 45 Poulson Street, Addington"

    #: The gold text: the spoken-number-correction form, a shape the offline
    #: brain's catalogue has no rule for (`PARSER_GAPS`), so the gold text
    #: does NOT parse while the judge's answer does.
    GOLD_TEXT = "seven no sorry seventeen {street}"

    @staticmethod
    def _jsonl(path: Path, rows: list[dict]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")

    def make_tree(self, root: Path, held_out: bool) -> Path:
        manifest = root / "manifest"
        manifest.mkdir(parents=True, exist_ok=True)
        street = "Poulson Street" if held_out else "Bealey Avenue"
        tag = {"held_out": True} if held_out else {}
        self._jsonl(
            manifest / "addresses.jsonl",
            [
                {
                    "id": "A1",
                    "number": "45",
                    "suffix": None,
                    "unit": None,
                    "street": street,
                    "suburb": "Addington",
                    **tag,
                }
            ],
        )
        self._jsonl(
            manifest / "scripts.jsonl",
            [
                {
                    "id": "S1",
                    "slice": "en_nz_quiet",
                    "text": self.GOLD_TEXT.format(street=street),
                    "gold_intent": "mark_delivered",
                    "gold_slots": {"raw_address": f"17 {street}, Addington"},
                    "tags": ["numbers", "correction"],
                    "address_id": "A1",
                    **tag,
                }
            ],
        )
        self._jsonl(
            manifest / "utterances.jsonl",
            [
                {
                    "id": "U1",
                    "script_id": "S1",
                    "slice": "en_nz_quiet",
                    "snr_db": None,
                    "bed": "quiet",
                    "status": "planned",
                }
            ],
        )
        # The shared held-out street list, in the manifest's parent: the same
        # file the JS checker reads, spelled in the backend's road_key form.
        (root / "heldout_streets.json").write_text(
            json.dumps(
                {
                    "seed": 20261108,
                    "streets": ["Poulson St"],
                    "source": "services/api/tests/fixtures/linz-holdout-streets.txt",
                    "source_sha256": "0" * 64,
                }
            )
            + "\n",
            encoding="utf-8",
        )
        return manifest

    def make_data(self, manifest: Path) -> None:
        voice = manifest / "data"
        samples = np.sin(np.linspace(0, 8 * np.pi, 24000)) * 0.2
        file = voice / "common-voice" / "clips" / "nz-nz-1.wav"
        file.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(file), samples.astype(np.float32), 24000)
        self._jsonl(
            voice / "common-voice" / "clips.jsonl",
            [
                {
                    "kind": "nz",
                    "clip_id": "nz-1",
                    "accent": "New Zealand English",
                    "sentence": "a sentence for nz-1",
                    "file": "manifest/data/common-voice/clips/nz-nz-1.wav",
                    "bytes": file.stat().st_size,
                    "sha256": "?" * 64,
                }
            ],
        )
        bed = voice / "noise" / "bed-01.wav"
        bed.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(bed), (np.random.RandomState(1).rand(48000) - 0.5) * 0.3, 48000)
        self._jsonl(
            voice / "noise" / "noise.jsonl",
            [
                {
                    "file": "manifest/data/noise/bed-01.wav",
                    "source": "test",
                    "original": "test/bed-01.wav",
                    "bytes": bed.stat().st_size,
                    "sha256": "!" * 64,
                }
            ],
        )

    def measure(self, root: Path, held_out: bool) -> dict[str, Any]:
        manifest = self.make_tree(root, held_out)
        self.make_data(manifest)
        args = argparse.Namespace(
            manifest="manifest",
            data="manifest/data",
            out="results",
            root=str(root),
            no_judge=False,
        )
        code = run(
            args,
            judge=TestTheBuild.FakeJudge(self.ANSWER),
            judge_label="a judge that answers a command (the tests)",
        )
        assert code == 0
        return {
            "summary": json.loads((root / "results" / "summary.json").read_text(encoding="utf-8")),
            "rows": list(
                csv.DictReader((root / "results" / "per_utterance.csv").open(encoding="utf-8"))
            ),
        }

    def test_a_held_out_manifest_scores_with_every_row_tagged_held_out(
        self, tmp_path: Path
    ) -> None:
        measured = self.measure(tmp_path, held_out=True)
        summary = measured["summary"]
        # The run itself says it measured the held-out set...
        assert summary["held_out"] is True
        assert summary["held_out_utterances"] == 1
        # ...the shared street list is what proves it, matched by street key...
        assert summary["held_out_streets"] == 1
        assert summary["street_key_check"] == "clean"
        # ...and every scored row carries the tag, so the CSV proves it too.
        assert [row["held_out"] for row in measured["rows"]] == ["True"]

    def test_the_intent_leg_scores_the_stt_hypotheses_not_the_gold_text(
        self, tmp_path: Path
    ) -> None:
        measured = self.measure(tmp_path, held_out=True)
        summary = measured["summary"]
        stt = summary["intent_on_stt_by_slice"]["en_nz_quiet"]
        gold = summary["parser_ceiling_by_slice"]["en_nz_quiet"]
        # The judge answered a command, so the STT leg is correct...
        assert stt["correct"] == 1
        assert stt["rate"] == 1.0
        # ...while the gold text is the correction form the parser cannot read.
        assert gold["correct"] == 0
        # Two different measurements over the same utterance, not one number
        # published twice.
        assert stt["measured"] == gold["total"] == 1

    def test_the_address_leg_reads_the_parsed_address_of_the_hypothesis(
        self, tmp_path: Path
    ) -> None:
        measured = self.measure(tmp_path, held_out=True)
        summary = measured["summary"]
        address = summary["address_extraction_on_stt_by_slice"]["en_nz_quiet"]
        # The hypothesis DID carry an address, and it is not the gold one: an
        # exact-match number is measured from the parse, never assumed.
        assert address["hypotheses_with_an_address"] == 1
        assert address["exact"] == 0
        assert measured["rows"][0]["parsed_address"] == "45 Poulson Street, Addington"

    def test_the_main_manifest_is_measured_unheld_out(self, tmp_path: Path) -> None:
        measured = self.measure(tmp_path, held_out=False)
        summary = measured["summary"]
        assert summary["held_out"] is False
        assert summary["held_out_utterances"] == 0
        assert summary["street_key_check"] == "clean"
        assert [row["held_out"] for row in measured["rows"]] == ["False"]

    def test_a_held_out_tag_on_a_street_that_is_not_held_out_is_refused(
        self, tmp_path: Path, caplog: Any
    ) -> None:
        manifest = self.make_tree(tmp_path, held_out=True)
        # A row claiming held_out on a street the shared list does not carry.
        self._jsonl(
            manifest / "addresses.jsonl",
            [
                {
                    "id": "A1",
                    "number": "45",
                    "street": "Bealey Avenue",
                    "suburb": "Christchurch",
                    "held_out": True,
                }
            ],
        )
        self._jsonl(
            manifest / "scripts.jsonl",
            [
                {
                    "id": "S1",
                    "slice": "en_nz_quiet",
                    "text": "delivered",
                    "gold_intent": "mark_delivered",
                    "gold_slots": {},
                    "tags": ["delivery"],
                    "address_id": "A1",
                    "held_out": True,
                }
            ],
        )
        self.make_data(manifest)
        args = argparse.Namespace(
            manifest="manifest",
            data="manifest/data",
            out="results",
            root=str(tmp_path),
            no_judge=False,
        )
        with caplog.at_level(logging.WARNING, logger="courier_voice.eval_audio"):
            code = run(args, judge=TestTheBuild.FakeJudge(self.ANSWER))
        # Refused, and the refusal names the street it refused.
        assert code == 2
        assert any("Bealey Avenue" in message for message in caplog.messages)


class TestTheDirectiveTargets:
    """The founder directive's targets, published by the run itself.

    A target the run could not measure is published as NOT MEASURED with its
    reason, and never as a pass (EVAL.md section 5): the headline numbers are
    lifted into the final report straight from this block, so a false zero
    here is a false claim there.
    """

    def measure(self, root: Path, with_judge: bool) -> dict[str, Any]:
        measurement = TestTheHeldOutMeasurement()
        manifest = measurement.make_tree(root, held_out=True)
        measurement.make_data(manifest)
        args = argparse.Namespace(
            manifest="manifest",
            data="manifest/data",
            out="results",
            root=str(root),
            no_judge=not with_judge,
        )
        code = run(
            args,
            judge=TestTheBuild.FakeJudge(
                "delivered at 45 Poulson Street, Addington"
            )
            if with_judge
            else None,
        )
        assert code == 0
        summary: dict[str, Any] = json.loads(
            (root / "results" / "summary.json").read_text(encoding="utf-8")
        )
        return summary

    def test_the_directive_targets_are_published_with_the_slice_each_number_came_from(
        self, tmp_path: Path
    ) -> None:
        summary = self.measure(tmp_path, with_judge=True)
        by_target = {entry["target"]: entry for entry in summary["directive_targets"]}
        # The WER targets name the slice they are measured on...
        assert by_target["wer_quiet"]["slice"] == "en_nz_quiet"
        assert by_target["wer_van"]["slice"] == "en_nz_van"
        # ...and every measured one carries the counts behind its number.
        assert by_target["wer_quiet"]["counts"].strip() != ""
        assert by_target["false_action"]["counts"].strip() != ""
        # This tree has no van rows, so the van WER is unmeasured here - which
        # is exactly what the block must say.
        assert by_target["wer_van"]["verdict"] == "NOT MEASURED"
        # And the quiet WER of a judge that answered a command against the
        # clip's own sentence is a measured FAIL, not a rounded pass.
        assert by_target["wer_quiet"]["verdict"] == "FAIL"

    def test_a_target_that_cannot_be_measured_is_published_as_not_measured_never_as_a_pass(
        self, tmp_path: Path
    ) -> None:
        summary = self.measure(tmp_path, with_judge=False)
        by_target = {entry["target"]: entry for entry in summary["directive_targets"]}
        # Nothing was transcribed, so nothing was measured: not one of these
        # legs may read as a pass.
        assert by_target["intent_on_stt"]["verdict"] == "NOT MEASURED"
        assert by_target["address_extraction_on_stt"]["verdict"] == "NOT MEASURED"
        assert by_target["false_action"]["verdict"] == "NOT MEASURED"
        assert all(entry["verdict"] != "PASS" for entry in summary["directive_targets"])
        # The un-judged run does not publish a false zero either.
        assert summary["false_action_rate_on_open_speech"] is None


class TestTheJudgeArchive:
    """The judge archive, and the run that was killed mid-unpack.

    `ensure_judge` unpacks the archive the fetcher downloaded and re-uses the
    directory that is already on disk. A run killed between the two - the
    extraction is member by member, so a kill leaves a directory with the
    decoder and the tokens but no encoder - must be repaired from its own
    archive, not silently scored without a WER (BUG-301): the encoder is what
    makes a directory a model directory.
    """

    ARCHIVE = "sherpa-onnx-whisper-tiny.en.tar.bz2"
    MODEL = "sherpa-onnx-whisper-tiny.en"

    @staticmethod
    def make_archive(path: Path) -> None:
        with tarfile.open(path, "w:bz2") as archive:
            for member in ("tiny.en-decoder.onnx", "tiny.en-encoder.onnx", "tiny.en-tokens.txt"):
                payload = member.encode("utf-8")
                info = tarfile.TarInfo(f"{TestTheJudgeArchive.MODEL}/{member}")
                info.size = len(payload)
                archive.addfile(info, io.BytesIO(payload))

    def test_an_interrupted_unpack_is_repaired_from_its_own_archive(self, tmp_path: Path) -> None:
        target = tmp_path / "stt"
        target.mkdir()
        # The killed run left the directory and the decoder, not the encoder.
        partial = target / self.MODEL
        partial.mkdir()
        (partial / "tiny.en-decoder.onnx").write_bytes(b"tiny.en-decoder.onnx")
        self.make_archive(target / self.ARCHIVE)

        model_dir = ensure_judge(target)

        # The archive repairs what the kill took, and the directory it hands
        # back really is a model directory.
        assert model_dir is not None
        assert (model_dir / "tiny.en-encoder.onnx").exists()
        assert (model_dir / "tiny.en-tokens.txt").exists()

    def test_a_directory_with_no_encoder_is_not_a_model_directory(self, tmp_path: Path) -> None:
        # The same claim from the other side: a directory that merely exists is
        # not a model directory, which is what makes the repair happen.
        target = tmp_path / "stt"
        target.mkdir()
        (target / "something-else").mkdir()
        assert ensure_judge(target) is None


class TestTheVerdictNotes:
    """The caveat a verdict carries must describe the number it is on.

    A measured number that carries an "it could not be measured" note is a
    false claim with a decimal point: the note is lifted into a headline with
    the value, so the two must agree.
    """

    def measure(self, root: Path, with_judge: bool) -> dict[str, Any]:
        measurement = TestTheHeldOutMeasurement()
        manifest = measurement.make_tree(root, held_out=True)
        measurement.make_data(manifest)
        args = argparse.Namespace(
            manifest="manifest",
            data="manifest/data",
            out="results",
            root=str(root),
            no_judge=not with_judge,
        )
        code = run(
            args,
            judge=TestTheBuild.FakeJudge("delivered at 45 Poulson Street, Addington")
            if with_judge
            else None,
        )
        assert code == 0
        summary: dict[str, Any] = json.loads(
            (root / "results" / "summary.json").read_text(encoding="utf-8")
        )
        return summary

    def test_a_measured_verdict_never_carries_the_note_that_it_was_not_measured(
        self, tmp_path: Path
    ) -> None:
        summary = self.measure(tmp_path, with_judge=True)
        by_target = {entry["target"]: entry for entry in summary["directive_targets"]}
        # The quiet WER is measured and fails: it must not also say it could
        # not be measured.
        assert by_target["wer_quiet"]["verdict"] == "FAIL"
        assert "reason" not in by_target["wer_quiet"]
        assert by_target["wer_quiet"]["note"] == ""
        # The false-action rate is measured too - in this tree the judge answers
        # a command, so it is a measured 100% - and it says nothing but its
        # own number.
        assert by_target["false_action"]["verdict"] in {"PASS", "FAIL"}
        assert by_target["false_action"]["note"] == ""
        # While a number that could not be measured carries its reason, and
        # only that.
        assert by_target["corrections_on_stt"]["verdict"] == "NOT MEASURED"
        assert by_target["corrections_on_stt"]["reason"]

    def test_the_intent_verdict_carries_the_caveat_of_the_open_speech(
        self, tmp_path: Path
    ) -> None:
        summary = self.measure(tmp_path, with_judge=True)
        by_target = {entry["target"]: entry for entry in summary["directive_targets"]}
        # The intent leg on the open-data slices is measured, and it carries the
        # caveat that its speech is the speakers' own sentences - so nobody
        # reads 4% as the product's command accuracy.
        assert by_target["intent_on_stt"]["verdict"] in {"PASS", "FAIL"}
        assert "OWN sentences" in by_target["intent_on_stt"]["note"]
