"""The utterance measurement of the open-data slices (A3).

AUDIT_2026-10-25 §A3 asks for at least 500 utterances built from open data, with
the word error rate and the intent accuracy of every slice in
`packages/eval/voice/results/`, with the command that produced them. This module
is the runner of that measurement:

1. It maps the open speakers (the Common Voice clips fetched by
   `scripts/eval/fetch-open-voice-data.mjs`) onto the manifest's utterances: the
   quiet rows take one speaker each, the van rows keep their script's speaker
   and add the MUSAN bed at the row's SNR, and the courier-mix rows take the
   other English accents.
2. It writes the built audio to `data/voice/audio/` (git-ignored, like
   `data/linz/`) and rewrites the manifest rows to `built` with their file and
   their checksum.
3. It transcribes every built file with a pinned judge (sherpa-onnx Whisper
   tiny.en) and scores the word error rate of the speakers under the noise, the
   false-action rate of the parser on what those speakers actually said, and the
   intent accuracy of the parser on the gold scripts.

What is measured here is the SET and the parser, not the phone's pipeline: the
on-device STT is the product's own and runs on the device, so its numbers (M1 on
our pipeline, M2 on addresses, M8 on synthesis) stay with the device leg and are
reported as **not measured** with that reason - a number that was not measured
is never reported as a pass. The judge's model and version travel with every
result (EVAL.md section 4).
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import importlib
import json
import logging
import platform
import sys
import tarfile
import time
import unicodedata
from collections.abc import Iterable
from pathlib import Path
from typing import Any

import numpy as np
import soundfile as sf

from .offline_brain import parse_command

logger = logging.getLogger("courier_voice.eval_audio")

#: The judge of the WER pass, and the model it runs. Published with every result:
#: EVAL.md section 4 makes the judge part of the metric.
JUDGE = "sherpa-onnx whisper tiny.en (Whisper weights MIT, sherpa-onnx runtime Apache-2.0)"
JUDGE_MODEL_URL = (
    "https://github.com/k2-fsa/sherpa-onnx/releases/download/"
    "asr-models/sherpa-onnx-whisper-tiny.en.tar.bz2"
)

#: The slices whose audio comes from the open speakers.
OPEN_SLICES = ("en_nz_quiet", "en_nz_van", "en_mix")

#: The gold slots the offline brain's action can carry, and so the ones the M3
#: comparison reads. The skip's scope/return_later and the note body's
#: normalised phrasing are the app's own and stay not comparable (EVAL.md
#: section 5: a number that was not measured is never reported as a pass).
COMPARABLE_SLOTS = ("safe_place", "reason", "raw_address", "minutes", "kind", "priority")

#: The acceptance counts of EVAL.md section 1 (the slice floor for the intent
#: leg; the WER targets are per condition and are checked per row in the checker).
TARGET_INTENT = 0.97

SAMPLE_RATE = 16000

# --------------------------------------------------------------------- maths


def normalise(text: str) -> str:
    """The single normalisation of the scoring: EVAL.md section 4.

    Lower-case, diacritics folded, punctuation dropped, whitespace collapsed -
    what the phone's transcripts see in the wild before they are scored.
    """
    folded = unicodedata.normalize("NFKD", text)
    without_marks = "".join(ch for ch in folded if not unicodedata.combining(ch))
    kept = "".join(ch if (ch.isalnum() or ch.isspace()) else " " for ch in without_marks)
    return " ".join(kept.lower().split())


def _word_edits(reference: list[str], hypothesis: list[str]) -> int:
    previous = list(range(len(hypothesis) + 1))
    for i, word in enumerate(reference, start=1):
        current = [i]
        for j, other in enumerate(hypothesis, start=1):
            cost = 0 if word == other else 1
            current.append(min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost))
        previous = current
    return previous[-1]


def wer(reference: str, hypothesis: str) -> float:
    """The word error rate: substitutions, insertions and deletions, normalised.

    An empty reference is a full error (nothing was said that was right) and an
    empty hypothesis against words is a total miss.
    """
    ref = normalise(reference).split()
    hyp = normalise(hypothesis).split()
    if not ref:
        return 0.0 if not hyp else 1.0
    if not hyp:
        return 1.0
    return _word_edits(ref, hyp) / len(ref)


def snr_mix(signal: list[float], bed: list[float], snr_db: float) -> list[float]:
    """Mix the bed under the signal at the SNR asked for.

    The bed is scaled so that its RMS is the signal's RMS minus the SNR, and it
    is repeated when it is shorter than the signal (the beds are the van's
    continuous noise; a clip is a window onto it). At infinite SNR the bed
    disappears and the signal is returned unchanged.
    """
    if not signal:
        return []
    if not np.isfinite(snr_db):
        return list(signal)
    window = np.asarray(signal, dtype=np.float64)
    noise = np.asarray(list(_repeat(bed, len(signal))), dtype=np.float64)
    if noise.size < window.size:  # the bed cannot cover the signal: keep it quiet
        noise = np.pad(noise, (0, window.size - noise.size))
    scale = _rms(window) / max(_rms(noise), 1e-12) * 10 ** (-snr_db / 20.0)
    return [float(value) for value in (window + noise[: window.size] * scale).tolist()]


def _repeat(values: Iterable[float], size: int) -> list[float]:
    """The bed tiled out to the signal's length (a bed is continuous noise)."""
    source = list(values) or [0.0]
    repeated: list[float] = []
    while len(repeated) < size:
        repeated.extend(source[: size - len(repeated)])
    return repeated


