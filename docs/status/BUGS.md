# Bug Tracker - Courier Copilot

> Every known bug is logged here. No bug is closed without passing the 50x backtest for its critical path.

| ID | Description | Root Cause | Fix (PR) | Prevention Test | Status |
|----|-------------|------------|----------|-----------------|--------|
| BUG-001 | `app/nz_address.py`: Suburbs list is hardcoded + uses `difflib`; confusion between suffix and unit. "42B" = number 42 + suffix B. Unit written as `2/14`. | Legacy prototype code, not LINZ-based | Fixed in packages/nz-address | Unit tests for 50 Canterbury addresses with suffixes/units | fixed |
| BUG-002 | `app/agents/intake_graph.py` (`verify`): Mutates input in place; replay of applied answers is incorrect. | State mutation during verification | - | Property test: replay produces identical result | open |
| BUG-003 | `requirements.txt`: Uses `>=` version ranges instead of locked hashes. | No dependency locking | - | `uv lock --generate-hashes` produces reproducible lockfile | open |
| BUG-004 | Tool names in `services/api/app/agents/copilot.py` don't match section 4.5 catalog. | Naming drift from prototype | - | OpenSpec tool catalog compliance test | open |
| BUG-005 | No monorepo structure - code in `app/` not `services/api/` | Pre-monorepo layout | Monorepo created with services/api, packages/shared, nz-address, design-tokens | Turborepo builds all packages | fixed |
| BUG-006 | No CI pipeline with review-gate and 50x backtest | Not implemented | - | CI runs backtest.sh 50x on critical paths | open |
| BUG-007 | No Docker compose for local infrastructure (Postgres, Valhalla, LiveKit, Redis) | Not implemented | - | `docker compose up` brings up all services | open |
| BUG-008 | No Expo mobile app created yet | Phase B not started | Expo app created with all 6 native modules | `pnpm mobile start` runs on device/emulator | fixed |
| BUG-009 | No design system / design tokens pipeline | Phase B.2 not started | Design tokens with Unistyles 3 | Style Dictionary builds tokens for all platforms | doing |
| BUG-010 | No voice module (Sherpa-onnx, Pipecat, earbud protocol) | Phase B.4 not started | Voice service created, needs TS fixes | Voice commands work offline <300ms | todo |
| BUG-011 | No maps module (munim-maps, PMTiles, offline Canterbury) | Phase B.5 not started | MapLibre v11.3.7 integrated | Map renders offline at 60fps | todo |
| BUG-012 | No sync engine (op-sqlite, event sourcing) | Phase B.6 not started | @op-engineering/op-sqlite installed | Offline-first sync works | todo |
| BUG-013 | No LINZ address import worker | Phase C.1 not started | - | Weekly LINZ changeset import works | open |
| BUG-014 | No NZ address correction engine (pg_trgm, phonetic) | Phase C.2 not started | PHASE 2.3: services/api/app/address_correction.py (D8 contract, fuzzy road matching, number checks, self-correction, units/flats, RD) | 95%+ correction accuracy on golden set (the LINZ-backed accuracy run is **NOT VERIFIED** until data/linz/ is provided) | doing |
| BUG-015 | No map builder pipeline (planetiler, PMTiles) | Phase C.3 not started | - | Canterbury PMTiles < 500MB builds weekly | open |
| BUG-016 | No routing engine (Valhalla + VROOM + OR-Tools) | Phase C.4 not started | 2026-10-24 (`feat/routing-solver`): the order engine delivered — PyVRP 0.14.1 behind `RouteEngine` (ADR-009, D35), 174-stop break-day 4.7 s / 0 violations vs the heuristic's 50 s / 17; the Valhalla/VROOM **matrix** leg (real drive times) is still open, as is the VROOM comparison leg (Docker never started in its 45-min box) | 200 stops routed < 5s (budget test green; `docs/evidence/backend-solver/benchmark.json`) | open |
| BUG-017 | No 3-point door memory with EWMA learning | Phase C.5 not started | - | Door memory persists across shifts | open |
| BUG-018 | No dictation mode with auto-correction report | Phase D.1 not started | - | 30 addresses dictated → corrected list | open |
| BUG-019 | No live voice agent (Pipecat cascade, all languages) | Phase D.2 not started | - | Multi-language conversation works | open |
| BUG-020 | Not all features voice-accessible (D2) | Phase D.3 not started | - | Every tool has voice command | open |
| BUG-021 | No driving mode (geofences, whispers, nav handoff) | Phase D.4 not started | - | 10-stop drive hands-free | open |
| BUG-022 | No web dashboard (Next.js) | Phase E.1 not started | - | Driver dashboard syncs with mobile | open |
| BUG-023 | No admin panel | Phase E.2 not started | - | Internal admin sees all orgs | open |
| BUG-024 | No Stripe billing (NZD, GST) | Phase E.3 not started | - | Subscriptions work end-to-end | open |
| BUG-025 | No team/franchise features | Phase E.4 not started | - | Multi-driver orgs work | open |
| BUG-026 | No OCR label scanning (VisionCamera + ML Kit) | Phase F.1 not started | - | 50 label photos → 95% LINZ address_id | open |
| BUG-027 | No POD photo capture | Phase F.2 not started | - | Optional photo per delivery | open |
| BUG-028 | No optional SMS notifications | Phase F.3 not started | - | Customer tracking link via SMS | open |
| BUG-029 | No IRD logbook PDF generation | Phase F.4 not started | - | PDF with IRD-compliant numbers | open |
| BUG-030 | No Ferrostar turn-by-turn behind flag | Phase F.5 not started | - | Flag toggles built-in navigation | open |
| BUG-031 | No Privacy Impact Assessment | Phase G.1 not started | - | PIA document complete | open |
| BUG-032 | No App Store / Play Console assets | Phase G.2 not started | - | Screenshots, descriptions ready | open |
| BUG-033 | No acceptance test script (emulator + device) | Phase G.3 not started | - | ACCEPTANCE_TEST.md passes | open |
| BUG-034 | No handover documentation (HANDOVER.md, APK) | Phase G.4 not started | - | Founder can run emulator + install APK | open |
| BUG-035 | Compliance: NativeWind used instead of Unistyles 3 | External review found violation | Migrated to Unistyles 3 | No NativeWind imports in codebase | fixed |
| BUG-036 | Compliance: Supabase Auth used instead of Better Auth | External review found violation | Migrated to Better Auth | No Supabase Auth imports in codebase | fixed |
| BUG-037 | Compliance: munim-maps referenced instead of MapLibre v11 | External review found violation | Migrated to @maplibre/maplibre-react-native v11.3.7 | No munim-maps references | fixed |
| BUG-038 | Compliance: Redis used instead of Valkey | External review found violation | docker-compose uses Valkey 8 | No Redis in docker-compose | fixed |
| BUG-039 | Compliance: .gitignore missing .turbo/, .expo/, dist/, node_modules/ | External review found violation | .gitignore updated, .turbo/cache removed from git | git check-ignore catches all build artifacts | fixed |
| BUG-040 | TypeScript errors in voice module (missing exports, module resolution) | Voice module incomplete | Need to fix exports and imports | `tsc --noEmit` passes | doing |
| BUG-041 | `pnpm install` left a half-deleted `node_modules`: pnpm skipped re-extracting packages, so packages resolved to the wrong hoisted versions (`zod@3` for Better Auth, `lru-cache@10` for Babel, a `react-native` without `Libraries/`). Symptoms: `LRUCache is not a constructor` (jest, expo CLI), `sessionSchema.loose is not a function` (Better Auth), `Could not locate module react-native/Libraries/AppState/AppState`. | The first install failed with a Windows path collision (`docs/evidence/audit/pnpm-install.log`); the later installs reused the broken tree. | Remove `node_modules` with a full literal path and reinstall (PHASE 2.1 / 2.2) | `pnpm install` from a clean tree + the full workspace test suite | fixed |
| BUG-042 | `app/nz_address.py` read "42B" as unit `B` + number `42` | Legacy prototype parsing (R23: `42B` is number 42 + suffix B; a unit is written `2/14`) | PHASE 2.3: `ParsedAddress.suffix` added, suffix and unit separated | `tests/test_core.py::test_parse_spoken_address` + `test_parse_unit_slash_is_a_unit_not_a_suffix` | fixed |
| BUG-043 | No D8 address-correction engine: no `{original, corrected, reason, confidence, needs_question, options[]}` contract, no non-existent-number handling, no self-correction, no multi-suburb question, no units/flats, no RD handling | Phase C.2 never started | PHASE 2.3: `services/api/app/address_correction.py` + 24 tests + an 87-address fixture | `tests/address/test_correction.py` (accuracy test over the fixture) | fixed |
| BUG-044 | `ThemeProvider` wrote CSS variables to `document.documentElement` — undefined in React Native, so it crashed on device | CSS-variable theme ported from a web codebase | PHASE 2.2: Unistyles `StyleSheet.configure` + `UnistylesRuntime` | `pnpm --filter mobile test` | fixed |
| BUG-045 | The mobile lint does not exist as a gate: apps/mobile/eslint.config.mjs points at the shared flat config, but the app never declared that package (or eslint) as its dependency, so the config cannot load, no eslint runs on the app, and the type-aware findings stay invisible (159 was the measured count before the gate; the first real run was 178 findings over 28 files) | The mobile package never joined the lint gate (no lint script, no dependency on the shared config) | PR #5 (`fix/mobile-lint-gate`): the dependencies declared, every finding fixed at its root (the typed Better Auth boundary in `auth-client.ts`, the theme-name narrowing in `ThemeProvider`, the non-strict inference edges in `storage.ts`, the CI build of design-tokens before the app gates), `"lint": "eslint ."` on in the app and in `pnpm -r lint` | `pnpm --filter mobile exec eslint .` runs 0 findings, no suppressions; the CI job "lint, typecheck, test" green and the floor guard clean on the PR's runs | fixed |
| BUG-046 | The app does not navigate to a deep link: courier:///compat leaves the app on the screen it was on (the emulator run of 2026-10-21, the screenshot in the run's evidence) | Not yet diagnosed. The route exists, the scheme is in the generated manifest and the root stack now keeps every route registered (Stack.Protected), so the cause is on the native side: the intent never reaches React Navigation's linking | - | The B.7 flow now reaches the screen from the settings, and a deep-link flow has to be added when the notifications arrive (they open a stop) | open |
| BUG-047 | In CI every mobile jest suite crashed in jest.setup.js (TypeError: Cannot read properties of undefined (reading 'configureWebLayoutAnimations'), the all-red run 39782019715) while the same suites passed on Windows | pnpm names the virtual-store directories of node_modules/.pnpm with the platform default: 60 characters on Windows (the short hash form) and 120 on Linux (the full peer suffix, e.g. react-native-reanimated@4.7.1_react-native-worklets@0.13.0_...). Reanimated's resolver decides "worklets-bound" by a substring match on the base directory, which the peer suffix satisfies for every Reanimated-internal request; the workers stripped the native extensions inside Reanimated, jest loaded the web build of the library, and its mount ran the web layout animations against the host elements of the React test renderer | PR #3: virtualStoreDirMaxLength: 60 pinned in pnpm-workspace.yaml (pnpm 12 reads the node-modules settings there; .npmrc carries only auth and registry - pnpm.io/settings/node-modules, read 2026-10-22) and apps/mobile/jest/resolver.js adopts the official semantics of both upstream resolvers with the corrected membership test (the package root segment after the last node_modules, never a virtual-store peer suffix); setUpTests() and every suite and test kept, no stub of library internals remains | the mobile suites pass 25/339 on the Linux workers (runs 39791921375 and 39791933552) and locally on Node 24 and Node 22 with CI=true | fixed |
| BUG-048 | The Maestro flow today-list.yaml was rejected at parse time on the CI emulator (Config Field Required: element at .maestro/today-list.yaml:22:1) before a single step ran | scrollUntilVisible requires its selector inside the element field (docs.maestro.dev/reference/commands-available/scrolluntilvisible, read 2026-10-22); the command had the id directly under it (landed with 323b2f2, never behind a green CI tree). The app itself was healthy: the launcher ok (COLD, 1616 ms), the process alive on the stops sheet, the other four flows completed every step | fdd539b on PR #3: the selector nested in the element field | a local parse check of every flow (two YAML documents, the element-field rule) and all five flows green in run 39791933538 | fixed |
| BUG-049 | The D34 dock never rendered on the device: the custom `tabBar` sat inside js-tabs' `screenOptions`, which the fork's `partitionNavigatorProps` strips for the router, and nothing reads a custom bar back from the descriptors — the DEFAULT bar rendered instead (run 39892147848: four invisible 31×28 MissingIcon boxes at the exact quarter positions, zero dock ids in the a11y tree, the screenshot with no dock; every slot step failed while the smoke flow, which touches only the screen, passed) | the option typechecks (the screen options absorb the navigator config type), but at runtime the fork only honours the bar from the navigator's props (`BottomTabNavigationConfig.tabBar` → `BottomTabView` line 117) | on PR #11: the bar moved to `<Tabs tabBar={...}>` as an element prop and the inert `tabBarStyle` option dropped; `compat.yaml`'s `today-settings` → `tab-settings` (the D34 consequence) | run 39904905360 on the fixed head: compat tapped `tab-settings` and completed (screenshot `b7-compat`), map/smoke/stops green, and the run's a11y dump carries the full dock (`tab-bar`, `tab-today`, `tab-stops`, `tab-map`, `tab-settings`) - the red flow of the same run is BUG-050 | fixed |
  | BUG-050 | On the rebuilt Today the run actions never surfaced to the flow: `today-list.yaml` failed at `Scrolling DOWN until id: today-mark-delivered ... FAILED` (run 39904905360, the only red flow; compat, map, smoke and stops green on the same head) | the flow was written for the old screen, which scrolled the whole screen; the design moves the actions inside the run sheet, the sheet opens at PEEK (0.30 of the window), and a scroll gesture starts at the screen's centre - above the sheet's top edge it is on the map, so the sheet's inner ScrollView never scrolled and the actions row stayed clipped (the a11y dump at failure carries the dock and sheet ids but none of the `today-mark-delivered` family) | on PR #11: the flow raises the sheet one level first - a swipe on `today-sheet-grabber` direction UP (the design's own grabber gesture, the same motion the 03-today recording rides), then the scroll runs inside the sheet | run 39909165246 on the fixed head: GREEN - build and all five flows passed (compat, map, smoke, stops, today-list); the sheet's raise is the design's own gesture and the scroll did the rest | fixed |
  | BUG-051 | The emulator image's own Chromium SIGTRAPs the app seconds into a cold launch, and the E2E gate treats a mid-wait death as "the app never starts" - root cause now **pinned** (the finding of 2026-10-23): **React Native core** ships the webkit bridge - `com.facebook.react.modules.network.ForwardingCookieHandler`, wired as the OkHttp client's `CookieHandler` by `NetworkingModule` (and WebSocket/Fresco); every `fetch()` calls `get(uri)` which lazily calls `android.webkit.CookieManager.getInstance()` (the class's own comment: "Instantiating CookieManager will load the Chromium task taking a 100ish ms so we do it lazily… on a background thread") - the first touch launches the WebView provider (`WebViewChromiumFactoryProvider.getCookieManager` → `libmonochrome_64.so`) on the REQUEST thread; the tombstone's `h82.get → h82.a` frames are exactly that override + lazy getter, `v61/ud5/v50/ml5/fl5` are the okhttp worker frames, and the thread name `localhost:8080/…` is the URL-pinned worker. The triggering call on our side: `useCourierVoice`'s mount effect (line 139) `client.startSession()` → `CourierVoiceClient.request()` → plain `fetch` to `VOICE_SERVICE_URL = EXPO_PUBLIC_VOICE_SERVICE_URL ?? 'http://localhost:8080'` (line 46; unset in the E2E build) - the fetch always fails gracefully under the mocks, but not before touching the WebView stack | api-34 image's Chromium init racing/trapping under the WebView factory load on the request thread (the app code is innocent but supplies the first fetch); NO cookie/WebView dependency of ours exists in source or installed packages - the grep over 1,655 native sources found the bridge only in RN core | on PR #13 (the founder: the relaunch-once retry stays a **TEMPORARY guard**): every death is inspected BEFORE it is ridden - the tombstone must be the KNOWN image crash (SIGTRAP + libmonochrome/WebView-factory/CookieManager chain, verdict proven against run 39905489019's tombstone; extracted to `evidence/crash-last.txt`); an UNKNOWN signature fails the run immediately; the known one is ridden once and a second death still fails; every relaunch is counted in the run summary (`relaunches=N` in `evidence/summary.txt` + the GitHub job summary) | the api-35 leg joins the E2E matrix (a PR must be green on images 34 AND 35, the evidence artifacts renamed `android-e2e-evidence-api{34,35}`); a real-device launch test is FOUNDER_TODO (no device available); mitigation candidates pending a decision: warm `CookieManager` on the main thread at boot, or move the voice session start behind a user gesture, or replace the forwarded cookie handler | doing (re-opened 2026-10-23 by the founder directive) |


| BUG-052 | The core's greedy break placement costs a full schedule walk per candidate gap: `_schedule` on a break-day walks the whole day n-1 times (38,406 walks profiled at 222 candidate evaluations on the 174-stop benchmark day), so a solver-planned day with a break pays ~2-3 s extra, and a 200-stop break day can pass the 5 s budget only on fast machines/regs | `_build_plan(order, request, engine, break_position=None)` calls the greedy scan; each scan position evaluates `_walk(order, request, k)` from scratch (ADR-009 §Limitations) | queued (the solver task stayed inside its scope): make the scan incremental - one walk + O(1) per-position scoring; the exact-same-placement ordering must not change | the benchmark's budget row (200-stop, no break) stays green irrespective; when this bug fixes, the budget test gains a 200-stop-with-break variant | open |
| BUG-053 | The Android E2E gate dies at Maestro's `launchApp` on the first one to three flows of a run and the later flows of the SAME run pass, so a PR goes red while nothing in the app changed (runs 40072959461, 40074433462, 40075034375, 40075218703, 40075306383, 40077114264; PR #20's run: `compat`, `delivered` and `driving` all died at `launchApp`, while `map`, `smoke` and `stops` passed on the same head). The log carries `DisplaySurfaceGlContextHelper context was preempted by others`, `Failed to restore previous context: 12297` and ColorBuffer errors. **The ID BUG-052 was named for this bug in `docs/log/CURRENT.md` and in the founder's Lead session 4 brief (2026-10-24), but the tracker's BUG-052 had already landed with PR #19 for the solver's break-scan cost, so this bug is BUG-053 and the brief reads as BUG-053.** | the workflow started the emulator with NO `-gpu` flag (`emulator-options: -no-window -no-snapshot -noaudio -no-boot-anim -camera-back none -memory 2048`), so the emulator chose its own host GL mode; on the headless runner that mode loses the GL context when a flow starts a fresh app context, and the first one to three flows pay for it (the runtime evidence is in the runs above; the deciding proof is the fix's own runs below) | PR #22 (`fix/bug-052-emulator-swiftshader-gpu`): `-gpu swiftshader_indirect` in `android-e2e.yml` - `design-videos.yml` and PR #12's `screen-recordings.yml` already carried it, and the nightly on `main` (run 40077256396) was green on the old setting, which is why this never looked like infrastructure | `scripts/ci/check-emulator-gpu.mjs`, in the quality-gates floor job: any workflow that boots an emulator without the flag fails the gate (proven: it flags `main`'s pre-fix `android-e2e.yml` at line 163 and passes the fixed tree) | testing |

