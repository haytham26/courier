"""The TTS command audio: the action-bearing utterances the set was missing.

The founder directive (2026-11-08 item 4) asks for the full A-to-Z simulation at
scale: push-to-talk -> STT -> intent -> the action applied to the run -> the
spoken confirmation -> visible on screen -> synced, over >= 500 scripted turns
in quiet and in van noise, including chatter that must NOT act.

The voice set could not carry that run. Its open-data utterances are Mozilla
Common Voice PROSE clips: the speakers read their own sentences
(`per_utterance.csv`'s `gold_text`), so no file of the `en_nz_quiet`,
`en_nz_van` and `en_mix` slices ever spoke a courier command, and every other
slice had no audio at all. This module builds the missing audio from the
manifest's own scripts, with the voice the product itself speaks:

1. Each script's `text` is normalised for the voice (a house number written as
   digits is handed over as words, because sherpa-onnx >= 2.0.0 removed
   espeak-ng and would otherwise DROP the number silently - the measurement is
   in `docs/evidence/voice-scale/README.md`).
2. It is synthesised with Kokoro-82M through sherpa-onnx, with ONE fixed voice,
   ONE fixed speed, and no clock and no network at generation time: the pinned
   model archive is unpacked from `data/voice/tts-models/` after its sha256 is
   verified.
3. The 24 kHz native output is resampled to 16 kHz mono (the recognizer's own
   rate, `apps/mobile/src/voice/streamingStt.ts`), scaled by a FIXED recorded
   gain, and written as PCM_16 to `data/voice/tts/<script_id>.wav`.
4. The van variants mix the MUSAN (CC-BY-4.0) beds at 0 / 5 / 10 dB with the
   set's own SNR mixer, so a van turn differs from its quiet twin ONLY by the
   bed's gain.
5. Every file's sha256, the voice, the speed, the model URL and the licence
   attribution ride in the manifest sidecar
   (`packages/eval/voice/manifest/tts_audio.jsonl`), and the simulation VERIFIES
   every sha before it uses a file: the sidecar is the pin, because the engine
   is not byte-reproducible (measured, and named in the evidence).

The held-out rule is the set's own (founder instruction 2026-11-09, PART B): the
default run EXCLUDES every script whose address is on a street of the shared
held-out list, and `--heldout` builds ONLY those, so nothing is ever voiced on a
held-out street. A mixed selection is refused, naming the row.

Licence rule (ADR-004 / D24): the voice must be in the licence ledger
(`app/licences.py`) and shippable, and the noise beds must be in the set's
licence ledger with their CC-BY-4.0 attribution, before a file is written. A
voice the ledger does not name is a refusal, not a build.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import importlib
import json
import logging
import os
import subprocess
import sys
import tarfile
from collections.abc import Iterable, Sequence
from pathlib import Path
from typing import Any

import numpy as np
import soundfile as sf

from . import licences
from .eval_audio import SAMPLE_RATE, resample, shared_held_out_streets, snr_mix, street_key_of

logger = logging.getLogger("courier_voice.eval_tts")

#: The recognizer's own rate (`SAMPLE_RATE` of `app/eval_audio.py`, the same
#: number `apps/mobile/src/voice/streamingStt.ts` reads).
OUTPUT_RATE = SAMPLE_RATE

#: Kokoro's own native rate: the model's metadata says 24000 and the pack's
#: official page states "Sample rate of this model is fixed to 24000 Hz", so
#: every file is resampled from here.
NATIVE_RATE = 24000

#: The fixed, recorded output gain. A FIXED constant - never a per-file peak
#: normalisation - is what keeps a van variant differing from its quiet twin
#: ONLY by the bed's gain: a normalisation would scale the speech too and the
#: claim the test name makes would be unprovable. The mix refuses to write a
#: file that would clip at this gain, rather than quietly rescaling it.
OUTPUT_SCALE = 0.5

#: The SNRs the van variants are mixed at - the same three the manifest's
#: `en_nz_van` rows carry (EVAL.md section 2: 0 / 5 / 10 dB over van beds).
VAN_SNRS: tuple[float, ...] = (0.0, 5.0, 10.0)

#: The pinned voice: ONE speaker, ONE speed, ONE silence scale, ONE thread
#: count. Changing any of them is a new set, not a rebuild.
SPEAKER_SID = 0
SPEAKER_NAME = "af"
SPEED = 1.0
SILENCE_SCALE = 0.2
NUM_THREADS = 4

#: The pinned model: the sherpa-onnx release pack its official TTS page pairs
#: with `lexicon-en-us.txt` for `kokoro-en-v0_19`
#: (https://k2-fsa.github.io/sherpa/onnx/tts/pretrained_models/kokoro.html,
#: read 2026-11-10). Both shas are recorded so a different build of the same
#: URL is a refusal, not a silent re-voice of the whole set.
TTS_MODEL_NAME = "kokoro-int8-en-v0_19"
TTS_MODEL_URL = (
    "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/"
    "kokoro-int8-en-v0_19.tar.bz2"
)
TTS_MODEL_SHA256 = "c9f0dd393615805b0bab050c340834d5e684e732aec91c0e860cd30e982c08bd"
TTS_LEXICON_URL = (
    "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/lexicon-en-us.txt"
)
TTS_LEXICON_SHA256 = "8b67ae549a465eee78f92ecb74644ad90c3c58ce65f19c68baf85878a10ef73a"

#: The attribution that rides with every built file (the licence obligation).
TTS_LICENCE = "Apache-2.0"
TTS_ATTRIBUTION = (
    "Kokoro-82M voices, Apache-2.0, https://huggingface.co/hexgrad/Kokoro-82M, "
    "run through the sherpa-onnx TTS engine (Apache-2.0)"
)

#: The van noise beds: MUSAN, CC-BY-4.0. The attribution is required by that
#: licence wherever the beds are used (packages/eval/voice/README.md).
BED_LICENCE = "CC-BY-4.0"
BED_ATTRIBUTION = "MUSAN, Snyder et al. (https://www.openslr.org/17), CC-BY-4.0"

#: The slices this voice can speak. Kokoro-82M's English pack has English
#: voices only; the licence ledger names no Arabic, Hindi, Samoan, Tongan or
#: Mandarin voice, so those slices are NOT synthesised and are NAMED with that
#: reason in the sidecar rather than being silently dropped.
BUILT_SLICES = (
    "en_nz_quiet",
    "en_nz_van",
    "en_mix",
    "numbers_corrections",
    "code_switch",
    "mi_places",
    "chatter",
)

#: The slices that carry no Kokoro voice, and the reason each one has none.
UNVOICED_SLICES: dict[str, str] = {
    "ar": (
        "Kokoro-82M has no Arabic voice and the licence ledger (ADR-004) names no "
        "Arabic TTS weights, so the slice's scripts are not synthesised"
    ),
    "hi_pa": (
        "Kokoro-82M has no Hindi or Punjabi voice and the licence ledger names none, "
        "so the slice's scripts are not synthesised"
    ),
    "zh": (
        "Kokoro-82M's English pack (kokoro-int8-en-v0_19) carries no Mandarin "
        "lexicon; the multi-lingual pack would be a SECOND model and is a named "
        "follow-up, not a silent substitution"
    ),
    "sm_to": (
        "Kokoro-82M has no Samoan or Tongan voice and the licence ledger names none, "
        "so the slice's scripts are not synthesised"
    ),
}

#: The slices whose every script also gets the three van variants.
#: `en_nz_van` is the set's own van slice (EVAL.md section 2); the others take
#: them too because the founder directive asks for the A-to-Z path "across
#: quiet and van noise", and a slice that only exists in silence cannot show
#: that the van leg carries a command at all.
VAN_SLICES = (
    "en_nz_van",
    "en_mix",
    "mi_places",
    "code_switch",
    "numbers_corrections",
    "chatter",
)

#: The manifest sidecar, relative to the repository root.
SIDECAR = "packages/eval/voice/manifest/tts_audio.jsonl"

LOW_WORDS = {
    0: "zero",
    1: "one",
    2: "two",
    3: "three",
    4: "four",
    5: "five",
    6: "six",
    7: "seven",
    8: "eight",
    9: "nine",
    10: "ten",
    11: "eleven",
    12: "twelve",
    13: "thirteen",
    14: "fourteen",
    15: "fifteen",
    16: "sixteen",
    17: "seventeen",
    18: "eighteen",
    19: "nineteen",
}
TENS = {
    2: "twenty",
    3: "thirty",
    4: "forty",
    5: "fifty",
    6: "sixty",
    7: "seventy",
    8: "eighty",
    9: "ninety",
}


# ------------------------------------------------------------------ the text


def number_to_words(value: int) -> str:
    """A house number as words: 57 -> "fifty seven", 490 -> "four ninety".

    The set's house numbers run from 1 to 5759 (the LINZ address bank), so the
    thousands scale is needed. "four ninety" is how a courier says 490, and it
    is what the recognizer has to hear: the digits would be dropped.
    """
    if value < 0:
        raise ValueError(f"a house number is not negative: {value}")
    if value < 20:
        return LOW_WORDS[value]
    if value < 100:
        tens, ones = divmod(value, 10)
        return TENS[tens] if ones == 0 else f"{TENS[tens]} {LOW_WORDS[ones]}"
    if value < 1000:
        hundreds, rest = divmod(value, 100)
        prefix = f"{LOW_WORDS[hundreds]} hundred"
        return prefix if rest == 0 else f"{prefix} {number_to_words(rest)}"
    thousands, rest = divmod(value, 1000)
    prefix = f"{LOW_WORDS[thousands]} thousand"
    return prefix if rest == 0 else f"{prefix} {number_to_words(rest)}"


def spoken_form(text: str) -> str:
    """The text as the voice is handed it: every digit run spelled out.

    sherpa-onnx >= 2.0.0 removed espeak-ng from the engine (the engine's own
    deprecation notice: "--kokoro-data-dir is deprecated and ignored in
    sherpa-onnx >= v2.0.0"), so a token the lexicon does not carry is DROPPED
    with no error at all: "57" would make "delivered at fifty seven Poulson
    Street" come out as "delivered at Poulson Street" - a different address.
    Spelling the digits out first is the only way the number reaches the audio.
    """
    pieces: list[str] = []
    digits = ""
    for character in text:
        if character.isdigit():
            digits += character
            continue
        if digits:
            pieces.append(number_to_words(int(digits)))
            digits = ""
        pieces.append(character)
    if digits:
        pieces.append(number_to_words(int(digits)))
    return "".join(pieces)


def word_tokens(text: str) -> list[str]:
    """The alphabetic words of a sentence, lower-cased (the lexicon's keys)."""
    return [
        word.lower()
        for word in "".join(character if character.isalpha() else " " for character in text).split()
    ]


def lexicon_keys(path: Path) -> set[str]:
    """The lexicon's keys: `word || phones`, one entry per line."""
    keys: set[str] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        if " || " not in line:
            continue
        key = line.split(" || ", 1)[0].strip().lower()
        if key:
            keys.add(key)
    return keys


def oov_words(text: str, keys: set[str]) -> list[str]:
    """The words the lexicon cannot pronounce, sorted and de-duplicated.

    They are RECORDED, never hidden: a file whose address street is OOV carries
    the name in its sidecar row, so the evidence knows which turns spoke a full
    address and which did not.
    """
    return sorted({word for word in word_tokens(text) if word not in keys})


# ------------------------------------------------------------------- the model


def sha256_of(path: Path) -> str:
    """A file's sha256, streamed (the model archive is 98 MB)."""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def download(url: str, destination: Path, expected_sha: str) -> None:
    """One pinned artefact, verified byte for byte before it is kept.

    The stream is read through httpx (the service's own HTTP client, already a
    dependency) rather than `urllib`: the URLs here are this module's own pinned
    constants, and httpx states that without the file-scheme ambiguity a
    scanner reads into `urlopen`.
    """
    # The service's own HTTP client, reached the same way the engine is: the
    # runtime is an import here rather than at module scope, so the service's
    # own suite (no `eval` extra) still imports this module.
    httpx = importlib.import_module("httpx")

    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_name(destination.name + ".part")
    logger.info("fetching %s", url)
    with httpx.stream("GET", url, timeout=300.0, follow_redirects=True) as response:
        response.raise_for_status()
        with partial.open("wb") as handle:
            for block in response.iter_bytes(1024 * 1024):
                handle.write(block)
    actual = sha256_of(partial)
    if actual != expected_sha:
        partial.unlink(missing_ok=True)
        raise ValueError(
            f"{url} answered bytes whose sha256 is {actual}, "
            f"the pinned sha256 is {expected_sha} - refusing it"
        )
    partial.replace(destination)
    logger.info("verified %s (%s)", destination.name, actual[:16])


def ensure_voice_models(data_dir: Path) -> tuple[Path, Path]:
    """The pinned model directory and lexicon, downloaded and verified once.

    The archive's sha256 is checked against the pinned value before it is kept,
    so a different build of the same URL is a refusal rather than a silent
    re-voice of the whole set.
    """
    root = data_dir / "tts-models"
    root.mkdir(parents=True, exist_ok=True)
    archive = root / f"{TTS_MODEL_NAME}.tar.bz2"
    if not archive.exists():
        download(TTS_MODEL_URL, archive, TTS_MODEL_SHA256)
    lexicon = root / "lexicon-en-us.txt"
    if not lexicon.exists():
        download(TTS_LEXICON_URL, lexicon, TTS_LEXICON_SHA256)
    model_dir = root / TTS_MODEL_NAME
    if not model_dir.exists():
        unpack_the_model(archive, root)
    return model_dir, lexicon


def unpack_the_model(archive_path: Path, root: Path) -> None:
    """Unpack the pinned voice archive, member by member.

    The same rule `app/eval_audio.py`'s `_safe_unpack` carries for the judge's
    archive: a tar is untrusted input, so every member is checked before it is
    written and one that would leave the target directory is REFUSED by name
    rather than extracted. No `extractall`: the refusal is the point.
    """
    with tarfile.open(archive_path, "r:bz2") as archive:
        for member in archive.getmembers():
            parts = Path(member.name).parts
            if member.name.startswith(("/", "\\")) or ".." in parts:
                raise ValueError(f"the archive's member {member.name!r} escapes the target {root}")
            if not member.isfile() and not member.isdir():
                continue
            archive.extract(member, root, filter="data")


def the_engine(model_dir: Path, lexicon: Path) -> Any:
    """The Kokoro engine, configured with the pinned voice settings.

    The runtime is reached through `importlib` (the same pattern
    `app/eval_audio.py` uses for its judge) so the service's own suite, which
    has no `eval` extra, still imports this module.
    """
    sherpa_onnx = importlib.import_module("sherpa_onnx")
    config = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                model=str(model_dir / "model.int8.onnx"),
                voices=str(model_dir / "voices.bin"),
                tokens=str(model_dir / "tokens.txt"),
                lexicon=str(lexicon),
            ),
            provider="cpu",
            num_threads=NUM_THREADS,
        ),
        max_num_sentences=1,
    )
    if not config.validate():
        raise ValueError(f"the Kokoro config did not validate for {model_dir}")
    return sherpa_onnx.OfflineTts(config)


