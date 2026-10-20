# Area 3 — Web dashboard (Next.js), admin console, data tables, web maps, web auth

**Researcher:** Researcher role (V4 §1.2) · **Research date:** 2026-10-20 · **Squad:** Web Dashboard & Admin
**Binding inputs:** `docs/KICKOFF_V4_EN.md` §3, §5, §7, §10.3 ("Web Dashboard & Admin: Lighthouse ≥ 95 performance/a11y"), §12 · `CONSTRAINTS.md` · `docs/design/SYSTEM.md`.
**Product rules held in mind:** **Lighthouse ≥ 95** on performance and accessibility · the web app consumes the **same tokens** as the app (`packages/design-tokens` → CSS variables) · **no NativeWind** (and no second token source) · one icon set (Material Symbols), **no emoji** · WCAG 2.2 AA · tenant/org scoping on **every** query (tests must prove isolation) · audit log for admin actions · no PII in logs · NZ English copy · the dashboard is for a **dispatcher/owner** looking at 1–50 couriers, not a public site.

---

## 0. Method and honest limits

- GitHub facts read **2026-10-20** via `scripts/gh.ps1`: `gh api repos/<o>/<r>`, `gh api repos/<o>/<r>/license`, `gh api repos/<o>/<r>/security-advisories`, `gh api repos/<o>/<r>/commits?per_page=20`, `gh api repos/<o>/<r>/readme`, `gh search repos`.
- npm facts from `registry.npmjs.org` + `api.npmjs.org/downloads/point/last-month` (2026-09-19 → 2026-10-19).
- **6-month star trend: UNVERIFIED for every candidate** — the token has no `stargazer` scope (`GET /repos/{o}/{r}/stargazers` → `403 Resource not accessible by personal access token`; GraphQL `stargazers{edges{starredAt}}` → `FORBIDDEN`). The momentum proxy used below is release cadence over 2026-04-20 → 2026-10-20 + commits in 90 days + distinct non-bot maintainers in 90 days.
- Issue counts are `issues(states:OPEN|CLOSED).totalCount` and **include pull requests**.
- Licence is taken from the **LICENSE file** where the API returns `NOASSERTION`; 10 of the candidates ship a mixed or custom licence and are called out explicitly.
- No Lighthouse run was possible in this sprint (no build of the web app is in scope for the Researcher role) → **every Lighthouse row is UNVERIFIED**.

---

## 1. Queries run (V4 §12.2)

| # | Query string | Sort |
|---|---|---|
| A3-01 | `topic:nextjs topic:dashboard stars:>20` | stars |
| A3-02 | `topic:admin-dashboard stars:>50` | stars |
| A3-03 | `topic:datatable stars:>50` | stars |
| A3-04 | `topic:better-auth` | stars |
| A3-05 | `maplibre in:name,description stars:>300` | stars |
| A3-06 | `shadcn in:name stars:>500` | stars |
| A3-07 | `tanstack in:name stars:>500` | stars |
| A3-08 | `react admin nextjs in:description stars:>50` | stars |
| A3-09 | `nextjs data table server components in:description stars:>50` | stars |
| A3-10 | `mapbox react deck.gl in:name,description stars:>100` | stars |
| A3-11 | `topic:react-table` | stars |
| A3-12 | `topic:charts topic:react stars:>50` | stars |

API calls: `repos/{o}/{r}` × 41 · `repos/{o}/{r}/security-advisories` × 6 · `repos/{o}/{r}/license` × 14 · `repos/{o}/{r}/readme` × 6 · `repos/{o}/{r}/commits?per_page=20` × 5 · npm registry × 12 · npm downloads × 16.

---

## 2. Evidence cards — 45 candidates (V4 §12.3)

Legend: `Rel/6m` = releases in the 6 months to 2026-10-20 · `c90` = commits/90 d · `maint` = non-bot authors/90 d · `adv` = GitHub advisories · `dl30` = npm downloads 2026-09-19→2026-10-19.

### 2.1 Framework, UI kit, primitives

