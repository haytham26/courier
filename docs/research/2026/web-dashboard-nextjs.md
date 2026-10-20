# Web dashboard (Next.js) — 2026 OSS research (redone, V4 §13.1)

**Research date: 2026-10-21.** Method: V4 §12 (≥30 evidence cards, ≥10 shortlisted, top 5 deep-reviewed,
benchmarks only where an eval set exists) + §12.6 anti-bias (≥3 newer/smaller challengers). Every number was
read from the live GitHub API, the npm registry, the PyPI JSON API or the vendor's own site on **2026-10-21**
unless the card says **UNVERIFIED**. Nothing is estimated and nothing is carried over unread — the previous
note (2026-10-20) had several wrong numbers and one wrong repository, corrected in §10.

**Card fields:** name · repo/vendor URL · stars (OSS) or price (SaaS) · created · last release + date ·
release cadence · commits/90 d + distinct human maintainers/90 d · open issues · licence (read from the
licence file where the API says NOASSERTION) · npm downloads/30 d · Expo SDK 58 / RN 0.88 New Architecture
compatibility · self-hostable? · size · **DECISION**.

## 0. Scope, our current choice, the bar

| Item                                 | Verified 2026-10-21                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The web app                          | **does not exist** — `apps/web` is declared in the root `package.json` workspaces but the directory does not exist; `docs/BUGS.md` BUG-022 "No web dashboard (Next.js) — Phase E.1 not started" and BUG-023 "No admin panel — Phase E.2 not started" are both **open**                                                                                                                                                                                                                                                                                                                                                                                                        |
| Our stack today                      | `apps/mobile` = **Expo SDK 58** (`expo ~58.0.14`), React Native **0.88.0** (New Architecture only), React 19.3.0, Unistyles 3.5.3, `better-auth 1.7.10` + `@better-auth/expo 1.7.10`; `apps/api` = FastAPI + Python ≥3.11,<3.13; `services/auth` = Better Auth (Node)                                                                                                                                                                                                                                                                                                                                                                                                         |
| Monorepo                             | pnpm 12.14.0 + Turborepo 2.11.9, Node **≥ 22**, workspaces `apps/mobile`, `apps/web`, `packages/*`, `services/auth`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Shared packages                      | `packages/design-tokens` (raw palette + semantic tokens, day/night/high-contrast), `packages/shared` (zod schemas, types, constants), `packages/nz-address` — **all pure TypeScript, no native code**, so Expo 58 / New Architecture is not a constraint on them; the constraint is that a library used in the web app must also be safe to _share_ with the mobile app                                                                                                                                                                                                                                                                                                       |
| Our locked web decision (2026-10-20) | `next@16.4.2` pinned exactly · `shadcn-ui/ui` as a **source** of components copied into `packages/ui-web` · `@tanstack/react-table@9.3.1` + `react-query@5.104.5` + `react-virtual@3.13.47` · `maplibre-gl@6.15.0` + `react-map-gl@8.1.3` lazy-loaded · `better-auth@1.7.11` + `better-auth-ui` · `react-hook-form@7.90.0` · Radix primitives via shadcn · KEEP `maputnik` + `martin` · WATCH `TanStack/charts`, `payload`, the layout references, `shadcn-ui/lint`, `virtua`/`lytenyte`, `recharts`/`echarts`/`deck.gl` · REJECT NativeWind, ag-grid, handsontable, twenty, nocobase, appsmith, tremor, basetool, material-kit-react, mui-x (`docs/squads/web/decisions.md`) |
| The bar                              | **Lighthouse ≥ 95 performance and ≥ 95 accessibility** (V4 §10.3) · WCAG 2.2 AA · tenant/org scoping on **every** query with tests that prove isolation · audit log for admin actions · no PII in logs · one token source (`packages/design-tokens` → CSS variables) · one icon set (Material Symbols) · **no emoji** · plain NZ English · a small team runs it · the product must not look AI-made                                                                                                                                                                                                                                                                           |
| Squad gate                           | `docs/squads/web/README.md`: "the benchmark exists **before** the library is chosen"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

Three things must not be conflated. The **framework** (Next.js App Router, React Server Components) is a
rendering and caching contract. The **component layer** (shadcn/Radix) is where our tokens and our a11y
live. The **data layer** (TanStack Table/Query/Virtual) is where org scoping lives. A weakness in any one
of the three breaks the dashboard; they are not interchangeable and are scored separately below.

### 6-month star trend — method note (proxy, as V4 §12.3 permits)

The **star timeline** is not readable with the token in `.env.local`: `GET /repos/{o}/{r}/stargazers` returns
**HTTP 403 "Resource not accessible by personal access token"** (the same limit the routing note hit on
2026-10-21). **Every "stars gained in 6 months" figure is therefore UNVERIFIED.** The proxy used throughout
is the one §12.3 prescribes: **releases in the last 6 months · commits in the last 90 days · distinct human
maintainers in 90 days** (bot/dependabot excluded, identified by commit author name), plus **npm
downloads/month** where a registry exists. Where a project publishes its releases through a changeset
monorepo rather than GitHub Releases, the GitHub release count reads **0** — that is stated in the card and
the npm publish date is used instead, so a project is never scored as dead on that basis alone.

## Queries run

**GitHub API** (via `scripts\gh.ps1`, all read **2026-10-21**). Filters are the literal call strings.

| #   | Call                                                                                      | What it produced                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `api repos/{o}/{r}` × 74                                                                  | stars, forks, created, pushed, `license.spdx_id`, size, `open_issues_count`, archived                                                                             |
| 2   | `api repos/{o}/{r}/releases?per_page=100 --paginate` × 74                                 | release dates → cadence and releases/6 m                                                                                                                          |
| 3   | `api repos/{o}/{r}/commits?since=2026-07-23T00:00:00Z&per_page=100` × 74                  | commits/90 d, distinct human authors                                                                                                                              |
| 4   | `api repos/{o}/{r}/commits?per_page=12` × 9                                               | the last-12 commit list quoted in §4                                                                                                                              |
| 5   | `api repos/{o}/{r}/license` × 19 (+ licence file body)                                    | the licence **read from the file**, for the 14 repos the API reports as NOASSERTION                                                                               |
| 6   | `api repos/{o}/{r}/security-advisories?per_page=100` × 3                                  | next.js **72 advisories (7 critical)**, maplibre **1**, better-auth **37**                                                                                        |
| 7   | `api repos/{o}/{r}/issues?state=all&since=…&sort=created&direction=desc&per_page=100` × 9 | the 2026 issue/PR lists quoted in §4 (PRs and issues are separated by the presence of `pull_request`)                                                             |
| 8   | `api search/repositories?q=…&per_page=5` × 6                                              | found `nextauthjs/next-auth` (the 2026-10-20 note used the wrong org `authjs/`), `beancount/fava`, `hledgerorg/hledger`, `wojtekmaj/react-pdf`, `Hopding/pdf-lib` |
| 9   | `api rate_limit`                                                                          | core 5000/h (4056 free), search 30/min (the search API rate-limited mid-run; all search work was redone on the core API)                                          |
| 10  | `api repos/{o}/{r}/readme` × 2                                                            | the `hexclave/hexclave` README (its topics and the "user infrastructure platform" positioning)                                                                    |

**npm** (`registry.npmjs.org` + `api.npmjs.org/downloads/point/last-month`, window **2026-09-19 → 2026-10-18**) × 55:
`next`, `shadcn`, `@tanstack/react-table|react-query|react-virtual|react-charts|react-router|react-db`,
`better-auth`, `maplibre-gl`, `react-map-gl`, `@vis.gl/react-maplibre`, `recharts`, `echarts`, `deck.gl`,
`@deck.gl/react`, `react-hook-form`, `virtua`, `@refinedev/core`, `tailwindcss`, `@radix-ui/react-dialog`,
`@radix-ui/themes`, `@adobe/react-spectrum`, `@primer/react`, `@patternfly/react-core`, `@elastic/eui`,
`@logto/react`, `@clerk/nextjs`, `fumadocs-core|ui|mdx`, `@openfeature/server-sdk`, `playwright`, `stripe`,
`posthog-js`, `lucide-react`, `@tabler/icons-react`, `style-dictionary`, `@cubejs-backend/server`,
`cubejs-cli`, `@duckdb/node-api`, `@clickhouse/client`, `dbt`/`lightdash`/`umami`/`dub` (see the companion
file `admin-analytics.md`).

**Web searches** (real query strings, 2026-10-21):

| #   | Query                                                                                     | What it produced                                                                                                                                                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1  | `Next.js 16 App Router React Server Components caching 2026 use cache`                    | the Cache Components contract: `cacheComponents: true` + `partialPrefetching: true`, PPR as the default, `use cache` / `cacheLife` / `cacheTag` / `use cache: remote` / `use cache: private`, and the fact that `use cache` **defaults to in-memory storage scoped to a single deployment** |
| W2  | `Better Auth Next.js App Router server components session organization plugin 2026`       | the RSC session pattern (`auth.api.getSession({ headers: await headers() })`), the org plugin's owner/admin/member roles, `activeOrganizationId`, and the Next 16 `middleware` → `proxy` rename                                                                                             |
| W3  | `Vercel acquires Better Auth 2026 announcement`                                           | the first-party announcement (vercel.com, 2026-07-07) and the law-firm confirmation — governance fact for a locked decision                                                                                                                                                                 |
| W4  | `TanStack Charts v1 2026 accessibility server components TanStack Table v9 migration`     | the Table v9 breaking-change list and the Charts 1.0 accessibility contract (`ariaLabel`/`ariaDescription`, SVG renders on the server, Canvas does not)                                                                                                                                     |
| W5  | `Vercel pricing 2026 hobby pro team per month Next.js self-host Docker standalone output` | the deploy-cost anchors: Hobby $0 (non-commercial only), Pro $20/seat/month, `output: 'standalone'` + Nginx + Redis for self-hosting                                                                                                                                                        |

## 1. Candidates (30+) — the candidate pool: 66 cards, every one a full evidence card

**C1 — `vercel/next.js`** ⭐ https://github.com/vercel/next.js — **143 108 ★** /35 150 f · created **2016-10-05** · last release **2026-10-19T23:54:40Z** · **249 releases/6 m** (3 910 total, the release train is per-package) · trend proxy **100+ commits/90 d, 22 humans** · **72 security advisories: 7 critical, 24 high, 34 medium, 7 low** (latest cluster 2026-10-14) · **MIT** · npm `next@16.4.2` published **2026-10-15**, **266 194 038 dl/30 d** · repo 2 600 794 KB · server framework (Node ≥ 20.9; our repo requires Node ≥ 22) · Expo 58/RN New Arch: **n/a** (web only) · self-hostable: **yes** (`output: 'standalone'`, Docker + Nginx) · **relevance**: the framework the whole web app sits on, and the only candidate with a critical advisory class that targets multi-tenant caches — **DECISION: ADOPT, pin `16.4.2`, keep `use cache` off org-scoped data (now evidence-backed, §4.1)**

**C2 — `shadcn-ui/ui`** ⭐ https://github.com/shadcn-ui/ui — **126 045 ★** /13 666 f · created **2023-01-04** · last release **2026-10-18** · **47 releases/6 m** (137) · **100+ commits/90 d, 9 humans** · **MIT** (licence file read) · npm `shadcn@4.22.1` **2026-10-18**, **45 990 341 dl/30 d** · 73 713 KB · Expo 58/RN New Arch: **n/a** (the CLI runs in Node; the copied components are React DOM, and the _mobile_ equivalents stay Unistyles) · self-hostable: **n/a** (it is source you copy) · **relevance**: copying the component source is the only way to keep `packages/design-tokens` the single token source — **DECISION: ADOPT as a source, not a dependency (locked 2026-10-20)**

