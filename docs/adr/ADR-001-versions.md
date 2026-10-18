# ADR-001: Locked Versions and Tool Versions

**Status:** Accepted
**Date:** 2026-10-19
**Deciders:** Development Team

---

## Context

This ADR records all locked versions for dependencies, tools, and SDKs used in the Courier Copilot project. Versions are verified from official sources (npm, PyPI, GitHub releases, documentation) before installation. This document is updated after the Week 1 compatibility spike.

---

## Tool Versions (Development Environment)

| Tool | Version | Source | Verified |
|------|---------|--------|----------|
| Node.js | 24.21.0 (LTS) | nodejs.org | ✅ |
| pnpm | 12.14.0 | pnpm.io | ✅ |
| Python | 3.11.9 | python.org | ✅ |
| uv | 0.11.28 | astral.sh/uv | ✅ |
| Git | 2.56.0 | git-scm.com | ✅ |
| Java | 25.0.1 LTS | oracle.com/java | ✅ |
| Android SDK | Latest (API 34) | developer.android.com | ⏳ |
| Expo CLI | Latest (via npx) | expo.dev | ⏳ |
| EAS CLI | Latest (via npx) | expo.dev | ⏳ |

---

## Backend Dependencies (Python / FastAPI)

| Package | Version | License | Source | Verified |
|---------|---------|---------|--------|----------|
| fastapi | 0.115.0 | MIT | PyPI | ⏳ |
| uvicorn[standard] | 0.30.0 | BSD-3 | PyPI | ⏳ |
| pydantic | 2.7.0 | MIT | PyPI | ⏳ |
| pydantic-settings | 2.1.0 | MIT | PyPI | ⏳ |
| langgraph | 0.2.60 | MIT | PyPI | ⏳ |
| langgraph-checkpoint | 4.3.0 | MIT | PyPI | ⏳ |
| anthropic | 0.40.0 | MIT | PyPI | ⏳ |
| psycopg[binary] | 3.2.0 | LGPL-3.0 | PyPI | ⏳ |
| sqlalchemy | 2.0.0 | MIT | PyPI | ⏳ |
| alembic | 1.12.0 | MIT | PyPI | ⏳ |
| redis | 5.0.0 | MIT | PyPI | ⏳ |
| arq | 0.23.0 | MIT | PyPI | ⏳ |
| litellm | 1.83.0 | MIT | PyPI | ⏳ |
| pipecat-ai | 1.12.0 | MIT | PyPI | ⏳ |
| livekit-server-sdk | 1.0.0 | Apache-2.0 | PyPI | ⏳ |
| python-jose[cryptography] | 3.3.0 | MIT | PyPI | ⏳ |
| passlib[bcrypt] | 1.7.4 | BSD | PyPI | ⏳ |
| python-multipart | 0.0.6 | MIT | PyPI | ⏳ |
| pytest | 8.0.0 | MIT | PyPI | ⏳ |
| pytest-asyncio | 0.23.0 | MIT | PyPI | ⏳ |
| pytest-repeat | 0.9.0 | MIT | PyPI | ⏳ |
| pytest-randomly | 3.15.0 | BSD | PyPI | ⏳ |

---

## Mobile Dependencies (Expo / React Native) - ACTUAL INSTALLED

