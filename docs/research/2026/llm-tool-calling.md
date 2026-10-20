# LLM tool-calling & agent orchestration — 2026 research

**Area:** V4 §3 "LLM tool-calling/agent orchestration" · FINAL_PROMPT §4.5 ("every app action available as a typed tool") · V4 §12
**Research date:** 2026-10-20 · **Role:** Researcher · **Squad:** Voice (+ Platform)
**Our current choice:** **none.** There is no LLM/tool-calling dependency anywhere in the repo today (read 2026-10-20): `apps/mobile/package.json`, `apps/api/pyproject.toml`, `services/auth/package.json` and `packages/shared/package.json` contain no agent SDK. The only relevant existing dependency is **`zod@4.6.7`** in `packages/shared` (MIT, `colinhacks/zod`).
**Our stack shape (this drives every recommendation):**
* `apps/api` — **Python** (`pyproject.toml`, mypy/ruff) · `services/worker` — **Python** · `services/auth` — **TypeScript** (vitest) · `packages/shared` — **TypeScript + zod** · `apps/mobile` — Expo SDK 58 / RN 0.88 / TypeScript.
→ **Any tool catalogue must be expressible in both TypeScript and Python, and must validate at the boundary.** This is the single most important constraint in this area.
**Tooling:** `scripts\gh.ps1` (GitHub CLI, token read from `.env.local` and never printed), npm registry, repo/release/commit APIs.

---

## Queries run

All run from the repo root on 2026-10-20.

1. `gh search repos "llm tool calling function calling" --sort stars --limit 30`
2. `gh search repos "topic:agent-framework stars:>50" --sort stars --limit 30`
3. `gh search repos "topic:model-context-protocol stars:>100" --sort stars --limit 30`
4. `gh search repos "structured output llm" --sort stars --limit 20`
5. `gh api repos/<owner>/<repo>` — stars, license, created_at, pushed_at, open_issues_count, forks, archived for every repo below
6. `gh api repos/<owner>/<repo>/releases?per_page=3` — last release + cadence
7. `gh api repos/<owner>/<repo>/commits?per_page=20` — 90-day maintainer activity
8. `gh api repos/<owner>/<repo>/readme` — README for the deep review
9. `gh api repos/<owner>/<repo>/license` — raw licence text where GitHub reported NOASSERTION
10. `npm view <pkg> version license time.modified repository.url` — `ai`, `@ai-sdk/openai`, `@openai/agents`, `@openai/agents-core`, `@modelcontextprotocol/sdk`, `zod`, `@effect/schema`

---

## Candidate evidence cards

**1. modelcontextprotocol/python-sdk** — https://github.com/modelcontextprotocol/python-sdk
★24,624 · created 2024-09-24 · last release **v2.3.0 (2026-10-02)** · cadence (10-02 / 09-07 / 09-07) · pushed 2026-10-17 · open issues 361 · last-20 commits 2026-10-17→2026-10-02 by maxisbey(8), Kludex(8), dependabot[bot](3) → 2 strong human maintainers.
Licence **MIT** · Python 3.11+ · **three transports: stdio, Streamable HTTP, SSE** · servers expose **tools, resources and prompts**; clients connect to any server · docs at py.sdk.modelcontextprotocol.io with a v2 migration guide.
Better than our current choice: MCP is the only 2026 interop standard that lets the **same typed tool catalogue** be consumed by an LLM agent framework, an IDE, or another service — and it already has first-class support in LiveKit Agents, pipecat-mcp-server and 30+ frameworks.
Risks: v2 is a breaking generation; the ecosystem moves fast; MCP is a *transport*, not a schema language — we still need our own tool definitions.
**DECISION: ADOPT** — the interop layer for our typed tool catalogue; the catalogue itself stays in our own schema.

**2. modelcontextprotocol/typescript-sdk** — https://github.com/modelcontextprotocol/typescript-sdk
★13,620 · created 2024-09-24 · last release **v2.3.1 (2026-10-05)** · pushed 2026-10-20 · open issues 601 · repo licence reported **NOASSERTION** (monorepo) but npm **`@modelcontextprotocol/sdk` 1.32.1 is MIT** (modified 2026-10-05) — the npm tarball licence is what we will ship, and it is MIT.
Same protocol, TS implementation; we need it for `services/auth`, `packages/shared` and the mobile client.
**DECISION: ADOPT** — same reason as the Python SDK; keep the two in lockstep version-wise.

**3. pydantic/pydantic-ai** — https://github.com/pydantic/pydantic-ai
★20,748 · created 2024-06-21 · last release **v2.58.0 (2026-10-20)** · cadence ~daily · pushed 2026-10-20 · open issues **1,471** · last-20 commits 2026-10-20→2026-10-19 by DouweM(12), dsfaccini(5) → 2 strong maintainers · README badge: **coverage 100 %**.
Licence **MIT** · README (read): "the Python AI SDK — a typed, extensible agent loop with every model a string swap away"; **realtime voice**; **Pydantic AI Harness** with capabilities (memory, **guardrails**, sub-agents, planning, context management/compaction, persistence) and a full coding agent; **Pydantic Evals** that grade "agent's final outputs **and tool-call trajectories**, on datasets **or live production traffic**"; **Pydantic Graph** for typed control flow; `genai-prices`; **Monty**, a sandboxed Python interpreter for model-written code; Logfire instrumentation (plain OpenTelemetry); Pydantic AI Gateway with cost monitoring.
Better than our current choice: it is **the only framework whose evals explicitly score tool-call trajectories** — exactly the metric our voice squad needs (did the agent call the right tool, with the right arguments, and did it confirm before mutating?). It is also Python-first, matching `apps/api` + `services/worker`.
Risks: 1,471 open issues is the highest in the shortlist; the Harness is a large surface we do not need for v1; Logfire is a commercial product (the instrumentation is OTel — the backend is optional).
**DECISION: ADOPT (agent loop + evals)** — strongest fit for the Python side and for scoring tool-call trajectories.

