import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

interface CardProps
  extends React.ComponentPropsWithoutRef<typeof View> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<React.ElementRef<typeof View>, CardProps>(
  ({ variant = 'default', padding = 'md', children, style, ...props }, ref) => {
    const { theme } = useTheme();

    const getVariantStyles = () => {
      switch (variant) {
        case 'elevated':
          return {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 4,
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
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          };
        case 'interactive':
          return {
            backgroundColor: theme.colors.surfaceElevated,
            borderWidth: 1,
            borderColor: theme.colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          };
        default:
          return {
            backgroundColor: theme.colors.surfaceElevated,
            borderWidth: 1,
            borderColor: theme.colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.12,
            shadowRadius: 3,
            elevation: 1,
          };
      }
    };

    const getPaddingStyles = () => {
      switch (padding) {
        case 'none':
          return { padding: 0 };
        case 'sm':
          return { padding: 12 };
        case 'md':
          return { padding: 16 };
        case 'lg':
          return { padding: 24 };
        default:
          return { padding: 16 };
      }
    };

    const variantStyles = getVariantStyles();
    const paddingStyles = getPaddingStyles();

    return (
      <View
        ref={ref}
        style={[
          styles.base,
          variantStyles,
          paddingStyles,
          style,
        ]}
        {...props}
        accessibilityRole={variant === 'interactive' ? 'button' : undefined}
      >
        {children}
      </View>
    );
  }
);

Card.displayName = 'Card';

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
  },
});