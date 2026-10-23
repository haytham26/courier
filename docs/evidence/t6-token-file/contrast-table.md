# The D33 contrast table — T6 slice 1 (2026-10-23)

Generated from the built token file (`packages/design-tokens/dist/chosen.js`) with the
same maths as the gate test `packages/design-tokens/src/__tests__/chosen-contrast.test.ts`
(the hex compositing, the WCAG 2.2 relative luminance and the worst-case glass envelopes
of `glass.fillsBySurface`). The test, not this table, is the gate; this table is the
documentary form of the same numbers.

Bars (D33 / MASTER_EXECUTION §13.9): **3:1** large text only (24 px regular, 18.66 px bold;
the button labels are 18 px bold), **4.5:1** all other text, **7:1** everything on the
driving screen. Transparent colours and surfaces are composited before the ratio; a glass
record is the minimum over its fill envelope and the four map colours of the mode.

48 asserted pairs, 0 failures.

| mode | text | surface | ratio | bar | why |
|---|---|---|---|---|---|
| light | `label` | `glassSheet` | 19.78 | 7:1 driving | the stop sheet: the name, the address |
| light | `secondaryLabel` | `glassSheet` | 7.68 | 7:1 driving | the stop sheet: the caps label, the contact, the time |
| light | `successText` | `glassSheet` | 8.58 | 7:1 driving | the "2 min" of the next window (green text darkened) |
| light | `onTurnCard` | `turnCard` | 12.89 | 7:1 driving | the distance and the street on the turn card |
| light | `onTurnStrip` | `turnStrip` | 11.89 | 7:1 driving | the Then strip |
| light | `onSuccess` | `success` | 9.46 | 7:1 driving | the Slide to Deliver label (black on the green) |
| light | `label` | `chipOnGlassSheet` | 17.3 | 7:1 driving | the note chips on the sheet |
| light | `label` | `card` | 21 | 7:1 driving | the next-stop pin number chip |
| light | `label` | `background` | 18.82 | 4.5:1 body | the page |
| light | `label` | `card` | 21 | 4.5:1 body | cards and lists |
| light | `onCard` | `card` | 21 | 4.5:1 body | labels on the card surfaces |
| light | `secondaryLabel` | `background` | 7.4 | 4.5:1 body | the page |
| light | `secondaryLabel` | `card` | 8.01 | 4.5:1 body | the quieter rows |
| light | `label` | `fillOnCard` | 18.27 | 4.5:1 body | the chips and the quiet buttons |
| light | `successText` | `fillOnCard` | 7.93 | 4.5:1 body | the Ready line |
| light | `accentText` | `background` | 6.21 | 4.5:1 body | the tab labels, the links |
| light | `accentText` | `card` | 6.92 | 4.5:1 body | Undo, Text customer |
| light | `onDarkGlass` | `scanOverlay` | 9.88 | 4.5:1 body | the scanner pills over the camera, worst feed |
| light | `onAccent` | `accent` | 3.93 | 3:1 large | the accent buttons are 18 px bold |
| light | `accentText` | `accentTintOnBackground` | 5.38 | 3:1 large | the ghost sign-in buttons (18 px bold) |
| light | `successText` | `card` | 9.11 | 4.5:1 body | the delivered stat (stronger than its large bar) |
| light | `danger` | `card` | 3.55 | 3:1 large | the Not-home stat, 26 px bold |
| light | `accentText` | `glassControls` | 6.14 | 4.5:1 body | the active tab label on the tab bar glass |
| light | `card` | `label` | 21 | 3:1 large | the sign-in pill: the label colour is its fill |
| dark | `label` | `glassSheet` | 16.49 | 7:1 driving | the stop sheet: the name, the address |
| dark | `secondaryLabel` | `glassSheet` | 8.37 | 7:1 driving | the stop sheet: the caps label, the contact, the time |
| dark | `successText` | `glassSheet` | 8.16 | 7:1 driving | the "2 min" of the next window (green text darkened) |
| dark | `onTurnCard` | `turnCard` | 15.31 | 7:1 driving | the distance and the street on the turn card |
| dark | `onTurnStrip` | `turnStrip` | 13.32 | 7:1 driving | the Then strip |
| dark | `onSuccess` | `success` | 10.39 | 7:1 driving | the Slide to Deliver label (black on the green) |
| dark | `label` | `chipOnGlassSheet` | 12.43 | 7:1 driving | the note chips on the sheet |
| dark | `label` | `card` | 17.01 | 7:1 driving | the next-stop pin number chip |
| dark | `label` | `background` | 21 | 4.5:1 body | the page |
| dark | `label` | `card` | 17.01 | 4.5:1 body | cards and lists |
| dark | `onCard` | `card` | 17.01 | 4.5:1 body | labels on the card surfaces |
| dark | `secondaryLabel` | `background` | 9.75 | 4.5:1 body | the page |
| dark | `secondaryLabel` | `card` | 8.54 | 4.5:1 body | the quieter rows |
| dark | `label` | `fillOnCard` | 12.76 | 4.5:1 body | the chips and the quiet buttons |
| dark | `successText` | `fillOnCard` | 6.31 | 4.5:1 body | the Ready line |
| dark | `accentText` | `background` | 7.68 | 4.5:1 body | the tab labels, the links |
| dark | `accentText` | `card` | 6.22 | 4.5:1 body | Undo, Text customer |
| dark | `onDarkGlass` | `scanOverlay` | 9.88 | 4.5:1 body | the scanner pills over the camera, worst feed |
| dark | `onAccent` | `accent` | 3.65 | 3:1 large | the accent buttons are 18 px bold |
| dark | `accentText` | `accentTintOnBackground` | 7.01 | 3:1 large | the ghost sign-in buttons (18 px bold) |
| dark | `successText` | `card` | 8.42 | 4.5:1 body | the delivered stat (stronger than its large bar) |
| dark | `danger` | `card` | 4.99 | 3:1 large | the Not-home stat, 26 px bold |
| dark | `accentText` | `glassControls` | 5.53 | 4.5:1 body | the active tab label on the tab bar glass |
| dark | `background` | `label` | 21 | 3:1 large | the sign-in pill: the label colour is its fill |

