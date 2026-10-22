# Payments & Accounts Squad - research

**Area:** payments & subscriptions (Stripe NZD + GST, IAP, entitlements, invoicing) **Research date:** 2026-10-20 · **Source file:** `docs/research/2026/payments-subscriptions.md`

## Queries that found the candidates

`topic:stripe topic:react-native` · `topic:in-app-purchases` · `stripe react-native in:name` · `"subscription billing engine in:description"` (0) · `topic:stripe stars:>100 pushed:>2026-04-01` · `topic:invoicing stars:>100` ·
`topic:better-auth` · `topic:revenuecat` · `"entitlements in:name,description"` · `"new zealand gst tax invoice in:description"` · `topic:payments topic:billing` · `"google play billing kotlin in:name"`. API calls: `repos/{o}/{r}` (40) ·
`/security-advisories` (12) · `/license` (20) · `/readme` (6) · `/commits?per_page=20` (5) · npm registry (18) · npm downloads (14) · 4 web searches (IRD GST, Google Play payments policy, Stripe NZ pricing, Stripe supported currencies).
Candidates examined: **38**.

## Candidates that matter

| Project | Repo | Licence | One-line reason |
|---|---|---|---|
| stripe-node | `stripe/stripe-node` | MIT | The server-side PSP client; typed, fully generated from the OpenAPI spec, 94.6 M dl/30 d, 0 advisories. |
| stripe-mock | `stripe/stripe-mock` | MIT | Deterministic billing tests pinned to the SDK's OpenAPI version - we can test the whole billing suite offline. |
| react-native-purchases | `RevenueCat/react-native-purchases` | MIT | The reference IAP client: one entitlement API for the App Store, Play and (web) Stripe; 10.15.0, 13 human maintainers, and their repo runs **Maestro purchase flows on the old architecture**. |
| better-auth | `better-auth/better-auth` | MIT | Auth + organisations + a Stripe plugin in one package; 30.4 k ★, 29 human maintainers, v1.7.11 on 2026-10-19 - but **28 advisories**. |
| openiap | `hyodotdev/openiap` | MIT | A vendor-neutral, standardised IAP protocol across stores; 537 commits/90 d, but created 2025-08-12 with 1 maintainer. |
| Polar | `polarsource/polar` | Apache-2.0 | The only full billing engine with a clean permissive licence - a reference for the subscription lifecycle, not a dependency. |
| stripe-react-native | `stripe/stripe-react-native` | MIT | Official card UI with SCA/3DS and Apple Pay; blocked for the Android subscription by the **Google Play payments policy**. |
| Lago / Meteroid / Flexprice / Frappe Books | various | **AGPL-3.0** | Clean-room study only. |
| Dub | `dubinc/dub` | source-available | Rejected - not permissive. |
| Cashier / Pay | `laravel/cashier-stripe`, `pay-rails/pay` | MIT | The subscription state machine (trial -> active -> past_due -> cancelled) and proration rules - read, do not depend (wrong language). |
| Akaunting | `akaunting/akaunting` | **BSL** | Banned by CONSTRAINTS.md. |
| SolidInvoice | `SolidInvoice/SolidInvoice` | MIT | For the "send me an invoice" path; no GST-NZ specifics. |

## Deep review - top 5

1. **stripe/stripe-node** (4,534 ★, MIT, npm `stripe@23.0.0`) - fully generated from Stripe's OpenAPI spec; v23 introduced the **API v2** surface (`Add API v2 Search support`, 2026-10-14) with hand-written `V2List`/`V2SearchResult` exports
   (2026-10-16). Node 18 support was dropped on 2026-09-28 (our `engines.node >= 22` is satisfied). The **webhook** pattern is what matters to us: the last 20 commits include "Reject blank webhook secrets" (2026-10-19), "Fix notification
   handling and discarded fetch retries" (2026-10-19), signature verification with a default tolerance (2026-09-29) and "Classify incomplete response bodies as connection errors" (2026-09-28). **Take three rules:** reject a webhook if the
   signing secret is empty; a constant default tolerance on the signature timestamp, configurable per call; never treat a truncated body as a valid event. Idempotency keys are supported by the client, but **our** webhook handler must
   additionally dedupe on the event id, with a unique index and a test. `stripe-mock` is pinned to the SDK's OpenAPI version, so the mock and the client cannot drift. **Verdict ADOPT, pinned exactly.**
2. **RevenueCat/react-native-purchases** (1,215 ★, MIT, npm `react-native-purchases@10.15.0`) - the SDK is MIT but **the server is not open source**; the shape is SDK -> store -> RevenueCat backend -> webhooks back to our server, with
   entitlements configured remotely and exposed through a single customer-info object. The last 20 commits include "Run Maestro purchase flow on old architecture" (2026-10-13) - **they run Maestro purchase flows against the legacy
   architecture**, which is exactly the CI coverage we must add for our own paywall. Ergonomics: `configure({ apiKey })` -> customer info -> purchase; `logIn`/`logOut` for user mapping. We should wrap it behind our own `BillingProvider` so
   the service can be swapped. Risks: vendor lock-in, NZ Privacy Act exposure (purchase data is processed by RevenueCat), and price tiers must be identical across stores (the NZD GST-inclusive price is configured per store). **Verdict ADOPT
   the SDK + the entitlement pattern; keep the backend swappable.**
