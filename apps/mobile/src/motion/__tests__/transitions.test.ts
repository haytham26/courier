/**
 * The rules of the motion.
 *
 * `docs/design/SYSTEM.md` §5: 150-250 ms, spring physics for the sheets, and
 * "reduce motion" respected - the transition becomes instant, it is never
 * removed. The rules live in `transitions.ts` so they can be checked without
 * a device.
 */
import { themes } from '@courier/design-tokens/themes';

import { durationMs, shouldDismiss, springFor, transitionFor } from '../transitions';

const motion = themes.day.motion;

describe('the spring of a movement', () => {
  it('is critically damped, so nothing overshoots', () => {
    expect(springFor('sheet').config.dampingRatio).toBe(1);
    expect(springFor('settle').config.dampingRatio).toBe(1);
  });

  it('sits inside the 150-250 ms band of the contract', () => {
    for (const kind of ['sheet', 'settle'] as const) {
      const { duration } = springFor(kind).config;
      expect(duration).toBeGreaterThanOrEqual(150);
      expect(duration).toBeLessThanOrEqual(250);
    }
  });

  it('comes from the design tokens', () => {
    expect(springFor('sheet').config.duration).toBe(motion.springs.sheet.duration);
    expect(springFor('settle').config.duration).toBe(motion.springs.settle.duration);
  });
});

describe('the reduce-motion branch', () => {
  it('makes the movement instant', () => {
    const transition = transitionFor('sheet', true);

    expect(transition.type).toBe('timing');
    expect(transition.config.duration).toBe(0);
  });

  it('never removes the movement', () => {
    // The transition is still a transition: the sheet still opens, it simply
    // arrives without a duration.
    const transition = transitionFor('sheet', true);

    expect(transition).toBeDefined();
    expect(transition.type).toBe('timing');
  });

  it('keeps the spring when the user has not asked for less motion', () => {
    expect(transitionFor('sheet', false).type).toBe('spring');
    expect(transitionFor('settle', false).type).toBe('spring');
  });

  it('reads the duration of the token', () => {
    expect(durationMs(motion.reducedMotion.duration)).toBe(0);
  });
});

describe('the drag that dismisses a sheet', () => {
  const height = 600;

  it('dismisses the sheet past a quarter of its height', () => {
    expect(shouldDismiss(height * 0.25, 0, height)).toBe(true);
    expect(shouldDismiss(height * 0.2, 0, height)).toBe(false);
  });

  it('dismisses the sheet on a fast flick, however short', () => {
    expect(shouldDismiss(20, 900, height)).toBe(true);
    expect(shouldDismiss(20, 899, height)).toBe(false);
  });

  it('never dismisses a sheet that is being pushed up', () => {
    expect(shouldDismiss(-100, 0, height)).toBe(false);
    expect(shouldDismiss(-100, 2000, height)).toBe(false);
  });

  it('survives a sheet that has not been measured yet', () => {
    expect(shouldDismiss(10, 0, 0)).toBe(false);
    expect(shouldDismiss(10, 1200, 0)).toBe(true);
  });
});
