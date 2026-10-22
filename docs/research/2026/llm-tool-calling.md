# LLM tool-calling & agent orchestration — 2026 OSS research (redone, V4 §13.1)

**Research date: 2026-10-21.** Method: V4 §12 (≥30 candidates with full evidence cards, ≥13 shortlisted, top 5 deep-reviewed, benchmarks only where an eval set exists) + §12.6 anti-bias (challengers tracked even when not adopted). Every number was read from the live GitHub API, PyPI, npm, or the vendor's own documentation on 2026-10-21 unless the card says **UNVERIFIED**. Nothing is estimated and nothing is carried over unread — sprint #1 was wrong about our own dependencies, about MCP's current protocol revision, and about the AI SDK's agent API (§8).

**Card fields:** repo URL · stars + forks · created · last release + date · cadence · 90-day commit + human-maintainer count · open issues · licence (code, and the licence of the *artefact* where it differs) · Expo SDK 58 / RN New Architecture fit · commercial-use verdict for a closed-source app · local vs hosted · why it matters to a courier with one voice command at a time · **DECISION**.

---

## 0. Scope, our current choice, the bar

| Item | Verified 2026-10-21 |
|---|---|
| **Area** | structured outputs, function calling / tool use, tool orchestration, local vs hosted models, MCP, small models on device |
| **Our Python side (already there)** | `services/api/pyproject.toml`: `langgraph>=0.2.60`, **`langgraph-checkpoint>=4.3.0`**, **`litellm>=1.83.0`**, **`anthropic>=0.40`**, `pydantic>=2.7`, `fastapi>=0.115`, Python **`>=3.11,<3.13`** |
| **Our TypeScript side (already there)** | `zod@4.6.7` (MIT) in `packages/shared`, `packages/nz-address`, `packages/design-tokens` and `services/auth` |
| **What is NOT there** | no MCP SDK, no `pydantic-ai`, no Vercel AI SDK, no structured-output library, no on-device LLM runtime, no `services/voice` |
| **Bar** | every app action is a **typed tool** (FINAL_PROMPT §4.5) · voice command → action **≤ 700 ms** · **no `any` in TS app code** · no GPL/AGPL/SSPL/Commons-Clause/CC-NC/FSL/BUSL in the shipped app · the confirmation policy lives **in the tool layer**, not in the prompt · every tool argument validates **before** the tool body runs |
| **NZ reality** | one courier, one command at a time, 1–3 s response, offline half the day, no corpus to ground a RAG on |

**Sprint #1 was wrong about our own stack.** It said *"there is no LLM/tool-calling dependency anywhere in the repo today"*. Read on 2026-10-21: `services/api` already depends on **LangGraph**, **LiteLLM** and the **Anthropic SDK**, and `apps/mobile` has no LLM dependency at all. We are therefore **not choosing a stack from zero** — we are choosing whether to *keep* the one we have and where to put the typed tool catalogue. That changes the decision, and it is the single most important correction in this file.

### 6-month star trend — method note (proxy, as V4 §12.3 permits)

The star *timeline* is 403 with our token (`GET /repos/{o}/{r}/stargazers` → *"Resource not accessible by personal access token"*, same limitation the routing and voice studies hit on 2026-10-21). **Every "stars gained in 6 months" figure is UNVERIFIED.** The proxy used throughout: **releases in the last 6 months · commits in the last 90 days · distinct human maintainers in 90 days** (bot/dependabot excluded), plus **package downloads/month** where a registry exists.

**Two mechanical limits on the numbers below, stated once.** (1) The commits endpoint returns **at most 100 commits per request**, so *"100+ commits/90 d"* means **the window filled a full page** — the true figure is higher — and the **human-maintainer count is the number of distinct non-bot authors in that page**, i.e. a **lower bound**, not a 90-day total. Where the count is below 100 (smolagents 7, outlines 9, letta 9, TypeChat 27) both numbers are exact. (2) `open_issues_count` **includes pull requests**; the issues-only count was not separately sampled for this area (**UNVERIFIED**).

---

## Queries run

`gh` through `scripts\gh.ps1`, plus npm/PyPI registry reads and vendor doc fetches. All on **2026-10-21**.

| # | Query | Result | What it produced |
|---|---|---|---|
| 1 | `gh search repos "llm tool calling function calling"` | 30 | the generic-query dead zone (GitHub ANDs every term) |
| 2 | `gh search repos "topic:agent-framework stars:>50"` | 30 | the framework long tail — see D23–D33 |
| 3 | `gh search repos "topic:model-context-protocol stars:>100"` | 30 | MCP servers 91 407★, inspector 11 108★, plus hundreds of servers |
| 4 | `gh search repos "structured output llm"` | 20 | outlines, instructor, TypeChat, guidance |
| 5 | `gh api repos/{o}/{r}` | 60 repos | stars, forks, created, pushed, license.spdx_id, open_issues_count, archived |
| 6 | `gh api repos/{o}/{r}/releases?per_page=20` | 60 repos | last release + date + releases-in-6-months |
| 7 | `gh api repos/{o}/{r}/commits?sha=<branch>&since=2026-07-23` | 60 repos | 90-day commit count + distinct human authors (bot filtered) |
| 8 | `gh api repos/{o}/{r}/license` | 12 repos | raw licence text where the API said NOASSERTION |
| 9 | `gh api repos/{o}/{r}/git/trees/main?recursive=1` | pipecat | (cross-reference, in the voice file) |
| 10 | `gh api search issues --repo <r> --created ">=2026-01-01"` | 5 repos | real 2026 issues with URLs and dates |
| 11 | `gh api search prs --repo <r> --created ">=2026-09-20"` | 3 repos | real 2026 PRs with URLs and dates |
| 12 | `npm view <pkg> version license time.modified peerDependencies` | 30 packages | the **tarball** licence — the thing we actually ship |
| 13 | `npm view ai time --json` | 1 package | the AI SDK major-version dates (v4 → v7) |
| 14 | `curl https://pypi.org/pypi/<pkg>/json` | 12 packages | version, release date, requires-python |
| 15 | Web fetch: ai-sdk.dev agents overview + tools-and-tool-calling | 2 pages | `ToolLoopAgent`, `toolApproval`, `prepareStep`, `strict`, `repairToolCall`, `activeTools` |
| 16 | Web fetch: modelcontextprotocol.io versioning + 2025-11-25 changelog | 2 pages | **current protocol revision 2026-07-28**, `server/discover`, tasks, tool-calling in sampling |
| 17 | Web fetch: developers.cloudflare.com/agents + voice | 2 pages | the 2026 durable-agent reference, `withVoice`, `withVoiceInput` |
| 18 | Web fetch: platform.openai.com/docs/pricing | 1 page | per-token prices for the cost table |
| 19 | `npm view expo-speech expo-audio` + `npm view <expo-onnxruntime\|expo-llama>` | 6 packages | **there is no Expo SDK 58 module for ONNX Runtime or llama.cpp** |

---

## 1. Candidate pool — 41 cards

**D1 — `vercel/ai` (AI SDK)** ⭐ https://github.com/vercel/ai — **27 417 ★** /5 395 f · created **2023-05-23** · last release **`ai@7.0.146`, 2026-10-20** (**20 of the last 20 releases in 6 m** — multiple releases per day) · pushed 2026-10-20 · **1 380 open issues** · repo licence API **NOASSERTION**; the raw `LICENSE` read 2026-10-21 is **Apache-2.0** ("Licensed under the Apache License, Version 2.0") · npm: **`ai` 7.0.146 Apache-2.0 (2026-10-20)**, `@ai-sdk/provider` 4.0.31, `@ai-sdk/provider-utils` 5.0.64, `@ai-sdk/openai` 4.0.98, `@ai-sdk/anthropic` 4.0.84, `@ai-sdk/gateway` 4.0.119, **`@ai-sdk/mcp` 2.0.80** — all Apache-2.0 · **major cadence from the npm registry: `ai@4.0.0` 2024-11-18 → `ai@5.0.0` 2025-07-31 → `ai@6.0.0` 2025-12-22 → `ai@7.0.0` 2026-06-25** — a major every ~5–6 months · **100+ commits/90 d, 27 humans** · New Arch: **pure TypeScript, no native code → n/a** · **commercial: YES** (Apache-2.0, and the tarball is what we install) · local vs hosted: **hosted only** (it is an SDK, not a runtime).
**Why it matters:** in 2026 the AI SDK stopped being "a function-calling helper" and became an **agent framework**: `ToolLoopAgent` is now the recommended class, `HarnessAgent` runs an established harness (Claude Code, Codex, Pi), and the tool API gained **approval**, **per-tool context**, **dynamic tools** and **repair**. **DECISION: ADOPT (TypeScript side) — but with direct provider packages, never the Vercel AI Gateway, and pinned to an exact minor.**

**D2 — `pydantic/pydantic-ai`** ⭐ https://github.com/pydantic/pydantic-ai — **20 755 ★** /2 972 f · created **2024-06-21** · last release **v2.58.0, 2026-10-20** (20 of 20 in 6 m) · pushed 2026-10-20 · **1 490 open issues** · **MIT** · PyPI `pydantic-ai` 2.58.0 (2026-10-20), `requires-python >=3.11` · **100+ commits/90 d, 10 humans** · majors: **v1.0.0 2025-09-05**, **v2.0.0 2026-06-23** · New Arch n/a (Python) · **commercial: YES** · hosted + local models.
**Why it matters:** the only framework whose **evals grade tool-call trajectories**, not just the final text — which is exactly the metric a courier app needs ("did it call `mark_stop_delivered` with the right stop id, and did it confirm first?"). **DECISION: ADOPT (Python side) — agent loop + evals; ignore the Harness surface we do not need.**

**D3 — `modelcontextprotocol/python-sdk`** ⭐ https://github.com/modelcontextprotocol/python-sdk — **24 623 ★** /4 276 f · created **2024-09-24** · last release **v2.3.0, 2026-10-02** (19 of 20 in 6 m) · pushed 2026-10-17 · **360 open issues** · **MIT** · PyPI `mcp` 2.3.0 (2026-10-02), `requires-python >=3.10` · **100+ commits/90 d, 5 humans** · majors **v1.0.0 2024-11-25**, **v2.0.0 2026-07-28** · **commercial: YES** · the interop transport.
**DECISION: ADOPT (MCP adapter, Python side) — pinned, at the boundary only.**

**D4 — `modelcontextprotocol/typescript-sdk`** ⭐ https://github.com/modelcontextprotocol/typescript-sdk — **13 622 ★** /2 544 f · created **2024-09-24** · last release **v2.3.1, 2026-10-05** (20 of 20 in 6 m) · pushed 2026-10-20 · **600 open issues** · repo licence **NOASSERTION** — the raw file states: *"The MCP project is undergoing a licensing transition from the MIT License to the Apache License, Version 2.0. All new code and specification contributions to the project are l…"* → **the tarball we install is what matters**: npm **`@modelcontextprotocol/sdk` 1.32.1 is MIT (2026-10-05)** and **`@modelcontextprotocol/server` 2.3.1 is Apache-2.0 (2026-10-05)** · **75 commits/90 d, 28 humans** · New Arch: **pure TypeScript → n/a** · **commercial: YES** · **DECISION: ADOPT (MCP adapter, TypeScript side) — keep the two SDKs on the same version.**

**D5 — `modelcontextprotocol/servers`** https://github.com/modelcontextprotocol/servers — **91 407 ★** /11 824 f · created **2024-11-19** · last release **v2.0.0, 2026-10-19** (6 in 6 m) · pushed 2026-10-19 · 136 open issues · licence **NOASSERTION** (same MIT→Apache-2.0 transition) · **100+ commits/90 d but only 1 human** (`cliffhall`) · the reference server collection (filesystem, git, fetch, memory, sequential-thinking …).
**DECISION: KEEP (reference only) — the *collection* is the ecosystem proof; do not ship third-party servers (each has its own licence and its own blast radius).**

