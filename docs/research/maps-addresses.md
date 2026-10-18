# Maps & Addresses — Canterbury Geospatial Plan

> **Last Updated:** October 2026
> **Goal:** Offline-first map for Canterbury, door-level accuracy, learned entry points, LINZ-verified addresses.

---

## 1. Data Sources & Licensing

| Dataset | Source | License | Coverage | Resolution | Our Use |
|---------|--------|---------|----------|------------|---------|
| **NZ Addresses** | LINZ Data Service | CC BY 4.0 | Nationwide | Point per address | Canonical geocoder, validation |
| **NZ Street Centreline** | LINZ | CC BY 4.0 | Nationwide | Line geometry | Street sequencing, template |
| **NZ Suburb Boundaries** | LINZ / Stats NZ | CC BY 4.0 | Nationwide | Polygon | Territory definition |
| **OSM (OpenStreetMap)** | Geofabrik NZ extract | ODbL | Canterbury | Full vector | Base map, routing graph |
| **LINZ Aerial Imagery** | LINZ Basemaps (COG) | CC BY 4.0 | Christchurch 7.5cm, Rural 30cm | Raster | Satellite view for driveways |
| **NZ Property Titles** | LINZ (paid API) | Restricted | Nationwide | Polygon + metadata | Gate codes, unit layouts (future) |

**Attribution Required:** "© LINZ CC BY 4.0, © OpenStreetMap contributors" — displayed in map legend & settings.

---

## 2. Canterbury Map Build Pipeline

### 2.1 Boundary Definition
```
Canterbury Region BBox: [169.5, -44.5, 173.5, -42.5]
Christchurch Urban:      [172.3, -43.65, 172.9, -43.45]
```

### 2.2 Vector Tiles (PMTiles via planetiler)

**planetiler config (canterbury.json):**
```json
{
  "layers": {
    "roads": { "source": "osm", "filter": "highway in (motorway,trunk,primary,secondary,tertiary,residential,service,unclassified)" },
    "buildings": { "source": "osm", "filter": "building" },
    "addresses": { "source": "osm", "filter": "addr:housenumber" },
    "landuse": { "source": "osm", "filter": "landuse" },
    "boundaries": { "source": "osm", "filter": "boundary=administrative" },
    "water": { "source": "osm", "filter": "natural=water or waterway" }
  },
  "max_zoom": 16,
  "min_zoom": 0
}
```

**Build Command:**
```bash
planetiler \
  --osm-path canterbury.osm.pbf \
  --output canterbury.pmtiles \
  --config canterbury.json \
  --threads 8 \
  --boundary "POLYGON((169.5 -44.5, 173.5 -44.5, 173.5 -42.5, 169.5 -42.5, 169.5 -44.5))"
```

**Output:** `canterbury.pmtiles` (~120 MB) — hosted on Supabase Storage / Cloudflare R2.

### 2.3 Raster Tiles (Aerial Imagery)

**Challenge:** Christchurch 7.5cm = ~2.5 GB for full city. Too large for mobile download.

**Solution: Hybrid Delivery**
1. **Vector tiles** (full Canterbury, 120 MB) — downloaded once on WiFi
2. **Raster tiles** — on-demand, cached per viewport
   - Christchurch urban: 7.5cm (LINZ COG via WMTS)
   - Rural Canterbury: 30cm (LINZ COG)
   - Cache limit: 500 MB LRU

**Mobile Implementation:**
```typescript
// MapLibre style - hybrid source
const style = {
  version: 8,
  sources: {
    'canterbury-vector': { type: 'vector', url: 'pmtiles://canterbury.pmtiles' },
    'chch-aerial': { 
      type: 'raster-dem',  // or custom raster source
      url: 'https://tiles.linz.govt.nz/.../{z}/{x}/{y}.webp',
      tileSize: 256,
      maxzoom: 20
    }
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#f5f5f0' } },
    { id: 'aerial', type: 'raster', source: 'chch-aerial', minzoom: 15 },
    { id: 'roads', type: 'line', source: 'canterbury-vector', 'source-layer': 'roads' },
    { id: 'buildings', type: 'fill-extrusion', source: 'canterbury-vector', 'source-layer': 'buildings' },
    { id: 'stops', type: 'circle', source: 'stops-runtime' },
    { id: 'entry-points', type: 'circle', source: 'entries-runtime' }
  ]
}
```

---

## 3. Address Intelligence (LINZ-Backed)

### 3.1 Canonical Address Table (`locations`)