| Package | Version | License | Source | Verified |
|---------|---------|---------|--------|----------|
| expo | 58.0.14 | MIT | npm | ✅ |
| react-native | 0.88.0 | MIT | npm | ✅ |
| react | 19.3.0 | MIT | npm | ✅ |
| expo-router | 58.0.23 | MIT | npm | ✅ |
| **react-native-unistyles** | **3.0.0** | MIT | npm | ✅ |
| **@maplibre/maplibre-react-native** | **11.3.7** | BSD-2 | npm | ✅ |
| react-native-reanimated | 4.7.1 | MIT | npm | ✅ |
| react-native-gesture-handler | 3.3.0 | MIT | npm | ✅ |
| react-native-screens | 4.30.0 | MIT | npm | ✅ |
| react-native-vision-camera | 5.2.3 | MIT | npm | ✅ |
| @shopify/react-native-skia | 1.8.0 | MIT | npm | ✅ |
| @gorhom/bottom-sheet | 5.0.0 | MIT | npm | ✅ |
| @tanstack/react-query | 5.0.0 | MIT | npm | ✅ |
| zustand | 5.0.0 | MIT | npm | ✅ |
| expo-audio | 58.0.9 | MIT | npm | ✅ |
| expo-location | 58.0.17 | MIT | npm | ✅ |
| expo-task-manager | 58.0.17 | MIT | npm | ✅ |
| expo-background-fetch | 58.0.17 | MIT | npm | ✅ |
| expo-haptics | 58.0.17 | MIT | npm | ✅ |
| expo-sqlite | 58.0.17 | MIT | npm | ✅ |
| op-sqlite | 1.0.0 | MIT | npm | ✅ |
| watmelondb | 0.28.0 | MIT | npm | ✅ |
| @deepgram/sdk | 3.0.0 | MIT | npm | ✅ |
| @pipecat-ai/client-js | 1.14.0 | BSD-2 | npm | ✅ |
| date-fns | 3.6.0 | MIT | npm | ✅ |
| zod | 3.23.0 | MIT | npm | ✅ |
| clsx | 2.1.1 | MIT | npm | ✅ |
| tailwind-merge | 3.7.0 | MIT | npm | ✅ |
| class-variance-authority | 0.7.1 | MIT | npm | ✅ |
| lucide-react-native | 0.4.0 | MIT | npm | ✅ |
| react-native-reusables | Latest | MIT | GitHub | ⏳ |
| react-native-arc-ui | Latest | MIT | GitHub | ⏳ |
| react-native-full-swipe | Latest | MIT | GitHub | ⏳ |
| style-dictionary | 4.0.0 | Apache-2.0 | npm | ✅ |
| **better-auth** | **1.0.0** | MIT | npm | ✅ |
| **react-native-sherpa-onnx** | **0.4.4** | MIT | npm | ✅ |

---

## Infrastructure Versions

| Component | Version | License | Source | Verified |
|-----------|---------|---------|--------|----------|
| PostgreSQL | 16 | PostgreSQL | Docker Hub | ✅ |
| PostGIS | 3.5 | GPL-2.0 | Docker Hub | ✅ |
| pgvector | 0.7.0 | PostgreSQL | GitHub | ✅ |
| pg_trgm | Built-in | PostgreSQL | - | ✅ |
| **Valkey** | **8** | BSD-3 | Docker Hub | ✅ |
| Valhalla | 3.6.x | MIT | GitHub | ⏳ |
| VROOM | 1.15.0 | BSD-2 | GitHub | ⏳ |
| OR-Tools | 9.15 | Apache-2.0 | GitHub | ⏳ |
| planetiler | Latest | Apache-2.0 | GitHub | ⏳ |
| osmium-tool | Latest | GPL-2.0 | GitHub | ⏳ |
| LiveKit | 1.0.0 | Apache-2.0 | GitHub | ⏳ |
| LiteLLM | 1.83.0+ | MIT | PyPI | ⏳ |
| GlitchTip | Latest | MIT | GitHub | ⏳ |
| Uptime Kuma | Latest | MIT | GitHub | ⏳ |
| Langfuse | Latest | MIT | GitHub | ⏳ |

---

## Native Modules (Critical - Require Week 1 Compatibility Test)

