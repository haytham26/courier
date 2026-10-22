# Founder TODO - Courier Copilot

> Items only the founder can provide. **Never blocks execution** — logged here, workaround used, work continues.

---

## Now (Free) — Paste into `.env.local` then run `scripts/ci/check-secrets.js`

| Item | Provider / URL | Env Var | Where It Goes | Affected Feature & Current Workaround | Blocks? |
|------|----------------|---------|---------------|----------------------------------------|---------|
| LINZ LDS API Key | data.linz.govt.nz → Profile → API keys | `LINZ_LDS_API_KEY` | `.env.local` → GitHub Secrets → Server env | LINZ address imports (worker). **Workaround:** tests/fixtures/canterbury-sample.csv | No |
| LINZ Basemaps API Key | basemaps.linz.govt.nz → Developer | `LINZ_BASEMAPS_API_KEY` | `.env.local` (optional) | Dev map tiles. **Workaround:** PMTiles from Geofabrik/OSM | No |
| Oracle Cloud Always Free | cloud.oracle.com → Compute → Sydney `ap-sydney-1` | `OCI_HOST`, `OCI_SSH_PRIVATE_KEY_PATH` | SSH key outside repo; host in `.env.local` | Production hosting. **Workaround:** Local Docker compose | No |
| Cloudflare Account + API Token | dash.cloudflare.com → My Profile → API Tokens | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | `.env.local` → GitHub Secrets | R2, Workers AI, Tunnel, DNS. **Workaround:** Local MinIO, local Ollama | No |
| Cloudflare R2 Keys | dash.cloudflare.com → R2 → Manage R2 API Tokens | `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT` | `.env.local` → GitHub Secrets | POD photos, backups, OTA, tiles. **Workaround:** Local filesystem | No |
| Cloudflare Workers AI Token | dash.cloudflare.com → API Tokens | `CF_WORKERS_AI_TOKEN` | `.env.local` | Free LLM/STT fallback. **Workaround:** Groq, local models | No |
| Groq API Key | console.groq.com → API Keys | `GROQ_API_KEY` | `.env.local` → GitHub Secrets | Fast LLM/STT (redacted only). **Workaround:** Local llama.cpp, Cerebras | No |
| Cerebras API Key | cloud.cerebras.ai → API Keys | `CEREBRAS_API_KEY` | `.env.local` (optional) | LLM fallback. **Workaround:** Groq, local | No |
| Google AI Studio Key | aistudio.google.com → Get API key | `GOOGLE_AI_STUDIO_API_KEY` | `.env.local` (dev only) | Dev LLM. **Blocked in prod by CI** | No |
| OpenRouter API Key | openrouter.ai → Keys | `OPENROUTER_API_KEY` | `.env.local` (dev only) | Dev LLM. **Blocked in prod by CI** | No |
| GitHub Fine-grained Token | github.com → Settings → Developer settings | `GITHUB_TOKEN` | `.env.local` → GitHub Secrets | Push secrets, manage repo. **Workaround:** Manual | No |
| Expo Access Token | expo.dev → Account Settings → Access Tokens | `EXPO_TOKEN` | `.env.local` (optional) | EAS builds fallback. **Workaround:** `eas build --local` | No |
| Stripe Test Keys | dashboard.stripe.com → Test mode → API keys | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | `.env.local` → GitHub Secrets | Billing. **Workaround:** Mock Stripe server | No |
| Resend API Key | resend.com → API Keys | `RESEND_API_KEY`, `EMAIL_FROM` | `.env.local` (optional) | Email. **Workaround:** Log to console | No |
| PostHog EU Key | eu.posthog.com → Project Settings | `POSTHOG_API_KEY`, `POSTHOG_HOST` | `.env.local` (optional) | Analytics. **Workaround:** No-op | No |
| GlitchTip DSN | Self-hosted (agent) or app.glitchtip.com | `GLITCHTIP_DSN` | `.env.local` (optional) | Error tracking. **Workaround:** Console logs | No |
| LINZ LDS API Key (duplicate?) | data.linz.govt.nz | `LINZ_LDS_API_KEY` | `.env.local` → GitHub Secrets → Server env | LINZ address imports (worker). **Workaround:** tests/fixtures/canterbury-sample.csv | No |
| **LINZ local address export** | data.linz.govt.nz → LDS download (GeoPackage / Shapefile / CSV of *NZ Addresses* and *NZ Roads Addresses*) | — (files, not a key) | `data/linz/` (gitignored) | Address correction accuracy (D8) and the offline FTS slice. **Workaround:** the committed fixture `services/api/tests/fixtures/christchurch_addresses.json` (87 real Christchurch streets/suburbs, placeholder ids). **Needed for:** the ≥95% accuracy claim on real LINZ ids and the weekly rebuild. | No |
| Postgres for the auth service | local Docker (agent generates) or Neon free | `DATABASE_URL` | `.env.local` | `services/auth` user/session storage. **Workaround:** the in-memory adapter in tests (`AUTH_DATABASE_URL=memory://`). | No |
| **Google OAuth client ids** | Google Cloud Console -> APIs & Services -> Credentials -> OAuth client | `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET` | `.env.local` -> GitHub Secrets -> the auth service | **Sign in with Google** (MASTER_EXECUTION §14). The Android client needs the **SHA-1 and SHA-256 of the Play App Signing key**, not the debug key; the iOS client needs the bundle id `com.courier.copilot`. **Workaround:** the service starts without the provider and the app disables the Google button with a plain reason. | No |
| **Apple Sign in with Apple** | developer.apple.com -> Certificates, Identifiers & Profiles -> Services | `AUTH_APPLE_CLIENT_ID`, `AUTH_APPLE_CLIENT_SECRET`, `APPLE_TEAM_ID` | `.env.local` -> GitHub Secrets -> the auth service | **Sign in with Apple** (required on iOS once any social login is offered). The client secret is a JWT signed with the Apple private key (`APPLE_STORE_CONNECT_KEY_P8_BASE64`); it expires, so it has to be regenerated. The team id also goes into the app build. **Workaround:** the service starts without the provider and the app disables the Apple button with a plain reason. | No |
| **Passkey domain** | a domain we control (e.g. `auth.example.co.nz`) with an HTTPS certificate | `AUTH_PASSKEY_RP_ID`, `AUTH_PASSKEY_ORIGIN` | `.env.local` -> GitHub Secrets -> the auth service, and the DNS of the domain | **Passkeys** (WebAuthn). The domain is the relying party id; iOS needs the associated domain (`webcredentials:auth.example.co.nz`) and the `apple-app-site-association` file; Android needs the SHA-256 of the signing certificate (`android:apk-key-hash:`). **Workaround:** the passkey plugin stays off and the app disables the passkey button with a plain reason. | No |
| **App store ids** | Apple Developer + Google Play Console | `APPLE_TEAM_ID`, `APP_STORE_CONNECT_KEY_ID/ISSUER_ID/KEY_P8_BASE64`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64` | `.env.local` -> GitHub Secrets | The store builds and the in-app updates. **Workaround:** the local builds run without them. | No |

---

## Design Studio — the founder picks the look (approval gate, MASTER_EXECUTION §13.6)

**Nothing is blocked by this, and nothing is asked of you yet.**

**The state of the gate:** the three directions of October 2026 — Roadbook, Beacon and Freight —
were **rejected** by the founder on 2026-10-22 as dated and plain. They are history: please do
not pick one of them. The Design Studio is being rebuilt with ten specialist teams and **ten new
directions**, and the pick opens when the pack is published.

| What | Where |
|---|---|
| The org: the ten teams, their remits, their deliverables, the working agreement | `docs/design/ORG.md` |
| The spec every direction must satisfy, so the ten are comparable | `docs/design/SPEC.md` |
| The QA: the checklists, the weights, the signature-moment rule | `docs/design/REVIEW.md` |
| The plan: the five pairs, the rhythm of the round, what happens after the pick | `docs/design/PLAN.md` |

**What you will be asked, and when:** one pick, from ten directions, with a page, a video and a
score for each. The pick is the only thing in the design studio that waits for you. When it
opens, the entry will be here, dated, with the ten names.

---

## Before Launch (Paid / Accounts) — Only Needed at Handover

| Item | Provider / URL | Env Var | Cost | Notes |
|------|----------------|---------|------|-------|
| Apple Developer Account | developer.apple.com | `APPLE_TEAM_ID`, `APP_STORE_CONNECT_KEY_ID/ISSUER_ID/KEY_P8_BASE64` | $99/yr | Required for TestFlight / App Store |
| Google Play Console | play.google.com/console | `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64` | $25 once | Required for Play Store |
| Fastlane Match Password | Generated by agent | `FASTLANE_MATCH_PASSWORD` | Free | iOS certs in GitHub Environment `release` |
| RevenueCat API Keys | app.revenuecat.com | `REVENUECAT_API_KEY_IOS/ANDROID`, `REVENUECAT_WEBHOOK_SECRET` | Free tier | In-app subscriptions |
| Deepgram API Key | console.deepgram.com | `DEEPGRAM_API_KEY` | Paid | STT paid (en-NZ **[UNVERIFIED]**) |
| Cartesia API Key | play.cartesia.ai | `CARTESIA_API_KEY` | Paid | TTS paid (Arabic support) |
| Gemini API Key (Paid) | Google AI Studio/Cloud with billing | `GEMINI_API_KEY` | Paid | Gemini Live GA paid tier fallback |
| Anthropic API Key | console.anthropic.com | `ANTHROPIC_API_KEY` | Paid | Claude Haiku for production LLM |
| OpenAI API Key | platform.openai.com | `OPENAI_API_KEY` | Paid | Realtime / LLM fallback |
| SMS Provider (NZ) | **[OPEN]** | `SMS_PROVIDER`, `SMS_API_KEY/SECRET`, `SMS_FROM_NUMBER` | Paid | Optional, Team plan only |
| Stripe Live Keys | Stripe → Live mode | `STRIPE_LIVE_SECRET_KEY`, `STRIPE_LIVE_WEBHOOK_SECRET` | Fees | After NZ business verification |
| Domain Name | Any registrar | N/A | ~$15/yr | For web app, email, OTA |

---

## The release secrets (the store check reads them by name)

The `Store readiness` workflow (`.github/workflows/store-ready.yml`) reads these
from the GitHub Secrets. The names are here; the values never go into the
repository, the log or an artefact. **A missing secret never fails the
pipeline**: the lane is skipped with a clear message and the Google Play check
still runs.

| Secret (GitHub Secrets)                   | What it is for                                                                     | Which lane needs it                              | Without it                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| `ANDROID_KEYSTORE_BASE64`                 | the upload key of the release (base64 of the keystore)                             | the signed release build and the APK measurement | the release build makes the unsigned debug APK and the workflow says so |
| `ANDROID_KEYSTORE_PASSWORD`               | the password of that keystore                                                      | the signed release build                         | the same                                                                |
| `ANDROID_KEY_ALIAS`                       | the key alias in that keystore                                                     | the signed release build                         | the same                                                                |
| `ANDROID_KEY_PASSWORD`                    | the password of that key                                                           | the signed release build                         | the same                                                                |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64` | the Play Console service account (for the upload, the tracks and the live listing) | the submission itself                            | the release is prepared but not uploaded                                |
| `APP_STORE_CONNECT_KEY_ID`                | the App Store Connect key (the Apple lane of StoreReady)                           | the App Store Connect metadata check             | that lane is skipped with a clear message                               |
| `APP_STORE_CONNECT_ISSUER_ID`             | the issuer of that key                                                             | the same                                         | the same                                                                |
| `APP_STORE_CONNECT_KEY_P8_BASE64`         | the private key of that key (base64)                                               | the same                                         | the same                                                                |
| `APP_STORE_CONNECT_APP_ID`                | the App Store Connect app id (**a repository variable, not a secret**)             | the same                                         | the same                                                                |