**D6 — `modelcontextprotocol/inspector`** https://github.com/modelcontextprotocol/inspector — **11 108 ★** /1 657 f · created **2024-10-03** · last release **2.11.0, 2026-10-14** (20 of 20 in 6 m) · 17 open issues · licence **NOASSERTION** (MIT→Apache-2.0 transition) · npm `@modelcontextprotocol/inspector` 2.11.0 and `@modelcontextprotocol/inspector-client` 1.0.1 both declare **"SEE LICENSE IN LICENSE"** (2026-10-14 / 2026-09-17).
**DECISION: KEEP (dev tooling) — the reference debugger for our MCP adapter; a dev dependency, never in the shipped app.**

**D7 — `openai/openai-agents-python`** https://github.com/openai/openai-agents-python — **30 178 ★** /5 080 f · created **2025-03-11** · last release **v0.24.0, 2026-10-15** (20 of 20 in 6 m) · pushed 2026-10-20 · **23 open issues** (remarkably low) · **MIT** · PyPI `openai-agents` 0.24.0 (2026-10-15) · **100+ commits/90 d, 6 humans** · **commercial: YES** · hosted (OpenAI-first).
**DECISION: WATCH — the reference for handoff and tracing ergonomics; 0.x and vendor-shaped, which is against D12.**

**D8 — `openai/openai-agents-js`** https://github.com/openai/openai-agents-js — **3 930 ★** /990 f · created **2025-05-31** · last release **`@openai/agents` 0.20.0, 2026-10-08** (20 of 20 in 6 m) · **15 open issues** · **MIT** · npm: `@openai/agents` 0.20.0, `@openai/agents-core` 0.20.0, `@openai/agents-openai` 0.20.0, **`@openai/agents-realtime` 0.20.0** — all MIT (2026-10-08) · **100+ commits/90 d, 6 humans** · New Arch: **pure TS → n/a** · the **only** 0.x framework that covers **voice agents** in TypeScript.
**DECISION: WATCH — the TS voice-agent reference; `@openai/agents-core` is the piece a mobile client could take.**

**D9 — `langchain-ai/langgraph`** ⭐ https://github.com/langchain-ai/langgraph — **43 583 ★** /7 444 f · created **2023-08-09** · last release **cli==0.4.37, 2026-10-19** (20 of 20 in 6 m) · pushed 2026-10-20 · **497 open issues** · **MIT** · npm `@langchain/langgraph` 1.5.1 MIT (2026-10-16) · **100+ commits/90 d, 10 humans** · **already ours**: `services/api` has `langgraph>=0.2.60` and **`langgraph-checkpoint>=4.3.0`** · **commercial: YES** · hosted + local models.
**Why it matters:** durable, resumable, **checkpointed** graphs — exactly what a voice session needs when the app is backgrounded on Android, the socket drops, or Doze freezes the process.
**DECISION: KEEP (it is ours) — and it should own the *session* graph; it should not own the tool catalogue.**

**D10 — `microsoft/agent-framework`** https://github.com/microsoft/agent-framework — **14 229 ★** /2 491 f · created **2025-04-28** · last release **python-1.22.0, 2026-10-15** (20 of 20 in 6 m) · pushed 2026-10-20 · **821 open issues** · **MIT** · **100+ commits/90 d, 30 humans** · the successor to AutoGen + Semantic Kernel under one API.
**DECISION: WATCH — the credible vendor-neutral standard; too young (created 2025-04-28) to bet a product on.**

**D11 — `microsoft/autogen`** https://github.com/microsoft/autogen — **61 497 ★** · created 2023-08-18 · pushed 2026-10-16 · **1 121 open issues** · **licence API says `CC-BY-4.0`, and the raw file read 2026-10-21 is "Attribution 4.0 International"** — a **content** licence, not a software licence → **it cannot be a dependency of a closed-source app** (it grants rights to share and adapt the *work* with attribution, not to compile and ship it).
**DECISION: REJECT as a dependency (licence). Its group-chat pattern is study material.**

**D12 — `ag2ai/ag2`** (the Apache-licensed AutoGen fork) https://github.com/ag2ai/ag2 — **5 005 ★** · created 2024-11-11 · pushed 2026-10-20 · 72 open issues · **Apache-2.0** (raw file read 2026-10-21) · the "Open-Source AgentOS".
**DECISION: WATCH — a cleaner licence than upstream, but the same problem D10 has: multi-agent group chat is the wrong shape for one assistant with a fixed catalogue.**

**D13 — `huggingface/smolagents`** https://github.com/huggingface/smolagents — **29 946 ★** /3 114 f · created **2024-12-04** · last release **v1.26.0, 2026-05-29** (**2 in 6 m** — slowing) · pushed 2026-10-06 · **977 open issues** · **Apache-2.0** · PyPI `smolagents` 1.26.0 · **7 commits/90 d, 2 humans** → **the release train has stopped**.
**Why it matters:** *code-as-action* — a tool call is a Python function call, the smallest possible gap between our Python services and the agent. But model-written code needs a sandbox, and **the project is quiet**.
**DECISION: WATCH (the concept only) — the maintenance signal has deteriorated since sprint #1.**

**D14 — `dottxt-ai/outlines`** https://github.com/dottxt-ai/outlines — **15 960 ★** /909 f · created 2023-03-17 · last release **1.3.3, 2026-08-06** (5 in 6 m) · pushed 2026-09-21 · 200 open issues · **Apache-2.0** · PyPI `outlines` 1.3.3 (2026-08-06), `requires-python >=3.10,<3.14` · **9 commits/90 d, 6 humans** · **constrained decoding**: the sampler is *forced* to emit tokens valid under your schema.
**Why it matters:** the strongest guarantee available for tool arguments, but it needs **logits access**, so it only works with a self-hosted model.
**DECISION: WATCH (self-hosting path only) — if we ever host the model ourselves, this is how the arguments become correct by construction.**

**D15 — `567-labs/instructor`** https://github.com/567-labs/instructor — **14 038 ★** /1 327 f · created 2023-06-14 · last release **v1.17.0, 2026-09-09** (4 in 6 m) · pushed 2026-10-20 · 214 open issues · **MIT** · PyPI `instructor` 1.17.0 (2026-09-09) · **100+ commits/90 d, 15 humans** · *validate and retry*: parse the output against a schema, feed the validation error back, retry.
**DECISION: WATCH (the pattern, not the dependency) — retry belongs **off** the ≤ 700 ms hot path, on the batch tasks (address correction, POD review).**

**D16 — `microsoft/TypeChat`** https://github.com/microsoft/TypeChat — **8 693 ★** /436 f · created 2023-06-20 · **no releases** · pushed 2026-10-19 · 45 open issues · **MIT** · **27 commits/90 d, 6 humans** · the *type-schema-as-prompt* idea: a TypeScript type is compiled into a JSON schema and used as the model's response contract.
**DECISION: WATCH (cite, do not depend) — its idea is already the AI SDK's behaviour; and the AI SDK v7 `strict: true` is the modern form of it.**

**D17 — `guidance-ai/guidance`** https://github.com/guidance-ai/guidance — **21 803 ★** /1 218 f · created 2022-11-10 · last release **0.3.2, 2026-03-18** (**0 in 6 m**) · pushed **2026-05-21** · 354 open issues · **MIT** · **0 commits/90 d** → **dormant**.
**DECISION: REJECT (dormant) — a different programming model and a dead repo.**

**D18 — `PrefectHQ/fastmcp`** https://github.com/PrefectHQ/fastmcp — **28 148 ★** /2 491 f · created 2024-11-30 · last release **v4.1.2, 2026-10-20** (20 of 20 in 6 m) · pushed 2026-10-20 · **596 open issues** · **Apache-2.0** · **100+ commits/90 d, 24 humans** · the ergonomic Python MCP server framework. **Note the package split:** PyPI `fastmcp` **4.1.2** (2026-10-20, licence field empty in the PyPI JSON) vs npm `fastmcp` **4.23.4 (MIT, 2026-10-20)** whose `repository.url` points at **`punkpeye/fastmcp`** — **two different projects share the name**; do not assume the npm and PyPI packages are the same codebase.
**DECISION: WATCH — use the official SDK (D3/D4) for longevity and licence clarity; fastmcp only if the official ergonomics are insufficient.**

**D19 — `mcp-use/mcp-use`** https://github.com/mcp-use/mcp-use — **10 790 ★** /1 512 f · created 2025-03-11 · last release **`mcp-use@2.11.1-canary.1`, 2026-10-20** (20 of 20 in 6 m) · pushed 2026-10-20 · 84 open issues · **MIT** · npm `mcp-use` 2.11.0 MIT (2026-10-20) · **100+ commits/90 d, 15 humans** · the MCP **client** side.
**DECISION: WATCH — the MCP client for our mobile/web surfaces, if we ever need one.**

**D20 — `BerriAI/litellm`** ⭐ https://github.com/BerriAI/litellm — **61 655 ★** /12 514 f · created 2023-07-27 · last release **v1.104.4, 2026-10-20** (20 of 20 in 6 m) · pushed 2026-10-20 · **5 535 open issues** · licence API **NOASSERTION**; the raw file read 2026-10-21: *"All content that resides under the `enterprise/` directory of this repository, if that directory exists, is licensed under the license …"* → **a mixed licence: the open core is permissive, `enterprise/` is not** · **100+ commits/90 d, 26 humans** · **already ours**: `services/api` has `litellm>=1.83.0` · **commercial: YES for the open core; the `enterprise/` tree is off-limits** · 100+ LLM APIs behind one interface.
**Why it matters:** it is the cheapest implementation of D12's **free-first → paid fallback chain** and COST_PLAN routing, in one place, with per-model cost tracking.
**DECISION: KEEP (it is ours) — but **never put it on the voice hot path**: it is a proxy hop (latency + a new failure domain) on a path with a ≤ 700 ms budget. Use it for the non-urgent batch work only, and add a CI lint that the voice route does not import it.**

**D21 — `google/adk-python`** https://github.com/google/adk-python — **21 923 ★** /4 413 f · created 2025-04-01 · last release **v2.12.0, 2026-10-13** (20 of 20 in 6 m) · pushed 2026-10-20 · 361 open issues · **Apache-2.0** · **100+ commits/90 d, 45 humans** · npm `@google/adk` 2.3.0 (2026-10-13) · "code-first Python toolkit for building, evaluating, and deploying sophisticated agents" with a **built-in evaluation** story.
**DECISION: WATCH — its eval-first design is the closest to pydantic-ai's evals, and it is Apache-2.0; but it is Google-shaped and Python-only.**

**D22 — `google/adk-js`** https://github.com/google/adk-js — **1 444 ★** · created 2025-08-14 · pushed 2026-10-20 · 77 open issues · **Apache-2.0** · the TypeScript half of ADK.
**DECISION: WATCH — if we take ADK at all, the two halves must be the same version; we would take both or neither.**

**D23 — `agentscope-ai/agentscope`** https://github.com/agentscope-ai/agentscope — **33 549 ★** /3 848 f · created 2024-01-12 · last release **v2.0.10, 2026-10-12** (16 in 6 m) · pushed 2026-10-20 · 652 open issues · **Apache-2.0** · **100+ commits/90 d, 47 humans** · a general agent framework, not tool-calling-specific.
**DECISION: WATCH — broad and busy, but not specialised for the one thing we need.**

