# The offline map pack

This folder is where the Canterbury pack lives. The pack itself is about 50 MB
and is **not** in the repository; it is built from an extract with
`scripts/data/build-pmtiles.mjs` and delivered to the phone.

```
canterbury.pmtiles         the tile archive (PMTiles v3)
canterbury.manifest.json    the manifest: the contract with the app
glyphs/<fontstack>/<range>.pbf   the glyph bundle, so the map can draw text
```

The app reads the same three things from its document directory at runtime,
which is where the weekly refresh puts the new pack. The layout, the manifest
schema and the build are written down in `docs/squads/maps/README.md`.

The `.pmtiles` file and the manifest are build artefacts and are not
committed; the folder keeps its README so the path exists in the repository.
