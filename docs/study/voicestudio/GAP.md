# VoiceStudio — gap analysis vs Courier Copilot

**Area:** V4 §11.2 step 3 (feature → have / better / planned / skip, to be merged into `docs/status/PARITY.md`)
**Study date:** 2026-10-20 · **Studied project:** `debpalash/VoiceStudio` (AGPL-3.0)
**Companion document:** `docs/study/voicestudio/SPEC.md` (the requirements; this file is the verdict)

**Status key** (same as `docs/status/PARITY.md`): `Have` (shipped) · `Better` (we do it better than the market) ·
`Planned (task)` (in the V3/V4 task list) · `Skip (reason)`.

**Legal note.** Nothing below authorises copying. Every "Planned" row means *we build the behaviour
ourselves*, on our own stack, from `SPEC.md`. Rows whose only route is a **non-commercial** model are
marked `Skip` or carry an explicit licence-safe substitution.

---

## 1. Feature-by-feature

| # | Feature in the studied project | What it does (our own words) | Our equivalent | Status | Task / note |
|---|---|---|---|---|---|
| 1 | Speech synthesis with many interchangeable engines | One interface over ~17 synthesis engines with per-engine capability flags | One engine registry with declared capabilities and honest unavailability | **Planned (task)** | T7.5 · SPEC R1 |
| 2 | Per-model licence record with evidence links | Every downloadable model carries code licence, weights licence, review date, evidence, gaps | Licence ledger as a product surface; build fails on non-commercial weights in a shipping build | **Better** | T7.5 · SPEC R2 — this is our licence-safety spine, and it is what the CC-BY-NC finding demands |
| 3 | Machine-readable capability discovery document | The service publishes what it can do so clients can adapt | Discovery document + versioned handshake; app falls back on-device when unsupported | **Planned (task)** | T7.5 · SPEC R3 |
| 4 | Versioned streaming transcription socket | Live partial and final text over a socket, with session identity and an explicit end frame | Same contract, plus "actions wait for the final result" | **Better** | T7.5 · SPEC R4 — ours adds the action barrier a driving app needs |
| 5 | OpenAI-shaped batch speech and transcription endpoints | Third-party agent frameworks can point at the local service | Same, additive to our internal pipeline | **Planned (task)** | T7.5 · SPEC R5 |
| 6 | Voice cloning from a short reference clip | Create a reusable voice from a 3–10 s recording | Voice profile from a reference clip, with a consent record | **Skip (reason)** | We do not clone *drivers'* voices; cloning for a synthetic narrator has no courier use case |
| 7 | Voice design from a written speaker description | Create a voice from attributes (gender, age, pitch, accent, …) | Our own attribute vocabulary on a permissive engine; unavailable is declared, never faked | **Planned (task)** | T7.5 · SPEC R6 — our "reply voice" and synthetic evaluation audio |
| 8 | 646-language synthesis with a per-language catalogue | One model covering hundreds of languages | Licence-safe tiered languages (Tier A offline, Tier B/C server) | **Skip (reason)** | The only engine that covers our full list has **CC-BY-NC weights**; the shipped path is sherpa-onnx + Kokoro + MIT voices, with an Apache-2.0 server candidate |
| 9 | Dictation into any focused window | Global shortcut types speech into whatever app is focused | Hands-free capture that runs a tool instead of inserting text | **Better** | T7.5 · SPEC R8 — ours is a closed loop into the app, not a text injector |
| 10 | Speaker diarization and speaker assignment | Tell who spoke when in multi-speaker audio | Server-only job for evaluating our own recordings | **Skip (reason)** | Not a courier capability; no measurable target in the squad README |
| 11 | Vocal isolation / stem separation | Split a mixed recording into one stream per speaker | Server job for evaluation audio prep | **Skip (reason)** | Not a courier capability |
| 12 | Batch queue for long media jobs | A queue with progress, cancel and retries | Job model for evaluation-audio generation and server-side media | **Planned (task)** | T7.5 · SPEC R11 |
| 13 | Durable checkpoints with resume | Interrupted runs resume from the last completed item | Same, for our private service's long jobs | **Planned (task)** | T7.5 · SPEC R11 |
| 14 | Scripted pipeline builder with branches and conditions | A canvas of typed steps with forks, joins and contract-checked edges | Internal model only; not a user-facing builder | **Skip (reason)** | Our tool catalogue (FINAL_PROMPT §4.5) already is a typed, contract-checked graph |
| 15 | Agent tool surface (MCP) with a fixed tool set | Synthesise, clone, design, transcribe, list, health | MCP adapter over **our** tool registry; our own schema and risk classes | **Planned (task)** | T7.6 · SPEC R13 |
| 16 | Per-agent voice binding | Each client id can speak in a different voice | Binding for our own surfaces only | **Planned (task)** | T7.6 · SPEC R14 |
| 17 | Phone-to-desktop pairing by QR or address + short code | The phone drives a paired computer over the LAN | Phone pairs with **our** private service; on-device path works with no pair | **Better** | T7.5 · SPEC R15 — pairing is optional for us, mandatory for them |
| 18 | Two independent access gates plus a trusted-network exemption | Consumption vs administration split; short code vs API key | Same three-layer model, plus a resource-server-only API | **Better** | T7.13 · SPEC R16 — we add JWT-only verification with no shared secret |
| 19 | Host allow-list / DNS-rebinding defence | Unauthenticated requests must name a known host | Same, with distinct error codes for host vs origin failures | **Planned (task)** | T7.13 · SPEC R17 |
| 20 | Named error classes, degraded-vs-failed states | Failures are classified; optional capability loss is "degraded" | Same taxonomy surfaced in the driving UI and in agent replies | **Better** | T7.6 · SPEC R18 — ours must also fit the ≤ 8-word spoken reply |
| 21 | Per-operation time and memory budgets with named timeouts | Loading, generation and download each have a budget and a floor | Same, including accelerator memory floors | **Planned (task)** | T7.5 · SPEC R19 |
| 22 | Opt-in analytics, bounded retention, invisible provenance mark | Privacy controls: consent, history cap, synthetic-audio marking | Privacy settings + a mark on **synthetic** audio only | **Better** | T7.15 · SPEC R20 — we never mark a driver's microphone |
| 23 | Cloud settings sync with outbox, cursor and tombstones | Sync engine with a per-item outbox and a per-org cursor | Same shape, inside our own event-log engine | **Better** | T7.1 · SPEC R21 — our engine is event-log-with-conflict-rules, theirs is settings sync |
| 24 | Built-in evaluation harness (WER, speaker similarity, naturalness) | Measure engines on public test sets | Our own eval set + benchmark harness, published to the squad | **Planned (task)** | T7.5 · SPEC R22 — ours does not exist yet; it must |
| 25 | Canonical feature inventory with CI drift detection | Docs and code are diffed so they cannot drift | Same discipline for the whole repo | **Planned (task)** | T7.15 · SPEC R23 |
| 26 | Generated contract between desktop and phone | Colours, API description and strings are generated, never hand-copied | Generated contract for mobile ↔ service and mobile ↔ dashboard | **Planned (task)** | T7.5 · SPEC R24 |
| 27 | Model catalogue: explicit, resumable, verified downloads with disk accounting | Install on demand with checksums, licence acceptance and size reporting | Same for on-device voice packs and map packs | **Planned (task)** | T7.5 / T5 · SPEC R25 |
| 28 | Accelerator auto-detection with a memory floor and a warning | CUDA/ROCm/MPS/CPU selection, warns before a doomed render | Same, server side | **Planned (task)** | T7.5 · SPEC R26 |
| 29 | Video dubbing into other languages | Multi-language video dubbing with timelines and subtitles | — | **Skip (reason)** | Media product, not a courier product |
| 30 | Longform / audiobook / story production | Long-form narration projects with chapter and cue-sheet export | — | **Skip (reason)** | Out of scope |
| 31 | Public voice gallery and persona marketplace | Browse and install community voices | — | **Skip (reason)** | We ship our own voices only; a marketplace is a moderation and licensing problem we do not need |
| 32 | Desktop application (Electron) | Full studio UI on a desktop | — | **Skip (reason)** | We ship phone + service + web dashboard |
| 33 | Outbound telephony / inbound call answering | Place and answer phone calls through a paid carrier | — | **Skip (reason)** | Not in v1; a paid carrier and a PSTN path are out of scope |
| 34 | Local language/translation engines bundled in the app | Bundled translation models for dubbing | — | **Skip (reason)** | Addresses are never machine-translated; 8 UI locales are human-translated |
| 35 | YouTube/media URL import for dubbing | Import media by link | — | **Skip (reason)** | Not a courier capability |

