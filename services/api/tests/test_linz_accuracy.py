"""The D8 accuracy measured against the real LINZ data (V3 task T4).

The test needs the address indexes built from the real data:

    uv run --with httpx python scripts/data/fetch-linz.py --area christchurch
    uv run --with httpx python scripts/data/fetch-linz.py --area waimakariri
    uv run --with httpx python scripts/data/fetch-linz.py --area selwyn
    uv run python scripts/data/build-linz-index.py --area christchurch   # and the others
    uv run --directory services/api pytest tests/test_linz_accuracy.py -v

When the data is not present the test is **skipped** (the CI runner has no LINZ
key), so the suite stays green. The report is written to
`docs/evidence/phase-2.3/linz-accuracy.md` — the numbers, never the data.
"""
from __future__ import annotations

import json
import random
import re
from collections import Counter
from pathlib import Path

import pytest

from app.address_correction import Address, AddressCorrector, InMemoryAddressStore

# Three parents up from services/api/tests/, not two: with two the suite read
# services/data/linz, which the pipeline does not write, so the accuracy test
# skipped itself for want of an index that was never looked for. Pinned by
# test_linz_pipeline_paths.py.
REPO = Path(__file__).resolve().parents[3]
DATA_DIR = REPO / "data" / "linz"
AREAS = ("christchurch", "waimakariri", "selwyn")
REPORT = REPO / "docs" / "evidence" / "phase-2.3" / "linz-accuracy.md"

TARGET_ACCURACY = 0.95
SAMPLE_SIZE = 120

# The words a driver says for a house number.
DIGIT_WORDS = {
    "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five",
    "6": "six", "7": "seven", "8": "eight", "9": "nine",
}
TEENS = {
    10: "ten", 11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen",
    15: "fifteen", 16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen",
}
TENS = {
    20: "twenty", 30: "thirty", 40: "forty", 50: "fifty",
    60: "sixty", 70: "seventy", 80: "eighty", 90: "ninety",
}


def available_areas() -> list[str]:
    return [area for area in AREAS if (DATA_DIR / f"addresses-{area}.jsonl").exists()]


def load_addresses(area: str) -> list[Address]:
    addresses = []
    with (DATA_DIR / f"addresses-{area}.jsonl").open(encoding="utf-8") as handle:
        for line in handle:
            row = json.loads(line)
            addresses.append(
                Address(
                    linz_address_id=row["id"],
                    number=row["number"],
                    road=row["road"],
                    suburb=row["suburb"],
                    town=row.get("town") or "",
                    suffix=row.get("suffix"),
                    unit=row.get("unit"),
                )
            )
    return addresses


def expected_display(address: Address) -> str:
    """The address as the engine should return it."""
    number = f"{address.number}{address.suffix or ''}"
    if address.unit:
        number = f"{address.unit}/{number}"
    parts = [number, address.road]
    if address.suburb:
        parts.append(address.suburb)
    if address.town:
        parts.append(address.town)
    return " ".join(parts)