**C3 — `radix-ui/primitives`** ⭐ https://github.com/radix-ui/primitives — **19 411 ★** /1 279 f · created **2020-06-19** · pushed **2026-10-14** · **0 GitHub releases** (packages ship to npm; this is normal for Radix, not a stall) · **100+ commits/90 d, 21 humans** · **MIT** · npm `@radix-ui/react-dialog@1.3.1` **2026-10-12**, **311 369 169 dl/30 d** · 24 234 KB · Expo 58/RN New Arch: **n/a**; Radix is DOM-only, so the mobile app cannot use it (the mobile app uses `react-native-unistyles` + our own primitives) · self-hostable: **yes** (MIT source) · **relevance**: the accessible primitives underneath every shadcn component — **DECISION: ADOPT via shadcn (locked)**

**C4 — `TanStack/table`** ⭐ https://github.com/TanStack/table — **28 507 ★** /3 589 f · created **2016-10-20** · last release **2026-10-12** · **286 releases/6 m** (576) · **100+ commits/90 d, 16 humans** · **MIT** · npm `@tanstack/react-table@9.3.1` **2026-10-12**, **92 288 276 dl/30 d** · 55 776 KB · Expo 58/RN New Arch: **n/a** (DOM tables; the mobile list is FlashList, not a table) · self-hostable: **yes** · **relevance**: headless, so the stops and payouts tables are our tokens and our ARIA — **DECISION: ADOPT v9 (locked; the v9 migration cost is real, §4.3)**

**C5 — `TanStack/query`** ⭐ https://github.com/TanStack/query — **50 468 ★** /4 261 f · created **2019-09-10** · last release **2026-10-19** · **1 005 releases/6 m** (2 801) · **100+ commits/90 d, 4 humans** (a narrow maintainer set on a very large project) · **MIT** · npm `@tanstack/react-query@5.104.5` **2026-10-19**, **279 215 374 dl/30 d** · 137 269 KB · Expo 58/RN New Arch: **n/a** (but the _same_ library family is React Native-safe — `@tanstack/react-query` runs in the app today? **not installed in `apps/mobile`**; the mobile app syncs through the FastAPI sync engine, so there is no shared query cache) · self-hostable: **yes** · **relevance**: the cache and invalidation layer, and the natural place to key every query by org id — **DECISION: ADOPT (locked)**

**C6 — `TanStack/virtual`** ⭐ https://github.com/TanStack/virtual — **7 151 ★** /479 f · created **2020-05-08** · last release **2026-10-16** · **181 releases/6 m** (497) · **55 commits/90 d, 20 humans** · **MIT** · npm `@tanstack/react-virtual@3.14.21` **2026-10-16**, **107 833 585 dl/30 d** · 9 908 KB · Expo 58/RN New Arch: **n/a** (DOM; the mobile long list uses FlashList per `docs/design/SYSTEM.md` §4) · self-hostable: **yes** · **relevance**: 300+ stops/day × 50 couriers is the row count the dispatcher table has to survive — **DECISION: ADOPT, and re-pin from the locked `3.13.47` to `3.14.21` (drift, §9)**

**C7 — `TanStack/charts`** ⭐ (2026 newcomer) https://github.com/TanStack/charts — **845 ★** /54 f · **created 2026-07-28** · last release **2026-10-09** · **32 releases/6 m (all 32 it has ever made)** · **100+ commits/90 d, 2 humans** · **MIT** · npm `@tanstack/react-charts@1.1.0` **2026-10-09**, **249 702 dl/30 d** · 20 486 KB · Expo 58/RN New Arch: the docs say **"React Native remains experimental"** — so it cannot be the mobile chart layer; the web is its only home · self-hostable: **yes** · **relevance**: the only charting candidate with an accessibility contract written into the API (`ariaLabel`/`ariaDescription` are required arguments) and a server-rendered SVG — **DECISION: WATCH → trial in the benchmark, do not ship before 1.1.0 is proven (locked as WATCH)**

**C8 — `TanStack/router`** ⭐ https://github.com/TanStack/router — **15 237 ★** /1 903 f · created **2019-01-14** · last release **2026-10-16** · **1 486 releases/6 m** (3 233) · **100+ commits/90 d, 13 humans** · **MIT** · npm `@tanstack/react-router@1.170.45` **2026-10-16**, **89 859 447 dl/30 d** · 119 429 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a type-safe router, but the App Router already gives us routing, layouts and server components — **DECISION: WATCH (App Router is enough; do not run two routers)**

**C9 — `TanStack/db`** ⭐ https://github.com/TanStack/db — **3 949 ★** /277 f · created **2025-03-11** · last release **2026-10-18** · **660 releases/6 m** (1 736) · **100+ commits/90 d, 8 humans** · **MIT** · npm `@tanstack/react-db@0.5.11` **2026-10-18**, **4 378 737 dl/30 d** · 44 018 KB · Expo 58/RN New Arch: **experimental**; the repo markets it for React and React Native — a sync layer for the dashboard that duplicates our Postgres event log · self-hostable: **yes** · **relevance**: a reactive client store that would let the dashboard stream live dispatch state without polling — **DECISION: WATCH (the live map wants this; the server is the source of truth)**

**C10 — `better-auth/better-auth`** ⭐ https://github.com/better-auth/better-auth — **30 392 ★** /2 994 f · created **2024-05-19** · last release **2026-10-20T11:58:46Z** · **59 releases/6 m** (976) · **100+ commits/90 d, 32 humans** · **37 security advisories** (latest cluster 2026-09-30: three; 2026-09-29; 2026-09-28) · **MIT** · npm `better-auth@1.7.12` **2026-10-20**, **44 611 654 dl/30 d** · 166 584 KB · Expo 58/RN New Arch: **the mobile app already runs `better-auth 1.7.10` + `@better-auth/expo 1.7.10` on Expo SDK 58 / RN 0.88** — this is the one candidate in the pool with a _proven_ New-Architecture path in our own repo · self-hostable: **yes** (our own `services/auth`) · **relevance**: the session the whole dashboard hangs on, and the org plugin that is our tenant boundary · **DECISION: ADOPT (locked) — and note the Vercel acquisition (§4.4) and the 37-advisory count**

**C11 — `better-auth-ui/better-auth-ui`** ⭐ https://github.com/better-auth-ui/better-auth-ui — **1 725 ★** /172 f · created **2024-12-29** · last release **2026-10-11** · **72 releases/6 m** (77) · **100+ commits/90 d, 9 humans** · **MIT** · npm: no package by that name (the CLI/registry model) · 41 573 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (source) · **relevance**: ready-made sign-in, sign-up, org-switch and invitation screens that match our Better Auth instance — **DECISION: ADOPT (copy, restyle to our tokens) (locked)**

**C12 — `nextauthjs/next-auth`** ⭐ https://github.com/nextauthjs/next-auth — **28 366 ★** /4 031 f · created **2018-01-27** · pushed **2026-07-22** · **31 releases/6 m**, last **2026-07-20** · **0 commits/90 d** · **ISC** (licence field) · npm `next-auth@4.24.15` **2026-07-20**, **26 685 909 dl/30 d**; v5 is still `5.0.0-beta.32` · 70 532 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the obvious alternative to Better Auth, and the repo the 2026-10-20 note could not resolve — **DECISION: REJECT (maintenance has stopped; Auth.js stewardship moved to Better Auth; see §4.4)**

**C13 — `maplibre/maplibre-gl-js`** ⭐ https://github.com/maplibre/maplibre-gl-js — **11 901 ★** /1 290 f · created **2020-12-08** · last release **2026-10-18** · **44 releases/6 m** (187) · **100+ commits/90 d, 23 humans** · licence: API says NOASSERTION, the `LICENSE.txt` body read on 2026-10-21 is the **BSD-3-Clause** text (verified) · **1 advisory**, GHSA-jrc7-96c5-q579 (2026-08-19), "XSS Sanitizer Bypass in `DOM.sanitize()` via Live NamedNodeMap Removal Skip", patched **6.4.1** — we are on 6.15.0, above the fix · npm `maplibre-gl@6.15.0` **2026-10-18**, **23 780 110 dl/30 d** · 1 061 494 KB · Expo 58/RN New Arch: **the mobile app already runs `@maplibre/maplibre-react-native 11.3.7`**; the web and the app can therefore share **one style JSON** — a real parity win · self-hostable: **yes** (Martin, C32) · **relevance**: the dispatcher's live map, and the only way our day/night courier style is written once — **DECISION: ADOPT, lazy-loaded on the map route only (locked)**

**C14 — `visgl/react-map-gl`** ⭐ https://github.com/visgl/react-map-gl — **8 511 ★** /1 348 f · created **2015-10-08** · pushed **2026-09-03** · **2 releases/6 m**, last **2026-09-02** · **14 commits/90 d, 7 humans** · **MIT** (licence file read) · npm `react-map-gl@8.1.3` **2026-09-02** **9 184 291 dl/30 d**; `@vis.gl/react-maplibre@8.1.3` **6 502 406 dl/30 d** · 37 210 KB · Expo 58/RN New Arch: **n/a** (the RN path is `@vis.gl/react-native-maplibre`, a different package) · self-hostable: **yes** · **relevance**: the React binding for MapLibre; the wrapper moves slowly because the core does the work — **DECISION: ADOPT (locked)**

**C15 — `recharts/recharts`** ⭐ https://github.com/recharts/recharts — **27 642 ★** /2 020 f · created **2015-08-07** · last release **2026-10-13** (a canary; the stable is **3.10.1, 2026-07-25**) · **13 releases/6 m** · **100+ commits/90 d, 20 humans** · **MIT** · npm `recharts@3.10.1` **2026-07-25**, **239 787 943 dl/30 d** · 3 615 607 KB · Expo 58/RN New Arch: `react-native-svg` charts exist but are a separate package · self-hostable: **yes** · **relevance**: the most-downloaded React chart library and the one the market's dashboards use — **DECISION: WATCH (SVG charts have no accessibility contract of their own; prefer TanStack Charts, fall back to Recharts)**

**C16 — `apache/echarts`** ⭐ https://github.com/apache/echarts — **67 558 ★** /19 840 f · created **2013-04-03** · pushed **2026-10-13** · **3 releases/6 m**, last **2026-05-19** · **18 commits/90 d, 3 humans** · **Apache-2.0** · npm `echarts@6.1.0` **2026-05-19**, **23 453 063 dl/30 d** · 271 263 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the most capable chart engine, and the heaviest; also the one Superset itself embeds — **DECISION: WATCH (the mobile app's charts must stay light; 3 maintainers in the window is thin)**

**C17 — `visgl/deck.gl`** ⭐ https://github.com/visgl/deck.gl — **14 689 ★** /2 286 f · created **2015-12-15** · last release **2026-09-05** · **17 releases/6 m** · **100+ commits/90 d, 19 humans** · **MIT** · npm `@deck.gl/react@9.4.0` **2026-09-05** **2 207 078 dl/30 d**; `deck.gl@9.4.0` **909 904 dl/30 d** · 1 092 398 KB · Expo 58/RN New Arch: **n/a** (WebGL) · self-hostable: **yes** · **relevance**: the only way to draw 50 couriers' live positions and 300 stops on one canvas without melting the browser — **DECISION: WATCH (only if the live map needs GPU layers)**