```sql
-- From schema.sql
CREATE TABLE locations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address_key     text UNIQUE NOT NULL,    -- "14 harewood rd, bishopdale"
  street_key      text NOT NULL,           -- "bishopdale:harewood rd"
  house_number    text,                    -- "14"
  unit            text,                    -- "2" (for 2/14)
  suburb          text,                    -- "Bishopdale"
  geocode_point   geography(Point, 4326),  -- LINZ curb coordinate
  entry_point     geography(Point, 4326),  -- LEARNED true door
  park_point      geography(Point, 4326),  -- LEARNED van stop
  delivery_count  int NOT NULL DEFAULT 0
);
```

### 3.2 Address Normalisation Pipeline

```
Raw Input (Voice/OCR) 
    → nz_address.parse() 
    → Canonical address_key 
    → LINZ geocode lookup (pg_trgm fuzzy match) 
    → If match: use LINZ coordinate (geocode_point)
    → If no match: Pelias/Valhalla fallback
    → Save to locations (upsert on address_key)
```

### 3.3 Fuzzy Matching Strategy

| Scenario | Method | Threshold |
|----------|--------|-----------|
| Exact address_key match | Hash lookup | 1.0 |
| Typo in street/suburb | `pg_trgm` similarity | > 0.7 |
| Number not in street | LINZ street number range check | Exact |
| Māori name variant | Custom lexicon (SPOKEN_FIXES) | Exact |
| "Main North" no suburb | Driver territory bias | Territory first |

---

## 4. Door-Level Memory (The Moat)

### 4.1 Three-Point Model per Address

| Point | Source | Accuracy | Use Case |
|-------|--------|----------|----------|
| **geocode_point** | LINZ / Google | ~5–10m (curb) | Initial navigation |
| **park_point** | Learned (GPS at "Delivered") | ~3m | "Park here" whisper |
| **entry_point** | Learned (GPS at door + driver correction) | ~1–2m | "Door here" whisper, navigation target |

### 4.2 Learning Algorithm (EWMA)

```sql
-- Trigger on delivery_events (see schema.sql)
CREATE OR REPLACE FUNCTION learn_entry_point() RETURNS trigger AS $$
DECLARE loc uuid; alpha float := 0.3;
BEGIN
  IF NEW.kind NOT IN ('delivered','left_at') OR NEW.position IS NULL OR coalesce(NEW.accuracy_m, 99) > 15 THEN
    RETURN NEW;
  END IF;
  SELECT location_id INTO loc FROM stops WHERE id = NEW.stop_id;
  UPDATE locations SET
    entry_point = CASE WHEN entry_point IS NULL THEN NEW.position ELSE
      ST_SetSRID(ST_MakePoint(
        (1-alpha)*ST_X(entry_point::geometry) + alpha*ST_X(NEW.position::geometry),
        (1-alpha)*ST_Y(entry_point::geometry) + alpha*ST_Y(NEW.position::geometry)), 4326)::geography END,
    park_point = CASE WHEN park_point IS NULL THEN NEW.position ELSE
      ST_SetSRID(ST_MakePoint(
        (1-alpha)*ST_X(park_point::geometry) + alpha*ST_X(NEW.position::geometry),
        (1-alpha)*ST_Y(park_point::geometry) + alpha*ST_Y(NEW.position::geometry)), 4326)::geography END,
    delivery_count = delivery_count + 1
  WHERE id = loc;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
```

**Alpha = 0.3** — new observation pulls 30% toward itself. Converges in ~10 deliveries.

### 4.3 Driver Correction: "Pin Wrong, House Here"

| Input | Action |
|-------|--------|
| Voice: "Pin wrong, house here" | Save current GPS as `entry_point` (high confidence) |
| Long-press map on satellite | Save tapped coordinate as `entry_point` |
| "Park here" at stop | Save current GPS as `park_point` |

**UI:** Satellite view + 3 pins (Google curb 🔵, Park 🅿️, Door 🚪) — driver drags door pin.

---

## 5. Routing & Sequencing

### 5.1 Valhalla (Turn-by-Turn)
- **Self-hosted** on Fly.io Sydney (Docker: `ghcr.io/valhalla/valhalla:latest`)
- **Data:** Canterbury OSM + NZ-specific turn restrictions
- **Cost API:** `sources_to_targets` for ETA matrix
- **Turn-by-turn:** Used for "whisper" instructions

### 5.2 VROOM + OR-Tools (Stop Ordering)

**Constraint:** Master Template Lock — driver's street order is PRIMARY.

