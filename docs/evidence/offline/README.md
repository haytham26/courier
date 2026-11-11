# Offline evidence — the founder directive 2026-11-10, item 6 (OFFLINE)

Written by the OFFLINE lane (branch `offline/shifts`, worktree `.worktrees/offline`).
Every number below is **measured** on this machine or on the CI AVDs and every
claim names the command that produced it. Nothing here is claimed that was not
run; the legs that are NOT measured are named at the end, with the reason.

The lane's brief (`docs/log/CURRENT.md`, the founder directive 2026-11-10 item 6):
a complete shift in airplane mode with **0 data loss over ≥ 50 simulated
shifts**, **exactly-once sync under flaky networks** (including a kill
mid-sync), the **Christchurch PMTiles pack** rendered offline with its ODbL
attribution, and a **Maestro flow in CI** for the offline shift.

## 0. The pre-fetch record (written BEFORE the Geofabrik fetch, per the lane brief)

| Item                   | Value                                                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL                    | `https://download.geofabrik.de/australia-oceania/new-zealand-latest.osm.pbf` (the alias the workflow uses; a `307` redirects it to the dated extract below)                       |
| Resolved URL           | `https://download.geofabrik.de/australia-oceania/new-zealand-261109.osm.pbf`                                                                                                      |
| Host                   | `download.geofabrik.de` (the registered host of the `geofabrik-nz` source in `scripts/data/build-pmtiles.mjs`, checked by its `--check-url` before any byte is fetched — BUG-102) |
| Expected size          | 406,060,713 bytes (387.3 MiB), `Content-Length` of the resolved URL read on 2026-11-11                                                                                            |
| Server `Last-Modified` | Tue, 10 Nov 2026 07:45:10 GMT                                                                                                                                                     |
| Fetch start            | 2026-11-11 (the exact timestamp is in the fetch log below)                                                                                                                        |
| Licence                | ODbL (the extract is OpenStreetMap data; we build our own tiles from it, so the OSMF tile servers and their usage policy are not involved)                                        |
| Fetched into           | `<worktree>/data/maps/` (git-ignored — ADR-003)                                                                                                                                   |

The fetch log, the sha256 and the measured size are written into §3 once the
download finishes.
