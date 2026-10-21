# The three directions — what the founder is choosing between

**MASTER_EXECUTION §13.3 (the Design Studio). Read this with `docs/design/RESEARCH.md` and
`docs/design/BENCH.md`.**

**Date: 2026-10-22.** Each direction is a **real screen of the app**, not a picture of one:
three routes under `/design`, three themes in the token package, three type scales in
`packages/design-tokens/src/directions.ts`, and twenty tests in
`apps/mobile/app/design/__tests__/directions.test.tsx`.

| Direction | Route              | Screen                                     | Render                                   | Theme                     |
| --------- | ------------------ | ------------------------------------------ | ---------------------------------------- | ------------------------- |
| **A**     | `/design/roadbook` | `apps/mobile/src/design/RoadbookToday.tsx` | `docs/design/directions/a-roadbook.html` | `roadbook` in `themes.ts` |
| **B**     | `/design/beacon`   | `apps/mobile/src/design/BeaconToday.tsx`   | `docs/design/directions/b-beacon.html`   | `beacon` in `themes.ts`   |
| **C**     | `/design/freight`  | `apps/mobile/src/design/FreightToday.tsx`  | `docs/design/directions/c-freight.html`  | `freight` in `themes.ts`  |

**The founder picks one (A, B or C).** The entry is in `docs/FOUNDER_TODO.md`. The work carries
on either way — the screen inventory of §13.5 is the next step.

---

## 0. What is the same in all three, and what is not

**The same — the contract (`docs/design/SYSTEM.md`), which no direction may break:**

- the content of the day's list (the run name, the number of stops left, the delivered count,
  the next stop with the address, the suburb and the ETA, the door note, the voice state) —
  the content inventory of `docs/design/mockups/today.md`;
- one primary action of 72 pt, every other target 56 pt or more, body text never below 17 pt;
- the contrast bars: 4.5:1 for the body, 7:1 for the driving text, 3:1 for a boundary;
- the status is never colour-only — every row carries its word;
- "reduce motion" makes the movement instant, it never removes it;
- one icon set (Material Symbols, weight 500), **no emoji, ever**;
- plain NZ English, voice prompts of at most eight words while driving;
- **the day is the default.** All three are light palettes; the night theme stays as the
  adapted option for driving after dark, and the token test fails a direction that is not a
  light palette.

**Not the same — and this is the point.** The three directions are three different _answers_
to the same question, not three colours of one answer:

|                         | A — Roadbook                                       | B — Beacon                            | C — Freight                                              |
| ----------------------- | -------------------------------------------------- | ------------------------------------- | -------------------------------------------------------- |
| The question it answers | "What is the state of the run?"                    | "What do I do next?"                  | "Who am I working for today?"                            |
| The density             | Dense and operational                              | Calm and glanceable                   | Expressive and branded                                   |
| The layout              | A ledger: columns, rules, eight rows on one screen | One thing at a time, a lot of space   | An asymmetric label: a band, a block of colour, a number |
| The surfaces            | Hairline rules, **no cards**                       | Space instead of borders              | Hard blocks of ink and colour, corners of 0-2 px         |
| The number              | 48 px, the first thing in the ledger               | 76 px, the whole screen               | 64 px, inside an orange block                            |
| The accent              | Kraft amber `#8A4B00`                              | Sea teal `#0B5A61`                    | Highway orange `#B03A0A`                                 |
| The movement            | A 150 ms fade, the ledger settles                  | A 200 ms rise, the next stop comes up | A 150 ms wipe, the manifest band is drawn across         |
| The voice bar           | A ruled strip under the ledger                     | A quiet pill                          | An ink block with an orange square                       |

---

## A — Roadbook (dense and operational)

### The idea

The courier's paper run sheet, on the phone: warm paper, black ink, one highway-amber accent
and hairline rules instead of cards. Everything sits on a column grid with tabular numbers, so
the state of the whole run is readable in one pass — six stops of the run are on the screen
without scrolling.

