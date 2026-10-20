#!/usr/bin/env python3
"""Lists the LINZ WFS layers with their titles (V3 task T4).

The key is read from .env.local and is never printed.
    uv run --with httpx python scripts/list-linz-layers.py [filter]
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_linz import api_key  # noqa: E402

import httpx  # noqa: E402


def main() -> int:
    needle = sys.argv[1].lower() if len(sys.argv) > 1 else ""
    key = api_key()
    url = (
        f"https://data.linz.govt.nz/services;key={key}/wfs"
        "?service=WFS&version=2.0.0&request=GetCapabilities"
    )
    with httpx.Client(timeout=120.0, follow_redirects=True) as client:
        response = client.get(url)
    if response.status_code != 200:
        print(f"HTTP {response.status_code}")
        return 1

    text = response.text
    # Each layer block carries its <Name> and its <Title>.
    blocks = re.findall(r"<Name>(data\.linz\.govt\.nz:layer-\d+)</Name>.*?<Title>([^<]*)</Title>", text, re.S)
    for name, title in blocks:
        if needle in title.lower() or needle in name.lower():
            print(f"{name}  {title}")
    print(f"({len(blocks)} layers with titles)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
