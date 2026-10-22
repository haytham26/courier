# Admin & analytics — 2026 OSS research (redone, V4 §13.1)

**Research date: 2026-10-21.** Method: V4 §12 (≥30 evidence cards, ≥10 shortlisted, top 5 deep-reviewed,
benchmarks only where an eval set exists) + §12.6 anti-bias (≥3 newer/smaller challengers). Every number was
read from the live GitHub API, the npm registry, the PyPI JSON API, the vendor's own pricing page or the
Inland Revenue / Office of the Privacy Commissioner site on **2026-10-21** unless the card says
**UNVERIFIED**. Nothing is estimated and nothing is carried over unread.

**Card fields:** name · repo/vendor URL · stars (OSS) or price (SaaS) · created · last release + date ·
release cadence · commits/90 d + distinct human maintainers/90 d · open issues · licence (read from the
licence file where the API says NOASSERTION) · npm/PyPI downloads where a registry exists · Expo SDK 58 /
RN 0.88 New Architecture compatibility · self-hostable? · size · **DECISION**.

## 0. Scope, our current choice, the bar

**Who is a courier's administrator?** Three people, and the product must not confuse them:

| Person                                                      | What they need                                                                                                     | How often |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------- |
| **The solo courier** (also the owner of a one-person depot) | their own earnings, their mileage logbook, their GST figures, their own location history                           | weekly    |
| **The depot owner / administrator** (1–10 couriers)         | the fleet view, who is on shift, per-courier performance, what each courier is owed, the cost of running the depot | daily     |
| **The platform operator** (us)                              | usage, cost per courier, failed jobs, abuse, the audit log                                                         | weekly    |

**The area** covers: the depot/admin view and the fleet view · the earnings and the settlement view · the
per-courier KPIs · the tax and the accounting export for NZ (GST, IRD records) · the data warehouse question
(the "Postgres views first" plan against a real warehouse) · the BI tools a 1–10 person team can actually
run (Metabase, Superset, Evidence, Redash, Lightdash) · the metrics layer · the privacy of a courier's
location history · the retention rules · the NZ Privacy Act 2020 obligations on employee data.

| Item                        | Verified 2026-10-21                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Our current choice (locked) | `docs/plan/COVERAGE_MAP.md` §12: _"Event taxonomy, privacy-safe product analytics, funnels/retention, driver KPIs, **data warehouse (Postgres views first)**, dashboards for founder, data retention/deletion jobs"_ · `docs/status/PROGRESS.md` C12 puts the same list in **P6** · `docs/archive/KICKOFF_V4_EN.md` §6.6: _"PostHog product events (privacy-safe)"_ · `docs/research/RESEARCH_2026.md` locks **PostHog (EU cloud) + the OpenFeature SDK** for analytics and flags · `docs/squads/web/README.md` target: _"the admin can see AI/SMS cost per user"_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| The data we have            | `services/api` is FastAPI + **Postgres/PostGIS**; the truth is the delivery event log written by the mobile app's sync engine, plus the location pings the background-location module produces. There is **no warehouse, no metrics layer, no BI tool, no admin console** in the repo today                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| The web half                | `apps/web` **does not exist** (see the companion file `web-dashboard-nextjs.md` §0). The admin console is a set of routes inside it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| NZ law we must satisfy      | **IRD record keeping**: _"Keep all your records (including those in electronic form) for at least 7 tax years"_, _"Your records must be in English or Māori"_, _"If you store your records off-shore (including cloud computing), make sure either you or your cloud service provider has our approval"_ (ird.govt.nz/managing-my-tax/record-keeping, page dated 2026-05-14) · **GST Act 1985 s75**: a registered person must keep the s75(2) records _"for a period of at least 7 years after the end of the taxable period"_ (legislation.govt.nz/act/public/1985/0141/latest/DLM85281.html) · **GST is 15%**; registration is required once you expect to earn **more than $60,000 in 12 months**; taxable period monthly, two-monthly or six-monthly; accounting basis payments, invoice or hybrid (business.govt.nz/tax-and-money/guide-to-business-tax/gst) · **IRD motor-vehicle logbook**: a logbook for a test period of **at least 90 consecutive days**, used for a logbook application period of **up to three years**; the logbook must record the start and end of the test period, the odometer readings at the start and end, **the distance of each business journey, the date of each business journey, the reason for each business journey**, and any other detail the Commissioner may require; in the absence of a logbook, s DE 4(2) caps the deduction at 25% of business use (IRD operational statements OS 18/01 and OS 19/04A) · **IRD kilometre rates for the 2025-26 income year** (Instrument 2026, issued 03 Jun 2026, in force 4 June 2026, made in Christchurch): petrol **$1.20** / 37c, diesel **$1.30** / 38c, petrol hybrid **90c** / 24c, electric **$1.22** / 23c; Tier 1 applies to the first **14,000 km** (business and non-business) of the income year |
| Privacy (NZ)                | The Privacy Act 2020 applies. The Office of the Privacy Commissioner, _"Is my employer allowed to use GPS in work vehicles?"_ (updated October 2025): _"GPS data about work vehicles can be personal information about employees"_, _"a company should ensure employees are aware of why information is being collected, and how it will be used"_, and _"information relating to that non-work time will need to be handled very differently"_. Employment New Zealand, "Employee privacy" (2026-08-25): an employer who monitors staff _"should develop a workplace policy that explains why and when this will happen"_, _"make sure the policy complies with the Employment Relations Act 2000 and the Privacy Act 2020"_, and _"consult with employees"_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| The bar                     | Plain NZ English, no emoji, and the product is never marketed with a buzzword · a small team runs it · the number of services a 1–3 person team can keep alive is a **hard constraint**, not a preference · no courier PII in a BI tool unless it has to be there · no GPS track in an analytics event · every export audited                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

### The one design decision that has to be right

The IRD's 7-year retention rule applies to **records of business use** — date, distance, reason. It does
**not** require us to keep the GPS track for 7 years. So the data model must split:

| Table                             | Holds                                                                                     | Retention                                                 | Why                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `delivery_event` (the event log)  | stop outcomes, times, client ids                                                          | 7 years (tax) or the client contract, whichever is longer | the settlement and the GST figure are computed from it                              |
| `mileage_logbook`                 | **date, distance, odometer reading, reason, vehicle** — the OS 18/01 field list, verbatim | **7 years**                                               | this is what the IRD asks for, and it is a record of the _journey_, not the _track_ |
| `location_ping`                   | the raw GPS trace                                                                         | **30 days**, then purged (PARITY row 49)                  | it is the most intrusive data we hold and the least needed after the day ends       |
| `kpi_daily` (a materialised view) | per-courier, per-day aggregates                                                           | 7 years                                                   | a number is not personal information in the same way a track is                     |

**If we get this wrong, the 7-year tax rule forces us to keep a precise location history of every courier
for seven years, and the NZ Privacy Act 2020 problem becomes unmanageable.** If we get it right, the tax
record is a table of kilometres and the track is gone in a month.

### 6-month star trend — method note (proxy, as V4 §12.3 permits)

The **star timeline** is not readable with the token in `.env.local`: `GET /repos/{o}/{r}/stargazers` returns
**HTTP 403 "Resource not accessible by personal access token"**. **Every "stars gained in 6 months" figure is
therefore UNVERIFIED.** The proxy used is the one §12.3 prescribes: **releases in the last 6 months ·
commits in the last 90 days · distinct human maintainers in 90 days** (bot/dependabot excluded), plus
**npm/PyPI downloads** where a registry exists. Where a project ships through a changeset monorepo rather
than GitHub Releases, the GitHub release count reads **0** and the registry publish date is used instead.

## Queries run

**GitHub API** (via `scripts\gh.ps1`, all read **2026-10-21**).

| #   | Call                                                                                      | What it produced                                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `api repos/{o}/{r}` × 82                                                                  | stars, forks, created, pushed, `license.spdx_id`, size, `open_issues_count`, archived                                                                                                                 |
| 2   | `api repos/{o}/{r}/releases?per_page=100 --paginate` × 82                                 | release dates → cadence, releases/6 m                                                                                                                                                                 |
| 3   | `api repos/{o}/{r}/commits?since=2026-07-23T00:00:00Z&per_page=100` × 82                  | commits/90 d, distinct human authors                                                                                                                                                                  |
| 4   | `api repos/{o}/{r}/commits?per_page=12` × 5                                               | the last-12 commit lists quoted in §3                                                                                                                                                                 |
| 5   | `api repos/{o}/{r}/license` × 21 (+ licence file body)                                    | the licence **read from the file** for the 15 repos the API reports as NOASSERTION — this is how we found ELv2, BSL, MSCL, SUL and TSL                                                                |
| 6   | `api repos/{o}/{r}/issues?state=all&since=…&sort=created&direction=desc&per_page=100` × 5 | the 2026 issue/PR lists quoted in §3                                                                                                                                                                  |
| 7   | `api search/repositories?q=…` × 4                                                         | resolved `perspective-dev/perspective` (the `finos/` scope moved), `beancount/fava`, `hledgerorg/hledger`, `Hopding/pdf-lib`; **no maintained official Xero SDK exists** (`xero/xero-node-sdk` → 404) |
| 8   | `api rate_limit`                                                                          | core 5000/h, search 30/min (the search API rate-limited mid-run; the work was redone on the core API)                                                                                                 |

**Registries** (npm `registry.npmjs.org` + `api.npmjs.org/downloads/point/last-month`, window
**2026-09-19 → 2026-10-18**; PyPI `pypi.org/pypi/<p>/json`) — 38 reads: `dbt-core`, `dbt-postgres`,
`dbt-duckdb`, `dbt-metricflow`, `dbt-common` (PyPI) · `@cubejs-backend/server`, `cubejs-cli`,
`@duckdb/node-api`, `@duckdb/duckdb-wasm`, `@clickhouse/client`, `posthog-js`, `@finos/perspective`,
`vega`, `vega-lite`, `@observablehq/plot`, `chart.js`, `@nivo/core`, `d3-scale`, `frappe-ui`,
`@perspective-dev/*` (404 — the scope did not move), `lightdash`, `umami`, `dub` (all npm) ·
`beancount`, `fava`, `metabase-api` (PyPI).

**Web searches** (real query strings, 2026-10-21):

| #   | Query                                                                                                 | What it produced                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1  | `Metabase Cloud pricing 2026 per user per month self-hosted vs Lightdash Cloud Superset hosting cost` | the **official** Metabase pricing page and its machine-readable `pricing.md` (version 2026-08-14), the Lightdash pricing page, and a third-party comparison (marked as such)                      |
| W2  | `Evidence.dev pricing 2026 Redash maintenance status self-host Superset Preset pricing`               | the official Evidence self-host page, the official Preset pricing page, and a third-party 2026 BI round-up (used only for the Redash release history, which was then re-checked on GitHub)        |
| W3  | `PostHog pricing 2026 free tier events per month cloud`                                               | the official PostHog pricing page, the event-comparison page, and the agent-pricing page                                                                                                          |
| W4  | `dbt Fusion 2026 dbt-core license Apache semantic layer small team warehouse Postgres`                | the dbt licence FAQ (2026-06-01 and 2026-09-15 updates), the "dbt Core v2 is here" blog (2026-06-01) and the "dbt vs dbt OSS" blog (2026-09-16)                                                   |
| W5  | `New Zealand Inland Revenue record keeping requirements six years GST 15% small business courier`     | the IRD record-keeping page (2026-05-14), GST Act 1985 s75 on legislation.govt.nz, IRD GST guide IR375, and business.govt.nz                                                                      |
| W6  | `IRD New Zealand vehicle log book requirements transport business records "log book" keep records`    | IRD operational statements OS 18/01 and OS 19/04A (the 90-day test period, the odometer rule, the 14,000 km tier)                                                                                 |
| W7  | `IRD mileage rate 2026 2027 income year cents per kilometre announced`                                | the 2025-26 kilometre rates instrument and the IRD rate table (2026-06-05, updated 2026-07-08)                                                                                                    |
| W8  | `Office of the Privacy Commissioner 2020 Act employee monitoring location data GPS guidance`          | the OPC knowledge-base answer on GPS in work vehicles (updated October 2025), the OPC CCTV guidance (which sets out the PIA pattern) and Employment New Zealand's "Employee privacy" (2026-08-25) |

