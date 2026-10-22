/**
 * The gate for the three directions of this team (MASTER_EXECUTION §13.6).
 *
 * A direction is a type scale, a spacing rhythm, a set of corners, a motion
 * character, a layout grammar and a palette. The design contract
 * (`docs/design/SYSTEM.md`) sets the bar every one of them has to clear, and
 * the fingerprint rules of `docs/design/REVIEW.md` §9 set the bar between
 * them: no two directions of the round may share a layout grammar, an accent
 * family, both type families, a motion character or a map treatment.
 *
 * The rules are checked here, so a direction that breaks one fails the build.
 */

import { describe, it, expect } from 'vitest';
import { directions2a, direction2aNames, type Direction2a, type TypeStep2a } from '../directions2a';
import { themes } from '../themes';
import { contrastRatioRounded, relativeLuminance } from '../contrast';

const CONTRACT = {
  /** The body is never smaller than this. */
  minBody: 17,
  /** The key number sits between these two. */
  minMetric: 48,
  maxMetric: 76,
  /** The address of the next stop is readable at a glance. */
  minAddress: 22,
  /** A movement lasts between these two, in milliseconds. */
  minDuration: 150,
  maxDuration: 250,
  /** A row the courier can tap is never smaller than this. */
  minRow: 56,
  /** The tracking of a display step, in em. */
  maxDisplayTracking: -0.04,
  /** The tracking of a label step, in em. */
  maxLabelTracking: 0.12,
  /** The blue channel of a night background. */
  maxNightBlue: 26,
};

const steps = (direction: Direction2a): TypeStep2a[] => Object.values(direction.type);

