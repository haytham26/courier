# Founder TODO - Courier Copilot

> Items only the founder can provide. **Never blocks execution** — logged here, workaround used, work continues.

---

## Now (Free) — Paste into `.env.local` then run `scripts/ci/check-secrets.js`

| Item | Provider / URL | Env Var | Where It Goes | Affected Feature & Current Workaround | Blocks? |
|------|----------------|---------|---------------|----------------------------------------|---------|
| **The `protect-main` ruleset** (founder directive 2026-10-28) | github.com → haytham26/courier → Settings → Rules → Rulesets | — (the ruleset itself, not a value) | the repository's branch protection | **Direct pushes to `main` are still possible**, and the last session pushed to main directly three times (`045185b`, `dbc7004`, and the handover's own commit). The ruleset JSON was written and posted exactly as directed on 2026-10-28; GitHub answered `403 Resource not accessible by personal access token`, so the token in `.env.local` does not carry **Administration: write**. **Workaround:** none available to the agent — every commit of this session goes through a branch and a PR, and the discipline is recorded in `docs/log/CURRENT-backend.md`. **Fix either by** creating the ruleset in Settings → Rules → Rulesets (branch target `~DEFAULT_BRANCH`, rules: deletion, non-fast-forward, pull request, 0 required approvals, no bypass actors) **or** by giving the token Administration: write. | No — the ritual is enforced by habit until it is not |
| **GitHub's default-setup CodeQL check (a second, app-run configuration)** (backend squad, 2026-11-01) | github.com → haytham26/courier → Settings → Code security → Code scanning | — (the configuration and the token scope, not a value) | the repository's code-scanning configuration | The repository carries **two** code-scanning configurations: the repo's own `.github/workflows/codeql.yml` (which CONSTRAINTS.md names as the code-scanning gate, and whose `CodeQL (javascript-typescript)` and `CodeQL (python)` legs are green), and GitHub's **default setup** run by the `github-advanced-security` app, which reports a plain `CodeQL` check on pull requests. On `main`'s head the default setup produces no check at all (it runs on pull requests), so the leg is invisible on main and appears the moment a PR touches the code. It reports two `js/insufficient-password-hash` alerts on PR #164's head `09c2ade`: `services/auth/src/http.ts:62` and `services/auth/src/__tests__/setup.ts:34`. Both are **documented false positives** — the Have I Been Pwned range API is *specified* in SHA-1 and only the first five hex characters (20 bits) leave the process, so the digest is a bucket selector, not password storage; there is no SHA-256 variant of the range endpoint. Three attempts did not silence the default-setup leg: the `// lgtm [query-id]` comment, the `// codeql[query-id]` comment, and the same two spellings placed *on* the digest line the annotation names. The token in `.env.local` answers **403 Resource not accessible by personal access token** on `/code-scanning/alerts` and `/code-scanning/default-setup`, so the alerts can be neither read nor dismissed from here (the `security_events` scope is missing). **Workaround:** the merge is not blocked — the `protect-main` ruleset requires no status checks, and the repo's own CodeQL legs are green. **Fix either by** dismissing the two alerts as false positives in the security view (or after the merge, on `main`), **or** by giving the token the `security_events` scope so the dismissal can be scripted. | No — recorded in `docs/log/CURRENT-backend.md` |
| **One backend session at a time** | the agent harness (the session list) | — | — | On 2026-10-28 a second backend session was still running in the main working tree while this one started: it switched branches underneath, so this session's first commit landed on its branch and its next checkout rewrote the files this session had just edited. Nothing was lost (the commit was pushed within minutes), but two backend sessions editing the same tree and the same `CURRENT-backend.md` will eventually produce a lost change or a duplicated slice. **Workaround:** this session works in the worktree `.worktrees/b1028`, commits immediately after each edit batch and pushes before the next one, and does not redo what the other session already has in flight. | No |
| ~~LINZ LDS API Key~~ **(DONE 2026-10-30)** | data.linz.govt.nz → Profile → API keys | `LINZ_LDS_API_KEY` | `.env.local` → GitHub Secrets → Server env | LINZ address imports. The key was already in `.env.local`; the 2026-10-30 session used it to fetch the register itself — 656,392 real addresses across Christchurch, Waimakariri and Selwyn — to build the index, to run the accuracy measure and to fetch the weekly changeset. It is also set as a GitHub Secret, so `.github/workflows/linz-changeset.yml` runs (it skips with a notice, it does not go red, if the secret is ever removed). The FOUNDER_TODO row that said the local `data/linz` export was "Needed for" the accuracy claim was the pipeline's own path defect, not a missing file: it is fixed with `services/api/tests/test_linz_pipeline_paths.py`. | No |
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
| Postgres for the auth service | local Docker (agent generates) or Neon free | `DATABASE_URL` | `.env.local` | `services/auth` user/session storage. **Workaround:** the in-memory adapter in tests (`AUTH_DATABASE_URL=memory://`). | No |
| **Google OAuth client ids** | Google Cloud Console -> APIs & Services -> Credentials -> OAuth client | `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET` | `.env.local` -> GitHub Secrets -> the auth service | **Sign in with Google** (MASTER_EXECUTION §14). The Android client needs the **SHA-1 and SHA-256 of the Play App Signing key**, not the debug key; the iOS client needs the bundle id `com.courier.copilot`. **Workaround:** the service starts without the provider and the app disables the Google button with a plain reason. | No |
| **Apple Sign in with Apple** | developer.apple.com -> Certificates, Identifiers & Profiles -> Services | `AUTH_APPLE_CLIENT_ID`, `AUTH_APPLE_CLIENT_SECRET`, `APPLE_TEAM_ID` | `.env.local` -> GitHub Secrets -> the auth service | **Sign in with Apple** (required on iOS once any social login is offered). The client secret is a JWT signed with the Apple private key (`APPLE_STORE_CONNECT_KEY_P8_BASE64`); it expires, so it has to be regenerated. The team id also goes into the app build. **Workaround:** the service starts without the provider and the app disables the Apple button with a plain reason. | No |
| **Passkey domain** | a domain we control (e.g. `auth.example.co.nz`) with an HTTPS certificate | `AUTH_PASSKEY_RP_ID`, `AUTH_PASSKEY_ORIGIN` | `.env.local` -> GitHub Secrets -> the auth service, and the DNS of the domain | **Passkeys** (WebAuthn). The domain is the relying party id; iOS needs the associated domain (`webcredentials:auth.example.co.nz`) and the `apple-app-site-association` file; Android needs the SHA-256 of the signing certificate (`android:apk-key-hash:`). **Workaround:** the passkey plugin stays off and the app disables the passkey button with a plain reason. | No |
| **App store ids** | Apple Developer + Google Play Console | `APPLE_TEAM_ID`, `APP_STORE_CONNECT_KEY_ID/ISSUER_ID/KEY_P8_BASE64`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64` | `.env.local` -> GitHub Secrets | The store builds and the in-app updates. **Workaround:** the local builds run without them. | No |
| **Apple Developer account (an iOS build lane)** | developer.apple.com | `APPLE_TEAM_ID` | `.env.local` -> GitHub Secrets | **The iOS build pipeline itself.** There is no macOS runner in CI today, so iOS can be neither built nor recorded: the lock screen's Live Activity (screen 13) and the iOS half of every per-screen recording can only be marked PARTIAL, never DONE. **Workaround:** the Android lane runs on the CI emulator; the iOS code is built and unit-tested locally. The proof needs a macOS runner (or a self-hosted Mac) plus a paid Apple Developer account. | Yes, for the iOS proofs |
| **The first acceptance pass on a phone** (the audit's A6, its done-when) | your own Android phone | — | — | Run `docs/operations/ACCEPTANCE_TEST.md` (30 minutes: sign in, load the run, scan, voice, drive, deliver, the offline stretch, sync, end of day, lock screen) and record the result in this row. **The APK:** the stable link `https://github.com/haytham26/courier/releases/download/latest/courier.apk` is republished on every merge to main by the Main APK workflow (unsigned until the keystore secrets exist — it installs on a phone you control, which is what the run is). If the link 404s, the job skipped: set the repository variable `EXPO_PUBLIC_AUTH_URL` to the auth server the app should dial (Settings -> Secrets and variables -> Actions -> Variables) and re-run the workflow. **Workaround:** none — the run is the proof. Anything that fails becomes a BUGS row with the step it failed on. | Yes, for A6's done-when |

