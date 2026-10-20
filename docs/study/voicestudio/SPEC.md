# VoiceStudio — clean-room functional study

**Area:** V4 §11.2 (clean-room study of copyleft projects) · **Squad:** Voice (with Platform, Web, Sync)
**Study date:** 2026-10-20 · **Role:** Analyst (V4 §1 role 2, study phase only)
**Studied project:** `debpalash/VoiceStudio` — AGPL-3.0, self-hosted voice assistant / speech platform
**Clean-room rule (V4 §11.2):** this document describes *behaviour in our own words*. No code, no copied text, no copied identifiers, no copied schemas and no copied assets from the studied project enter our repository. Everything below is a **requirement + acceptance criterion for Courier Copilot**. The build team (Engineer role, separate session) implements from this file only, without opening the studied source.

## 0. How to read this document

- Every **R** block is a requirement for *our* product, written so it can be turned into a ticket; the acceptance criteria are the Definition of Done for that requirement.
- **"Adopt"** means we build the behaviour ourselves, on our own stack. It never means we vendor code.
- Licence-safety is a hard gate: a requirement that would put non-commercial model weights on a driver device or in a shipped product is written so a permissive alternative can satisfy it (see §6).

## 1. What the studied project is (our own description)

A self-hosted desktop and web application for speech work that runs almost entirely on the user's own machine. It bundles a small Python service with a desktop UI, and offers: creating a synthetic
voice from a short reference recording ("cloning"), creating a voice from a written description of a speaker ("design"), turning text into speech in a chosen voice and language, transcribing speech,
dubbing video into other languages, a global dictation helper that types into any window, splitting a mixed recording into isolated voices, detecting who spoke when, a queue of long-running media jobs,
a scripted pipeline builder, an agent-facing tool surface, and a phone companion that drives a paired computer over the local network. It swaps between many speech engines, downloads models on demand,
tracks a per-model licence record, and offers an OpenAI-shaped HTTP surface plus a streaming websocket so third-party agent frameworks can drive it.

## 2. The legal boundary

| Rule | Consequence for us |
|---|---|
| AGPL-3.0 covers the studied application | No code, file layout, string table or schema may be copied. We re-implement from behaviour only. |
| Code review checks for similarity (V4 §11.2 step 5) | Any doubt → rewrite. |
| Our product stays closed-source and fully private | The studied project may be run locally as an **internal dev tool** (e.g. to generate synthetic evaluation audio) but never shipped to drivers, vendored or served to users. |
| D22 | We build our **own** private voice service. The studied project is a reference, not a dependency. |
| **OmniVoice model weights are CC-BY-NC** (non-commercial) — see `docs/research/2026/on-device-stt-tts-vad-kws.md` | Nothing here may require a non-commercial weight in the shipped product. Where a studied behaviour is only reachable with non-commercial weights, we specify a permissive alternative (§6). |

## 3. Our locked context (every requirement inherits these)

- **Private and on-device first.** Audio never leaves the phone by default; the cloud path is opt-in, short-window and gated by voice activity (D2, V4 §7, FINAL_PROMPT §4.1).
- **Hands-free in a van.** ≤ 700 ms command→action on device, ≤ 8 %/hour battery, wake word ≤ 1 false accept/hour and ≤ 3 % miss, spoken replies ≤ 8 words while driving (V4 §10.1).
- **Every app action is a typed tool** with a risk class and a confirmation enforced in the tool layer (FINAL_PROMPT §4.3–4.5). **Free-first → paid fallback** chain, provider ids in config (D12).
- **Our languages:** English (NZ), te reo Māori place names, Arabic, Hindi/Punjabi, Mandarin, Samoan/Tongan, Spanish, plus auto language detection and code switching (D3).
- **Our stack:** Expo SDK 58 / RN 0.88 mobile; Python service layer; TypeScript packages; op-sqlite (SQLCipher + FTS5) local DB; our own event-log sync.

---

## 4. Requirements