**C18 — `ag-grid/ag-grid`** ⭐ https://github.com/ag-grid/ag-grid — **15 646 ★** /2 093 f · created **2014-12-23** · last release **2026-09-16** · **7 releases/6 m** · **100+ commits/90 d, 15 humans** · licence file: **"two license types: MIT and Commercial"** per package · 3 221 604 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (MIT community) · **relevance**: the best data grid in the market, and a 3.2 GB repository plus a paid tier for the features a courier dashboard needs — **DECISION: REJECT (licence + size) (locked)**

**C19 — `handsontable/handsontable`** ⭐ https://github.com/handsontable/handsontable — **22 066 ★** /3 187 f · created **2011-05-23** · last release **2026-10-07** · **10 releases/6 m** · **100+ commits/90 d, 7 humans** · **proprietary** (HANDSONCODE, licence file read) · 948 100 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **paid only** · **relevance**: none we can ship — **DECISION: REJECT (non-free) (locked)**

**C20 — `marmelab/react-admin`** ⭐ https://github.com/marmelab/react-admin — **26 969 ★** /5 471 f · created **2016-07-13** · last release **2026-10-19** · **8 releases/6 m** · **100+ commits/90 d, 13 humans** · **MIT** · 450 576 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the cleanest published model of an admin console over a REST API (`dataProvider` / `authProvider` / `accessControl`) — **DECISION: KEEP the contracts, do not adopt the framework (locked)**

**C21 — `refinedev/refine`** ⭐ https://github.com/refinedev/refine — **35 910 ★** /3 252 f · created **2021-01-20** · pushed **2026-09-10** · **0 GitHub releases/6 m** (the project moved to a changesets monorepo — the releases are npm-only) · npm `@refinedev/core@5.0.12` published **2026-04-02** — **no npm release in 6½ months** · **4 commits/90 d, 4 humans** (last commits all on 2026-09-10) · **MIT** · 8 285 184 KB (the largest repo in the pool after PostHog) · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the framework our own earlier research picked for the ops console, and the one with a REST data provider that fits FastAPI — **DECISION: WATCH → demote. The commit rate and the npm release gap say it is stalling; a data-provider contract we write ourselves is cheaper than a framework we wait on**

**C22 — `payloadcms/payload`** ⭐ https://github.com/payloadcms/payload — **45 374 ★** /4 313 f · created **2021-01-05** · last release **2026-10-19** · **21 releases/6 m** · **100+ commits/90 d, 21 humans** · **MIT** · 233 840 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: an admin panel + REST/GraphQL + auth in one MIT package — the plan B if the Python API route gets heavy, but it would put a second data model next to FastAPI + PostGIS — **DECISION: WATCH (locked)**

**C23 — `twentyhq/twenty`** ⭐ https://github.com/twentyhq/twenty — **58 707 ★** /9 629 f · created **2022-12-01** · last release **2026-10-19** · **68 releases/6 m** · **100+ commits/90 d, 14 humans** · licence file read: **"mostly licensed under the GNU Affero General Public License v3.0 … with two qualifications"** · 2 248 655 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (AGPL obligations) · **relevance**: the best-looking open CRM admin in 2026 — **DECISION: REJECT (AGPL) — clean-room study only (locked)**

**C24 — `appsmithorg/appsmith`** ⭐ https://github.com/appsmithorg/appsmith — **41 095 ★** /4 812 f · created **2020-06-30** · last release **2026-10-09** · **9 releases/6 m** · **100+ commits/90 d, 8 humans** · **Apache-2.0** · 818 612 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a low-code platform, not our dashboard — **DECISION: REJECT (fit) (locked)**

**C25 — `nocobase/nocobase`** ⭐ https://github.com/nocobase/nocobase — **24 640 ★** /2 927 f · created **2020-10-24** · last release **2026-10-20** · **223 releases/6 m** · **100+ commits/90 d, 11 humans** · licence file: **"NocoBase License Agreement"** (updated February 24, 2026) — a custom licence, not on the allow-list in `CONSTRAINTS.md` · 640 677 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a very active admin platform, blocked by its own licence — **DECISION: REJECT (custom licence) (locked)**

**C26 — `react-hook-form/react-hook-form`** ⭐ https://github.com/react-hook-form/react-hook-form — **44 868 ★** /2 501 f · created **2019-03-05** · last release **2026-10-10** · **21 releases/6 m** · **100+ commits/90 d, 33 humans** · **MIT** · npm `react-hook-form@7.90.0` **2026-10-11**, **235 293 865 dl/30 d** · 33 290 KB · Expo 58/RN New Arch: **n/a** (DOM forms) · self-hostable: **yes** · **relevance**: the forms layer for the admin console (stop import mapping, settlement adjustments) — **DECISION: ADOPT (locked)**

**C27 — `mui/mui-x`** ⭐ https://github.com/mui/mui-x — **5 865 ★** /1 833 f · created **2020-04-30** · last release **2026-10-20** · **31 releases/6 m** · **100+ commits/90 d, 18 humans** · licence field **NULL** (mixed MIT core + commercial X) · 197 312 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (MIT core) · **relevance**: a data grid with a paid tier for the features a dispatcher needs, heavier than Radix + TanStack — **DECISION: REJECT (licence + weight) (locked)**

**C28 — `tremorlabs/tremor`** ⭐ https://github.com/tremorlabs/tremor — **3 673 ★** /196 f · created **2024-03-26** · pushed **2025-10-10** (a year ago) · **0 releases/6 m**, **0 commits/90 d** · **Apache-2.0** · 4 769 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: none — **DECISION: REJECT (unmaintained since 2025-10-10) (locked)**

**C29 — `inokawa/virtua`** ⭐ https://github.com/inokawa/virtua — **3 753 ★** /120 f · created **2022-10-11** · last release **2026-10-12** · **30 releases/6 m** · **100+ commits/90 d, 3 humans** · **MIT** · npm `virtua@0.53.5` **2026-10-12**, **4 518 177 dl/30 d** · 424 228 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a lighter virtualiser than TanStack Virtual — **DECISION: WATCH (challenger for the benchmark) (locked)**

**C30 — `1771-Technologies/lytenyte`** ⭐ https://github.com/1771-Technologies/lytenyte — **1 029 ★** /54 f · created **2025-01-04** · pushed **2026-08-15** · **0 releases** · **3 commits/90 d, 2 humans** · licence file: **core packages Apache-2.0, PRO packages proprietary** · 171 531 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (core) · **relevance**: a headless grid with an enterprise tier — **DECISION: WATCH (challenger) (locked)**

**C31 — `shadcn-ui/lint`** ⭐ (2026 newcomer) https://github.com/shadcn-ui/lint — **3 234 ★** /68 f · **created 2026-09-02** (7 weeks old) · last release **2026-10-19** · **8 releases/6 m** · **62 commits/90 d, 2 humans** · **MIT** · 804 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a linter for Tailwind design systems — the closest thing to our "no raw hex/px outside `packages/design-tokens`" rule, which we otherwise have to write ourselves — **DECISION: WATCH → trial; if it lints our CSS variables we save a rule (locked as WATCH)**

**C32 — `maplibre/martin`** ⭐ https://github.com/maplibre/martin — **4 012 ★** /407 f · created **2017-09-30** · last release **2026-10-09** · **57 releases/6 m** · **100+ commits/90 d, 9 humans** · **Apache-2.0** · 68 263 KB · Expo 58/RN New Arch: **n/a** (server) · self-hostable: **yes** — a single binary tile server · **relevance**: if we serve tiles ourselves for the dashboard map, this is the server — **DECISION: KEEP (locked)**

**C33 — `maplibre/maputnik`** ⭐ https://github.com/maplibre/maputnik — **2 659 ★** /477 f · created **2016-09-08** · last release **2026-07-06** · **1 release/6 m** · **100+ commits/90 d, 7 humans** · **MIT** · 300 996 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the style editor that produces the shared day/night courier style — **DECISION: KEEP (locked)**

**C34 — `tailwindlabs/tailwindcss`** ⭐ https://github.com/tailwindlabs/tailwindcss — **97 949 ★** /8 690 f · created **2017-10-06** · pushed **2026-10-19** · **5 releases/6 m**, last **2026-07-16** · **66 commits/90 d, 23 humans** · **MIT** · npm `tailwindcss@4.3.3` **2026-07-16**, **562 479 872 dl/30 d** · 114 512 KB · Expo 58/RN New Arch: **the mobile app must not use it** (the locked styling rule is Unistyles 3) — this is the **second styling technology** the 2026-10-20 note flags as an ADR trigger · self-hostable: **yes** · **relevance**: shadcn's Tailwind preset, and therefore the ADR trigger for the web — **DECISION: ADR REQUIRED before adoption (locked); the alternative is a plain CSS-variable layer with no Tailwind**

**C35 — `adobe/react-spectrum`** ⭐ https://github.com/adobe/react-spectrum — **15 967 ★** /1 611 f · created **2019-09-13** · last release **2026-10-09** · **10 releases/6 m** · **100+ commits/90 d, 33 humans** · **Apache-2.0** · npm `@adobe/react-spectrum@3.47.7` **2026-10-09**, **6 057 568 dl/30 d** · 253 118 KB · Expo 58/RN New Arch: **n/a** (DOM, and it has its own styling runtime) · self-hostable: **yes** · **relevance**: the most thorough accessibility implementation of any design system — the reference for how a table and a dialog should behave for a screen reader — **DECISION: KEEP as the a11y reference (read the source, do not adopt the framework)**

**C36 — `primer/react`** ⭐ https://github.com/primer/react — **3 920 ★** /706 f · created **2018-02-17** · last release **2026-10-16** · **32 releases/6 m** · **100+ commits/90 d, 18 humans** · **MIT** · npm `@primer/react@38.42.0` **2026-10-16**, **233 449 dl/30 d** · 407 774 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a production design system with a documented density mode (a dispatcher table is dense data) — **DECISION: WATCH (density and data-table patterns)**

**C37 — `PatternFly/patternfly`** ⭐ https://github.com/PatternFly/patternfly — **821 ★** /118 f · created **2018-02-22** · last release **2026-10-15** · **79 releases/6 m** · **80 commits/90 d, 12 humans** · **MIT** · npm `@patternfly/react-core@6.7.0` **2026-10-15**, **612 228 dl/30 d** · 6 837 348 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the open-source design system built for **admin consoles and operators** — the closest thing in OSS to our dispatcher screen — **DECISION: WATCH (pattern reference, not a dependency)**

**C38 — `elastic/eui`** ⭐ https://github.com/elastic/eui — **6 373 ★** /920 f · created **2017-10-18** · last release **2026-10-19** · **31 releases/6 m** · **100+ commits/90 d, 21 humans** · licence file: **"SSPL v1 and the Elastic License 2.0 or (ii) an Apache License"** — SSPL is **banned** by `CONSTRAINTS.md` · 1 428 510 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: excellent admin-console components, blocked by the licence gate — **DECISION: REJECT (SSPL) — the Apache-2.0 subset is the only usable part, and it is a subset**

**C39 — `hexclave/hexclave`** ⭐ (2026 newcomer) https://github.com/hexclave/hexclave — **6 876 ★** /527 f · created **2024-02-28** · last release **2026-10-16** · **141 releases/6 m** · **100+ commits/90 d, 12 humans** · licence: API says NOASSERTION; the README badge says **MIT / AGPLv3** — the per-file split was **not** re-read, so the exact split is **UNVERIFIED** · 119 298 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (topics include `self-hosted`) · **relevance**: "the user infrastructure platform" — auth, teams, payments, emails and analytics in one, with `multi-tenancy`, `rbac` and `nextjs` as topics; the 2026 challenger that would replace Better Auth + Stripe + PostHog for a small team — **DECISION: WATCH — a vendor to re-evaluate at v1, not a dependency now (Better Auth is locked and Vercel-backed)**

