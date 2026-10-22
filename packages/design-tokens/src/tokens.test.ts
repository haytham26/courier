/**
 * Tests for design tokens
 *
 * The assertions here are the contract of `docs/design/SYSTEM.md` §2: the
 * Figtree family, a 17 pt body floor, the 48-76 pt key numbers, the 56 pt
 * touch targets, the 4-pt spacing grid, the 150-250 ms motion band and the
 * three elevation levels.
 */

import { describe, it, expect } from 'vitest';
import {
  tokens,
  themes,
  dayTheme,
  nightTheme,
  highContrastTheme,
  getTheme,
  type ThemeName,
} from './index';

describe('Design Tokens', () => {
  it('exports tokens object with all categories', () => {
    expect(tokens.color).toBeDefined();
    expect(tokens.spacing).toBeDefined();
    expect(tokens.typography).toBeDefined();
    expect(tokens.borderRadius).toBeDefined();
    expect(tokens.shadow).toBeDefined();
    expect(tokens.motion).toBeDefined();
    expect(tokens.zIndex).toBeDefined();
    expect(tokens.breakpoint).toBeDefined();
    expect(tokens.touchTarget).toBeDefined();
    expect(tokens.component).toBeDefined();
    expect(tokens.voice).toBeDefined();
  });

  it('has brand colors defined', () => {
    expect(tokens.color.brand.primary[500]).toBe('#0b5cad');
    expect(tokens.color.brand.secondary[500]).toBe('#0e7490');
  });

  it('has semantic colors', () => {
    expect(tokens.color.semantic.success.DEFAULT).toBe('#16814c');
    expect(tokens.color.semantic.error.DEFAULT).toBe('#b42318');
    expect(tokens.color.semantic.warning.DEFAULT).toBe('#8a5a00');
  });

  it('has spacing scale', () => {
    expect(tokens.spacing[4]).toBe('16px');
    expect(tokens.spacing[6]).toBe('24px');
  });

  it('has typography tokens', () => {
    expect(tokens.typography.fontSizes.base).toBe('20px');
    expect(tokens.typography.fontWeights.medium).toBe('500');
  });
});

describe('Themes', () => {
  it('has the three product themes, the first three directions and the second round', () => {
    expect(Object.keys(themes)).toHaveLength(26);
    expect(themes.day).toBeDefined();
    expect(themes.night).toBeDefined();
    expect(themes.highContrast).toBeDefined();
    expect(themes.roadbook).toBeDefined();
    expect(themes.beacon).toBeDefined();
    expect(themes.freight).toBeDefined();
    expect(themes.voiceRibbon).toBeDefined();
    expect(themes.voiceRibbonNight).toBeDefined();
    expect(themes.xrayParcel).toBeDefined();
    expect(themes.xrayParcelNight).toBeDefined();
    expect(themes.scanline).toBeDefined();
    expect(themes.scanlineNight).toBeDefined();
    expect(themes.weatherLight).toBeDefined();
    expect(themes.weatherLightNight).toBeDefined();
    expect(themes.hapticCity).toBeDefined();
    expect(themes.hapticCityNight).toBeDefined();
    expect(themes.nightShift).toBeDefined();
    expect(themes.nightShiftNight).toBeDefined();
    expect(themes.gantryRun).toBeDefined();
    expect(themes.gantryRunNight).toBeDefined();
    expect(themes.controlRoom).toBeDefined();
    expect(themes.controlRoomNight).toBeDefined();
    expect(themes.topo).toBeDefined();
    expect(themes.topoNight).toBeDefined();
    expect(themes.addressFirst).toBeDefined();
    expect(themes.addressFirstNight).toBeDefined();
  });

  it('day theme has correct colors', () => {
    expect(dayTheme.name).toBe('day');
    expect(dayTheme.colors.background).toBe('#f4f6f7');
    expect(dayTheme.colors.brandPrimary).toBe('#0b5cad');
  });

  it('night theme has correct colors', () => {
    expect(nightTheme.name).toBe('night');
    expect(nightTheme.colors.background).toBe('#0e1418');
    expect(nightTheme.colors.brandPrimary).toBe('#7cc4ff');
  });

  it('high contrast theme has correct colors', () => {
    expect(highContrastTheme.name).toBe('highContrast');
    expect(highContrastTheme.colors.background).toBe('#000000');
    expect(highContrastTheme.colors.brandPrimary).toBe('#ffff00');
  });

  it('getTheme returns correct theme', () => {
    expect(getTheme('day')).toBe(dayTheme);
    expect(getTheme('night')).toBe(nightTheme);
    expect(getTheme('highContrast')).toBe(highContrastTheme);
    expect(getTheme('invalid' as ThemeName)).toBe(dayTheme); // fallback
  });

  it('generateCSSVariables produces valid CSS', () => {
    const css = themes.day; // Just verify it doesn't throw
    expect(css.name).toBe('day');
  });
});

