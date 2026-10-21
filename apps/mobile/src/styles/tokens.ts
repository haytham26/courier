/**
 * The design tokens are the only place a value may be defined
 * (`docs/design/SYSTEM.md` §2). The token package stores the sizes as CSS
 * strings ("16px"); React Native wants numbers, so the conversion happens
 * here, once, and every screen reads its numbers from here.
 */
import { borderRadius, spacing, touchTarget, typography } from '@courier/design-tokens/tokens';

function px(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** The type scale of the design system (Figtree, the sizes the tokens carry). */
export const fontSize = {
  xs: px(typography.fontSizes.xs),
  sm: px(typography.fontSizes.sm),
  base: px(typography.fontSizes.base),
  lg: px(typography.fontSizes.lg),
  xl: px(typography.fontSizes.xl),
  xxl: px(typography.fontSizes['2xl']),
  xxxl: px(typography.fontSizes['3xl']),
  display: px(typography.fontSizes['4xl']),
  /** A key number: the one number the courier reads at a glance (48-76 pt). */
  key: px(typography.fontSizes['5xl']),
} as const;

/** The 4-pt grid. */
export const space = {
  none: px(spacing[0]),
  xs: px(spacing[1]),
  sm: px(spacing[2]),
  md: px(spacing[3]),
  lg: px(spacing[4]),
  xl: px(spacing[6]),
  xxl: px(spacing[8]),
  huge: px(spacing[12]),
} as const;

export const radius = {
  sm: px(borderRadius.sm),
  md: px(borderRadius.DEFAULT),
  lg: px(borderRadius.md),
  xl: px(borderRadius.lg),
  full: px(borderRadius.full),
} as const;

/** The touch targets of the design system (a finger in a moving van). */
export const target = {
  min: px(touchTarget.minimum),
  comfortable: px(touchTarget.comfortable),
  spacious: px(touchTarget.spacious),
} as const;
