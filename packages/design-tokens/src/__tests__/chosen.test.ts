/**
 * The tests of the one token file (D27, the Maps First chosen design).
 *
 * The anchors are the founder's starting values in
 * `docs/design/chosen/README.md`: a token that drifts from the reference is
 * a bug in the file, and the tests keep the file at the reference. The
 * contrast pairs check the bars from `docs/design/SYSTEM.md` §6 for the
 * pairs that text really forms on a screen.
 */
import { describe, expect, it } from 'vitest';

import { contrastRatio, parseHex } from '../contrast';
import { colors, glass, radii, spacing, tokens, touch, typography } from '../chosen';

const HEX = /^#[0-9a-fA-F]{6}$/;
const RGBA = /^rgba\((\d{1,3}),(\d{1,3}),(\d{1,3}),(\.\d+)\)$/;

/** Every colour entry of a mode, grouped how the README groups them. */
function colourNames(mode: 'light' | 'dark'): (keyof typeof colors.light)[] {
  return Object.keys(colors[mode]) as (keyof typeof colors.light)[];
}

describe('the colour sets', () => {
  it('light and dark carry the same names', () => {
    expect(colourNames('light').sort()).toEqual(colourNames('dark').sort());
  });

  it('every hex colour parses and every other colour is a rgba overlay', () => {
    for (const mode of ['light', 'dark'] as const) {
      for (const name of colourNames(mode)) {
        const value = colors[mode][name];
        if (value.startsWith('#')) {
          expect(value).toMatch(HEX);
          expect(() => parseHex(value)).not.toThrow();
        } else {
          expect(value).toMatch(RGBA);
        }
      }
    }
  });

  it('the meaning colours are the reference values', () => {
    expect(colors.light.accent).toBe('#0A7CFF');
    expect(colors.light.success).toBe('#34C759');
    expect(colors.light.danger).toBe('#FF3B30');
    expect(colors.light.warning).toBe('#FF9500');
    expect(colors.light.info2).toBe('#5856D6');
    expect(colors.dark.accent).toBe('#0A84FF');
    expect(colors.dark.success).toBe('#30D158');
    expect(colors.dark.danger).toBe('#FF453A');
    expect(colors.dark.warning).toBe('#FF9F0A');
    expect(colors.dark.info2).toBe('#5E5CE6');
  });

  it('the surfaces are the reference values', () => {
    expect(colors.light.background).toBe('#F2F2F7');
    expect(colors.light.card).toBe('#FFFFFF');
    expect(colors.light.label).toBe('#000000');
    expect(colors.light.secondaryLabel).toBe('rgba(60,60,67,.6)');
    expect(colors.light.fill).toBe('rgba(120,120,128,.12)');
    expect(colors.light.separator).toBe('rgba(60,60,67,.29)');
    expect(colors.light.turnCard).toBe('#14382A');
    expect(colors.dark.background).toBe('#000000');
    expect(colors.dark.card).toBe('#1C1C1E');
    expect(colors.dark.label).toBe('#FFFFFF');
    expect(colors.dark.secondaryLabel).toBe('rgba(235,235,245,.6)');
    expect(colors.dark.fill).toBe('rgba(118,118,128,.24)');
    expect(colors.dark.separator).toBe('rgba(84,84,88,.65)');
    expect(colors.dark.turnCard).toBe('#0F2A1F');
  });

  it('the map palette is the courier style of the reference', () => {
    expect(colors.light.mapLand).toBe('#F3EFE7');
    expect(colors.light.mapRoad).toBe('#FFFFFF');
    expect(colors.light.mapWater).toBe('#AAD3F2');
    expect(colors.light.mapPark).toBe('#CDE8C4');
    expect(colors.dark.mapLand).toBe('#1B1D21');
    expect(colors.dark.mapRoad).toBe('#34373E');
    expect(colors.dark.mapWater).toBe('#16243A');
    expect(colors.dark.mapPark).toBe('#1D2A22');
  });
});