def _rms(values: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.square(values))) if values.size else 0.0)


# ------------------------------------------------------------------- mapping


def assign_clips(
    utterances: list[dict[str, Any]], clips: list[dict[str, Any]]
) -> dict[str, dict[str, Any]]:
    """Which open speaker builds which utterance, and with what.

    Every script of the set is its own script, so every script carries its own
    speaker rather than sharing one across its SNR variants. The NZ clips are
    spent over the quiet rows first and then over the van rows, round-robin:
    the clip pool (140 speakers) is smaller than the file count (480), so a
    speaker returns - the pool is a sample of the accent, and every row is a
    real NZ speaker either way. The mix rows spend the other-accent pool the
    same way. A row the pool cannot cover at all is left to build nothing.
    """
    nz = [clip for clip in clips if clip.get("kind") == "nz"]
    mix = [clip for clip in clips if clip.get("kind") == "mix"]
    mapping: dict[str, dict[str, Any]] = {}
    nz_at = 0
    mix_at = 0
    for row in utterances:
        slice_id = row["slice"]
        if slice_id in ("en_nz_quiet", "en_nz_van"):
            if not nz:
                continue
            clip = nz[nz_at % len(nz)]
            nz_at += 1
        elif slice_id == "en_mix":
            if not mix:
                continue
            clip = mix[mix_at % len(mix)]
            mix_at += 1
        else:
            continue
        mapping[row["id"]] = clip
    return mapping


def update_utterances(path: Path, built: dict[str, dict[str, Any]]) -> None:
    """Rewrite the manifest rows: the built ones carry their file and checksum.

    The row's other fields are untouched and keep their order, so the diff of
    the manifest is exactly what the build changed. A row absent from `built`
    stays `planned` - the slices whose audio is still the TTS's to make.
    """
    lines = path.read_text(encoding="utf-8").splitlines()
    rewritten: list[str] = []
    for line in lines:
        if not line.strip():
            continue
        row = json.loads(line)
        audio = built.get(row["id"])
        if audio is not None:
            row["status"] = "built"
            for key, value in audio.items():
                row[key] = value
        rewritten.append(json.dumps(row, ensure_ascii=False))
    path.write_text("\n".join(rewritten) + "\n", encoding="utf-8")


# ------------------------------------------------------------------ scoring


def intent_of(action: Any) -> str:
    """The intent of an answer: the action, or noop when there was no command.

    The parser answers a pydantic `VoiceAction` (or a plain dict from the
    manifest's logs); both carry their `type`, and that is the intent.
    """
    if action is None:
        return "noop"
    if isinstance(action, dict):
        return str(action.get("type", ""))
    return str(getattr(action, "type", ""))


