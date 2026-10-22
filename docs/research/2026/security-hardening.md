# Security hardening — mobile + API — 2026 OSS + standards research (V4 §3, full depth)

**Research date: 2026-10-21.** Method: V4 §12 (≥30 candidates with full evidence cards, ≥10 shortlisted, top 5
deep-reviewed, benchmarks only where an eval set exists) + §12.6 anti-bias (newer/smaller challengers).
Every number was read from the live GitHub API, the npm registry, the PyPI-equivalent registries, OWASP's own
site or the vendor's own documentation on **2026-10-21** unless the card says **UNVERIFIED**. Nothing is
estimated, nothing is carried over unread.

**Card fields:** repo/standard URL · stars + maintenance proxy · created · last release + date · release cadence ·
commits/90 d + human maintainers/90 d · open issues · licence · **Expo SDK 58 / RN 0.88 New Architecture / Android
API level** compatibility · on-device vs server · advisories + supply-chain posture · what it does better than our
current choice · risks · **DECISION**.

**Card fields for standard/vendor cards:** issuing body · document + version · publication date · status (living
document / released / draft) · what it mandates · adoption cost · **DECISION**.

---

## 0. Scope, our current choice, the bar

| Item | Verified 2026-10-21 |
|---|---|
| Mobile hardening today | **almost nothing.** `apps/mobile/app.json` has **no** `android.allowBackup`, **no** `android.dataExtractionRules`, **no** `expo-build-properties` plugin (so no R8/ProGuard, no `networkSecurityConfig`, no `usesCleartextTraffic` policy), **no** `expo-updates` dependency, **no** `expo-crypto`, **no** `expo-local-authentication`, **no** `expo-app-integrity`. The only hardening-relevant dependency installed is **`expo-secure-store` 58.0.2** (`apps/mobile/package.json:25`). `react-native-webview` is **not** installed, so there is no WebView surface yet. |
| Local database | **two** SQLite stacks are installed: `expo-sqlite ~58.0.13` and **`@op-engineering/op-sqlite` 18.2.5** (`apps/mobile/package.json:26`, `:10`). op-sqlite's README lists "**SQLCipher is supported as a compilation target**" — but whether the published npm artifact ships a SQLCipher build is **UNVERIFIED** (see §4). |
| API hardening today | `services/api/pyproject.toml` has **no rate-limiting library, no CORS middleware, no security-header middleware, no SSRF guard, no secrets manager, no SBOM tooling**. `services/api/app/main.py` builds a bare `FastAPI()` (line 18) and includes only `auth_router` (line 21). |
| The one real hole we found | `services/api/app/main.py:76-85` — the voice WebSocket `@app.websocket("/shifts/{shift_id}/voice")` takes **no `Depends(get_current_principal)`** and calls `await ws.accept()` immediately. It is an **unauthenticated** WebSocket that will accept a transcript and answer with `{"type":"say"}`. MASVS-AUTH-1 / ASVS V2. **High.** |
| Second hole | `services/api/app/auth/jwks.py:29` — `auth_jwt_issuer: str = ""`, and line 125 passes `issuer=self._settings.auth_jwt_issuer or None`. With the default, **the issuer claim is not verified at all**. The audience *is* enforced (`auth_jwt_audience: str = "courier-api"`, line 30). |
| Auth service | `services/auth/src/options.ts` — Better Auth with the `organization`, `expo` and `jwt` plugins; `rateLimit` is configured (lines 31-36) with `customRules`; `trustedOrigins` is set; **the `jwt` plugin signs with `keyPairConfig: { alg: config.jwks.alg }` — our JWKS is ES256** (D21). |
| CI gates we already run | `CONSTRAINTS.md`: `gitleaks detect --redact`; `node scripts/ci/check-audit.mjs` (zero high/critical JS advisories, two documented build-time exceptions); `uvx pip-audit` (zero high/critical Python advisories); `semgrep scan --config p/default --config p/owasp-top-ten`; CodeQL (zero high alerts); `scripts/ci/check-licenses.mjs`; `scripts/ci/check-floor.mjs`. **No** osv-scanner, **no** SBOM, **no** image scanning, **no** DAST, **no** mobile binary analysis, **no** artefact signing. |
| Supply-chain posture | `.npmrc`: `ignore-scripts=true`, `minimum-release-age=10080` (7 days), `trust-policy=no-downgrade`. `pnpm-workspace.yaml`: `ignoreScripts: true`, `overrides.tinypool: 2.2.0`. pnpm is **v12.14.0** (release 2026-10-15) and per pnpm's own docs v11+ ships `minimumReleaseAge` default 1440 and `blockExoticSubdeps` default true. |
| The bar (`CONSTRAINTS.md`, `docs/plan/SAAS_CHECKLIST.md` §A) | **zero high/critical findings**; **no secrets in git**; **no PII off the device** without consent; **OWASP ASVS L2** for the API; **OWASP MASVS L2** for auth/storage; **SQLCipher DB, keys in the Android Keystore (expo-secure-store), certificate pinning for our API, root/emulator/hook detection (signal only, never blocking the CI emulator), screenshot protection on sensitive screens, no secrets in the APK, obfuscation (R8), tamper detection via Play Integrity**; a **threat model per module (STRIDE)**, security tests in CI (SAST, DAST against staging with OWASP ZAP, secret scanning, dependency audit), a pen-test checklist before v1, and a bug-bounty-ready `security.txt`. |
| Locked decisions | Expo SDK 58 · RN 0.88 · New Architecture only · offline-first · no PII leaving the device without consent · no `AI` in the product copy · APK ≤ 80 MB · cold start ≤ 2 s · battery ≤ 8 %/h |

### Three things must not be conflated

1. **Mobile hardening** — what an attacker can do with the APK on a courier's phone: read the local DB, hijack a
   deep link, hook the process, repackage the binary, read the clipboard, capture the screen.
2. **API hardening** — what an attacker can do with the FastAPI service: forge a token, brute-force a login,
   make the API fetch a URL we should not fetch, inject SQL through PostGIS geometry, or read another team's
   data.
3. **Supply-chain hardening** — what an attacker can do *before we ship*: compromise a maintainer account, publish
   a poisoned `postinstall`/`preinstall` hook, forge a provenance attestation, poison a CI runner.

They share one blast radius (a courier's address book and a team's route data) but they have different tools,
different owners and different evidence. A green SAST run says nothing about a poisoned dependency.

### 6-month star trend — method note (proxy, as V4 §12.3 permits)

The star *timeline* is not readable with the token in `.env.local` (the reference run in
`docs/research/2026/routing-vrp-engines.md` re-verified this on 2026-10-21: `GET /repos/{o}/{r}/stargazers`
returns HTTP 403 with a personal access token). **Every "stars gained in 6 months" figure is therefore
UNVERIFIED.** The proxy used throughout: **releases in the last 6 months · commits in the last 90 days · distinct
human maintainers in 90 days** (bot/dependabot names excluded) · plus registry release dates.

---

## Queries run

GitHub search + API reads through `scripts\gh.ps1` (the token is read at runtime and never printed). All
queries run **2026-10-21**. Filters are the literal query strings.

| # | Query (literal) | Results | What it produced |
|---|---|---|---|
| 1 | `react native security` (free text) | 5 | **dead query** — GitHub searches the description, not the code; returned LLM-security repos. Replaced by #2. |
| 2 | `react-native security in:name` | 8 | `bamlab/react-native-app-security` 225★, `mohamadnavabi/react-native-security-suite` 3★ (2026 newcomer) — the whole OSS RN-security market is 225★. |
| 3 | `certificate-pinning in:name` | 8 | `diefferson/http_certificate_pinning` 104★ (Apache-2.0); the rest are PoCs and bypass tools. **No mainstream RN pinning library is discoverable this way.** |
| 4 | `root-detection in:name` | 8 | Only bypass tooling (`FridaAntiRootDetection` 238★, `root-detection-bypass` 34★) and `cordova-plugin-root-detection` 23★ (2018). **No RN root-detection library of any size.** |
| 5 | `jailbreak in:name` | 8 | **totally dead query** — "jailbreak" now means LLM prompt injection (3 853★ `jailbreak_llms`). The mobile meaning is dead as a search term. |
| 6 | `mobile-security in:name` | 8 | `MobSF/Mobile-Security-Framework-MobSF` **21 996★**, `m0bilesecurity/RMS-Runtime-Mobile-Security` 3 126★, `rviannaoliveira/mobile-developer-security-roadmap` 155★. |
| 7 | `encrypted-storage in:name` | 8 | `emeraldsanto/react-native-encrypted-storage` 572★ but **last push 2023-08-21 and ARCHIVED**. |
| 8 | `fastapi rate limit in:name,description` | 8 | `laurentS/slowapi` 2 070★ (MIT), `long2ice/fastapi-limiter` 790★ (Apache-2.0, **last push 2026-02-06**), `Tert0/fastapi-framework` 63★. |
| 9 | `ssrf python in:name,description` | 8 | **dead** — `pwn0sec/PwnSSRF` 69★ (2021), `IncludeSecurity/safeurl-python` 11★ (2024, archived). **No maintained Python SSRF-guard library.** |
| 10 | `react-native biometrics in:name` | 5 | `SelfLender/react-native-biometrics` 696★ (**last push 2024-04-01**), `smallcase/react-native-simple-biometrics` 231★ (2026-09-25), `sbaiahmed1/react-native-biometrics` 125★ (2026-10-18). |
| 11 | `ssl-pinning react-native in:name,description` | 8 | `MaxToyberman/react-native-ssl-pinning` 410★ (**last release v1.6.0, 2025-07-21**), `huytdps13400/react-native-ssl-manager` 36★ (2026-09-22). |
| 12 | `play integrity android in:name,description` | 8 | **no official Google repo** — only bypass tools (`FBIVIP/Play-IntegrityFix` 242★, `JyMatrix/PlayIntegrityFix` 73★). Confirms Play Integrity is a **server-side** control, not a client library. |
| 13 | `device attestation android in:name,description` | 8 | `GrapheneOS/Auditor` 723★ (MIT, 2026-10-19) — the reference for OS-integrity signals; `reveny/Android-Device-Trust` 50★ (Apache-2.0). |
| 14 | `frida detection android in:name,description` | 8 | `suifei/fridare` 953★ (MIT, 2026-09-11), `talsec/Free-RASP-Community` 519★ (MIT, 2026-08-26), `muellerberndt/frida-detection` 497★ (**archived 2022**). |
| 15 | `owasp mobile in:name` | 8 | `OWASP/www-project-mobile-top-10` 132★, `OWASP/www-project-mobile-app-security` 22★, `OWASP/Mobile-Threatmodel` 7★ (**archived**). |
| 16 | `appsec react native in:name,description` | 8 | **empty** — the RN app-security tooling market does not exist. |
| 17 | `expo-module-scripts in:name` | 2 | Both forks, both 0★ — the package is not separately published; it lives in `expo/expo`. |
| 18 | `react-native-localize in:name` | 4 | `zoontek/react-native-localize` 2 443★ (MIT, 2026-10-13) — the only serious RN localisation library (used in the accessibility file). |
| 19 | `nitro-modules in:name` | 5 | `frankcalise/awesome-nitro-modules` 186★, `margelo/react-native-nitro-modules` **1★** (created **2026-10-15**) — the Nitro core is brand new and unstarred; the ecosystem is not yet a risk surface we can audit. |

