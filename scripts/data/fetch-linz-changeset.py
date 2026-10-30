#!/usr/bin/env python3
"""Fetches the LINZ changeset for NZ Addresses, so a new subdivision lands in a
week (C3's "the weekly changeset import").

The LINZ Data Service publishes the difference between two revisions of a layer
as a WFS changeset: the layer id carries a `-changeset` suffix and the request
carries `viewparams=from:<timestamp>;to:<timestamp>`
(https://www.linz.govt.nz/guidance/data-service/linz-data-service-guide/changesets/changeset-url-syntax,
read 2026-10-30). Every feature carries a `__change__` action: INSERT, UPDATE or
DELETE.

It is fetched per area, because our register is the three territorial
authorities of Canterbury and not the whole country: the same bounding box
`fetch-linz.py` uses is sent as the WFS filter.

    uv run --with httpx python scripts/data/fetch-linz-changeset.py --from 2026-10-23
    uv run --with httpx python scripts/data/fetch-linz-changeset.py --from 2026-10-23 --to 2026-10-30

The key is read from `LINZ_LDS_API_KEY` (`.env.local` or the environment) and is
never printed, logged or written to disk. The output is one JSON object per
changed address in `data/linz/` (gitignored) and a printed summary of the counts
by action, which is the week's evidence.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from collections import Counter
from datetime import UTC, datetime, timedelta
from pathlib import Path

# The fetcher is the single source for the areas, the key handling and the WFS
# base: a second copy of the bounding boxes is how the two drift apart. Its file
# name carries a hyphen, so it is loaded by location rather than by module name
# (a hyphen is not a Python identifier).
_HERE = Path(__file__).resolve().parent


def _load_fetcher():
    spec = importlib.util.spec_from_file_location("fetch_linz", _HERE / "fetch-linz.py")
    if spec is None or spec.loader is None:
        raise SystemExit("scripts/data/fetch-linz.py is missing")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


fetch_linz = _load_fetcher()
AREAS = fetch_linz.AREAS
LDS_BASE = fetch_linz.LDS_BASE
CHANGESET_LAYER = fetch_linz.LAYER_ADDRESSES + "-changeset"

REPO = Path(__file__).resolve().parents[2]
OUTPUT_DIR = REPO / "data" / "linz"
ACTIONS = {"INSERT", "UPDATE", "DELETE"}


def changeset_url(
    key: str,
    bbox: tuple[float, float, float, float],
    since: str,
    until: str,
    count: int,
    start_index: int,
) -> str:
    """One page of the changeset inside an area's bounding box."""
    box = ",".join(str(value) for value in bbox)
    return (
        f"{LDS_BASE};key={key}/wfs"
        "?service=WFS&version=2.0.0&request=GetFeature"
        f"&typeNames={CHANGESET_LAYER}"
        f"&viewparams=from:{since};to:{until}"
        f"&bbox={box}"
        "&srsName=EPSG:4326"
        "&outputFormat=application/json"
        f"&count={count}"
        "&sortBy=address_id"
        f"&startIndex={start_index}"
    )


def changed_rows(features: list[dict]) -> list[dict]:
    """One line per changed address, in the shape the index builder writes."""
    rows = []
    for feature in features:
        properties = feature.get("properties") or {}
        action = properties.get("__change__")
        if action not in ACTIONS:
            continue
        rows.append(
            {
                "action": action,
                "id": str(properties.get("address_id")),
                "number": properties.get("address_number"),
                "suffix": (properties.get("address_number_suffix") or "") or None,
                "unit": (properties.get("unit") or "") or None,
                "road": (properties.get("full_road_name") or "").strip(),
                "suburb": (properties.get("suburb_locality") or "").strip(),
                "town": (properties.get("town_city") or "").strip(),
            }
        )
    return rows


def fetch_page(url: str, label: str) -> list[dict]:
    """One page; the size is reported, never the key."""
    import httpx

    with httpx.Client(timeout=180.0, follow_redirects=True) as client:
        response = client.get(url)
    if response.status_code != 200:
        raise SystemExit(f"{label}: HTTP {response.status_code}")
    features = response.json().get("features") or []
    print(f"   {len(features)} changed features", flush=True)
    return features


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--from", dest="since", default=None,
                        help="the start of the window, YYYY-MM-DD; default: 7 days ago")
    parser.add_argument("--to", dest="until", default=None,
                        help="the end of the window, YYYY-MM-DD; default: today")
    parser.add_argument("--page-size", type=int, default=5_000)
    parser.add_argument("--limit", type=int, default=200_000)
    args = parser.parse_args()

    # Never inline the key handling: the fetcher reads it from .env.local or the
    # environment, and it must never be printed.
    key = fetch_linz.api_key()
    today = datetime.now(UTC).date()
    until = args.until or today.isoformat()
    since = args.since or (today - timedelta(days=7)).isoformat()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    counts: Counter[str] = Counter()
    for area in sorted(AREAS):
        print(f"-> {area} changeset {since}..{until}", flush=True)
        features: list[dict] = []
        start_index = 0
        while len(features) < args.limit:
            page = fetch_page(
                changeset_url(key, AREAS[area], since, until,
                              min(args.page_size, args.limit - len(features)), start_index),
                f"{area} changeset",
            )
            if not page:
                break
            features.extend(page)
            start_index += len(page)
            if len(page) < args.page_size:
                break
        rows = changed_rows(features)
        counts.update(row["action"] for row in rows)
        target = OUTPUT_DIR / f"changeset-{area}-{since}_{until}.jsonl"
        with target.open("w", encoding="utf-8") as handle:
            for row in rows:
                handle.write(json.dumps(row, ensure_ascii=False) + "\n")
        print(f"   wrote {target.relative_to(REPO)} ({len(rows)} changes)", flush=True)

    summary = {
        "layer": CHANGESET_LAYER,
        "window": {"from": since, "to": until},
        "areas": sorted(AREAS),
        "insert": counts["INSERT"],
        "update": counts["UPDATE"],
        "delete": counts["DELETE"],
        "total": sum(counts.values()),
    }
    (OUTPUT_DIR / f"changeset-summary-{since}_{until}.json").write_text(
        json.dumps(summary, indent=2), encoding="utf-8"
    )
    print(json.dumps(summary, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
