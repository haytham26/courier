"""The address lever, measured: the STT output resolved to a street that exists.

The founder's VOICE LEVER (b) - ADDRESS RESOLUTION ON STT OUTPUT. The held-out
measurement reports address extraction at 0/75, and the reason is structural:
nothing turns what the recognizer returned into a road, a house number and a
suburb that Canterbury has. This module is that measurement, and it is the only
one that can move the number, because it is the first run whose audio SPEAKS an
address:

1. It takes the manifest's address-bearing scripts (the ones whose gold slot is
   a `raw_address`) and voices them with the set's own pinned voice - the same
   Kokoro engine, the same fixed gain, the same licence ledger and the same
   held-out gate `app/eval_tts.py` builds with (`packages/nz-address` is not
   touched; the engine's constants are imported, not re-declared). The open-data
   speakers read their OWN sentences, so their audio can never carry an address
   and the lever has nothing to resolve there.
2. It transcribes every built file with the set's own pinned judge
   (sherpa-onnx Whisper tiny.en), so every hypothesis below is the recognizer's
   own answer and not the gold text.
3. It scores THREEx on each hypothesis:
   - **before**: the offline brain's `raw_address` compared to the gold string,
     the 0/75 number the held-out set publishes.
   - **after (gated)**: `app/address_resolve.py`'s answer on the brain's
     `raw_address`, compared as number + suffix + street key + suburb - the
     resolved address, never a substring hit.
   - **after (ungated)**: the resolver's answer on the WHOLE hypothesis, which
     is the founder's literal ask and the number that carries the resolver's
     own false-positive risk.
4. It writes the per-utterance CSV, the summary and the README, and it refuses
   a manifest that disagrees with the shared held-out street list.

The packaging decision this run measures against: the resolver reads the
COMMITTED road index (6 799 road names, ~0.1 MB as a git blob) and, when
`--linz-dir` names a LINZ directory, the build-local address table of the roads
that run through more than one suburb (the full 656 044 rows are 90 MB and are
gitignored). Both numbers are published; the on-device index is a follow-up
lever named in the evidence, never a silent skip.
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import platform
import sys
from pathlib import Path
from typing import Any

from .address_resolve import ResolvedAddress, load_index, resolve
from .eval_audio import (
    JUDGE,
    JUDGE_MODEL_URL,
    SAMPLE_RATE,
    ensure_judge,
    held_out_street_problems,
    load_judge,
    shared_held_out_streets,
    snr_mix,
    transcribe,
)
from .eval_tts import (
    BED_ATTRIBUTION,
    BED_LICENCE,
    OUTPUT_RATE,
    SPEAKER_NAME,
    TTS_ATTRIBUTION,
    TTS_LICENCE,
    TTS_MODEL_NAME,
    TTS_MODEL_SHA256,
    TTS_MODEL_URL,
    UNVOICED_SLICES,
    VAN_SNRS,
    bed_samples_at,
    ensure_voice_models,
    lexicon_keys,
    oov_words,
    read_jsonl,
    sha256_of,
    spoken_form,
    synthesise,
    the_engine,
    to_output_rate,
    voice_block,
    write_jsonl,
    write_wav,
)
from .offline_brain import parse_command

logger = logging.getLogger("courier_voice.eval_address")

#: Where this run writes its audio (gitignored under data/voice, and NOT the
#: scale simulation's own directory: those files are pinned by their sidecar and
#: a second build of them would be a refusal there).
AUDIO_DIR = "data/voice/address"

#: The sidecar that pins this run's files, the same contract
#: `packages/eval/voice/manifest/tts_audio.jsonl` is for the scale run.
SIDECAR = "packages/eval/voice/manifest/address_audio.jsonl"

#: The slices this run voices: every slice the pinned voice can speak. A slice
#: the voice cannot speak is NAMED with its reason, never dropped silently.
VOICED_SLICES = (
    "en_nz_quiet",
    "en_nz_van",
    "en_mix",
    "numbers_corrections",
    "code_switch",
    "mi_places",
)


def gold_parts(raw: str) -> tuple[str, str, str, str]:
    """A gold `raw_address` as (number, suffix, street, suburb).

    "76 A Aitken Street, Ashburton" -> ("76", "A", "Aitken Street", "Ashburton"):
    the same shape `packages/eval/voice/manifest/addresses.jsonl` carries, so
    the comparison is field by field and not a string comparison.
    """
    head, _, suburb = raw.partition(",")
    tokens = head.strip().split(" ")
    number = tokens[0] if tokens else ""
    suffix = tokens[1] if len(tokens) > 2 and len(tokens[1]) == 1 and tokens[1].isupper() else ""
    street = " ".join(tokens[2:]) if suffix else " ".join(tokens[1:])
    return number, suffix, street, suburb.strip()


def exact_match(answer: ResolvedAddress | None, gold: str) -> bool:
    """The honest leg: the RESOLVED address against the gold, field by field."""
    if answer is None:
        return False
    number, suffix, street, suburb = gold_parts(gold)
    return answer.matches(number, suffix, street, suburb)


def build_address_audio(
    scripts: list[dict[str, Any]],
    *,
    root: Path,
    beds: list[tuple[dict[str, Any], list[float]]],
    keys: set[str],
    engine: Any,
    force: bool = False,
) -> list[dict[str, Any]]:
    """The address-bearing scripts, voiced: quiet, and the van variants.

    The engine's constants come from `app/eval_tts.py` (the pinned voice, the
    fixed gain, the SNRs), so this build is the set's own voice and a different
    directory - the scale simulation's files stay pinned by their sidecar.
    """
    rows: list[dict[str, Any]] = []
    bed_index = 0
    for script in scripts:
        slice_id = str(script.get("slice"))
        if slice_id not in VOICED_SLICES:
            rows.append(
                {
                    "script_id": str(script.get("id")),
                    "slice": slice_id,
                    "gold_intent": str(script.get("gold_intent")),
                    "text": str(script.get("text")),
                    "status": "not synthesised",
                    "reason": UNVOICED_SLICES.get(
                        slice_id, "the slice's voice is not in the licence ledger"
                    ),
                }
            )
            continue
        text = str(script.get("text"))
        spoken = spoken_form(text)
        speech = to_output_rate(synthesise(engine, spoken))
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
            "file": f"{AUDIO_DIR}/{script['id']}.wav",
            "sample_rate": OUTPUT_RATE,
            "peak": round(float(max(abs(speech))) if speech.size else 0.0, 6),
            "oov_words": oov_words(spoken, keys),
            "held_out": script.get("held_out") is True,
            "engine": "sherpa-onnx",
            "model": TTS_MODEL_NAME,
            "model_url": TTS_MODEL_URL,
            "model_sha256": TTS_MODEL_SHA256,
            "speaker": SPEAKER_NAME,
            "voice": voice_block(),
            "licence": TTS_LICENCE,
            "attribution": TTS_ATTRIBUTION,
        }
        destination = root / row["file"]
        row["sha256"] = (
            sha256_of(destination)
            if destination.exists() and not force
            else write_wav(destination, speech)
        )
        rows.append(row)

        if slice_id == "en_nz_van":
            for snr in VAN_SNRS:
                bed, bed_samples = beds[bed_index % len(beds)]
                mixed = snr_mix(speech.tolist(), bed_samples, snr)
                variant = f"snr{int(snr)}"
                van_row: dict[str, Any] = {
                    **{
                        key: value
                        for key, value in row.items()
                        if key not in ("sha256", "file", "variant")
                    },
                    "variant": variant,
                    "file": f"{AUDIO_DIR}/{script['id']}-{variant}.wav",
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


def verified_rows(sidecar: Path, root: Path) -> list[dict[str, Any]]:
    """The built rows whose file still hashes to its recorded sha256.

    The same contract `app/eval_scale.py` keeps: a run is never carried out on
    audio nobody vouches for, because the engine is not byte-reproducible.
    """
    kept: list[dict[str, Any]] = []
    for row in read_jsonl(sidecar):
        if row.get("status") != "built" or not row.get("sha256"):
            continue
        path = root / str(row["file"])
        if not path.exists():
            logger.warning("the run refuses a file: %s is not on disk", row["file"])
            continue
        if sha256_of(path) != row["sha256"]:
            logger.warning("the run refuses a file: %s no longer hashes to its row", row["file"])
            continue
        kept.append(row)
    return kept


def score_turns(
    rows: list[dict[str, Any]], root: Path, judge: Any, index: Any
) -> list[dict[str, Any]]:
    """One turn per built file: the judge's hypothesis, scored three times."""
    turns: list[dict[str, Any]] = []
    for number, row in enumerate(rows, start=1):
        hypothesis = transcribe(judge, root / str(row["file"]))
        action = parse_command(hypothesis)
        brain_address = str(getattr(action, "raw_address", "") or "") if action else ""
        gold = str((row.get("gold_slots") or {}).get("raw_address") or "")
        gated = resolve(brain_address, index) if brain_address else None
        ungated = resolve(hypothesis, index)
        expected = str(row.get("gold_intent") or "noop")
        expected = "noop" if expected in ("chat", "noop") else expected
        turns.append(
            {
                "turn_id": f"{row['script_id']}-{row.get('variant', 'quiet')}",
                "script_id": row["script_id"],
                "slice": row["slice"],
                "variant": row.get("variant", "quiet"),
                "snr_db": row.get("snr_db"),
                "file": row["file"],
                "sha256": row["sha256"],
                "gold_text": row.get("text", ""),
                "spoken_text": row.get("spoken_text", ""),
                "hypothesis": hypothesis,
                "gold_intent": expected,
                "parsed_intent": str(getattr(action, "type", "")) if action else "noop",
                "gold_address": gold,
                "brain_address": brain_address,
                "brain_exact": bool(brain_address) and brain_address == gold,
                "resolved_address": gated.as_text() if gated else "",
                "resolved_key": gated.street_key if gated else "",
                "resolved_exact": exact_match(gated, gold),
                "ungated_address": ungated.as_text() if ungated else "",
                "ungated_exact": exact_match(ungated, gold),
                "ungated_key": ungated.street_key if ungated else "",
                "oov_words": row.get("oov_words", []),
                "held_out": row.get("held_out") is True,
            }
        )
        if number % 25 == 0 or number == len(rows):
            logger.info("the judge has scored %d of %d turns", number, len(rows))
    return turns


