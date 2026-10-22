# The Design Studio org — ten teams, one identity

**Owner:** the Design Studio director (this file's author). **Binding:** MASTER_EXECUTION §13.6
(the founder's verdict on Roadbook, Beacon and Freight, 2026-10-22) and §8.1.
**Read with:** `docs/design/SPEC.md` (what a direction must satisfy), `docs/design/REVIEW.md`
(how a direction is scored), `docs/design/PLAN.md` (the pairs, the rhythm, the pick).

Rule IDs in this file are `ORG-nn`. Rule IDs in `SPEC.md` are `SPEC-nn`. Rule IDs in `REVIEW.md`
are `REVIEW-xx`. A handover may name them.

---

## 1. Why the studio restarted

The founder looked at Roadbook (A), Beacon (B) and Freight (C) and rejected all three: dated and
plain, not like an app of 2026. The verdict is in MASTER_EXECUTION §13.6.

Two things were wrong, and the org below fixes both:

1. **The work was done by one seat.** Three screens and one designer voice produced three
   variations on the same idea — a ledger, a calm screen, a parcel label. A direction needs
   specialisms: an identity, a flow, an interface, a motion language, a map, a set of icons, an
   accessibility pass, a token implementation, a research base and an independent review.
2. **Nothing compared them.** There was no shared spec, no scoring, and no rule that a direction
   must contain a signature moment. The three were different, not designed against a bar.

What survives the restart and is reused, not redone:

| Kept | Where |
|---|---|
| The token package, the contrast maths and the test that fails a broken bar | `packages/design-tokens` |
| The research pool (89 repositories) and the library bench (56 libraries) | `docs/design/RESEARCH.md`, `docs/design/BENCH.md` |
| The content inventory of the screens (which screens exist, what each shows) | `docs/design/mockups/` — the look in those files is rejected and must not be copied |
| The design contract (type, spacing, contrast, motion, accessibility, copy) | `docs/design/SYSTEM.md` |

What is discarded: the three directions, their three themes (`roadbook`, `beacon`, `freight` in
`packages/design-tokens/src/themes.ts`) and the three routes under `/design`. They stay in the
repo as history; nothing new is built on them.

---

## 2. How the studio works

- **The director** (this file's owner) runs the studio: keeps the spec, the pairs, the rhythm,
  the decision log and the pack the founder reviews. **The director does not choose the
  direction** (ORG-1). The founder does, and it is an approval gate (MASTER_EXECUTION §7.3).
- **Ten teams work in parallel.** A team is a seat with a remit, not a person. One agent may hold
  several seats, but **no seat signs its own work** (ORG-2): the Design QA lead owns the tenth
  direction and never writes its score sheet — the Design Studio director writes that one sheet,
  acting as the second reviewer, and the decision log records it.
- **One file per team.** A team owns exactly one document and the evidence behind it. Other teams
  read that file; they never edit it.
- **Everything a team claims is checkable.** A rule without a number, a command or a screenshot is
  not a rule: it is a preference, and preferences do not go into these files (ORG-2).
- **The founder's pick is the only gate.** Until it is recorded in `docs/design/DECISION-LOG.md`,
  no final screen of the product is built (ORG-3).

### 2.1 The seats

| Seat | Team | Owns | Reviews |
|---|---|---|---|
| Design Studio director | — | `ORG.md`, `PLAN.md`, `DECISION-LOG.md`, the founder's pack | every team, against its definition of done |
| Brand Director | 1 Brand and identity | `docs/design/BRAND.md` | the identity of every direction |
| Product Design Lead | 2 Product and UX | `docs/design/UX.md`, countersigns `SPEC.md` | the flows and the ergonomics of every direction |
| Interface Design Lead | 3 Visual UI | `docs/design/UI.md` | the components, the layout and the density of every direction |
| Motion Design Lead | 4 Motion and interaction | `docs/design/MOTION.md` | the choreography, the haptics and the sound of every direction |
| Map Design Lead | 5 Maps and 3D | `docs/design/MAP.md` | the map style, the 3D and the camera of every direction |
| Icon Design Lead | 6 Iconography and illustration | `docs/design/ICONS.md` | the glyphs of every direction |
| Accessibility Design Lead | 7 Accessibility and night driving | `docs/design/ACCESSIBILITY.md` | the accessibility and the night pass of every direction |
| Design Systems Engineer | 8 Design systems and tokens | `docs/design/TOKENS.md`, `packages/design-tokens` | the token implementation of every direction |
| Design Research Lead | 9 Design research and trends | `docs/design/RESEARCH-2.md` | the claims and the references of every direction |
| Design QA Lead | 10 Design QA | `docs/design/REVIEW.md`, `docs/design/evidence/design-2/` | the score sheet of every direction, and the definition of done of all nine other teams |

---

## 3. The ten teams

Every team below has the same five parts: the **remit** (what the seat owns), the **deliverable**
(the file the seat owns), the **method** (how the work is done), the **definition of done** (the
checkable list the QA lead verifies), and the **review the lead signs** (what the seat checks on
every other team, and on every direction).

**Each team leads exactly one direction** (MASTER_EXECUTION §13.6): the ten teams and the ten
directions are one to one. The five pairs in `docs/design/PLAN.md` §2 decide which teams work side
by side and cross-review each other; a pair never merges two teams into one direction, and no team
leads two.

### 3.1 Team 1 — Brand and identity

**Seat:** Brand Director.

**Remit.** The seat owns the name mark, the logo, the colour system and the type licensing. It
decides what Courier Copilot looks like as a product rather than as a screen: the mark that
works at 16 px and on a cardboard parcel, the accent that reads in daylight through a windscreen,
and the two type families the app ships with. The mark must be ours: nothing may be a re-skin of
a competitor's, and nothing may be a stock logo. Every colour and every family that reaches the
app has a licence row in `docs/product/LICENSES.md` before it is drawn, not after.

**Deliverable.** `docs/design/BRAND.md` — the brand board: the mark (construction, clear space,
minimum sizes, the one-colour and reversed versions, the app icon), the colour system (the
semantic roles, the accent family, the light and night values, the measured contrast), the type
pairing (the display family, the text family, the licence, the licence rows), the naming rules
(how the product is written in the interface), and the misuse list.

**Method.** Research first: at least twenty references from the reference products and the awards
in `docs/design/RESEARCH-2.md`, the road signage of New Zealand, the parcel and freight marks, and
the marks of the competitors. Draw three marks, test each at 16 px, in one colour, in reversed
form and at a distance of four metres. Check the licence of every font before it is drawn. Run the
anti-AI pass over the result.

**Definition of done.**
- The mark has a construction (the grid, the proportions), a clear space, a minimum size of 16 px
  and a reversed version, all as drawings in the board.
- The palette has every pair measured by `pnpm --filter @courier/design-tokens contrast:report`,
  with the measured numbers printed in the board — not estimated.
- The type pairing names two families, their licences and their two rows in `docs/product/LICENSES.md`.
- The misuse list has at least five named misuses, each with the corrected version.
- The mark is original: the board records how it was drawn, and it is not a re-skin.

**The review this lead signs.** On every direction sheet: the accent has at least 4.5:1 as text
on the background; the palette holds at least two chromatic non-neutral colours (a single accent
on grey is a FAIL); no purple-to-blue gradient pair anywhere (REVIEW-A5); the mark appears at least
once at its minimum size; both type families have a licence row; the naming rules hold (the
product is "Courier Copilot", the assistant is "Copilot", never "AI").

### 3.2 Team 2 — Product and UX

**Seat:** Product Design Lead, the driver's advocate.

**Remit.** The seat owns the flows, the information architecture and the driving ergonomics: what
the four screens are for, in what order the driver reads them, what every screen shows, and what
the driver can do with a thumb on a moving vehicle. It decides which actions are voice-first and
which are touch-first, and it holds the rule that every feature is complete by touch, by voice
and mixed (MASTER_EXECUTION §9). It is also the seat that removes features: anything that cannot
be read at a glance in a van is cut, not shrunk.

**Deliverable.** `docs/design/UX.md` — the run of the four screens as a flow (the entry and the
exit of each), the information architecture of the app (tabs, sheets, modals, where the voice
lives), the driving ergonomics rules with their measurements, the content inventory of every
screen, and the state matrix (which of the seven states each of the four screens shows). The seat
also owns `docs/design/SPEC.md` and countersigns it with the director.

**Method.** Read the content inventory of the rejected mockups (the content only, never the look),
the driver interview, the Spoke teardown and a real run sheet. Draw the flow as boxes and arrows,
then walk it at 1:1 on paper with the timings written next to each step. Every rule becomes a
number with a way to measure it; a rule with no number is dropped.

**Definition of done.**
- The flow of the four screens with the entry and the exit of each, and the way back to Today.
- The state matrix: the seven states of `docs/design/SYSTEM.md` §4 mapped to the four screens.
- The ergonomics numbers with the measurement method for each (glance time, taps, target
  position, voice availability).
- The "phone in a pocket" case written out for each screen.
- Nothing in the flow that needs a decision at 100 km/h.

**The review this lead signs.** On every direction: the four screens show the content inventory
with nothing missing and nothing extra; one primary action per screen; every action reachable in
two taps or fewer while driving; a voice path for every action; the seven states present; the
copy of the driving prompts at eight words or fewer; the flow of the four screens reads in the
order the seat specifies.

### 3.3 Team 3 — Visual UI

**Seat:** Interface Design Lead.

**Remit.** The seat owns the components, the layouts and the density: the inventory of what the
interface is made of, how it is arranged, and how much of it fits on a screen the driver reads in
a second. It is the seat that keeps the product off the three templates the founder rejected —
stacks of rounded cards, a centred hero with two buttons, and a list of equal-weight grey rows.
Where it bans a pattern it replaces it with a named, workable alternative.

**Deliverable.** `docs/design/UI.md` — the component inventory (each component with its states and
variants), the layout grammar (the grid, the margins, the density measured in stops visible per
screen at 390 by 844, the radii and their use, the three elevation levels), the hierarchy rules
(one primary action, the number first, the label last), and the replacement rules for every
banned pattern.

**Method.** Build in the lab, not in a picture: the layout is decided in code as soon as it is
decided, then screenshotted at 1:1. Compare against the reference products in the research file.
Cut every element that carries no information and record what was cut and why.

**Definition of done.**
- The component list with the states of each, and the testID of each (the Maestro flows use them).
- Every component on the 4-pt grid, and the radii drawn from the token set only.
- No component uses a raw hex, a raw pixel value or a raw font name: the lint rule is green.
- The density declared as a number (stops visible on the Today screen at 390 by 844) and visible
  in the screenshots.
- No screen stacks three or more cards of the same shape.
- A screenshot of every component in light and night.

**The review this lead signs.** On every direction: the declared density matches the PNG; no
stack of same-shape cards; no centred hero with two buttons; the hierarchy is one number, one
address, one action, in that reading order; the components exist in the token package; the
banned-pattern list in the review sheet is answered with a replacement, not a justification.

### 3.4 Team 4 — Motion and interaction

**Seat:** Motion Design Lead.

**Remit.** The seat owns the choreography, the haptics and the sound: how things enter, how a
delivery is confirmed, how the assistant appears, what the hand feels and what the ear hears. It
decides which movement carries meaning and which is decoration — decoration is not shipped. It
also owns the frame-time budget: motion that cannot hold 60 frames a second on the CI emulator
does not go in, whatever it looks like on a desk.

**Deliverable.** `docs/design/MOTION.md` — the motion language (the four movements: enter,
confirm, complete, dismiss — each with its duration, its easing or spring configuration and what
may never animate), the choreography of the four screens as a frame table (what moves, from
where, to where, over how long, with which spring), the haptic map (event, pattern, intensity),
the sound map (event, earcon, duration, level, audio-focus rules), the reduced-motion behaviour of
every movement, and the performance budget.

**Method.** Build in the lab with Reanimated 4 on the UI thread, and Skia or Rive where the
motion needs a shader or a vector performance. Measure the frame times on the CI emulator and
keep the trace. Every animation gets a written duration, a purpose and a reduced version before
it is built, not after.

**Definition of done.**
- Every movement has a number (duration, easing or spring) and a one-line reason.
- The reduced-motion variant of every movement is defined and implemented.
- The haptic and sound maps cover the four screens, including the three core events: confirm,
  delivered, error.
- The frame trace of the driving screen shows no frame over 16.7 ms.
- No decorative loop anywhere.

**The review this lead signs.** On every direction: every animation in the video matches the
written table; the durations sit inside 150 to 250 ms on the UI transitions; nothing on the
driving path runs longer than 400 ms; the haptic map covers confirm, deliver and error; no haptic
on scroll; the audio ducks for the voice and yields to calls; the reduced-motion behaviour is
demonstrated in the video or the screenshot set.

### 3.5 Team 5 — Maps and 3D

**Seat:** Map Design Lead.

**Remit.** The seat owns the MapLibre styles, the 3D buildings and the camera: the map the driver
is looking at while the van is moving. It decides the four view modes of MASTER_EXECUTION §11
(2D, 3D, satellite online only, auto), the basemap style in light and in night, the extrusion
treatment, and the camera behaviour — when the map turns, when it tilts, when it stays still.
The camera never fights the driver: the next address is always readable over it.

**Deliverable.** `docs/design/MAP.md` — the basemap style spec for light and night (the layers,
the colours, the label sizes, the road hierarchy), the 3D treatment (the extrusion colour, the
light direction, the shadow, the fog), the camera spec (pitch, bearing, zoom, the follow distance
and the transition durations between modes), the four modes and what each is for, the offline
behaviour (the PMTiles pack, the missing-tile state) and the attribution.

**Method.** Build the style in MapLibre with maputnik, then screenshot it at three pitches and
two zooms. Measure the readability of the next address over every map background in the
direction's own palette. Test the offline state with the network off, because the offline state
is a screen the driver will see.

**Definition of done.**
- The style JSON for light and night is in the repo and in the spec.
- The camera numbers are written (pitch range, bearing rule, zoom range, follow distance,
  transition duration).
- The next address keeps at least 4.5:1 against the map background, or it carries a plate that
  does.
- The night style is not the day style with a filter: it has its own road and label colours.
- The 3D mode holds 60 fps on the CI emulator with the trace kept.
- The attribution of OSM and LINZ is on the screen.

**The review this lead signs.** On every direction: the map style is drawn in the direction's
palette rather than a stock style with the accent pasted on; the camera numbers sit inside the
ranges in `docs/design/MAP.md`; the next address keeps its contrast over the map; the offline
state is drawn rather than left blank; no satellite mode without a licence row; the pitch and
the bearing never move while the driver is reading the address.

### 3.6 Team 6 — Iconography and illustration

**Seat:** Icon Design Lead.

**Remit.** The seat owns the icon set and the illustration: every glyph in the product, the
custom marks the app needs and no set has (the parcel, the van, the door, the door code, the
hazard, the parcel position in the van), and the rule that says where illustration is allowed at
all. It also owns the emoji ban and the workable replacement for each place one would have been
used — an empty state, a success moment, a rating row.

**Deliverable.** `docs/design/ICONS.md` — the set decision (the set, its weight, its licence), the
custom glyph list with the grid and the stroke rule, the illustration rules and their licence,
the emoji replacement table, and the state glyphs that must be distinguishable by shape and not
only by colour.

**Method.** Audit the four screens for every glyph needed. Map each to a set glyph or to a custom
one. Draw the custom ones on one grid (24 dp, a 2 dp stroke) so they sit with the set. Test every
glyph at 16, 20, 24 and 32 px, in light and in night.

**Definition of done.**
- Every glyph in the four screens is in the set or in the custom list.
- The custom glyphs share one grid and one stroke rule, and are drawn in the vector set.
- The set has one licence row in `docs/product/LICENSES.md`.
- No emoji anywhere in the app: the existing test fails the build if one appears.
- Every glyph checked at 16 px.

**The review this lead signs.** On every direction: one set, one weight; no emoji; the custom
glyphs match the character of the mark (the same stroke logic); the delivered, failed and
skipped states are told apart by shape as well as colour; the illustration, if any, has a licence
row and appears nowhere else.

### 3.7 Team 7 — Accessibility and night driving

**Seat:** Accessibility Design Lead.

**Remit.** The seat owns WCAG 2.2 AA, the night palette and the conditions of a real shift: a van
at four in the afternoon, a van at one in the morning, a driver in gloves, a driver with low
vision, a driver whose phone is at five per cent. It writes the labels, the focus order and the
dynamic-type behaviour before the screens are built, and it signs the night pass of every
direction. The night theme is an adapted option for driving after dark, never the identity of the
product (§13.3).

**Deliverable.** `docs/design/ACCESSIBILITY.md` — the measured contrast table per direction, the
label list for every interactive element of the four screens (the exact strings), the focus order
per screen, the dynamic-type behaviour at 200 per cent and what gives way, the night palette
rules, the colour-blind check of the status colours, the reduced-motion and reduced-transparency
behaviour, and the glove mode.

**Method.** Run the contrast tool rather than trusting the eye. Write the labels before the
screens. Test on the emulator with the screen reader on, with the text at 200 per cent, and with
the system dark theme forced. Check the status colours with a colour-blind simulation.

**Definition of done.**
- Every interactive element has a role and a label, written out.
- Every text pair meets its bar, with the measured number in the table.
- The night background is not pure black and the night text is not pure white.
- The 200 per cent screenshot shows no clipped or truncated text.
- The focus order matches the reading order on each screen.
- The three status colours pass the colour-blind check.

**The review this lead signs.** On every direction: the contrast numbers are measured, not
estimated; a label exists for every interactive element in the four screens; the night PNGs meet
the night rules (near-black background, low blue, no pure white text); the 200 per cent PNG shows
no clipping; the status colours are told apart by shape as well as colour.

### 3.8 Team 8 — Design systems and tokens

**Seat:** Design Systems Engineer.

**Remit.** The seat owns the implementation of the identity: the token package, the themes, the
direction themes, the components in code and the guards that stop the product drifting away from
the contract. The token package is the only place a value may be defined; a component that needs
a new value adds a token first. The seat writes the tests that fail when a bar is broken, so the
bar holds without anyone watching.

**Deliverable.** `docs/design/TOKENS.md` plus the code in `packages/design-tokens` and
`apps/mobile/src/design`: the ten direction themes with their palettes and type scales, the
semantic role set, the motion tokens, the lint rule that rejects raw hex, raw pixels and raw
font names, and the contrast test that grows a case for every pair of every theme.

**Method.** Add the direction as a theme with the same semantic roles as the day and night
themes, so no component ever grows a direction-named token. Grow the contrast test by one case
per pair per theme. Turn on the lint rule and keep it green.

**Definition of done.**
- Every direction's palette and type scale is in the package, under the same semantic roles.
- The contrast test covers every pair of every theme, one test per pair, and passes.
- The lint rule is on and the tree is clean.
- No raw value sits outside the token file.
- The report command prints the table that is written in the docs.

**The review this lead signs.** On every direction: the theme exists in the package with its
measured pairs; the lint runs clean; the PNGs come from the token values rather than from a
picture; no type step below 17 px; the direction adds no new semantic role (a new role is a
finding, not a change).

### 3.9 Team 9 — Design research and trends

**Seat:** Design Research Lead.

**Remit.** The seat owns the evidence base: the GitHub projects of 2025 and 2026, the
award-winning apps, the reference products and the competitors. It answers one question in
writing — what makes an app of 2026 feel new — and the answer must be a list of named, checkable
traits, not adjectives. It is also the seat that watches for copying: a direction that re-skins
a reference product is a FAIL, however good it looks.

**Deliverable.** `docs/design/RESEARCH-2.md`. The seat owns this file alone; no other team edits
it and no other team cites anything outside it.

**Method.** V4 §12 depth: at least fifty GitHub repositories from 2025 and 2026 with an evidence
card each (the URL, the date, the licence, the version, what it teaches), at least thirty
award-level apps studied from public material, the competitor set, a verifier pass over at least
a fifth of the cards, and the query log.

**Definition of done.**
- Fifty or more evidence cards with URLs and dates, and the query log.
- Thirty or more award-level apps and the competitors, studied from public material only.
- The verifier pass recorded, with the corrections it forced.
- The traits of 2026 written as checkable statements (a trait that cannot be checked in a
  screenshot is not a trait).
- A shortlist of fifteen with the reason each one is on it.

**The review this lead signs.** On every direction: the traits the direction claims appear in the
research file with a reference; no proprietary asset is copied; the references are public; the
direction is not a re-skin of one reference product; the libraries the direction relies on are in
the shortlist or are justified with a measurement.

### 3.10 Team 10 — Design QA

**Seat:** Design QA Lead, independent of every other seat.

**Remit.** The seat owns the pixel and motion review against the spec: the independent check that
a direction is what it claims to be, and that it meets the bar. It runs the checklists in
`docs/design/REVIEW.md` against every direction, scores it, and rules. It also checks the other
nine teams against their own definitions of done, so a team cannot mark itself finished.

**Deliverable.** `docs/design/REVIEW.md` — the QA spec, the checklists, the weights and the
verdict rules — plus one score sheet per direction at
`docs/design/evidence/design-2/<n>-<name>-review.md`, and the sign-off sheet per direction.

**Method.** Measure what can be measured (the contrast from the token package, the target sizes
from the PNG at 1:1, the durations from the video frame by frame, the hierarchy from the
accessibility tree) and write down what was measured. A FAIL is a blocker, not a note: the
direction goes back once with a list, and a second FAIL removes it from the round.

**Definition of done.**
- Every direction in the round has a score sheet with a score per criterion, the list of FAILs and
  a verdict of PASS or FAIL.
- The score sheet is written by a seat that did not build the direction. The QA lead's own
  direction (the tenth) is scored by the Design Studio director, acting as the second reviewer,
  and the decision log records the substitution (ORG-2).
- The sheets agree with the fingerprint table in `docs/design/SPEC.md`.
- The sign-off sheet of each of the five signed checks is complete for every direction.
- The QA lead has signed.

**The review this lead signs.** On every direction: the sheet is complete, the score adds up, the
blockers are named, the verdict is recorded. On every other team: the deliverable meets its own
definition of done, and any claim in it that cannot be checked is a finding.

---

## 4. The working agreement

### 4.1 Handovers (ORG-H1)

A team that changes something another team depends on writes a five-line handover note at the top
of its own file. The format is fixed:

```
Handover to: <team> | Date: <date> | Version: <n>
Changed: <one line>
Rule IDs touched: <the checkable rules this change affects>
Breakage for the consumer: <what the consumer must re-check>
Action for the consumer: <one line>
```

The rules:

- A team edits only its own file. A change that reaches another team goes in the handover, and the
  other team applies it. The author never edits another team's file (ORG-H2).
- A change that breaks a signed rule — the contrast bars, the 72-point primary target, the eight
  driving words, the 150-to-250-millisecond window — is a blocker: the QA sheet fails until it is
  fixed, whoever made the change (ORG-H3).
- A team that needs an upstream decision does not wait. It works from the last published version
  and writes the assumption it made into its own file, so the decision is visible and cheap to
  change (ORG-H4).

### 4.2 The daily rhythm (ORG-R1)

| When | What | Who |
|---|---|---|
| 09:00 | The written board: three lines per lead in `docs/design/DECISION-LOG.md` — done, blocked, next. A team that posts nothing is treated as blocked and the director unblocks it. | All ten leads |
| The working day | Parallel work on the own deliverable and the own direction. No team waits on another team. | All ten leads |
| 16:00 | The pair review, thirty minutes: the two leads of the working pair cross-review each other's direction. Each signs the five checks of their own direction and records the findings on the other's sheet. | The pair |
| On delivery | A direction enters the QA queue only when its package is complete (the eight PNGs, the video, the sheet, the fingerprint row). The QA lead takes two a day, first come first reviewed. | The team, the QA lead |
| Weekly | The director publishes the board sheet: the ten directions, their scores, the blockers, the open decisions. | The director |

### 4.3 What "done" means for a direction (ORG-R2)

A direction is done when all ten of these are true. Each is checked by the QA lead; each has
evidence in `docs/design/directions-2/<n>-<name>/`.

1. The four screens exist as real screens in the lab route (`/design-2/<n>-<name>`), in light and
   in night — not as pictures of screens.
2. The eight PNGs are in the folder, named by the rule in `docs/design/SPEC.md` §9.
3. The video of the four screens, at most sixty seconds, is in the folder.
4. The sheet (`README.md` in the folder) declares the identity fingerprint: the accent, the two
   type families, the density, the layout grammar, the motion character, the map style, the three
   signature moments, the icon treatment and the night rule.
5. The three signature moments are implemented and visible in the PNGs, not only described.
6. The anti-AI checklist (REVIEW-A1 to REVIEW-A15) is answered line by line with a PASS or a FAIL.
7. The frame trace from the CI emulator is in the folder, with no frame over 16.7 ms on the
   driving screen.
8. The contrast report of the direction's palette is in the folder.
9. The licence rows for the fonts, the icons, the sounds and the assets are in
   `docs/product/LICENSES.md` and in the folder's `evidence/licences.md`.
10. The QA score sheet is signed, with a verdict of PASS.

A direction that is done but not scored is not done.

### 4.4 The signed review checklist (ORG-R3)

Every direction carries five signatures. Each signature is written on the sign-off sheet at
`docs/design/evidence/design-2/signoff-<n>-<name>.md`, with the seat, the date and the evidence
path. A direction with four signatures out of five does not enter the founder's pack.

| # | The check | Signed by | The check is | The evidence |
|---|---|---|---|---|
| 1 | The anti-AI rules | Brand Director, with the Design Research Lead | Every one of REVIEW-A1 to REVIEW-A15 passes. Any FAIL is a blocker and the direction is out. | The answered checklist in the direction sheet |
| 2 | WCAG 2.2 AA | Accessibility Design Lead | The measured contrast pairs, a label for every interactive element, no clipping at 200 per cent, the night rules. | `contrast.txt`, the 200 per cent PNG, the label list in `docs/design/ACCESSIBILITY.md` |
| 3 | The driving ergonomics | Product Design Lead | One primary action, two taps at most, the glance time under one second, the voice path for every action, the eight-word driving prompts. | The flow in `docs/design/UX.md` and the video |
| 4 | 60 and 120 frames a second | Motion Design Lead | The frame trace of the driving screen with no frame over 16.7 ms, and the motion inside the 150-to-250-millisecond window. | `evidence/fps-<n>.txt` from the CI emulator |
| 5 | The licence ledger | Design Systems Engineer, with the Design Research Lead | Every font, icon set, sound, illustration and asset in the direction has a row in `docs/product/LICENSES.md`, with the licence and the source. | `evidence/licences.md` and the ledger |

### 4.5 The review board

| Seat | Decides | Cannot decide |
|---|---|---|
| The founder | The pick: which direction becomes the product (an approval gate, MASTER_EXECUTION §7.3). Business choices: the name, the price. | Nothing technical. |
| The Design QA Lead | The score and the verdict on every direction. | The pick. |
| Each lead | Their own axis: the identity, the flow, the interface, the motion, the map, the icons, the accessibility, the tokens, the research. A veto on their axis is written and must name the rule broken. | Another team's axis. |
| The Security lead | A veto on any licence or privacy problem in a direction. | The pick. |
| The director | The spec, the pairs, the rhythm, the log, the pack. The resolution of a veto against a veto, on the evidence. | The pick (ORG-1). |

How a disagreement is settled (MASTER_EXECUTION §8.3): with data, not opinion. A veto says which
rule is broken and shows the measurement — the contrast number, the frame time, the pixel count,
the word count. A veto without a measurement is not a veto; it becomes a task.

### 4.6 The decision log

`docs/design/DECISION-LOG.md` is the studio's record. One entry per decision, in this format:

```
## <date> — <the decision in one line>
Seat: <who decided> | For: <who was consulted> | Type: <decision | veto | note>
Reason: <why, in two sentences>
Evidence: <the path to the measurement, the file or the CI run>
Effect: <what changes, and for whom>
```

The log holds three kinds of entry: the daily board posts, the decisions and the vetoes, and the
pick. The pick is also written to `docs/decisions/DECISIONS.md` as a founder decision and the gate in
`docs/status/FOUNDER_TODO.md` is closed with the date and the reason.

### 4.7 What the director does not do

- The director does not choose the direction (ORG-1).
- The director does not write a final screen of the product before the pick (ORG-3).
- The director does not accept a direction that arrives without its score sheet.
- The director does not weaken a rule to make a direction pass. If a rule is wrong, it is changed
  in the open, in the log, with the reason — never quietly in the direction that needs it.

---

## 5. The files the studio owns

| File | Owner | What it holds |
|---|---|---|
| `docs/design/ORG.md` | Director | This file: the org, the working agreement, the board |
| `docs/design/SPEC.md` | Product Design Lead, countersigned by the director | What every direction must satisfy |
| `docs/design/REVIEW.md` | Design QA Lead | The QA spec, the checklists, the weights, the verdict rules |
| `docs/design/PLAN.md` | Director | The pairs, the rhythm, the plan, the rule about the pick |
| `docs/design/BRAND.md` | Brand Director | The mark, the colour system, the type licensing |
| `docs/design/UX.md` | Product Design Lead | The flows, the information architecture, the ergonomics |
| `docs/design/UI.md` | Interface Design Lead | The components, the layouts, the density |
| `docs/design/MOTION.md` | Motion Design Lead | The choreography, the haptics, the sound |
| `docs/design/MAP.md` | Map Design Lead | The styles, the 3D, the camera |
| `docs/design/ICONS.md` | Icon Design Lead | The set, the custom glyphs, the illustration rules |
| `docs/design/ACCESSIBILITY.md` | Accessibility Design Lead | The contrast, the labels, the night rules |
| `docs/design/TOKENS.md` | Design Systems Engineer | The implementation: themes, tokens, guards |
| `docs/design/RESEARCH-2.md` | Design Research Lead | The evidence base and the traits of 2026 |
| `docs/design/DECISION-LOG.md` | Director | The board posts, the decisions, the vetoes, the pick |
| `docs/design/directions-2/<n>-<name>/` | The team that built the direction | The package of a direction (the layout is in `SPEC.md` §9) |
| `docs/design/evidence/design-2/` | Design QA Lead | The score sheets and the sign-off sheets |

---

## 6. The rules that bind every seat (ORG-4)

These are not preferences; each one is checked.

1. **Plain New Zealand English.** No emoji, in the interface or in a document. Never the word
   "AI" in the product; the assistant is "Copilot". The driving voice prompts are eight words or
   fewer; the words on a screen are twelve or fewer.
2. **Light is the default.** The night theme is the adapted option for driving after dark.
3. **One icon set, one weight, no emoji, ever.**
4. **Tokens only.** No raw hex, no raw pixel value, no raw font name outside the token package.
5. **Numbers, not adjectives.** Every rule in these files carries a number, a command or a
   screenshot. "Modern", "premium", "clean" and "bold" are not accepted in a review.
6. **Evidence or it did not happen.** A claim without a path to the measurement is not a claim.
7. **The founder decides the look.** Everything else in the studio is decided by the leads, on the
   evidence, and written in the log.