**C40 — `logto-io/logto`** ⭐ https://github.com/logto-io/logto — **14 731 ★** /1 225 f · created **2021-06-19** · last release **2026-10-13** · **8 releases/6 m** · **100+ commits/90 d, 11 humans** · **MPL-2.0** · npm `@logto/react@4.1.1` **2026-10-15**, **120 100 dl/30 d** · 123 295 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a self-hostable auth with organisations and a React SDK — the credible alternative if Better Auth's governance changes — **DECISION: WATCH (a second auth system is an ADR, not a decision)**

**C41 — `workos/workos-node`** ⭐ https://github.com/workos/workos-node — **224 ★** /61 f · created **2019-06-13** · last release **2026-09-28** · **24 releases/6 m** · **38 commits/90 d, 20 humans** · **MIT** (SDK) · 15 577 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **no** (a vendor service) · **relevance**: AuthKit + Directory Sync — the "SSO for the depot owner" feature Spoke sells at $1 000/month — **DECISION: WATCH (price; the Team plan must not need SSO to sell)**

**C42 — `clerk/javascript`** ⭐ https://github.com/clerk/javascript — **1 767 ★** /479 f · created **2021-12-14** · last release **2026-10-19** · **1 325 releases/6 m** · **100+ commits/90 d, 18 humans** · **MIT** (SDK) · npm `@clerk/nextjs@7.9.17` **2026-10-16**, **10 909 191 dl/30 d** · 446 822 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **no** · **relevance**: the default Next.js auth for most starters, and the thing `ixartz/SaaS-Boilerplate` ties you to — **DECISION: REJECT (a second identity store would split the mobile session from the web session; Better Auth is locked)**

**C43 — `nextjs/saas-starter`** ⭐ https://github.com/nextjs/saas-starter — **16 193 ★** /2 738 f · created **2024-09-10** · pushed **2025-12-11** · **0 releases** · **0 commits/90 d** · **MIT** · 403 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: `docs/REPO_RESEARCH.md` line 270 says **"use"** for the web dashboard; the evidence is that it has had **no commit since 2025-12-11** and no release — **DECISION: REFERENCE ONLY, do not fork. Correction to our own research, §10**

**C44 — `fuma-nama/fumadocs`** ⭐ https://github.com/fuma-nama/fumadocs — **13 425 ★** /746 f · created **2023-07-03** · last release **2026-10-20** · **497 releases/6 m** · **100+ commits/90 d, 12 humans** · **MIT** · npm `fumadocs-core@16.17.7` **2026-10-19** **8 063 901 dl/30 d**, `fumadocs-ui@16.17.7` **6 053 871 dl/30 d** · 146 158 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the help centre and the docs site; **0 open issues** on the repo, which is unusual — **DECISION: KEEP (help centre, V4 §11.1; it lives in the same Next.js app)**

**C45 — `resend/react-email`** ⭐ https://github.com/resend/react-email — **19 852 ★** /1 093 f · created **2022-09-19** · last release **2026-10-16** · **156 releases/6 m** · **69 commits/90 d, 27 humans** · **MIT** · 175 268 KB · Expo 58/RN New Arch: **n/a** (it renders HTML in Node) · self-hostable: **yes** (the templates); Resend itself is a paid SaaS · **relevance**: the transactional email the dashboard sends (settlement statements, invitations, exports ready) — **DECISION: KEEP (already chosen in the observability area)**

**C46 — `open-feature/js-sdk`** ⭐ https://github.com/open-feature/js-sdk — **286 ★** /73 f · created **2022-05-02** · last release **2026-09-09** · **18 releases/6 m** · **40 commits/90 d, 6 humans** · **Apache-2.0** · npm `@openfeature/server-sdk@1.23.0` **2026-07-28**, **20 385 338 dl/30 d** · 25 363 KB · Expo 58/RN New Arch: **the same SDK runs in the app and on the server, so one flag definition can gate both** — the reason it is the locked choice in `docs/RESEARCH_2026.md` · self-hostable: **yes** · **relevance**: the flag layer that lets the web console ship behind a flag without a store release — **DECISION: KEEP (locked elsewhere); the web reads the same flags**

**C47 — `ixartz/SaaS-Boilerplate`** ⭐ https://github.com/ixartz/SaaS-Boilerplate — **7 453 ★** /1 336 f · created **2024-03-29** · pushed **2026-10-01** · **4 releases/6 m**, last **2026-07-01** · **3 commits/90 d, 1 human** · **MIT** · 6 732 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a multi-tenant Next.js boilerplate — the structure reference for org scoping, but it is **tied to Clerk** and has one maintainer — **DECISION: WATCH (read the org-scoping code, do not adopt)**

**C48 — `microsoft/playwright`** ⭐ https://github.com/microsoft/playwright — **98 153 ★** /6 661 f · created **2019-11-15** · last release **2026-10-14** · **8 releases/6 m** · **100+ commits/90 d, 9 humans** · **Apache-2.0** · npm `playwright@1.64.1` **2026-10-14**, **445 668 745 dl/30 d** · 245 490 KB · Expo 58/RN New Arch: **n/a** (the mobile app uses Maestro, per `CONSTRAINTS.md`) · self-hostable: **yes** · **relevance**: the only way to prove the tenant-isolation and the Lighthouse gates in CI — **DECISION: ADOPT (test harness, not a runtime dependency)**

**C49 — `openstatusHQ/openstatus`** ⭐ https://github.com/openstatusHQ/openstatus — **9 206 ★** /794 f · created **2023-06-19** · pushed **2026-10-20** · **0 GitHub releases** · **100+ commits/90 d, 14 humans** · **AGPL-3.0** · 126 915 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (AGPL) · **relevance**: the public status page the SAAS_CHECKLIST requires — **DECISION: WATCH — hosted service or unmodified internal instance only (AGPL)**

**C50 — `umami-software/umami`** ⭐ https://github.com/umami-software/umami — **39 484 ★** /8 355 f · created **2020-07-17** · last release **2026-09-17** · **4 releases/6 m** · **100+ commits/90 d, 11 humans** · **MIT** · 29 902 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (Docker) · **relevance**: a privacy-friendly web analytics that needs no cookie banner — but the **admin** analytics we need is per-courier, which is product analytics, not page analytics — **DECISION: REJECT for the admin console (wrong question; PostHog is the locked answer)**

**C51 — `dubinc/dub`** ⭐ https://github.com/dubinc/dub — **24 918 ★** /3 333 f · created **2022-08-27** · pushed **2026-10-20** · **0 GitHub releases** · **100+ commits/90 d, 6 humans** · licence file: **AGPLv3 outside `apps/web/app/(ee)`** · 93 725 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (AGPL) · **relevance**: the best small-team SaaS dashboard in open source in 2026 — the reference for layout, density, empty states and the "settings → billing" flow — **DECISION: CLEAN-ROOM REFERENCE ONLY (AGPL) — read it, do not copy the code**

**C52 — `calcom/cal.diy`** ⭐ https://github.com/calcom/cal.diy (the `calcom/cal.com` path now resolves here) — **49 175 ★** /15 390 f · created **2021-03-22** · pushed **2026-10-19** · **0 GitHub releases/6 m** (last 2026-03-01) · **23 commits/90 d, 21 humans** · **MIT** · 1 157 399 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a permissive-licence production web app, but a booking product — **DECISION: WATCH (structure reference only)**

**C53 — `saleor/saleor-dashboard`** ⭐ https://github.com/saleor/saleor-dashboard — **1 045 ★** /1 235 f · created **2019-06-19** · last release **2026-10-19** · **45 releases/6 m** · **100+ commits/90 d, 10 humans** · **BSD-3-Clause** · 219 046 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a real production admin console with a permissive licence and 45 releases in 6 months — the best "what a serious admin console looks like" reference in the pool — **DECISION: WATCH (layout and screen reference)**

**C54 — `satnaing/shadcn-admin`** ⭐ https://github.com/satnaing/shadcn-admin — **15 823 ★** /2 388 f · created **2024-01-26** · pushed **2026-09-10** · **0 releases/6 m**, last **2025-11-06** · **0 commits/90 d** · **MIT** · 2 996 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the most-starred shadcn admin template, and a **Vite** app, not Next.js — **DECISION: WATCH (layout reference; stale)**

**C55 — `Kiranism/next-shadcn-dashboard-starter`** ⭐ https://github.com/Kiranism/next-shadcn-dashboard-starter — **7 147 ★** /1 613 f · created **2023-11-02** · pushed **2026-10-20** · **2 releases/6 m**, last **2026-07-18** · **54 commits/90 d, 2 humans** · **MIT** · 5 109 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a Next.js shadcn dashboard, the closest thing to a starting point — **DECISION: WATCH (read for the folder structure, do not fork)**

**C56 — `arhamkhnz/next-shadcn-admin-dashboard`** ⭐ https://github.com/arhamkhnz/next-shadcn-admin-dashboard — **3 188 ★** /648 f · created **2024-08-01** · pushed **2026-10-20** · **0 releases** · **100+ commits/90 d, 4 humans** · **MIT** · 13 097 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a Next.js admin dashboard with a dark mode and a settings shell — **DECISION: WATCH (reference)**

**C57 — `nellavio/nellavio`** ⭐ https://github.com/nellavio/nellavio — **509 ★** /59 f · created **2023-08-23** · pushed **2026-08-28** · **0 releases/6 m**, last **2026-04-12** · **8 commits/90 d, 1 human** · **MIT** · 7 124 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the only candidate that is **Next.js + Better Auth + RBAC** together — the closest reference to our exact stack — **DECISION: WATCH (read the org-scoping code; one maintainer, so read-only)**

**C58 — `heroui-inc/heroui-native`** ⭐ https://github.com/heroui-inc/heroui-native — **3 692 ★** /150 f · created **2025-06-03** · last release **2026-10-20** · **9 releases/6 m** · **100+ commits/90 d, 11 humans** · **Apache-2.0** · 23 239 KB · Expo 58/RN New Arch: **this is the NativeWind path for React Native** — the styling rule the 2026-10-20 note locked out · self-hostable: **yes** · **relevance**: none — **DECISION: REJECT (NativeWind, locked styling rule)**

**C59 — `basetool-ai/basetool`** ⭐ https://github.com/basetool-ai/basetool — **286 ★** /46 f · created **2021-08-23** · pushed **2022-10-10** · **0 releases**, **0 commits/90 d** · **Apache-2.0** · 4 967 KB · **relevance**: none — **DECISION: REJECT (dead since 2022) (locked)**

**C60 — `devias-io/material-kit-react`** ⭐ https://github.com/devias-io/material-kit-react — **5 580 ★** /2 550 f · created **2019-05-02** · pushed **2025-06-10** · **0 releases**, **0 commits/90 d** · **MIT** · 10 955 KB · **relevance**: none — **DECISION: REJECT (stale) (locked)**

**C61 — `ajnart/homarr`** ⭐ https://github.com/ajnart/homarr — **7 201 ★** /308 f · created **2022-04-24** · pushed **2026-06-01** · last release **2025-08-02** · **0 commits/90 d** · **MIT** · 54 067 KB · **archived = true** · **relevance**: none — **DECISION: REJECT (archived)**

**C62 — `TailAdmin/free-nextjs-admin-dashboard`** ⭐ https://github.com/TailAdmin/free-nextjs-admin-dashboard — **2 588 ★** /874 f · created **2023-08-06** · pushed **2026-09-15** · **0 releases** · **8 commits/90 d, 1 human** · **MIT** · 16 774 KB · **relevance**: a free template, not a product — **DECISION: WATCH (reference)**