describe('the contrast the screens form', () => {
  it.each([
    ['light', 'label', 'background'],
    ['light', 'label', 'card'],
    ['dark', 'label', 'background'],
    ['dark', 'label', 'card'],
  ] as const)('%s: the body text on its surface clears the driving bar', (mode, text, surface) => {
    expect(contrastRatio(colors[mode][text], colors[mode][surface])).toBeGreaterThanOrEqual(7);
  });

  it.each([
    ['light', 'onCard', 'card'],
    ['dark', 'onCard', 'card'],
    ['light', 'onTurnCard', 'turnCard'],
    ['dark', 'onTurnCard', 'turnCard'],
  ] as const)('%s: the label of a filled surface clears the body bar', (mode, text, surface) => {
    expect(contrastRatio(colors[mode][text], colors[mode][surface])).toBeGreaterThanOrEqual(4.5);
  });
});

describe('the glass recipe', () => {
  it('is the engine of iOS 26 with a runtime check and a blur fallback', () => {
    expect(glass.engine).toBe('expo-glass-effect');
    expect(glass.availabilityKey).toBe('GlassView.isGlassEffectAvailable');
    expect(glass.fallback).toBe('blur');
  });

  it('carries the reference blur and the per-mode fills', () => {
    expect(glass.blur).toBe(28);
    expect(glass.saturate.light).toBe(1.8);
    expect(glass.fills.light).toEqual({ min: 0.72, max: 0.95 });
    expect(glass.fills.dark).toEqual({ min: 0.62, max: 0.9 });
  });
});

describe('the corner radii', () => {
  it('are the reference radii', () => {
    expect(radii.sheet).toBe(40);
    expect(radii.card).toBe(24);
    expect(radii.chip).toBe(15);
    expect(radii.button).toBe(27);
    expect(radii.mapButton).toBe(24);
    expect(radii.tabBar).toBe(31);
  });
});

describe('the spacing steps', () => {
  it('are exactly the founder 4 pt scale', () => {
    expect(Object.values(spacing)).toEqual([4, 8, 12, 16, 20, 24, 32, 40, 48, 64]);
  });

  it('grow monotonically', () => {
    const values = Object.values(spacing);
    for (let index = 1; index < values.length; index += 1) {
      expect(values[index]).toBeGreaterThan(values[index - 1]!);
    }
  });
});

describe('the type scale', () => {
  it('has the families of the reference', () => {
    expect(typography.family.iOS).toBe('SF Pro');
    expect(typography.family.android).toBe('Inter');
    expect(typography.family.numbers.iOS).toBe('SF Pro Rounded');
    expect(typography.family.numbers.android).toBe('Inter');
  });

  it('has the large title and the stat band of the reference', () => {
    expect(typography.largeTitle).toEqual({ size: 34, lineHeight: 41, weight: '700' });
    expect(typography.statRange).toEqual({ min: 24, max: 52 });
  });

  it.each([
    ['label', 10, 12, '600'],
    ['secondary', 13, 16, '600'],
    ['body', 15, 19, '600'],
    ['paragraph', 17, 22, '400'],
    ['emphasis', 17, 22, '600'],
    ['stat', 26, 31, '700'],
  ] as const)('%s has the reference size, line height and weight', (name, size, lineHeight, weight) => {
    expect(typography[name]).toEqual({ size, lineHeight, weight });
  });
});

describe('the touch targets', () => {
  it('keep the accessibility floor', () => {
    expect(touch.minimum).toBe(48);
    expect(touch.drivingAction).toBe(64);
  });
});

describe('the tokens view', () => {
  it('serves the mode with its colours and its glass numbers', () => {
    const light = tokens('light');
    expect(light.mode).toBe('light');
    expect(light.colors).toBe(colors.light);
    expect(light.glass.fillMin).toBe(0.72);
    expect(light.glass.fillMax).toBe(0.95);
    expect(light.glass.saturate).toBe(1.8);

    const dark = tokens('dark');
    expect(dark.mode).toBe('dark');
    expect(dark.colors).toBe(colors.dark);
    expect(dark.glass.fillMin).toBe(0.62);
    expect(dark.glass.fillMax).toBe(0.9);
    expect(dark.glass.saturate).toBe(1);
  });

  it('serves the same radii, spacing, typography and touch in both modes', () => {
    expect(tokens('light').radii).toBe(tokens('dark').radii);
    expect(tokens('light').spacing).toBe(tokens('dark').spacing);
    expect(tokens('light').typography).toBe(tokens('dark').typography);
    expect(tokens('light').touch).toBe(tokens('dark').touch);
  });
});
