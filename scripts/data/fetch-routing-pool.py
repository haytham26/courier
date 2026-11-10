"""Fetch the routing evaluation set's stop pool: real LINZ Canterbury addresses WITH geometry.

Writes data/routing-eval/stop-pool.json (never committed; it is the local input
of scripts/eval/build-routing-eval.mjs, which commits the balanced subsample).

Deterministic by construction: a fixed grid of small cells over each delivery
territory box, walked row-major, with a per-cell cap so the sample cannot
collapse into whichever suburb answers first, and every STRIDE-th address inside
each cell. The same run always yields the same pool, and the same pool always
yields the same evaluation set.

The delivery territory is Christchurch city and the two districts that border it,
one box each. Mid-Canterbury (Ashburton, Rakaia east) is out: those are not
courier territory for this app, and the wide territorial-authority boxes of
scripts/data/fetch-linz.py swallowed them.

Run: uv run --with httpx python scripts/data/fetch-routing-pool.py
(needs LINZ_LDS_API_KEY in .env.local)
Licence: CC BY 4.0 - sourced from the LINZ Data Service.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.parse
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

LDS_BASE = "https://data.linz.govt.nz/services"
LAYER = "data.linz.govt.nz:layer-123113"

# (min_lat, min_lon, max_lat, max_lon) - the delivery territory, not the
# territorial authority: a courier's day does not reach Ashburton.
TERRITORY: dict[str, tuple[float, float, float, float]] = {
    "christchurch": (-43.72, 172.45, -43.40, 172.83),
    "selwyn": (-43.85, 171.85, -43.55, 172.50),
    "waimakariri": (-43.85, 172.35, -43.60, 172.80),
}
TAKE = {"christchurch": 1200, "selwyn": 700, "waimakariri": 700}
CELL = 0.02
PAGE = 5000
CAP_PER_CELL = 6
STRIDE = 5


def api_key() -> str:
    key = os.environ.get("LINZ_LDS_API_KEY")
    if key and key.strip():
        return key.strip()
    env_file = REPO / ".env.local"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
            if line.strip().startswith("LINZ_LDS_API_KEY"):
                return line.split("=", 1)[1].strip()
    raise SystemExit("LINZ_LDS_API_KEY is not set (put it in .env.local)")


KEY = api_key()


def wfs(params: dict) -> dict:
    """Fetches one WFS page through httpx, like `fetch-linz.py` does: the
    Semgrep rule on a dynamic URL is right that `urllib` can read a `file://`
    path, and httpx cannot - and this URL is built from the key and a cell box
    the script itself owns."""
    import httpx

    url = f"{LDS_BASE};key={KEY}/wfs?" + urllib.parse.urlencode(params)
    with httpx.Client(timeout=180.0, follow_redirects=True) as client:
        response = client.get(url)
    if response.status_code != 200:
        raise SystemExit(f"the WFS answered HTTP {response.status_code}")
    return response.json()


def cells(bbox: tuple[float, float, float, float]) -> list[tuple[float, float, float, float]]:
    min_lat, min_lon, max_lat, max_lon = bbox
    out = []
    lat = min_lat
    while lat < max_lat:
        lon = min_lon
        while lon < max_lon:
            out.append(
                (
                    round(lat, 4),
                    round(lon, 4),
                    round(min(lat + CELL, max_lat), 4),
                    round(min(lon + CELL, max_lon), 4),
                )
            )
            lon += CELL
        lat += CELL
    return out


def main() -> int:
    pool: list[dict] = []
    per_area: dict[str, int] = {}
    for area, bbox in sorted(TERRITORY.items()):
        taken = 0
        cell_list = sorted(cells(bbox))
        for index, (a, b, c, d) in enumerate(cell_list):
            if taken >= TAKE[area]:
                break
            doc = wfs(
                {
                    "service": "WFS",
                    "version": "2.0.0",
                    "request": "GetFeature",
                    "typeNames": LAYER,
                    "bbox": ",".join(str(value) for value in (a, b, c, d)),
                    "srsName": "EPSG:4326",
                    "outputFormat": "application/json",
                    "count": PAGE,
                    "sortBy": "address_id",
                }
            )
            cell_taken = 0
            for position, feature in enumerate(doc.get("features") or []):
                if position % STRIDE or cell_taken >= CAP_PER_CELL:
                    continue
                props = feature["properties"]
                coords = (feature.get("geometry") or {}).get("coordinates")
                if not coords:
                    continue
                pool.append(
                    {
                        "area": area,
                        "grid_cell": f"{index:03d}",
                        "linz_address_id": str(props.get("address_id")),
                        "full_address": props.get("full_address"),
                        "road": props.get("full_road_name"),
                        "suburb": props.get("suburb_locality"),
                        "town": props.get("town_city"),
                        "lat": round(float(coords[1]), 7),
                        "lon": round(float(coords[0]), 7),
                    }
                )
                cell_taken += 1
                taken += 1
                if taken >= TAKE[area]:
                    break
            time.sleep(0.15)
        per_area[area] = taken
        print(f"{area}: {taken} stops, cell cap {CAP_PER_CELL}, {len(cell_list)} cells", flush=True)

    print("pool size:", len(pool), per_area)
    out = REPO / "data" / "routing-eval" / "stop-pool.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(
            {
                "source": {
                    "what": "LINZ Data Service WFS, layer 123113 (NZ Addresses), fetched "
                    + time.strftime("%Y-%m-%d"),
                    "licence": "CC BY 4.0 (sourced from the LINZ Data Service)",
                    "url_pattern": "https://data.linz.govt.nz/services;key=<LINZ_LDS_API_KEY>/wfs"
                    "?service=WFS&version=2.0.0&request=GetFeature"
                    "&typeNames=data.linz.govt.nz:layer-123113"
                    "&bbox=<cell box>&srsName=EPSG:4326"
                    "&outputFormat=application/json&count=5000&sortBy=address_id",
                    "sampling": f"deterministic: a grid of {CELL}-degree cells over each delivery "
                    f"territory box, row-major order, cap {CAP_PER_CELL} stops per cell, "
                    f"every {STRIDE}th address inside a cell",
                    "territory_boxes": TERRITORY,
                    "grid_cell_degrees": CELL,
                    "per_cell_cap": CAP_PER_CELL,
                },
                "stops": pool,
            },
            indent=1,
        ),
        encoding="utf-8",
    )
    print("wrote", out.relative_to(REPO), out.stat().st_size, "bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