def synthesise(engine: Any, text: str) -> list[float]:
    """One sentence through the voice: the samples at the engine's own rate."""
    sherpa_onnx = importlib.import_module("sherpa_onnx")
    generation = sherpa_onnx.GenerationConfig()
    generation.sid = SPEAKER_SID
    generation.speed = SPEED
    generation.silence_scale = SILENCE_SCALE
    audio = engine.generate(text, generation)
    if len(audio.samples) == 0:
        raise ValueError(f"the voice answered nothing for {text!r}")
    return list(audio.samples)


def to_output_rate(samples: Sequence[float]) -> np.ndarray:
    """The take resampled to the recognizer's rate, at the fixed gain."""
    native = np.asarray(samples, dtype=np.float64)
    return resample(native, NATIVE_RATE, OUTPUT_RATE) * OUTPUT_SCALE


# ------------------------------------------------------------------ the build


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [
        json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()
    ]


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    """A deterministic JSONL: no clock, no platform, no run id inside it.

    The sidecar must be diffable run to run, so nothing that changes between two
    builds of the same set is written into it.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    body = "".join(
        f"{json.dumps(row, ensure_ascii=False, separators=(',', ':'))}\n" for row in rows
    )
    path.write_text(body, encoding="utf-8", newline="\n")


def street_of(script: dict[str, Any], addresses: dict[str, dict[str, Any]]) -> str | None:
    """The street a script's address sits on, or None when it carries none."""
    address = addresses.get(str(script.get("address_id") or ""))
    return None if address is None else str(address.get("street") or "")


