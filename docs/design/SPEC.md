# SPEC — what every direction must satisfy

**Owner:** the Product Design Lead (team 2), countersigned by the Design Studio director.
**Binding:** MASTER_EXECUTION §13.2, §13.3, §13.6, §8.1 and V4 §5, with `docs/design/SYSTEM.md`
as the design contract.
**Why it exists:** so that the ten directions are comparable. Each direction answers the same
brief, shows the same content and obeys the same rules; what differs is the answer, not the
question.

Rule IDs in this file are `SPEC-nn`.

---

## 1. Precedence

| Rank | The document | What it settles |
|---|---|---|
| 1 | MASTER_EXECUTION §13 and §7 | The founder's directives and the approval gates |
| 2 | This file | The brief every direction answers |
| 3 | `docs/design/SYSTEM.md` | The contract: tokens, states, motion, accessibility, copy, icons |
| 4 | `docs/design/REVIEW.md` | How the direction is scored and what blocks it |
| 5 | The direction's own sheet | Everything the direction is free to decide |

A direction may not break anything above its own sheet. Where a direction needs a different rule
from the contract, it asks for a change to the contract, in writing, and the change is made in
the contract for everyone — not in one direction.

---

## 2. The product in one paragraph

Courier Copilot is a voice-first app for independent parcel couriers in Christchurch and
Canterbury. A courier runs a fixed delivery day from a phone in a van: sometimes alone, sometimes
in a shared vehicle, in daylight, in rain, and after dark. The app holds the run, the map, the
scanner and the assistant; the driver drives. Everything that can be said, can be said. Everything
that must be seen, is readable in one glance. It works with no network, and it looks like a
product of 2026 — deliberate, quick, alive — not a template.

---

## 3. The four screens (SPEC-1)

Every direction builds these four screens, in light and in night, as real screens in the app.
Not four of eleven: the four that decide the product. The route is
`/design-2/<n>-<name>`, and the four screens are the four tabs of it, in this order.

| # | The screen | The screen of the lab route | The job, in one sentence | The states it must show |
|---|---|---|---|---|
| 1 | **Today** | `today` | Show the state of the run and the next stop, and get the driver moving in one action. | Loading, empty, error, offline, partial sync, long list |
| 2 | **Driving** | `driving` | Guide the driver on the map to the next stop, with the address readable at a glance. | Loading, error, offline, permission denied (location) |
| 3 | **Copilot voice** | `copilot` | Show what the assistant is doing and what it last said, and let the driver control the run by voice. | Listening, thinking, speaking, offline, muted, error |
| 4 | **Scanner** | `scanner` | Read the address off a label and confirm it in one action. | Loading, error, permission denied (camera), low confidence |

### 3.1 What each screen must show (SPEC-2)

The content inventory comes from the approved mockups in `docs/design/mockups/` — the content
only, never the rejected look. Every item below must be visible on the screen.

**Today**

| The item | The rule |
|---|---|
| The run name | The name of the day's run, as it is called on the manifest |
| The stops remaining | The largest number on the screen: 48 to 76 px, tabular |
| The delivered count | With the word, not as a colour |
| The next stop | The address, the suburb, the ETA and the distance |
| The door note | The note on the door (gate code, dog, side gate), when there is one |
| The voice state | The state of the assistant, in words |
| The primary action | One action, 72 pt or more: "Next stop" |

**Driving**

| The item | The rule |
|---|---|
| The map | The route to the next stop, in the direction's own style |
| The next address | Readable in one glance, 7:1 against whatever is behind it |
| The distance and the ETA | One line, no scroll needed |
| The door note | With the parcel position in the van when it is known |
| The primary action | One action, 72 pt or more, in the lower third |
| The voice state | The state of the assistant, in words |
| The offline chip | When the map or the sync is not live |

**Copilot voice**

| The item | The rule |
|---|---|
| The state | Idle, listening, thinking, speaking, offline, muted or error — in words, never colour alone |
| The last thing said | The line the assistant said, in full |
| The intent | What the app understood, when the driver spoke an action (for example "delivered") |
| The control | One control to talk: the voice bar or the equivalent in the direction's language |
| The confirmation | How a spoken action is confirmed — this is the direction's signature moment (REVIEW-S1) |

**Scanner**

| The item | The rule |
|---|---|
| The camera view | The live view with the label in it |
| The crop guide | Where the app is reading |
| The detected block | The address block it found, shown |
| The confidence | In words or in a labelled form, never a bare percentage |
| The action | Confirm or correct, with the corrected address ready to edit |
| The offline state | The scan works with no network |

### 3.2 The content is real (SPEC-3)

