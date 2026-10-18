# Research 2026 — repos and projects per area

> 8 area researchers and 1 principal-engineer critic, Oct 2026. ⚠️ means the repo page was not opened in this session. Re-check before installing.

## Final stack

| Layer | Pick | Why | Replaces |
|---|---|---|---|
| mobile | Expo SDK 57 (New Architecture, Hermes V1) with Expo Router Native Tabs/stack and inline native modules | SDK 57 fixes the Hermes V1 memory regression that affects Reanimated. Inline modules cover the audio session and earbud media keys. | Older Expo SDK |
| UI | Expo UI (SwiftUI/Compose) + Unistyles 3 design tokens (day/night/sunlight high-contrast); HeroUI Native free core only for forms | Native look like Apple Maps or Uber Driver, no re-renders on the map screen, MIT. Avoids the NativeWind v5 preview and paid Pro tiers. | Ad-hoc styling |
| animation | Reanimated 4 + Gesture Handler; Skia for ETA/voice-level visuals; Rive runtime for assistant states; expo-haptics | Requires the New Architecture, which you already have. Haptics confirm actions so the driver does not need to look at the screen. | nothing |
| maps | @maplibre/maplibre-react-native v11.5 + Canterbury PMTiles built with planetiler/go-pmtiles | Feature-state styling for delivered/pending stops, ANR fixes, a single-file offline pack. | Older MLRN, ad-hoc offline tiles |
| navigation | Ferrostar (behind a feature flag), with a Google/Apple Maps deep-link fallback | Built on Valhalla and MapLibre. The React Native binding is beta, so it stays behind a flag. | Handing off to an external navigation app |
| voice on-device | sherpa-onnx 1.13.x (Moonshine streaming EN ASR, Parakeet-TDT int8 re-score, Silero VAD, KWS for commands, GTCRN enhancement, Kokoro TTS; Pocket TTS on trial) with an in-house RN bridge | Fully offline, permissive licences, and keyword spotting with no wake word. The XDcobra wrapper is too immature to depend on. | Generic sherpa-onnx setup |
| voice agent | On-device closed command grammar + LangGraph dialog; Smart Turn v3 for end of turn; Pipecat only for an optional online conversational mode | The core stays offline. Pipecat and Smart Turn are BSD-2, while the LiveKit turn-detector model has its own licence. | nothing |
| address/geocoding | LINZ NZ Addresses (new 2026 layers) in PostGIS + libpostal + RapidFuzz + pg_trgm/pgvector hybrid; Photon as a fallback for place names | Authoritative CC BY 4.0 data. The confidence threshold decides when the assistant asks the driver. | Deprecated LINZ layers |
| routing/VRP | Valhalla 3.9 + VROOM 1.15 (primary); OR-Tools for rule-heavy templates; PyVRP A/B trial | Proven and permissively licensed. PyVRP may do better on 200+ stop runs with time windows. | nothing |
| local DB+sync | op-sqlite with SQLCipher + custom append-only delivered-event log; PowerSync trial for lists/templates/rules/door points | PowerSync SDK v2 defaults to OP-SQLite, but the service licence is FSL, so the event log stays the fallback. | Part of the custom sync (only if the trial wins) |
| backend/agents | FastAPI + LangGraph (dialog/interrupts) + Pydantic AI for the typed address-correction step | Typed CorrectionResult (said/corrected/confidence) that can be tested. | LangGraph for the single-loop corrector |
| LLM gateway | LiteLLM pinned >=1.83.0 with hash-locked installs (Bifrost on trial) | Versions 1.82.7 and 1.82.8 were compromised on PyPI. If either was ever installed, rotate all secrets. | Unpinned LiteLLM |
| database/hosting | Postgres + PostGIS + pgvector on an AU-region VPS via Coolify, with pgBackRest backups | Close to NZ for latency and data residency, low cost, Apache-2.0. | Unspecified hosting |
| jobs | Hatchet (MIT, Postgres-backed) | Durable LINZ refresh, batch optimisation and rollups. Temporal is more than this project needs. | Ad-hoc cron |
| auth | Better Auth (Expo, Stripe, organization, passkey plugins; JWKS validation in FastAPI) | Self-hosted, so driver PII stays in your Postgres. Clerk would add vendor lock-in. | Unspecified auth |
| billing | Stripe NZD (GST-inclusive display, customer portal, trial) via the Better Auth Stripe plugin | A flat monthly plan is enough. Lago and Polar stay deferred. | nothing |
| web/admin | Next.js + shadcn/ui driver dashboard; Refine ops console; Fumadocs help centre | MIT and fits the FastAPI REST backend. | nothing |
| email/notify | React Email + Resend; Expo push | Simple. Novu is more than this needs. | nothing |
| analytics | PostHog (EU cloud) analytics + flags behind the OpenFeature SDK | One tool covers both. No addresses or GPS in event properties. | Separate flag and analytics tools |
| observability | Sentry SaaS (RN + Python) + OpenTelemetry to Grafana Cloud/LGTM; Langfuse self-hosted for LLM traces | Release health tied to EAS update IDs. PII is scrubbed before anything is sent. | Helicone and others |
| LLM evals | promptfoo in CI on a Canterbury address golden set; DeepEval for pytest-side tests | Accuracy gate on merges. promptfoo is MIT; watch its ownership. | nothing |
| testing | Vitest 4 (TS), Jest only where RN presets need it, Maestro E2E with audio fixtures, Playwright web, pytest + Schemathesis, k6 internal | Covers every layer, including the offline/voice flows. | nothing |
| CI/CD | pnpm + Turborepo monorepo; EAS Workflows (fingerprint-gated OTA vs native, staged rollout); GitHub Actions for backend/web | The GitHub build triggers are deprecated in favour of Workflows. | EAS GitHub build triggers |
| security | Renovate (hosted), gitleaks pre-commit, Semgrep CE, Trivy, SBOM, uv lock with hashes | Supply-chain lesson from the LiteLLM incident. | nothing |
| AI dev tooling | Claude Code + obra/superpowers + OpenSpec + repomix; MCP servers: GitHub, mobile-mcp, Playwright, Postgres (read-only, dev), Stripe (test mode) | Spec-driven, agent-verified QA on simulators. Prompt-to-app builders cannot handle the native modules. | nothing |

## Conflicts

- Styling: Unistyles 3 vs Uniwind/HeroUI Native (built on Uniwind) vs NativeWind. Pick Unistyles. Use HeroUI only if Uniwind is accepted, otherwise use Expo UI forms. Don't run two styling engines.
- Bottom sheet: @gorhom/bottom-sheet vs the Expo UI native sheet. Prefer the native sheet. gorhom's Reanimated 4 compatibility is unconfirmed.
- Sync: PowerSync vs ElectricSQL vs LiveStore vs the custom event log. Run one trial only (PowerSync). The PowerSync service is FSL, which is source-available, not OSI open source.
- Agents: LangGraph vs Pydantic AI overlap. Limit Pydantic AI to the typed corrector.
- LLM gateway: LiteLLM vs Bifrost. Keep one. LiteLLM had a supply-chain compromise (1.82.7/1.82.8).
- Feature flags: PostHog flags vs Unleash (AGPL) vs OpenFeature. Use OpenFeature with PostHog as the provider and drop Unleash.
- Geocoder: Photon vs Pelias. Choose Photon only as a fallback.
- Solvers: VROOM/OR-Tools/PyVRP/Timefold. Drop Timefold (JVM, and Enterprise is commercial).
- Spec tools: OpenSpec vs spec-kit vs BMAD. Use only one (OpenSpec).
- Licence: openWakeWord models CC BY-NC-SA, Moonshine legacy non-English models non-commercial, Piper1 GPL-3.0, TEN VAD extra conditions. Avoid all of these.
- Licence: Fleetbase/Navigator AGPL. Use as design reference only, never copy code.
- Licence: ParadeDB, Lago, OpenPanel, k6, Grafana, Unleash and self-hosted Renovate are AGPL. Internal and unmodified use only, or use SaaS. pg_trgm is used instead of ParadeDB.
- Licence: Sentry server and Dyad pro are FSL; Inngest is SSPL/ELv2; Karrio /ee, Langfuse ee, PostHog ee and HeroUI/Uniwind Pro are commercial. Avoid those parts.
- Licence: LiveKit turn-detector uses the LiveKit Model License. Use Smart Turn instead.
- Licence: OSM data is ODbL. Attribution is required, and share-alike applies to derived databases. LINZ CC BY 4.0 requires attribution.
- ToS: Google Maps nav data/deep links have commercial limits. Don't store or display Google route data. Deep link only.
- ToS: Don't use 'free Claude/GPT' proxy repos or shared API keys.
- Privacy: NZ Privacy Act 2020. Never put addresses or GPS in PostHog, Sentry or Langfuse without redaction.
- Road law: NZ mobile-phone rules mean the voice/earbud UX must not depend on touches while driving.
- Ferrostar is pre-1.0 with a beta RN binding. Breaking changes are likely, so pin the version.

## Re-checked

- No new live web fetch in this consolidation step. The checks below re-assess researcher evidence and downgrade where it is weak.
- LiteLLM: risky (confirmed compromise 2026-03-24). Kept only if pinned to >=1.83.0 with hashes; Bifrost on trial as an exit.
- PowerSync: downgraded from replacing sync to trial (FSL service, 394 stars, release date unconfirmed).
- react-native-sherpa-onnx (XDcobra): 40 stars, alpha. Not adopted; build the in-house bridge.
- Ferrostar: RN beta since 0.56. Kept at trial behind a flag, not adopt.
- Pocket TTS: young (2026), with community mobile ports. Trial only; Kokoro via sherpa-onnx is the default.
- Smart Turn v3.2: 2026 release. Trial, not adopt.
- HeroUI Native: v1.0 in March 2026 (under 6 months of stable releases). Trial only.
- Reanimated 4: unverified repo. Kept adopt because the Expo SDK 57 changelog cites it; pin SDK 57+.
- Unistyles 3: repo not opened. Kept adopt (MIT, widely used); check Expo 57 compatibility in a spike.
- op-sqlite, Turborepo, OpenFeature, Sentry SDKs, Playwright, RapidFuzz: unverified dates but mature, low-risk projects. Kept adopt.
- LINZ: March 2026 layer deprecation. Migration check of the import layer IDs is required before MVP.
- PMTiles in MapLibre Native RN: unconfirmed. Spike it; fall back to MBTiles.
- promptfoo: acquired by OpenAI in 2026. Kept adopt (MIT), with DeepEval as the alternative.
- Pydantic AI 2.0: unconfirmed. Pin 1.x until verified.
- Expo SDK 58 status: unconfirmed. Target 57.