def summarise(turns: list[dict[str, Any]], judge_label: str, manifest: str) -> dict[str, Any]:
    """The counts the evidence quotes, per slice and per variant."""
    by_slice: dict[str, dict[str, int]] = {}
    for turn in turns:
        bucket = by_slice.setdefault(
            turn["slice"],
            {
                "turns": 0,
                "address_bearing": 0,
                "brain_exact": 0,
                "resolved_exact": 0,
                "ungated_exact": 0,
                "brain_addresses": 0,
                "resolved": 0,
                "ungated": 0,
            },
        )
        bucket["turns"] += 1
        bucket["address_bearing"] += 1 if turn["gold_address"] else 0
        bucket["brain_exact"] += 1 if turn["brain_exact"] else 0
        bucket["resolved_exact"] += 1 if turn["resolved_exact"] else 0
        bucket["ungated_exact"] += 1 if turn["ungated_exact"] else 0
        bucket["brain_addresses"] += 1 if turn["brain_address"] else 0
        bucket["resolved"] += 1 if turn["resolved_address"] else 0
        bucket["ungated"] += 1 if turn["ungated_address"] else 0
    action = [turn for turn in turns if turn["gold_intent"] != "noop"]
    return {
        "generated": __import__("time").strftime("%Y-%m-%dT%H:%M:%S%z"),
        "target": "the founder's VOICE LEVER (b): address resolution on the STT output",
        "judge": judge_label,
        "judge_model": JUDGE_MODEL_URL,
        "sample_rate": SAMPLE_RATE,
        "manifest": manifest,
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "turns": len(turns),
        "action_turns": len(action),
        "address_bearing_turns": sum(1 for turn in turns if turn["gold_address"]),
        "before_brain_exact": sum(1 for turn in turns if turn["brain_exact"]),
        "after_resolved_exact": sum(1 for turn in turns if turn["resolved_exact"]),
        "after_ungated_exact": sum(1 for turn in turns if turn["ungated_exact"]),
        "turns_by_slice": by_slice,
        "legs": {
            "before": (
                "the offline brain's raw_address compared to the gold string - the "
                "0/75 number the held-out measurement publishes"
            ),
            "after_gated": (
                "MEASURED ON THE STT OUTPUT: app/address_resolve.py's answer on the "
                "brain's raw_address, compared as number + suffix + street key + "
                "suburb - the resolved address, never a substring hit"
            ),
            "after_ungated": (
                "the resolver's answer on the WHOLE hypothesis, the founder's literal "
                "ask; it carries the resolver's own false-positive risk, which the "
                "open-speech leg measures separately"
            ),
            "not_measured": [
                "M1 on the product's own on-device STT (the judge is the set's own)",
                "the wake word, the device latency and the battery (the device's legs)",
            ],
        },
    }


