# Area 4 — CI/CD & OTA for Expo, observability, E2E / visual regression / mutation testing

**Researcher:** Researcher role (V4 §1.2) · **Research date:** 2026-10-20 · **Squad:** Platform / DevOps / Security
**Binding inputs:** `docs/KICKOFF_V4_EN.md` §2 (zero-defect gates), §3, §6.4 (performance budgets), §6.6 (observability), §7 (supply chain: SBOM, signed APK, provenance), §8, §10.3 ("Platform/DevOps/Security: CI/CD, emulator E2E, OTA, observability, SBOM, signed releases"), §12 · `CONSTRAINTS.md`.
**Product rules held in mind:** Maestro E2E on the **CI emulator** (no local emulator — AGENTS.md) · **screenshot diff against approved baselines** · coverage ratchet ≥ 72 % (target 85 %) and ≥ 81 % on the address engine and auth service (target 90 %) · **mutation ≥ 70 %** on those core modules · dependency audit, gitleaks, Semgrep, CodeQL, SBOM (CycloneDX), **signed release APK**, provenance · **no GPL/AGPL in the mobile bundle** (a CI-only tool is not in the bundle, but must be recorded) · GlitchTip for errors, PostHog for privacy-safe product events, **OpenTelemetry traces for the API**, Langfuse for LLM calls · cold start ≤ 2 s, APK ≤ 80 MB.

---

## 0. Method and honest limits

- GitHub facts read **2026-10-20** via `scripts/gh.ps1` (`gh api repos/<o>/<r>`, `gh api repos/<o>/<r>/security-advisories`, `gh api repos/<o}/{r}/license`, `gh api repos/<o>/<r>/readme`, `gh api repos/<o>/<r>/contents/...`, `gh api repos/<o>/<r>/commits?per_page=20`, `gh search repos`).
- npm facts from `registry.npmjs.org` + `api.npmjs.org/downloads/point/last-month` (2026-09-19 → 2026-10-19).
- **6-month star trend: UNVERIFIED for every candidate** (token has no `stargazer` scope → HTTP 403 / GraphQL FORBIDDEN). Momentum proxy used: releases in 2026-04-20→2026-10-20, commits in 90 days, distinct non-bot maintainers in 90 days.
- Issue counts include pull requests. Repo licences are read from the LICENSE file where the API says `NOASSERTION`.
- **No CI pipeline was executed and no emulator was run** in this sprint (the Researcher role does not have a runner; AGENTS.md forbids a local Android emulator) → **every performance and timing figure below is UNVERIFIED.**

---

## 1. Queries run (V4 §12.2)

| # | Query string | Sort |
|---|---|---|
| A4-01 | `topic:maestro` | stars |
| A4-02 | `topic:opentelemetry stars:>100 pushed:>2026-04-01` | stars |
| A4-03 | `topic:mutation-testing` | stars |
| A4-04 | `topic:postHog` | stars |
| A4-05 | `topic:langfuse` | stars |
| A4-06 | `topic:visual-regression-testing` | stars |
| A4-07 | `glitchtip in:name` | stars |
| A4-08 | `topic:e2e-testing stars:>200 pushed:>2026-04-01` | stars |
| A4-09 | `expo ota update in:name,description stars:>20` | stars |
| A4-10 | `topic:expo topic:ci-cd stars:>20` | stars |
| A4-11 | `sentry sentry-glitchtip self-hosted in:name,description stars:>50` | stars |
| A4-12 | `sbom cyclonedx sigstore in:name,description stars:>50` | stars |

API calls: `repos/{o}/{r}` × 42 · `repos/{o}/{r}/security-advisories` × 10 · `repos/{o}/{r}/readme` × 7 · `repos/{o}/{r}/commits?per_page=20` × 6 · `repos/{o}/{r}/contents/expo-updates/README.md` × 1 · npm registry × 24 · npm downloads × 6.

---

## 2. Evidence cards — 46 candidates (V4 §12.3)

Legend: `Rel/6m` = releases in the 6 months to 2026-10-20 · `c90` = commits/90 d · `maint` = non-bot authors/90 d · `adv` = GitHub advisories · `dl30` = npm downloads 2026-09-19→2026-10-19.

### 2.1 Expo, CI/CD, OTA, release engineering

