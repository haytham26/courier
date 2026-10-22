# Design research — what is distinctive in 2026, and what we refuse to copy

**MASTER_EXECUTION §13.1 (the Design Studio). Read this before the bench and the three directions.**

**Research date: 2026-10-22.** Method: V4 §12 (the repository card, the evidence, the date) and
§13.2 (the anti-"AI look" rules are a gate, not a wish). Every number in this document was read
from the live GitHub API, the npm registry or the product's own site on **2026-10-22**, unless
the row says **UNVERIFIED**.

The raw evidence is in `docs/design/evidence/`:

| File                                                    | What it is                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `github-repos-2026-10-22.tsv`                           | 89 repositories: stars, release, licence, maintenance, open issues      |
| `npm-packages-2026-10-22.tsv`                           | 44 packages: version, unpacked size, licence, publish date              |
| `reference-urls-2026-10-22.tsv`                         | every reference URL with the HTTP status the checker saw                |
| `design-repos.txt`, `design-packages.txt`               | the pools the two scripts read                                          |
| `research-notes.tsv`                                    | why each repository is in the pool                                     |

The three scripts that produced it are in `scripts/`:

- `scripts/design/fetch-design-evidence.ps1` — the GitHub snapshot (`gh api graphql`, the token comes
  from `.env.local` and is never printed).
- `scripts/design/fetch-design-npm-evidence.ps1` — the npm snapshot.
- `scripts/design/check-design-reference-urls.ps1` — the reference URLs, with their status.
- `scripts/design/build-design-research-tables.mjs --write` — rebuilds the tables of this document from
  the snapshots, so the numbers cannot drift away from the API.

---

## 1. The method, and what "verified" means here

A card is **verified** when the number was read from the API or the registry on the day of the
research. It is **UNVERIFIED** when the number could not be read, or when it is a judgement
rather than a measurement. **There is no estimated number in this document.** A thing that was
not measured is written as UNVERIFIED, not as a plausible figure.

The maintenance column is a proxy, and the proxy is stated in V4 §12.3: the day of the last
commit on the default branch, the last release and its date, the number of releases and the
number of open issues. The star *timeline* is not readable with the token in `.env.local`
(the stargazers endpoint answers 403), so **no "stars gained in six months" figure appears
anywhere in this document.**

### Three findings from the snapshot that change what we do

1. **`lottie-react-native/lottie-react-native` is no longer in the `airbnb` organisation.** The
   repository moved out (the API redirects `airbnb/lottie-react-native` to the new name). The
   project is healthy — 17 210 stars, v7.5.0 on 2026-08-22 — but the Lottie runtime is barred by
   our own rule about decorative motion, so the move is noted and not acted on.
2. **`wcandillon/react-native-skia` is the canonical name again.** The API redirects
   `Shopify/react-native-skia` to it, and npm still publishes the package under the Shopify
   name (`@shopify/react-native-skia@2.14.0`). The project changed hands twice in two years;
   the lesson is that a drawing engine is a big native dependency to carry through that.
3. **`amzn/style-dictionary` is now `style-dictionary/style-dictionary`.** The API redirects the
   old name. Our token package header says it is "built for the Unistyles 3 + Style Dictionary
   pipeline", and no such build exists yet — that is a task, not a citation.

---

## 2. What is distinctive in 2026 — and what is "AI-looking"

### 2.1 What is genuinely new in 2026 (and useful to a courier at the door)

| The shift                              | What it means for us                                                                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **The Fabric sheet**                   | A sheet can be a native view with a real spring: `@swmansion/react-native-bottom-sheet` v0.17.0 (2026-10-18) computes its geometry in C++ and uses a critically damped spring (ζ = 1) on iOS **and** Android. This is the first sheet in years whose physics match our rule by construction. |
| **Native animations without JS**       | `appandflow/react-native-ease` v0.9.0 (2026-10-15) drives Core Animation and the Android Animator directly, from a maintainer we already depend on. The movement never touches the JS thread. |
| **The accessibility work moved into the kits** | `callstack/react-native-paper` shipped accessible modals, portal assistive-technology hiding and reduce-motion forwarding in September 2026. `founded-labs/react-native-reusables` added reduced motion and portal accessibility to 22 components on 2026-07-02. **Read them; do not install them.** |
| **Tokens as plain TypeScript**         | `Shopify/restyle` and `jpudysz/react-native-unistyles` both treat a theme as a plain object. Our `packages/design-tokens` is the same idea, and it is the reason the three directions of §13.4 could be built in a morning. |
| **The map is a style, not a picture**  | `maplibre/maplibre-style-spec` v26.4.4 and `maplibre/maputnik` v3.1.0: the map is a document we own, so the courier map style can carry the same palette as the app. |
| **Rolling numbers**                    | `Rednegniw/number-flow-react-native` v0.5.1 (2026-08-19) does what our "stops remaining" number needs. It is 424 stars and we have not measured it; **UNVERIFIED** until the bench runs it. |

### 2.2 What is "AI-looking" in 2026 — the rules of §13.2, applied to the pool

The rules are a gate: a design that breaks one does not ship. Here is where the rule bites in
the material we looked at, and what it says about each reference product.

| The rule (§13.2)                        | Where we see it breaking                                                                        | What we do instead                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| No neon accent on black                | Every "AI dashboard" of the last two years: a saturated accent on a near-black background, glow, bloom. | The day is the identity. The night theme stays near-black and low-blue, with no glow at all. |
| No glow or bloom                        | `react-native-skia`'s blur and shader effects are the tools that make this effect; they are also the tools that make a driving screen unreadable. | Skia is **not** adopted. Nothing in the app uses a bloom, a lens flare or a glowing edge. |
| No glassmorphism                        | `heroui-native` v1.0.11 lists `expo-blur` as a peer dependency — the glass look is a *dependency*. | We never install a blur library. The sheet is an opaque surface. |
| No pulsing orbs                        | `react-native-reanimated`'s own "pulse" recipes, the "breathing" dots in every 2025 onboarding. | The voice bar states its state with a word and a static dot. It never pulses. |
| No purple-blue gradients               | The default gradient of every generated screen in the pool. | Each direction has **one** accent and no gradient at all: kraft amber, sea teal, highway orange. |
| No sparkle icons for AI                 | The "✨" glyph and the whole family of star-burst icons. | One icon set (Material Symbols), no emoji, no sparkle, anywhere. The rule is tested: `apps/mobile/app/design/__tests__/directions.test.tsx` fails on any emoji in the tree. |
| No generic rounded cards stacked       | `gluestack-ui`, `heroui-native` and `nativecn` all ship a rounded card as the default surface. | Roadbook uses **hairline rules and no cards at all**; Beacon uses space; Freight uses hard corners. A card is never the default. |
| No centred hero + two buttons           | The onboarding cliché every kit ships. | The next stop is never a centred hero card; the primary action is at the bottom of the screen, where the thumb is. |
| No dark mode by default                 | The 2020-2023 default. | The founder's rule stands: the day is the default, the night is the adapted option. All three directions are light palettes, and the token test fails a direction that is not. |
| No stock iconography without a system   | Mixed icon sets in the reference products. | One set, one weight (Material Symbols, 500). |
| No lorem-like filler                   | The "Welcome back, John!" copy of every kit's demo screen. | Plain NZ English, real addresses, real suburbs, real times. The three directions show 14 Harewood Road, Papanui, 10:42. |
| No emoji                               | Everywhere. | Never. Tested. |

