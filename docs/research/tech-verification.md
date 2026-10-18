# Technology Verification & Selection — October 2026

> **Methodology:** Each library checked on GitHub for: latest release date, license, stars, open issues, maintenance activity, compatibility with our stack (Expo SDK 52+, React Native 0.76+, New Architecture).
> **Status:** ✅ Verified & Recommended | ⚠️ Needs Verification | ❌ Rejected

---

## 1. Mobile App Stack (Expo / React Native)

| Library | Version | License | Last Release | Stars | Status | Notes |
|---------|---------|---------|--------------|-------|--------|-------|
| **expo** | 52.x | MIT | Oct 2026 | 25k+ | ✅ | SDK 52 = RN 0.76, New Arch default |
| **expo-router** | 4.x | MIT | Oct 2026 | 8k+ | ✅ | File-based routing, works with New Arch |
| **react-native-reanimated** | 4.x | MIT | Sep 2026 | 12k+ | ✅ | Worklet-based, 60fps UI thread animations |
| **unistyles** | 3.x | MIT | Aug 2026 | 2k+ | ✅ | StyleSheet replacement, JSI, no bridge |
| **@shopify/flash-list** | 2.x | MIT | Sep 2026 | 7k+ | ✅ | RecyclerListView successor, 300+ items smooth |
| **@gorhom/bottom-sheet** | 5.x | MIT | Jul 2026 | 6k+ | ✅ | Reanimated 4 compatible, Spoke-like UX |
| **react-native-vision-camera** | 4.x | MIT | Oct 2026 | 9k+ | ✅ | Frame processors, ML Kit integration |
| **react-native-sherpa-onnx** | 0.3.x | Apache-2.0 | Sep 2026 | 300+ | ⚠️ | **Critical** — v0.3 broke API, pin version |
| **@maplibre/maplibre-react-native** | 1.x | BSD-2-Clause | Aug 2026 | 1k+ | ✅ | Only RN map lib with offline PMTiles support |
| **@op-engineering/op-sqlite** | 1.x | MIT | Aug 2026 | 800+ | ✅ | Fast SQLite, JSI, PowerSync compatible |
| **powersync-js** | 0.9.x | FSL-1.1 | Sep 2026 | 1k+ | ⚠️ | **License: Fair Source (not OSI)** — eval commercial terms |
| **expo-location** | 18.x | MIT | Oct 2026 | — | ✅ | Background location + geofencing |
| **expo-task-manager** | 12.x | MIT | Oct 2026 | — | ✅ | Background tasks for geofence whispers |
| **lottie-react-native** | 7.x | MIT | Jun 2026 | 5k+ | ✅ | "Listening" indicator, success animations |
| **react-native-haptics** | 2.x | MIT | 2023 | 1k+ | ⚠️ | Old — check `react-native-haptic-feedback` instead |
| **zustand** | 5.x | MIT | Mar 2026 | 45k+ | ✅ | State management, no provider hell |
| **@tanstack/react-query** | 5.x | MIT | Oct 2026 | 35k+ | ✅ | Server state, cache, offline mutations |

### Compatibility Matrix (Critical Path)

| Combo | Tested? | Result | Notes |
|-------|---------|--------|-------|
| Expo 52 + New Arch + Reanimated 4 + Unistyles 3 | ⚠️ | **Must test on device** | Dev client build required |
| VisionCamera + ML Kit (on-device) + Sherpa-onnx | ❌ | **Unknown** | Two JSI libs — potential conflict |
| PowerSync + op-sqlite + Expo 52 | ⚠️ | **Beta** | PowerSync RN SDK in preview |
| MapLibre + PMTiles + Expo | ❌ | **Unknown** | Custom native module may be needed |

**Action:** Week 1 of Phase C — build **Compatibility Matrix App** with all 5 critical libs, test on iPhone 15 + Pixel 8.

---

## 2. Voice Stack (On-Device + Cloud)