| # | Repo | ★ | Created | Pushed | Last release | Rel/6m | Open/Closed | c90 | maint | Licence | Size KB | adv | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [expo/expo](https://github.com/expo/expo) | 52,869 | 2016-08-15 | 2026-10-20 | expo-template-tabs@58.0.25 @2026-10-19 | 15+ | 328/19509 | 2161 | 33 | MIT | 3,826,161 | 0 | **ADOPT (SDK 58, current)** |
| 2 | [expo/eas-cli](https://github.com/expo/eas-cli) | 1,370 | 2020-08-12 | 2026-10-20 | v25.2.0 @2026-10-17 | 15+ | 262/1159 | 483 | 16 | MIT | 40,371 | 0 | **ADOPT** (`eas-cli@25.2.0`) |
| 3 | [expo/expo-github-action](https://github.com/expo/expo-github-action) | 1,030 | 2018-12-15 | 2026-10-20 | 9.0.0 @2026-06-02 | 1 | 40/97 | 0 | 0 | MIT | 36,402 | 0 | WATCH (low activity in window) |
| 4 | [expo/custom-expo-updates-server](https://github.com/expo/custom-expo-updates-server) | 537 | 2021-04-26 | 2025-11-05 | none | 0 | 0/0 | 0 | 0 | MIT | 13,789 | 0 | WATCH (self-hosted OTA reference; **stale since 2025-11-05**) |
| 5 | [fastlane/fastlane](https://github.com/fastlane/fastlane) | 42,266 | 2014-12-02 | 2026-10-19 | 2.241.1 @2026-10-15 | 12 | 521/12833 | 220 | 6 | MIT | 86,453 | 0 | WATCH (Ruby toolchain; store metadata automation) |
| 6 | [renovatebot/renovate](https://github.com/renovatebot/renovate) | 22,807 | 2016-12-17 | 2026-10-20 | 44.171.3 @2026-10-20 | 15+ | 1008/6015 | 1554 | 8 | **AGPL-3.0** (CI-only, not shipped) | 166,762 | 0 | **ADOPT (CI only)** |
| 7 | [google-github-actions/auth](https://github.com/google-github-actions/auth) | 1,405 | 2021-09-16 | 2026-07-29 | v3 @2025-09-03 | 0 | 8/217 | 1 | 1 | Apache-2.0 | 2,431 | 0 | **ADOPT (OIDC for CI)** |
| 8 | [sigstore/cosign](https://github.com/sigstore/cosign) | 6,374 | 2021-02-04 | 2026-10-19 | v3.1.3 @2026-08-06 | 5 | 110/1117 | 68 | 22 | Apache-2.0 | 27,001 | 0 | **ADOPT (sign the APK + attest)** |
| 9 | [anchore/syft](https://github.com/anchore/syft) | 9,703 | 2020-05-07 | 2026-10-19 | v1.55.0 @2026-10-19 | 14 | 516/1093 | 197 | 27 | Apache-2.0 | 26,715 | 0 | **ADOPT (SBOM / CycloneDX)** |
| 10 | [anchore/grype](https://github.com/anchore/grype) | 13,055 | 2020-05-26 | 2026-10-19 | v0.121.0 @2026-10-19 | 13 | 329/926 | 109 | 23 | Apache-2.0 | 10,852 | 0 | **ADOPT (OSV vulnerability scan)** |
| 11 | [ossf/scorecard](https://github.com/ossf/scorecard) | 5,769 | 2020-10-09 | 2026-10-19 | v5.6.0 @2026-10-12 | 2 | 401/887 | 61 | 10 | Apache-2.0 | 386,170 | 0 | **ADOPT (supply-chain gate)** |
| 12 | [slsa-framework/slsa-github-generator](https://github.com/slsa-framework/slsa-github-generator) | 604 | 2022-03-28 | 2026-08-07 | v2.1.0 @2025-02-24 | 0 | 261/2899 | 1 | 1 | Apache-2.0 | 39,466 | 0 | WATCH (near-dormant; cosign attestations are simpler) |
| 13 | [step-security/secure-repo](https://github.com/step-security/secure-repo) | 333 | 2021-10-12 | 2026-09-10 | v1.12.9 @2026-09-10 | 9 | 71/1095 | 31 | 2 | **AGPL-3.0** (CI-only) | 18,578 | 0 | WATCH (CI-only) |

### 2.2 E2E, visual regression, mutation testing

| # | Repo | ★ | Created | Pushed | Last release | Rel/6m | Open/Closed | c90 | maint | Licence | Size KB | adv | dl30 | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 14 | [mobile-dev-inc/Maestro](https://github.com/mobile-dev-inc/Maestro) | 16,138 | 2022-03-31 | 2026-10-19 | cli-2.11.0 @2026-09-29 | 9 | 333/1183 | 69 | 14 | Apache-2.0 | 1,064,792 | 0 | UNVERIFIED (npm `maestro@2.1.1` is the legacy channel) | **ADOPT (locked E2E)** |
| 15 | [devicelab-dev/maestro-runner](https://github.com/devicelab-dev/maestro-runner) | 512 | 2026-01-16 | 2026-10-20 | v1.1.29 @2026-10-15 | 15+ | 8/138 | 537 | 4 | Apache-2.0 | 45,038 | 0 | UNVERIFIED | WATCH (fast 2026 challenger) |
| 16 | [devicelab-dev/maestro-ios-device](https://github.com/devicelab-dev/maestro-ios-device) | 103 | 2025-12-03 | 2026-09-18 | v0.0.0-4034362 @2026-02-11 | 0 | 6/3 | 1 | 1 | Apache-2.0 | 65,951 | 0 | UNVERIFIED | WATCH (iOS runner) |
| 17 | [microsoft/playwright](https://github.com/microsoft/playwright) | 98,129 | 2019-11-15 | 2026-10-20 | v1.64.1 @2026-10-14 | 8 | 171/18124 | 699 | 7 | Apache-2.0 | 245,490 | 0 | 293,935,238 (`@playwright/test`) | **ADOPT (web E2E + Lighthouse runs)** |
| 18 | [callstack/agent-device](https://github.com/callstack/agent-device) | 5,078 | 2026-01-30 | 2026-10-20 | v0.21.28 @2026-10-15 | 15+ | 71/955 | 1623 | 7 | MIT | 218,611 | 0 | UNVERIFIED | WATCH (2026 category: mobile automation for AI agents) |
| 19 | [alumnium-hq/alumnium](https://github.com/alumnium-hq/alumnium) | 1,017 | 2024-10-28 | 2026-10-20 | 0.24.0-alpha.4 @2026-10-19 | 15+ | 6/84 | 277 | 7 | MIT | 126,688 | 0 | UNVERIFIED | WATCH (AI-agent E2E, alpha) |
| 20 | [enzomanuelmangano/ennio](https://github.com/enzomanuelmangano/ennio) | 226 | 2026-05-03 | 2026-06-19 | v0.1.3 @2026-06-18 | 12 | 5/0 | 0 | 0 | MIT | 9,858 | 0 | UNVERIFIED | WATCH (Maestro-compatible runner, early) |
| 21 | [reg-viz/reg-cli](https://github.com/reg-viz/reg-cli) | 426 | 2016-12-04 | 2026-10-19 | 0.19.0-rc3 @2026-09-24 | 5 | 17/42 | 17 | 2 | MIT | 93,009 | 0 | UNVERIFIED | **ADOPT (self-hosted image diff)** |
| 22 | [argos-ci/argos](https://github.com/argos-ci/argos) | 643 | 2016-12-15 | 2026-10-17 | no GitHub releases | 0 | 0/393 | 764 | 2 | MIT | 80,888 | **1 critical** | UNVERIFIED | WATCH (hosted; **critical advisory** — see §4.5) |
| 23 | [lost-pixel/lost-pixel](https://github.com/lost-pixel/lost-pixel) | 1,679 | 2021-12-20 | 2026-04-22 | v3.22.0 @2024-11-14 | 0 | 43/58 | 0 | 0 | MIT | 37,969 | 0 | UNVERIFIED | REJECT (**archived**) |
| 24 | [sherlo-io/sherlo](https://github.com/sherlo-io/sherlo) | 83 | 2024-03-05 | 2026-10-20 | 2.0.2 @2026-08-05 | 3 | 0/0 | 13 | 2 | MIT | 361,212 | 0 | UNVERIFIED | WATCH (RN visual regression, hosted) |
| 25 | [storybookjs/storybook](https://github.com/storybookjs/storybook) | 91,343 | 2016-03-18 | 2026-10-20 | v11.0.0-alpha.7 @2026-10-20 | 15+ | 1572/13097 | 4422 | 15 | MIT | 1,135,311 | 0 | UNVERIFIED | WATCH (component workshop for the web dashboard) |
| 26 | [tajo/ladle](https://github.com/tajo/ladle) | 2,991 | 2020-07-14 | 2026-06-28 | @ladle/react@5.1.1 @2025-11-04 | 0 | 36/199 | 0 | 0 | MIT | 26,034 | 0 | UNVERIFIED | REJECT (no commits in 90 d) |
| 27 | [stryker-mutator/stryker-js](https://github.com/stryker-mutator/stryker-js) | 3,253 | 2016-02-12 | 2026-10-10 | v10.0.0 @2026-08-14 | 1 | 88/1211 | 54 | 5 | Apache-2.0 | 139,844 | 0 | 11,969 (`stryker` meta-package) | **ADOPT (JS/TS mutation — locked)** |
| 28 | [boxed/mutmut](https://github.com/boxed/mutmut) | 1,494 | 2016-11-13 | 2026-10-19 | 3.8.0 @2026-09-12 | 1 | 53/294 | 25 | 12 | BSD-3-Clause | 1,664 | 0 | UNVERIFIED (not on npm) | **ADOPT (Python mutation — locked)** |
| 29 | [sixty-north/cosmic-ray](https://github.com/sixty-north/cosmic-ray) | 661 | 2015-04-18 | 2026-10-15 | release/v8.7.0 @2026-08-09 | 1 | 48/337 | 14 | 7 | MIT | 3,001 | 0 | UNVERIFIED | WATCH (Python mutation alternative) |
| 30 | [mutpy/mutpy](https://github.com/mutpy/mutpy) | 369 | 2017-07-26 | 2024-04-23 | v0.6.1 @2019-11-17 | 0 | 26/13 | 0 | 0 | NOASSERTION | 291 | 0 | UNVERIFIED | REJECT (dormant) |
| 31 | [wix/Detox](https://github.com/wix/Detox) | 12,040 | 2016-06-15 | 2026-10-19 | 20.51.3 @2026-05-30 | 3 | 203/2755 | 0 | 0 | MIT | 77,294 | 0 | UNVERIFIED (`detox@20.51.4`) | WATCH (Maestro is our locked choice) |
| 32 | [appium/appium](https://github.com/appium/appium) | 22,108 | 2013-01-09 | 2026-10-20 | appium@4.0.0-beta.5 @2026-10-18 | 15+ | 40/13985 | 268 | 8 | Apache-2.0 | 265,537 | 0 | UNVERIFIED (`appium@3.8.0`) | WATCH (cross-platform, heavier) |
| 33 | [wataru-maeda/react-native-boilerplate](https://github.com/wataru-maeda/react-native-boilerplate) | 520 | 2018-06-02 | 2026-10-18 | v6.1.0 @2026-10-18 | 2 | 0/8 | 3 | 1 | MIT | 10,060 | 0 | UNVERIFIED | WATCH (Expo SDK 58 + Maestro reference) |

### 2.3 Observability — errors, product analytics, LLM tracing, traces

| # | Repo | ★ | Created | Pushed | Last release | Rel/6m | Open/Closed | c90 | maint | Licence | Size KB | adv | dl30 | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 34 | [getsentry/sentry-javascript](https://github.com/getsentry/sentry-javascript) | 8,763 | 2012-02-01 | 2026-10-20 | 11.8.0 @2026-10-15 | 15+ | 421/9219 | 1624 | 20 | **MIT** (LICENSE file) | 281,040 | 0 | UNVERIFIED (`@sentry/node@11.8.0`) | **ADOPT (API errors) — or GlitchTip** |
| 35 | [getsentry/sentry-react-native](https://github.com/getsentry/sentry-react-native) | 1,824 | 2016-11-30 | 2026-10-20 | 8.31.0 @2026-10-15 | 15+ | 124/2432 | 313 | 5 | MIT | 106,807 | **1 low** (Expo-plugin token leak, patched ≥ 5.19.1) | 15,216,644 | **ADOPT (mobile errors)** |
| 36 | [burke-software/GlitchTip](https://github.com/burke-software/GlitchTip) | 193 | 2021-02-15 | 2026-02-10 | none | 0 | 0/0 | 0 | 0 | MIT (23 KB **mirror**) | 23 | 0 | UNVERIFIED | **ADOPT the service — canonical repo is GitLab** |
| 37 | [PostHog/posthog](https://github.com/PostHog/posthog) | 40,357 | 2020-01-23 | 2026-10-20 | agent-skills-v0.3430.0 @2026-10-20 | 15+ | 3786/7794 | 17020 | 29 | MIT core + **EE folders** | 8,156,473 | 0 | UNVERIFIED | **ADOPT (self-hosted product analytics)** |
| 38 | [PostHog/posthog-js](https://github.com/PostHog/posthog-js) | 633 | 2020-02-07 | 2026-10-20 | @posthog/ai@8.14.2 @2026-10-19 | 15+ | 113/881 | 1046 | 18 | MIT | 123,125 | 0 | UNVERIFIED | **ADOPT (web)** |
| 39 | [PostHog/posthog-android](https://github.com/PostHog/posthog-android) | 92 | 2020-04-29 | 2026-10-20 | server-v2.21.3 @2026-10-19 | 15+ | 39/109 | 238 | 11 | MIT | 6,626 | 0 | UNVERIFIED | **ADOPT (mobile)** |
| 40 | [PostHog/posthog-ios](https://github.com/PostHog/posthog-ios) | 119 | 2020-04-22 | 2026-10-20 | 3.92.0 @2026-10-10 | 15+ | 40/185 | 227 | 9 | MIT | 104,411 | 0 | UNVERIFIED | WATCH (iOS later) |
| 41 | [langfuse/langfuse](https://github.com/langfuse/langfuse) | 36,070 | 2023-05-18 | 2026-10-20 | v4.64.0 @2026-10-19 | 15+ | 332/2838 | 2267 | 18 | MIT core + **EE (ClickHouse Inc.)** | 251,171 | 0 | UNVERIFIED | **ADOPT (self-hosted LLM tracing)** |
| 42 | [langfuse/langfuse-python](https://github.com/langfuse/langfuse-python) | 502 | 2023-07-17 | 2026-10-20 | v5.0.3 @2026-10-20 | 15+ | 14/39 | 92 | 11 | MIT | 10,304 | 0 | UNVERIFIED | **ADOPT (Python API)** |
| 43 | [langfuse/langfuse-js](https://github.com/langfuse/langfuse-js) | 175 | 2023-07-02 | 2026-10-20 | v6.0.1 @2026-10-19 | 15+ | 10/16 | 65 | 9 | NOASSERTION | 5,338 | 0 | UNVERIFIED (`@langfuse/core@6.0.1`) | WATCH (we are a Python API) |
| 44 | [open-telemetry/opentelemetry-js](https://github.com/open-telemetry/opentelemetry-js) | 3,495 | 2019-05-10 | 2026-10-19 | v2.12.0 @2026-10-06 | 15+ | 158/2239 | 176 | 24 | Apache-2.0 | 103,028 | 0 | UNVERIFIED (`@opentelemetry/api@1.9.1`, `sdk-trace-base@2.12.0`) | **ADOPT (API traces)** |
| 45 | [open-telemetry/opentelemetry-collector](https://github.com/open-telemetry/opentelemetry-collector) | 7,677 | 2019-05-09 | 2026-10-20 | v0.163.0 @2026-10-14 | 14 | 629/3351 | 318 | 33 | Apache-2.0 | 77,828 | 0 | UNVERIFIED | **ADOPT (collector)** |
| 46 | [SigNoz/signoz](https://github.com/SigNoz/signoz) | 32,398 | 2021-01-03 | 2026-10-20 | v0.146.0 @2026-10-14 | 15+ | 1137/3296 | 502 | 18 | NOASSERTION | 126,211 | 0 | UNVERIFIED | WATCH (all-in-one OTel backend) |
| 47 | [hyperdxio/hyperdx](https://github.com/hyperdxio/hyperdx) | 9,959 | 2023-09-13 | 2026-10-20 | @hyperdx/app@2.41.0 @2026-10-13 | 15+ | 139/399 | 450 | 25 | MIT | 64,905 | 0 | UNVERIFIED | WATCH |
| 48 | [pydantic/logfire](https://github.com/pydantic/logfire) | 4,518 | 2024-04-23 | 2026-10-20 | v5.2.0 @2026-10-13 | 15+ | 135/519 | 326 | 32 | MIT | 104,660 | 0 | UNVERIFIED | WATCH (OTel-native, Python-first) |
| 49 | [traceloop/openllmetry](https://github.com/traceloop/openllmetry) | 7,501 | 2023-09-02 | 2026-10-19 | 0.62.4 @2026-09-29 | 6 | 159/295 | 23 | 9 | Apache-2.0 | 64,342 | 0 | UNVERIFIED | WATCH (OTel-native LLM spans → Langfuse) |
| 50 | [grafana/grafana](https://github.com/grafana/grafana) | 77,397 | 2013-12-11 | 2026-10-20 | v12.4.13 @2026-10-13 | 15+ | 2614/42910 | 3447 | 51 | **AGPL-3.0** (self-hosted service, not shipped) | 2,067,881 | 0 | UNVERIFIED | WATCH (heavy; OTel-native) |

**Licence discipline note (CONSTRAINTS.md):** "no GPL/AGPL in the mobile bundle" — `renovate`, `step-security/secure-repo`, `grafana` are **CI or self-hosted services**, never bundled into the APK, so they do not violate the rule; they must still be recorded in `docs/LICENSES.md`. Nothing in this area introduces a copyleft dependency into the shipped app.

---

## 3. Shortlist (15) — better than our current choice, risks, decision

| Candidate | Better than our current choice | Risk | Decision + reason |
|---|---|---|---|
| `mobile-dev-inc/Maestro` | Already our E2E tool; **it has `assertScreenshot`** (commit 2026-10-16) → visual regression can live in the same flow as the E2E test, with no second tool and no hosted vendor | Apache-2.0 CLI; `npm maestro@2.1.1` is a **legacy** channel — the current distribution is the `cli-2.11.0` release binary | **ADOPT / KEEP** — one tool for E2E + screenshot diff. Pin the CLI version in CI. |
| `devicelab-dev/maestro-runner` | 537 commits/90 d, 15+ releases/6 m, Go, Apache-2.0, created 2026-01-16 — a faster, modern runner | 512 ★, 4 maintainers | **WATCH** |
| `microsoft/playwright` | Web E2E **and** the runner for our Lighthouse CI job (playwright can drive the Lighthouse CI container) | 2.4 GB browsers in CI | **ADOPT** |
| `reg-viz/reg-cli` | Self-hosted, MIT, no vendor, no image upload of customer data — the right privacy posture for a courier app | Needs us to store baselines and diffs | **ADOPT** (visual diff) |
| `argos-ci/argos` | Nice review UX | **Critical advisory** GHSA-jw2w-wr3r-jp8w: "Anonymous cross-tenant build injection + GitHub status spoof via forged tokenless-github bearer"; hosted = our screenshots leave the country | **WATCH**, and only after the advisory is confirmed fixed |
| `sherlo-io/sherlo` | Purpose-built for React Native visual regression | 83 ★, hosted service (screenshots leave the device) | **WATCH** |
| `stryker-mutator/stryker-js` | Our locked JS mutation tool; v10.0.0 (2026-08-14), 5 maintainers, vitest-runner support | 1 release/6 m — slow | **ADOPT / KEEP** (V4 §2, CONSTRAINTS.md) |
| `boxed/mutmut` | Our locked Python mutation tool; 3.8.0 (2026-09-12), 12 maintainers, 25 commits/90 d | not on npm → install from source/pip | **ADOPT / KEEP** |
| `expo/expo` + `expo-updates` | OTA updates are **part of the SDK we already use**; `expo-updates@58.0.17` matches `expo@58.0.16` | OTA is a runtime behaviour change on drivers' phones → must be channel-guarded and rollback-able | **ADOPT** — channels: `production` (stable) and `preview` (internal); rollback on every release |
| `expo/custom-expo-updates-server` | The reference implementation of the Expo Update protocol (MIT) if we ever self-host OTA | **Stale: last push 2025-11-05, 0 commits/90 d** | **WATCH** — do not self-host OTA on this alone |
| `sigstore/cosign` + `anchore/syft` + `anchore/grype` + `ossf/scorecard` | Exactly the V4 §7 supply-chain chain: SBOM → sign → scan → score | none material | **ADOPT all four** |
| `getsentry/sentry-react-native` | 15.2 M dl/30 d; **verified on Expo SDK 58 / RN 0.88** (commits 2026-10-20) | 1 low advisory (Expo plugin token leak, patched ≥ 5.19.1) | **ADOPT** |
| GlitchTip (GitLab canonical) | Self-hosted, Sentry-compatible → driver audio/PII never leaves our infrastructure | The GitHub "mirror" is **not** the product (23 KB); the real repo is on GitLab | **ADOPT the service; document the GitLab source of truth** |
| `PostHog/posthog` + `posthog-android` + `posthog-js` | Self-hostable product analytics with a **feature-flag / session-replay** surface; the Android SDK ships `server-v2.21.3` on 2026-10-19 | EE folders are not MIT; self-hosting is heavy | **ADOPT (self-hosted)** for privacy-safe events |
| `langfuse/langfuse` + `langfuse-python` | Self-hosted LLM tracing for our voice/LLM path (V4 §6.6) | heavy to self-host (ClickHouse) | **ADOPT** (self-hosted) |
| `open-telemetry/opentelemetry-js` + collector | Vendor-neutral traces for the API; `sdk-trace-base@2.12.0` | needs a backend | **ADOPT** |

---

## 4. Deep review — top 5 (V4 §12.4)

### 4.1 `mobile-dev-inc/Maestro` (16,138 ★, Apache-2.0)
- **README / docs:** "Maestro is an open-source framework that makes UI and end-to-end testing for Android, iOS, and web apps simple and fast"; a community Discord and a `maestro.dev` docs site.
- **Architecture:** YAML flows, a CLI orchestrator, platform drivers (Android driver APKs, an iOS simulator server), and a "workspace" concept for multi-app flows.
- **Last 20 commits (2026-10-05 → 2026-10-16) — these are exactly our CI problems:**
  - `fix(orchestra): stop assertScreenshot from crashing workspace validation` (2026-10-16) → **Maestro has a native `assertScreenshot` command**;
  - `fix(android): bound the emulator boot-wait so start-device can't hang forever` (2026-10-16) → emulator boot hangs are a known failure mode they now bound;
  - `fix(android): type without waiting for window animations` (2026-10-15) → removes flakiness from animation timing;
  - `fix(ios): start simulators on Xcode 27, which ships without Simulator.app` (2026-10-08);
  - `chore: update Android driver APKs` (2026-10-15) — drivers are versioned with the CLI;
  - `Report invalid numeric field values as test errors` (2026-10-05) — better failure messages.
- **API ergonomics:** declarative YAML (`appId:`, `---`, `launchApp`, `tapOn`, `assertVisible`, `takeScreenshot`, `assertScreenshot`), `testID` targeting, JS in flows for logic. Matches our "Maestro E2E for every user-facing flow" gate.
- **Extensibility:** the iOS simulator server and the Android driver APKs are released alongside the CLI, so the CLI and the drivers stay in step.
- **Tests / CI:** the repo has its own integration suites; coverage % UNVERIFIED.
- **Open issues:** 333 open (includes PRs) — the largest backlog of the candidates; individual critical issues not triaged → UNVERIFIED.
- **Performance claims:** none published for our flows → UNVERIFIED.
- **Security:** 0 advisories on the repo.
- **Verdict:** **ADOPT / KEEP.** Use `assertScreenshot` for the design gate (day/night, small/large, 200 % text) — that removes the need for a hosted visual-regression vendor and keeps driver screenshots inside our CI. Pin the CLI to the `cli-2.11.0` release (the npm `maestro@2.1.1` package is a legacy channel).

### 4.2 `expo/expo` + `expo-updates` (52,869 ★, MIT, `expo@58.0.16`, `expo-updates@58.0.17`)
- **README (read directly from `packages/expo-updates/README.md`):** "The `expo-updates` module enables your app to manage remote updates to your application code. This module works with a server that implements the Expo Update protocol. The **EAS Update hosted service** implements this protocol. To build a custom server that implements the protocol, see the example server source code here" → the repo points at `expo/custom-expo-updates-server`.
- **Docs:** the SDK docs index (`docs/pages/versions/unversioned/sdk/`) lists **`updates.mdx`** alongside `fingerprint.mdx`, `haptics.mdx`, `reanimated.mdx`, `flash-list.mdx`, `gesture-handler.mdx`, `skia.mdx`, `stripe.mdx`, `symbols.mdx` — i.e. the whole toolchain we depend on is versioned together with SDK 58.
- **Architecture:** a runtime that checks a manifest on launch, downloads a new bundle, verifies it with a code-signing certificate, and swaps it in; **channels** decide which manifest a device sees; `expo/fingerprint` identifies the binary for differential updates (`@expo/fingerprint@0.21.5`).
- **Last 20 commits:** `[docs] Note that workflow update jobs can't publish to protected channels` (2026-10-19) — a real OTA-safety rule for CI; `[observe] Add a react-native-reanimated integration for errors and warnings` (2026-10-19); `[core][iOS] Reduce the overhead of creating JS objects for shared objects` (2026-10-19) — a cold-start-relevant perf fix.
- **Code quality:** 2,161 commits/90 d, 33 human maintainers, Conventional Commits with scope prefixes (`[ui][android]`, `[core][iOS]`, `[observe]`), and an `[agents]` lane that keeps agent docs in step with the code.
- **Tests:** the monorepo runs its own suites; coverage % UNVERIFIED.
- **Security:** 0 advisories on the repo. OTA risk is **ours**, not the library's: a bad JS bundle can reach every driver. Mitigations: signed updates (code-signing certificate), **two channels only** (`production`, `preview`), a runtime flag per release, and an immediate rollback path (publish the previous known-good update to `production`).
- **Risk:** self-hosting OTA means owning the update protocol; the reference server has had **no commits since 2025-11-05** → do not self-host yet.
- **Verdict:** **ADOPT** — SDK 58 is current (`expo@58.0.16`, `expo-updates@58.0.17`), OTA via EAS Update with the two-channel rule above.

### 4.3 `microsoft/playwright` (98,129 ★, Apache-2.0, `@playwright/test@1.64.1`)
- **README / docs:** "a framework for Web Testing and Automation… test across all browsers"; 293.9 M npm downloads/30 d — the most-installed test runner on npm.
- **Architecture:** a browser-automation server per browser, a test runner with projects/fixtures/trace/screenshot artefacts, and a first-class **trace viewer** that records the DOM, network and console for a failure.
- **API ergonomics:** `expect(locator).toHaveText()`, auto-waiting, `page.route` for stubbing, `storageState` for auth reuse.
- **Extensibility:** **we can run Lighthouse CI against a Playwright-started server**, so the Lighthouse ≥ 95 gate becomes a normal Playwright project rather than a separate script.
- **Last 20 commits / maintenance:** 699 commits/90 d, 7 maintainers, v1.64.1 on 2026-10-14.
- **Tests / CI:** the project dogfoods Playwright on itself; coverage % UNVERIFIED.
- **Security:** 0 advisories on the repo.
- **Risks:** browser downloads in CI (use the official container image); a heavy dependency for a small web app — keep it to the dashboard E2E + Lighthouse.
- **Verdict:** **ADOPT** for the web dashboard E2E and the Lighthouse job. **Not** for the mobile app (Maestro owns that).

### 4.4 `getsentry/sentry-react-native` (1,824 ★, MIT, `8.31.0`, 15.2 M dl/30 d)
- **README / docs:** the official Sentry RN SDK; the Expo sample app and a `sentry-expo` plugin are documented.
- **Architecture:** native iOS/Android SDKs + JS layer; JS errors, native crashes, ANRs, session replay (opt-in) and performance traces; sourcemap upload handled by the Expo plugin (`@sentry/cli`).
- **Last 20 commits:** `chore(e2e): Update Expo sample to SDK 58` (2026-10-20) and `chore(e2e): Bump E2E tests to React Native 0.88.0` (2026-10-19) → **Expo SDK 58 / RN 0.88 verified today**. Also `fix(ios): Find .xcode.env in the debug symbols phase under SwiftPM` (2026-10-19) — a real symbolication fix.
- **Security:** one **low** advisory — GHSA-68c2-4mpx-qh95, "Potential leakage of Sentry auth tokens by React Native SDK with Expo plugin", patched ≥ 5.19.1; we are on 8.31.0 → fixed, but the Expo plugin's token handling must be configured with a **public** DSN only and no auth token in the client.
- **Supply chain:** 16 peer dependencies including `@sentry/cli` (build-time) and `@sentry/expo-upload-sourcemaps` — both build-time; neither should end up in the runtime path of a driver.
- **Performance:** the SDK adds startup cost; measure cold start (budget ≤ 2 s) with and without it → UNVERIFIED.
- **Verdict:** **ADOPT** for mobile errors, **or** point the same SDK at **GlitchTip** (Sentry-compatible) to keep driver data in-house. Given V4 §6.6 names GlitchTip and the NZ Privacy Act, **prefer GlitchTip as the backend and the Sentry SDK as the client**.

### 4.5 `argos-ci/argos` (643 ★, MIT) — and why we are not adopting it
- **README / docs:** "Argos, the open source visual testing platform for teams and AI agents".
- **Architecture:** a self-hostable service (web app + API) that ingests builds, diffs images and presents a review UI; commits show team invites, auth-header scheme validation, and payload limits.
- **Maintenance:** 764 commits/90 d, 2 maintainers, very active, but **no GitHub releases published** (tags only) → version pinning is awkward.
- **Security — the decisive point:** the repo carries a **critical** advisory, GHSA-jw2w-wr3r-jp8w: "**Anonymous cross-tenant build injection + GitHub status spoof via forged tokenless-github- bearer**", patched at commit `9cd9955`. For a product that screenshots a courier's screen — with customer names, addresses and prices on it — a cross-tenant build-injection flaw in the tool that stores those screenshots is disqualifying until it is independently confirmed fixed and we are self-hosting it.
- **Verdict:** **WATCH, do not adopt.** Use Maestro `assertScreenshot` + `reg-cli` instead: both keep the images in our own CI artefacts.

---

## 5. Benchmarks (V4 §12.5) — all UNVERIFIED; sets named

| # | Benchmark | Candidates | Metric | Target | Status | Set to build |
|---|---|---|---|---|---|---|
| C1 — E2E flow time | Maestro vs maestro-runner vs Detox | minutes for the 6 driving flows on the CI emulator | ≤ 15 min per PR | **UNVERIFIED** | `docs/squads/platform/benchmarks/maestro-flow-time/` |
| C2 — Emulator stability | current CI config vs bounded boot-wait | failed runs / 50 runs | 0 flakes | **UNVERIFIED** | `docs/squads/platform/benchmarks/emulator-flakes/` |
| C3 — Visual diff | Maestro `assertScreenshot` vs reg-cli | baseline match rate on the 4 required views (day/night × small/large) | 100 % deterministic, < 1 % false positive | **UNVERIFIED** | `docs/squads/platform/benchmarks/visual-diff/` |
| C4 — 200 % text | Maestro screenshot at 200 % | clipping on Today's list / Dictation report | 0 clipping | **UNVERIFIED** | `docs/squads/platform/benchmarks/dynamic-type/` |
| C5 — Mutation throughput | Stryker vs mutmut | wall-clock per PR on the address engine + auth service | ≤ 10 min, score ≥ 70 % | **UNVERIFIED** | `docs/squads/platform/benchmarks/mutation/` |
| C6 — OTA rollout | EAS Update channel publish | time from publish to device, rollback time | < 60 s to devices, rollback < 5 min | **UNVERIFIED** | `docs/squads/platform/benchmarks/ota-rollout/` |
| C7 — Cold start | with/without Sentry, with/without PostHog | cold start on the mid-range Android profile | ≤ 2 s | **UNVERIFIED** | `docs/squads/platform/benchmarks/cold-start/` |
| C8 — APK size | with/without the observability SDKs | release APK | ≤ 80 MB | **UNVERIFIED** | `docs/squads/platform/benchmarks/apk-size/` |
| C9 — SBOM + sign | syft → grype → cosign | SBOM completeness, signature verify | 0 unsigned, 0 high/critical | **UNVERIFIED** | `docs/squads/platform/benchmarks/supply-chain/` |

---

## 6. Decisions for the Platform / DevOps / Security squad

**ADOPT**
1. `mobile-dev-inc/Maestro` — keep as the single mobile E2E tool, and use its **`assertScreenshot`** for the design gate. Pin the CLI release (`cli-2.11.0`).
2. `microsoft/playwright@1.64.1` — web E2E **and** the Lighthouse CI runner for the dashboard (≥ 95 gate).
3. `reg-viz/reg-cli` — self-hosted image diff for the approved baselines; no screenshot ever leaves our CI.
4. `stryker-mutator/stryker-js` (v10.0.0) — JS/TS mutation, locked by CONSTRAINTS.md.
5. `boxed/mutmut` (3.8.0) — Python mutation for `apps/api/app`, locked by CONSTRAINTS.md.
6. `expo/expo@58.0.16` + `expo-updates@58.0.17` + `@expo/fingerprint@0.21.5` — OTA; **two channels only** (`production`, `preview`); rollback documented; signed updates.
7. `expo/eas-cli@25.2.0` — build, submit, credentials.
8. `getsentry/sentry-react-native@8.31.0` — the mobile error SDK (verified on SDK 58 / RN 0.88); **DSN only, no auth token in the client**.
9. **GlitchTip** as the error backend (Sentry-compatible, self-hosted) — canonical source is GitLab, the GitHub repo is a mirror. Record in `docs/LICENSES.md`.
10. `PostHog/posthog` + `posthog-android` + `posthog-js` — self-hosted product events (privacy-safe, no PII).
11. `langfuse/langfuse` + `langfuse-python` — self-hosted LLM tracing for the voice path.
12. `open-telemetry/opentelemetry-js` (`@opentelemetry/api@1.9.1`, `sdk-trace-base@2.12.0`, `exporter-trace-otlp-proto@0.223.0`) + `opentelemetry-collector` (v0.163.0) — API traces.
13. Supply chain: `anchore/syft@1.55.0` (CycloneDX SBOM) → `anchore/grype@0.121.0` (OSV scan) → `sigstore/cosign@3.1.3` (sign + attest the APK) → `ossf/scorecard@5.6.0` (repo scorecard) → `google-github-actions/auth@v3` (OIDC).
14. `renovatebot/renovate` (44.171.3) — dependency updates with the CI gate (CI-only, AGPL is fine here; record it).

**KEEP**
15. `fastlane` (2.241.1) — store metadata and release notes automation for the Play/App stores.
16. `wataru-maeda/react-native-boilerplate` — the closest reference to our own CI shape (Expo SDK 58 + Maestro).

**WATCH**
17. `devicelab-dev/maestro-runner` / `maestro-ios-device` — the 2026 Maestro-compatible runner challengers.
18. `callstack/agent-device` (5,078 ★, created 2026-01-30, 1,623 commits/90 d) and `alumnium-hq/alumnium` — a **new 2026 category**: mobile verification driven by AI agents. Our QA role could use these to re-check flows automatically.
19. `sherlo-io/sherlo` — RN visual regression, hosted; only if self-hosting reg-cli proves painful.
20. `argos-ci/argos` — after the critical advisory is independently confirmed fixed.
21. `storybookjs/storybook` — component workshop for the dashboard (v11 is in alpha).
22. `openllmetry` / `pydantic/logfire` / `SigNoz` / `hyperdx` — OTel backends; Langfuse already covers the LLM slice.
23. `expo/custom-expo-updates-server` — only if self-hosted OTA is ever required (it is stale).
24. `sixty-north/cosmic-ray` — Python mutation alternative to mutmut.
25. `slsa-framework/slsa-github-generator`, `step-security/secure-repo` — provenance alternatives to cosign attestations.

**REJECT**
26. `lost-pixel/lost-pixel` — **archived**; last release 2024-11-14.
27. `tajo/ladle` — no commits in 90 days, last release 2025-11-04.
28. `mutpy/mutpy` — last release 2019-11-17.
29. `wix/Detox` — 0 commits in the default branch in 90 days; Maestro is the locked tool.
30. `appium/appium` — heavier cross-platform stack than we need; Maestro + Playwright cover both platforms.
31. `grafana/grafana` — 2 GB, AGPL, and OTel-native alternatives exist.
32. `enzomanuelmangano/ennio` — 0 commits/90 d, 2 forks.

---

## 7. Risks, fallbacks, ADR triggers

| Risk | Impact | Fallback / mitigation |
|---|---|---|
| An OTA update reaches every driver and breaks the app | trust loss mid-shift | signed updates; two channels; preview channel internal-only; runtime kill-switch; documented rollback (publish the previous update to `production`); C6 benchmark |
| Self-hosted OTA (the reference server is stale since 2025-11-05) | no update path if EAS is unavailable | keep EAS Update; revisit in the next radar; do not self-host on a stale reference |
| A hosted visual-regression vendor sees driver screenshots (addresses, customer names) | privacy exposure | **Maestro `assertScreenshot` + reg-cli, both local to our CI**; no hosted screenshot service in the pipeline |
| Argos-class cross-tenant flaw in a CI tool | CI compromise | the Argos rejection above; scorecard + pin CI actions by SHA |
| Observability SDKs push cold start over the 2 s budget | CI performance failure | C7 benchmark; Sentry/PostHog behind an adapter with a no-op fake for tests (V4 §6.1) |
| Sentry auth token leaking from the Expo plugin | credential exposure | DSN-only in the client; DSN is not secret; the low advisory is fixed in ≥ 5.19.1 |
| Self-hosting PostHog + Langfuse + GlitchTip + OTel collector is a lot of ops | founder time | stage it: GlitchTip + OTel collector first (the two V4 §6.6 requires), PostHog next, Langfuse only when the voice path is live |
| AGPL tools in CI confuse the licence gate | false-positive CI failure | `scripts/check-licenses.mjs` must scan the **bundle**, not the toolchain; record renovate/step-security/grafana in `docs/LICENSES.md` as CI-only |
| EAS/EAS Update quota or pricing | cost | measure EAS build minutes/updates per release; the CI emulator workflow already builds locally, so EAS is only for signed releases |

**ADR trigger:** adopting a hosted service (EAS Update, PostHog Cloud, Sentry Cloud, Sherlo, Argos) as a **production data path for driver data** changes a locked privacy decision → ADR + `docs/DECISIONS.md` update. Nothing in this research recommends one.

---

## 8. What could not be verified (V4 §12.6)

- **6-month star trend** for all 50 candidates (token lacks the `stargazer` scope).
- **All CI timings** (C1–C9) — no runner was used.
- **EAS build minutes/updates quota and pricing** — commercial, not in the repos.
- **Self-hosting cost/footprint** of PostHog, Langfuse, GlitchTip, SigNoz, Grafana — not measured.
- **The exact `stryker`/`@stryker-mutator/*` npm versions** — the meta-package reports `stryker@0.35.1` while the repo release line is `v10.0.0`; the concrete runner versions were not read from the repo's `package.json` → UNVERIFIED.
- **Maestro distribution channel** — npm `maestro@2.1.1` is MIT but appears to be a legacy channel next to the `cli-2.11.0` release binaries; which channel CI should use is UNVERIFIED.
- **GlitchTip's own repository, releases and advisories** — the canonical project lives on **GitLab** (`gitlab.com/glitchtip/glitchtip`); only the 23 KB GitHub mirror was inspected. GlitchTip's version, CVE history and release cadence are **UNVERIFIED**.
- **PostHog / Langfuse enterprise-edition boundaries** — the LICENSE files point to directory-scoped variants; which features are EE was not enumerated.
- **Maestro's `assertScreenshot` baseline format and diff sensitivity** (pixel tolerance) — not read from the source.
- **`expo-updates` channel/rollback semantics in our own project** — not yet configured; the two-channel rule in §6 is a recommendation, not an implemented fact.