## 1. Candidates (30+) — the candidate pool: 64 cards, every one a full evidence card

**C1 — `metabase/metabase`** ⭐ https://github.com/metabase/metabase — **49 764 ★** /6 914 f · created **2015-02-02** · last release **2026-10-19** · **89 releases/6 m** · **100+ commits/90 d, 39 humans** · **4 570 open issues** (incl. PRs) · licence file: _"Source code in this repository is variously licensed under the GNU Affero General Public License (AGPL), or the Metabase Commercial License … Outside of the top-level 'enterprise' directory, source code in a given file is licensed under the AGPL"_ · repo 2 445 517 KB · **price (official, `pricing.md` v2026-08-14)**: Open Source **free**, self-hosted, unlimited users, community support · Starter **US$100/mo** (5 users, US$6/user/mo) · Pro **US$575/mo** (10 users, US$12/user/mo, cloud _or_ self-hosted, SSO, row/column permissions, SOC 2 type II) · Enterprise **from US$20 000/yr** · AI US$3.75/1M tokens · transforms 1 000 runs included then US$0.01/run · PyPI `metabase-api 3.6` (2026-02-07, MIT) · Expo 58/RN New Arch: **n/a** (a server; the admin console is a separate web surface) · self-hostable: **yes** — one JAR/container plus its own app database; the vendor's own comparison page prices the self-host HA path at ~US$48+/mo for servers, ~US$12+/mo for a load balancer, ~US$40–60+/mo for a managed database, ~US$12+/mo for SMTP · **relevance**: the only BI tool a depot owner can use without a data team, and it reads Postgres directly — **DECISION: ADOPT (self-hosted OSS, read-only through a views-only role) — AGPL flagged as an ADR**

**C2 — `apache/superset`** ⭐ https://github.com/apache/superset — **75 228 ★** /18 503 f · created **2015-07-21** · last release **2026-10-16** · **26 releases/6 m** · **100+ commits/90 d, 27 humans** · **172 open issues (609 including pull requests)** · **Apache-2.0** · 1 339 338 KB · **price**: the project sells no SaaS; the managed option is **Preset** — Starter **US$0** for up to 5 users and 1 workspace, Professional **US$20/user/month** billed annually (US$25 monthly), Enterprise custom (preset.io/pricing) · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** — but it is **web app + Celery worker + Celery beat + Redis + metadata Postgres + a caching layer**, and the project documentation recommends Kubernetes · **relevance**: the Apache-licensed alternative, and the only one whose licence needs no argument — **DECISION: WATCH → the fallback if AGPL is refused, with Preset Starter (free ≤ 5 users) as the managed escape**

**C3 — `evidence-dev/evidence`** ⭐ https://github.com/evidence-dev/evidence — **7 041 ★** /428 f · created **2021-05-27** · pushed **2026-10-16** · **0 GitHub releases/6 m**, last **2026-02-06** · **95 commits/90 d, 4 humans** · **MIT** · 319 026 KB · **price**: the OSS framework is free; the hosted product is **Evidence Team at US$2 500/month** (unlimited users, 20 k AI credits, 30-day trial) and Enterprise is quote-only — the US$2 500 figure is from a **third-party 2026 pricing page, not read on the vendor's own page → UNVERIFIED against evidence.dev/pricing** · self-hostable: **yes** — `evidence serve` in the official Docker image; the official self-host page states plainly that **"Several platform features (e.g. User Auth, Access Controls, Evidence Agents) are not built in"** and self-host sites are protected by **HTTP Basic Auth** with no logout button · Expo 58/RN New Arch: **n/a** · **relevance**: BI-as-code in Markdown, the natural home for a weekly written summary the founder reads — **DECISION: WATCH (a report generator, not a BI tool; needs a dbt/SQL project we do not have yet)**

**C4 — `getredash/redash`** ⭐ https://github.com/getredash/redash — **28 840 ★** /4 637 f · created **2013-10-28** · pushed **2026-10-16** · **1 release/6 m** (last **2026-09-24**) · **33 commits/90 d, 8 humans** · **817 open issues** · **BSD-2-Clause** · 40 733 KB · **price**: no vendor option — the hosted service closed on 30 November 2021 (the project's own end-of-life notice) · self-hostable: **yes** — Docker Compose with PostgreSQL and Redis; the setup guide suggests **at least 4 GB RAM** · Expo 58/RN New Arch: **n/a** · **relevance**: the simplest SQL-to-chart tool, and the one a small team used to run — **DECISION: WATCH (one or two releases a year; apply the security releases promptly; the licence is the safest in the pool)**

**C5 — `lightdash/lightdash`** ⭐ https://github.com/lightdash/lightdash — **6 196 ★** /792 f · created **2021-03-19** · last release **2026-10-20** · **2 773 releases/6 m** · **100+ commits/90 d, 15 humans** · **89 open issues (1 072 including pull requests)** · licence file: **MIT outside `packages/backend/src/ee`**, which carries its own licence · 802 178 KB · **price (official, lightdash.com/pricing)**: self-hosted OSS free; **Cloud Pro US$3 000/month**, unlimited users, no per-seat pricing, 21-day trial; Enterprise quote-only · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** — Helm for Kubernetes, PostgreSQL, S3-compatible storage · **relevance**: dbt-native BI, i.e. it needs the metrics layer we have not built yet — **DECISION: WATCH → REJECT for now (US$3 000/month is 60× our entire monthly infrastructure budget, and it needs a dbt project that does not exist)**

**C6 — `cube-js/cube`** ⭐ https://github.com/cube-js/cube — **21 046 ★** /2 168 f · created **2018-09-16** · last release **2026-10-16** · **100 releases/6 m** · **100+ commits/90 d, 15 humans** · **631 open issues (1 175 including pull requests)** · licence file: _"Source code in this repository is covered by one of two licenses: (i) the / Apache License 2.0 (ii) an MIT license"_ · npm `@cubejs-backend/server@1.8.8` **2026-10-16**, **101 352 dl/30 d**; `cubejs-cli@1.8.8` **56 048 dl/30 d** · 522 930 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the semantic layer — it turns Postgres into a typed metrics API that any front end can read — **DECISION: WATCH (the right shape for a metrics layer; too heavy until we have more than three metrics)**

**C7 — `dbt-labs/dbt`** ⭐ https://github.com/dbt-labs/dbt — **14 049 ★** /2 636 f · created **2016-03-10** · pushed **2026-10-20** · **59 releases/6 m** · **100+ commits/90 d, 34 humans** · **1 425 open issues (1 798 including pull requests)** · **Apache-2.0** (the `dbt-core` repo now resolves here — dbt-core, dbt-adapters and the dbt-fusion code were merged into this repository) · 129 478 KB · **licence position (official licence FAQ, updated 2026-09-15)**: **"dbt"** (formerly the Fusion engine) is the default distribution and contains proprietary code under the **dbt Product Licensing Agreement**; **"dbt OSS"** (formerly dbt Core v2) is the **entirely Apache-2.0** subset; **dbt Core v1.x remains Apache-2.0** and 1.13 will be the final 1.x minor · PyPI `dbt-core 1.12.6` (2026-10-14), `dbt-postgres 1.11.0` (2026-07-16), `dbt-duckdb 1.11.0` (2026-08-07), `dbt-metricflow 0.15.0` (2026-09-10) · Expo 58/RN New Arch: **n/a** (a build-time tool) · self-hostable: **yes** · **relevance**: the metrics layer, the transformation tests, and the lineage the founder will ask for — **DECISION: WATCH → adopt `dbt OSS` (Apache-2.0) at the third metric; never adopt the `dbt` binary without a licence review**

**C8 — `PostHog/posthog`** ⭐ https://github.com/PostHog/posthog — **40 360 ★** /3 533 f · created **2020-01-23** · last release **2026-10-20** · **3 698 releases/6 m** · **100+ commits/90 d, 34 humans** · **3 813 open issues (5 584 including pull requests)** · licence file: **MIT outside `ee/`**, `ee/` proprietary · 8 176 113 KB · **price (official)**: free tier, no card, **1 M events/month**, 5 K session replays, 1 M feature-flag requests, 100 K exceptions, 1 500 survey responses, 1 project, **1-year retention**; pay-as-you-go: 6 projects, **7-year retention**, no storage charges; identified events **US$0.000248/event** and anonymous **US$0.00005/event** after the first 1 M; **self-hosted starts at US$1 000/month** with 8 M events · npm `posthog-js@1.438.12` **2026-10-15**, **64 887 134 dl/30 d** · Expo 58/RN New Arch: the RN SDK is the reason it is the locked choice in the observability area · self-hostable: **yes** (heavy) · **relevance**: the product-analytics engine behind "which features do couriers actually use" — **DECISION: KEEP (already locked in the observability area). It answers product questions, not "what did courier X earn"**

**C9 — `growthbook/growthbook`** ⭐ https://github.com/growthbook/growthbook — **8 517 ★** /884 f · created **2021-05-07** · last release **2026-09-22** · **4 releases/6 m** · **100+ commits/90 d, 26 humans** · **839 open issues** · licence file: **MIT Expat outside `packages/*/src/enterprise`**, which is under the GrowthBook Enterprise Licence · 295 324 KB · Expo 58/RN New Arch: **n/a** (but a flag read is server-side for us) · self-hostable: **yes** · **relevance**: the experiment and flag server behind the admin console's rollout switches — **DECISION: WATCH (PostHog's flags already cover the need at our size)**

**C10 — `rudderlabs/rudder-server`** ⭐ https://github.com/rudderlabs/rudder-server — **4 504 ★** /80 f · created **2019-07-19** · last release **2026-10-20** · **68 releases/6 m** · **100+ commits/90 d, 15 humans** · **51 open issues** · licence file: **"Elastic License 2.0 (ELv2)"** — source-available, **not** OSI open source · 332 318 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (ELv2) · **relevance**: a customer-data pipeline we do not need — **DECISION: REJECT (ELv2, and we have one destination)**

**C11 — `grafana/grafana`** ⭐ https://github.com/grafana/grafana — **77 398 ★** /14 890 f · created **2013-12-11** · last release **2026-10-13** · **48 releases/6 m** · **100+ commits/90 d, 55 humans** · **2 645 open issues (3 342 including pull requests)** · **AGPL-3.0** · 2 070 084 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** — one server process with its own database · **relevance**: the right tool for _time series_ (ops), the wrong tool for a depot owner's questions — **DECISION: WATCH (keep it for service health, not for courier KPIs)**

**C12 — `dlt-hub/dlt`** ⭐ https://github.com/dlt-hub/dlt — **5 994 ★** /630 f · created **2022-01-26** · last release **2026-10-07** · **10 releases/6 m** · **100+ commits/90 d, 33 humans** · **457 open issues** · **Apache-2.0** · 120 389 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the "copy data out of a SaaS API into your warehouse" tool — the right tool **if** we ever sync from a client system — **DECISION: WATCH (not yet; we have no external source to ingest)**

**C13 — `duckdb/duckdb`** ⭐ https://github.com/duckdb/duckdb — **42 300 ★** /3 986 f · created **2018-06-26** · last release **2026-09-28** · **5 releases/6 m** · **100+ commits/90 d, 16 humans** · **538 open issues (903 including pull requests)** · **MIT** · 557 622 KB · npm `@duckdb/node-api@1.5.6-r.1` **2026-09-28**, **7 479 055 dl/30 d**; `@duckdb/duckdb-wasm@1.33.1-dev57.0` **2026-06-22**, **2 113 340 dl/30 d** · Expo 58/RN New Arch: **n/a** (an embedded OLAP engine; the WASM build could run in a browser, but we have no reason to) · self-hostable: **yes** — it is a library, there is nothing to host · **relevance**: the escape hatch — query a Parquet export of the event log in the API process, with no second database — **DECISION: WATCH → the answer to "do we need a warehouse?" when Postgres stops being fast enough. It is the plan B, not the plan A**