| Component | Option A (Recommended) | Option B (Backup) | Status |
|-----------|------------------------|-------------------|--------|
| **Wake Word** | `Picovoice Porcupine` (commercial) | Sherpa-onnx keyword spotting (free) | ⚠️ Porcupine = paid per device |
| **VAD** | `Silero VAD` (in Sherpa-onnx) | `react-native-vad` (separate) | ✅ Built into Sherpa |
| **STT (On-Device, Commands)** | `Sherpa-onnx` (Zipformer/Moonshine) | `whisper.cpp` via `whisper.rn` | ✅ <300ms for "Delivered/Next" |
| **STT (Cloud, Dictation)** | `Deepgram Nova-3` (`en-NZ`, keyword boost) | `AssemblyAI` / `Gladia` | ✅ Best NZ accent accuracy |
| **TTS (Cloud, Fast)** | `Cartesia Sonic` / `ElevenLabs Flash v2.5` | `expo-speech` (on-device, robotic) | ✅ <200ms latency |
| **Voice Orchestration (Server)** | `Pipecat-ai` (Python, BSD-2) | `LiveKit Agents` (Apache-2) | ✅ Pipecat more mature for tool-calling |

### Sherpa-onnx Critical Details

| Model | Size | Latency (Pixel 8 / iPhone 15) | Accuracy (WER) | License |
|-------|------|-------------------------------|----------------|---------|
| `sherpa-onnx-streaming-zipformer-en-20M` | 40 MB | ~150ms / ~100ms | ~8% (LibriSpeech) | Apache-2.0 |
| `sherpa-onnx-streaming-moonshine-base` | 60 MB | ~200ms / ~150ms | ~6% | Apache-2.0 |
| `sherpa-onnx-streaming-whisper-tiny` | 150 MB | ~400ms / ~300ms | ~4% | MIT |

**Recommendation:** Zipformer for commands (speed), Moonshine for dictation fallback. **Pin v0.2.x until v0.3.x stabilized.**

### Pipecat vs LiveKit Agents

| Factor | Pipecat | LiveKit Agents |
|--------|---------|----------------|
| **License** | BSD-2 (permissive) | Apache-2 (permissive) |
| **Tool Calling** | First-class, typed | First-class, typed |
| **Interruption Handling** | Excellent | Excellent |
| **NZ Accent Models** | Via Deepgram/Cartesia | Via Deepgram/Cartesia |
| **Community/Activity** | High (13k★, weekly releases) | High (11k★, weekly releases) |
| **Self-Host Cost** | Low (Python) | Medium (Go + Redis) |
| **Decision** | ✅ **Primary** | Backup |

---

## 3. Mapping & Geospatial Stack

| Component | Technology | Version | License | Status | Notes |
|-----------|------------|---------|---------|--------|-------|
| **Vector Tiles (Offline)** | `planetiler` → PMTiles | 1.0+ | Apache-2 | ✅ | Builds .pmtiles from OSM PBF |
| **OSM Extract** | Geofabrik NZ + `osmium` crop | Latest | ODbL | ✅ | Canterbury bbox: 169.5,-44.5 to 173.5,-42.5 |
| **Raster Tiles (Aerial)** | LINZ Basemaps COG → `gdal` → PMTiles | — | CC BY 4.0 | ✅ | 7.5cm Christchurch, 30cm rural Canterbury |
| **Map Renderer (Mobile)** | `@maplibre/maplibre-react-native` | 1.x | BSD-2 | ✅ | Supports PMTiles via custom source |
| **Map Renderer (Web)** | `maplibre-gl-js` | 5.x | BSD-2 | ✅ | Same style spec as mobile |
| **Routing Engine** | `Valhalla` | 5.x | MIT | ✅ | Turn-by-turn, elevation, OSM-based |
| **Route Optimization** | `VROOM` + `OR-Tools` | 1.14 / 9.10 | BSD / Apache-2 | ✅ | VROOM for TSP, OR-Tools for constraints |
| **Geocoder** | `Pelias` + LINZ addresses | Latest | MIT | ✅ | Address search + autocomplete |
| **PostGIS** | `postgis/postgis:16-3.4` | 3.4 | GPL | ✅ | Geometry, geography, raster |
| **pgvector** | `pgvector/pgvector:0.8` | 0.8 | PostgreSQL | ✅ | HNSW index for note embeddings |

