# The Canterbury pack, built by scripts/data/build-pmtiles.mjs on this machine

Built: 2026-11-12T02:45:44Z
Extract: 406060713 bytes (the Geofabrik NZ extract)
Extract sha256: b5595da206e0066cb2670363a3ee039c3a65ececb3247ac16ec1175af2cb74f7

## The pack

total 93228
-rwxrwxrwx 1 root root      832 Nov 10 17:00 README.md
-rw-r--r-- 1 root root     1605 Nov 12 02:37 canterbury.manifest.json
-rw-r--r-- 1 root root 47718502 Nov 12 02:37 canterbury.pmtiles
-rw-r--r-- 1 root root 47734753 Nov 12 02:37 canterbury.tileset.pmtiles

pack bytes: 47718502
pack sha256: 7ee57e5ab53ec344c137a4944e04fc1db9926f2382a45262a5e6fdf88f8de2f1
ceiling: 52428800 bytes (50 MiB)

## The archive header, from the tool itself

```json
{
    "tile_compression": "gzip",
    "tile_type": "mvt",
    "minzoom": 6,
    "maxzoom": 14,
    "bounds": [
        170.5,
        -44.5,
        173.5,
        -42.8
    ],
    "center": [
        172,
        -43.65,
        7
    ]
}
```

## The verify step

2026/11/12 02:45:46 verify.go:169: Completed verify in 12.618726ms.

## The tool versions

planetiler: [m[0m0:00:00 DEB - argument: refresh_sources=false (download new version of source files if they have changed)
pmtiles: pmtiles 1.31.2, commit a3e4951ea6a0477b784c27c1dcbfd9c130878c5a, built at 2026-07-22T18:59:03Z
java: openjdk version "21.0.13" 2026-10-20
node: v24.22.2

## The manifest the app reads

```json
{
  "schema": "courier-copilot/offline-pack",
  "version": 1,
  "region": "canterbury",
  "builtAt": "2026-11-12T02:37:26.156Z",
  "source": "Geofabrik New Zealand extract",
  "sourceLicence": "Open Database License (ODbL)",
  "sourceLicenceUrl": "https://www.openstreetmap.org/copyright",
  "attribution": "© OpenStreetMap contributors. Contains information from OpenStreetMap, available under the Open Database License (ODbL). Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence Vector tiles and schema derived from OpenMapTiles, licensed under CC BY 4.0, (c) OpenMapTiles contributors",
  "minZoom": 6,
  "maxZoom": 14,
  "bytes": 47718502,
  "sha256": "7ee57e5ab53ec344c137a4944e04fc1db9926f2382a45262a5e6fdf88f8de2f1",
  "archive": {
    "header": {
      "tile_compression": "gzip",
      "tile_type": "mvt",
      "minzoom": 6,
      "maxzoom": 14,
      "bounds": [
        170.5,
        -44.5,
        173.5,
        -42.8
      ],
      "center": [
        172,
        -43.65,
        7
      ]
    }
  },
  "tools": {
    "planetiler": {
      "asset": "planetiler.jar",
      "download": "https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar",
      "licence": "Apache-2.0",
      "version": "0.10.2"
    },
    "pmtiles": {
      "asset": "pmtiles_linux_amd64",
      "download": "https://github.com/protomaps/go-pmtiles/releases/latest/download/pmtiles_linux_amd64",
      "licence": "BSD-3-Clause",
      "version": "pmtiles 1.31.2, commit a3e4951ea6a0477b784c27c1dcbfd9c130878c5a, built at 2026-07-22T18:59:03Z"
    }
  }
}
```