**D24 — `mastra-ai/mastra`** https://github.com/mastra-ai/mastra — **28 950 ★** /3 020 f · created 2024-08-06 · last release **`@mastra/core@1.78.0`, 2026-10-16** (20 of 20 in 6 m) · pushed 2026-10-20 · 575 open issues · licence API **NOASSERTION**; the raw file: *"All content that resides under any directory named `ee/` within this repository, including but not limited to: `@mastra/core/…"* → **mixed licence: open core + a proprietary `ee/` tree** · npm **`@mastra/core` 1.78.0 is Apache-2.0 (2026-10-20)** · **100+ commits/90 d, 11 humans** · the strongest modern TypeScript agent framework (workflows, memory, evals, MCP client).
**DECISION: WATCH — the real TS alternative to the AI SDK, and the tarball licence is clear; but `ee/` must stay out of the tree.**

**D25 — `HKUDS/nanobot`** https://github.com/HKUDS/nanobot — **49 217 ★** /8 652 f · **created 2026-02-01** · last release **v0.3.5, 2026-09-15** (7 in 6 m) · pushed 2026-10-20 · 861 open issues · **MIT** · **100+ commits/90 d, 21 humans** · "ultra-lightweight, open-source, self-hosted personal AI agent framework in Python with WebUI".
**DECISION: WATCH — a 2026 challenger (V4 §12.6 requires tracking at least three); MIT and self-hosted, so worth a look when we have a weekend.**

**D26 — `i-am-bee/beeai-framework`** https://github.com/i-am-bee/beeai-framework — **3 437 ★** /564 f · created 2024-08-23 · last release **`typescript_v0.1.31`, 2026-09-28** (9 in 6 m) · pushed 2026-10-19 · **17 open issues** · **Apache-2.0** · **100+ commits/90 d, 34 humans** · the rare project with **both** a Python and a TypeScript implementation of the same framework.
**DECISION: WATCH — the only credible "one framework, two languages" option, which is our exact problem. Worth a spike.**

**D27 — `cloudflare/agents`** ⭐ https://github.com/cloudflare/agents — **5 856 ★** /787 f · created **2025-01-29** · last release **`agents@0.29.0`, 2026-10-20** (20 of 20 in 6 m) · pushed 2026-10-20 · **165 open issues** · **MIT** · npm `agents` 0.29.0 (MIT, 2026-10-20) and **`@cloudflare/voice` 0.5.0 (MIT, 2026-09-11)** · **100+ commits/90 d, 6 humans** · New Arch: the client is browser-oriented (AudioWorklet, `PartySocket`); **there is no React Native client for `@cloudflare/voice`** → **n/a for us today** · **commercial: YES** · **hosted on Cloudflare's edge**, or self-hosted on Workers.
**Why it matters:** the most complete 2026 reference for a **durable agent**: identity, SQLite state, sessions, routing, WebSockets, scheduling, **fibers** (durable execution), and a **voice channel** (`withVoice`, `withVoiceInput`, `useVoiceAgent`, `VoiceClient`) that streams **binary 16 kHz PCM over a WebSocket**, does **model-driven turn detection** ("All providers use model-driven turn detection — the client does not need to signal end-of-speech for STT"), **cancels the current response when the user speaks during playback**, persists the conversation in SQLite, and emits per-turn **`{llm_ms, tts_ms, first_audio_ms, total_ms}`** metrics. Its `withVoiceInput` (STT-only) is described as *"Use this for dictation, search-by-voice"* — **that is our product shape (D2/D9), not a call.** It also ships MCP tools, a sandbox, browser tools, and **Code Mode** ("lets models discover and orchestrate multiple tools by writing code").
**DECISION: WATCH — the best available architectural reference for a durable, resumable agent with voice; not adopt, because there is no React Native client and it puts us inside Cloudflare's runtime.**

**D28 — `letta-ai/letta`** https://github.com/letta-ai/letta — **25 203 ★** /2 650 f · created 2023-10-11 · last release **0.16.8, 2026-05-14** (**1 in 6 m**) · pushed 2026-10-18 · **0 open issues** (issues disabled/moved) · **Apache-2.0** · **9 commits/90 d, 2 humans** · the memory-agent platform (Letta/MemGPT lineage).
**DECISION: WATCH (memory reference) — door memory is a *lookup*, not a memory agent; but the persistence design is worth reading.**

**D29 — `aaif-goose/goose`** https://github.com/aaif-goose/goose — **55 466 ★** /6 464 f · created 2024-08-23 · last release **v1.55.0, 2026-10-16** (20 of 20 in 6 m) · pushed 2026-10-20 · 495 open issues · **Apache-2.0** · **100+ commits/90 d, 29 humans** · a local MCP client with a provider-agnostic agent.
**DECISION: WATCH — it is the reference "MCP as the tool transport" implementation; we use the SDK, not the client.**

**D30 — `OpenHands/OpenHands`** https://github.com/OpenHands/OpenHands — **91 379 ★** /12 124 f · created 2024-03-13 · last release **v1.28.1, 2026-10-19** (20 of 20 in 6 m) · pushed 2026-10-20 · **1 080 open issues** · **MIT** · the coding-agent platform.
**DECISION: WATCH (agent-loop reference) — a coding agent's loop and sandbox are a good study; we do not ship it.**

**D31 — `Aider-AI/aider`** https://github.com/Aider-AI/aider — **49 662 ★** /5 087 f · created 2023-05-09 · last release **v0.86.0, 2025-08-09** · pushed 2026-05-22 · **1 937 open issues** · **Apache-2.0** · **0 commits/90 d** → **dormant**.
**DECISION: REJECT (stale) — the most-cited repo-linter of the 2024 wave and it stopped shipping in 2025.**

**D32 — `crewAIInc/crewAI`** https://github.com/crewAIInc/crewAI — **59 918 ★** · created 2023-10-27 · pushed 2026-10-20 · 778 open issues · **MIT** · role-playing multi-agent orchestration.
**DECISION: REJECT — "a crew of agents" is the wrong shape for one assistant with a fixed catalogue; it invites nondeterminism we cannot afford while driving.**

**D33 — `run-llama/llama_index`** https://github.com/run-llama/llama_index — **52 581 ★** · created 2022-11-02 · pushed 2026-10-20 · **1 001 open issues** · **MIT** · a document/RAG platform.
**DECISION: REJECT — we have no document corpus; RAG over our own app actions is not the problem to solve.**

**D34 — `microsoft/semantic-kernel`** https://github.com/microsoft/semantic-kernel — **28 678 ★** /4 832 f · created 2023-02-27 · pushed 2026-10-20 · 379 open issues · **MIT** · now largely superseded inside Microsoft by D10.
**DECISION: WATCH (legacy position) — if we go Microsoft, take agent-framework.**

**D35 — `colinhacks/zod`** ⭐ https://github.com/colinhacks/zod — **44 164 ★** · created 2020-03-07 · pushed 2026-10-19 · 93 open issues · **MIT** (raw file read 2026-10-21: *"MIT License / Copyright (c) 2025 Colin McDonnell"*) · npm **`zod` 4.6.7, MIT, modified 2026-10-12** · New Arch: **pure TS → n/a** · **commercial: YES** · **already ours** in four workspaces.
**DECISION: KEEP (already ours) — the single TypeScript schema source of truth. We will not add a second validation library.**

**D36 — `ggml-org/llama.cpp`** https://github.com/ggml-org/llama.cpp — **131 824 ★** /2 562 open issues · created 2023-03-10 · pushed 2026-10-20 · **MIT** · the reference local LLM runtime (CPU/GPU, GGUF, quantisation, Android/iOS builds).
**DECISION: WATCH (on-device runtime) — the reference implementation, not a React Native dependency.**

**D37 — `microsoft/onnxruntime`** https://github.com/microsoft/onnxruntime — **22 121 ★** /1 819 open issues · created 2018-11-10 · pushed 2026-10-20 · **MIT** · npm `onnxruntime-web` 1.30.0 MIT (2026-09-18), `onnxruntime-react-native` 1.24.3 MIT (2026-07-16).
**DECISION: WATCH (on-device runtime) — and the only one with a maintained React Native binding today.**

**D38 — `google-ai-edge/mediapipe`** https://github.com/google-ai-edge/mediapipe — **37 344 ★** /333 open issues · created 2019-06-13 · pushed 2026-10-20 · **Apache-2.0** · the on-device inference stack (Tasks, LLM Inference).
**DECISION: WATCH — on-device inference reference; the RN story is weak.**

**D39 — `google-ai-edge/LiteRT-LM`** https://github.com/google-ai-edge/LiteRT-LM — **6 698 ★** /716 open issues · created 2025-04-14 · pushed 2026-10-20 · **Apache-2.0** · the successor to MediaPipe LLM Inference.
**DECISION: WATCH — the modern on-device LLM runtime; still no Expo SDK 58 module.**

**D40 — `google-ai-edge/LiteRT`** https://github.com/google-ai-edge/LiteRT — **3 506 ★** /3 165 open issues · created 2024-09-04 · pushed 2026-10-20 · **Apache-2.0** · the LiteRT runtime itself.
**DECISION: WATCH — pairs with D39.**

**D41 — `mlc-ai/mlc-llm`** https://github.com/mlc-ai/mlc-llm — **23 260 ★** /359 open issues · created 2023-04-29 · pushed 2026-10-06 · **Apache-2.0** · the TVM/MLC compilation path to on-device LLMs.
**DECISION: WATCH — a compiler path, not a dependency.**

**D42 — `pytorch/executorch`** https://github.com/pytorch/executorch — **5 107 ★** /1 332 open issues · created 2022-02-25 · pushed 2026-10-20 · licence API **NOASSERTION** (the tree is a mix of BSD-3 and others) · the reference on-device runtime, and the only one with a **React Native binding**: npm **`react-native-executorch` 0.10.6, MIT, modified 2026-10-20**, repo `software-mansion/react-native-executorch` (1 768★, raw licence read 2026-10-21: *"MIT License / Copyright (c) 2024 Software Mansion"*).
**DECISION: WATCH — the most realistic on-device LLM path for a React Native app in 2026. Still to be measured against the ≤ 8 %/h battery budget and the 80 MB APK budget.**

**D43 — the small-model families (grouped)** — `huggingface/smollm` **3 928 ★** Apache-2.0 pushed 2026-10-06 (the small-model recipe + weights) · `QwenLM/Qwen3` **27 680 ★**, licence blank in the API (README says Apache-2.0 for most sizes — **UNVERIFIED per checkpoint**), pushed 2026-01-09 · `lmstudio-ai/lms` **5 365 ★** MIT pushed 2026-10-14 · `huggingface/transformers.js` **16 355 ★** Apache-2.0 pushed 2026-10-20 (npm `@huggingface/transformers` 4.3.1 Apache-2.0, 2026-10-06) · `meta-llama/llama-models` **7 708 ★** NOASSERTION pushed 2026-02-11 (the Llama weights have their own community licence — **UNVERIFIED**) · `huggingface/trl` **19 557 ★** Apache-2.0 pushed 2026-10-20.
**DECISION: WATCH (group) — the model families are the fuel; the licence of each *checkpoint* is what ADR-004's ledger must record.**