---

## Design Studio — Maps First was CHOSEN on 2026-10-22 (D27); no pick remains

**This section is closed, and kept only so the history is readable.** The three directions of
October 2026 - Roadbook, Beacon and Freight - were **rejected** by the founder on 2026-10-22 as dated
and plain, and the founder then chose **Maps First** from a second round of ten directions: the map
is the app, everything else floats above it on glass, colour only ever carries meaning. The build
is running now under `docs/design/chosen/` and ADR-008 (the one token file
`packages/design-tokens/src/chosen.ts`, the D33 contrast gate, the motion tokens), screen by screen,
per PR. The reference screens are the HTML and the PNG contact sheets in `docs/design/chosen/`.

**No approval is asked of you here.** §7.3's approval gates are the only things that pause for you
(production deploy, live payments, Play Store submission, deleting production data, a new paid
service), and they are listed in their own rows above.

---

## Before Launch (Paid / Accounts) — Only Needed at Handover

| Item | Provider / URL | Env Var | Cost | Notes |
|------|----------------|---------|------|-------|
| Apple Developer Account | developer.apple.com | `APPLE_TEAM_ID`, `APP_STORE_CONNECT_KEY_ID/ISSUER_ID/KEY_P8_BASE64` | $99/yr | Required for TestFlight / App Store |
| Google Play Console | play.google.com/console | `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64` | $25 once | Required for Play Store |
| Fastlane Match Password | Generated by agent | `FASTLANE_MATCH_PASSWORD` | Free | iOS certs in GitHub Environment `release` |
| RevenueCat API Keys | app.revenuecat.com | `REVENUECAT_API_KEY_IOS/ANDROID`, `REVENUECAT_WEBHOOK_SECRET` | Free tier | In-app subscriptions |
| OmniRoute (production instance) | Self-hosted on the Oracle server (D25) | `OMNIROUTE_BASE_URL`, `OMNIROUTE_API_KEY`, `OMNIROUTE_MODEL` | Free gateway; provider keys stay inside OmniRoute | Courier Voice's server brain. Speech runs on device (Sherpa-ONNX). Production routes only through providers that allow commercial use and do not train on our data; personal subscriptions are dev-only (D25). Deepgram, Cartesia, Gemini paid, Anthropic and OpenAI direct keys are **not needed**: any of them is added only as a provider inside OmniRoute, if a benchmark shows a gap. |
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
| **OmniRoute production gateway + real keys** | **[OPEN]** (backend squad, 2026-10-24) | self-host OmniRoute on Oracle Sydney per D25 (pinned version, admin UI not public, secrets in the server secret manager), then set `OMNIROUTE_BASE_URL` + `OMNIROUTE_API_KEY` and the allowed-provider list for the voice service | The Courier Voice server brain is fully built and tested against a fake gateway (166 tests green, `services/courier-voice`); without the real gateway it stays on the on-device engine — everything still works, nothing server-brained. The allow-list decision (providers whose terms allow commercial use and no training on driver/customer text) is the D25 policy and needs the founder's provider pick. |

