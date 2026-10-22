/**
 * The contrast gate.
 *
 * `docs/design/SYSTEM.md` §6 sets the bar: **body text ≥ 4.5:1, large text
 * and UI boundaries ≥ 3:1, driving text ≥ 7:1** (WCAG 2.2 AA, SC 1.4.3,
 * 1.4.11 and 3.3). Every pair of the three themes is measured here, so a
 * colour change that breaks the bar fails the build instead of shipping.
 *
 * The "contrast table" test at the bottom prints the measured numbers. The
 * comments in `themes.ts` are the output of that command, so the two cannot
 * drift apart quietly.
 */

import { describe, it, expect } from 'vitest';
import { themes, type Theme, type ThemeName } from './themes';
import {
  CONTRAST_BARS,
  blend,
  contrastRatio,
  contrastRatioRounded,
  parseHex,
  relativeLuminance,
} from './contrast';

/** The tokens that carry text on one of the surfaces. */
const TEXT_TOKENS = [
  'textPrimary',
  'textSecondary',
  'textTertiary',
  'brandPrimary',
  'brandSecondary',
  'success',
  'warning',
  'error',
  'info',
  'statusPending',
  'statusActive',
  'statusDelivered',
  'statusFailed',
  'statusSkipped',
] as const;

/** The tokens that paint a filled surface with the inverse label on top. */
const FILLED_TOKENS = [
  'brandPrimary',
  'brandSecondary',
  'success',
  'warning',
  'error',
  'statusPending',
  'statusActive',
  'statusDelivered',
  'statusFailed',
  'statusSkipped',
] as const;

/** The surfaces a piece of text can sit on. */
const SURFACES = ['background', 'surface', 'surfaceElevated'] as const;

/** The alpha of the badge pill, the way the `Badge` component paints it. */
const BADGE_ALPHA = 0.125;

function label(theme: Theme, token: string): string {
  return `${theme.name} ${token} (${theme.colors[token]})`;
}

describe.each(Object.values(themes))('the $name theme', (theme) => {
  describe('the text on every surface', () => {
    for (const token of TEXT_TOKENS) {
      for (const surface of SURFACES) {
        it(`${token} on the ${surface} is at least ${CONTRAST_BARS.body}:1`, () => {
          const ratio = contrastRatio(theme.colors[token], theme.colors[surface]);
          expect(
            ratio,
            `${label(theme, token)} on the ${surface} is ${contrastRatioRounded(
              theme.colors[token],
              theme.colors[surface],
            )}:1`,
          ).toBeGreaterThanOrEqual(CONTRAST_BARS.body);
        });
      }
    }
  });

  describe('the UI boundaries', () => {
    for (const surface of SURFACES) {
      it(`the border on the ${surface} is at least ${CONTRAST_BARS.nonText}:1`, () => {
        const ratio = contrastRatio(theme.colors.border, theme.colors[surface]);
        expect(
          ratio,
          `the ${theme.name} border on the ${surface} is ${contrastRatioRounded(
            theme.colors.border,
            theme.colors[surface],
          )}:1`,
        ).toBeGreaterThanOrEqual(CONTRAST_BARS.nonText);
      });
    }
  });

  describe('the label on a filled surface', () => {
    for (const token of FILLED_TOKENS) {
      it(`the inverse label on ${token} is at least ${CONTRAST_BARS.body}:1`, () => {
        const ratio = contrastRatio(theme.colors.textInverse, theme.colors[token]);
        expect(
          ratio,
          `the ${theme.name} inverse label on ${token} is ${contrastRatioRounded(
            theme.colors.textInverse,
            theme.colors[token],
          )}:1`,
        ).toBeGreaterThanOrEqual(CONTRAST_BARS.body);
      });
    }
  });

  describe('the badge pill', () => {
    for (const token of [
      'brandPrimary',
      'brandSecondary',
      'success',
      'warning',
      'error',
      'info',
    ] as const) {
      it(`the ${token} label on its own pill is at least ${CONTRAST_BARS.body}:1`, () => {
        const pill = blend(theme.colors[token], theme.colors.surface, BADGE_ALPHA);
        const ratio = contrastRatio(theme.colors[token], pill);
        expect(
          ratio,
          `the ${theme.name} ${token} label on its pill (${pill}) is ${contrastRatioRounded(
            theme.colors[token],
            pill,
          )}:1`,
        ).toBeGreaterThanOrEqual(CONTRAST_BARS.body);
      });
    }
  });
});