## 2. Row count and shape

- 35 features compared; **5 skipped as out of scope**, **1 skipped for licence reasons** (the 646-language
  engine), **3 skipped because the capability is not ours** (cloning a driver's voice, diarization,
  isolation), **26 kept as Planned or Better**.
- The studied project is a **creator tool**. Our overlap is the *speech substrate* (R1–R5, R11, R13,
  R19, R22–R26) and the *privacy/ops discipline* (R2, R16–R18, R20, R21). Everything else is a different
  product.

## 3. Merge into `docs/status/PARITY.md`

Rows 2, 4, 9, 17, 18, 20, 22, 23 are the ones that strengthen **existing** PARITY rows:

| PARITY row | Strengthened by | New wording to merge |
|---|---|---|
| 20 — Live voice assistant | rows 1, 3, 4, 5, 20 | "on-device first, server cascade optional, all languages; the phone and the service share one versioned protocol, so the server is replaceable" |
| 20 (privacy half) | row 2 | "every model that can reach the device has its weights licence checked in the build" |
| 47 — In-app support / help centre | rows 13, 15, 16 | "the help agent speaks with a bound voice and drives the same typed tools" |
| 44 — Onboarding tutorial | row 9 | "voice-guided first route; the assistant types nothing and does everything" |
| 45 — Settings | row 26 | "every setting changeable by voice; app, dashboard and service read one generated contract" |