Plus API reads: `repos/{o}/{r}` · `/releases` · `/releases?per_page=N` · `/commits?since=<90 d>` ·
`/search/issues?q=repo:…+is:issue|is:pr+created:<range>` · `/search/code` · `/readme` · `/contents/{path}` ·
**npm registry `/{package}`** (version, publish time, licence, repository).

**Web sources fetched 2026-10-21:** `owasp.org/projects/mobile-top-10` · `mas.owasp.org/MASVS/` ·
`mas.owasp.org/MASWE/` · `mas.owasp.org/news/2024/01/18/masvs-v210-release--masvs-privacy/` ·
`devguide.owasp.org/en/07-training-education/06-mobile-top-ten/` · `pnpm.io/supply-chain-security` ·
`pnpm.io/blog/releases/11.0` · `pnpm.io/blog/releases/10.16` · `developer.android.com/google/play/integrity/overview`
· `developer.android.com/google/play/integrity/standard` · `developer.android.com/google/play/integrity/verdicts`
· `developer.android.com/google/play/integrity/setup` · `docs.expo.dev/versions/latest/sdk/app-integrity/` ·
`raw.githubusercontent.com/OP-Engineering/op-sqlite/main/README.md` · `privacy.org.nz/privacy-principles/` ·
`privacy.org.nz/responsibilities/poupou-matatapu-doing-privacy-well/assessing-risk/` ·
`justice.govt.nz/justice-sector-policy/key-initiatives/enhancing-the-privacy-act/` ·
`cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem` ·
`sysdig.com/blog/shai-hulud-…` · `unit42.paloaltonetworks.com/npm-supply-chain-attack/` ·
`wiz.io/blog/mini-shai-hulud-strikes-again-tanstack-more-npm-packages-compromised` ·
`tenable.com/blog/mini-shai-hulud-frequently-asked-questions` ·
`socket.dev/blog/mini-shai-hulud-miasma-and-hades-worms-…` · `securityweek.com/over-320-npm-packages-hit-by-fresh-mini-shai-hulud-supply-chain-attack/`.

---

## 1. Candidate pool — 41 evidence cards (V1–V12 · C1–C12 · M1–M3 · A1–A6 · S1–S8) plus 14 grouped rejections

### 1.1 Standards, frameworks and vendor controls (V1–V12)

**V1 — OWASP Mobile Top 10 (2024)** — https://owasp.org/projects/mobile-top-10 · **final release v1.0, 2024-01-21**
(`github.com/OWASP/www-project-mobile-top-10` — 132 ★, no licence file on the API, last push **2025-12-22**, 3 open
issues (5 including pull requests)) · **status: released, then quiet** · the ten: M1 Improper Credential Usage, M2 Inadequate Supply Chain
Security, M3 Insecure Authentication/Authorization, M4 Insufficient Input/Output Validation, M5 Insecure
Communication, M6 Inadequate Privacy Controls, M7 Insufficient Binary Protections, M8 Security Misconfiguration,
M9 Insecure Data Storage, M10 Insufficient Cryptography · **what it mandates:** a narrative risk list, not a
verifiable control set · **cost:** one afternoon to map · **our fit:** M2 is the one we are weakest against (see S2/S3)
· **DECISION: ADOPT (the narrative we publish in `security.txt` and the release notes) — but it is not a gate; MASVS is.**

**V2 — OWASP MASVS v2.1.0** — https://mas.owasp.org/MASVS/ · `github.com/OWASP/masvs` — **2 461 ★** /757 f ·
created **2016-09-08** · last release **v2.1.0, 2024-01-18** · **cadence: slow** (2 commits/90 d, 1 human; repo
pushed 2026-09-21) · 1 open issue, 207 closed · **CC-BY-SA-4.0** · **status: living standard** · eight control
groups: MASVS-STORAGE (2 controls), MASVS-CRYPTO (2), MASVS-AUTH (3), MASVS-NETWORK (2), MASVS-PLATFORM (3),
MASVS-CODE (4), MASVS-RESILIENCE (4), **MASVS-PRIVACY (4, added in v2.1.0)** · also shipped as
**CycloneDX** (`OWASP_MASVS.cdx.json`) so it can be consumed as an SBOM · **our fit: this is the L2 checklist the
SAAS_CHECKLIST already names** · **DECISION: ADOPT (the control set we map every mobile control to).**

**V3 — OWASP MASWE (Mobile Application Security Weakness Enumeration)** — https://mas.owasp.org/MASWE/ · the
weakness catalogue that sits between MASVS and MASTG · **77+ weaknesses enumerated**, each tagged with its MASVS
control, platform and number of tests · the ones that bite us specifically: **MASWE-0006** Sensitive Data Not
Excluded From Backup (MASVS-STORAGE-2), **MASWE-0026** Network Traffic Not Encrypted, **MASWE-0027** Insecure
Certificate Validation, **MASWE-0028** Insecure Identity Pinning, **MASWE-0029** Insecure Deep Links,
**MASWE-0030** Improper Use of the Clipboard, **MASWE-0034/0035** WebViews, **MASWE-0038** Insufficient Protection
of Sensitive Data from Screenshots or Screen Recordings, **MASWE-0039** App Vulnerable to Overlay Attacks,
**MASWE-0044** Dependencies with Known Vulnerabilities, **MASWE-0048** Malicious Code Included in the App,
**MASWE-0051/0053/0054** Root / Emulator / Device-Attestation Detection Not Implemented, **MASWE-0061** Debug
Artifacts Not Removed, **MASWE-0065** Dynamic Analysis Tools Detection Not Implemented · **DECISION: ADOPT (the
per-issue checklist for the mobile hardening task; it is the only list that is granular enough to be a ticket).**

**V4 — OWASP MASTG v2.0.0** — https://mas.owasp.org/MASTG/ · `github.com/OWASP/mastg` — **13 269 ★** /2 831 f ·
created **2016-09-30** · last release **v2.0.0, 2026-06-30** (v1.9.0 and v1.8.0 both 2026-06-24) · **23 commits/90 d,
9 humans** · 196 open / 1 041 closed issues · **CC-BY-SA-4.0** · **status: very active** · the testing guide
(tests, demos, knowledge, best practices) behind MASVS · 2026 PRs that matter to us: **#4010 "Add SSL Pinning Best
Practise Page" (open, 2026-10-13)**, **#4004 "Add Android MASTG Test, Demo, Knowledge and Best Practice for
AndroidX Security" (open, 2026-10-01)**, **#4007 / #4006 "Add behavioral detection tests and static emulator
coverage" (2026-10-03 / 2026-10-02)** — that last pair is exactly our root/emulator signal, **#3985 "Update iOS and
Android platform interaction for App Notifications" (open, 2026-09-23)**, **#4013 "Remove retired checklist
generation code" (open, 2026-10-16)** · **our fit:** the MASTG-TEST ids are the unit of evidence we can cite in
`docs/evidence/` · **DECISION: ADOPT (the test catalogue; MASTG-TEST ids become the acceptance criteria of the
mobile hardening task).**

**V5 — OWASP ASVS 5.0.0** — https://owasp.org/www-project-application-security-verification-standard/ ·
`github.com/OWASP/ASVS` — **3 701 ★** /840 f · created **2014-10-30** · last *version* release **v5.0.0, 2025-05-30**;
the repo also tags a rolling **"latest" (Bleeding Edge), 2026-10-15** · **14 commits/90 d, 3 humans** · 100 open /
1 659 closed issues · **CC-BY-SA-4.0** · **status: v5.0.0 is the current standard; "Bleeding Edge" is not a standard,
do not quote its clause numbers in a gate** · **our fit: SAAS_CHECKLIST §A already says "OWASP ASVS L2"** ·
**DECISION: ADOPT (ASVS **5.0.0** L2 for the API — quote 5.0.0, not Bleeding Edge).**

**V6 — OWASP Cheat Sheet Series** — https://cheatsheetseries.owasp.org/ · `github.com/OWASP/CheatSheetSeries` —
**33 689 ★** /4 689 f · created **2018-12-21** · pushed **2026-10-20** · 15 open issues (27 including pull requests) · **CC-BY-SA-4.0** ·
2 840 MB repo (docs + images) · includes the **Android**, **iOS**, **REST Security**, **Web Security**, **Secrets
Management** and **Third Party JS Management** cheat sheets, and an `IndexMASVS` page that cross-links MASVS to
the cheat sheets · **our fit: the cheapest way to write the implementation rules that MASVS and ASVS only name** ·
**DECISION: ADOPT (the reference for every implementation rule; no code).**

**V7 — Google Play Integrity API** — https://developer.android.com/google/play/integrity/overview · Google, no OSS
repo, no licence · **documentation page last published 2026-04-20** · two request types: **standard** (a few
hundred ms latency, on-demand, **automatic replay-attack mitigation by Google Play**, `requestHash` content
binding) and **classic** (a few seconds, you own the nonce, use for high-value one-off checks) · minimum Android
**SDK 23 (Android 6.0)** for both since library v1.4.0 · verdicts: `appRecognitionVerdict` ∈
`PLAY_RECOGNIZED` / `UNRECOGNIZED_VERSION` / `UNEVALUATED`; device integrity `MEETS_DEVICE_INTEGRITY` or a
**blank value** when the device "has signs of attack (such as API hooking) or system compromise (such as being
rooted), or the app is not running on a physical device" · **our fit: MASWE-0054 device attestation + MASWE-0056
app attestation, and the CI-emulator problem is answered by the blank-verdict semantics** · **cost: a Google Cloud
project number, a Play Console setup, and a server-side call to Google Play** · **DECISION: ADOPT (server-side
verdict, never a client-side block).**

**V8 — Expo `@expo/app-integrity` 58.0.2** — https://docs.expo.dev/versions/latest/sdk/app-integrity/ ·
`github.com/expo/expo` → `packages/expo-app-integrity` (confirmed present in the monorepo listing 2026-10-21) ·
**npm `@expo/app-integrity` 58.0.2 published 2026-10-01** · MIT · **uses Play Integrity's *standard* request flow on
Android and Apple's App Attest on iOS** · API: `prepareIntegrityTokenProviderAsync(cloudProjectNumber)` then
`requestIntegrityCheckAsync(requestHash)`; the token goes to **our** backend for verification ·
`ERR_APP_INTEGRITY_PROVIDER_INVALID` when the provider expires · Expo PR **#50534 "[docs][app-integrity] Remove
alpha label" (closed, 2026-09-23)** — the module left alpha · **our fit: it is the only attestation path that does
not add a second native dependency to a New-Architecture Expo app** · **DECISION: ADOPT (the only client half of
V7/V8; the verdict is decided server-side).**