**C14 — `ClickHouse/ClickHouse`** ⭐ https://github.com/ClickHouse/ClickHouse — **50 501 ★** /9 139 f · created **2016-06-02** · last release **2026-10-20** · **180 releases/6 m** · **100+ commits/90 d, 27 humans** · **5 832 open issues (8 500 including pull requests)** · **Apache-2.0** · 14 215 278 KB · npm `@clickhouse/client@1.24.1` **2026-10-09**, **14 214 319 dl/30 d** · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** — one binary · **relevance**: the warehouse answer for a high-volume event log — **DECISION: REJECT for now (a second database for 5.5 M rows a year is a second thing to keep alive; 14 GB repo, 5 832 open issues)**

**C15 — `apache/iceberg`** ⭐ https://github.com/apache/iceberg — **9 352 ★** /3 617 f · created **2018-11-19** · pushed **2026-10-20** · **3 releases/6 m**, last **2026-09-30** · **100+ commits/90 d, 42 humans** · **948 open issues** · **Apache-2.0** · 117 099 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (a table format, not a service) · **relevance**: the open table format a warehouse would use — **DECISION: REJECT (we would need a warehouse before we need a table format)**

**C16 — `apache/airflow`** ⭐ https://github.com/apache/airflow — **47 233 ★** /18 094 f · created **2015-04-13** · pushed **2026-10-20** · **9 releases/6 m**, last **2026-09-17** · **100+ commits/90 d, 48 humans** · **1 026 open issues (1 887 including pull requests)** · **Apache-2.0** · 769 286 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (scheduler + web server + workers + Postgres + a queue) · **relevance**: the orchestrator our own research already replaced with a simpler model (`docs/research/REPO_RESEARCH.md` line 232: _"Use Arq on Redis … move to Hatchet (MIT) only if durable multi-step workflows become necessary"_) — **DECISION: REJECT (five services for a nightly job)**

**C17 — `PrefectHQ/prefect`** ⭐ https://github.com/PrefectHQ/prefect — **24 045 ★** /2 601 f · created **2018-06-29** · last release **2026-10-20** · **132 releases/6 m** · **100+ commits/90 d, 30 humans** · **911 open issues** · **Apache-2.0** · 246 587 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a Python-native orchestrator, which is the language our API is in — **DECISION: WATCH (the right shape if the daily settlement job becomes multi-step; Arq/Hatchet first)**

**C18 — `dagster-io/dagster`** ⭐ https://github.com/dagster-io/dagster — **16 303 ★** /2 363 f · created **2018-04-30** · last release **2026-10-09** · **25 releases/6 m** · **100+ commits/90 d, 12 humans** → **12 humans**, **2 597 open issues** · **Apache-2.0** · 1 492 539 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a data-orchestration framework with a strong local/dev model — **DECISION: WATCH (same slot as Prefect; not now)**

**C19 — `kestra-io/kestra`** ⭐ https://github.com/kestra-io/kestra — **29 916 ★** /3 476 f · created **2019-08-24** · last release **2026-10-20** · **78 releases/6 m** · **100+ commits/90 d, 60 humans** · **970 open issues** · **Apache-2.0** · 146 985 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (JVM + Postgres) · **relevance**: a JVM orchestrator — **DECISION: WATCH (60 maintainers is the healthiest in the pool; still a JVM we would have to run)**

**C20 — `n8n-io/n8n`** ⭐ https://github.com/n8n-io/n8n — **208 132 ★** /61 194 f · created **2019-06-22** · last release **2026-10-20** · **275 releases/6 m** · **100+ commits/90 d, 42 humans** · **343 open issues (1 208 including pull requests)** · licence file: **"Sustainable Use License"** outside the `.ee` files — source-available, **not** OSS · 724 412 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the automation glue for "nightly: compute the settlement, send the statements" — **DECISION: KEEP for internal automation only, never embedded (our own `docs/research/RESEARCH_2026_WAVE2.md` line 340 already says exactly this)**

**C21 — `meltano/meltano`** ⭐ https://github.com/meltano/meltano — **2 665 ★** /274 f · created **2021-06-21** · last release **2026-10-07** · **7 releases/6 m** · **100+ commits/90 d, 11 humans** · **145 open issues** · **MIT** · 161 282 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a Singer-tap runner for ELT — **DECISION: WATCH (with Airbyte, in the "if we ever ingest from a client system" slot)**

**C22 — `airbytehq/airbyte`** ⭐ https://github.com/airbytehq/airbyte — **22 250 ★** /5 415 f · created **2020-07-27** · pushed **2026-10-20** · **0 GitHub releases/6 m**, last **2025-10-15** · **100+ commits/90 d, 5 humans** · **2 672 open issues** · licence file: **"Elastic License 2.0 (ELv2)"** · 945 669 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (ELv2) · **relevance**: the connector catalogue we would use to pull from a client system — **DECISION: REJECT (ELv2 — not on the allow-list in `CONSTRAINTS.md`)**

**C23 — `snowplow/snowplow`** ⭐ https://github.com/snowplow/snowplow — **7 044 ★** /1 172 f · created **2012-03-01** · pushed **2026-10-19** · **0 releases/6 m** (last **2022-01-31**) · **1 commit/90 d** · **60 open issues** · **Apache-2.0** · 26 845 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the enterprise event pipeline — **DECISION: REJECT (the core repo has had one commit in 90 days; the work moved to separate repos)**

**C24 — `singer-io/singer-python`** ⭐ https://github.com/singer-io/singer-python — **586 ★** /128 f · created **2016-10-28** · pushed **2026-02-27** · **0 releases** · **0 commits/90 d** · **37 open issues** · **Apache-2.0** · 318 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the tap/target library behind Meltano — **DECISION: WATCH (only with Meltano)**

**C25 — `openreplay/openreplay`** ⭐ https://github.com/openreplay/openreplay — **13 014 ★** /866 f · created **2021-04-29** · last release **2026-09-25** · **2 releases/6 m** · **100+ commits/90 d, 14 humans** · **185 open issues** · licence file: **AGPLv3 by default outside the MIT directories**, `ee/` proprietary · 249 380 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: session replay of the **admin console** (a dispatcher clicking through the board) — **never of the courier's app, because a replay of the driving screen would carry addresses and names** — **DECISION: WATCH (PostHog replay already covers the console; the app is off-limits)**

**C26 — `SigNoz/signoz`** ⭐ https://github.com/SigNoz/signoz — **32 407 ★** /2 546 f · created **2021-01-03** · last release **2026-10-14** · **43 releases/6 m** · **100+ commits/90 d, 19 humans** · **1 138 open issues (1 569 including pull requests)** · licence file: **MIT Expat outside `ee/`** · 125 020 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: OpenTelemetry-native observability — **DECISION: REJECT for this area (the observability area already decided; the admin console needs a BI tool, not traces)**

**C27 — `Swetrix/swetrix`** ⭐ https://github.com/Swetrix/swetrix — **1 209 ★** /78 f · created **2021-03-18** · last release **2026-09-26** · **20 releases/6 m** · **100+ commits/90 d, 5 humans** · **20 open issues** · **AGPL-3.0** · 95 424 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: privacy-first web analytics — **DECISION: WATCH (web page views only; not courier KPIs)**

**C28 — `OpenPanel-dev/openpanel`** ⭐ https://github.com/OpenPanel-dev/openpanel — **7 173 ★** /521 f · created **2024-02-29** · last release **2026-10-20** · **10 releases/6 m** · **100+ commits/90 d, 2 humans** · **47 open issues** · **AGPL-3.0** · 146 523 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a lightweight PostHog alternative — **DECISION: WATCH (2 maintainers; PostHog is locked and free at our volume)**

**C29 — `Unleash/unleash`** ⭐ https://github.com/Unleash/unleash — **13 887 ★** /910 f · created **2014-09-29** · last release **2026-09-08** · **11 releases/6 m** · **100+ commits/90 d, 18 humans** · **36 open issues** · **AGPL-3.0** · 314 403 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the reference feature-flag server — **DECISION: WATCH (AGPL; PostHog's flags are already in the locked stack)**

**C30 — `Flagsmith/flagsmith`** ⭐ https://github.com/Flagsmith/flagsmith — **6 605 ★** /591 f · created **2018-06-05** · last release **2026-10-20** · **72 releases/6 m** · **100+ commits/90 d, 12 humans** · **603 open issues (736 including pull requests)** · **BSD-3-Clause** · 381 215 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a permissive-licence flag server — **DECISION: WATCH (the only permissive flag server in the pool; not needed yet)**

**C31 — `beancount/beancount`** ⭐ https://github.com/beancount/beancount — **6 101 ★** /480 f · created **2020-05-22** · pushed **2026-08-23** · **0 releases/6 m** · **2 commits/90 d, 1 human** · **251 open issues** · **GPL-2.0** (licence field) · 109 169 KB · PyPI `beancount 3.2.3` (2026-05-05) · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: plain-text double-entry accounting, and the model a courier's books could use — **DECISION: CLEAN-ROOM ONLY (GPL-2.0, and it is a Python library we would have to vendor or call)**

**C32 — `beancount/fava`** ⭐ https://github.com/beancount/fava — **2 593 ★** /417 f · created **2015-12-04** · pushed **2026-10-18** · **0 GitHub releases** · **80 commits/90 d, 11 humans** · **107 open issues** · **MIT** · 18 611 KB · PyPI `fava 1.30.16` (2026-08-18) · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a web UI over a beancount file — **DECISION: CLEAN-ROOM ONLY in practice: fava is MIT but it depends on beancount (GPL-2.0), so the running system is GPL**

**C33 — `hledgerorg/hledger`** ⭐ https://github.com/hledgerorg/hledger — **4 777 ★** /417 f · created **2013-04-08** · last release **2026-10-02** · **9 releases/6 m** · **100+ commits/90 d, 1 human** · **309 open issues (314 including pull requests)** · **GPL-3.0** · 121 830 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the other plain-text ledger, with a very good command-line reporting story — **DECISION: CLEAN-ROOM ONLY (GPL-3.0)**

**C34 — `actualbudget/actual`** ⭐ https://github.com/actualbudget/actual — **29 629 ★** /3 182 f · created **2022-04-29** · last release **2026-10-02** · **9 releases/6 m** · **100+ commits/90 d, 50 humans** · **220 open issues** · **MIT** (licence file read) · 659 088 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a personal-finance app with a budget, a rules engine and a clean report view — **DECISION: WATCH (a _courier's own_ budget app is a different product; we sell them a logbook, not a budget)**

**C35 — `invoiceninja/invoiceninja`** ⭐ https://github.com/invoiceninja/invoiceninja — **10 305 ★** /2 759 f · created **2013-11-26** · last release **2026-10-18** · **30 releases/6 m** · **100+ commits/90 d, 8 humans** · **233 open issues** · licence file: **"Elastic License 2.0 (ELv2)"** · 4 250 261 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (ELv2) · **relevance**: invoicing and quotes — **DECISION: REJECT (ELv2; and we only need one invoice type, NZ GST, not a full invoicing suite)**

**C36 — `akaunting/akaunting`** ⭐ https://github.com/akaunting/akaunting — **10 193 ★** /3 002 f · created **2017-06-21** · last release **2026-09-17** · **5 releases/6 m** · **100+ commits/90 d, 8 humans** · **8 open issues** · licence file: **"Business Source License"** (MariaDB) — source-available, **not** OSS · 87 541 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (BSL) · **relevance**: a double-entry bookkeeping app — **DECISION: REJECT (BSL is not on the allow-list)**

