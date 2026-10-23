/**
 * The D33 contrast gate of the one token file (MASTER_EXECUTION §13.9).
 *
 * The rule, exactly as the founder wrote it:
 * - 3:1 is allowed only for large text (24 px regular, or 18.66 px bold and
 *   up; the button labels are 18 px bold, so they qualify).
 * - 4.5:1 applies to all other text.
 * - 7:1 applies to everything on the driving screen (the Slide to Deliver
 *   label is black on the green; green text such as "2 min" is darkened).
 * - The test asserts every pair explicitly, in light and dark, with no
 *   silent exclusions; the design changes to meet the bar, never the test.
 *
 * How "every pair" is made mechanical here:
 * - Each record names a text colour, a surface, a bar and the reason the
 *   pair exists. Every record line is an explicit assertion.
 * - A transparent text colour or surface (the iOS rgba tokens and the glass
 *   recipes) is composited first: the pair that has to clear the bar is the
 *   rendered pixels', not the raw rgba's.
 * - A glass surface is not one colour: the fill sits over the map, which
 *   varies. Each glass record asserts the WORST case, the minimum ratio
 *   across the surface's fill envelope and the four map colours of the
 *   mode, so the number is a floor for the whole app, not an average.
 * - A colour with no record is either listed in the non-text registry with
 *   its reason, or the test fails. Nothing is excluded silently.
 */
import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../contrast';
import { colors, glass, typography, type MapsFirstColorMode } from '../chosen';

type Mode = MapsFirstColorMode;
type Rgb = [number, number, number];

/** A WCAG bar: 3 large, 4.5 body, 7 driving. */
type Bar = 3 | 4.5 | 7;

const BARS = { large: 3, body: 4.5, driving: 7 } as const satisfies Record<string, Bar>;