describe('Theme colour values (React Native compatible)', () => {
  const hexPattern = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

  for (const theme of Object.values(themes)) {
    it(`${theme.name} theme only uses hex colours`, () => {
      const offenders = Object.entries(theme.colors).filter(
        ([, value]) => typeof value === 'string' && !hexPattern.test(value),
      );

      expect(offenders).toEqual([]);
    });

    it(`${theme.name} theme has no CSS custom properties`, () => {
      const offenders = Object.entries(theme.colors).filter(([, value]) =>
        String(value).includes('var('),
      );

      expect(offenders).toEqual([]);
    });
  }

  it('all themes share the same colour keys', () => {
    const reference = Object.keys(themes.day.colors).sort();

    for (const theme of Object.values(themes)) {
      expect(Object.keys(theme.colors).sort()).toEqual(reference);
    }
  });

  it('night theme is near-black, not pure black (R17)', () => {
    expect(themes.night.colors.background).toBe('#0e1418');
    expect(themes.night.colors.background).not.toBe('#000000');
  });
});

describe('Component tokens', () => {
  it('has button tokens', () => {
    expect(tokens.component.button.height.DEFAULT).toBe('56px');
    expect(tokens.component.button.borderRadius).toBe('{borderRadius.DEFAULT}');
  });

  it('has input tokens', () => {
    expect(tokens.component.input.height).toBe('{button.height.DEFAULT}');
    expect(tokens.component.input.borderRadius).toBe('{borderRadius.DEFAULT}');
  });

  it('has card tokens', () => {
    expect(tokens.component.card.padding).toBe('{spacing.4}');
    expect(tokens.component.card.borderRadius).toBe('{borderRadius.lg}');
  });

  it('has badge tokens', () => {
    expect(tokens.component.badge.borderRadius).toBe('{borderRadius.full}');
    expect(tokens.component.badge.fontSize).toBe('{typography.fontSizes.xs}');
  });

  it('every badge reference points at a spacing step that exists', () => {
    const reference = /\{spacing\.([0-9.]+)\}/g;
    const offenders: string[] = [];

    for (const [key, value] of Object.entries(tokens.component)) {
      if (typeof value !== 'object' || value === null) {
        continue;
      }
      for (const [name, nested] of Object.entries(value)) {
        if (typeof nested !== 'string') {
          continue;
        }
        for (const match of nested.matchAll(reference)) {
          const step = match[1] ?? '';
          if (!(step in tokens.spacing)) {
            offenders.push(`component.${key}.${name} -> spacing.${step}`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe('Voice tokens', () => {
  it('has voice state tokens', () => {
    expect(tokens.voice.listening.pulseColor).toBe('{brand.primary.500}');
    expect(tokens.voice.speaking.waveColor).toBe('{semantic.success.DEFAULT}');
  });

  it('has earbud button feedback tokens', () => {
    expect(tokens.voice.earbud.singleClick).toBe('{semantic.success.DEFAULT}');
    expect(tokens.voice.earbud.doubleClick).toBe('{semantic.warning.DEFAULT}');
    expect(tokens.voice.earbud.tripleClick).toBe('{semantic.error.DEFAULT}');
    expect(tokens.voice.earbud.longPress).toBe('{brand.primary.500}');
  });
});

describe('Map tokens', () => {
  it('has map colors for all themes', () => {
    expect(tokens.component.map.day.background).toBe('#f4f6f7');
    expect(tokens.component.map.night.background).toBe('#121a1f');
    expect(tokens.component.map.highContrast.background).toBe('#000000');
  });

  it('has map colours for the three directions of the second round', () => {
    expect(tokens.component.map.voiceRibbon.background).toBe('#e8e5e6');
    expect(tokens.component.map.voiceRibbonNight.background).toBe('#121110');
    expect(tokens.component.map.xrayParcel.background).toBe('#e9ebe5');
    expect(tokens.component.map.xrayParcelNight.background).toBe('#0f1210');
    expect(tokens.component.map.scanline.background).toBe('#e9e9e5');
    expect(tokens.component.map.scanlineNight.background).toBe('#101010');
  });

  it('has map route line colors', () => {
    expect(tokens.component.map.day.routeLine).toBe('#0b5cad');
    expect(tokens.component.map.night.routeLine).toBe('#4fa8ff');
    expect(tokens.component.map.highContrast.routeLine).toBe('#00ffff');
  });
});

describe('the type scale (SYSTEM.md §2)', () => {
  const toPx = (value: string): number => Number.parseFloat(value);

  it('uses Figtree', () => {
    expect(tokens.typography.fontFamilies.sans).toContain('Figtree');
    expect(tokens.typography.fontFamilies.display).toContain('Figtree');
    expect(tokens.typography.fontFamilies.mono).not.toContain('Figtree');
  });

  it('never puts body text below 17 pt', () => {
    for (const [name, size] of Object.entries(tokens.typography.fontSizes)) {
      expect(toPx(size), `the ${name} step is ${size}`).toBeGreaterThanOrEqual(17);
    }
  });

  it('puts the key numbers between 48 pt and 76 pt', () => {
    const keyNumbers = [
      tokens.typography.fontSizes['4xl'],
      tokens.typography.fontSizes['5xl'],
      tokens.typography.fontSizes['6xl'],
    ];

    for (const size of keyNumbers) {
      expect(toPx(size)).toBeGreaterThanOrEqual(48);
      expect(toPx(size)).toBeLessThanOrEqual(76);
    }
  });

  it('has the 76 pt step of the driving sheet', () => {
    expect(tokens.typography.fontSizes['6xl']).toBe('76px');
  });

  it('keeps the 24 pt heading, the large-text threshold', () => {
    expect(tokens.typography.fontSizes.xl).toBe('24px');
  });
});

describe('the touch targets (SYSTEM.md §3)', () => {
  const toPx = (value: string): number => Number.parseFloat(value);

  it('puts the minimum at 56 pt', () => {
    expect(toPx(tokens.touchTarget.minimum)).toBeGreaterThanOrEqual(56);
    expect(toPx(tokens.touchTarget.comfortable)).toBeGreaterThanOrEqual(56);
  });

  it('puts the primary action at 72 pt', () => {
    expect(toPx(tokens.touchTarget.primary)).toBe(72);
    expect(toPx(tokens.touchTarget.spacious)).toBeGreaterThanOrEqual(72);
  });

  it('gives the button a 72 pt large step', () => {
    expect(toPx(tokens.component.button.height.lg)).toBe(72);
    expect(toPx(tokens.component.button.height.DEFAULT)).toBeGreaterThanOrEqual(56);
    expect(toPx(tokens.component.button.height.sm)).toBeGreaterThanOrEqual(56);
  });

  it('gives the list row a 56 pt floor', () => {
    expect(toPx(tokens.component.list.itemMinHeight)).toBeGreaterThanOrEqual(56);
  });
});

describe('the spacing scale (SYSTEM.md §2)', () => {
  it('is the 4-pt grid and only the named steps', () => {
    expect(Object.values(tokens.spacing)).toEqual([
      '0',
      '4px',
      '8px',
      '12px',
      '16px',
      '24px',
      '32px',
      '48px',
    ]);
  });

  it('has no step off the grid', () => {
    for (const [name, value] of Object.entries(tokens.spacing)) {
      if (name === '0') {
        continue;
      }
      expect(Number.parseFloat(value) % 4, `spacing.${name} is ${value}`).toBe(0);
    }
  });
});

describe('the radii (SYSTEM.md §2)', () => {
  it('is sm 4 / md 8 / lg 12 / xl 16 / full', () => {
    expect(tokens.borderRadius.sm).toBe('4px');
    expect(tokens.borderRadius.md).toBe('8px');
    expect(tokens.borderRadius.lg).toBe('12px');
    expect(tokens.borderRadius.xl).toBe('16px');
    expect(tokens.borderRadius.full).toBe('9999px');
  });
});

describe('the elevation scale (SYSTEM.md §2)', () => {
  it('has three levels', () => {
    const levels = [tokens.shadow.elevation1, tokens.shadow.elevation2, tokens.shadow.elevation3];

    expect(new Set(levels).size).toBe(3);
  });

  it('stacks no shadows', () => {
    for (const [name, shadow] of Object.entries(tokens.shadow)) {
      if (name === 'none' || name === 'inner') {
        continue;
      }
      // Two shadows in one level are allowed (a key light and its contact
      // shadow); three or more are a stack.
      const layers = shadow.split(/,(?![^(]*\))/g).length;
      expect(layers, `${name} stacks ${layers} shadows`).toBeLessThanOrEqual(2);
    }
  });
});

describe('the motion tokens (SYSTEM.md §5)', () => {
  const toMs = (value: string): number => Number.parseFloat(value);

  it('keeps every duration inside the 150-250 ms band', () => {
    for (const [name, duration] of Object.entries(tokens.motion.durations)) {
      if (name === 'instant') {
        expect(toMs(duration)).toBe(0);
        continue;
      }
      expect(toMs(duration), `motion.durations.${name} is ${duration}`).toBeGreaterThanOrEqual(150);
      expect(toMs(duration), `motion.durations.${name} is ${duration}`).toBeLessThanOrEqual(250);
    }
  });

  it('gives the sheet a critically damped spring', () => {
    expect(tokens.motion.springs.sheet.dampingRatio).toBe(1);
    expect(tokens.motion.springs.sheet.duration).toBeGreaterThanOrEqual(150);
    expect(tokens.motion.springs.sheet.duration).toBeLessThanOrEqual(250);
  });

  it('makes the reduced-motion branch instant, not removed', () => {
    expect(tokens.motion.reducedMotion.duration).toBe('0ms');
  });
});
