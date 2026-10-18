# Research Analysis & Strategic Decisions — Courier Copilot

> **Synthesized from:** competitors-2026.md, market-nz-au.md, tech-verification.md, voice-ai.md, maps-addresses.md, ux-screens.md, risks.md
> **Date:** October 2026
> **Author:** Orchestrator (Multi-Agent Synthesis)

---

## 1. What Changed vs. Original Plan

| Original Assumption | Research Finding | Decision |
|---------------------|------------------|----------|
| **OCR manifest scan = primary intake** | Driver has **no manifest** — scans labels one by one (1–2 hrs) | **Rapid Scan (continuous label scan) = Priority 1**. OCR manifest = Phase 2. |
| **Voice dictation = nice to have** | 200 stops × 18–36 sec = **1–2 hrs**. Voice = only way to hit <15 min | **Voice dictation = Core MVP feature** (not optional). |
| **Route optimization = value prop** | Drivers **hate** optimization — breaks their mental map | **Master Template Lock = Core**. Optimization = optional, driver-triggered only. |
| **Google Maps navigation sufficient** | "Pin on curb, door at back" = 30–90s lost/stop | **Door-level memory + nav by learned coordinate = Core differentiator**. |
| **Spoke is "good enough" benchmark** | 20 critical unsolved pains (voice, memory, NZ addresses, offline) | **We don't compete on Spoke's terms. We solve what they can't.** |
| **Expo + all libs compatible** | Sherpa-onnx + VisionCamera + Reanimated 4 + MapLibre = **untested combo** | **Phase C Week 1 = Compatibility Test App (blocker for all else)**. |
| **PowerSync = best sync** | FSL-1.1 license (not OSI), RN SDK in preview | **Legal review required**. Backup: custom event sourcing + op-sqlite. |
| **NZ market = 6K drivers** | **Australia = 35K+** (6x), same carrier model | **Architect for AU from Day 1** (GNAF, state address APIs). |

---

## 2. Invalidated Assumptions

| ❌ Assumption | ✅ Reality |
|---------------|------------|
| "Drivers want optimized routes" | Drivers want **their** route, preserved. Optimization = enemy. |
| "Voice is just hands-free typing" | Voice = **continuous dictation + correction report + conversational commands** — a new paradigm. |
| "Offline maps = vector tiles only" | **Satellite view critical** for driveways. Hybrid: vector (full) + raster (on-demand cache). |
| "LINZ addresses cover everything" | **New subdivisions missing**. Manual pin + feedback loop needed. |
| "Sherpa-onnx works out of box" | **v0.3 broke API**. Pin v0.2.x. Test JSI coexistence with VisionCamera. |
| "Contractors use one carrier app" | **Many use multiple** (Aramex + CourierPost + own runs). We must be carrier-agnostic. |
| "Team plan = dispatch board" | **Franchisees want: driver retention, memory transfer, performance dashboard** — not dispatch. |

---

## 3. SWOT Analysis

### Strengths (Internal)
- **Voice-first architecture** — 80% commands offline, <300ms, earbud buttons
- **NZ address intelligence** — LINZ verified, Māori names, RD, flats, spoken fixes
- **Master Template Lock** — Driver's mental map as source of truth
- **Door-level memory** — Compounding moat: every delivery improves next
- **Driver Rules Engine** — Spoken rules → structured constraints → applied daily
- **Whisper approach** — 150m/30m contextual audio (unique)
- **Carrier-agnostic** — Works for Aramex, CourierPost, NZ Couriers, independent

### Weaknesses (Internal)
- **Unproven tech stack** — 5 critical native modules untested together
- **No OCR for handwritten manifests** (Zeo leads)
- **Small team (3)** — 15-week timeline aggressive
- **FSL license risk** (PowerSync)
- **No brand recognition** vs Spoke (500K users)
- **Australia address data (GNAF) = paid** ($5–15K/yr)

### Opportunities (External)
- **35K+ AU contractors** — 6x NZ, same pain, same carriers
- **Franchisee pain** — Drivers hate Blu, franchisees pay for retention
- **Contractor tax compliance** — IRD logbook, GST, earnings = natural adjacency
- **Route memory as asset** — Transferable to relief driver, saleable with franchise
- **Carrier API partnerships** — Aramex/CourierPost may open APIs for better driver tools
- **Voice AI commoditization** — Costs dropping, accuracy rising (Deepgram, Cartesia)