**V9 — Google Play Data Safety form** — https://play.google.com/console/about/data-safety (first-party, no OSS) ·
**status: a declaration, not a control** · requires per-data-type collection, sharing, encryption-in-transit,
deletion-request and purpose declarations · **our fit: it is the *published* surface that the OPC's IPP3/IPP3A and
our own privacy policy must match** · **our current state: we have **not** written it — `docs/status/PARITY.md` row 49 is
the only compliance row and it is `Planned (task)` → T7.15** · **DECISION: ADOPT (a release gate: the form must
match the Play/Apple labels and the privacy policy, and we must prove the match with a test).**

**V10 — Apple App Store privacy nutrition labels** — https://developer.apple.com/app-store/app-privacy-details/ ·
**status: a declaration** · per-app "data collected" and "data used to track" lists, plus the linked privacy
policy · **our fit: same as V9; the two stores must tell the same story** · **DECISION: ADOPT (one data map, two
declarations, one test).**

**V11 — NZ Privacy Act 2020 + the Office of the Privacy Commissioner** — https://privacy.org.nz/privacy-principles/ ·
**13 information privacy principles (IPPs)**; the **Privacy Amendment Act 2025** inserted **IPP 3A** (indirect
collection) and brought it into force **1 May 2026** (technical amendments 24 September 2025) · OPC's PIA toolkit
is **guidance, not a statutory requirement**, but the OPC **expects a PIA before using AI tools** and states that
personal information includes "technical metadata like map coordinates, Internet protocol addresses, or device
identifiers" · our exposure: a courier's GPS trace is personal information under IPP 1, 5, 9, 12 and 13 ·
**DECISION: ADOPT (the privacy gate; the PIA is T7.15 and must cover IPP 3A because we collect recipient data
indirectly from a client manifest).**

**V12 — CycloneDX SBOM** — https://cyclonedx.org/ · `github.com/CycloneDX/cyclonedx-cli` — **551 ★** /85 f ·
created **2020-10-22** · last release **v0.33.1, 2026-07-23** · **12 commits/90 d, 2 humans** · 111 open / 94 closed
issues · **Apache-2.0** · MASVS v2.1.0 itself is published in CycloneDX, so the standard and the SBOM format meet ·
**DECISION: ADOPT (the SBOM format; the generator is S3).**

### 1.2 Mobile code (C1–C12)

**C1 — `expo/expo` → `packages/expo-secure-store`** — https://github.com/expo/expo — **52 874 ★** /14 665 f ·
created **2016-08-15** · pushed **2026-10-20** · **100+ commits/90 d, 36 humans** · 324 open issues (946 including pull requests) · **MIT** ·
**npm `expo-secure-store` 58.0.2 published 2026-10-01** · **Expo SDK 58: yes (it *is* SDK 58)** · New Architecture:
**yes** (Expo Module) · on-device · **our current choice, already installed** · **better than our current choice:
nothing to beat, but it is the only Keystore-backed store that needs no new native dependency, and it is the store
MASVS-STORAGE-1 and MASWE-0003 point at** · risks: it is a **small** store (the Keychain/Keystore is not a
database — it is for keys, not for the route cache); `expo-secure-store` has a documented **value size limit** and
is **not** available on web · **DECISION: KEEP + EXTEND — it holds the refresh token and the SQLCipher key; the
route cache stays in op-sqlite.**

**C2 — `expo/expo` → `packages/expo-crypto`** — same monorepo · **npm `expo-crypto` 58.0.7 published 2026-10-16** ·
MIT · **not installed in our app** · provides `getRandomBytes`/`getRandomValues` (CSPRNG) and `digestStringAsync`
(SHA-256) · **why it matters: the SQLCipher key must come from a CSPRNG, not from `Math.random()`. The RN
community's standard answer is `react-native-get-random-values` (a `Math.random` polyfill), which is *not* a CSPRNG
on the JS side** · **DECISION: ADOPT (add `expo-crypto`; generate the DB key with it, never with `Math.random`).**

**C3 — `OP-Engineering/op-sqlite`** ⭐ — https://github.com/OP-Engineering/op-sqlite — **1 049 ★** /92 f · created
**2023-11-06** · pushed **2026-09-29** · last release **18.2.5, 2026-09-20** (our pin) · **76 commits/90 d, 7 humans**
· 8 open issues (12 including pull requests) · **MIT** · repo 1 089 MB · **New Architecture: yes** (Nitro) · **on-device** · README (read
2026-10-21): "**SQLCipher is supported as a compilation target**", plus FTS5, Rtree, `sqlite-vec`, reactive queries,
`db.interrupt()`, a key-value store, and a Turso/libsql target · **the 2026 issue that matters to us: #466 "Android
SQLCipher: track x86_64 OpenSSL dependency GNU_RELRO end-alignment failure" (open, 2026-10-05)** — i.e. the
**SQLCipher** build path itself has an open Android packaging defect; #469 "close() leaves the connection's worker
thread running until GC" (open, 2026-10-16) and #467 "iOS reload during in-flight queries delivers results into the
new runtime" (open, 2026-10-06) are correctness, not security · 2026 PRs: #460 "Bump sqlite/sqlcipher" (closed,
2026-09-20), #463 "Expose error codes" (closed, 2026-09-27), #468 "feat: add opt-in SQLite decimal extension"
(open, 2026-10-09) · **risks: our local DB holds the day's addresses, the door memory and the offline event log —
the highest-value PII on the device — and the SQLCipher build we would enable is the one with an open packaging
defect** · **DECISION: KEEP the 18.2.5 pin, and turn SQLCipher ON — but only after #466 is closed, and only with a
key from C2 held in C1.**

**C4 — `expo/expo` → `packages/expo-sqlite`** — npm `expo-sqlite` 58.0.13 (our pin, `apps/mobile/package.json:26`) ·
MIT · **Expo SDK 58: yes** · **SQLCipher is available behind `expo-sqlite`'s `useSQLCipher` build flag in the
prebuild config — UNVERIFIED for SDK 58 in our tree** · risks: **we now have two SQLite stacks** (this and
op-sqlite); that is two native SQLite copies in one APK (size, attack surface, and one more thing to patch) ·
**DECISION: DECIDE ONE — we recommend op-sqlite (Nitro, reactive, SQLCipher target) and drop `expo-sqlite` when
T7.1 lands; today both are installed and the duplicity is a finding.**

**C5 — `expo/expo` → `packages/expo-build-properties`** — npm `expo-build-properties` **58.0.11, 2026-10-16** · MIT ·
**not installed** · it is the config-plugin that sets `android.enableProguardInReleaseBuilds`,
`android.enableShrinkResourcesInReleaseBuilds`, `android.usesCleartextTraffic`, `android.networkSecurityConfig` and
the iOS `Info.plist` keys — **exactly the knobs MASVS-CODE-3 and MASWE-0061/0075 need** · **our fit: R8
obfuscation is on the checklist ("obfuscation (R8)") and there is currently no way to turn it on** ·
**DECISION: ADOPT (add the plugin; `enableProguardInReleaseBuilds: true` + `usesCleartextTraffic: false` +
a `networkSecurityConfig` that pins our API host).**

**C6 — `expo/expo` → `packages/expo-updates`** — npm `expo-updates` 58.0.17 (2026-10-15) · MIT · **not installed in
`apps/mobile/package.json`** · OTA updates are the only way to ship a security fix to a courier's phone the same
day; without it, a fix waits for a store rollout · **MASWE-0043 "Enforced Updating Not Implemented" (MASVS-CODE-2)
is therefore live today** · risks: an OTA channel is a **remote code execution surface** — it must be signed, and
the update manifest must be integrity-checked on device · **DECISION: ADOPT (T7.16; signed OTA, staged rollout,
rollback — the OTA lane already exists in `docs/research/2026/ci-cd-ota-observability-testing.md`).**

**C7 — `expo/expo` → `packages/expo-local-authentication`** — MIT · **not installed** · the biometrics / device
credential prompt · **MASWE-0020 "Local Authentication Can Be Bypassed"** and the SAAS_CHECKLIST MFA line ·
**our fit: step-up authentication for "the driver says delivered" (a delivery is a commercial act) — but D4 says
the default proof is the driver's word, so a biometric prompt on every delivery would be hostile** ·
**DECISION: WATCH — use it for *account* unlock and for revealing the door-memory list, never per delivery.**

**C8 — `expo/expo` → `packages/expo-standard-web-crypto`** — MIT · present in the monorepo · the web-crypto
shim for `crypto.subtle` · **DECISION: WATCH (a `global.crypto.getRandomValues` polyfill is a cheaper CSPRNG path
than C2 if we only need randomness).**

**C9 — `oblador/react-native-keychain`** — https://github.com/oblador/react-native-keychain — **3 484 ★** /543 f ·
created **2015-05-20** · pushed **2026-04-29** · last release **v10.0.0, 2025-03-23** · **0 commits/90 d** (last
commit 2026-04-29) · **MIT** · New Architecture: yes (v9+ is Nitro-free TurboModule; v10 supports the New
Architecture) · on-device · the reference Keystore/Keychain wrapper, with **biometric-gated access**
(`ACCESS_CONTROL.BIOMETRY_CURRENT_SET`) and a "require device unlock" flag · **our fit: `expo-secure-store` cannot
be biometric-gated; keychain can** · risks: **not installed**; adding it means a second native module for a
feature `expo-secure-store` mostly covers · **DECISION: WATCH — adopt only if we need biometric-gated key access;
prefer `expo-local-authentication` (C7) in front of `expo-secure-store` and skip the extra native dependency.**

**C10 — `emeraldsanto/react-native-encrypted-storage`** — https://github.com/emeraldsanto/react-native-encrypted-storage —
**572 ★** /81 f · created **2020-02-10** · **last push 2023-08-21 (3 years stale) · ARCHIVED** · npm
`react-native-encrypted-storage` **4.0.3, 2022-11-03** · **MIT** · New Architecture: **no** · **our fit: none** ·
risks: archived, no security patches, not New-Architecture-compatible · **DECISION: REJECT (archived, and
`expo-secure-store` already does this inside the Expo SDK we are locked to).**