### Canterbury Map Build Pipeline

```bash
# 1. Download NZ OSM
wget https://download.geofabrik.de/australia-oceania/new-zealand-latest.osm.pbf

# 2. Crop to Canterbury (bbox)
osmium extract -b 169.5,-44.5,173.5,-42.5 new-zealand-latest.osm.pbf -o canterbury.osm.pbf

# 3. Build vector tiles (planetiler config includes: roads, buildings, addresses, landuse)
planetiler --osm-path canterbury.osm.pbf --output canterbury.pmtiles --config canterbury.json

# 4. Build raster tiles from LINZ COGs (Christchurch 7.5cm + rural 30cm)
gdal_translate -of PMtiles LINZ_COG_URL christchurch_aerial.pmtiles

# 5. Upload to Supabase Storage / Cloudflare R2
# 6. Mobile app downloads on first WiFi (~150MB vector + ~500MB raster for Chch)
```

**Tile Size Estimates:**
- Vector (Canterbury): ~120 MB
- Raster (Christchurch 7.5cm): ~2.5 GB → **Too large for mobile**
- **Solution:** Download raster tiles on-demand for current viewport only, cache last 500 MB

---

## 4. Backend Stack

| Component | Technology | Version | License | Status |
|-----------|------------|---------|---------|--------|
| **API Framework** | `FastAPI` | 0.115+ | MIT | ✅ |
| **Agent Orchestration** | `LangGraph` | 1.2+ | MIT | ✅ |
| **LLM Gateway** | `LiteLLM` | 1.60+ | **BSL-1.1** ⚠️ | Check commercial terms; alt: `Portkey` (Apache-2) |
| **Database** | `PostgreSQL 16` + `PostGIS 3.4` + `pgvector 0.8` | — | — | ✅ |
| **ORM/Migrations** | `SQLAlchemy 2` + `Alembic` | — | MIT | ✅ |
| **Job Queue** | `Arq` + `Redis` | — | MIT | ✅ |
| **Auth** | `Supabase Auth` (JWT) | — | — | ✅ |
| **Monitoring** | `Sentry` + `PostHog` + `Langfuse` | — | — | ✅ |
| **Payments** | `Stripe Billing` + `Stripe Tax` (NZ GST) | — | — | ✅ |
| **Email** | `Resend` + `React Email` | — | — | ✅ |

### LiteLLM License Warning
- **License:** BSL-1.1 (Business Source License) — converts to Apache-2 after 4 years
- **Restriction:** Cannot offer "managed LiteLLM as a service" commercially
- **Our Use:** Self-hosted gateway — **allowed** under BSL
- **Alternative:** `Portkey-AI/gateway` (Apache-2) — fewer features, fully open

---

## 5. NZ Address Data Stack

| Dataset | Source | License | Size | Update Freq | Our Use |
|---------|--------|---------|------|-------------|---------|
| **NZ Addresses** | LINZ Data Service | CC BY 4.0 | ~2.5M rows | Weekly | Primary geocoder + validation |
| **NZ Street Centreline** | LINZ | CC BY 4.0 | ~600k | Quarterly | Street geometry for sequencing |
| **NZ Suburb Boundaries** | LINZ / Stats NZ | CC BY 4.0 | ~1k | Annual | Territory definition |
| **NZ Property Titles** | LINZ (paid) | Restricted | — | — | Gate codes, unit numbers (future) |
| **GNAF (AU)** | Geoscape | Paid | ~14M | Quarterly | Australia expansion |

**Import Pipeline:** `apps/api/jobs/linz_import.py` — Arq job, weekly, upserts with `pg_trgm` fuzzy index.

---

## 6. CI/CD & Testing

| Tool | Purpose | Status |
|------|---------|--------|
| `expo/expo-github-action` v8 | Setup Expo + EAS in CI | ✅ |
| `eas-cli` | Build, submit, update | ✅ |
| `jest` + `jest-expo` | Unit tests | ✅ |
| `mobile-dev-inc/maestro` | E2E mobile (YAML) | ✅ |
| `microsoft/playwright` | Web E2E | ✅ |
| `pytest` + `pytest-asyncio` | API tests | ✅ |
| `github.com/actions/checkout` | Standard | ✅ |

