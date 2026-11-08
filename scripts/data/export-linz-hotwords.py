#!/usr/bin/env python3
"""Export the LINZ street/suburb/town name list the voice hotwords need.

Reads the build-local LINZ index (`data/linz/addresses-<area>.jsonl`, gitignored
per ADR-003 - the raw bulk is never committed) and writes a DERIVED name list to
`packages/nz-address/data/linz-hotwords.json`: unique road, suburb and town names
only - no address numbers, no raw bulk. LINZ NZ Addresses is CC BY 4.0, so the
derivative is allowed WITH the attribution line, which the exporter writes into the
file's header. The output lives outside every voice path (the lead's voice slice
imports it read-only for hotword matching).

Both the macron and the spoken (macron-stripped) form of each name are exported:
ASR emits no macrons, so "Māori" must match "Maori".

Like every script in this folder: prints the plan and stops unless --execute.
"""

from __future__ import annotations

import argparse
import json
import sys
import unicodedata
from datetime import UTC, datetime
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SOURCES = REPO / "data" / "linz"
AREAS = ("christchurch", "selwyn", "waimakariri")
OUT = REPO / "packages" / "nz-address" / "data" / "linz-hotwords.json"

ATTRIBUTION = "Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence (https://www.linz.govt.nz/data/linz-data-service)"


def strip_macrons(text: str) -> str:
    """The spoken form: NFD, drop combining marks, recompose."""
    decomposed = unicodedata.normalize("NFD", text)
    stripped = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    return unicodedata.normalize("NFC", stripped)


def collect() -> tuple[dict[str, set[str]], dict[str, int]]:
    names: dict[str, set[str]] = {"roads": set(), "suburbs": set(), "towns": set()}
    counts: dict[str, int] = {}
    for area in AREAS:
        path = SOURCES / f"addresses-{area}.jsonl"
        if not path.exists():
            print(f"missing {path} (run scripts/data/fetch-linz.py + build-linz-index.py first)")
            sys.exit(2)
        n = 0
        with path.open(encoding="utf-8") as handle:
            for line in handle:
                row = json.loads(line)
                if row.get("road"):
                    names["roads"].add(str(row["road"]).strip())
                if row.get("suburb"):
                    names["suburbs"].add(str(row["suburb"]).strip())
                if row.get("town"):
                    names["towns"].add(str(row["town"]).strip())
                n += 1
        counts[area] = n
    return names, counts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true", help="actually write the export")
    args = parser.parse_args()

    names, counts = collect()
    payload = {
        "attribution": ATTRIBUTION,
        "licence": "CC BY 4.0 (LINZ NZ Addresses, LDS layers 123113/123110/123109)",
        "derived": "unique road/suburb/town NAMES only - no address numbers, no raw LINZ bulk",
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "generated_by": "scripts/data/export-linz-hotwords.py",
        "source_files": {area: f"data/linz/addresses-{area}.jsonl (gitignored build-local)" for area in AREAS},
        "source_counts": counts,
        "counts": {key: len(value) for key, value in names.items()},
        "fields": {},
    }
    for field, values in names.items():
        plain = sorted(values)
        spoken = sorted({strip_macrons(v) for v in values} - set())  # spoken forms, macrons stripped
        payload["fields"][field] = {
            "names": plain,
            "spoken_forms": [v for v in spoken if v not in set(plain)],
        }

    print(f"plan: write {OUT.relative_to(REPO)}")
    print(f"  source rows: {counts}")
    print(f"  unique names: {payload['counts']}")
    print(f"  total export lines: {sum(len(v['names']) + len(v['spoken_forms']) for v in payload['fields'].values())}")
    print(f"  attribution header: {ATTRIBUTION}")
    if not args.execute:
        print("dry run: pass --execute to write")
        return

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(REPO)} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