**C11 — `react-native-device-info/react-native-device-info`** — https://github.com/react-native-device-info/react-native-device-info —
**6 686 ★** /1 459 f · created **2015-09-16** · pushed **2026-10-15** · last release **v15.0.2, 2026-02-21** ·
**0 commits/90 d on the default branch** (last commit 2026-02-21) · 4 open issues (32 including pull requests) · **MIT** · New Architecture: yes
· on-device · gives `isPinOrFingerprintSet`, `isEmulator`, `isTablet`, `deviceId` (which on Android 10+ is
ANDROID_ID — a resettable identifier, and IPP 13 territory) · **our fit: `isEmulator` and `isPinOrFingerprintSet`
are signal-only inputs** · **DECISION: WATCH — the emulator signal it gives is exactly what MASWE-0053 asks for;
install it only if we implement the signal path, otherwise it is 6 686 stars of unused dependency.**

**C12 — `MaxToyberman/react-native-ssl-pinning`** — https://github.com/MaxToyberman/react-native-ssl-pinning —
**410 ★** /121 f · created **2018-02-13** · **last release v1.6.0, 2025-07-21** · **0 commits/90 d** · 72 open /
95 closed issues · **MIT** · npm `react-native-ssl-pinning` 1.6.0 (2025-07-02) · New Architecture: **no** (it is a
legacy native module that patches `OkHttp`/`NSURLSession`) · **our fit: the SAAS_CHECKLIST says "certificate
pinning for our API"** · risks: **it is 15 months without a release, is not New-Architecture compatible, and it
requires a native rebuild (a `config` plugin) that our Expo prebuild would have to carry** — and MASVS-NETWORK-2
(identity pinning) is genuinely hard to satisfy in a JS-bundle app because the bundle is not the thing being
pinned · **DECISION: WATCH — pinning is a *native* config, not a JS library decision; revisit when `expo-build-
properties` + a `networkSecurityConfig` land (C5).**

### 1.3 Mobile security tooling (M1–M3)

**M1 — `MobSF/Mobile-Security-Framework-MobSF`** ⭐ — https://github.com/MobSF/Mobile-Security-Framework-MobSF —
**21 996 ★** /3 792 f · created **2015-01-31** · pushed **2026-10-18** · last release **v4.5.3, 2026-09-21** (v4.5.2
2026-08-10, v4.5.1 2026-07-06) · **32 commits/90 d, 11 humans** · 9 open / 1 554 closed issues · **GPL-3.0** ·
**1 547 MB repo** · **runs as a Docker image; SAST + DAST (dynamic analysis on a real device) + API + MobDA** ·
2026 PRs are all about the **Android dynamic analyzer**: #2715 "Fix for Recent Scans tab - default UTC note" (open,
2026-10-18), #2713 "Fetch report DB row once instead of per field" (open, 2026-10-18), #2712 "Android dynamic
analyzer: address follow-up review findings" (closed, 2026-10-18), #2711 "Android dynamic analyzer: support Gadget
split APK sets" (open, 2026-10-18), #2710 "Android dynamic analyzer: refresh existing Gadget APKs" (closed,
2026-10-18), #2709 "Android dynamic analyzer: embed MobSF CA in Gadget APKs" (closed, 2026-10-17), #2708 "log
physical-device progress" (closed, 2026-10-17) · **our fit: it is the only tool in this file that will tell us
whether our APK leaks secrets, whether the manifest is wrong, whether the backup rules are wrong, and whether the
exported components are wrong — i.e. MASWE-0004, 0006, 0029, 0032, 0048, 0061** · risks: **GPL-3.0** — we run it
as a **CI tool over our artefact, never link or vendor it**; the Docker image is ~1.5 GB; its dynamic analysis
needs a real device or emulator and is slow · **DECISION: ADOPT (weekly, non-blocking, against the release APK;
read-only over the artefact).**

**M2 — `talsec/Free-RASP-Community`** — https://github.com/talsec/Free-RASP-Community — **519 ★** · pushed
**2026-08-26** · **MIT** · a *free* community edition of a commercial RASP; detects Frida, debuggers, rooted
devices, emulators and tampered signatures · **our fit: MASWE-0051/0063/0064/0065** · risks: it is a **commercial
product's community edition** — the rules will differ from the paid product, and it adds a native dependency to
every build · **DECISION: WATCH — we implement root/emulator/Frida signals ourselves (MASTG #4007 has the test
design) rather than take a native RASP dependency; re-evaluate if a customer demands it.**

**M3 — `suifei/fridare`** — https://github.com/suifei/fridare — **953 ★** · pushed **2026-09-11** · **MIT** · a
Frida-detection library (Rust core, JNI/ObjC) · **our fit: MASWE-0065** · risks: native dependency per ABI; a
Frida detection that is trivially bypassed (see `AymanRbati/root-detection-bypass`, 34★, 2024) gives false
confidence · **DECISION: WATCH (a *signal*, never a block — the SAAS_CHECKLIST says exactly that).**

### 1.4 API code (A1–A6)

**A1 — `laurentS/slowapi`** ⭐ — https://github.com/laurentS/slowapi — **2 070 ★** /133 f · created **2020-02-21** ·
**last commit 2026-06-13, 0 commits/90 d** · last release **v0.1.10, 2026-06-13** · 57 open issues (closed count
unreadable) · **MIT** · 415 KB · pure Python, no Redis required (in-memory) with an optional Redis backend ·
**our fit: `services/api` has no rate limiting at all today, and the API is the thing that a driver hits 300 times a
day with a bearer token** · risks: **one maintainer, no commits for 90 days**; the in-memory store is per-process
(useless behind more than one uvicorn worker) · **DECISION: ADOPT — but pin the version, and use the Redis backend
the moment we run more than one worker.**

**A2 — `long2ice/fastapi-limiter`** — https://github.com/long2ice/fastapi-limiter — **790 ★** /75 f · created
**2020-11-06** · **pushed 2026-02-06 (8 months of no commits)** · 32 open issues · **Apache-2.0** · 209 KB ·
requires **Redis** (a hard dependency) and wraps `slowapi` · **our fit: Redis is not in our stack today** ·
**DECISION: REJECT for now (it is A1 with a mandatory Redis dependency and a worse maintenance record); revisit
when Redis exists for the queue.**

**A3 — `tiangoli/fastapi`** — https://github.com/tiangolo/fastapi — **MIT** (the repository `LICENSE` is the MIT licence; the API's `license.spdx_id` is `MIT`) · the framework itself ·
`FastAPI()` ships **no CORS, no security headers, no trusted-host, no rate limiting** unless you add them ·
`Starlette` underneath ships `TrustedHostMiddleware`, `HTTPSRedirectMiddleware` and `GZipMiddleware` · our
`services/api/app/main.py:18` adds **none** of them · **our fit: the SAAS_CHECKLIST §A API line names "CORS
allow-list, security headers, request size limits"** · **DECISION: ADOPT the built-in `TrustedHostMiddleware` +
`CORSMiddleware` with an explicit allow-list, and add a small security-header middleware we own (we will not take
a third-party header package for four lines).**

**A4 — `PyCQA/bandit`** — https://github.com/PyCQA/bandit — **8 326 ★** /862 f · created **2018-04-26** · pushed
**2026-10-19** · 199 open issues (264 including pull requests) · **Apache-2.0** · 5 906 KB · the Python SAST that finds hard-coded passwords,
`assert` in production, `subprocess` with `shell=True`, and `requests` without a timeout · **our fit: our CI runs
**Semgrep** with `p/default` and `p/owasp-top-ten` for both languages, but **Semgrep's Python rules are not a
substitute for Bandit's Python-specific checks**; the reverse is also true (Semgrep's cross-file dataflow is
stronger) · **DECISION: ADOPT (add `bandit -r services/api/app` to the quality gate — it is 3 lines of CI and it
catches the `shell=True` class that Semgrep can miss).**

**A5 — `Bearer/bearer`** — https://github.com/Bearer/bearer — **2 767 ★** /157 f · created **2022-09-27** · pushed
**2026-10-19** · 26 open issues · licence **NOASSERTION on the API** (the repo has a `LICENSE` that the API does
not classify — **treat as UNVERIFIED until the file is read**; it is a **source-available** product, not OSI) ·
scans a codebase for data flow into sensitive sinks and produces a security report · **our fit: the "data flow"
view we do not have** · **DECISION: WATCH — licence is not clearly permissive, and it overlaps Semgrep + Bandit;
do not add a licence of unknown provenance to a repo with a licence gate.**

**A6 — `zaproxy/zaproxy`** — https://github.com/zaproxy/zaproxy — **15 979 ★** /2 672 f · created **2015-06-03** ·
pushed **2026-10-15** · 807 open issues (867 including pull requests) · **Apache-2.0** · the DAST engine the SAAS_CHECKLIST names ("DAST against
staging with OWASP ZAP") · **our fit: the only way to prove that the API's input validation, auth and headers hold
against a real attacker, not a static guess** · risks: needs a running staging API with seeded data; a ZAP scan
against a database-backed API can destroy data (it will try injections) · **DECISION: ADOPT (against a **staging**
API with a throwaway database, nightly, non-blocking, and the findings triaged into tasks).**

### 1.5 Supply chain (S1–S8)

**S1 — `pnpm/pnpm`** — https://github.com/pnpm/pnpm — **36 865 ★** /1 950 f · created **2016-01-28** · pushed
**2026-10-20** · last release **v12.14.0, 2026-10-15** · **100+ commits/90 d, 13 humans** · **MIT** · our package
manager · pnpm's own docs (read 2026-10-21) list the supply-chain controls: **`minimumReleaseAge`** (added in
**v10.16.0, 2025-09-12**, default 0; **default 1440 minutes in v11**, 2026-04-28), **`minimumReleaseAgeStrict`**,
**`blockExoticSubdeps`** (default true in v11), **`allowBuilds`** (replacing `onlyBuiltDependencies` and
`ignoreDepScripts` in v11), **`trustPolicy: no-downgrade`**, **`minimumReleaseAgeExclude`**, and
**`minimumReleaseAgeIgnoreMissingTime`** (default **true** since v11.0.0 — a mirror that drops publish dates
silently disables the delay) · **our current state: `.npmrc` sets `minimum-release-age=10080` (7 days) and
`trust-policy=no-downgrade` — we are *stricter* than pnpm 12's default; `pnpm-workspace.yaml` sets
`ignoreScripts: true`** · risks: pnpm's own doc warns that a scanner reading only the first document of the
two-document lockfile "reports that the project has no dependencies, and no vulnerabilities, without failing" —
**our `scripts/ci/check-audit.mjs` must read both documents** · **DECISION: KEEP (and keep our stricter 7-day
policy; set `minimumReleaseAgeIgnoreMissingTime: false` and `minimumReleaseAgeStrict: true` so the gate is real).**