| # | Repo | ★ | Created | Pushed | Last release | Rel/6m | Open/Closed | c90 | maint | Licence | Size KB | adv | dl30 | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [vercel/next.js](https://github.com/vercel/next.js) | 143,101 | 2016-10-05 | 2026-10-20 | v16.5.0-canary.19 @2026-10-19 | 15+ | 1117/24512 | 1513 | 20 | MIT | 2,600,285 | **32 (6 critical)** | 266,194,038 (`next@16.4.2`) | **ADOPT** (pin ≥ 16.4.2) |
| 2 | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | 126,009 | 2023-01-04 | 2026-10-19 | shadcn@4.22.1 @2026-10-18 | 15+ | 795/3516 | 275 | 7 | MIT | 73,713 | 0 | 45,990,341 (`shadcn`) | **ADOPT (component source, not a dependency)** |
| 3 | [radix-ui/primitives](https://github.com/radix-ui/primitives) | 19,410 | 2020-06-19 | 2026-10-14 | no GitHub releases | 0 | 124/1705 | 121 | 20 | MIT | 24,234 | 0 | UNVERIFIED | **ADOPT (via shadcn)** |
| 4 | [react-hook-form/react-hook-form](https://github.com/react-hook-form/react-hook-form) | 44,868 | 2019-03-05 | 2026-10-20 | v7.90.0 @2026-10-10 | 15+ | 0/5035 | 217 | 32 | MIT | 33,266 | 0 | UNVERIFIED | **ADOPT (forms)** |
| 5 | [mui/mui-x](https://github.com/mui/mui-x) | 5,865 | 2020-04-30 | 2026-10-20 | v8.29.5 @2026-10-16 | 15+ | 1076/7739 | 497 | 16 | mixed (MIT core + commercial X) | 196,820 | 0 | UNVERIFIED | REJECT (licence + a11y risk vs Radix) |
| 6 | [shadcn-ui/lint](https://github.com/shadcn-ui/lint) | 3,230 | UNVERIFIED | 2026-10-19 | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | MIT | UNVERIFIED | UNVERIFIED | UNVERIFIED | **WATCH — a linter for Tailwind design systems; maps to our token lint rule** |
| 7 | [heroui-inc/heroui-native](https://github.com/heroui-inc/heroui-native) | 3,691 | 2025-06-03 | 2026-10-20 | v1.0.10 @2026-09-21 | 8 | 14/123 | 85 | 6 | Apache-2.0 | 23,154 | 0 | UNVERIFIED | REJECT (NativeWind) |

### 2.2 Data, tables, state, routing

| # | Repo | ★ | Created | Pushed | Last release | Rel/6m | Open/Closed | c90 | maint | Licence | Size KB | adv | dl30 | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 8 | [TanStack/query](https://github.com/TanStack/query) | 50,465 | 2019-09-10 | 2026-10-20 | release-2026-10-19-1659 @2026-10-19 | 15+ | 50/2341 | 848 | 2 | MIT | 137,223 | 0 | 279,215,374 | **ADOPT (server state)** |
| 9 | [TanStack/table](https://github.com/TanStack/table) | 28,505 | 2016-10-20 | 2026-10-12 | @tanstack/alpine-table@9.3.1 @2026-10-12 | 15+ | 47/2537 | 134 | 15 | MIT | 55,776 | 0 | 92,288,276 (`@tanstack/react-table@9.3.1`) | **ADOPT (headless table)** |
| 10 | [TanStack/router](https://github.com/TanStack/router) | 15,234 | 2019-01-14 | 2026-10-19 | release-2026-10-16-2111 @2026-10-16 | 15+ | 332/2070 | 288 | 12 | MIT | 119,429 | 0 | UNVERIFIED | WATCH (App Router is enough for us) |
| 11 | [TanStack/virtual](https://github.com/TanStack/virtual) | 7,150 | 2020-05-08 | 2026-10-17 | @tanstack/vue-virtual@3.13.47 @2026-10-16 | 15+ | 52/331 | 59 | 19 | MIT | 9,908 | 0 | UNVERIFIED | **ADOPT (virtualised long lists)** |
| 12 | [TanStack/form](https://github.com/TanStack/form) | 6,737 | 2016-11-29 | 2026-10-19 | @tanstack/preact-form@2.0.0-alpha.2 @2026-08-21 | 15+ | 127/698 | 22 | 11 | MIT | 47,537 | 0 | UNVERIFIED | WATCH (react-hook-form is enough) |
| 13 | [TanStack/db](https://github.com/TanStack/db) | 3,947 | UNVERIFIED | 2026-10-19 | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | MIT | UNVERIFIED | UNVERIFIED | UNVERIFIED | WATCH |
| 14 | [TanStack/charts](https://github.com/TanStack/charts) | 844 | 2026-07-28 | 2026-10-18 | v1.1.0 @2026-10-09 | 15+ | 35/42 | 468 | 1 | MIT | 20,486 | 0 | UNVERIFIED | **WATCH — challenger (created 2026-07-28)** |
| 15 | [TanStack/ranger](https://github.com/TanStack/ranger) | 841 | 2018-06-23 | 2026-08-03 | @tanstack/react-ranger@0.0.5 @2025-12-06 | 0 | 6/20 | 0 | 0 | MIT | 1,478 | 0 | UNVERIFIED | REJECT (not needed) |
| 16 | [inokawa/virtua](https://github.com/inokawa/virtua) | 3,754 | 2022-10-11 | 2026-10-18 | 0.53.5 @2026-10-12 | 15+ | 41/242 | 288 | 2 | MIT | 424,226 | 0 | UNVERIFIED | WATCH (alternative to TanStack Virtual) |
| 17 | [ag-grid/ag-grid](https://github.com/ag-grid/ag-grid) | 15,645 | 2014-12-23 | 2026-10-20 | release-36.2.0 @2026-09-16 | 7 | 51/7274 | 896 | 13 | **MIT + Commercial** (LICENSE file) | 3,212,736 | 0 | UNVERIFIED | REJECT (enterprise tier, 3.2 GB) |
| 18 | [handsontable/handsontable](https://github.com/handsontable/handsontable) | 22,068 | 2011-05-23 | 2026-10-20 | 18.1.2 @2026-10-07 | 10 | 0/7782 | 716 | 8 | **proprietary** (HANDSONCODE) | 947,149 | 0 | UNVERIFIED | REJECT (non-free) |
| 19 | [1771-Technologies/lytenyte](https://github.com/1771-Technologies/lytenyte) | 1,029 | 2025-01-04 | 2026-08-15 | no releases | 0 | 2/14 | 3 | 1 | **custom (NOASSERTION)** | 171,531 | 0 | UNVERIFIED | WATCH (challenger grid) |
| 20 | [marmelab/react-admin](https://github.com/marmelab/react-admin) | 26,970 | 2016-07-13 | 2026-10-19 | v5.15.5 @2026-10-19 | 8 | 45/4720 | 194 | 9 | MIT | 450,576 | **1 medium** (XSS, patched 3.19.12) | UNVERIFIED | WATCH |

### 2.3 Auth

| # | Repo | ★ | Created | Pushed | Last release | Rel/6m | Open/Closed | c90 | maint | Licence | Size KB | adv | dl30 | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 21 | [better-auth/better-auth](https://github.com/better-auth/better-auth) | 30,385 | 2024-05-19 | 2026-10-20 | v1.7.11 @2026-10-19 | 15+ | 381/3585 | 496 | 29 | MIT | 166,305 | **28 (3 critical)** | 44,611,654 | **ADOPT (locked choice) — see area 2** |
| 22 | [better-auth-ui/better-auth-ui](https://github.com/better-auth-ui/better-auth-ui) | 1,725 | 2024-12-29 | 2026-10-11 | v1.7.30 @2026-10-11 | 15+ | 17/270 | 249 | 7 | MIT | 41,573 | 0 | UNVERIFIED | **ADOPT (sign-in / org pages)** |
| 23 | [authjs/next-auth](https://github.com/authjs/next-auth) | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | **UNVERIFIED — the repo did not resolve with this token; not assessed** |

### 2.4 Maps and visualisation on the web

| # | Repo | ★ | Created | Pushed | Last release | Rel/6m | Open/Closed | c90 | maint | Licence | Size KB | adv | dl30 | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 24 | [maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js) | 11,899 | 2020-12-08 | 2026-10-20 | v6.15.0 @2026-10-18 | 15+ | 260/1470 | 580 | 21 | **BSD-3-Clause** (npm metadata; LICENSE file is BSD-style) | 1,061,073 | **1 critical** (CVE-2026-85061, patched 6.4.1) | 23,780,110 | **ADOPT** |
| 25 | [visgl/react-map-gl](https://github.com/visgl/react-map-gl) | 8,511 | 2015-10-08 | 2026-09-03 | v8.1.3 @2026-09-02 | 2 | 76/1051 | 14 | 7 | **MIT** (LICENSE file) | 37,210 | 0 | 9,184,291 | **ADOPT (React wrapper for MapLibre)** |
| 26 | [visgl/deck.gl](https://github.com/visgl/deck.gl) | 14,688 | 2015-12-15 | 2026-10-20 | v9.4.0 @2026-09-05 | 15+ | 439/2955 | 197 | 17 | MIT | 1,092,398 | 0 | UNVERIFIED | WATCH (only for large datasets) |
| 27 | [recharts/recharts](https://github.com/recharts/recharts) | 27,642 | 2015-08-07 | 2026-10-19 | v3.11.0-canary.6 @2026-10-13 | 13 | 429/3278 | 302 | 17 | MIT | 3,611,973 | 0 | UNVERIFIED | WATCH |
| 28 | [apache/echarts](https://github.com/apache/echarts) | 67,552 | 2013-04-03 | 2026-10-13 | 6.1.0 @2026-05-19 | 3 | 1274/18126 | 19 | 2 | Apache-2.0 | 271,263 | 0 | UNVERIFIED | WATCH (heavy) |
| 29 | [tremorlabs/tremor](https://github.com/tremorlabs/tremor) | 3,672 | 2024-03-26 | 2025-10-10 | none | 0 | 18/41 | 0 | 0 | Apache-2.0 | 4,769 | 0 | UNVERIFIED | REJECT (unmaintained) |
| 30 | [maplibre/maputnik](https://github.com/maplibre/maputnik) | 2,659 | UNVERIFIED | 2026-10-19 | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | MIT | UNVERIFIED | UNVERIFIED | UNVERIFIED | KEEP (style editor — area "Maps") |
| 31 | [maplibre/martin](https://github.com/maplibre/martin) | 4,012 | UNVERIFIED | 2026-10-20 | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | Apache-2.0 | UNVERIFIED | UNVERIFIED | UNVERIFIED | WATCH (tile server for the dashboard) |

### 2.5 Admin-console frameworks and dashboard templates

| # | Repo | ★ | Created | Pushed | Last release | Rel/6m | Open/Closed | c90 | maint | Licence | Size KB | adv | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 32 | [payloadcms/payload](https://github.com/payloadcms/payload) | 45,369 | 2021-01-05 | 2026-10-19 | v4.0.0-beta.3 @2026-10-19 | 15+ | 526/4388 | 495 | 20 | MIT | 234,215 | 0 | WATCH (admin panel + API in one; heavy) |
| 33 | [appsmithorg/appsmith](https://github.com/appsmithorg/appsmith) | 41,093 | 2020-06-30 | 2026-10-20 | v2.5.0 @2026-10-09 | 9 | 4431/19338 | 189 | 7 | Apache-2.0 | 819,556 | 0 | REJECT (low-code platform, not our dashboard) |
| 34 | [nocobase/nocobase](https://github.com/nocobase/nocobase) | 24,634 | 2020-10-24 | 2026-10-20 | release-beta/2026-10-20.2 | 15+ | 109/1463 | 469 | 10 | **custom "NocoBase License Agreement"** | 640,172 | 0 | REJECT (custom licence) |
| 35 | [twentyhq/twenty](https://github.com/twentyhq/twenty) | 58,657 | 2022-12-01 | 2026-10-20 | sdk/v2.49.0 @2026-10-19 | 15+ | 69/7034 | 3349 | 13 | **AGPLv3** (mostly) | 2,239,792 | 0 | REJECT (AGPL → clean-room study only) |
| 36 | [calcom/cal.com](https://github.com/calcom/cal.com) | 49,168 | 2021-03-22 | 2026-10-19 | v6.2.0 @2026-03-01 | 0 | 1153/8297 | 24 | 22 | MIT | 1,157,399 | 0 | WATCH (reference dashboard only) |
| 37 | [saleor/saleor-dashboard](https://github.com/saleor/saleor-dashboard) | 1,044 | 2019-06-19 | 2026-10-19 | 3.23.41 @2026-10-19 | 15+ | 23/1500 | 195 | 9 | BSD-3-Clause | 219,046 | 0 | WATCH (real admin console reference) |
| 38 | [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) | 15,814 | 2024-01-26 | 2026-09-10 | v2.2.1 @2025-11-06 | 0 | 13/56 | 0 | 0 | MIT | 2,996 | 0 | WATCH (template, no releases since 2025-11) |
| 39 | [Kiranism/next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter) | 7,147 | 2023-11-02 | 2026-09-11 | v2.0.0 @2026-07-18 | 2 | 4/68 | 54 | 1 | MIT | 5,109 | 0 | WATCH (starter reference) |
| 40 | [arhamkhnz/next-shadcn-admin-dashboard](https://github.com/arhamkhnz/next-shadcn-admin-dashboard) | 3,187 | 2024-08-01 | 2026-10-20 | none | 0 | 1/18 | 165 | 2 | MIT | 13,328 | 0 | WATCH |
| 41 | [nellavio/nellavio](https://github.com/nellavio/nellavio) | 509 | 2023-08-23 | 2026-08-28 | 2.0.1 @2026-04-12 | 0 | 0/3 | 8 | 1 | MIT | 7,124 | 0 | WATCH (Next.js + Better Auth + RBAC reference) |
| 42 | [basetool-ai/basetool](https://github.com/basetool-ai/basetool) | 286 | 2021-08-23 | 2022-10-10 | v0.0.1 @2021-11-15 | 0 | 0/4 | 0 | 0 | Apache-2.0 | 4,967 | 0 | REJECT (dead since 2022) |
| 43 | [TailAdmin/free-nextjs-admin-dashboard](https://github.com/TailAdmin/free-nextjs-admin-dashboard) | 2,588 | UNVERIFIED | 2026-09-15 | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | MIT | UNVERIFIED | UNVERIFIED | WATCH (template reference) |
| 44 | [ajnart/homarr](https://github.com/ajnart/homarr) | 7,201 | UNVERIFIED | 2026-06-01 | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | MIT | UNVERIFIED | UNVERIFIED | WATCH (Mantine dashboard reference) |
| 45 | [devias-io/material-kit-react](https://github.com/devias-io/material-kit-react) | 5,580 | UNVERIFIED | 2025-06-10 | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | MIT | UNVERIFIED | UNVERIFIED | REJECT (MUI, stale since 2025-06) |

---

## 3. Shortlist (12) — better than our current choice, risks, decision

| Candidate | Better than our current choice | Risk | Decision + reason |
|---|---|---|---|
| `shadcn-ui/ui` | Components are **copied into our repo**, not installed — they become *our* code, governed by *our* token lint rule and *our* test suite. MIT, 0 advisories, 45.99 M dl/30 d, 15 releases/6 m | Upstream components assume Tailwind CSS variables; we must map `packages/design-tokens` → CSS variables ourselves, and every copied component must be audited for a11y | **ADOPT — copy, don't depend.** This is the only approach that keeps a single token source (V4 §5) |
| `next@16.4.2` | App Router + server components → the dashboard can be mostly static/streamed, which is how we hit Lighthouse ≥ 95 | **32 advisories, 6 critical** (2026 cluster): unauthenticated RCE in the Image Optimization API (SVG/AVIF), RCE in `use cache`, RCE in `next/og` `ImageResponse`, RCE in `use cache` typed arrays, RCE on Windows hosts. All fixed in 15.5.x/16.2.11/16.3.6/16.3.8/16.4.1 — 16.4.2 is above every 16.x patch line, but **the 15.x-only entries have no 16.x marker in the API** | **ADOPT at 16.4.2**, pin exactly, re-read the advisory list every release, keep `images.unoptimized` off, and never render user-supplied SVG through the image optimiser |
| `TanStack/table@9.3.1` | Headless: we own the markup → our tokens, our a11y, our column definitions. 28.5 k ★, 92.3 M dl/30 d, 15+ releases/6 m | v9 is a new major (row models changed) — read the migration notes before upgrading | **ADOPT** for the stops table and the payouts table |
| `TanStack/query@5.104.5` | The standard for server state: caching, invalidation after a mutation, and a natural place to put our **org-scope** query keys | 2 maintainers in the window (`sukvvon`, `TkDodo`) — bus factor is real but the project is huge and stable | **ADOPT** |
| `TanStack/virtual` | Row virtualisation for the 300+ stop list and long courier histories | needs a measured row height | **ADOPT** |
| `maplibre-gl@6.15.0` | BSD-3-Clause, 23.8 M dl/30 d, 21 human maintainers, 15+ releases/6 m, **one critical advisory (CVE-2026-85061, XSS sanitizer bypass in `DOM.sanitize`, patched 6.4.1) — we are on 6.15.0, above the patch** | WebGL bundle is heavy; a map on the landing route can sink Lighthouse | **ADOPT**, but load the map **lazily and only on the map route** (`next/dynamic`, `ssr: false`) and keep it out of the initial bundle |
| `react-map-gl@8.1.3` | The React binding for MapLibre (the MIT-licensed `@vis.gl/react-maplibre` path inside) — avoids the Mapbox SDK/licence entirely | 14 commits/90 d on the wrapper; core MapLibre does the work | **ADOPT** |
| `better-auth-ui` | Ready-made sign-in / sign-up / org / invitation pages that match our Better Auth instance; 15+ releases/6 m, MIT | components assume shadcn/Tailwind | **ADOPT (copy, restyle to our tokens)** |
| `react-hook-form@7.90.0` | Form state with the resolver pattern; 44.9 k ★, 32 human maintainers | none material | **ADOPT** |
| `react-admin@5.15.5` | A complete admin framework: list/edit/detail pages, RBAC, optimistic updates, 45+ data adapters, 4,720 closed issues worth of hardening | Material UI, not our design; 1 medium advisory (old XSS, patched 3.19.12 — current 5.15.5 is safe) | **WATCH** — steal its resource/data-provider patterns; do not adopt the framework |
| `TanStack/charts@1.1.0` | New charting grammar (created 2026-07-28) aimed at accessible, server-renderable charts; 468 commits/90 d | 1 maintainer (tannerlinsley), pre-1.0 API churn | **WATCH — challenger** (§12.6 anti-bias) |
| `payloadcms/payload` | Admin panel + REST/GraphQL + auth in one MIT package; 45.4 k ★, 20 maintainers, v4 beta | v4.0.0-beta → API churn; we already have a Python API + Postgres | **WATCH** |

---

## 4. Deep review — top 5 (V4 §12.4)

### 4.1 `shadcn-ui/ui` (126,009 ★, MIT, npm `shadcn`)
- **README / docs:** "A set of beautifully designed components that you can customize, extend, and build on… Make them yours." The model is *copy the code*, not install a runtime — the CLI writes component source into `components/ui`.
- **Architecture:** a **registry** (the registry protocol became the distribution channel — commits `feat(registry): add community registries` on 2026-10-16 and 2026-10-19), a Tailwind preset, CSS variables for theming, and a CLI (`shadcn`).
- **Last 20 commits:** registry work, CLI fixes (`fix(cli): respect style availability in add --all`), docs, and template dependency bumps. **No runtime code churn** — because there is no runtime: it is source we own after copying.
- **API ergonomics / extensibility:** the best in the ecosystem for our case — every component is a file in our repo, so `docs/design/SYSTEM.md` §2 (tokens only from `packages/design-tokens`, no raw hex/px in components) can be enforced by our existing lint rule over copied code.
- **Accessibility:** Radix primitives underneath; each component carries ARIA semantics. We must still audit contrast and focus order against WCAG 2.2 AA — the components are a starting point, not a certificate.
- **Tests / CI:** the repo builds the docs site and templates; per-component test coverage is UNVERIFIED. **Our** rule: every copied component enters our repo with our own test (CONSTRAINTS.md: no test deletion, ≥ 72 % ratchet).
- **Risk:** copying ~40 components inflates the repo and the review burden; the fix is to copy only what the dashboard needs (≈ 15 components) and to keep a `docs/LICENSES.md` entry per copied block.
- **Verdict:** **ADOPT as a source, in a `packages/ui-web` workspace, token-mapped, component-by-component with our own tests.**

### 4.2 `vercel/next.js` (143,101 ★, MIT, npm `next@16.4.2`)
- **README / docs:** the canonical docs site + the canary train.
- **Architecture:** App Router, RSC, server actions, `use cache`, Turbopack, image optimisation, `proxy.ts` (middleware rename visible in the commits).
- **Last 20 commits:** infrastructure-level work — `[ci] Upload adapter test results via GitHub Actions OIDC`, `turbo-persistence: read compaction inputs with pread instead of mmap` (a real perf fix), `Add <Link prefetch="navigation">`, `remove Static render stage`, `Don't load the app-page runtime in proxy.ts`, plus test-flakiness fixes (`test: avoid useTempDir cleanup hang on Windows`). This is a healthy, performance-focused upstream.
- **Security — the headline:** **32 advisories** with **6 critical**, clustered in 2026: unauthenticated RCE in the Image Optimization API with **SVG** files (GHSA-2464-fhr4-w9xw / CVE-2026-96889, patched 15.5.28), unauthenticated RCE in `use cache` functions returning typed arrays (GHSA-673q-mjm6-r5xr, patched 16.4.1), RCE in `next/og` `ImageResponse` (GHSA-vcvr-r3jv-pc5j / CVE-2026-94545, patched 16.3.6), unauthenticated RCE with AVIF (patched 15.5.24), RCE on Windows-hosted servers (patched 15.5.24), plus SSRF in the image optimiser and in rewrites, cache poisoning in SSG/ISR, and several "Middleware / Proxy bypass in App Router" advisories. **Current 16.4.2 is above every patched version listed on the 16.x line (16.2.11, 16.3.6, 16.3.8, 16.4.1); the 15.5.x entries have no 16.x marker in the advisory list, so treat the 16.x line as patched only where the API says so.**
- **Our mitigations (to write into the dashboard ADR):** (1) pin `next@16.4.2` exactly; (2) never pass user-supplied SVG/AVIF to the image optimiser; (3) do not use `next/og` `ImageResponse` on untrusted input; (4) keep `use cache` off for org-scoped data; (5) `pnpm audit` gate is already in CI — keep it; (6) re-read the advisory list before each release (V4 §3.4).
- **Performance claims:** the `pread` compaction fix and `<Link prefetch="navigation">` are upstream wins we get for free. Our Lighthouse ≥ 95 target is **UNVERIFIED** — we have not built the dashboard yet (T5/T6).
- **Verdict:** **ADOPT at 16.4.2**, with the five mitigations above written into the ADR.

### 4.3 `TanStack/table` (28,505 ★, MIT, npm `@tanstack/react-table@9.3.1`)
- **README / docs:** "Headless UI for building powerful tables & datagrids for TS/JS".
- **Architecture:** `@tanstack/table-core` + framework adapters (React/Vue/Solid/Svelte) — v9 continues the split, with a **feature-based tree-shaking** effort visible in the commits (`feat(table-core): Further improve tree-shaking across features`, `feat(table-core): Improve tree-shaking and show measured bundle sizes in devtools`, 2026-10-08). Measured bundle sizes in devtools is exactly the kind of signal we need for Lighthouse.
- **Last 20 commits:** `fix(svelte-table, vue-table): Keep App* wrappers in sync with new cells and headers`, `fix(react-table, preact-table): refresh AppTable context under cached elements`, `feat(skills): Add progressive disclosure to bundled skills` (AI-agent docs), `chore: refresh Start example dependencies`.
- **API ergonomics:** column defs + row models (`getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel`, `getPaginationRowModel`); we own the markup, so we can render our tokens, our density and our a11y (e.g. `aria-sort`, real `<th scope>`).
- **Extensibility:** column visibility, column pinning, sorting, grouping, row selection — our dispatcher needs grouping by courier and by status.
- **Tests:** unit tests exist in the repo (commits reference table-specific fixes); coverage % UNVERIFIED.
- **Risks:** v9 is a major with API changes; adopting it late in the project costs a migration. **Decision: adopt v9 now, not v8.**
- **Verdict:** **ADOPT `@tanstack/react-table@9.3.1`.**

### 4.4 `maplibre/maplibre-gl-js` (11,899 ★, BSD-3-Clause, npm `maplibre-gl@6.15.0`)
- **README / docs:** MapLibre GL JS — interactive vector tile maps in the browser; the project is the vendor-neutral successor to Mapbox GL JS.
- **Architecture:** WebGL2 renderer, style-spec driven, worker-based tile parsing; supports vector/raster/GeoJSON sources, and now **trusted-types** as a first step (`first step towards supporting trusted-types`, 2026-10-18) — that is a security-motivated change we want.
- **Last 20 commits:** `fix: reloading an expired vector tile that moved to another worker`, `feat: Allow constructing a map with a style transform function` (useful for day/night styles), `Fix GeoJSONSource.getBounds throwing on features with a null geometry`, `Allow maxBounds to leave one axis unconstrained` (useful for a city view), `Fix registered projections going blank when the center crosses 180°`, plus dependency bumps (rollup 1.2.13→1.2.14, vitest, jsdom, puppeteer).
- **Security:** one advisory — **critical**, CVE-2026-85061 / GHSA-jrc7-96c5-q579, "XSS Sanitizer Bypass in `DOM.sanitize()` via Live NamedNodeMap Removal Skip", **patched 6.4.1**; we are on **6.15.0**, above the fix. That matters because our dashboard renders courier addresses and customer names from the API into map popups.
- **Performance claims:** the repo's own benchmark suite exists but is not published as a number we can quote → UNVERIFIED for our pages.
- **Extensibility:** we already use Protomaps/PMTiles styles in the app; the same style JSON works on the web, so the **day/night courier style is written once** — a real parity win.
- **Verdict:** **ADOPT `maplibre-gl@6.15.0` + `react-map-gl@8.1.3`, lazily loaded on the map route only.**

### 4.5 `marmelab/react-admin` (26,970 ★, MIT, v5.15.5)
- **README / docs:** "A frontend Framework for building single-page applications running in the browser on top of REST/GraphQL APIs, using TypeScript"; 45+ data adapters; "High Quality: Accessibility, responsive, secure, fast, testable".
- **Architecture:** `dataProvider` / `authProvider` / `accessControl` contracts → the cleanest published model of an admin console over an API. Resource-oriented (`<List>`, `<Edit>`, `<Show>`), with optimistic UI and a `useListController`.
- **Last 20 commits:** `Fix UrlField and FileField may execute JS code on click` (2026-10-19 — a real security fix, using a regexp instead of `URL`), `Accept plain object headers in fetchJson`, `useDebouncedEvent` fixes with tests, `FilterForm shows added filters in an arbitrary order`, `Flatten unit tests`.
- **API ergonomics:** the `dataProvider` contract is exactly what our Python API should expose (list with sort/filter/pagination metadata, get one, create, update, delete) — **worth copying even if we do not adopt the framework.**
- **Extensibility:** `authProvider` + `canAccess` for RBAC; we need **org scoping** on every query — react-admin has no built-in tenant scoping, so we would have to inject the org filter into every `dataProvider` call and test it.
- **Tests:** unit tests are part of the commits (they "flattened" them) → a real test culture; coverage % UNVERIFIED.
- **Security:** 1 advisory — medium XSS in `RichTextField` (CVE-2023-25572, patched 3.19.12); current 5.15.5 is far above the fix.
- **Risks:** Material UI look, a large surface, and it would fight our token system; the "admin" feel can look generic — the brief says the product must not look AI-made.
- **Verdict:** **WATCH — adopt the *patterns* (`dataProvider`, `authProvider`, `accessControl`), not the framework.**

---

## 5. Benchmarks (V4 §12.5) — all UNVERIFIED; sets named

| # | Benchmark | Candidates | Metric | Target | Status | Set to build |
|---|---|---|---|---|---|---|
| W1 — Lighthouse (perf + a11y) | our dashboard vs a `shadcn-admin` template vs `react-admin` | Lighthouse on the dashboard home (desktop + mobile) | **≥ 95 performance and ≥ 95 accessibility** | **UNVERIFIED** | `docs/squads/web/benchmarks/lighthouse/` — same routes, same CI runner, Lighthouse CLI JSON committed |
| W2 — Bundle budget | MapLibre eager vs lazy | initial JS on the dashboard home | ≤ 200 KB initial (our own budget — to be written into CONSTRAINTS.md) | **UNVERIFIED** | same set as W1 |
| W3 — Long list | TanStack Table + Virtual vs plain table | 1,000 stops rendered | 60 fps scroll, no layout thrash | **UNVERIFIED** | `docs/squads/web/benchmarks/long-list/` |
| W4 — Table a11y | our TanStack Table markup vs react-admin | screen-reader + keyboard on the stops table | sortable headers announced, row nav, focus ring visible | **UNVERIFIED** | `docs/squads/web/benchmarks/table-a11y/` |
| W5 — Tenant isolation | our API + every dashboard query | 50 orgs × 20 queries | 0 cross-org rows | **UNVERIFIED** | `docs/squads/web/benchmarks/tenant-isolation/` — **mandatory** (V4 §7) |
| W6 — Map parity | one style JSON on web vs app | day/night courier style, house numbers at z17 | identical rendering | **UNVERIFIED** | `docs/squads/web/benchmarks/style-parity/` |
| W7 — Token drift | Tailwind CSS vars vs `packages/design-tokens` | every colour/spacing/radius token | 0 raw values outside the token package | **UNVERIFIED** | `docs/squads/web/benchmarks/token-drift/` |

---

## 6. Decisions for the Web Dashboard & Admin squad

**ADOPT**
1. `next@16.4.2` — pinned exactly; five security mitigations recorded in §4.2.
2. `shadcn-ui/ui` as a **source of components** copied into `packages/ui-web`, each mapped to `packages/design-tokens` and each with our own test. No shadcn runtime dependency.
3. `@tanstack/react-table@9.3.1`, `@tanstack/react-query@5.104.5`, `@tanstack/react-virtual@3.13.47` — headless, token-friendly, all MIT, all 15+ releases/6 m.
4. `maplibre-gl@6.15.0` + `react-map-gl@8.1.3` — BSD-3-Clause/MIT, above their only critical advisory, lazy-loaded.
5. `better-auth@1.7.11` (locked) + `better-auth-ui` — sign-in, org switch, invitations; copied and restyled.
6. `react-hook-form@7.90.0` — forms.
7. `radix-ui/primitives` (via shadcn) — accessible primitives, MIT, 20 maintainers.

**KEEP**
8. `maplibre/maputnik` — the style editor that will produce our shared day/night courier style (V4 §11.1 item 10).
9. `maplibre/martin` — if we serve tiles from our own infrastructure rather than a public tile endpoint (watch for the self-hosting cost).

**WATCH**
10. `marmelab/react-admin` — copy the `dataProvider` / `authProvider` / `accessControl` contracts.
11. `TanStack/charts@1.1.0` — the accessible, server-renderable charting challenger.
12. `payloadcms/payload` — admin+API in one; a plan-B if the Python API route gets heavy.
13. `saleor/saleor-dashboard`, `satnaing/shadcn-admin`, `Kiranism/next-shadcn-dashboard-starter`, `nellavio/nellavio`, `TailAdmin`, `homarr`, `calcom/cal.com` — layout and structure references for the dispatcher screens.
14. `shadcn-ui/lint` — a linter for Tailwind design systems; candidate for our "no raw values in components" rule.
15. `virtua`, `lytenyte` — grid/virtualisation challengers.
16. `recharts` / `echarts` / `deck.gl` — charting and large-dataset visualisation; only if TanStack Charts is not enough.

**REJECT**
17. `nativewind` / `heroui-native` — locked styling rule (see area 1).
18. `ag-grid` (MIT + Commercial, 3.2 GB repo), `handsontable` (proprietary) — licence.
19. `twentyhq/twenty` (AGPL), `nocobase` (custom), `appsmith` (a platform, not a dashboard) — licence/fit.
20. `tremorlabs/tremor` — unmaintained since 2025-10-10.
21. `basetool-ai/basetool` (dead since 2022), `devias-io/material-kit-react` (stale since 2025-06).
22. `mui/mui-x` — commercial tier + heavier than Radix.
23. `authjs/next-auth` — repo did not resolve with this token → **UNVERIFIED, not assessed**; Better Auth is the locked choice anyway.

---

## 7. Risks, fallbacks, ADR triggers

| Risk | Impact | Fallback / mitigation |
|---|---|---|
| Next.js 2026 advisory cluster (6 critical) | RCE / SSRF / cache poisoning on the dashboard | pin 16.4.2; the five mitigations in §4.2; `pnpm audit` gate; re-read advisories every release |
| A second token source (Tailwind vars vs our tokens) | visual drift between app and dashboard | `packages/design-tokens` → CSS variables generated by our build; a lint rule rejects raw values; token-drift benchmark W7 |
| Map bundle on the landing route | Lighthouse < 95 | lazy-load MapLibre, `ssr: false`, no map on the home route |
| shadcn components drift upstream | unmaintained copies | pin the copied source in our repo (it *is* our code); record provenance in `docs/LICENSES.md`; our own tests own it |
| Cross-tenant leakage in a dashboard query | legal/privacy incident (NZ Privacy Act) | every query goes through a repository that takes the org id from the session, never from the request body; tenant-isolation benchmark W5 |
| Dashboard becomes a generic admin template | "looks AI-made" | our own screens only: Today's list, Dictation report, Dispatch board, Payouts — no template landing page, no generic KPI tiles |
| Data volume (300+ stops/day, 50 couriers) | slow tables | TanStack Virtual + server-side pagination/sorting; long-list benchmark W3 |

**ADR trigger:** adopting Tailwind CSS on the web (a second styling technology next to Unistyles 3) changes a locked decision → ADR + `docs/DECISIONS.md`. The same applies to adopting `react-admin` or `payload`.

---

## 8. What could not be verified (V4 §12.6)

- **6-month star trend** for all 45 candidates (token lacks the `stargazer` scope).
- **Lighthouse ≥ 95** — the dashboard does not exist yet; W1–W7 are UNVERIFIED.
- **`authjs/next-auth`** — repository could not be resolved with this token; no facts collected.
- **`shadcn-ui/lint`, `TanStack/db`, `TailAdmin`, `homarr`, `maplibre/maputnik`, `maplibre/martin`** — only search-level metadata (stars/licence/pushed date) was collected; their release cadence, maintainer counts and advisories are UNVERIFIED.
- **Per-component a11y of the shadcn catalogue** — not audited component by component.
- **Bundle sizes** — the upstream tree-shaking claims were read, but our own bundle was not measured.
- **React-admin's `dataProvider` contract against our Python API** — not implemented; the mapping is proposed, not proven.
- **Whether `next@16.4.2` is patched for the two 15.5.x-only critical advisories** — the advisory list gives no 16.x marker for them; treat as UNVERIFIED until the advisory is re-read.