| Module | Version | Type | Integration Method | Risk |
|--------|---------|------|-------------------|------|
| **react-native-sherpa-onnx** | **0.4.4** | Custom JSI | Custom Expo Module | 🔴 High |
| VisionCamera | 5.2.3 | Nitro Modules | `npx expo install` | 🟡 Medium |
| Reanimated | 4.7.1 | JSI / Fabric | `npx expo install` | 🟡 Medium |
| **@maplibre/maplibre-react-native** | **11.3.7** | Nitro Modules | `npx expo install` | 🟡 Medium |
| op-sqlite | 1.0.0 | JSI | `npx expo install` | 🟢 Low |
| expo-audio | 58.0.9 | Expo Module | `npx expo install` | 🟢 Low |

---

## Design System Versions

| Component | Version | Source |
|-----------|---------|--------|
| react-native-reusables | Latest (2026-10) | GitHub: shaungt1/expo-app-starter-playbook |
| react-native-arc-ui | Latest (2026-10) | GitHub: arcvlad/react-native-arc-ui |
| ui-mob-components | Latest (2026-10) | GitHub: taty1977/ui-mob-components |
| Design Tokens (Style Dictionary) | 4.0.0 | npm |

---

## Research References (Verified 2026-10)

| Research Doc | Source | Key Findings |
|--------------|--------|--------------|
| expo-app-starter-playbook | shaungt1/expo-app-starter-playbook | Production-ready starter with NativeWind, Reusables, Expo Router, Supabase |
| munim-maps | munimtechnologies/munim-maps ⭐27 | MapLibre + MapKit + Google + Mapbox + Cesium via Nitro, 3D animations |
| react-native-arc-ui | arcvlad/react-native-arc-ui | High-performance UI with UI-thread-first motion, Reanimated 4 |
| demos (Animation reference) | enzomanuelmangano/demos ⭐3230 | 3230⭐ Reanimated + Gesture Handler + Skia animations |
| lesingo (VC + Reanimated) | gustavo-em/lesingo | VisionCamera + Nitro + Reanimated + MediaPipe |
| ui-mob-components | taty1977/ui-mob-components | Reusable components, NativeWind + CVA, Design Tokens, Chromatic, Vitest |
| react-native-full-swipe | nahkar/react-native-full-swipe | Full-swipe actions with haptic threshold, undo bar |
| charts (Skia) | ElJijuna/charts | 17 chart types, Victory Native + Skia, animated, accessible |

---

## Week 1 Compatibility Test Results (B.7)

**Status:** IN PROGRESS - Started 2026-10-19

**Test Matrix:** Expo 58 + RN 0.88 + all 6 native modules on Android emulator

| Module | Install | Build | Runtime | Notes |
|--------|---------|-------|---------|-------|
| react-native-sherpa-onnx | ⏳ | ⏳ | ⏳ | STT/TTS/VAD/KWS |
| VisionCamera | ⏳ | ⏳ | ⏳ | OCR label scanning |
| Reanimated 4.7.1 | ✅ | ✅ | ⏳ | Animations |
| @maplibre/maplibre-react-native | ⏳ | ⏳ | ⏳ | Offline maps |
| op-sqlite | ⏳ | ⏳ | ⏳ | Offline sync |
| expo-audio | ✅ | ✅ | ⏳ | Voice playback |

---

## Next Steps

1. **Week 1 Compatibility Test** - Install all 6 critical native modules together and stress test on Android emulator
2. Update this ADR with actual working versions after spike
3. Lock all versions in `pnpm-lock.yaml` and `uv.lock` with hashes

---

**Note:** All versions marked ⏳ need verification from official sources before installation. Versions marked 🔴/🟡/🟢 indicate compatibility risk level for the Week 1 test.

**Compliance Changes Applied:**
- Redis → Valkey 8 (OSI-approved, Redis ≥ 7.4 license issue)
- NativeWind → Unistyles 3 (R9: single styling engine, NativeWind forbidden)
- Supabase Auth → Better Auth (R3: Supabase forbidden)
- munim-maps → @maplibre/maplibre-react-native v11 (R10: use confirmed version 11.3.7)
- .gitignore updated with .turbo/, .expo/, dist/, node_modules/
- .turbo/cache removed from git history