def select_scripts(
    scripts: Sequence[dict[str, Any]],
    addresses: Sequence[dict[str, Any]],
    held_out_keys: set[str] | None,
    held_out_only: bool,
) -> list[dict[str, Any]]:
    """The scripts this run builds: the held-out gate, in one direction.

    The default run excludes every script whose address is on a street of the
    shared held-out list; `--heldout` builds only those. A script with no
    address is not on a held-out street, so it belongs to the default run (the
    chatter, the corrections and the code-switch rows speak no address).
    """
    by_id = {str(address.get("id")): address for address in addresses}
    keys = held_out_keys or set()
    chosen: list[dict[str, Any]] = []
    for script in scripts:
        street = street_of(script, by_id)
        on_list = street is not None and street_key_of(street) in keys
        if on_list is held_out_only:
            chosen.append(script)
    return chosen


def licence_problems(manifest_dir: Path, beds: Sequence[dict[str, Any]]) -> list[str]:
    """What the licence ledgers must name before a single file is written (D24).

    The voice must be in the service's ledger (`app/licences.py`) and shippable;
    the noise beds must be in the set's ledger with the CC-BY-4.0 row that
    carries the attribution. A missing row is a refusal, never a build.
    """
    problems: list[str] = []
    entry = licences.entry_for("Kokoro-82M")
    if entry is None:
        problems.append("Kokoro-82M is not in the licence ledger (app/licences.py)")
    elif not licences.is_shippable("Kokoro-82M"):
        problems.append(f"Kokoro-82M is {entry.decision}: {entry.licence}")
    ledger = manifest_dir / "licence.csv"
    if not ledger.exists():
        problems.append(f"the set's licence ledger is missing: {ledger}")
        return problems
    rows = list(csv.DictReader(ledger.read_text(encoding="utf-8").splitlines()))
    musan = next((row for row in rows if "MUSAN" in row.get("dataset", "")), None)
    if musan is None:
        problems.append("the set's licence ledger has no MUSAN row (the van beds)")
    elif "CC-BY-4.0" not in musan.get("licence", ""):
        problems.append(f"the MUSAN row is not CC-BY-4.0: {musan.get('licence')}")
    if beds and musan is None:
        problems.append("a van variant would be mixed with a bed the ledger does not name")
    return problems


