# Web Dashboard & Admin Squad - research

**Area:** web dashboard (Next.js), admin console, data tables, web maps, web auth **Research date:** 2026-10-20 · **Source file:** `docs/research/2026/web-dashboard-nextjs.md`

## Queries that found the candidates

`topic:nextjs topic:dashboard stars:>20` · `topic:admin-dashboard stars:>50` · `topic:datatable stars:>50` · `topic:better-auth` · `"maplibre in:name,description stars:>300"` · `"shadcn in:name stars:>500"` · `"tanstack in:name stars:>500"`
· `"react admin nextjs in:description"` · `"nextjs data table server components"` · `"mapbox react deck.gl"` · `topic:react-table` · `topic:charts topic:react`. API calls: `repos/{o}/{r}` (41) · `/security-advisories` (6) · `/license` (14) ·
`/readme` (6) · `/commits?per_page=20` (5) · npm registry (12) · npm downloads (16). Candidates examined: **45**.

## Candidates that matter

| Project | Repo | Licence | One-line reason |
|---|---|---|---|
| shadcn/ui | `shadcn-ui/ui` | MIT | Components are **copied into our repo**, not installed - so they become our code under our token lint rule and our tests. |
| Next.js | `vercel/next.js` | MIT | App Router + server components; the dashboard can be mostly static/streamed, which is how we hit Lighthouse >= 95. |
| TanStack Table | `TanStack/table` | MIT | Headless: we own the markup, our tokens, our a11y, our column definitions. |
| TanStack Query / Virtual | `TanStack/query`, `TanStack/virtual` | MIT | The standard for server state (caching, invalidation, org-scoped query keys) and row virtualisation for 300+ stops. |
| MapLibre GL JS | `maplibre/maplibre-gl-js` | BSD-3-Clause | The vendor-neutral web renderer; the same style JSON as the app, so the day/night courier style is written once. |
| react-map-gl | `visgl/react-map-gl` | MIT | The React binding for MapLibre; avoids the Mapbox SDK/licence entirely. |
| better-auth-ui | `better-auth-ui/awesome-better-auth-ui` | MIT | Ready-made sign-in / sign-up / org / invitation pages matching our Better Auth instance. |
| react-hook-form | `react-hook-form/react-hook-form` | MIT | Form state with the resolver pattern. |
| react-admin | `marmelab/react-admin` | MIT | A complete admin framework; 4,720 closed issues worth of hardening, but Material UI and a big surface. |
| TanStack Charts | `TanStack/charts` | MIT | New accessible, server-renderable charting grammar (created 2026-07-28) - a challenger. |
| Payload | `payloadcms/payload` | MIT | Admin panel + REST/GraphQL + auth in one package; v4 beta. |
| Tailwind / NativeWind / HeroUI / MUI X / AG Grid | various | mixed | Locked styling rule, copyleft, commercial tier or a 3.2 GB repo - all rejected. |

## Deep review - top 5

1. **shadcn-ui/ui** (126,009 ★, MIT) - the model is *copy the code*, not install a runtime: the CLI writes component source into `components/ui`. The architecture is a **registry** (the registry protocol became the distribution channel -
   "add community registries" on 2026-10-16 and 2026-10-19), a Tailwind preset, CSS variables for theming and a CLI. The last 20 commits are registry work, CLI fixes and template dependency bumps - **no runtime code churn, because there is
   no runtime: it is source we own after copying**. Every component is a file in our repo, so `docs/design/SYSTEM.md` §2 (tokens only from `packages/design-tokens`, no raw hex/px) can be enforced by our existing lint rule over copied code.
   Accessibility rests on Radix primitives; we must still audit contrast and focus order against WCAG 2.2 AA. Risk: copying ~40 components inflates the repo - the fix is to copy only what the dashboard needs (<= 15) and keep a
   `docs/LICENSES.md` entry per copied block. **Verdict ADOPT as a source, in a `packages/ui-web` workspace, token-mapped, component-by-component with our own tests.**