**S2 — `google/osv-scanner`** ⭐ — https://github.com/google/osv-scanner — **11 217 ★** /816 f · created
**2022-11-14** · pushed **2026-10-19** · last release **v2.7.0, 2026-10-12** (v2.6.0 2026-09-14, v2.5.1
2026-08-17) · **100 commits/90 d, 19 humans** · 86 open / 479 closed issues · **Apache-2.0** · the OSV.dev scanner:
it reads **npm and PyPI lockfiles directly**, needs no registry credentials, and queries the OSV database
(GitHub Advisory, PyPA, Go, Rust, etc.) · 2026 issues: **#3127 "panic: unchecked type assertion on
DW_AT_linkage_name crashes Rust call analysis" (open, 2026-10-05)** — a **panic** in a CI tool, so it must be
pinned and its exit code checked, not trusted; #3105 "Memory usage grows beyond 6 GB when scanning a dpkg status
file" (open, 2026-09-25); #3111 "Proposal: show SRAC safety context beside SBOM vulnerability results" (closed,
2026-09-27); #3108 "Cyclonedx missing severity" (closed, 2026-09-27); #3120 (closed, 2026-09-30); #3142 (closed,
2026-10-11) · **our fit: it is the **cross-ecosystem** scanner — one tool for the JS *and* the Python side, and it
reads the lockfile rather than the manifest** · **DECISION: ADOPT (replace `scripts/ci/check-audit.mjs` +
`uvx pip-audit` with one `osv-scanner scan --lockfile` invocation in CI, keeping the two existing gates until
osv-scanner proves equivalent).**

**S3 — `anchore/syft`** — https://github.com/anchore/syft — **9 703 ★** /1 008 f · created **2020-05-07** · pushed
**2026-10-19** · last release **v1.55.0, 2026-10-19** · **100 commits/90 d, 28 humans** · 516 open issues ·
**Apache-2.0** · generates a **CycloneDX** or **SPDX** SBOM from a directory, a container image or a lockfile ·
**our fit: the SAAS_CHECKLIST §A Infra line says "SBOM" and V12 says CycloneDX; without an SBOM we cannot answer
"are we affected?" for the next Mini Shai-Hulud in under an hour** · risks: it is a Go binary we must pin and
mirror (a supply-chain tool that is itself a supply-chain risk) · **DECISION: ADOPT (generate a CycloneDX SBOM
per release, commit it, and diff it in CI).**

**S4 — `anchore/grype`** — https://github.com/anchore/grype — **13 056 ★** /922 f · created **2020-05-26** · pushed
**2026-10-19** · 330 open issues (430 including pull requests) · **Apache-2.0** · matches an SBOM against the vulnerability database · **our fit:
syft (produce) + grype (match) is the standard pair, and grype can match a **CycloneDX SBOM** directly** ·
**DECISION: WATCH — osv-scanner (S2) covers the lockfile case; grype earns its place when we scan the **APK and
the container image**, not the source tree.**

**S5 — `sigstore/cosign`** — https://github.com/sigstore/cosign — **6 374 ★** /826 f · created **2021-02-04** ·
pushed **2026-10-20** · last release **v3.1.3, 2026-08-06** · **69 commits/90 d, 24 humans** · 109 open issues ·
**Apache-2.0** · sign and verify artefacts with keyless (OIDC) signatures bound to a certificate identity ·
**our fit: "signed releases" is in the SAAS_CHECKLIST §A Infra line; a signed APK + a signed container image is
how a courier's phone and our CI prove a build came from us** · **the hard 2026 lesson: Mini Shai-Hulud forged
valid SLSA Build Level 3 provenance attestations by extracting a GitHub Actions OIDC token from runner process
memory — so "it has a valid signature" is no longer sufficient evidence of provenance** ·
**DECISION: ADOPT (sign the release APK and the API image; but pair it with the offline checks in S6/S8 — a
signature proves *who signed*, not *what was signed*).**

**S6 — `sigstore/fulcio`** — https://github.com/sigstore/fulcio — **891 ★** /192 f · created **2021-02-23** · pushed
**2026-10-19** · 27 open issues (28 including pull requests) · **Apache-2.0** · the Sigstore certificate authority that issues the
short-lived signing certificates keyless signing uses · **our fit: we are a *consumer* of Sigstore, not an
operator** · **DECISION: NOT USED DIRECTLY (documented here so the team does not try to run it).**

**S7 — `slsa-framework/slsa-github-generator`** — https://github.com/slsa-framework/slsa-github-generator —
**604 ★** /190 f · created **2022-03-28** · **pushed 2026-08-07** · last release **v2.1.0, 2025-02-24** · **1
commit/90 d, 1 human** · 261 open / 2 899 closed issues · **Apache-2.0** · generates SLSA provenance for GitHub
releases and artefacts · **the 2026 evidence against trusting it alone: the CSA research note (2026-05-17) records
that Mini Shai-Hulud was "the first documented supply chain attack to forge valid SLSA Build Level 3 provenance
attestations by extracting GitHub Actions OIDC tokens from runner process memory and using them to obtain
legitimate Sigstore signing certificates — meaning malicious package versions appeared cryptographically verified
to automated security tooling"** · **DECISION: WATCH — the upstream project is nearly dormant; the *mechanism* is
still the right one, but the 2026 forgery changes what we are allowed to claim about a signed artefact.**

**S8 — `step-security/harden-runner`** — https://github.com/step-security/harden-runner — **1 287 ★** /119 f ·
created **2021-10-28** · pushed **2026-10-19** · last release **v2.22.2, 2026-10-19** · **58 commits/90 d, 5 humans**
· 20 open issues · **Apache-2.0** · 64 705 KB · pins every action to a full commit SHA, disables credential
persistence, blocks writes to `$GITHUB_PATH`/`$GITHUB_ENV` and egress-lists the network · **our fit: the 2026
worm campaigns specifically target GitHub Actions runners and OIDC tokens; this is the cheapest hardening available**
· **DECISION: ADOPT (wrap every job in `step-security/harden-runner`; it is one line per job and it directly
addresses the 2026 attack chain).**

### 1.6 Rejected, archived and clean-room (grouped)

- `emeraldsanto/react-native-encrypted-storage` (C10) — archived 2023-08-21, no New-Architecture support → **REJECT**.
- `MaxToyberman/react-native-ssl-pinning` (C12) — 15 months without a release, legacy native module → **WATCH, not adopt**.
- `long2ice/fastapi-limiter` (A2) — needs Redis, no commits since 2026-02-06 → **REJECT for now**.
- `Bearer/bearer` (A5) — licence **NOASSERTION**, source-available not OSI → **WATCH only**.
- `trufflesecurity/trufflehog` — **28 608 ★**, AGPL-3.0, pushed 2026-10-20 → **REJECT as a dependency (AGPL)**
  but note it is the tool the 2026 worms *abused* to steal secrets; we use `gitleaks` (MIT) instead.
- `getsops/sops` — **23 452 ★**, **MPL-2.0**, pushed 2026-10-20 → **WATCH** (file encryption at rest for local
  config; we have no secret files to encrypt yet because everything is in `.env.local`).
- `gitleaks/gitleaks` — **30 159 ★**, MIT, last release **v8.30.1, 2026-03-21**, **0 commits/90 d on the default
  branch** (last commit `b58d3f10` 2026-07-22) → **KEEP** (already our gate) but the quiet default branch is a
  **watch item**: a security tool that stops shipping is a risk.
- `Yelp/detect-secrets` (4 652 ★, Apache-2.0, pushed 2026-04-02) and `secretlint/secretlint` (1 463 ★, MIT, pushed
  2026-10-20) → **WATCH** (second scanner; one is enough until gitleaks goes quiet).
- `github/dependency-review-action` — **OPEN: the API call returned a non-JSON error during the 2026-10-21 run
  (rate limit or transient). The repository exists and is the standard GitHub-native licence/advisory review for
  pull requests, but its stars, last push and licence are UNVERIFIED.** → **WATCH; re-verify before adopting.**
- `GrapheneOS/Auditor` — **723 ★**, MIT, pushed 2026-10-19 → **REFERENCE ONLY** (it is an OS-integrity service,
  not a mobile app SDK).
- `talsec/Free-RASP-Android` / `Free-RASP-Flutter` — community editions of a commercial RASP → **REJECT**
  (native dependency, commercial product shape).
- `muellerberndt/frida-detection` — archived 2022 → **REJECT**.
- `pwn0sec/PwnSSRF` (69 ★, 2021), `IncludeSecurity/safeurl-python` (11 ★, archived 2024) → **REJECT**; **there is
  no maintained Python SSRF-guard library**, so we write the guard ourselves (a shared `safe_fetch()` that resolves
  the host, refuses private/link-local/loopback ranges, pins the resolved IP, and re-checks on redirect).
- `cyan4973/raylib` and other unrelated `*security*` hits → **noise**.

---

## 2. Shortlist (13)