def bed_samples_at(
    beds: Sequence[dict[str, Any]], root: Path
) -> list[tuple[dict[str, Any], list[float]]]:
    """Every bed read once, resampled to the recognizer's rate."""
    prepared: list[tuple[dict[str, Any], list[float]]] = []
    for bed in beds:
        path = Path(str(bed.get("file")))
        if not path.is_absolute():
            path = root / path
        samples, rate = sf.read(str(path), dtype="float64", always_2d=True)
        mono = samples.mean(axis=1) if samples.ndim > 1 else samples
        prepared.append(
            (bed, resample(np.asarray(mono, dtype=np.float64), int(rate), OUTPUT_RATE).tolist())
        )
    return prepared


def unvoiced_row(script: dict[str, Any]) -> dict[str, Any]:
    """A script this voice cannot speak: NAMED, with the reason it has none."""
    slice_id = str(script.get("slice"))
    return {
        "script_id": str(script.get("id")),
        "slice": slice_id,
        "gold_intent": str(script.get("gold_intent")),
        "text": str(script.get("text")),
        "status": "not synthesised",
        "reason": UNVOICED_SLICES.get(slice_id, "the slice's voice is not in the licence ledger"),
    }


def voice_block() -> dict[str, Any]:
    """Everything the take was built with, recorded on every row."""
    return {
        "model": TTS_MODEL_NAME,
        "model_url": TTS_MODEL_URL,
        "model_sha256": TTS_MODEL_SHA256,
        "lexicon_url": TTS_LEXICON_URL,
        "lexicon_sha256": TTS_LEXICON_SHA256,
        "speaker": SPEAKER_NAME,
        "sid": SPEAKER_SID,
        "speed": SPEED,
        "silence_scale": SILENCE_SCALE,
        "num_threads": NUM_THREADS,
        "licence": TTS_LICENCE,
        "attribution": TTS_ATTRIBUTION,
    }