2. **vercel/next.js** (143,101 ★, MIT, npm `next@16.4.2`) - App Router, RSC, server actions, `use cache`, Turbopack, image optimisation. The last 20 commits are infrastructure-level work (GitHub Actions OIDC upload, a `pread` compaction
   fix, `<Link prefetch="navigation">`, a removed static render stage, plus test-flakiness fixes) - a healthy, performance-focused upstream. **Security is the headline: 32 advisories with 6 critical**, clustered in 2026 - unauthenticated
   RCE in the Image Optimization API with **SVG** files (GHSA-2464-fhr4-w9xw / CVE-2026-96889, patched 15.5.28), unauthenticated RCE in `use cache` functions returning typed arrays (GHSA-673q-mjm6-r5xr, patched 16.4.1), RCE in `next/og`
   `ImageResponse` (GHSA-vcvr-r3jv-pc5j / CVE-2026-94545, patched 16.3.6), unauthenticated RCE with AVIF (patched 15.5.24), RCE on Windows-hosted servers (patched 15.5.24), plus SSRF in the image optimiser and in rewrites, cache poisoning
   in SSG/ISR, and several Middleware/Proxy bypass advisories. 16.4.2 is above every patched version listed on the 16.x line, but the 15.5.x entries have no 16.x marker in the API, so treat the 16.x line as patched only where the API says
   so. **Our mitigations:** pin `next@16.4.2` exactly; never pass user-supplied SVG/AVIF to the image optimiser; do not use `next/og` `ImageResponse` on untrusted input; keep `use cache` off for org-scoped data; keep the `pnpm audit` gate;
   re-read the advisory list before each release. **Verdict ADOPT at 16.4.2 with those mitigations in the ADR.**
3. **TanStack/table** (28,505 ★, MIT, npm `@tanstack/react-table@9.3.1`) - `@tanstack/table-core` plus framework adapters; v9 continues the split, with a **feature-based tree-shaking** effort visible in the commits ("Further improve
   tree-shaking across features", "show measured bundle sizes in devtools", 2026-10-08) - measured bundle sizes in devtools is exactly the signal we need for Lighthouse. API ergonomics: column definitions plus row models (`getCoreRowModel`,
   `getSortedRowModel`, `getFilteredRowModel`, `getPaginationRowModel`); we own the markup, so we can render our tokens, our density and our a11y (`aria-sort`, real `<th scope>`). Extensibility: column visibility, pinning, sorting,
   grouping, row selection - our dispatcher needs grouping by courier and by status. Risk: v9 is a major with API changes, so **adopt v9 now, not v8**. **Verdict ADOPT.**
4. **maplibre/maplibre-gl-js** (11,899 ★, BSD-3-Clause, npm `maplibre-gl@6.15.0`) - a WebGL2 renderer driven by a style spec, with worker-based tile parsing; it now supports **trusted-types** as a first step (2026-10-18), a
   security-motivated change we want. The last 20 commits include "Allow constructing a map with a style transform function" (useful for day/night styles) and "Allow maxBounds to leave one axis unconstrained" (useful for a city view).
   **Security: one critical advisory**, CVE-2026-85061 / GHSA-jrc7-96c5-q579, "XSS Sanitizer Bypass in `DOM.sanitize()` via Live NamedNodeMap Removal Skip", **patched 6.4.1** - we are on 6.15.0, above the fix, which matters because our
   dashboard renders courier addresses and customer names into map popups. We already use Protomaps/PMTiles styles in the app, so the same style JSON works on the web - **the day/night courier style is written once, a real parity win**.
   **Verdict ADOPT at 6.15.0 + `react-map-gl@8.1.3`, lazily loaded on the map route only.**
5. **marmelab/react-admin** (26,970 ★, MIT, v5.15.5) - "a frontend Framework for building single-page applications ... on top of REST/GraphQL APIs", 45+ data adapters. The `dataProvider` / `authProvider` / `accessControl` contracts are the
   cleanest published model of an admin console over an API and are exactly what our Python API should expose (list with sort/filter/pagination metadata, get one, create, update, delete) - **worth copying even if we do not adopt the
   framework**. The last 20 commits include a real security fix ("UrlField and FileField may execute JS code on click", 2026-10-19) and a flattened unit-test suite. Security: one medium XSS in `RichTextField` (CVE-2023-25572, patched
   3.19.12) - current 5.15.5 is far above the fix. Risks: the Material UI look, a large surface, it would fight our token system, and react-admin has **no built-in tenant scoping**, so we would have to inject the org filter into every
   `dataProvider` call and test it. **Verdict WATCH - adopt the patterns, not the framework.**