3. **better-auth/better-auth** (30,385 ★, MIT, npm `better-auth@1.7.11`) - a framework-agnostic core with adapters (Prisma, Drizzle, Kysely, Mongo, Memory) and plugins as the extension point; the **Stripe plugin** and **organization
   plugin** are how we get teams + billing on one auth system. The last 20 commits are security work: "reject ID tokens when the provider has no client ID" (2026-10-20), "run the standard callback checks on proxied callbacks" (2026-10-20),
   "verify tokens with the stored key's algorithm" (2026-10-19), "verify id_tokens with one shared policy" (2026-10-19). **Advisory history - read this before adopting:** **28 advisories**, including critical GHSA-965c-763c-88jm (OAuth
   state usable as a Magic Link to sign in as another user, patched 1.7.7), critical GHSA-rjg6-39jm-rgg4 (SCIM token takeover, patched 1.6.22), critical GHSA-5rr4-8452-hf4v (SSO: any signed-in user can make the server fetch internal URLs,
   patched 1.6.11) and **high GHSA-h3rm-78g3-j7cp ("Organization billing actions can run on the wrong organization", patched 1.6.21)** - directly the tenant-isolation class V4 §10.3 demands we test
   - plus 12 further highs. The volume is high but every advisory is patched and 1.7.11 is above the highest patched version. **Verdict ADOPT at 1.7.11 or later, with an exact pin, a CI dependency gate, our own tenant-isolation and
     rate-limit tests, a monthly advisory re-read, and a rule that no plugin is enabled without a test. No SCIM and no SSO in v1.**
4. **polarsource/polar** (10,373 ★, Apache-2.0) - a full open-source billing platform with a CLI; a TypeScript service, event-driven, with webhooks and signature checks; a 557 MB monorepo with 1,835 commits in 90 days. It is the only full
   billing engine here with a clean permissive licence and no vendor lock-in - but we sell **one flat plan (and one team plan)** in NZD, and a self-hosted billing engine is a service to run, secure, back up and upgrade: a large fixed cost
   for a feature Stripe already provides in 15 lines. **Verdict WATCH - read its subscription lifecycle and entitlement code.**
5. **hyodotdev/openiap** (158 ★, MIT, created 2025-08-12) - "Standardized protocol for in-app purchases across all platforms", with an `expo-iap` package that fits Expo SDK 58; 537 commits/90 d and 15+ releases in 6 months, the **highest
   release cadence** of any IAP candidate. Risks: 1 maintainer, 158 ★, created 14 months ago, new ecosystem backing, and entitlement/validation still needs a server we build. **Verdict WATCH - the strongest challenger; re-evaluate at ~1 k ★
   or a 2.0 release.**

## Decisions

- **ADOPT** `stripe/stripe-node@23.0.0` (MIT, 15+ releases/6 m, 0 advisories) and `stripe/stripe-mock@0.206.0` (deterministic billing tests, pinned to the SDK's OpenAPI version).
- **ADOPT** `RevenueCat/react-native-purchases@10.15.0` - **SDK only** (MIT). The hosted service is optional; the entitlement model is what we adopt. Wrap it in `BillingProvider` so a self-hosted backend can replace it. Add a **Maestro
  purchase-flow CI job**, exactly as upstream does.
- **ADOPT** `better-auth@1.7.11` - auth + organisations + Stripe plugin, MIT, 29 human maintainers. **Pin exactly; enable only plugins we test; keep SCIM and SSO off.**
- **KEEP** `expo/eas-cli` (store credentials and submission path) and the Python Stripe client for admin-side operations (our API service is Python/FastAPI).
- **Pin exactly, no ranges** for every money library: `stripe`, `stripe-mock`, `react-native-purchases`, `better-auth`.
- **WATCH** `hyodotdev/openiap` · `polarsource/polar` · `openmeterio/openmeter` (per-stop pricing) · `laravel/cashier-stripe` and `pay-rails/pay` (subscription lifecycle reference) · `SolidInvoice/SolidInvoice` ·
  `stripe/stripe-react-native@0.82.0` (only if a card flow is policy-allowed) · `qonversion`, `adaptyteam`, `apphud` (same shape, no advantage at our size) · `kdeldycke/awesome-billing` (CC0 radar).
- **REJECT** Lago / Meteroid / Flexprice / Frappe Books (**AGPL-3.0** - clean-room study only, never a dependency, never quoted code) · Akaunting (**BSL** - banned by CONSTRAINTS.md) · Dub (source-available) · InvoicePlane / NocoBase /
  Vendure (custom or dual licences) · twenty / appsmith · `juspay/hyperswitch`, `medusajs/medusa`, `saleor/saleor` (wrong domain or language) · `tipsi/tipsi-stripe` (archived) · a WebView checkout as the primary path (fails the Play policy
  for digital goods and is bad for a driving app; keep only as a documented fallback if policy ever requires it).
- **ADR trigger** introducing a hosted entitlement service (RevenueCat) into the product boundary, or deciding not to use Play Billing on Android, is a locked-decision change - ADR + `docs/decisions/DECISIONS.md`.

## UNVERIFIED

1. **6-month star trend** for all 38 candidates (the token lacks the `stargazer` scope).
2. **Live PSP behaviour** - no Stripe/RevenueCat account was used, so checkout latency, webhook delivery latency, sandbox quirks, tax-ID validation and NZD charge failures are all UNVERIFIED.
3. The **actual Stripe NZ fee** for our exact plan mix - the published 2.65 % + NZ$0.30 is the published rate; volume discounts are UNVERIFIED.
4. Apple's current multiplatform-service exception wording was not read; whether Play's alternative billing applies to New Zealand (the policy text read on 2026-10-20 names India, South Korea and the EEA only). RevenueCat / Qonversion /
   Adapty / Apphud service pricing, data residency and DPA terms are commercial and not in the repos. UNVERIFIED.
5. Openmeter / Polar / Lago / Meteroid / Flexprice parity against Stripe Billing - not benchmarked. **Invoice GST-NZ compliance** (IRD-compliant fields: GST number, taxable period, GST amount) - not verified against an IRD checklist.
   UNVERIFIED.
6. All benchmarks P1-P7: UNVERIFIED.