### The type scale (Figtree, the contract's family)

| Step    | Size / line height / weight | Tracking | Where it is used                          |
| ------- | --------------------------- | -------- | ----------------------------------------- |
| metric  | 48 / 52 / 800               | -0.02 em | The number of stops left                  |
| address | 22 / 28 / 600               | -0.01 em | The address of the next stop              |
| row     | 20 / 26 / 500               | 0        | A row of the run, the clock, the ETA      |
| label   | 17 / 22 / 600               | 0.06 em  | The column heads: "NEXT STOP", "STOPS"    |
| body    | 19 / 26 / 400               | 0        | The suburb, the time and the parcel count |
| caption | 17 / 22 / 500               | 0.02 em  | The suburb of a row, the note             |
| title   | 34 / 40 / 700               | -0.02 em | The run name                              |

The metric, the ETA and the counts are **tabular** (`fontVariant: ['tabular-nums']`), so the
digits do not move when the number changes.

### The colour roles

| Role              | Value     | Measured contrast                      |
| ----------------- | --------- | -------------------------------------- |
| `background`      | `#F4F1EA` | Warm paper — the page of the run sheet |
| `surface`         | `#FFFFFF` | The white of the paper under the rule  |
| `surfaceElevated` | `#FBFAF6` | The slightly warmer sheet of the card  |
| `border`          | `#7D7869` | 3.91:1 on the paper (bar 3:1)          |
| `textPrimary`     | `#16181A` | 15.78:1 on the paper (bar 4.5:1)       |
| `textSecondary`   | `#4C5359` | 6.92:1                                 |
| `textTertiary`    | `#5C646A` | 5.34:1                                 |
| `brandPrimary`    | `#8A4B00` | 6.03:1 — the kraft amber of the accent |
| `brandSecondary`  | `#2C5E6B` | 6.37:1 — the ink blue of the map       |
| `statusDelivered` | `#14653C` | 6.30:1                                 |
| `statusFailed`    | `#A32018` | 6.70:1                                 |
| `statusSkipped`   | `#8A5A00` | 5.25:1                                 |

The full table of every token of the palette is in the comment of `roadbookTheme` in
`packages/design-tokens/src/themes.ts`, and the numbers are measured by
`packages/design-tokens/src/contrast.test.ts` — **371 tests, one per pair, per theme.**

### The spacing

| Step  | Value | Where it is used                 |
| ----- | ----- | -------------------------------- |
| gap   | 8 px  | Inside a row                     |
| pad   | 16 px | The margin of the screen         |
| row   | 56 px | The height of a row of the run   |
| block | 24 px | Between two blocks of the screen |

All four are on the 4-pt grid, and the test in `packages/design-tokens/src/directions.test.ts`
fails a direction that leaves it.

### The motion character

**The ledger settles.** The next stop fades in over 150 ms; nothing slides, nothing bounces,
nothing loops. The number changes in place. The primary action fades its fill by 12 % on the
press, 150 ms. The voice bar never moves — the state changes with a word and a colour. With
"reduce motion" on, every one of those becomes instant.

### The icon set

Material Symbols, weight 500, through `@expo/vector-icons` — the same set as the rest of the
app. In this direction the set is used sparingly: a cog in the header, nothing else. The
ledger does the work, not icons.

### The accessibility notes

- The metric is a heading, read as "18 stops left".
- Every row is a button whose label is one sentence: "Stop 45, 14 Harewood Road, Papanui,
  Next".
- The status word is on the row, so the status is never colour-only.
- The focus order is the reading order: the number, the next stop, the action, the voice bar.
- At 200 % text the metric drops to 48 px and the rows grow; nothing is clipped and nothing is
  cut with an ellipsis.
- The rules are 1 px and 3.91:1, so the boundary of the ledger is visible to a driver with low
  vision.

### The anti-"AI look" checklist (§13.2)