## Decisions

- **ADOPT** `next@16.4.2` pinned exactly, with the five security mitigations recorded in the dashboard ADR · `shadcn-ui/ui` as a **source of components** copied into `packages/ui-web`, each mapped to `packages/design-tokens` and each with
  our own test (no shadcn runtime dependency) · `@tanstack/react-table@9.3.1`, `@tanstack/react-query@5.104.5`, `@tanstack/react-virtual@3.13.47` · `maplibre-gl@6.15.0` + `react-map-gl@8.1.3` (lazy-loaded) · `better-auth@1.7.11` (locked) +
  `better-auth-ui` (copied and restyled) · `react-hook-form@7.90.0` · `radix-ui/primitives` (via shadcn).
- **KEEP** `maplibre/maputnik` (the editor that will produce our shared day/night courier style) · `maplibre/martin` (if we serve tiles from our own infrastructure rather than a public tile endpoint).
- **WATCH** `marmelab/react-admin` (copy the `dataProvider` / `authProvider` / `accessControl` contracts) · `TanStack/charts@1.1.0` (the accessible server-renderable charting challenger) · `payloadcms/payload` (admin + API in one; plan B if
  the Python API route gets heavy) · the dashboard layout references (`saleor/saleor-dashboard`, `satnaing/shadcn-admin`, `Kiranism/next-shadcn-dashboard-starter`, `nellavio/nellavio`, `TailAdmin`, `homarr`, `calcom/cal.com`) ·
  `shadcn-ui/lint` (a candidate for our "no raw values in components" rule) · `virtua`, `lytenyte` · `recharts` / `echarts` / `deck.gl` (only if TanStack Charts is not enough).
- **REJECT** `nativewind` / `heroui-native` (locked styling rule) · `ag-grid` (MIT + Commercial, 3.2 GB repo) · `handsontable` (proprietary) · `twentyhq/twenty` (AGPL) · `nocobase` (custom licence) · `appsmith` (a platform, not a dashboard)
  · `tremorlabs/tremor` (unmaintained since 2025-10-10) · `basetool-ai/basetool` (dead since 2022) · `devias-io/material-kit-react` (stale since 2025-06) · `mui/mui-x` (commercial tier + heavier than Radix) · `authjs/next-auth`
  (**UNVERIFIED - the repo did not resolve with this token**; Better Auth is the locked choice anyway).
- **ADR trigger** adopting Tailwind CSS on the web (a second styling technology next to Unistyles 3) changes a locked decision - ADR + `docs/DECISIONS.md`. The same applies to `react-admin` or `payload`.

## UNVERIFIED

1. **6-month star trend** for all 45 candidates (the token lacks the `stargazer` scope). **Lighthouse >= 95** - the dashboard does not exist yet; W1-W7 are UNVERIFIED.
2. `authjs/next-auth` - the repository could not be resolved with this token; no facts collected.
3. `shadcn-ui/lint`, `TanStack/db`, `TailAdmin`, `homarr`, `maplibre/maputnik`, `maplibre/martin` - only search-level metadata (stars/licence/pushed date) was collected; their release cadence, maintainer counts and advisories are
   UNVERIFIED.
4. **Per-component a11y** of the shadcn catalogue - not audited component by component. **Bundle sizes** - the upstream tree-shaking claims were read, but our own bundle was not measured. UNVERIFIED.
5. React-admin's `dataProvider` contract against our Python API - not implemented; the mapping is proposed, not proven.
6. Whether `next@16.4.2` is patched for the two 15.5.x-only critical advisories - the advisory list gives no 16.x marker for them; treat as UNVERIFIED until the advisory is re-read.
