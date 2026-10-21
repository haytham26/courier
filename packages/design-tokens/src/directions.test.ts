/**
 * The gate for the three design directions (MASTER_EXECUTION §13.4).
 *
 * A direction is a type scale, a spacing rhythm, a set of corners and a
 * motion character. The design contract (`docs/design/SYSTEM.md`) sets the
 * bar every one of them has to clear, so the rules are checked here and a
 * direction that breaks one fails the build.
 */

import { describe, it, expect } from 'vitest';
import { directions, directionNames, type Direction, type TypeStep } from './directions';
import { themes } from './themes';

const CONTRACT = {
  /** The body is never smaller than this. */
  minBody: 17,
  /** The key number sits between these two. */
  minMetric: 48,
  maxMetric: 76,
  /** A movement lasts between these two, in milliseconds. */
  minDuration: 150,
  maxDuration: 250,
  /** A row the courier can tap is never smaller than this. */
  minRow: 56,
};

const steps = (direction: Direction): TypeStep[] => Object.values(direction.type);

describe('the three directions', () => {
  it('are three, and they are the ones the founder is asked to choose between', () => {
    expect(directionNames).toEqual(['roadbook', 'beacon', 'freight']);
    expect(Object.keys(directions)).toHaveLength(3);
  });

  it('each one has a theme of its own', () => {
    for (const name of directionNames) {
      const direction = directions[name];
      expect(themes[direction.themeName]).toBeDefined();
      expect(themes[direction.themeName].name).toBe(name);
    }
  });

  it('are three different densities, not three colours of one layout', () => {
    const densities = directionNames.map((name) => directions[name].density);
    expect(new Set(densities).size).toBe(3);
  });

  it('never write a body smaller than the contract allows', () => {
    for (const name of directionNames) {
      const direction = directions[name];
      for (const step of steps(direction)) {
        expect(
          step.fontSize,
          `${name} writes ${step.fontSize}px, the contract says ${CONTRACT.minBody}px`,
        ).toBeGreaterThanOrEqual(CONTRACT.minBody);
      }
    }
  });

  it('keep the key number inside the band of the contract', () => {
    for (const name of directionNames) {
      const metric = directions[name].type.metric.fontSize;
      expect(metric).toBeGreaterThanOrEqual(CONTRACT.minMetric);
      expect(metric).toBeLessThanOrEqual(CONTRACT.maxMetric);
    }
  });

  it('keep the spacing on the 4-pt grid', () => {
    for (const name of directionNames) {
      const direction = directions[name];
      const values = Object.values(direction.spacing);

      for (const value of values) {
        expect(value % 4, `${name} has a spacing of ${value}px, off the 4-pt grid`).toBe(0);
      }
    }
  });

  it('never make a row the courier has to tap smaller than the floor', () => {
    for (const name of directionNames) {
      expect(directions[name].spacing.row).toBeGreaterThanOrEqual(CONTRACT.minRow);
    }
  });

  it('keep every movement inside the 150-250 ms band', () => {
    for (const name of directionNames) {
      const duration = directions[name].motion.durationMs;
      expect(duration).toBeGreaterThanOrEqual(CONTRACT.minDuration);
      expect(duration).toBeLessThanOrEqual(CONTRACT.maxDuration);
    }
  });

  it('use a spring of the motion tokens for their sheets', () => {
    const springs = themes.day.motion.springs;

    for (const name of directionNames) {
      const spring = springs[directions[name].motion.spring];
      expect(spring).toBeDefined();
      // The contract asks for a critically damped spring: no overshoot.
      expect(spring.dampingRatio).toBe(1);
    }
  });

  it('give every direction its own type scale', () => {
    const scales = directionNames.map((name) =>
      steps(directions[name])
        .map((step) => `${step.fontSize}/${step.lineHeight}/${step.fontWeight}`)
        .join(','),
    );

    expect(new Set(scales).size).toBe(3);
  });
});
