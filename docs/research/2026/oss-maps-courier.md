# OSS shortlist — maps/navigation + courier/delivery (founder reviewer, 2026-10-20)

**Status: UNVERIFIED** (compiled without live repo access). Maps & Routing squads must verify stars, latest release, license and compatibility on each repo page before adopting (V4 §3).

## Adopt / study now
1. **stadiamaps/ferrostar** (BSD-3) — turn-by-turn + spoken guidance; feed Valhalla routes; wrap as Expo native module. Fallback: maplibre-navigation-android (MIT).
2. **protomaps/basemaps** (BSD-3; ODbL data) — style base; light/dark flavours for day/night.
3. **protomaps/PMTiles** CLI — `pmtiles extract` Canterbury packs ≤ 50 MB, diff updates in CI.
4. **komoot/photon** (Apache-2.0) — self-hosted typo-tolerant geocoder (NZ extract); on device: LINZ FTS5 in op-sqlite.
5. **VisionCamera code scanner + ML Kit text recognition** (+ **zxing-cpp** fallback) — label scan flow.
6. **PyVRP** (MIT) — benchmark vs VROOM on 80–150-stop Christchurch days.
7. **Valhalla trace_attributes** — map-matching for logbook km and speed learning; study on-device Valhalla; Plan B **GraphHopper** (Apache-2.0).
8. **traccar-client-android** (Apache-2.0) — foreground service / battery-whitelist pattern for background location.
9. **sherpa-onnx KWS + TTS** — wake word + spoken stop announcements.
10. **maplibre/maputnik** (MIT) — "courier mode" style: house numbers from z17, entrances, access restrictions.
Also: openfreemap (online fallback/style ideas), versatiles, libpostal (server-side parser, ~2 GB), traccar server (geofences/trip reports).

## Parity features to copy (Circuit, Routific, Fleetbase)
Stop notes (gate codes), photo + signature + recipient name POD, failed-delivery reason codes, re-optimise on mid-route add, parcel location in van ("shelf B3"), pickup/drop time windows, daily km/earnings IRD logbook, one-tap navigate to next stop.

## Licenses
- AGPL-3.0: Fleetbase + navigator-app — UX reference only, never code.
- GPL: openrouteservice, Nominatim — reference / unmodified separate server only; never in APK.
- ODbL (OSM): in-app attribution; LINZ CC-BY 4.0 attribution; OpenMapTiles styles CC-BY.
- ML Kit proprietary (free) — keep zxing/Tesseract path as FOSS fallback.
