#!/usr/bin/env python3
"""Fetches the real LINZ NZ Addresses for Canterbury (V3 task T4).

The key is read from `LINZ_LDS_API_KEY` (`.env.local` or the environment) and is
never printed, logged or written to disk.

    uv run --with httpx python scripts/data/fetch-linz.py --area christchurch
    uv run --with httpx python scripts/data/fetch-linz.py --area all --limit 200000

The output lands in `data/linz/` (gitignored): a GeoJSON file per area and
layer, ready for the D8 engine and the offline FTS slice.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUTPUT_DIR = REPO / "data" / "linz"

# The LINZ Data Service WFS endpoint and the layer ids verified against the
# live GetCapabilities on 2026-10-20 (docs/decisions/adr/ADR-003-linz-data.md):
#   NZ Addresses               -> data.linz.govt.nz:layer-123113
#   NZ Addresses: Roads        -> data.linz.govt.nz:layer-123110
#   NZ Addresses: Road Sections -> data.linz.govt.nz:layer-123109
LDS_BASE = "https://data.linz.govt.nz/services"
LAYER_ADDRESSES = "data.linz.govt.nz:layer-123113"
LAYER_ROADS = "data.linz.govt.nz:layer-123110"

# The areas we need (the territorial authorities of Canterbury and the city).
# WFS 2.0 uses the EPSG:4326 axis order (latitude first).
AREAS: dict[str, tuple[float, float, float, float]] = {
    # (min_lat, min_lon, max_lat, max_lon)
    "christchurch": (-43.75, 172.45, -43.35, 172.85),
    "waimakariri": (-43.85, 172.15, -43.45, 172.75),
    "selwyn": (-43.95, 171.55, -43.40, 172.65),
}


def api_key() -> str:
    """Reads the LINZ key from the environment or from .env.local."""
    key = os.environ.get("LINZ_LDS_API_KEY")
    if key:
        return key.strip()
    env_file = REPO / ".env.local"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("LINZ_LDS_API_KEY"):
                value = line.split("=", 1)[1].strip()
                if value:
                    return value
    raise SystemExit("LINZ_LDS_API_KEY is not set (put it in .env.local)")


def wfs_url(
    key: str,
    layer: str,
    bbox: tuple[float, float, float, float],
    count: int,
    start_index: int = 0,
) -> str:
    """Builds a WFS GetFeature URL for a layer inside a bounding box."""
    box = ",".join(str(value) for value in bbox)
    return (
        f"{LDS_BASE};key={key}/wfs"
        "?service=WFS&version=2.0.0&request=GetFeature"
        f"&typeNames={layer}"
        f"&bbox={box}"
        "&srsName=EPSG:4326"
        "&outputFormat=application/json"
        f"&count={count}"
        "&sortBy=address_id"
        f"&startIndex={start_index}"
    )


def fetch(url: str, label: str) -> list[dict]:
    """Fetches one WFS page and reports its size (never the key)."""
    import httpx

    with httpx.Client(timeout=180.0, follow_redirects=True) as client:
        response = client.get(url)
    if response.status_code != 200:
        raise SystemExit(f"{label}: HTTP {response.status_code}")
    document = response.json()
    features = document.get("features") or []
    print(f"   {len(features)} features", flush=True)
    return features


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--area",
        default="christchurch",
        choices=sorted(AREAS) + ["all"],
        help="the area to fetch (default: christchurch)",
    )
    parser.add_argument("--limit", type=int, default=200_000, help="maximum features per area")
    parser.add_argument("--page-size", type=int, default=10_000, help="features per WFS request")
    parser.add_argument(
        "--layers",
        default=LAYER_ADDRESSES,
        help="comma-separated WFS layer names",
    )
    args = parser.parse_args()

    key = api_key()
    areas = sorted(AREAS) if args.area == "all" else [args.area]
    layers = [name.strip() for name in args.layers.split(",") if name.strip()]

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for area in areas:
        bbox = AREAS[area]
        for layer in layers:
            print(f"-> {area} / {layer}", flush=True)
            features: list[dict] = []
            start_index = 0
            while len(features) < args.limit:
                page = fetch(
                    wfs_url(
                        key,
                        layer,
                        bbox,
                        min(args.page_size, args.limit - len(features)),
                        start_index,
                    ),
                    f"{area} / {layer}",
                )
                if not page:
                    break
                features.extend(page)
                start_index += len(page)
                if len(page) < args.page_size:
                    break
            document = {"type": "FeatureCollection", "features": features}
            safe_layer = layer.replace(".", "_").replace(":", "-")
            target = OUTPUT_DIR / f"{safe_layer}_{area}.geojson"
            target.write_text(json.dumps(document), encoding="utf-8")
            print(f"   wrote {target.relative_to(REPO)} ({len(features)} features)", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