## Feature backlog

| Feature | Phase | Source |
|---|---|---|
| Silent bulk dictation (streaming ASR + VAD/Smart Turn segmentation, no TTS until the list ends) | MVP | core/voice |
| LINZ auto-correction pipeline (libpostal, then RapidFuzz/trigram/vector match, then a confidence threshold) with 'you said X, corrected to Y' read-back; ask only when doubtful | MVP | core/maps |
| Second-pass Parakeet re-scoring with LINZ street-name hotword biasing | MVP | voice |
| Speech enhancement for van noise (GTCRN) | MVP | voice |
| Keyword-spotting commands: delivered / next / undo / repeat, with no wake word | MVP | voice |
| Earbud media-button mapping and lock-screen controls (native MediaSession/MPRemoteCommandCenter) | MVP | voice |
| Delivered by voice/earbud/screen with haptic and audio confirmation, plus undo | MVP | core/UI |
| Saved daily lists with ETA and history; multiple route templates and driver rules managed by voice | MVP | core |
| Stop ordering with VROOM over the Valhalla matrix | MVP | routing |
| Offline Canterbury PMTiles map with delivered/pending feature-state styling | MVP | maps |
| Learned door points that override LINZ points | MVP | core |
| Dash-mount UI: 64pt+ targets, Dynamic Type, day/night/sunlight themes, automatic dark mode by time of day | MVP | UI/gap |
| Animated assistant states: listening, thinking, corrected, needs-answer | MVP | UI |
| VoiceOver/TalkBack labels and reduced motion | MVP | UI |
| Offline-first sync with an append-only delivered log and SQLCipher encryption | MVP | backend |
| Better Auth accounts, Stripe NZD subscription with GST display, trial and customer portal | MVP | SaaS |
| Privacy policy, data export/delete (NZ Privacy Act IPP 3/6/7) | MVP | SaaS |
| External navigation deep-link handoff | MVP | gap |
| In-app turn-by-turn (Ferrostar) with spoken arrival and a 'delivered' hook | Phase2 | maps/gap |
| Proof of delivery: photo, signature, barcode/QR, geotag | Phase2 | gap |
| Recipient ETA SMS and live tracking link | Phase2 | gap |
| End-of-day report: mileage, stops, failures, time; IRD/GST export | Phase2 | gap |
| Spoken hazard and map-correction reports (wrong pin, blocked access) feeding door points | Phase2 | gap |
| Live traffic and incident alerts on the route | Phase2 | gap |
| Satellite/aerial layer to check door points | Phase2 | gap |
| Entitlements (template count, stops per day) and feature flags for model rollout | Phase2 | SaaS |
| Transactional emails (welcome, receipt, weekly stats) and a help centre with a voice-command reference | Phase2 | SaaS |
| Admin console with an address-correction review queue and LINZ mismatch reports | Phase2 | SaaS |
| PyVRP vs VROOM A/B; vehicle type and capacity constraints | Phase2 | routing/gap |
| Support widget/WhatsApp channel | Phase2 | SaaS |
| Optional online conversational mode (Pipecat) with barge-in | Later | voice |
| Natural-language questions over the driver's own history | Later | gap |
| Chat/notes with the depot, issue and fuel logs | Later | gap |
| Fleet tier: multi-driver orgs, live locations (Traccar-style) | Later | gap |
| te reo Māori and Arabic (RTL) localisation | Later | UI |
| Manifest import from NZ Post/couriers (Karrio) | Later | gap |
| Merchant-of-record/usage billing if selling outside NZ | Later | SaaS |

## Dev practices

- pnpm + Turborepo monorepo (apps/mobile, apps/web, services/api, packages/shared) with CODEOWNERS and a PR template
- Spec-first: an OpenSpec change folder per feature; ADR/RFC templates in docs/
- Trunk-based development, short-lived branches, required checks, squash merges, Changesets release notes
- CI gates: typecheck, lint, Vitest/pytest, Schemathesis contract tests, a promptfoo accuracy threshold on the Canterbury golden address set
- Maestro E2E of the hands-free flow with recorded audio fixtures; offline/sync chaos tests (airplane mode, conflict replay)
- EAS Workflows: PR preview builds, fingerprint-gated OTA vs native, staged rollouts, a rollback runbook tied to Sentry release health
- Feature flags through OpenFeature for the voice model, correction prompt and routing engine; dark launches
- Supply chain: hash-locked uv/pnpm lockfiles, Renovate grouped upgrades, gitleaks pre-commit, Semgrep, Trivy, SBOM, a licence allowlist check (block AGPL/GPL/NC in shipped code)
- Observability from day one: Sentry, OTel traces, Langfuse; SLOs for correction latency, sync lag and crash-free sessions
- Privacy by design: PII redaction in all telemetry, data minimisation, encryption at rest on device, documented retention
- Secrets in a manager with least-privilege keys; agents get a read-only DB and test-mode Stripe only
- CLAUDE.md per package, project skills (LINZ fixtures, dev-build loop, Valhalla tiles), an AI review agent on PRs with human approval required
- Blameless postmortems and weekly dependency/security triage
- k6 load test of the morning peak before each major release

## Mobile app foundation, UI, design systems, animation (2026)

**Recommendation:** Stay on Expo but move to the current SDK (56/57; SDK 55 removed the old Legacy Architecture, 56 made Hermes V1 the default and made Expo UI stable). For a polished native look like Apple Maps or Uber Driver, build the main screens from native parts: Expo UI (SwiftUI and Jetpack Compose), Expo Router Native Tabs, and native bottom sheets. Use Reanimated 4 with Gesture Handler for motion, and a design-token layer on top. For styling, pick Unistyles 3 (MIT, no re-renders, theme tokens), or Uniwind's free MIT core if the team wants Tailwind. Avoid NativeWind v5 for now (still a preview) and HeroUI Native Pro (paid). Keep @maplibre/maplibre-react-native for the map, op-sqlite and sherpa-onnx as they are. Add Skia only for custom route and ETA visuals, Rive or Lottie for small status animations, expo-haptics for confirming 'delivered', and i18next for Māori and other languages later. Skip 3D (Filament and react-three-fiber on native) for v1. This replaces nothing in the current stack. It adds a UI layer.