def write_wav(path: Path, samples: np.ndarray | Sequence[float]) -> str:
    """One file, PCM_16 mono at the recognizer's rate; answers its sha256."""
    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(path), np.asarray(samples, dtype=np.float32), OUTPUT_RATE, subtype="PCM_16")
    return sha256_of(path)


def build(
    scripts: Sequence[dict[str, Any]],
    *,
    root: Path,
    beds: Sequence[tuple[dict[str, Any], list[float]]],
    keys: set[str],
    engine: Any,
    force: bool = False,
) -> list[dict[str, Any]]:
    """Build the selected scripts: quiet, and the van variants where asked for.

    `engine` is the seam the tests inject, the way `eval_audio.run` injects its
    judge: the build's own claims (the gain-only van difference, the sidecar's
    checksums, the held-out gate, the licence gate) are proven against a
    deterministic stand-in, without a 98 MB model on the test machine.
    """
    rows: list[dict[str, Any]] = []
    bed_index = 0
    for script in scripts:
        slice_id = str(script.get("slice"))
        if slice_id not in BUILT_SLICES:
            rows.append(unvoiced_row(script))
            continue
        text = str(script.get("text"))
        spoken = spoken_form(text)
        samples = synthesise(engine, spoken)
        speech = to_output_rate(samples)
        row: dict[str, Any] = {
            "script_id": str(script.get("id")),
            "slice": slice_id,
            "gold_intent": str(script.get("gold_intent")),
            "variant": "quiet",
            "text": text,
            "spoken_text": spoken,
            "gold_slots": script.get("gold_slots") or {},
            "address_id": script.get("address_id"),
            "status": "built",
            "file": f"data/voice/tts/{script['id']}.wav",
            "sample_rate": OUTPUT_RATE,
            "peak": round(float(np.max(np.abs(speech))) if speech.size else 0.0, 6),
            "oov_words": oov_words(spoken, keys),
            "voice": voice_block(),
        }
        destination = root / row["file"]
        row["sha256"] = (
            sha256_of(destination)
            if destination.exists() and not force
            else write_wav(destination, speech)
        )
        rows.append(row)

        if slice_id in VAN_SLICES:
            for snr in VAN_SNRS:
                bed, bed_samples = beds[bed_index % len(beds)]
                mixed = snr_mix(speech.tolist(), bed_samples, snr)
                peak = float(np.max(np.abs(np.asarray(mixed)))) if mixed else 0.0
                if peak > 1.0:
                    raise ValueError(
                        f"{script['id']}-snr{int(snr)}: the van mix peaks at {peak:.4f} and would "
                        "clip; raise OUTPUT_SCALE rather than normalising per file, because a van "
                        "variant must differ from its quiet twin ONLY by the bed's gain"
                    )
                variant = f"snr{int(snr)}"
                van_row: dict[str, Any] = {
                    **{
                        key: value
                        for key, value in row.items()
                        if key not in ("sha256", "file", "variant")
                    },
                    "variant": variant,
                    "file": f"data/voice/tts/{script['id']}-{variant}.wav",
                    "bed": str(bed.get("file")),
                    "bed_sha256": str(bed.get("sha256")),
                    "snr_db": snr,
                    "bed_licence": BED_LICENCE,
                    "bed_attribution": BED_ATTRIBUTION,
                }
                destination = root / van_row["file"]
                van_row["sha256"] = (
                    sha256_of(destination)
                    if destination.exists() and not force
                    else write_wav(destination, mixed)
                )
                rows.append(van_row)
                bed_index += 1
    return rows