describe('the night theme, the driving screen', () => {
  it('keeps the address and the distance at the driving bar of 7:1', () => {
    const night = themes.night;
    const drivingText = [night.colors.textPrimary, night.colors.textSecondary];

    for (const colour of drivingText) {
      for (const surface of SURFACES) {
        const ratio = contrastRatio(colour, night.colors[surface]);
        expect(
          ratio,
          `the night driving text ${colour} on the ${surface} is ${contrastRatioRounded(
            colour,
            night.colors[surface],
          )}:1`,
        ).toBeGreaterThanOrEqual(CONTRAST_BARS.driving);
      }
    }
  });

  it('is near-black and never pure black', () => {
    const luminance = relativeLuminance(themes.night.colors.background);

    expect(themes.night.colors.background).not.toBe('#000000');
    expect(luminance).toBeGreaterThan(0);
    // The contract asks for #0A0A0A-#121212, never pure black.
    expect(luminance).toBeLessThan(0.01);
  });
});

describe('the night palettes of the second round of the studio', () => {
  const NIGHT_THEMES = [
    'voiceRibbonNight',
    'xrayParcelNight',
    'scanlineNight',
  ] as const;

  it.each(NIGHT_THEMES)('%s keeps the driving text at the 7:1 bar', (name) => {
    const night = themes[name];

    for (const colour of [night.colors.textPrimary, night.colors.textSecondary]) {
      for (const surface of SURFACES) {
        const ratio = contrastRatio(colour, night.colors[surface]);
        expect(
          ratio,
          `the ${name} driving text ${colour} on the ${surface} is ${contrastRatioRounded(
            colour,
            night.colors[surface],
          )}:1`,
        ).toBeGreaterThanOrEqual(CONTRAST_BARS.driving);
      }
    }
  });

  it.each(NIGHT_THEMES)('%s is a near-black ground with a low blue channel', (name) => {
    const background = themes[name].colors.background;
    const luminance = relativeLuminance(background);

    expect(background).not.toBe('#000000');
    expect(luminance).toBeGreaterThan(0);
    expect(luminance).toBeLessThan(0.01);

    // REVIEW-G3: the blue channel is 26 or less, so the screen does not wash
    // the driver's night vision.
    const blue = parseHex(background).b;
    expect(blue, `the ${name} background ${background} has a blue channel of ${blue}`).toBeLessThanOrEqual(26);
  });

  it.each(NIGHT_THEMES)('%s never writes pure white', (name) => {
    const night = themes[name];

    expect(night.colors.textPrimary).not.toBe('#ffffff');
    // REVIEW-G2: the brightest text is #F2F2F2 or less.
    for (const channel of ['textPrimary', 'textSecondary', 'textTertiary'] as const) {
      const { r, g, b } = parseHex(night.colors[channel]);
      expect(Math.max(r, g, b), `${name} ${channel} is ${night.colors[channel]}`).toBeLessThanOrEqual(
        242,
      );
    }
  });
});