def run(args: argparse.Namespace) -> int:
    """The build, the judge pass and the scoring."""
    root = Path(args.root)
    manifest = root / args.manifest
    data = root / args.data
    sidecar = root / args.out_sidecar

    scripts = read_jsonl(manifest / "scripts.jsonl")
    addresses = read_jsonl(manifest / "addresses.jsonl")
    # The shared held-out list is the single source: a manifest that disagrees
    # with it is refused rather than measured.
    held_out_keys = shared_held_out_streets(manifest)
    problems = held_out_street_problems(addresses, held_out_keys)
    for problem in problems:
        logger.warning("the held-out street check refuses the manifest: %s", problem)
    if problems:
        return 2

    bearing = [script for script in scripts if (script.get("gold_slots") or {}).get("raw_address")]
    beds = bed_samples_at(read_jsonl(data / "noise" / "noise.jsonl"), root)
    if args.build and not args.no_build:
        model_dir, lexicon = ensure_voice_models(data)
        rows = build_address_audio(
            bearing,
            root=root,
            beds=beds,
            keys=lexicon_keys(lexicon),
            engine=the_engine(model_dir, lexicon),
            force=args.force,
        )
        write_jsonl(sidecar, rows)
        logger.info("built %d address files", len([row for row in rows if row.get("sha256")]))
    if not sidecar.exists():
        logger.warning("the sidecar is missing: %s (build it with --build)", sidecar)
        return 2
    rows = verified_rows(sidecar, root)
    if not rows:
        logger.warning("no built file on disk verifies against the sidecar")
        return 2

    index = load_index(linz_dir=Path(args.linz_dir)) if args.linz_dir else load_index()

    judge = None
    judge_label = "none (--no-judge)"
    if not args.no_judge:
        model_dir = ensure_judge(data / "stt")
        if model_dir is not None:
            judge = load_judge(model_dir)
        if judge is None:
            logger.warning("the judge could not be loaded: nothing is scored")
            return 2
        judge_label = JUDGE
    turns = score_turns(rows, root, judge, index) if judge is not None else []
    if not turns:
        logger.warning("no turns were scored: nothing is written")
        return 2

    out_dir = root / args.out
    out_dir.mkdir(parents=True, exist_ok=True)
    summary = summarise(turns, judge_label, args.manifest)
    (out_dir / "summary.json").write_text(
        json.dumps(summary, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    with (out_dir / "per_utterance.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(turns[0].keys()))
        writer.writeheader()
        for turn in turns:
            writer.writerow(
                {
                    key: ";".join(value) if isinstance(value, list) else value
                    for key, value in turn.items()
                }
            )
    command = (
        "uv run --directory services/courier-voice --extra eval python -m app.eval_address "
        f"--manifest {args.manifest} --out {args.out}"
    )
    (out_dir / "README.md").write_text(
        f"""# The address lever, measured on the STT output

Generated by `{command}` (`services/courier-voice/app/eval_address.py`).

- `summary.json` - the turns, the before/after counts and the per-slice table.
- `per_utterance.csv` - one row per built file: the gold text, the judge's
  hypothesis, the brain's `raw_address`, the resolver's answer and both exact
  matches (the gated one on the brain's address, the ungated one on the whole
  hypothesis).
- The audio is NOT in git: it lives in `{AUDIO_DIR}/` with its checksums in
  `{args.out_sidecar}`.

The before leg is the offline brain's own `raw_address` compared to the gold
string - the number the held-out measurement publishes. The after leg is the
resolver's answer compared field by field (number, suffix, street key,
suburb), never as a substring.
""",
        encoding="utf-8",
    )
    logger.info(
        "scored %d turns: before %d, after (gated) %d, after (ungated) %d",
        summary["turns"],
        summary["before_brain_exact"],
        summary["after_resolved_exact"],
        summary["after_ungated_exact"],
    )
    return 0


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, help="the manifest directory")
    parser.add_argument("--data", default="data/voice", help="the data directory")
    parser.add_argument("--out", required=True, help="the results directory")
    parser.add_argument("--out-sidecar", default=SIDECAR, help="the sidecar this run pins")
    parser.add_argument("--linz-dir", default=None, help="the build-local LINZ address table")
    parser.add_argument("--build", action="store_true", help="build the audio before scoring")
    parser.add_argument(
        "--no-build", action="store_true", help="never build, score what is on disk"
    )
    parser.add_argument("--force", action="store_true", help="rebuild the files that exist")
    parser.add_argument("--no-judge", action="store_true", help="verify only, transcribe nothing")
    args = parser.parse_args(argv)
    args.root = str(Path(__file__).resolve().parents[3])
    return run(args)


if __name__ == "__main__":
    raise SystemExit(main())
