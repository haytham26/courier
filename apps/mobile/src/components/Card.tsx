/**
 * The card.
 *
 * A card is a surface, not a control. When it is interactive it says so:
 * the role is `button` and the caller gives it a label, so a screen reader
 * reads "Stop 2, 45 Papanui Road, Merivale, Active" and not "View".
 *
 * The elevation follows the contract: three levels and no shadow stacks.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { tokens } from '@courier/design-tokens/tokens';

interface CardProps extends React.ComponentPropsWithoutRef<typeof View> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * The three elevation levels of the contract. A card never stacks two of
 * them.
 */
const ELEVATION = tokens.component.elevation;

export const Card = React.forwardRef<React.ElementRef<typeof View>, CardProps>(
  ({ variant = 'default', padding = 'md', children, style, ...props }, ref) => {
    const { theme } = useTheme();

    const getVariantStyles = (): ViewStyle => {
      switch (variant) {
        case 'elevated':
          return {
            ...ELEVATION.level2,
            borderWidth: 0,
          };
        case 'outlined':
          return {
            borderWidth: 1,
            borderColor: theme.colors.border,
            shadowColor: 'transparent',
            elevation: 0,
          };
        case 'filled':
          return {
            backgroundColor: theme.colors.surface,
            borderWidth: 0,
            ...ELEVATION.level1,
          };
        case 'interactive':
          return {
            backgroundColor: theme.colors.surfaceElevated,
            borderWidth: 1,
            borderColor: theme.colors.border,
            ...ELEVATION.level1,
          };
        default:
          return {
            backgroundColor: theme.colors.surfaceElevated,
            borderWidth: 1,
            borderColor: theme.colors.border,
            ...ELEVATION.level1,
          };
      }
    };

    const getPaddingStyles = () => {
      switch (padding) {
        case 'none':
          return { padding: 0 };
        case 'sm':
          return { padding: 12 };
        case 'lg':
          return { padding: 24 };
        case 'md':
        default:
          return { padding: 16 };
      }
    };

    const variantStyles = getVariantStyles();
    const paddingStyles = getPaddingStyles();

    return (
      <View
        ref={ref}
        style={[styles.base, variantStyles, paddingStyles, style]}
        {...props}
        accessibilityRole={variant === 'interactive' ? 'button' : undefined}
      >
        {children}
      </View>
    );
  },
);

Card.displayName = 'Card';

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
  },
});