**C63 — `t3-oss/create-t3-app`** ⭐ https://github.com/t3-oss/create-t3-app — **29 165 ★** /1 542 f · created **2022-05-24** · pushed **2025-12-11** · **0 releases/6 m**, last **2025-11-05** · **0 commits/90 d** · **MIT** · 8 482 KB · **relevance**: the Next.js + tRPC + Prisma starter — it still ships NextAuth, and it is stale — **DECISION: REJECT (stale; wrong auth)**

**C64 — `PostHog/posthog`** ⭐ https://github.com/PostHog/posthog — **40 360 ★** /3 533 f · created **2020-01-23** · last release **2026-10-20** · **3 698 releases/6 m** · **100+ commits/90 d, 34 humans** · licence file: **MIT outside `ee/`**, `ee/` proprietary · 8 176 113 KB · npm `posthog-js@1.438.12` **2026-10-15**, **64 887 134 dl/30 d** · Expo 58/RN New Arch: the RN SDK is the reason our observability note locked it · self-hostable: **yes** (heavy) · **relevance**: the product-analytics and feature-flag engine behind the admin console's usage numbers — **DECISION: ADOPT (locked in the observability area); the web console reads the same project**

**C65 — `stripe/stripe-node`** ⭐ https://github.com/stripe/stripe-node — **4 534 ★** /940 f · created **2011-09-28** · last release **2026-10-14** · **50 releases/6 m** · **64 commits/90 d, 12 humans** · **MIT** · npm `stripe@23.0.0` **2026-10-01**, **94 606 198 dl/30 d** · 44 429 KB · Expo 58/RN New Arch: the mobile app buys through the stores, the web uses the API — **relevance**: the billing and invoice surface the admin console exposes — **DECISION: KEEP (locked in the payments area)**

**C66 — `style-dictionary/style-dictionary`** ⭐ https://github.com/style-dictionary/style-dictionary — **4 869 ★** · last release **2026-10-16** · weekly releases (5 in the last 3 weeks) · **Apache-2.0** · npm `style-dictionary@5.7.0` **2026-10-16**, **8 726 849 dl/30 d** · Expo 58/RN New Arch: **it generates both the Unistyles theme and the web CSS variables from the same `packages/design-tokens` source** — the mechanism that keeps one token source · self-hostable: **yes** · **relevance**: the build step that turns our tokens into web CSS variables — **DECISION: ADOPT (build tool only; it never ships)**

## 2. Shortlist (13) and decisions

| #                                 | Project                                                                                                 | Decision                        | One-line reason                                                                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1                                | **vercel/next.js**                                                                                      | **ADOPT — pin `16.4.2`**        | MIT, 249 releases/6 m, 22 humans/90 d, 266 M dl/30 d — but **72 advisories (7 critical)**, and four of the September-2026 ones are cross-user cache leaks that a multi-tenant dashboard must not sit on |
| C2                                | **shadcn-ui/ui**                                                                                        | **ADOPT as a source**           | The only way to keep `packages/design-tokens` the single token source; 47 releases/6 m, MIT, 45.9 M dl/30 d                                                                                             |
| C4                                | **TanStack/table**                                                                                      | **ADOPT v9 now**                | Headless, 92.3 M dl/30 d, 286 releases/6 m; the v9 migration is real work and cheaper now than in six months                                                                                            |
| C5                                | **TanStack/query**                                                                                      | **ADOPT**                       | The invalidation layer, and the natural home for the org-scoped query key; 279 M dl/30 d                                                                                                                |
| C6                                | **TanStack/virtual**                                                                                    | **ADOPT — re-pin to `3.14.21`** | 107.8 M dl/30 d; the locked `3.13.47` is two minors behind                                                                                                                                              |
| C3                                | **radix-ui/primitives**                                                                                 | **ADOPT via shadcn**            | 311 M dl/30 d on one package, 21 humans, MIT — the accessible primitives under every copied component                                                                                                   |
| C10                               | **better-auth/better-auth**                                                                             | **ADOPT (locked)**              | The mobile app already runs it on Expo SDK 58; 32 humans, 59 releases/6 m — and **Vercel acquired it on 2026-07-07**, which removes the "will it survive" risk                                          |
| C11                               | **better-auth-ui/better-auth-ui**                                                                       | **ADOPT (copy)**                | The sign-in, org-switch and invitation screens that match our instance; 72 releases/6 m                                                                                                                 |
| C26                               | **react-hook-form**                                                                                     | **ADOPT**                       | 235 M dl/30 d, 33 humans, MIT, 7 open issues                                                                                                                                                            |
| C13 + C14                         | **maplibre-gl + react-map-gl**                                                                          | **ADOPT, lazy-loaded**          | One style JSON for the app and the dashboard; the app already runs the MapLibre RN client; one advisory, patched long before 6.15.0                                                                     |
| C48                               | **playwright**                                                                                          | **ADOPT (CI only)**             | The only way the Lighthouse, the a11y and the tenant-isolation gates become real numbers                                                                                                                |
| C66                               | **style-dictionary**                                                                                    | **ADOPT (build only)**          | Generates the web CSS variables from `packages/design-tokens`; Apache-2.0, weekly releases, 8.7 M dl/30 d                                                                                               |
| C7                                | **TanStack/charts**                                                                                     | **WATCH → benchmark**           | The only chart library with an accessibility contract in its API; 845 ★, 2 humans, 4 months old — trial it against Recharts in the benchmark, do not ship it on day one                                 |
| C21                               | **refinedev/refine**                                                                                    | **WATCH → demoted**             | 4 commits/90 d, no npm release since 2026-04-02, 8.3 GB repo — the 2026-10-20 note called it a trial; the evidence now says it is stalling                                                              |
| C31                               | **shadcn-ui/lint**                                                                                      | **WATCH**                       | A linter for design systems; if it lints our CSS variables it replaces a rule we would otherwise write                                                                                                  |
| C20                               | **marmelab/react-admin**                                                                                | **KEEP the contracts**          | `dataProvider` / `authProvider` / `accessControl` are the best published model of an admin console over a REST API — the framework itself is Material UI and has no tenant scoping                      |
| C22                               | **payloadcms/payload**                                                                                  | **WATCH**                       | Plan B if the Python API route gets heavy; a second data model is a real cost                                                                                                                           |
| C39                               | **hexclave/hexclave**                                                                                   | **WATCH**                       | The 2026 newcomer that bundles auth, teams, payments and analytics; MIT/AGPL split not re-read                                                                                                          |
| C53 / C54 / C55 / C56 / C51       | **saleor-dashboard · shadcn-admin · next-shadcn-dashboard-starter · next-shadcn-admin-dashboard · dub** | **WATCH (layout references)**   | A real admin console in a permissive licence (BSD-3), and the best small-team dashboard in OSS (AGPL, read only)                                                                                        |
| C34                               | **tailwindcss**                                                                                         | **ADR REQUIRED**                | A second styling technology next to Unistyles 3 changes a locked decision                                                                                                                               |
| C12                               | **nextauthjs/next-auth**                                                                                | **REJECT**                      | 0 commits/90 d, v5 still a beta, stewardship moved to Better Auth                                                                                                                                       |
| C43                               | **nextjs/saas-starter**                                                                                 | **REFERENCE ONLY**              | No commit since 2025-12-11; our own research says "use" — that is wrong                                                                                                                                 |
| C18 / C19 / C23 / C25 / C38 / C58 | **ag-grid · handsontable · twenty · nocobase · eui · heroui-native**                                    | **REJECT**                      | Commercial licence, proprietary, AGPL, custom licence, SSPL, NativeWind                                                                                                                                 |
| C50                               | **umami**                                                                                               | **REJECT**                      | Page analytics, not per-courier KPIs                                                                                                                                                                    |

## 3. Deep review — top 5 (code, docs, commits, PRs and issues opened in the 2026 window)

