"""The D8 accuracy measured against the real LINZ data (V3 task T4).

The test needs the address indexes built from the real data:

    uv run --with httpx python scripts/data/fetch-linz.py --area christchurch
    uv run --with httpx python scripts/data/fetch-linz.py --area waimakariri
    uv run --with httpx python scripts/data/fetch-linz.py --area selwyn
    uv run python scripts/data/build-linz-index.py --area christchurch   # and the others
    uv run python scripts/data/split-linz-holdout.py --execute            # the held-out street list
    uv run --directory services/api pytest tests/test_linz_accuracy.py -v

When the data is not present the tests are **skipped** (the CI runner has no LINZ
key), so the suite stays green. The reports are written to
`docs/evidence/phase-2.3/` — the numbers, never the data.

Three measurements, one engine:

- `test_d8_accuracy_on_real_linz_addresses` — the ADR-027 continuity run: the
  seeded 1800-check sample over all addresses (seed 20261020, 120 per area,
  five ask-cases each), floor 95 %.
- `test_d8_accuracy_on_heldout_streets` — the founder directive 2026-11-08 item 2
  measurement: addresses on the HELD-OUT 20 % of Canterbury streets (split by
  street, seeded, list committed at `fixtures/linz-holdout-streets.txt` by
  `scripts/data/split-linz-holdout.py`). Thousands of noisy lookups (400 sampled
  addresses per area x five cases = 6000 checks, seed 20261108). Target
  >= 99.5 % overall and NO slice below 98 % (a slice is each area x case, each
  case, each area). The store is the full register, as in production; the
  hold-out is on the street NAMES, so no name-specific tuning (vocabulary,
  thresholds fitted to a street) can leak into the measurement. Tuning is done
  only on the other 80 % of streets — see the error-analysis test.
- `test_d8_error_analysis_on_tune_streets` — the same five cases on a sample of
  the TUNE streets only, every miss grouped into a class, report written for the
  measure-fix-re-measure loop.
"""
from __future__ import annotations

import json
import random
import re
import time
from collections import Counter, defaultdict
from pathlib import Path

import pytest

from app.address_correction import Address, AddressCorrector, InMemoryAddressStore, road_key

# Three parents up from services/api/tests/, not two: with two the suite read
# services/data/linz, which the pipeline does not write, so the accuracy test
# skipped itself for want of an index that was never looked for. Pinned by
# test_linz_pipeline_paths.py.
REPO = Path(__file__).resolve().parents[3]
DATA_DIR = REPO / "data" / "linz"
AREAS = ("christchurch", "waimakariri", "selwyn")
REPORT = REPO / "docs" / "evidence" / "phase-2.3" / "linz-accuracy.md"
HELDOUT_REPORT = REPO / "docs" / "evidence" / "phase-2.3" / "linz-accuracy-heldout.md"
ERRORS_REPORT = REPO / "docs" / "evidence" / "phase-2.3" / "linz-errors-tune.md"
HOLDOUT_LIST = REPO / "services" / "api" / "tests" / "fixtures" / "linz-holdout-streets.txt"

TARGET_ACCURACY = 0.95
SAMPLE_SIZE = 120

# Founder directive 2026-11-08 item 2: held-out 20 % of Canterbury STREETS,
# >= 99.5 % overall, no slice below 98 %. Never lower these.
HELDOUT_TARGET = 0.995
HELDOUT_SLICE_FLOOR = 0.98
HELDOUT_SAMPLE = 400
HELDOUT_SEED = 20261108
TUNE_SAMPLE = 400

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


def load_holdout() -> set[str]:
    """The committed held-out street keys (one per line, '#' lines are header)."""
    keys: set[str] = set()
    for raw_line in HOLDOUT_LIST.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if line and not line.startswith("#"):
            keys.add(line)
    return keys


