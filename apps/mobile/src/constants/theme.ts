/**
 * Theme constants for the Courier Copilot mobile app.
 *
 * The colours come from `packages/design-tokens` as plain hex values — CSS
 * custom properties do not work in React Native. The spacing, radius and
 * typography helpers are derived from the same tokens so the design system
 * stays the single source of truth.
 *
 * Components that need to react to a theme change use `useTheme()` from
 * `@/providers/ThemeProvider`; the exports below are the light-theme values.
 */
import { themes, type Theme, type ThemeName } from '@courier/design-tokens/themes';

export { themes, type Theme, type ThemeName };

/**
 * What the courier chose about the theme.
 *
 * `auto` hands the choice to the device: the map is day in the daylight and
 * night after dark. The day and the night are the two the courier can pin
 * from the map, and the high contrast theme is the accessibility choice in
 * the settings.
 */
export type ThemePreference = 'day' | 'night' | 'highContrast' | 'auto';

/** The three theme choices on the map, in the order they are shown. */
export const THEME_PREFERENCES: readonly ThemePreference[] = ['day', 'night', 'auto'];

/** Whether a value is one of the theme choices. */
export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'day' || value === 'night' || value === 'highContrast' || value === 'auto';
}

export const colors = themes.day.colors;

const space = themes.day.spacing;
const radius = themes.day.borderRadius;
const type = themes.day.typography;

const px = (value: string): number => Number.parseFloat(value);

export const spacing = {
  xs: px(space[1]),
  sm: px(space[2]),
  md: px(space[4]),
  lg: px(space[6]),
  xl: px(space[8]),
  xxl: px(space[12]),
};

export const borderRadius = {
  sm: px(radius.sm),
  md: px(radius.md),
  lg: px(radius.lg),
  xl: px(radius.xl),
  full: px(radius.full),
};

export const typography = {
  fontFamily: {
    regular: type.fontFamilies.sans,
    medium: type.fontFamilies.sans,
    bold: type.fontFamilies.sans,
  },
  fontSize: {
    xs: px(type.fontSizes.xs),
    sm: px(type.fontSizes.sm),
    md: px(type.fontSizes.base),
    lg: px(type.fontSizes.lg),
    xl: px(type.fontSizes.xl),
    xxl: px(type.fontSizes['2xl']),
    xxxl: px(type.fontSizes['3xl']),
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};
