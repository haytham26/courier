# REVIEW — the design QA spec

**Owner:** the Design QA Lead (team 10). **Binding:** MASTER_EXECUTION §13.2, §13.6 and §8.1.
**Runs against:** every direction in `docs/design/directions-2/<n>-<name>/`.
**Writes:** `docs/design/evidence/design-2/<n>-<name>-review.md` (the score sheet) and
`docs/design/evidence/design-2/signoff-<n>-<name>.md` (the five signatures).

Rule IDs in this file are `REVIEW-xx`. A rule ID may be quoted in a score sheet, a handover or a
veto.

---

## 1. What the QA lead does

The QA lead checks a direction against the spec and rules on it. The direction is a package:

| The package contains | Where |
|---|---|
| The four screens as real screens, light and night | the lab route `/design-2/<n>-<name>` |
| The eight PNGs | `screens/` in the direction folder |
| The video of the four screens | `video/<n>-<name>.mp4` |
| The direction sheet with the identity fingerprint | `README.md` in the direction folder |
| The screen-by-screen spec | `spec.md` in the direction folder |
| The frame trace, the contrast report, the licence rows | `evidence/` in the direction folder |

The QA lead writes one score sheet per direction with a score per criterion, the list of FAILs and
a verdict. **The QA lead never writes the score sheet of a direction they built** (ORG-2): the QA
lead owns the tenth direction of the round, and that one sheet is written by the Design Studio
director, acting as the second reviewer, with the substitution recorded in the decision log.

Three ways to fail:

| The failure | What it means |
|---|---|
| **BLOCKER** | The direction is out of the round. It is not scored; the FAIL is recorded with the rule broken and the measurement. |
| **FAIL** | The criterion is scored at zero for that part. The direction stays in the round if its total clears the bar. |
| **PASS** | The criterion is scored on its measurement. |

The rule for the blocker list is in §6.

---

## 2. The checklists

### 2.1 REVIEW-A — the anti-AI look (blockers)

The rules of MASTER_EXECUTION §13.2 and the three additions of §13.6. Fifteen rules. **Any one
of them is a blocker**: the direction is out of the round. The founder rejected three directions
on this ground, so the check is not advisory.

| ID | The rule | How it is checked |
|---|---|---|
| REVIEW-A1 | No neon accent on black | In the light palette there is no near-black surface with a saturated accent: the identity is the light palette. In the night palette the accent is not a neon hue — its relative luminance is 0.6 or less, or its saturation is 90 per cent or less — and the night background stays an adapted surface, not a black field carrying a bright accent. |
| REVIEW-A2 | No glow or bloom | No shadow with a coloured tint, no blur behind text, no light-emitting edge. The shadow count in the components is zero or the shadows are neutral and inside the three elevation levels. |
| REVIEW-A3 | No glassmorphism | No translucent surface over a blurred or textured background. A surface with an alpha below 0.95 counts as glass, unless it is a map overlay, which is named and justified. |
| REVIEW-A4 | No pulsing orbs | Nothing loops, nothing scales repeatedly, no radial gradient blob, no dot that breathes. A static circular indicator is allowed; an animated one is a FAIL. |
| REVIEW-A5 | No purple-to-blue gradient | The palette has no gradient between two hues inside the range 240 to 300 degrees. Check the palette values in `palette.json` and the token file for any `gradient` rule. |
| REVIEW-A6 | No sparkle icons for the assistant | The assistant's glyphs carry no four-point star, no wand, no sparkles, no robot face. |
| REVIEW-A7 | No generic rounded cards stacked | No screen has three or more cards of the same shape in a stack, and no card repeats the radius of the surface behind it without a reason written in the sheet. |
| REVIEW-A8 | No centred hero with two buttons | No screen opens with a centred title, a centred block of text and two buttons underneath. The primary action is in the thumb's reach, not in the centre of the screen. |
| REVIEW-A9 | Light is the default | The default theme of the direction is the light palette. The night palette is the adapted option and is not the identity. |
| REVIEW-A10 | No stock iconography without a system | One set, one weight, one grid. The custom glyphs follow the same grid and stroke as the set. |
| REVIEW-A11 | No filler copy | Every address, suburb, time, name and number on the screen is real content for a Christchurch run. No "Lorem", no "Address here", no "Your delivery". |
| REVIEW-A12 | No emoji | No emoji character anywhere in the screens, the sheet or the documentation of the direction. The existing test in the app fails the build if one appears. |
| REVIEW-A13 | No paper or ledger retro look | No ledger rules, no perforated edges, no kraft paper simulation, no serif "dispatch note" typography as the identity. The direction may use one of these as a quotation, never as its language. |
| REVIEW-A14 | No flat bootstrap-like list | No list of equal-weight grey rows with a chevron and nothing else. Every row carries something that changes the decision the driver makes: a number, a state word, a time, a note. |
| REVIEW-A15 | No single-accent-on-grey template | The palette holds at least two chromatic non-neutral colours besides the neutrals. The accent may not be the only colour that carries meaning. |