## The named D33 rules and the before values

| pair | before (the reference HTML) | after (the token file) |
|---|---|---|
| Slide to Deliver label on the green | white on #34C759 = 2.2 | black on the green: 9.46 light, 10.39 dark |
| green as text on the white card | #34C759 = 2.2 | successText #14532D = 9.11 light; #30D158 dark = 8.42 |
| accent as tab-label text on the glass | #0A7CFF = 3.9 | accentText #0857B4 = 5.6+ light, #33A1FF dark = 5.5+ |
| secondary label on the white card | rgba(60,60,67,.6) = 3.4 | rgba(60,60,67,.9) = 8.01 light; dark .75 = 8.54 |
| pin number badges white on green / red | 2.2 / 3.55 (unmeetable: black on mid-red maxes at 5.92) | the Apple Maps pattern: the number on the white card chip (label/card = 21 / 17) |
| the scanner pills over the camera | unbounded over arbitrary pixels | scrim rgba(0,0,0,.35) + onDarkGlass: 9.88 over the brightest feed (6.68 without the scrim) |
| button labels on the accent fill | 17 px / 600 (not large text: 3.93 < 4.5) | typography.button 18/700 (large text, 3:1): 3.93 light, 3.65 dark |

## The non-text registry (the recorded exclusions, no silent ones)

| colour | why it is not a text pair here |
|---|---|
| mapLand, mapRoad, mapWater, mapPark | the map canvas: the map style is imagery, not UI text |
| glass | a recipe; its text pairs are asserted through the computed glass surfaces |
| fill | a fill surface; asserted through fillOnCard and the chip-on-glass pairs |
| separator | the hairline between rows: decorative, not a meaningful boundary |
| scrim | a recipe over imagery; asserted through the scanOverlay pair |
| warning, info2 | icon and fill colour only (the note chips carry meaning by icon); no screen paints text in them |