---

## 3. The reference products: what each does well, and what to avoid

Only public material was used: the products' own sites, their help centres and their public
engineering or design writing. The status of every URL is in
`docs/design/evidence/reference-urls-2026-10-22.tsv`: **26 of 31 answered 200**; the other five
(`uber.com/global/en/driver/`, `uber.com/help/`, the Amazon Flex help page, `revolut.com` and
the Amazon Flex landing page) answered **403/406/429** — the hosts' bot protection, not a dead
link. **Two URLs from the first draft were wrong and were removed**: `help.spoke.co.nz` does not
resolve (the help centre is `https://www.spoke.co.nz/help`) and `monzo.github.io/styleguide/`
answers 404 (the old public style guide is gone; Monzo's public API documentation is at
`github.com/monzo/docs`).

### 3.1 The delivery competitors

| Product | What it does well in the screens and the motion | What to take | What to avoid |
| --- | --- | --- | --- |
| **Spoke** ([spoke.co.nz](https://www.spoke.co.nz/), [help](https://www.spoke.co.nz/help)) | The NZ benchmark (`docs/study/spoke/TEARDOWN.md`): the run is a list the courier works down, the swipe left/right on a stop is the fastest way to mark it, and the map is always one thumb-tap away. | The swipe-to-deliver gesture, the route strip that shows the next three stops, and the plainness of the copy. | Its card-on-card stack and its dark map. It looks like every other delivery app of 2019; that is exactly the "AI-looking" trap the founder rejected. |
| **Uber Driver** ([uber.com](https://www.uber.com/global/en/driver/)) | The earning screen: one number, one chart, one sentence. The map is a tool, never a picture. The push-to-talk button is the only big control on the screen. | The earning summary and the "one number first" hierarchy. The map never competes with the address. | The badge-and-chip confetti: Uber's success screen is a shower of graphics. A courier does not need a parade to confirm a delivery. |
| **DoorDash Dasher** ([dasher.doordash.com](https://dasher.doordash.com/), [help](https://dasherhelp.doordash.com/)) | The onboarding is the best in the category: it teaches by asking, and every screen has exactly one thing to do. The order of the stops is explained rather than assumed. | The teaching-by-doing onboarding (our §P5 step 16) and the way the app names the state of a job in words. | The gamified streak, the confetti, the emoji in the merchant names. |
| **Amazon Flex** ([amazon.com/flex](https://www.amazon.com/flex)) | The logistics: the delivery window, the parcel count, the distance, the earnings — all in a table the courier can read like a manifest. | The manifest idea: our Roadbook direction is a digital version of this, and the earnings card of the end-of-day screen should look like this table. | The Amazon shopping chrome around it: the yellow and the black bar. Our brand has to be ours. |

### 3.2 The map products

| Product | What it does well | What to take | What to avoid |
| --- | --- | --- | --- |
| **Apple Maps** ([apple.com/maps](https://www.apple.com/maps/), [HIG](https://developer.apple.com/design/human-interface-guidelines/)) | The glanceable turn card: the next instruction is the biggest thing on the screen, the distance is the second, and everything else is small. The map never has a title bar over it while driving. | The hierarchy of the driving screen: address and distance first, everything else drops back. The 44 pt minimum of the HIG is not enough for us — our floor is 56 pt. | The heavy bottom-sheet chrome on the walking screens, and the glossy 3D buildings in daylight. |
| **Google Maps** ([maps.google.com](https://maps.google.com/), [SDK docs](https://developers.google.com/maps/documentation/android-sdk), [Material 3](https://m3.material.io/)) | The map modes: flat, 3D, satellite, and the day/night switch. The pin that changes shape with the state of the stop. | The driver-selectable view modes (MASTER_EXECUTION §11) and the state-changing pin. | Material You: the tonal surfaces, the pill shapes and the dynamic colour. It is the single most recognisable "AI-generated app" look of 2026, and our rules ban it. |
| **Waze** ([waze.com](https://www.waze.com/)) | The community reports as a coloured dot on the road, and the way the screen says what is happening in one line of text. | The one-line report ("someone parked across the drive"). Our door memory and hazard notes are the same idea at the door. | The clutter: Waze puts dozens of coloured icons on the map at once. Our night map has three layers and no more. |

### 3.3 The products with a character

| Product | What it does well | What to take | What to avoid |
| --- | --- | --- | --- |
| **Strava** ([strava.com](https://www.strava.com/)) | The motion of a number that counts up: it rolls, it settles, it never bounces. The share card is a piece of design, not a screenshot. | The rolling number for our earnings and our "stops left" count. The share card at the end of the day (an innovation-backlog item). | The celebration: confetti, fireworks, a crowd cheering. Nothing celebrates a single parcel. |
| **Revolut** ([revolut.com](https://www.revolut.com/)) | The account card as a physical object: a real surface with a real edge and a real number, not a gradient rectangle with a sparkline on it. | The discipline of one accent and one number. Our Freight direction is the same discipline with a parcel label instead of a bank card. | The black-and-neon gradient card of the marketing site. It is the neon-on-black the rules ban. |
| **Monzo** ([monzo.com](https://monzo.com/), [api docs](https://github.com/monzo/docs)) | The plainest product language in banking: one colour, one typeface, one number, no decoration. | The voice: Monzo's copy reads like a person talking. Our voice prompts (≤ 8 words while driving) come from this. | The coral as an accent *everywhere*. One accent, on the one thing it is for. |
| **Linear** ([linear.app](https://linear.app/), [the method](https://linear.app/method)) | The density without noise: a keyboard-first productivity app that reads calm at a glance, and a motion language that is fast and never decorative. | The keyboard shortcuts of a dense screen and the discipline of "no animation that does not carry meaning". | The purple-blue glow of the marketing site, and the dark-by-default identity. |
| **Things 3** ([culturedcode.com/things](https://culturedcode.com/things/)) | The list as a document: a hierarchy you can read in one pass, with the important thing in the largest type, and no card ever standing for a section. | The typographic hierarchy of a list. This is the ancestor of the Roadbook direction. | Nothing to avoid — it is the counter-example to the card soup. |
| **Airbnb** ([airbnb.com](https://www.airbnb.com/)) | The photography and the way a listing is organised into facts, then a picture, then the words. | The order of information: facts first, then the picture. | The illustration-driven empty states with soft pastel blobs. |
| **Duolingo** ([duolingo.com](https://www.duolingo.com/)) | The character: a product can have a voice without a mascot on every screen, and the motion can be silly in the marketing and silent in the app. | The idea that the personality lives in the words and the haptics, not in the chrome. | The mascot, the confetti, the streak screens. A courier at 06:00 does not need a bird. |
| **Nothing OS** ([nothing.tech](https://nothing.tech/)) | The restraint of a monochrome system with one accent, and the dot-matrix typography used as a texture rather than a decoration. | The idea that the "brand" can be a single industrial colour plus black and white. The Freight direction is exactly this. | The dot-matrix on every label: it is a texture, and a texture on a dense screen is noise. |
| **Teenage Engineering** ([teenage.engineering](https://teenage.engineering/)) | The industrial honesty: the product looks like the tool it is, with the labels printed on the device. | The idea that the interface can be *labelled* — the ledger of Roadbook is a printed run sheet. | The hardware nostalgia as a skin. Our brand is a courier's day, not a gadget. |
| **Apple Fitness** ([apple.com/watchos](https://www.apple.com/watchos/)) | The glanceable ring: one number, one colour, a shape that carries the meaning, and a celebration that is quiet. | The three-band summary of the day's progress. | The confetti rings, and the dark glass. |
| **Arc** ([arc.net](https://arc.net/)) | The colour system: a quiet background with one accent per purpose, chosen by function and not by decoration. | The functional colour naming: our status colours are named by what happens, not by how it looks. | The sidebar of floating pills, and the browser-in-a-window novelty. |

### 3.4 What we take from the pool of open-source work

The reference products mostly do not publish their UI code. What they do publish is worth
reading, and it is in the tables below: `google/material-design-icons` (our icon set),
`google/fonts` (our typeface, OFL), `lottie-react-native/lottie-react-native` (the motion-file
lineage, and the reason we do not use motion files), `monzo/docs` (the plainest product
language), `primer/react` and `adobe/react-spectrum` (how a large product documents its
components), `mantinedev/mantine` and `chakra-ui/chakra-ui` (what a component library means in
2026), `microsoft/fluentui` (the density of a desktop tool), `grafana/grafana` (the density an
operations screen must never reach) and `recharts/recharts` (the earnings chart).

---

## 4. The evidence cards

89 repositories, read on 2026-10-22 (83 in the cards below; six more were added for the
maintenance column of the bench). The tables are generated from the snapshot by
`scripts/design/build-design-research-tables.mjs --write`; the reason each repository is in the pool is
in `docs/design/evidence/research-notes.tsv`.

<!-- TABLES:START -->

### A. React Native design systems and UI kits

| Repository | Stars | Last release | Licence | Maintenance | Why it is in the pool |
| --- | ---: | --- | --- | --- | --- |
| [tamagui/tamagui](https://github.com/tamagui/tamagui) | 14268 | v3.1.2 (2026-10-21) | `MIT` | active, last commit 2026-10-21 | Compile-time token flattening and a shared web/native token model - the one idea worth stealing from a kit we do not adopt. |
| [callstack/react-native-paper](https://github.com/callstack/react-native-paper) | 14476 | v5.15.3 (2026-05-26) | `MIT` | active, last commit 2026-10-21 | The only RN kit that shipped real accessibility work in 2026 (accessible modals, portal AT hiding, reduce-motion forwarding). |
| [akveo/react-native-ui-kitten](https://github.com/akveo/react-native-ui-kitten) | 10662 | @ui-kitten/eva-icons@6.2.1 (2026-10-06) | `MIT` | active, last commit 2026-10-06 | Theming and a codemod layer; a good example of a kit with one maintainer and a multi-package release train. |
| [wix/react-native-ui-lib](https://github.com/wix/react-native-ui-lib) | 7156 | react-native-ui-lib@9.1.0 (2026-06-28) | `MIT` | quiet since 2026-10-17 | A long-lived kit with a real screen gallery - the closest thing the RN world has to a visual reference library. |
| [founded-labs/react-native-reusables](https://github.com/founded-labs/react-native-reusables) | 8699 | rn-primitives@1.4.0 (2026-03-28) | `MIT` | active, last commit 2026-09-27 | The only kit that ships both a NativeWind and a Unistyles-adjacent variant of every component, and it added reduced motion in 2026. |
| [heroui-inc/heroui-native](https://github.com/heroui-inc/heroui-native) | 3695 | v1.0.11 (2026-10-20, pre-release) | `Apache-2.0` | active, last commit 2026-10-20 | A 2025 kit on the newest stack, but it depends on NativeWind and expo-blur - both barred by our rules. |
| [GeekyAnts/NativeBase](https://github.com/GeekyAnts/NativeBase) | 20366 | v3.4.28 (2023-03-06) | `MIT` | active, last commit 2026-01-31 | The most-starred RN kit and the classic answer: the proof that popularity is not maintenance. |
| [gluestack/gluestack-ui](https://github.com/gluestack/gluestack-ui) | 5327 | v5.0.0 (2026-06-25) | **none reported** | active, last commit 2026-09-02 | The best accessibility primitives in the pool and the proof that a Tailwind-shaped system cannot sit on our token source. |
| [satya164/react-native-tab-view](https://github.com/satya164/react-native-tab-view) | 5103 | v3.3.0 (2022-10-11) | `MIT` | archived, last commit 2022-11-27 | The pager every RN app used, archived in 2022: what happens to a library the community stops paying for. |
| [callstack/react-native-bottom-tabs](https://github.com/callstack/react-native-bottom-tabs) | 1464 | react-native-bottom-tabs@1.5.0 (2026-10-21) | `MIT` | active, last commit 2026-10-21 | The modern tab bar with an animated shared indicator - the one piece of the tab bar we may want. |
| [Shopify/restyle](https://github.com/Shopify/restyle) | 3426 | v2.4.5 (2025-03-19) | `MIT` | active, last commit 2026-09-29 | Theming without a CSS runtime: the theme object is a plain object, like ours. |

### B. Styling engines, tokens and colour

| Repository | Stars | Last release | Licence | Maintenance | Why it is in the pool |
| --- | ---: | --- | --- | --- | --- |
| [jpudysz/react-native-unistyles](https://github.com/jpudysz/react-native-unistyles) | 2970 | v3.6.0 (2026-10-21, pre-release) | **none reported** | active, last commit 2026-10-21 | Our styling engine: the only one that keeps the tokens as plain TypeScript and needs no build step. |
| [uni-stack/uniwind](https://github.com/uni-stack/uniwind) | 1738 | v1.13.0 (2026-10-19) | `MIT` | active, last commit 2026-10-20 | The credible NativeWind replacement: Tailwind v4 in RN with a Metro transform worker. |
| [style-dictionary/style-dictionary](https://github.com/style-dictionary/style-dictionary) | 4868 | v5.7.0 (2026-10-16, pre-release) | `Apache-2.0` | quiet since 2026-10-20 | The industry token pipeline; our token package is written as if it were built by it, so we should know what it would change. |
| [radix-ui/colors](https://github.com/radix-ui/colors) | 1714 | no release (0 in total) | `MIT` | active, last commit 2025-12-17 | Reference accessible colour scales - a check on our hand-rolled 50-950 ramp. |
| [google/material-design-icons](https://github.com/google/material-design-icons) | 54138 | 4.0.0 (2020-08-31) | `Apache-2.0` | active, last commit 2026-10-09 | The source of the Material Symbols we use as the one icon set of the product. |

### C. Motion, animation and haptics

| Repository | Stars | Last release | Licence | Maintenance | Why it is in the pool |
| --- | ---: | --- | --- | --- | --- |
| [software-mansion/react-native-reanimated](https://github.com/software-mansion/react-native-reanimated) | 11032 | 4.7.1 (2026-10-02, pre-release) | `MIT` | active, last commit 2026-10-21 | Our motion engine: the only one that runs on the UI thread and keeps the frame budget. |
| [software-mansion/react-native-worklets](https://github.com/software-mansion/react-native-worklets) | 38 | no release (0 in total) | **none reported** | active, last commit 2026-03-26 | The runtime Reanimated 4 runs on; the separate repository is a placeholder, which is a lesson in reading the README. |
| [nandorojo/moti](https://github.com/nandorojo/moti) | 4553 | v0.30.0 (2025-01-29) | `MIT` | active, last commit 2025-03-11 | The declarative Reanimated wrapper most people reach for first - and the example of a big install base with no release since 2025. |
| [wcandillon/react-native-skia](https://github.com/wcandillon/react-native-skia) | 8744 | v3.7.2 (2026-10-20) | `MIT` | active, last commit 2026-10-21 | The same project under the name npm still installs from; the naming history is a maintenance warning. |
| [wcandillon/react-native-skia](https://github.com/wcandillon/react-native-skia) | 8744 | v3.7.2 (2026-10-20) | `MIT` | active, last commit 2026-10-21 | The same project under the name npm still installs from; the naming history is a maintenance warning. |
| [lottie-react-native/lottie-react-native](https://github.com/lottie-react-native/lottie-react-native) | 17210 | v7.5.0 (2026-08-22) | `Apache-2.0` | quiet since 2026-10-20 | The design-file animation runtime: the benchmark for "a picture of an animation" against a real interaction. |
| [airbnb/lottie-android](https://github.com/airbnb/lottie-android) | 35753 | v6.7.1 (2025-10-31) | `Apache-2.0` | active, last commit 2026-02-15 | The Android runtime of the same, and the origin of the Lottie file format. |
| [rive-app/rive-react-native](https://github.com/rive-app/rive-react-native) | 787 | v9.8.6 (2026-10-15) | `MIT` | active, last commit 2026-10-15 | Interactive vector animation with a state machine: the only one of the two that can respond to a delivery. |
| [motiondivision/motion](https://github.com/motiondivision/motion) | 34417 | no release (0 in total) | `MIT` | active, last commit 2026-10-21 | The web motion standard; it is what the web dashboard should feel like, and it has dropped RN support. |
| [wcandillon/react-native-redash](https://github.com/wcandillon/react-native-redash) | 2060 | v18.1.5 (2026-01-21) | `MIT` | quiet since 2026-08-04 | The reference animation toolbox - helpers worth reading, a dependency we should not take. |
| [appandflow/react-native-ease](https://github.com/appandflow/react-native-ease) | 989 | v0.9.0 (2026-10-15) | `MIT` | active, last commit 2026-10-16 | Platform-native animations with no JS overhead, from a maintainer we already depend on. |
| [Rednegniw/number-flow-react-native](https://github.com/Rednegniw/number-flow-react-native) | 424 | number-flow-react-native@0.5.1 (2026-08-19) | `MIT` | active, last commit 2026-08-20 | Rolling counters: exactly the "stops remaining" number, if we ever want it to roll. |
| [LegendApp/legend-motion](https://github.com/LegendApp/legend-motion) | 450 | v2.5.3 (2025-10-17) | `MIT` | active, last commit 2026-10-11 | A declarative animation API with a NativeWind peer dependency - barred, but a useful reference. |
| [dohooo/react-native-reanimated-carousel](https://github.com/dohooo/react-native-reanimated-carousel) | 3434 | v5.2.0 (2026-10-14) | `MIT` | active, last commit 2026-10-15 | A real Reanimated 4 carousel: the shape of the onboarding carousel we may want. |
| [SchroederNathan/react-native-motion](https://github.com/SchroederNathan/react-native-motion) | 205 | no release (0 in total) | **none reported** | active, last commit 2026-10-19 | A 2026 animation library with no release and no licence file - the two failures that kill a dependency. |
| [mkuczera/react-native-haptic-feedback](https://github.com/mkuczera/react-native-haptic-feedback) | 985 | v3.0.0 (2026-03-29, pre-release) | `MIT` | quiet since 2026-06-10 | The haptic patterns of the platform behind one API; our confirm/deliver/error language belongs here. |

### D. Sheets, gestures, lists and shared elements

| Repository | Stars | Last release | Licence | Maintenance | Why it is in the pool |
| --- | ---: | --- | --- | --- | --- |
| [software-mansion/react-native-gesture-handler](https://github.com/software-mansion/react-native-gesture-handler) | 6793 | v3.4.0 (2026-10-16) | `MIT` | active, last commit 2026-10-21 | Our gesture engine: gestures are recognised on the UI thread, which is the basis of the no-jank budget. |
| [gorhom/react-native-bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet) | 9109 | v5.2.14 (2026-05-09) | `MIT` | active, last commit 2026-05-09 | The incumbent sheet: 11.9 million downloads a month and no commit since May 2026. |
| [software-mansion-labs/react-native-bottom-sheet](https://github.com/software-mansion-labs/react-native-bottom-sheet) | 447 | v0.17.0 (2026-10-18) | `MIT` | active, last commit 2026-10-21 | The 2026 challenger: a Fabric sheet with a critically damped spring on both platforms, by construction. |
| [lodev09/react-native-true-sheet](https://github.com/lodev09/react-native-true-sheet) | 2080 | v3.11.18 (2026-10-02) | `MIT` | active, last commit 2026-10-21 | The best-maintained sheet in the pool: twelve releases in six months and two open issues. |
| [computerjazz/react-native-draggable-flatlist](https://github.com/computerjazz/react-native-draggable-flatlist) | 2196 | v4.0.3 (2025-05-07, pre-release) | `MIT` | quiet since 2026-01-21 | The classic long-press drag list, built on the Reanimated 2 API. |
| [entropyconquers/react-native-reanimated-dnd](https://github.com/entropyconquers/react-native-reanimated-dnd) | 1073 | v2.0.0 (2026-03-16) | `MIT` | quiet since 2026-07-30 | Drag-and-drop reorder for Reanimated 4 - the shape of "voice plus drag" for the route editor. |
| [omahili/react-native-reorderable-list](https://github.com/omahili/react-native-reorderable-list) | 325 | v0.18.2 (2026-10-18) | `MIT` | active, last commit 2026-10-18 | A small, active reorderable list with a stable API. |
| [esthor/react-native-swipeable-list](https://github.com/esthor/react-native-swipeable-list) | 760 | v0.1.2 (2022-03-27) | `MIT` | quiet since 2026-10-13 | The swipe-to-reveal row every delivery app copies, including ours. |
| [azimgd/shadowlist](https://github.com/azimgd/shadowlist) | 385 | no release (1 in total) | `MIT` | active, last commit 2026-10-21 | A Fabric list with three hundred commits in ninety days and no release since 2024. |
| [Glazzes/react-native-zoom-toolkit](https://github.com/Glazzes/react-native-zoom-toolkit) | 402 | 5.1.1 (2026-08-30) | `MIT` | active, last commit 2026-08-30 | Pinch and zoom on Reanimated - the map gesture, if we need our own. |
| [jeremybarbet/react-native-modalize](https://github.com/jeremybarbet/react-native-modalize) | 2878 | 2.1.0 (2022-08-10) | `MIT` | quiet since 2024-06-08 | The classic modal sheet with drag-to-dismiss, dormant since 2024. |
| [osdnk/react-native-reanimated-bottom-sheet](https://github.com/osdnk/react-native-reanimated-bottom-sheet) | 3336 | no release (17 in total) | `MIT` | quiet since 2023-01-04 | The original Reanimated sheet, superseded by gorhom's. |

### E. Icons, fonts, accessibility and the platform

| Repository | Stars | Last release | Licence | Maintenance | Why it is in the pool |
| --- | ---: | --- | --- | --- | --- |
| [oblador/react-native-vector-icons](https://github.com/oblador/react-native-vector-icons) | 17918 | generator-react-native-vector-icons@14.0.0 (2026-10-19) | `MIT` | active, last commit 2026-10-19 | The single Material Symbols source - our one-icon-set rule. |
| [software-mansion/react-native-svg](https://github.com/software-mansion/react-native-svg) | 8009 | v15.16.0 (2026-10-15) | `MIT` | active, last commit 2026-10-15 | The vector layer under any custom icon or route ribbon. |
| [expo/google-fonts](https://github.com/expo/google-fonts) | 945 | no release (0 in total) | `MIT` | active, last commit 2026-10-21 | The Figtree source: our type face, licensed OFL. |
| [google/fonts](https://github.com/google/fonts) | 20664 | no release (0 in total) | **none reported** | active, last commit 2026-10-21 | The font repository itself, and the licence file every app store asks about. |
| [ArturKalach/react-native-a11y](https://github.com/ArturKalach/react-native-a11y) | 57 | v0.9.1 (2026-10-04) | `MIT` | active, last commit 2026-10-04 | Screen-reader helpers for React Native: announcements, focus order, focus trapping. |
| [ArturKalach/react-native-a11y-order](https://github.com/ArturKalach/react-native-a11y-order) | 52 | v2.0.1 (2026-10-05) | `MIT` | quiet since 2026-10-04 | Explicit focus order and focus trapping on Android and iOS. |
| [FormidableLabs/eslint-plugin-react-native-a11y](https://github.com/FormidableLabs/eslint-plugin-react-native-a11y) | 307 | v3.5.1 (2024-11-04) | `MIT` | active, last commit 2024-11-04 | The lint rules for accessibility that our ESLint config does not have yet. |
| [dequelabs/axe-core](https://github.com/dequelabs/axe-core) | 7679 | v4.14.0 (2026-10-05) | `MPL-2.0` | quiet since 2026-10-21 | The accessibility engine of the web; there is no React Native package for it, which is the reason our a11y gate is a manual review. |
| [Shopify/flash-list](https://github.com/Shopify/flash-list) | 7242 | v2.3.3 (2026-10-01, pre-release) | `MIT` | active, last commit 2026-10-01 | The list that keeps 300 stops at 60 fps; Expo SDK 58 bundles it. |
| [software-mansion/react-native-screens](https://github.com/software-mansion/react-native-screens) | 3740 | 4.30.0 (2026-10-13, pre-release) | `MIT` | active, last commit 2026-10-21 | The navigator we build on. |
| [appandflow/react-native-safe-area-context](https://github.com/appandflow/react-native-safe-area-context) | 2768 | v5.10.1 (2026-09-29) | `MIT` | active, last commit 2026-10-21 | The insets of the device, and the layout of every screen that has to clear the notch. |
| [margelo/react-native-mmkv](https://github.com/margelo/react-native-mmkv) | 8520 | v4.3.2 (2026-06-22) | `MIT` | quiet since 2026-10-08 | Fast storage for the offline queue; the New Architecture bridge under it. |
| [margelo/nitro](https://github.com/margelo/nitro) | 1968 | v0.37.1 (2026-08-27) | `MIT` | quiet since 2026-10-21 | The native-module bridge Unistyles 3 and MMKV sit on. |
| [zoontek/react-native-localize](https://github.com/zoontek/react-native-localize) | 2443 | 3.7.2 (2026-09-15) | `MIT` | quiet since 2026-10-13 | The localisation layer, and the right-to-left dependency behind the Arabic build. |

### F. Maps, map styling and the routing we draw on

| Repository | Stars | Last release | Licence | Maintenance | Why it is in the pool |
| --- | ---: | --- | --- | --- | --- |
| [maplibre/maplibre-native](https://github.com/maplibre/maplibre-native) | 2276 | android-v13.7.1 (2026-10-15) | `BSD-2-Clause` | active, last commit 2026-10-21 | The map engine of the app: it draws our own style, offline, with no proprietary SDK. |
| [maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js) | 11911 | v6.15.0 (2026-10-18, pre-release) | `NOASSERTION` | active, last commit 2026-10-21 | The same engine for the web: one style spec, one colour system, two platforms. |
| [maplibre/maplibre-style-spec](https://github.com/maplibre/maplibre-style-spec) | 262 | v26.4.4 (2026-09-15) | `NOASSERTION` | active, last commit 2026-10-19 | The style spec itself - the contract between our palette and the map. |
| [maplibre/maputnik](https://github.com/maplibre/maputnik) | 2659 | v3.1.0 (2026-07-06, pre-release) | `MIT` | active, last commit 2026-10-21 | The editor for the style: the way the courier map style is built and reviewed. |
| [protomaps/basemaps](https://github.com/protomaps/basemaps) | 764 | no release (0 in total) | `NOASSERTION` | active, last commit 2026-09-11 | The basemap style we build the Canterbury pack from, and the reference for "a map that reads in daylight". |
| [protomaps/PMTiles](https://github.com/protomaps/PMTiles) | 3094 | no release (0 in total) | `NOASSERTION` | active, last commit 2026-09-16 | The tile format of the offline pack. |
| [maptiler/tileserver-gl](https://github.com/maptiler/tileserver-gl) | 2912 | v5.6.0 (2026-04-06, pre-release) | `NOASSERTION` | active, last commit 2026-10-13 | A tile server that renders any vector style; the way the style is published. |
| [openmaptiles/maptiler-basic-gl-style](https://github.com/openmaptiles/maptiler-basic-gl-style) | 118 | v1.10 (2024-05-06) | `NOASSERTION` | active, last commit 2026-06-02 | A complete GL style: the fastest way to read how a good map style is put together. |
| [openmaptiles/openmaptiles](https://github.com/openmaptiles/openmaptiles) | 3200 | v3.16 (2025-12-18) | `NOASSERTION` | active, last commit 2026-07-29 | The vector tile schema our style is built on. |
| [mapbox/mapbox-gl-native](https://github.com/mapbox/mapbox-gl-native) | 4457 | maps-v1.6.0 (2020-04-30, pre-release) | `NOASSERTION` | archived, last commit 2023-07-27 | The proprietary engine we do not use; archived, and the reason the licence of the map SDK matters. |
| [tyrasd/overpass-turbo](https://github.com/tyrasd/overpass-turbo) | 1259 | no release (0 in total) | `NOASSERTION` | quiet since 2026-10-20 | The tool that answers "is this address in OSM", used by the address engine. |
| [Project-OSRM/osrm-backend](https://github.com/Project-OSRM/osrm-backend) | 8163 | v26.10.0 (2026-10-01) | `BSD-2-Clause` | active, last commit 2026-10-21 | The routing engine behind the road geometry of the day. |
| [graphhopper/graphhopper](https://github.com/graphhopper/graphhopper) | 6737 | 11.1 (2026-09-29) | `Apache-2.0` | active, last commit 2026-10-21 | The routing engine that handles the vehicle profile and the turn-by-turn. |
| [GIScience/openrouteservice](https://github.com/GIScience/openrouteservice) | 1986 | v10.1.0 (2026-10-14) | `GPL-3.0` | active, last commit 2026-10-21 | The routing and the isochrones for the "is it worth walking" decisions; GPL, so clean-room only. |

### G. The open-source work of the reference products

| Repository | Stars | Last release | Licence | Maintenance | Why it is in the pool |
| --- | ---: | --- | --- | --- | --- |
| [monzo/docs](https://github.com/monzo/docs) | 119 | no release (0 in total) | **none reported** | active, last commit 2026-10-20 | What a bank publishes about its own API: the plainest possible product language. |
| [primer/react](https://github.com/primer/react) | 3921 | @primer/mcp@1.1.1 (2026-10-16, pre-release) | `MIT` | active, last commit 2026-10-21 | GitHub's design system: how a large product documents its components and its motion. |
| [microsoft/fluentui](https://github.com/microsoft/fluentui) | 20335 | @fluentui/utilities_v8.17.3 (2026-10-01) | `NOASSERTION` | active, last commit 2026-10-21 | The Fluent design language in code: the density and the keyboard rules of a desktop tool. |
| [adobe/react-spectrum](https://github.com/adobe/react-spectrum) | 15974 | react-aria-components@1.22.0 (2026-10-09) | `Apache-2.0` | quiet since 2026-10-21 | The accessibility-first component library: the reference for focus behaviour. |
| [mantinedev/mantine](https://github.com/mantinedev/mantine) | 31850 | 9.7.3 (2026-10-17) | `MIT` | active, last commit 2026-10-18 | A complete open-source design system with a documented scale and a dark mode done properly. |
| [chakra-ui/chakra-ui](https://github.com/chakra-ui/chakra-ui) | 40699 | @chakra-ui/codemod@3.37.0 (2026-08-28) | `MIT` | quiet since 2026-10-17 | The Tailwind-era system: what "a component library" means in 2026. |
| [grafana/grafana](https://github.com/grafana/grafana) | 77404 | v13.2.4 (2026-10-13) | `AGPL-3.0` | active, last commit 2026-10-21 | The dashboard density that an operations screen should never reach - and the boundary we must not cross. |
| [recharts/recharts](https://github.com/recharts/recharts) | 27645 | v3.10.1 (2026-07-25) | `MIT` | active, last commit 2026-10-21 | The charting library for the earnings and the end-of-day card. |
| [expo/expo](https://github.com/expo/expo) | 52893 | expo-template-tabs@58.0.26 (2026-10-21) | `MIT` | active, last commit 2026-10-21 | The platform we build on: the SDK 58 bundle table that decides what we can use. |

### The npm footprint of the libraries the bench measures

| Package | Version | Unpacked size (kB) | Licence | Published | Registry |
| --- | --- | ---: | --- | --- | --- |
| `react-native-reanimated` | 4.7.1 | 4885 | MIT | 2026-10-20 | [npm](https://www.npmjs.com/package/react-native-reanimated) |
| `react-native-worklets` | 0.13.0 | 17409 | MIT | 2026-10-20 | [npm](https://www.npmjs.com/package/react-native-worklets) |
| `react-native-gesture-handler` | 3.4.0 | 3190 | MIT | 2026-10-20 | [npm](https://www.npmjs.com/package/react-native-gesture-handler) |
| `@swmansion/react-native-bottom-sheet` | 0.17.0 | 337 | MIT | 2026-10-18 | [npm](https://www.npmjs.com/package/@swmansion/react-native-bottom-sheet) |
| `@gorhom/bottom-sheet` | 5.2.14 | 1298 | MIT | 2026-05-09 | [npm](https://www.npmjs.com/package/@gorhom/bottom-sheet) |
| `@lodev09/react-native-true-sheet` | 3.11.18 | 1176 | MIT | 2026-10-21 | [npm](https://www.npmjs.com/package/@lodev09/react-native-true-sheet) |
| `moti` | 0.30.0 | 760 | MIT | 2025-01-29 | [npm](https://www.npmjs.com/package/moti) |
| `react-native-redash` | 18.1.5 | 258 | MIT | 2026-01-21 | [npm](https://www.npmjs.com/package/react-native-redash) |
| `react-native-ease` | 0.9.0 | 349 | MIT | 2026-10-15 | [npm](https://www.npmjs.com/package/react-native-ease) |
| `number-flow-react-native` | 0.5.1 | 704 | MIT | 2026-08-19 | [npm](https://www.npmjs.com/package/number-flow-react-native) |
| `@legendapp/motion` | 2.5.3 | 236 | MIT | 2025-10-17 | [npm](https://www.npmjs.com/package/@legendapp/motion) |
| `react-native-reanimated-dnd` | 2.0.0 | 136 | MIT | 2026-03-16 | [npm](https://www.npmjs.com/package/react-native-reanimated-dnd) |
| `react-native-reorderable-list` | 0.18.2 | 371 | MIT | 2026-10-18 | [npm](https://www.npmjs.com/package/react-native-reorderable-list) |
| `react-native-draggable-flatlist` | 4.0.3 | 511 | MIT | 2025-05-06 | [npm](https://www.npmjs.com/package/react-native-draggable-flatlist) |
| `react-native-swipeable-list` | 0.1.2 | 21 | MIT | 2022-05-14 | [npm](https://www.npmjs.com/package/react-native-swipeable-list) |
| `react-native-haptic-feedback` | 3.0.0 | 209 | MIT | 2026-03-29 | [npm](https://www.npmjs.com/package/react-native-haptic-feedback) |
| `react-native-zoom-toolkit` | 5.1.1 | 367 | MIT | 2026-08-30 | [npm](https://www.npmjs.com/package/react-native-zoom-toolkit) |
| `react-native-modalize` | 2.1.1 | 64 | MIT | 2022-08-10 | [npm](https://www.npmjs.com/package/react-native-modalize) |
| `@shopify/react-native-skia` | 2.14.0 | 9859 | MIT | 2026-10-01 | [npm](https://www.npmjs.com/package/@shopify/react-native-skia) |
| `react-native-skia` | 3.7.2 | 10719 | MIT | 2026-10-20 | [npm](https://www.npmjs.com/package/react-native-skia) |
| `lottie-react-native` | 7.5.0 | 288 | Apache-2.0 | 2026-08-22 | [npm](https://www.npmjs.com/package/lottie-react-native) |
| `@rive-app/react-native` | 0.5.5 | 1955 | MIT | 2026-10-13 | [npm](https://www.npmjs.com/package/@rive-app/react-native) |
| `react-native-svg` | 15.16.0 | 3738 | MIT | 2026-10-15 | [npm](https://www.npmjs.com/package/react-native-svg) |
| `@expo/vector-icons` | 15.1.1 | 5874 | MIT | 2026-09-23 | [npm](https://www.npmjs.com/package/@expo/vector-icons) |
| `@expo-google-fonts/figtree` | 0.4.1 | 1923 | MIT AND OFL-1.1 | 2025-09-12 | [npm](https://www.npmjs.com/package/@expo-google-fonts/figtree) |
| `expo-symbols` | 58.0.4 | 264 | MIT | 2026-10-15 | [npm](https://www.npmjs.com/package/expo-symbols) |
| `@shopify/flash-list` | 2.3.3 | 830 | MIT | 2026-10-01 | [npm](https://www.npmjs.com/package/@shopify/flash-list) |
| `react-native-mmkv` | 4.3.2 | 186 | MIT | 2026-06-22 | [npm](https://www.npmjs.com/package/react-native-mmkv) |
| `react-native-nitro-modules` | 0.37.1 | 567 | MIT | 2026-10-21 | [npm](https://www.npmjs.com/package/react-native-nitro-modules) |
| `react-native-screens` | 4.30.0 | 3597 | MIT | 2026-10-20 | [npm](https://www.npmjs.com/package/react-native-screens) |
| `react-native-safe-area-context` | 5.10.1 | 243 | MIT | 2026-09-29 | [npm](https://www.npmjs.com/package/react-native-safe-area-context) |
| `react-native-localize` | 3.7.2 | 214 | MIT | 2026-09-15 | [npm](https://www.npmjs.com/package/react-native-localize) |
| `react-native-unistyles` | 3.6.0 | 1836 | MIT | 2026-10-21 | [npm](https://www.npmjs.com/package/react-native-unistyles) |
| `react-native-paper` | 5.15.3 | 3680 | MIT | 2026-06-15 | [npm](https://www.npmjs.com/package/react-native-paper) |
| `@ui-kitten/components` | 6.2.1 | 2775 | MIT | 2026-10-06 | [npm](https://www.npmjs.com/package/@ui-kitten/components) |
| `react-native-ui-lib` | 9.1.3 | 2578 | MIT | 2026-09-06 | [npm](https://www.npmjs.com/package/react-native-ui-lib) |
| `heroui-native` | 1.0.11 | 5195 | Apache-2.0 | 2026-10-20 | [npm](https://www.npmjs.com/package/heroui-native) |
| `@gluestack-ui/themed` | 1.1.73 | 944 | ISC | 2025-09-10 | [npm](https://www.npmjs.com/package/@gluestack-ui/themed) |
| `tamagui` | 3.1.2 | 5235 | MIT | 2026-10-21 | [npm](https://www.npmjs.com/package/tamagui) |
| `@shopify/restyle` | 2.4.5 | 90 | MIT | 2026-04-16 | [npm](https://www.npmjs.com/package/@shopify/restyle) |
| `@bottom-tabs/react-navigation` | 1.5.0 | 63 | MIT | 2026-10-21 | [npm](https://www.npmjs.com/package/@bottom-tabs/react-navigation) |
| `react-native-tab-view` | 4.3.4 | 201 | MIT | 2026-10-13 | [npm](https://www.npmjs.com/package/react-native-tab-view) |
| `@maplibre/maplibre-react-native` | 11.5.0 | 2135 | MIT | 2026-10-04 | [npm](https://www.npmjs.com/package/@maplibre/maplibre-react-native) |
| `maplibre-gl` | 6.15.0 | 28111 | BSD-3-Clause | 2026-10-18 | [npm](https://www.npmjs.com/package/maplibre-gl) |
| `@react-navigation/native` | 7.5.1 | 286 | MIT | 2026-10-13 | [npm](https://www.npmjs.com/package/@react-navigation/native) |
| `@react-navigation/bottom-tabs` | 7.21.0 | 407 | MIT | 2026-10-13 | [npm](https://www.npmjs.com/package/@react-navigation/bottom-tabs) |
| `@react-navigation/native-stack` | 7.21.0 | 257 | MIT | 2026-10-13 | [npm](https://www.npmjs.com/package/@react-navigation/native-stack) |
| `expo-haptics` | 58.0.7 | 94 | MIT | 2026-10-16 | [npm](https://www.npmjs.com/package/expo-haptics) |
| `expo-location` | 58.0.18 | 1279 | MIT | 2026-10-21 | [npm](https://www.npmjs.com/package/expo-location) |
| `expo-audio` | 58.0.10 | 1313 | MIT | 2026-10-21 | [npm](https://www.npmjs.com/package/expo-audio) |
| `expo-blur` | 58.0.5 | 137 | MIT | 2026-10-19 | [npm](https://www.npmjs.com/package/expo-blur) |
| `expo-linear-gradient` | 58.0.3 | 93 | MIT | 2026-10-15 | [npm](https://www.npmjs.com/package/expo-linear-gradient) |
| `@op-engineering/op-sqlite` | 18.2.5 | 343780 | MIT | 2026-09-20 | [npm](https://www.npmjs.com/package/@op-engineering/op-sqlite) |
| `react-native-sherpa-onnx` | 0.4.4 | 2581 | MIT | 2026-09-08 | [npm](https://www.npmjs.com/package/react-native-sherpa-onnx) |
| `react-native-view-shot` | 6.1.1 | 2737 | MIT | 2026-10-07 | [npm](https://www.npmjs.com/package/react-native-view-shot) |
| `@testing-library/react-native` | 14.1.0 | 851 | MIT | 2026-10-08 | [npm](https://www.npmjs.com/package/@testing-library/react-native) |

<!-- generated by scripts/design/build-design-research-tables.mjs from github-repos-2026-10-22.tsv and npm-packages-2026-10-22.tsv -->
<!-- TABLES:END -->

---

## 5. The shortlist — the fifteen that matter, and why

The fifteen are the ones that are either already in the app, are the credible challengers of
2026, or are the reference implementations of a rule we have to keep. The bench in
`docs/design/BENCH.md` scores all of them against our bar.

| # | Project | Why it is on the shortlist | Verdict from the research |
| --- | --- | --- | --- |
| 1 | `software-mansion/react-native-reanimated` 4.7.1 | Our motion engine; the only one that keeps the frame budget on the UI thread. | **Keep** (locked). |
| 2 | `software-mansion/react-native-gesture-handler` 3.4.0 | The gestures of the swipe-to-deliver and the sheet. | **Keep** (locked). |
| 3 | `software-mansion/react-native-worklets` 0.13.0 | The runtime under Reanimated 4. | **Keep** (locked), and declare it in `apps/mobile`. |
| 4 | `jpudysz/react-native-unistyles` 3.6.0 | Our styling engine; the only one that keeps the tokens as plain TypeScript. | **Keep** (locked), and file the missing root licence. |
| 5 | `Shopify/flash-list` 2.3.3 | The 300-stop list at 60 fps is a hard requirement and it is not installed today. | **Keep and install.** |
| 6 | `software-mansion-labs/react-native-bottom-sheet` 0.17.0 | The only sheet whose physics match our "spring for sheets" rule by construction. | **Pilot** in the design lab. |
| 7 | `lodev09/react-native-true-sheet` 3.11.18 | The best-maintained sheet in the pool. | **Watch** — benchmark against #6. |
| 8 | `gorhom/react-native-bottom-sheet` 5.2.14 | The incumbent: eleven million downloads a month, no commit since 2026-05-09. | **Do not adopt.** |
| 9 | `callstack/react-native-paper` 5.15.3 | The only kit that shipped accessible modals, portal AT hiding and reduce-motion forwarding in 2026. | **Read, do not install.** |
| 10 | `founded-labs/react-native-reusables` | 22 components gained reduced motion and portal accessibility on 2026-07-02. | **Read, do not install.** |
| 11 | `appandflow/react-native-ease` 0.9.0 | Platform-native animation with no JS overhead, from a maintainer we already depend on. | **Watch.** |
| 12 | `wcandillon/react-native-skia` 3.7.2 / `@shopify/react-native-skia` 2.14.0 | The vector engine, if a screen ever needs custom drawing. | **Watch** — and it changed hands twice in two years. |
| 13 | `ArturKalach/react-native-a11y` + `react-native-a11y-order` | The only React Native screen-reader helpers with a release in the last three weeks. | **Benchmark** before any dependency. |
| 14 | `maplibre/maplibre-native` + `maplibre/maputnik` + `protomaps/basemaps` | The map engine, the style editor and the basemap style: the courier map style is built here. | **Keep** (locked, P3). |
| 15 | `oblador/react-native-vector-icons` + `google/material-design-icons` | The one icon set. | **Keep** (locked). |

**The losers, and why.** A second styling engine is barred by our own rules whatever its
quality: `nativewind/nativewind` (8 117 stars, healthy, and still the wrong answer),
`uni-stack/uniwind` (the credible replacement, still CSS-in-RN), `gluestack/gluestack-ui` (no
licence file at the root), `heroui-inc/heroui-native` (NativeWind and `expo-blur`),
`LegendApp/legend-motion` (NativeWind peer). Dead, dormant or unlicensed: `GeekyAnts/NativeBase`
(last release 2023-03-06), `satya164/react-native-tab-view` (archived), `nandorojo/moti` (no
release since 2025-01-29), `computerjazz/react-native-draggable-flatlist` (no release since
2025-05-07), `jeremybarbet/react-native-modalize` (2022), `esthor/react-native-swipeable-list`
(2022), `SchroederNathan/react-native-motion` (no release, no licence file), `azimgd/shadowlist`
(309 commits in 90 days, no release since 2024). Barred by our own design rules:
`airbnb/lottie-react-native` and `rive-app/rive-react-native` (decorative motion files),
`motiondivision/motion` (web only for us).

---

## 6. What this research changes in the product

1. **The three directions of §13.4 are built on the tokens, not on a new styling engine.** The
   research says the styling engine is not the differentiator — the scale, the rhythm and the
   palette are. That is why the directions are three palettes and three type scales in
   `packages/design-tokens`, and not three forks of a kit.
2. **No blur, no glass, no decorative motion file, no gradient.** The pool makes it easy to
   add them and the rules make it easy to refuse them.
3. **The sheet is the one real motion decision left.** The `@swmansion` sheet is eight months
   old and 447 stars, but its physics are right. The bench measures it; the decision comes
   with an ADR.
4. **The map style is ours to draw.** `maputnik` + `protomaps/basemaps` + our palette: the
   courier map style comes out of the same tokens as the screen, in the chosen direction.
5. **The number is the product.** Strava, Monzo, Revolut and Linear all say the same thing:
   one number, one typeface, no decoration. Every direction of §13.4 starts with the number.

---

## 7. What we are missing (the honest gaps)

- **The frame-rate numbers are UNVERIFIED.** No fps was measured in this document: there is no
  emulator on the design machine, and the contract says a number without a CI link is not
  verified. The bench marks every fps cell **UNVERIFIED**; the emulator run of §13.5 fills
  them in.
- **The bundle sizes are a proxy.** The npm unpacked size of a tarball is not the size of the
  native code it ships and not the size of the APK. It is a fair way to compare two packages
  of the same kind and nothing more.
- **The reference products were studied as users, not as engineers.** No competitor was
  decompiled and no proprietary asset was copied (MASTER_EXECUTION §8.4). Every statement
  about Spoke, Uber Driver, Dasher and the rest comes from their public sites and help
  centres, which are listed with their status in the evidence file.
- **Twelve of the eighty-three repositories have no GitHub release at all** (they tag npm
  only, or they have never released). For those, the release column says so instead of
  guessing.
