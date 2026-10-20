# Payments & subscriptions — Stripe, RevenueCat, the store rules, NZ GST and offline entitlements (2026, re-read to V4 depth)

**Research date: 2026-10-21.** Method: V4 §12 — ≥30 candidates with full evidence cards, 13 shortlisted, top 5
deep-reviewed from source, benchmarks only where an eval set exists, §12.6 anti-bias (the 2026 challengers are
included on purpose). Every star count, release tag, licence, date, advisory id and npm download number below was
read from the GitHub API, the npm registry, the OSV API, or a **vendor/primary source** on 2026-10-21 unless the
line says **UNVERIFIED**. Commercial figures are attributed to the page they were read from; where the only source
is a vendor blog or a competitor, the line says so.

**Card fields:** name · repo/vendor URL · stars + forks · created · last release + date · releases/6 m ·
commits/90 d + distinct humans/90 d · open/closed issues · licence · **Expo SDK 58 / RN 0.88 New-Arch verdict** ·
npm version + 30-day downloads · pricing model · advisories · **DECISION**.

### 6-month star trend — method note

`GET /repos/{o}/{r}/stargazers` returns **HTTP 403 "Resource not accessible by personal access token"** with the
token in `.env.local` (re-verified 2026-10-21); GraphQL returns only the cumulative total. **Every "stars gained in
6 months" figure is UNVERIFIED.** The V4 §12.3 proxy is used throughout: *releases in the last 6 months · commits in
the last 90 days · distinct human maintainers in 90 days · npm downloads per 30 days*. Where a repo's releases array
returned exactly 100 entries the number is a **page cap** and is printed as "≥100".

## 0. Scope, our current choice, the bar