The addresses, suburbs, times and names are real Christchurch content and consistent across the
four screens: the next stop on Today is the next stop on Driving, with the same number, the same
ETA and the same note. No placeholder, no "Lorem", no "Address line 1".

---

## 4. Light and night (SPEC-4)

| The rule | The detail |
|---|---|
| Light is the default | The direction's identity is its light palette. Night is the adapted option for driving after dark, switched automatically at sunset and by hand (MASTER_EXECUTION §13.3). |
| The night is a re-think | The night theme is not the light theme with a filter. Its background sits between #0A0A0A and #121212, the text is never pure white, and the blue channel of the background is 26 or less. |
| The map switches with it | The map style changes in the same moment as the palette. There is no frame where one is night and the other is day. |
| The priority at night | The address and the distance are the only bright things on the driving screen. |

---

## 5. The states every screen has (SPEC-5)

Every screen of the product, and therefore every screen of a direction, covers the seven states of
`docs/design/SYSTEM.md` §4. The rules that apply:

| The state | The rule |
|---|---|
| Loading | A skeleton, never a spinner for more than 300 ms |
| Empty | It says what is missing and what to do next |
| Error | One plain sentence and a recovery action |
| Offline | A chip with the number of queued actions, never a blocking dialog |
| Partial sync | The same chip, with "retry" |
| Permission denied | One line, with the system setting as the next step |
| Long list | 300 stops without a frame drop |

A direction that shows a state as an afterthought is a FAIL on REVIEW-J.

---

## 6. The motion language (SPEC-6)

The rules every direction obeys, whichever character it chooses:

| The rule | The detail |
|---|---|
| Four movements | Enter, confirm, complete, dismiss. Each has a duration and an easing in `docs/design/MOTION.md`. |
| The window | 150 to 250 ms for the UI transitions; spring physics for the sheets; nothing on the driving path over 400 ms. |
| The thread | Reanimated 4 on the UI thread; Skia or Rive where a shader or a vector performance is needed. |
| The reduced motion | Every movement has an instant variant. It is never removed. |
| The meaning | Every movement has a purpose written next to it. Decoration does not ship. |
| The haptics | On confirm, on delivered and on error. Never on scroll. |
| The sound | One earcon per event, 250 ms or less, below the voice, and it yields to calls. |
| The frames | 60 frames a second, 120 where the device allows; measured on the CI emulator, with the trace in the package. |

What each direction decides for itself: the character of the movement, the signature moments
(REVIEW-S1 to S3), and the sound and haptic vocabulary of its own.

---

## 7. The map (SPEC-7)

| The rule | The detail |
|---|---|
| The engine | MapLibre, with the Canterbury PMTiles pack for offline use |
| The modes | 2D (the default), 3D, satellite (online only, with a licence row) and auto (3D in town, 2D when rural or low on battery) — MASTER_EXECUTION §11 |
| The style | The style of the direction: the road colours, the label colours and the building treatment come from the direction's tokens, not from a stock style |
| The night | A separate night style, switched with the palette |
| The 3D buildings | The LINZ building outlines and the OSM heights, extruded in the direction's treatment, with the attribution on the screen |
| The camera | The pitch, the bearing, the zoom and the follow distance are written in `docs/design/MAP.md` and inside the ranges in REVIEW-F |
| The offline | The missing-tile state is drawn. The driver never sees a blank grid. |
| The driver wins | The camera never rotates while the driver is reading the address, and the next address keeps its contrast over the map. |

---

## 8. The brand mark (SPEC-8)

| The rule | The detail |
|---|---|
| The mark exists | Every direction carries the name mark of the studio, drawn in that direction's character, or a marked variant of it. A direction with no mark is incomplete. |
| The minimum size | 16 px, and it must be legible there. The direction states the minimum size it uses. |
| The one-colour form | It has a one-colour form for the app icon and the map attribution. |
| The colour | The mark uses the direction's accent or its ink, and never a colour outside the palette. |
| The licence | Every family and every asset of the direction has a row in `docs/product/LICENSES.md`. |
| The misuse | The direction's sheet lists at least three misuses it avoids. |

---

## 9. The package of a direction (SPEC-9)

The folder of a direction is `docs/design/directions-2/<n>-<name>/`. The number is the order of
submission, from 01 to 10. The name is two or three words, lower case, joined with hyphens, and
it is not one of the three rejected names.