| # | Candidate | Decision | One-line reason |
|---|---|---|---|
| V2 | **OWASP MASVS v2.1.0** | **ADOPT (the mobile control set)** | Eight control groups, 13+ controls, CycloneDX-published, and it is exactly the "MASVS L2" the SAAS_CHECKLIST already names. |
| V1 | **OWASP Mobile Top 10 (2024)** | **ADOPT (the published narrative)** | The ten risks are what we explain to a courier and to the store; M2 (supply chain) is the one we are weakest against. |
| V5 | **OWASP ASVS 5.0.0** | **ADOPT (the API control set)** | Released 2025-05-30, L2 is the bar the checklist names; quote 5.0.0, not the rolling "Bleeding Edge" tag. |
| V4 + V3 | **OWASP MASTG v2.0.0 + MASWE** | **ADOPT (the test catalogue)** | MASTG-TEST ids are the unit of evidence we can cite in `docs/evidence/`; MASWE gives us 77 named weaknesses to ticket. |
| M1 | **MobSF v4.5.3** | **ADOPT (weekly, over the release APK)** | The only tool here that reads our *shipped binary* for leaked secrets, backup rules, exported components and debug artefacts. GPL-3.0 → run it, never vendor it. |
| S2 | **google/osv-scanner v2.7.0** | **ADOPT (the dependency scanner)** | One tool for npm *and* PyPI, reads the lockfile, no registry credentials; replaces two of our current gates. Watch the #3127 panic. |
| S3 | **anchore/syft v1.55.0** | **ADOPT (the SBOM producer)** | CycloneDX SBOM per release, committed and diffed — the only way to answer "are we affected?" in an hour next time. |
| S5 + S6 | **sigstore/cosign v3.1.3** | **ADOPT (sign the release artefacts)** | Keyless signing of the APK and the API image; paired with S8 because a 2026 campaign forged valid provenance. |
| S8 | **step-security/harden-runner v2.22.2** | **ADOPT (every CI job)** | Pins actions to SHAs and blocks the runner paths the 2026 worms used; one line per job. |
| V7 + V8 | **Play Integrity + Expo `@expo/app-integrity` 58.0.2** | **ADOPT (server-side verdict)** | The only attestation path that adds no new native dependency to our Expo 58 / New Architecture app. |
| A1 | **slowapi** | **ADOPT (the API rate limiter)** | MIT, pure Python, no Redis today; pin it, and move to the Redis backend when we run >1 worker. |
| C1 + C2 | **expo-secure-store 58.0.2 + expo-crypto 58.0.7** | **KEEP + ADD** | The key store is already there; `expo-crypto` is missing and is the only CSPRNG we should use for the DB key. |
| C3 | **OP-Engineering/op-sqlite 18.2.5** | **KEEP, and turn SQLCipher ON (gated on #466)** | SQLCipher is the encryption story for the day's addresses and door memory; the Android SQLCipher build has an open packaging defect (#466) and one maintainer team of 7. |

**Also on the radar (not in the 13):** `react-native-keychain` (C9) if we need biometric-gated keys ·
`expo-local-authentication` (C7) for account unlock · `expo-build-properties` (C5) for R8 + cleartext policy ·
`expo-updates` (C6) for same-day security fixes · `react-native-ssl-pinning` (C12) and `expo-build-properties`
`networkSecurityConfig` for pinning · `zaproxy` (A6) for nightly DAST against staging · `grype` (S4) once we scan
the APK/image · `react-native-device-info` (C11) for the emulator signal · `sops` for encrypted config at rest.

---

## 3. Deep review — top 5 (code, commits, PRs and issues in the 2026 window)

### 3.1 OWASP MASVS v2.1.0 + MASWE (V2, V3)

**What I read.** The MASVS control text on `mas.owasp.org/MASVS/` (the eight control groups and the individual
controls), the v2.1.0 release note (2024-01-18) that introduced **MASVS-PRIVACY-1..4** and CycloneDX support, and
the full MASWE table on `mas.owasp.org/MASWE/` (id → title → platform → MASVS control → test count → status).

**What it decided for us.** The control IDs are now the acceptance criteria of the mobile hardening task, in this
order of severity for our app: **MASVS-AUTH-1** (the unauthenticated WebSocket), **MASVS-STORAGE-1/2** (the local
route DB and the backup rules), **MASVS-NETWORK-1/2** (TLS + pinning), **MASVS-CODE-3** (known-vulnerable
dependencies), **MASVS-RESILIENCE-1/2** (device + app attestation), **MASVS-PLATFORM-1/3** (deep links, screenshots,
clipboard), **MASVS-PRIVACY-1/3** (minimisation, transparency).

**Repository health.** `OWASP/masvs` — 2 461 ★, created 2016-09-08, **last release v2.1.0 on 2024-01-18** (2 y 9 m
old), **2 commits in 90 days, 1 human**, pushed 2026-09-21, 1 open issue, 207 closed. The repo is a YAML source
(`OWASP_MASVS.yaml`) and the human-editable text; the release cadence is slow but the standard is a *living
document* and the control IDs have not changed.

**Verdict.** It is a checklist, not a product; nothing to install, nothing to break, and it is the vocabulary the
rest of the industry (and our own SAAS_CHECKLIST) already speaks. Adopt the IDs; do not adopt a tool because of it.

### 3.2 MobSF v4.5.3 (M1)

**What I read.** The repository metadata, the release list (v4.5.3 2026-09-21, v4.5.2 2026-08-10, v4.5.1
2026-07-06, v4.4.6 2026-03-21), and the **2026 PR stream**, which in the last three weeks is entirely the **Android
dynamic analyzer**: #2715 (open, 2026-10-18) "Fix for Recent Scans tab - default UTC note"; #2713 (open,
2026-10-18) "Fetch report DB row once instead of per field"; #2712 (closed, 2026-10-18) "Android dynamic analyzer:
address follow-up review findings"; #2711 (open, 2026-10-18) "Android dynamic analyzer: support Gadget split APK
sets"; #2710 (closed, 2026-10-18) "refresh existing Gadget APKs"; #2709 (closed, 2026-10-17) "embed MobSF CA in
Gadget APKs"; #2708 (closed, 2026-10-17) "log physical-device progress"; #2707 (closed, 2026-10-17) "guide
stock-device app analysis".

**What it decided for us.** MobSF is now an **instrumented-app** tool (it drives a real device with an embedded CA
and a Gadget APK), not just a static analyser. That is exactly what we need for the *dynamic* half of the mobile
hardening task — the parts a static scan cannot see: does the app leak a secret in a log, does a deep link open
an unprotected route, does the WebView load remote content (we have no WebView today, and that must stay true),
does the backup actually include the DB.

**Repository health.** 21 996 ★, 3 792 forks, created 2015-01-31, pushed 2026-10-18, **32 commits/90 d across 11
humans**, 9 open / 1 554 closed issues, **GPL-3.0**, 1 547 MB.

**Verdict.** Adopt as a **read-only, weekly, non-blocking** scan of the release APK. **GPL-3.0 is the constraint:
we must never vendor its code into the app or the API.** The dynamic mode needs a real device in our CI, which we
do not have (we have an emulator); the static mode runs anywhere.

### 3.3 google/osv-scanner v2.7.0 (S2)

**What I read.** The release list (v2.7.0 2026-10-12, v2.6.0 2026-09-14, v2.5.1 2026-08-17, v2.5.0 2026-08-07) and
the 2026 issue stream: **#3127 (open, 2026-10-05) "panic: unchecked type assertion on DW_AT_linkage_name crashes
Rust call analysis"** — a *panic* in a CI gate is a supply-chain risk of its own, so the scanner must be pinned and
its exit code treated as a failure; **#3105 (open, 2026-09-25)** "Memory usage grows beyond 6 GB when scanning a
dpkg status file" — a memory ceiling we must set; #3111 (closed, 2026-09-27) "show SRAC safety context beside SBOM
vulnerability results"; #3108 (closed, 2026-09-27) "Cyclonedx missing severity"; #3120 (closed, 2026-09-30);
#3107 (closed, 2026-09-26); #3142 (closed, 2026-10-11) "perf: quadratic work in result building and alias
grouping".

**What it decided for us.** It reads **both** lockfiles — our `pnpm-lock.yaml` **and** `services/api/uv.lock` — with one
command and one database, and it needs no npm token. That replaces `scripts/ci/check-audit.mjs` + `uvx pip-audit`
with one gate that is cross-ecosystem, which is the shape the 2026 campaigns took (one compromised maintainer, two
registries).

**Repository health.** 11 217 ★, 816 forks, created 2022-11-14, pushed 2026-10-19, **100 commits/90 d, 19 humans**,
86 open / 479 closed issues, **Apache-2.0**.

**Verdict.** Adopt, but **pin the binary version, set a memory ceiling, and never let a scanner panic be a pass.**

### 3.4 Play Integrity + Expo `@expo/app-integrity` 58.0.2 (V7, V8)

**What I read.** Google's Play Integrity overview (page published 2026-04-20), the standard-request page, the
verdicts page and the setup page; and the Expo docs page for `@expo/app-integrity`, which states that it "uses
Google's Play Integrity APIs on Android and Apple's App Attest", that it uses Play Integrity's **standard request
flow**, and the exact two calls: `prepareIntegrityTokenProviderAsync(cloudProjectNumber)` and
`requestIntegrityCheckAsync(requestHash)`.

**What it decided for us.** Three things.

1. **The verdict is computed by Google, and the *decision* is ours, on our server.** The mobile app obtains a
   token; our API decides. That is the only architecture that works with a private API and it means **the API
   needs a Play Integrity verification path** — which is new work in `services/api`.
2. **The CI-emulator problem is solved by the semantics, not by a special case.** The verdicts page says device
   integrity is a **blank value** when the device "has signs of attack (such as API hooking) or system compromise
   (such as being rooted), or the app is not running on a physical device (such as an emulator that does not pass
   Google Play integrity checks)". So the rule is: *a blank device-integrity verdict is a signal, not a block* —
   exactly what the SAAS_CHECKLIST says ("root/emulator/hook detection — signal only, not block CI emulator").
3. **`requestHash` is content binding.** Google's standard-request page is explicit: without `requestHash` the
   token is bound only to the device, not to the request, "which opens up the possibility of attack", and the
   requestHash is capped at 500 bytes. We hash the action (e.g. the delivery event id) and compare app-side and
   server-side digests.

**Repository health.** `expo/expo` — 52 874 ★, pushed 2026-10-20, 100+ commits/90 d, 36 humans, MIT;
`packages/expo-app-integrity` confirmed present in the monorepo; npm `@expo/app-integrity` **58.0.2 published
2026-10-01**; Expo PR **#50534 "[docs][app-integrity] Remove alpha label" (closed, 2026-09-23)**.

**Verdict.** Adopt. **The cost is a Google Cloud project number and a Play Console setup, which is a founder
action (D17) — the code is ours to write.**

### 3.5 OP-Engineering/op-sqlite 18.2.5 + SQLCipher (C3)

**What I read.** The README (2026-10-21) in full, the release list, the 2026 issue stream and the 2026 PR stream.

**README, verbatim where it matters.** "OP-SQLite has grown large to cover a lot of plugins, sqlite versions and
APIs." Supported compilation targets include "**SQLCipher is supported as a compilation target**", FTS5, Rtree,
`sqlite-vec`, Turso and libsql. It also ships a key-value store and `db.interrupt()`.

**The 2026 window.** Issues: **#466 (open, 2026-10-05) "Android SQLCipher: track x86_64 OpenSSL dependency GNU_RELRO
end-alignment failure"** — the Android SQLCipher build path has an open packaging defect; #469 (open, 2026-10-16)
"close() leaves the connection's worker thread running until GC (iOS background)"; #467 (open, 2026-10-06) "iOS
reload during in-flight queries delivers results into the new runtime"; #462 (closed, 2026-09-25) "Errors from
execute/executeBatch carry no SQLite result code"; #459 (closed, 2026-09-19); #456 (open, 2026-09-13); #454 (closed,
2026-09-13); #452 (open, 2026-09-08). PRs: #470 (open, 2026-10-16) "Join the connection's worker thread on close
instead of at GC"; #468 (open, 2026-10-09) "add opt-in SQLite decimal extension"; #465 (closed, 2026-09-29) "Better
rollbacks and C++ code for execute batch"; #464 (closed, 2026-09-29) "Implement token generator in JS and make all
build tools call it"; #463 (closed, 2026-09-27) "Expose error codes"; #461 (closed, 2026-09-20); **#460 (closed,
2026-09-20) "Bump sqlite/sqlcipher"**; #458 (closed, 2026-09-18) "Fix use after free in commit hook callback".

**Maintenance health.** 1 049 ★, created 2023-11-06, pushed 2026-09-29, last release 18.2.5 on 2026-09-20 (our
pin), **76 commits/90 d, 7 humans**, 8 open issues (12 including pull requests), **MIT**, 1 089 MB repo, New Architecture (Nitro).