| Item | Verified 2026-10-21 |
|---|---|
| **Our current choice** | **Stripe** for the card path, **RevenueCat-shaped store billing** for the in-app path, **NZD + GST-inclusive** pricing, **webhook idempotency**, **offline entitlements**. |
| **What exists in the repo today** | **No billing code at all.** There is no `stripe` dependency in any `package.json`, no `services/billing`, no webhook endpoint, no entitlement store, no store listing configuration. `docs/PARITY.md` row 43 (Pricing/Billing) is `Planned (task)` → **T7.13**. The Payments & Accounts squad is `docs/squads/payments/`. |
| **What the product locks** | Plans **Trial / Solo / Team** (D11); prices **NZD, GST-inclusive**; one customer type (an independent courier) plus **teams** (a courier business with several drivers) → **multi-tenant, org-scoped billing**; webhook **idempotency**; **no PII in logs**; an **audit log for admin actions**; **no provider may train on driver or customer data**; **POD never paywalled** (PARITY row 23). |
| **The customer** | A tradesperson driving, not a tech person. A payment failure that needs a web checkout, a refund form and a support chat is a failed payment. The whole purchase has to work with gloves on. |
| **The bar** | `CONSTRAINTS.md`: zero high/critical advisories; no GPL/AGPL/SSPL/Commons-Clause/CC-NC/FSL/**BUSL** in the shipped app; ≥ 81 % coverage on the auth service; **no PII leaves the device** (PARITY differentiator 5); every number names the command that produces the verdict. V4 §10.3: *"Better Auth, Stripe NZD, teams: tenant isolation tests, webhook idempotency."* |
| **Locked decisions this research must not change** | Better Auth in `services/auth` with `organization` + `expo` + `jwt` and an ES256 JWKS verified by FastAPI; no default secrets; no PII leaving the device. `docs/adr/ADR-001` records *"Supabase Auth → Better Auth (R3: Supabase forbidden)"*. |
| **NZ reality we must design for** | Apple and Google both matter; Play's **billing-choice programme does not cover New Zealand** (§4); NZ GST is **15 %** with a **NZ$60 000** registration threshold (IRD); Play NZ prices **include GST** (our own teardown, `docs/study/spoke/TEARDOWN.md` §2.1, S16). |

**What must not be conflated.** (1) **The payment processor** (Stripe) sells and settles money. (2) **The store
(IAP)** sells the same subscription but Apple/Google are the merchant of record and take a cut, and their rules
decide whether we may use (1) at all. (3) **The entitlement** is *our* state — "is this driver allowed to work
today" — and it is the only thing that should gate the app. (4) **The offline behaviour** is the entitlement's
ability to survive no signal. Mixing (1) and (2) is the most expensive mistake available to us, and the store rules
in §4 are where that mistake is made or avoided.

## Queries run

All on **2026-10-21**. GitHub reads through `scripts\gh.ps1`; npm from `registry.npmjs.org` +
`api.npmjs.org/downloads/point/last-month`; advisories from `POST https://api.osv.dev/v1/query`; the rest from
`websearch` / `webfetch`.

| # | Query | Where | What it produced |
|---|---|---|---|
| Q1 | `Google Play billing policy 2026 digital goods subscription alternative billing New Zealand` | websearch | The Play Payments policy, the **billing-choice programme availability table** (UK + EEA 2026-06-30, US existing, **Australia and Japan 2026-09-30 — NZ absent**), and the **new fee structure from 2026-06-30** (service fee from 10 % on the first US$1 M, billing fee 5 % in US/UK/EEA, both applying to auto-renewing subscriptions). |
| Q2 | `Apple App Store Review Guidelines 3.1.1 in-app purchase multiplatform service 2026 reader apps external link` | websearch | The **February 2026** App Review Guidelines PDF and the live guidelines page: 3.1.1, 3.1.1(a) StoreKit External Purchase Link Entitlements, 3.1.3(a) reader apps, **3.1.3(b) multiplatform services**, **3.1.3(e) goods and services outside the app**. |
| Q3 | `RevenueCat pricing 2026 free tier transaction fee app subscription` | websearch | The vendor pricing page: **Pro is free to US$2 500 MTR, then 1 % of MTR**; Enterprise negotiated; "MTR = monthly tracked revenue, before the platform cut". |
| Q4 | `Stripe Billing subscriptions New Zealand GST tax 15% inclusive pricing 2026` | websearch | Stripe's GST guide (NZ 15 %, NZ$60 000 threshold, remote services) and the GST-inclusive arithmetic: *"the GST inside the price is 3/23 of it (15/115), so a 23 USD inclusive price carries 3.00 USD of GST"*. |
| Q5 | `Stripe New Zealand pricing 2026 domestic card 2.65% NZ$0.30 international 3.5% settlement` | websearch | `stripe.com/nz/pricing` and the Stripe support article *"Lower pricing for New Zealand card transactions effective starting December 1, 2025"* (domestic 2.70 → **2.65 %** from 2025-12-01; international 3.70 → **3.50 %** from 2026-05-01). |
| Q6 | `New Zealand GST subscription 15% IRD registering turnover $60,000 remote services digital subscription` | websearch | IRD primary pages: *Registering for GST*, *Supplying remote services into New Zealand* (apps, software and online subscriptions are remote services; > NZ$60 000 in 12 months ⇒ register and charge), *GST guide IR375* (modified 2026-03-31), *I am starting a new business* (1 Apr 2026). |
| Q7 | `New Zealand payment gateway paywave eftpos POLi Clearpay online merchant fees 2026 subscription` | websearch | The Kiwi provider set: **POLi** (open-banking), **PayPal NZ** (3.40 % + NZ$0.45 domestic / 4.40 % + NZ$0.45 international, via Airwallex's comparison), **Eftpos NZ / Paymark** (NZ$15/month per terminal, in-person only), **Stripe NZ BECS Direct Debit** (1 % + NZ$0.40, cap NZ$4.00) and **Klarna** (4.99 % + NZ$0.65). |
| Q8 | `RevenueCat offline entitlement caching customer info offline subscriber state grace period` | websearch | The RevenueCat docs: the **3-day offline grace**, the `cachedOrFetched` cache policy, the **7 subscription states** and the exact `isActive` semantics, and the separate **Offline Entitlements** feature. |
| Q9 | `Google Play billing library 8 requirement August 2026 deprecated PBL subscription new apps` | websearch | The Play Billing Library deprecation table (v7 deadline **2026-08-31**, v8 → 2027-08-31, **v9 → 2028-08-31**), PBL **9.1.0 released 2026-06-18**, and the acknowledgement rules. |
| Q10 | `expo-iap openiap Expo SDK 58 in-app purchase module 2026 StoreKit Google Play Billing` | websearch | The openiap Expo setup page (validated baseline **SDK 57 / RN 0.86**, **Google Play Billing Library 9.1.0**), the `expo-iap` README (OpenIAP Client Protocol, `openiap-apple` = StoreKit 2, `openiap-google` = Play Billing 9.1.0), and Expo's own guide listing **exactly two** first-class IAP libraries. |
| Q11 | `App Store New Zealand prices GST inclusive Apple IAP tax 15% displayed price` | websearch | Third-party price trackers showing NZ App Store IAP prices rendered **"15 % GST included"**; and the Apple ↔ Play storefront price tables. *(Third-party evidence — flagged as such.)* |
| Q12 | `gh api repos/{o}/{r}` × 40 · `/releases?per_page=100` × 40 · `/commits?since=2026-07-23` × 40 · `search/issues` × 40 | GitHub API | The card data in §1. |
| Q13 | `gh api search/issues?q=repo:{stripe/stripe-node,stripe/stripe-react-native,RevenueCat/react-native-purchases,hyodotdev/openiap}+is:issue+created:>=2026-01-01` | GitHub API | The 2026-window issues in §3. |
| Q14 | `gh api repos/{stripe/stripe-node,RevenueCat/react-native-purchases,hyodotdev/openiap}/commits?per_page=12` + `/pulls?state=open` | GitHub API | The deep-review commit/PR evidence in §3. |
| Q15 | `registry.npmjs.org/{stripe,react-native-purchases,expo-iap,react-native-iap,@better-auth/stripe,@paddle/paddle-node-sdk,@lemonsqueezy/lemonsqueezy.js}` | npm | Version, publish date, licence, 30-day downloads. |
| Q16 | `gh api repos/expo/expo/commits?path=docs/pages/guides/in-app-purchases.mdx` | GitHub API | Expo's own IAP guide history: the `expo-iap` entry was added **2025-06-01** (#36048, by Hyo — the openiap author) and the link was refreshed **2026-05-20** (#45985). |

## 1. Candidate pool — 46 evidence cards

### 1.1 Stripe family (the card path)

**P1 — `stripe/stripe-node`** ⭐ https://github.com/stripe/stripe-node — **4 534 ★** /940 f · created 2011-09-28 ·
pushed **2026-10-20** · **MIT** · last release **v23.1.0-alpha.3 @ 2026-10-14** (stable **v23.0.0 @ 2026-10-01**) ·
**≥100 releases/6 m** · **64 commits/90 d, 12 humans** · **37 open / 965 closed** · npm `stripe@23.0.0`,
**94 606 198 dl/30 d** · OSV 0 · **Expo 58**: server-side, N/A · **DECISION: ADOPT — the server-side PSP client.**

**P2 — `stripe/stripe-react-native`** ⭐ https://github.com/stripe/stripe-react-native — **1 429 ★** /336 f · created
2020-12-16 · pushed 2026-10-20 · MIT · last release **v0.82.0 @ 2026-10-14** · **100 commits/90 d, 18 humans** ·
**136 open / 1 284 closed** · **Expo 58**: it is a RN library, and the New-Architecture issues are **open and
unfixed** (§3.2) · **DECISION: WATCH — and even then, only for card top-ups; it cannot be the subscription path
because of the Play payments policy (§4.1).**

**P3 — `stripe/stripe-android`** ⭐ https://github.com/stripe/stripe-android — **1 549 ★** /739 f · created
2012-11-29 · pushed 2026-10-20 · MIT · last release **v23.24.0 @ 2026-10-19** · **100 commits/90 d, 14 humans** ·
**38 open / 1 303 closed** · **DECISION: WATCH (bundled with P2).**

**P4 — `stripe/stripe-ios`** ⭐ https://github.com/stripe/stripe-ios — **2 576 ★** /1 075 f · created 2012-11-12 ·
pushed 2026-10-20 · MIT · last release **26.15.0 @ 2026-10-19** · **100 commits/90 d, 15 humans** ·
**79 open / 1 169 closed** · **DECISION: WATCH (bundled with P2).**

**P5 — `stripe/stripe-python`** ⭐ https://github.com/stripe/stripe-python — **2 054 ★** /543 f · created 2011-06-25 ·
pushed 2026-10-20 · MIT · last release **v16.1.0a3 @ 2026-10-14** · **53 commits/90 d, 9 humans** ·
**19 open / 405 closed** · **DECISION: KEEP as the option — our API service is Python/FastAPI, so the webhook
handler and the admin operations may live there. Two SDKs, one API version, is a real cost; decide once.**

**P6 — `stripe/stripe-mock`** ⭐ https://github.com/stripe/stripe-mock — **1 657 ★** /135 f · created 2017-06-20 ·
pushed 2026-10-01 · MIT · last release **v0.206.0 @ 2026-10-01** · **8 commits/90 d, 2 humans** ·
**6 open / 132 closed** · **DECISION: ADOPT (test-only) — the deterministic billing test server; the SDK pins the
mock to its own OpenAPI version (`Pin stripe-mock to the SDK OpenAPI version (#2870)`, 2026-09-29), so they cannot
drift.**

**P7 — `stripe/stripe-cli`** ⭐ https://github.com/stripe/stripe-cli — **2 212 ★** /541 f · created 2019-06-14 ·
pushed 2026-10-20 · **Apache-2.0** (the LICENSE file) · last release **v1.54.1 @ 2026-10-19** ·
**100 commits/90 d, 17 humans** · **168 open / 379 closed** · **DECISION: WATCH — the local webhook replay and the
`stripe listen` tunnel are worth having in the payments squad's dev loop, but it is a dev tool, not a dependency.**

**P8 — `juspay/hyperswitch`** ⭐ https://github.com/juspay/hyperswitch — **45 378 ★** /6 450 f · created 2022-10-17 ·
pushed 2026-10-20 · Apache-2.0 · last release **v1.128.0 @ 2026-10-16** · **100 commits/90 d, 36 humans** ·
**1 418 open / 3 038 closed** · **DECISION: REJECT — a payment *orchestrator* (many PSPs, smart routing). We need
one PSP and one entitlement; a router is a second control plane we would have to own.**

### 1.2 Store billing / entitlement SDKs

**P9 — `RevenueCat/react-native-purchases`** ⭐ https://github.com/RevenueCat/react-native-purchases — **1 215 ★** /
120 f · created 2018-06-21 · pushed **2026-10-20** · MIT · last release **10.15.0 @ 2026-10-19** ·
**≥100 releases/6 m** · **100 commits/90 d, 14 humans** · **62 open / 354 closed** · npm
`react-native-purchases@10.15.0`, **3 246 760 dl/30 d** · OSV 0 · **Expo 58**: the SDK is a RN library with Expo
support; the New-Architecture issues #1747/#1739 are **still open** (§3.2) · pricing: the **hosted** service is
free to US$2 500 MTR then **1 % of MTR** · **DECISION: ADOPT the SDK + copy the entitlement model; keep the
backend swappable.**

**P10 — `RevenueCat/purchases-ios`** ⭐ https://github.com/RevenueCat/purchases-ios — **3 081 ★** /448 f · created
2017-10-23 · pushed 2026-10-20 · MIT · last release **5.96.0 @ 2026-10-16** · **100 commits/90 d, 18 humans** ·
**55 open / 622 closed** · **DECISION: WATCH (the iOS half of P9; the SDK bundles it).**

**P11 — `qonversion/react-native-sdk`** ⭐ https://github.com/qonversion/react-native-sdk — **130 ★** /25 f · created
2020-05-11 · pushed 2026-10-14 · MIT · last release **10.12.0 @ 2026-09-23** · **19 commits/90 d, 4 humans** ·
**0 open / 51 closed** · npm `@qonversion/react-native-sdk@10.12.0`, **9 469 dl/30 d** · **DECISION: WATCH — the same
shape as RevenueCat, a tenth of the download volume; no advantage at our size.**

**P12 — `adaptyteam/AdaptySDK-React-Native`** ⭐ https://github.com/adaptyteam/AdaptySDK-React-Native — **186 ★** /
16 f · created 2020-09-28 · pushed 2026-10-19 · MIT · last release **v4.2.3 @ 2026-10-09** · **98 releases/6 m** ·
**99 commits/90 d, 4 humans** · **1 open / 151 closed** · **DECISION: WATCH — the same shape; Adapty's differentiator
is paywall analytics, which we do not need in v1.**

**P13 — `apphud/ApphudSDK-React-Native`** ⭐ https://github.com/apphud/ApphudSDK-React-Native — **10 ★** /7 f ·
created 2020-03-24 · pushed 2026-10-12 · MIT · last release **5.2.1 @ 2026-10-12** · **23 releases/6 m** ·
**32 commits/90 d, 4 humans** · **1 open / 11 closed** · **DECISION: WATCH — tiny, but it is a fourth hosted
entitlement service; three hosted options is already too many.**

**P14 — `hyodotdev/openiap`** ⭐ https://github.com/hyodotdev/openiap — **158 ★** /33 f · created **2025-08-12** ·
pushed **2026-10-19** · MIT · last release **`expo-iap-6.1.1 @ 2026-10-18`** · **≥100 releases/6 m** ·
**100 commits/90 d, 8 humans** · **4 open / 99 closed** · npm **`expo-iap@6.1.1 @ 2026-10-18`, 1 221 964 dl/30 d** ·
OSV 0 · **Expo 58**: the Expo module is validated on **SDK 57 / RN 0.86** — we are one SDK ahead · **DECISION:
WATCH — the strongest challenger; it is the de-vendorisation of the RevenueCat pattern.**

**P15 — `better-auth/better-auth` (Stripe plugin)** ⭐ https://github.com/better-auth/better-auth — **30 392 ★** /
2 994 f · pushed 2026-10-20 · MIT · last release **v1.7.12 @ 2026-10-20** · npm **`@better-auth/stripe@1.7.12`,
1 065 397 dl/30 d** · **OSV: 1 — GHSA-h3rm-78g3-j7cp (2026-07-24), "cross-organization billing tampering in
organization subscription actions", fixed 1.6.21 / 1.7.0-beta.10** · **DECISION: WATCH — the plugin that would keep
orgs and subscriptions in one system, but it carries exactly the tenant-isolation bug class V4 §10.3 demands we
test.**

**P16 — `polarsource/polar`** ⭐ https://github.com/polarsource/polar — **10 372 ★** /800 f · created 2023-01-26 ·
pushed 2026-10-20 · **Apache-2.0** · last release **`@polar-sh/cli@3.0.0 @ 2026-10-16`** · **76 releases/6 m** ·
**100 commits/90 d, 13 humans** · **68 open / 2 364 closed** · **DECISION: WATCH — the only full billing engine
with a clean permissive licence; a merchant-of-record model is attractive for GST (§4.3).**

**P17 — `getlago/lago`** ⭐ https://github.com/getlago/lago — **10 697 ★** /773 f · created 2022-02-28 · pushed
2026-10-20 · **AGPL-3.0** · last release **v1.55.0 @ 2026-10-07** · **≥100 releases/6 m** · **52 commits/90 d,
16 humans** · **16 open / 225 closed** · **DECISION: REJECT as a dependency — clean-room study only (V4 §11.2).**

**P18 — `openmeterio/openmeter`** ⭐ https://github.com/openmeterio/openmeter — **2 394 ★** /226 f · created
2023-06-06 · pushed 2026-10-20 · Apache-2.0 · last release **v1.0.0-beta.236 @ 2026-10-09** · **≥100 releases/6 m** ·
**100 commits/90 d, 8 humans** · **21 open / 99 closed** · **DECISION: WATCH — usage metering; we sell flat plans,
so it is not needed until we price per stop.**

**P19 — `meteroid-oss/meteroid`** ⭐ https://github.com/meteroid-oss/meteroid — **1 337 ★** /84 f · created
2023-07-13 · pushed 2026-10-09 · **AGPL-3.0** · last release **v1.0.0-rc7 @ 2026-08-24** · **19 releases/6 m** ·
**10 commits/90 d, 4 humans** · **7 open / 37 closed** · **DECISION: REJECT — AGPL → clean-room study only.**

**P20 — `flexprice/flexprice`** ⭐ https://github.com/flexprice/flexprice — **6 881 ★** /960 f · created 2024-11-05 ·
pushed 2026-10-20 · **AGPL-3.0** · last release **v2.1.40 @ 2026-10-17** · **90 releases/6 m** ·
**100 commits/90 d, 13 humans** · **80 open / 35 closed** · **DECISION: REJECT — AGPL → clean-room study only.**

**P21 — `dubinc/dub`** ⭐ https://github.com/dubinc/dub — **24 919 ★** /3 333 f · created 2022-08-27 · pushed
2026-10-20 · licence **NOASSERTION** (source-available, directory-scoped) · **no GitHub releases** ·
**100 commits/90 d, 6 humans** · **55 open / 825 closed** · **DECISION: REJECT — not a standard permissive licence,
and it is a link/subscription product, not a payments engine.**

**P22 — `useautumn/autumn`** ⭐ https://github.com/useautumn/autumn — **2 830 ★** /279 f · created **2025-01-21** ·
pushed 2026-10-20 · **Apache-2.0** · **no GitHub releases** · **100 commits/90 d, 10 humans** · a 2026 newcomer ·
one of the six billing plugins Better Auth now ships (Autumn Billing) · **DECISION: WATCH — the 2026 challenger in
the "AI-native billing" lane; too new to depend on, worth two radar cycles.**

**P23 — `dodopayments/dodopayments-node`** ⭐ https://github.com/dodopayments/dodopayments-node — **54 ★** /19 f ·
created 2024-12-13 · pushed 2026-10-20 · Apache-2.0 · last release **v2.55.0 @ 2026-10-14** · **≥100 releases/6 m** ·
**97 commits/90 d, 2 humans** · another Better Auth billing plugin (Dodo Payments) · **DECISION: WATCH (read) —
a small, well-funded MoR-style PSP; the 2-human team is the risk.**

**P24 — `PaddleHQ/paddle-node-sdk`** ⭐ https://github.com/PaddleHQ/paddle-node-sdk — **104 ★** /27 f · created
2024-01-11 · pushed 2026-10-20 · **Apache-2.0** · last release **v3.10.0 @ 2026-08-07** · **59 releases/6 m** ·
**5 commits/90 d, 3 humans** · npm `@paddle/paddle-node-sdk@3.10.0`, **652 313 dl/30 d** · **DECISION: WATCH — a
merchant of record that handles sales tax for us; a credible answer to the NZ GST question, but it re-prices our
margin and adds a vendor.**

**P25 — `Adyen/adyen-node-api-library`** ⭐ https://github.com/Adyen/adyen-node-api-library — **139 ★** /95 f ·
created 2019-07-04 · pushed 2026-10-20 · MIT · last release **v32.2.0 @ 2026-09-24** · **≥100 releases/6 m** ·
**68 commits/90 d, 13 humans** · **DECISION: WATCH — a serious PSP with strong EMEA/APAC presence; a Plan-B second
bank if Stripe's pricing or its NZ settlement schedule becomes a problem.**

**P26 — `braintree/braintree_android`** ⭐ https://github.com/braintree/braintree_android — **423 ★** /265 f · created
2014-07-08 · pushed 2026-10-19 · MIT · last release **5.33.0 @ 2026-09-16** · **≥100 releases/6 m** ·
**29 commits/90 d, 7 humans** · **DECISION: REJECT — a US-centric acquirer; Stripe already covers us and PayPal is
the fallback.**

**P27 — `chargebee/chargebee-node`** ⭐ https://github.com/chargebee/chargebee-node — **61 ★** /30 f · created
2014-01-27 · pushed 2026-09-24 · MIT · last release **v3.34.0 @ 2026-09-24** · **40 releases/6 m** ·
**7 commits/90 d, 3 humans** · **DECISION: WATCH — a subscription-billing SaaS with strong APAC presence; the
"Stripe Billing vs Chargebee" question is worth one radar cycle.**

### 1.3 Invoicing, commerce and reference apps (for the *courier's own* invoices — a different product)

**P28 — `SolidInvoice/SolidInvoice`** ⭐ https://github.com/SolidInvoice/SolidInvoice — **979 ★** /245 f · created
2012-12-19 · pushed 2026-10-20 · MIT · last release **3.1.1 @ 2026-10-15** · **65 releases/6 m** ·
**100 commits/90 d, 6 humans** · **128 open / 196 closed** · **DECISION: WATCH — the only MIT invoicing app in the
set; relevant to T7.13 (the courier's weekly GST invoice to their client), which is a *different* product from our
subscription.**

**P29 — `InvoicePlane/InvoicePlane`** ⭐ https://github.com/InvoicePlane/InvoicePlane — **3 220 ★** /884 f · created
2014-05-21 · pushed 2026-10-18 · licence **NOASSERTION** (a custom "Copyright Notice for the InvoicePlane…" header)
· last release **v1.7.2 @ 2026-08-28** · **65 releases/6 m** · **100 commits/90 d, 5 humans** ·
**62 open / 391 closed** · **DECISION: REJECT — the licence is not permissive.**

**P30 — `frappe/books`** ⭐ https://github.com/frappe/books — **5 000 ★** /1 164 f · created 2018-01-08 · pushed
2026-10-02 · **AGPL-3.0 · the repository is ARCHIVED** · last release **v0.36.0 @ 2025-11-06** · **82 releases/6 m** ·
**29 commits/90 d, 5 humans** · **108 open / 588 closed** · **DECISION: REJECT — AGPL *and* archived.**

**P31 — `akaunting/akaunting`** ⭐ https://github.com/akaunting/akaunting — **10 193 ★** /3 002 f · created
2017-06-21 · pushed 2026-10-08 · licence **NOASSERTION** (MariaDB **BSL**) · last release **3.2.4 @ 2026-09-17** ·
**≥100 releases/6 m** · **100 commits/90 d, 8 humans** · **4 open / 1 317 closed** · **DECISION: REJECT — **BSL is
banned by CONSTRAINTS.md.***

**P32 — `laravel/cashier-stripe`** ⭐ https://github.com/laravel/cashier-stripe — **2 546 ★** /746 f · created
2014-03-04 · pushed 2026-10-20 · MIT · last release **v16.9.0 @ 2026-10-13** · **≥100 releases/6 m** ·
**21 commits/90 d, 7 humans** · **14 open / 868 closed** · **DECISION: WATCH (read) — the cleanest subscription
state machine in the set (trial → active → past_due → cancelled → ended) and the proration rules; PHP, so we copy
the model, not the code.**

**P33 — `pay-rails/pay`** ⭐ https://github.com/pay-rails/pay — **2 262 ★** /358 f · created 2017-02-01 · pushed
2026-10-17 · MIT · last release **v12.3.0 @ 2026-10-06** · **97 releases/6 m** · **55 commits/90 d, 8 humans** ·
**0 open / 386 closed** · **DECISION: WATCH (read) — a subscription state machine with zero open issues; Rails.**

**P34 — `dj-stripe/dj-stripe`** ⭐ https://github.com/dj-stripe/dj-stripe — **1 795 ★** /512 f · created 2013-08-05 ·
pushed 2026-10-14 · MIT · last release **2.11.0 @ 2026-06-26** · **73 releases/6 m** · **15 commits/90 d, 3 humans** ·
**11 open / 1 060 closed** · **DECISION: REJECT — Django-only; our API is FastAPI.**

**P35 — `medusajs/medusa`** ⭐ https://github.com/medusajs/medusa — **36 822 ★** /5 444 f · created 2020-01-18 ·
pushed 2026-10-20 · licence **NOASSERTION** (MIT except the enterprise materials) · last release
**v2.21.2 @ 2026-09-28** · **≥100 releases/6 m** · **100 commits/90 d, 23 humans** · **84 open / 3 985 closed** ·
**DECISION: WATCH (read) — commerce engine, not needed for one flat subscription.**

**P36 — `saleor/saleor`** ⭐ https://github.com/saleor/saleor — **23 461 ★** /6 157 f · created 2013-02-12 · pushed
2026-10-20 · **BSD-3-Clause** · last release **3.23.43 @ 2026-10-19** · **≥100 releases/6 m** ·
**100 commits/90 d, 9 humans** · **201 open / 4 213 closed** · **DECISION: REJECT — headless commerce; wrong
domain.**

**P37 — `vendurehq/vendure`** ⭐ https://github.com/vendurehq/vendure — **8 529 ★** /1 530 f · created 2018-06-11 ·
pushed 2026-10-19 · licence **NOASSERTION** (dual licence) · last release **v3.8.0 @ 2026-10-12** ·
**41 releases/6 m** · **100 commits/90 d, 17 humans** · **167 open / 2 601 closed** · **DECISION: REJECT — the
licence is not clean.**

**P38 — `spree/spree`** ⭐ https://github.com/spree/spree — **15 764 ★** /5 310 f · created 2008-03-10 · pushed
2026-10-20 · **BSD-3-Clause** · last release **v6.0.0.rc4 @ 2026-10-19** · **≥100 releases/6 m** ·
**100 commits/90 d, 4 humans** · **DECISION: REJECT — commerce, not billing.**

**P39 — `expo/eas-cli`** ⭐ https://github.com/expo/eas-cli — **1 370 ★** /256 f · created 2020-08-12 · pushed
2026-10-20 · MIT · last release **v25.2.0 @ 2026-10-17** · **≥100 releases/6 m** · **100 commits/90 d, 17 humans** ·
**262 open** · **DECISION: KEEP — the store submission path (area 4). It is the tool that turns our signed build into
a Play listing and an App Store Connect record, and it is where the IAP products and price points are declared.**

**P40 — `kdeldycke/awesome-billing`** ⭐ https://github.com/kdeldycke/awesome-billing — **1 357 ★** /109 f ·
created 2019-06-12 · pushed 2026-10-12 · **CC0-1.0** · no releases · **10 commits/90 d, 2 humans** ·
**1 open / 13 closed** · **DECISION: KEEP as a lead source for the monthly radar.**

**P41 — `a-tokyo/react-native-stripe-checkout-webview`** ⭐ https://github.com/a-tokyo/react-native-stripe-checkout-webview
— **91 ★** /22 f · created 2020-09-01 · pushed 2026-07-01 · MIT · last release **0.1.0 @ 2026-06-05** ·
**14 releases/6 m** · **0 commits/90 d** · **DECISION: REJECT as the primary path — a WebView checkout is a policy
violation for digital goods on Play (§4.1) and a terrible experience for a driver. Keep only as a documented
fallback if a store ever forces a web flow.**

**P42 — `dooboolab/react-native-iap`** ⭐ https://github.com/dooboolab/react-native-iap — **3 222 ★** /686 f ·
created 2017-10-22 · pushed 2026-08-04 · MIT · **the repository is ARCHIVED** · last release **14.7.20 @ 2026-04-02**
· **≥100 releases/6 m** · **1 commit/90 d, 1 human** · npm **`react-native-iap@17.1.0 @ 2026-10-17`, 587 502 dl/30 d**
— **the npm package is three minor versions ahead of the last GitHub release, which is a discrepancy we could not
resolve** (the project states in the `expo-iap` README that it *"has been migrated from react-native-iap"* and that
the two libraries are *"maintained in parallel"*) · **DECISION: REJECT the archived repo; use `expo-iap` (P14).**

### 1.4 Kiwi and international payment providers (the NZ-specific set)

**P43 — Stripe New Zealand** https://stripe.com/nz/pricing — hosted PSP · **pricing model**: Standard —
**2.65 % + NZ$0.30** domestic cards, **3.5 % + NZ$0.30** international cards, **+2 %** currency conversion,
**NZ$0.50** minimum charge; Apple Pay/Google Pay at the card rate +2 % if conversion is needed;
**New Zealand BECS Direct Debit 1 % + NZ$0.40 (cap NZ$4.00)**; **Klarna (AU/NZ) 4.99 % + NZ$0.65**; Terminal
(card-present) **2.60 % + NZ$0.05** · last change read: **2025-12-01** (domestic 2.70 → 2.65 %) and **2026-05-01**
(international 3.70 → 3.50 %), per the Stripe support article *"Lower pricing for New Zealand card transactions
effective starting December 1, 2025"* · no setup, monthly or hidden fees · **DECISION: ADOPT (P1).**

**P44 — POLi** https://www.polipay.co.nz/ — NZ open-banking payment method ("Super low rates: We have some of the
lowest transaction fees in New Zealand!") · pricing **from a third-party page (knowledgebase.co.nz): ~1 % of the
payment value, capped at NZ$3 per transaction, plus a NZ$10/month fee** — **stale and third-party; UNVERIFIED ·
read the vendor page before quoting it** · **DECISION: WATCH — a Kiwi-familiar payment method, but a one-off
bank-transfer flow is wrong for a monthly subscription that must renew unattended.**

**P45 — PayPal New Zealand** — consumer wallet · pricing **from Airwallex's comparison page (2026-04-24), a
competitor: 3.40 % + NZ$0.45 domestic, 4.40 % + NZ$0.45 international, NZ$15 dispute fee** — **competitor-sourced,
indicative** · **DECISION: WATCH — a fallback for drivers without a card, not the primary path.**

**P46 — Airwallex** https://www.airwallex.com/en-nz/ — multi-currency PSP with a New Zealand entity · pricing
read only through the comparison page above · **DECISION: WATCH — a credible second bank if we ever price in
AUD/NZD for Australian couriers.**

### 1.5 The 2026 options

**P47 — Expo's own in-app-purchase guide** ⭐ https://docs.expo.dev/guides/in-app-purchases/ (in `expo/expo`,
**52 874 ★** /14 665 f · pushed 2026-10-20 · last release **`expo@58.0.16 @ 2026-10-19`** · MIT) — the guide names
**exactly two** first-class libraries: **`react-native-purchases`** and **`expo-iap`**. The `expo-iap` entry was
added **2025-06-01** (commit `3e93b69`, "#36048", by *Hyo* — the openiap author) and refreshed **2026-05-20**
(`50a308c`, "#45985"). **DECISION: this is the strongest single piece of evidence in the whole area — Expo itself
treats both our candidates as first-class. Neither is an outsider.**

**P48 — `@lemonsqueezy/lemonsqueezy.js`** (npm) — **4.0.0 @ 2024-11-05** · MIT · **514 896 dl/30 d** · a merchant of
record · **DECISION: WATCH (read) — a MoR that handles sales tax; the npm release is from 2024, so the SDK is
stale.**

**P49 — `expo/expo`** (the substrate) — as P47; the in-app-purchase guide, the Expo Modules API, the config-plugin
mechanism, and the store submission tooling we use for both stores · **DECISION: ADOPT (substrate).**

**P50 — `RevenueCat/react-native-purchases` web billing** — the hosted service also sells subscriptions on the web
(Paddle-style) and can act as a **merchant of record for web sales**; the vendor's own framing: *"Only pay 1 % of
MTR on what you track"* and *"bring your own infrastructure"* · **DECISION: WATCH — if we ever sell on the web
through RevenueCat, the GST position changes (they may become the supplier) — a question for the accountant, not
for us.**

## 2. Shortlist (13)

| # | Candidate | Decision | One-line reason (verified 2026-10-21) |
|---|---|---|---|
| P1/P5 | **stripe/stripe-node** (+ `stripe-python` as the option) | **ADOPT** | MIT, ≥100 releases/6 m, 94.6 M dl/30 d, 0 advisories, and the NZ rate is published: **2.65 % + NZ$0.30**. |
| P6 | **stripe/stripe-mock** | **ADOPT (test-only)** | The SDK pins the mock to its own OpenAPI version (#2870, 2026-09-29), so the client and the test server cannot drift. |
| P9 | **RevenueCat/react-native-purchases** | **ADOPT the SDK + the model** | MIT, 3.2 M dl/30 d, 100 commits/90 d, 14 humans, and the 7-state entitlement model with a documented 3-day offline grace. |
| P14 | **hyodotdev/openiap` (`expo-iap`)** | **WATCH — the challenger** | MIT, 1.2 M dl/30 d for `expo-iap` alone, ≥100 releases/6 m, and it is one of the **two** libraries Expo's own guide lists. |
| P15 | **@better-auth/stripe** | **WATCH, gated** | Keeps orgs and subscriptions in one system — but carries **GHSA-h3rm-78g3-j7cp** (cross-org billing tampering), our exact tenant-isolation class. |
| P7 | **stripe/stripe-cli** | **WATCH (dev tool)** | `stripe listen` + webhook replay; the payments squad's local loop. |
| P16 | **polarsource/polar** | **WATCH** | The only full billing engine with a clean **Apache-2.0**; a merchant-of-record model is a real answer to the GST question. |
| P24 | **PaddleHQ/paddle-node-sdk** | **WATCH** | A MoR that handles the tax; 652 k dl/30 d; the vendor trade-off is the margin. |
| P2/P3/P4 | **stripe-react-native · stripe-android · stripe-ios** | **REJECT for the subscription** | The Play payments policy requires Play Billing for a digital subscription sold in a Play-distributed app (§4.1). At most, a card path for physical goods. |
| P11/P12/P13 | **Qonversion · Adapty · Apphud** | **WATCH** | The same shape as RevenueCat with 10–100× less adoption; three hosted entitlement services is already too many. |
| P22/P23 | **Autumn · Dodo Payments** | **WATCH** | The 2026 challengers, both Better Auth billing plugins; too new to depend on, worth two radar cycles. |
| P28/P32/P33 | **SolidInvoice · Cashier Stripe · pay-rails** | **WATCH (read)** | MIT invoicing for the courier's own GST invoice (T7.13), and the two cleanest subscription state machines to copy. |
| P17/P19/P20/P21/P30/P31/P37/P41 | **Lago · Meteroid · Flexprice · Dub · frappe/books · Akaunting · Vendure · Stripe-checkout-WebView** | **REJECT** | AGPL-3.0, BSL, custom/dual licences, or a WebView checkout that breaks the Play policy. **Never a dependency.** |

## 3. Deep review — top 5

### 3.1 `stripe/stripe-node` (P1) — the server-side client

**Read.** The last 12 commits and the open PR list, read 2026-10-21 through the GitHub API.

**Commits.** `308c948` (2026-10-19) `Reject blank webhook secrets (#2885)` · `48d190c` (2026-10-19) `Fix
notification handling and discarded fetch retries (#2895)` · `ae674ed` (2026-10-16) `Hand-write
V2List/V2SearchResult namespace exports in stripe.cjs.node.ts (#2900)` · `cfc897d` (2026-10-16) `Require release
environment for npm publishing (#2899)` · `b7b25f6` (2026-10-14) `Add API v2 Search support (#2884)` ·
`bcefafa` (2026-10-14) `Increase timeout limit for integration tests (#2891)` · `fe645f6` (2026-10-01) `Bump version
to 23.0.0` · `14d17e2` (2026-09-30) `Correct v23 migration guidance links (#2880)` · `d1a1df1` (2026-09-29) `Pin
stripe-mock to the SDK OpenAPI version (#2870)` · `1aaf232` / `63be8e6` (2026-09-30) the OpenAPI code-generation
bot.

**Open PRs (2026-10-21).** `#2883` (2026-10-01) and `#2893`/`#2894` (2026-10-15) the codegen bots ·
`#2855` (2026-09-18) `Require next-major targets for breaking changes` · `#2848` (2026-09-11) `Preserve
endpointFetch response headers` · `#2842`/`#2840`/`#2881` dependabot.

**ISSUES opened in the 2026 window.**

| # | Opened | State | Title | Why it is ours |
|---|---|---|---|---|
| **#2814** | **2026-08-15** | **open** | *[timeout does not bound the response body — requests hang forever if the connection stalls or drops after headers arrive](https://github.com/stripe/stripe-node/issues/2814)* | **Our webhook receiver is an HTTP endpoint that Stripe calls.** If our handler's read of the body hangs, the request never completes and Stripe retries — but our *worker* also never finishes. A hung handler is a payment-down incident, not a slow one. We must set **both** a read timeout and a body-size limit. |
| **#2897** | **2026-10-15** | **open** | *[Retried requests leave their request timeout armed since 22.6.0 (process stays alive for the full timeout)](https://github.com/stripe/stripe-node/issues/2897)* | The process stays alive for the full timeout after a retry — a resource leak in a service that runs continuously. Relevant to our `apps/api` process budget. |
| **#2890** | **2026-10-13** | **open** | *[`created` filter typed as numbers on v2 MoneyManagement Transactions/ReceivedCredits list (23.1.0-beta.1), but the API expects RFC 3339 strings](https://github.com/stripe/stripe-node/issues/2890)* | The generated types are ahead of the API contract. **Never let a generated type be the only check** — our billing tables must validate the payload at runtime (zod) as well as at compile time. |
| **#2833** | 2026-09-01 | closed | *[`decimal_string` params are not coerced on GET requests (`creditNotes.preview` rejects `Stripe.Decimal`)](https://github.com/stripe/stripe-node/issues/2833)* | A money-type coercion bug in a GET path. **Money must be integer cents end-to-end** (our own rule, §6.1). |
| **#2763** | 2026-06-23 | closed | *[Feedback wanted: event notification handlers](https://github.com/stripe/stripe-node/issues/2763)* | The SDK is moving to push-style notification handlers. Watch it before we bind deep to the SDK's event model. |

**Three rules we take from those commits, for `services/billing` (not in the repo yet).**

1. **Fail closed on a blank signing secret** (#2885) — a webhook with an empty `STRIPE_WEBHOOK_SECRET` is rejected,
   not accepted "because there is nothing to check".
2. **A constant default signature tolerance** on `Stripe-Signature` timestamps, configurable per call — the
   tolerance is a *constant*, not a magic number per endpoint, so one endpoint cannot be laxer than another.
3. **Never treat a truncated body as a valid event** — combined with #2814, our receiver reads the body with a
   **size cap and a timeout**, and verifies the signature over the **raw bytes**, not over a re-serialised object.

**Verdict: ADOPT `stripe@23.0.0` (server) + `stripe-mock@0.206.0` (test).** Pin the **API version** on the account,
not just the SDK version.

### 3.2 The store SDKs on Expo SDK 58 / RN 0.88 / New Architecture — the honest picture

This is where the research contradicts the comfortable version of the story, so it gets its own section.

**RevenueCat (`react-native-purchases@10.15.0`, MIT).**

*Positives, all verified.* The SDK is MIT, on **10.15.0 @ 2026-10-19**, with **100 commits/90 d and 14 human
maintainers**, **≥100 releases/6 m**, and **3 246 760 dl/30 d**. Their own example app was **upgraded to React
Native 0.88** (commit `119fde7`, 2026-10-19, "#2043") — *our* RN version. Their CI runs **Maestro paywall tests**
(PRs `#1997` and `#1999`, both 2026-10-06) and a **Swift Package Manager** test app (`#1997`). Their subscription
model is documented and unambiguous: seven states (ACTIVE, IN_GRACE_PERIOD, ON_HOLD, PAUSED, CANCELED, EXPIRED,
PENDING) and `isActive === true` for ACTIVE, IN_GRACE_PERIOD, and CANCELED-with-future-expiry; false for ON_HOLD,
PAUSED, EXPIRED and PENDING. Their offline behaviour is documented: the SDK caches `CustomerInfo` on disk, the
default cache policy is `cachedOrFetched` (cached data is returned **even if stale**), and *"The system grants a
grace period for active entitlements when the user is offline… it will remain active for up to three days."*

*Negatives, all verified.* **Issue #1747 (2026-05-01, still open)** and **#1739 (2026-04-22, still open)**:
*"NativeModules.RNPurchases is null on React Native 0.81 + Expo SDK 54 with New Architecture enabled."*
**#1776 (2026-05-25, closed)**: *"`Purchases.logIn()` crashes iOS app post-call with Hermes memory corruption under
New Architecture (v10.1.2 and 9.15.12)."* **#1886 (2026-08-03, closed)**: *"[iOS] PaywallViewManager class name
doesn't match `RCT_EXPORT_MODULE(Paywall)`, aborting on Fabric interop assertion."* **#1836 (2026-07-06, open)**:
*"Android: RevenueCatUI.Paywall crashes with 'No ViewModelStoreOwner was provided' when its view detaches during
recomposition."*

**Read together, these say:** the RevenueCat SDK works on the legacy architecture and *has had New-Architecture
breakage through 2026*. **Our app has `"newArchEnabled": true`** (`apps/mobile/app.json`) — so **the RevenueCat SDK
must be proven on SDK 58 + New Arch before it is adopted, not after.** That is a build-and-test obligation, not an
opinion.

**`expo-iap` (P14, from `hyodotdev/openiap`).**

*Positives, all verified.* MIT; `expo-iap@6.1.1 @ 2026-10-18` with **1 221 964 dl/30 d**; the repo has
**100 commits/90 d, 8 humans, ≥100 releases/6 m**; and it is **one of the two libraries Expo's own guide lists**
(§3.1's P47). It targets **Google Play Billing Library 9.1.0**, comfortably above the **PBL 8** floor that Play
requires from **2026-08-31**. It implements the **OpenIAP Client Protocol** — a vendor-neutral standard with
generated bindings for Swift/Kotlin/Dart — so it also speaks to Amazon, Meta/Horizon and Onside, not only Apple and
Google. Server-side verification is `verifyPurchaseWithProvider()`: **iOS = the StoreKit 2 JWS**, **Android = the
Play purchase token**, with the provider key injected by a config plugin.

*Negatives.* The docs state the validated baseline is **"Expo SDK 53+; SDK 57 / React Native 0.86 is the validated
baseline"** — **we are one SDK ahead of its tested baseline**, exactly like Better Auth's Expo guide. **Issue #463
(2026-09-15, closed)**: *"[Bug] expo-iap: iOS rejections lose `message`/`debugMessage` under Expo SDK 57 (native
error envelope not parsed)"* — an SDK-57-specific bug in the error path. **#386 (2026-08-28, closed)**: *"apple
3.3.0 fails to compile on Xcode 26.4"*. **#503 (2026-09-30, open)**: *"Investigate TestFlight CHE storefront
returning USD product metadata"* — a **currency/storefront-metadata** bug, which is exactly the class of problem we
will hit if we configure NZD prices across storefronts. The project is 14 months old and, while 8 humans are active,
it is one organisation.

**`stripe-react-native` (P2) on New Architecture.** **#2575 (2026-08-21, open)**: *"STPApplePayContext hangs after
`didAuthorizePayment` on iOS 26 + React Native New Architecture — 'Payment Not Completed'."* **#2567 (2026-08-11,
open)**: *"iOS cold start hang with root StripeProvider + `isPlatformPaySupported` (PassKit / passd)"* — **a cold
start hang, and our budget is ≤ 2 s cold start**. **#2728 (2026-10-13, closed)**: *"[Android] Release build fails on
AGP 9"*. **#2491 (2026-06-12, open)**: *"Android WebView/Chromium renderer crash after 3DS flow with CardField"*.
**#2340 (2026-03-10, closed)**: *"Android old-arch mismatch: `SYSTEM_INFO` exported but not declared in
`NativeStripeSdkModuleSpec`"*. This is not a library we should put on the critical path of a driver's sign-up.

### 3.3 `expo-iap` / OpenIAP (P14) — the challenger, read properly

**Read.** The last 12 commits of `hyodotdev/openiap` (2026-10-17 → 2026-10-19), the open PR list, the Expo setup
page, and the `expo-iap` README, read 2026-10-21.

**Commits.** `bb3870c` (2026-10-19) `chore(deps): bump @convex-dev/migrations … (#545)` · `65aa4e8` (2026-10-19)
`fix(kit): clear legacy Mixpanel replays and fix the API Keys layout (#550)` · `8d803e4` (2026-10-18)
`chore(release): expo-iap@6.1.1` · `208245e` (2026-10-18) `fix: bound analytics reads and recover Expo refreshes` ·
`33ab232` (2026-10-17) `docs: record consent deployment interoperability (#543)` · `ba75b3e` (2026-10-17) `fix(kit):
require consent for organization membership (#542)` · `c3713cf` (2026-10-17) `docs: refresh release evidence and safe
migration previews (#541)`.

**Open PRs (2026-10-21).** `#505` (2026-10-01) `test(mcp): add private Sites hosting pilot` — that is the whole
open-PR list, because the project's work is merged directly by the maintainer.

**ISSUES opened in the 2026 window.** `#534` (2026-10-15) `[FR] plans for SPM support` · `#521` (2026-10-11)
`[FR] Cross-platform paid app ownership verification` · `#518` (2026-10-09) `[Docs] parasit "token attr-name"
throughout the doc` · **`#511` (2026-10-08) `[Bug] godot-iap (Android): export fails on stock Godot 4.6 / 4.7 —
androidx.core 1.18.0 needs AGP 8.9.1`** · `#510` (2026-10-07) `[Bug] godot-iap (iOS): cancelled
restore_purchases() reports sync-error, not user-cancelled` · **`#503` (2026-09-30, open) `Investigate TestFlight
CHE storefront returning USD product metadata`** · `#487` (2026-09-25) `Revisit committing a shared .mcp.json once
Muse allows it` · `#483` (2026-09-23) `[Bug] duplicate androidx.fragment classes when the app also references
current Google Play Services bindings`.

**What the last twelve commits say about this project.** It is not a toy: it has an SDK **kit**, an API-keys
dashboard, analytics, MCP tooling, a consent-deployment flow and *organisations*. It is also **a small
organisation with a lot of surface**, and its bug stream shows **toolchain fragility** (AGP 8.9.1, `androidx.core`
conflicts, an Xcode 26.4 compile failure). **Our reading:** `expo-iap` is the right *architecture* — an open protocol
with generated bindings — but it is a **v1.1 risk item**, not something to put a driver's salary on in v1.

### 3.4 `@better-auth/stripe` (P15) — the tenant-isolation trap

**Read.** The advisory ledger, the Better Auth plugin list (the Stripe plugin is one of six billing plugins:
Stripe, Polar, Autumn, Creem, Dodo, Comet) and the open PR that touches it.

**The advisory.** **GHSA-h3rm-78g3-j7cp** — *"@better-auth/stripe: cross-organization billing tampering in
organization subscription actions"* — **published 2026-07-24**, **fixed in 1.6.21 and 1.7.0-beta.10** (so our
`1.7.10` pin is patched). npm `@better-auth/stripe` is at **1.7.12 @ 2026-10-20**, **1 065 397 dl/30 d**.

**The open PR.** **#11943 (2026-10-20, open)** — *"fix(stripe): return non-2xx when a webhook can't be fully
processed"*. **The Stripe webhook handler in the plugin is still being fixed as of today.** That is the exact
component V4 §10.3 asks us to trust with idempotency.

**Why this is the most important card in the file.** Our locked decision is Better Auth in `services/auth` with the
`organization` plugin. The organisation plugin is our tenancy model. A billing plugin that can act **on the wrong
organisation** is not a bug in a third-party plugin; it is a bug in *our* tenancy model, and the class has already
happened upstream once. The verdict:

- **Do not enable `@better-auth/stripe` until we have written the tenant-isolation test for it** (P6 in the
  benchmark set) and the test **passes against the version we pin**.
- If we adopt it, the plugin's webhook handler must be **behind our own `BillingProvider` interface** with our own
  idempotency (a unique index on `stripe_event_id`), not the plugin's.

### 3.5 `polarsource/polar` (P16) — the permissive billing engine

**Read.** The card data: **10 372 ★** /800 f, created 2023-01-26, pushed 2026-10-20, **Apache-2.0**, last release
**`@polar-sh/cli@3.0.0 @ 2026-10-16`**, **76 releases/6 m**, **100 commits/90 d, 13 humans**, **68 open / 2 364
closed**, repo 557 MB.

**Why it matters.** It is the **only full billing engine in this pool with a clean permissive licence** and a
merchant-of-record posture — which is the same posture that answers the NZ GST question (§4.3): a MoR becomes the
supplier for the sale, so *it* charges and remits the GST and *it* handles the marketplace rules. That is a
structural answer to a problem we cannot solve with a checkout form.

**Why it does not fit v1.** We sell **one flat solo plan and one team plan** in NZD. A self-hosted billing engine is
a service to run, secure, back up and upgrade; a merchant of record is a vendor whose fee is a permanent
percentage of revenue. The published Polar fee structure (from a third-party comparison, October 2026) is
**Starter 5 % + 50 ¢**, Pro $20/month then 3.8 % + 40 ¢, Growth $100/month then 3.6 % + 35 ¢, Scale $400/month then
3.4 % + 30 ¢, plus **+1.5 % on international cards** — for a NZ$12 subscription, **5 % + 50 ¢ is NZ$1.10, versus
Stripe's NZ$0.62**. *(Third-party source; the vendor page is the source of truth and was not read.)*

**Verdict: WATCH.** Read its subscription-lifecycle and entitlement code when we need usage-based pricing or a
merchant of record; do not run it in v1.

## 4. The store rules, read in full — this is the decision, not the SDKs

### 4.1 Google Play (Android)

**Policy.** Play Console Help, *Understanding Google Play's Payments policy* (read 2026-10-21): *"Google Play's
billing system is required for developers offering in-app purchases of digital goods and services distributed on
Google Play."* The policy lists **subscription services** and **cloud software and services** explicitly; purchases
of **physical goods or physical services** (transportation, food delivery) do **not** require Play Billing.

**Our product is software sold to a courier → it is a digital subscription → Play Billing is required** if the
Android build is distributed through Google Play.

**Is there an escape? The billing-choice programme availability table (Play Console Help, read 2026-10-21):

| User market | Availability date | Enrolment options |
|---|---|---|
| United Kingdom | **Jun 30, 2026** | Billing choice programme |
| European Economic Area | **Jun 30, 2026** | Billing choice programme · existing external offers |
| United States | N/A | existing alternative billing / external content links |
| **Australia** | **Sep 30, 2026** | Billing choice programme |
| **Japan** | **Sep 30, 2026** | Billing choice programme |

**New Zealand is not on the list.** The programme "is available to all developers globally who provide digital
services or content to users within the United Kingdom and the European Economic Area, alongside programs in the
United States. Following this initial phase, we will continue expanding availability to additional markets."
**So in New Zealand there is no alternative-billing route on Play, as of 2026-10-21.** A Stripe-only in-app purchase
in a Play-distributed Android build is a **policy violation**, and the app-removal risk is the whole business.

**What it costs.** From the Android Developers' blog, *Expanded billing choice and lower fees on Google Play* (read
2026-10-21): from **June 30, 2026** the service fee is separated from the billing fee. *"Regardless of whether you
use Google Play's billing system, alternative billing, or external web links, the service fee starts at **10 %** on
your first $1 M (USD) in annual earnings. This 10 % service fee also applies to **all auto-renewing
subscriptions**."* And *"In the United States, United Kingdom, and the European Economic Area, the billing fee is set
at 5 %… We'll announce billing fee details for other markets soon."* → **the New Zealand Play billing fee is
UNVERIFIED**; what we know is a **service fee starting at 10 %**, which is the floor for every NZ transaction.

**Library floor.** *"By Aug 31, 2026, all new apps and updates to existing apps must use Billing Library version 8
or later"* (extension to Nov 1, 2026). The deprecation table: **v7 → deadline 2026-08-31**, **v8 → 2027-08-31**,
**v9 → 2028-08-31**; **PBL 9.1.0 was released 2026-06-18**. `expo-iap` ships on PBL 9.1.0 → it satisfies the
floor with two years to spare.

**A Kiwi fact worth knowing.** **Spark has stopped Google Play direct carrier billing in New Zealand: from
8 October 2026** Play purchases can no longer be charged to the Spark bill, and existing subscriptions "may not be
renewed" if no alternative payment method is added (Spark help page, read 2026-10-21). **Direct carrier billing —
the payment method a courier with no card would have used — is disappearing from Play in NZ in 2026.** Our renewal
path must not depend on it.

### 4.2 Apple (iOS)

**The rules, from the App Review Guidelines (the live page and the February 2026 PDF, read 2026-10-21).**

- **3.1.1 In-App Purchase:** *"If you want to unlock features or functionality within your app… you must use
  in-app purchase."*
- **3.1.3(b) Multiplatform Services:** *"Apps that operate across multiple platforms may allow users to access
  content, subscriptions, or features they have acquired in your app on other platforms or your web site, including
  consumable items in multi-platform games, **provided those items are also available as in-app purchases within the
  app**. **One-to-few and one-to-many real-time services must use in-app purchase.**"*
- **3.1.3(e) Goods and Services Outside the App:** *"If your app enables people to purchase physical goods or
  services that will be consumed outside the app, you must use purchase methods other than in-app purchase to collect
  those payments, such as Apple Pay or traditional credit card entry."*
- **3.1.1(a) / StoreKit External Purchase Link Entitlements:** *"apps on the App Store in specific regions may offer
  in-app purchases and also use a StoreKit External Purchase Link Entitlement to include a link to the developer's
  website…"* — and *"In all other storefronts… [there are] no such entitlements"* except where 3.1.3(a) applies.
  The **United States** storefront is the exception: since the April 2025 contempt ruling, US apps may include
  buttons and external links to other purchasing methods **without an entitlement** (per
  `appstorereviewguidelineshistory.com`, a third-party tracker of the guideline text, and a vendor blog). **NZ is not
  the US storefront.**
- **3.1.3(a) Reader Apps** — magazines, newspapers, books, audio, music, video. **Not us.**

**What this means for Courier Copilot, precisely.**

1. **The driver's own subscription to us is a one-to-many real-time service** (one courier serves many recipients).
   Apple's text says such services **must use in-app purchase**. So the subscription **must be purchasable inside
   the iOS app** — and by the same logic of "provided those items are also available as in-app purchases within the
   app", a web-only purchase is not a substitute.
2. **The courier's invoice to their own client (PARITY row 40, T7.13) is a physical service consumed outside the
   app** → 3.1.3(e) → **it must NOT use in-app purchase**. It must be a card/Stripe flow. *This is a useful
   separation: the two money flows in our product have opposite store rules.*
3. **POD is never paywalled** (PARITY row 23) — so there is no "unlock photo POD with an IAP" temptation; our
   monetisation boundary is the plan, not the feature.

**What Apple's commission actually is in NZ: UNVERIFIED.** Apple's Schedule 2 sets the commission per storefront and
Apple does not publish one global number. A vendor blog (upratehq, 2026-09-09) reports **26 % for in-app purchase,
20 % for alternative in-app payment processing, 15 % for out-of-app offers and 5 % for alternative marketplaces or
web distribution**, with reductions for Small Business Program members and for subscriptions past their first year,
and notes the US link-out question is unresolved after the April 2025 ruling. **That is vendor-reported and
US-centric. Before we model our margin we must read Apple's NZ Schedule 2 and the Small Business Program terms.**
We also see a 2026 signal worth a radar entry: a vendor guide (*pricepush.app*, "Apple's 2026 App Store Pricing &
Tax Changes Guide") reports Apple revised App Store pricing in **9+ countries** because of new 2026 tax rules.

### 4.3 NZ GST — the numbers we must design with

**Primary sources (IRD, read 2026-10-21).**

| Fact | Value | Source |
|---|---|---|
| Standard GST rate | **15 %** | IRD *Registering for GST*; IRD *Non-resident businesses and GST* |
| Registration threshold | **NZ$60 000** of taxable supplies in the last 12 months, or expected in the next 12 | IRD *Registering for GST*; IRD *Supplying remote services into New Zealand* |
| Are we in scope? | *"Examples of remote services include … **apps, software and software maintenance** … **online
newspaper subscriptions**"* | IRD *Supplying remote services into New Zealand* |
| If registered | must **register for and charge GST** | IRD *Supplying remote services into New Zealand* |
| GST inside a GST-inclusive price | **3/23 (15/115)** | Stripe *GST guide*; the IRD method is multiply by 3 and divide by 23, with ≥ 8 decimal places |
| Filing frequency | **two-monthly is the default**; six-monthly available under **NZ$500 000** turnover | Stripe *When is GST Tax Due* (Stripe's country table, sourced from IRD) |
| Marketplace rule | *"If you operate an online marketplace, such as an app store, you may be required to register and return
GST on supplies made through the marketplace"* | IRD *Supplying remote services into New Zealand* |

**The GST-inclusive arithmetic we will use** (price × 3 ÷ 23):

| GST-inclusive NZ price | GST component (3/23) | Net (20/23) |
|---|---|---|
| NZ$12.00 | NZ$1.56522 | NZ$10.43478 |
| NZ$15.00 | NZ$1.95652 | NZ$13.04348 |
| NZ$19.99 | NZ$2.60739 | NZ$17.38261 |
| NZ$29.99 | NZ$3.91174 | NZ$26.07826 |

**Three GST consequences that change the design.**

1. **The store route and the web route have different GST obligations.** When we sell through the App Store or Play,
   **the store is the supplier** of that transaction and remits the NZ GST (Play NZ prices are **GST-inclusive** —
   our own teardown records the Play NZ footer *"All prices include GST"*, `docs/study/spoke/TEARDOWN.md` §2.1,
   source S16). When we sell on the web through Stripe, **we are the supplier** and must register above NZ$60 000
   and charge 15 %. **One product, two tax positions.**
2. **A GST-inclusive price in our own product is a display rule, not a rounding rule.** Store prices are set per
   storefront and the store handles the tax; **web prices are ours** and must be stored as **integer cents plus the
   GST-inclusive flag plus the rate applied on the day** (the rate can change; history must never be recomputed).
3. **If we ever let RevenueCat (or any MoR) sell our web subscriptions**, the MoR may become the supplier for those
   supplies, which changes who registers and who remits. **That is a question for the accountant before we wire it,
   not after.**

**Open question for the founder (research cannot answer it):** is Courier Copilot GST-registered, and does the
driver-facing price include GST? At 100 drivers × NZ$12 = NZ$1 200/month we are well under the NZ$60 000 threshold;
at 500 drivers × NZ$12 = NZ$6 000/month we cross it in ten months. **The registration date is a business decision
with a hard date attached — it belongs on the founder's list.**

### 4.4 Offline entitlements — the rule we will implement

**What the vendor actually does (RevenueCat docs, read 2026-10-21).**

- The SDK **caches `CustomerInfo` on disk**; the default cache policy is **`cachedOrFetched`** — cached data is
  returned *even if stale*.
- *"The system grants a grace period for active entitlements when the user is offline. If the user's entitlement was
  active at the time they went offline, it will remain active for **up to three days**. After this period, the
  entitlement will no longer be displayed as active unless the user goes online to refresh their data."*
- A separate **Offline Entitlements** mode auto-enables when RevenueCat's servers cannot be reached **during a
  purchase**; it does **not** work for one-time purchases (consumables/non-consumables), and purchases made offline
  are pushed when connectivity returns.
- The seven subscription states and their access semantics are listed in §3.2.

**The problem with inheriting this.** The three-day grace is *RevenueCat's* rule for *its* path. If our web path
(Stripe) uses a seven-day grace and the store path (RevenueCat) uses three, **the same driver has two different
answers to "can I work today?" depending on where they subscribed** — and the customer is a tradesperson who will
not understand why the app locked on Tuesday.

**Our rule (one entitlement resolver, one grace).**

```
entitlement := { id, source: 'store'|'stripe', productId, source: 'appstore'|'play'|'web',
                 expiresAt, graceUntil, isActive, plan, seats? }
plan        := { key, priceCents, currency: 'NZD', taxInclusive: true, seats?: number }
org         := { id, plan, seatsUsed, stripeCustomerId?, stripeSubscriptionId?, storeCustomerId? }
```

- **One `BillingProvider` interface** with two implementations — `StoreBillingProvider` (RevenueCat-shaped) and
  `CardBillingProvider` (Stripe) — selected by platform and by whether the product is a digital or a physical good.
  That is V4 §6.1's "adapter behind an interface with a fake for tests", and §4.1/§4.2 are why it is not optional.
- **Our API is the entitlement authority** in every case; the store SDK is a *transport*, not the source of truth.
- **One grace rule, owned by us**: the driver keeps working for **up to 7 days** without connectivity, then the app
  enters a **read-only, locked-for-new-work** state (the route they are already driving finishes; new routes stop).
  A driver in a dead spot must never be locked out mid-shift, and a driver whose subscription was cancelled must
  not keep working indefinitely. **7 days is our number to defend, not RevenueCat's 3 — it is a product decision
  that needs the founder's sign-off.**
- **The offline entitlement is a signed, expiring artefact cached on the device** — a short-lived entitlement JWT
  from our API with `exp`, `plan`, `org` and `source` — so the app can decide offline without trusting a local
  flag that a user could edit.

## 5. Benchmark — **UNVERIFIED: no billing eval set exists**

`docs/squads/payments/eval/` does not exist; `docs/squads/payments/benchmarks/README.md` reads "Harness: _to be
created with the first implementation_". No PSP account was used by this role and no emulator was run, so
**every row below is UNVERIFIED** and names the set we must build.

**The set to build (named):** `docs/squads/payments/benchmarks/`

| # | Benchmark | Candidates compared | Metric | Target | Status | Set to build |
|---|---|---|---|---|---|---|
| **P1** | **Cost per courier-month** | Stripe web · Stripe via store · RevenueCat+store · Polar | total processor + service fee per NZ$12.00 NZD month, GST-inclusive | ≤ 6 % of the price on the web path; the store path is reported, not gated | **UNVERIFIED** | `benchmarks/cost-per-courier-month/` — 1 000 price points at 1-cent granularity, all three fee models |
| **P2** | **GST display and extraction** | our formatter vs the IRD ×3÷23 method | the GST component of a GST-inclusive price | matches IRD to **8 decimal places** | **UNVERIFIED** | same set as P1, including prices ending in 0.01/0.05/0.10 |
| **P3** | **Webhook idempotency** | our handler vs `stripe-mock` replay | one `event.id` delivered **3×** | exactly **1** state change; **1** audit row | **UNVERIFIED** | `benchmarks/webhook-idempotency/` |
| **P4** | **Signature verification** | `verifyHeader` vs our HMAC | tampered body · stale timestamp · blank secret | **100 %** reject, **0** false accept | **UNVERIFIED** | same set as P3 |
| **P5** | **Entitlement matrix** | RevenueCat `CustomerInfo` vs our `Entitlement` type | plan × source × trial × grace × offline | identical decisions on **100** cases | **UNVERIFIED** | `benchmarks/entitlements/` |
| **P6** | **Tenant isolation (billing)** | `@better-auth/stripe` + our org scoping | **50** concurrent orgs × billing actions | **0** cross-org writes | **UNVERIFIED** | `benchmarks/tenant-isolation/` — **mandatory**, given GHSA-h3rm-78g3-j7cp |
| **P7** | **Offline grace** | our offline entitlement cache | 72 h offline → reconnect | access through the grace window; revoked at expiry | **UNVERIFIED** | `benchmarks/offline-grace/` |
| **P8** | **Store-price parity** | App Store Connect price vs Play price vs web price | the NZD price a driver sees on each channel | identical or a written explanation | **UNVERIFIED** | `benchmarks/store-price-parity/` — needs a real App Store Connect + Play Console account |
| **P9** | **New-Architecture smoke** | RevenueCat SDK vs `expo-iap` | sign-in → purchase → restore → cold start on **Expo 58 + RN 0.88 + New Arch** | no crash, no hang, cold start ≤ 2 s | **UNVERIFIED** | `benchmarks/new-arch-smoke/` — **CI Android emulator; no local emulator (AGENTS.md)** |

**How each row would actually be measured (so the number is reproducible).**

| Metric | How it is measured | Where it runs |
|---|---|---|
| **P1 cost per courier-month** | one script: for each fee model, compute `price × rate + fixed` from the **published** rate, then compare to the net after GST; **no PSP account needed** — the rates are the vendor's published numbers (Stripe NZ 2.65 % + NZ$0.30; Play service fee from 10 % + billing fee UNVERIFIED for NZ; RevenueCat 1 % of MTR above US$2 500; Polar 5 % + 50 ¢ per the third-party comparison). | a node script in `scripts/` + a checked-in CSV |
| **P2 GST** | `round(price × 3 ÷ 23, 8)` vs the IRD method on 1 000 price points; assert the two agree to 8 dp and that the **displayed** price never changes after a rate change | `packages/shared` vitest |
| **P3 idempotency** | replay the same `event.id` 3× against `stripe-mock`; count the rows written and the audit rows | `services/billing` vitest + `stripe-mock` |
| **P4 signature** | 4 cases (tampered body, stale timestamp, blank secret, truncated body) × 50 iterations; assert 0 accepts | same suite |
| **P5 entitlement matrix** | a 100-row JSONL of (plan, source, state, offline?) with the expected `isActive`; compare our resolver to the RevenueCat SDK's `EntitlementInfo.isActive` on the same rows | CI job with a sandbox app |
| **P6 tenant isolation** | 50 orgs × 20 billing actions each, in parallel; **any** row written against a foreign `organizationId` is a failure | `apps/api` pytest against a real Postgres |
| **P7 offline grace** | the device enters airplane mode for 72 h; the app must keep working and then lock; a forced reconnect must refresh the state | Maestro flow on the CI emulator + a device run |
| **P8 store-price parity** | read the App Store Connect IAP price for NZ and the Play Console price for NZ, compare with the web price | manual, needs the store accounts |
| **P9 new-arch smoke** | build the app with each SDK, run the Maestro purchase flow on the CI emulator | `.github/workflows/android-e2e.yml` |

**First benchmark to run:** P1 and P2 (no account, no device, no money) and then P3/P4 (needs `stripe-mock`, still no
account). **Nothing is declared "the winner" before this table exists.**

### 5.1 The cost arithmetic, done from the published rates (arithmetic, not a benchmark)

At a **NZ$12.00 GST-inclusive** monthly price (illustrative; the price point is a founder decision):

| Route | Published rate (2026-10-21) | Fee per courier-month | Net to us | Effective rate |
|---|---|---|---|---|
| **Stripe, NZ domestic card** (web) | 2.65 % + NZ$0.30 | 12.00 × 0.0265 + 0.30 = **NZ$0.618** | NZ$11.382 | **5.15 %** |
| Stripe, NZ domestic card at NZ$29.99 | 2.65 % + NZ$0.30 | **NZ$1.095** | NZ$28.895 | 3.65 % |
| **Google Play (NZ)** | service fee **from 10 %** on the first US$1 M; billing fee **UNVERIFIED for NZ** | **≥ NZ$1.20** + the unknown billing fee | ≤ NZ$10.80 | **≥ 10 %** |
| **Apple App Store** | commission **UNVERIFIED for NZ** (vendor-reported 26 % IAP / 20 % alternative / 15 % out-of-app) | **UNVERIFIED** | UNVERIFIED | — |
| **RevenueCat** | free to US$2 500 MTR, then **1 % of MTR** | ≈ **NZ$0.12** at 1 000 trackers (if the 1 % applies to all MTR once over the threshold — **the base is ambiguous, UNVERIFIED**) | — | ≤ 1 % |
| **Polar Starter** | 5 % + 50 ¢ (third-party source) | **NZ$1.10** | NZ$10.90 | 9.17 % |

**What the arithmetic says (and what it does not say).** The **direct card route is roughly half the cost of the
store route** at this price point, and the store route's cost is dominated by a percentage that grows as our revenue
grows. But the store route is **not optional** (§4.1/§4.2), so the number that matters is **how much of the plan
price we are willing to give to the store** — and the mitigation is Apple's own 3.1.3(b): *the same subscription must
also be available as an in-app purchase*, which means the **web price and the store price must be the same price**
(parity is a policy expectation, not a nicety). **The Apple/Play cut is therefore a real, permanent margin
decision, and it belongs to the founder before we pick a price.**

### 5.2 The competitor's price, as a reference point (not a benchmark)

From `docs/study/spoke/TEARDOWN.md` (read 2026-10-21; **its own source S16/S13**): Spoke Route Planner sells
**Free** (unlimited routes, **max 10 stops per route**), **Lite US$9.99/mo** and **Standard US$19.99/mo** (US list
prices), with **"All prices include GST"** in the Play NZ listing, and a **7-day trial** (the help centre) versus
**"14-day trial"** in the store copy. **The NZD price the NZ storefront actually charges is UNVERIFIED** (both the
NZ and AU storefronts render the same unlabelled string set *Lite $14.99, Premium $29.99, Premium Annual $179.99*).
Spoke Dispatch (teams) is **USD-only: Starter $125, Premium $200, Expert $1000 per month**. **We are therefore
pricing into a market whose NZ price we cannot yet read — that is a research gap, and it is the founder's call.**

## 6. What we are missing → rows for `docs/PARITY.md`

The **Spoke** column is filled **only** where `docs/study/spoke/TEARDOWN.md` states the fact (read 2026-10-21). Where
the teardown is silent the cell is empty. Note the contradiction for the CEO: PARITY rows 38–40 currently claim
Spoke "match" on earnings tracking, mileage logbook and client invoicing, while **TEARDOWN §17 states "No earnings,
mileage logbook, IRD/GST export, invoicing or client statement in either product (S2, S3, S5)"** — the teardown is
the sourced document; the rows below follow it.

| # | Family | Feature | Status | Spoke (2026-10-20) | Our edge | Task |
|---|---|---|---|---|---|---|
| 1 | Pricing/Billing | Subscription plans, free tier, free trial | Planned (task) | Free tier with a **10-stop cap**; Lite US$9.99 and Standard US$19.99 per month; a **7-day** free trial (the store copy says 14) (S2, S5, S13, S16) | **NZD, GST-inclusive**, free first, trial before the first invoice | T7.13 |
| 2 | Pricing/Billing | GST-inclusive pricing and the GST component on the receipt | Planned (task) | Play NZ listing states **"All prices include GST"** (S16) | the GST component computed with the IRD ×3÷23 method to 8 dp and shown separately | T7.13 |
| 3 | Pricing/Billing | In-app purchase for the driver subscription | Planned (task) | Spoke sells on both stores (its Play listing carries the in-app prices) (S13, S16) | a single entitlement model behind both stores, so the driver never sees two different answers | T7.13 |
| 4 | Pricing/Billing | Web purchase at the same price as the store price | Planned (task) | | price parity enforced by a test, because the store rules require the same item to be purchasable in-app | T7.13 |
| 5 | Pricing/Billing | Webhook idempotency (one state change per event) | Planned (task) | | a unique index on `stripe_event_id`, replay-safe, one audit row | T7.13 |
| 6 | Pricing/Billing | Offline entitlement (the driver keeps working with no signal) | Planned (task) | | a signed, expiring offline entitlement with one grace rule across both purchase channels | T7.1 |
| 7 | Pricing/Billing | Team plan with per-seat billing on one organisation | Planned (task) | Dispatch has unlimited dashboard members and unlimited drivers (S3, S5) | org-scoped seats with a tenant-isolation test for every billing action | T7.14 |
| 8 | Pricing/Billing | Subscription management in the app (upgrade, cancel, restore) | Planned (task) | | voice-driven: "cancel my plan", "what am I paying" | T7.6 |
| 9 | Earnings | Client invoicing, quote engine, weekly GST invoice to the courier's client | Planned (task) | | no earnings, mileage logbook, IRD/GST export, invoicing or client statement in either Spoke product (S2, S3, S5) | weekly GST invoice per client, Stripe (and **not** in-app purchase, per Apple's 3.1.3(e)) | T7.13 |
| 10 | Earnings | Mileage logbook + IRD-ready export | Planned (task) | | no mileage logbook in either Spoke product (S2, S3, S5) | IRD-ready NZ mileage rate from the GPS trace | T7.11 |
| 11 | Earnings | GST and earnings summary for the driver | Planned (task) | | no earnings or GST export in either Spoke product (S2, S3, S5) | spoken weekly summary, on-device, no PII leaving the phone | T7.12 |
| 12 | Support | Refunds and disputes handled for the driver | Planned (task) | live chat support in every Dispatch plan (S3, S4) | one refund flow that works on both channels, with the store's refund window honoured | T7.15 |

## 7. Decision

**ADOPT — a two-channel billing architecture behind one interface, with the store channel mandatory.**

1. **Card path: `stripe-node@23.0.0` (server, MIT) + `stripe-mock@0.206.0` (test).** MIT, 0 advisories, 94.6 M
   downloads/30 d, published NZ pricing (2.65 % + NZ$0.30 domestic). `stripe-python` stays the option if the webhook
   handler lives in `apps/api` — **decide once, and pin the Stripe API version on the account.**
2. **Store path: the RevenueCat *model*, implemented by our own entitlement resolver.** The SDK (`react-native-purchases`,
   MIT) is the reference implementation; the **hosted service is optional** and must not be the entitlement
   authority. `expo-iap` (P14) is the challenger to re-evaluate in two radar cycles.
3. **`BillingProvider` interface, two implementations** — `StoreBillingProvider` and `CardBillingProvider` — chosen
   by platform *and* by whether the product is a digital service (the driver's subscription → in-app purchase
   required) or a physical service consumed outside the app (the courier's client invoice → **Stripe/card required,
   in-app purchase forbidden**, Apple's 3.1.3(e)). This is V4 §6.1's adapter rule, and it is not optional: **NZ is not
   on Play's billing-choice list, so a Play-distributed Android build cannot sell the subscription with Stripe.**
4. **Our API is the entitlement authority.** The store SDK is a transport. Entitlements are resolved
   **local cache → store SDK → our API → re-check**, with **one** grace rule (7 days, a founder decision) and a
   **signed offline entitlement** cached on the device.
5. **Prices are integer cents + a `tax_inclusive` flag + the GST rate applied on the day.** NZ GST is 15 %; the
   GST component of a GST-inclusive price is **price × 3 ÷ 23** to 8 dp; **history is never recomputed**.
   **NZD prices on the stores must equal the web price.**
6. **Exact-version pins for every money library** — `stripe`, `stripe-mock`, `react-native-purchases` (if adopted),
   `expo-iap` — no ranges, recorded in `docs/LICENSES.md`.
7. **The billing plugin in Better Auth is gated**: do not enable `@better-auth/stripe` until our **own**
   tenant-isolation test for billing actions passes against the pinned version, and keep its webhook behind our own
   idempotency layer.

**WATCH:** `expo-iap`/openiap (the challenger) · `polarsource/polar` (Apache-2.0 engine, MoR model) ·
`PaddleHQ/paddle-node-sdk` and `@lemonsqueezy/lemonsqueezy.js` (MoR = the GST answer, at a margin cost) ·
`useautumn/autumn` and `dodopayments/dodopayments-node` (2026 Better Auth billing plugins) · `openmeterio/openmeter`
(usage metering, if we price per stop) · `chargebee/chargebee-node` and `Adyen/adyen-node-api-library` (a second
bank) · `stripe/stripe-cli` (the dev webhook loop) · `SolidInvoice`, `laravel/cashier-stripe`, `pay-rails/pay` (read
the state machine) · `qonversion`/`Adapty`/`Apphud` (the same shape, no advantage) · **POLi, PayPal NZ and
Airwallex** (a Kiwi card fallback; POLi's one-off bank transfer is wrong for auto-renewing subscriptions).

**REJECT:** `stripe-react-native`/`stripe-android`/`stripe-ios` **for the subscription** (Play policy + the open
New-Architecture and cold-start issues #2575/#2567) · `juspay/hyperswitch` (a router we do not need) ·
`getlago/lago`, `meteroid-oss/meteroid`, `flexprice/flexprice`, `frappe/books` (AGPL-3.0 → clean-room study only)
· `akaunting/akaunting` (BSL — banned by CONSTRAINTS.md) · `dubinc/dub`, `InvoicePlane`, `vendurehq/vendure`,
`medusajs/medusa` (non-permissive licences) · `saleor`, `spree` (commerce) · `dj-stripe` (Django) ·
`a-tokyo/react-native-stripe-checkout-webview` (Play-policy violation for digital goods) · `dooboolab/react-native-iap`
(the repository is **archived**; use `expo-iap`).

**Fallback chain.** Stripe (direct) → Stripe (via a second bank if NZ pricing or settlement becomes a problem) →
a merchant of record (Polar/Paddle/Lemon Squeezy) if GST registration becomes a burden → **never** a self-hosted
billing engine in v1 (we would be running a service to sell one flat plan).

**Risks.**

| Risk | Severity | Mitigation |
|---|---|---|
| **Play policy**: a Play-distributed Android build must use Play Billing for the driver subscription, and **NZ has no alternative-billing route** (§4.1) | **High** | the store channel is in the v1 scope; the sideloaded APK is not a substitute for the Play channel; a policy check before every Play release |
| **Apple's "one-to-few and one-to-many real-time services must use in-app purchase"** (§4.2) | **High** | the same subscription must be purchasable in-app; the web purchase is not a substitute |
| **The store cut is permanent margin** (Play service fee from 10 %; Apple's NZ rate UNVERIFIED) | **High** | read Apple's NZ Schedule 2 and the Play fee table for NZ **before** the founder picks a price; keep the two prices identical |
| **The store SDKs have New-Architecture defects** (RevenueCat #1747/#1739 open since 2026-04-22/05-01; #2575/#2567 on stripe-react-native) | **High** | benchmark P9 on Expo 58 + New Arch **before** adopting; our app has `newArchEnabled: true` |
| **`@better-auth/stripe` carries a cross-org billing advisory** and its webhook handler is still being fixed (#11943, open 2026-10-20) | **High** | our own tenant-isolation test (P6); our own idempotency; keep the plugin behind our interface |
| GST registration at NZ$60 000 | Medium | track monthly revenue; the founder decides the date; store the rate applied on the day and never recompute history |
| The two channels disagree about entitlement | Medium | our API is the authority; one grace rule; benchmark P5 |
| A hung webhook handler is a payment-down incident (stripe-node #2814) | Medium | read timeout + body-size cap on the receiver; verify the signature over the raw bytes |
| Stripe API version churn | Medium | pin the API version on the account; run `stripe-mock` against the pinned spec; read the changelogs monthly |
| RevenueCat's exact MTR fee base (whole MTR vs the excess) | Low | **UNVERIFIED**; the difference is at most NZ$25/month at our scale; re-read the pricing page monthly |
| Direct carrier billing disappearing from Play NZ (Spark, 2026-10-08) | Low | do not design a renewal path that depends on carrier billing |

**ADR PROPOSALS (flagged, not applied).**

| # | Proposal | Why it needs an ADR | Status |
|---|---|---|---|
| **ADR-E** | **The driver subscription is sold as an in-app purchase on both stores, at the same price as the web**, and the web channel exists for renewals, invoices and receipts | It fixes the store-policy exposure and it sets the permanent margin; it is a product decision, not an implementation detail | **PROPOSED — CEO decision, before the price is set** |
| **ADR-F** | **One 7-day offline grace, owned by us**, with a read-only state after it | It overrides the vendors' own grace rules and it decides whether a driver can be locked out mid-shift | **PROPOSED — CEO decision** |
| **ADR-G** | **RevenueCat's hosted service is optional; our API is the entitlement authority** | Introducing a hosted entitlement processor into the product boundary is a locked-decision change, and it is an NZ Privacy Act data-processor question | **PROPOSED — Payments & Accounts squad** |
| **ADR-H** | **Do not enable `@better-auth/stripe`** until our own billing tenant-isolation test passes | The advisory shows the plugin can act on the wrong organisation | **PROPOSED — Payments & Accounts squad** |
| **ADR-I** | A **merchant of record** (Polar / Paddle / Lemon Squeezy) for the web channel, to take the GST registration burden | It changes who is the supplier for GST and it costs a permanent percentage | **PROPOSED — revisit at NZ$60 000 revenue** |

## 8. Monthly radar filter (V4 §11.3)

Re-run on the first Monday of each month and update this file:

- **Google Play** — the **Payments policy** and the **billing-choice programme availability table** (is NZ added?),
  the **fee structure** for our region (the billing fee for non-US/UK/EEA markets was "soon"), and the **Play Billing
  Library deprecation table** (v9 → 2028-08-31; we should be on 9.x).
- **Apple** — the App Review Guidelines (we are on the **February 2026** edition), 3.1.1/3.1.3 and the **NZ
  Schedule 2** commission, the Small Business Program terms, and the 2026 price/tax changes in 9+ countries.
- **IRD** — the GST rate, the registration threshold, the GST guide (IR375) and the **remote-services** rules; plus
  the **marketplace/listed-services** rules, because they decide who remits when a MoR is in the middle.
- **Stripe** — the NZ pricing page (the last change was 2026-05-01), the **Billing** pricing, the **API version**
  changelog, and the settlement schedule for NZ.
- **RevenueCat** — the pricing page (the MTR threshold and the fee base), the SDK release, and the **offline
  entitlement** documentation; and any change to the grace period, because we do not inherit it (we own ours).
- **openiap / `expo-iap`** — releases, the **Expo SDK baseline** (it says 57; we are on 58), and the Play Billing
  Library version it ships.
- **`@better-auth/stripe`** — the advisory ledger and the plugin's release notes; and the open PR **#11943**.
- **`stripe-node`** — the webhook and timeout commits (#2885, #2895, #2814, #2897) and the API-version bump.
- **POLi / PayPal NZ / Airwallex** — the Kiwi fee pages, for the card-fallback story.
- **Filters:** a published, dated price for the NZ market · a release in the last 6 months · a permissive licence ·
≥ 2 active human maintainers in 90 days · **no unpatched high/critical advisory** · a policy statement that covers
**New Zealand** (not only the US/EU) · an Expo/New-Architecture statement when the slot is the mobile client.

## 9. What we could not verify

- **6-month star trend** for all 50 candidates — the star timeline is 403 with our token (re-verified 2026-10-21).
- **Apple's commission in New Zealand** — not read from Apple's NZ Schedule 2. The 26 % / 20 % / 15 % / 5 % figures
  are **vendor-reported and US-centric** (upratehq, 2026-09-09). **UNVERIFIED.**
- **Google Play's billing fee for New Zealand** — Google says it "will announce billing fee details for other
  markets soon". The **service fee starting at 10 %** is verified; the billing fee is **UNVERIFIED**.
- **Whether Play's billing-choice programme will reach New Zealand** — not on the table as of 2026-10-21; the blog
  says expansion "will continue" without a date. **UNVERIFIED.**
- **Live PSP behaviour** — no Stripe, RevenueCat, App Store Connect or Play Console account was used by this role,
  so checkout latency, webhook delivery latency, sandbox quirks, tax-ID validation and NZD charge failures are all
  **UNVERIFIED**.
- **The actual NZD price the Spoke NZ storefront charges** — the NZ and AU listings render the same **unlabelled**
  price strings (TEARDOWN §18 question 1). **UNVERIFIED**, and it is the number we would price against.
- **The GST-inclusive display on the stores** — Play NZ's "All prices include GST" comes from our own teardown
  (S16, the Spoke listing); Apple's NZ IAP prices showing "15 % GST included" comes from a **third-party price
  tracker** (apppricelens), not from Apple. Apple's NZ tax treatment is **UNVERIFIED** from a primary source.
- **Whether Apple and Google, or we, are the supplier for GST on store sales in NZ** — reasoned from IRD's
  remote-services and marketplace rules but **not confirmed**; a question for the accountant.
- **RevenueCat's MTR fee base** — "free up to $2 500 MTR, then 1 % of what you track" does not state whether the 1 %
  applies to all MTR or only the excess. **UNVERIFIED.**
- **Polar's, Paddle's, Lemon Squeezy's and Adapty's actual prices** — the fee table used above is from a
  **third-party comparison** (turbostarter, 2026-10-12), not the vendor pages. **UNVERIFIED.**
- **POLi's, PayPal NZ's and Eftpos NZ's fee pages** — POLi's figure is from a stale third-party page; PayPal NZ's
  is from a competitor's comparison. **UNVERIFIED.**
- **`react-native-iap`'s status** — the GitHub repository is **archived** at release 14.7.20 (2026-04-02) while npm
  publishes **17.1.0 (2026-10-17)**. We could not determine where the newer versions are built. **UNVERIFIED.**
- **Whether the RevenueCat or `expo-iap` SDKs work on Expo SDK 58 + RN 0.88 + New Architecture** — RevenueCat's
  own issues say the New Architecture has been a problem through 2026; `expo-iap` says its validated baseline is
  SDK 57. **UNVERIFIED** until benchmark P9 runs on the CI emulator.
- **The IRD-compliant invoice fields** (GST number, taxable period, GST amount) — not verified against an IRD
  checklist. **UNVERIFIED.**
- **All benchmarks P1–P9** — **UNVERIFIED**; no eval set exists and no harness has run.