describe('the contrast table', () => {
  it('prints the measured ratios of every palette', () => {
    const names: ThemeName[] = [
      'day',
      'night',
      'highContrast',
      'roadbook',
      'beacon',
      'freight',
      'voiceRibbon',
      'voiceRibbonNight',
      'xrayParcel',
      'xrayParcelNight',
      'scanline',
      'scanlineNight',
    ];

    for (const name of names) {
      const theme = themes[name];
      const rows: string[] = [];

      for (const token of TEXT_TOKENS) {
        const onBackground = contrastRatioRounded(theme.colors[token], theme.colors.background);
        const onSurface = contrastRatioRounded(theme.colors[token], theme.colors.surface);
        rows.push(
          `  ${token.padEnd(16)} ${theme.colors[token]}  background ${onBackground
            .toFixed(2)
            .padStart(6)}:1   surface ${onSurface.toFixed(2).padStart(6)}:1`,
        );
      }
      rows.push(
        `  ${'border'.padEnd(16)} ${theme.colors.border}  ${contrastRatioRounded(
          theme.colors.border,
          theme.colors.surface,
        )
          .toFixed(2)
          .padStart(6)}:1  (non-text, bar 3:1)`,
      );
      for (const token of FILLED_TOKENS) {
        rows.push(
          `  inverse on ${token.padEnd(16)} ${contrastRatioRounded(
            theme.colors.textInverse,
            theme.colors[token],
          )
            .toFixed(2)
            .padStart(6)}:1`,
        );
      }

      // The command that prints the table the comments in `themes.ts` carry.
      console.log(`\n===== ${name} =====\n${rows.join('\n')}`);
    }

    expect(names).toHaveLength(12);
  });
});

describe('the three Design Studio directions', () => {
  it('are light palettes, because the day is the default', () => {
    for (const name of ['roadbook', 'beacon', 'freight'] as const) {
      const theme = themes[name];
      const luminance = relativeLuminance(theme.colors.background);

      // The night theme is the dark one; a direction that is dark by default
      // breaks the founder's rule that the day is the identity.
      expect(luminance, `${name} is not a light palette`).toBeGreaterThan(0.5);
      expect(theme.colors.background).not.toBe('#000000');
    }
  });

  it('are three different palettes, not three colours of the same one', () => {
    const palettes = (['roadbook', 'beacon', 'freight'] as const).map((name) =>
      [
        themes[name].colors.background,
        themes[name].colors.surface,
        themes[name].colors.brandPrimary,
        themes[name].colors.textPrimary,
      ].join(' '),
    );

    expect(new Set(palettes).size).toBe(3);
  });
});

describe('the three directions of the second round of the studio', () => {
  it('are light palettes in the day, because the day is the identity', () => {
    for (const name of ['voiceRibbon', 'xrayParcel', 'scanline'] as const) {
      const luminance = relativeLuminance(themes[name].colors.background);

      expect(luminance, `${name} is not a light palette`).toBeGreaterThan(0.5);
      expect(themes[name].colors.background).not.toBe('#000000');
    }
  });

  it('are three different palettes, not three colours of the same one', () => {
    const palettes = (['voiceRibbon', 'xrayParcel', 'scanline'] as const).map((name) =>
      [
        themes[name].colors.background,
        themes[name].colors.surface,
        themes[name].colors.brandPrimary,
        themes[name].colors.textPrimary,
      ].join(' '),
    );

    expect(new Set(palettes).size).toBe(3);
  });

  it('hold two chromatic colours besides the neutrals, so the accent is never alone', () => {
    for (const name of ['voiceRibbon', 'xrayParcel', 'scanline'] as const) {
      const theme = themes[name];
      const chromatic = new Set([
        theme.colors.brandPrimary,
        theme.colors.brandSecondary,
        theme.colors.success,
        theme.colors.warning,
        theme.colors.error,
        theme.colors.info,
      ]);

      // REVIEW-A15: at least two chromatic non-neutral colours.
      expect(
        chromatic.size,
        `${name} holds ${chromatic.size} chromatic colours`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it('keep the accent and the second chromatic colour apart, so no gradient hides in them', () => {
    for (const name of ['voiceRibbon', 'xrayParcel', 'scanline'] as const) {
      const theme = themes[name];

      expect(theme.colors.brandPrimary).not.toBe(theme.colors.brandSecondary);
      expect(theme.colors.brandPrimary).not.toBe(theme.colors.background);
      expect(theme.colors.brandSecondary).not.toBe(theme.colors.background);
    }
  });
});
