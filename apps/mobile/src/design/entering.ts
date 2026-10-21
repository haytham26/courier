/**
 * The motion of the design directions.
 *
 * The contract (`docs/design/SYSTEM.md` §5) sets the rules: Reanimated 4 on the
 * UI thread, 150-250 ms, a critically damped spring for the sheets, and
 * "reduce motion" respected - the movement still happens, it simply has no
 * duration.
 *
 * Every direction has its own character, so the entering animation is a
 * function of the direction and of the reduce-motion setting.
 */
import { FadeIn, FadeInUp, SlideInLeft } from 'react-native-reanimated';
import type { Direction } from '@courier/design-tokens/directions';

/**
 * The entering animation of a direction.
 *
 * - Roadbook fades: the ledger settles, nothing slides.
 * - Beacon rises: the next stop comes up into place.
 * - Freight wipes: the manifest band is drawn across.
 *
 * With "reduce motion" on, the movement becomes instant - it is never
 * removed, because a screen that appears with nothing happening reads as a
 * broken screen.
 */
export function enteringFor(direction: Direction, reducedMotion: boolean) {
  const duration = reducedMotion ? 0 : direction.motion.durationMs;

  switch (direction.motion.enter) {
    case 'rise':
      return FadeInUp.duration(duration);
    case 'wipe':
      return SlideInLeft.duration(duration);
    case 'fade':
    default:
      return FadeIn.duration(duration);
  }
}