---

**Last Updated:** 2026-10-28 (backend squad): two rows added - (1) the `protect-main` ruleset row, because the founder directive to make GitHub refuse a direct push to `main` was run exactly as given and the token was refused with 403 (no Administration: write), and (2) the one-backend-session row, because a second backend session was found working in the main working tree while this one started. 2026-10-24 (the Design Studio section is closed - Maps First was chosen on 2026-10-22 under D27 and is being built, so it no longer asks for a pick; the Apple Developer account row now names the iOS build lane it blocks, which is what keeps screen 13's Live Activity and the iOS half of every recording at PARTIAL). 2026-10-24 (backend squad): the OmniRoute row added - the voice server brain is built and fake-gateway-tested, the real gateway + keys + provider allow-list are the founder item (D25).
**Next Action:** Paste the free keys into `.env.local`, then run `scripts/ci/check-secrets.js`. The design direction is decided (D27, Maps First) and needs nothing further.

---

## Post-launch tools (D22)
- [ ] Chatwoot (support chat) · [ ] WeKnora (help-centre AI) · [ ] Cal.com (demos) · [ ] Cap (videos) · [ ] OpenSEO (website SEO)
- [ ] Confirm OmniVoice model-weights license allows commercial use (Hugging Face k2-fsa/OmniVoice).
| **The release APK's API base URL** (A5's third done-when: "the founder's APK points to staging") | the staging domain, once the OCI host exists | `EXPO_PUBLIC_API_URL` | `.env.local` -> the release build's env (the lead owns the APK lane) | The app's client reads its base URL from `EXPO_PUBLIC_API_URL` (`apps/mobile/src/lib/api-client.ts`), so a release build pointed at `http://localhost:8000` talks to nothing on a real phone. **Workaround:** the E2E builds run against local mocks, and the deploy verify leg proves the stack itself is up and healthy. **Blocked by:** the OCI host and domain (the row above), because there is no staging name to point at yet. | No — the stack is proven; the phone's pointer waits on the host |
| **The release APK’s auth URL** (BUG-072’s release half) | the auth service’s public URL, once the OCI host exists | `vars.EXPO_PUBLIC_AUTH_URL` (GitHub repository variable: Settings > Secrets and variables > Actions > Variables) | The client reads its auth base URL from `EXPO_PUBLIC_AUTH_URL` (`apps/mobile/src/lib/auth-client.ts`), so a release build that sets nothing froze a `localhost` literal into the bundle and could not sign anyone in on a real phone. The job now **fails with `::error::` before it builds** when the variable is absent (PR #130). **Blocked by:** the OCI host and domain (the row above), because there is no auth URL to point at yet. | No - the guard stops the release |
