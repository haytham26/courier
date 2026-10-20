# Quality scorecard — ours vs the best OSS vs the best competitor

The one page that says **where we actually are**. Updated at the end of every task
(V4 §12.8). Every cell carries a link to the evidence behind it; a cell without a
measured number says **UNVERIFIED** and names what is missing.

- **Our rating**: `■■■■■` measured and ahead · `■■■■□` measured, on par · `■■□□□` measured,
  behind · `□□□□□` not measured yet.
- **Sources**: `docs/research/2026/*.md` (the sprint), `docs/evidence/**` (our own runs),
  `docs/squads/*/STATUS.md` (the squad targets), `docs/PARITY.md` (the market).

Last updated: **2026-10-20** (after the research sprint; the emulator gate was still red).

---

## 1. Voice and hands-free

| | What we measure | Our number | Best OSS | Best competitor | Rating |
|---|---|---|---|---|---|
| Command → action (on device) | ≤ 700 ms | **UNVERIFIED** — no voice eval set exists yet ([`docs/squads/voice/STATUS.md`](../docs/squads/voice/STATUS.md)) | sherpa-onnx (Apache-2.0) — the only engine that does STT+TTS+VAD+KWS+LID in one binary ([research](../docs/research/2026/on-device-stt-tts-vad-kws.md)) | Spoke: one-shot dictation only ([PARITY](../docs/PARITY.md) row 4) | `□□□□□` |
| WER on NZ addresses (quiet / van noise) | ≤ 8 % / ≤ 15 % | **UNVERIFIED** — the 500-utterance set is not built | sherpa-onnx + Whisper class models (research file) | not published by any courier app | `□□□□□` |
| Intent accuracy | ≥ 97 % | **UNVERIFIED** | pydantic-ai / Vercel AI SDK for typed tool calling ([research](../docs/research/2026/llm-tool-calling.md)) | n/a | `□□□□□` |
| Fully offline core commands | required | **Not built** — the voice module is a stub (`apps/mobile/src/voice`) | sherpa-onnx (on device) | no competitor is offline-first | `□□□□□` |
| Languages | NZ English, te reo, Arabic, Hindi/Punjabi, Mandarin, Samoan/Tongan, Spanish | **UNVERIFIED** — Qwen3-ASR/TTS coverage per language not read | Qwen3-ASR/TTS (Apache-2.0 weights) — licence-clean candidate ([research](../docs/research/2026/multilingual-voice-i18n.md)) | ElevenLabs-class (cloud, not offline) | `□□□□□` |

**The decision that matters:** OmniVoice's **weights are CC-BY-NC** (non-commercial) — the code is
Apache-2.0 but the weights are not shippable. D22 was updated and the replacement recorded in
[`ADR-004`](./adr/ADR-004-voice-service-licences.md).

## 2. Address accuracy

| | What we measure | Our number | Best OSS | Best competitor | Rating |
|---|---|---|---|---|---|
| Correction accuracy on real LINZ data | ≥ 95 % | **98.3 %** (590/600 checks over 120 real addresses × 5 cases) — [report](./evidence/phase-2.3/linz-accuracy.md) | RapidFuzz + a custom matcher (research) | Routific: geocode confidence flags only, no correction | `■■■■■` |
| Wrong-house auto-corrections at confidence ≥ 0.9 | 0 | **UNVERIFIED** — the confidence-gated test is not written yet | — | — | `□□□□□` |
| Address coverage | Canterbury (3 authorities) | **Christchurch 225,151 addresses indexed**; Waimakariri and Selwyn fetching | Photon (typo-tolerant, self-hosted) | Spoke / Upper: cloud geocoders | `■■■□□` |
| Time to correct | ≤ 2 s p95 | **UNVERIFIED** (no p95 measurement yet) | — | — | `□□□□□` |

## 3. Route quality and speed

| | What we measure | Our number | Best OSS | Best competitor | Rating |
|---|---|---|---|---|---|
| Solution quality vs best known | within 5 % | **UNVERIFIED** — no VRP eval set | PyVRP (MIT) and VROOM (BSD-2) as co-primary; OR-Tools third ([research](../docs/research/2026/routing-vrp-engines.md)) | OptimoRoute / Routific (no public numbers) | `□□□□□` |
| 200 stops optimised | ≤ 5 s | **UNVERIFIED** | Valhalla + VROOM in Docker | — | `□□□□□` |
| Rebuild the day from a template | one tap | **Not built** (T7.2) | Ferrostar (BSD-3) for the in-app navigation layer | Spoke / Upper | `□□□□□` |
| Turn-by-turn | hand-off + voice layer | **Not built** | Ferrostar core (BSD-3) + Valhalla/GraphHopper | Google/Apple multi-stop | `□□□□□` |