### R1 — One engine registry with declared capabilities
All speech engines sit behind one registry. Each entry declares: identifier, licence, weights licence, on-device vs server, supported languages, whether it can design a voice, whether it accepts
free-form style text or a fixed attribute vocabulary, and *why it is unavailable* when it is.
- **Given** an engine whose weights are not installed, **when** the app asks the registry for it, **then** the answer is a typed "unavailable + reason", never a silent empty list.
- **Given** an engine that cannot design a voice, **when** the design screen opens, **then** the screen explains it and links to engine settings instead of offering a control that cannot work.
- **Given** a user overrides the engine choice in config, **then** the persisted UI choice still wins only where the config does not explicitly set the id.

### R2 — A licence ledger that is a product surface, not a file
Every model that can reach the device or the server has a ledger entry: source, version, code licence, **weights licence**, last review date, evidence link, and any unresolved gap.
- **Given** a model whose weights licence is non-commercial, **when** it is installed in a build that ships to drivers, **then** the build **fails**. Internal-only tooling may use it.
- **Given** a model whose licence text was never read, **then** it is recorded as UNVERIFIED and is not treated as permissive; the ledger change is reviewable in the same PR as the model change.

### R3 — Machine-readable capability discovery between phone and service
Our private voice service publishes a discovery document listing its protocol version, available engines, voices, languages and transports; the phone reads it at handshake.
- **Given** a phone with an outdated client, **when** it handshakes, **then** the service answers with a clear "unsupported protocol version" and the app falls back to the on-device path.
- **Given** a discovery document, **then** it contains no secrets and no absolute server paths, and a change to its shape is a breaking change needing a version bump.

### R4 — A versioned streaming audio contract
Live audio in and partial/final text out over one documented socket, with an explicit session id, an explicit end-of-input frame and a final authoritative result.
- **Given** a client that stops sending without the end frame, **then** the server times the session out and closes it with a named reason; an unsupported encoding fails the handshake with the list we
  support.
- **Given** two concurrent sessions, **then** a late result from session A can never be delivered to session B.
- **Given** partial text, **then** the client may display it, but any **action** waits for the final result.

### R5 — An OpenAI-shaped batch surface for third-party callers
Our service also accepts single-file synthesis and transcription calls in the shape widely used by agent tooling, so an external framework can point at our private service. The surface is additive: our
internal pipeline never depends on it.
- **Given** an invalid request, **then** the error body carries a message, a type and a code.
- **Given** a requested audio container, **then** the returned content type and container match exactly.
- **Given** an encoder for that container is missing, **then** the request fails **before** any audio is generated, naming the missing encoder.

### R6 — Voice profiles: created from a reference clip, and from a description
Two ways to make a voice we can speak with: (a) a short clean reference recording, (b) a written description of a speaker.
- **Given** a reference clip, **then** the system accepts 3–10 s cleanly; a longer clip is windowed and the chosen window is reported; a clip with no detectable speech is refused with actionable
  advice.
- **Given** a clip and a matching transcript, **then** both are kept together and re-used; the two can never drift apart.
- **Given** a description, **then** attributes are mapped onto our own vocabulary and anything we cannot map is reported back as "not understood"; a designed voice has a stable identity, so it renders
  the same way every time.
- **Given** a voice that may speak on the driver's behalf, **then** ownership consent is recorded separately from the technical profile and is required before an agent can use it.

### R7 — Multilingual synthesis with declared per-language coverage
Every voice and every engine declares the languages it can actually produce. The app never offers a language the engine cannot produce.
- **Given** a request for a language the engine does not support, **then** the request fails naming the engine and the supported set — it never silently produces speech in the wrong language.
- **Given** a driver speaking a language outside our Tier A set, **then** the reply is still produced and the language tier is visible in diagnostics, not in the driving UI.
- Language coverage is recorded per engine from the model card and re-verified before each release.

### R8 — Dictation that types into the focused field
A global, always-available capture that turns speech into text in whatever the driver is typing into. On mobile this maps to our capture: the target is our own app, so the "insert" step becomes "run
the tool".
- **Given** the shortcut is held, **then** capture starts without the target app needing focus.
- **Given** the platform cannot identify the focused window, **then** the transcript is left on the clipboard and the UI says "copied", rather than guessing a target.
- **Given** the driver copied something else while dictation was running, **then** their clipboard content is not overwritten by a stale restore.