### 2.2 REVIEW-B — the type scale

| ID | The rule | How it is checked |
|---|---|---|
| REVIEW-B1 | The seven steps | Every text on the four screens uses one of the seven declared steps (metric, address, row, label, body, caption, title). No ad-hoc size. |
| REVIEW-B2 | The minimums | The body is 17 px or more; the key number is between 48 and 76 px; the address is 22 px or more. |
| REVIEW-B3 | Tabular numerals | The counts, the times, the money and the distances use tabular figures, so the digits do not move when the value changes. |
| REVIEW-B4 | Three weights a screen | No screen uses more than three weights of the same family, and no more than two families. |
| REVIEW-B5 | The line height | Every step declares a line height of at least 1.2 times its size; the metric at most 1.15. |
| REVIEW-B6 | The tracking | The display steps carry negative tracking of no more than 0.04 em; the label steps carry positive tracking of no more than 0.12 em. |
| REVIEW-B7 | The licence | Both families have a row in `docs/LICENSES.md`, and the licence covers use in an application (not only use on a website). |

### 2.3 REVIEW-C — the touch targets and the hand

| ID | The rule | How it is checked |
|---|---|---|
| REVIEW-C1 | The primary target | The primary action of every screen is 72 pt or more. |
| REVIEW-C2 | The other targets | Every other interactive target is 56 pt or more, measured in the PNG at 1:1. |
| REVIEW-C3 | The spacing | Two adjacent targets are at least 8 pt apart, so a thumb does not hit the wrong one. |
| REVIEW-C4 | The reach | On the driving screen the primary action sits in the lower third of the screen and the hand never covers the next address. |
| REVIEW-C5 | The top of the screen | On the driving screen no control sits in the top 15 per cent: that band belongs to the address and the map. |
| REVIEW-C6 | The voice bar | The voice bar is 64 dp or more high, and its states are distinguishable without relying on the colour alone. |
| REVIEW-C7 | The glove mode | The glove mode adds 8 pt to every target, and the 72-point rule still holds at 80 pt. |

### 2.4 REVIEW-D — the contrast

| ID | The rule | How it is checked |
|---|---|---|
| REVIEW-D1 | The bars | The body text is 4.5:1 or better; the large text and the boundaries are 3:1 or better; the driving text (the address, the distance, the ETA on the driving screen) is 7:1 or better. |
| REVIEW-D2 | The measurement | The numbers come from `packages/design-tokens/src/contrast.ts`, one test per pair per theme. A number estimated by eye is not a number. |
| REVIEW-D3 | The pairs covered | Every foreground and background pair that appears on the four screens is in the report, including the pressed and the disabled states. |
| REVIEW-D4 | The map | The next address keeps 4.5:1 over the map background, or it sits on a plate that keeps 4.5:1. |
| REVIEW-D5 | The status colours | The delivered, failed and skipped colours are 4.5:1 or better as text, and they are told apart by shape and word as well as by hue. |
| REVIEW-D6 | The night theme | The night background is between #0A0A0A and #121212, the night text is never #FFFFFF, and the blue channel of the night background is 26 or less. |

### 2.5 REVIEW-E — the motion

