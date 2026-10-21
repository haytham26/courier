/**
 * The transitions of the app.
 *
 * `docs/design/SYSTEM.md` §5 sets the rules: **Reanimated 4 on the UI thread,
 * 150-250 ms, spring physics for the sheets**, and "reduce motion" respected -
 * the transition becomes instant, it is never removed.
 *
 * The durations and the spring configurations come from the design tokens
 * (`packages/design-tokens`), so the contract has one home. This module only
 * decides *which* transition a movement uses, and it does that without a
 * device, so the rules are unit-testable.
 */
import { themes } from '@courier/design-tokens/themes';

/**
 * The movement the app animates.
 */
export type TransitionKind = 'sheet' | 'settle';

export interface SpringTransition {
  type: 'spring';
  config: { duration: number; dampingRatio: number };
}

export interface TimingTransition {
  type: 'timing';
  config: { duration: number };
}

export type Transition = SpringTransition | TimingTransition;

/**
 * The motion tokens.
 *
 * They are the same in every theme, so they are read once from the day
 * theme; the app never invents a duration of its own.
 */
const motion = themes.day.motion;

const SPRINGS: Record<TransitionKind, { duration: number; dampingRatio: number }> = {
  sheet: { ...motion.springs.sheet },
  settle: { ...motion.springs.settle },
};

/** The duration of a token, in milliseconds. */
export function durationMs(value: string): number {
  return Number.parseFloat(value);
}

/**
 * The spring of a movement, without the reduce-motion branch.
 *
 * Every spring is critically damped (`dampingRatio: 1`), so nothing overshoots
 * and the finger can carry its velocity into the dismissal.
 */
export function springFor(kind: TransitionKind): SpringTransition {
  return { type: 'spring', config: { ...SPRINGS[kind] } };
}

/**
 * The transition of a movement.
 *
 * With "reduce motion" on, the movement still happens - it simply has no
 * duration, which is what the contract asks for. The transition is never
 * removed: a sheet still opens, it just appears where it belongs.
 */
export function transitionFor(kind: TransitionKind, reducedMotion: boolean): Transition {
  if (reducedMotion) {
    return {
      type: 'timing',
      config: { duration: durationMs(motion.reducedMotion.duration) },
    };
  }
  return springFor(kind);
}

/**
 * Whether a drag is far enough to dismiss a sheet.
 *
 * A sheet is dismissed when the finger has taken it past a quarter of its
 * height, or when the flick is faster than 900 px/s. The thresholds are here
 * so the rule can be tested without a device.
 */
export function shouldDismiss(translation: number, velocity: number, sheetHeight: number): boolean {
  if (translation <= 0) {
    return false;
  }
  if (velocity >= 900) {
    return true;
  }
  if (sheetHeight <= 0) {
    // The sheet has not been measured yet, so there is no quarter to judge.
    return false;
  }
  return translation >= sheetHeight * 0.25;
}