**What it decided for us.** The local DB is where the day's addresses, the door memory and the offline event log
live — the highest-value PII on the device. op-sqlite is the only thing in our tree that can give us that DB
encryption. But the **SQLCipher** path has an open Android packaging defect (#466) and the key must come from a
CSPRNG (C2) and live in the Keystore (C1).

**Verdict.** **KEEP the pin; enable SQLCipher behind a task that is gated on #466.** The key design: generate 32
random bytes with `expo-crypto`, store the hex in `expo-secure-store` (Android Keystore / iOS Keychain), pass it to
op-sqlite as the `encryptionKey`, and **never write it to a file, a log, an error message, or a crash report.**

---

## 4. Benchmark — **UNVERIFIED: no security eval set exists**

**I did not run a benchmark and I will not invent one.** There is no security eval set in this repository:
`docs/squads/` has no `security/` squad folder, there is no `docs/eval/` for security, and `services/api` has no
scanner installed. Everything below is **UNVERIFIED** until the set exists.

**The set that must be built (name + shape):**

1. **`docs/squads/security/eval/seeded-app/` — a deliberately vulnerable React Native app** with one seeded
   defect per MASWE id we care about: a leaked API key in the bundle (MASWE-0004), a backup that includes the DB
   (MASWE-0006), an unprotected deep link (MASWE-0029), a clipboard copy of a door code (MASWE-0030), a
   cleartext-socket call (MASWE-0026), a debug build with the dev menu (MASWE-0061).
2. **`docs/squads/security/eval/seeded-api/` — a FastAPI app with one seeded defect per ASVS v5.0.0 L2
   requirement** we will gate on: missing input validation, missing rate limit, a text-search endpoint built by
   string concatenation into SQL, an SSRF-capable fetch, a missing auth dependency on one route.
3. **`docs/squads/security/eval/runner/`** — the runner: a **fixed corpus of N findings per tool**, the tool's
   output (JSON), and the ground truth, committed.

| Metric | Gate | Source of truth | How we would measure it |
|-------|------|-----------------|--------------------------|
| **Finding rate (recall)** | each tool finds **≥ 90 %** of the seeded defects in its category | the seeded corpus | run the tool against the seeded app/API; a seeded defect is "found" if it is reported with the right rule id. **Currently UNVERIFIED.** |
| **False-positive rate** | **≤ 1 false positive per 100 findings** on our *real* code | the real repo | run the tool on `apps/mobile` and `services/api`; a human triages every finding once and the labels are kept. **Currently UNVERIFIED — this is the number that decides whether a tool survives the merge gate.** |
| **Coverage** | the union of the tools covers **every** MASWE id in our scope (we will publish the matrix) | the MASWE list | a coverage matrix in `docs/squads/security/` mapping each MASWE id → the tool that detects it → the test id that proves it. **Currently UNVERIFIED.** |
| **Cost in CI** | the whole security gate adds **≤ 6 minutes** to a PR and **≤ 15 minutes** to a nightly | the CI log | measure the wall time of each step on the CI runner. **Currently UNVERIFIED.** |
| **Time to fix** | a high finding is fixed within **1 working day**; a critical within **4 hours** | the tracker | measure from "finding filed" to "finding closed" in the tracker over the first 20 findings. **Currently UNVERIFIED.** |
| **Signal quality (attestation)** | the Play Integrity verdict path is exercised in CI against the **emulator** and the blank verdict is handled without blocking | the API test | a unit test that posts a fixture token and asserts the *signal*, not a block. **Currently UNVERIFIED.** |
| **Supply-chain coverage** | the SBOM diff shows **zero** new un-reviewed packages in a release | `syft` output | diff the CycloneDX SBOM between releases; every new package must be reviewed. **Currently UNVERIFIED.** |

**The first benchmark to run:** the seeded app with MASWE-0004 / 0006 / 0029 / 0030 / 0026 / 0061 against **MobSF
static mode** + **our own grep-based floor checks**, and the seeded API against **Semgrep** + **Bandit** +
**osv-scanner**. Nothing is declared "the winner" before this table exists.

---

## 5. What we are missing → rows for `docs/status/PARITY.md`

The Spoke column is filled **only** with facts verified in `docs/study/spoke/TEARDOWN.md` (read 2026-10-21).
Where the teardown does not say, the cell is empty. These rows continue the numbering of `docs/status/PARITY.md` (which
ends at 49).

| # | Family | Feature | Status | Spoke (2026-10-20) | Our edge | Task |
|---|--------|---------|--------|-------------------|----------|------|
| 50 | Security | **MASVS L2 mobile hardening**: SQLCipher local DB, Keystore keys, backup rules off, no exported components, no debug artefacts, R8 obfuscation | Planned (task) | | we map every control to a MASVS id and a test id, and publish the matrix | T7.16 |
| 51 | Security | **Deep-link protection** for the `courier://` scheme (custom schemes are hijackable by any app) | Planned (task) | | we use an Android App Link / iOS Universal Link so only our app can open a route | T7.16 |
| 52 | Security | **Certificate pinning** for our own API host (MASVS-NETWORK-2) | Planned (task) | | pinning plus a documented rotation procedure, so a pinned app cannot be bricked by an expiring cert | T7.16 |
| 53 | Security | **App attestation** (Play Integrity standard requests / Apple App Attest) with a **server-side verdict** and a blank verdict treated as a signal, not a block | Planned (task) | | the CI emulator keeps working — the blank verdict is logged, not enforced | T7.16 |
| 54 | Security | **Root / emulator / Frida signals** reported to the API as a risk score, never used to block | Planned (task) | | signals inform the risk score; they never stop a courier with a rooted spare phone from working | T7.16 |
| 55 | Security | **Screenshot and screen-recording protection** on the screen that shows recipient data (POD, door notes, the customer list) | Planned (task) | | we protect the screen, not the data: a photo of the screen is useless without the on-device key | T7.16 |
| 56 | Security | **Clipboard discipline**: door codes are never copied to the system clipboard; the clipboard is cleared after a paste | Planned (task) | | a gate code never sits in a clipboard another app can read | T7.16 |
| 57 | Security | **Signed releases**: the release APK and the API container image are signed with Sigstore, and the SBOM is published per release | Planned (task) | | a courier's phone can verify the build came from us | T7.16 |
| 58 | Security | **CI supply-chain hardening**: every action pinned to a commit SHA, runner credential persistence off, egress restricted | Planned (task) | | we harden the runner because the 2026 worms went for the runner, not for our code | T7.16 |
| 59 | Security | **Cross-ecosystem dependency scanning** (npm + PyPI from one SBOM) and a **committed SBOM diff** per release | Planned (task) | | "are we affected?" is answered in minutes, not days | T7.16 |
| 60 | Security | **API rate limiting** per route, per user and per IP, with a progressive delay and a lockout | Planned (task) | | the driver app is called hundreds of times a day; the limiter protects us without punishing a courier in a dead zone | T7.16 |
| 61 | Security | **SSRF guard** on every server-side fetch (address geocoding, map tiles, webhooks): no private, loopback or link-local destinations; re-check on redirect | Planned (task) | | one shared `safe_fetch()` in the API, so no endpoint can be turned into a proxy into our own network | T7.16 |
| 62 | Security | **PostGIS query safety**: every geometry and text query is parameterised; no string-built SQL anywhere in `services/api` | Planned (task) | | we use one repository helper, so "no concatenated SQL" is a property of the code, not a review habit | T7.16 |
| 63 | Security | **Tenant isolation proved by tests**: every query is scoped to the org; a test asserts driver A cannot read team B | Planned (task) | | the test is the proof, not the review | T7.14, T7.16 |
| 64 | Security | **Security headers and a CORS allow-list** on the API, plus a trusted-host check and a request-size limit | Planned (task) | | | T7.16 |
| 65 | Security | **Nightly DAST** against a staging API with OWASP ZAP, and a weekly static + dynamic mobile scan of the release APK with MobSF | Planned (task) | | we scan the artefact we actually ship, not the source we wish we shipped | T7.16 |
| 66 | Compliance | **NZ Privacy Act 2020 PIA** covering the voice transcripts, the GPS trace and the recipient data, and covering **IPP 3A** (indirect collection, in force 1 May 2026) | Planned (task) | "No statement about where audio/photos are processed; the stores declare identifiers + usage data used to track, and third-party advertising use of usage data" | we publish where the audio goes (on the phone) and we collect nothing we do not need | T7.15 |
| 67 | Compliance | **App-store privacy labels** (Google Play Data Safety + Apple privacy nutrition labels) generated from one data map and checked by a test against the privacy policy | Planned (task) | "the stores declare identifiers + usage data used to track, and third-party advertising use of usage data" | we declare exactly what we collect — location, voice on device, no advertising | T7.15 |
| 68 | Compliance | **`security.txt`**, a pen-test checklist before v1, and a breach-response runbook with the 72-hour clock | Planned (task) | | | T7.15, T7.16 |
| 69 | Security | **Enforced, signed OTA updates** so a security fix reaches a courier's phone the same day | Planned (task) | "Manifest import and manifest OCR upload the file to Spoke's servers" (S7, S27) | our OTA is signed and staged; a fix is not a store rollout | T7.16 |

---

## 6. Decision

1. **The control vocabulary is OWASP: Mobile Top 10 (2024) for the narrative, MASVS v2.1.0 for the mobile control
   set, MASWE for the tickets, MASTG v2.0.0 for the tests, ASVS 5.0.0 for the API, and the Cheat Sheet Series for
   the implementation rules.** Nothing else may be quoted in a gate. (Why: the SAAS_CHECKLIST already names
   ASVS L2 and MASVS L2, so this costs nothing to adopt and everything to not adopt.)
2. **The mobile hardening task is a MASVS-control checklist, not a "do security things" task.** Each control maps
   to a MASWE id, a MASTG test id and a test in our own suite, and the evidence lands in
   `docs/evidence/security/`. (Why: a checklist is auditable; a posture is not.)
3. **First three code changes, in this order:** (a) **authenticate the voice WebSocket** and make the issuer
   non-optional in `jwks.py`; (b) **add `expo-crypto` and `expo-build-properties`**, generate the DB key with the
   CSPRNG, turn on R8 and turn off cleartext traffic; (c) **add `expo-updates`** for signed same-day fixes.
   (Why: (a) is an open hole, (b) and (c) are the two controls that everything else depends on.)
4. **Local database: op-sqlite with SQLCipher, key in `expo-secure-store`, generated by `expo-crypto` — gated on
   op-sqlite #466.** Drop `expo-sqlite` when the offline work lands. (Why: one DB, encrypted at rest, one
   dependency instead of two.)
5. **API: FastAPI + `slowapi` (pinned) + our own `safe_fetch()` SSRF guard + one repository helper that makes
   parameterisation the default + a security-header and CORS allow-list.** (Why: all four are small, and each one
   closes a MASVS/ASVS item that a scanner can then prove.)