**C37 — `bigcapitalhq/bigcapital`** ⭐ https://github.com/bigcapitalhq/bigcapital — **3 948 ★** /546 f · created **2021-09-21** · last release **2026-10-15** · **24 releases/6 m** · **100+ commits/90 d, 6 humans** · **281 open issues** · **AGPL-3.0** · 47 361 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: small-business accounting — **DECISION: REJECT (AGPL in the shipped stack, and it is a whole accounting system, not an export)**

**C38 — `medusajs/medusa`** ⭐ https://github.com/medusajs/medusa — **36 823 ★** /5 444 f · created **2020-01-18** · last release **2026-09-28** · **19 releases/6 m** · **100+ commits/90 d, 23 humans** · **251 open issues** · licence file: **MIT outside the Enterprise Edition materials** · 902 427 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: order and product management, the shape a courier's client invoices take — **DECISION: WATCH (a reference for the order model, not a dependency; we already have the client and stop models)**

**C39 — `saleor/saleor`** ⭐ https://github.com/saleor/saleor — **23 461 ★** /6 157 f · created **2013-02-12** · last release **2026-10-19** · **85 releases/6 m** · **100+ commits/90 d, 9 humans** · **300 open issues** · **BSD-3-Clause** · 248 365 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a real order lifecycle (fulfilment → delivered → invoiced) in a permissive licence — **DECISION: WATCH (the settlement state machine reference)**

**C40 — `solidusio/solidus`** ⭐ https://github.com/solidusio/solidus — **5 344 ★** /1 401 f · created **2015-02-18** · last release **2026-10-14** · **7 releases/6 m** · **100+ commits/90 d, 7 humans** · **74 open issues** · **BSD-3-Clause** · 127 269 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a Rails e-commerce core with a clean order-to-invoice flow — **DECISION: WATCH (reference only; we are not a Rails shop)**

**C41 — `ever-co/ever-gauzy`** ⭐ https://github.com/ever-co/ever-gauzy — **8 410 ★** /1 249 f · created **2019-06-02** · last release **2026-10-20** · **992 releases/6 m** · **100+ commits/90 d, 4 humans** · **425 open issues** · **AGPL-3.0** · 299 168 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: open accounting + payroll for multi-tenant setups — **DECISION: REJECT (AGPL, and payroll is a regulated product we should not build)**

**C42 — `frappe/books`** ⭐ https://github.com/frappe/books — **5 000 ★** /1 164 f · created **2018-01-08** · pushed **2026-10-02** · **0 releases/6 m** (last **2025-11-06**) · **29 commits/90 d, 5 humans** · **144 open issues** · **AGPL-3.0** · 16 814 KB · **archived = true** · Expo 58/RN New Arch: **n/a** · **relevance**: none — **DECISION: REJECT (archived and AGPL)**

**C43 — `firefly-iii/firefly-iii`** ⭐ https://github.com/firefly-iii/firefly-iii — **24 947 ★** /2 348 f · created **2014-06-28** · last release **2026-10-19** · **15 releases/6 m** · **100+ commits/90 d, 4 humans** · **166 open issues** · **AGPL-3.0** · 320 765 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: personal finance with a clean double-entry core — **DECISION: REJECT (AGPL; it is personal finance, not settlement)**

**C44 — `maybe-finance/maybe`** ⭐ https://github.com/maybe-finance/maybe — **54 213 ★** /5 672 f · created **2024-01-01** · pushed **2025-07-24** · **3 releases, the last `v0.6.0` @ 2025-07-24** (0 in 6 m) · **0 commits/90 d** · **0 open issues** · **AGPL-3.0** · 6 891 KB · **archived = true** · Expo 58/RN New Arch: **n/a** · **relevance**: none — **DECISION: REJECT (archived 2025-07-24; the OSS edition stopped)**

**C45 — `opencollective/opencollective`** ⭐ https://github.com/opencollective/opencollective — **2 284 ★** /452 f · created **2016-01-29** · pushed **2026-10-16** · **0 GitHub releases** · **8 commits/90 d, 1 human** · **1 612 open issues** · **MIT** · 2 999 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a real payouts-and-transaction-ledger product in MIT — the closest OSS thing to a settlement system — **DECISION: WATCH (a reference for the money-movement ledger; one maintainer)**

**C46 — `strapi/strapi`** ⭐ https://github.com/strapi/strapi — **73 352 ★** /9 910 f · created **2015-09-30** · last release **2026-10-14** · **29 releases/6 m** · **100+ commits/90 d, 31 humans** · **226 open issues (616 including pull requests)** · licence file: **MIT Expat outside `ee/`** · 710 654 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a headless CMS with a permissions model — **DECISION: WATCH (we already have a FastAPI API; a second content model is a cost, not a feature)**

**C47 — `directus/directus`** ⭐ https://github.com/directus/directus — **38 632 ★** /4 981 f · created **2012-12-12** · last release **2026-10-07** · **14 releases/6 m** · **100+ commits/90 d, 28 humans** · **311 open issues (360 including pull requests)** · licence file: **"Monospace Sustainable Core License, Version 1.0" (MSCL-1.0-GPL)** — source-available, **not** on the allow-list · 454 564 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: an admin panel over a SQL database in one container — **DECISION: REJECT (MSCL is source-available; our `CONSTRAINTS.md` allow-list does not include it)**

**C48 — `timescale/timescaledb`** ⭐ https://github.com/timescale/timescaledb — **23 729 ★** /1 178 f · created **2017-03-07** · last release **2026-10-20** · **15 releases/6 m** · **100+ commits/90 d, 18 humans** · **431 open issues** · licence file: **"variously licensed under the Apache License / Version 2.0, an Apache compatible license, or the Timescale License"** — the Timescale Licence (TSL) is **not** OSI open source · 67 017 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (a Postgres extension) · **relevance**: hypertables for the location-ping time series — **DECISION: WATCH (the only extension we would add to Postgres; the TSL part must be checked file by file before any use, and we may not need it at 5.5 M rows a year)**

**C49 — `paradedb/paradedb`** ⭐ https://github.com/paradedb/paradedb — **9 423 ★** /483 f · created **2023-06-30** · last release **2026-10-16** · **31 releases/6 m** · **100+ commits/90 d, 20 humans** · **246 open issues** · **AGPL-3.0** · 180 228 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (a Postgres extension) · **relevance**: Postgres-native search and analytics — **DECISION: WATCH (the right shape if the admin console needs full-text search over deliveries; AGPL to check)**

**C50 — `risingwavelabs/risingwave`** ⭐ https://github.com/risingwavelabs/risingwave — **9 379 ★** /851 f · created **2022-01-28** · last release **2026-10-12** · **13 releases/6 m** · **100+ commits/90 d, 18 humans** · **1 749 open issues** · **Apache-2.0** · 241 521 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: streaming warehouse — **DECISION: REJECT (we have no streaming source; the live map can be served from Postgres plus a websocket)**

**C51 — `prestodb/presto`** ⭐ https://github.com/prestodb/presto — **16 763 ★** /5 545 f · created **2012-08-09** · last release **2026-08-28** · **3 releases/6 m** · **100+ commits/90 d, 47 humans** · **3 013 open issues** · **Apache-2.0** · 287 489 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (a JVM cluster) · **relevance**: distributed SQL over many sources — **DECISION: REJECT (a JVM cluster for a 1–3 person team)**

**C52 — `trinodb/trino`** ⭐ https://github.com/trinodb/trino — **13 351 ★** /3 830 f · created **2019-01-19** · last release **2026-10-16** · **4 releases/6 m** · **100+ commits/90 d, 20 humans** · **2 450 open issues (2 714 including pull requests)** · **Apache-2.0** · 327 586 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (a JVM cluster) · **relevance**: the successor to Presto — **DECISION: REJECT (same reason)**

**C53 — `pdfme/pdfme`** ⭐ https://github.com/pdfme/pdfme — **4 922 ★** /530 f · created **2021-08-22** · last release **2026-10-16** · **8 releases/6 m** · **100+ commits/90 d, 5 humans** · **45 open issues** · **MIT** · 791 478 KB · Expo 58/RN New Arch: **n/a** (it renders in the browser and in Node) · self-hostable: **yes** · **relevance**: a **template-driven** PDF generator — the IRD logbook PDF is a template with a table on it, which is exactly this tool's job — **DECISION: ADOPT (the IRD logbook PDF generator; MIT, template-first, no layout code)**

**C54 — `wojtekmaj/react-pdf`** ⭐ https://github.com/wojtekmaj/react-pdf — **11 190 ★** /1 005 f · created **2016-08-01** · pushed **2026-10-15** · **2 releases/6 m**, last **2026-09-10** · **44 commits/90 d, 3 humans** · **19 open issues** · **MIT** · 27 745 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the other MIT PDF renderer, React-flavoured in its API — **DECISION: WATCH (the alternative to pdfme; it is a layout engine, we need a template)**

**C55 — `Hopding/pdf-lib`** ⭐ https://github.com/Hopding/pdf-lib — **8 664 ★** /926 f · created **2017-09-04** · pushed **2024-07-17** · **0 releases/6 m** (last **2021-11-06**) · **0 commits/90 d** · **318 open issues** · **MIT** · 135 765 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: a low-level PDF library — **DECISION: WATCH (MIT and unmaintained since 2024; fine as a dependency, never as a plan)**

**C56 — `dolanmiu/docx`** ⭐ https://github.com/dolanmiu/docx — **5 965 ★** /618 f · created **2016-03-26** · last release **2026-10-19** · **10 releases/6 m** · **100+ commits/90 d, 8 humans** · **36 open issues** · **MIT** · 334 871 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: **Word** documents — which is what many NZ accountants actually ask for ("a .docx I can forward to my accountant") — **DECISION: ADOPT alongside pdfme (a Word export of the settlement statement; MIT)**

**C57 — `perspective-dev/perspective`** ⭐ https://github.com/perspective-dev/perspective — **11 326 ★** /1 349 f · created **2017-11-02** · last release **2026-10-14** · **12 releases/6 m** · **100+ commits/90 d, 3 humans** · **33 open issues** · **Apache-2.0** · 334 787 KB · npm: the repo is at version **5.6.0** but npm still publishes **`@finos/perspective@3.8.0` (2025-09-03)**, 70 061 dl/30 d — **the scope has not moved and the npm release cadence is UNVERIFIED** · Expo 58/RN New Arch: **n/a** (WebAssembly) · self-hostable: **yes** (a static bundle) · **relevance**: an in-browser analytics grid and chart engine in WebAssembly — **DECISION: WATCH (the lightest way to give the admin console a fast, interactive table without a BI server; the npm/version mismatch is a risk)**

**C58 — `vega/vega-lite`** ⭐ https://github.com/vega/vega-lite — npm `vega-lite@6.5.0` **2026-10-08**, **4 584 933 dl/30 d**; `vega@6.4.0` **2026-08-14**, **4 748 713 dl/30 d** · **BSD-3-Clause** · the GitHub star count was **not read this pass → UNVERIFIED** · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** (a static bundle) · **relevance**: **declarative, server-renderable SVG charts** — the alternative to a chart library that paints on the client — **DECISION: WATCH (the chart answer if TanStack Charts is not enough; BSD-3 and it renders on the server, which suits the a11y gate)**

**C59 — `stripe/stripe-node`** ⭐ https://github.com/stripe/stripe-node — **4 534 ★** /940 f · created **2011-09-28** · last release **2026-10-14** · **50 releases/6 m** · **64 commits/90 d, 12 humans** · **46 open issues** · **MIT** · npm `stripe@23.0.0` **2026-10-01**, **94 606 198 dl/30 d** · Expo 58/RN New Arch: the mobile app buys through the stores; the web uses the API · self-hostable: **n/a** (a vendor) · **relevance**: the subscription, the invoice and the NZD pricing — but **not** the courier's earnings from a client, which is _our_ money, not Stripe's — **DECISION: KEEP (locked in the payments area); the settlement ledger is ours, not Stripe's**