| Rule                             | How this direction passes it                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| No neon accent on black          | The paper is warm white; the accent is a matte kraft amber. There is no black background in this direction at all. |
| No glow or bloom                 | No shadow, no glow, no blur. The elevation is one hairline rule.                                                   |
| No glassmorphism                 | No translucent surface anywhere.                                                                                   |
| No pulsing orbs                  | The voice bar dot is static.                                                                                       |
| No purple/blue gradients         | There is no gradient in the direction; the palette has one accent and a warm neutral.                              |
| No sparkle icons                 | Material Symbols, weight 500, one cog.                                                                             |
| No generic rounded cards stacked | **There is no card in this direction.** The ledger is rules and columns.                                           |
| No centred hero card             | The metric is on the left of a two-column ledger; the action is at the bottom, in the thumb's reach.               |
| No dark mode by default          | The paper is the identity; the night theme stays as the adapted option.                                            |
| No stock iconography             | One set, one weight.                                                                                               |
| No filler copy                   | Real addresses, real suburbs, real times.                                                                          |
| No emoji                         | None, and the test fails if one appears in the tree.                                                               |

---

## B — Beacon (calm and glanceable)

### The idea

One thing at a time: the number of stops left, then the address of the next stop, then the
one action. The space between the blocks does the work that borders do in a dense layout, and
the driver reads the screen in one glance while the van is moving.

### The type scale

| Step    | Size / line height / weight | Tracking | Where it is used                            |
| ------- | --------------------------- | -------- | ------------------------------------------- |
| metric  | 76 / 80 / 700               | -0.03 em | The number of stops left — the whole screen |
| address | 34 / 42 / 600               | -0.02 em | The address of the next stop                |
| row     | 24 / 32 / 500               | 0        | The three stops after the next one          |
| label   | 17 / 22 / 600               | 0.08 em  | "NEXT STOP", "STOPS LEFT"                   |
| body    | 20 / 28 / 400               | 0        | The suburb and the time                     |
| caption | 17 / 24 / 500               | 0.02 em  | The time of a row, the note                 |
| title   | 24 / 30 / 600               | 0        | The run name — quiet on purpose             |

The metric is the largest number the contract allows (76 pt) and it is the only thing on the
screen that is that big.

### The colour roles

| Role              | Value     | Measured contrast                   |
| ----------------- | --------- | ----------------------------------- |
| `background`      | `#EDF1F2` | The cool paper of the daylight      |
| `surface`         | `#FFFFFF` | The white of the voice pill         |
| `surfaceElevated` | `#F7FAFA` | The quietest surface in the system  |
| `border`          | `#6E7A80` | 3.88:1 on the background (bar 3:1)  |
| `textPrimary`     | `#111A1C` | 15.54:1 (bar 4.5:1)                 |
| `textSecondary`   | `#4A5A5E` | 6.33:1                              |
| `textTertiary`    | `#586A6E` | 4.99:1                              |
| `brandPrimary`    | `#0B5A61` | 6.97:1 — the sea teal of the accent |
| `brandSecondary`  | `#2E6F4E` | 5.28:1 — the green of the map       |
| `statusDelivered` | `#12603C` | 6.68:1                              |
| `statusFailed`    | `#A11F17` | 6.78:1                              |

### The spacing

| Step  | Value | Where it is used                           |
| ----- | ----- | ------------------------------------------ |
| gap   | 16 px | Inside a row, between two words            |
| pad   | 24 px | The margin of the screen                   |
| row   | 72 px | A row of the run — the tallest in the pool |
| block | 32 px | Between two blocks of the screen           |

### The motion character

**The beacon comes up.** The next stop rises into place over 200 ms, and the number is
already there when the screen opens. Nothing else moves. With "reduce motion" on, the rise
becomes instant — the content still arrives, it simply does not travel.

### The icon set

