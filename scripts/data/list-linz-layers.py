#!/usr/bin/env python3
"""Lists the WFS layers the LINZ Data Service exposes, with their titles (T4).

The key is read from .env.local and is never printed.
    uv run --with httpx python scripts/list-linz-layers.py [filter]
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

# Three parents up, not two (see the same fix in fetch-linz.py): with two, the
# .env.local the key is read from was looked for in scripts/, not in the
# repository root, and the lister refused to run wherever it was invoked from.
REPO = Path(__file__).resolve().parents[2]


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


def main() -> int:
    needle = sys.argv[1].lower() if len(sys.argv) > 1 else ""
    key = api_key()
    url = (
        f"https://data.linz.govt.nz/services;key={key}/wfs"
        "?service=WFS&version=2.0.0&request=GetCapabilities"
    )
    import httpx

    with httpx.Client(timeout=120.0, follow_redirects=True) as client:
        response = client.get(url)
    if response.status_code != 200:
        print(f"HTTP {response.status_code}")
        return 1

    blocks = re.findall(
        r"<Name>(data\.linz\.govt\.nz:layer-\d+)</Name>.*?<Title>([^<]*)</Title>",
        response.text,
        re.S,
    )
    for name, title in blocks:
        if needle in title.lower() or needle in name.lower():
            print(f"{name}  {title}")
    print(f"({len(blocks)} layers with titles)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