**4. vercel/ai (AI SDK)** — https://github.com/vercel/ai
★27,412 · created 2023-05-23 · last release **ai@7.0.146 (2026-10-20)** · cadence: multiple releases per day (10-20 ×3) · pushed 2026-10-20 · open issues **1,372** · repo licence **NOASSERTION** (monorepo) but npm **`ai` 7.0.146 is Apache-2.0** (2026-10-20) and `@ai-sdk/openai` 4.0.98 is Apache-2.0 (2026-10-20) · last-20 commits all on 2026-10-20 by 5 distinct authors.
README: "provider-agnostic TypeScript toolkit"; **Unified Provider Architecture** (`generateText({ model: 'anthropic/claude-opus-5.5', prompt })`); the **Vercel AI Gateway** is the default router but direct provider packages exist; ships an agent **skill** for coding agents (`npx skills add vercel/ai`).
Better than our current choice: the best-ergonomics TypeScript tool-calling layer in the field — typed tools, structured output, streaming, and a provider abstraction that matches D7 ("free-first → paid fallback") and COST_PLAN.
Risks: Vercel AI Gateway is a **paid/hosted router by default** — we must use direct provider packages so the free-first chain in COST_PLAN is ours, not Vercel's; 1,372 open issues; 7.x is a fast major line.
**DECISION: ADOPT (TypeScript side)** — with direct provider packages, not the gateway.

**5. openai/openai-agents-python** — https://github.com/openai/openai-agents-python
★30,163 · created 2025-03-11 · last release **v0.24.0 (2026-10-15)** · cadence (10-15 / 10-02 ×2) · pushed 2026-10-20 · open issues **23** (remarkably low) · licence MIT.
Better than our current choice: minimal surface, MIT, excellent tracing/handoff design, and it maps to the OpenAI Realtime/function-calling wire format our voice service may use.
Risks: **vendor-shaped** (OpenAI-first); 0.x API.
**DECISION: WATCH** — reference for handoff/tracing ergonomics; the vendor lock-in is against D12.

**6. openai/openai-agents-js** — https://github.com/openai/openai-agents-js
★3,930 · created 2025-05-31 · last release **@openai/agents@0.20.0 (2026-10-08)** · pushed 2026-10-19 · open issues 15 · licence **MIT** · npm `@openai/agents` 0.20.0 (MIT, 2026-10-08) and `@openai/agents-core` 0.20.0 (MIT) · description: "multi-agent workflows **and voice agents**".
Better than our current choice: the only 0.x framework that explicitly covers **voice agents** in TypeScript — relevant to our mobile client talking to the voice service.
Risks: vendor-shaped; 0.x.
**DECISION: WATCH** — the TS voice-agent reference.

**7. langchain-ai/langgraph** — https://github.com/langchain-ai/langgraph
★43,560 · created 2023-08-09 · last release **cli==0.4.37 (2026-10-19)** · pushed 2026-10-20 · open issues 497 · licence **MIT** · tagline "Build resilient agents" · last-20 commits 2026-10-19→2026-10-14 by eliornl(10) + dependabot[bot](3).
Better than our current choice: the reference implementation of **durable, resumable, checkpointed agent graphs** — directly relevant if a courier's voice session must survive a dropped connection, an app switch, or a Doze window on Android.
Risks: LangChain's historical complexity reputation; a second graph model next to Pydantic Graph.
**DECISION: WATCH** — borrow the checkpoint/durability pattern, do not adopt the whole stack.

**8. langchain-ai/langchain** — https://github.com/langchain-ai/langchain
★148,118 · created 2022-10-17 · last release **langchain-core==1.6.12 (2026-10-16)** · pushed 2026-10-20 · open issues 673 · licence MIT.
**DECISION: WATCH** — the integration catalogue is the best; the core abstraction is not what we need.

**9. microsoft/agent-framework** — https://github.com/microsoft/agent-framework
★14,224 · created 2025-04-28 · last release **python-1.22.0 (2026-10-15)** · pushed 2026-10-20 · open issues 820 · licence **MIT** · last-20 commits 2026-10-20→2026-10-16: dependabot[bot](6), baywet(5) → **bot-heavy**.
Better than our current choice: the successor to AutoGen + Semantic Kernel under one API; a genuine attempt at a vendor-neutral standard.
Risks: 820 open issues; 6/20 recent commits are bots; young.
**DECISION: WATCH** — credible long-term neutral framework; too young to bet on.

**10. microsoft/autogen** — https://github.com/microsoft/autogen
★61,496 · created 2023-08-18 · last push 2026-10-16 · open issues 1,122 · **GitHub reports the repo licence as `CC-BY-4.0`** → the raw licence file was **not** read, so the *code* licence is **UNVERIFIED** (the project has relicensed before).
**DECISION: WATCH** — the group-chat agent pattern is worth studying; the licence must be confirmed before any use.

**11. ag2ai/ag2 (formerly AutoGen)** — https://github.com/ag2ai/ag2
★5,005 · created 2024-11-11 · last release **v1.2.0 (2026-10-11)** · pushed 2026-10-20 · open issues 72 · licence **Apache-2.0** · "The Open-Source AgentOS".
**DECISION: WATCH** — Apache-2.0 fork of AutoGen; a cleaner licence than the upstream repo reports.