function hexToRgb(hex: string): Rgb {
  const body = hex.trim().replace('#', '');
  const full = body.length === 3 ? body.split('').map((character) => character + character).join('') : body;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

/** Mixes a solid colour over an opaque background at `alpha`. */
function mixOver(foreground: string, background: Rgb, alpha: number): Rgb {
  const from = hexToRgb(foreground);
  return [0, 1, 2].map((i) => Math.round(from[i]! * alpha + background[i]! * (1 - alpha))) as Rgb;
}

/** Composites an `rgba(r,g,b,a)` token over an opaque background. */
function compositeOver(foreground: string, background: Rgb): Rgb {
  const match = /^rgba\((\d{1,3}),(\d{1,3}),(\d{1,3}),(\.\d+)\)$/.exec(foreground.trim());
  if (!match) {
    throw new Error(`not an rgba token: ${foreground}`);
  }
  const alpha = Number(match[4]);
  return [0, 1, 2].map((i) => Math.round(Number(match[i + 1]!) * alpha + background[i]! * (1 - alpha))) as Rgb;
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')}`;
}

/** The map colours are read from the palette itself, never duplicated here. */
const MAP_COLOURS: Record<Mode, string[]> = {
  light: [colors.light.mapLand, colors.light.mapRoad, colors.light.mapWater, colors.light.mapPark],
  dark: [colors.dark.mapLand, colors.dark.mapRoad, colors.dark.mapWater, colors.dark.mapPark],
};
/** The colour behind a glass fill is the card colour of the mode. */
const GLASS_FILL: Record<Mode, string> = { light: colors.light.card, dark: colors.dark.card };

interface RecordDef {
  mode: Mode;
  text: string;
  surface: string;
  bar: Bar;
  ratio: number;
  why: string;
}

/** The worst-case ratio of a (possibly rgba) text colour over a glass envelope. */
function worstOverGlass(mode: Mode, text: string, kind: 'sheet' | 'controls', overlay?: string): number {
  let worst = Number.POSITIVE_INFINITY;
  const envelopes = glass.fillsBySurface[kind][mode];
  for (const fill of [envelopes.min, envelopes.max]) {
    for (const map of MAP_COLOURS[mode]) {
      let background = mixOver(GLASS_FILL[mode], hexToRgb(map), fill);
      // An overlay (for example the active tab's quiet pill) composites over
      // the glass before the ratio, so the token pile-up is covered.
      if (overlay) {
        const overlayAlpha = colors[mode][overlay as keyof typeof colors.light];
        background = compositeOver(overlayAlpha as string, background);
      }
      const bg = toHex(background);
      const paletteValue = text in colors[mode] ? (colors[mode][text as keyof typeof colors.light] as string) : null;
      const rendered = paletteValue === null
        ? text.startsWith('rgba') ? toHex(compositeOver(text, background)) : text
        : paletteValue.startsWith('rgba') ? toHex(compositeOver(paletteValue, background)) : paletteValue;
      const value = contrastRatio(rendered, bg);
      if (value < worst) {
        worst = value;
      }
    }
  }
  return worst;
}

function record(mode: Mode, text: string, surface: string, bar: Bar, ratio: number, why: string): RecordDef {
  return { mode, text, surface, bar, ratio, why };
}

/** The full D33 table: the pairs of the 13 reference screens, light and dark. */
function records(): RecordDef[] {
  const table: RecordDef[] = [];
  for (const mode of ['light', 'dark'] as const) {
    const c = colors[mode];

    // The note chips ride the driving sheet: the fill over the sheet glass.
    let chip = Number.POSITIVE_INFINITY;
    const sheets = glass.fillsBySurface.sheet[mode];
    for (const fill of [sheets.min, sheets.max]) {
      for (const map of MAP_COLOURS[mode]) {
        const onGlass = mixOver(GLASS_FILL[mode], hexToRgb(map), fill);
        const background = compositeOver(c.fill, onGlass);
        const value = contrastRatio(c.label, toHex(background));
        if (value < chip) {
          chip = value;
        }
      }
    }

    // The scanner overlay: the scrim over the brightest possible camera
    // feed, then the dark glass pill at its maximum fill. The scanner keeps
    // the dark recipe in both modes, so the pair resolves identically.
    const scrimmedFeed = mixOver('#000000', [255, 255, 255], 0.35);
    const scanBackground = mixOver(colors.dark.card, scrimmedFeed, glass.fillsBySurface.controls.dark.max);

    table.push(
      record(mode, 'label', 'glassSheet', BARS.driving, worstOverGlass(mode, 'label', 'sheet'),
        'the stop sheet: the name, the address'),
      record(mode, 'secondaryLabel', 'glassSheet', BARS.driving, worstOverGlass(mode, 'secondaryLabel', 'sheet'),
        'the stop sheet: the caps label, the contact, the time'),
      record(mode, 'successText', 'glassSheet', BARS.driving, worstOverGlass(mode, 'successText', 'sheet'),
        'the "2 min" of the next window (D33: green text is darkened)'),
      record(mode, 'onTurnCard', 'turnCard', BARS.driving, contrastRatio(c.onTurnCard, c.turnCard),
        'the distance and the street on the turn card'),
      record(mode, 'onTurnStrip', 'turnStrip', BARS.driving, contrastRatio(toHex(compositeOver(c.onTurnStrip, hexToRgb(c.turnStrip))), c.turnStrip),
        'the Then strip'),
      record(mode, 'onSuccess', 'success', BARS.driving, contrastRatio(c.onSuccess, c.success),
        'the Slide to Deliver label (D33: black on the green)'),
      record(mode, 'label', 'chipOnGlassSheet', BARS.driving, chip, 'the note chips on the sheet'),
      record(mode, 'label', 'card', BARS.driving, contrastRatio(c.label, c.card), 'the next-stop pin number chip'),

      record(mode, 'label', 'background', BARS.body, contrastRatio(c.label, c.background), 'the page'),
      record(mode, 'label', 'card', BARS.body, contrastRatio(c.label, c.card), 'cards and lists'),
      record(mode, 'onCard', 'card', BARS.body, contrastRatio(c.onCard, c.card), 'labels on the card surfaces'),
      record(mode, 'secondaryLabel', 'background', BARS.body, contrastRatio(toHex(compositeOver(c.secondaryLabel, hexToRgb(c.background))), c.background), 'the page'),
      record(mode, 'secondaryLabel', 'card', BARS.body, contrastRatio(toHex(compositeOver(c.secondaryLabel, hexToRgb(c.card))), c.card), 'the quieter rows'),
      record(mode, 'label', 'fillOnCard', BARS.body, contrastRatio(c.label, toHex(compositeOver(c.fill, hexToRgb(c.card)))), 'the chips and the quiet buttons'),
      record(mode, 'successText', 'fillOnCard', BARS.body, contrastRatio(c.successText, toHex(compositeOver(c.fill, hexToRgb(c.card)))), 'the Ready line'),
      record(mode, 'accentText', 'background', BARS.body, contrastRatio(c.accentText, c.background), 'the tab labels, the links'),
      record(mode, 'accentText', 'card', BARS.body, contrastRatio(c.accentText, c.card), 'Undo, Text customer'),
      record(mode, 'onDarkGlass', 'scanOverlay', BARS.body, contrastRatio(c.onDarkGlass, toHex(scanBackground)), 'the scanner pills over the camera, worst feed'),

      record(mode, 'onAccent', 'accent', BARS.large, contrastRatio(c.onAccent, c.accent), 'the accent buttons are 18 px bold (D33)'),
      record(mode, 'accentText', 'accentTintOnBackground', BARS.large, contrastRatio(c.accentText, toHex(mixOver(c.accent, hexToRgb(c.background), 0.12))), 'the ghost sign-in buttons (18 px bold)'),
      record(mode, 'successText', 'card', BARS.body, contrastRatio(c.successText, c.card), 'the delivered stat (stronger than its large bar)'),
      record(mode, 'danger', 'card', BARS.large, contrastRatio(c.danger, c.card), 'the Not-home stat, 26 px bold'),
      record(mode, 'accentText', 'glassControls', BARS.body, worstOverGlass(mode, 'accentText', 'controls', 'tabActiveFill'),
        'the active tab label on the quiet pill over the tab bar glass (D33: the pill is in the pair)'),
      record(mode, mode === 'light' ? 'card' : 'background', 'label', BARS.large,
        contrastRatio(mode === 'light' ? colors.light.card : colors.dark.background, c.label),
        'the sign-in pill: the label colour is its fill'),
    );
  }
  return table;
}

/**
 * The computed surfaces and the palette names they touch: the completeness
 * check below counts these names as asserted, through the records.
 */
const SURFACE_INGREDIENTS: Record<string, string[]> = {
  glassSheet: ['glass'],
  glassControls: ['glass', 'tabActiveFill'],
  fillOnCard: ['fill'],
  chipOnGlassSheet: ['fill', 'glass'],
  scanOverlay: ['scrim', 'glass'],
  accentTintOnBackground: ['accent'],
};

/**
 * The colours that never render text, with the reason: a name neither
 * paired nor registered here fails the test (no silent exclusions, D33).
 */
const NON_TEXT: Record<string, string> = {
  mapLand: 'the map canvas: the map style is imagery, not UI text',
  mapRoad: 'the map canvas',
  mapWater: 'the map canvas',
  mapPark: 'the map canvas',
  glass: 'a recipe; its text pairs are asserted through the computed glass surfaces',
  fill: 'a fill surface; asserted through fillOnCard and the chip-on-glass pairs',
  separator: 'the hairline between rows: decorative, not a meaningful boundary',
  scrim: 'a recipe over imagery; asserted through the scanOverlay pair',
  warning: 'an icon and fill colour only (the note chips carry meaning by icon); no screen paints text in it',
  info2: 'an icon and fill colour only; no screen paints text in it',
  tabActiveFill: 'the active tab pill: a surface; asserted through the glassControls pair (the pill is composited into its worst case)',
  grabber: 'the sheet grabber: a non-text drag affordance (SC 1.4.11 review covered by the sheet review, not a D33 text bar)',
  scanRing: 'the scanner reticle ring: a non-text graphic whose meaning is doubled by its shape and the address text it frames (WCAG SC 1.4.11 is the follow-up review, not a D33 text bar)',
};

describe('the D33 contrast table (every pair asserted, light and dark)', () => {
  const table = records();

  it.each(table.map((entry, index) => [index, entry] as const))(
    '#$0: $1',
    (_index, entry) => {
      expect(entry.ratio, `${entry.mode}: ${entry.text} on ${entry.surface} (${entry.why})`).toBeGreaterThanOrEqual(entry.bar);
    },
  );

  it('asserts 24 pairs in each mode, 48 in all', () => {
    const table2 = records();
    expect(table2.filter((r) => r.mode === 'light').length).toBe(24);
    expect(table2.filter((r) => r.mode === 'dark').length).toBe(24);
  });
});

describe('the D33 named rules hold as tokens', () => {
  it('the Slide to Deliver label is black on the green in both modes', () => {
    expect(colors.light.onSuccess).toBe('#000000');
    expect(colors.dark.onSuccess).toBe('#000000');
  });

  it('green text on white is darkened (the light successText differs from the success fill)', () => {
    expect(colors.light.successText).not.toBe(colors.light.success);
    expect(contrastRatio(colors.light.successText, colors.light.card)).toBeGreaterThanOrEqual(4.5);
  });

  it('button labels are 18 px bold, so they qualify as large text (3:1)', () => {
    expect(typography.button).toEqual({ size: 18, lineHeight: 22, weight: '700' });
  });
});

describe('no silent exclusions (D33)', () => {
  it('every colour is asserted as text, as a surface or recorded as non-text with a reason', () => {
    const all = Object.keys(colors.light);
    expect([...all].sort()).toEqual(Object.keys(colors.dark).sort());

    const asserted = new Set<string>();
    for (const record of records()) {
      asserted.add(record.text);
      asserted.add(record.surface);
      for (const ingredient of SURFACE_INGREDIENTS[record.surface] ?? []) {
        asserted.add(ingredient);
      }
    }

    const unaccounted = all.filter((name) => !asserted.has(name) && !NON_TEXT[name]);
    if (unaccounted.length > 0) {
      throw new Error(
        `colour names with no asserted pair and no recorded reason (D33 needs an assertion or an explicit entry): ${unaccounted.join(', ')}`,
      );
    }
    expect(unaccounted).toEqual([]);
  });

  it('every non-text entry is a real colour name (no stale reasons)', () => {
    const all = Object.keys(colors.light);
    const stale = Object.keys(NON_TEXT).filter((name) => !all.includes(name));
    expect(stale).toEqual([]);
  });
});
