# Red Team Risk Assessment — Courier Copilot

> **Last Updated:** October 2026
> **Role:** Critic / Red Team — attacks every assumption, feature, and decision.
> **Method:** STRIDE threat modeling, pre-mortem, regulatory review, competitive response simulation.

---

## 1. Technical Risks

| Risk | Likelihood | Impact | Score | Mitigation |
|------|------------|--------|-------|------------|
| **Sherpa-onnx + VisionCamera JSI conflict** | High | Critical | 🔴 9 | Phase C Week 1: Compatibility test app on device. Fallback: separate processes via TurboModule. |
| **MapLibre + PMTiles not working on Expo 52** | Medium | Critical | 🔴 8 | Test custom native module early. Fallback: Mapbox (paid) or tileserver-gl + raster. |
| **PowerSync FSL license blocks commercial use** | Medium | High | 🟠 7 | Legal review. Alternative: custom event sourcing + op-sqlite (more dev work). |
| **Offline map size > device storage (low-end Android)** | High | High | 🔴 8 | Progressive download, 500MB raster cap, user-managed clear, 64GB minimum spec. |
| **Valhalla routing errors on driveways/private roads** | High | High | 🔴 8 | Learned entry_point overrides. Manual "park here" saves park_point. |
| **iOS background audio + mic + location killed by OS** | Medium | Critical | 🔴 9 | Foreground service pattern (like nav apps). "Keep screen on" during shift. Earbud button works in background. |
| **Battery drain: 12h GPS + mic + BLE + screen** | High | High | 🔴 8 | Adaptive GPS (1Hz driving, 0.1Hz stopped). Wake word only when screen off. Charger on stand mandatory. |
| **Deepgram Nova-3 `en-NZ` accuracy insufficient** | Medium | High | 🟠 7 | Keyword boost with territory streets. Fallback: AssemblyAI / Gladia. Sherpa-onnx Moonshine offline fallback. |
| **Pipecat WebSocket reconnection on mobile flaky** | Medium | High | 🟠 7 | Exponential backoff, local queue for commands, fast path offline. |
| **LiteLLM BSL license compliance risk** | Low | Medium | 🟢 4 | Self-hosted internal use = allowed. Monitor license changes. Portkey backup. |

---

## 2. Product Risks

| Risk | Likelihood | Impact | Score | Mitigation |
|------|------------|--------|-------|------------|
| **Drivers won't trust voice for "Delivered"** | Medium | Critical | 🔴 8 | Earbud button = physical confirmation. Voice = convenience. Both log same event. |
| **Dictation correction report annoying/long** | Medium | High | 🟠 7 | Configurable verbosity. "Terse" mode: only errors. Test with real drivers weekly. |
| **Master Template Lock too rigid for new drivers** | Medium | High | 🟠 7 | "Learn from first week" auto-template. Manual drag-drop editor. Voice "move X before Y". |
| **NZ address coverage gaps (new subdivisions)** | High | Medium | 🟠 6 | LINZ weekly import. "Address not found" → manual pin + auto-submit to LINZ feedback. |
| **Whisper timing wrong (too early/late)** | High | High | 🔴 8 | Calibrate per driver (learn approach speed). GPS accuracy gate (>15m = suppress). |
| **Package Finder (van zones) inaccurate** | Medium | Medium | 🟠 6 | Driver speaks zone during load: "This rear". Learned over time. |
| **No OCR for handwritten manifests (Zeo beats us)** | Medium | Low | 🟢 3 | Phase 2: Claude Vision for photo of manifest. Phase 1: rapid scan labels only. |
| **Carrier (Aramex) bans 3rd party app** | Medium | High | 🟠 7 | "Alongside" mode: use ours for efficiency, theirs for POD. Franchisee pressure. |
| **Spoke copies voice + memory in 6 months** | High | Critical | 🔴 9 | Moat = compounding door memory + NZ data + driver rules. Hard to replicate quickly. |

---

## 3. Business & Market Risks

| Risk | Likelihood | Impact | Score | Mitigation |
|------|------------|--------|-------|------------|
| **TAM too small (NZ only ~6K contractors)** | Low | High | 🟠 6 | Australia 6x larger. UK/Canada/US later. Same model. |
| **Contractors won't pay $35/mo** | Medium | Critical | 🔴 8 | Free tier (30 stops). 2-week trial. ROI demo: "Saved 1hr = $300/mo". Franchisee pays Team plan. |
| **Stripe NZD + GST setup delays launch** | Low | Medium | 🟢 4 | Stripe Tax auto-calculates GST. Test in sandbox early (Phase F). |
| **Apple/Google reject app (background mic/location)** | Medium | High | 🟠 7 | Navigation app category. Clear privacy manifest. "While using" + "Always" with purpose strings. |
| **Privacy Act 2020 non-compliance** | Low | Critical | 🔴 8 | Privacy by design. Data minimization. NZ data residency (Supabase Sydney). Deletion on request. DPIA done. |
| **Insurance/liability if whisper causes accident** | Low | Critical | 🔴 8 | TOS: "Driver responsible". Whisper <15 words. No screen interaction. Earbud buttons. Legal review. |
| **Funding runs out before revenue** | Medium | High | 🟠 7 | Lean team (3). Revenue at Month 4 (pilot paid). Grant: Callaghan Innovation (NZ R&D). |

---

## 4. Competitive Response Scenarios

