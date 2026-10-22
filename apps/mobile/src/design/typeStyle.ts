/**
 * The type step of a direction, as a React Native text style.
 *
 * The sizes live in the token package (`@courier/design-tokens/directions`),
 * so a screen never writes a size of its own.
 */
import type { TextStyle } from 'react-native';
import type { TypeStep } from '@courier/design-tokens/directions';

export function typeStyle(step: TypeStep): TextStyle {
  return {
    fontSize: step.fontSize,
    lineHeight: step.lineHeight,
    letterSpacing: step.letterSpacing,
    fontWeight: step.fontWeight,
  };
}