**12. huggingface/smolagents** — https://github.com/huggingface/smolagents
★29,940 · created 2024-12-05 · last release **v1.26.0 (2026-05-29)** · cadence (05-29 / 05-14 / 01-16) → **slowing** · pushed 2026-10-06 · open issues 974 · licence **Apache-2.0** · "a barebones library for agents that think in code".
Better than our current choice: code-as-action means a tool call is a *Python function call* — the smallest possible gap between our existing Python services and the agent.
Risks: Python-only; execution of model-written code needs a sandbox (**Monty** in pydantic-ai is the safer pattern); release cadence has slowed.
**DECISION: WATCH** — best concept (code-as-action) for a Python-only backend.

**13. crewAIInc/crewAI** — https://github.com/crewAIInc/crewAI
★59,904 · created 2023-10-27 · last release **1.15.28 (2026-10-14)** · pushed 2026-10-20 · open issues 762 · licence **MIT** · role-playing multi-agent orchestration.
**DECISION: REJECT** — "crew of agents" is the wrong shape for a single courier assistant with a fixed tool catalogue; it invites nondeterminism we cannot afford while driving.

**14. google/adk-python** — https://github.com/google/adk-python
★21,921 · created 2025-04-01 · last release **v2.12.0 (2026-10-13)** · pushed 2026-10-20 · open issues 358 · licence **Apache-2.0** · "code-first Python toolkit for building, evaluating, and deploying sophisticated agents", with an **evaluation** story (built-in, which is what we need).
Better than our current choice: built-in eval harness + Apache-2.0 + Google-Vertex/ADK tool ecosystem.
Risks: Google-shaped; Python-only.
**DECISION: WATCH** — its eval-first design is the closest to pydantic-ai's evals.

**15. agno-agi/agno** — https://github.com/agno-agi/agno
★42,832 · created 2022-05-04 · last release **v3.1.6 (2026-10-19)** · pushed 2026-10-20 · open issues **1,917** (highest here) · licence **Apache-2.0** · "Build, run, and manage agent platforms".
**DECISION: WATCH** — broad platform; too much surface for our needs.

**16. mastra-ai/mastra** — https://github.com/mastra-ai/mastra
★28,939 · created 2024-08-06 · last release **@mastra/core@1.78.0 (2026-10-16)** · pushed 2026-10-20 · open issues 565 · repo licence **NOASSERTION** → raw licence **UNVERIFIED**.
Better than our current choice: the strongest modern **TypeScript** agent framework (workflows, memory, evals, MCP client support).
Risks: licence not confirmed; 1.78.x = fast churn.
**DECISION: WATCH** — licence must be read before any use; otherwise a strong TS alternative to the AI SDK.

**17. HKUDS/nanobot** — https://github.com/HKUDS/nanobot
★49,209 · created **2026-02-01** · last release **v0.3.5 (2026-09-15)** · pushed 2026-10-20 · open issues 861 · licence **MIT** · "Ultra-lightweight, open-source, self-hosted personal AI agent framework in Python with WebUI".
Better than our current choice: self-hosted, MIT, small — the closest "personal assistant you can point at your own data" shape.
Risks: young; 861 open issues; MCP-flavoured; the assistant is chat-first.
**DECISION: WATCH** — a 2026 challenger; keep on the radar (V4 §12.6).

**18. dottxt-ai/outlines** — https://github.com/dottxt-ai/outlines
★15,957 · created 2023-03-17 · last release **1.3.3 (2026-08-06)** · pushed 2026-09-21 · open issues 200 · licence **Apache-2.0** · "Structured Outputs" — **constrained decoding**: the model is *forced* to emit valid JSON matching your schema.
Better than our current choice: for a **voice** tool catalogue, constrained decoding removes a whole class of failure (malformed arguments) that prompt-only tool calling cannot.
Risks: needs logits access (not available behind most hosted APIs); Python-first; a v1 release cadence of ~2 months.
**DECISION: WATCH** — the right technique if we ever self-host the model; with hosted APIs we use native structured-output/function-calling instead.

**19. 567-labs/instructor** — https://github.com/567-labs/instructor
★14,036 · created 2023-06-14 · last release **v1.17.0 (2026-09-09)** · pushed 2026-10-20 · open issues 216 · licence **MIT** · "structured outputs for llms" — validates and retries model output against a Pydantic/TS schema.
Better than our current choice: the **retry-on-validation-failure** loop is exactly what a voice agent needs when a driver says "number seventeen" and the model returns `"17"` where we expected an int.
Risks: extra latency per retry (bad against the ≤ 700 ms budget); the schema must be shared with our mobile client.
**DECISION: WATCH** — the retry pattern, not the dependency.