class _CachedStore(InMemoryAddressStore):
    """The same store with `roads()` cached.

    The accuracy runs do thousands of lookups and the engine asks the store for
    its road list once per lookup; rebuilding the sorted set over 656k rows each
    time is the suite's whole runtime. The list is read-only, so caching it
    changes no semantics - only the wall clock.
    """

    def __init__(self, addresses) -> None:
        super().__init__(addresses)
        self._roads_cache: list[str] | None = None

    def roads(self) -> list[str]:
        if self._roads_cache is None:
            self._roads_cache = super().roads()
        return self._roads_cache


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


def five_cases(corrector: AddressCorrector, address: Address, area: str) -> list[tuple[str, bool, str, str]]:
    """The five ask-cases over one address: (case, ok, failure-line, raw input)."""
    expected = expected_display(address)
    out: list[tuple[str, bool, str, str]] = []

    raw = f"{number_text(address)} {address.road}, {address.suburb}"
    result = corrector.correct(raw)
    ok = result.corrected == expected
    out.append(("canonical", ok, "" if ok else f"[{area}] canonical: {result.corrected!r} != {expected!r} | reason={result.reason}", raw))

    raw = spoken_address(address)
    result = corrector.correct(raw)
    ok = result.corrected == expected
    out.append(("spoken number", ok, "" if ok else f"[{area}] spoken: {result.corrected!r} != {expected!r} | reason={result.reason}", raw))

    raw = f"{number_text(address)} {misspell(address.road)}, {address.suburb}"
    result = corrector.correct(raw)
    ok = result.corrected == expected
    out.append(("misspelled road", ok, "" if ok else f"[{area}] misspelled: {result.corrected!r} != {expected!r} | reason={result.reason}", raw))

    raw = f"{number_text(address)} {strip_type(address.road)}, {address.suburb}"
    result = corrector.correct(raw)
    ok = result.corrected == expected or result.needs_question
    out.append(("road type omitted", ok, "" if ok else f"[{area}] no type: {result.corrected!r} != {expected!r} | reason={result.reason}", raw))

    missing = str(int(address.number) + 7919)
    raw = f"{missing} {address.road}, {address.suburb}"
    result = corrector.correct(raw)
    ok = bool(result.needs_question and result.options)
    out.append(("unknown number asked", ok, "" if ok else f"[{area}] unknown number: {result.corrected!r} | reason={result.reason}", raw))

    return out


def measure(addresses: list[Address], area: str, seed: int, sample_size: int) -> tuple[Counter[str], list[str], int]:
    """Runs the five cases over a seeded sample of the given addresses."""
    store = _CachedStore(addresses)
    corrector = AddressCorrector(store)

    randomizer = random.Random(seed)
    sample = randomizer.sample(addresses, min(sample_size, len(addresses)))

    results: Counter[str] = Counter()
    failures: list[str] = []
    cases = 0
    for address in sample:
        for case, ok, failure, _raw in five_cases(corrector, address, area):
            cases += 1
            if ok:
                results[case] += 1
            else:
                failures.append(failure)
    return results, failures, cases


def classify(case: str, raw: str, failure: str) -> str:
    """Groups one miss into its error class (the error analysis, directive item 2)."""
    reason = failure.split("reason=", 1)[1] if "reason=" in failure else ""
    if "no known street" in reason:
        return "road-not-matched"
    if "several suburbs" in reason:
        return "suburb-tie-break"
    if "no addresses known" in reason:
        return "road-without-addresses"
    if "does not exist" in reason or "rural delivery" in reason or "no house numbers" in reason:
        return "number-not-on-matched-road"
    if "!=" in failure:
        return "wrong-address-matched"
    return f"other ({case})"