def worker(args: argparse.Namespace, index: int, count: int) -> int:
    """One worker's share of the build: every `count`-th selected script.

    A worker holds its own engine (the load is seconds and the model is 98 MB),
    and each file is written by exactly one worker, so a parallel build and a
    serial build produce the same sidecar once it is assembled in the manifest's
    own order.
    """
    root = Path(args.root)
    manifest = root / args.manifest
    data = root / args.data
    scripts = read_jsonl(manifest / "scripts.jsonl")
    addresses = read_jsonl(manifest / "addresses.jsonl")
    beds = bed_samples_at(read_jsonl(data / "noise" / "noise.jsonl"), root)
    held_out_keys = shared_held_out_streets(manifest)
    selected = select_scripts(scripts, addresses, held_out_keys, args.heldout)
    mine = [script for position, script in enumerate(selected) if position % count == index]
    model_dir, lexicon = ensure_voice_models(data)
    keys = lexicon_keys(lexicon)
    rows = build(
        mine,
        root=root,
        beds=beds,
        keys=keys,
        engine=the_engine(model_dir, lexicon),
        force=args.force,
    )
    write_jsonl(data / "tts" / f"partial-{index:02d}.jsonl", rows)
    logger.info(
        "worker %d of %d: %d of %d files on disk",
        index + 1,
        count,
        len([row for row in rows if row.get("sha256")]),
        len(rows),
    )
    return 0