**C60 — `dbt-labs/jaffle-shop`** ⭐ https://github.com/dbt-labs/jaffle-shop — **376 ★** /609 f · created **2023-08-30** · pushed **2026-09-16** · **0 releases** · **7 commits/90 d, 4 humans** · **20 open issues** · licence field empty (the example project) · 28 683 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the canonical dbt example project — the fastest way to learn the layout — **DECISION: KEEP as documentation (read it once, copy the shape)**

**C61 — `MarquezProject/marquez`** ⭐ https://github.com/MarquezProject/marquez — **2 297 ★** /411 f · created **2018-07-05** · pushed **2026-10-13** · **0 releases/6 m** (last **2024-10-24**) · **0 commits/90 d** · **253 open issues** · **Apache-2.0** · 51 658 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: data lineage — **DECISION: REJECT (the repo is dormant; dbt's own lineage covers our need)**

**C62 — `OpenLineage/OpenLineage`** ⭐ https://github.com/OpenLineage/OpenLineage — **2 715 ★** /550 f · created **2020-10-24** · last release **2026-10-13** · **10 releases/6 m** · **100+ commits/90 d, 27 humans** · **408 open issues** · **Apache-2.0** · 83 351 KB · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the open lineage standard — **DECISION: WATCH (only if we adopt dbt OSS; dbt writes its own lineage)**

**C63 — `dbt-labs/dbt-adapters`** ⭐ https://github.com/dbt-labs/dbt-adapters — **241 ★** /378 f · created **2023-08-05** · pushed **2026-10-16** · **0 releases/6 m** (last **2024-12-05**) · **39 commits/90 d, 17 humans** · **895 open issues** · **Apache-2.0** · 46 015 KB · PyPI `dbt-postgres 1.11.0` (2026-07-16) · Expo 58/RN New Arch: **n/a** · self-hostable: **yes** · **relevance**: the Postgres and DuckDB adapters, in a repository that was **merged upstream into `dbt-labs/dbt`** — the PyPI packages still ship from here — **DECISION: WATCH (track the merged repo, not this one)**

**C64 — the charting and analysis libraries we did not card individually** — `chart.js` 4.5.1 (2025-10-13, MIT, 51 937 298 dl/30 d), `@nivo/core` 0.99.0 (2025-05-23, MIT, 6 611 744 dl/30 d), `@observablehq/plot` 0.6.17 (**2025-02-14**, ISC, 3 303 739 dl/30 d — stale), `d3-scale` 4.0.2 (2021-09-24, ISC, 321 771 500 dl/30 d), `frappe-ui` 1.0.2 (2026-10-13, MIT, 298 451 dl/30 d). **DECISION: REJECT for the admin console** — a charting library is a front-end choice and it is decided in `web-dashboard-nextjs.md` §6; the numbers are recorded so nobody re-litigates them.

## 2. Shortlist (13) and decisions

| #                                                         | Project                                                                                                  | Decision                                        | One-line reason                                                                                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| C1                                                        | **metabase/metabase**                                                                                    | **ADOPT (self-hosted OSS, read-only)**          | One container, US$0, 20+ data sources, and a non-technical depot owner can ask a question in English — **AGPL, so it goes to ADR**              |
| C2                                                        | **apache/superset**                                                                                      | **WATCH → the AGPL-free fallback**              | Apache-2.0 and the most capable, but 5–6 services; Preset Starter is free up to 5 users and Professional is US$20/user/month                    |
| C7                                                        | **dbt-labs/dbt**                                                                                         | **WATCH → adopt `dbt OSS` at the third metric** | The metrics layer with tests and lineage; **the Apache-2.0 subset only** — the `dbt`/Fusion binary is under the dbt Product Licensing Agreement |
| C8                                                        | **PostHog/posthog**                                                                                      | **KEEP (locked)**                               | Free to 1 M events/month, EU cloud, and the flags come with it; it answers _product_ questions, not earnings                                    |
| C13                                                       | **duckdb/duckdb**                                                                                        | **WATCH → the plan B warehouse**                | MIT, in-process, no second server; the escape hatch when Postgres stops being fast enough                                                       |
| C53 + C56                                                 | **pdfme + docx**                                                                                         | **ADOPT**                                       | The IRD logbook PDF and the accountant-friendly .docx settlement statement, both MIT, both template-driven                                      |
| C3                                                        | **evidence-dev/evidence**                                                                                | **WATCH**                                       | The weekly written summary the founder reads; self-host has **no access control** and no row-level security                                     |
| C4                                                        | **getredash/redash**                                                                                     | **WATCH**                                       | BSD-2 and the simplest to run, but one or two releases a year and no hosted option                                                              |
| C5                                                        | **lightdash/lightdash**                                                                                  | **REJECT for now**                              | US$3 000/month is 60× our infrastructure budget, and it needs a dbt project we do not have                                                      |
| C6                                                        | **cube-js/cube**                                                                                         | **WATCH**                                       | The right shape for a semantic layer, too heavy for three metrics                                                                               |
| C11                                                       | **grafana/grafana**                                                                                      | **KEEP for ops, not for KPIs**                  | One process, time-series; a depot owner is not an operator                                                                                      |
| C20                                                       | **n8n-io/n8n**                                                                                           | **KEEP for internal automation only**           | The nightly settlement job as a workflow; the Sustainable Use Licence forbids embedding it in the product                                       |
| C31 / C32 / C33                                           | **beancount · fava · hledger**                                                                           | **CLEAN-ROOM ONLY**                             | GPL in the tree; the _file format_ is a usable idea, the _code_ is not                                                                          |
| C35 / C36 / C37 / C41 / C42 / C43 / C44 / C47             | **Invoice Ninja · Akaunting · Bigcapital · Ever Gauzy · Frappe Books · Firefly III · Maybe · Directus**  | **REJECT**                                      | ELv2, BSL, AGPL, archived, or MSCL — none on the allow-list in `CONSTRAINTS.md`                                                                 |
| C14 / C15 / C16 / C18 / C19 / C23 / C50 / C51 / C52 / C61 | **ClickHouse · Iceberg · Airflow · Dagster · Kestra · Snowplow · RisingWave · Presto · Trino · Marquez** | **REJECT**                                      | A warehouse and an orchestrator cluster for 5.5 M rows a year and one nightly job                                                               |

## 3. Deep review — top 5 (code, docs, commits, PRs and issues opened in the 2026 window)

