/**
 * The type step of a direction, as a React Native text style.
 *
 * The sizes live in the token package (`@courier/design-tokens/directions2a`),
 * so a screen never writes a size of its own.
 */
import type { TextStyle } from 'react-native';
import type { Direction2a } from '@courier/design-tokens/directions2a';

/** The seven steps of the scale of a direction. */
export type TypeKey = keyof Direction2a['type'];

/** The steps that are set in the display family of the direction. */
const DISPLAY_STEPS: readonly TypeKey[] = ['metric', 'address', 'title'];

/**
 * The style of one step.
 *
 * The display family carries the number, the address and the title; the work
 * family carries everything else. The families are the ones of the licence
 * rows in `docs/product/LICENSES.md`: they ship with the app when the founder picks
 * a direction, and the lab falls back to the system face until then.
 */
export function stepStyle(direction: Direction2a, key: TypeKey): TextStyle {
  const step = direction.type[key];
  const family = DISPLAY_STEPS.includes(key) ? direction.fonts.display : direction.fonts.work;

  return {
    fontSize: step.fontSize,
    lineHeight: step.lineHeight,
    letterSpacing: step.letterSpacing,
    fontWeight: step.fontWeight,
    fontFamily: family,
  };
}