@pytest.mark.skipif(not available_areas(), reason="the LINZ index is not built (needs the LINZ key)")
def test_d8_accuracy_on_real_linz_addresses() -> None:
    areas = available_areas()
    total_results: Counter[str] = Counter()
    all_failures: list[str] = []
    total_cases = 0
    indexed = 0

    for area in areas:
        addresses = load_addresses(area)
        results, failures, cases = measure(addresses, area, 20261020, SAMPLE_SIZE)
        total_results.update(results)
        all_failures.extend(failures)
        total_cases += cases
        indexed += len(addresses)

    correct = sum(total_results.values())
    accuracy = correct / total_cases if total_cases else 0.0

    lines = [
        "# D8 accuracy on the real LINZ data (Canterbury)",
        "",
        # The date of THIS run, never a copy of an earlier one: the report is
        # the number the command produced today, and a stale date reads as
        # "measured then" when it was measured now.
        f"- Date: {time.strftime('%Y-%m-%d')}",
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


@pytest.mark.skipif(not available_areas(), reason="the LINZ index is not built (needs the LINZ key)")
def test_d8_accuracy_on_heldout_streets() -> None:
    """The directive's measurement: addresses on the held-out 20 % of streets.

    The store is the FULL register (production shape); the sample is drawn only
    from held-out streets, so the number measures generalisation to street names
    the tuning never saw. Target >= 99.5 % overall, no slice below 98 %.
    """
    assert HOLDOUT_LIST.exists(), f"{HOLDOUT_LIST} is missing — run scripts/data/split-linz-holdout.py --execute"
    holdout = load_holdout()
    assert holdout, "the held-out street list is empty"

    areas = available_areas()
    slice_hits: Counter[tuple[str, str]] = Counter()   # (area, case) -> passes
    slice_total: Counter[tuple[str, str]] = Counter()  # (area, case) -> checks
    case_hits: Counter[str] = Counter()
    case_total: Counter[str] = Counter()
    area_hits: Counter[str] = Counter()
    area_total: Counter[str] = Counter()
    failures: list[str] = []
    total_cases = 0
    sampled_addresses = 0
    heldout_addresses = 0

    for area in areas:
        all_addresses = load_addresses(area)
        store = _CachedStore(all_addresses)  # the full register, as in production
        corrector = AddressCorrector(store)
        pool = [a for a in all_addresses if road_key(a.road) in holdout]
        heldout_addresses += len(pool)
        randomizer = random.Random(HELDOUT_SEED)
        sample = randomizer.sample(pool, min(HELDOUT_SAMPLE, len(pool)))
        sampled_addresses += len(sample)
        for address in sample:
            for case, ok, failure, _raw in five_cases(corrector, address, area):
                total_cases += 1
                slice_total[(area, case)] += 1
                case_total[case] += 1
                area_total[area] += 1
                if ok:
                    slice_hits[(area, case)] += 1
                    case_hits[case] += 1
                    area_hits[area] += 1
                else:
                    failures.append(failure)

    overall = sum(slice_hits.values()) / total_cases if total_cases else 0.0

    lines = [
        "# D8 accuracy on the HELD-OUT 20 % of Canterbury streets (directive 2026-11-08 item 2)",
        "",
        f"- Date: {time.strftime('%Y-%m-%d')}",
        f"- Held-out list: `services/api/tests/fixtures/linz-holdout-streets.txt` "
        f"({len(holdout)} streets, seed 20261108, split by street by `scripts/data/split-linz-holdout.py`).",
        f"- Addresses on held-out streets: {heldout_addresses:,}; sampled {sampled_addresses} "
        f"({HELDOUT_SAMPLE}/area, seed {HELDOUT_SEED}), {total_cases} checks (five ask-cases each).",
        "- Store: the full register per area (production shape) — the hold-out is on street names, not on the register.",
        f"- **Overall: {overall:.2%} ({sum(slice_hits.values())}/{total_cases})** — target >= {HELDOUT_TARGET:.1%}.",
        "",
        "## Slices (floor 98 % each)",
        "",
        "| Slice | Accuracy |",
        "|-------|----------|",
    ]
    weak: list[str] = []
    for case in sorted(case_total):
        acc = case_hits[case] / case_total[case]
        lines.append(f"| case: {case} | {acc:.2%} ({case_hits[case]}/{case_total[case]}) |")
        if acc < HELDOUT_SLICE_FLOOR:
            weak.append(f"case {case}: {acc:.2%}")
    for area in sorted(area_total):
        acc = area_hits[area] / area_total[area]
        lines.append(f"| area: {area} | {acc:.2%} ({area_hits[area]}/{area_total[area]}) |")
        if acc < HELDOUT_SLICE_FLOOR:
            weak.append(f"area {area}: {acc:.2%}")
    for (area, case) in sorted(slice_total):
        acc = slice_hits[(area, case)] / slice_total[(area, case)]
        lines.append(f"| {area} x {case} | {acc:.2%} ({slice_hits[(area, case)]}/{slice_total[(area, case)]}) |")
        if acc < HELDOUT_SLICE_FLOOR:
            weak.append(f"{area} x {case}: {acc:.2%}")
    lines += ["", "## The failures (first 30)", ""]
    lines += [f"- {failure}" for failure in failures[:30]]
    if len(failures) > 30:
        lines.append(f"- ... and {len(failures) - 30} more")
    lines.append("")

    HELDOUT_REPORT.parent.mkdir(parents=True, exist_ok=True)
    HELDOUT_REPORT.write_text("\n".join(lines), encoding="utf-8")

    assert overall >= HELDOUT_TARGET, f"held-out {overall:.2%} < {HELDOUT_TARGET:.1%} — see {HELDOUT_REPORT}"
    assert not weak, f"slices below {HELDOUT_SLICE_FLOOR:.0%}: {weak} — see {HELDOUT_REPORT}"


@pytest.mark.skipif(not available_areas(), reason="the LINZ index is not built (needs the LINZ key)")
def test_d8_error_analysis_on_tune_streets() -> None:
    """Error analysis FIRST (directive item 2): every miss on the TUNE streets
    (the 80 % the engine may be tuned on) grouped into its class, so each class
    gets one root fix. The held-out streets are never touched here.
    """
    assert HOLDOUT_LIST.exists(), f"{HOLDOUT_LIST} is missing — run scripts/data/split-linz-holdout.py --execute"
    holdout = load_holdout()

    areas = available_areas()
    classes: dict[str, list[str]] = defaultdict(list)
    total_cases = 0
    total_ok = 0

    for area in areas:
        all_addresses = load_addresses(area)
        store = _CachedStore(all_addresses)
        corrector = AddressCorrector(store)
        pool = [a for a in all_addresses if road_key(a.road) not in holdout]
        randomizer = random.Random(HELDOUT_SEED)
        sample = randomizer.sample(pool, min(TUNE_SAMPLE, len(pool)))
        for address in sample:
            for case, ok, failure, raw in five_cases(corrector, address, area):
                total_cases += 1
                if ok:
                    total_ok += 1
                    continue
                classes[classify(case, raw, failure)].append(f"{failure} | input={raw!r}")

    accuracy = total_ok / total_cases if total_cases else 0.0
    lines = [
        "# D8 error analysis on the TUNE streets (the 80 % split; held-out streets excluded)",
        "",
        f"- Date: {time.strftime('%Y-%m-%d')}",
        f"- Sample: {TUNE_SAMPLE} addresses per area (seed {HELDOUT_SEED}) on NON-held-out streets, "
        f"{total_cases} checks; accuracy {accuracy:.2%} ({total_ok}/{total_cases}).",
        f"- Held-out list: {len(holdout)} streets (`fixtures/linz-holdout-streets.txt`, seed 20261108).",
        "",
        "## Misses by class (each class = one root fix)",
        "",
        "| Class | Count |",
        "|-------|-------|",
    ]
    lines.extend(
        f"| {cls} | {len(classes[cls])} |"
        for cls in sorted(classes, key=lambda c: -len(classes[c]))
    )
    for cls in sorted(classes, key=lambda c: -len(classes[c])):
        lines += ["", f"### {cls} ({len(classes[cls])})", ""]
        lines += [f"- {item}" for item in classes[cls][:12]]
        if len(classes[cls]) > 12:
            lines.append(f"- ... and {len(classes[cls]) - 12} more")
    lines.append("")

    ERRORS_REPORT.parent.mkdir(parents=True, exist_ok=True)
    ERRORS_REPORT.write_text("\n".join(lines), encoding="utf-8")

    assert total_cases > 0
    assert all("other" not in cls for cls in classes), f"unclassified misses: {classes.get('other') or [c for c in classes if c.startswith('other')]}"