**3.1 `metabase/metabase` (C1)** — _Licence, read from `LICENSE.txt` on 2026-10-21_: *"Source code in this repository is
variously licensed under the GNU Affero General Public License (AGPL), or the Metabase Commercial License …
Outside of the top-level 'enterprise' directory, source code in a given file is licensed under the AGPL."_
So **the OSS edition we would run is AGPL-3.0**, and it connects to Postgres through SQLAlchemy, which means
it can read a **read-only role** that sees only our KPI views. _Pricing, from the official machine-readable
`metabase.com/pricing.md` (version 2026-08-14)_: Open Source free, self-hosted, unlimited users, AGPL,
community forums; Starter US$100/month, 5 users included, US$6/user/month, cloud only, 14-day trial; Pro
US$575/month, 10 users included, US$12/user/month, **cloud or self-hosted**, SSO, row and column
permissions, usage analytics and auditing, SOC 2 type II; Enterprise from US$20 000/year. Usage add-ons:
AI US$3.75 per 1M tokens, transforms 1 000 runs included then US$0.01/run, storage from US$2 per 1M rows.
The vendor's own "Cloud versus self-hosting" page prices the self-host path at ~US$48+/month for high-
availability servers, ~US$12+/month for a load balancer, ~US$40–60+/month for a managed database and
~US$12+/month for SMTP — **that is the number to argue with on cost**. _Last 12 commits (all 2026-10-20)_:
`573759e` "Don't send Referer header on POST /oauth/authorize/decision" (#76311) · `616a8f4` "Fix flaky item
Actions menu clicks in notebook-data-source spec" (#84678) · `657bf67` "Fix flaky upload table deletion e2e
test" (#84746) · `0d6fd63` "Point add-malli-schemas skill at files that exist" (#84886) · `b4335c2` "Stop
pacing Metabot text while the browser tab is hidden" (#84859) · `d403f5d` "Docs/dashboard events additions"
(#84254) · `7526672` "Improve metabase.PREMIUM_FEATURES_LAST_UPDATED cookie handling" (#82514) · `8c33516`
"feat(data-studio): add a header menu and History to Library dashboards" (#84827). _PRs in the window_:
[#84889](https://github.com/metabase/metabase/pull/84889) "Allow syncing only the Library and transforms
unless custom collections are on" (2026-10-20),
[#84887](https://github.com/metabase/metabase/pull/84887) "GDGT-2679: Use text-secondary instead of
text-disabled for text that isn't disabled" (2026-10-20),
[#84885](https://github.com/metabase/metabase/pull/84885) "Revert expandable data app contents collection in
the sidebar" (2026-10-20),
[#84884](https://github.com/metabase/metabase/pull/84884) "GDGT-3403: Show the Authentication account tab as
active" (2026-10-20),
[#84879](https://github.com/metabase/metabase/pull/84879) "Consolidate static embed render and appearance e2e
tests" (2026-10-20),
[#84878](https://github.com/metabase/metabase/pull/84878) /
[#84877](https://github.com/metabase/metabase/pull/84877) /
[#84876](https://github.com/metabase/metabase/pull/84876) "🤖 v65 / v63 / v58 backported 'Improve
metabase.PREMIUM_FEATURES_LAST_UPDATED cookie handling'" (2026-10-20) — **the same fix was backported to
three release lines in one day, which is what a well-run project looks like; it is also the reason the OSS
edition is worth running**. _Issue in the window_:
[#84881](https://github.com/metabase/metabase/issues/84881) "Account pages jump horizontally when switching
tabs" (2026-10-20). _What it means for us_: Metabase is a **live query** tool — a dashboard is as fresh as
Postgres is, there is no separate import step, which is exactly what a small depot wants. Its weakness is
that it is **not a product feature**: a courier cannot see their own earnings in it, and it has no tenant
model of its own beyond what the database role allows. **Verdict: adopt the OSS edition, connected through
a views-only role that exposes `kpi_daily` and `mileage_logbook` and nothing else; flag the AGPL in an ADR.**

**3.2 `dbt-labs/dbt` (C7)** — _Docs read_: `getdbt.com/licenses-faq` — the timeline is the important part:
**2026-06-01**, _"Removed ELv2 references, because the dbt-fusion repository has moved to the dbt-core
repository and been relicensed as Apache 2.0"_ and _"Introduced the dbt Product Licensing Agreement that
governs the dbt Fusion binary's usage"_; MetricFlow was relicensed Apache 2.0 in October 2025;
**2026-09-15**, dbt v2 went to general availability and the names changed — **"dbt"** (formerly the Fusion
engine) is the default distribution, and **"dbt OSS"** (formerly dbt Core v2) is the Apache-2.0 subset.
dbt Core v1.x **remains Apache 2.0**, and _"dbt Core 1.13 will be the final minor version of the 1.x
vintage"_, with critical security and installation patches expected for 3–5 years. _Also read_:
`docs.getdbt.com/blog/dbt-core-v2-is-here` (2026-06-01) — v2 is _"distributed as a single self-contained
binary, with no Python runtime or dependency management required"_, produces **Parquet artifacts**, and
_"a small subset of teams who are required to use dbt Core today because of its license"_.
_Registry, read on 2026-10-21_: PyPI `dbt-core 1.12.6` (2026-10-14), `dbt-postgres 1.11.0` (2026-07-16),
`dbt-duckdb 1.11.0` (2026-08-07), `dbt-metricflow 0.15.0` (2026-09-10), `dbt-common 1.39.0` (2026-08-11).
_Last 12 commits (2026-10-19 → 2026-10-20)_: `1b08b89` feat(wizard): send turn-error banner and app-update
events to Vortex · `6416a32` (dbt-auth): harden fabric-lakehouse · `07b6f27` "Delete the unused
`FrontendListener` views, and what that frees up" · `ea50ba4` "Cosmetic follow-ups to Phase 4 of
sdf-frontend isolation" · `391b295` "refactor(frontend): one way in, with dbt-frontend-library merged into
the backend" (2026-10-19) · `41ffefb` "[Vortex] Hash file paths in extension command args sent in the
Invocation start event" · `f1bfe6b` "test(tracing): pin exact tracing sink output". _PRs and issues in the
window_:
[#16818](https://github.com/dbt-labs/dbt/pull/16818) "chore: sync JSON schemas from dbt-fusion" (2026-10-20),
[#16817](https://github.com/dbt-labs/dbt/issues/16817) "MotherDuck adapter support" (2026-10-19),
[#16816](https://github.com/dbt-labs/dbt/issues/16816) "[v2 Bug] dbt lsp sends work done progress when the
client sets window.workDoneProgres…" (2026-10-19),
[#16815](https://github.com/dbt-labs/dbt/issues/16815) "[v2 Bug] dbt lsp `dbt.compileFile` reports success for
a failed compile and returns the…" (2026-10-19),
[#16814](https://github.com/dbt-labs/dbt/issues/16814) "[v2 Bug] dbt lsp formats the file on the disk instead
of the open document" (2026-10-19),
[#16808](https://github.com/dbt-labs/dbt/issues/16808) "[v2 Bug] Saved query `export_as` is not inherited by
its exports in `semantic_manifest.json`" (2026-10-19),
[#16807](https://github.com/dbt-labs/dbt/issues/16807) "[1.x Bug] buildable indirect selection drops every
test that reads a seed outside the…" (2026-10-19). _What it means for us_: the v1 line is stable, Apache-2.0
and still supported; the v2 line is faster and produces Parquet, which is what the DuckDB escape hatch
would read. **The licence trap is real and easy to walk into**: `pip install dbt-core` gets Apache-2.0,
but the default `dbt` binary is under a product licensing agreement. **Verdict: adopt `dbt OSS` (or
`dbt-core` v1.13) against the same Postgres, at the third metric, and never without a licence check of the
exact artefact we install.**

**3.3 `PostHog/posthog` (C8)** — _Licence, read from `LICENSE` on 2026-10-21_: *"All content that resides
under the 'ee/' directory … is licensed under the license defined in 'ee/LICENSE' … Content outside of the
above mentioned directories or restrictions is available under the 'MIT Expat' license."_ _Pricing, from the
official page_: the free tier resets monthly and needs no card — 1 M analytics events, 5 K session replays,
1 M feature-flag requests, 100 K exceptions, 1 500 survey responses, 1 M source rows, 10 GB of logs, **1
project and 1-year retention**; pay-as-you-go adds 6 projects and **7-year retention** with no storage
charges; identified events are billed at **US$0.000248** and anonymous at **US$0.00005** after the first
1 M; **self-hosting starts at US$1 000/month** with 8 M events. _Last 12 commits (2026-10-20)_: `a56c4bf`
fix(workflows): favor revenue moments and personalize idea emails (#119927) · `fe64c8f`
feat(data-warehouse): add 4 missing tables to the SolarwindsServiceDesk source (#120210) · `17d3b5b`
feat(ingestion): show parity monitor disagreements in the control plane (#120360) · `16b0e07`
feat(capture-apm-metrics): decouple remote-write expansion cap from body limit (#120229) · `8045da0`
feat(cohorts): offer to email a cohort from the toast after creating it (#119893) · `cee03d4`
chore(workflows): share the step catalog, workflow actions and edge id (#119736) · `6602226`
feat(data-warehouse): add amazon s3 import source on a shared object storage backend (#11638…, 2026-10-20).
_PRs in the window_:
[#120494](https://github.com/PostHog/posthog/pull/120494) "fix(quill-charts): chart defaults that read well
without tuning" (2026-10-20),
[#120493](https://github.com/PostHog/posthog/pull/120493) "fix(mcp-store): bound proxy setup waits and handle
upstream failures" (2026-10-20),
[#120491](https://github.com/PostHog/posthog/pull/120491) "fix(data-warehouse): report unreachable vendors
instead of raising in credential prob…" (2026-10-20),
[#120489](https://github.com/PostHog/posthog/pull/120489) "chore(signals): correct scout pre-check observation
guidance" (2026-10-20),
[#120486](https://github.com/PostHog/posthog/pull/120486) "fix(data-warehouse): bound retry-after waits in five
sources" (2026-10-20).
_Issues in the window_:
[#120484](https://github.com/PostHog/posthog/issues/120484) "feat(signals): optional slug tags on inbox reports"
(2026-10-20),
[#120483](https://github.com/PostHog/posthog/issues/120483) "feat(signals): show report tags in the inbox and
filter by them" (2026-10-20). _What it means for us_: PostHog is a **product** analytics tool — funnels,
cohorts, session replay, feature flags — and it now has its own data-warehouse and ingestion-plane work.
It is the right tool for _"do couriers use the dictation report?"_ and the **wrong** tool for _"what did
courier X earn in week 12?"_, because that is a money question about our own Postgres. **Verdict: keep it
for product analytics and flags, EU cloud, no address and no GPS in any event property; do not let it become
the admin console's data layer.**

**3.4 `duckdb/duckdb` (C13)** — _Licence_: **MIT**. _Registry_: npm `@duckdb/node-api@1.5.6-r.1`
(2026-09-28), **7 479 055 dl/30 d**; `@duckdb/duckdb-wasm@1.33.1-dev57.0` (2026-06-22), 2 113 340 dl/30 d;
PyPI `dbt-duckdb 1.11.0` (2026-08-07). _Last 12 commits (2026-10-20)_: `bfabf10` "catalog/schema enumeration
in `duckdb_tables()` and `duckdb_views()` via filter pushdown" · `ba37cd6` "Keep the shared prepare file
state alive when a rotating COPY is interrupted" (#27560) · `bda45b2` "Move tag of bwc-test-utils extension"
(#27546) · `e88de26` "Clarify SECURITY.md" (#27558) · `bb0eccd` "Test: stop the OR-pushdown tests from
printing profiler output to stdout" (#27557) · `a38ee87` "Keep the shared prepare file state alive when a
rotating COPY is interrupted". _PRs in the window_:
[#27571](https://github.com/duckdb/duckdb/pull/27571) "Join order: estimate `<>` and IS DISTINCT FROM joins
as nearly a cross product (fix CI)" (2026-10-20),
[#27569](https://github.com/duckdb/duckdb/pull/27569) "Remove ORDER BY operators whose order is discarded above
them" (2026-10-20),
[#27567](https://github.com/duckdb/duckdb/pull/27567) "NUMERIC: a generic exact numeric type with run-time
representations" (2026-10-20),
[#27562](https://github.com/duckdb/duckdb/pull/27562) "Do not let a producing IE join / hash join source block
on its siblings under a parti…" (2026-10-20),
[#27561](https://github.com/duckdb/duckdb/pull/27561) "IEJoin: do not block a source thread that has no task
left to run" (2026-10-20).
_Issues in the window_:
[#27570](https://github.com/duckdb/duckdb/issues/27570) "[C-API-v2] `duckdb_v2_value_get_type` segfaults on a
value fetched from a VARIANT cel…" (2026-10-20),
[#27566](https://github.com/duckdb/duckdb/issues/27566) "2.0 alpha drops NULL rows from 1.5-written tables
under `OR ... IS NULL` filters" (2026-10-20),
[#27559](https://github.com/duckdb/duckdb/issues/27559) "Partitioned COPY of an IE join result hangs forever
(lost unblock in PhysicalIEJoin s…" (2026-10-20). _What it means for us_: DuckDB is **not a warehouse you
host** — it is a library that reads Parquet and CSV in-process. That is the entire appeal at our size: if
the settlement query over five years of events ever gets slow in Postgres, we write the same SQL against a
Parquet export produced by `COPY … TO` and nothing else has to change. It is the answer to _"do we need a
warehouse?"_ — **not yet, and if we ever do, this is the cheap version of yes.** **Verdict: watch, and keep
the escape hatch documented.**

**3.5 `apache/superset` (C2)** — _Licence_: **Apache-2.0**, from the project, no caveats. _Repository_:
75 228 ★, last release 2026-10-16, 26 releases/6 m, 100+ commits/90 d, 27 humans, 172 open issues,
1 339 338 KB. _Last 12 commits (2026-10-20)_: `3cf94c8` dependabot bump of `@types/node` in
`/superset-embedded-sdk` (#45514) · `77b0fd6` docs: add Plum to In the Wild (#45518) · `d5bccec` dependabot
bump of `chromaui/action` (#45512) · `0a17a75` dependabot bump of `storybook` (#45513) · `7b23dde`
chore(build): migrate from external `copy-webpack-plugin` to Webpack-native `output.copy` (#…) ·
`9c287d9` feat(build): migrate to Typescript 6 (#44726). _PRs in the window_:
[#45523](https://github.com/apache/superset/pull/45523) "fix(soft-delete): show Recently Archived in the menu
to everyone who can open it" (2026-10-20),
[#45522](https://github.com/apache/superset/pull/45522) "feat(extensions): let extensions contribute top-level
pages" (2026-10-20),
[#45521](https://github.com/apache/superset/pull/45521) "fix(sql-lab): return 400 instead of 500 when
`stop_query` is missing `client_id`" (2026-10-20),
[#45520](https://github.com/apache/superset/pull/45520) "fix(echarts): prevent Left/Right List legend overflow
in timeseries charts" (2026-10-20),
[#45519](https://github.com/apache/superset/pull/45519) "fix(plugin-chart-echarts): limit the grain-based bar
width cap to sub-daily grains" (2026-10-20),
[#45515](https://github.com/apache/superset/pull/45515) "feat(extensions): let extensions contribute top-level
pages" (2026-10-20).
_Issue in the window_:
[#45516](https://github.com/apache/superset/issues/45516) "mypy fails in nightly pre-commit: Optional
`StatementResult.data` indexed in `test_async`…" (2026-10-20). _What it means for us_: Superset is the
**licence-clean** option and it is a better analyst tool than Metabase — SQL Lab, datasets, virtual
metrics. But it is **web app + Celery worker + Celery beat + Redis + metadata Postgres + a cache layer**,
the project documentation recommends Kubernetes, and the managed alternative (Preset) is **free only up to
5 users** and then US$20 per user per month. For a 1–3 person team that is the wrong trade. **Verdict: the
fallback if AGPL is refused, not the first choice.**

## 4. Benchmark (V4 §12.5) — **UNVERIFIED: no eval set exists**

**I did not run a benchmark and I will not invent one.** There is no `apps/web`, no admin console, no metrics
layer, no BI deployment, and `docs/squads/web/eval/` does not exist. Every row below is **UNVERIFIED** and
says exactly how we would measure it.

**The set that must be built (name + shape):**

1. **`docs/squads/web/eval/settlement/`** — 24 months of synthetic delivery events for 10 couriers and 6
   clients: 10 couriers × 250 working days × 120 stops = **300 000 stops**, plus client rates, plus GST
   settings, plus odometer readings. The same dataset is loaded into Postgres, into a DuckDB Parquet file,
   and into a Metabase instance.
2. **`docs/squads/web/eval/ird/`** — the logbook fixture: a 90-day test period with an odometer at the start
   and the end, business and private journeys, and a vehicle that crosses 14 000 km in the year, so the
   Tier 1 / Tier 2 rate split is exercised.
3. **`docs/squads/web/eval/privacy/`** — the location-ping table with a 30-day purge job, and a courier
   account that can see their own history and request their own export.

| Metric                                      | Gate                                                                                                                                                                                               | How we would measure it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Status                                                                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Time to build a screen**                  | the per-courier KPI page ≤ 2 days; the settlement page ≤ 3 days; the IRD logbook PDF ≤ 2 days                                                                                                      | three build orders, each timed from spec to merge in `docs/squads/web/STATUS.md`; the same spec built once against our own FastAPI + Next.js page, once as a Metabase dashboard, once as a Superset dashboard, and the three times compared                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | **UNVERIFIED** — none of the three exist                                                                  |
| **Query latency**                           | "courier X's earnings for week W" **p95 < 300 ms**; "all couriers, this month" **p95 < 1.5 s**                                                                                                     | `pg_stat_statements` in CI over the 300 000-stop fixture; the same SQL against DuckDB over the Parquet export; 50 repetitions each, the 95th percentile reported. A warehouse is only needed if Postgres misses the gate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | **UNVERIFIED** — no dataset, no query                                                                     |
| **Cost per courier-month**                  | the whole analytics stack **≤ NZ$ 0.80 per active courier per month**                                                                                                                              | (infra $/month + BI $/month) ÷ active couriers. At 50 couriers: Metabase OSS on a $25 VM ≈ **US$0.50**; Metabase Cloud Starter US$100/mo ≈ **US$2.00**; Preset Professional US$20/user/mo for 2 users ≈ **US$0.80**; Lightdash Cloud Pro US$3 000/mo ≈ **US$60**; Evidence Team US$2 500/mo ≈ **US$50**; PostHog free tier ≈ **US$0**                                                                                                                                                                                                                                                                                                                                                                                                                       | **UNVERIFIED** — we have no courier count; the arithmetic is stated so the number is not a surprise later |
| **Operational complexity for a small team** | **≤ 4 services** in the analytics path, and **≤ 30 minutes/month** of operator attention per service                                                                                               | count the containers and the cron jobs; time a real upgrade on a database copy. Metabase adds **1** (plus its own app database); Superset adds **5–6**; ClickHouse adds **1**; the DuckDB escape hatch adds **0**, because it is a library inside the API process                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | **UNVERIFIED** — nothing is deployed                                                                      |
| **Data freshness**                          | the fleet view shows a courier's position with a **≤ 10 s** age; the settlement is correct at the moment it is opened; the Metabase dashboard is never more than **1 minute** behind the event log | stamp every row with `observed_at` and display the age; run the event insert and the dashboard query 100 ms apart and assert the row is visible; a synthetic clock offset in CI proves the age is shown, not hidden                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | **UNVERIFIED** — no live feed on the server                                                               |
| **Export correctness**                      | the GST and IRD exports are **correct to the cent** and **field-complete** for 30 consecutive days                                                                                                 | (a) recompute the totals independently in SQL from the raw event log and in Python from the same rows, and assert equality to 2 decimal places; (b) assert the logbook export contains exactly the OS 18/01 fields — test period start and end, odometer at start and end, and **distance, date and reason per business journey**; (c) assert the odometer is recorded at every balance date; (d) assert the Tier 1 / Tier 2 rate split at 14 000 km using the 2025-26 instrument rates (petrol $1.20/37c, diesel $1.30/38c, hybrid 90c/24c, electric $1.22/23c); (e) assert the GST figure is 15% of the taxable supply and that the client's GST number and address appear (GST Act 1985 s75(3B)); (f) assert **no GPS coordinate** appears in any export | **UNVERIFIED** — the export does not exist                                                                |
| **Privacy correctness**                     | **0** location pings older than 30 days are queryable; **0** analytics events contain a coordinate, an address or a name; a courier can export their own history                                   | run the purge job against a fixture with 90 days of pings and assert the count; scan the event payloads for a bounding box; assert the export endpoint returns the courier's own rows and nobody else's                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | **UNVERIFIED** — the purge job does not exist                                                             |
| **BI answer quality**                       | a depot owner can answer "how many stops did Sam do last Tuesday and how many were on time?" **without help**                                                                                      | 10 realistic questions written by us, each answered in Metabase and in Superset; time each; a colleague who has never seen the tool must answer 8 of 10 unaided                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | **UNVERIFIED**                                                                                            |

**First benchmark to run:** the export-correctness set (2 and 3) **before** the BI tool is chosen, because a
BI tool cannot fix a wrong number, and the export is the part a courier can be audited on.

## 5. What we are missing → rows for `docs/status/PARITY.md`

The CEO merges these. The **Spoke** column carries only facts verified in
`docs/study/spoke/TEARDOWN.md` (read 2026-10-21) and is **empty** where the teardown is silent.

| #   | Family     | Feature                                                                                                                                                | Status         | Spoke (2026-10-20)                                                                                                                  | Our edge                                                                                                                                                          | Task  |
| --- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 68  | Admin      | **Fleet view**: the depot owner sees every courier's live position and shift state on one map                                                          | Planned (task) | "live driver tracking, live route status, stop assignment" (TEARDOWN §9, S3/S4)                                                     | the same map style and the same voice hand-off as the courier's app, so a hand-over is one tap                                                                    | T7.12 |
| 69  | Admin      | **Settlement view**: what each courier is owed for a period, per client, per route                                                                     | Planned (task) | "No earnings, mileage logbook, IRD/GST export, invoicing or client statement in either product" (TEARDOWN §17, S2/S3/S5)            | a settlement the courier can read and the owner can export, reconciled to the event log to the cent                                                               | T7.11 |
| 70  | Earnings   | **NZ GST reporting**: taxable supply information per client, 15% GST, a two-monthly or six-monthly return figure                                       | Planned (task) | none documented (TEARDOWN §17, S2/S3/S5)                                                                                            | NZ-first: the register is produced from the delivery events, not reconstructed from a spreadsheet                                                                 | T7.11 |
| 71  | Earnings   | **IRD mileage logbook export**: a 90-day test period, odometer at start and end, and the date, distance and reason of every business journey           | Planned (task) | none documented (TEARDOWN §17, S2/S3/S5)                                                                                            | map-matched kilometres, so the logbook is the delivery log and not a separate diary                                                                               | T7.11 |
| 72  | Earnings   | **The IRD kilometre-rate calculation** for the current income year                                                                                     | Planned (task) | none documented (TEARDOWN §17, S2/S3/S5)                                                                                            | the rates are read from the published instrument each year and stamped on the export, so an old export still shows the rate that applied                          | T7.11 |
| 73  | Analytics  | **Per-courier KPIs**: on-time %, stops per hour, km, idle time, failure rate                                                                           | Planned (task) | "performance analytics" (TEARDOWN §2.3, S3/S5)                                                                                      | computed from the delivery event log, so they survive the app being uninstalled or the phone being lost                                                           | T7.12 |
| 74  | Analytics  | **Planned versus actual** per courier and per route                                                                                                    | Planned (task) | "performance analytics" (TEARDOWN §2.3, S3/S5)                                                                                      | the plan and the actual come from the same solver that built the route, so the comparison is exact rather than reconstructed                                      | T7.12 |
| 75  | Admin      | **Audit log of every admin action and every export**                                                                                                   | Planned (task) | no audit log documented; "Data history: 30 days / 1 year / 5 years" by plan (TEARDOWN §2.2, S3/S5)                                  | the audit log is a first-class table, not a log file, and it is what a Privacy Act access request is answered from                                                | T7.15 |
| 76  | Admin      | **Cost per courier** visible to the owner: AI, SMS, map tiles, storage                                                                                 | Planned (task) | not in the teardown (silent on any cost-per-courier view)                                                                           | the squad's own target — "the admin can see AI/SMS cost per user" — is the product feature, not a vendor's billing page                                           | T7.12 |
| 77  | Privacy    | **Location-history privacy**: a depot owner sees where a courier has been; the courier can see their own history and can ask for it                    | Planned (task) | "driver live location tracking" (TEARDOWN §2.3 and §9, S3/S4); the Play listing for Spoke Dispatch declares "Shares location" (S18) | purpose limitation by default: the owner sees the current position and the shift, and the aggregate KPIs; the track is the courier's to see                       | T7.15 |
| 78  | Privacy    | **A written monitoring policy** for the depot owner, with the Privacy Act 2020 and the Employment Relations Act 2000 addressed and the staff consulted | Planned (task) | not in the teardown (silent on any monitoring policy)                                                                               | our standing bar: the OPC says a company must ensure employees know why location is collected and how it is used                                                  | T7.15 |
| 79  | Compliance | **A retention rule that keeps the tax record 7 years and the location track 30 days**                                                                  | Planned (task) | "Data history: 30 days (Starter), 1 year (Premium), 5 years (Expert)" (TEARDOWN §2.2, S3/S5)                                        | the IRD's 7-year rule applies to the _record of business use_ (date, distance, reason), not to the GPS track — so the two retention periods never have to collide | T7.15 |
| 80  | Analytics  | **A metrics layer**: one definition per KPI, versioned, tested                                                                                         | Planned (task) |                                                                                                                                     | dbt-style models with tests; the same number appears in the app, the console and the export                                                                       | T7.12 |
| 81  | Analytics  | **The founder's own dashboard**: acquisition, activation, retention                                                                                    | Planned (task) |                                                                                                                                     | PostHog, EU cloud, with no address and no GPS in any event property                                                                                               | T7.12 |
| 82  | Admin      | **A data-export right for the courier** and a deletion path that honours the 7-year tax record                                                         | Planned (task) | "data history and export" (TEARDOWN §9, S3/S4)                                                                                      | one export endpoint serves the courier's access request and the owner's request, and the audit log says who asked for what                                        | T7.15 |
| 83  | Analytics  | **A weekly written summary** the founder and the depot owner can read without opening a tool                                                           | Planned (task) | not in the teardown (silent on any written summary)                                                                                 | generated from the same KPI views, so the summary and the dashboard cannot disagree                                                                               | T7.12 |

**A correction we owe `docs/status/PARITY.md`.** Rows 38, 39 and 40 currently read _"match - earnings tracking"_,
_"match - mileage logbook"_ and _"match - client invoicing"_. The teardown does not support any of the
three: **"No earnings, mileage logbook, IRD/GST export, invoicing or client statement in either product"**
(TEARDOWN §17, citing S2, S3, S5). Those three Spoke cells should be corrected to a **lead**, not a match,
and this is the single clearest commercial gap Spoke leaves open in New Zealand.

**A note on the Spoke column.** Everything above is a published Spoke Dispatch feature, quoted from the
help centre, the pricing pages or the changelog. Where the teardown is silent — the warehouse, the event
taxonomy, the metrics layer, the written monitoring policy — the column is **empty**, not guessed.

## 6. Decision

1. **The warehouse stays Postgres.** `docs/plan/COVERAGE_MAP.md` §12 already says _"data warehouse (Postgres
   views first)"_ and nothing in this research contradicts it. Our data volume: 50 couriers × 300
   stops/day × 365 ≈ **5.5 M stop-rows a year**, and every KPI is an aggregate over that, which Postgres
   - PostGIS handles with the right indexes and one materialised view. **No ClickHouse, no warehouse, no
     Iceberg, no Trino.** The escape hatch is documented and cheap (§3.4): a `COPY … TO` Parquet export read
     by DuckDB inside the API process, with no second server to run.
2. **The metrics layer is ours, written as SQL views, until the third metric.** Three views
   (`kpi_daily`, `mileage_logbook`, `settlement_period`) in `services/api` are a day's work. dbt OSS is the
   right tool once the definitions start to depend on each other and need tests — **so we adopt `dbt OSS`
   (Apache-2.0) at the third metric, not before**, and never the `dbt`/Fusion binary without a licence
   check of the artefact we install.
3. **The BI tool is Metabase OSS, self-hosted, connected through a views-only Postgres role.** One
   container, US$0, 20+ data sources, live queries, and an English question box a depot owner can use.
   The role sees `kpi_daily` and `mileage_logbook` and **not** `delivery_event` or `location_ping`, so the
   BI tool physically cannot show a courier's track. **AGPL is an ADR**: the precedent in our own docs is
   that AGPL is fine for internal-only use (`docs/research/RESEARCH_2026.md` line 351 on k6) and that a source-
   available licence is fine for internal work only (the same file on n8n) — so the default is "unmodified,
   internal, no distribution", and it must be written down before it is deployed.
4. **Fallback if AGPL is refused: Apache Superset**, self-hosted, with **Preset Starter free for up to 5
   users** if we do not want to run the six services. It is the better analyst tool and the cleaner
   licence, and it costs more to keep alive. The decision is a trade we take deliberately, not by default.
5. **PostHog stays the product-analytics engine** (already locked, EU cloud, free to 1 M events/month) and
   **OpenFeature stays the flag layer**. It answers _"do couriers use the dictation report?"_; it does not
   answer _"what did courier X earn?"_. **No address, no name, no GPS in any event property, ever.**
6. **The earnings, settlement and IRD/GST views are built in-house**, in FastAPI + the Next.js admin —
   **not in the BI tool**. The output has to satisfy the GST Act 1985 s75 record list and the IRD's
   logbook rules; a BI tool's CSV cannot. The BI tool is for the owner's _questions_; the settlement is a
   _product feature_ with a legal shape.
7. **The export is purpose-built: a `pdfme` PDF template for the IRD logbook, a `docx` statement for the
   accountant, and CSV for the rest.** We do not adopt an accounting package: beancount, fava and hledger
   are GPL, Invoice Ninja is ELv2, Akaunting is BSL, Bigcapital and Firefly III are AGPL, and Directus is
   MSCL — none is on the allow-list. A courier needs one document, not a general ledger.
8. **The privacy design is the product, not a compliance appendix.**
   - A **written monitoring policy** per depot: what is collected, why, who sees it, how long it is kept
     — and the staff are consulted, per Employment NZ.
   - **Purpose limitation by default**: the depot owner sees the current position, the shift and the
     aggregate KPIs. The **track** is the courier's to see and to export; the owner gets it only where the
     policy says so, and every view is audited.
   - **Two retention clocks, never colliding**: the tax record (date, distance, odometer, reason) for
     **7 years**; the raw location pings for **30 days**, then purged.
   - **The purge is a job with a test**, not a policy document: the privacy benchmark asserts that no ping
     older than 30 days is queryable.
   - **A location-free analytics taxonomy**: the event carries a hashed `driver_id`, a `shift_id` and a
     `lang` — never a coordinate, an address or a name.
9. **Data residency is an ADR, and it is a real conflict.** `docs/research/REPO_RESEARCH.md` line 232 recommends
   _"Host Postgres with PostGIS and pgvector on Supabase or AWS RDS in ap-southeast-2 (Sydney), about
   25-30 ms from Christchurch"_. The IRD's record-keeping page says: _"If you store your records off-shore
   (including cloud computing), make sure either you or your cloud service provider has our approval."_
   **Sydney is off-shore.** The tax record has to live in New Zealand or in an IRD-approved
   jurisdiction, and the 7-year record is the record most likely to be audited. Decision needed: a NZ
   region (ap-southeast-2 is Sydney; auckland is a separate region) or an IRD approval. This is the ADR we
   should write **first**, because the data location constrains the backup plan, the BI deployment and the
   export.
10. **Never ship** Airbyte (ELv2), Invoice Ninja (ELv2), Akaunting (BSL), RudderStack (ELv2), n8n (SUL),
    Directus (MSCL), Bigcapital / Firefly III / Ever Gauzy / Grafana (AGPL) or any of the accounting
    packages — and keep the existing CI licence gate in `scripts/ci/check-licenses.mjs` as the enforcement
    point.

**Fallbacks.**

| If this fails                                              | Fall back to                                                         | The cost                                                                |
| ---------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| AGPL is refused for Metabase                               | Apache Superset, or Redash (BSD-2)                                   | 4–6 extra services, or a tool with a yearly release                     |
| Metabase's SQL dialect fights our views                    | the admin console's own KPI pages in Next.js, reading the same views | we build each report by hand; the owner cannot ask a free-form question |
| Postgres gets too slow for the settlement query            | DuckDB over a Parquet export, run in the API process                 | a nightly export job and a second query path to keep correct            |
| The metrics definitions start to depend on each other      | `dbt OSS` against the same Postgres                                  | a build step, a `profiles.yml` and a project directory in the repo      |
| dbt's licence gets murky                                   | plain SQL views with a test suite (pytest + a golden-file check)     | no lineage, no lineage graph, no incremental models                     |
| The founder wants a written report rather than a dashboard | Evidence (MIT) rendering the same SQL into Markdown                  | no access control on a self-hosted instance (HTTP Basic Auth only)      |

**Risks.**

| Risk                                                                                                                       | Severity | Mitigation                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| The 7-year tax rule and the 30-day location purge are implemented as one table, so we keep seven years of location history | **High** | two tables, two clocks, a purge job with a test; the logbook field list is fixed by OS 18/01 and copied verbatim                            |
| The founder's data is hosted off-shore without IRD approval                                                                | **High** | ADR first: a NZ region or written IRD approval; the record-keeping rule is on the IRD page in plain words                                   |
| The depot owner is an employer and the Privacy Act 2020 applies to the courier's location                                  | **High** | the written monitoring policy, staff consultation, purpose limitation, and the courier's own access to their history; the PIA is task T7.15 |
| AGPL (Metabase) in our infrastructure without a written decision                                                           | Medium   | ADR before deployment; the CI licence gate is about the shipped app, so the ADR is the only control here                                    |
| A BI tool becomes the source of truth instead of the event log                                                             | Medium   | the BI role is read-only over views; every KPI is a view; the export is computed from the event log, never from a dashboard                 |
| The BI tool leaks a courier's location because someone grants it the base table                                            | **High** | the role has `USAGE` on the views only; a test asserts the role cannot `SELECT` from `location_ping`                                        |
| Cost: US$2 500/month for Evidence or US$3 000/month for Lightdash                                                          | Medium   | both are rejected on cost; the alternatives are free self-hosted and one container                                                          |
| An accounting package creeps in because "a courier asked for a .xlsx"                                                      | Medium   | the export is PDF + DOCX + CSV and nothing else; the licence gate is the enforcement point                                                  |
| PostHog events accumulate a coordinate "just for debugging"                                                                | Medium   | the event schema is allow-listed in code; a test asserts no event property is a coordinate or a free-text field                             |

## 7. Monthly radar filter

Run this on the **first working day of each month**, record the result in `docs/log/2026-W43.md`, and act
only when a trigger fires. ~20 minutes of work.

| #   | Check                                    | Command / source                                                            | Trigger                                                                                                                                 |
| --- | ---------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | **IRD kilometre rates**                  | ird.govt.nz "kilometre rates" page and the Operational Statement instrument | a new instrument is published → update the rate table in the code **and** re-stamp the rate on every export that refers to the old year |
| A2  | **IRD record-keeping guidance**          | ird.govt.nz/managing-my-tax/record-keeping                                  | the retention period or the off-shore rule changes → re-check the purge job and the data-residency ADR                                  |
| A3  | **GST settings**                         | business.govt.nz and the GST Act on legislation.govt.nz                     | the rate or the registration threshold changes → update the settlement calculation and its test                                         |
| A4  | **Privacy Act / OPC guidance**           | privacy.org.nz and employment.govt.nz                                       | any guidance on employee monitoring, GPS or biometrics → re-read our monitoring-policy template before the next depot signs up          |
| A5  | **Metabase release**                     | `api repos/metabase/metabase/releases`                                      | a release in the window → read the changelog for the Postgres driver and the **RLS** changes; a major → plan the upgrade on a copy      |
| A6  | **Metabase advisories**                  | `api repos/metabase/metabase/security-advisories`                           | any advisory → patch within 7 days; it is an internal service, so the bar is the same as for the app                                    |
| A7  | **dbt licence position**                 | getdbt.com/licenses-faq and the dbt-core licence file                       | the FAQ changes, or the `dbt`/Fusion binary's licence changes → re-check the artefact we install before the next dbt bump               |
| A8  | **dbt-core 1.x end of life**             | the dbt release notes                                                       | dbt Core 1.13 enters security-only mode → plan the v2 migration; we must be on the Apache-2.0 `dbt OSS` subset when we move             |
| A9  | **PostHog free-tier limits and pricing** | posthog.com/pricing                                                         | the 1 M-event allowance or the price changes → re-cost the analytics stack per courier-month                                            |
| A10 | **DuckDB release**                       | `api repos/duckdb/duckdb/releases`                                          | a release → read the release notes for the Parquet writer; a stable `COPY … TO` path is the escape hatch we depend on                   |
| A11 | **Superset release**                     | `api repos/apache/superset/releases`                                        | only if we are running the fallback; a release → plan the upgrade, because the config migrations are the painful part                   |
| A12 | **Our own gates**                        | the CI jobs                                                                 | the export-correctness test fails, or the purge job leaves a row behind → block the release, not the sprint                             |
| A13 | **Retention counters**                   | a nightly query over `location_ping` and `mileage_logbook`                  | the count of pings older than 30 days is not zero → **raise it the same day**; this is a privacy incident, not a backlog item           |
| A14 | **Event schema**                         | the test that asserts no coordinate, address or name in any event payload   | a new event type with a free-text property → block the merge until it is allow-listed                                                   |
| A15 | **The data location**                    | the deployment configuration                                                | the database region changes → re-check the IRD off-shore rule before the change lands                                                   |

## 8. What we could not verify

- **6-month star trend for every candidate** — the star _timeline_ is 403 with our token (re-verified
  2026-10-21). Proxies used: releases/6 m, commits/90 d, human authors/90 d, npm/PyPI downloads.
- **Median issue first-response time** — not sampled for this file. The routing note's method (closed-issue
  timelines, n = 2–15 per repo) was **not** repeated here, so no response-time claim is made.
- **Evidence's own pricing** — the US$2 500/month Team price is from a **third-party 2026 page**, not from
  evidence.dev/pricing, which was not read directly. The self-host facts (no access control, HTTP Basic
  Auth, `evidence serve` in Docker) **are** from the official self-host page.
- **The official Xero integration path** — `xero/xero-node-sdk` returns **404** and no maintained official
  SDK repository was found. If we ever sync to Xero, the integration route is **UNVERIFIED** and is an ADR
  of its own.
- **Metabase's exact Postgres driver behaviour against our views** — a _live query_ tool connects and
  generates its own SQL; the RLS and column-level permissions of the Pro plan are paid, so on the OSS
  edition the control is the **database role**, not the tool. Untested against our schema.
- **Metabase's self-host resource use on our data** — the vendor's cost table is infrastructure pricing,
  not a measured footprint on our dataset.
- **`dbt` versus `dbt OSS` behaviour on Postgres 16/17 with PostGIS** — the adapters are the 1.x line and
  the 2.x line is still young; the version that works with our Postgres is **UNVERIFIED** until we install.
- **Perspective's npm release line** — the GitHub repo is `perspective-dev/perspective` at version 5.6.0
  but npm still serves `@finos/perspective@3.8.0` (2025-09-03). The npm cadence is **UNVERIFIED**.
- **Vega-Lite's GitHub star count** — the npm figures were read, the repository metadata was not.
- **The IRD's "off-shore storage approval" process** — the requirement is quoted from the IRD page; the
  application process and the cost of approval are **UNVERIFIED**.
- **Whether a 7-year tax record may be held as a _derived_ table rather than the original events** — the
  GST Act s75(2) list is quoted, but whether our event log plus derived logbook satisfies it is a legal
  question, not an engineering one. **Counsel, not us.**
- **The exact BI question set a depot owner will ask** — our 10 benchmark questions are invented; they need
  replacing with three real ones from a real depot owner.
- **Every number in §4** — there is no admin console, no metrics layer, no BI deployment and no dataset, so
  every benchmark row is UNVERIFIED.
- **The `pkg`/PyPI download figures for the accounting packages** — not read, because each one is rejected
  on licence grounds before we need its adoption numbers.
- **Corrected by the verifier pass of 2026-10-21 (VERIFICATION-A/B/D.md): 17 cards corrected.**