**D44 — the 2026 challenger cohort (grouped)** — `google-gemini/gemini-cli` **107 469 ★** Apache-2.0 pushed 2026-10-20 754 open · `anthropics/claude-code` **152 897 ★** licence blank in the API (mixed, **UNVERIFIED**), pushed 2026-10-19 **15 425 open** · `openai/codex` **130 403 ★** Apache-2.0 pushed 2026-10-20 **23 708 open** · `RightNow-AI/openfang` **18 213 ★** Apache-2.0 pushed 2026-07-02 (stalled) · `aden-hive/hive` **11 113 ★** Apache-2.0 pushed 2026-10-19 **1 091 open** · `omnigent-ai/omnigent` **10 931 ★** Apache-2.0 pushed 2026-10-20 **2 313 open** · `microsoft/agent-governance-toolkit` **6 455 ★** MIT pushed 2026-10-20 (created 2026-03-02) · `crestalnetwork/intentkit` **6 522 ★** MIT pushed 2026-09-16 · `Upsonic/Upsonic` **7 959 ★** MIT pushed **2026-06-18** (stale) · `eigent-ai/eigent` **15 620 ★** Apache-2.0 pushed 2026-10-20 · `rllm-org/rllm` **5 890 ★** Apache-2.0 pushed 2026-10-16 · `evalstate/fast-agent` **3 943 ★** Apache-2.0 pushed 2026-10-20 · `crmne/ruby_llm` **4 474 ★** MIT pushed 2026-10-20.
**DECISION: WATCH (group) — §12.6 requires tracking at least three challengers even when we adopt none. `agent-governance-toolkit` is the interesting one: "every tool call has a policy attached" is our confirmation policy, and Microsoft shipping it is a signal.**

**D45 — `openai/openai-python`** https://github.com/openai/openai-python — **31 892 ★** · pushed 2026-10-20 · 147 open issues · **Apache-2.0** · the raw client (npm `openai` 7.39.0 Apache-2.0, 2026-10-19).
**DECISION: WATCH (reference) — we already call Anthropic from `services/api`; a second vendor SDK on the hot path is cost without benefit until D12's provider switch exists.**

**D46 — `anthropics/anthropic-sdk-python` / `-typescript`** https://github.com/anthropics/anthropic-sdk-python (**3 982 ★**, MIT, pushed 2026-10-15, 212 open) and https://github.com/anthropics/anthropic-sdk-typescript (**2 145 ★**, MIT, pushed 2026-10-15, 95 open) · **already ours**: `services/api` has `anthropic>=0.40`.
**DECISION: KEEP (already ours) — our current hot-path provider client.**

**D47 — `openai/openai-agents-js` + `openai/openai-agents-python` realtime** — covered in D7/D8. The npm `@openai/agents-realtime@0.20.0` (MIT, 2026-10-08) is the TypeScript realtime surface; note the 2026 OpenAI Realtime protocol is the same wire format `speech-to-speech` speaks (voice file, C3).
**DECISION: WATCH (protocol reference) — do not couple the product to a 0.x vendor SDK.**

---

## 2. Shortlist (13) and decisions

| # | Project | Decision | One-line reason |
|---|---|---|---|
| D9 / D20 | **langchain-ai/langgraph · BerriAI/litellm** | **KEEP (already ours)** | LangGraph owns the **resumable session graph** (checkpointed, survives Doze and a dropped socket) and LiteLLM owns **off-hot-path provider routing** — but LiteLLM must never sit between the voice service and the model. |
| D35 | **colinhacks/zod** | **KEEP (already ours)** | MIT, 4.6.7, already in four workspaces; the single TypeScript schema source of truth. No second validation library. |
| D1 | **vercel/ai (AI SDK)** | **ADOPT (TypeScript side)** | v7 gives us `ToolLoopAgent`, **`toolApproval`** (our confirmation policy, in code), `contextSchema` per tool, `strict` tool calling, `prepareStep` compaction, `onToolExecutionEnd` with `toolExecutionMs`, `repairToolCall`, `activeTools` — and the npm tarball is Apache-2.0. |
| D2 | **pydantic/pydantic-ai** | **ADOPT (Python side)** | MIT, daily releases, and the only framework whose **evals score tool-call trajectories** — the metric that actually measures "did it confirm before it cancelled the stop?". |
| D3 / D4 | **MCP python-sdk · typescript-sdk** | **ADOPT (adapter only)** | The 2026 standard (current revision **2026-07-28**), MIT/Apache-2.0 tarballs, first-class in LiveKit, Pipecat and Cloudflare. **At the boundary, never as our internal architecture.** |
| D46 | **Anthropic SDKs** | **KEEP (already ours)** | Our hot-path provider client today. |
| D27 | **cloudflare/agents** | **WATCH (the reference)** | The best 2026 model of a durable agent: state, sessions, fibers, MCP tools, and a voice channel whose `withVoiceInput` is **dictation** — our shape. No React Native client, though. |
| D14 / D15 | **dottxt-ai/outlines · 567-labs/instructor** | **WATCH (the pattern)** | Constrained decoding makes invalid tool arguments impossible, but **only with logits access** (i.e. only if we host the model); validate-and-retry works anywhere but **belongs off** the ≤ 700 ms hot path, on the batch tasks. |
| D26 | **i-am-bee/beeai-framework** | **WATCH (spike)** | The only credible **one framework, Python + TypeScript** — our exact two-language problem. |
| D42 | **react-native-executorch (+ D37 onnxruntime-react-native)** | **WATCH (on-device)** | The only realistic on-device LLM path in React Native today; a native module, so **New Architecture support is UNVERIFIED**. |
| D24 | **mastra-ai/mastra** | **WATCH** | The strongest TypeScript alternative to the AI SDK; the `@mastra/core` tarball is Apache-2.0 but the repo has a proprietary `ee/` tree. |
| D10 / D11 / D12 | **microsoft agent-framework · autogen · ag2** | **WATCH / REJECT** | agent-framework is credible but young; **autogen is CC-BY-4.0 and cannot be a dependency**; ag2 is the Apache fork. |
| D13 / D14 / D16 / D17 / D21 / D22 / D23 / D25 / D28–D34 | **smolagents · adk · agentscope · nanobot · letta · goose · OpenHands · TypeChat · guidance · crewAI · llama_index · semantic-kernel · aider** | **WATCH / REJECT** | Useful references; none is the right *shape* for one assistant with a fixed catalogue on a ≤ 700 ms budget. **crewAI and llama_index are REJECT**; **guidance and aider are dormant**; TypeChat's idea is now `strict: true`. |

---

## 3. Deep review — top 5 (code, commits, PRs and issues opened in 2026)

### 3.1 The Vercel AI SDK (D1) — **adopt, on the TypeScript side**

**Read from the official docs, fetched 2026-10-21** (`ai-sdk.dev/docs/agents/overview` and `/docs/ai-sdk-core/tools-and-tool-calling`):