**Two release blockers found by the research:** Ferrostar's React Native packages are **not on npm**
(the workspace is private, upstream issue #961), and its **"driving side support" issue #991 is
open** — New Zealand drives on the **left**, so this must be closed before we ship Ferrostar.

## 4. Offline and reliability

| | What we measure | Our number | Best OSS | Best competitor | Rating |
|---|---|---|---|---|---|
| Data loss under airplane-mode chaos | 0 | **UNVERIFIED** — the sync engine is not built (T7.1) | op-sqlite (MIT) with our own event log ([research](../docs/research/2026/offline-first-sync-local-dbs.md)) | Onfleet / Spoke: partial offline | `□□□□□` |
| Sync delay online (p95) | ≤ 60 s | **UNVERIFIED** | — | — | `□□□□□` |
| Battery while driving | ≤ 8 %/h | **UNVERIFIED** | expo-location + expo-task-manager (already in the app) with `getMotionActivityAsync()` automotive detection | — | `□□□□□` |
| Offline map of Canterbury | complete | **Not built** (T5) | PMTiles (spec CC0, CLI `go-pmtiles` BSD-3) + protomaps/basemaps styles (CC0 design) | Apple/Google offline (closed) | `□□□□□` |

## 5. Safety, privacy and trust

| | What we measure | Our number | Best OSS | Best competitor | Rating |
|---|---|---|---|---|---|
| High/critical advisories in the tree | 0 | **0 unaccepted** (the two remaining highs are build-time only, with no upstream patch, documented in [`CONSTRAINTS.md`](../CONSTRAINTS.md)) | OSV / gitleaks / Semgrep / CodeQL gates in CI | n/a | `■■■■■` |
| Tenant isolation proven by tests | required | **Not written yet** — Better Auth has a **high** org-isolation advisory (GHSA-h3rm-78g3-j7cp) | better-auth + our own scoping tests | n/a | `■■■□□` |
| Audio leaves the phone | never by default | **Design decision, not built** | sherpa-onnx on device | ElevenLabs-class: audio goes to the cloud | `■■■□□` |
| NZ Privacy Act posture | PIA in T7.15 | **Not started** | — | Onfleet / Uber | `□□□□□` |
| Copyleft in the shipped app | none | **0** (licence inventory gate green) | — | — | `■■■■■` |

## 6. Delivery, evidence and design

| | What we measure | Our number | Best OSS | Best competitor | Rating |
|---|---|---|---|---|---|
| CI green on every PR | required | **Yes** — lint, typecheck, tests, floor, coverage, licences, audits, Semgrep, CodeQL, gitleaks ([PR #1](https://github.com/haytham26/courier/pull/1)) | — | n/a | `■■■■■` |
| Android E2E on the CI emulator | green, artifacts uploaded | **Red** — the APK builds, the Maestro step failed (the runner script was not executable; fixed, re-running) | Maestro | n/a | `■■■□□` |
| Coverage | ≥ 85 % packages, ≥ 90 % core | **81.7 %** overall, 88.6 % auth service (ratchet; the V4 target is the goal) | — | n/a | `■■■□□` |
| Mutation score on the core | ≥ 70 % | **UNVERIFIED** — the harness lands with the first squad task | Stryker (TS) / mutmut (Python) | n/a | `□□□□□` |
| Design fidelity to the mockups | day/night, small/large, 200 % text | **UNVERIFIED** — T6 not started | Maestro `assertScreenshot` for the design gate | n/a | `□□□□□` |
| Performance budgets | cold start ≤ 2 s, 300 stops 60 fps, 200 stops ≤ 5 s, APK ≤ 80 MB | **UNVERIFIED** | — | n/a | `□□□□□` |

---

## The honest summary

| Dimension | Rating today | The one thing that moves it |
|---|---|---|
| Voice and hands-free | `□□□□□` | the 500-utterance eval set and the emulator harness (T7.4/T7.5) |
| Address accuracy | `■■■■■` | the wrong-house guard at confidence ≥ 0.9 |
| Route quality and speed | `□□□□□` | the VRP eval set (PyVRP vs VROOM on a real Christchurch day) |
| Offline and reliability | `□□□□□` | the sync engine and the airplane-mode chaos test |
| Safety, privacy and trust | `■■■□□` | the tenant-isolation tests and the PIA |
| Delivery, evidence and design | `■■■□□` | the green emulator gate and the design screenshots |

**No dimension is fully proven yet.** The address engine and the delivery pipeline are the two we
can defend today; everything else has a target, a plan and no measurement yet. The scorecard is
the list of what the next session has to measure.
