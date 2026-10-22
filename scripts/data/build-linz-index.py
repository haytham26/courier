#!/usr/bin/env python3
"""Builds the address index the D8 engine reads (V3 task T4).

Input: the GeoJSON files `scripts/data/fetch-linz.py` wrote into `data/linz/`.
Output: one JSON object per line in `data/linz/addresses-<area>.jsonl` with the
fields the engine needs, plus a `summary.json` with the counts.

The data stays in `data/linz/` (gitignored); only the report is committed.

    uv run python scripts/data/build-linz-index.py --area christchurch
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DATA_DIR = REPO / "data" / "linz"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--area", default="christchurch")
    args = parser.parse_args()

    sources = sorted(DATA_DIR.glob(f"*_{args.area}.geojson"))
    if not sources:
        print(f"no GeoJSON for '{args.area}' in {DATA_DIR} — run scripts/data/fetch-linz.py first")
        return 1

    target = DATA_DIR / f"addresses-{args.area}.jsonl"
    counters: Counter[str] = Counter()
    written = 0

    with target.open("w", encoding="utf-8") as handle:
        for source in sources:
            document = json.loads(source.read_text(encoding="utf-8"))
            for feature in document.get("features") or []:
                properties = feature.get("properties") or {}
                address_id = properties.get("address_id")
                number = properties.get("address_number")
                road = (properties.get("full_road_name") or "").strip()
                if address_id is None or number is None or not road:
                    continue
                suffix = (properties.get("address_number_suffix") or "").strip() or None
                unit = (properties.get("unit") or "").strip() or None
                suburb = (properties.get("suburb_locality") or "").strip()
                town = (properties.get("town_city") or "").strip()
                if not suburb:
                    # Older records put the locality in the full address only.
                    full = (properties.get("full_address") or "").split(",")
                    suburb = full[1].strip() if len(full) > 2 else (full[0].strip() if full else "")
                record = {
                    "id": str(address_id),
                    "number": str(number),
                    "suffix": suffix,
                    "unit": unit,
                    "road": road,
                    "suburb": suburb,
                    "town": town,
                }
                handle.write(json.dumps(record, ensure_ascii=False) + "\n")
                written += 1
                counters["with_suffix"] += 1 if suffix else 0
                counters["with_unit"] += 1 if unit else 0
                counters[f"suburb:{suburb}"] += 1

    summary = {
        "area": args.area,
        "addresses": written,
        "with_suffix": counters["with_suffix"],
        "with_unit": counters["with_unit"],
        "distinct_suburbs": len([key for key in counters if key.startswith("suburb:")]),
        "index": target.name,
    }
    (DATA_DIR / f"summary-{args.area}.json").write_text(
        json.dumps(summary, indent=2), encoding="utf-8"
    )
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
