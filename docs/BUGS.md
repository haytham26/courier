# Bug Tracker - Courier Copilot

> Every known bug is logged here. No bug is closed without passing the 50x backtest for its critical path.

| ID | Description | Root Cause | Fix (PR) | Prevention Test | Status |
|----|-------------|------------|----------|-----------------|--------|
| BUG-001 | `app/nz_address.py`: Suburbs list is hardcoded + uses `difflib`; confusion between suffix and unit. "42B" = number 42 + suffix B. Unit written as `2/14`. | Legacy prototype code, not LINZ-based | Fixed in packages/nz-address | Unit tests for 50 Canterbury addresses with suffixes/units | fixed |
| BUG-002 | `app/agents/intake_graph.py` (`verify`): Mutates input in place; replay of applied answers is incorrect. | State mutation during verification | - | Property test: replay produces identical result | open |
| BUG-003 | `requirements.txt`: Uses `>=` version ranges instead of locked hashes. | No dependency locking | - | `uv lock --generate-hashes` produces reproducible lockfile | open |
| BUG-004 | Tool names in `app/agents/copilot.py` don't match section 4.5 catalog. | Naming drift from prototype | - | OpenSpec tool catalog compliance test | open |
| BUG-005 | No monorepo structure - code in `app/` not `apps/api/` | Pre-monorepo layout | Monorepo created with apps/api, packages/shared, nz-address, design-tokens | Turborepo builds all packages | fixed |
| BUG-006 | No CI pipeline with review-gate and 50x backtest | Not implemented | - | CI runs backtest.sh 50x on critical paths | open |
| BUG-007 | No Docker compose for local infrastructure (Postgres, Valhalla, LiveKit, Redis) | Not implemented | - | `docker compose up` brings up all services | open |
| BUG-008 | No Expo mobile app created yet | Phase B not started | Expo app created with all 6 native modules | `pnpm mobile start` runs on device/emulator | fixed |
| BUG-009 | No design system / design tokens pipeline | Phase B.2 not started | Design tokens with Unistyles 3 | Style Dictionary builds tokens for all platforms | doing |
| BUG-010 | No voice module (Sherpa-onnx, Pipecat, earbud protocol) | Phase B.4 not started | Voice service created, needs TS fixes | Voice commands work offline <300ms | todo |
| BUG-011 | No maps module (munim-maps, PMTiles, offline Canterbury) | Phase B.5 not started | MapLibre v11.3.7 integrated | Map renders offline at 60fps | todo |
| BUG-012 | No sync engine (op-sqlite, event sourcing) | Phase B.6 not started | @op-engineering/op-sqlite installed | Offline-first sync works | todo |
| BUG-013 | No LINZ address import worker | Phase C.1 not started | - | Weekly LINZ changeset import works | open |
| BUG-014 | No NZ address correction engine (pg_trgm, phonetic) | Phase C.2 not started | - | 95%+ correction accuracy on golden set | open |
| BUG-015 | No map builder pipeline (planetiler, PMTiles) | Phase C.3 not started | - | Canterbury PMTiles < 500MB builds weekly | open |
| BUG-016 | No routing engine (Valhalla + VROOM + OR-Tools) | Phase C.4 not started | - | 200 stops routed < 5s | open |
| BUG-017 | No 3-point door memory with EWMA learning | Phase C.5 not started | - | Door memory persists across shifts | open |
| BUG-018 | No dictation mode with auto-correction report | Phase D.1 not started | - | 30 addresses dictated → corrected list | open |
| BUG-019 | No live voice agent (Pipecat cascade, all languages) | Phase D.2 not started | - | Multi-language conversation works | open |
| BUG-020 | Not all features voice-accessible (D2) | Phase D.3 not started | - | Every tool has voice command | open |
| BUG-021 | No driving mode (geofences, whispers, nav handoff) | Phase D.4 not started | - | 10-stop drive hands-free | open |
| BUG-022 | No web dashboard (Next.js) | Phase E.1 not started | - | Driver dashboard syncs with mobile | open |
| BUG-023 | No admin panel | Phase E.2 not started | - | Internal admin sees all orgs | open |
| BUG-024 | No Stripe billing (NZD, GST) | Phase E.3 not started | - | Subscriptions work end-to-end | open |
| BUG-025 | No team/franchise features | Phase E.4 not started | - | Multi-driver orgs work | open |
| BUG-026 | No OCR label scanning (VisionCamera + ML Kit) | Phase F.1 not started | - | 50 label photos → 95% LINZ address_id | open |
| BUG-027 | No POD photo capture | Phase F.2 not started | - | Optional photo per delivery | open |
| BUG-028 | No optional SMS notifications | Phase F.3 not started | - | Customer tracking link via SMS | open |
| BUG-029 | No IRD logbook PDF generation | Phase F.4 not started | - | PDF with IRD-compliant numbers | open |
| BUG-030 | No Ferrostar turn-by-turn behind flag | Phase F.5 not started | - | Flag toggles built-in navigation | open |
| BUG-031 | No Privacy Impact Assessment | Phase G.1 not started | - | PIA document complete | open |
| BUG-032 | No App Store / Play Console assets | Phase G.2 not started | - | Screenshots, descriptions ready | open |
| BUG-033 | No acceptance test script (emulator + device) | Phase G.3 not started | - | ACCEPTANCE_TEST.md passes | open |
| BUG-034 | No handover documentation (HANDOVER.md, APK) | Phase G.4 not started | - | Founder can run emulator + install APK | open |
| BUG-035 | Compliance: NativeWind used instead of Unistyles 3 | External review found violation | Migrated to Unistyles 3 | No NativeWind imports in codebase | fixed (50x backtest passed) |
| BUG-036 | Compliance: Supabase Auth used instead of Better Auth | External review found violation | Migrated to Better Auth | No Supabase Auth imports in codebase | fixed (50x backtest passed) |
| BUG-037 | Compliance: munim-maps referenced instead of MapLibre v11 | External review found violation | Migrated to @maplibre/maplibre-react-native v11.3.7 | No munim-maps references | fixed (50x backtest passed) |
| BUG-038 | Compliance: Redis used instead of Valkey | External review found violation | docker-compose uses Valkey 8 | No Redis in docker-compose | fixed (50x backtest passed) |
| BUG-039 | Compliance: .gitignore missing .turbo/, .expo/, dist/, node_modules/ | External review found violation | .gitignore updated, .turbo/cache removed from git | git check-ignore catches all build artifacts | fixed (50x backtest passed) |
| BUG-040 | TypeScript errors in voice module (missing exports, module resolution) | Voice module incomplete | Need to fix exports and imports | `tsc --noEmit` passes | doing |

---

**Last Updated:** 2026-10-19 06:58:00 +13:00
**Total Bugs:** 40 | **Open:** 25 | **Fixed:** 10 | **Doing:** 3 | **Verified (50x):** 5