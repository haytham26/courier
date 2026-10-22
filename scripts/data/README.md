# The data builders

The scripts that build the data the app runs on. None of them runs in CI: they need the source
data, which is either large (the map extracts) or personal (the label photos).

| Script | What it does |
|---|---|
| `build-pmtiles.mjs` | Builds the Canterbury offline map pack (D15). It checks the terms of the tile source before it does anything and refuses a source whose terms forbid our offline use. `node scripts/data/build-pmtiles.mjs --source geofabrik-nz [--execute]`. |
| `build-3d-buildings.mjs` | Bakes the 3D buildings into the pack (MASTER_EXECUTION section 11). `node scripts/data/build-3d-buildings.mjs --source linz-nz-building-outlines [--execute]`. |
| `generate-synthetic-labels.mjs` | Draws the synthetic label images and their ground truth into `data/labels/synthetic/` (never committed: a label photo may hold personal data). `node scripts/data/generate-synthetic-labels.mjs`. |

## The rules

- The source data is never committed: it is downloaded to `data/linz/` or `data/labels/`, both
  gitignored.
- The licence of every source is checked before it is used, and it is recorded in
  `docs/product/LICENSES.md`.
- A script prints the plan and stops unless it is told to execute.