| ID | The rule | How it is checked |
|---|---|---|
| REVIEW-E1 | The window | The UI transitions run 150 to 250 ms. The sheet springs are named with their configuration. |
| REVIEW-E2 | The driving path | Nothing on the driving path runs longer than 400 ms, and nothing on it asks the driver to wait for an animation before the next stop is readable. |
| REVIEW-E3 | The count | No more than three elements animate at the same time on the driving screen. |
| REVIEW-E4 | The purpose | Every movement is listed in `docs/design/MOTION.md` with its duration, its easing and one line of purpose. A movement with no purpose is a FAIL. |
| REVIEW-E5 | The reduced motion | Every movement has a reduced variant: instant, not removed. The reduced variant is demonstrated in the video or the screenshot set. |
| REVIEW-E6 | The thread | The animation runs on the UI thread. A movement that could run on the UI thread and does not is a FAIL. |
| REVIEW-E7 | The frames | The frame trace of the driving screen shows no frame over 16.7 ms, and the trace file is in the package. A missing trace is a blocker. |
| REVIEW-E8 | No loops | Nothing loops, nothing repeats, nothing pulses. |

### 2.6 REVIEW-F — the 3D camera and the map

| ID | The rule | How it is checked |
|---|---|---|
| REVIEW-F1 | The pitch | The 3D pitch sits between 45 and 60 degrees; the follow pitch between 30 and 40; the 2D pitch is 0. The pitch is inside these ranges in the video. |
| REVIEW-F2 | The bearing | The bearing is north-up in the stop list and heading-up while driving; it changes only on the next turn, never while the driver is reading the address. |
| REVIEW-F3 | The zoom | The zoom is inside the range in `docs/design/MAP.md` for the mode; the driver can zoom by voice without the camera jumping. |
| REVIEW-F4 | The transition | The mode change takes at most 400 ms and the camera never spins through more than 90 degrees. |
| REVIEW-F5 | The style | The map is drawn in the direction's palette: the road colours and the label colours come from the direction's tokens, not from a stock style. |
| REVIEW-F6 | The night map | The night style is a separate style, not the day style with a filter. |
| REVIEW-F7 | The offline state | The missing-tile state is drawn: a visible fallback surface, never a blank grid. |
| REVIEW-F8 | The attribution | The OSM and LINZ attribution is on the screen. |
| REVIEW-F9 | The satellite mode | The satellite mode is online only, and it has a licence row or it is not shown. |

### 2.7 REVIEW-G — the night drive

| ID | The rule | How it is checked |
|---|---|---|
| REVIEW-G1 | The background | The night background is not pure black: it sits between #0A0A0A and #121212. |
| REVIEW-G2 | The text | No pure white text in the night theme; the brightest text is #F2F2F2 or less. |
| REVIEW-G3 | The blue | The blue channel of the night background is 26 or less, so the screen does not wash the driver's night vision. |
| REVIEW-G4 | The brightness | The night theme asks for the system dark theme and it is the only theme that lowers the screen brightness request. |
| REVIEW-G5 | The switch | The palette and the map style switch together, at sunset or on the manual toggle. There is no moment where the map is night and the interface is day. |
| REVIEW-G6 | The priority | In the night theme the address and the distance are the only bright things. The status colours keep their night values and stay readable. |
| REVIEW-G7 | The auto rule | The switch is automatic by sunset and can be overridden by hand; the override is remembered per driver. |

### 2.8 REVIEW-H — the haptics

| ID | The rule | How it is checked |
|---|---|---|
| REVIEW-H1 | The three core events | The confirm, the delivered and the error each have a haptic pattern, written in the haptic map. |
| REVIEW-H2 | The pattern | Each pattern has a name, a number of pulses, a duration and an intensity, so it can be built and tested rather than described. |
| REVIEW-H3 | The restraint | No haptic on scroll, on list movement, on passive map movement or on a screen that appears without the driver asking for it. |
| REVIEW-H4 | The distinctness | The delivered haptic is felt differently from the error haptic by a driver who is not looking at the screen. |
| REVIEW-H5 | The respect | Haptics are off when the system has them off, and the driver can turn them off in the settings. |

### 2.9 REVIEW-I — the sound

