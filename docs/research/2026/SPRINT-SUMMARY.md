# Research sprint — summary (2026-10-20)

The V4 §12 sprint: 16 areas, ≥ 30 candidates each, every query recorded, evidence cards per
candidate, the top 5 of each area deep-reviewed, benchmarks only where an eval set exists.

- **Area files:** `docs/research/2026/*.md` (16 files, 619 KB) + the founder's
  `oss-maps-courier.md`, which this sprint **verified and corrected** (it was UNVERIFIED).
- **Squad files:** `docs/squads/<module>/research.md` and `decisions.md` rewritten from the sprint.
- **Clean-room studies:** `docs/study/{fleetbase,navigator-app,openrouteservice,nominatim,voicestudio}/SPEC.md` + `GAP.md`.
- **ADRs written:** ADR-004 (the voice service licences).

## 1. The three findings that change the plan

### 1.1 OmniVoice's weights are not commercial (D22 premise broken)

The **code** is Apache-2.0, but the **pretrained weights are CC-BY-NC**, and the bundled
`audio_tokenizer/` weights are under the Boson Higgs Audio 2 Community Licence. The same trap
applies to `facebook/mms-tts-*`, `nllb-200`, `xls-r` (CC-BY-NC-4.0) and the openWakeWord shipped
models (CC BY-NC-SA). The Silero VAD weights' licence is **contradictory** in the repo (MIT file vs
a CC BY-NC badge) — UNVERIFIED until we read the file ourselves.

**Change:** D22 updated; [`ADR-004`](./adr/ADR-004-voice-service-licences.md) records sherpa-onnx +
Kokoro on device and Qwen3-ASR/TTS (Apache-2.0 weights) on the private service, and makes the
**licence ledger a shipped surface**: every engine reports its code *and* weights licence, and a
non-commercial weight in the tree fails the build.

### 1.2 Ferrostar is a release blocker, not a drop-in