### R9 — Speaker diarization, speaker assignment and vocal isolation
For multi-speaker audio, tell who spoke when, let the user assign speakers, and split a mixed recording into one stream per source voice.
- **Given** audio with overlapping speech, **then** the system reports the overlap rather than inventing a clean split.
- **Given** a model whose weights are missing, **then** the feature is unavailable with a reason and the rest of the pipeline still works.
- Isolation is a **server** job for us and never blocks a driving task.

### R10 — Long-running jobs with durable checkpoints
Batch media work runs as a job with progress events, cancellation, and per-item checkpoints so an interrupted run resumes instead of restarting.
- **Given** a run stopped halfway, **then** restarting resumes from the last completed item; a failed item pauses the run for explicit retry rather than being skipped silently.
- **Given** the inputs or the pipeline changed since the checkpoint, **then** the saved progress is invalidated and the run starts again — a stale result is never reused.
- **Given** the app is closed mid-job, **then** the job keeps running on the server and the app re-attaches.

### R11 — A pipeline builder with branches and conditions
A saved pipeline of typed steps (input → transform → output) that can fork on a condition and rejoin.
- **Given** a draft where a text step is wired to an audio step, **then** the draft is refused **before** anything runs; a step where two branches carry different kinds of value is refused too.
- **Given** a condition that forks, **then** both branches must be connected.
- **Given** a run is resumed, **then** the condition is re-evaluated from the checkpointed value, so the same item always takes the same branch.
- **For us this is not a user-facing builder.** We keep the *model* (typed steps, contract-checked edges, checkpointed re-evaluation) and expose it only internally.

### R12 — An agent tool surface over the private voice service
The service exposes a small set of typed tools to agent runtimes: synthesise speech, list voices, list languages, transcribe, health.
- **Given** a tool call, **then** its arguments validate against a schema **before** the tool body runs, and an unknown tool name is rejected before dispatch.
- **Given** a request that carries a file path, **then** the path must resolve inside an explicitly configured root; symlinks are resolved before the check, and no path argument is accepted at all
  when no root is configured.
- **Given** audio output would be large in the caller's context, **then** the tool can return a handle (a URL or a path) instead of inline bytes, and the mode is a server-side setting.

### R13 — Voice binding per surface, not per user
A caller identifies itself with a client id; each id can be bound to a different voice.
- **Given** a bound id, **then** its synthesis uses the bound voice unless the call names another; an unbound id uses the default voice.
- **Given** a voice whose consent is not recorded, **then** it cannot be bound to an agent id.

### R14 — Pairing a phone to our service
A phone pairs with our private service by scanning a code or by typing an address and a short numeric code.
- **Given** a successful pair, **then** the phone stores a session and does **not** store the master credential; revoking the pair ends the session immediately.
- **Given** the service is unreachable, **then** the phone states it is offline and the on-device path remains usable.

### R15 — Access control with independent gates, and a host allow-list
Our service distinguishes **consumption** (synthesis, transcription, listing) from **administration** (settings, engine install, model management). Consumption is reachable with a short share code or
an API key; administration needs a real credential or a genuine local connection. A request that carries no valid credential must also address the service by a name we recognise, so a browser cannot
re-point its own origin at our private address.
- **Given** a short numeric share code, **then** it can never reach an administrative route.
- **Given** an API key, **then** it is compared in constant time and never logged; a valid credential skips the host check (a proxy may forward the original Host), while an unknown Host without a
  credential is refused.
- **Given** the browser session cookie, **then** a state-changing request additionally requires an exact allowed origin and an anti-forgery header, and a side-effecting GET additionally requires
  same-site; a state-changing request from a disallowed origin is refused with a distinct code from an auth failure.
- **Given** repeated failed session exchanges from one client, **then** they are rate limited with a retry hint, but a correct credential is always evaluated and clears the window.

### R16 — A named error taxonomy: degraded is not failed
Every failure mode has a stable class. The UI and the agent both need to distinguish "this will never work" from "this worked but with a fallback".
- **Given** a missing optional capability, **then** the system reports a degraded state with the fallback that was used; a hard failure names the cause (not the internal function) and says what to do
  next.