| ID | The rule | How it is checked |
|---|---|---|
| REVIEW-I1 | The events | The wake word, the start of listening, the end of listening, the confirmed delivery, the error and the offline change each have an earcon, written in the sound map. |
| REVIEW-I2 | The length | An earcon is 250 ms or less. |
| REVIEW-I3 | The level | The earcon sits below the voice, and the voice ducks the earcon by at least 10 dB while it speaks. |
| REVIEW-I4 | The focus | A call or another app takes the audio; the earcons stop. Nothing fights the driver's music for the call. |
| REVIEW-I5 | The silent mode | In the silent mode the earcons are off and the voice is the only sound. |
| REVIEW-I6 | The licence | Every earcon has a licence row, and a recorded sound has a licence row that covers use in an application. |

### 2.10 REVIEW-J — the states

| ID | The rule | How it is checked |
|---|---|---|
| REVIEW-J1 | The seven states | Loading, empty, error, offline, partial sync, permission denied and long list are covered by the spec and by the state matrix in `docs/design/UX.md`. |
| REVIEW-J2 | The skeleton | Loading uses a skeleton and no spinner runs longer than 300 ms. |
| REVIEW-J3 | The error | The error says what happened in one plain sentence and offers the recovery action on the screen. |
| REVIEW-J4 | The offline | The offline state is a chip with the number of queued actions, never a blocking dialog. |
| REVIEW-J5 | The permission | The permission-denied state is one line and points at the system setting as the next step. |
| REVIEW-J6 | The long list | The 300-stop list scrolls at 60 frames a second, with the trace in the package. |

### 2.11 REVIEW-K — the licence ledger

| ID | The rule | How it is checked |
|---|---|---|
| REVIEW-K1 | The fonts | Both type families have a row in `docs/LICENSES.md`, with the licence and the source, and the licence covers use in a shipped application. |
| REVIEW-K2 | The icons | The icon set has a row; every custom glyph is ours. |
| REVIEW-K3 | The sounds | Every earcon has a row and is either ours or licensed for application use. |
| REVIEW-K4 | The assets | Every image, texture and illustration has a row. |
| REVIEW-K5 | The map data | The map styles cite the basemap and the building data with their licences and their attribution. |
| REVIEW-K6 | The cleanliness | No licence in the ledger is one of the forbidden ones in `CONSTRAINTS.md` (GPL, AGPL, SSPL, Commons Clause, CC-NC, FSL, BUSL). |

### 2.12 REVIEW-L — the copy and the content

| ID | The rule | How it is checked |
|---|---|---|
| REVIEW-L1 | The language | Plain New Zealand English. Spelling, idiom and address format as a courier would say them. |
| REVIEW-L2 | The driving words | A driving voice prompt is eight words or fewer; a screen line is twelve or fewer. Count them. |
| REVIEW-L3 | The product name | The product is "Courier Copilot" and the assistant is "Copilot". The words "AI" and "AI-powered" appear nowhere in the screens or in the copy of the direction. |
| REVIEW-L4 | The status | Every state carries its word; the status is never colour alone. |
| REVIEW-L5 | The content | The addresses, suburbs, times and names are real and consistent between the four screens (the same next stop on Today and on Driving). |
| REVIEW-L6 | The emoji | No emoji in any string of the direction. |

---

## 3. The signature moment rule (blockers)

**A direction without a signature moment is out of the round.** This is the founder's own
condition (MASTER_EXECUTION §13.6): every direction must have a strong signature moment. Three
are required, because they are the three moments a courier lives in:

| ID | The moment | What it means | How it is checked |
|---|---|---|---|
| REVIEW-S1 | How a delivery is confirmed | The moment the courier says "delivered": what the screen does, what the hand feels, what the ear hears. | The moment is visible in a PNG (the confirmed state of the screen), written in the sheet with its duration, its easing, its haptic pattern and its earcon, and implemented in the lab route — not only described. |
| REVIEW-S2 | How the map moves | The camera behaviour: the turn, the arrival, the mode change, the return to north. | The movement is visible in the video, written with the pitch, the bearing, the zoom and the duration, and it is the direction's own behaviour rather than the stock camera. |
| REVIEW-S3 | How Copilot appears | The assistant: the bar, the ring, the sheet, the line, whatever the direction chose — the way it shows that it is listening, thinking or speaking. | The appearance is visible in a PNG in both its idle and its speaking state, written with its size, its position and its transition, and it does not use a chat-bubble layout (the pattern the contract forbids). |