def count_word(value: int) -> str:
    """The words for a count below a hundred ('42' -> 'forty two')."""
    if value < 10:
        return DIGIT_WORDS[str(value)]
    if value < 20:
        return TEENS[value]
    tens = TENS[value // 10 * 10]
    return tens if value % 10 == 0 else f"{tens} {DIGIT_WORDS[str(value % 10)]}"


def number_to_words(number: str) -> str:
    """Turns '142' into 'one hundred forty two'."""
    value = int(number)
    if value < 100:
        return count_word(value)
    hundreds, rest = divmod(value, 100)
    head = f"{count_word(hundreds)} hundred"
    if rest == 0:
        return head
    if rest < 100:
        return f"{head} {count_word(rest)}"
    return f"{head} {count_word(rest)}"


def number_text(address: Address) -> str:
    """The number (with its unit and suffix) the way it is written or said."""
    number = address.number
    if address.suffix:
        number += f" {address.suffix}"
    if address.unit:
        number = f"unit {address.unit} {number}"
    return number


def spoken_address(address: Address) -> str:
    """The address the way a driver says it."""
    number = number_to_words(address.number)
    if address.suffix:
        number += f" {address.suffix}"
    if address.unit:
        number = f"unit {address.unit} {number}"
    return f"{number} {address.road} {address.suburb}"


def misspell(road: str) -> str:
    """A plausible ASR misspelling of a road name."""
    words = road.split()
    target = words[0]
    if len(target) > 4:
        words[0] = target[1] + target[0] + target[2:]
    else:
        words[0] = target + "e"
    return " ".join(words)


def strip_type(road: str) -> str:
    """The road name without its type ('Bealey Avenue' -> 'Bealey')."""
    return re.sub(
        r"\s+(Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Place|Pl|Crescent|Cres|Terrace|Tce|"
        r"Lane|Ln|Close|Cl|Court|Ct|Way|Boulevard|Blvd|Esplanade|Esp|Highway|Hwy)$",
        "",
        road,
    )


def measure(area: str) -> tuple[Counter[str], list[str], int, int]:
    """Runs the five cases over a sample of one area."""
    addresses = load_addresses(area)
    store = InMemoryAddressStore(addresses)
    corrector = AddressCorrector(store)

    randomizer = random.Random(20261020)
    sample = randomizer.sample(addresses, min(SAMPLE_SIZE, len(addresses)))

    results: Counter[str] = Counter()
    failures: list[str] = []
    cases = 0

    for address in sample:
        expected = expected_display(address)

        cases += 1
        result = corrector.correct(f"{number_text(address)} {address.road}, {address.suburb}")
        if result.corrected == expected:
            results["canonical"] += 1
        else:
            failures.append(f"[{area}] canonical: {result.corrected!r} != {expected!r}")

        cases += 1
        result = corrector.correct(spoken_address(address))
        if result.corrected == expected:
            results["spoken number"] += 1
        else:
            failures.append(f"[{area}] spoken: {result.corrected!r} != {expected!r}")

        cases += 1
        misspelled = f"{number_text(address)} {misspell(address.road)}, {address.suburb}"
        result = corrector.correct(misspelled)
        if result.corrected == expected:
            results["misspelled road"] += 1
        else:
            failures.append(f"[{area}] misspelled: {result.corrected!r} != {expected!r}")

        cases += 1
        without_type = f"{number_text(address)} {strip_type(address.road)}, {address.suburb}"
        result = corrector.correct(without_type)
        if result.corrected == expected or result.needs_question:
            results["road type omitted"] += 1
        else:
            failures.append(f"[{area}] no type: {result.corrected!r} != {expected!r}")

        cases += 1
        missing = str(int(address.number) + 7919)
        result = corrector.correct(f"{missing} {address.road}, {address.suburb}")
        if result.needs_question and result.options:
            results["unknown number asked"] += 1
        else:
            failures.append(f"[{area}] unknown number: {result.corrected!r}")

    return results, failures, cases, len(addresses)


@pytest.mark.skipif(not available_areas(), reason="the LINZ index is not built (needs the LINZ key)")
def test_d8_accuracy_on_real_linz_addresses() -> None:
    areas = available_areas()
    total_results: Counter[str] = Counter()
    all_failures: list[str] = []
    total_cases = 0
    indexed = 0

    for area in areas:
        results, failures, cases, count = measure(area)
        total_results.update(results)
        all_failures.extend(failures)
        total_cases += cases
        indexed += count

    correct = sum(total_results.values())
    accuracy = correct / total_cases if total_cases else 0.0

    lines = [
        "# D8 accuracy on the real LINZ data (Canterbury)",
        "",
        "- Date: 2026-10-20",
        "- Data: LINZ `NZ Addresses` (`data.linz.govt.nz:layer-123113`), the Christchurch, "
        "Waimakariri and Selwyn bounding boxes.",
        f"- **{indexed:,} real addresses indexed** across {len(areas)} area(s).",
        f"- Sample: {SAMPLE_SIZE} real addresses per area (seed 20261020), {total_cases} checks in total.",
        f"- **Accuracy: {accuracy:.1%} ({correct}/{total_cases})** — target >= {TARGET_ACCURACY:.0%}.",
        "",
        "| Case | Result |",
        "|------|--------|",
    ]
    for case, count in sorted(total_results.items()):
        lines.append(f"| {case} | {count} |")
    lines += ["", "## The failures (first 20)", ""]
    lines += [f"- {failure}" for failure in all_failures[:20]]
    if len(all_failures) > 20:
        lines.append(f"- ... and {len(all_failures) - 20} more")
    lines.append("")

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines), encoding="utf-8")

    assert accuracy >= TARGET_ACCURACY, f"{accuracy:.1%} < {TARGET_ACCURACY:.0%} — see {REPORT}"