### Threats (External)
- **Spoke copies voice + memory** — Resources + user base + 6–12 month horizon
- **Aramex mandates Blu** — 280 drivers locked in
- **iOS/Android background restrictions** — Could kill always-on mic
- **Privacy Act enforcement** — Gate codes + addresses = sensitive
- **Recession → fewer parcels** → less driver income → less tool spend
- **Key person risk** — Solo founder, deep domain knowledge

---

## 4. Adjusted Priorities for V1 (MVP)

### 🟢 MUST HAVE (Phase C–E, Weeks 1–8)
1. **Compatibility Test App** (Week 1) — All 5 native modules on device
2. **Rapid Scan** — Continuous label scan + barcode + known-address instant accept
3. **Voice Dictation** — Continuous → LINZ correction → Review only problems → Correction report
4. **Master Template Lock** — Auto-learn from Day 1 + voice edit + multi-template
5. **Door Memory** — 3-point model (curb/park/door) + EWMA learning + "Pin wrong" correction
6. **Driving Screen** — 64px stop number, map, 3 huge buttons, earbud protocol, whispers
7. **Offline-First** — Vector tiles, local SQLite, queued sync, fast commands offline

### 🟡 SHOULD HAVE (Phase F, Weeks 9–11)
8. **Team Plan** — Franchisee dashboard, memory transfer, performance stats
9. **Stripe Subscriptions** — NZD + GST, Free/Pro/Team
10. **Web Dashboard** — Route editor, history, earnings (Phase 2+)

### 🔵 NICE TO HAVE (Phase 2+)
11. **OCR Manifest** — Claude Vision for paper manifests
12. **Earnings/KM/GST Tracker** — IRD-compliant logbook
13. **Customer Comms** — "3 stops away" SMS via voice
14. **CarPlay / Android Auto** — Screen mirror for driving
15. **Australia Launch** — GNAF, state APIs, local carriers

---

## 5. Technical Architecture Decisions (Confirmed)

| Area | Decision | Rationale |
|------|----------|-----------|
| **Mobile Framework** | Expo 52 + New Architecture | Single codebase, EAS builds, OTA updates |
| **Voice (Offline)** | Sherpa-onnx (Zipformer) + Porcupine wake word | <300ms, no cloud, keyword FST for commands |
| **Voice (Cloud)** | Deepgram Nova-3 `en-NZ` + Pipecat + Cartesia | Best NZ accuracy, tool-calling orchestration |
| **Maps** | MapLibre + PMTiles (planetiler) + LINZ raster | Offline vector, on-demand satellite, free |
| **Routing** | Valhalla (self-hosted) + VROOM/OR-Tools | Turn-by-turn + constraint-based sequencing |
| **Sync** | PowerSync (accept FSL) + op-sqlite | Offline-first, reactive, battle-tested |
| **Database** | Postgres 16 + PostGIS + pgvector (Supabase Sydney) | Geo + vectors, NZ residency, managed |
| **LLM Gateway** | LiteLLM (self-hosted, BSL OK for internal) | Model switching, fallback, prompt caching |
| **Auth** | Supabase Auth (JWT) | Shared across mobile, web, API, PowerSync |
| **Payments** | Stripe Billing + Stripe Tax (NZD/GST) | Handles NZ tax compliance automatically |

---

## 6. Go-to-Market Sequence (Validated)

| Phase | Target | Milestone | Success Metric |
|-------|--------|-----------|----------------|
| **Pilot** (Month 1–2) | 5–10 Christchurch drivers | Free beta, daily use | Intake <15 min, 0 misdeliveries (repeat), NPS >40 |
| **Canterbury** (Month 3–4) | 50 drivers | Paid Pro ($35), Team pilot | 30% trial→paid, franchisee interest |
| **National NZ** (Month 5–8) | 300 drivers | App Store/Play launch | $100K ARR, 4.5★ rating |
| **Australia** (Year 2) | Sydney/Melbourne | 500 drivers | $1M ARR, local address engine |

---

## 7. Resource Requirements (Updated)