Three further rules make the signature real rather than decorative:

| ID | The rule | How it is checked |
|---|---|---|
| REVIEW-S4 | Not a decoration | A signature moment that is only a colour change, a fade, a scale or a burst of confetti is a FAIL. It has to be a designed behaviour that changes what the driver sees, feels or hears. |
| REVIEW-S5 | It is different | The three moments must differ from the three of every other direction in the round. The QA lead compares the fingerprint table (in `docs/design/SPEC.md` §10) and a repeated signature is a FAIL for the second direction. |
| REVIEW-S6 | It is consistent | The signature moment appears in the same form wherever it occurs: the confirm behaviour on the Today screen is the same behaviour as on the Driving screen. |

---

## 4. The score

Every direction is scored out of 100. A criterion scores the share of its weight that the
measurement supports; the share is a number, not an opinion.

| Criterion | Weight | Scored from | The measurement that decides it |
|---|---|---|---|
| The signature moment | 15 | REVIEW-S1 to S6 | The three moments implemented, distinct and consistent (a blocker on top of this score) |
| The anti-AI look | 15 | REVIEW-A1 to A15 | The fifteen answers in the sheet (a blocker on top of this score) |
| The glance while driving | 15 | REVIEW-C1 to C7, plus the ergonomics in `docs/design/UX.md` | The target sizes in the PNG at 1:1, the position of the primary action, the tap count of the flow, the word count of the driving prompts |
| The accessibility | 10 | REVIEW-B2, REVIEW-D1 to D6, REVIEW-G1 to G7 | The measured contrast pairs, the label list, the 200 per cent PNG, the night PNGs |
| The motion and the interaction | 10 | REVIEW-E1 to E8, REVIEW-H1 to H5, REVIEW-I1 to I6 | The durations in the video against the table, the haptic map, the sound map, the frame trace |
| The map and the 3D | 8 | REVIEW-F1 to F9 | The pitch, the bearing and the zoom in the video, the style in the palette, the offline state in the PNG |
| The brand mark and the identity | 8 | The brand board, the fingerprint row | The mark at its minimum size, the palette measured, the naming rules held |
| The type craft | 6 | REVIEW-B1 to B7 | The steps used, the weights on a screen, the line heights, the tabular figures |
| The colour craft | 5 | REVIEW-D, REVIEW-A1, A5, A15 | The measured pairs, the accent in daylight, the number of chromatic colours |
| The icons and the illustration | 4 | REVIEW-A10, A12, REVIEW-K2 | One set, one weight, the custom glyphs on the grid, no emoji |
| The copy and the content | 4 | REVIEW-L1 to L6 | The word counts, the spelling, the consistency between the four screens, no emoji |
| **Total** | **100** | | |

The verdict:

| Total | Verdict |
|---|---|
| 85 or more | PASS, and it goes to the top of the founder's pack |
| 70 to 84 | PASS, with the conditions listed in the sheet |
| Below 70 | FAIL: the direction is out of the round |

A blocker overrides the total. A direction with a blocker is out of the round whatever it scores.

---

## 5. The round

1. The team delivers the package into the QA queue.
2. The QA lead checks the package is complete. An incomplete package returns to the team and does
   not consume a review slot.
3. The QA lead reviews, writes the sheet and the verdict, and the five signatures.
4. A direction with FAILs may be repaired **once**. The team resubmits the package with the
   changes listed. The QA lead re-reviews the failed criteria only.
5. A second FAIL, or a second blocker, removes the direction from the round.
6. The sheets and the sign-off sheets go to the director for the founder's pack.

---

## 6. The blocker list

A direction is out of the round, with the sheet recording the rule and the measurement, when any
of these is true:

| ID | The blocker |
|---|---|
| REVIEW-X1 | Any of the fifteen anti-AI rules fails (REVIEW-A1 to A15). |
| REVIEW-X2 | One of the three signature moments is missing, decorative or repeated from another direction (REVIEW-S1, S2, S3, S4, S5). |
| REVIEW-X3 | A contrast pair is below its bar (REVIEW-D1, D2, D3, D5). |
| REVIEW-X4 | The frame trace is missing, or the driving screen drops a frame over 16.7 ms (REVIEW-E7). |
| REVIEW-X5 | A licence row is missing for a font, an icon set, a sound or an asset (REVIEW-K1 to K6). |
| REVIEW-X6 | An emoji appears anywhere in the direction (REVIEW-A12, REVIEW-L6). |
| REVIEW-X7 | The four screens or the eight PNGs are missing, or a screen is a picture instead of a real screen in the lab. |
| REVIEW-X8 | The fingerprint row is missing, or two directions share the same structural grammar (REVIEW-S5). |
| REVIEW-X9 | The direction contains a screen of the product other than the four of the spec (the rule that no final screen is built before the pick). |

---

## 7. The score sheet

The QA lead copies this into `docs/design/evidence/design-2/<n>-<name>-review.md` and fills it in.

```
# Review — <n> <name>

Direction: <n>-<name> | Reviewer: <seat> | Date: <date> | Round: <round>

## The verdict
Score: <n>/100 | Verdict: PASS | FAIL | BLOCKED
Repair round: <first | second>

## The criteria
| Criterion | Weight | Score | The measurement | The rule |
|---|---|---|---|---|
| The signature moment | 15 | | | |
| The anti-AI look | 15 | | | |
| ... | | | | |
| **Total** | **100** | | | |

## The anti-AI checklist
| ID | The rule | PASS or FAIL | The measurement |
|---|---|---|---|
| REVIEW-A1 | No neon accent on black | | |
| ... | | | |

## The blockers found
| ID | The rule | The measurement | The state before the repair |
|---|---|---|---|

## The FAILs (repairable)
| ID | The rule | What is wrong | What must change |
|---|---|---|---|

## The five signatures
| Check | Seat | Date | Evidence |
|---|---|---|---|
| The anti-AI rules | | | |
| WCAG 2.2 AA | | | |
| The driving ergonomics | | | |
| 60 and 120 frames a second | | | |
| The licence ledger | | | |

## The notes
<one paragraph: what is strong, what is weak, what the direction would need to be the product>
```

---

## 8. Where the numbers come from

Every number in a sheet has a source. If the source does not exist, the number does not count
and the criterion scores zero.

| The number | The source |
|---|---|
| The contrast pairs | `packages/design-tokens/src/contrast.ts`, printed by `pnpm --filter @courier/design-tokens contrast:report`, one case per pair per theme in `contrast.test.ts`. |
| The target sizes and the positions | The PNG at 1:1, measured on the image; the mobile viewport is 390 by 844. |
| The word counts | The copy of the direction, counted word by word. |
| The durations | The video, frame by frame, against the table in `docs/design/MOTION.md`. |
| The pitch, the bearing and the zoom | The values logged by the lab route, written into the sheet by the team and checked against the video. |
| The frame times | The trace from the CI emulator, in the folder as `evidence/fps-<n>.txt`. |
| The licences | `docs/LICENSES.md`, one row per font, icon set, sound and asset. |
| The gesture and the tap count | The flow in `docs/design/UX.md`, counted against the lab route. |
| The emoji | The existing test in the app; the sheet records the run of the test. |

## 9. The rule the QA lead enforces over the whole round

Two directions that look the same are a round of one. Before the founder's pack is assembled, the
QA lead publishes the fingerprint table of the ten directions (in `docs/design/SPEC.md` §10) and
checks it:

- No two directions share the same layout grammar.
- No two directions share the same accent family.
- No two directions share both type families.
- No two directions share the same motion character.
- No two directions share the same map treatment.

Two directions that break one of these are compared one against the other and the weaker one is
dropped, whatever its score. The founder gets ten genuinely different directions, not ten
variations.

## 10. The short version (what the QA lead checks first)

1. The anti-AI rules, fifteen lines, each with a measurement. Any FAIL is out.
2. The three signature moments: implemented, distinct, consistent. Any missing is out.
3. The contrast, measured. The frame trace, present.
4. The licences, complete.
5. The four screens, the eight PNGs, the video: present.
6. Then the score, criterion by criterion, out of 100.