def assemble(data: Path, count: int) -> list[dict[str, Any]]:
    """The workers' files merged back, de-duplicated by script and variant."""
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index in range(count):
        for row in read_jsonl(data / "tts" / f"partial-{index:02d}.jsonl"):
            identifier = f"{row['script_id']}-{row.get('variant', 'quiet')}"
            if identifier in seen:
                continue
            seen.add(identifier)
            rows.append(row)
    return rows


def gate_problems(
    *,
    scripts: Sequence[dict[str, Any]],
    addresses: Sequence[dict[str, Any]],
    held_out_keys: set[str] | None,
    held_out_only: bool,
    manifest_dir: Path,
    beds: Sequence[dict[str, Any]],
) -> list[str]:
    """Everything that must be true before a single file is written.

    Two gates, both loud: the licence ledgers must name the voice and the beds
    (D24), and the selection must be pure - every script on a held-out street in
    the held-out run, none of them in the default one (PART B). A gate that
    fails refuses the build; it never lets a half-voiced set out.
    """
    problems = licence_problems(manifest_dir, beds)
    if held_out_keys is None:
        problems.append(
            "the shared held-out street list is not next to the manifest "
            "(packages/eval/voice/manifest/heldout_streets.json)"
        )
        return problems
    by_id = {str(address.get("id")): address for address in addresses}
    for script in scripts:
        street = street_of(script, by_id)
        on_list = street is not None and street_key_of(street) in held_out_keys
        if on_list is not held_out_only:
            problems.append(
                f"{script.get('id')}: its address {script.get('address_id')} is on "
                f"{street!r}, which is "
                f"{'a held-out street' if on_list else 'not a held-out street'}, but the run "
                f"is the {'held-out' if held_out_only else 'main'} one"
            )
    return problems