- **Given** a timeout, **then** the message names the budget that was hit and the duration allowed.
- **Given** the client is offline, **then** the tool layer says so rather than pretending to succeed.

### R17 — Explicit budgets on every long operation
Model loading, synthesis, transcription and download each have a budget. Exceeding it is a named outcome, not a hang.
- **Given** the budget is exceeded, **then** the operation is abandoned cleanly and the partial result (if any) is discarded rather than returned as success.
- **Given** a machine below the accelerator's memory floor, **then** the budget is the slower CPU-class one and the reason is visible in diagnostics.
- **Given** a timeout, **then** the abandoned child process is confirmed gone before a retry can start, so a retry never runs two engines at once.

### R18 — Privacy controls: opt-in analytics, retention, and provenance marking
Analytics is off until the user says yes; the choice is recorded even when we transmit nothing; history retention is bounded; synthetic audio can carry an invisible provenance mark.
- **Given** the user declines analytics, **then** no analytics event is emitted, the app does not pretend the choice was never made, and withdrawing consent cancels an in-flight initialisation.
- **Given** a retention cap, **then** older unstarred items and their files are removed on a schedule, and lowering the cap asks first.
- **Given** the marking model fails to load, **then** generation continues without the mark and the reason is logged once, not on every render; errors reported to analytics are scrubbed of
  credentials, file paths and user text before sending.

### R19 — Cloud sync with an outbox and a cursor
Settings and non-driving state sync through a service with an outbox (one pending change per item), a per-organisation cursor, and a mirror of local storage values.
- **Given** a local change, **then** it is queued once; queueing the same item twice is impossible.
- **Given** a failed push, **then** it is retried with a recorded attempt count and last error.
- **Given** a deletion, **then** it is a tombstone, not an absence, so it propagates.

### R20 — An evaluation harness that is part of the product
The voice squad must be able to measure intelligibility, speaker similarity and naturalness of any engine against a fixed dataset, on a fixed device profile, and publish raw results.
- **Given** a new engine, **then** the same harness runs it and publishes a comparable row.
- **Given** a dataset, **then** the metric definitions and the test-set identity are written down so two runs are comparable.
- **Given** a missing metric implementation, **then** the cell is recorded as UNVERIFIED, never blank or estimated.

### R21 — A canonical feature inventory with drift detection
One machine-readable list of shipped features and engines exists, and CI fails when the documentation and the code disagree.
- **Given** a new engine or user-visible feature, **then** the inventory and the docs change in the same PR, or CI fails.
- **Given** a locale catalogue, **then** every key exists in every locale, or CI fails.

### R22 — One contract across the surfaces we ship
The mobile app and the service implement one generated contract; colours, API descriptions and strings are generated, never hand-copied.
- **Given** a change to the API description, **then** the generated contract is regenerated and a drift test fails if it was not.
- **Given** a string that must differ per platform, **then** it lives in the shared catalogue with a platform override, not duplicated in two code bases.

### R23 — Model downloads are user-initiated and accounted for
Model installation is explicit, resumable, verified, and its disk cost is reported.
- **Given** a model that is not installed, **then** the app offers to install it and shows the size and the licence before starting.
- **Given** a download is interrupted, **then** it resumes and the partial file is not mistaken for a complete one; a checksum mismatch discards the file and restarts the download.
- **Given** a licence that must be accepted first, **then** the acceptance happens on the machine that runs the model, and a paired phone says so instead of failing obscurely.

### R24 — Accelerator selection and memory accounting
The service detects the available accelerator, refuses to start an engine it cannot fit, and reports why.
- **Given** a GPU below the engine's stated memory floor, **then** the UI warns before the user waits, and the engine is budgeted as CPU-class.
- **Given** an unknown or unsupported device, **then** the service still starts on the CPU path.
- **Given** several engines, **then** only one is loaded at a time and its memory is released before the next loads.

---

## 5. What we will not copy (explicit non-goals)

1. **No voice cloning from a driver's own voice without recorded consent.** Our consent lock is a separate, revocable, auditable record. The studied project's consent marker is a behaviour we adopt;
   its storage shape is not.