Material Symbols, weight 500: the cog in the header and a chevron on each row of the run. The
chevron is the only affordance that says "this opens something", and it is the same chevron
in every direction of the app.

### The accessibility notes

- The metric is a heading, read as "18 stops left".
- The rows are buttons with a one-sentence label, and the chevron is hidden from the screen
  reader (it is decoration; the label carries the meaning).
- The status word travels with the time in the caption line: "Merivale · 10:49 · Pending".
- The biggest number on the screen is the one the driver needs first, and it is the one the
  screen reader reads first as well.
- 72 pt rows: the floor is 56 pt and this direction is 29 % above it, because the rows are the
  only targets on a screen with no other control.
- At 200 % text the metric is the step that gives way (76 → 48 px), and the address wraps to
  three lines. Nothing is clipped.

### The anti-"AI look" checklist (§13.2)

| Rule                             | How this direction passes it                                                  |
| -------------------------------- | ----------------------------------------------------------------------------- |
| No neon accent on black          | A deep sea teal on a cool white. The darkest thing on the screen is the text. |
| No glow or bloom                 | Nothing casts a shadow; the only depth is a 1 px border on the voice pill.    |
| No glassmorphism                 | The voice bar is an opaque white pill.                                        |
| No pulsing orbs                  | The listening dot is a static 10 px circle.                                   |
| No purple/blue gradients         | No gradient; a teal accent and a neutral ramp.                                |
| No sparkle icons                 | Material Symbols, weight 500.                                                 |
| No generic rounded cards stacked | No cards: the screen is type and space, with one pill.                        |
| No centred hero card             | The metric is a column on the left of the screen, not a centred card.         |
| No dark mode by default          | The light palette is the identity.                                            |
| No stock iconography             | One set.                                                                      |
| No filler copy                   | Real content.                                                                 |
| No emoji                         | None, and tested.                                                             |

---

## C — Freight (expressive and branded)

### The idea

The parcel label: hard corners, a kraft tint, a deep highway orange and a lot of black type,
with the brand in one band at the top and one oversized number. The layout is deliberately
asymmetric — the number sits in a block of orange on the left and the address beside it — so
the screen looks like the thing the courier is holding, not like a dashboard.

### The type scale

| Step    | Size / line height / weight | Tracking | Where it is used                       |
| ------- | --------------------------- | -------- | -------------------------------------- |
| metric  | 64 / 64 / 800               | -0.04 em | The number inside the orange block     |
| address | 28 / 34 / 700               | -0.01 em | The address of the next stop           |
| row     | 22 / 28 / 600               | 0.02 em  | A row of the run                       |
| label   | 17 / 20 / 700               | 0.12 em  | The brand, "NEXT STOP", the band       |
| body    | 20 / 28 / 500               | 0        | The suburb, the time, the parcel count |
| caption | 17 / 22 / 600               | 0.04 em  | The status of a row                    |
| title   | 34 / 38 / 800               | -0.02 em | The run name, in capitals              |

### The colour roles

| Role              | Value     | Measured contrast                          |
| ----------------- | --------- | ------------------------------------------ |
| `background`      | `#FFFFFF` | The white of the label                     |
| `surface`         | `#FFFFFF` | The same white                             |
| `surfaceElevated` | `#F7F3ED` | The kraft tint of the parcel               |
| `border`          | `#7A7F87` | 4.03:1 (bar 3:1)                           |
| `textPrimary`     | `#0F1113` | 18.92:1 — the black of the print           |
| `textSecondary`   | `#4A4F55` | 8.27:1                                     |
| `textTertiary`    | `#5B6169` | 6.25:1                                     |
| `brandPrimary`    | `#B03A0A` | 6.08:1 — the highway orange                |
| `brandSecondary`  | `#7C2D12` | 9.37:1 — the burnt edge of the same orange |
| `statusDelivered` | `#166534` | 7.13:1                                     |
| `statusFailed`    | `#B91C1C` | 6.47:1                                     |

