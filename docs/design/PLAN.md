# PLAN — the Design Studio from here

**Owner:** the Design Studio director. **Read with:** `docs/design/ORG.md` (the teams),
`docs/design/SPEC.md` (the brief), `docs/design/REVIEW.md` (the QA), this file (the rhythm and
the pick).

---

## 1. Where we are

The founder rejected the three directions of October 2026 — Roadbook, Beacon and Freight — as
dated and plain. MASTER_EXECUTION §13.6 sets the new bar: ten specialist teams, ten directions,
a founder's pick, and no final screen until the pick.

The studio restarts from this position:

| Kept and used | Discarded |
|---|---|
| The token package, the contrast maths, the contrast test, the lint rule | The three directions, their themes and their routes |
| The 89-repository research pool and the 56-library bench (as the method, not the conclusion) | The three rendered HTML files under `docs/design/directions/` |
| The content inventory of the screens in `docs/design/mockups/` | The look of those mockups, in full |
| The contract in `docs/design/SYSTEM.md` | — |
| The contrast report command, the design-lab route pattern, the Maestro flows | — |

The work that does not wait for the pick: the research file of team 9, the brand board of team 1,
the flow and the ergonomics of team 2, the token work of team 8 and the library bench refresh.
The rest of the product keeps shipping in parallel; the design studio is not the only squad.

---

## 2. The ten directions, in five pairs