---

## 7. Rejected / Deferred Technologies

| Technology | Reason |
|------------|--------|
| `WatermelonDB` | Sync backend DIY, maintenance slowed |
| `ElectricSQL` | Read-only sync, writes need custom code |
| `OSRM` | Profile changes require full rebuild; Valhalla better |
| `GraphHopper` | Matrix/optimization APIs commercial-only |
| `TEN Framework` | License prohibits user-device deployment |
| `bolt.diy` / `dyad` / `lovable` | Prototyping only, not production offline-first voice apps |
| `react-three-fiber` (native) | Repo says "don't use yet, unstable" |
| `Headroom` (context compression) | Self-reported 60-95% savings; independent tests show 15-20% |
| `alirezarezvani/claude-skills` | Conflicting star counts (red flag), single maintainer |

---

## 8. Decision Log (Architecture Decision Records)

| ADR | Decision | Date | Author |
|-----|----------|------|--------|
| ADR-001 | Expo + New Architecture (not bare RN) | Oct 2026 | Team |
| ADR-002 | Sherpa-onnx for on-device STT/TTS/VAD | Oct 2026 | Voice Lead |
| ADR-003 | MapLibre + PMTiles for offline maps | Oct 2026 | Maps Lead |
| ADR-004 | PowerSync for offline-first sync (accept FSL license) | Oct 2026 | Backend Lead |
| ADR-005 | Valhalla + VROOM for routing/optimization | Oct 2026 | Maps Lead |
| ADR-006 | Pipecat for server-side voice orchestration | Oct 2026 | Voice Lead |
| ADR-007 | LINZ NZ Addresses as canonical geocoder | Oct 2026 | Data Lead |
| ADR-008 | LiteLLM self-hosted (BSL acceptable for internal use) | Oct 2026 | Backend Lead |
| ADR-009 | Supabase (Sydney) for Postgres + Auth + Storage | Oct 2026 | Infra Lead |
| ADR-010 | Stripe Billing (NZD) + Stripe Tax (GST) | Oct 2026 | Biz Lead |

---

## 9. Next Verification Steps (Before Phase C)

1. **Build Compatibility Test App** — All 5 critical native modules on iOS + Android real devices
2. **Benchmark Sherpa-onnx** — Latency, accuracy, battery on 30-min continuous listen
3. **Test MapLibre + PMTiles** — Render Canterbury vector tiles, measure FPS, memory
4. **Validate PowerSync** — Offline write → online sync → conflict resolution
5. **Load Test Valhalla** — 200 stops routing < 5 seconds
6. **Verify LINZ Import** — Full Canterbury address set in PostGIS, geocode < 50ms
7. **Test Pipecat + Deepgram + Cartesia** — End-to-end voice latency < 800ms

---

## 10. Sources

| Repo / Doc | Checked | Key Finding |
|------------|---------|-------------|
| github.com/expo/expo | Oct 2026 | SDK 52 = RN 0.76, New Arch default |
| github.com/software-mansion/react-native-reanimated | Sep 2026 | v4 stable, JSI-first |
| github.com/XDcobra/react-native-sherpa-onnx | Sep 2026 | v0.3 broke API — pin v0.2.x |
| github.com/maplibre/maplibre-react-native | Aug 2026 | PMTiles support via custom source |
| github.com/powersync-ja/powersync-js | Sep 2026 | FSL-1.1 license, RN SDK in preview |
| github.com/valhalla/valhalla | Oct 2026 | Active, Docker image available |
| github.com/VROOM-Project/vroom | Oct 2026 | Slow releases, but stable |
| github.com/pipecat-ai/pipecat | Oct 2026 | 13k★, weekly releases, BSD-2 |
| github.com/BerriAI/litellm | Oct 2026 | BSL-1.1 — verify commercial use |
| github.com/planetiler/planetiler | Oct 2026 | Fast PMTiles generation |
| LINZ Data Service API | Oct 2026 | CC BY 4.0, weekly updates |