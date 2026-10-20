# Area 2 — Payments & subscriptions (Stripe NZD + GST, RevenueCat-style IAP, entitlements, invoicing)

**Researcher:** Researcher role (V4 §1.2) · **Research date:** 2026-10-20 · **Squad:** Payments & Accounts
**Binding inputs:** `docs/KICKOFF_V4_EN.md` §3, §7, §10.3 ("Payments & Accounts — Better Auth, Stripe NZD, teams: tenant isolation tests, webhook idempotency"), §11, §12 · `CONSTRAINTS.md` (no GPL/AGPL/SSPL/Commons-Clause/CC-NC/FSL/**BUSL** in the shipped app; zero high/critical advisories; ≥ 90 % coverage on the auth/billing path) · `docs/design/SYSTEM.md`.
**Product rules held in mind:** prices in **NZD, GST inclusive**; one customer type (independent courier) plus **teams** (a courier business with several drivers) → **multi-tenant, org-scoped billing**; webhook **idempotency**; no PII in logs; audit log for admin actions; no provider may train on driver/customer data.

---

## 0. Method and honest limits

- GitHub facts read on **2026-10-20** from `scripts/gh.ps1` (`gh api repos/<o>/<r>`, `gh api repos/<o>/<r>/security-advisories`, `gh api repos/<o>/<r>/license`, `gh api repos/<o>/<r>/commits?per_page=20`, `gh search repos`).
- npm facts from `registry.npmjs.org` + `api.npmjs.org/downloads/point/last-month` (window 2026-09-19 → 2026-10-19).
- Commercial facts (Stripe pricing in NZ, Play payments policy, NZ GST) come from the **vendor/government primary sources** named in §6 — each is cited, not assumed.
- **6-month star trend: UNVERIFIED for every candidate** (token has no `stargazer` scope → `403 Resource not accessible by personal access token`; GraphQL `stargazers{edges{starredAt}}` → `FORBIDDEN`). The verifiable momentum proxy used is release cadence in the 6 months to 2026-10-20 + commits in 90 days + distinct human maintainers in 90 days.
- Issue counts are `issues(states:OPEN|CLOSED).totalCount` and **include pull requests**.
- Repo licences are read from the **LICENSE file**, not the API's `license.spdx_id`, because 14 of the candidates report `NOASSERTION`. Where the file is a mixed or custom licence, that is stated.
- No benchmark ran on a device this sprint → every benchmark row is **UNVERIFIED** and names the set to build.

---

## 1. Queries run (V4 §12.2)

| # | Query string | Sort |
|---|---|---|
| A2-01 | `topic:stripe topic:react-native` | stars |
| A2-02 | `topic:in-app-purchases` | stars |
| A2-03 | `stripe react-native in:name` | stars |
| A2-04 | `subscription billing engine in:description stars:>100` (0 results) | stars |
| A2-05 | `topic:stripe stars:>100 pushed:>2026-04-01` | stars |
| A2-06 | `topic:invoicing stars:>100` | stars |
| A2-07 | `topic:better-auth` | stars |
| A2-08 | `topic:revenuecat` / `revenuecat in:name` | stars |
| A2-09 | `entitlements in:name,description stars:>20` | stars |
| A2-10 | `new zealand gst tax invoice in:description` | stars |
| A2-11 | `topic:payments topic:billing stars:>50` | stars |
| A2-12 | `google play billing kotlin in:name` | stars |

API calls: `repos/{o}/{r}` × 40 · `repos/{o}/{r}/security-advisories` × 12 · `repos/{o}/{r}/license` × 20 · `repos/{o}/{r}/readme` × 6 · `repos/{o}/{r}/commits?per_page=20` × 5 · npm registry × 18 · npm downloads × 14 · web searches × 4 (IRD GST, Google Play payments policy, Stripe NZ pricing, Stripe supported currencies).

---

## 2. Evidence cards — 38 candidates (V4 §12.3)

Legend: `Rel/6m` = releases 2026-04-20→2026-10-20 · `c90` = commits/90 d · `maint` = non-bot authors/90 d · `adv` = GitHub advisories (with severity) · `dl30` = npm downloads 2026-09-19→2026-10-19.

### 2.1 Stripe family and payment SDKs

| # | Repo | ★ | Created | Pushed | Last release | Rel/6m | Open/Closed | c90 | maint | Licence | Size KB | Platform | adv | dl30 | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [stripe/stripe-node](https://github.com/stripe/stripe-node) | 4,534 | 2011-09-28 | 2026-10-19 | v23.1.0-alpha.3 @2026-10-14 | 15+ | 37/965 | 64 | 7 | MIT | 44,537 | server | 0 | 94,606,198 | **ADOPT** |
| 2 | [stripe/stripe-react-native](https://github.com/stripe/stripe-react-native) | 1,429 | 2020-12-16 | 2026-10-20 | v0.82.0 @2026-10-14 | 15+ | 136/1287 | 128 | 18 | MIT | 9,984 | on-device | 0 | UNVERIFIED (registry `/latest` failed once; repo tag v0.82.0) | WATCH (Play-policy risk, see §6.4) |
| 3 | [stripe/stripe-android](https://github.com/stripe/stripe-android) | 1,549 | 2012-11-29 | 2026-10-20 | v23.24.0 @2026-10-19 | 15+ | 37/1303 | 914 | 13 | MIT | 945,122 | on-device | 0 | UNVERIFIED | WATCH |
| 4 | [stripe/stripe-ios](https://github.com/stripe/stripe-ios) | 2,576 | 2012-11-12 | 2026-10-19 | 26.15.0 @2026-10-19 | 15+ | 79/1169 | 439 | 15 | MIT | 1,625,474 | on-device | 0 | UNVERIFIED | WATCH |
| 5 | [stripe/stripe-python](https://github.com/stripe/stripe-python) | 2,054 | 2011-06-25 | 2026-10-20 | v16.1.0a3 @2026-10-14 | 15+ | 19/405 | 53 | 5 | MIT | 43,692 | server | 0 | UNVERIFIED | KEEP (API service may be Python) |
| 6 | [stripe/stripe-mock](https://github.com/stripe/stripe-mock) | 1,657 | 2017-06-20 | 2026-10-01 | v0.206.0 @2026-10-01 | 9 | 6/132 | 9 | 2 | MIT | 105,766 | server (test double) | 0 | UNVERIFIED | **ADOPT (test)** |
| 7 | [stripe/stripe-cli](https://github.com/stripe/stripe-cli) | 2,211 | 2019-06-14 | 2026-10-20 | v1.54.1 @2026-10-19 | 15+ | 168/379 | 166 | 15 | **Apache-2.0** (LICENSE file) | 29,803 | CLI | 0 | UNVERIFIED | WATCH (local webhook replay) |
| 8 | [juspay/hyperswitch](https://github.com/juspay/hyperswitch) | 45,378 | UNVERIFIED | 2026-10-20 | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | Apache-2.0 (API) | UNVERIFIED | server | UNVERIFIED | UNVERIFIED | REJECT (payment orchestrator; we need one PSP, not a router) |
| 9 | [tipsi/tipsi-stripe](https://github.com/tipsi/tipsi-stripe) | 1,135 | 2016-10-27 | 2023-06-20 | 5.0.0 @2018-03-21 | 0 | 2/549 | 0 | 0 | MIT | 2,950 | on-device | 0 | UNVERIFIED | REJECT (archived; replaced by stripe-react-native) |

### 2.2 In-app purchase / entitlement SDKs

| # | Repo | ★ | Created | Pushed | Last release | Rel/6m | Open/Closed | c90 | maint | Licence | Size KB | Platform | adv | dl30 | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 10 | [RevenueCat/react-native-purchases](https://github.com/RevenueCat/react-native-purchases) | 1,215 | 2018-06-21 | 2026-10-20 | 10.15.0 @2026-10-19 | 15+ | 62/354 | 139 | 13 | MIT | 12,212 | on-device + hosted service | 0 | 3,246,760 | **ADOPT (pattern + SDK, MIT only)** |
| 11 | [RevenueCat/purchases-ios](https://github.com/RevenueCat/purchases-ios) | 3,080 | 2017-10-23 | 2026-10-20 | 5.96.0 @2026-10-16 | 15+ | 56/622 | 487 | 17 | MIT | 62,284 | on-device | 0 | UNVERIFIED | WATCH |
| 12 | [qonversion/react-native-sdk](https://github.com/qonversion/react-native-sdk) | 130 | 2020-05-11 | 2026-10-14 | 10.12.0 @2026-09-23 | 9 | 0/51 | 19 | 3 | MIT | 3,448 | on-device + service | 0 | UNVERIFIED | WATCH |
| 13 | [adaptyteam/AdaptySDK-React-Native](https://github.com/adaptyteam/AdaptySDK-React-Native) | 186 | 2020-09-28 | 2026-10-19 | v4.2.3 @2026-10-09 | 13 | 1/151 | 99 | 3 | MIT | 6,353 | on-device + service | 0 | UNVERIFIED | WATCH |
| 14 | [apphud/ApphudSDK-React-Native](https://github.com/apphud/ApphudSDK-React-Native) | 10 | 2020-03-24 | 2026-10-12 | 5.2.1 @2026-10-12 | 7 | 1/11 | 32 | 2 | MIT | 123,073 | on-device + service | 0 | UNVERIFIED | WATCH |
| 15 | [hyodotdev/openiap](https://github.com/hyodotdev/openiap) | 158 | 2025-08-12 | 2026-10-19 | expo-iap-6.1.1 @2026-10-18 | 15+ | 4/99 | 537 | 1 | MIT | 190,906 | on-device (unified API) | 0 | UNVERIFIED | **WATCH — strongest challenger** |

### 2.3 Billing engines, entitlement services, invoicing

| # | Repo | ★ | Created | Pushed | Last release | Rel/6m | Open/Closed | c90 | maint | Licence (LICENSE file) | Size KB | Platform | adv | dl30 | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 16 | [better-auth/better-auth](https://github.com/better-auth/better-auth) | 30,385 | 2024-05-19 | 2026-10-20 | v1.7.11 @2026-10-19 | 15+ | 381/3585 | 496 | 29 | MIT | 166,305 | server (+ RN client) | **28 (3 critical, 12 high — incl. `@better-auth/stripe` org-isolation)** | 44,611,654 | **ADOPT (pin ≥ 1.7.11)** |
| 17 | [polarsource/polar](https://github.com/polarsource/polar) | 10,373 | 2023-01-26 | 2026-10-20 | @polar-sh/cli@3.0.0 @2026-10-16 | 15+ | 68/2364 | 1,835 | 10 | **Apache-2.0** | 557,851 | server | 0 | UNVERIFIED | WATCH (best licence of the billing engines) |
| 18 | [getlago/lago](https://github.com/getlago/lago) | 10,696 | 2022-02-28 | 2026-10-20 | v1.55.0 @2026-10-07 | 13 | 16/225 | 50 | 14 | **AGPL-3.0** | 156,846 | server | 0 | UNVERIFIED | **REJECT as dependency — clean-room study only (§11.2)** |
| 19 | [openmeterio/openmeter](https://github.com/openmeterio/openmeter) | 2,392 | 2023-06-06 | 2026-10-19 | v1.0.0-beta.236 @2026-10-09 | 9 | 21/99 | 434 | 7 | **Apache-2.0** | 139,979 | server | 0 | UNVERIFIED | WATCH (usage metering; we bill flat → not needed yet) |
| 20 | [meteroid-oss/meteroid](https://github.com/meteroid-oss/meteroid) | 1,337 | 2023-07-13 | 2026-10-09 | v1.0.0-rc7 @2026-08-24 | 3 | 8/36 | 10 | 4 | **AGPL-3.0** | 41,132 | server | 0 | UNVERIFIED | **REJECT as dependency — clean-room study only** |
| 21 | [flexprice/flexprice](https://github.com/flexprice/flexprice) | 6,883 | 2024-11-05 | 2026-10-20 | v2.1.40 @2026-10-17 | 15+ | 80/35 | 2,220 | 9 | **AGPL-3.0** | 236,154 | server | 0 | UNVERIFIED | **REJECT as dependency — clean-room study only** |
| 22 | [dubinc/dub](https://github.com/dubinc/dub) | 24,917 | 2022-08-27 | 2026-10-20 | no GitHub releases | 0 | 55/826 | 2,685 | 6 | **source-available, directory-scoped** ("Portions of this software … are licensed as follows") | 93,716 | server | 0 | UNVERIFIED | REJECT (not a standard permissive licence) |
| 23 | [yournextstore/yournextstore](https://github.com/yournextstore/yournextstore) | 5,526 | 2024-08-05 | 2026-10-19 | v1.0.0 @2026-01-26 | 0 | 2/94 | 179 | 3 | MIT (LICENSE file) | 384,321 | server | 0 | UNVERIFIED | WATCH (commerce, not billing) |
| 24 | [mickasmt/next-saas-stripe-starter](https://github.com/mickasmt/next-saas-stripe-starter) | 3,006 | 2023-10-18 | 2026-09-28 | v2.0.0 @2026-09-26 | 1 | 0/64 | 98 | 1 | MIT | 4,838 | reference app | 0 | UNVERIFIED | WATCH (reference pattern only) |
| 25 | [vercel/next-forge](https://github.com/vercel/next-forge) | 7,668 | 2023-01-02 | 2026-05-28 | v6.0.2 @2026-03-20 | 0 | 17/213 | 0 | 0 | MIT | 20,234 | template | 0 | UNVERIFIED | WATCH (starter template reference) |
| 26 | [kdeldycke/awesome-billing](https://github.com/kdeldycke/awesome-billing) | 1,357 | 2019-06-12 | 2026-10-12 | none | 0 | 2/14 | 10 | 1 | **CC0-1.0** | 7,808 | reading list | 0 | UNVERIFIED | KEEP as a lead source |
| 27 | [SolidInvoice/SolidInvoice](https://github.com/SolidInvoice/SolidInvoice) | 979 | 2012-12-19 | 2026-10-19 | 3.1.1 @2026-10-15 | 6 | 128/196 | 403 | 3 | MIT | 156,107 | server | 0 | UNVERIFIED | WATCH (NZ-independent invoicing app) |
| 28 | [InvoicePlane/InvoicePlane](https://github.com/InvoicePlane/InvoicePlane) | 3,220 | 2014-05-21 | 2026-10-18 | v1.7.2 @2026-08-28 | 4 | 62/394 | 183 | 4 | **custom licence** (LICENSE file header "Copyright Notice for the InvoicePlane…") | 44,357 | server | 0 | UNVERIFIED | REJECT (custom licence, not permissive) |
| 29 | [frappe/books](https://github.com/frappe/books) | 4,999 | 2018-01-08 | 2026-10-02 | v0.36.0 @2025-11-06 | 0 | 108/588 | 29 | 4 | **AGPL-3.0**, repo archived | 16,814 | server | 0 | UNVERIFIED | **REJECT — clean-room study only** |
| 30 | [akaunting/akaunting](https://github.com/akaunting/akaunting) | 10,193 | 2017-06-21 | 2026-10-08 | 3.2.4 @2026-09-17 | 5 | 4/1317 | 179 | 7 | **Business Source License (BSL)** — MariaDB BSL text | 87,541 | server | 0 | UNVERIFIED | **REJECT — BSL is banned by CONSTRAINTS.md** |
| 31 | [dj-stripe/dj-stripe](https://github.com/dj-stripe/dj-stripe) | 1,795 | 2013-08-05 | 2026-10-14 | 2.11.0 @2026-06-26 | 1 | 11/1060 | 15 | 3 | MIT | 7,975 | server (Django) | 0 | UNVERIFIED | REJECT (Django-only; our API is Python/FastAPI) |
| 32 | [laravel/cashier-stripe](https://github.com/laravel/cashier-stripe) | 2,546 | 2014-03-04 | 2026-10-17 | v16.9.0 @2026-10-13 | 6 | 14/868 | 21 | 5 | MIT | 48,169 | server (Laravel) | 0 | UNVERIFIED | WATCH (read the subscription lifecycle code) |
| 33 | [pay-rails/pay](https://github.com/pay-rails/pay) | 2,262 | 2017-02-01 | 2026-10-17 | v12.3.0 @2026-10-06 | 12 | 0/386 | 55 | 7 | MIT | 8,270 | server (Rails) | 0 | UNVERIFIED | WATCH (subscription state machine reference) |
| 34 | [medusajs/medusa](https://github.com/medusajs/medusa) | 36,817 | 2020-01-18 | 2026-10-20 | v2.21.2 @2026-09-28 | 15+ | 83/3987 | 537 | 19 | **MIT except `/ENTERPRISE-LICENSE.md` materials** | 901,526 | server | 0 | UNVERIFIED | WATCH (commerce engine, not needed) |
| 35 | [saleor/saleor](https://github.com/saleor/saleor) | 23,459 | 2013-02-12 | 2026-10-19 | 3.22.74 @2026-10-19 | 15+ | 201/4213 | 127 | 8 | **BSD-3-Clause** | 248,993 | server | 0 | UNVERIFIED | REJECT (headless commerce; wrong domain) |
| 36 | [vendurehq/vendure](https://github.com/vendurehq/vendure) | 8,527 | 2018-06-11 | 2026-10-19 | v3.8.0 @2026-10-12 | 9 | 165/2602 | 869 | 16 | **dual licence** ("available under two different licenses") | 166,273 | server | 0 | UNVERIFIED | REJECT (licence not clean) |
| 37 | [expo/eas-cli](https://github.com/expo/eas-cli) | 1,370 | 2020-08-12 | 2026-10-20 | v25.2.0 @2026-10-17 | 15+ | 262/1159 | 483 | 16 | MIT | 40,371 | CLI | 0 | UNVERIFIED | KEEP (see Area 4 — submit/credentials) |
| 38 | [a-tokyo/react-native-stripe-checkout-webview](https://github.com/a-tokyo/react-native-stripe-checkout-webview) | 91 | 2020-09-01 | 2026-07-01 | 0.1.0 @2026-06-05 | 1 | 3/22 | 0 | 0 | MIT | 1,490 | on-device (WebView) | 0 | UNVERIFIED | WATCH (only if Play policy forces a web checkout) |

**Asset/model licence note:** all IAP SDKs here ship **client code only**; entitlement *state* lives in the vendor's hosted service (RevenueCat/Qonversion/Adapty/Apphud) — we may adopt the MIT SDK, but the service is a commercial dependency and a data processor under the NZ Privacy Act. `openiap` is the only **server-side/unified protocol** candidate with no vendor lock-in.

---

## 3. Shortlist (12) — better than our current choice, risks, decision

| Candidate | Better than our current choice | Risk | Decision + reason |
|---|---|---|---|
| `stripe/stripe-node` | Typed API client, `stripe-mock` for deterministic tests, webhooks with signature verification + tolerance, v23 shipping 15+ releases/6 m, 94.6 M dl/30 d | none material | **ADOPT** — the server-side Stripe client. Pin `stripe@23.0.0` (npm latest) |
| `stripe/stripe-mock` | Lets the whole billing test-suite run offline and deterministic — directly serves the ≥ 90 % coverage and "no mock what the test claims to verify" rule (CONSTRAINTS.md) | mock ≠ production; keep one live-mode smoke test | **ADOPT (test-only)** |
| `RevenueCat/react-native-purchases` | The reference IAP client: one entitlement API for App Store + Play + (web) Stripe, 10.15.0 on 2026-10-19, 15+ releases/6 m, 13 human maintainers, **MIT**, and their repo now runs **Maestro purchase flows on the old architecture** (commit 2026-10-13) — they test what we must test | hosted service = vendor + data processor; SDK adds bundle size | **ADOPT the SDK (MIT) + copy the entitlement model**; self-hosting RevenueCat is not possible → keep a `BillingProvider` interface so a self-hosted backend can replace it (V4 §6.1 adapter rule) |
| `hyodotdev/openiap` | Vendor-neutral, standardised IAP protocol across stores; MIT; 537 commits/90 d; very young (created 2025-08-12), 1 maintainer | maturity risk, 158 ★ | **WATCH — the challenger to watch**; re-evaluate in 2 radar cycles |
| `better-auth/better-auth` | Auth + orgs + Stripe plugin + client in one MIT package; 30.4 k ★, 44.6 M dl/30 d, 29 human maintainers, release v1.7.11 on 2026-10-19 | **28 advisories**, incl. 3 critical and `@better-auth/stripe`: "Organization billing actions can run on the wrong organization" (GHSA-h3rm-78g3-j7cp, high, patched 1.6.21) | **ADOPT, but only ≥ 1.7.11**, and write a **tenant-isolation test for the billing plugin** (V4 §10.3) because this bug class has already happened upstream |
| `polarsource/polar` | The only full billing engine with a clean **Apache-2.0** licence; 10.4 k ★, 15+ releases/6 m | self-hosting cost; feature overkill for flat plans | **WATCH** — reference implementation for subscription lifecycle + entitlements |
| `getlago/lago`, `meteroid-oss/meteroid`, `flexprice/flexprice`, `frappe/books` | Rich entitlement/invoice/webhook models | **AGPL-3.0** | **REJECT as dependencies** → clean-room study list (§11.2); never quote their code |
| `dubinc/dub` | Mature subscription + link management | source-available, directory-scoped licence | **REJECT** |
| `laravel/cashier-stripe`, `pay-rails/pay` | Clean subscription state machines (trial → active → past_due → cancelled), proration rules | different language | **WATCH (read)** — the state machine is the part we must copy |
| `SolidInvoice/SolidInvoice` | MIT invoicing with 6 releases/6 m; no GST-NZ specifics | heavier than needed | **WATCH** — for the "send an invoice" path only |
| `akaunting/akaunting` | Accounting-grade invoicing | **BSL** → banned by CONSTRAINTS.md | **REJECT** |
| `stripe/stripe-react-native` | Official card UI, SCA/3DS, Apple Pay | **Google Play payments policy**: an in-app digital subscription sold in a Play-distributed app must use Play Billing, so a Stripe-only in-app purchase is a policy risk (§6.4) | **WATCH** — use for one-off "top-up" style flows only if policy allows; do not use for the subscription |

---

## 4. Deep review — top 5 (V4 §12.4)

### 4.1 `stripe/stripe-node` (4,534 ★, MIT, npm `stripe@23.0.0`)
- **README / docs:** points at the API reference `stripe.com/docs/api?lang=node`; "Requirements" section pinned to a Node version — **Node 18 support dropped in commit 2026-09-28** → our `engines.node >= 22` is satisfied.
- **Architecture:** fully generated from Stripe's OpenAPI spec; v23 introduced the **API v2** surface (`Add API v2 Search support`, commit 2026-10-14) and hand-written `V2List/V2SearchResult` namespace exports (2026-10-16).
- **Webhooks — the pattern that matters to us (V4 §10.3 "webhook idempotency"):** the last 20 commits include `Reject blank webhook secrets` (2026-10-19), `Fix notification handling and discarded fetch retries` (2026-10-19), `verifyHeader and verifyHeaderAsync methods to use DEFAULT_TOLERANCE` (2026-09-29), `Classify incomplete response bodies as connection errors` (2026-09-28). **Take three rules from this:** (a) reject a webhook if the signing secret is empty (fail closed); (b) a constant default tolerance on the signature timestamp, configurable per call; (c) never treat a truncated body as a valid event.
- **Idempotency:** the client supports idempotency keys; our webhook handler must additionally dedupe on `event.id` (store the last N ids, or a unique index on `stripe_event_id` in `services/auth` / the billing table) — **our** rule, to be tested.
- **Testing:** `stripe/stripe-mock` is pinned to the SDK's OpenAPI version (commit 2026-09-29) — the mock and the client cannot drift. Adopt both together.
- **Code quality:** generated code + a hand-written layer; type definitions are complete; `mint`/lint tooling unknown → UNVERIFIED.
- **Security:** 0 advisories on the repo.
- **Verdict:** **ADOPT** — `stripe@23.0.0` pinned exactly; `stripe-mock@0.206.0` for the test suite.

### 4.2 `RevenueCat/react-native-purchases` (1,215 ★, MIT, npm `react-native-purchases@10.15.0`)
- **README / docs:** positions itself as "a powerful, reliable and free to use in-app purchase **server** with cross-platform support" — the **server is not open source**; the SDK is MIT.
- **Architecture:** SDK → store (App Store / Play) → RevenueCat backend → **webhooks** back to our server; entitlements are configured remotely in their dashboard and exposed through a single `CustomerInfo` object. That "one entitlement model, many stores" shape is exactly what a team plan needs.
- **Last 20 commits (2026-10-13 → 2026-10-19):** `Run Maestro purchase flow on old architecture` (2026-10-13) — **they run Maestro purchase flows against the legacy architecture**, which is exactly the CI coverage we must add for our own paywall; also `feat(ads): admob adapter` (2026-10-16) and release automation per patch version.
- **API ergonomics:** `Purchases.configure({ apiKey })` → `getCustomerInfo()` → `purchaseStoreProduct()`; `logIn`/`logOut` for user mapping. We should wrap it behind our own `BillingProvider` interface (V4 §6.1) so the service can be swapped.
- **Extensibility:** entitlement identifiers are strings — we can mirror our plan keys (`team_driver_monthly`) as RevenueCat product ids.
- **Tests:** CI with Fastlane release pipelines, an `AGP9TestApp` E2E project, Maestro purchase flows → better test rigour than most candidates.
- **Security:** 0 advisories. Supply chain: the npm package pulls `@revenuecat/purchases-js-hybrid-mappings` and `@revenuecat/purchases-typescript-internal` — both first-party, but they widen the dependency surface; record them in `docs/LICENSES.md`.
- **Risks:** vendor lock-in; NZ Privacy Act exposure (purchase data is processed by RevenueCat); price tiers must be identical across stores (Apple/Google parity rules) — the **NZD GST-inclusive** price has to be configured per store, and Google/Apple require the displayed price to be what is charged.
- **Verdict:** **ADOPT the SDK + the entitlement pattern**; keep the backend swap-able.

### 4.3 `better-auth/better-auth` (30,385 ★, MIT, npm `better-auth@1.7.11`)
- **README / docs:** docs site + an official MCP server + an "OSS Scanner" CI config (commit 2026-10-20 `chore: configure Anthropic OSS Scanner`).
- **Architecture:** framework-agnostic core (`@better-auth/core`), adapters (Prisma, Drizzle, Kysely, Mongo, Memory), plugins as the extension point — the **Stripe plugin** and **organization plugin** are how we get teams + billing on one auth system.
- **Last 20 commits are security work:** `fix(core): reject ID tokens when the provider has no client ID` (2026-10-20), `fix(oauth-proxy): run the standard callback checks on proxied callbacks` (2026-10-20), `fix(jwt): verify tokens with the stored key's algorithm` (2026-10-19), `fix(core): verify id_tokens with one shared policy` (2026-10-19), `docs: add security contact email to SECURITY.md` (2026-10-19). That is a mature response to a security problem, not a hobby project.
- **Advisory history — read this before adopting:** **28 advisories** on the repo, including
  - **critical** GHSA-965c-763c-88jm — "OAuth state can be used as a Magic Link to sign in as another user" (patched 1.7.7),
  - **critical** GHSA-rjg6-39jm-rgg4 — SCIM token takeover (patched 1.6.22),
  - **critical** GHSA-5rr4-8452-hf4v — SSO: "Any signed-in user can make the server fetch and read internal URLs" (patched 1.6.11),
  - **high** GHSA-h3rm-78g3-j7cp — **"@better-auth/stripe: Organization billing actions can run on the wrong organization"** (patched 1.6.21) ← *directly the tenant-isolation class V4 §10.3 demands we test*,
  - 12 further highs (SSO provider confusion, magic-link password persistence, device-login approval UX, OAuth-proxy sign-in, rate-limit bypass via IPv6 rotation, session-cache 2FA skip, double-slash path bypass).
- **Risk assessment:** the volume is high but every advisory is *patched*, and `1.7.11` is above the highest patched version (1.7.7). The pattern shows a fast-moving auth library with a rapid patch cadence — acceptable **only** with (a) an exact pin, (b) a dependency gate in CI, (c) our own tenant-isolation and rate-limit tests, (d) a monthly re-read of the advisory list.
- **Verdict:** **ADOPT at `1.7.11` or later**, with an explicit "no plugin enabled without a test" rule. **No `@better-auth/scim`, no `@better-auth/sso`** in v1 (we do not need SCIM/SSO for courier teams) → smaller attack surface.

### 4.4 `polarsource/polar` (10,373 ★, Apache-2.0)
- **README / docs:** a full open-source billing platform (merchant of record style) with a CLI (`@polar-sh/cli@3.0.0`).
- **Architecture:** TypeScript service, event-driven, webhooks with signature checks; a large monorepo (557 MB) with 1,835 commits in 90 days — extremely active.
- **Why it matters here:** it is the **only** full billing engine in this list with a clean permissive licence (Apache-2.0) and no vendor lock-in.
- **Why it does not fit yet:** we sell **one flat plan (and one team plan)** in NZD; a self-hosted billing engine is a service to run, secure, back up and upgrade — a large fixed cost for a feature Stripe already provides in 15 lines.
- **Tests / CI:** 1,835 commits/90 d; test tooling UNVERIFIED.
- **Security:** 0 advisories.
- **Verdict:** **WATCH.** Read its subscription lifecycle and entitlement code; adopt only if we need usage-based pricing or a merchant-of-record model later.

### 4.5 `hyodotdev/openiap` (158 ★, MIT, created 2025-08-12)
- **README / docs:** "Standardized protocol for in-app purchases across all platforms — backed by Meta & Amazon" (repo topics). Latest release tag `expo-iap-6.1.1` on 2026-10-18 — i.e. it ships an **Expo module** too.
- **Architecture:** a protocol + client libraries, so an app can talk to App Store / Play / Amazon / Meta / Horizon with one interface; that is the de-vendorisation of the RevenueCat pattern.
- **Activity:** 537 commits in 90 days, 15+ releases in 6 months — the **highest release cadence** of any IAP candidate, and it has an `expo-iap` package that fits Expo SDK 58.
- **Risks:** 1 maintainer, 158 ★, created 14 months ago, and the ecosystem backing is new. Entitlement/validation still needs a server we build.
- **Tests:** UNVERIFIED.
- **Verdict:** **WATCH — the strongest challenger.** Re-evaluate when it reaches ~1 k ★ or a 2.0 release, or when Play policy forces a multi-store decision.

---

## 5. Benchmarks (V4 §12.5) — all UNVERIFIED; sets named

No live PSP account was used (no keys are available to this role) and no emulator was run → **every row is UNVERIFIED**.

| # | Benchmark | Candidates | Metric | Target | Status | Set to build |
|---|---|---|---|---|---|---|
| P1 — Price rendering | our formatter vs Stripe's vs store price strings | exact NZD string for a $12.00 + 15 % GST price | "GST inclusive" shown, no rounding drift, tabular numerals | **UNVERIFIED** | `docs/squads/payments/benchmarks/gst-display/` — 1,000 price points incl. 0.01/0.05/0.10 endings |
| P2 — GST extraction | our arithmetic vs the IRD ×3÷23 method | GST component from a GST-inclusive price | matches IRD to 8 dp | **UNVERIFIED** | same set as P1 |
| P3 — Webhook idempotency | our handler vs `stripe-mock` replay | duplicate `event.id` delivered 3× | exactly 1 state change; audit log has 1 row | **UNVERIFIED** | `docs/squads/payments/benchmarks/webhook-idempotency/` (recorded per V4 §12.5) |
| P4 — Signature verification | `verifyHeader` vs our HMAC | tampered body, stale timestamp, blank secret | 100 % reject, no false accept | **UNVERIFIED** | same set as P3 |
| P5 — Entitlement matrix | RevenueCat `CustomerInfo` vs our `Entitlement` type | plan × store × trial × grace × offline | identical decisions on 100 cases | **UNVERIFIED** | `docs/squads/payments/benchmarks/entitlements/` |
| P6 — Tenant isolation | Better Auth Stripe plugin + our org scoping | 50 concurrent orgs × billing actions | 0 cross-org writes | **UNVERIFIED** | `docs/squads/payments/benchmarks/tenant-isolation/` — **mandatory** given GHSA-h3rm-78g3-j7cp |
| P7 — Offline grace | our offline entitlement cache | 72 h offline, then reconnect | driver keeps access through the grace window; revoked on expiry | **UNVERIFIED** | `docs/squads/payments/benchmarks/offline-grace/` |

---

## 6. Findings that change the design (read these before coding)

### 6.1 NZ GST (verified against IRD, 2026-10-20)
- GST rate is **15 %** on most goods and services (IRD, *GST guide* IR375, March 2026).
- Registration threshold: **turnover ≥ $60,000** in the last 12 months (or expected in the next 12) (IRD, *Registering for GST*).
- **GST-inclusive → GST amount: multiply by 3 and divide by 23** (IRD). Equivalent: divide by 7.66666666 using **at least 8 decimal places** — IRD explicitly warns that fewer decimal places gives an incorrect answer.
- **Product rule:** every price we show a courier is **GST-inclusive NZD**; the invoice/receipt must show the GST amount separately; the API must never accept a price without knowing whether it is inclusive. **Store prices as integer cents + a `tax_inclusive` boolean + the GST rate applied on the day**, because the 15 % rate and the $60 k threshold can change.
- **Open question for the founder (not answerable by research):** whether Courier Copilot is registered for GST, and whether the subscription price includes GST. `FOUNDER_TODO.md` item.

### 6.2 Stripe in New Zealand (verified 2026-10-20, `stripe.com/nz/pricing`)
- Domestic card pricing **2.65 % + NZ$0.30**; international cards **3.5 % + NZ$0.30**; no setup, monthly or hidden fees.
- **Instant Payouts 1.5 %** (minimum **NZ$0.50**) — useful for weekly driver payouts, but it is a product decision, not a default.
- **Next-day settlement is not GA in New Zealand** (the availability table shows "—" for NZ) → funds settle on Stripe's standard NZ schedule (2 days for the NZD Direct Entry rail, marked H2 27 in the table). Cash-flow planning must not assume next-day money.
- Global payouts **to New Zealand cost 0.50 %** cross-border.
- NZD minimum charge **0.50 NZD**; 195 countries, 135+ currencies, 100+ payment methods; NZD is on the supported presentment list.
- **Consequence:** a $12/month subscription costs Stripe ~$0.32 in fees — acceptable, but the **minimum charge of 0.50 NZD** means we cannot price a plan below 50 cents.

### 6.3 Webhook idempotency and the rules we adopt
From `stripe-node`'s last 20 commits: fail closed on a blank signing secret; use a constant default signature tolerance; never accept a truncated body. **Our** additions (V4 §10.3): store `stripe_event_id` with a unique constraint; process in a transaction; make the handler safe to replay; audit-log admin-initiated billing actions; **never log customer PII** (V4 §6.2).

### 6.4 The store-policy constraint nobody in the room has written down
- **Google Play:** "Google Play's billing system is required for developers offering in-app purchases of digital goods and services distributed on Google Play." The policy lists *subscription services* and *cloud software and services* explicitly. Purchases of **physical** goods or **physical** services (transportation, food delivery) do **not** require Play Billing. (Play Console Help, *Understanding Google Play's Payments policy*, read 2026-10-20.)
- **Our product is software sold to a courier** → it is a digital subscription → **Play Billing is required** if the Android build is distributed through Google Play. A Stripe-only in-app checkout would be a policy violation. Options: (a) Play Billing via the RevenueCat pattern; (b) Play's alternative-billing route (documented for India, South Korea and the EEA — **not** for New Zealand on the evidence read); (c) distribute the Android build outside Play (sideload / direct APK, as we already do for CI).
- **Apple:** the same class of rule exists for digital content sold in-app; the multiplatform-service exception must be **confirmed against the current App Review Guideline text before we rely on it** → UNVERIFIED in this sprint, flagged for the Release Manager.
- **Consequence for the architecture:** the mobile app must **not** hard-code a payment provider. We need a `BillingProvider` interface with two implementations — `StoreBillingProvider` (RevenueCat-shaped, Play/App) and `CardBillingProvider` (Stripe) — selected by platform and by whether the product is a physical or digital good. That is exactly the "adapter behind an interface with a fake for tests" rule in V4 §6.1.

### 6.5 Entitlements: the model we copy
From the RevenueCat model (documented in its README and implemented in its SDK): one **entitlement id** per capability (`pro`, `team_admin`, `offline_maps`), a **product** per price point, a **customer** per user, and the server is the only source of truth. Our version:

```
entitlement := { id, source: 'store'|'stripe', productId, expiresAt, graceUntil, isActive }
plan        := { key, priceCents, currency: 'NZD', taxInclusive: true, seats?: number }
org         := { id, plan, seatsUsed, stripeCustomerId?, stripeSubscriptionId? }
```
Entitlement resolution order: **local cache (offline) → store SDK → our API → re-check**, with a documented grace window (7 days) so a driver in a dead spot is not locked out mid-shift (V4 §6.5 offline-first).

---

## 7. Decisions for the Payments & Accounts squad

**ADOPT**
1. `stripe/stripe-node@23.0.0` — server-side PSP client. MIT, 15+ releases/6 m, 0 advisories.
2. `stripe/stripe-mock@0.206.0` — deterministic billing tests, pinned to the SDK's OpenAPI version.
3. `RevenueCat/react-native-purchases@10.15.0` — **SDK only** (MIT). The hosted service is optional; the entitlement model is what we adopt. Wrap it in `BillingProvider`.
4. `better-auth@1.7.11` — auth + organisations + Stripe plugin, MIT, 29 human maintainers. **Pin exactly; enable only plugins we test; keep SCIM and SSO off.**
5. `@expo-google-fonts/figtree`-style exact pinning policy for money libs: `stripe`, `stripe-mock`, `react-native-purchases`, `better-auth` — **exact versions, no ranges.**

**KEEP**
6. `expo/eas-cli` (area 4) — store credentials and submission path.
7. `stripe/stripe-python@16.1.0a3`-style: keep the Python client if our API service speaks to Stripe for admin operations (the API service is Python/FastAPI per the repo layout).

**WATCH**
8. `hyodotdev/openiap` — vendor-neutral IAP protocol; watch 2 radar cycles.
9. `polarsource/polar` — Apache-2.0 billing engine; watch for usage-based pricing.
10. `openmeterio/openmeter` — usage metering; watch if we add per-stop pricing.
11. `laravel/cashier-stripe`, `pay-rails/pay` — subscription lifecycle reference.
12. `SolidInvoice/SolidInvoice` — MIT invoicing for the "email me an invoice" path.
13. `yournextstore/yournextstore`, `vercel/next-forge`, `mickasmt/next-saas-stripe-starter` — reference implementations for the web dashboard (area 3).
14. `stripe/stripe-react-native@0.82.0`, `stripe-android`, `stripe-ios` — only if a card flow is allowed on that platform (policy-check first).
15. `qonversion/react-native-sdk`, `adaptyteam/AdaptySDK-React-Native`, `apphud/ApphudSDK-React-Native` — alternatives with the same shape; no advantage over RevenueCat for our size.
16. `kdeldycke/awesome-billing` (CC0) — lead source for the monthly radar.

**REJECT**
17. `getlago/lago`, `meteroid-oss/meteroid`, `flexprice/flexprice`, `frappe/books` — **AGPL-3.0** → clean-room study only (§11.2), never a dependency, never quoted code.
18. `akaunting/akaunting` — **BSL** → banned by CONSTRAINTS.md.
19. `dubinc/dub` — source-available with directory-scoped licences → not permissive.
20. `InvoicePlane/InvoicePlane`, `nocobase/nocobase`, `vendurehq/vendure` — custom/dual licences → not clean.
21. `twentyhq/twenty` (AGPL), `appsmith`, `maplibre` (area 3) — copyleft/source-available.
22. `juspay/hyperswitch`, `medusajs/medusa`, `saleor/saleor`, `dj-stripe`, `laravel/cashier` as **dependencies** — wrong domain or wrong language for our stack.
23. `tipsi/tipsi-stripe` — archived 2023.
24. `a-tokyo/react-native-stripe-checkout-webview` as the primary path — WebView checkout fails Play policy for digital goods and is a bad experience for a driving app; keep only as a documented fallback if policy ever requires it.

---

## 8. Risks, fallbacks and ADR triggers

| Risk | Impact | Fallback / mitigation |
|---|---|---|
| Better Auth advisory stream (28 advisories, 3 critical) | account takeover / cross-tenant billing | pin ≥ 1.7.11; `pnpm audit` gate; monthly advisory re-read; **own tenant-isolation test** for the Stripe plugin (P6) |
| Google Play policy requires Play Billing for the Android subscription | app removal risk | `BillingProvider` abstraction with a Store implementation; Play policy check before the Play build; sideloaded APK path already used in CI |
| RevenueCat vendor lock-in + NZ Privacy Act exposure | data-processing risk | keep the SDK behind our interface; our API is the entitlement authority; a self-hosted `openiap`-style backend stays possible |
| GST rate/threshold change | mis-priced invoices | store `taxInclusive` + the rate used per invoice; never recompute history |
| Stripe NZ settlement is not next-day | cash-flow surprise | document the schedule; Instant Payouts at 1.5 % (min NZ$0.50) only if the founder decides |
| Stripe fees on a low-priced plan ($12) | thin margin | fee-aware pricing floor (0.50 NZD minimum charge), team plans amortise the fee |
| Stripe API version churn | breaking changes | pin the API version on the account; run `stripe-mock` against the pinned spec; subscribe to Stripe changelogs in the monthly radar |

**ADR trigger:** introducing a hosted entitlement service (RevenueCat) into the product boundary is a locked-decision change → needs an ADR + `docs/DECISIONS.md` update. Same for "we do not use Play Billing on Android".

---

## 9. What could not be verified (V4 §12.6)

- **6-month star trend** for all 38 candidates (token lacks the `stargazer` scope).
- **Live PSP behaviour**: no Stripe/RevenueCat account was used → checkout latency, webhook delivery latency, sandbox quirks, tax-ID validation and NZD charge failures are all UNVERIFIED.
- **Actual Stripe NZ fee for our exact plan mix** — the published 2.65 % + NZ$0.30 is the published rate; volume discounts are UNVERIFIED.
- **Apple's current multiplatform-service exception wording** — not read from Apple's guideline in this sprint; must be confirmed before relying on it.
- **Whether Play's alternative billing applies to New Zealand** — the policy text read on 2026-10-20 names India, South Korea and the EEA only.
- **RevenueCat / Qonversion / Adapty / Apphud service pricing, data residency and DPA terms** — commercial, not in the repos; UNVERIFIED.
- **Openmeter / Polar / Lago / Meteroid / Flexprice feature parity against Stripe Billing** — not benchmarked.
- **Invoice GST-NZ compliance** (IRD-compliant invoice fields: GST number, taxable period, GST amount) — not verified against an IRD checklist; UNVERIFIED.
- All benchmarks P1–P7: UNVERIFIED.