The research checked the claims: BSD-3, weekly releases, nine maintainers — but the **React Native
packages are not published to npm** (the `react-native/` workspace is private, upstream issue #961)
and issue **#991 "Driving side support" is open** while New Zealand drives on the **left**. So
Ferrostar has to be **vendored** and the left-hand driving issue closed before it can ship.

### 1.3 The competitor platforms are the *networked* ones

The clean-room study of Fleetbase and its Navigator app (both AGPL) found the strongest driver app
in the market is **read-only offline**: the whole driving loop needs the network, the local cache is
read-only, there is no offline write path, and the most-reported driver defect is that **offer
buttons never go away**.

**That is our opening.** We keep the offline-first event log (T7.1) and the voice-first flow, and we
adopt their good discipline: a server-driven state machine the app renders (we drive it by voice),
sealed POD capture with a retry queue, permanent dismissal of offers, and preview → confirm → apply
for every assistant action.

## 2. The stack changes the sprint implies

| Area | Adopt | Keep | Watch | Reject |
|---|---|---|---|---|
| Voice | sherpa-onnx (one engine: STT+TTS+VAD+KWS+LID), Pipecat, Qwen3-ASR/TTS, i18next + Lingui + expo-localization, pydantic-ai / Vercel AI SDK (typed tool calling) | Whisper class models | LiveKit semantic turn detection (as a swappable processor), openWakeWord's *method* | crewAI, llama_index, @effect/schema, LiveKit Agents |
| Maps | PMTiles spec + `go-pmtiles` CLI, protomaps/basemaps **styles** (CC0 design), MapLibre RN **11.3.7 → 11.5.0** | MapLibre native, maputnik | openfreemap, versatiles, GeoLibre, NVIDIA/cuopt (GPU VRP) | Vela, Organic Maps (clean-room only) |
| Routing | **PyVRP (MIT) and VROOM (BSD-2) as co-primary**, GraphHopper + Valhalla, routingpy, VRPLIB | OR-Tools (third), OSRM (matrix) | Timefold, jsprit, RoutingKit | ORS, Nominatim, Fleetbase (clean-room) |
| Location | expo-location + expo-task-manager (already installed: foreground service, duty cycling, `getMotionActivityAsync()` automotive detection), expo-battery | — | `traccar/traccar-client-sdk` (the live project; the 2026 `traccar-client-android` is superseded) | `transistorsoft/react-native-background-geolocation` (paid release licence) |
| Scanner | VisionCamera 5.2.3, ML Kit text recognition v2 (bundled), `react-native-nitro-zxing` (barcodes), RapidOCR/PP-OCR (FOSS fallback) | — | — | tesseract.js (no Hermes), chineseocr_lite (GPL-2.0), anyline, server-class VLMs |
| Address | LINZ NZ Addresses offline + FTS5 in op-sqlite + the D8 engine, **RapidFuzz** in place of `difflib`, Pelias/Photon as optional self-hosted servers | the D8 engine at **98.3 %** | OpenAddresses, GNAF | libpostal (server-only, unmaintained), the public Nominatim instance (policy forbids our use) |
| Sync | op-sqlite 18.2.5 with the `sqlcipher` / `fts5` / `performanceMode` build toggles, WatermelonDB's adapter shape, remove the unused `expo-sqlite` | our own event log | PowerSync (client Apache-2.0, but the **service is FSL-1.1-ALv2** — a founder licence decision) | Realm, Replicache, WatermelonDB, Yjs/Automerge/Sharedb |
| Payments | Stripe + `stripe-mock` (tests), RevenueCat SDK (entitlement model only), better-auth 1.7.11 | eas-cli, stripe-python | openiap, polar, openmeter | lago/meteroid/flexprice (AGPL), akaunting (BSL), dub (source-available) |
| Web | Next 16.4.2 (pinned, five mitigations), shadcn/ui as copied source, TanStack Table/Query/Virtual, maplibre-gl 6.15.0 (lazy) + react-map-gl 8.1.3, better-auth-ui, radix, react-hook-form | maputnik (the shared style) | react-admin, TanStack/charts, payload | ag-grid, handsontable, twenty (AGPL), tremor, basetool |
| Platform | Maestro `assertScreenshot` (the design gate), Playwright 1.64.1, reg-cli (self-hosted diff), Stryker v10 + mutmut 3.8.0, expo-updates 58.0.17 (two channels + rollback), sentry-react-native 8.31.0, GlitchTip (self-hosted), PostHog + Langfuse + OTel, syft→grype→cosign→scorecard, renovate (CI only) | eas-cli | maestro-runner, agent-device, sherlo, argos, storybook, cosmic-ray | lost-pixel, ladle, mutpy, Detox, Appium, grafana |
| Design | `@expo-google-fonts/figtree`, `@react-native-vector-icons/material-design-icons` (one Material Symbols set) | Reanimated 4.7.1, gesture-handler 3.4.0, FlashList 2.3.3, bottom-sheet 5.2.14 | react-native-paper (a11y patterns), react-native-a11y | NativeWind, heroui-native, NativeBase, RNE, react-native-aria, tab-view |

## 3. Corrections to the V4 §11.1 adopt list

| Claim | Correction |
|---|---|
| `stadiamaps/ferrostar` | claims hold (BSD-3, weekly releases) but the RN packages are **not on npm** (#961) and the **left-hand driving** issue #991 is open — vendor it and close the issue |
| `protomaps/PMTiles` | the **CLI lives in `protomaps/go-pmtiles`** (the repo itself has no release); the spec is **CC0**, the code BSD-3 |
| `protomaps/basemaps` | add the **CC0 visual-design** clause and rename our fork |
| `traccar-client-android` | **superseded** by `traccar/traccar-client-sdk` (2026-05, Apache-2.0, with an RN wrapper) |
| `komoot/photon` | fine, but the Nominatim usage policy forbids us a public fallback — our offline index stays |
| `rhasspy/piper` | **archived**; the successor is GPL-3 → not adoptable in the APK (sherpa-onnx covers it) |
| `mrousavy/react-native-vision-camera` | moved to `margelo/react-native-vision-camera` |
| "versatiles" | `versatiles-org/versatiles-rs` |
| Next.js / MapLibre / Argos | 32 advisories (6 critical) on Next.js; a **critical** MapLibre advisory (CVE-2026-85061, fixed in 6.4.1) → upgrade MapLibre RN to 11.5.0; a **critical** Argos advisory (cross-tenant build injection) → self-host the image diffing |

## 4. ADRs needed

| ADR | Why | State |
|---|---|---|
| ADR-004 — the voice service licences | D22 assumed commercial weights | **written** |
| ADR-005 — the navigation stack (vendored Ferrostar + left-hand driving) | a locked choice changes | to write before T7.7 |
| ADR-006 — the VRP engine (PyVRP + VROOM, OR-Tools third) | a locked choice changes | to write before T7.2 |
| ADR-007 — the op-sqlite build toggles and the `expo-sqlite` removal | a native build change | to write before T7.1 |
| ADR-008 — the billing provider (Play Billing policy risk) | Stripe-only in-app purchase is a policy risk | to write before T7.13 |

## 5. The updated T5 → T7 plan

| Task | Change | Why |
|---|---|---|
| T5 offline maps | PMTiles via `go-pmtiles` + a protomaps-style fork; **only the emulator/debug pack on CI** | the pack size is UNVERIFIED; the CLI moved |
| T6 design | Figtree via `@expo-google-fonts/figtree`; Material Symbols via `@react-native-vector-icons/material-design-icons`; the design gate uses Maestro `assertScreenshot` | one icon set, no emoji, the screenshot gate becomes part of CI |
| T7.1 sync | op-sqlite with `sqlcipher` + `fts5` + `performanceMode`; **remove `expo-sqlite`** (it clashes with op-sqlite on iOS) | the research found the clash; the event log stays ours |
| T7.2 routing | **PyVRP and VROOM as co-primary**, benchmarked on a real Christchurch day; templates rebuild the day in one tap | the competitor's best-known gap is the template rebuild |
| T7.3 door memory | unchanged, but the location is learned from the **event log**, never nearest-neighbour | FINAL_PROMPT §5.3 |
| T7.4 dictation | the D8 engine stays; **RapidFuzz** replaces `difflib`; the eval set is the 500-utterance set | 98.3 % today, but no eval set |
| T7.5 live voice agent | **services/voice** on sherpa-onnx + Pipecat with the licence ledger; Qwen3 for multilingual | D22/ADR-004 |
| T7.6 tool catalogue | pydantic-ai (server) and the Vercel AI SDK (client) over one zod schema source | typed tools, one schema |
| T7.7 driving mode | Ferrostar **vendored**, left-hand driving closed, voice instructions from sherpa-onnx | issue #991 is a blocker |
| T7.8 OCR | ML Kit text recognition v2 bundled, RapidOCR as the FOSS fallback, `react-native-nitro-zxing` for barcodes | 97 % recipient-address target |
| T7.9 POD | sealed capture + retry queue (the competitor's top defect) | from the clean-room study |
| T7.10 SMS | unchanged, optional and off by default | D5 |
| T7.11 IRD | Valhalla `trace_attributes` map-matching for the km log | the research found the method |
| T7.12 web | Next 16.4.2 pinned with the five mitigations; Lighthouse ≥ 95 | 32 advisories on Next.js |
| T7.13 billing | a `BillingProvider` interface with a store implementation (Play policy) | the policy risk found in the research |
| T7.14 teams | unchanged | |
| T7.15 PIA | the position-history question (device, cloud or both) must be answered | it changes the T7.1 design |

## 6. Risks

1. **The benchmark gap.** Every benchmark in the sprint is UNVERIFIED: the voice, scanner, address,
   routing, maps and platform eval sets do not exist. The sprint chose well, but nothing is measured
   yet. The scorecard ([QUALITY_SCORECARD.md](./QUALITY_SCORECARD.md)) tracks it.
2. **The star-trend field of every evidence card is UNVERIFIED** — the token has no stargazer
   scope. A monthly CI snapshot backfills it.
3. **Licence traps beyond OmniVoice** (Silero VAD's contradictory licence, the HF cards that
   returned no licence) → the licence ledger and the build gate.
4. **Legal, not engineering:** the ODbL share-alike position on a cached OSM tile set and the
   PowerSync FSL "Competing Use" boundary. Both need the founder and counsel.
5. **Ferrostar** is a single project carrying a big part of T7.7 — vendor it, or fall back to
   `maplibre-navigation-android` (Android only, so it needs a TurboModule from us).

## 7. What is NOT decided by this sprint

The sprint picks **candidates**; the measurements that justify adopting them belong to the squads'
benchmarks. Nothing in this summary changes a locked decision on its own: D21 (Expo) and D22 (the
voice service) are the two that moved, and both moved through an ADR.
