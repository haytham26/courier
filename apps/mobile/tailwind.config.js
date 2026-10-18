/** @type {import('tailwindcss').Config} */
const { colors, spacing, typography, borderRadius, shadows, motion, components } = require('@courier/design-tokens/tokens');

module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand colors
        brand: {
          primary: colors.brand.primary,
          secondary: colors.brand.secondary,
        },
        // Semantic colors
        semantic: colors.semantic,
        // Neutral
        neutral: colors.neutral,
        // Background
        background: colors.background,
        // Surface
        surface: colors.surface,
        // Border
        border: colors.border,
        // Text
        text: colors.text,
        // Icon
        icon: colors.icon,
        // Status (delivery states)
        status: colors.status,
        // Map themes
        map: {
          day: colors.components.map.day,
          night: colors.components.map.night,
          highContrast: colors.components.map.highContrast,
        },
        // Voice UI
        voice: colors.voice,
      },
      spacing: spacing,
      fontSize: typography.fontSizes,
      fontFamily: typography.fontFamilies,
      fontWeight: typography.fontWeights,
      lineHeight: typography.lineHeights,
      letterSpacing: typography.letterSpacing,
      borderRadius: borderRadius,
      boxShadow: shadows,
      transitionDuration: motion.durations,
      transitionTimingFunction: motion.easings,
      zIndex: zIndex,
      minWidth: {
        touch: colors.touchTarget.minimum,
        'touch-comfortable': colors.touchTarget.comfortable,
        'touch-spacious': colors.touchTarget.spacious,
      },
      minHeight: {
        touch: colors.touchTarget.minimum,
        'touch-comfortable': colors.touchTarget.comfortable,
        'touch-spacious': colors.touchTarget.spacious,
      },
      // Component tokens as custom utilities
      component: components,
    },
  },
  plugins: [],
}