**3.1 `vercel/next.js` (C1)** — _Docs read_: `nextjs.org/docs/app/getting-started/caching` (the Cache
Components page, fetched 2026-10-21) — `cacheComponents: true` **and** `partialPrefetching: true` must both
be set, new `create-next-app` apps get both; `use cache` replaces `fetch` cache options; `cacheLife` and
`cacheTag` replace `revalidate`/`tags`; **"`use cache` defaults to in-memory storage, so its entries are
discarded when the serverless instance is destroyed and are scoped to a single deployment. Use `use cache:
remote` or a cache handler for storage that survives instance teardown"**; **"Cached code cannot read
request-time APIs like `cookies()`, `headers()`, or `searchParams` directly"**; `use cache: private` is the
variant for functions that read request APIs. _Also read_: `nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents`
(Cache Components "requires the Node.js runtime and does not support the `runtime` route segment config" —
so no edge runtime; our self-host plan is a Node container) and
`nextjs.org/docs/app/guides/migrating-to-cache-components` (route segment `dynamic` / `revalidate` /
`fetchCache` **error** under Cache Components). _Last 12 commits (2026-10-20)_: `3f51f6e` docs: document
`useRouter` push/replace void return and `useTransition` migration (#100420) · `2aa96d0` docs: type proxy
examples with NextRequest and fix cookie check (#100417) · `10463c7` Turbopack: keep env and preview props
invalidations key-granular on warm start (#100425) · `57b708a` Pass request headers explicitly into App
request stores (#100333) · `4550be4` turbo-persistence: read compaction inputs with pread instead of mmap
(#100336) · `dd904bb` [ci] Upload adapter test results via GitHub Actions OIDC (#100400). _Security, read
from `repos/vercel/next.js/security-advisories` on 2026-10-21_: **72 advisories — 7 critical, 24 high,
34 medium, 7 low.** The four that matter to a multi-tenant dashboard, all published **2026-09-30**:
`GHSA-mcj8-r9mp-w47p` "Cache poisoning in Next.js SSG/ISR rendering leads to cross-user content substitution"
(patched `16.3.?`), `GHSA-h694-7cp9-m8p3` "Cache leak across root param values in nested 'use cache' functions"
(patched **16.3.8**), `GHSA-3w37-wq28-93x7` "Pending `use cache` fill can leak Draft Mode content into
regular responses" (patched `16.3.?`), `GHSA-4jqv-mc3x-m676` "Cache poisoning of SSG and ISR pages in
self-hosted Next.js applications" (patched `15.5.?`). The latest cluster, **2026-10-14**:
`GHSA-673q-mjm6-r5xr` "Unauthenticated Remote Code Execution in `use cache` functions returning typed arrays"
(critical, patched **16.4.1**) and `GHSA-2464-fhr4-w9xw` "Unauthenticated Remote Code Execution in Image
Optimization API when SVG files are used" (critical, patched `15.5.28` only). _Open issues in the window_:
[#100364](https://github.com/vercel/next.js/issues/100364) "Cache Components: short-lived 'use cache' entry
served from the cache handler during warming" (2026-10-18),
[#100345](https://github.com/vercel/next.js/issues/100345) "'use cache': a read after `updateTag()` joins
another request's in-flight fill" (2026-10-17),
[#100255](https://github.com/vercel/next.js/issues/100255) "cacheComponents: `redirect()` during a background
revalidation is cached as 308 without a Location" (2026-10-15),
[#100398](https://github.com/vercel/next.js/issues/100398) "Middleware rewrite drops an empty `_rsc`, so a
Server Action's `redirect()` fetch loops" (2026-10-19),
[#100367](https://github.com/vercel/next.js/issues/100367) "`next dev` on Node 24: every server reload that
goes through `deleteCache` keeps the previous…" (2026-10-18). _PRs in the window_:
[#100276](https://github.com/vercel/next.js/pull/100276) "docs: Clarify when useSearchParams boundaries
render on the server with Cache Components" (2026-10-15),
[#100102](https://github.com/vercel/next.js/pull/100102) "Turbopack: Emit the shared-runtime bootstrap in the
PPR resume so it gets the CSP nonce" (2026-10-13),
[#100046](https://github.com/vercel/next.js/pull/100046) "Turbopack: fix edge route handlers when
cacheHandlers is configured" (2026-10-12). _Verdict_: **adopt at 16.4.2** — it is above every patched version
on the 16.x line that the API states precisely (16.3.8, 16.4.1) — **but the four advisories whose patched
list is truncated (`16.3.?`, `15.5.?`) and the two `15.5.28`-only entries are UNVERIFIED for the 16.4.x
line, so the "no `use cache` on org-scoped data" rule is no longer a preference, it is the mitigation.**

**3.2 `shadcn-ui/ui` (C2)** — _README/docs_: the model is _copy the code_, not install a runtime; the
**registry protocol** is now the distribution channel and the repo is busy adding community registries.
_Last 12 commits (2026-10-16 → 2026-10-19)_: `ba1503c` feat(registry): add community registries (#12347) ·
`fd1cbe0` feat(registry): add community registries (#12304) · `4381eeb` fix(cli): respect style availability in
`add --all` (#12360) · `d2fba50` docs: fix outdated registry FAQ and sidebar theming variables (#12341) ·
plus release commits and dependabot bumps. _What this says_: the runtime is stable because **there is no
runtime** — the churn is in the CLI and the registry, both of which are ours after copying. _PRs in the
window_: [#12390](https://github.com/shadcn-ui/ui/pull/12390) "fix(cli): prevent `add --dry-run` from running
init or creating a project" (2026-10-20),
[#12386](https://github.com/shadcn-ui/ui/pull/12386) "fix(registry): prefer exact path match when resolving
probable module paths" (2026-10-20),
[#12385](https://github.com/shadcn-ui/ui/pull/12385) "fix(code-block): green diff additions to pair with
destructive deletions" (2026-10-20),
[#12387](https://github.com/shadcn-ui/ui/pull/12387) "fix(registry): keep leading comments when installing an
item" (2026-10-20). _Issues in the window_:
[#12381](https://github.com/shadcn-ui/ui/issues/12381) "[bug]: `rsc: false` removes 'use client' from only
every other file" (2026-10-19),
[#12378](https://github.com/shadcn-ui/ui/issues/12378) "[bug]: `add` repoints a correct import to a
same-basename file elsewhere in the install" (2026-10-19). _Verdict_: **adopt as a source into
`packages/ui-web`**, with the same rule the mobile app follows: every copied component is ours, carries our
tokens, and enters the repo with our own test (the CONSTRAINTS.md floor forbids weakened tests and forbids
raw hex/px outside the token package). Copy **only what the dashboard needs** — the 2026-10-20 decision says
≤ 15 components; keep that number.

**3.3 `TanStack/table` (C4)** — _Docs read_: `tanstack.com/table/latest/docs/framework/react/guide/migrating`
— the v9 breaking changes are concrete and must be budgeted: **`useReactTable` → `useTable`**; a **new
required `features` table option** built with `tableFeatures({ rowSortingFeature, sortedRowModel:
createSortedRowModel(), sortFns, … })`; `stockFeatures` for v8-like behaviour at a larger bundle;
`useLegacyTable` is provided as a **temporary, deprecated** migration aid whose legacy APIs live in
`@tanstack/react-table/legacy`; `columnPinning.start`/`column.pin('end')` replaces the old left/right
terminology; state moves to `table.store.state` / `table.atoms` with `useSelector` for narrow re-renders.
_Last 12 commits (2026-10-08 → 2026-10-12)_: `95c4768` ci: Version Packages (#6632) · `67e8251`
fix(svelte-table, vue-table): Keep App* wrappers in sync with new cells and headers (#6633) · `3d3648f`
fix(react-table, preact-table): refresh AppTable context under cached elements (#6631) · `2d5f5b6`
fix(table-core): add `export {}` to declaration files without an export statement (#6620) · `87c6bcc`
feat(table-core): Further improve tree-shaking across features (#6626) · `47733cb` chore(octane-table):
Upgrade to octane 0.12 (#6627). _PRs in the window_:
[#6635](https://github.com/TanStack/table/pull/6635) "fix(table-core): point sorted row model rowsById at
sorted branch clones" (2026-10-20),
[#6634](https://github.com/TanStack/table/pull/6634) "fix(table-core): serialize array values as map keys in
`getFacetedUniqueValues`" (2026-10-13),
[#6623](https://github.com/TanStack/table/pull/6623) "feat(table-core): Improve tree-shaking and show measured
bundle sizes in devtools" (2026-10-08). _Verdict_: **adopt v9, now** — the migration is a day of work at the
start and a fortnight at the end, and the two open fixes are in the faceting and sorting code that our
stops table uses.

**3.4 `better-auth/better-auth` (C10)** — _Docs read_: `better-auth.com/docs/integrations/next` — the RSC
pattern is `auth.api.getSession({ headers: await headers() })` inside a Server Component or a Server Action;
**"As RSCs cannot set cookies, the cookie cache will not be refreshed until the server is interacted with
from the client via Server Actions or Route Handlers"**; **"Better Auth is fully compatible with Next.js 16.
The main change is that 'middleware' is now called 'proxy'"**, with the codemod
`npx @next/codemod@canary middleware-to-proxy .`; `better-auth.com/docs/plugins/organization` — roles
`owner` / `admin` / `member` by default, per-resource permissions, `organizationLimit`, and the server-side
API that takes `headers: await headers()` so the org comes from the session, never the body.
_Governance, verified from two independent first-party sources_: **Vercel acquired Better Auth on
2026-07-07** (vercel.com/blog/vercel-acquires-better-auth, 2026-07-07; confirmed by the acquiring firm's
own client note at clearygottlieb.com/news-and-insights/news-listing/vercel-acquires-better-auth, 2026-07-08).
The announcement states the library **"remains free and open source under MIT"** with "the same open
contribution model, community governance, and framework support". The Better Auth blog post of the same day
adds the other half of the story: **Auth.js / NextAuth had already been taken over by Better Auth**, which
is why `nextauthjs/next-auth` shows 0 commits in the last 90 days (C12). _Last 12 commits (2026-10-19 → 2026-10-20)_:
`f4260a9` chore: release v1.7.12 (#11922) · `f5ea731` fix(sso): verify OIDC ID tokens with the shared step
(#11935) · `4bc78ba` fix(core): reject ID tokens when the provider has no client ID (#11931) · `b18e3b8`
fix(oauth-proxy): run the standard callback checks on proxied callbacks (#11930) · `fb48619` fix(jwt): verify
tokens with the stored key's algorithm (#11925) · `681aa5c` fix(session): keep the cause of session lookup
failures (#11924). _Security_: **37 advisories** on the repo; the newest cluster is **2026-09-30**
(`GHSA-r4xp-prcw-77qf` "OAuth Proxy lets an attacker sign in as another user", `GHSA-965c-763c-88jm` "OAuth
state can be used as a Magic Link to sign in as another user", `GHSA-44jh-23m7-hpcf` "@better-auth/drizzle-adapter:
Concurrent requests can exceed rate limits on PostgreSQL"), all patched in **1.7.7**; `GHSA-8c5h-wx78-2cfg`
(2026-08-11) "@better-auth/sso: Unproven domain claims can allow account takeover or **organization
joining**" is patched in 1.4.8. _Issues in the window_:
[#11910](https://github.com/better-auth/better-auth/issues/11910) "Next.js basePath: stripped Route Handler URL
causes 404 with public auth prefix (1.7.7)" (2026-10-19),
[#11871](https://github.com/better-auth/better-auth/issues/11871) "request-password-reset leaks whether an
address has an account, through how long it takes" (2026-10-16),
[#11898](https://github.com/better-auth/better-auth/issues/11898) "admin create-user is not atomic: a failed
credential link leaves a user with no sign-in" (2026-10-17),
[#11880](https://github.com/better-auth/better-auth/issues/11880) "`user.create.before` returning false crashes
OAuth sign-up with a null dereference instead" (2026-10-16),
[#11893](https://github.com/better-auth/better-auth/issues/11893) "Feature proposal: Headless Application
Access Governance / IGA plugin" (2026-10-17). _Verdict_: **adopt (locked)** — and because the mobile app
pins `1.7.10` while the web decision says `1.7.11` and npm is at **1.7.12**, align all three on **1.7.12**
(patched, above the 1.7.7 line) in one change. The 37 advisories in a year of ownership is a fact the
founder should see; the Vercel backing is the offsetting fact.

**3.5 `maplibre/maplibre-gl-js` (C13)** — _Last 12 commits (2026-10-19 → 2026-10-20)_: `95c7031` fix:
reloading an expired vector tile that moved to another worker with an unchanged ETag (#877…, 2026-10-20) ·
`d5988ef` feat: Allow constructing a map with style transform function (#8786, 2026-10-20) · `23d4e30`
CSC-1.3 Extract the camera state into its own type (#8816, 2026-10-19) · the rest are dependabot bumps
(rollup, vitest, jsdom, puppeteer, codeql). _The two commits that matter to us_: the **style transform
function** is how a single style JSON produces the day and night courier styles, and the **camera state
extraction** is preparation for a stable camera API — a dispatcher "focus on courier X" needs exactly that.
_Issues in the window_:
[#8840](https://github.com/maplibre/maplibre-gl-js/issues/8840) "iOS 15 (iPhone SE / A9): symbol text missing
due to WebKit Metal shader link error" (2026-10-20) — **the mobile app's problem, not the web's, and a reason
the dashboard must not be the only place a map is rendered**,
[#8837](https://github.com/maplibre/maplibre-gl-js/issues/8837) "Canvas stuck at 1×1 after WebGL context loss:
resize during the lost-context window" (2026-10-20),
[#8832](https://github.com/maplibre/maplibre-gl-js/issues/8832) "A style object whose layer fails to load fires
no error event, and `setFilter` keeps…" (2026-10-19),
[#8830](https://github.com/maplibre/maplibre-gl-js/issues/8830) "Support fill-extrusion shadows" (2026-10-19).
_PRs in the window_:
[#8841](https://github.com/maplibre/maplibre-gl-js/pull/8841) "feat: source combinators, `union` and
`difference`, and `geojson-layers`" (2026-10-20),
[#8839](https://github.com/maplibre/maplibre-gl-js/pull/8839) "Ignore the drawing buffer size of a lost WebGL
context on resize" (2026-10-20),
[#8831](https://github.com/maplibre/maplibre-gl-js/pull/8831) "refactor: Make `VectorTileWorkerSource` and
`GeoJSONWorkerSource` work through a new…" (2026-10-19). _Security_: **one** advisory,
`GHSA-jrc7-96c5-q579` (2026-08-19), "XSS Sanitizer Bypass in `DOM.sanitize()` via Live NamedNodeMap Removal
Skip", patched **6.4.1**; we are on **6.15.0**, well above it. The 2026-10-20 note quoted the same advisory
with a CVE number this pass did not re-read → the CVE id is **UNVERIFIED**, the GHSA id and the patch level
are read from the API. _Verdict_: **adopt 6.15.0 + react-map-gl 8.1.3, lazily loaded on the map route only** —
and make the map a route, not a component, so a dispatcher's list page never pays for WebGL.

## 4. Benchmark (V4 §12.5) — **UNVERIFIED: no eval set exists**

**I did not run a benchmark and I will not invent one.** `docs/squads/web/README.md` names the target
(`docs/squads/web/eval/`) and the directory does not exist; `docs/squads/web/benchmarks/README.md` is the
only file under `benchmarks/`; there is no `apps/web`, so there is nothing to run Lighthouse against. Every
row below is **UNVERIFIED** until the set exists, and each row says exactly how we would measure it.

**The set that must be built (name + shape):**

1. **`docs/squads/web/eval/lighthouse/`** — the same six routes rendered twice: a server-rendered
   dashboard home with Cache Components on, and the same route with `use cache` off. Lighthouse CI JSON
   committed per run, desktop **and** mobile emulation, on one runner image.
2. **`docs/squads/web/eval/tenant/`** — 50 organisations × 1 000 stops each, seeded into Postgres with
   PostGIS, plus a **canary organisation** whose ids are the shortest strings in the data. Every dashboard
   route is fetched with a session for org _n_ and asserted to return **0 rows** from any other org.
3. **`docs/squads/web/eval/table/`** — 1 000 rows in the stops table (realistic widths: 42-character
   addresses, 3 currencies, 6 statuses) rendered with TanStack Table v9 + Virtual, and with Recharts
   (TanStack Charts is not a table) — for the scroll and selection benchmarks.
4. **`docs/squads/web/eval/offline/`** — the dashboard opened on a throttled 3G profile with the network
   dropped mid-session, and a dispatcher's phone on mobile data in a lift.

| Metric                                      | Gate                                                                                                                                            | How we would measure it                                                                                                                                                                                                                                                                    | Status                                                                                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Time to build a screen**                  | ≤ 1 day for a dispatcher screen from a spec (list + filter + detail), ≤ 3 days for a screen with a new API endpoint                             | Track in `docs/squads/web/STATUS.md`: for each screen, the calendar days from "spec written" to "merged", recorded per screen, median over the first 10 screens. We build **one** screen per candidate layout (shadcn copy, saleor-dashboard layout, patternfly layout) and time all three | **UNVERIFIED** — no screen exists                                                                                            |
| **Query latency**                           | p95 < 400 ms for a filtered stops page over 50 orgs × 1 000 stops; p95 < 800 ms for the day summary                                             | `pg_stat_statements` sampled in CI; the FastAPI route times the org-scoped repository call, not the HTTP hop. 50 repetitions per route, the 95th percentile reported                                                                                                                       | **UNVERIFIED** — no API query path for the dashboard exists yet                                                              |
| **Cost per courier-month**                  | ≤ **NZ$ 1.50** per active courier per month for the whole web stack (compute + DB + BI + auth)                                                  | (infra $/month ÷ active couriers) + (BI tool $/month ÷ active couriers) + (hosting $/month ÷ active couriers). Vercel Pro is $20/seat/month; self-hosting on a $25 VM with a $40 managed Postgres is the comparison                                                                        | **UNVERIFIED** — we have no courier count and no invoice yet; the arithmetic is stated so the number is not a surprise later |
| **Operational complexity for a small team** | ≤ 1 h/month of operator time per web service, and **no more than 4 services** to keep alive (web, API+Postgres, auth, analytics)                | Count the containers, the cron jobs and the upgrade steps per service; time a real upgrade on a copy of the database. Metabase self-host adds a 5th service — that is the number this metric is designed to catch                                                                          | **UNVERIFIED** — nothing is deployed                                                                                         |
| **Data freshness**                          | the dispatcher's live map shows a courier's position with a **≤ 10 s** age; the settlement view is correct to the penny at the moment of export | Stamp every row with `observed_at`; the map draws `now() - observed_at` in the tooltip, and a synthetic clock offset in CI proves the age is displayed, not hidden                                                                                                                         | **UNVERIFIED** — no live position feed exists on the server yet                                                              |
| **Export correctness**                      | the IRD/GST export reconciles **to the cent** against an independent recomputation from the raw event log, for 30 consecutive days              | Re-compute the totals in SQL from `delivery_event` and in Python from the same rows and assert equality to 2 decimal places; then check the CSV against the GST Act 1985 s75 record list (see `admin-analytics.md` §5)                                                                     | **UNVERIFIED** — the export does not exist                                                                                   |
| **Lighthouse (perf + a11y)**                | ≥ 95 performance and ≥ 95 accessibility on the dashboard home, desktop and mobile                                                               | Lighthouse CI in `.github/workflows/`, the same runner image every run, JSON committed under `docs/evidence/web/`                                                                                                                                                                          | **UNVERIFIED** — no `apps/web`                                                                                               |
| **Token drift**                             | 0 raw hex, px or font names outside `packages/design-tokens`                                                                                    | The lint rule from `CONSTRAINTS.md`; plus `shadcn-ui/lint` (C31) as a second opinion if it can read our CSS variables                                                                                                                                                                      | **UNVERIFIED** — the web build does not exist                                                                                |

**First benchmark to run:** the tenant-isolation set (#2) **before** any screen is written, then the
Lighthouse set (#1) on the first dashboard home. Nothing is declared "the winner" of the layout comparison
before the table exists (V4 §13.1).

## 5. What we are missing → rows for `docs/PARITY.md`

The CEO merges these. Each row is a capability that exists in the market (or in the best OSS repos) and
that we do not have today. The **Spoke** column carries only facts verified in
`docs/study/spoke/TEARDOWN.md` (read 2026-10-21) and is left empty where the teardown is silent.

| #   | Family     | Feature                                                                                 | Status                                   | Spoke (2026-10-20)                                                                                                                                                | Our edge                                                                                                                    | Task  |
| --- | ---------- | --------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----- |
| 50  | Dispatch   | Dispatcher web console with a **timeline view** of the day (not just a map)             | Planned (task)                           | "multi-route planning on an interactive map with a **timeline view**" (TEARDOWN §9, S3/S4)                                                                        | the timeline is driven by the driver's own spoken order, so it shows intent, not just position                              | T7.12 |
| 51  | Dispatch   | **Delivery zones as polygons** and unlimited depots                                     | Planned (task)                           | "delivery zones (polygon areas), depots, unlimited depots" (TEARDOWN §9, S3/S4)                                                                                   | PostGIS zones over the real Canterbury data, and a zone is a route template the driver can rebuild in one tap               | T7.14 |
| 52  | Dispatch   | **Route properties** (max stops per route, vehicle type, driving speed, delivery speed) | Planned (task)                           | "route properties (max stops per route, vehicle type, driving speed, delivery speed)" (TEARDOWN §9, S3/S4)                                                        | the same numbers are learned from the driver's own days instead of typed in                                                 | T7.12 |
| 53  | Dispatch   | **Driver permissions**: what a driver may change versus a dispatcher-created route      | Planned (task)                           | "driver settings and permissions (what drivers may change; may they edit dispatcher routes?)" (TEARDOWN §9, S3/S4)                                                | a role model where the courier's own voice overrides the dispatcher's default, with the audit trail showing who won         | T7.14 |
| 54  | Dispatch   | **Route manifest printing / PDF export** of a day's run sheet                           | Planned (task)                           | "route manifests (print/PDF), customisable" (TEARDOWN §9 and §2.3, S3/S5)                                                                                         | the manifest is generated from the same event log as the settlement, so it cannot disagree with the invoice                 | T7.12 |
| 55  | Dispatch   | **Stop import from a spreadsheet** into the dispatcher's board                          | Planned (task)                           | "stop import ('Add or import stops')" (TEARDOWN §9, S3/S4)                                                                                                        | column mapping by voice, NZ addresses only, and the import is validated by the same address engine the app uses             | T7.12 |
| 56  | Admin      | **SSO and directory sync** for a depot with many drivers                                | Skip (reason) — planned at the Team tier | "SSO + Directory Sync (Expert only)" (TEARDOWN §2.3, S3/S5)                                                                                                       | one Better Auth instance for the mobile app and the console, so an SSO user is the same person on both                      | T7.14 |
| 57  | Admin      | **Data history depth** by plan (30 days / 1 year / 5 years)                             | Planned (task)                           | "Data history: 30 days (Starter), 1 year (Premium), 5 years (Expert)" (TEARDOWN §2.2, S3/S5)                                                                      | the retention rule is written to the NZ Privacy Act 2020 and the IRD's 7-year record rule, not to a plan tier               | T7.15 |
| 58  | Admin      | **Usage and export controls** in the admin console (what data the owner can export)     | Planned (task)                           | "data history and export" (TEARDOWN §9, S3/S4)                                                                                                                    | every export is audited, and an export that contains a courier's location history is a deliberate, logged act               | T7.15 |
| 59  | Analytics  | **Per-courier performance analytics** for the owner                                     | Planned (task)                           | "performance analytics" (TEARDOWN §2.3, S3/S5)                                                                                                                    | the KPIs are computed from the delivery event log, so they survive a driver uninstalling the app                            | T7.12 |
| 60  | Analytics  | **Planned versus actual** reporting (the route as planned against the route as driven)  | Planned (task)                           | "performance analytics" (TEARDOWN §2.3, S3/S5)                                                                                                                    | planned versus actual is a first-class product concept for the driver too, so the same numbers appear in the voice summary  | T7.12 |
| 61  | Earnings   | **Earnings ledger, mileage logbook, IRD/GST export, invoicing and client statements**   | Planned (task)                           | "No earnings, mileage logbook, IRD/GST export, invoicing or client statement in either product" (TEARDOWN §17, S2/S3/S5)                                          | a gap the number one NZ competitor does not have at all; ours is map-matched km against the IRD's published kilometre rates | T7.11 |
| 62  | Analytics  | **Data warehouse** for the founder's own numbers (Postgres views first)                 | Planned (task)                           |                                                                                                                                                                   | the first warehouse we have is the database the app already runs                                                            | T7.12 |
| 63  | Analytics  | **Privacy-safe product analytics** with a defined event taxonomy                        | Planned (task)                           |                                                                                                                                                                   | no address, no name, no GPS ever leaves the device in an event property                                                     | T7.12 |
| 64  | Support    | **Help centre** in the web app                                                          | Planned (task)                           | "live chat support in every Dispatch plan; a dedicated CSM only above $50k/yr" (TEARDOWN §2.3, S3/S5)                                                             | the help centre is searchable by voice in the app and by text on the web, from the same docs                                | T7.12 |
| 65  | Admin      | **Impersonation** into a driver's account, with a recorded reason and a time limit      | Planned (task)                           |                                                                                                                                                                   | the admin cannot see a courier's data until the courier consents or the reason is logged                                    | T7.14 |
| 66  | API        | **Public REST API and signed webhooks** for depot customers                             | Planned (task)                           | "Read/Write API, Webhook API, Zapier, Shopify" (TEARDOWN §10, S3/S4/S5); "no NZ carrier integration found in public sources"                                      | the same API the app uses, org-scoped from the first line of code                                                           | T7.13 |
| 67  | Onboarding | **Guided onboarding** for a new depot                                                   | Planned (task)                           | "Dispatch onboarding is 'Free trial • Onboard in 5 minutes'; personalised onboarding is Expert-only" (TEARDOWN §15, S3/S4/S5); "no voice-guided onboarding found" | onboarding is the same script the driver gets by voice, so the depot owner can hear what the courier hears                  | T7.12 |

**A note on the Spoke column.** The teardown records what Spoke's **Dispatch** product publishes, and it
records one thing Spoke explicitly does **not** have: _"No earnings, mileage logbook, IRD/GST export,
invoicing or client statement in either product"_ (TEARDOWN §17). Everything else above is a published
feature, quoted from the help centre, the pricing pages or the changelog. Where the teardown is silent — the
warehouse, the event taxonomy, the impersonation rule — the column is **empty**, not guessed.

## 6. Decision

1. **Framework: `next@16.4.2`, pinned exactly.** Next.js 16.4 is the version Vercel itself recommends for
   every new app (Cache Components + Partial Prefetching on by default), it is MIT, and it is the only
   framework in the pool that renders a dashboard's list pages as HTML before JavaScript arrives. **The
   five mitigations from 2026-10-20 stand and one of them is now load-bearing:** never pass user-supplied
   SVG/AVIF to the image optimiser; never call `next/og` `ImageResponse` on untrusted input; **keep
   `use cache` off org-scoped data** (four September-2026 advisories are cross-user cache leaks);
   keep the `pnpm audit` gate; re-read the advisory list before every release. The 2026-10-20 count of
   "32 advisories, 6 critical" was **wrong** — it is **72 advisories, 7 critical**.
2. **Components: `shadcn-ui/ui` as a source, never as a dependency.** Copy ≤ 15 components into
   `packages/ui-web`, map each to `packages/design-tokens`, and give each our own test. The registry is
   how upstream distributes; our repo is how _we_ own it.
3. **Data layer: TanStack Table v9 + Query + Virtual**, all MIT, all headless. Adopt **v9 now** — the
   migration guide is explicit about the breaking changes and the cost of migrating later is higher.
   **Re-pin `react-virtual` from the locked `3.13.47` to `3.14.21`** (the 2026-10-20 pin is two minors
   behind; 3.14.21 is the current release).
4. **Auth: Better Auth, unchanged.** The Vercel acquisition (2026-07-07) **strengthens** the locked
   decision: the project is funded, MIT, and Auth.js's stewardship moved to it, so the alternative is
   weaker than it was. **Align the version**: the mobile app pins `1.7.10`, the web decision says `1.7.11`,
   npm is at **`1.7.12`** — move all three to `1.7.12` in one change (it is above the `1.7.7` patch line for
   the three September-2026 advisories).
5. **Map: MapLibre GL JS 6.15.0 + react-map-gl 8.1.3, lazy-loaded on the map route only**, with the same
   style JSON the mobile app uses. The map is a route, not a component: the dispatcher's list page never
   loads WebGL.
6. **Charts: do not choose yet.** `TanStack/charts@1.1.0` is the only candidate with an accessibility
   contract in its API, but it is 4 months old with 2 maintainers. Run it against Recharts in the
   benchmark and pick the winner from the a11y numbers.
7. **Build: `style-dictionary@5.7.0` generates the web CSS variables from `packages/design-tokens`**, so
   the app and the dashboard read the same values. It is a build tool; it never ships.
8. **Test harness: Playwright** in CI for the Lighthouse gate, the a11y gate and the tenant-isolation gate.
9. **Never ship** ag-grid (commercial tier), handsontable (proprietary), twenty (AGPL), nocobase (custom
   licence), EUI (SSPL), heroui-native (NativeWind), umami (wrong question) — plus the existing CI licence
   gate in `scripts/check-licenses.mjs`.
10. **ADR proposals (do not change the locked decisions here):**
    a. **Tailwind on the web** — a second styling technology next to Unistyles 3. The alternative is a
    plain CSS-variable layer with no Tailwind, and `shadcn-ui/lint` may let us lint it. Decide before the
    first component is copied.
    b. **`refinedev/refine` is demoted** — the ops console should use our own data-provider contract
    (borrowed from react-admin) rather than a framework that shipped no npm release since 2026-04-02
    and made 4 commits in 90 days.
    c. **`nextjs/saas-starter`** is a reference, not a base — our own `docs/REPO_RESEARCH.md` says "use",
    and the repository has had no commit since 2025-12-11.
    d. **Re-pin `react-virtual`** to `3.14.21` and **align `better-auth`** to `1.7.12` across the app and
    the web — a version-alignment change to an already-accepted decision.

**Fallback.** If the App Router's cache semantics stay this sharp-edged, the fallback is **not** another
framework — it is the App Router with `cacheComponents` **off**, which is explicitly supported: the
`dynamic` / `revalidate` / `fetchCache` route segment configs still work, the dashboard renders as a
normal server-rendered app, and every query is a live org-scoped repository call. The cost is losing the
static shell; the benefit is that no cross-user cache bug can exist at all, because there is no shared
cache. Given four 2026 advisories in the cross-user-cache class, **this is the fallback we should be ready
to switch to in one commit**, and the ADR should say so before the first screen ships.

**Risk.**

| Risk                                                                             | Severity | Mitigation                                                                                                                                                                         |
| -------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A cross-user cache leak in a multi-tenant dashboard (four 2026-09-30 advisories) | **High** | `use cache` off for org-scoped data; the org id is part of every query key; the tenant-isolation benchmark (W5) is a merge gate; the fallback is `cacheComponents: false`          |
| Next.js advisories keep landing (72 so far, 7 critical)                          | **High** | Pin exactly; re-read the list every release; `pnpm audit` + CodeQL + Semgrep already in CI; the 16.x line is patched on every entry whose patched version the API states precisely |
| The dashboard becomes a generic admin template (the "looks AI-made" failure)     | **High** | No template landing page, no generic KPI tiles; our own screens only — Today's list, Dispatch board, Earnings, Settlements; the layout references are read, not copied             |
| A second token source (Tailwind variables vs `packages/design-tokens`)           | Medium   | Generate the CSS variables from the token package with Style Dictionary; a lint rule rejects raw values; the token-drift benchmark                                                 |
| shadcn components drift upstream                                                 | Medium   | They are our code after copying; provenance in `docs/LICENSES.md`; our own tests own them                                                                                          |
| TanStack Table v9 migration lands late                                           | Medium   | Adopt v9 now with `useLegacyTable` as the temporary aid; do not defer to v10                                                                                                       |
| Map bundle sinks the Lighthouse score                                            | Medium   | The map is a route, `next/dynamic` with `ssr: false`, and no map on the list page                                                                                                  |
| A courier's browser on mobile data (the dispatcher's phone in a lift)            | Medium   | Server-render the lists, no client-side data waterfalls, no chart on the first screen; the offline benchmark W-offline is the gate                                                 |
| `apps/web` grows into a second backend                                           | Medium   | The console reads the same FastAPI API as the app; the Next.js route handlers only proxy, they never query Postgres directly                                                       |

## 7. Monthly radar filter

Run this on the **first working day of each month**, record the result in `docs/EXECUTOR_LOG.md`, and act
only when a trigger fires. ~20 minutes of work.

| #   | Check                          | Command / source                                        | Trigger                                                                                                                                                                   |
| --- | ------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `next` advisories              | `api repos/vercel/next.js/security-advisories`          | **any** new advisory whose `patched_versions` includes our pinned `16.4.2` → bump the pin within 48 h; any **critical** → bump and re-run the Lighthouse set the same day |
| R2  | `next` release cadence         | `api repos/vercel/next.js/releases`                     | 0 releases in 45 days → freeze the version, re-read the advisories, plan the fork conversation                                                                            |
| R3  | `better-auth` advisories       | `api repos/better-auth/better-auth/security-advisories` | any advisory touching **organization**, **session** or **jwt** → patch the auth service within 7 days and re-run the session test                                         |
| R4  | `better-auth` version drift    | npm `better-auth`                                       | a release newer than ours for more than 14 days → upgrade and re-run the Expo plugin test                                                                                 |
| R5  | `@tanstack/react-table` major  | npm + the v9 migration guide                            | a v10 announcement → stop, re-read the migration guide, re-plan the table work                                                                                            |
| R6  | `TanStack/charts` stability    | npm downloads + releases                                | downloads above 500 000/month **and** two human maintainers → promote it into the chart benchmark; below 50 000 for two months → drop it                                  |
| R7  | `shadcn/ui` registry changes   | `api repos/shadcn-ui/ui/commits`                        | the registry protocol changes shape → re-verify the copy process before copying anything new                                                                              |
| R8  | `maplibre-gl` advisories       | `api repos/maplibre/maplibre-gl-js/security-advisories` | any new advisory → patch the web **and** the mobile RN client in the same release (the app shares the style, not the code — but the same CVE class can hit both)          |
| R9  | `refine` health                | npm `@refinedev/core` + commits/90 d                    | a release inside 60 days → move it back to a real candidate; otherwise keep it demoted                                                                                    |
| R10 | `hexclave` health              | releases + stars + licence file                         | an MIT-only re-licence, or self-hosting documented → re-evaluate at v1; it would replace three services with one                                                          |
| R11 | `nextjs/saas-starter` health   | commits/90 d                                            | a commit → re-read it; no commit for 12 months → delete the reference from `docs/REPO_RESEARCH.md`                                                                        |
| R12 | Vercel pricing                 | vercel.com/pricing                                      | Pro above $30/seat/month, or a self-host-relevant feature (e.g. Cache Components) that is Vercel-only → re-cost the self-host plan                                        |
| R13 | Our own gates                  | the CI jobs                                             | a Lighthouse run below 95 on any route → block the merge, not the release                                                                                                 |
| R14 | Token drift                    | the lint rule                                           | any raw hex/px outside `packages/design-tokens` → fail the build                                                                                                          |
| R15 | The tenant-isolation benchmark | `docs/squads/web/eval/tenant/`                          | a single cross-org row → **stop the release** and treat it as a security incident                                                                                         |

## 8. What we could not verify

- **6-month star trend for every candidate** — the star _timeline_ is 403 with our token (re-verified
  2026-10-21). Proxies used: releases/6 m, commits/90 d, human authors/90 d, npm downloads/30 d.
- **Median issue first-response time** — not sampled for this file. The routing note's method (closed-issue
  timelines, n = 2–15 per repo) was **not** repeated here, so no response-time claim is made.
- **Whether `next@16.4.2` is patched for the four advisories whose patched version is truncated**
  (`GHSA-mcj8-r9mp-w47p` `16.3.?`, `GHSA-3w37-wq28-93x7` `16.3.?`, `GHSA-4jqv-mc3x-m676` `15.5.?`,
  `GHSA-cjq9-62q9-8jv4` `16.3.?`) and the two `15.5.28`-only entries (`GHSA-2464-fhr4-w9xw`,
  `GHSA-p3m5-59mp-jv5r`) — **UNVERIFIED for the 16.4.x line**. The API states the patch line, not the
  backport status.
- **The CVE number behind maplibre's `GHSA-jrc7-96c5-q579`** — the 2026-10-20 note quoted
  "CVE-2026-85061"; this pass read the GHSA record and the patch level (6.4.1) but not the CVE id.
- **`hexclave/hexclave`'s exact licence split** — the README badge says MIT / AGPLv3 and the API says
  NOASSERTION; the per-directory split was **not** read.
- **`better-auth-ui`'s npm package** — there is no package by that name on npm (it is a CLI + registry
  model), so there is no download figure to quote.
- **Per-component accessibility of the shadcn catalogue** — not audited component by component. The
  2026-10-20 note's a11y claims for shadcn are **not** re-verified here.
- **The Lighthouse ≥ 95 target** — the dashboard does not exist; every number in §4 is UNVERIFIED.
- **Our own bundle sizes** — the upstream tree-shaking claims were read, our bundle was not measured.
- **The `dataProvider` contract against our FastAPI API** — proposed, not implemented; the mapping is a
  design, not a proof.
- **Whether `apps/web` will use Tailwind** — the ADR has not been taken; the 2026-10-20 note flagged it
  as a trigger and it is still a trigger.
- **The v9 Table migration effort** — the guide is explicit about the changes, but the _effort in hours_
  on our screens is an estimate until the first screen is built.
- **`lytenyte` on npm** — the package name could not be resolved; the repo publishes under a different
  name, so there is no download figure.
- **Superset's, Lightdash's and Preset's numbers** are in the companion file `admin-analytics.md`; they are
  not re-stated here.