**20. microsoft/TypeChat** — https://github.com/microsoft/TypeChat
★8,693 · created 2023-06-20 · pushed 2026-10-19 · open issues 44 · licence **MIT** · no GitHub releases · "makes it easy to build natural language interfaces using types" — the *type-schema-as-prompt* idea (a TypeScript type is compiled into a JSON schema and used as the LLM's response contract).
Better than our current choice: the "schema is the prompt" pattern means our **zod schemas in `packages/shared` can literally be the tool contract** with no duplication.
Risks: no releases since 2023 (the repo still receives commits); not an agent framework.
**DECISION: WATCH** — its idea is already the AI SDK's behaviour; cite it, don't depend on it.

**21. guidance-ai/guidance** — https://github.com/guidance-ai/guidance
★21,803 · created 2022-11-10 · last push 2026-05-21 · open issues 354 · licence **MIT** · "a guidance language for controlling large language models" — interleaved control flow and constrained output.
**DECISION: WATCH** — powerful but a different programming model; too big a change for v1.

**22. PrefectHQ/fastmcp** — https://github.com/PrefectHQ/fastmcp
★28,143 · created 2024-11-30 · last release **v4.1.1 (2026-10-18)** · pushed 2026-10-20 · open issues 594 · licence **Apache-2.0** · "the fast, Pythonic way to build MCP servers and clients".
Better than our current choice: the ergonomic Python MCP server framework — if we expose our tool catalogue over MCP we should build it with this rather than by hand.
Risks: not the *official* SDK (the official one is `modelcontextprotocol/python-sdk`); adds a dependency to the API service.
**DECISION: WATCH** — use only if the official SDK's ergonomics are insufficient; prefer the official SDK for licence/longevity reasons.

**23. mcp-use/mcp-use** — https://github.com/mcp-use/mcp-use
★10,790 · created 2025-03-28 · last release **mcp-use@2.11.1-canary.1 (2026-10-20)** · pushed 2026-10-20 · open issues 84 · licence **MIT** · "the fullstack MCP framework to develop MCP Apps for ChatGPT / Claude & MCP Servers for AI".
**DECISION: WATCH** — the MCP **client** side for our mobile/web surfaces.

**24. strands-agents/harness-sdk** — https://github.com/strands-agents/harness-sdk
★8,872 · created 2025-05-14 · pushed 2026-10-20 · open issues **1,047** · licence **Apache-2.0** · "Build an agent harness and control it end-to-end."
**DECISION: WATCH** — AWS lineage; young; high issue count.

**25. i-am-bee/beeai-framework** — https://github.com/i-am-bee/beeai-framework
★3,436 · created 2024-08-23 · last release **typescript_v0.1.31 (2026-09-28)** · pushed 2026-10-19 · open issues **14** · licence **Apache-2.0** · "production-ready AI agents in both Python and TypeScript".
Better than our current choice: the rare project with **both** a Python and a TypeScript implementation of the same framework — it can host one tool catalogue across our two language stacks.
Risks: small; the TS side is 0.x.
**DECISION: WATCH** — the only credible one-framework-both-languages option; worth a spike.

**26. agentscope-ai/agentscope** — https://github.com/agentscope-ai/agentscope
★33,528 · created 2024-01-12 · last release **v2.0.10 (2026-10-12)** · pushed 2026-10-20 · open issues 655 · licence **Apache-2.0**.
**DECISION: WATCH** — broad, Apache-2.0, but not tool-calling-specific.

**27. BerriAI/litellm** — https://github.com/BerriAI/litellm
★61,633 · created 2023-07-27 · last release **v1.104.4 (2026-10-20)** · pushed 2026-10-20 · open issues **5,533** · repo licence **NOASSERTION** (it is "Other" — the licence is a mix) → **UNVERIFIED**; 100+ LLM APIs behind one interface, Rust core + Python SDK (+ a JS proxy).
Better than our current choice: the cheapest way to implement D7/D12's **free-first → paid fallback chain** and COST_PLAN routing in one place, with per-model cost tracking.
Risks: licence "Other" (needs reading — it may include an Apache core plus an enterprise section); 5,533 open issues; adds a proxy hop (latency + a new failure domain) on the critical path of a ≤ 700 ms voice action.
**DECISION: WATCH** — do **not** put a proxy on the voice hot path; use it only for the non-urgent background jobs, or implement a thin provider switch ourselves.

**28. run-llama/llama_index** — https://github.com/run-llama/llama_index
★52,577 · created 2022-11-02 · last release **v0.14.25 (2026-09-21)** · pushed 2026-10-20 · open issues 996 · licence MIT · document/RAG platform.
**DECISION: REJECT** — we have no document corpus; RAG over our own app actions is not the problem to solve.

**29. microsoft/semantic-kernel** — https://github.com/microsoft/semantic-kernel
★28,678 · created 2023-02-27 · last release **python-1.45.0 (2026-10-06)** · pushed 2026-10-20 · open issues 379 · licence MIT · now largely superseded inside Microsoft by `microsoft/agent-framework`.
**DECISION: WATCH** — legacy position; prefer agent-framework if we go Microsoft.

**30. strands-agents / crestalnetwork/intentkit** (★6,521, pushed 2026-09-16) · **Upsonic/Upsonic** (★7,958, pushed 2026-06-18) · **evalstate/fast-agent** (★3,943, pushed 2026-10-20) · **crmne/ruby_llm** (★4,474, Ruby, pushed 2026-10-20) · **RightNow-AI/openfang** (★18,212, Rust, created 2026-02-24) · **eigent-ai/eigent** (★15,618, TS, created 2025-07-29) · **microsoft/agent-governance-toolkit** (★6,448, created 2026-03-02) · **aden-hive/hive** (★11,112, created 2026-01-12) · **omnigent-ai/omnigent** (★10,914, created 2026-06-11) · **rllm-org/rllm** (★5,888) — all licences **UNVERIFIED** except where noted.
**DECISION: WATCH (group)** — the 2026/2027 challenger cohort; per V4 §12.6 we track at least three challengers even if we adopt none.

**31. openai/openai-agents-js / openai-agents-python** already listed. **32. zod** (colinhacks/zod) — already in `packages/shared@4.6.7`, MIT, npm modified 2026-10-12.
**DECISION: KEEP (already ours)** — zod is the TS schema source of truth; we will not add a second validation library.

**33. @effect/schema** — npm 0.75.5, MIT (2026-09-18) — a schema library with better error messages and effect integration.
**DECISION: REJECT** — zod is already the standard in our repo; adding a second schema library is unjustified.

**Candidate count: 33 distinct projects examined.**

---

## Shortlist (12)

| # | Project | Role in our stack | Verdict |
|---|---|---|---|
| 1 | pydantic/pydantic-ai | Python agent loop + **tool-call-trajectory evals** (apps/api, services/worker) | **ADOPT** |
| 2 | vercel/ai | TypeScript tool-calling layer (services/auth, mobile client) | **ADOPT** |
| 3 | modelcontextprotocol/python-sdk | MCP interop for the tool catalogue (Python) | **ADOPT** |
| 4 | modelcontextprotocol/typescript-sdk | MCP interop (TypeScript) | **ADOPT** |
| 5 | zod | TS schema source of truth (already ours) | **KEEP** |
| 6 | openai/openai-agents-python | minimal agent loop reference (MIT) | **WATCH** |
| 7 | openai/openai-agents-js | TS **voice** agent reference | **WATCH** |
| 8 | langchain-ai/langgraph | durable/resumable graphs | **WATCH** |
| 9 | microsoft/agent-framework | vendor-neutral framework | **WATCH** |
| 10 | i-am-bee/beeai-framework | one framework, Python + TypeScript | **WATCH** |
| 11 | dottxt-ai/outlines / 567-labs/instructor | guaranteed-valid tool arguments | **WATCH** |
| 12 | BerriAI/litellm | provider routing / cost (off the voice hot path) | **WATCH** |

---

## Deep review — top 5

### 1. pydantic/pydantic-ai — **adopt (Python side)**
* **Architecture (README).** "A typed, extensible agent loop with every model a string swap away" — the model is a string, the tools are typed Python functions, and the same agent "runs everywhere you need it": web frontend, terminal, voice call, durable background queue, GitHub Actions, or a plain `run()` call. That last one matters: our voice service can call the *same* agent object that a background job calls.
* **The two features that decide it.** (a) **Pydantic Evals** — "grades an agent's final outputs **and tool-call trajectories**, on datasets **or live production traffic**". For a courier, "did it call `mark_stop_delivered` with the right stop id, and did it *confirm* first?" is the metric that matters, and this is the only framework I found that scores tool-call trajectories directly. (b) **Pydantic AI Harness** capabilities: **guardrails**, memory, sub-agents, planning, context compaction, persistence — guardrails map onto our "confirmation policy enforced in the tool layer" and our "never blocks driving" rule.
* **Code quality.** v2.58.0 on 2026-10-20 (daily cadence), 2 strong human maintainers in the last 20 commits, a **100 % coverage badge** in the README, CI badge, and a full docs site. 1,471 open issues is the real cost — a large surface with fast movement.
* **API ergonomics.** Pydantic models in, Pydantic models out — which means our Python tool signatures and the zod schemas in `packages/shared` must be kept in sync; we should generate one from the other.
* **Extensibility.** `genai-prices` (model pricing kept current) is a nice touch for COST_PLAN; `Monty` (sandboxed interpreter for model-written code) is the safe answer to smolagents' code-as-action; Logfire instrumentation is plain **OpenTelemetry**, so it plugs into V4 §6.6's OTel requirement without a vendor lock.
* **Performance claims vs our measurements.** None of our own. The ≤ 700 ms command→action budget is **unmeasured**.
* **Verdict: ADOPT** — the Python agent loop, the guardrails capability, and above all the tool-call-trajectory evals.

### 2. vercel/ai (AI SDK) — **adopt (TypeScript side)**
* **Architecture (README).** "Provider-agnostic TypeScript toolkit"; **Unified Provider Architecture** where a model is a string (`'anthropic/claude-opus-5.5'`, `'openai/gpt-6-astra'`, `'google/gemini-3.8-flash'`) and a single `generateText({ model, prompt })` call works across providers; separate provider packages (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`) exist for direct use.
* **Why the "provider-agnostic" bit matters to us.** D7 and D12 require a free-first → paid fallback chain and no provider may train on driver data. With the AI SDK we can swap providers per-route in code — including our own self-hosted endpoint (`speech-to-speech` speaks the OpenAI Realtime protocol, so it is reachable through an OpenAI-compatible provider package) — and keep the *fallback chain* in our code rather than in a vendor gateway.
* **Code quality.** `ai@7.0.146` published 2026-10-20 with multiple releases in the same day; 5 distinct authors in the last 20 commits; npm licences are **Apache-2.0** (the repo's NOASSERTION is a monorepo artefact — **the tarball we ship is Apache-2.0, verified**). 1,372 open issues.
* **API ergonomics.** The best-documented tool-calling API in TypeScript: typed tool definitions, schema-driven argument validation, streaming, and structured output — plus a first-party `skill` for coding agents, which is a nice fit for our AGENTS.md-driven workflow.
* **Extensibility.** Provider packages, middleware, and streaming all compose; a custom provider lets us point at our own private service.
* **Risk we must design around.** The **Vercel AI Gateway is the default** — a hosted router that would sit on our data path and our cost plan. We will install provider packages directly and never enable the gateway.
* **Verdict: ADOPT** — TypeScript tool-calling and provider abstraction, without the gateway.

### 3. modelcontextprotocol (python + typescript SDKs) — **adopt as the interop layer**
* **What MCP is (README).** "Build MCP servers that expose tools, resources, and prompts to any MCP host; build MCP clients that connect to any MCP server; speak every standard transport: stdio, Streamable HTTP, and SSE."
* **Why it is the right interop for us.** Our tool catalogue is the product (FINAL_PROMPT §4.5: every app action as a typed tool). MCP is the only 2026 standard that lets the *same* catalogue be consumed by: our own agent, a third-party MCP host, an IDE during development, and the voice service. It is also natively supported by LiveKit Agents ("integrate tools provided by MCP servers with **one line of code**") and exposed by `pipecat-ai/pipecat-mcp-server` — i.e. our voice stack already speaks it.
* **Code quality.** Python SDK: v2.3.0 (2026-10-02), 2 strong maintainers (maxisbey, Kludex) in the last 20 commits, MIT, docs with a v2 migration guide. TS SDK: v2.3.1 (2026-10-05), npm `@modelcontextprotocol/sdk` 1.32.1 **MIT** (2026-10-05).
* **API ergonomics.** Decorator/function-based server definitions; transports are pluggable; the TypeScript side has a `@modelcontextprotocol/sdk` that we can consume from `packages/shared` and the mobile client.
* **Extensibility.** Resources and prompts (not just tools) let us expose our LINZ address data and our help-centre docs to the agent as first-class context.
* **Risk.** v2 is a breaking generation and the ecosystem moves weekly — we pin exact versions and keep MCP at the *edge* of the system (a boundary), never as the internal architecture. Our internal tool definitions stay in our own schema; MCP is an adapter.
* **Verdict: ADOPT** — MCP as an *adapter* over our catalogue, not as our architecture.

### 4. openai/openai-agents-python / -js — **watch, but study**
* **Architecture.** "A lightweight, powerful framework for multi-agent workflows" (Python, MIT, v0.24.0, only **23 open issues** — the cleanest issue tracker in this whole area) and, in TypeScript, "for multi-agent workflows **and voice agents**" (`@openai/agents` 0.20.0, MIT).
* **Code quality.** Small, focused, MIT, very active; the JS side has separate `@openai/agents` and `@openai/agents-core` packages so a mobile client can take just the core.
* **Why it matters here.** It is the reference for **handoff** and **tracing**, and the TS package explicitly supports **voice agents** — the one place where a framework acknowledges our exact product shape.
* **Risks.** 0.x API; **vendor-shaped** (its handoffs, guardrails and models assume OpenAI), which conflicts with D12 ("no provider may train on our data" is easier to prove with a neutral layer). We would also be building on a 0.x API.
* **Verdict: WATCH** — copy the handoff/tracing ergonomics into our design; do not couple the product to it.

### 5. dottxt-ai/outlines + 567-labs/instructor — **the two ways to make tool arguments correct**
* **Outlines (Apache-2.0, ★15,957, v1.3.3, 2026-08-06).** *Constrained decoding*: the sampler is forced to produce tokens that are valid under **your** schema, so an invalid tool argument is impossible by construction. For a voice agent whose input is noisy ASR text, this is the strongest possible guarantee.
* **Instructor (MIT, ★14,036, v1.17.0, 2026-09-09).** *Validate and retry*: the model output is parsed against a Pydantic/TS schema; on failure the validation error is fed back and the call is retried. Cheaper to adopt (works with any API), but each retry costs a round trip — directly at odds with the ≤ 700 ms command→action budget if it fires often.
* **Code quality / cost.** Outlines needs logits access, so it only works with a self-hosted model — but we *are* planning a private voice service, and `huggingface/speech-to-speech` shows a fully local stack is production-real. Instructor is a thin, well-typed library.
* **Our recommendation.** Use **the platform's native structured-output / function-calling** on the hot path (no extra round trip), and reserve **Instructor-style validate-and-retry for the *server-side* batch tasks** (address correction, POD review) where a retry costs seconds, not milliseconds. Constrained decoding is a "when we self-host the model" option.
* **Verdict: WATCH** — adopt the *pattern* (schema-first, validate at the boundary, retry off the hot path), not necessarily the dependency.

---

## Benchmarks

**Status: UNVERIFIED — no eval set, no harness, no measurements.**

* `docs/squads/voice/eval/` — **absent** (checked 2026-10-20); it is the only evaluation dataset the repo defines and it does not exist yet.
* `docs/squads/voice/benchmarks/` — **only `README.md`**.

Therefore **no tool-call accuracy, no argument-correctness rate, no confirmation-compliance rate, and no tool-call latency has been measured.** Every number below is a vendor claim or a target.

### The exact set that must be built first

**A. `docs/squads/voice/eval/` — the utterance set** (≥ 500 utterances; same quotas as the other two voice files: en-NZ 120 · te reo place names 60 · Arabic 40 · Hindi/Punjabi 40 · Mandarin 40 · Samoan/Tongan 40 · Spanish 40 · numbers & self-corrections 40 · silence/non-speech 40). For tool calling we additionally need, per utterance:

| Field | Meaning |
|---|---|
| `intent_gold` | the action the driver meant |
| `tool_gold` | the exact tool that must be called |
| `args_gold` | the exact argument object (e.g. `{"stop_id": "s_42"}`) |
| `slots_missing` | arguments the driver did **not** say (must be filled by a clarifying question, not guessed) |
| `confirm_required` | whether the action is destructive/irreversible (must be confirmed) |
| `code_switch` | where the language switches |
| `noise` / `snr_db` | the acoustic conditions |

**B. A dedicated **tool-calling** sub-set (≥ 200 cases)** covering the failure modes that matter to a courier:
* **self-correction** — "stop seventeen— no, seventy" → the tool must be called with the *corrected* value;
* **ambiguity** — "the next one" when two stops match → must ask, not guess;
* **partial address** — "take it to Riccarton" → must resolve via LINZ, or ask one question;
* **numbers as words and digits** — "seventeen" / "17" / "one seven" / "1-7";
* **destructive action without confirmation** — "cancel that stop" → must confirm;
* **wrong-tool pressure** — "mark it delivered but also reschedule it to tomorrow" → two tools, correct order, correct confirmation;
* **out-of-catalogue request** — "email the customer" → must refuse (no such tool) rather than invent one.

**C. The tool-call metrics to publish** (V4 §12.5, same device profile: CI emulator + one mid-range Android; the LLM itself runs in `services/voice`/`apps/api`):

| Metric | Definition | Target |
|---|---|---|
| Tool selection accuracy | correct tool chosen | ≥ 97 % (aligns with the squad's intent-accuracy target) |
| Argument exact-match | `args_gold` deep-equals the emitted arguments | ≥ 95 % (proposed; **UNVERIFIED target**) |
| Argument schema validity | arguments validate against the zod/Pydantic schema first time | ≥ 99 % |
| Self-correction handling | uses the *corrected* value | ≥ 95 % (proposed) |
| Clarification rate | asks when a required slot is missing | 100 % of the `slots_missing` cases (no guessing) |
| Confirmation compliance | confirms every `confirm_required` action before executing | **100 % — a hard gate** |
| Out-of-catalogue refusal | refuses rather than inventing a tool | 100 % |
| Command→action latency | utterance → tool executed (end-to-end) | ≤ 700 ms (V4 §10.1) |
| Retry rate | how often validation-and-retry fires | reported, and **must not** push the p95 past 700 ms |

**D. A tool-call trace corpus** (for pydantic-ai's evals): for each eval case, the recorded sequence of (tool, args, result) so a trajectory scorer can grade it. This is the artefact that makes "did it confirm first?" measurable.

### What must be benchmarked

| Rank | Candidate | Benchmark | Status |
|---|---|---|---|
| 1 | **pydantic-ai (Python)** | tool selection / argument exact-match / confirmation compliance over the 200-case tool subset, with trajectory scoring; command→action p50/p95 | **UNVERIFIED — blocked on the eval set + tool subset** |
| 2 | **vercel/ai (TypeScript)** | same cases through the TS path, so the two stacks can be compared and the shared schema proven | **UNVERIFIED — blocked on the eval set + tool subset** |
| 3 | **MCP boundary** | the same catalogue served over MCP (stdio + Streamable HTTP) — identical results, proving the adapter is transparent | **UNVERIFIED — blocked on the eval set + tool subset** |

**Published to `docs/squads/voice/benchmarks/`** (or a new `docs/squads/voice/benchmarks/tools/`): harness source, per-case CSV (predicted tool, predicted args, pass/fail per metric), the trajectory traces, model + SDK versions, prompt hash, and the commit SHA.

---

## What's new in 2026 (and what we adopt)

1. **MCP becomes the interop standard with first-class framework support** (LiveKit: "one line of code"; `pipecat-ai/pipecat-mcp-server`; `mcp-use`; `fastmcp`; thousands of MCP servers) — *adopt*: MCP as an **adapter** at the boundary of our tool catalogue, so any host can drive our app actions.
2. **Frameworks start shipping *evals* as first-class** (pydantic-ai's evals grade tool-call trajectories and live production traffic; google/adk-python is eval-first) — *adopt*: the benchmark must score trajectories, not just final text.
3. **"Every model is a string" provider abstraction becomes the norm** (AI SDK, pydantic-ai) — *adopt*: one model string per route, with our own fallback chain, so D7/D12 and COST_PLAN are implemented in our code, not a vendor's gateway.
4. **Constrained decoding and validate-and-retry mature** (Outlines 1.x, Instructor 1.17) — *adopt the pattern*: schema-first, validate at the boundary, retry **off** the ≤ 700 ms hot path.
5. **Harnesses add guardrails, compaction and durable execution** (pydantic-ai Harness; LangGraph checkpoints; openai-agents durability) — *adopt the idea*: a voice session must survive an app switch, a dropped socket, or a phone call; a resumable graph is the answer.
6. **A wave of 2026 newcomers** (nanobot 2026-02, openfang 2026-02, hive 2026-01, omnigent 2026-06, agent-governance-toolkit 2026-03, Microsoft Agent Framework) — *adopt the radar*: monthly re-scan per V4 §11.3.

---

## Decision

**ADOPT / KEEP**
1. **ADOPT `pydantic-ai` for the Python side** (`apps/api`, `services/worker`): typed agent loop, guardrails capability, and — decisively — **evals that score tool-call trajectories**.
2. **ADOPT the Vercel AI SDK for the TypeScript side** (`services/auth`, `packages/shared`, mobile client): typed tools, provider abstraction, structured output. **Install provider packages directly; do not enable the Vercel AI Gateway** (it would sit on our data path and cost plan).
3. **ADOPT MCP (`modelcontextprotocol/python-sdk` + `modelcontextprotocol/typescript-sdk`) as an adapter** over our tool catalogue — servers expose our tools/resources/prompts over stdio and Streamable HTTP; our internal architecture stays ours.
4. **KEEP `zod@4.6.7` in `packages/shared` as the single TypeScript schema source of truth**, and **generate** the Python/Pydantic models from the same definitions so a tool has exactly one description in two languages.
5. **ADOPT the validation pattern at the boundary**: every tool argument validates against its schema *before* the tool body runs, and the confirmation policy is enforced **in the tool layer** (not in the prompt) — FINAL_PROMPT §4.5 + V4 §10.1.
6. **ADOPT Instructor-style validate-and-retry for server-side batch tasks only** (address correction, POD review), never on the ≤ 700 ms hot path.

**WATCH** (re-scan monthly): `openai/openai-agents-python` / `-js` (handoff + tracing + TS voice agents; 0.x, vendor-shaped), `langchain-ai/langgraph` (durable/resumable graphs — borrow the checkpoint pattern), `microsoft/agent-framework` (vendor-neutral, young), `microsoft/autogen` (**licence reads as CC-BY-4.0 on GitHub — must be confirmed**), `ag2ai/ag2` (Apache-2.0 AutoGen line), `huggingface/smolagents` (code-as-action), `google/adk-python` (eval-first), `agno-agi/agno`, `mastra-ai/mastra` (**licence unconfirmed**), `HKUDS/nanobot`, `i-am-bee/beeai-framework` (one framework for both languages), `PrefectHQ/fastmcp`, `mcp-use/mcp-use`, `dottxt-ai/outlines` (constrained decoding for a self-hosted model), `567-labs/instructor`, `guidance-ai/guidance`, `microsoft/TypeChat` (cite, do not depend), `strands-agents/harness-sdk`, `agentscope-ai/agentscope`, `BerriAI/litellm` (off the voice hot path only), and the 2026 challenger cohort (openfang, hive, omnigent, agent-governance-toolkit, intentkit, Upsonic, fast-agent, ruby_llm, eigent, rllm).

**REJECT**: `crewAIInc/crewAI` (role-playing crews are the wrong shape for one assistant with a fixed catalogue; nondeterminism is unaffordable while driving), `run-llama/llama_index` (no document corpus; RAG is not our problem), `@effect/schema` (zod is already our standard), `microsoft/semantic-kernel` (superseded by agent-framework), and any **gateway-on-the-hot-path** design.

**Clean-room study candidates (§11.2):** none of the above are AGPL/GPL, so no clean-room list is required for this area. `microsoft/autogen`'s reported CC-BY-4.0 is **not** copyleft but must be read before use.

## Risks & fallbacks

| Risk | Impact | Mitigation / fallback |
|---|---|---|
| **Our stack is two languages (Python + TypeScript)** | The tool catalogue could drift between two definitions | **Single source of truth**: define tools once (zod in `packages/shared`), generate the Pydantic models, and assert in CI that the generated schema hashes match |
| **A gateway/LLM router on the voice hot path** | Latency and cost blow the 700 ms budget; data leaves our perimeter | Direct provider packages only; the fallback chain lives in our code; no proxy between the voice service and the model |
| **Vercel AI SDK 7.x / pydantic-ai v2 churn** | Upgrade treadmill, breaking changes | Pin exact versions; keep every framework behind our own `AgentRunner` interface in `packages/` with a fake for tests (V4 §6.1) so the framework is swappable |
| **MCP v2 is a breaking generation** | Client/server break | Pin both SDKs to the same version; keep MCP strictly at the boundary; our internal tools never depend on MCP types |
| **Vendor lock-in (OpenAI Agents, Microsoft AF)** | Data goes to a provider that may train on it, and D12 breaks | Our provider abstraction is first-party; vendor frameworks are references, not dependencies; the free-first chain in COST_PLAN is ours |
| **Model invents a tool that does not exist** | A courier hears a bogus confirmation | Strict allow-list at the tool registry: unknown tool names are rejected before dispatch, and the agent must say it cannot do it (100 % refusal is a gate in the benchmark) |
| **Confirmation bypassed under noise or hurry** | An irreversible action (cancel/reschedule) without consent | Confirmation enforced in the tool layer, not the prompt; benchmarked as a **100 % hard gate**; noisy/self-correcting cases in the eval subset |
| **Pydantic-ai's 1,471 open issues / 9,400-line Harness** | Maintenance surface larger than our need | Adopt only the agent loop + evals + guardrails; ignore the Harness and the coding-agent features |

## UNVERIFIED items (explicit)

1. **6-month star trend for every candidate** — the GitHub API does not expose star history to this token; all counts are the 2026-10-20 snapshot. **UNVERIFIED.**
2. **Median maintainer response time / closed-issue ratio** — only open-issue counts sampled. **UNVERIFIED.**
3. **Licence of**: `mastra-ai/mastra` (NOASSERTION), `BerriAI/litellm` (NOASSERTION / "Other"), `microsoft/autogen` (GitHub says **CC-BY-4.0** — raw licence not read), `vercel/ai` and `modelcontextprotocol/typescript-sdk` (monorepo NOASSERTION; **the npm tarball licences we would install were verified as Apache-2.0 and MIT respectively**), `microsoft/agent-framework` (MIT, verified), and the whole 2026 challenger cohort. **UNVERIFIED unless stated.**
4. **Whether `microsoft/autogen`'s code is MIT or CC-BY-4.0** — GitHub's `license` endpoint reports `CC-BY-4.0`; the project has relicensed before. **UNVERIFIED — must be read.**
5. **New Architecture / Expo SDK 58 / Android API 34 support** for every npm package in this area: `ai` and `@ai-sdk/openai` are **pure TypeScript** (no native code) → n/a; `@modelcontextprotocol/sdk` is pure TS → n/a; `@openai/agents` is pure TS → n/a. Confirmed by package type inference, **not by an explicit statement in the docs — UNVERIFIED.**
6. **Bundle sizes** for `ai`, `@modelcontextprotocol/sdk`, `@openai/agents` in the mobile client — **UNVERIFIED**; must be measured against the 80 MB APK budget. (The *server* SDKs are irrelevant to the APK.)
7. **CI status / test coverage** for the shortlisted projects — pydantic-ai shows a **100 % coverage badge** in its README (read); the others were not sampled. **UNVERIFIED.**
8. **Production users** — no project in this area publishes a verifiable production user count. **UNVERIFIED.**
9. **Model-weights/licence checks for the models behind these frameworks** — out of scope here; the relevant voice-model licences are in `on-device-stt-tts-vad-kws.md` and `multilingual-voice-i18n.md` (including the OmniVoice **CC-BY-NC** finding that removes our current server-TTS plan).
10. **Whether pydantic-ai's evals can score *our* trajectories** (the shape of its dataset format) — the README claims trajectory grading, but the exact schema/format was **not verified in code**. **UNVERIFIED.**
