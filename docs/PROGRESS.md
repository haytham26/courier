# Progress Tracker - Courier Copilot

| Step ID | Status | Branch/PR | Tests (pass/total, backtest 50/50) | Blocker | Next |
|---------|--------|-----------|-----------------------------------|---------|------|
| 0-E-session-start | done | chore/0.00-read-docs | 6/6 passed | - | Initialize repo, install agent-skills, read all docs |
| 0.1-repo-setup | done | feat/0.01-repo-setup | 6/6 passed | - | Monorepo structure, pnpm, Turbo |
| 0.2-versions-adrs | done | chore/0.00-read-docs | - | - | Lock versions, create ADR-001 |
| 0.3-docker-infra | done | feat/0.03-docker-infra | - | - | Docker compose with Postgres, Valhalla, LiveKit, Valkey |
| 0.4-local-secrets | done | feat/0.04-secrets | - | - | .env.local, check-secrets, push-secrets scripts |
| 0.5-ci-pipeline | done | feat/0.05-ci | - | - | GitHub Actions with review-gate, backtest 50x |
| A.1-monorepo-migration | done | - | - | - | Move existing code to apps/api |
| A.2-shared-packages | done | - | 62/62 passed, backtest 50/50 | - | packages/shared, nz-address, design-tokens - BACKTEST COMPLETE |
| A.3-auth-better-auth | doing | - | 0/0 passed | Better Auth migration needed + tests | Replace Supabase Auth with Better Auth, add tests |
| A.4-openapi-spec | done | - | - | - | OpenSpec for all APIs (openspec/api.yaml) |
| B.1-expo-app | doing | - | 0/0 passed | Needs tests | Create Expo app with template, add tests |
| B.2-design-system | doing | - | 19/19 passed | Unistyles migration needed | Migrate NativeWind to Unistyles 3, add tests |
| B.3-navigation | doing | - | 5/5 passed | Tests added | Expo Router, 4 tab screens complete, tests done |
| B.4-voice-module | todo | - | - | Wait for B.7 compat test | Fix TS errors, Sherpa-onnx, Pipecat, earbud protocol |
| B.5-maps-module | todo | - | - | Wait for B.7 compat test | MapLibre v11, PMTiles, offline |
| B.6-sync-engine | todo | - | - | Wait for B.7 compat test | op-sqlite, event sourcing |
| B.7-compat-test | doing | - | Prebuild 6/6 PASS | Emulator runtime test pending | Run on Android emulator, stress test |
| C.1-linz-import | todo | - | - | - | LINZ addresses loader |
| C.2-address-correction | todo | - | - | - | NZ address correction engine |
| C.3-map-builder | todo | - | - | - | Canterbury PMTiles builder |
| C.4-routing-engine | todo | - | - | - | Valhalla + VROOM + OR-Tools |
| C.5-door-memory | todo | - | - | - | 3-point door memory with EWMA |
| D.1-dictation-mode | todo | - | - | - | Voice dictation with corrections |
| D.2-live-voice-agent | todo | - | - | - | Pipecat + cascade, all languages |
| D.3-voice-commands | todo | - | - | - | All tools voice-accessible |
| D.4-driving-mode | todo | - | - | - | Geofences, whispers, navigation |
| E.1-web-dashboard | todo | - | - | - | Next.js driver dashboard |
| E.2-admin-panel | todo | - | - | - | Internal admin |
| E.3-billing-stripe | todo | - | - | - | Stripe subscriptions NZD |
| E.4-team-features | todo | - | - | - | Franchise/team management |
| F.1-ocr-label-scan | todo | - | - | - | VisionCamera + ML Kit OCR |
| F.2-pod-photos | todo | - | - | - | Proof of delivery photos |
| F.3-sms-notifications | todo | - | - | - | Optional SMS tracking |
| F.4-ird-logbook | todo | - | - | - | PDF logbook generation |
| F.5-ferrostar-flag | todo | - | - | - | Turn-by-turn behind flag |
| G.1-pia-privacy | todo | - | - | - | Privacy Impact Assessment |
| G.2-store-assets | todo | - | - | - | App Store / Play Console assets |
| G.3-acceptance-test | todo | - | - | - | Acceptance test on emulator + device |
| G.4-handover | todo | - | - | - | HANDOVER.md, APK, emulator setup |

---

**Session Started:** 2026-10-19 00:53:00 +13:00
**Last Updated:** 2026-10-19 06:10:00 +13:00
**Current Phase:** Phase B - Expo App Creation & Design System (B.7-compat-test in progress - prebuild PASS, emulator test next)
**Repository:** haytham26/courier (feat/0.01-repo-setup branch)
**Notes:** 
- Compliance fixes applied: .gitignore updated, Valkey replaces Redis, MapLibre v11 replaces munim-maps, Unistyles 3 replaces NativeWind, Better Auth replaces Supabase Auth
- Backtest 50x: 50/50 iterations PASSED on shared packages (packages/shared 26 tests x 50, nz-address 17 tests x 50, design-tokens 19 tests x 50) - COMPLETE
- B.7 compatibility test: All 6 native modules install PASS, prebuild PASS. Runtime test requires Android emulator.
- B.3 navigation tests added (5 tests passing)
- Need to merge feat/0.01-repo-setup to main after CI passes, then branch per step
- Next: Start Android emulator and run `npx expo run:android` for runtime test