| Name | What | Use in project | Licence | Last activity | 2026 | ✓ | Verdict | Notes |
|---|---|---|---|---|---|---|---|---|
| [Expo SDK 56/57 (expo/expo)](https://expo.dev/changelog/sdk-56-beta) | SDK 55 (Feb 2026) made the New Architecture mandatory. SDK 56 made Hermes V1 the default, made Expo UI stable, revamped create-expo-module and added inline modules. SDK 57 docs exist and its changelog describes it as a minor upgrade that also fixes a Hermes V1 memory regression affecting Reanimated and worklets. | The base for the driver app. Inline modules are a simple way to write native audio-session and earbud-button (media key) handling. | MIT | SDK 57 docs dated June 2026 | yes | ✅ | adopt | I could not confirm whether SDK 58 is out (a v58 docs page appeared in search). Check that third-party native libraries support the SDK you pick. |
| [Expo UI (@expo/ui)](https://docs.expo.dev/versions/v57.0.0/sdk/ui/) | Real SwiftUI and Jetpack Compose components that you use from React Native. Stable as of SDK 56 and included in the default template. | Native-feeling settings, route-template lists, context menus, pickers and switches, so the app looks like an Apple or Google system app rather than an 'AI-looking' one. | MIT | 2026 | yes | ✅ | adopt | Some screens will look different on iOS and Android by design. |
| [Expo Router Native Tabs / native stack](https://expo.dev/changelog/sdk-55) | Native tab bar and stack, with new props added in SDK 55. | Main app shell: Run, Lists, History, Settings. | MIT | 2026 | yes | ✅ | adopt |  |
| [React Native Reanimated 4 + Worklets](https://github.com/software-mansion/react-native-reanimated) | Animation engine with CSS-style transitions. Requires the New Architecture. | Bottom sheet over the map, the 'you said X, corrected to Y' card animation, and the delivered checkmark. | MIT | 2026 (Expo SDK 57 fixes a Hermes V1 issue that affected it) |  | ⚠️ | adopt | Version 4 has breaking changes from v3. Repo page not opened. |
| [Unistyles 3](https://github.com/jpudysz/react-native-unistyles) | StyleSheet replacement written in C++, with themes and no re-renders when styles change. | Design-token theming (day/night driving modes, high contrast for sunlight) without slowing down the map screen. | MIT | active 2026 (also the engine behind Uniwind Pro) |  | ⚠️ | adopt | Repo page not opened. |
| [Uniwind](https://github.com/uni-stack/uniwind) | Tailwind v4 for React Native that claims to be 2x faster than NativeWind. The core is MIT and there is a paid Pro tier. | Alternative to Unistyles if the team wants to share Tailwind classes with the Next.js web app. | MIT core; Pro is commercial | v1.9.0 on npm, 2026 | yes | ✅ | trial | Pro needs a paid licence. Stay on the free core. |
| [HeroUI Native](https://heroui.com/en/docs/native/releases) | Open-source component library. v1.0.0 stable in March 2026, v1.0.5 in July 2026 (Expo 57, Dynamic Type support). A create-heroui-native-app CLI came out in June 2026. | Ready-made form fields, popovers and selects for the onboarding and account screens. | MIT (Pro tier is paid) | July 2026 | yes | ✅ | trial | Pro versions are in beta and the docs mirrors disagree on its version. Built on Uniwind. |
| [react-native-reusables](https://github.com/founded-labs/react-native-reusables) | Copy-in components in the style of shadcn/ui, built on rn-primitives. | Components you own and change yourself for the web dashboard and the mobile settings screens. | MIT | unverified |  | ⚠️ | watch | Depends on NativeWind or Uniwind. |
| [NativeWind v5](https://www.nativewind.dev/v5/guides/migrate-from-v4) | Tailwind v4 for React Native. Still a preview as of March 2026. | None for now. | MIT | docs updated Mar 2026 |  | ✅ | watch | Preview tag; not production-ready. |
| [gluestack-ui v4](https://gluestack.io/ui/docs/changelog/v4-alpha-release) | Component library. v4 alpha released January 23, 2026. | Not needed if you use HeroUI Native or Expo UI. | MIT | Jan 2026 | yes | ✅ | watch | Still alpha. |
| [React Native Skia](https://github.com/Shopify/react-native-skia) | Drawing and graphics with the GPU. | Custom ETA and progress rings, the run timeline, and a voice level meter while dictating. | MIT | unverified |  | ⚠️ | trial |  |
| [Rive (rive-react-native)](https://github.com/rive-app/rive-react-native) | Animations driven by state machines. | Listening, processing and confirming states for the assistant (the orb/avatar). | MIT runtime | unverified |  | ⚠️ | trial | The Rive editor is a paid SaaS tool. |
| [lottie-react-native](https://github.com/lottie-react-native/lottie-react-native) | Plays After Effects (Lottie) animations. | Empty states and onboarding. | Apache-2.0 | unverified |  | ⚠️ | watch |  |
| [@gorhom/bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet) | Bottom sheet like the one in Apple Maps. | Next-stop sheet over the map. | MIT | unverified |  | ⚠️ | trial | Check it works with Reanimated 4, or use the native sheet in Expo UI instead. |
| [@maplibre/maplibre-react-native](https://github.com/maplibre/maplibre-react-native) | Native vector maps. | Keep it for the offline Canterbury map. | MIT | unverified |  | ⚠️ | adopt | Keep current. |
| [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) | Haptic feedback (vibration patterns). | Confirm 'delivered' and corrections with a buzz so the driver does not need to look at the screen. | MIT | 2026 |  | ⚠️ | adopt |  |
| [react-i18next / i18next + expo-localization](https://github.com/i18next/react-i18next) | Translation and localisation, including right-to-left languages. | English now, with te reo Māori and Arabic later. | MIT | unverified |  | ⚠️ | adopt |  |
| [react-native-filament / react-three-fiber native](https://github.com/margelo/react-native-filament) | 3D rendering. | None (no 3D needed). | MIT | unverified |  | ⚠️ | avoid | Adds size and complexity with no benefit for this app. |

**Features to add:**
- Design-token system with day, night and high-contrast-in-sunlight themes
- Large touch targets of at least 64pt for driving, and support for system text size (Dynamic Type)
- Haptic and audio confirmation for each voice action
- Animated assistant states: listening, thinking, corrected, needs-answer
- Native tabs and native sheet UI from Expo UI
- VoiceOver/TalkBack labels and reduced-motion support
- Screens built as layouts that can follow app settings, ready for i18n and RTL

**Risks:**
- NativeWind v5 and gluestack v4 are preview/alpha
- HeroUI Native Pro and Uniwind Pro are commercial
- Reanimated 4 had a Hermes V1 memory regression, fixed in SDK 57
- Star counts and last commit dates could not be checked: GitHub access was blocked in this session, so many items have verified=false
- SDK 58 status is unconfirmed

**Sources:** <https://expo.dev/changelog/sdk-55> · <https://expo.dev/changelog/sdk-56-beta> · <https://docs.expo.dev/versions/v57.0.0/sdk/ui/> · <https://heroui.com/en/docs/native/releases> · <https://www.nativewind.dev/v5/guides/migrate-from-v4> · <https://gluestack.io/ui/docs/changelog/v4-alpha-release> · <https://docs.uniwind.dev/pro-version> · <https://cdn.jsdelivr.net/npm/uniwind@1.9.0/readme.md> · <https://reactnativerelay.com/article/react-native-styling-2026-nativewind-unistyles-tamagui-compared>

## Voice assistant and real-time voice AI (on-device STT/TTS/VAD/wake word, voice-agent frameworks, audio session, noise suppression)

**Recommendation:** Keep sherpa-onnx as the on-device engine. It is on v1.13.x with releases from Aug to Sep 2026. Add Moonshine's streaming MIT models (English, low latency) as the main dictation ASR, with a Parakeet-TDT int8 model as the higher-accuracy fallback for re-scoring hard addresses. Make Pocket TTS (Kyutai, MIT, CPU) or Kokoro the voice that reads back "you said X, corrected to Y". Use sherpa-onnx's own VAD and keyword spotting for the "delivered" and "next" commands. Do not use openWakeWord: its pretrained models are CC BY-NC-SA. For the earbud button and lock-screen controls, use react-native-audio-api (Software Mansion, MIT) or a small custom native module for the media session. On the server, use Pipecat (BSD-2) together with the Smart Turn v3 end-of-turn model (BSD-2) only for any optional cloud conversation mode. Choose Pipecat over LiveKit Agents, whose turn-detector model is under a separate LiveKit Model License. For noise suppression, prefer sherpa-onnx's built-in speech enhancement (GTCRN), with DeepFilterNet (MIT/Apache) as a fallback. What this replaces: nothing in the core stack changes. Write the React Native bridge in-house, or fork XDcobra/react-native-sherpa-onnx, which is MIT but only 40 stars and alpha.

| Name | What | Use in project | Licence | Last activity | 2026 | ✓ | Verdict | Notes |
|---|---|---|---|---|---|---|---|---|
| [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) | Offline speech toolkit: streaming ASR, TTS, VAD, keyword spotting, speech enhancement. Runs on Android and iOS. | Core on-device engine for silent dictation of address lists, voice commands ('delivered') through keyword spotting, VAD to segment addresses, and TTS read-back | Apache-2.0 | v1.13.8 released 10 Sep 2026 |  | ✅ | adopt | Very active. Its model zoo includes Moonshine, Parakeet-TDT 0.6b int8, Kokoro and Piper. |
| [Moonshine (moonshine-ai)](https://github.com/moonshine-ai/moonshine) | Low-latency streaming ASR library and models with iOS/Android/WASM support | Primary English streaming dictation model (NZ addresses), with low latency for 200+ utterances | MIT code; models MIT, except legacy non-English non-streaming models (non-commercial Moonshine Community License) | active (666 commits; dates not shown) |  | ✅ | adopt | Use English streaming models only, which avoids the NC-licensed legacy models. |
| [Pocket TTS (Kyutai)](https://github.com/kyutai-labs/pocket-tts) | Small CPU text-to-speech model, about 6x real-time on 2 cores, with community ONNX/WASM ports | Natural voice for confirmations and doubtful-address questions, offline | MIT | active (188 commits; date not shown) | yes | ✅ | trial | Mobile ONNX ports are community-maintained; benchmark on mid-range Android first. Creation date not confirmed. |
| [Kokoro-82M](https://github.com/hexgrad/kokoro) | 82M-parameter TTS, available through sherpa-onnx | Alternative read-back voice via sherpa-onnx TTS | Apache-2.0 (not verified this session) | unknown |  | ⚠️ | trial | Repo page not opened. The sherpa-onnx README confirms an app using Kokoro. |
| [react-native-sherpa-onnx (XDcobra)](https://github.com/XDcobra/react-native-sherpa-onnx) | React Native TurboModule exposing sherpa-onnx streaming STT, TTS, diarization and enhancement | Candidate bridge for the Expo app, or a base to fork | MIT | SDK 0.3.0 bundles sherpa-onnx 1.12.35 | yes | ✅ | trial | Alpha: VAD planned for 0.7.0, no keyword spotting, small community, and it lags behind upstream. Expo config plugin exists only for the download manager. |
| [whisper.rn](https://github.com/mybigday/whisper.rn) | React Native binding for whisper.cpp with Silero VAD and a RealtimeTranscriber that also supports Parakeet | Fallback accurate re-transcription of doubtful addresses | MIT | active (date not shown) |  | ✅ | watch | Whisper is heavier and more prone to hallucination for streaming. Keep it as a second-pass option only. |
| [Smart Turn v3.2](https://github.com/pipecat-ai/smart-turn) | 8MB int8 end-of-turn audio model, about 10-65ms on CPU, 23 languages | Decide when the driver finished an address versus pausing mid-address (ONNX, can run on device) | BSD-2-Clause | v3.2 (2026 per page) | yes | ✅ | trial | Better than plain VAD silence timeouts for long dictation. |
| [Pipecat](https://github.com/pipecat-ai/pipecat) | Python real-time voice-agent framework with an official React Native client SDK | Optional online conversational mode backed by FastAPI/LangGraph via LiteLLM | BSD-2-Clause | active (release date not shown) |  | ✅ | trial | Server-side only; the offline core stays on device. |
| [LiveKit Agents](https://github.com/livekit/agents) | Real-time voice agent framework | Alternative to Pipecat for cloud voice mode | Apache-2.0 framework; turn-detector models under the LiveKit Model License | active |  | ✅ | watch | Separate model licence; review it before using the turn detector commercially. |
| [react-native-audio-api](https://github.com/software-mansion/react-native-audio-api) | Web Audio API for React Native: microphone streaming, recording to file, recording rotation, lock-screen/notification controls | Microphone PCM feed into sherpa-onnx, recording rotation for long runs, lock-screen and notification control | MIT | 0.12.0 latest |  | ✅ | trial | Background audio and earbud media-button (remote command) handling not confirmed; may need a custom MediaSession/MPRemoteCommandCenter module. |
| [DeepFilterNet](https://github.com/Rikorose/DeepFilterNet) | Real-time deep-learning noise suppression | Clean van/road/engine noise before ASR | MIT OR Apache-2.0 | unclear (no dated release shown; 45 open PRs) |  | ✅ | watch | May be slowing down; prefer sherpa-onnx's built-in speech enhancement first. |
| [TEN VAD](https://github.com/ten-framework/ten-vad) | Lightweight VAD with Android/iOS prebuilt libraries | Alternative to Silero VAD for speech segmentation | Apache-2.0 with additional conditions | news up to Nov 2025 |  | ✅ | avoid | Has extra licence conditions (unreviewed). No iOS simulator support. Silero via sherpa-onnx is enough. |
| [Piper (piper1-gpl)](https://github.com/OHF-Voice/piper1-gpl) | Fast local TTS, the successor to rhasspy/piper | Not recommended; use the older MIT Piper voices via sherpa-onnx if needed | GPL-3.0 | maintainers wanted |  | ✅ | avoid | GPL for bundled code in a commercial app; project is looking for maintainers. |
| [openWakeWord](https://github.com/dscripka/openWakeWord) | Wake-word detection | Not recommended; use sherpa-onnx keyword spotting instead | Apache-2.0 code; models CC BY-NC-SA 4.0 | last release v0.6.0 Feb 2024 |  | ✅ | avoid | Pretrained models are non-commercial; effectively stale. |
| [react-native-sherpa-onnx-offline-tts](https://github.com/kislay99/react-native-sherpa-onnx-offline-tts) | Offline TTS-only React Native wrapper (Piper/VITS) | Reference only | unknown | unknown |  | ⚠️ | watch | Found via search only; repo page not opened. |

**Features to add:**
- Silent dictation mode: streaming ASR plus VAD/Smart Turn segmentation, with no TTS until the list ends
- On-device keyword spotting for a closed set of commands (delivered, next, undo, repeat), with no wake word needed
- Earbud media-button mapping (play/pause = delivered, next = skip) via a native MediaSession/MPRemoteCommandCenter module
- Second-pass re-scoring of low-confidence addresses with a larger model (Parakeet) plus a LINZ street-name biasing/hotword list
- Speech enhancement (GTCRN/DeepFilterNet) before ASR for vehicle noise
- Short offline TTS confirmations ('you said X, corrected to Y'), with barge-in to interrupt
- Optional cloud conversational mode through Pipecat when online

**Risks:**
- GitHub API was blocked in this session, so most commit dates and created dates could not be confirmed; dates are taken from page content
- React Native wrappers for sherpa-onnx are immature (40 stars); plan to own the native bridge
- Licence traps: openWakeWord models are CC BY-NC-SA, Piper1 is GPL-3.0, Moonshine legacy non-English models are non-commercial, the LiveKit turn-detector uses its own licence, TEN VAD has extra conditions
- Background microphone use on iOS/Android needs foreground-service/audio-session entitlements and battery testing
- NZ road rules: the voice UX must avoid requiring touches

**Sources:** <https://github.com/k2-fsa/sherpa-onnx> · <https://github.com/k2-fsa/sherpa-onnx/releases> · <https://github.com/moonshine-ai/moonshine> · <https://github.com/kyutai-labs/pocket-tts> · <https://github.com/XDcobra/react-native-sherpa-onnx> · <https://github.com/mybigday/whisper.rn> · <https://github.com/pipecat-ai/pipecat> · <https://github.com/pipecat-ai/smart-turn> · <https://github.com/livekit/agents> · <https://github.com/software-mansion/react-native-audio-api> · <https://github.com/Rikorose/DeepFilterNet> · <https://github.com/ten-framework/ten-vad> · <https://github.com/OHF-Voice/piper1-gpl> · <https://github.com/dscripka/openWakeWord> · <https://github.com/kislay99/react-native-sherpa-onnx-offline-tts>

## Maps, navigation, geocoding, addresses, routing (2026)

**Recommendation:** Keep the current core (MapLibre RN, Valhalla, VROOM, OR-Tools). Add three things. (1) Ferrostar for turn-by-turn on top of Valhalla. Its React Native binding is now beta, so put it behind a feature flag. (2) Run a self-hosted Photon or Pelias geocoder over LINZ NZ Addresses, paired with libpostal and RapidFuzz, for the "you said X, corrected to Y" correction step. (3) Ship a Canterbury PMTiles extract built with planetiler or Protomaps for the offline map. Trial PyVRP as a second solver next to VROOM for runs of 200+ stops with time windows. Watch Timefold, and avoid its non-open Enterprise features. The LINZ dataset change in March 2026 needs a migration check.

| Name | What | Use in project | Licence | Last activity | 2026 | ✓ | Verdict | Notes |
|---|---|---|---|---|---|---|---|---|
| [MapLibre React Native](https://github.com/maplibre/maplibre-react-native) | React Native wrapper for MapLibre Native | Main map. Upgrade to v11.5 (feature state API, useful for delivered and pending stop styling). Includes Android/iOS fixes for ANR deadlocks and crashes. | MIT (not shown on the releases page) | v11.5.0, 2026-10-04 |  | ✅ | adopt |  |
| [Valhalla](https://github.com/valhalla/valhalla) | Routing engine with time and distance matrices and turn-by-turn instructions | Keep it as the routing and matrix backend for VROOM and Ferrostar | MIT | 3.9.1, 2026-10-06 |  | ✅ | adopt |  |
| [Ferrostar](https://github.com/stadiamaps/ferrostar) | Navigation SDK built on Valhalla and MapLibre (Rust core, plus Kotlin, Swift and React Native bindings) | Turn-by-turn guidance in the app with voice guidance, off-route detection and a stop-arrival hook | BSD-3 (not shown on the releases page) | 0.58.0, 13 Oct (2026 inferred) |  | ✅ | trial | React Native support only reached beta in 0.56, so expect API changes |
| [VROOM](https://github.com/VROOM-Project/vroom) | Fast solver for vehicle routing problems | Keep it for ordering stops each day | BSD-2 | v1.15.0, 12 Mar (2026 inferred) |  | ✅ | adopt |  |
| [PyVRP](https://github.com/PyVRP/PyVRP) | State-of-the-art HGS solver for vehicle routing problems in Python | Alternative solver in FastAPI for hard time-window runs; A/B test it against VROOM | MIT | v0.14.1, 16 Oct |  | ✅ | trial |  |
| [Google OR-Tools](https://github.com/google/or-tools) | Optimisation suite | Keep it for constraint-heavy route templates and driver rules | Apache-2.0 | v9.15, 2026-01-12 | yes | ✅ | adopt |  |
| [Photon](https://github.com/komoot/photon) | Typo-tolerant geocoder built on OpenSearch | Self-hosted fuzzy geocoder for autocomplete and correction, loaded with NZ data | Apache-2.0 | 1.3.0, 07 Aug |  | ✅ | trial |  |
| [go-pmtiles / Protomaps](https://github.com/protomaps/go-pmtiles) | Single-file vector tile archives plus the extract CLI | Extract a Canterbury bounding box to a PMTiles file for the offline map | BSD-3 | v1.31.2, 22 Jul |  | ✅ | adopt | Need to confirm MapLibre Native reads PMTiles directly in this RN version; otherwise convert to MBTiles |
| [Timefold Solver](https://github.com/TimefoldAI/timefold-solver) | JVM constraint solver | Only if rules become very complex; it is a JVM service | Apache-2.0 community edition; Enterprise edition is commercial | v2.7.1, 06 Oct |  | ✅ | watch | The 1.x line is reaching end of life |
| [LINZ NZ Addresses (LDS / ArcGIS)](https://data.linz.govt.nz) | Authoritative NZ address points | Ground truth for auto-correction. Load it into PostGIS and pgvector. | CC BY 4.0 | March 2026: older datasets deprecated, replaced by NZ Addresses and NZ Addresses: Roads | yes | ⚠️ | adopt | Check the layer IDs used in the import |
| [Pelias](https://github.com/pelias/pelias) | Modular geocoder that integrates libpostal | Alternative to Photon with structured address parsing | MIT | not verified |  | ⚠️ | watch |  |
| [libpostal](https://github.com/openvenues/libpostal) | Address parser and normaliser | Normalise the street and number from dictated text before matching against LINZ | MIT | not verified; low activity |  | ⚠️ | trial | Large model (about 2GB); run it server-side only |
| [RapidFuzz](https://github.com/rapidfuzz/RapidFuzz) | Fast fuzzy string matching | Score candidates for the 'you said X, corrected to Y' step against the LINZ street list | MIT | not verified |  | ⚠️ | adopt |  |
| [planetiler](https://github.com/onthegomap/planetiler) | Fast OSM to vector tiles builder | Build a custom Canterbury basemap tuned for couriers | Apache-2.0 | not verified |  | ⚠️ | trial |  |
| [OpenFreeMap](https://github.com/hyperknot/openfreemap) | Free hosted OSM tiles | Online fallback tiles for the Next.js web app | MIT (code); data ODbL | not verified |  | ⚠️ | watch |  |
| [GraphHopper](https://github.com/graphhopper/graphhopper) | Routing engine | Not needed while Valhalla is in place | Apache-2.0 | not verified |  | ⚠️ | watch |  |

**Features to add:**
- Address correction pipeline: speech-to-text, then libpostal parse, then RapidFuzz match against LINZ in PostGIS, then a confidence threshold that decides when to ask the driver
- Ferrostar navigation with spoken arrival and an earbud 'delivered' hook
- Offline Canterbury PMTiles pack with delta updates
- Feature-state styling for delivered and pending stops (MLRN 11.5)
- Door-point layer of learned entrances that overrides the LINZ point when routing
- A/B test VROOM against PyVRP on real runs

**Risks:**
- GitHub API access was blocked in this session, so star counts were not collected and some items are unverified
- Ferrostar React Native support is beta
- LINZ deprecated three address datasets in March 2026, so ingest code may point at old layers
- OSM data is ODbL, so attribution and share-alike apply to derived databases
- Timefold Enterprise features are commercial-licensed

**Sources:** <https://github.com/maplibre/maplibre-react-native/releases> · <https://github.com/stadiamaps/ferrostar/releases> · <https://github.com/valhalla/valhalla/releases> · <https://github.com/VROOM-Project/vroom/releases> · <https://github.com/PyVRP/PyVRP/releases> · <https://github.com/google/or-tools/releases> · <https://github.com/komoot/photon/releases> · <https://github.com/protomaps/go-pmtiles/releases> · <https://github.com/TimefoldAI/timefold-solver/releases> · <https://addressfinder.com/nz/blog/linz-nz-address-data-update>

## Backend, data, offline sync, infra (2026)

**Recommendation:** Keep FastAPI + Postgres/PostGIS/pgvector + LangGraph. Keep op-sqlite on the device. Run a trial of PowerSync (JS SDK v2.0 now bundles OP-SQLite) as the replacement for the custom event-log sync, but only for the daily lists, templates, rules and door points. Keep a small append-only log for 'delivered' events. Pydantic AI could replace LangGraph for the narrow address-correction agent if it runs one tool loop and needs typed output. Use Hatchet (MIT) for background jobs such as the LINZ address re-index and route optimisation. LiteLLM had a confirmed PyPI supply-chain compromise on 2026-03-24 (versions 1.82.7 and 1.82.8). Either pin it to 1.83.0 or later with hash-locked installs, or move to Bifrost (Apache-2.0, Go) as the gateway. Deploy on Coolify or Dokploy close to NZ, for example in an AU region. GitHub API access was blocked in this session, so star counts come from repo pages and most release dates could not be confirmed.

| Name | What | Use in project | Licence | Last activity | 2026 | ✓ | Verdict | Notes |
|---|---|---|---|---|---|---|---|---|
| [PowerSync (service + JS SDK v2)](https://github.com/powersync-ja/powersync-service) | Postgres-to-SQLite sync engine. JS SDK v2.0 makes OP-SQLite the default React Native driver. | Replace the custom event-log sync for daily lists, route templates, rules and door points. Uploads still go to FastAPI. | FSL (source-available) for the service; the repo page did not name the licence type; SDKs Apache-2.0 | powersync-js release reported 2026-07-07 by a third-party site (unconfirmed) |  | ✅ | trial | The service licence is source-available (FSL). Self-hosting is allowed, but check the terms. |
| [op-sqlite](https://github.com/OP-Engineering/op-sqlite) | Fast JSI SQLite for React Native, with SQLCipher 4.8 support. | Keep as the on-device store. Turn on SQLCipher for addresses. | MIT | v13/v14 releases (date not confirmed) |  | ⚠️ | adopt |  |
| [Hatchet](https://github.com/hatchet-dev/hatchet) | Durable task queue and workflow engine on Postgres, with a Python SDK. | LINZ address dataset refresh, VROOM batch jobs, ETA recompute, nightly history rollups. | MIT | active (date not shown) |  | ✅ | adopt |  |
| [Pydantic AI](https://github.com/pydantic/pydantic-ai) | Type-safe Python agent framework that supports Temporal durable execution and MCP. | Address-correction agent with a typed CorrectionResult output (said, corrected, confidence). | MIT | v1.85.1 2026-04-22 reported; a 2.0 release in June 2026 is unconfirmed |  | ✅ | trial |  |
| [LangGraph](https://github.com/langchain-ai/langgraph) | Stateful graph agent runtime with checkpointing and interrupts. 1.0 GA in Oct 2025. | Keep for the multi-turn voice dialog with human-in-the-loop interrupts on doubtful addresses. | MIT | active |  | ✅ | adopt | Keep current |
| [LiteLLM](https://github.com/BerriAI/litellm) | LLM proxy and SDK. | Current gateway. Pin to 1.83.0 or later with hash-locked installs, and rotate secrets if 1.82.7 or 1.82.8 was ever installed. | MIT core plus a commercial licence for enterprise features | v1.83.0 released after the compromise |  | ✅ | watch | SECURITY: compromised PyPI releases on 2026-03-24 stole credentials. |
| [Bifrost](https://github.com/maximhq/bifrost) | Go LLM gateway with low overhead. | Possible LiteLLM replacement in front of Claude/OpenAI/Gemini, with failover and budgets. | Apache-2.0 | active (8,289 commits) |  | ✅ | trial |  |
| [ElectricSQL](https://github.com/electric-sql/electric) | Postgres read-path sync (shapes) over HTTP. | Alternative to PowerSync. Writes have to be handled separately. | Apache-2.0 | not verified |  | ⚠️ | watch |  |
| [Zero (Rocicorp)](https://github.com/rocicorp/mono) | Query-driven sync engine. | Fits the web dashboard better than offline-first mobile. | Apache-2.0 | not verified |  | ⚠️ | watch |  |
| [LiveStore](https://github.com/livestorejs/livestore) | Event-sourced SQLite state for React Native and web. | Close to the current event-log design. Could replace the custom sync code. | Apache-2.0 | not verified |  | ⚠️ | watch | Pre-1.0 |
| [Claude Agent SDK (Python)](https://github.com/anthropics/claude-agent-sdk-python) | Anthropic agent harness. | Internal dev and ops agents, not the runtime voice path. | MIT | not verified |  | ⚠️ | watch |  |
| [OpenAI Agents SDK](https://github.com/openai/openai-agents-python) | Lightweight multi-agent SDK. | Only relevant if realtime cloud voice is ever used. | MIT | not verified |  | ⚠️ | watch |  |
| [Mastra](https://github.com/mastra-ai/mastra) | TypeScript agent framework. | Not a fit for a Python backend. Possible use in Next.js web tools. | Apache-2.0 core plus an enterprise licence | not verified |  | ⚠️ | watch |  |
| [ParadeDB pg_search](https://github.com/paradedb/paradedb) | BM25 full-text search inside Postgres. | Fuzzy and lexical matching of dictated street names against LINZ, combined with pgvector. | AGPL-3.0 | not verified |  | ⚠️ | trial | AGPL. pg_trgm is a fallback. |
| [Coolify](https://github.com/coollabsio/coolify) | Self-hosted PaaS. | Deploy FastAPI, Valhalla, VROOM and Postgres on one AU VPS. | Apache-2.0 | not verified |  | ⚠️ | trial |  |
| [Dokploy](https://github.com/Dokploy/dokploy) | Self-hosted PaaS (Docker Swarm). | Alternative to Coolify. | Apache-2.0 with extra terms (check) | not verified |  | ⚠️ | watch |  |
| [Temporal](https://github.com/temporalio/temporal) | Durable workflow engine. | Too much for this project. Hatchet covers the needs. | MIT | not verified |  | ⚠️ | avoid |  |
| [Inngest / Trigger.dev](https://github.com/inngest/inngest) | Event-driven background jobs. | Useful only for Next.js and Stripe webhooks. | SSPL/ELv2 (Inngest server) / Apache-2.0 (Trigger.dev) | not verified |  | ⚠️ | watch | Inngest server licence is source-available |

**Features to add:**
- Hash-pinned Python dependencies (uv lock --require-hashes) and secret rotation runbook after the LiteLLM incident
- SQLCipher encryption of the on-device address DB
- Durable background jobs for LINZ data refresh and route batch optimisation
- Typed agent output schema for address corrections (said / corrected / confidence) with eval tests
- Hybrid BM25 + trigram + vector address matching in Postgres
- Conflict-free sync of templates and rules with an append-only delivered-event log
- Single-VPS self-hosted deploy in an AU region with backups (pgBackRest)

**Risks:**
- LiteLLM PyPI supply-chain compromise (2026-03-24, versions 1.82.7 and 1.82.8)
- PowerSync service FSL and Inngest SSPL/ELv2 licences are source-available, not open source
- ParadeDB is AGPL
- Pydantic AI 2.0 release reports are unconfirmed; check for breaking changes
- GitHub API was blocked in this session, so most release dates and some licences were not checked

**Sources:** <https://github.com/powersync-ja/powersync-service> · <https://github.com/maximhq/bifrost> · <https://github.com/hatchet-dev/hatchet> · <https://github.com/pydantic/pydantic-ai> · <https://github.com/langchain-ai/langgraph> · <https://github.com/BerriAI/litellm> · <https://futuresearch.ai/blog/litellm-pypi-supply-chain-attack/> · <https://www.arthur.ai/column/litellm-supply-chain-attack-pypi-compromise-2026> · <https://releases.powersync.com/announcements/ann_D9ABrUdlhtHaL> · <https://npmjs.com/package/@powersync/op-sqlite> · <https://changelog.langchain.com/announcements/ann_lxOZRCoFw2Qn9>

## SaaS business layer (auth, billing, admin, email, notifications, flags, analytics, support, docs, landing)

**Recommendation:** Keep Next.js web + Stripe NZD for checkout. Add Better Auth (MIT, self-hosted, Expo plugin, Stripe and organization plugins) as the one auth layer for the mobile app and the web dashboard, so drivers' data stays in your own Postgres. Use PostHog (self-hosted or EU cloud) for product analytics, feature flags and session replay instead of adding separate flag and analytics tools. Use React Email + Resend for transactional email and Fumadocs for the help/docs site. Use Refine or shadcn-admin for the internal admin/ops console. Leave out heavy usage-billing engines (Lago AGPL, OpenMeter) until per-stop pricing actually exists; a flat monthly NZD plan in Stripe is enough. Polar or Autumn are optional if you later want merchant-of-record handling for GST or a pricing/entitlements layer. Replaces: nothing core. Adds an auth library (currently unspecified) and an analytics/flags layer.

| Name | What | Use in project | Licence | Last activity | 2026 | ✓ | Verdict | Notes |
|---|---|---|---|---|---|---|---|---|
| [Better Auth](https://github.com/better-auth/better-auth) | TypeScript auth framework with plugins: organizations, 2FA, passkeys, Expo, Stripe subscriptions | Single auth for the Expo app (expo plugin, secure-store sessions) and the Next.js dashboard; Stripe plugin links each driver to a subscription; org plugin for small courier fleets | MIT (from memory, not opened) | pushed 2026-10-18 |  | ✅ | adopt | 879 open issues; active development. FastAPI backend must validate its sessions/JWT through the JWT plugin or JWKS. |
| [PostHog](https://github.com/PostHog/posthog) | Product analytics, feature flags, experiments, session replay, error tracking, LLM observability, MCP | React Native SDK for funnels (onboarding, first route dictated), feature flags to roll out voice-model versions, LLM observability on LiteLLM calls | MIT core, ee/ folder proprietary (from memory) | pushed 2026-10-18 |  | ✅ | adopt | Self-hosting at scale is heavy, so prefer EU cloud. Never send dictated addresses or GPS as event properties (NZ Privacy Act 2020). |
| [React Email (Resend)](https://github.com/resend/react-email) | Build emails as React components | Receipts, trial-ending notices, daily route summary emails sent from Next.js through Resend | MIT (from memory) | pushed 2026-10-18 |  | ✅ | adopt | Resend itself is a paid SaaS |
| [Fumadocs](https://github.com/fuma-nama/fumadocs) | Next.js docs framework (MDX, search) | Help centre: voice-command reference, earbud setup, NZ dash-mount law guidance; can live in the existing Next.js app | MIT (from memory) | pushed 2026-10-18 |  | ✅ | adopt | Only 3 open issues; well maintained |
| [nextjs/saas-starter](https://github.com/nextjs/saas-starter) | Official Next.js + Postgres + Stripe + shadcn starter | Reference for the Stripe checkout, customer portal and webhook flow in the web app | MIT (from memory) | pushed 2026-10-18 |  | ✅ | trial | Minimal and uses its own JWT auth; borrow patterns rather than fork it |
| [Refine](https://github.com/refinedev/refine) | React framework for admin panels and internal tools | Ops console: drivers, subscriptions, address-correction review queue, LINZ mismatch reports | MIT (from memory) | pushed 2026-10-18 |  | ✅ | trial | Has a REST data provider that fits the FastAPI backend |
| [shadcn-admin](https://github.com/satnaing/shadcn-admin) | Admin dashboard UI template (shadcn + Vite) | Lighter alternative to Refine; reuse its layouts in the Next.js driver web dashboard (history, ETAs, templates) | MIT (from memory) | pushed 2026-10-18 |  | ✅ | trial | UI only, no data layer; built with Vite, not Next |
| [ixartz SaaS-Boilerplate](https://github.com/ixartz/SaaS-Boilerplate) | Next.js SaaS boilerplate with multi-tenancy, roles, i18n, landing page and tests | Reference for multi-tenant fleet accounts and landing page structure | MIT (from memory) | pushed 2026-10-18 |  | ✅ | watch | Ties you to Clerk by default |
| [Polar](https://github.com/polarsource/polar) | Open-source billing platform, merchant of record, usage billing | Option to offload GST/international tax as merchant of record if you sell outside NZ | Apache-2.0 (from memory) | pushed 2026-10-18 |  | ✅ | watch | Check NZD payouts and NZ GST handling before committing; Stripe is fine for an NZ-only business |
| [Autumn](https://github.com/useautumn/autumn) | Pricing and entitlements layer on top of Stripe | Feature gating (number of saved route templates, stops per day) without writing your own entitlements code | not verified | pushed 2026-10-18 |  | ✅ | watch | Young project with 354 open issues; licence not checked |
| [Novu](https://github.com/novuhq/novu) | Notification infrastructure (push, email, SMS, in-app inbox) | Multi-channel notices such as a sync failure or plan expiry; probably overkill compared with Expo push + Resend | MIT with enterprise dirs (from memory) | pushed 2026-10-18 |  | ✅ | watch | Repositioned toward agents in 2026 |
| [Chatwoot](https://github.com/chatwoot/chatwoot) | Open-source support desk and chat widget (Intercom alternative) | Support widget on the website, plus WhatsApp/email support for drivers | MIT core plus enterprise folder (from memory) | pushed 2026-10-18 |  | ✅ | trial | Runs on Rails, so it adds another stack to operate |
| [Unleash](https://github.com/Unleash/unleash) | Feature management platform | Only if PostHog flags are not enough | Apache-2.0 (from memory) | pushed 2026-10-17 |  | ✅ | watch | Overlaps with PostHog flags |
| [OpenPanel](https://github.com/Openpanel-dev/openpanel) | Lightweight Mixpanel alternative for web and product analytics | Privacy-light alternative to PostHog | AGPL-3.0 (from memory) - flag | pushed 2026-10-18 |  | ✅ | watch | AGPL: fine if self-hosted unmodified |
| [Lago](https://github.com/getlago/lago) | Usage-based billing and metering | Only if you price per stop or per route | AGPL-3.0 (from memory) - flag | pushed 2026-10-17 |  | ✅ | watch | Heavy to operate |
| [OpenMeter](https://github.com/openmeterio/openmeter) | Metering for AI and API usage | Meter LLM cost per driver alongside LiteLLM spend tracking | Apache-2.0 (from memory) | pushed 2026-10-18 |  | ✅ | watch | Needs Kafka and ClickHouse; LiteLLM budgets may be enough |
| [react-three-fiber](https://github.com/pmndrs/react-three-fiber) | React renderer for Three.js | Optional 3D hero on the landing page (Canterbury map with a route animation) | MIT (from memory) | pushed 2026-10-18 |  | ✅ | watch | Nice to have; watch landing-page performance on mobile |
| [Clerk JS / WorkOS AuthKit](https://github.com/clerk/javascript) | Hosted auth SDKs (Clerk has Expo support; WorkOS adds enterprise SSO) | Alternative to Better Auth if you prefer hosted auth | MIT SDKs, proprietary service | pushed 2026-10-16 (Clerk), 2026-10-15 (authkit-nextjs) |  | ✅ | avoid | Vendor lock-in and per-user cost; driver PII would sit offshore |
| [ShipGenAI](https://github.com/benlamiro/ShipGenAI) | Repo created in 2026 that bundles 50 generative-AI SaaS templates | None | claims MIT | created 2026-06-24, pushed 2026-10-17 | yes | ✅ | avoid | Low-signal template farm; the only 2026-created SaaS boilerplate over 200 stars that the search found |

**Features to add:**
- Unified auth (Better Auth) across Expo and the web, with passkeys and offline-tolerant long sessions
- Stripe customer portal, NZD pricing with GST-inclusive display, free trial
- Entitlements: number of templates, stops per day, learned door points
- Feature flags to stage rollouts of the voice/ASR model and the address corrector
- Privacy-safe product analytics (no addresses or GPS in events), plus LLM cost per driver
- Transactional emails: welcome, receipt, weekly route stats
- Help centre with a voice-command reference (Fumadocs)
- Admin console with an address-correction review queue
- Support widget/WhatsApp channel
- Privacy policy and data export/delete flows (NZ Privacy Act 2020, IPP 3/6/7)

**Risks:**
- The GitHub REST API was blocked, so licences come from memory (marked 'from memory') and were not checked on the repo pages; stars and dates come from GitHub search metadata
- AGPL licences: Lago, OpenPanel
- Analytics could leak dictated addresses or locations (privacy)
- Hosted auth/support vendors store NZ driver PII offshore
- Very few well-starred SaaS starters were created in 2026; most active tools are older repos still being developed in 2026

**Sources:** <https://github.com/better-auth/better-auth> · <https://github.com/PostHog/posthog> · <https://github.com/resend/react-email> · <https://github.com/fuma-nama/fumadocs> · <https://github.com/nextjs/saas-starter> · <https://github.com/refinedev/refine> · <https://github.com/satnaing/shadcn-admin> · <https://github.com/ixartz/SaaS-Boilerplate> · <https://github.com/polarsource/polar> · <https://github.com/useautumn/autumn> · <https://github.com/novuhq/novu> · <https://github.com/chatwoot/chatwoot> · <https://github.com/Unleash/unleash> · <https://github.com/Openpanel-dev/openpanel> · <https://github.com/getlago/lago>

## Engineering quality like big companies (2026): monorepo, CI/CD, testing, observability, LLM evals, security, release management

**Recommendation:** Recommended picks: use a pnpm + Turborepo monorepo (keep it simple and skip Nx). Move mobile CI/CD to EAS Workflows, which absorbed custom builds in February 2026 and deprecated the GitHub build triggers, with GitHub Actions only for the backend and web. Use Fastlane only if EAS Submit ever falls short. Testing: Vitest 4 for TypeScript packages and web (Jest stays only where React Native presets need it), Maestro for end-to-end tests of the dash-mounted voice flows (simpler than Detox), Playwright for the Next.js and Stripe flows, and pytest plus Schemathesis for FastAPI contract tests. Observability: Sentry (React Native and Python) plus OpenTelemetry into a Grafana stack. Run Langfuse self-hosted (MIT core) for LangGraph and LiteLLM traces; it replaces Helicone. LLM evals: promptfoo in CI on a golden set of Canterbury address-correction cases (watch the 2026 OpenAI ownership), with DeepEval as a pytest-native alternative. Security: Renovate, gitleaks pre-commit, Semgrep CE and Trivy for containers. Load testing: k6 run internally (AGPL is fine for internal-only use). Feature flags: OpenFeature SDK with a self-hosted provider; Unleash is AGPL, so keep it unmodified and server-side. Adopt Changesets plus ADR/RFC templates in /docs. Overall: keep the current stack and add the quality layer above.

| Name | What | Use in project | Licence | Last activity | 2026 | ✓ | Verdict | Notes |
|---|---|---|---|---|---|---|---|---|
| [EAS Workflows (expo)](https://expo.dev/blog/automate-mobile-ci-cd-with-eas-workflows-and-custom-builds) | Expo-native CI/CD in YAML (.eas/workflows): builds, tests, submit, OTA updates; custom builds merged into Workflows in Feb 2026; Expo MCP server can drive builds (Feb 2026) | PR preview builds plus fingerprint-gated OTA vs native builds for the driver app; Maestro job before store submit | Proprietary SaaS (eas-cli MIT) | 2026 changelog posts Feb-Jul 2026 | yes | ✅ | adopt | GitHub build triggers deprecated in favour of Workflows |
| [Maestro](https://github.com/mobile-dev-inc/Maestro) | YAML mobile end-to-end UI testing framework | E2E flows: start run, mark delivered by button, offline map, template switching; run on EAS Workflows | Apache-2.0 | active (release date not shown on page) |  | ✅ | adopt |  |
| [Langfuse](https://github.com/langfuse/langfuse) | Open-source LLM tracing, prompt management, evals | Trace LangGraph address-correction agent and LiteLLM calls; datasets of doubtful addresses; self-host in NZ/AU region | MIT except ee folders | active |  | ✅ | adopt | Prefer over Helicone; avoid ee features unless licensed |
| [promptfoo](https://github.com/promptfoo/promptfoo) | LLM eval and red-teaming CLI for CI | Regression suite: 'you said X, corrected to Y' accuracy on LINZ golden set, gate PRs | MIT | active | yes | ✅ | adopt | Now part of OpenAI (2026); still MIT, but watch the vendor-neutrality risk |
| [DeepEval](https://github.com/confident-ai/deepeval) | Pytest-style LLM evaluation framework | Python-side eval tests next to FastAPI/LangGraph code | Apache-2.0 | active |  | ✅ | trial | Cloud features upsell to Confident AI |
| [Vitest 4](https://voidzero.dev/posts/announcing-vitest-4) | Fast TS test runner; 4.0 stable browser mode + visual regression; 4.1 (Mar 2026) tags, agent reporter | Unit tests for shared packages (address parser, sync event log), web app, visual regression for Next.js | MIT | v4.1.9 June 2026 (secondary source) | yes | ✅ | adopt |  |
| [Grafana k6](https://github.com/grafana/k6) | Load testing tool in JS | Load test sync endpoint and Valhalla/VROOM optimisation at 6am peak | AGPL-3.0 | active |  | ✅ | adopt | AGPL: fine as internal tool, do not embed/distribute |
| [Unleash](https://github.com/Unleash/unleash) | Self-hosted feature flags | Gradual rollout of new correction model / voice engine per driver | AGPL-3.0 | active |  | ✅ | trial | AGPL; pair with OpenFeature SDK to stay swappable |
| [OpenFeature](https://github.com/open-feature/js-sdk) | CNCF vendor-neutral feature flag API | Flag abstraction in RN, Next.js and Python | Apache-2.0 | not verified |  | ⚠️ | adopt |  |
| [Turborepo](https://github.com/vercel/turborepo) | Monorepo task runner/cache | apps/mobile, apps/web, packages/shared with pnpm workspaces | MIT | not verified this session |  | ⚠️ | adopt | Nx is the heavier alternative; not needed for a solo team |
| [Sentry (sentry-react-native, sentry-python)](https://github.com/getsentry/sentry-react-native) | Crash/error tracking, performance, session replay | Crash + ANR on driver phones, FastAPI errors, release health tied to EAS updates | MIT (SDKs); server is FSL | not verified |  | ⚠️ | adopt | Self-hosted server is FSL, so use SaaS |
| [OpenTelemetry + Grafana (LGTM)](https://github.com/open-telemetry/opentelemetry-python) | Vendor-neutral traces/metrics/logs | Instrument FastAPI, Postgres, Valhalla latency | Apache-2.0 (Grafana components AGPL) | not verified |  | ⚠️ | adopt |  |
| [Schemathesis](https://github.com/schemathesis/schemathesis) | Property-based API/contract testing from OpenAPI | Fuzz FastAPI OpenAPI in CI, protect mobile client contract | MIT | not verified |  | ⚠️ | trial |  |
| [Playwright](https://github.com/microsoft/playwright) | Web E2E testing | Next.js signup + Stripe NZD checkout tests | Apache-2.0 | not verified |  | ⚠️ | adopt |  |
| [Renovate](https://github.com/renovatebot/renovate) | Automated dependency updates | Grouped Expo SDK / RN upgrades, pip and Docker | AGPL-3.0 (use hosted app) | not verified |  | ⚠️ | adopt |  |
| [Semgrep CE + gitleaks + Trivy](https://github.com/semgrep/semgrep) | SAST, secret scanning, container/IaC scanning | GitHub Actions security job on every PR | LGPL-2.1 / MIT / Apache-2.0 | not verified |  | ⚠️ | adopt | Semgrep rules licence restricts some commercial use of the registry rules |
| [Detox](https://github.com/wix/Detox) | Gray-box RN E2E | Only if Maestro cannot cover native module timing (sherpa-onnx) | MIT | not verified |  | ⚠️ | watch |  |
| [Changesets](https://github.com/changesets/changesets) | Versioning/changelog for monorepos | Release notes for shared packages and app versions | MIT | not verified |  | ⚠️ | trial |  |

**Features to add:**
- Golden dataset of real Canterbury address dictations with LINZ ground truth, evaluated in CI (promptfoo/DeepEval) with an accuracy threshold that gates merges
- EAS Workflows: PR preview builds, fingerprint-based OTA vs native decision, staged rollout
- Maestro E2E suite for the hands-free voice flow using recorded audio fixtures
- Offline/sync chaos tests for the op-sqlite event log (airplane mode, conflict replay)
- Sentry release health linked to EAS update IDs plus a rollback runbook
- Feature flags through OpenFeature for the voice model, correction prompts and routing engine
- k6 load test of the morning peak (all drivers optimising at once)
- Security CI: gitleaks pre-commit, Semgrep, Trivy, Renovate, SBOM
- docs/adr and docs/rfc templates, PR template, CODEOWNERS, SLOs (correction latency, sync lag)
- Privacy: scrub addresses and PII from traces in Langfuse and Sentry (NZ Privacy Act)

**Risks:**
- k6, Unleash, Renovate self-hosted and Grafana are AGPL: use them internally only, unmodified, or use the SaaS versions
- Sentry server is FSL (source-available): use the SaaS
- promptfoo was acquired by OpenAI in 2026: neutrality and roadmap risk, though it remains MIT
- Langfuse ee folders are commercially licensed
- Many items have verified=false because the GitHub API was blocked in this session and the fetched pages did not show release dates
- Traces may contain customer addresses (PII): redact them before sending to third-party observability tools

**Sources:** <https://expo.dev/blog/automate-mobile-ci-cd-with-eas-workflows-and-custom-builds> · <https://expo.dev/changelog/mcp-build-and-workflows.md> · <https://voidzero.dev/posts/announcing-vitest-4> · <https://releases.sh/vitest/vitest.md> · <https://github.com/mobile-dev-inc/Maestro> · <https://github.com/promptfoo/promptfoo> · <https://github.com/langfuse/langfuse> · <https://github.com/grafana/k6> · <https://github.com/confident-ai/deepeval> · <https://github.com/Unleash/unleash>

## AI development environment (2026)

**Recommendation:** Use Claude Code with these: obra/superpowers for the workflow (plan, then subagents, then review), OpenSpec specs per feature, and repomix to pack context for the FastAPI and LangGraph services. Add three MCP servers: GitHub, mobile-mcp (to drive an iOS/Android simulator and check voice and map screens) and Playwright (Next.js and Stripe web). Postgres MCP should be read-only, and Stripe MCP should use test mode only. Don't use prompt-to-app builders (Dyad, bolt.diy) for the mobile app. Your stack depends on native modules (sherpa-onnx, op-sqlite, MapLibre), which those tools can't generate reliably. Keep current: Expo/RN, FastAPI and LangGraph all stay. This replaces nothing in the runtime stack and only adds dev tooling. Note: the GitHub API was blocked in this session, so stars and licences come from GitHub web pages. Release dates could not be read. Items not opened are marked verified=false.

| Name | What | Use in project | Licence | Last activity | 2026 | ✓ | Verdict | Notes |
|---|---|---|---|---|---|---|---|---|
| [obra/superpowers](https://github.com/obra/superpowers) | Agentic skills framework and development method: brainstorm, plan, subagent-driven implementation, review. Works with Claude Code, Codex, Cursor and Gemini CLI. | Default workflow for every feature (voice capture, LINZ correction, delivered-by-voice), with TDD and code-review skills enforced | MIT | unknown (page showed no date) |  | ✅ | adopt |  |
| [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) | Lightweight spec-driven development: one folder per change with proposal, specs, design and tasks. Supports 30+ assistants. | A spec per feature (route templates, driver rules, door points, offline map) kept in the repo, so agents work from agreed behaviour | MIT | unknown |  | ✅ | adopt |  |
| [github/spec-kit](https://github.com/github/spec-kit) | GitHub's spec-driven development toolkit (specify, plan, tasks, implement) | Heavier alternative to OpenSpec. Use one of the two, not both. | MIT | unknown |  | ✅ | trial |  |
| [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | Multi-persona agile agent method (analyst, PM, architect, developer, QA). v6.12 is stable; v7 is in preview alpha. | Optional for producing the PRD and architecture documents for the SaaS business side. Too much process for a solo builder. | MIT | 2026 (v7 alpha, ETA Oct 2026) |  | ✅ | watch | v7 is alpha, so it is unstable |
| [anthropics/skills](https://github.com/anthropics/skills) | Official Agent Skills examples, the skills spec, a template, and a plugin marketplace | Template for project skills (e.g. 'linz-address-fixtures', 'expo-dev-build', 'valhalla-tiles'). Plus mcp-builder and webapp-testing. | Apache-2.0 for most skills. The document skills are source-available, not open source. | unknown |  | ✅ | adopt | Don't redistribute the docx/pdf/pptx/xlsx skills |
| [yamadashy/repomix](https://github.com/yamadashy/repomix) | Packs a repo into one AI-friendly file, with token counts, compression and an MCP mode | Pack the backend/ or mobile/ subtree for reviews and for cross-model second opinions through LiteLLM | MIT | active (4.6k commits) |  | ✅ | adopt |  |
| [mobile-next/mobile-mcp](https://github.com/mobile-next/mobile-mcp) | MCP server to drive iOS and Android simulators and real devices | Lets the agent tap through the dev build, screenshot the map and delivered flow, and check dash-mount-sized touch targets | Apache-2.0 | unknown |  | ✅ | adopt |  |
| [Expo MCP Server (EAS)](https://docs.expo.dev/eas/ai/mcp/) | Official Expo MCP: docs, EAS builds and dev-tool automation | EAS build and update status, Expo SDK docs lookup | proprietary service | unknown |  | ⚠️ | trial | The docs page couldn't be opened from this session. Check the plan requirements. |
| [github/github-mcp-server](https://github.com/github/github-mcp-server) | Official GitHub MCP server | Issues, PRs and Actions for haytham26/courier | MIT (not re-checked) | unknown |  | ⚠️ | adopt |  |
| [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | Browser automation MCP | E2E checks of the Next.js dashboard and Stripe NZD checkout in test mode | Apache-2.0 (not re-checked) | unknown |  | ⚠️ | adopt |  |
| [stripe/agent-toolkit (Stripe MCP)](https://github.com/stripe/agent-toolkit) | Official Stripe MCP and agent tools | Create NZD prices and products and inspect test subscriptions | MIT (not re-checked) | unknown |  | ⚠️ | trial | Restricted test-mode key only |
| [getsentry/sentry-mcp](https://github.com/getsentry/sentry-mcp) | Official Sentry MCP | Triage RN crashes and FastAPI errors from inside Claude Code | unknown | unknown |  | ⚠️ | trial |  |
| [crystaldba/postgres-mcp](https://github.com/crystaldba/postgres-mcp) | Postgres MCP with index and health analysis | Tune PostGIS and pgvector queries against a dev replica, in read-only mode | MIT (not re-checked) | unknown |  | ⚠️ | trial | Never connect it to the production database with write access |
| [dyad-sh/dyad](https://github.com/dyad-sh/dyad) | Local, open prompt-to-app builder | At most for throwaway web marketing prototypes. It does not target Expo or RN native modules. | Apache-2.0, plus FSL-1.1 (fair-source) for src/pro | unknown |  | ✅ | avoid | Mixed licence (FSL part) |
| [stackblitz-labs/bolt.diy](https://github.com/stackblitz-labs/bolt.diy) | Open-source bolt.new fork for web apps | Not suitable. It runs in WebContainers in the browser, so no native RN. | MIT (not re-checked) | unknown |  | ⚠️ | avoid |  |

**Features to add:**
- CLAUDE.md files for each package (mobile, backend, web), with build and test commands
- Project skills: LINZ address fixtures, Expo dev-build loop, Valhalla tile rebuild
- An OpenSpec change folder for every feature
- Agent-driven simulator QA through mobile-mcp, with screenshots saved to the PR
- Read-only database and test-mode Stripe credentials just for agents
- A CI review agent on every PR (GitHub Action)

**Risks:**
- Avoid 'free Claude/GPT' proxy repos and tools that reuse leaked or shared API keys or scrape subscriptions. They break provider terms of service.
- An MCP server with write access to production Postgres or live Stripe could do real damage
- Third-party MCP servers and skills can inject prompts. Pin versions and review them before installing.
- Dyad's src/pro is FSL-licensed, and the Anthropic document skills are source-available
- BMAD v7 is alpha
- Prompt-to-app builders give a false sense of progress on a native-heavy RN app

**Sources:** <https://github.com/obra/superpowers> · <https://github.com/Fission-AI/OpenSpec> · <https://github.com/github/spec-kit> · <https://github.com/bmad-code-org/BMAD-METHOD> · <https://github.com/anthropics/skills> · <https://github.com/yamadashy/repomix> · <https://github.com/mobile-next/mobile-mcp> · <https://github.com/dyad-sh/dyad>

## Feature gap analysis 2026: delivery and driver apps compared with Courier Copilot

**Recommendation:** Courier Copilot's core (dictating 200+ addresses, LINZ auto-correction, saved runs, delivered by voice or earbud) is already ahead of the commercial apps on voice. Six features are missing compared with them:
(1) proof of delivery (photo, signature, scanned barcode), as in Fleetbase Navigator, Spoke and Onfleet;
(2) a live tracking link and ETA SMS for recipients, as in Spoke, Onfleet and Zeo;
(3) live traffic and hazard alerts plus spoken hazard reports ("I see an accident"), as in Google Maps with Gemini and Waze;
(4) in-app turn-by-turn navigation, so the driver doesn't hand off to Google Maps;
(5) end-of-day trip reports, mileage and earnings logs, useful for an NZ contractor's GST and IRD records;
(6) automatic dark mode by time of day.
Recommended picks:
- Ferrostar (stadiamaps/ferrostar): trial it for in-app navigation, because it fits the current MapLibre plus Valhalla stack and has a react-native folder. It would replace the external handoff to Google Maps; keep Valhalla.
- Fleetbase Navigator and Fleetbase core: study them as reference designs for proof of delivery, chat and fuel or issue reports. Don't copy their code, because they are AGPL.
- Photon: watch it as a fallback geocoder alongside LINZ. Keep LINZ as the main source.
- Traccar (Apache-2.0): use only if a fleet or tracking tier is needed later.
Keep the current stack otherwise. No 2026 open-source project offers a better voice assistant than sherpa-onnx plus LangGraph. Verification limits: the GitHub API was blocked for this session, so star counts come from GitHub web pages, and release years were often not shown.

| Name | What | Use in project | Licence | Last activity | 2026 | ✓ | Verdict | Notes |
|---|---|---|---|---|---|---|---|---|
| [Ferrostar](https://github.com/stadiamaps/ferrostar) | Open-source turn-by-turn navigation kit (Rust core with iOS, Android, web and React Native) built for MapLibre and Valhalla | In-app guidance between stops without leaving the app. Its spoken instructions can be routed through sherpa-onnx text-to-speech. Fills the 'built-in navigation' gap that Spoke and Zeo cover. | Not shown on the page (LICENSE.txt exists; believed BSD-3, unconfirmed) | Release 0.58.0 on 13 Oct (year not shown, likely 2026) |  | ✅ | trial | Still pre-1.0, so the API is unstable. How mature the React Native binding is remains unconfirmed. |
| [Fleetbase Navigator App](https://github.com/fleetbase/navigator-app) | React Native driver app: proof of delivery (QR scan, signature, photo), order activity updates, chat, fuel and issue reports | Reference design for proof-of-delivery capture, issue reports and chat with the depot or customer. | AGPL-3.0 | Not shown |  | ✅ | watch | AGPL: copying its code into a closed-source SaaS would force the whole app to be AGPL. Use it as a design reference only. |
| [Fleetbase](https://github.com/fleetbase/fleetbase) | Open-source logistics platform: Fleet-Ops dispatch, route optimisation, an AI module (natural-language orders and queries via OpenAI or Claude), real-time sockets | Benchmark for the web dashboard and natural-language queries such as 'how many failed deliveries this week' | AGPL-3.0 or a commercial licence | v0.7.70 released 16 Oct (2026 by sequence) |  | ✅ | watch | AGPL. Actively developed. |
| [Photon geocoder](https://github.com/komoot/photon) | OpenStreetMap geocoder with search-as-you-type and typo tolerance | Fallback fuzzy matching of business or place names that LINZ address data lacks | Apache-2.0 | Release 1.3.0 on 7 Aug (year not shown) |  | ✅ | watch |  |
| [Traccar](https://github.com/traccar/traccar) | GPS tracking server: telematics, geofences, trip and mileage reports | A possible later fleet tier (live locations for multi-driver contractors) and its mileage reports | Apache-2.0 | Not shown |  | ✅ | watch |  |
| [Karrio](https://github.com/karrioapi/karrio) | Shipping and carrier API platform | Only if a future version imports manifests from NZ Post or courier networks | LGPL-3.0 plus an enterprise licence for /ee | Not shown |  | ✅ | watch | Code in /ee is not open source. |
| [Spoke (formerly Circuit) Route Planner](https://spoke.com/route-planner/product-updates) | Commercial competitor. Google navigation on all plans, live traffic disruption alerts, satellite view, automatic time-based dark mode, proof of delivery, recipient notifications | Gaps to close: traffic alerts on the route, satellite view to spot door points, automatic dark mode, recipient ETA SMS, photo proof of delivery | Proprietary | APK 3.67.0 uploaded 11 Jul 2026; rebranded to Spoke, with new products promised for 2026 | yes | ⚠️ | watch | The official updates page could not be opened (DNS error); details come from search snippets. |
| [Google Maps with Gemini navigation](https://pulse2.com/google-gemini-powered-navigation-rolling-out-to-google-maps-users-worldwide) | 2026 rollout of Gemini replacing Assistant during navigation: hands-free questions about route and places, spoken incident reports | Add spoken hazard and road-closure reports and questions about the route (for example 'where's the nearest fuel') to the voice assistant | Proprietary | Worldwide rollout reported March 2026 | yes | ⚠️ | watch |  |
| [Waze conversational reporting](https://www.calcalistech.com/ctechnews/article/xk8cshxr7) | Spoken reporting, extended to map corrections such as closures, plus voice destination search (beta) | Let drivers report a wrong address pin or blocked access by voice, feeding the learned door points | Proprietary | Undated article | yes | ⚠️ | watch |  |
| [Onfleet](https://onfleet.com/blog/2025-onfleet-recap/) | 50+ features shipped in 2025, including AI routing by vehicle type; states 2026 goal of AI-driven delivery orchestration | Routing constraints by vehicle type and capacity in the VROOM profiles. Customer tracking page. | Proprietary | 2025 recap; 2026 plans only |  | ⚠️ | watch |  |
| [Zeo Route Planner](https://zeorouteplanner.com/route-planner-apps-for-iphone/) | Real-time ETAs, live tracking, trip reports, automatic driver assignment | Trip reports and a shareable live ETA link | Proprietary | 2026 marketing pages |  | ⚠️ | watch |  |

**Features to add:**
- Proof of delivery: photo, signature, barcode or QR scan, optional geotagged stamp
- ETA SMS and live tracking link for recipients
- Live traffic and incident alerts on the active route
- Spoken hazard and map-correction reports (Gemini and Waze style)
- Built-in turn-by-turn navigation (Ferrostar) instead of handing off to another app
- Satellite or aerial layer to check door and access points
- Automatic dark mode by time of day
- End-of-day report: mileage, stops, failures, time; export for IRD and GST
- Constraints by vehicle type and capacity in the optimiser
- Chat or notes with the depot, and issue or fuel logs
- Natural-language questions over the driver's own history (Fleetbase AI style)

**Risks:**
- Fleetbase and Navigator are AGPL: don't copy their code into the closed-source app
- Karrio's /ee directory is under an enterprise licence
- Ferrostar is pre-1.0 and its React Native binding may be immature
- Using Google Maps navigation data or deep links commercially has Terms of Service limits
- Commercial-app features come from blogs and search snippets; the official Spoke page could not be opened
- The GitHub API was blocked, so stars and dates come from web pages and release years were often missing

**Sources:** <https://github.com/fleetbase/fleetbase> · <https://github.com/fleetbase/fleetbase/releases> · <https://github.com/fleetbase/navigator-app> · <https://github.com/stadiamaps/ferrostar> · <https://github.com/stadiamaps/ferrostar/releases> · <https://github.com/traccar/traccar> · <https://github.com/komoot/photon/releases> · <https://github.com/karrioapi/karrio> · <https://pulse2.com/google-gemini-powered-navigation-rolling-out-to-google-maps-users-worldwide> · <https://9to5google.com/2025/11/05/google-maps-gemini-navigation/> · <https://www.calcalistech.com/ctechnews/article/xk8cshxr7> · <https://onfleet.com/blog/2025-onfleet-recap/> · <https://www.apkmirror.com/apk/circuit-routing-limited/circuit-route-planner/> · <https://zeorouteplanner.com/route-planner-apps-for-iphone/>