6. **Supply chain: `osv-scanner` (pinned) replaces the two advisory gates, `syft` produces a committed CycloneDX
   SBOM, `cosign` signs the APK and the image, `harden-runner` wraps every CI job, and `gitleaks` stays.**
   (Why: the 2026 campaigns attacked the *pipeline*, not the code.)
7. **Attestation is a server-side decision.** `@expo/app-integrity` on the phone, a Play Integrity verification
   endpoint in `services/api`, a blank device-integrity verdict is a **signal**, and the CI emulator is never blocked.
   (Why: that is what the SAAS_CHECKLIST says and what Play Integrity's own semantics give us.)
8. **MobSF weekly against the release APK, ZAP nightly against staging.** Both non-blocking, both producing
   tasks, both with a false-positive label file so the rate is measurable.
9. **What we do not do:** no certificate-pinning npm module (it is a native config and the library is stale), no
   commercial RASP, no AGPL scanner as a dependency, no root-detection that blocks a working courier, no
   client-side "the server will judge you" shortcut.

**Fallbacks.** If the Play Integrity setup (a founder action) slips, the API keeps working and the risk score
simply omits the attestation signal — we do not gate on it. If op-sqlite #466 does not close, we fall back to
`expo-sqlite` with its SQLCipher build (UNVERIFIED for SDK 58) or to an encrypted file store. If `osv-scanner`
panics, `scripts/ci/check-audit.mjs` and `uvx pip-audit` stay in place — we do not delete a gate to make a new one
green.

**Risks.**

| Risk | Severity | Mitigation |
|---|---|---|
| The voice WebSocket stays unauthenticated | **Critical** | Task 3.1 in §6 — first code change, with a test that an anonymous socket is closed with 4401. |
| Local DB (addresses, door memory) is unencrypted | **High** | SQLCipher + Keystore key; if the key is on the device in the Keystore, a stolen phone is not a data breach. |
| A poisoned dependency reaches a courier's phone | **High** | 7-day `minimumReleaseAge`, `ignoreScripts`, `allowBuilds` allow-list, osv-scanner, signed releases, and a reproducible build. |
| A CI runner is compromised by a worm | **High** | `harden-runner` on every job; no long-lived credentials; rotate on any alert. |
| "Valid signature" is treated as proof of provenance | **High** | The 2026 forgery is documented; we verify the artefact hash and the SBOM, not the signature alone. |
| The Mobile Top 10 2024 and MASVS v2.1.0 go stale | Medium | Monthly radar (§8) re-reads both; MASVS is a living document and we re-read it quarterly. |
| `gitleaks` goes quiet (0 commits/90 d on the default branch) | Medium | A second scanner (detect-secrets / secretlint) is already evaluated and cheap to add. |
| The security checklist becomes a document nobody runs | Medium | Every row has a CI job or an evidence path; rows without one are not "done". |
| The API's JWT issuer check stays optional | **High** | Make `auth_jwt_issuer` required in `AuthSettings`; the API already fails fast on a missing `AUTH_JWKS_URL`, so the same pattern applies. |
| `slowapi` has one maintainer and no 90-day commits | Medium | Pin the version; it is ~200 lines; the in-memory backend is a 40-line replacement if it dies. |

---

## 7. Monthly radar filter (V4 §11.3)

On the first working day of each month, re-read exactly these and write one line each into
`docs/log/2026-W43.md`. If a line changes, it becomes a task the same day.

| Watch item | Trigger | Where to look | What we do |
|---|---|---|---|
| **MASVS / MASWE / MASTG** | a new MASVS release, or a MASWE id that changes status | `github.com/OWASP/masvs` releases, `mas.owasp.org/MASWE/` | re-map the affected controls in `docs/squads/security/` |
| **Mobile Top 10** | a new Mobile Top 10 release | `owasp.org/projects/mobile-top-10` | update the published narrative in `security.txt` |
| **ASVS** | a new versioned ASVS release (ignore "Bleeding Edge" for gates) | `github.com/OWASP/ASVS` releases | re-quote the L2 requirement ids we gate on |
| **op-sqlite** | issue **#466** (Android SQLCipher GNU_RELRO) closes or changes | `github.com/OP-Engineering/op-sqlite` issues | unblock or re-block the SQLCipher task |
| **osv-scanner** | a new major/minor, or a new panic-class issue like **#3127** | `github.com/google/osv-scanner` releases + issues | bump the pin, re-run the seeded corpus (§4) |
| **syft / cosign** | a new release, or a Sigstore incident | `anchore/syft`, `sigstore/cosign` releases | bump the pin; re-sign a release |
| **Play Integrity** | a new verdict field, a policy change, or a new request type | `developer.android.com/google/play/integrity/verdicts` | extend the verdict mapping in `services/api` |
| **Expo SDK / app-integrity** | an SDK bump proposal, or a change in `@expo/app-integrity` | `expo.dev/changelog/sdk-58`, npm `@expo/app-integrity` | propose an ADR (D21 locks the SDK) |
| **pnpm** | a new major (v13?) or a change to the supply-chain defaults | `pnpm.io/blog/releases/*` | re-check our `minimumReleaseAge` / `trustPolicy` settings |
| **Supply-chain incidents** | any new registry worm (Mini Shai-Hulud was 2026-05-11; there will be another) | CISA alerts, Socket's tracker, Wiz, Tenable | run `osv-scanner` against the **published** SBOM, list affected versions, rotate secrets |
| **Our own gates** | a CI job that has been red for 7 days, or a scanner that stopped shipping (like gitleaks) | our CI log, the upstream repo | fix or add the second scanner — never lower the bar |
| **Privacy law** | an NZ OPC change (IPP 3A is live since 2026-05-01) or a store policy change | `privacy.org.nz`, Play Console, Apple developer | update the PIA and the two store labels together |

---

## 8. What we could not verify

- **The 6-month star trend for every candidate** — the star *timeline* is 403 with our token; proxies used
  (releases/6 m, commits/90 d, humans/90 d, registry publish dates).
- **Whether the published `op-sqlite` npm artefact ships a SQLCipher build.** The README says SQLCipher is a
  *compilation target*; whether the prebuilt Android/iOS binaries in 18.2.5 include it is **UNVERIFIED** until we
  build one and inspect the APK.
- **Whether `expo-sqlite` in SDK 58 supports SQLCipher** — the flag exists in the Expo docs for earlier SDKs; the
  SDK 58 behaviour is **UNVERIFIED**.
- **`react-native-ssl-pinning`'s New-Architecture status** — the repo is quiet since 2025-07-21 and has no
  New-Architecture branch we could read; **UNVERIFIED**.
- **`github/dependency-review-action`** — the API call failed during the 2026-10-21 run, so its stars, licence,
  last push and release date are **UNVERIFIED**.
- **`Bearer/bearer`'s licence** — the API reports `NOASSERTION`; the file itself was not read. Treat as
  **not permissively licensed** until it is.
- **Median issue first-response time** — not sampled for any card in this file; every "maintenance" claim is
  based on releases, commits and maintainer counts, which are exact.
- **MobSF's detection accuracy on a React Native / Expo New-Architecture APK** — no measurement; the tool is
  widely used but our app shape (Expo prebuild, Nitro modules) is **UNVERIFIED** until we run it.
- **Play Integrity end-to-end** — the token flow, the verdict shape and the blank-verdict behaviour are read from
  Google's documentation; we have **not** run it (it needs a Google Cloud project number and a Play Console
  setup, a founder action).
- **The 2026 campaigns' full package lists** — the numbers in §1.5 (471 artefacts, 1 055 versions, 502 packages)
  are as reported by Socket, SecurityWeek and the Cloud Security Alliance research note on their own trackers and
  **differ between sources**; we have not independently enumerated the affected packages.
- **The exact "Mini Shai-Hulud" CVE identifier** — a Tenable FAQ is titled with **CVE-2026-45321**; we cite the
  article, and we have not verified the CVE record itself.
- **The rate of false positives for any tool** — §4 is **UNVERIFIED** by definition; the seeded corpus does not
  exist yet.
- **Whether our own CI is currently exposed** — the gates listed in `CONSTRAINTS.md` are the *documented* set; we
  have not audited the actual workflow YAML in `.github/workflows/` for unpinned actions, and no git commands were
  run in this task.
- **Corrected by the verifier pass of 2026-10-21 (VERIFICATION-A/B/D.md): 10 cards corrected.**

---

## 9. Corrections to earlier documents

| Claim (2026-10-20/21) | Verified 2026-10-21 | Correction |
|---|---|---|
| `CONSTRAINTS.md` exception **W3** — "pnpm 12 verifies the lockfile against its own supply-chain policy on every install" | pnpm **v12.14.0** is real (release 2026-10-15) and pnpm's docs describe `minimumReleaseAge`, `blockExoticSubdeps`, `allowBuilds` and `trustPolicy` | The claim stands, but the *documented* mechanism to cite is pnpm's own supply-chain page, and pnpm's own doc warns that a scanner reading only the first lockfile document reports "no dependencies, and no vulnerabilities, without failing" — our audit script must read both. |
| `docs/plan/SAAS_CHECKLIST.md` §A Mobile — "certificate pinning for our API" as a checklist item | the only maintained RN pinning library has had no release since **2025-07-21** and is not New-Architecture compatible | Re-frame as a **native config** task (`expo-build-properties` → `networkSecurityConfig` + Android `network_security_config`), not a dependency. |
| `docs/plan/SAAS_CHECKLIST.md` §A Mobile — "obfuscation (R8)" | `expo-build-properties` is **not installed**, so R8 cannot be enabled | Add the plugin as an explicit task. |
| `docs/plan/SAAS_CHECKLIST.md` §A Mobile — "root/emulator/hook detection (signal only, not block CI emulator)" | Play Integrity's own semantics give a **blank** device verdict for emulators and hooked devices | The rule is implementable with **no custom detection code**: treat the blank verdict as the signal. |
| `docs/plan/SAAS_CHECKLIST.md` §A API — "OWASP ASVS L2" | ASVS **5.0.0** (2025-05-30) is the current version; the repo also tags a rolling "Bleeding Edge" | Quote **5.0.0** clause ids in gates. Never quote Bleeding Edge. |
| `docs/plan/SAAS_CHECKLIST.md` §A Infra — "SBOM, signed releases" | we have **no** SBOM generator, **no** signer and **no** pinned CI actions | Three concrete tasks, named in §6.6. |
| `docs/plan/SAAS_CHECKLIST.md` §A API — "rate limits per route/user/IP" | `services/api/pyproject.toml` has **no** rate limiter and `main.py` has no middleware | `slowapi` is the choice; it is a dependency we must add and pin. |
| "the API is protected because it verifies the JWKS" | the **issuer** is optional (`auth_jwt_issuer` defaults to `""`) and the **voice WebSocket is unauthenticated** | Two findings, both in §5 and §6.3. The JWKS verifier itself is sound (fail-closed, 5 s timeout, `kid` refresh, `exp`/`sub`/`aud` required). |