```
docs/design/directions-2/<n>-<name>/
  README.md                 the sheet: the idea, the fingerprint, the mark, the palette,
                            the type pairing, the motion character, the map style, the three
                            signature moments, the anti-AI checklist, the licences
  spec.md                   the screen-by-screen spec: the content, the states, the motion,
                            the copy, the accessibility notes, the testIDs
  brand.svg                 the name mark of the direction
  palette.json              the semantic palette with the measured contrast of every pair
  type.json                 the type scale: the seven steps with the sizes, weights and tracking
  render.html               the static render of the four screens (the browser view)
  screens/
    01-today-light.png      390 by 844
    01-today-night.png      390 by 844
    02-driving-light.png    390 by 844
    02-driving-night.png    390 by 844
    03-copilot-light.png    390 by 844
    03-copilot-night.png    390 by 844
    04-scanner-light.png    390 by 844
    04-scanner-night.png    390 by 844
  video/
    <n>-<name>.mp4          the four screens in motion, at most 60 seconds
  evidence/
    fps-<n>.txt             the frame trace from the CI emulator
    contrast.txt            the contrast report of the palette
    licences.md             the licence rows of this direction
```

The rules of the layout:

- The eight PNGs are named exactly as above, at 390 by 844, and they are screenshots of the lab
  route — not exports of a design tool.
- The video is the emulator recording of the lab route, at most 60 seconds, showing the four
  screens in order, with the transitions and the signature moments.
- The evidence folder holds the three files every direction carries. A direction without them is
  not ready for the QA queue.
- The direction's route in the app is `/design-2/<n>-<name>`, and it is excluded from the release
  build, as the old lab route is (MASTER_EXECUTION §16.7).
- The direction's theme is added to the token package under its own name, using the same semantic
  roles as the day and night themes.

### 9.1 The naming (SPEC-10)

| The thing | The rule |
|---|---|
| The folder | `<n>-<name>`, the number in two digits, the name in lower case with hyphens |
| The name | Two or three words, in English, that name the idea rather than the mood. Not "roadbook", "beacon" or "freight" (the rejected three), and not a word that describes a feeling. |
| The route | `/design-2/<n>-<name>` |
| The theme | The name, in the token package, under the shared semantic roles |
| The sheet | `README.md`, with the headings in §9 |
| No emoji, ever | In the folder, the file names or the sheets |

---

## 10. The identity fingerprint (SPEC-11)

Every direction declares these ten fields. They make the directions comparable, and they are the
fields the QA lead compares between the ten (REVIEW-S5, `docs/design/REVIEW.md` §9).

| # | The field | What it holds |
|---|---|---|
| 1 | The accent | The accent colour, its hex, its name, and the measured contrast as text on the background |
| 2 | The second chromatic colour | The other chromatic non-neutral colour of the palette, with its hex |
| 3 | The type pairing | The display family and the text family, with the licence rows |
| 4 | The density | Comfortable, compact or dense, and the number of stops visible on Today at 390 by 844 |
| 5 | The layout grammar | The column, the centred axis, the asymmetric block or the full-bleed map, and the rule that governs it |
| 6 | The motion character | The name of the characteristic movement, its duration and its easing |
| 7 | The map treatment | The basemap family and the 3D treatment |
| 8 | The icon treatment | The weight, the custom glyphs and the rule that distinguishes the states |
| 9 | The night rule | How the palette changes after dark, in one sentence |
| 10 | The three signature moments | The delivery confirmation, the map movement, the appearance of Copilot, one line each |

The comparison rule: **no two directions may share the same layout grammar, the same accent
family, both type families, the same motion character or the same map treatment** (`REVIEW.md`
§9). Inside a pair (the pairs are in `docs/design/PLAN.md`), the two directions must differ on at
least four of the ten fields.

---

## 11. The rules that are the same in all ten (SPEC-12)

Taken from `docs/design/SYSTEM.md` and MASTER_EXECUTION §13.2, and repeated here so a direction
can be read on its own:

1. Light is the default; the night theme is the adapted option.
2. One primary action per screen, 72 pt; every other target 56 pt or more.
3. Body text 17 pt or more; the key number 48 to 76 px; the address 22 pt or more.
4. Contrast: 4.5:1 for the body, 3:1 for the boundaries, 7:1 for the driving text.
5. The status is never colour alone; every state carries its word.
6. The motion is 150 to 250 ms, on the UI thread, and it respects the reduced-motion setting.
7. One icon set, one weight, no emoji.
8. Plain New Zealand English; the driving prompts are eight words or fewer; the word "AI" appears
   nowhere in the product.
9. Every interactive element has a role and a label; the text survives 200 per cent.
10. The tokens come from the token package; no raw values in a component.
11. No neon on black, no glow, no glass, no pulsing orbs, no purple-to-blue gradients, no
    stacked cards, no centred hero, no stock icons without a system, no filler copy.
12. No paper or ledger retro look, no flat bootstrap-like lists, no single-accent-on-grey
    template.
13. Every direction has a strong signature moment, and it is implemented.
14. No final screen of the product is built before the founder picks (MASTER_EXECUTION §13.6).