Ten directions produced by ten teams would look like ten variations of one idea. The pairs stop
that: each pair is two teams working from **one structural idea, pushed in two opposite
directions**. Every team leads exactly one direction (the founder's rule, MASTER_EXECUTION §13.6),
so the five pairs cover the ten directions with no team twice.

| Pair | The structural idea | The two teams that build it | The two directions must differ on |
|---|---|---|---|
| **1** | The run as a landscape: the map is the primary surface and the run is drawn on it | Team 5 (Map Design Lead) and team 3 (Interface Design Lead) | The layout grammar, the accent family, the type pairing, the motion character, the map treatment |
| **2** | The run as a machine: an instrument panel of live state, read like a gauge | Team 4 (Motion Design Lead) and team 7 (Accessibility Design Lead) | The layout grammar, the accent family, the density, the motion character, the icon treatment |
| **3** | The run as a conversation: the assistant is the interface, the screen is the transcript | Team 2 (Product Design Lead) and team 9 (Design Research Lead) | The layout grammar, the accent family, both type families, the motion character, the night rule |
| **4** | The run as a place: the parcel, the van and the door, in physical terms | Team 1 (Brand Director) and team 6 (Icon Design Lead) | The layout grammar, the accent family, the type pairing, the density, the icon treatment |
| **5** | The run as a system: quiet, systematic, almost invisible until it matters | Team 8 (Design Systems Engineer) and team 10 (Design QA Lead) | The layout grammar, the accent family, the motion character, the map treatment, the night rule |

The direction numbers are handed out in the order of the pairs: 01 and 02 to pair 1, 03 and 04 to
pair 2, and so on. The team that owns direction *n* writes its sheet and builds its four screens.

The pairing rules, all checkable:

- **ORG-5.** Inside a pair, the two directions differ on at least four of the ten fingerprint
  fields (`docs/design/SPEC.md` §10). The QA lead records the difference in the score sheet.
- **ORG-6.** Across the five pairs, no two pairs share a layout grammar. The five grammars are
  written down in `docs/design/PLAN.md` §2.1 before the first direction is built, so the five
  pairs cannot drift into each other.
- **ORG-7.** The pair review happens at 16:00 on the day of the pair (ORG-R1). Both seats sign
  the five checks of their own direction and cross-review the other's.
- **ORG-12.** The tenth direction, owned by the Design QA lead, is scored by the Design Studio
  director, acting as the second reviewer. The substitution is written in the decision log
  (ORG-2).

### 2.1 The five grammars, fixed before the work starts

| Pair | The grammar | The rule that governs it | The pattern it is forbidden to fall into |
|---|---|---|---|
| 1 | The map is the page | The interface floats over the map; the run is drawn on the map, not listed beside it | A map with a list under it |
| 2 | The instrument | The state is read as a set of live readouts with a fixed grid | A dashboard of cards with numbers in them |
| 3 | The conversation | The assistant's state is the interface; the screen is what was said and what it did | A chat transcript with bubbles |
| 4 | The place | Physical things are physical: the parcel, the van, the door, the shelf | An illustration with a UI pasted over it |
| 5 | The system | Almost nothing is visible until it matters; the interface recedes until the decision | An empty screen with a floating action |

---

## 3. The rhythm of the round

The round is ten working days. The founder's pack lands on day seven; the round closes on day
ten.

| Day | What happens |
|---|---|
| 1 | The spec is frozen (`SPEC.md` signed). The five grammars are written down. The teams read `SPEC.md` and `REVIEW.md` and claim their pair and their two direction names. |
| 2 | The research file of team 9 is published and the brand board of team 1 is circulated. The token package gains a place for the ten themes. |
| 3 | Pair 1 builds. Pair 2 builds. The 16:00 pair review runs. |
| 4 | Pair 3 builds. Pair 4 builds. The 16:00 pair review runs. |
| 5 | Pair 5 builds. The 16:00 pair review runs. Every direction has its eight PNGs. |
| 6 | The videos are recorded on the CI emulator. The frame traces and the contrast reports are produced. The packages go into the QA queue. |
| 7 | The QA lead reviews the first five packages. **The founder's pack is published**: one page per direction, the score sheet, the video link, the renders. |
| 8 | The QA lead reviews the last five. The fingerprint comparison is run over the ten; a pair that looks alike is resolved (§4). The board sheet is published. |
| 9 | The repair round: the directions with FAILs are fixed and resubmitted. The scores are final. |
| 10 | The final board sheet, the ten score sheets, the ten videos, the recommendation from the leads. **The pick waits for the founder** (an approval gate, MASTER_EXECUTION §7.3). |

The rhythm rules:

- **ORG-8.** The work does not stop while the pack is with the founder. The rest of the product
  keeps shipping, and the teams prepare the refinement of their own direction so that a pick is
  acted on the same day it is made.
- **ORG-9.** A team that is blocked posts it at 09:00 and is unblocked by the director the same
  morning. A team never waits on another team (ORG-H4).
- **ORG-10.** The founder's pack is never a wall of screenshots: ten pages, ten videos, ten
  scores, and one line per direction saying what it is.

---

## 4. The founder's pack

`docs/design/DIRECTIONS-2.md` (written by the director on day 7, updated after the reviews):

| For each direction | The content |
|---|---|
| The name | The idea in one line |
| The fingerprint | The ten fields of `SPEC.md` §10 |
| The renders | The four screens, light and night |
| The video | The link to the emulator recording |
| The score | The total and the criterion table from the QA sheet |
| The three signature moments | One line each |
| The recommendation | The board's note: what this direction is strong at, and what it would need |

The pack also carries the fingerprint comparison table over the ten, so the founder can see that
they are ten different answers and not ten drawings of one.

---

## 5. When the founder picks

The pick is recorded in `docs/design/DECISION-LOG.md`, mirrored into `docs/DECISIONS.md` as a
founder decision, and the gate in `docs/FOUNDER_TODO.md` is closed with the date. Then:

| Stage | What happens | The output | The days |
|---|---|---|---|
| 1. The refinement | The winning direction is refined against the QA sheet: the FAILs are fixed, the weak criteria are lifted, the fingerprint is locked. The other nine are archived in the log with their scores. | The refined direction sheet and the updated fingerprint | 2 |
| 2. The final screens | The whole screen inventory of MASTER_EXECUTION §13.5 is built in the winning direction: welcome, sign-in, onboarding, today, driving 2D and 3D, Copilot voice, dictation, scanner, proof of delivery, routes and templates, end of day and earnings, settings, map modes, downloads, and the team and dispatcher web. Every state, light and night, small and large phones, 200 per cent text, right to left. | The screens, their specs in `docs/design/mockups/`, and the Maestro screenshots | 10 |
| 3. The token implementation | The winning palette is promoted to the `day` theme and its night adaptation to `night`; the type scale becomes the token scale; the old direction themes are removed; the contrast test covers every pair of the new themes; the lint rule stays green. | `packages/design-tokens`, an ADR, the contrast report | 3 |
| 4. The evidence | The visual-regression baselines, the screen videos, the frame traces, the accessibility run on a device with the screen reader, the human-design sign-off per screen, and the scorecard against Spoke and the reference products. | `docs/evidence/design/`, the scorecard | 5 |
| 5. The hand-over | The design contract is rewritten in `docs/design/SYSTEM.md` for the chosen direction, and the rejected directions and the rejected mockups are moved to the archive with a note that says why. | `docs/design/SYSTEM.md`, the archive note | 1 |

**ORG-11.** If the founder asks for a blend of two directions, the blend picks **one** palette,
**one** type pairing and **one** motion character, and the fingerprint is re-declared and
re-checked by the QA lead against the rules in `REVIEW.md`. A blend that keeps both palettes is
not a direction; it is an unfinished comparison.

---

## 6. The rule: no final screen before the pick

**ORG-3.** Until the pick is recorded in `docs/design/DECISION-LOG.md`:

- No screen of the product is built in a direction. The only screens written are the four screens
  of a direction, inside the lab route `/design-2/<n>-<name>`.
- The `day` and `night` themes in `packages/design-tokens/src/themes.ts` are not changed. The ten
  direction themes are added beside them, under the same semantic roles.
- The screens under `apps/mobile/app/` and the specs in `docs/design/mockups/` are not written in
  a direction.
- The lab route is a development route and stays out of the release build (MASTER_EXECUTION §16.7).

How it is checked:

| The check | Who | When |
|---|---|---|
| A pull request that touches `packages/design-tokens/src/themes.ts` (the `day` or `night` theme) or a screen under `apps/mobile/app/` while the log has no "PICK" entry fails the gate | the Design Systems Engineer, then the QA lead | every pull request |
| The gate is a script, `scripts/check-design-gate.mjs`, written by team 8 in stage 0 of the round | team 8 | before the first direction is built |
| The release build excludes the `/design-2` route | the Platform squad | every release |
| The pack for the founder carries the fingerprint table, so a screen built early would be visible as a direction that copied another | the QA lead | day 8 |

If the founder picks before the round closes, the pick is honoured and the rest of the round
stops; the scores of the nine are recorded as they stand.

---

## 7. The work, by team

| # | The task | The seat | The output | By |
|---|---|---|---|---|
| 0 | Freeze `SPEC.md`, write the five grammars, stand up the lab route `/design-2/<n>-<name>`, write `scripts/check-design-gate.mjs` | Director, Design Systems Engineer | `SPEC.md`, `PLAN.md` §2.1, the script | Day 1 |
| 1 | The research file: 50 repositories, 30 award-level apps, the traits of 2026 | Design Research Lead | `docs/design/RESEARCH-2.md` | Day 2 |
| 2 | The brand board: the mark, the palette, the type licensing | Brand Director | `docs/design/BRAND.md` | Day 2 |
| 3 | The flow, the information architecture, the ergonomics, the state matrix | Product Design Lead | `docs/design/UX.md` | Day 2 |
| 4 | The motion language, the haptic map, the sound map, the frame budget | Motion Design Lead | `docs/design/MOTION.md` | Day 3 |
| 5 | The map style, the 3D treatment, the camera spec | Map Design Lead | `docs/design/MAP.md` | Day 3 |
| 6 | The icon set, the custom glyphs, the emoji replacements | Icon Design Lead | `docs/design/ICONS.md` | Day 4 |
| 7 | The contrast, the labels, the night rules, the glove mode | Accessibility Design Lead | `docs/design/ACCESSIBILITY.md` | Day 4 |
| 8 | The ten themes, the contrast cases, the lint rule, the design gate script | Design Systems Engineer | `packages/design-tokens`, `docs/design/TOKENS.md` | Days 3 to 6 |
| 9 | The components, the layouts, the density, the banned-pattern replacements | Interface Design Lead | `docs/design/UI.md` | Days 3 to 6 |
| 10 | The ten directions, the packages, the eight PNGs each, the videos | The five pairs | `docs/design/directions-2/<n>-<name>/` | Days 3 to 6 |
| 11 | The reviews, the score sheets, the sign-off sheets, the fingerprint comparison | Design QA Lead | `docs/design/evidence/design-2/` | Days 7 to 9 |
| 12 | The founder's pack, the board sheet | Director | `docs/design/DIRECTIONS-2.md` | Days 7 and 10 |
| 13 | The pick, the refinement, the final screens, the token promotion, the evidence | All | The stages in §5 | After the pick |

---

## 8. The risks

| The risk | What it does | The answer |
|---|---|---|
| The ten directions look like ten variations of one idea | The founder rejects the round again | The five grammars, the pair rule (ORG-5) and the fingerprint comparison in `REVIEW.md` §9 |
| The emulator cannot record the videos in the round | No video, no signature moment, no QA | The videos are recorded in the CI emulator job, which already runs the lab routes; if the job is not ready on day 5, the round slips a day rather than shipping a direction without a video |
| The frame traces are missing | REVIEW-E7 is a blocker and every direction fails | The trace is produced by the same job as the video; the QA lead refuses an incomplete package |
| The founder cannot tell the ten apart | A wasted round | The pack is one page per direction, plus the fingerprint table, plus the videos |
| A team finishes early and starts polishing a screen of the product | The rule about the pick breaks | The design gate script fails the pull request (ORG-3) |
| The fonts or the icons turn out to be unlicensed for an application | The direction cannot ship | The licence rows are written before the assets are used, and the ledger check is one of the five signatures |
| The rest of the product stalls while the studio works | The company loses a fortnight | The studio is one squad; the other squads keep shipping, and the pick only changes the look of the screens, not their behaviour |