```python
# sequencing.py logic (already implemented)
def sequence(stops: list[Stop], template: list[Segment]) -> list[Stop]:
    # 1. Group stops by street_key
    # 2. Order streets by template rank
    # 3. Within street: odd_first / even_first / asc / desc per template
    # 4. Off-template streets: insert after nearest templated neighbour (+0.5 rank)
    # 5. Priority stops jump queue
    return ordered_stops
```

**VROOM used only for:**
- Multi-depot optimization (future)
- "Re-optimize today only" explicit driver request
- Team dispatch (multiple drivers)

### 5.3 Navigation Handoff

**Critical Rule:** Send **learned coordinate** to external nav, NOT address text.

```typescript
// Mobile: "Start navigation" button
const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${entryPoint.lat},${entryPoint.lng}`
// OR Waze: waze://?ll=${lat},${lng}&navigate=yes
// OR Apple Maps: maps://?daddr=${lat},${lng}
```

**Why:** Google geocodes "14 Harewood Rd" to curb. Our `entry_point` = actual door. Saves 30–90s/stop.

---

## 6. Offline Map Architecture

### 6.1 Mobile Storage

| Data | Size | Storage | Update |
|------|------|---------|--------|
| Vector tiles (Canterbury) | ~120 MB | `FileSystem.documentDirectory/maps/` | Monthly via background download |
| Raster cache (viewed areas) | Up to 500 MB | Same, LRU eviction | On-demand |
| Address DB (SQLite) | ~50 MB | `op-sqlite` / PowerSync | Daily sync |
| Routing graph (Valhalla tiles) | ~200 MB | Same | Monthly |

### 6.2 Offline Capabilities Matrix

| Feature | Offline? | How |
|---------|----------|-----|
| Map pan/zoom | ✅ | Vector tiles local |
| Satellite view | ⚠️ Partial | Cached tiles only |
| Address search | ✅ | Local SQLite + LINZ data |
| Turn-by-turn nav | ✅ | Valhalla local (or cached route) |
| "Whisper" at 150m/30m | ✅ | Geofence + local TTS |
| "Pin wrong" save | ✅ | Local DB, sync later |
| Dictation | ❌ | Needs Deepgram (WiFi/4G) |
| Sync | ❌ | Queued, auto on reconnect |

---

## 7. Australia Expansion (Geospatial)

| Component | NZ (Canterbury) | Australia (NSW/VIC/QLD) |
|-----------|-----------------|-------------------------|
| Address Data | LINZ NZ Addresses | **GNAF** (Geoscape, paid) + State APIs |
| Street Centreline | LINZ | PSMA / State |
| Suburb Boundaries | LINZ/Stats NZ | ABS / State |
| Aerial Imagery | LINZ Basemaps | **Nearmap** (paid) / State Gov |
| OSM Coverage | Good | Excellent |
| Routing | Valhalla NZ | Valhalla AU |
| Projection | NZTM2000 (EPSG:2193) | GDA2020 / MGA zones |

**GNAF Cost:** ~$5K–$15K/year for startup license. Budget for Phase 4.

---

## 8. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Map render (vector) | 60 FPS | Reanimated + MapLibre |
| Address search (local) | < 50ms | SQLite + pg_trgm index |
| Geocode (LINZ match) | < 100ms | PostGIS GiST index |
| Route 200 stops | < 5s | Valhalla + VROOM |
| Tile download (Canterbury) | < 2 min on WiFi | 120 MB |
| Battery (12h GPS + map) | > 20% remaining | Adaptive GPS interval |

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LINZ API rate limits | Low | Medium | Cache aggressively, weekly bulk import |
| OSM addressing gaps in rural Canterbury | Medium | High | LINZ addresses primary, OSM fallback |
| Raster tile storage on device | High | Medium | LRU cache, 500MB cap, user-managed clear |
| Valhalla routing errors (driveways) | Medium | High | Learned entry_point overrides |
| Map style not "native" feel | Low | Medium | Copy Apple Maps/Spoke aesthetics |
| PMTiles format changes | Low | Low | Planetiler stable, pin version |

---

## 10. Sources

| Source | Date | Verification |
|--------|------|--------------|
| LINZ Data Service API docs | Oct 2026 | ✅ |
| Geofabrik NZ OSM extract | Oct 2026 | ✅ |
| planetiler GitHub | Oct 2026 | ✅ |
| MapLibre React Native docs | Oct 2026 | ✅ |
| Valhalla Docker image | Oct 2026 | ✅ |
| VROOM-Project GitHub | Oct 2026 | ✅ |
| PostGIS 3.4 docs | Oct 2026 | ✅ |
| pgvector HNSW benchmarks | Oct 2026 | ✅ |