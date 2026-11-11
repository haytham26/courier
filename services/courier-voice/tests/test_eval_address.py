"""The address lever's scorer: the gold answer, the honest leg and the build.

The founder's VOICE LEVER (b) is measured by `app/eval_address.py`, and the
claims below are the ones the evidence leans on: the gold address is compared
field by field (never as a substring), the resolver's answer on the brain's
address and on the whole hypothesis are BOTH published, and the audio is built
with the pinned voice's own constants into its own directory - never into the
scale simulation's, whose files are pinned by their sidecar.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from app.address_resolve import load_index, resolve
from app.eval_address import (
    AUDIO_DIR,
    SIDECAR,
    VOICED_SLICES,
    build_address_audio,
    exact_match,
    gold_parts,
)


class TestTheGoldParts:
    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("57 Poulson Street, Addington", ("57", "", "Poulson Street", "Addington")),
            ("76 A Aitken Street, Ashburton", ("76", "A", "Aitken Street", "Ashburton")),
            (
                "2/14 Thompsons Track, Ashburton Forks",
                ("2/14", "", "Thompsons Track", "Ashburton Forks"),
            ),
            ("SH1 Rakaia Terrace Road, Bankside", ("SH1", "", "Rakaia Terrace Road", "Bankside")),
        ],
    )
    def test_a_gold_address_is_read_field_by_field(
        self, raw: str, expected: tuple[str, str, str, str]
    ) -> None:
        assert gold_parts(raw) == expected


class TestTheHonestLeg:
    def test_the_resolved_address_is_not_a_substring_hit(self) -> None:
        """A street and a number with no suburb is NOT the gold address.

        A road that runs through ONE suburb answers that suburb even when
        nothing was said after it (LINZ says which one it is). A road through
        SEVERAL does not: "52 Breezes Road" is five different suburbs, and a
        resolver that picked one would be guessing.
        """
        answer = resolve("add a stop at 52 Breezes Road", load_index())
        assert answer is not None, "the street and the number resolve"
        assert answer.number == "52"
        assert answer.street_key == "breezes rd"
        assert answer.suburb == "", "five suburbs, none of them said"
        assert not exact_match(answer, "52 Breezes Road, Aranui"), "the suburb is missing"

    def test_the_whole_answer_is_the_match(self) -> None:
        answer = resolve("add a stop at 57 Poulson Street, Addington", load_index())
        assert exact_match(answer, "57 Poulson Street, Addington")

    def test_a_number_that_is_not_the_addresses_number_does_not_match(self) -> None:
        answer = resolve("add a stop at 58 Poulson Street, Addington", load_index())
        assert answer is not None
        assert not exact_match(answer, "57 Poulson Street, Addington")

    def test_nothing_resolved_is_not_a_match(self) -> None:
        assert not exact_match(None, "57 Poulson Street, Addington")


class TestTheBuild:
    def test_the_audio_is_built_into_its_own_directory(self, tmp_path: Path) -> None:
        """The scale simulation's directory is pinned by its sidecar: a second
        build of those files would be a refusal there, so this run writes
        elsewhere and records where."""

        class FakeEngine:
            def generate(self, text: str, config: object) -> object:
                class Take:
                    samples = [0.1, -0.1, 0.2, -0.2]

                return Take()

        script = {
            "id": "S0001",
            "slice": "en_nz_quiet",
            "gold_intent": "add_stop",
            "text": "add a stop at 57 Poulson Street, Addington",
            "gold_slots": {"raw_address": "57 Poulson Street, Addington"},
            "address_id": "A001",
            "held_out": True,
        }
        rows = build_address_audio(
            [script],
            root=tmp_path,
            beds=[],
            keys=set(),
            engine=FakeEngine(),
        )
        assert rows[0]["status"] == "built"
        assert rows[0]["file"] == f"{AUDIO_DIR}/S0001.wav"
        assert rows[0]["spoken_text"] == "add a stop at fifty seven Poulson Street, Addington"
        assert len(rows[0]["sha256"]) == 64
        assert (tmp_path / rows[0]["file"]).exists()
        # The pinned voice's own constants ride with the row.
        assert rows[0]["speaker"] == "af"
        assert rows[0]["licence"] == "Apache-2.0"
        assert "Kokoro-82M" in rows[0]["attribution"]
        assert SIDECAR.endswith("address_audio.jsonl")

    def test_a_slice_the_voice_cannot_speak_is_named(self) -> None:
        class FakeEngine:
            def generate(self, text: str, config: object) -> object:
                class Take:
                    samples = [0.1]

                return Take()

        script = {
            "id": "S0002",
            "slice": "zh",
            "text": "加一个地址 57",
            "gold_slots": {"raw_address": "x"},
        }
        rows = build_address_audio(
            [script], root=Path(), beds=[], keys=set(), engine=FakeEngine()
        )
        assert rows[0]["status"] == "not synthesised"
        assert "Mandarin" in rows[0]["reason"]
        assert "zh" not in VOICED_SLICES

    def test_the_van_slice_gets_its_three_variants(self) -> None:
        class FakeEngine:
            def generate(self, text: str, config: object) -> object:
                class Take:
                    samples = [0.1, -0.1, 0.2, -0.2, 0.1]

                return Take()

        bed = {"file": "data/voice/noise/bed-01.wav", "sha256": "0" * 64}
        script = {
            "id": "S0003",
            "slice": "en_nz_van",
            "text": "add a stop at 57 Poulson Street, Addington",
            "gold_slots": {"raw_address": "57 Poulson Street, Addington"},
        }
        rows = build_address_audio(
            [script],
            root=Path(),
            beds=[(bed, [0.01, -0.01, 0.01, -0.01, 0.01])],
            keys=set(),
            engine=FakeEngine(),
        )
        assert [row.get("variant") for row in rows] == ["quiet", "snr0", "snr5", "snr10"]
        assert all(row["bed_licence"] == "CC-BY-4.0" for row in rows[1:])
        assert [row["snr_db"] for row in rows[1:]] == [0.0, 5.0, 10.0]