2. **No dubbing pipeline in v1.** It is a media product, not a courier product. The *job model* (R10) is what we take.
3. **No desktop application.** We ship a phone app, a private service and a web dashboard. R8/R11/R22 are re-shaped, not copied.
4. **No public voice gallery and no marketplace of voices.** We ship our own voices only.
5. **No watermarking of *driver* audio.** R18's marking applies to synthetic audio we generate for evaluation and to any product audio we ship; it never touches a driver's microphone.
6. **No per-agent voice catalogue for third-party clients.** R13 exists to bind our own surfaces (app, dashboard, help bot), not to be a public persona service.

## 6. Licence-safe substitutions for the studied behaviours

| Studied behaviour | Our licence-safe route | Note |
|---|---|---|
| 646-language zero-shot synthesis on a server GPU | **Not shipped.** The only engine that covers our full language list has **CC-BY-NC weights**. | Internal-only use is permitted for evaluation-audio generation; the shipped server path is the Apache-2.0 Qwen3 candidate, benchmarked first. See `docs/research/2026/on-device-stt-tts-vad-kws.md` and `multilingual-voice-i18n.md`. |
| Multilingual on-device speech | `sherpa-onnx` (Apache-2.0) with the Apache-2.0 Kokoro export for Tier A; the MIT Piper voices fill the Arabic/Hindi gap. | Voices only from the archived MIT project; the GPL successor is rejected. |
| Fast neural transcription | `sherpa-onnx` streaming + an MIT-weights Whisper/whisper.cpp fallback; a CC-BY-4.0 Parakeet as the measured server fallback. | Parakeet is commercial-OK (CC-BY-4.0), unlike the NC weights above. |
| Voice design from attributes | Our own attribute vocabulary on top of a permissive engine; where no shipped engine can design a voice, the capability is declared unavailable (R1). | |
| Video dubbing, longform, gallery | Out of scope (v1). | |
| Agent tool surface | `modelcontextprotocol` SDKs (MIT) over **our** tool registry, with our own schema. | The studied project's tool names and shapes are not reused. |

## 7. UNVERIFIED

1. Every figure we did not measure ourselves is UNVERIFIED. In particular: the studied project's claimed real-time factor, memory floor, language-hour totals and per-language quality are **vendor
   claims**.
2. The studied project's own evaluation numbers are computed against *its* test sets, not ours. No conclusion about our WER, speaker-similarity or naturalness can be drawn from them.
3. The licence of every model the studied project can install was not audited individually; we only audited the one that matters to us (the CC-BY-NC weights). The issue tracker was read only for
   recent titles.
4. Whether the studied project's mobile companion runs models on the phone in the released build - the documentation is contradictory (a preview note says device models were planned; a later owner
   note says they are on the phone). **UNVERIFIED**; we did not build or run the apps.
5. Our own eval set (`docs/squads/voice/eval/`) does not exist yet, so none of R20's metrics can be published. Until it does, every voice number in this repository stays UNVERIFIED.

## 8. What users complain about (observed in the studied project's public issue list) and how we do better

| Observed complaint | Our answer |
|---|---|
| The desktop backend dies or the installer fails on ordinary machines | Our phone app has no local server to install; the private service is ours to operate. |
| A GPU is reported as usable, then the first render fails or takes minutes | R17: a stated memory floor, a warning before the wait, and CPU-class budgeting. |
| The first generation is slow because the weights download then | R23: install before you need it; the download is explicit, sized and resumable. |
| Speech sometimes starts with an unwanted word at a chunk boundary | Our synthesis is generated per **whole spoken reply**, not per arbitrary chunk, and the pipeline has a chunking contract test. |
| A voice cannot be saved without a network connection | Our on-device path and the service both work offline; model install is the only networked operation and it is explicit. |
| The shared-network address is unusable from the browser, or the code prompt is not recoverable | R14/R15: one pairing code, one credential exchange, and a host allow-list that fails with a distinct, actionable error. |
| Port conflicts and "backend already running" failures | Our service runs in our own container with a health check and a documented port; the app degrades to on-device. |
| A failed operation leaves an unexplained error | R16: named failure classes, "degraded vs failed", and messages that say what to do. |
| Installing a new model silently consumes gigabytes | R23: size shown before download, disk accounting reported, retention enforced. |
