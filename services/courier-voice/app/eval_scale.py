"""The scale simulation's turn set: the TTS audio scored by the pinned judge.

The founder directive (2026-11-08 item 4) asks for the full A-to-Z run at
scale: >= 500 scripted turns across quiet and van noise, including chatter that
must NOT act. `app/eval_tts.py` builds the action-bearing audio; this module
turns that audio into the RUN:

1. It reads the manifest sidecar (`packages/eval/voice/manifest/tts_audio.jsonl`)
   and VERIFIES every file's sha256 before it is used: the sidecar is the pin,
   because the TTS engine is not byte-reproducible (measured, and named in
   `docs/evidence/voice-scale/README.md`). A file that does not hash to its row
   is refused, so a run is never carried out on audio nobody vouches for.
2. It transcribes every built file with the set's own pinned judge (sherpa-onnx
   Whisper tiny.en, unpacked from the LOCAL archive by `ensure_judge`: this
   module downloads nothing), so every turn's transcript is the recognizer's
   own answer and not the gold text.
3. It writes the turn set the app-side simulation drives
   (`packages/eval/voice/fixtures/scale-turns.jsonl`), one row per turn: the
   slice, the variant, the gold intent, what was SAID by the judge, and the
   file with its checksum.
4. It writes the per-turn CSV and the summary the evidence quotes, including
   the false-action count over the chatter rows (the M9 direction) and the
   named legs this scorer cannot measure.

What is NOT measured here and stays named: the product's own on-device STT, the
wake word, the device latency and the battery - those are the device's legs
(EVAL.md M1/M2/M4/M5/M6/M7), and a number that was not measured is never
reported as a pass.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import logging
import platform
import sys
from pathlib import Path
from typing import Any

from .eval_audio import (
    JUDGE,
    JUDGE_MODEL_URL,
    SAMPLE_RATE,
    ensure_judge,
    intent_of,
    load_judge,
    transcribe,
)
from .eval_tts import read_jsonl, write_jsonl
from .offline_brain import parse_command

logger = logging.getLogger("courier_voice.eval_scale")

#: The turn set the app-side simulation drives, relative to the repository root.
TURN_SET = "packages/eval/voice/fixtures/scale-turns.jsonl"


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def verified_rows(sidecar: Path, root: Path) -> list[dict[str, Any]]:
    """The built rows whose file on disk still hashes to its recorded sha256.

    The verification is the point: the audio is regenerable but not
    byte-reproducible, so the sidecar is the contract. A row whose file is
    missing or whose bytes changed is REFUSED and named, never quietly reused.
    """
    rows = read_jsonl(sidecar)
    kept: list[dict[str, Any]] = []
    refused: list[str] = []
    for row in rows:
        if row.get("status") != "built" or not row.get("sha256"):
            continue
        path = root / str(row["file"])
        if not path.exists():
            refused.append(
                f"{row['script_id']} ({row.get('variant')}): {row['file']} is not on disk"
            )
            continue
        if sha256_of(path) != row["sha256"]:
            refused.append(
                f"{row['script_id']} ({row.get('variant')}): {row['file']} no longer hashes to "
                f"{row['sha256'][:16]}"
            )
            continue
        kept.append(row)
    for problem in refused:
        logger.warning("the turn set refuses a file: %s", problem)
    return kept


def score_turns(
    rows: list[dict[str, Any]],
    root: Path,
    judge: Any,
) -> list[dict[str, Any]]:
    """One turn per built file, transcribed by the pinned judge."""
    turns: list[dict[str, Any]] = []
    for index, row in enumerate(rows, start=1):
        path = root / str(row["file"])
        hypothesis = transcribe(judge, path)
        action = parse_command(hypothesis)
        gold_intent = str(row.get("gold_intent") or "noop")
        expected = "noop" if gold_intent in ("chat", "noop") else gold_intent
        actual = intent_of(action)
        turns.append(
            {
                "turn_id": f"{row['script_id']}-{row.get('variant', 'quiet')}",
                "script_id": row["script_id"],
                "slice": row["slice"],
                "variant": row.get("variant", "quiet"),
                "bed": row.get("bed"),
                "snr_db": row.get("snr_db"),
                "file": row["file"],
                "sha256": row["sha256"],
                "gold_text": row.get("text", ""),
                "spoken_text": row.get("spoken_text", ""),
                "hypothesis": hypothesis,
                "gold_intent": expected,
                "parsed_intent": actual,
                "parsed_address": str(getattr(action, "raw_address", "") or "") if action else "",
                "intent_ok": expected == actual,
                "oov_words": row.get("oov_words", []),
                "held_out": row.get("held_out") is True,
            }
        )
        if index % 100 == 0 or index == len(rows):
            logger.info("the judge has transcribed %d of %d turns", index, len(rows))
    return turns


def summarise(turns: list[dict[str, Any]], judge_label: str) -> dict[str, Any]:
    """The counts the evidence quotes, by slice and by variant."""
    by_slice: dict[str, dict[str, int]] = {}
    for turn in turns:
        bucket = by_slice.setdefault(
            turn["slice"], {"turns": 0, "action_turns": 0, "chatter_turns": 0, "intent_ok": 0}
        )
        bucket["turns"] += 1
        if turn["gold_intent"] == "noop":
            bucket["chatter_turns"] += 1
        else:
            bucket["action_turns"] += 1
        bucket["intent_ok"] += 1 if turn["intent_ok"] else 0
    by_variant: dict[str, int] = {}
    for turn in turns:
        by_variant[turn["variant"]] = by_variant.get(turn["variant"], 0) + 1
    action = [turn for turn in turns if turn["gold_intent"] != "noop"]
    chatter = [turn for turn in turns if turn["gold_intent"] == "noop"]
    false_actions = [turn for turn in chatter if turn["parsed_intent"] != "noop"]
    with_oov = [turn for turn in turns if turn["oov_words"]]
    return {
        "judge": judge_label,
        "judge_model": JUDGE_MODEL_URL,
        "sample_rate": SAMPLE_RATE,
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "turns": len(turns),
        "action_turns": len(action),
        "chatter_turns": len(chatter),
        "action_intent_ok": sum(1 for turn in action if turn["intent_ok"]),
        "false_actions": len(false_actions),
        "false_action_rate": (len(false_actions) / len(chatter)) if chatter else None,
        "false_action_turns": [turn["turn_id"] for turn in false_actions],
        "turns_by_slice": by_slice,
        "turns_by_variant": by_variant,
        "turns_with_oov_words": len(with_oov),
        "held_out_turns": sum(1 for turn in turns if turn["held_out"]),
        "legs": {
            "stt": "the pinned judge (Whisper tiny.en) on the TTS audio, not the product's on-device STT",
            "intent": "the service's offline brain on the judge's hypotheses, the same one the measurement lane scores",
            "not_measured": [
                "M1 on the product's own pipeline (the phone's STT)",
                "M2 the product's address engine",
                "M4/M5 the wake word",
                "M6 the device latency",
                "M7 the battery",
                "the AudioRecord / VAD input chain (the file input bypasses it by design)",
            ],
        },
    }


def run(args: argparse.Namespace) -> int:
    """The turn set, the CSV and the summary."""
    root = Path(args.root)
    sidecar = root / args.sidecar
    if not sidecar.exists():
        logger.warning("the sidecar is missing: %s (build it with app/eval_tts.py)", sidecar)
        return 2
    rows = verified_rows(sidecar, root)
    if not rows:
        logger.warning("no built file on disk verifies against the sidecar")
        return 2

    judge_label: str | None = None
    judge = None
    if not args.no_judge:
        model_dir = ensure_judge(root / args.data / "stt")
        if model_dir is not None:
            judge = load_judge(model_dir)
        if judge is None:
            logger.warning("the judge could not be loaded: the turn set carries no transcripts")
        else:
            judge_label = JUDGE
    turns = score_turns(rows, root, judge) if judge is not None else []
    if not turns:
        logger.warning("no turns were scored: nothing is written")
        return 2

    write_jsonl(root / args.out, turns)
    results = root / args.results
    results.mkdir(parents=True, exist_ok=True)
    summary = summarise(turns, judge_label or "none (--no-judge)")
    (results / "summary.json").write_text(
        json.dumps(summary, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    with (results / "per_turn.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(turns[0].keys()))
        writer.writeheader()
        for turn in turns:
            writer.writerow(
                {
                    key: ";".join(value) if isinstance(value, list) else value
                    for key, value in turn.items()
                }
            )
    logger.info(
        "scored %d turns (%d action, %d chatter, %d false actions)",
        summary["turns"],
        summary["action_turns"],
        summary["chatter_turns"],
        summary["false_actions"],
    )
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Score the TTS turns of the scale simulation")
    parser.add_argument("--root", default=".", help="the repository root")
    parser.add_argument(
        "--sidecar",
        default="packages/eval/voice/manifest/tts_audio.jsonl",
        help="the manifest sidecar the audio was built with",
    )
    parser.add_argument("--data", default="data/voice", help="the data directory")
    parser.add_argument("--out", default=TURN_SET, help="the turn set written")
    parser.add_argument(
        "--results", default="docs/evidence/voice-scale/results", help="the results directory"
    )
    parser.add_argument("--no-judge", action="store_true", help="verify only, transcribe nothing")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    return run(args)


if __name__ == "__main__":
    raise SystemExit(main())