Rows that are **new** to PARITY and should be added with status `Planned (task)`:

| # | Family | Feature | Status | Our edge | Task |
|---|---|---|---|---|---|
| 50 | Voice ops | Every model that can reach the device or the server has a licence ledger entry with evidence, and a non-commercial weight fails the build | **Better** | licence-safety is a shipped feature, not a spreadsheet | T7.5 |
| 51 | Voice ops | The private voice service publishes a machine-readable capability document and speaks a versioned protocol, so the phone is not tied to one backend | **Planned (task)** | client is framework-agnostic | T7.5 |
| 52 | Voice ops | Synthetic audio carries an invisible provenance mark; driver audio never does | **Better** | the mark follows the audio, not the microphone | T7.15 |
| 53 | Platform | Visual regression runs inside the mobile E2E flow, on self-hosted diffing, so no driver screenshot leaves our CI | **Better** | privacy-safe visual gate | T7.15 |

## 4. What stays UNVERIFIED

1. **No number in this file was measured by us.** The studied project's quality figures, real-time
   factors, memory floors and language-hour totals are vendor claims on *their* test sets.
2. Our own voice eval set (`packages/eval/voice/`) and benchmark harness do not exist yet, so the
   rows that claim "Better" for the voice substrate are **design** claims, not measured ones.
3. The licence of every model the studied project can install was not audited individually; only the
   one that changes our plan (the CC-BY-NC weights) was.
4. The studied project's mobile apps were **not built or run**. Whether device-side inference is in the
   released build is UNVERIFIED (the documentation contradicts itself), so no row here relies on it.
5. The studied project's issue tracker was read only by recent title; maintainer response times,
   closed-issue ratios and 6-month star trends are UNVERIFIED.
6. `docs/status/PARITY.md` rows only leave `Planned` when the task is merged **with evidence** in
   `docs/evidence/` (PARITY rules). Nothing in this file changes a shipped status.