describe('the three directions of this team', () => {
  it('are three, and they are the ones the founder is asked to choose between', () => {
    expect(direction2aNames).toEqual(['controlRoom', 'topo', 'addressFirst']);
    expect(Object.keys(directions2a)).toHaveLength(3);
  });

  it('each one has a light theme and its own night adaptation', () => {
    for (const name of direction2aNames) {
      const direction = directions2a[name];
      const light = themes[direction.themeName];
      const night = themes[direction.nightThemeName];

      expect(light, `${name} has no light theme`).toBeDefined();
      expect(night, `${name} has no night theme`).toBeDefined();
      expect(light.name).toBe(direction.themeName);
      expect(night.name).toBe(direction.nightThemeName);
    }
  });

  it('are three different densities, not three colours of one layout', () => {
    const densities = direction2aNames.map((name) => directions2a[name].density);
    expect(new Set(densities).size).toBe(3);
  });

  it('never write a body smaller than the contract allows', () => {
    for (const name of direction2aNames) {
      const direction = directions2a[name];
      for (const step of steps(direction)) {
        expect(
          step.fontSize,
          `${name} writes ${step.fontSize}px, the contract says ${CONTRACT.minBody}px`,
        ).toBeGreaterThanOrEqual(CONTRACT.minBody);
      }
    }
  });

  it('keep the key number inside the band of the contract', () => {
    for (const name of direction2aNames) {
      const metric = directions2a[name].type.metric.fontSize;
      expect(metric).toBeGreaterThanOrEqual(CONTRACT.minMetric);
      expect(metric).toBeLessThanOrEqual(CONTRACT.maxMetric);
    }
  });

  it('keep the address readable at a glance', () => {
    for (const name of direction2aNames) {
      expect(directions2a[name].type.address.fontSize).toBeGreaterThanOrEqual(CONTRACT.minAddress);
    }
  });

  it('give every step a line height the contract asks for', () => {
    for (const name of direction2aNames) {
      const direction = directions2a[name];
      for (const step of steps(direction)) {
        const ratio = step.lineHeight / step.fontSize;
        if (step === direction.type.metric) {
          // The key number is set tight: at most 1.15 of its size.
          expect(ratio, `${name} writes ${step.fontSize}/${step.lineHeight}`).toBeLessThanOrEqual(
            1.15,
          );
        } else {
          expect(ratio, `${name} writes ${step.fontSize}/${step.lineHeight}`).toBeGreaterThanOrEqual(
            1.2,
          );
        }
      }
    }
  });

  it('keep the tracking inside the band of the contract', () => {
    for (const name of direction2aNames) {
      const direction = directions2a[name];
      for (const step of [direction.type.metric, direction.type.address, direction.type.title]) {
        expect(step.letterSpacing).toBeLessThan(0);
        expect(step.letterSpacing).toBeGreaterThanOrEqual(CONTRACT.maxDisplayTracking);
      }
      for (const step of [direction.type.label, direction.type.caption]) {
        expect(step.letterSpacing).toBeGreaterThanOrEqual(0);
        expect(step.letterSpacing).toBeLessThanOrEqual(CONTRACT.maxLabelTracking);
      }
    }
  });

  it('keep the spacing on the 4-pt grid', () => {
    for (const name of direction2aNames) {
      const direction = directions2a[name];
      for (const value of Object.values(direction.spacing)) {
        expect(value % 4, `${name} has a spacing of ${value}px, off the 4-pt grid`).toBe(0);
      }
    }
  });

  it('never make a row the courier has to tap smaller than the floor', () => {
    for (const name of direction2aNames) {
      expect(directions2a[name].spacing.row).toBeGreaterThanOrEqual(CONTRACT.minRow);
    }
  });

  it('keep every movement inside the 150-250 ms band', () => {
    for (const name of direction2aNames) {
      const duration = directions2a[name].motion.durationMs;
      expect(duration).toBeGreaterThanOrEqual(CONTRACT.minDuration);
      expect(duration).toBeLessThanOrEqual(CONTRACT.maxDuration);
    }
  });

  it('use a spring of the motion tokens for their movements', () => {
    const springs = themes.day.motion.springs;

    for (const name of direction2aNames) {
      const spring = springs[directions2a[name].motion.spring];
      expect(spring, `${name} names a spring the token package does not have`).toBeDefined();
    }
  });

  it('give every direction its own type scale', () => {
    const scales = direction2aNames.map((name) =>
      steps(directions2a[name])
        .map((step) => `${step.fontSize}/${step.lineHeight}/${step.fontWeight}`)
        .join(','),
    );

    expect(new Set(scales).size).toBe(3);
  });

  it('use no more than three weights on a screen', () => {
    for (const name of direction2aNames) {
      const weights = new Set(steps(directions2a[name]).map((step) => step.fontWeight));
      expect(weights.size, `${name} writes ${weights.size} weights`).toBeLessThanOrEqual(3);
    }
  });

  it('never share a layout grammar, a motion character or a camera', () => {
    const grammars = direction2aNames.map((name) => directions2a[name].grammar);
    const characters = direction2aNames.map((name) => directions2a[name].motion.character);
    const cameras = direction2aNames.map((name) => JSON.stringify(directions2a[name].camera));

    expect(new Set(grammars).size).toBe(3);
    expect(new Set(characters).size).toBe(3);
    expect(new Set(cameras).size).toBe(3);
  });

  it('never share both type families', () => {
    const pairings = direction2aNames.map(
      (name) => `${directions2a[name].fonts.display}/${directions2a[name].fonts.work}`,
    );

    expect(new Set(pairings).size).toBe(3);
  });

  it('never share an accent family: every accent is a different colour', () => {
    const accents = direction2aNames.map((name) => themes[directions2a[name].themeName].colors.brandPrimary);
    expect(new Set(accents).size).toBe(3);
  });

  it('keep the accent of the light palette above the body bar on its own background', () => {
    for (const name of direction2aNames) {
      const theme = themes[directions2a[name].themeName];
      const ratio = contrastRatioRounded(theme.colors.brandPrimary, theme.colors.background);
      expect(ratio, `${name} has an accent at ${ratio}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('are light palettes in the day, because the day is the identity', () => {
    for (const name of direction2aNames) {
      const theme = themes[directions2a[name].themeName];
      const luminance = relativeLuminance(theme.colors.background);

      expect(luminance, `${name} is not a light palette`).toBeGreaterThan(0.5);
      expect(theme.colors.background).not.toBe('#000000');
    }
  });

  it('keep the night palette near-black, low blue and never pure black', () => {
    for (const name of direction2aNames) {
      const night = themes[directions2a[name].nightThemeName];
      const blue = Number.parseInt(night.colors.background.slice(5, 7), 16);

      expect(night.colors.background).not.toBe('#000000');
      expect(blue, `${name} has a night background with a blue channel of ${blue}`).toBeLessThanOrEqual(
        CONTRACT.maxNightBlue,
      );
      // The night text is never pure white (REVIEW-G2).
      expect(night.colors.textPrimary).not.toBe('#ffffff');
    }
  });

  it('keep the night driving text at the driving bar of 7:1', () => {
    for (const name of direction2aNames) {
      const night = themes[directions2a[name].nightThemeName];
      const ratio = contrastRatioRounded(night.colors.textPrimary, night.colors.background);

      expect(ratio, `${name} has night driving text at ${ratio}:1`).toBeGreaterThanOrEqual(7);
    }
  });

  it('name a signature moment for the delivery, the map and Copilot', () => {
    for (const name of direction2aNames) {
      const signature = directions2a[name].signature;
      expect(signature.delivery.length).toBeGreaterThan(20);
      expect(signature.mapMove.length).toBeGreaterThan(20);
      expect(signature.copilot.length).toBeGreaterThan(20);
    }
  });

  it('never repeat a signature moment inside the team', () => {
    for (const key of ['delivery', 'mapMove', 'copilot'] as const) {
      const moments = direction2aNames.map((name) => directions2a[name].signature[key]);
      expect(new Set(moments).size).toBe(3);
    }
  });

  it('carry the three fingerprints of the round: the accent, the second colour and the pairing', () => {
    for (const name of direction2aNames) {
      const direction = directions2a[name];
      const theme = themes[direction.themeName];

      expect(direction.fonts.displayLicence).toBe('SIL OFL 1.1');
      expect(direction.fonts.workLicence).toBe('SIL OFL 1.1');
      expect(theme.colors.brandPrimary).not.toBe(theme.colors.brandSecondary);
    }
  });
});