### The other things the founder has to supply for the first submission

| Item                                                          | Where it goes                                                           | Notes                                                                                                       |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| The Play account (a Google account with the Play Console)     | play.google.com/console                                                 | $25 once. The app has to be created with the package `com.courier.copilot` and the name "Courier Copilot"   |
| The domain for the privacy policy                             | the privacy policy URL in the listing, the data safety form and the app | The policy is drafted in `docs/operations/PRIVACY-POLICY.md`                                                |
| The background location video                                 | the Play permissions declaration                                        | The answers are drafted in `docs/operations/PLAY-PERMISSIONS-DECLARATION.md`; the video is the founder item |
| The store assets (the feature graphic, the phone screenshots) | the Play listing                                                        | The listing draft is `docs/operations/STORE-LISTING.md`                                                     |
| The legal review of the privacy policy and the terms          | `docs/operations/PRIVACY-POLICY.md`                                     | A lawyer, not us. Until then the drafts say so                                                              |
| The account deletion web link                                 | the Play data safety form and the app                                   | The in-app deletion is ours to build                                                                        |

---

## Decisions Needed from Founder (Non-blocking, async)

| Decision | Status | Options | Impact |
|----------|--------|---------|--------|
| SMS Provider Selection | **[OPEN]** | Twilio NZ, ClickSend, MessageBird, local NZ carrier | Team plan feature only |
| Masked Calls Provider | **[OPEN]** | Twilio Voice, Plivo, Vonage, **[OPEN]** per ADR | Driver privacy feature |
| Carrier rate card (per stop, per parcel) | **[OPEN]** | the rates a carrier really pays, GST-inclusive NZD | `RATE_CARD` in `apps/api/app/earnings.py` — the placeholder is $1.50 a stop and $0.20 a parcel | The money the courier sees in the app and the GST split on the end-of-day summary |
| Pricing Tiers (Solo/Team) | Pending cost verification | TBD after real cost data | Business model |
| Visual Identity Review | **[OPEN]** - see the section above | A (Roadbook), B (Beacon), C (Freight) - the three built directions | D7 compliance and the look of every screen of §13.5 |
| Legal Review (PIA, Privacy Act) | Async | NZ privacy lawyer | Pre-launch requirement |
| Translation Reviewers | Async | Community / paid reviewers | Remove `needs_review` tags |
| **Offline map pack delivery** | **[OPEN]** | install-time asset delivery (Play Asset Delivery), a first run download on Wi-Fi, or both | D15: the map has to work from the first launch with no internet. The pack is about 50 MB and does not fit the 80 MB APK budget, so it cannot simply sit inside the APK. **Workaround:** the app reads the pack from its document directory and falls back to the online source. |
| **ODbL status of the pack on a courier's phone** | **[OPEN]** | NZ counsel | Whether an on-device cached OSM tile set is a "Produced Work" that has to be ODbL-licensed itself. The app shows the attribution in every case, which is what the Protomaps wording requires. |
| **Geofabrik download terms** | **[OPEN]** | read the terms page and confirm | The build machine could not reach download.geofabrik.de on 2026-10-21 (the host timed out), so the ODbL of the data is verified but the host's own terms are not. `scripts/data/build-pmtiles.mjs` says so on every run. |

---

**Last Updated:** 2026-10-22 (design studio: the founder picks the look - A, B or C; and the security squad: the complete sign-in - the Google and Apple ids, the Apple team id, the passkey domain and the app store ids)
**Next Action:** Founder picks the direction (A, B or C) and pastes the free keys into `.env.local`, then runs `scripts/ci/check-secrets.js`
## Post-launch tools (D22)
- [ ] Chatwoot (support chat) · [ ] WeKnora (help-centre AI) · [ ] Cal.com (demos) · [ ] Cap (videos) · [ ] OpenSEO (website SEO)
- [ ] Confirm OmniVoice model-weights license allows commercial use (Hugging Face k2-fsa/OmniVoice).
