"""The TTS command audio (founder directive item 4): what the build promises.

What is under test is the module's own contract, with the engine injected as a
seam the way `app/eval_audio.py` injects its judge: the build's determinism
given the same take, the sidecar's checksums, the van variants differing from
their quiet twin ONLY by the bed's gain, the held-out gate in both directions,
and the licence gate that refuses a voice the ledger does not name.

The engine itself (Kokoro-82M through sherpa-onnx, a 98 MB native archive) is
NOT a unit test's subject: it is measured once and recorded in
`docs/evidence/voice-scale/README.md`, which names the measured fact that a
take is not byte-reproducible across runs of the engine and that the sidecar's
sha256 is what the simulation therefore pins.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import numpy as np
import pytest

from app import licences
from app.eval_tts import (
    NATIVE_RATE,
    OUTPUT_RATE,
    TTS_MODEL_SHA256,
    build,
    gate_problems,
    number_to_words,
    oov_words,
    select_scripts,
    sha256_of,
    spoken_form,
    to_output_rate,
    write_jsonl,
)

ROOT = Path(__file__).resolve().parents[3]
MANIFEST = ROOT / "packages/eval/voice/manifest"


class FakeVoice:
    """A deterministic stand-in for the pinned voice (the seam).

    Every call answers the same samples for the same text, so the build's own
    determinism is provable without the 98 MB archive; the length and the phase
    are derived from the text, so two different scripts produce two different
    takes and the van mixing has real work to do.
    """

    rate = NATIVE_RATE

    def __init__(self, amplitude: float = 0.28) -> None:
        self.amplitude = amplitude
        self.calls: list[str] = []

    def generate(self, text: str, generation: Any) -> Any:
        self.calls.append(text)
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        count = 6000 + int.from_bytes(digest[:2], "big") % 6000
        phase = int.from_bytes(digest[2:4], "big") / 65535.0
        pitch = 220.0 + (int.from_bytes(digest[4:6], "big") % 300)
        samples = [
            self.amplitude * math.sin(2.0 * math.pi * (index / self.rate) * pitch + phase)
            for index in range(count)
        ]
        return SimpleNamespace(samples=samples, sample_rate=self.rate)


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    return [
        json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()
    ]


def _beds(tmp_path: Path) -> list[tuple[dict[str, Any], list[float]]]:
    """Two real-shaped beds: the set's own SNR mixer consumes them."""
    rows: list[tuple[dict[str, Any], list[float]]] = []
    for index, amplitude in enumerate((0.05, 0.11), start=1):
        digest = hashlib.sha256(f"bed-{index}".encode()).digest()
        samples = [
            amplitude * math.sin(2.0 * math.pi * (position / 16000.0) * (90.0 + 37.0 * index))
            + 0.01 * math.sin(2.0 * math.pi * (position / 16000.0) * 1733.0)
            for position in range(16000 * 12)
        ]
        rows.append(
            (
                {
                    "file": f"data/voice/noise/bed-{index:02d}.wav",
                    "sha256": hashlib.sha256(digest).hexdigest(),
                    "source": "free-sound",
                },
                samples,
            )
        )
    return rows


def _all_scripts() -> list[dict[str, Any]]:
    return _read_jsonl(MANIFEST / "scripts.jsonl")


def _sample_scripts() -> list[dict[str, Any]]:
    """A spread of the set: two quiet rows, two van rows and one unvoiced row.

    The van rows are what give the build van variants to produce; the Arabic row
    is what a slice with no voice in the ledger answers with a NAME instead of a
    file.
    """
    wanted: list[dict[str, Any]] = []
    for slice_id, count in (
        ("en_nz_quiet", 2),
        ("en_nz_van", 2),
        ("chatter", 1),
        ("ar", 1),
    ):
        rows = [row for row in _all_scripts() if row["slice"] == slice_id]
        wanted.extend(rows[:count])
    return wanted


def _keys() -> set[str]:
    """The lexicon's keys: the pinned pack's entries, read once."""
    keys: set[str] = set()
    for line in (
        (ROOT / "data/voice/tts-models/lexicon-en-us.txt").read_text(encoding="utf-8").splitlines()
    ):
        if " || " in line:
            key = line.split(" || ", 1)[0].strip().lower()
            if key:
                keys.add(key)
    return keys