def score_intents(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """The intent accuracy of every slice: the share of rows the parser got.

    A row carries its slice, the gold intent and the parsed one. An empty slice
    answers no row: a number that was not measured is never reported as a pass.
    """
    totals: dict[str, dict[str, int]] = {}
    for row in rows:
        bucket = totals.setdefault(row["slice"], {"correct": 0, "total": 0})
        bucket["total"] += 1
        if row["expected"] == row["actual"]:
            bucket["correct"] += 1
    return {
        slice_id: {
            "correct": bucket["correct"],
            "total": bucket["total"],
            "rate": bucket["correct"] / bucket["total"],
        }
        for slice_id, bucket in sorted(totals.items())
    }


# ------------------------------------------------------------------- the audio


def read_audio(path: Path) -> tuple[np.ndarray, int]:
    """One clip as float samples and its rate (the mp3 as the mirror serves it)."""
    samples, rate = sf.read(str(path), dtype="float64", always_2d=True)
    return np.asarray(samples, dtype=np.float64), int(rate)


def to_mono(samples: np.ndarray) -> np.ndarray:
    if samples.ndim > 1:
        return np.asarray(samples.mean(axis=1), dtype=np.float64)
    return np.asarray(samples, dtype=np.float64)


def resample(samples: np.ndarray, rate: int, target: int = SAMPLE_RATE) -> np.ndarray:
    """A linear resample to the recognizer's rate.

    The clips are 48 kHz and the judge reads 16 kHz. Linear resampling is the
    honest, dependency-free choice at 3x; the judge's own front end sees a
    bandwidth-limited signal, and the results carry the caveat.
    """
    if rate == target or samples.size == 0:
        return samples
    duration = samples.size / rate
    count = max(int(duration * target), 1)
    positions = np.linspace(0, samples.size - 1, count)
    return np.asarray(
        np.interp(positions, np.arange(samples.size), samples), dtype=np.float64
    )


def build_audio(
    utterances: list[dict[str, Any]],
    clips: list[dict[str, Any]],
    beds: list[dict[str, Any]],
    root: Path,
    audio_dir: Path,
) -> dict[str, dict[str, Any]]:
    """Build the open utterances: quiet, van-mixed and courier-mix.

    Returns the manifest patch (id -> file, sha256, clip_id, accent, gold text)
    for the rows that were built. A file that is already on disk with the right
    checksum is left alone, so an interrupted build resumes.
    """
    audio_dir.mkdir(parents=True, exist_ok=True)
    mapping = assign_clips(utterances, clips)
    index: dict[str, Any] = {}
    index_path = audio_dir / "index.json"
    if index_path.exists():
        index = json.loads(index_path.read_text(encoding="utf-8"))

    patches: dict[str, dict[str, Any]] = {}
    bed_at = 0
    for row in utterances:
        clip = mapping.get(row["id"])
        if clip is None:
            continue
        identifier = row["id"]
        existing = index.get(identifier)
        file = audio_dir / f"{identifier}.wav"
        if existing and file.exists():
            patches[identifier] = {**existing, "status": "built"}
            continue
        samples, rate = read_audio(root / clip["file"])
        mono = to_mono(samples)
        resampled = resample(mono, rate)
        snr = row.get("snr_db")
        if snr is not None:
            if not beds:
                continue
            bed = beds[bed_at % len(beds)]
            bed_at += 1
            bed_samples, bed_rate = read_audio(root / bed["file"])
            bed_mono = resample(to_mono(bed_samples), bed_rate)
            mixed = np.asarray(
                snr_mix(resampled.tolist(), bed_mono.tolist(), float(snr)), dtype=np.float64
            )
            peak = float(np.max(np.abs(mixed))) if mixed.size else 0.0
            if peak > 1.0:
                mixed = mixed / peak
            out = mixed
        else:
            out = resampled
        peak = float(np.max(np.abs(out))) if out.size else 0.0
        if peak > 1.0:
            out = out / peak
        sf.write(str(file), out.astype(np.float32), SAMPLE_RATE, subtype="PCM_16")
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        relative = f"data/voice/audio/{identifier}.wav"
        record = {
            "file": relative,
            "sha256": digest,
            "clip_id": clip["clip_id"],
            "accent": clip.get("accent", ""),
            "gold_text": clip.get("sentence", ""),
        }
        index[identifier] = record
        patches[identifier] = {**record, "status": "built"}
    index_path.write_text(json.dumps(index, indent=1, ensure_ascii=False), encoding="utf-8")
    return patches


# ---------------------------------------------------------------- the recognizer


def ensure_judge(target_dir: Path) -> Path | None:
    """The judge's model directory, unpacked when the archive is on disk.

    The archive is fetched by `scripts/eval/fetch-open-voice-data.mjs` with the
    rest of the open data (one download path for the whole set, HTTPS from the
    GitHub release), so this module never downloads anything itself: it only
    unpacks a local archive, member by member, refusing a member that would
    escape the target directory (a tarball is untrusted input).
    """
    marker = target_dir / "sherpa-onnx-whisper-tiny.en.tar.bz2"
    if not marker.exists():
        logger.warning(
            "the judge archive is not on disk: run node scripts/eval/fetch-open-voice-data.mjs first"
        )
        return None
    inner = _model_dirs(target_dir)
    if not inner:
        _safe_unpack(marker, target_dir)
        inner = _model_dirs(target_dir)
    if not inner:
        logger.warning("the judge archive did not unpack its encoder")
        return None
    return sorted(inner)[0]


def _safe_unpack(archive_path: Path, target_dir: Path) -> None:
    """Unpack a tar archive, refusing a member that leaves the target."""
    with tarfile.open(archive_path, "r:bz2") as archive:
        for member in archive.getmembers():
            parts = Path(member.name).parts
            if member.name.startswith(("/", "\\")) or ".." in parts:
                raise ValueError(f"the archive's member {member.name!r} escapes the target")
            archive.extract(member, target_dir)


def _model_dirs(target_dir: Path) -> list[Path]:
    """The unpacked model directories under `target_dir`, by their encoder."""
    return [
        candidate
        for candidate in target_dir.iterdir()
        if candidate.is_dir() and candidate.glob("tiny.en-encoder.onnx")
    ]


def load_judge(model_dir: Path) -> Any:
    """The recognizer the WER pass runs, or None when the runtime is absent.

    sherpa-onnx is an optional dependency (the `eval` extra), so the runtime is
    reached through `importlib` rather than at module scope: the service's own
    suite runs without it, and only the eval path reaches for it. When the extra
    or the model is missing the judge simply does not load, and the set is built
    without WER rather than failing.
    """
    encoder = model_dir / "tiny.en-encoder.onnx"
    decoder = model_dir / "tiny.en-decoder.onnx"
    tokens = model_dir / "tiny.en-tokens.txt"
    if not (encoder.exists() and decoder.exists() and tokens.exists()):
        return None
    try:
        runtime = importlib.import_module("sherpa_onnx")
        return runtime.OfflineRecognizer.from_whisper(
            encoder=str(encoder), decoder=str(decoder), tokens=str(tokens)
        )
    except Exception as error:  # the runtime is optional; a missing judge is not fatal
        logger.warning("the judge is not available: %s", error)
        return None


def transcribe(recognizer: Any, path: Path) -> str:
    """One file through the judge."""
    samples, rate = sf.read(str(path), dtype="float32", always_2d=True)
    mono = to_mono(samples.astype(np.float64))
    if rate != SAMPLE_RATE:
        mono = resample(mono, rate)
    trimmed = np.greater(np.abs(mono), 1e-4).nonzero()[0]
    if trimmed.size:
        mono = mono[trimmed[0] : trimmed[-1] + 1]
    stream = recognizer.create_stream()
    stream.accept_waveform(SAMPLE_RATE, mono.astype(np.float32).tolist())
    recognizer.decode_stream(stream)
    return str(stream.result.text).strip()


# ----------------------------------------------------------------------- main


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def run(args: argparse.Namespace, judge: Any = None, judge_label: str | None = None) -> int:
    """The measurement. `judge` and `judge_label` are the seams the tests use."""
    root = Path(args.root)
    manifest = root / args.manifest
    data = root / args.data
    audio_dir = data / "audio"
    out_dir = root / args.out

    utterances = _read_jsonl(manifest / "utterances.jsonl")
    scripts = _read_jsonl(manifest / "scripts.jsonl")
    clips = _read_jsonl(data / "common-voice" / "clips.jsonl")
    beds = _read_jsonl(data / "noise" / "noise.jsonl")
    if not clips:
        return 2

    built = build_audio(utterances, clips, beds, root, audio_dir)
    if not built:
        return 2
    update_utterances(manifest / "utterances.jsonl", built)

    recognizer = judge
    hypotheses: dict[str, str] = {}
    if not args.no_judge and recognizer is None:
        model_dir = ensure_judge(data / "stt")
        if model_dir is not None:
            recognizer = load_judge(model_dir)
        if recognizer is None:
            logger.warning("the judge could not be loaded: writing the set without WER")
    if recognizer is not None:
        for identifier in built:
            hypotheses[identifier] = transcribe(recognizer, audio_dir / f"{identifier}.wav")

    by_id = {row["id"]: row for row in utterances}
    rows: list[dict[str, Any]] = []
    for identifier, patch in built.items():
        row = by_id[identifier]
        gold = str(patch.get("gold_text", ""))
        hypothesis = hypotheses.get(identifier, "")
        rows.append(
            {
                "id": identifier,
                "slice": row["slice"],
                "snr_db": row.get("snr_db"),
                "accent": patch.get("accent", ""),
                "gold_text": gold,
                "hypothesis": hypothesis,
                "wer": wer(gold, hypothesis) if hypothesis else None,
                "file": patch["file"],
                "sha256": patch["sha256"],
            }
        )

    # The false-action rate of the parser on what the speakers actually said:
    # the open speakers speak conversation, not commands, so almost every
    # hypothesis should stay a noop. A parser that fires on conversation is the
    # M9 failure.
    transcribed = [row for row in rows if row["hypothesis"]]
    false_actions = 0
    for row in transcribed:
        action = parse_command(row["hypothesis"])
        row["parsed_intent"] = intent_of(action)
        if row["parsed_intent"] != "noop":
            false_actions += 1
    false_action_rate = false_actions / len(transcribed) if transcribed else 0.0

    # The intent accuracy of the parser on the gold scripts (every slice), and
    # the EVAL.md M3 shape - intent AND the mandatory slots the action can
    # carry. The skip's scope/return_later, which VoiceAction does not carry,
    # and the note body's normalised phrasing stay with the app and are not
    # compared.
    intent_rows: list[dict[str, Any]] = []
    for script in scripts:
        action = parse_command(script["text"])
        actual = intent_of(action)
        gold = str(script.get("gold_intent", "noop"))
        gold = "noop" if gold in ("chat", "noop") else gold
        comparable = {
            key: value
            for key, value in (script.get("gold_slots") or {}).items()
            if key in COMPARABLE_SLOTS
        }
        got = {
            key: getattr(action, key, None)
            for key in comparable
            if action is not None and getattr(action, key, None) is not None
        } if action is not None else {}
        intent_rows.append(
            {
                "slice": script["slice"],
                "expected": gold,
                "actual": actual,
                "expected_slots": comparable,
                "actual_slots": got,
                "slots_ok": all(got.get(key) == value for key, value in comparable.items()),
            }
        )
    intents = score_intents(intent_rows)
    # The M3 shape (EVAL.md section 1): the intent AND the mandatory slots the
    # action can carry, both correct.
    intents_with_slots: dict[str, dict[str, Any]] = {}
    for slice_id, bucket in intents.items():
        script_rows = [row for row in intent_rows if row["slice"] == slice_id]
        correct = sum(
            1 for row in script_rows if row["expected"] == row["actual"] and row["slots_ok"]
        )
        intents_with_slots[slice_id] = {
            "correct": correct,
            "total": bucket["total"],
            "rate": correct / bucket["total"],
        }

    slices: dict[str, dict[str, Any]] = {}
    for slice_id in OPEN_SLICES:
        slice_rows = [row for row in rows if row["slice"] == slice_id]
        if not slice_rows:
            continue
        measured = [row for row in slice_rows if row["wer"] is not None]
        slices[slice_id] = {
            "utterances": len(slice_rows),
            "measured_wer": len(measured),
            "wer_mean": (sum(row["wer"] for row in measured) / len(measured)) if measured else None,
            "wer_max": max((row["wer"] for row in measured), default=None),
            "false_action_rate": (
                sum(1 for row in slice_rows if row.get("parsed_intent") not in (None, "noop"))
                / len(slice_rows)
            )
            if slice_rows
            else None,
        }
        by_snr: dict[str, Any] = {}
        for snr in sorted({row["snr_db"] for row in slice_rows}):
            snr_bucket = [row for row in slice_rows if row["snr_db"] == snr and row["wer"] is not None]
            if snr_bucket:
                by_snr[str(snr)] = sum(row["wer"] for row in snr_bucket) / len(snr_bucket)
        slices[slice_id]["wer_by_snr"] = by_snr

    out_dir.mkdir(parents=True, exist_ok=True)
    environment = {
        "judge": (judge_label or JUDGE) if recognizer is not None else "none (--no-judge)",
        "judge_model": JUDGE_MODEL_URL,
        "sample_rate": SAMPLE_RATE,
        "normalisation": "lower-case, diacritics folded, punctuation dropped, whitespace collapsed",
        "resampling": "linear 48 kHz -> 16 kHz (the clips as the mirror serves them)",
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "clips": len(clips),
        "beds": len(beds),
    }
    (out_dir / "environment.json").write_text(
        json.dumps(environment, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    with (out_dir / "per_utterance.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "id",
                "slice",
                "snr_db",
                "accent",
                "gold_text",
                "hypothesis",
                "parsed_intent",
                "wer",
                "file",
                "sha256",
            ],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in writer.fieldnames})

    per_slice_rows = []
    for slice_id, values in slices.items():
        per_slice_rows.append(
            {
                "slice": slice_id,
                "utterances": values["utterances"],
                "measured_wer": values["measured_wer"],
                "wer_mean": values["wer_mean"],
                "false_action_rate": values["false_action_rate"],
            }
        )
    with (out_dir / "per_slice.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "slice",
                "utterances",
                "measured_wer",
                "wer_mean",
                "false_action_rate",
            ],
        )
        writer.writeheader()
        for row in per_slice_rows:
            writer.writerow(row)

    summary = {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "target": "AUDIT_2026-10-25 §A3: >=500 utterances from open data, WER and intent accuracy per slice",
        "built": len(built),
        "judge": environment["judge"],
        "legs": {
            "wer": "the open speakers' own words read by the pinned judge, per slice and per SNR - the set's acoustic difficulty, not our pipeline",
            "false_action_rate": "the parser's share of the speakers' natural sentences it answered with a command - the M9 direction on open speech",
            "intent_accuracy": "the service's OFFLINE brain (offline_brain, the dead-spot path) on the set's gold scripts; the address-bearing long forms have been its own since BUG-187's fix, and the server brain online answers the same sentences through its gateway",
        "intent_accuracy_with_slots": "EVAL.md's M3 shape: the intent AND the comparable mandatory slots (`safe_place`, `reason`, `raw_address`, `minutes`, `kind`, `priority`) both correct",
        },
        "intent_accuracy_by_slice": intents,
        "intent_with_slots_by_slice": intents_with_slots,
        "open_slices": slices,
        "false_action_rate_on_open_speech": false_action_rate,
        "not_measured": {
            "M2_address_accuracy": "the address is extracted on the device, not in the service (EVAL.md section 5)",
            "M4_wake_false_accepts": "the non-speech corpus is continuous audio, not the utterance set",
            "M5_wake_misses": "the wake word rates need the device",
            "M7_battery": "the battery is measured on a device",
            "M8_tts_intelligibility": "the synthesised audio needs the TTS voices, whose licence ledger check is pending",
            "M1_wer_on_our_pipeline": "the product's own STT runs on the phone; the WER here is the set's open speakers read by the pinned judge",
        },
    }
    (out_dir / "summary.json").write_text(
        json.dumps(summary, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    command = (
        "uv run --directory services/courier-voice python -m app.eval_audio "
        f"--manifest {args.manifest} --data {args.data} --out {args.out}"
    )
    (out_dir / "README.md").write_text(
        f"""# The utterance results (A3, the open data)

Generated by `{command}` (`services/courier-voice/app/eval_audio.py`) with the
Common Voice CC0 clips and the MUSAN CC-BY beds fetched by
`scripts/eval/fetch-open-voice-data.mjs` into `data/voice/` (git-ignored).

- `summary.json` - the built count, the intent accuracy per slice, the open
  slices' WER, the false-action rate on the open speech, and what was NOT
  measured with the reason.
- `per_slice.csv` - one row per open slice: the utterance count, the measured
  WER and the false-action rate.
- `per_utterance.csv` - one row per built utterance: its gold text, the judge's
  hypothesis, the WER and the parser's intent.
- `environment.json` - the judge and its model URL, the sample rate, the
  normalisation and the machine, published with the result (EVAL.md section 4).

The audio itself is NOT in git: it lives in `data/voice/audio/` with its
checksums in the manifest rows (`status: built`, `file`, `sha256`).
""",
        encoding="utf-8",
    )

    return 0


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", default="packages/eval/voice/manifest")
    parser.add_argument("--data", default="data/voice")
    parser.add_argument("--out", default="packages/eval/voice/results/utterances")
    parser.add_argument("--root", default=".")
    parser.add_argument(
        "--no-judge",
        action="store_true",
        help="build the set and score the intents without the STT judge",
    )
    args = parser.parse_args(argv)
    # The manifest, the data and the results are repository paths: the command
    # runs from anywhere (`uv run --directory services/courier-voice` sets the
    # cwd to the service), so the root is resolved from this file, the same
    # convention the shift-sim harness uses.
    args.root = str(Path(__file__).resolve().parents[3])
    return run(args)


if __name__ == "__main__":
    raise SystemExit(main())
