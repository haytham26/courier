/**
 * The badge.
 *
 * A badge carries a status. The status is never colour-only: the badge
 * always has its text, and the dot is decorative, so it is hidden from the
 * screen reader. The label on the pill clears the 4.5:1 bar in every theme -
 * the numbers are in `packages/design-tokens/src/contrast.test.ts`.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

interface BadgeProps extends React.ComponentPropsWithoutRef<typeof View> {
  children: React.ReactNode;
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'active'
    | 'outline';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  dotColor?: string;
}

/** The tint of a badge pill: the colour at 12.5 % over the surface. */
const TINT_ALPHA = '20';

export const Badge = React.forwardRef<React.ElementRef<typeof View>, BadgeProps>(
  ({ variant = 'default', size = 'md', dot = false, dotColor, children, style, ...props }, ref) => {
    const { theme } = useTheme();

    const getVariantStyles = () => {
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: `${theme.colors.brandPrimary}${TINT_ALPHA}`,
            color: theme.colors.brandPrimary,
          };
        case 'secondary':
          return {
            backgroundColor: `${theme.colors.brandSecondary}${TINT_ALPHA}`,
            color: theme.colors.brandSecondary,
          };
        case 'success':
          return {
            backgroundColor: `${theme.colors.success}${TINT_ALPHA}`,
            color: theme.colors.success,
          };
        case 'warning':
          return {
            backgroundColor: `${theme.colors.warning}${TINT_ALPHA}`,
            color: theme.colors.warning,
          };
        case 'error':
          return {
            backgroundColor: `${theme.colors.error}${TINT_ALPHA}`,
            color: theme.colors.error,
          };
        case 'info':
          return {
            backgroundColor: `${theme.colors.info}${TINT_ALPHA}`,
            color: theme.colors.info,
          };
        case 'active':
          return {
            backgroundColor: `${theme.colors.statusActive}${TINT_ALPHA}`,
            color: theme.colors.statusActive,
          };
        case 'outline':
          return {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: theme.colors.border,
            color: theme.colors.textPrimary,
          };
        default:
          return {
            backgroundColor: theme.colors.surface,
            color: theme.colors.textPrimary,
          };
      }
    };

    const getSizeStyles = () => {
      switch (size) {
        case 'sm':
          return { paddingHorizontal: 8, paddingVertical: 4, fontSize: 17 };
        case 'lg':
          return { paddingHorizontal: 12, paddingVertical: 4, fontSize: 19 };
        case 'md':
        default:
          return { paddingHorizontal: 10, paddingVertical: 4, fontSize: 17 };
      }
    };

    const variantStyles = getVariantStyles();
    const sizeStyles = getSizeStyles();

    return (
      <View
        ref={ref}
        style={[styles.base, variantStyles, sizeStyles, style]}
        {...props}
        accessibilityRole="text"
      >
        {dot ? (
          <View
            style={[styles.dot, { backgroundColor: dotColor || variantStyles.color }]}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          />
        ) : null}
        <Text style={[styles.text, { color: variantStyles.color, fontSize: sizeStyles.fontSize }]}>
          {children}
        </Text>
      </View>
    );
  },
);

Badge.displayName = 'Badge';

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
  },
  text: {
    fontWeight: '600',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
});