The orange is the whole brand, so it is the one colour that had to be dark enough to be text:
`#C2410C` was the first choice and it failed the badge contrast at 4.31:1, so the palette
uses `#B03A0A` instead.

### The spacing

| Step  | Value | Where it is used                 |
| ----- | ----- | -------------------------------- |
| gap   | 8 px  | Between the blocks of the run    |
| pad   | 16 px | The margin of the screen         |
| row   | 64 px | A row of the run                 |
| block | 24 px | Between two blocks of the screen |

### The motion character

**The stamp.** The band and the next stop are drawn across the screen in 150 ms — a wipe, not
a slide. Nothing bounces, nothing loops, and the number is already in place when the screen
opens. With "reduce motion" on, the wipe becomes instant.

### The icon set

Material Symbols, weight 500 — the cog in the band, and nothing else. The orange square next
to the wordmark is a rectangle, not an icon: it is the shape of a printed mark, and it is the
only mark in the product that is not a glyph.

### The accessibility notes

- The metric is a heading, read as "18 stops left".
- The rows are buttons; the block with the stop number carries the number **and** the word of
  the status next to it, so the state is never colour-only.
- The band is ink on white at 18.92:1 and white on ink at 21:1: the highest contrast of the
  three directions.
- The corners are 0-2 px, which makes the blocks look like print and also makes their edges
  unambiguous — a 2 px edge at 4.03:1 is a real boundary for a driver with low vision.
- At 200 % text the orange block grows with the number; the label inside the band wraps to
  two lines instead of clipping.

### The anti-"AI look" checklist (§13.2)

| Rule                             | How this direction passes it                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No neon accent on black          | The accent is a **matte** highway orange (`#B03A0A`, 6.08:1 on white) and it sits on white, not on black. The ink band carries the brand, and nothing glows on it. |
| No glow or bloom                 | No shadow, no glow. The band is a flat block of ink.                                                                                                               |
| No glassmorphism                 | No translucent surface.                                                                                                                                            |
| No pulsing orbs                  | The listening square is a static 12 px block.                                                                                                                      |
| No purple/blue gradients         | No gradient at all: ink, kraft, white and one orange.                                                                                                              |
| No sparkle icons                 | Material Symbols, weight 500, one cog.                                                                                                                             |
| No generic rounded cards stacked | The corners are 0-2 px and the blocks are of different kinds — a band, a square, a row. No two surfaces are the same shape.                                        |
| No centred hero card             | The layout is asymmetric: a square on the left, text on the right.                                                                                                 |
| No dark mode by default          | The label is white with an ink band; the default theme is light.                                                                                                   |
| No stock iconography             | One set. The one mark that is not a glyph is a rectangle.                                                                                                          |
| No filler copy                   | Real content.                                                                                                                                                      |
| No emoji                         | None, and tested.                                                                                                                                                  |

---

## 4. The night theme, and the other states

The night theme is **not** a direction: it is the adapted option of the chosen direction, and
it stays as it is today (`#0E1418`, never pure black, low blue, the address and the distance
the only bright things). It is not part of the founder's choice, and §13.2 says "no dark mode
by default" — which is why all three directions are light.

The seven states of `docs/design/SYSTEM.md` §4 (loading, empty, error, offline, partial sync,
permission denied, long list) apply to all three directions and are not part of the choice.

## 5. What happens after the pick

1. The chosen direction becomes the theme of the app: its palette is promoted to `day`, its
   type scale to the token scale, and the screens of `docs/design/mockups/` are built in it.
2. The screen inventory of §13.5 (welcome, sign-in, onboarding, today, driving 2D/3D, Copilot
   voice, dictation, scanner, POD, route and templates, end of day and earnings, settings, map
   modes, downloads, team and dispatcher web) is written in the same way these three screens
   were: the content inventory first, then the direction.
3. The visual-regression baselines and the screen videos come from the emulator run, day and
   night, small and large phone, 200 % text.
