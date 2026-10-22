/**
 * The motion of the three directions.
 *
 * The spring configurations are the ones of `docs/design/RESEARCH-2.md` §5.3,
 * read from the Reanimated 4 reference of the same section:
 *
 * | Token     | Form     | Values                                                        |
 * | --------- | -------- | ------------------------------------------------------------- |
 * | `settle`  | physics  | damping 26, stiffness 220, mass 1.1, overshootClamping true   |
 * | `sheet`   | physics  | damping 30, stiffness 260, mass 1.2, velocity from the gesture |
 * | `confirm` | duration | duration 220, dampingRatio 0.86                                |
 * | `reject`  | duration | duration 180, dampingRatio 1                                  |
 * | `enter`   | timing   | duration 150                                                   |
 * | `voiceBar`| physics  | damping 34, stiffness 320, mass 0.9                           |
 *
 * The three directions use three different characters: Control Room settles
 * on a physics spring, Topo draws in a timing curve, and Address First sets
 * itself on the one spring that is allowed a hair of overshoot.
 */
import { FadeIn, FadeInUp } from 'react-native-reanimated';
import type { Direction2a } from '@courier/design-tokens/directions2a';

/** The spring configurations of the round. */
export const springs = {
  /** The next stop arriving; the number changing. */
  settle: { damping: 26, stiffness: 220, mass: 1.1, overshootClamping: true },
  /** A sheet opened by a swipe. */
  sheet: { damping: 30, stiffness: 260, mass: 1.2 },
  /** The voice bar changing state. */
  voiceBar: { damping: 34, stiffness: 320, mass: 0.9 },
  /** The delivery confirmation: a hair of overshoot, once. */
  confirm: { duration: 220, dampingRatio: 0.86 },
  /** A refused or failed action: critically damped. */
  reject: { duration: 180, dampingRatio: 1 },
  /** The house band for a row that arrives. */
  enter: { duration: 150 },
} as const;

/**
 * The entering animation of a direction.
 *
 * With "reduce motion" on, the movement becomes instant: it is never
 * removed, because a screen that appears with nothing happening reads as a
 * broken screen (`docs/design/SYSTEM.md` §5).
 */
export function enteringFor(direction: Direction2a, reducedMotion: boolean) {
  const duration = reducedMotion ? 0 : direction.motion.durationMs;

  switch (direction.motion.enter) {
    case 'unfold':
      // The chart is drawn, not slid in.
      return FadeIn.duration(duration);
    case 'set':
      // The address rises into its place.
      return FadeInUp.duration(duration);
    case 'dial':
    default:
      // The readout fades and the value settles.
      return FadeIn.duration(duration);
  }
}

/**
 * The spring of a direction, as Reanimated wants it.
 *
 * The spring is named by the motion character of the direction, so a screen
 * never picks one of its own.
 */
export function springFor(
  direction: Direction2a,
  kind: 'settle' | 'sheet' | 'voiceBar' | 'confirm' | 'reject',
): {
  damping: number;
  stiffness: number;
  mass: number;
  overshootClamping: boolean;
} | {
  duration: number;
  dampingRatio: number;
} {
  const spring = springs[kind];

  if ('duration' in spring) {
    return { duration: spring.duration, dampingRatio: spring.dampingRatio };
  }
  return {
    damping: spring.damping,
    stiffness: spring.stiffness,
    mass: spring.mass,
    overshootClamping: 'overshootClamping' in spring ? spring.overshootClamping : false,
  };
}
