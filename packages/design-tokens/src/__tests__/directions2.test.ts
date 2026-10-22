/**
 * The gate for the four directions of this team (MASTER_EXECUTION §13.6).
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
import { directions2, direction2Names, type Direction2, type TypeStep2 } from '../directions2';
import { themes } from '../themes';
import { contrastRatioRounded } from '../contrast';

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
};

const steps = (direction: Direction2): TypeStep2[] => Object.values(direction.type);

describe('the four directions of this team', () => {
  it('are four, and they are the ones the founder is asked to choose between', () => {
    expect(direction2Names).toEqual(['weatherLight', 'hapticCity', 'nightShift', 'gantryRun']);
    expect(Object.keys(directions2)).toHaveLength(4);
  });

  it('each one has a light theme and its own night adaptation', () => {
    for (const name of direction2Names) {
      const direction = directions2[name];
      const light = themes[direction.themeName];
      const night = themes[direction.nightThemeName];

      expect(light, `${name} has no light theme`).toBeDefined();
      expect(night, `${name} has no night theme`).toBeDefined();
      expect(light.name).toBe(direction.themeName);
      expect(night.name).toBe(direction.nightThemeName);
    }
  });

  it('are not one density: the number of stops that fit on Today is different', () => {
    const densities = direction2Names.map((name) => directions2[name].density);
    const stops = direction2Names.map((name) => directions2[name].stopsVisible);

    expect(new Set(densities).size).toBeGreaterThan(1);
    expect(new Set(stops).size).toBe(4);
  });

  it('never write a body smaller than the contract allows', () => {
    for (const name of direction2Names) {
      const direction = directions2[name];
      for (const step of steps(direction)) {
        expect(
          step.fontSize,
          `${name} writes ${step.fontSize}px, the contract says ${CONTRACT.minBody}px`,
        ).toBeGreaterThanOrEqual(CONTRACT.minBody);
      }
    }
  });

  it('keep the key number inside the band of the contract', () => {
    for (const name of direction2Names) {
      const metric = directions2[name].type.metric.fontSize;
      expect(metric).toBeGreaterThanOrEqual(CONTRACT.minMetric);
      expect(metric).toBeLessThanOrEqual(CONTRACT.maxMetric);
    }
  });

  it('keep the address readable at a glance', () => {
    for (const name of direction2Names) {
      expect(directions2[name].type.address.fontSize).toBeGreaterThanOrEqual(CONTRACT.minAddress);
    }
  });

  it('give every step a line height the contract asks for', () => {
    for (const name of direction2Names) {
      const direction = directions2[name];
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
    for (const name of direction2Names) {
      const direction = directions2[name];
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
    for (const name of direction2Names) {
      const direction = directions2[name];
      for (const value of Object.values(direction.spacing)) {
        expect(value % 4, `${name} has a spacing of ${value}px, off the 4-pt grid`).toBe(0);
      }
    }
  });

  it('never make a row the courier has to tap smaller than the floor', () => {
    for (const name of direction2Names) {
      expect(directions2[name].spacing.row).toBeGreaterThanOrEqual(CONTRACT.minRow);
    }
  });

  it('keep every movement inside the 150-250 ms band', () => {
    for (const name of direction2Names) {
      const duration = directions2[name].motion.durationMs;
      expect(duration).toBeGreaterThanOrEqual(CONTRACT.minDuration);
      expect(duration).toBeLessThanOrEqual(CONTRACT.maxDuration);
    }
  });

  it('use a spring of the motion tokens for their movements', () => {
    const springs = themes.day.motion.springs;

    for (const name of direction2Names) {
      const spring = springs[directions2[name].motion.spring];
      expect(spring, `${name} names a spring the token package does not have`).toBeDefined();
    }
  });

  it('give every direction its own type scale', () => {
    const scales = direction2Names.map((name) =>
      steps(directions2[name])
        .map((step) => `${step.fontSize}/${step.lineHeight}/${step.fontWeight}`)
        .join(','),
    );

    expect(new Set(scales).size).toBe(4);
  });

  it('use no more than three weights on a screen', () => {
    for (const name of direction2Names) {
      const weights = new Set(steps(directions2[name]).map((step) => step.fontWeight));
      expect(weights.size, `${name} writes ${weights.size} weights`).toBeLessThanOrEqual(3);
    }
  });

  it('never share a layout grammar, a motion character or a camera', () => {
    const grammars = direction2Names.map((name) => directions2[name].grammar);
    const characters = direction2Names.map((name) => directions2[name].motion.character);
    const cameras = direction2Names.map((name) => JSON.stringify(directions2[name].camera));

    expect(new Set(grammars).size).toBe(4);
    expect(new Set(characters).size).toBe(4);
    expect(new Set(cameras).size).toBe(4);
  });

  it('never share both type families', () => {
    const pairings = direction2Names.map(
      (name) => `${directions2[name].fonts.display}/${directions2[name].fonts.work}`,
    );

    expect(new Set(pairings).size).toBe(4);
  });

  it('never share an accent family: every accent is a different colour', () => {
    const accents = direction2Names.map((name) => themes[directions2[name].themeName].colors.brandPrimary);
    expect(new Set(accents).size).toBe(4);
  });

  it('keep the accent of the light palette above the body bar on its own background', () => {
    for (const name of direction2Names) {
      const theme = themes[directions2[name].themeName];
      const ratio = contrastRatioRounded(theme.colors.brandPrimary, theme.colors.background);
      expect(ratio, `${name} has an accent at ${ratio}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keep the night palette near-black and never pure black', () => {
    for (const name of direction2Names) {
      const night = themes[directions2[name].nightThemeName];
      const blue = Number.parseInt(night.colors.background.slice(5, 7), 16);

      expect(night.colors.background).not.toBe('#000000');
      expect(blue, `${name} has a night background with a blue channel of ${blue}`).toBeLessThanOrEqual(
        26,
      );
    }
  });

  it('name a signature moment for the delivery, the map and Copilot', () => {
    for (const name of direction2Names) {
      const signature = directions2[name].signature;
      expect(signature.delivery.length).toBeGreaterThan(20);
      expect(signature.mapMove.length).toBeGreaterThan(20);
      expect(signature.copilot.length).toBeGreaterThan(20);
    }
  });

  it('never repeat a signature moment inside the team', () => {
    for (const key of ['delivery', 'mapMove', 'copilot'] as const) {
      const moments = direction2Names.map((name) => directions2[name].signature[key]);
      expect(new Set(moments).size).toBe(4);
    }
  });
});
