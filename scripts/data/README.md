# The data builders

The scripts that build the data the app runs on. None of them runs in CI: they need the source
data, which is either large (the map extracts) or personal (the label photos).

| Script | What it does |
|---|---|
| `build-pmtiles.mjs` | Builds the Canterbury offline map pack (D15). It checks the terms of the tile source before it does anything and refuses a source whose terms forbid our offline use. `node scripts/data/build-pmtiles.mjs --source geofabrik-nz [--execute]`. |
| `build-3d-buildings.mjs` | Bakes the 3D buildings into the pack (MASTER_EXECUTION section 11). `node scripts/data/build-3d-buildings.mjs --source linz-nz-building-outlines [--execute]`. |
| `generate-synthetic-labels.mjs` | Draws the synthetic label images and their ground truth into `data/labels/synthetic/` (never committed: a label photo may hold personal data). `node scripts/data/generate-synthetic-labels.mjs`. |
| `fetch-linz.py` | Downloads the LINZ `NZ Addresses` GeoJSON per area into `data/linz/` (the key comes from `LINZ_LDS_API_KEY` in `.env.local`; T4). `uv run --with httpx python scripts/data/fetch-linz.py --area christchurch`. Above the default 200 000 limit, pass `--limit` — Christchurch (225 295) and Waimakariri (236 205) are both truncated by it, and the truncated part is the newest addresses. |
| `fetch-linz-changeset.py` | Fetches the LINZ changeset — the week's inserts, updates and deletes — for the three areas (C3's weekly import). `uv run --with httpx python scripts/data/fetch-linz-changeset.py --from 2026-10-23`. The weekly lane `.github/workflows/linz-changeset.yml` runs it, rebuilds the index and re-runs the accuracy measure. |
| `list-linz-layers.py` | Prints the live LINZ LDS layer list, so a stale layer id is caught against `GetCapabilities`. `uv run --with httpx python scripts/data/list-linz-layers.py`. |
| `build-linz-index.py` | Turns the LINZ GeoJSON into the one-line-per-address JSONL index the D8 engine loads (`data/linz/addresses-<area>.jsonl`). `uv run python scripts/data/build-linz-index.py --area christchurch`. |

## The rules

- The source data is never committed: it is downloaded to `data/linz/` or `data/labels/`, both
  gitignored.
- The licence of every source is checked before it is used, and it is recorded in
  `docs/product/LICENSES.md`.
- A script prints the plan and stops unless it is told to execute.