- **The agent class.** *"The `ToolLoopAgent` class handles these three components"* — LLM, tools, and a loop with **context management** and **stopping conditions**. *"The `ToolLoopAgent` is the recommended approach."* A second class, **`HarnessAgent`**, *"lets you run a preconfigured established harness, such as Claude Code, Codex, or Pi"*, and harnesses "stream into AI SDK-compatible result and UI primitives". `generateText`/`streamText` remain for explicit step control.
- **State vs context.** `runtimeContext` = shared server-side state (tenant, flags, session) available in `prepareStep` and lifecycle callbacks; **`toolsContext`** = per-tool values, *"each tool receives only its own typed `context` value based on its `contextSchema`"*. This is the shape of our **scoped permissions**: a `mark_stop_delivered` tool and a `cancel_stop` tool get different capabilities without leaking keys into the prompt.
- **The confirmation policy lives in code.** `toolApproval` replaces the deprecated `needsApproval` and takes a per-tool map or a `GenericToolApprovalFunction` that receives `{toolCall, tools, toolsContext, messages, runtimeContext}` and returns `'not-applicable' | 'approved' | 'denied' | 'user-approval'`. A `SingleToolApprovalFunction` receives the tool input and can decide on the *arguments*: *"The `amount` > 1000 → 'user-approval'"*. **This is exactly FINAL_PROMPT §4.5's "confirmation enforced in the tool layer, not in the prompt" — implemented by the framework.**
- **Strict tool calling.** `strict: true` per tool: *"language models that support strict tool calling will only generate tool calls that are valid according to your defined `inputSchema`."* Only Anthropic supports `inputExamples` natively.
- **Error taxonomy.** `NoSuchToolError`, `InvalidToolInputError`, `ToolCallRepairError`, `ToolChoiceViolationError`; a failing tool becomes a **`tool-error` content part** so the multi-step loop can self-correct.
- **Repair.** `repairToolCall` can re-ask the model, or use a **structured-output model** to regenerate the arguments.
- **Loop control.** `stopWhen: isStepCount(5)` / `hasToolCall(...)` / `isLoopFinished()`; `prepareStep` can swap the model, force `toolChoice`, restrict `activeTools`, and **compact the messages** (`pruneMessages`, with the docs' own 100 000-token threshold example).
- **Observability.** `onToolExecutionStart` / `onToolExecutionEnd` deliver **`toolExecutionMs`** — the number our benchmark needs. `telemetry.includeToolsContext` opts selected context keys into telemetry.
- **Concurrency.** Tools run **concurrently** by default; `toolCallConcurrency: 1` makes them sequential *"when later calls need to observe side effects from earlier calls"* — the ordering guarantee our "cancel then reschedule" flow needs.
- **Security note.** `experimental_sandbox` *"does not sandbox the tool itself. Tool code still runs wherever your application runs"* — the SDK forwards the object and does not isolate it.

**Cadence.** `ai@7.0.146` published 2026-10-20; **20 of the last 20 releases in 6 months**; **100+ commits/90 d from 27 humans**. The major-version dates from the npm registry: **v4 2024-11-18 → v5 2025-07-31 → v6 2025-12-22 → v7 2026-06-25** — a major every ~5–6 months, which is the churn risk.

**Real 2026 issues:** **#23605** (2026-10-20, open) *"`@ai-sdk/amazon-bedrock`: Claude 5 models can't use strict tools or nati…"* — **strict mode is not universal**, so our "arguments are always valid" claim must not rest on it https://github.com/vercel/ai/issues/23605 · **#23608** (2026-10-20, open) *"WorkflowAgent emits no tool-call telemetry inside a workflow (model ca…"* — **the observability we would rely on is not universal** https://github.com/vercel/ai/issues/23608 · **#23610** (2026-10-20, open) *"`@ai-sdk/workflow@2.0.73`: WorkflowAgent.stream() drops `openai.compactio…`"* https://github.com/vercel/ai/issues/23610 · **#23573** (2026-10-19, open) *"realtime: WebRTC for OpenAI's turn-based realtime models, so browser s…"* — **the SDK's own realtime path is still being built**, so it is not our voice transport https://github.com/vercel/ai/issues/23573 · **#23611** (2026-10-20, open) *"docs: add Agent Pulse to the observability integrations"* https://github.com/vercel/ai/issues/23611.

**Real 2026 PRs:** **#23607** (2026-10-20, open) *"fix(amazon-bedrock): enable native structured output and strict to…"* https://github.com/vercel/ai/pull/23607 · **#23606** (2026-10-20, open) *"feat(tools-registry): add precleared…"* — **a pre-cleared tool registry is precisely our "unknown tool names are rejected before dispatch" rule** https://github.com/vercel/ai/pull/23606 · **#23604** (2026-10-20, open) *"fix(anthropic): sum cache read and write tokens across compaction"* — **cache accounting across a compaction is exactly the number our cost model needs** https://github.com/vercel/ai/pull/23604 · **#23613** (2026-10-20, merged) *"feat(harness-opencode): add support for image input"* https://github.com/vercel/ai/pull/23613.

**Verdict: ADOPT.** It is the best-documented typed tool-calling layer in TypeScript, the tarball is Apache-2.0, and its `toolApproval` mechanism is our confirmation policy in code. **Two constraints: install provider packages directly and never enable the Vercel AI Gateway** (it would sit on our data path and our cost plan), and **pin an exact minor** because the major cadence is ~5 months.

### 3.2 pydantic-ai (D2) — **adopt, on the Python side**

**Read:** MIT; v2.58.0 (2026-10-20); **1 490 open issues** — the largest count in the pool and the real cost of a daily release train; **100+ commits/90 d from 10 humans**; PyPI 2.58.0 with `requires-python >=3.11` (our floor is `>=3.11,<3.13` — compatible). The two features that decide it are unchanged from sprint #1 and still true: **Pydantic Evals grade "an agent's final outputs *and tool-call trajectories*, on datasets *or live production traffic*"**, and the **Harness** capabilities cover memory, **guardrails**, sub-agents, planning, context management/compaction and persistence — with **Logfire instrumentation in plain OpenTelemetry** (so we are not locked to a vendor backend).

**Real 2026 issues (2026-10-20, all open):** **#10696** *"UI adapters: per-tool visibility so server-side tool results don't rea…"* — **tool results leaking back to the user**; in a voice app that is the difference between "marked delivered" and a silent failure https://github.com/pydantic/pydantic-ai/issues/10696 · **#10697** *"`BedrockConverseModel` refuses native structured output for Claude Hai…"* — **a provider refuses native structured output**, so our "the platform guarantees valid arguments" assumption is provider-dependent https://github.com/pydantic/pydantic-ai/issues/10697 · **#10702** *"`BedrockConverseModel` sends no `maxTokens` for Claude, so Bedrock cuts Cl…"* — **the provider truncates the answer**, which for a voice turn means a cut-off command https://github.com/pydantic/pydantic-ai/issues/10702 · **#10700** *"`prefer_inlined_defs` still leaves dangling `$ref`s under `propertyName`…"* — **a schema-generation defect that would break a JSON-schema consumer of our catalogue** (i.e. our own MCP adapter) https://github.com/pydantic/pydantic-ai/issues/10700 · **#10713** *"Bedrock GLM native output forwards unsupported `contains` and can time…"* https://github.com/pydantic/pydantic-ai/issues/10713 · **#10705** *"harness shell: background job log can read itself and grow without bou…"* — **an unbounded log** in the sandbox shell https://github.com/pydantic/pydantic-ai/issues/10705.

**Verdict: ADOPT** — the agent loop, the guardrails capability, and above all the **trajectory scoring**, which is the only way to measure "did it confirm before it cancelled the stop?". **Take only the agent loop + evals + guardrails; ignore the Harness and the coding-agent features** — the 1 490-issue tracker is a maintenance surface we do not need to inherit.

### 3.3 MCP (D3 + D4) — **adopt as an adapter, and correct the spec version**

**The protocol is further along than sprint #1 said.** From `modelcontextprotocol.io/specification/versioning` (fetched 2026-10-21): *"The **current** protocol version is **2026-07-28**"*, with **Draft / Current / Final** revision states, a **feature deprecation policy** (deprecated features stay for at least 12 months, or 90 days under the expedited-exception), and a new negotiation model: *"Every request declares the protocol version it is using via the `io.modelcontextprotocol/protocolVersion` key in its `_meta` field … On Streamable HTTP, the same value is also carried in the `MCP-Protocol-Version` header … the server accepts or rejects each request independently"* plus a new **`server/discover`** RPC *"that returns the server's supported protocol versions, capabilities, and identity in a single request"*. Sprint #1's framing — *"v2 is a breaking generation"* — described the **2025-11-25** revision; the current one is newer and the negotiation is now per-request, which is *better* for us (a stale client gets a version error, not a silent mismatch).

**What the 2025-11-25 changelog added** (the revision before current) and what still applies:
- **Tool calling in sampling** (`tools` + `toolChoice` on `sampling/createMessage`) — SEP-1577.
- **Experimental tasks** — *"to enable tracking durable requests with polling and deferred result retrieval"* (SEP-1686). **This is the durable-request primitive our voice service would want**: a tool call that outlives the HTTP request.
- **Input validation errors must be returned as Tool Execution Errors, not Protocol Errors, "to enable model self-correction"** (SEP-1303) — our error-shape rule should follow the spec.
- **JSON Schema 2020-12 is the default dialect** (SEP-1613) — so our zod schemas must emit 2020-12.
- URL-mode elicitation (SEP-1036), OIDC discovery, OAuth Client ID Metadata Documents, per-language thresholds.

**The licence is in flux and we must read the tarball, not the repo.** The TS SDK, the servers repo and the inspector all carry a licence file that begins: *"The MCP project is undergoing a licensing transition from the MIT License to the Apache License, Version 2.0."* The **npm tarballs we would install are unambiguous today**: `@modelcontextprotocol/sdk` 1.32.1 **MIT** (2026-10-05) and `@modelcontextprotocol/server` 2.3.1 **Apache-2.0** (2026-10-05); the Python SDK is **MIT**.

**Real 2026 issues (python-sdk):** **#3725** (2026-10-17, open) *"Bare `dict` / `list` / `tuple` return annotations silently produce no …"* — **a tool with an un-annotated return type silently produces nothing**, which is a silent-failure mode in a voice app https://github.com/modelcontextprotocol/python-sdk/issues/3725 · **#3729** (2026-10-18, open) *"OAuth token expiry equality boundary causes intermittent downstream te…"* — an **intermittent** failure, the worst kind to reproduce in a van https://github.com/modelcontextprotocol/python-sdk/issues/3729 · **#3713** (2026-10-14, open) *"ClientSessionGroup leaves old tools after disconnecting a re-registered…"* — **stale tools surviving a reconnect**, which is exactly how a courier ends up calling a tool that no longer exists https://github.com/modelcontextprotocol/python-sdk/issues/3713 · **#3718** (2026-10-16, closed) *"Align Skills extension with updated spec (2026-07-28): directory cachi…"* — **independent confirmation that the current spec revision is 2026-07-28** https://github.com/modelcontextprotocol/python-sdk/issues/3718 · **#3714** (2026-10-14, open) *"`stdio_client` with strict decoding withholds fatal read errors until pe…"* — a fatal read error is withheld, i.e. the client does not know the server died https://github.com/modelcontextprotocol/python-sdk/issues/3714.

**Verdict: ADOPT as an adapter.** The catalogue stays in our own schema (zod on the TS side, Pydantic on the Python side); MCP is a boundary. **Pin both SDKs to the same version, pin the protocol revision we implement (2026-07-28), and add an MCP conformance test that our adapter speaks the revision we claim.**

### 3.4 Cloudflare Agents (D27) — **the 2026 reference for a durable agent with voice**

**Read from the official docs, fetched 2026-10-21** (page last updated 2026-09-18; voice page 2026-09-15):

- **Four parts.** Communication channels (chat, **voice**, email, Slack, webhooks) · the agent harness (*"Controls planning, tool use, and response flow"* — Project Think, or build your own) · the Agents SDK runtime (durable identity, state, sessions, routing, WebSockets, scheduling, **fibers** = durable execution) · tools (browser, sandbox, AI Search, **MCP**, payments, **Code Mode** — *"lets models discover and orchestrate multiple tools by writing code"*).
- **The voice channel** (`@cloudflare/voice` 0.5.0, MIT): `withVoice` (full), `withVoiceInput` (**STT-only**), `useVoiceAgent` / `useVoiceInput` (React hooks), `VoiceClient` (framework-agnostic). Audio streams as **binary 16 kHz mono 16-bit PCM WebSocket frames**; TTS audio streams back; the transcript is persisted in **SQLite on the Durable Object**, and *"History survives Durable Object restarts and client reconnections. Voice agents use `keepAlive` to prevent eviction during active calls."*
- **Turn detection:** *"The STT model detects when the user finishes an utterance and fires `onUtterance`. All providers use **model-driven turn detection** — the client does not need to signal end-of-speech for STT."* — i.e. **the turn decision lives in the model, not in a client-side VAD**, which is a different architecture from ours (we put it on the device).
- **Interruption:** *"user speech during playback cancels the current response"*, and the server hook `onInterrupt(connection)` fires.
- **Client-side barge-in detection** (this is the part we care about): `silenceThreshold` 0.04 (RMS), `silenceDurationMs` 500, `interruptThreshold` 0.05, `interruptChunks` 2.
- **Metrics:** `metricschange` emits `{llm_ms, tts_ms, first_audio_ms, total_ms}` per turn.
- **Pipeline hooks:** `afterTranscribe` / `beforeSynthesize` / `afterSynthesize` — **each can skip the utterance**, which is how you implement "do not speak the door code" or "never read the customer's name aloud".
- **A real constraint we would hit:** *"WorkersAITTS returns MP3, which cannot be decoded to PCM in the Workers runtime"* — telephony therefore needs a PCM TTS. Our own mobile playback has the same shape of problem.
- **Telephony:** Twilio/Plivo are server-side adapters (8 kHz μlaw ↔ 16 kHz PCM); Telnyx is a browser WebRTC bridge.

**Real 2026 issues (2026-10-16→2026-10-20, all open unless stated):** **#2625** *"PiHarness retries a session forever when its turn exceeds the Durable …"* — **an unbounded retry against a durable object**, the classic way to burn money https://github.com/cloudflare/agents/issues/2625 · **#2605** *"Agent.destroy() leaves the Durable Object behind in production: delete…"* — **state that outlives the session**, i.e. a privacy problem under the NZ Privacy Act 2020 https://github.com/cloudflare/agents/issues/2605 · **#2607** *"`ctx.facets.clone()` of a Think facet comes back empty in production (…"* https://github.com/cloudflare/agents/issues/2607 · **#2606** *"A facet's reconnect replay sends one root RPC per stored chunk, and fa…"* — **a reconnect storm** https://github.com/cloudflare/agents/issues/2606 · **#2608** *"Think keeps an agent-tool child's starting messages (its pre-turn base…"* https://github.com/cloudflare/agents/issues/2608 · **#2597** *"codemode: preserve JSON Schema validation constraints in generated JSD…"* — **Code Mode dropping schema constraints**, i.e. a tool whose JSON Schema is weakened in transit https://github.com/cloudflare/agents/issues/2597 · **#2596** *"codemode: `openApiMcpServer` search deep-clones every resolved `$ref`…"* https://github.com/cloudflare/agents/issues/2596 · **#2613** (2026-10-19, closed) *"Alarm memory-limit breaker (#1825) never trips after a DO memory-limit…"* https://github.com/cloudflare/agents/issues/2613.

**Verdict: WATCH, and copy three things:** (a) **`withVoiceInput` — STT-only dictation** — is our product shape (D2/D9: the screen is optional, the voice is the interface); (b) the **pipeline hooks** (`afterTranscribe` / `beforeSynthesize` / `afterSynthesize`) are the right place for our privacy and safety rules; (c) the **per-turn metric set** (`llm_ms`, `tts_ms`, `first_audio_ms`, `total_ms`). **Do not adopt:** there is no React Native client, and it puts the whole product inside Cloudflare's runtime, which is the opposite of D12's "our own tools first, vendor fallback second".

### 3.5 LangGraph + LiteLLM (D9 + D20) — **keep, and fix their roles**

**LangGraph.** MIT, 43 583★, **100+ commits/90 d from 10 humans**, `@langchain/langgraph` 1.5.1 (MIT, 2026-10-16). **We already depend on it** (`langgraph>=0.2.60` plus `langgraph-checkpoint>=4.3.0` — the checkpoint package is the durable-execution half). Its value for us is specific: a courier's voice session must survive the app being backgrounded, the socket dropping, or Android Doze freezing the process. A checkpointed graph is the mechanism; a stateless `while True:` loop in a FastAPI handler is not. The related package `langchain-ai/langchain` (148 131★, MIT) is the integration catalogue — we do not need it.

**LiteLLM.** MIT-style open core with a **proprietary `enterprise/` directory** (raw licence file read 2026-10-21) — **the `enterprise/` tree must never enter our dependency tree**; `docs/product/LICENSES.md` must record that. 61 655★, **20 of 20 releases in 6 months**, **100+ commits/90 d from 26 humans**, **5 535 open issues** (the largest count here). It gives us D12's **free-first → paid fallback chain** and per-model cost tracking in one place. **The problem is placement:** LiteLLM is a **proxy hop** — it adds latency and a new failure domain to a path with a ≤ 700 ms budget and a "never blocks driving" rule. It also means a second place where driver data can be routed.

**The role fix (this is the decision this file actually makes):**
- **LangGraph owns the *session graph*:** intake → intent → tool dispatch → confirmation → action → spoken result, with a checkpoint per step so a dropped connection resumes rather than restarts.
- **LiteLLM owns the *non-urgent* provider routing:** address correction, POD review, the nightly summary, the cost reports.
- **The voice hot path does not import LiteLLM.** It calls the Anthropic SDK (which we already have) directly, with our own fallback chain in our own code — a one-line switch, per D12.
- **A CI lint enforces it**: the voice route's module graph must not reach `litellm`. This is a check, not a convention.

**Real 2026 evidence for the "role fix":** pydantic-ai **#10702** (provider truncation) and **#10697** (provider refusing native structured output) show that *provider behaviour is the dominant source of tool-call failure*, not the framework — which argues for our own thin provider layer where we can pin the model and the fallback in one place. And LiteLLM's own **5 535 open issues** argue against putting it on the hot path.

---

## 4. Benchmark (V4 §12.5) — **UNVERIFIED: no eval set exists**

**I did not run a benchmark and I will not invent one.** `packages/eval/voice/` does not exist; `docs/squads/voice/benchmarks/` contains only a `README.md` (checked 2026-10-21). There is **no** tool-calling eval set, no tool-call trace corpus, and no harness. Every number below is either a **vendor price** (verified) or **our own labelled assumption**.

### 4.1 The comparison table

| | **Our stack today (LangGraph + Anthropic SDK)** | **pydantic-ai + AI SDK** | **Cloudflare Agents** | **MCP as the boundary** | **On-device (ExecuTorch / ONNX Runtime)** |
|---|---|---|---|---|---|
| **Time from end of speech to the first audio** | **UNVERIFIED.** The tool round trip is the unknown: STT → graph step → model → tool → model → TTS. Our budget is ≤ 700 ms for command→action. **No measurement exists.** | **UNVERIFIED.** Same shape, plus a framework hop. pydantic-ai's `onToolExecutionEnd` gives `toolExecutionMs`, which is the first number we could publish | **UNVERIFIED.** Cloudflare publishes the *metric* (`llm_ms`, `tts_ms`, `first_audio_ms`, `total_ms`) but not a value for our workload | **UNVERIFIED.** MCP adds a hop over the wire (stdio in-process, or Streamable HTTP between our service and the tool host) — **in-process stdio has no network cost; Streamable HTTP adds a round trip we must budget** | **UNVERIFIED.** A 0.6–4 B model on device avoids the network round trip entirely but is CPU-bound; the phone cost is battery, not latency — and the **≤ 8 %/h** budget is the real constraint |
| **Barge-in / interruption behaviour** | Not a property of the tool layer. **The tool layer's contribution is that an interrupted turn must not have executed a tool** → the confirmation gate is the mechanism | Same, plus `toolApproval` gives a natural place to **cancel a pending approval when the courier interrupts** | The `onInterrupt` hook + `abortSignal` on the LLM call is the cleanest cancellation model in this study | n/a — MCP is not in the audio path | n/a |
| **On-device vs hosted split** | **Hosted model, hosted service.** `services/api` calls Anthropic directly | **Hosted** by default; pydantic-ai can point at any local OpenAI-compatible endpoint | **Hosted** on Cloudflare's edge, or self-hosted on Workers | n/a (a protocol) | **Fully on-device.** The only candidate that keeps working with the network down — and the only one with a React Native path (`react-native-executorch` 0.10.6, MIT) |
| **Cost per courier-day** | **Derived below (§4.3).** ≈ **$0.02–$0.05 / courier-day** at 40 commands/shift on a small hosted model, **if** the tool schemas are cached | Same unit economics; the AI SDK's provider packages are direct calls, so no gateway tax | LiveKit-style edge metering does not apply; Cloudflare Workers + Workers AI pricing was **not fetched** — **UNVERIFIED** | **$0** for stdio; **UNVERIFIED** for Streamable HTTP (hosting + egress) | **$0** marginal money; the cost is **battery** and **APK bytes** (the ≤ 80 MB budget) |
| **Offline behaviour** | **Poor as designed.** The model is remote, so the assistant cannot answer offline. The **graph** can still be checkpointed and the tool can still run locally, but the *intent* needs the model | Same | Same | n/a | **The only candidate that answers offline.** A 0.6–4 B model that classifies intent and emits a tool call, with the action executed locally by our own code |
| **Failure mode when the network drops mid-turn** | The model call fails → the graph must not leave the turn half-executed. **LangGraph's checkpoint is the mitigation**: the run is checkpointed and resumable, so a retry continues rather than restarting. **Our own rule: a tool must never be marked irreversible before its call is confirmed** | Same, plus pydantic-ai's tool-error content parts let the loop self-correct | The Durable Object holds the state; the WebSocket drops and the client reconnects — Cloudflare issue **#2606** shows a reconnect replay can storm, and **#2625** shows a harness that retries forever | The MCP client can be stdio (in-process, unaffected by the network) or Streamable HTTP (affected) | **Unaffected.** The model is local; only the *optional* remote tools (customer notification, address lookup against LINZ) fail, and the graph must degrade to "I could not reach that service" rather than "I could not understand you" |

### 4.2 The set that must be built first

1. **`packages/eval/voice/` — the utterance set** (≥ 500 utterances; quotas as in the voice file) with **six extra fields for tool calling**: `intent_gold`, `tool_gold`, `args_gold`, `slots_missing`, `confirm_required`, `code_switch` — plus `noise` / `snr_db`.
2. **`packages/eval/voice/tools/` — a ≥ 200-case tool-calling subset** covering exactly the failures that matter to a courier: self-correction ("seventeen — no, seventy" → the *corrected* value) · ambiguity ("the next one" with two matches → **must ask, not guess**) · partial address ("take it to Riccarton" → resolve via LINZ or ask one question) · numbers as words and digits ("seventeen" / "17" / "one seven" / "1-7") · **destructive action without confirmation** ("cancel that stop" → must confirm) · wrong-tool pressure ("mark it delivered *and* reschedule it to tomorrow" → two tools, right order, one confirmation) · **out-of-catalogue request** ("email the customer" → must refuse, not invent a tool).
3. **`docs/squads/voice/benchmarks/tools/` — the harness.** Same device profile as the voice benchmarks. Per case: predicted tool, predicted args, pass/fail per metric, and **the recorded (tool, args, result) sequence** — the trajectory trace that makes *"did it confirm first?"* measurable.

| Metric | Definition | Target | Note |
|---|---|---|---|
| Tool selection accuracy | the right tool was chosen | **≥ 97 %** | aligns with the squad's intent-accuracy target |
| Argument exact match | `args_gold` deep-equals the emitted arguments | **≥ 95 %** (proposed; **UNVERIFIED target**) | needs squad sign-off |
| Argument schema validity | arguments validate against the zod / Pydantic schema **on the first attempt** | **≥ 99 %** | the AI SDK's `strict` mode helps only where the provider supports it (issue #23605) |
| Self-correction handling | the *corrected* value is used | **≥ 95 %** (proposed) | |
| Clarification rate | asks when a required slot is missing | **100 %** of the `slots_missing` cases | **no guessing** |
| **Confirmation compliance** | every `confirm_required` action is confirmed before it executes | **100 % — a hard gate** | enforced in the tool layer, benchmarked, not prompted |
| Out-of-catalogue refusal | refuses rather than inventing a tool | **100 %** | `NoSuchToolError` + a strict allow-list at the registry |
| Command → action latency | utterance → tool executed | **≤ 700 ms** | the hot path |
| Retry rate | how often validate-and-retry fires | reported; **must not push p95 past 700 ms** | retries belong off the hot path |
| Trajectory conformance | the tool sequence matches `trajectory_gold` (including the confirm-before-mutate order) | **100 %** | the metric pydantic-ai's evals can score |
| Tool-schema cache hit rate | the tool definitions are served from the provider's prompt cache | reported | drives the cost in §4.3 |

**First benchmark to run:** the 200-case tool subset through (a) **our current stack** (LangGraph + Anthropic SDK, tools defined in Pydantic), (b) **pydantic-ai** with the same tool definitions, (c) **the AI SDK** with the same tool definitions, and (d) **the same catalogue served over MCP (stdio + Streamable HTTP)** to prove the adapter is transparent. Nothing is declared the winner before that table exists.

### 4.3 Cost per courier-day — the real inputs and a worked derivation

**Verified unit prices** (platform.openai.com/docs/pricing, fetched 2026-10-21, per 1 M tokens, short context):

| Model | Input | Cached input | Output |
|---|---|---|---|
| `gpt-6-luna` | $0.10 | $0.01 | $0.50 |
| `gpt-5.4-nano` | $0.20 | $0.02 | $1.25 |
| `gpt-5-nano` | $0.05 | $0.005 | $0.40 |
| `gpt-4o-mini` | $0.15 | $0.075 | $0.60 |
| `gpt-5-mini` | $0.25 | $0.025 | $2.00 |

**Our assumptions (labelled, not vendor figures):** 40 voice commands per shift · **30 tools** in the catalogue × **120 tokens** of JSON schema each = **3 600 tokens** of tool definitions · 800 tokens of system prompt · 200 tokens of conversation · a tool call is ~60 tokens of JSON + ~30 tokens of spoken confirmation ≈ **90 output tokens** · **2 model round trips** per command (the tool call, then the spoken result) · the tool definitions are **prompt-cached** after the first call (every listed model has a cached-input price at 10 % of standard).

**Worked derivation for `gpt-6-luna`:**
- Input per call: 3 600 (schemas, cached) + 800 (system, cached) + 200 (conversation) = 4 600 tokens → cached at $0.01/1M = **$0.000046**
- Output per call: 90 tokens × $0.50/1M = **$0.000045**
- Per model round trip: **≈ $0.000091**; two round trips per command: **≈ $0.00018**
- 40 commands per shift: **≈ $0.0073 per courier-day**
- With the first call of the shift uncached (+4 600 tokens at $0.10/1M = $0.00046) and a 20 % retry allowance: **≈ $0.01 per courier-day**

**The same derivation on `gpt-5.4-nano`** (input $0.20, cached $0.02, output $1.25): ≈ $0.00103 per round trip → **≈ $0.08 per courier-day**. **On `gpt-5-nano`**: ≈ $0.00023 per round trip → **≈ $0.018 per courier-day**.

**What this means for the cost plan.** At 40 commands a shift, **the tool-calling layer costs between one cent and eight cents per courier-day** on a small hosted model — **and essentially nothing on an on-device model**. That reframes the whole area: **the money in the voice product is the audio (STT/TTS minutes, see the voice file §4.3) and the model's reasoning budget, not the tool catalogue.** The reason to keep the tool catalogue small and typed is therefore *reliability*, not cost.

**Costs we could not price (UNVERIFIED):** Anthropic's per-token prices (not fetched — `services/api` uses `anthropic>=0.40`, so this is the number that actually matters to us); the provider-side **prompt-cache hit price for Anthropic**; Cloudflare Workers + Workers AI metering; the cost of hosting our own MCP server (compute + egress); and the **API-call cost of the tool implementations themselves** (our API, our database).

---

## 5. What we are missing → rows for `docs/status/PARITY.md`

The CEO merges these. Every **Spoke (2026-10-20)** cell below is taken only from `docs/study/spoke/TEARDOWN.md` (read 2026-10-21); where the teardown does not establish the fact, the cell is left empty. Nothing is asserted about Spoke that the teardown does not carry.

| # | Family | Feature | Status | Spoke (2026-10-20) | Our edge | Task |
|---|---|---|---|---|---|---|
| L1 | Driver tools | **Every app action as a typed tool the assistant can call** (mark delivered, reorder, reschedule, add stop, cancel stop, read the door note) | gap - no assistant in any Spoke public source, so no tool layer | | one catalogue, one schema, one allow-list; the spoken word is the command | T7.5, T7.6 |
| L2 | Driver tools | **A confirmation gate before an irreversible action** ("cancel that stop", "reschedule to tomorrow") | gap - no assistant in any Spoke public source | | the gate is in the tool layer, not in the prompt; 100 % compliance is a hard benchmark gate | T7.2, T7.5 |
| L3 | Driver tools | **A refusal path** for a request that is not in the catalogue ("email the customer") | gap - no assistant in any Spoke public source | | the assistant says it cannot, instead of inventing a tool | T7.5 |
| L4 | Driver tools | **Clarification instead of guessing** when a required slot is missing ("the next one" with two matching stops) | gap - Spoke has no voice control of the route | | D8: the assistant corrects addresses itself and asks only when unsure | T7.2, T7.4 |
| L5 | Stop import | **Voice add stop with a correction report** ("you said X, corrected Y") | match - Spoke shipped bulk voice dictation 2026-04-22 and flags addresses that look incorrect, remembering the address format for next time | | we correct, explain, and never guess a street number | T7.4 |
| L6 | Stop import | **An NZ-specific address engine behind the tools** | gap - Spoke geocodes with Google Maps; its fix for missing addresses is UK-only extended search | | LINZ data, te reo, RD/unit parsing, confidence and explanation | T4 |
| L7 | Optimisation | **Natural-language constraints as tools** ("pharmacy after 2pm", "make this the last stop") | match - Spoke has arrival time windows and First/Auto/Last priority per stop | | the rule is remembered across days and spoken in plain language | T7.2 |
| L8 | Optimisation | **A tool that re-optimises without blocking driving** | match - Spoke separates Update route from Reoptimise route | | one spoken command; the driver never waits | T7.2 |
| L9 | Reliability | **A voice action that survives a dropped connection** (the tool run is checkpointed and resumes, it does not half-execute) | gap - Spoke's saved route works offline; its offline POD and stop edits are undocumented | | LangGraph checkpoints + an offline tool path that executes locally | T7.1 |
| L10 | Reliability | **No irreversible action before the confirmation lands** | gap - no assistant in any Spoke public source | | the tool marks the action as reversible until the confirmation is recorded | T7.1, T7.5 |
| L11 | Support | **A help-centre agent grounded in our own documentation** | match - Spoke has in-app help and live chat support | | multilingual, grounded in our docs, private to the courier | T7.12 |
| L12 | Dispatch | **A dispatcher tool the courier can invoke by voice** (skip optimisation, reverse, group, make-next) | match - Spoke's dispatcher has skip optimisation, reverse route and make-next | | the same control, spoken, and it never blocks driving | T7.14 |
| L13 | Customer | **A spoken customer-notification tool** (optional, off by default, rate-limited) | match - Spoke has no SMS/email/ETA on the solo plan; Dispatch has ETA and SMS | | D5: optional, opt-in by the courier | T7.10 |
| L14 | Compliance | **An audit log of every tool call** (who asked, what was called, what was confirmed, what was executed) | match - Spoke retains data history (30 d / 1 y / 5 y) on Dispatch; no tool-level audit log is documented | | the same log, for a solo courier, in our own storage | T7.15 |
| L15 | Compliance | **A licence ledger that covers the model weights, not only the code** | gap - not documented in any Spoke public source | | ADR-004's rule made mechanical: an engine with an unknown licence is unavailable, with the reason | T7.15 |
| L16 | Cost | **A tool-calling layer whose cost does not scale with shift length** | gap - Spoke charges a subscription (Free / Lite $9.99 / Standard $19.99) | | cents per courier-day on a small model, or $0 on device | T7.13 |
| L17 | Cost | **A free-first → paid fallback chain that we own** | gap - not documented in any Spoke public source | | D12: the chain is in our code, one config line, and a provider may never train on driver data | T7.13 |

---

## 6. Decision

1. **KEEP LangGraph as the session graph.** It is already ours (`langgraph>=0.2.60` + `langgraph-checkpoint>=4.3.0`), MIT, and a checkpointed graph is the only mechanism we have for a voice session that survives an app switch, a dropped socket or Doze. **The graph owns the *session*; it does not own the tool catalogue.**
2. **KEEP LiteLLM, but move it off the voice hot path.** It is already ours and it is the cheapest implementation of D12's free-first → paid fallback chain, but it is a proxy hop on a ≤ 700 ms path. **Rule: the voice route calls the Anthropic SDK directly; LiteLLM serves the batch work (address correction, POD review, nightly summary). Enforce it with a CI module-graph lint, not a convention.**
3. **ADOPT the Vercel AI SDK (v7) for the TypeScript side**, with **direct provider packages and never the Vercel AI Gateway**. Take `ToolLoopAgent`, `toolApproval` (our confirmation policy, in code), `contextSchema` per tool (scoped permissions without keys in the prompt), `activeTools` (only the relevant tools are visible), `prepareStep` compaction, `onToolExecutionEnd` (`toolExecutionMs`), and `repairToolCall`. **Pin an exact minor** — the major cadence is ~5 months.
4. **ADOPT `pydantic-ai` for the Python side**, but **only the agent loop, the guardrails capability and the evals**. The trajectory-scoring evals are the decisive feature: they measure *"did it confirm before it cancelled the stop?"*, which is our only real correctness metric.
5. **ADOPT MCP as an adapter over our catalogue, never as our architecture.** Implement the **2026-07-28** revision; pin both SDKs to the same version (`@modelcontextprotocol/sdk` MIT, `mcp` MIT); serve the catalogue over **stdio (in-process, no network cost)** for our own agent and over **Streamable HTTP** for anything remote. **Our internal tool definitions stay in our own schema** — zod on the TS side, Pydantic on the Python side — and CI asserts that the generated schema hashes match on both sides.
6. **KEEP `zod@4.6.7` as the single TypeScript schema source of truth** and **generate** the Pydantic models from the same definitions. No second validation library.
7. **ADOPT the validation-at-the-boundary pattern**: every tool argument validates against its schema **before** the tool body runs; unknown tool names are rejected at the registry; the confirmation policy is enforced in the tool layer; and **validate-and-retry lives off the ≤ 700 ms hot path** (batch tasks only). **Constrained decoding (Outlines) is the self-hosted path only.**
8. **DO NOT ADOPT `microsoft/autogen`** — the repository licence is **CC-BY-4.0**, a content licence, not a software licence; it cannot be a dependency of a closed-source app.

**Fallback chain.** If the AI SDK's v7 API churn breaks us: our tools are already behind our own `ToolRunner` interface (V4 §6.1), so we can fall back to `pydantic-ai` on the Python side and to plain `generateText` with hand-written tool dispatch on the TypeScript side. If LiteLLM misroutes a call on the hot path, we bypass it and call the provider SDK directly. If MCP's protocol revision moves, we pin and we still have the catalogue in our own schema.

---

## 7. Risks

| Risk | Severity | Mitigation / fallback |
|---|---|---|
| **The AI SDK ships a major every ~5–6 months** (v4 2024-11-18 → v5 2025-07-31 → v6 2025-12-22 → v7 2026-06-25) | **High** | Pin an exact minor; keep every framework behind our own `ToolRunner` interface; the tool *definitions* live in our schema, so a framework change cannot change our catalogue |
| **Strict tool calling is not universal** (vercel/ai #23605) and **a provider can refuse native structured output** (pydantic-ai #10697) or **truncate the answer** (#10702) | **High** | Validate at the boundary ourselves, in our own code, for every tool — do not rely on a provider guarantee. This is exactly why the catalogue validates before the body runs |
| **A provider silently truncates a tool call** | **High** | Our schema validation rejects it; `InvalidToolInputError` → the loop self-corrects; a rejected call **never** executes |
| **Stale tools survive a reconnect** (MCP #3713) → the courier calls a tool that no longer exists | **High** | The registry is the allow-list and is rebuilt per session; MCP is an adapter, so our registry is authoritative |
| **A tool error surfaces as silence** (pydantic-ai #10696; Cloudflare's `afterTranscribe` pattern) | **High** | Every tool failure must produce a spoken outcome; the assistant never goes quiet after a request. This is a benchmark case, not a nicety |
| **Durable state that outlives the session** (Cloudflare #2605) → a privacy problem under the NZ Privacy Act 2020 | Medium | Our own event log with the 30-day PII purge (PARITY row 49); Durable-Object-style state is not adopted |
| **An unbounded retry against a durable object** (Cloudflare #2625) | Medium | A capped retry in our graph; a hard ceiling on attempts per turn, asserted in the harness |
| **LiteLLM on the hot path** adds latency, a failure domain, and a second place driver data can go | Medium | CI module-graph lint: the voice route must not import LiteLLM |
| **Our tool catalogue drifts between Python and TypeScript** | Medium | One source of truth (zod in `packages/shared`), generate the Pydantic models, assert the schema hashes in CI |
| **LiteLLM's `enterprise/` tree and Mastra's `ee/` tree are proprietary** | Medium | `docs/product/LICENSES.md` records both; the CI licence gate rejects them; we install the open core only |
| **`microsoft/autogen` is CC-BY-4.0** | Medium | Rejected as a dependency; recorded so nobody re-proposes it |
| **MCP is mid licence-transition (MIT → Apache-2.0)** | Low–Medium | We ship the npm/PyPI **tarballs**, whose licences are MIT today; re-check the tarball licence at each upgrade, not the repo badge |
| **The MCP protocol revision moves under us** (current: 2026-07-28) | Medium | Pin the revision we implement; `server/discover` lets us negotiate per request; a conformance test asserts our adapter speaks the revision we claim |
| **pydantic-ai's 1 490 open issues** | Medium | Adopt only the agent loop + evals + guardrails; ignore the Harness |
| **On-device models**: no Expo SDK 58 module for ONNX Runtime or llama.cpp exists; `react-native-executorch` is a native module with **UNVERIFIED New Architecture support** | Medium | v1 is hosted; the on-device path is a tracked experiment gated on a measured battery figure (≤ 8 %/h) and an APK budget (≤ 80 MB) |
| **Tool-call ids longer than 32 characters** break the Realtime protocol (see the voice file, speech-to-speech #695) | Low | Our tool ids are generated and capped at 32 characters; asserted in CI |

---

## 8. What changed against the previous sprint

| Claim (2026-10-20) | Verified 2026-10-21 | Correction |
|---|---|---|
| "Our current choice: **none**. There is no LLM/tool-calling dependency anywhere in the repo today" | `services/api/pyproject.toml` has **`langgraph>=0.2.60`**, **`langgraph-checkpoint>=4.3.0`**, **`litellm>=1.83.0`**, **`anthropic>=0.40`**; `zod@4.6.7` is in four workspaces | **Wrong by an order of magnitude.** We are not choosing from zero — we are keeping LangGraph + LiteLLM and placing the tool catalogue. Sprint #1's "ADOPT LangGraph → WATCH" was a recommendation to adopt something we already run |
| "MCP v2 is a breaking generation" (python-sdk v2.0.0, 2026-07-28) | The **current** MCP protocol revision is **2026-07-28**, and the negotiation model changed: the version travels **per request** (`_meta` key + `MCP-Protocol-Version` header on Streamable HTTP), plus a new **`server/discover`** RPC and a **feature-deprecation policy** | The version is right, the *consequence* is wrong: the 2026 revision is **per-request negotiated**, so a stale client gets a version error instead of a silent mismatch. That is safer for us, not riskier |
| "ADOPT `vercel/ai` (TypeScript side) … `generateText`/`streamText`" | v7 makes **`ToolLoopAgent` the recommended class**, adds **`toolApproval`** (the confirmation policy, in code), **`contextSchema`** per tool, **`strict`** tool calling, **`prepareStep`** compaction, **`repairToolCall`**, **`activeTools`**, and **`onToolExecutionEnd` → `toolExecutionMs`** | The API we would have built against no longer exists. `toolApproval` is a **material upgrade** for our confirmation policy and was not in sprint #1's plan |
| "ADOPT MCP as an adapter … the interop layer for our typed tool catalogue" | Confirmed — and the spec adds **tool calling in sampling** (SEP-1577), **experimental tasks** for durable requests (SEP-1686), **URL-mode elicitation** (SEP-1036), and a rule that **input-validation errors must be Tool Execution Errors, not Protocol Errors**, "to enable model self-correction" (SEP-1303) | Confirmed and **strengthened**. The tasks primitive is what a long-running tool needs |
| "MCP: MIT" (typescript-sdk) | The repo licence is **NOASSERTION** — the file states the project *"is undergoing a licensing transition from the MIT License to the Apache License, Version 2.0"*. The **npm tarballs** are unambiguous: `@modelcontextprotocol/sdk` **MIT**, `@modelcontextprotocol/server` **Apache-2.0** | Read the **tarball**, not the repo badge. Where the transition lands is **UNVERIFIED** |
| "LiteLLM … licence 'Other' (needs reading — it may include an Apache core plus an enterprise section)" | Confirmed exactly: *"All content that resides under the `enterprise/` directory of this repository … is licensed under the license …"* | Confirmed; `enterprise/` must stay out of our tree |
| "mastra-ai/mastra … licence UNVERIFIED" | The raw file: *"All content that resides under any directory named `ee/` within this repository, including but not limited to: `@mastra/core/…"*. The **npm tarball** `@mastra/core@1.78.0` is **Apache-2.0** (2026-10-20) | Same shape as LiteLLM; the shipped tarball is permissive |
| "`microsoft/autogen` — GitHub reports CC-BY-4.0; the raw licence was not read" | The raw file **is** the Creative Commons Attribution 4.0 text | Confirmed, and now decisive: **a content licence, not a software licence → cannot be a dependency.** REJECT, not WATCH |
| "huggingface/smolagents — release cadence has slowed" | Last release **v1.26.0, 2026-05-29**; **7 commits/90 d, 2 humans** | Confirmed and worse than stated. Demote to "the concept only" |
| "guidance-ai/guidance — WATCH (a different programming model)" | Last release **0.3.2, 2026-03-18**; **0 commits/90 d**; last push 2026-05-21 | **Dormant.** REJECT |
| "`Aider-AI/aider`" (not in sprint #1's list) | Last release **v0.86.0, 2025-08-09**; **0 commits/90 d**; 1 937 open issues | **Dormant** — add to the reject list so the radar does not keep it |
| "No on-device LLM runtime" (implicit) | Confirmed, and now precise: **there is no Expo SDK 58 module for ONNX Runtime or llama.cpp** (`expo-onnxruntime` and `expo-llama` are **not on npm**). The only maintained RN binding is **`react-native-executorch` 0.10.6 (MIT, 2026-10-20)** | The on-device path is a **native module we must vet for New Architecture**, not an Expo module |
| "Cloudflare Agents" (not in sprint #1's list) | `agents` 0.29.0 (MIT) + `@cloudflare/voice` 0.5.0 (MIT); a **voice channel** whose `withVoiceInput` is **dictation** and whose pipeline hooks (`afterTranscribe` / `beforeSynthesize` / `afterSynthesize`) are where privacy rules belong | The most useful 2026 reference we did not have. WATCH, with three things to copy |
| "AI SDK v5" | v5 (2025-07-31) → v6 (2025-12-22) → **v7 (2026-06-25)**; `ai@7.0.146` on 2026-10-20 | Two majors since sprint #1. **Pin an exact minor.** |
| "zod@4.6.7 in `packages/shared`" | Confirmed, and zod is also in `packages/nz-address`, `packages/design-tokens` and `services/auth` | Four workspaces, not one — the schema source of truth is already repo-wide |

---

## 9. Monthly radar filter

Run on the **first working day of each month** against `scripts\gh.ps1`; record the result in `docs/log/2026-W43.md`.

| Trigger | Threshold | Action |
|---|---|---|
| **A new AI SDK major** | `ai@8.0.0` on npm | re-read the agents + tools docs; the `ToolLoopAgent` / `toolApproval` surface is the thing we depend on — a rename or a semantic change is a **Decision** event |
| **A new MCP protocol revision** | `modelcontextprotocol.io/specification/versioning` | diff the changelog against our pinned revision (2026-07-28); if the revision is **Current → Final** and we are behind, bump the pin and re-run the conformance test |
| **An MCP licence change completes** | the SDK/servers/inspector `LICENSE` files | re-read; if MIT → Apache-2.0 lands, update `docs/product/LICENSES.md` (both are acceptable) |
| **Silence** | ≥ 45 days with 0 commits on `main` for a shortlisted project | demote to ARCHIVE-WATCH. Sprint #1 left `aider` (0 commits/90 d), `guidance` (0) and `smolagents` (7) on the list; they are gone now |
| **A new model family with a commercial licence** | Hugging Face model cards for the families we list | record the licence of the **checkpoint**, not the repo (ADR-004's rule) |
| **Provider pricing changes** | platform.openai.com/docs/pricing, the Anthropic pricing page | re-derive §4.3; the whole point of the free-first chain is that the chain can move |
| **A tool-calling framework ships trajectory evals** | anywhere | adopt its dataset format so our scores are comparable |
| **Expo SDK 58 gains an on-device LLM module** | `expo/expo` releases | re-gate the on-device decision — this is the single change that would move the hot path off the network |
| **A 2026 entrant crosses 1 000★** | `topic:agent-framework`, `topic:mcp` | read the licence **first**, then the code; add a card (§12.6) |
| **An agent framework ships a policy/approval primitive** | anywhere | compare it with the AI SDK's `toolApproval` and Microsoft's `agent-governance-toolkit` (D44) — our confirmation policy must stay ours, not a vendor's |

---

## 10. What we could not verify

1. **6-month star trend for every candidate** — the star *timeline* is 403 with our token; all counts are the 2026-10-21 snapshot. The proxies (releases/6 m, commits/90 d, humans/90 d) are stated per card.
2. **Median issue response time and closed-issue ratio** — not sampled for this area; only open-issue counts were read (and they include PRs). **UNVERIFIED.**
3. **Our own tool-call accuracy, argument exact-match rate, confirmation-compliance rate, refusal rate, retry rate and command→action latency** — **UNVERIFIED**. No eval set, no tool subset, no harness exists (`packages/eval/voice/` is absent; `docs/squads/voice/benchmarks/` has only a README).
4. **The cost figures in §4.3** — the **unit prices are verified** (platform.openai.com/docs/pricing, fetched 2026-10-21). The **tool count (30), tokens per schema (120), system prompt (800), commands per shift (40), round trips per command (2) and the prompt-cache assumption are our own** and are labelled as such. The derived cents-per-courier-day figures are arithmetic on those assumptions, not measurements.
5. **Anthropic's per-token prices and its prompt-cache pricing** — **not fetched**. `services/api` uses `anthropic>=0.40`, so this is the price that actually matters to us. **UNVERIFIED.**
6. **Cloudflare Workers + Workers AI metering**, and the cost of hosting our own MCP server (compute + egress) — **UNVERIFIED.**
7. **New Architecture / Expo SDK 58 support** for `react-native-executorch@0.10.6`, `onnxruntime-react-native@1.24.3`, and the MCP/AI SDK packages — the npm packages are pure TypeScript (**n/a**); the native ones are **UNVERIFIED** until we build them. **There is no Expo SDK 58 module for ONNX Runtime or llama.cpp** — we checked `expo-onnxruntime` and `expo-llama` on npm and **neither package exists**.
8. **The AI SDK's `strict` support per provider** — the docs say it is provider-dependent and ignore it where unsupported; issue #23605 shows a concrete gap. The full support matrix is **UNVERIFIED**.
9. **Whether the AI SDK v7 `toolApproval` flow costs an extra model round trip** — the docs state that a manual approval "requires two calls to the model". **The latency cost of that second call is UNVERIFIED** and matters directly to our ≤ 700 ms budget.
10. **pydantic-ai's evals: whether they can score *our* trajectories** — the README claims trajectory grading; **the exact dataset/trace schema was not verified in code**. **UNVERIFIED.**
11. **The MIT → Apache-2.0 MCP licence transition**: the tarballs we would install are unambiguous today (`@modelcontextprotocol/sdk` MIT, `@modelcontextprotocol/server` Apache-2.0, `mcp` MIT). **Where the transition lands is UNVERIFIED.**
12. **The licence of `microsoft/autogen`'s code** — GitHub's `license` endpoint reports **CC-BY-4.0** and the raw file is the Creative Commons Attribution 4.0 text. Whether the project also ships separately-licensed code in subdirectories was **not enumerated**. **UNVERIFIED** — and moot, because we reject it either way.
13. **`anthropics/claude-code`'s licence** — the GitHub API reports **blank** (mixed). **UNVERIFIED.**
14. **The weight licences of `QwenLM/Qwen3` (per checkpoint) and `meta-llama/llama-models`** — **UNVERIFIED**; the repositories do not expose a clean SPDX id. ADR-004's ledger must record each checkpoint we actually ship.
15. **`react-native-executorch`'s repo licence** — the API says NOASSERTION and the raw file reads "MIT License / Copyright (c) 2024 Software Mansion"; **whether the vendored ExecuTorch C++ in that repo carries different terms was not audited.** **UNVERIFIED.**
16. **`PrefectHQ/fastmcp` (PyPI) and `punkpeye/fastmcp` (npm) share the name `fastmcp` but are different projects** — the npm package's `repository.url` points at `punkpeye/fastmcp`. We did not read the second repo's licence. **UNVERIFIED.**
17. **`@modelcontextprotocol/inspector` and `inspector-client` declare "SEE LICENSE IN LICENSE"** on npm — the licence *file* in the repo is the MIT→Apache-2.0 transition notice. We treat it as a dev-only dependency, so the risk is contained, but the tarball licence is **UNVERIFIED.**
18. **Download volumes for the npm packages** — not sampled (the routing study sampled downloads because PyPI/pypistats exposed them; npm's download API was not queried for this area). **UNVERIFIED.**
19. **Whether `fast-agent`, `Upsonic`, `ruby_llm`, `rllm`, `eigent` and `intentkit` are actually usable or are demos** — the 2026 challenger cohort was screened on licence and cadence only; their code was **not read**. **UNVERIFIED.**
20. **Corrected by the verifier pass of 2026-10-21 (VERIFICATION-A/B/D.md): 0 cards corrected.** Every card the verifier sampled in this file (7 of 41) passed; the open-issue figures are `open_issues_count` and include pull requests (item 2).