| Role | Current | Needed | When |
|------|---------|--------|------|
| **Founder/Orchestrator** | 1 | — | Now |
| **Mobile Lead (Expo/RN)** | 0 | 1 | Week 1 |
| **Backend/Voice Lead (FastAPI/Pipecat)** | 0 | 1 | Week 2 |
| **Maps/Data Engineer** | 0 | 0.5 (contract) | Week 3 |
| **Designer (UX/UI)** | 0 | 0.5 (contract) | Week 4 |
| **Legal/Privacy (NZ)** | 0 | 0.25 (contract) | Month 1 |

**Budget (12 months):** ~$400K NZD (salaries, infra, Stripe, APIs, licenses, marketing)

---

## 8. Critical Path & Blockers

```
WEEK 1: Compatibility Test App ──→ PASS? ──→ Week 2: Rapid Scan + Dictation prototype
                                          │
                                          └──→ FAIL? ──→ Pivot: Mapbox / Native modules / Separate processes
```

**Top 3 Blockers:**
1. **Sherpa-onnx + VisionCamera JSI coexistence** — Test Week 1, decide Week 2
2. **iOS background mic/location** — Test Week 1 with foreground service pattern
3. **PowerSync FSL license** — Legal review Week 1, decide buy/build Week 2

---

## 9. Innovation Moat Defense (Why Spoke Can't Copy Fast)

| Moat Layer | Years to Replicate | Why Hard |
|------------|-------------------|----------|
| **Door-level memory (per address, per driver)** | 2+ | Requires 1000s of deliveries × drivers. Compounding. |
| **NZ address graph (LINZ + spoken fixes + lexicon)** | 1+ | Proprietary data pipeline + local knowledge |
| **Driver Rules Engine (speech → structured constraints)** | 1+ | NLU + solver integration + driver trust |
| **Voice-first UX (earbud buttons + whispers + dictation)** | 1+ | Requires redesign from tap-first architecture |
| **Franchisee lock-in (memory transfer + retention)** | 1+ | Network effect: more drivers = more value |

---

## 10. Final Recommendations to Proceed

### ✅ Green Light For:
1. **Start Phase C (Mobile Foundation)** — But Week 1 = Compatibility Test only
2. **Hire Mobile Lead immediately** — Blocker for all mobile work
3. **Begin LINZ import pipeline** — Can run in parallel, no mobile dependency
4. **File Callaghan Innovation grant** — NZ R&D funding, 40% eligible spend
5. **Schedule 3 franchisee meetings** — Aramex, NZ Couriers, PBT (Month 1)

### 🟡 Conditional Go (Resolve First):
1. **PowerSync license** — Legal opinion by Week 2. If no-go → custom sync (adds 3 weeks).
2. **Sherpa-onnx v0.3 stability** — Test v0.2.x pinned. If unstable → Whisper.cpp fallback.
3. **MapLibre + PMTiles on Expo 52** — Test Week 1. If fails → Mapbox (paid) or raster fallback.

### 🔴 Stop/Defer:
1. **OCR Manifest** — Defer to Phase 2 (after pilot validates core)
2. **Australia GNAF purchase** — Defer until NZ product-market fit proven
3. **CarPlay/Android Auto** — Defer to Phase 2 (nice-to-have)
4. **Earnings/GST tracker** — Defer to Phase 2 (adjacent, not core)

---

## 11. Next Steps (This Week)

| Action | Owner | Deadline |
|--------|-------|----------|
| Build Compatibility Test App (5 native modules) | Mobile Lead | Day 3 |
| Run on iPhone 15 + Pixel 8 (real devices) | Mobile Lead | Day 5 |
| Sherpa-onnx voice accuracy benchmark (truck cab recording) | Voice Lead | Day 5 |
| Battery test: 12h GPS + mic + screen | Mobile Lead | Day 7 |
| Legal review: PowerSync FSL + Privacy Act DPIA | Legal | Day 7 |
| LINZ Canterbury import script working | Data Lead | Day 5 |
| Franchisee outreach emails sent | Founder | Day 3 |

---

**Decision Gate: End of Week 1** — If Compatibility Test passes → Full speed ahead on Phase C. If fails → Pivot tech choices before investing more.

---

*This analysis synthesizes 7 research documents. All sources cited in respective files. Ready for Part 5 (Innovation) upon approval.*