def _a_build(tmp_path: Path, scripts: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    return build(
        _sample_scripts() if scripts is None else scripts,
        root=tmp_path,
        beds=_beds(tmp_path),
        keys=_keys(),
        engine=FakeVoice(),
    )


class TestSpokenForm:
    def test_a_house_number_is_handed_to_the_voice_as_words(self) -> None:
        # sherpa-onnx >= 2.0.0 dropped espeak-ng, so "57" would be dropped by
        # the lexicon and the address would silently lose its number.
        assert spoken_form("delivered at 57 Poulson Street, Addington") == (
            "delivered at fifty seven Poulson Street, Addington"
        )

    def test_the_banks_numbers_are_all_spelled(self) -> None:
        for value, expected in (
            (1, "one"),
            (12, "twelve"),
            (57, "fifty seven"),
            (90, "ninety"),
            (490, "four hundred ninety"),
            (5759, "five thousand seven hundred fifty nine"),
        ):
            assert number_to_words(value) == expected
            assert number_to_words(value).replace(" ", "").isalpha()

    def test_a_sentence_with_no_digits_is_unchanged(self) -> None:
        assert spoken_form("skip") == "skip"


class TestTheVoiceIsPinned:
    def test_the_pinned_model_sha_is_a_sha256(self) -> None:
        assert len(TTS_MODEL_SHA256) == 64

    def test_the_voice_block_names_the_pack_its_url_and_its_licence(self, tmp_path: Path) -> None:
        rows = _a_build(tmp_path)
        voice = rows[0]["voice"]
        assert voice["model"] == "kokoro-int8-en-v0_19"
        assert voice["model_url"].startswith("https://github.com/k2-fsa/sherpa-onnx/releases/")
        assert voice["speaker"] == "af"
        assert voice["speed"] == 1.0
        assert voice["licence"] == "Apache-2.0"
        assert "Kokoro-82M" in voice["attribution"]


class TestTheBuildIsDeterministic:
    def test_two_builds_of_the_same_take_are_byte_identical(self, tmp_path: Path) -> None:
        # The builder holds no clock, no run id and no per-file normalisation,
        # so the same take through the same build is the same bytes: the WAV
        # files AND the sidecar rows.
        first = tmp_path / "one"
        second = tmp_path / "two"
        rows_one = [row for row in _a_build(first) if row.get("status") == "built"]
        rows_two = [row for row in _a_build(second) if row.get("status") == "built"]
        assert rows_one, "the fake voice built nothing"
        files_one = {row["file"]: first / row["file"] for row in rows_one}
        files_two = {row["file"]: second / row["file"] for row in rows_two}
        assert set(files_one) == set(files_two)
        for name, first in files_one.items():
            assert first.read_bytes() == files_two[name].read_bytes()
        stripped = [{k: v for k, v in row.items() if k != "sha256"} for row in rows_one]
        other = [{k: v for k, v in row.items() if k != "sha256"} for row in rows_two]
        assert stripped == other


class TestEveryBuiltFilesShaMatchesTheSidecar:
    def test_every_row_names_its_file_and_the_files_hash(self, tmp_path: Path) -> None:
        rows = _a_build(tmp_path)
        built = [row for row in rows if row.get("status") == "built"]
        assert built, "the fake voice built nothing"
        for row in built:
            path = tmp_path / row["file"]
            assert path.exists(), row["file"]
            assert path.read_bytes()[:4] == b"RIFF", "the file is not a WAV"
            assert sha256_of(path) == row["sha256"]
        write_jsonl(tmp_path / "sidecar.jsonl", rows)
        again = _read_jsonl(tmp_path / "sidecar.jsonl")
        assert [row["sha256"] for row in again if row.get("sha256")] == [
            row["sha256"] for row in built
        ]

    def test_the_files_are_the_recognizers_own_rate(self, tmp_path: Path) -> None:
        rows = _a_build(tmp_path)
        for row in rows:
            if row.get("status") != "built":
                continue
            assert row["sample_rate"] == OUTPUT_RATE
            import soundfile as sf

            _samples, rate = sf.read(str(tmp_path / row["file"]), dtype="float64")
            assert rate == OUTPUT_RATE

    def test_a_tampered_file_no_longer_matches_its_row(self, tmp_path: Path) -> None:
        rows = _a_build(tmp_path)
        victim = tmp_path / rows[0]["file"]
        victim.write_bytes(victim.read_bytes()[:-2] + b"\x00\x00")
        assert sha256_of(victim) != rows[0]["sha256"]


class TestTheVanVariants:
    def test_they_differ_only_by_the_bed_gain(self, tmp_path: Path) -> None:
        rows = _a_build(tmp_path)
        van = next(row for row in _all_scripts() if row["slice"] == "en_nz_van")
        by_variant = {
            (row["script_id"], row["variant"]): row for row in rows if row.get("status") == "built"
        }
        quiet = by_variant[(str(van["id"]), "quiet")]
        van0 = by_variant[(str(van["id"]), "snr0")]
        van5 = by_variant[(str(van["id"]), "snr5")]
        van10 = by_variant[(str(van["id"]), "snr10")]
        assert quiet["file"] != van0["file"] != van5["file"] != van10["file"]

        def samples_of(row: dict[str, Any]) -> np.ndarray:
            import soundfile as sf

            data, _rate = sf.read(str(tmp_path / row["file"]), dtype="float64")
            return np.asarray(data if data.ndim == 1 else data.mean(axis=1), dtype=np.float64)

        quiet_samples = samples_of(quiet)
        difference_0 = samples_of(van0) - quiet_samples
        difference_5 = samples_of(van5) - quiet_samples
        # 0 dB adds 5 dB more bed than 5 dB does: exactly 10 ** (5 / 20).
        expected = 10 ** (5 / 20)
        got = float(np.sqrt(np.mean(difference_0**2))) / float(np.sqrt(np.mean(difference_5**2)))
        assert got == pytest.approx(expected, rel=1e-2)

    def test_the_van_rows_name_the_bed_its_licence_and_its_attribution(
        self, tmp_path: Path
    ) -> None:
        rows = _a_build(tmp_path)
        van = next(row for row in rows if row.get("variant") == "snr0")
        assert van["bed"].startswith("data/voice/noise/")
        assert van["bed_sha256"]
        assert van["snr_db"] == 0.0
        assert van["bed_licence"] == "CC-BY-4.0"
        assert "MUSAN" in van["bed_attribution"]

    def test_the_quiet_rows_carry_no_bed(self, tmp_path: Path) -> None:
        rows = _a_build(tmp_path)
        quiet = next(row for row in rows if row.get("variant") == "quiet")
        assert "bed" not in quiet
        assert "snr_db" not in quiet


class TestTheHeldOutGate:
    def test_the_default_run_excludes_every_held_out_street_script(self) -> None:
        from app.eval_audio import shared_held_out_streets
        from app.eval_audio import street_key_of as key_of
        from app.eval_tts import street_of

        keys = shared_held_out_streets(MANIFEST)
        assert keys, "the shared held-out list did not load"
        scripts = _all_scripts()
        addresses = {str(row["id"]): row for row in _read_jsonl(MANIFEST / "addresses.jsonl")}
        kept = select_scripts(scripts, list(addresses.values()), keys, False)
        assert kept, "the default run kept nothing"
        for script in kept:
            street = street_of(script, addresses)
            assert street is None or key_of(street) not in keys

    def test_the_heldout_run_keeps_only_held_out_street_scripts(self) -> None:
        from app.eval_audio import shared_held_out_streets
        from app.eval_audio import street_key_of as key_of
        from app.eval_tts import street_of

        heldout_manifest = MANIFEST / "heldout"
        keys = shared_held_out_streets(heldout_manifest)
        assert keys, "the shared held-out list did not load"
        scripts = _read_jsonl(heldout_manifest / "scripts.jsonl")
        assert scripts, "the held-out manifest carries no scripts"
        addresses = {
            str(row["id"]): row for row in _read_jsonl(heldout_manifest / "addresses.jsonl")
        }
        kept = select_scripts(scripts, list(addresses.values()), keys, True)
        assert len(kept) == len(scripts), "a held-out row was dropped"
        for script in kept:
            street = street_of(script, addresses)
            assert street is not None and key_of(street) in keys

    def test_a_main_row_posed_as_a_held_out_one_is_refused_by_name(self) -> None:
        from app.eval_audio import shared_held_out_streets

        keys = shared_held_out_streets(MANIFEST)
        assert keys
        # The main manifest holds NO held-out street (that is its whole point),
        # so posing its rows as the held-out run must be refused row by row.
        problems = gate_problems(
            scripts=_all_scripts(),
            addresses=_read_jsonl(MANIFEST / "addresses.jsonl"),
            held_out_keys=keys,
            held_out_only=True,
            manifest_dir=MANIFEST,
            beds=[{"file": "data/voice/noise/bed-01.wav"}],
        )
        assert problems, "a main-manifest row was not refused by the held-out run"
        assert any("held-out" in problem for problem in problems)


class TestTheLicenceGate:
    def test_the_ledgers_name_the_voice_and_the_beds(self) -> None:
        beds = [{"file": "data/voice/noise/bed-01.wav"}]
        assert (
            gate_problems(
                scripts=[],
                addresses=[],
                held_out_keys=set(),
                held_out_only=False,
                manifest_dir=MANIFEST,
                beds=beds,
            )
            == []
        )

    def test_a_voice_the_ledger_does_not_name_refuses_the_build(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(licences, "entry_for", lambda _artefact: None)
        problems = gate_problems(
            scripts=[],
            addresses=[],
            held_out_keys=set(),
            held_out_only=False,
            manifest_dir=MANIFEST,
            beds=[{"file": "data/voice/noise/bed-01.wav"}],
        )
        assert any("Kokoro-82M" in problem for problem in problems)

    def test_a_bed_whose_licence_is_not_cc_by_refuses_the_build(self, tmp_path: Path) -> None:
        ledger = tmp_path / "licence.csv"
        rows = (MANIFEST / "licence.csv").read_text(encoding="utf-8").splitlines()
        without_musan = [line for line in rows if "MUSAN" not in line]
        ledger.write_text("\n".join(without_musan) + "\n", encoding="utf-8")
        problems = gate_problems(
            scripts=[],
            addresses=[],
            held_out_keys=set(),
            held_out_only=False,
            manifest_dir=tmp_path,
            beds=[{"file": "data/voice/noise/bed-01.wav"}],
        )
        assert any("MUSAN" in problem for problem in problems)


class TestTheUnvoicedSlices:
    def test_a_slice_with_no_voice_is_named_never_dropped(self, tmp_path: Path) -> None:
        rows = _a_build(tmp_path, scripts=_all_scripts())
        assert {row["slice"] for row in rows} == {
            "en_nz_quiet",
            "en_nz_van",
            "en_mix",
            "numbers_corrections",
            "code_switch",
            "mi_places",
            "chatter",
            "ar",
            "hi_pa",
            "zh",
            "sm_to",
        }
        unvoiced = [row for row in rows if row["status"] == "not synthesised"]
        assert {row["slice"] for row in unvoiced} == {"ar", "hi_pa", "zh", "sm_to"}

    def test_the_arabic_scripts_are_not_synthesised_and_say_why(self, tmp_path: Path) -> None:
        scripts = [row for row in _read_jsonl(MANIFEST / "scripts.jsonl") if row["slice"] == "ar"]
        rows = _a_build(tmp_path, scripts=scripts)
        assert rows
        for row in rows:
            assert row["status"] == "not synthesised"
            assert "Arabic" in row["reason"]
            assert "sha256" not in row


class TestTheOutputGain:
    def test_a_take_that_would_clip_is_refused_not_rescaled(self, tmp_path: Path) -> None:
        loud = FakeVoice(amplitude=2.0)
        van = next(row for row in _all_scripts() if row["slice"] == "en_nz_van")
        with pytest.raises(ValueError, match="would clip"):
            build(
                [van],
                root=tmp_path,
                beds=_beds(tmp_path),
                keys=_keys(),
                engine=loud,
            )


class TestTheSpokenWordsAreRecorded:
    def test_the_words_the_lexicon_cannot_say_are_named(self, tmp_path: Path) -> None:
        keys = {"delivered", "poulson", "street", "addington", "at"}
        assert oov_words("delivered at 57 Poulson Street, Addington", keys) == []
        assert oov_words("delivered at Rakaia", keys) == ["rakaia"]

    def test_the_resample_moves_the_take_to_the_recognizers_rate(self) -> None:
        take = [
            0.5 * math.sin(2.0 * math.pi * (index / NATIVE_RATE) * 440.0)
            for index in range(NATIVE_RATE)
        ]
        moved = to_output_rate(take)
        assert moved.size == OUTPUT_RATE
        assert float(np.max(np.abs(moved))) == pytest.approx(0.25, abs=1e-3)