| Competitor | Likely Response | Our Counter |
|------------|-----------------|-------------|
| **Spoke adds voice dictation** | 6–12 months (they have resources) | Our dictation = LINZ-verified + correction report + continuous. Theirs = generic STT. |
| **Spoke adds "route memory"** | 12–18 months (architectural change) | We have 2-year head start on door-level data. Compounding value. |
| **Zeo adds voice commands** | Low priority (focus on OCR) | We own voice-first UX. |
| **Aramex builds better Blu** | Possible (Christchurch dev team) | They build for *their* process. We build for *driver*. Open to all carriers. |
| **Google/Apple Maps adds "delivery mode"** | Long term | They don't have driver rules, template lock, door memory, van zones. |
| **New entrant (VC-backed)** | Always possible | Speed of execution. Driver love. Data moat. |

---

## 5. Pre-Mortem: "It's October 2027. We Failed. Why?"

| Failure Mode | Root Cause | Early Warning Signal |
|--------------|------------|----------------------|
| **Technical: Voice never reliable in truck** | Sherpa-onnx + noise = 40% command error | Phase C Week 2: <90% accuracy on device test |
| **Product: Drivers revert to Spoke** | Template lock too rigid, voice annoying | Pilot Week 2: <60% daily active use |
| **Market: No one pays** | Free tier too generous / value not clear | Month 2: <20% trial→paid conversion |
| **Business: Aramex blocks / acquihires** | Franchisees forced to use Blu | Month 3: Franchisee feedback "can't use" |
| **Team: Burnout / key person leaves** | 15-week crunch, solo founder | Weekly retros. Sustainable pace. Docs for bus factor. |

---

## 6. Regulatory & Legal Risks (NZ Focus)

| Area | Risk | Status |
|------|------|--------|
| **Privacy Act 2020** | Address + GPS + gate codes = personal info | ✅ DPIA planned. Data minimization. Encryption at rest/in transit. NZ residency. |
| **Health & Safety at Work Act** | App distraction while driving | ✅ Voice-first. Earbud buttons. No touch required. "Driving mode" locks screen. |
| **Contractor vs Employee** | Tool could imply control → employee risk | ✅ Driver owns data. Tool = productivity, not control. Franchisee pays, not employer. |
| **GST on Digital Services** | Stripe Tax handles | ✅ Configured in Stripe dashboard. |
| **Telecommunications Act** | VoIP? No — we use WebSocket for voice, not PSTN | ✅ Not a telco service. |
| **Consumer Guarantees Act** | App fails → loss of income | ✅ TOS limitation of liability. SLA for Pro: 99.5% uptime. |

---

## 7. Data Security Threat Model (STRIDE)

| Threat | Vector | Likelihood | Mitigation |
|--------|--------|------------|------------|
| **Spoofing** | Fake driver account | Low | Supabase Auth (email/phone + MFA). Device binding. |
| **Tampering** | Modified delivery events | Medium | Immutable append-only `delivery_events`. Client UUID idempotency. |
| **Repudiation** | Driver denies "delivered" | Low | GPS + timestamp + photo (optional) + voice utterance logged. |
| **Information Disclosure** | Address + gate codes leaked | Medium | RLS in Postgres. Encryption at rest. Gate codes encrypted separately. PII masked in Sentry/PostHog. |
| **Denial of Service** | API overload | Low | Rate limiting. Cloudflare WAF. Auto-scale Fly.io. |
| **Elevation of Privilege** | Driver accesses other's data | Low | RLS: `driver_id = auth.uid()`. API checks ownership. |

---

## 8. Risk Register Summary (Top 10)

| # | Risk | Owner | Status | Next Action |
|---|------|-------|--------|-------------|
| 1 | Sherpa-onnx + VisionCamera JSI conflict | Mobile Lead | 🔴 Open | Week 1 Phase C: Compatibility test app |
| 2 | iOS background mic/location killed | Mobile Lead | 🔴 Open | Week 1 Phase C: Foreground service test |
| 3 | Spoke copies voice + memory | Founder | 🟠 Monitoring | Build moat: door memory + NZ data + rules |
| 4 | Drivers won't trust voice "Delivered" | Product Lead | 🟠 Testing | Pilot Week 1: Earbud button + voice parity |
| 5 | Battery < 12h shift | Mobile Lead | 🟠 Open | Phase C Week 3: Battery benchmark |
| 6 | Aramex blocks 3rd party app | Biz Lead | 🟠 Open | Month 2: Franchisee conversations |
| 7 | NZ address gaps (new builds) | Data Lead | 🟢 Mitigated | Weekly LINZ import + manual pin fallback |
| 8 | Privacy Act non-compliance | Legal | 🟢 Planned | Month 1: DPIA + privacy policy |
| 9 | LiteLLM BSL license change | Backend Lead | 🟢 Monitored | Portkey backup evaluated |
| 10 | Funding runway < 12 months | Founder | 🟠 Planned | Callaghan Innovation grant application |

---

## 9. Red Team Recommendations (Must-Fix Before Pilot)

1. **Week 1:** Device compatibility test (all 5 native modules) — **blocker for Phase C**
2. **Week 2:** Voice accuracy benchmark in real truck cab (30 min recording)
3. **Week 3:** Battery life test (12h GPS + mic + screen on)
4. **Week 4:** Privacy DPIA complete, legal review TOS
5. **Month 1:** 3 franchisee conversations (Aramex, NZ Couriers, PBT)
6. **Month 2:** Pilot driver NPS > 40, daily active use > 80%

---

## 10. Sources

| Source | Date | Type |
|--------|------|------|
| NZ Privacy Act 2020 | 2020 | Legislation |
| Health & Safety at Work Act 2015 | 2015 | Legislation |
| Apple App Store Review Guidelines | 2026 | Platform Policy |
| Google Play Developer Policy | 2026 | Platform Policy |
| STRIDE Threat Modeling | Microsoft | Methodology |
| Pre-mortem technique | Gary Klein / Harvard Business Review | Methodology |