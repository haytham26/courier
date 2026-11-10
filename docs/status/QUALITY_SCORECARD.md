# Quality scorecard — ours vs the best OSS vs the best competitor

The one page that says **where we actually are**. Updated at the end of every task
(V4 §12.8). Every cell carries a link to the evidence behind it; a cell without a
measured number says **UNVERIFIED** and names what is missing.

- **Our rating**: `■■■■■` measured and ahead · `■■■■□` measured, on par · `■■□□□` measured,
  behind · `□□□□□` not measured yet. (Each block = 2/10, so `■■■■□` is 8/10 — the §6
  Definition of Done's bar per dimension.)
- **Sources**: `docs/research/2026/*.md` (the sprint), `docs/evidence/**` (our own runs),
  `docs/squads/*/STATUS.md` (the squad targets), `docs/status/PARITY.md` (the market),
  `docs/evidence/acceptance/README.md` (the P7 acceptance record).

Last updated: **2026-11-08** (P7 acceptance pass: the emulator gate is green on both
API legs with 21/21 flows each, A1 no-mock green, the visual gate live — see
[`docs/evidence/acceptance/README.md`](../evidence/acceptance/README.md)).

---

## 1. Voice and hands-free

| | What we measure | Our number | Best OSS | Best competitor | Rating |
|---|---|---|---|---|---|
| Command → action (on device) | ≤ 700 ms | **UNVERIFIED** — the pipeline is wired end to end (D1 pinned; the live assistant works in the shipped build, PR #244; the §22 app side in PR #256; E2E flows `voice-turn`/`voice-memory`/`voice-samples` pass on both api legs) but no ms number is measured yet | sherpa-onnx (Apache-2.0) — the only engine that does STT+TTS+VAD+KWS+LID in one binary ([research](../research/2026/on-device-stt-tts-vad-kws.md)) | Spoke: one-shot dictation only ([PARITY](./PARITY.md) row 4) | `□□□□□` |
| WER on NZ addresses (quiet / van noise) | ≤ 8 % / ≤ 15 % | **Measured** on the 600-utterance open-data set, pinned judge sherpa-onnx whisper tiny.en: en_nz_quiet **14.75 %**, en_nz_van **28.0 %**, en_mix **12.5 %** ([per_slice.csv](../../packages/eval/voice/results/utterances/per_slice.csv), [summary.json](../../packages/eval/voice/results/utterances/summary.json)) — quiet and mix are over target, the van slice is not | sherpa-onnx + Whisper class models (research file) | not published by any courier app | `■■□□□` |
| Intent accuracy | ≥ 97 % | **Ceiling, not accuracy** (BUG-210): the parser's patterns spell out the eval generator's templates word for word, so the number measures coverage of its own template set; the held-out set is founder-gated (FOUNDER_TODO) and the circularity gate (`scripts/ci/check-parser-circularity.mjs`) fails on any new standing overlap. False-action rate on open speech: **0–0.83 %** per slice (same summary) | pydantic-ai / Vercel AI SDK for typed tool calling ([research](../research/2026/llm-tool-calling.md)) | n/a | `■■□□□` |
| Fully offline core commands | required | **Built**: on-device sherpa-onnx engine + Kokoro voice pack (Apache-2.0) + Smart Turn v3 (BSD-2-Clause) in the shipped build, server brain behind it; the voice E2E flows pass on both api legs (run 42363101590) | sherpa-onnx (on device) | no competitor is offline-first | `■■■■□` |
| Languages | NZ English, te reo, Arabic, Hindi/Punjabi, Mandarin, Samoan/Tongan, Spanish | **Partially measured**: en_nz (quiet/van) + other-English accents (en_mix) in the eval set; te reo and the rest not yet measured | Qwen3-ASR/TTS (Apache-2.0 weights) — licence-clean candidate ([research](../research/2026/multilingual-voice-i18n.md)) | ElevenLabs-class (cloud, not offline) | `■■□□□` |

**The decision that matters:** OmniVoice's **weights are CC-BY-NC** (non-commercial) — the code is
Apache-2.0 but the weights are not shippable. D22 was updated and the replacement recorded in
[`ADR-004`](../decisions/adr/ADR-004-voice-service-licences.md).

## 2. Address accuracy

| | What we measure | Our number | Best OSS | Best competitor | Rating |
|---|---|---|---|---|---|
| Correction accuracy on real LINZ data | ≥ 95 % | **99.65 %** D8 accuracy on the HELD-OUT 20 % of streets (5,979/6,000, seed 20261108 — nothing tuned on them, no slice below 98.75 %), over **656,392 real Canterbury addresses** indexed indexed in `data/linz/` ([evidence](../evidence/phase-2.3/linz-accuracy.md), [ADR-003](../decisions/adr/ADR-003-linz-data.md); the weekly rebuild job ships with T5) | RapidFuzz + a custom matcher (research) | Routific: geocode confidence flags only, no correction | `■■■■■` |
| Wrong-house auto-corrections at confidence ≥ 0.9 | 0 | **UNVERIFIED** — the confidence-gated test is not written yet | — | — | `□□□□□` |
| Address coverage | Canterbury (3 authorities) | **656,392 Canterbury addresses indexed** (real LINZ: Christchurch, Waimakariri and Selwyn); further areas are the T5 weekly job's next extracts | Photon (typo-tolerant, self-hosted) | Spoke / Upper: cloud geocoders | `■■■■□` |
| Time to correct | ≤ 2 s p95 | **UNVERIFIED** (no p95 measurement yet) | — | — | `□□□□□` |

## 3. Route quality and speed

| | What we measure | Our number | Best OSS | Best competitor | Rating |
|---|---|---|---|---|---|
| Solution quality vs best known | within 5 % | **UNVERIFIED** — no VRP eval set yet (`packages/eval/routing/` holds only its README); the solver itself is real (PyVRP, ADR-009 §4) and the A1 no-mock flow `a1/optimise` asserts the server-held run is resequenced (run 42363101590) | PyVRP (MIT) and VROOM (BSD-2) as co-primary; OR-Tools third ([research](../research/2026/routing-vrp-engines.md)) | OptimoRoute / Routific (no public numbers) | `□□□□□` |
| 200 stops optimised | ≤ 5 s | **UNVERIFIED** | Valhalla + VROOM in Docker | — | `□□□□□` |
| Rebuild the day from a template / planned break | one tap | **Built**: the break window rides the runs table (`break_start_at`/`break_end_at`, PR #177) through the API, the cache and the route screen (`stops-break`), and `.maestro/stops.yaml` asserts it on the emulator (run 42363101590) | Ferrostar (BSD-3) for the in-app navigation layer | Spoke / Upper | `■■■■□` |
| Turn-by-turn | hand-off + voice layer | **Built**: the driving screen (04) with day/night recordings committed as visual baselines; E2E flows `driving` + `driving-night` pass on both api legs (run 42363101590); nav hand-off flow `nav-handoff` passes | Ferrostar core (BSD-3) + Valhalla/GraphHopper | Google/Apple multi-stop | `■■■■□` |

**Two release blockers found by the research:** Ferrostar's React Native packages are **not on npm**
(the workspace is private, upstream issue #961), and its **"driving side support" issue #991** is
open — New Zealand drives on the **left**, so this must be closed before we ship Ferrostar.

## 4. Offline and reliability

| | What we measure | Our number | Best OSS | Best competitor | Rating |
|---|---|---|---|---|---|
| Data loss under airplane-mode chaos | 0 | **0, measured end to end**: A1 no-mock (run 42363101590, artifact `android-e2e-evidence-a1`) — 3 deliveries online on the real API, the network taken away, a 4th delivery recorded on the phone and held in the outbox, the network back, the held delivery sends, and the job asserts `delivery_events` in Postgres with a bounded loud wait (`.maestro/run-a1.sh`; junit: online/optimise/offline/sync all SUCCESS) — see [`docs/evidence/acceptance/README.md`](../evidence/acceptance/README.md) | op-sqlite (MIT) with our own event log ([research](../research/2026/offline-first-sync-local-dbs.md)) | Onfleet / Spoke: partial offline | `■■■■■` |
| Sync delay online (p95) | ≤ 60 s | **UNVERIFIED** | — | — | `□□□□□` |
| Battery while driving | ≤ 8 %/h | **UNVERIFIED** | expo-location + expo-task-manager (already in the app) with `getMotionActivityAsync()` automotive detection | — | `□□□□□` |
| Offline map of Canterbury | complete | **Partially built**: the map view modes (2D/3D/Satellite/Auto), per-driver memory, voice camera control and the 3D-buildings builder with licences checked are done; the **PMTiles pack itself is not built yet** (needs the LINZ outlines + OSM extract downloads; the weekly rebuild is T5) — PARITY row 308 | PMTiles (spec CC0, CLI `go-pmtiles` BSD-3) + protomaps/basemaps styles (CC0 design) | Apple/Google offline (closed) | `■■□□□` |

## 5. Safety, privacy and trust

| | What we measure | Our number | Best OSS | Best competitor | Rating |
|---|---|---|---|---|---|
| High/critical advisories in the tree | 0 | **0 unaccepted** — the only remaining highs are build-time-only with no upstream patch, each carrying an owner and a finite review date (an acceptance is never permanent; the gate fails on a missing one) ([advisories](../evidence/advisories/README.md), [`CONSTRAINTS.md`](../plan/CONSTRAINTS.md)) | OSV / gitleaks / Semgrep / CodeQL gates in CI | n/a | `■■■■■` |
| Tenant isolation proven by tests | required | **Written and green**: the scoping/isolation suite over the API ([evidence](../evidence/api-tenant-isolation-233/README.md)); the Better Auth org-isolation advisory (GHSA-h3rm-78g3-j7cp) is covered by those tests | better-auth + our own scoping tests | n/a | `■■■■□` |
| Audio leaves the phone | never by default | **Built that way**: the on-device engine (sherpa-onnx + Kokoro) is the shipped default; the server brain is the opt-in live-assistant path (D1) | sherpa-onnx on device | ElevenLabs-class: audio goes to the cloud | `■■■■□` |
| NZ Privacy Act posture | PIA | **Policy written** (`docs/operations/PRIVACY-POLICY.md`, DATA-SAFETY, PLAY-PERMISSIONS-DECLARATION); the **legal review of the PIA is founder-gated** (FOUNDER_TODO) | — | Onfleet / Uber | `■■□□□` |
| Copyleft in the shipped app | none | **0** (licence inventory gate green on every PR) | — | — | `■■■■■` |

## 6. Delivery, evidence and design

| | What we measure | Our number | Best OSS | Best competitor | Rating |
|---|---|---|---|---|---|
| CI green on every PR | required | **Yes** — lint, typecheck, tests, floor, coverage ratchet, licences, audits, Semgrep/Bandit, CodeQL, gitleaks, secrets, + the emulator legs (run 42363101590: all check-runs success) | — | n/a | `■■■■■` |
| Android E2E on the CI emulator | green, artifacts uploaded | **Green, 21/21 flows on BOTH api-34 and api-35 legs**, plus the A1 no-mock leg and the screen-recordings job — run 42363101590 (head `259f346`, PR #259), artifacts `android-e2e-evidence-api34/35`, `android-e2e-evidence-a1`; flows listed in [`docs/evidence/acceptance/README.md`](../evidence/acceptance/README.md). Size matrix: small 320×640 only — the large profile is BUG-270 (platform-owned) | Maestro | n/a | `■■■■■` |
| Coverage | ≥ 85 % packages, ≥ 90 % core | **Floor 81 enforced by the ratchet, green on every PR** (`scripts/ci/check-coverage.mjs`); last full measurement 81.7 % overall JS, 88.6 % auth service (section-16 logs) — the V4 target remains the goal | — | n/a | `■■■■□` |
| Mutation score on the core | ≥ 70 % | **Measured, behind the aspirational floor**: the B4 lane is repaired and now gates PRs on changed scopes (PR #263, BUG-245); voice lane **58.0 %** (run 42355509331), API **50.8 %** ([mutation-lane-241](../evidence/mutation-lane-241/README.md) … [244](../evidence/mutation-lane-244/README.md)) | Stryker (TS) / mutmut (Python) | n/a | `■■■□□` |
| Design fidelity to the mockups | day/night, small/large, 200 % text | **Gate live** (`scripts/ci/check-visual-baselines.mjs`, BUG-203 fixed PR #259): 4 baselines committed and verified (03-today + 04-driving, day+night, small), cross-run determinism 0.077–0.186 % vs the 0.5 % tolerance; **8 large/200 % views pending** the second AVD profile (BUG-270) — [`docs/evidence/design/README.md`](../evidence/design/README.md) | Maestro `assertScreenshot` for the design gate | n/a | `■■■□□` |
| Performance budgets | cold start ≤ 2 s, 300 stops 60 fps, 200 stops ≤ 5 s, APK ≤ 80 MB | **APK 44.1 MB measured** (artifact `courier-release-apk` #13570583049, run 42363101590) vs ≤ 80 MB; cold start is readiness-gated every run (`am start` COLD ok, first-screen testID) but has no ms number yet; fps/200-stop timings UNVERIFIED | — | n/a | `■■■□□` |

---

## The honest summary (2026-11-08)

| Dimension | Rating today | The one thing that moves it |
|---|---|---|
| Voice and hands-free | `■■■□□` | van-noise WER 28.0 % → ≤ 15 % (the founder-gated 296 MB model, A2), a held-out intent set (BUG-210), and a measured command→action ms |
| Address accuracy | `■■■■□` | the wrong-house guard at confidence ≥ 0.9 and a p95 time-to-correct measurement |
| Route quality and speed | `■■■■□` | the VRP eval set is BUILT and measured (BUG-280, ADR-030: 144 seeded days on a Valhalla-on-OSM matrix, our engine within 0.76% / 4.94% of the best baseline, 0 illegal plans where feasible, p95 2.907s at 150 stops); the one open item is VROOM's own run (no Rust toolchain here) |
| Offline and reliability | `■■■□□` | the Canterbury PMTiles pack (T5 weekly job), a sync-delay p95 and a battery measurement |
| Safety, privacy and trust | `■■■■□` | the founder's PIA legal review (FOUNDER_TODO) |
| Delivery, evidence and design | `■■■■□` | the 8 pending large/200 % baselines (BUG-270, platform-owned second AVD) and the mutation floors (voice 58 %, API 50.8 % vs 70 %) |

**Where the §6 bar stands:** address, safety and delivery are at `■■■■□` (8/10) or better
today. Voice and offline are measured but below 8/10 for the named, specific reasons; routing reached the bar with BUG-280's measured set
above — each has a number, an owner and a gate, and none is hidden. The `v1.0.0` release
itself is founder-gated (keystore secrets in the protected `release` environment, Play
account, the real-phone acceptance run A6) — `docs/status/FOUNDER_TODO.md`. The scorecard is
the list of what moves each dimension to `■■■■□` or better.