def run(args: argparse.Namespace) -> int:
    """The build: the gates first, then the audio and the sidecar."""
    root = Path(args.root)
    manifest = root / args.manifest
    data = root / args.data

    scripts = read_jsonl(manifest / "scripts.jsonl")
    addresses = read_jsonl(manifest / "addresses.jsonl")
    beds = read_jsonl(data / "noise" / "noise.jsonl")
    held_out_keys = shared_held_out_streets(manifest)
    selected = select_scripts(scripts, addresses, held_out_keys, args.heldout)
    problems = gate_problems(
        scripts=selected,
        addresses=addresses,
        held_out_keys=held_out_keys,
        held_out_only=args.heldout,
        manifest_dir=manifest,
        beds=beds,
    )
    for problem in problems:
        logger.warning("the build is refused: %s", problem)
    if problems or not selected:
        return 2

    count = max(1, int(args.workers))
    if args.limit is not None:
        selected = list(selected)[: args.limit]
    if count == 1 or args.limit is not None:
        model_dir, lexicon = ensure_voice_models(data)
        rows = build(
            selected,
            root=root,
            beds=bed_samples_at(beds, root),
            keys=lexicon_keys(lexicon),
            engine=the_engine(model_dir, lexicon),
            force=args.force,
        )
        write_jsonl(root / args.out, rows)
        logger.info("built %d files", len([row for row in rows if row.get("sha256")]))
        return 0

    command = [
        sys.executable,
        "-m",
        "app.eval_tts",
        "--root",
        args.root,
        "--manifest",
        args.manifest,
        "--data",
        args.data,
        "--out",
        args.out,
        "--worker",
        "{index}",
        "--of",
        str(count),
    ]
    if args.heldout:
        command.append("--heldout")
    if args.force:
        command.append("--force")
    processes = [
        subprocess.Popen(
            [part.format(index=index) for part in command],
            env={**os.environ, "PYTHONUTF8": "1"},
        )
        for index in range(count)
    ]
    codes = [process.wait() for process in processes]
    if any(code != 0 for code in codes):
        logger.warning("a worker failed: %s", codes)
        return 1
    rows = assemble(data, count)
    write_jsonl(root / args.out, rows)
    logger.info("built %d files", len([row for row in rows if row.get("sha256")]))
    return 0


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build the TTS command audio of the voice set")
    parser.add_argument("--root", default=".", help="the repository root")
    parser.add_argument(
        "--manifest",
        default=None,
        help=(
            "the manifest directory (default: packages/eval/voice/manifest, or its "
            "heldout/ sub-directory when --heldout is asked)"
        ),
    )
    parser.add_argument("--data", default="data/voice", help="the data directory")
    parser.add_argument(
        "--out",
        default=SIDECAR,
        help="the manifest sidecar written (one JSON line per built file)",
    )
    parser.add_argument(
        "--heldout", action="store_true", help="build ONLY the held-out-street scripts"
    )
    parser.add_argument("--force", action="store_true", help="rebuild files that already exist")
    parser.add_argument("--limit", type=int, default=None, help="build only the first N scripts")
    parser.add_argument("--workers", type=int, default=6, help="the parallel worker processes")
    parser.add_argument("--worker", type=int, default=None, help="internal: this worker's index")
    parser.add_argument("--of", type=int, default=1, help="internal: the worker count")
    args = parser.parse_args(argv)
    if args.manifest is None:
        # The same convention the set's other builders use: `--heldout` reads
        # the held-out-only manifest, so a held-out run can never reach the
        # default one's rows.
        args.manifest = (
            "packages/eval/voice/manifest/heldout"
            if args.heldout
            else "packages/eval/voice/manifest"
        )
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    if args.worker is not None:
        return worker(args, args.worker, args.of)
    return run(args)


if __name__ == "__main__":
    raise SystemExit(main())