---

## BUG-053: the hunt for the `launchApp` death (the results, newest last)

The hypotheses were written first (PLAYBOOK §5), each with its evidence, its
counter-evidence and its cheapest decisive test, because the next session's
first instinct ("the fleet is busy") had already cost a session.

| # | Hypothesis | Evidence for | Evidence against | Decided by |
|---|---|---|---|---|
| H1 | The emulator picks an unstable host GL mode without `-gpu`, and the first flows of a run die in it | the workflow had NO `-gpu` flag; the runs' logs carry `context was preempted`, ColorBuffer errors and `launchApp` deaths; `design-videos.yml` and PR #12's `screen-recordings.yml` already set `swiftshader_indirect` on the same runner image | none recorded yet | PR #22's own runs: both api legs with no `launchApp` death, no ColorBuffer and no preemption |
| H2 | "Fleet contention": the parallel PR runs disturb each other (the last session's theory) | the failures clustered while 3 PRs ran at once | **dead**: every GitHub-hosted job runs on its own VM; the nightly on `main` (40077256396, 08:14) was green and PR #19's E2E (40075990203, 08:03) was green while PR #18 was failing | killed by `gh run list` on 2026-10-24 |
| H3 | An app regression in the Scan / Copilot / Route screens | those three PRs are the failures | the deaths are per-flow inside a run (map/smoke/stops green in the same run), and `launchApp` dies before any test step; also `compat` and `delivered` are unchanged screens | killed by run 40074433462's per-flow split |

The founder's rules for this hunt (Lead session 4 brief, 2026-10-24): no shared
fleet-wide `concurrency` group (GitHub cancels the other pending runs of a group,
which would silently drop PR runs), and if the deaths survive swiftshader the
solo experiment runs (`gh workflow run android-e2e.yml --ref feat/t6-scan` only
while no android-e2e run is in_progress).

Results:

- **2026-10-24, the fix is in (PR #22).** `android-e2e.yml` line 169 carries
  `-gpu swiftshader_indirect`; the prevention gate `scripts/ci/check-emulator-gpu.mjs`
  runs in the floor job and fails any workflow that boots an emulator without the
  flag. **The runtime proof is below** (the run set out in the next entry), and the
  gate's 24 tests pass (`node --test scripts/ci/__tests__/check-emulator-gpu.test.mjs`).

- **2026-10-25, the runs are read, and the proof bar is amended with the evidence
  rather than met by assertion.** PR #22's run 40083028631 (26m53s) is GREEN on both
  api legs, and all 8 flows completed on each: the fatal shapes before it are gone.
  The earlier reds are now named from their own logs (40077114264, the api-35 leg):
  `##[error]no first screen appeared in 90s` — the readiness gate, not a Maestro step -
  and on api-34 `Assert that id: today-screen is visible... FAILED` in copilot.yaml and
  smoke.yaml, i.e. the app did not come back to the first screen after the previous
  flow. **The GL noise did not vanish:** this run still logs 10 `ColorBuffer` /
  `context was preempted` / `Failed to restore previous context: 12297` lines (6 on
  api-34, 4 on api-35), and no flow dies on them. So the honest verdict: the flag took
  away the FATAL loss of the first screen and left the emulator's own GL chatter, which
  the screenshots and the app ride through. The brief's proof line ("no ColorBuffer and
  no preemption lines") was the bar as written before the evidence; the evidence says
  the bar is wrong about the chatter and right about the deaths, so it is recorded as
  amended, not quietly met. Evidence: `docs/evidence/bug-053-emulator-gl/`.

- **2026-10-25, the review of the fix hardened the gate** (the findings are worth
  keeping, because they are the class of bug this repo records): the anchor was a
  substring match, so a comment naming the pinned action counted as a boot; the flag
  was matched as a substring, so `-gpu swiftshader_indirect -gpu host` booted on host
  GL and passed; the scan only walked forward, so a legal `with:` before `uses:` read
  as "no options"; YAML anchors passed; the scan directory was cwd-relative and a
  missing directory printed a stack trace; and nothing tested the CI-visible contract
  (`checkWorkflowDir` and the exit codes). All fixed, 24 tests, and one named
  `tests the gate over the repo's own tree is not vacuous` so it cannot scan zero files
  and stay green. D37 is the decision (D36 had landed with the backend squad in the
  same hours, so the renumber and the collision are recorded).

- **2026-10-25, the flag is NOT the whole fix, and the record says so.** PR #22's own
  run 40090791268 (25m01s) is GREEN on both api legs on the hardened head, so the flag
  took the fatal first-screen loss out of that branch. PR #24 (the 09 map screen, with
  the flag merged in) run 40091141666 then split the legs: **api-34 GREEN** (all 8
  flows, including `map.yaml` on the new screen) and **api-35 RED** - compat, delivered,
  driving and map all died at `Launch app "com.courier.copilot" with clear state...`
  with `logcat-crash.txt` EMPTY, `relaunches=0` and a healthy app on the screen (the
  evidence `window.xml` carries `today-screen`, the dock and every `tab-*` testID). So
  the death is not a crash and not the app code: the app renders. The founder's
  instruction for exactly this case is running now - the **solo experiment**
  (`gh workflow run android-e2e.yml --ref feat/t6-09-map-style`, run 40095991344, with
  no other android-e2e run in progress). Its result is written here as soon as it
  lands, and if the api-35 leg dies alone too, the next triage is PLAYBOOK §1 against
  the emulator image's own behaviour (a launchApp race on api-35 under software GL),
  not the app.

---

**Last Updated:** 2026-10-23 (PR #11 MERGED at caf2ef4: the deciding run 39909165246 green - BUG-050 and BUG-051 flip fixed; step 02 driving in review as the next per-screen PR. BUG-051 RE-OPENED to doing on the founder directive: the relaunch-once retry is a temporary guard only - the root cause is pinned to React Native's ForwardingCookieHandler (the webkit bridge) behind the voice client's cold-start fetch, the relaunch now rides only the KNOWN crash signature and every relaunch is counted, and the api-35 image leg joins the E2E matrix; a real-device test is FOUNDER_TODO) 2026-10-24 (the solver squad: BUG-016 partially delivered - PyVRP 0.14.1 behind `RouteEngine`, ADR-009/D35, the matrix leg still open; BUG-052 opened for the break-scan cost; the lead session: BUG-053 opened for the emulator GL loss with the flag fix and the prevention gate, H2 "fleet contention" killed by the green nightly and the green PR #19 E2E) 2026-10-25 (the lead session: PR #22's run 40090791268 green on both legs on the hardened head; PR #24's run 40091141666 split - api-34 green with all 8 flows, api-35 red at launchApp with no crash and a healthy app; the solo experiment 40095991344 is running)
**Total Bugs:** 53 | **Open:** 28 | **Fixed:** 17 | **Doing:** 4 | **Todo:** 3 | **Testing:** 1 | **Verified (50x):** 0
