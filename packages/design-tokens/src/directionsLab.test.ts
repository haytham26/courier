/**
 * The gate for the three directions of the 04-06 team (MASTER_EXECUTION
 * §13.6).
 *
 * A direction is a type scale, a spacing rhythm, a set of corners, a motion
 * character, a type pairing and a theme with its own night adaptation. The
 * design contract (`docs/design/SYSTEM.md`) sets the bar every one of them has
 * to clear, so the rules are checked here and a direction that breaks one
 * fails the build.
 */

import { describe, it, expect } from 'vitest';
import { labDirections, labDirectionNames, type LabDirection, type LabTypeStep } from './directionsLab';
import { themes } from './themes';

const CONTRACT = {
  /** The body is never smaller than this. */
  minBody: 17,
  /** The key number sits between these two. */
  minMetric: 48,
  maxMetric: 76,
  /** The address is never smaller than this. */
  minAddress: 22,
  /** A movement lasts between these two, in milliseconds. */
  minDuration: 150,
  maxDuration: 250,
  /** A row the courier has to tap is never smaller than this. */
  minRow: 56,
  /** The display steps carry no more than this much negative tracking, in em. */
  maxDisplayTracking: 0.04,
  /** The label steps carry no more than this much positive tracking, in em. */
  maxLabelTracking: 0.12,
};

const steps = (direction: LabDirection): LabTypeStep[] => Object.values(direction.type);

/** The steps that carry the display voice of the direction. */
const DISPLAY_STEPS = ['metric', 'address', 'title'] as const;

describe('the three directions of the 04-06 team', () => {
  it('are three, and they are the ones this team built', () => {
    expect(labDirectionNames).toEqual(['voiceRibbon', 'xrayParcel', 'scanline']);
    expect(Object.keys(labDirections)).toHaveLength(3);
  });

  it('each one has a light theme and its own night adaptation', () => {
    for (const name of labDirectionNames) {
      const direction = labDirections[name];

      expect(themes[direction.themeName]).toBeDefined();
      expect(themes[direction.themeName].name).toBe(name);
      expect(themes[direction.nightThemeName]).toBeDefined();
      expect(themes[direction.nightThemeName].name).toBe(`${name}Night`);
    }
  });

  it('are three different densities, not three colours of one layout', () => {
    const densities = labDirectionNames.map((name) => labDirections[name].density);
    expect(new Set(densities).size).toBe(3);
  });

  it('never write a body smaller than the contract allows', () => {
    for (const name of labDirectionNames) {
      for (const step of steps(labDirections[name])) {
        expect(
          step.fontSize,
          `${name} writes ${step.fontSize}px, the contract says ${CONTRACT.minBody}px`,
        ).toBeGreaterThanOrEqual(CONTRACT.minBody);
      }
    }
  });

  it('keep the key number inside the band of the contract', () => {
    for (const name of labDirectionNames) {
      const metric = labDirections[name].type.metric.fontSize;
      expect(metric).toBeGreaterThanOrEqual(CONTRACT.minMetric);
      expect(metric).toBeLessThanOrEqual(CONTRACT.maxMetric);
    }
  });

  it('keep the address readable at a glance', () => {
    for (const name of labDirectionNames) {
      expect(labDirections[name].type.address.fontSize).toBeGreaterThanOrEqual(CONTRACT.minAddress);
    }
  });

  it('give every step a line height of at least 1.2 of its size', () => {
    for (const name of labDirectionNames) {
      const direction = labDirections[name];

      for (const [step, value] of Object.entries(direction.type)) {
        // The metric is the exception the contract allows: it is set tight.
        if (step === 'metric') {
          expect(value.lineHeight / value.fontSize).toBeLessThanOrEqual(1.15);
          continue;
        }

        expect(
          value.lineHeight / value.fontSize,
          `${name} writes ${value.lineHeight}/${value.fontSize}`,
        ).toBeGreaterThanOrEqual(1.2);
      }
    }
  });

  it('keep the spacing on the 4-pt grid', () => {
    for (const name of labDirectionNames) {
      for (const value of Object.values(labDirections[name].spacing)) {
        expect(value % 4, `${name} has a spacing of ${value}px, off the 4-pt grid`).toBe(0);
      }
    }
  });

  it('never make a row the courier has to tap smaller than the floor', () => {
    for (const name of labDirectionNames) {
      expect(labDirections[name].spacing.row).toBeGreaterThanOrEqual(CONTRACT.minRow);
    }
  });

  it('keep every movement inside the 150-250 ms band', () => {
    for (const name of labDirectionNames) {
      const duration = labDirections[name].motion.durationMs;
      expect(duration).toBeGreaterThanOrEqual(CONTRACT.minDuration);
      expect(duration).toBeLessThanOrEqual(CONTRACT.maxDuration);
    }
  });

  it('use a spring of the motion tokens for their sheets', () => {
    const springs = themes.day.motion.springs;

    for (const name of labDirectionNames) {
      const spring = springs[labDirections[name].motion.spring];
      expect(spring).toBeDefined();
      expect(spring.dampingRatio).toBe(1);
    }
  });

  it('give every direction its own type scale', () => {
    const scales = labDirectionNames.map((name) =>
      steps(labDirections[name])
        .map((step) => `${step.fontSize}/${step.lineHeight}/${step.fontWeight}`)
        .join(','),
    );

    expect(new Set(scales).size).toBe(3);
  });

  it('keep the tracking inside the band of the review', () => {
    for (const name of labDirectionNames) {
      const direction = labDirections[name];

      for (const step of DISPLAY_STEPS) {
        expect(
          Math.abs(direction.type[step].letterSpacing),
          `${name} ${step} tracks ${direction.type[step].letterSpacing}em`,
        ).toBeLessThanOrEqual(CONTRACT.maxDisplayTracking);
      }

      expect(direction.type.label.letterSpacing).toBeLessThanOrEqual(CONTRACT.maxLabelTracking);
      expect(direction.type.label.letterSpacing).toBeGreaterThan(0);
    }
  });

  it('name a type pairing that is licensed for an application', () => {
    for (const name of labDirectionNames) {
      const fonts = labDirections[name].fonts;

      expect(fonts.display).not.toBe(fonts.text);
      expect(fonts.licence).toBe('SIL OFL 1.1');
      expect(fonts.licenceUrl).toContain('https://');
    }
  });

  it('declare the three signature moments, in a sentence each', () => {
    for (const name of labDirectionNames) {
      const moments = labDirections[name].fingerprint.signatureMoments;

      for (const moment of Object.values(moments)) {
        expect(moment.length).toBeGreaterThan(20);
      }
    }
  });

  it('do not share a layout grammar, an accent or a motion character', () => {
    const grammars = labDirectionNames.map((name) => labDirections[name].fingerprint.layoutGrammar.name);
    const accents = labDirectionNames.map((name) => labDirections[name].fingerprint.accent.hex);
    const motions = labDirectionNames.map((name) => labDirections[name].fingerprint.motionCharacter.name);

    expect(new Set(grammars).size).toBe(3);
    expect(new Set(accents).size).toBe(3);
    expect(new Set(motions).size).toBe(3);
  });
});
