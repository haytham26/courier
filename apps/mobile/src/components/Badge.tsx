import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

interface BadgeProps
  extends React.ComponentPropsWithoutRef<typeof View> {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'active' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  dotColor?: string;
}

export const Badge = React.forwardRef<React.ElementRef<typeof View>, BadgeProps>(
  ({ variant = 'default', size = 'md', dot = false, dotColor, children, style, ...props }, ref) => {
    const { theme } = useTheme();

    const getVariantStyles = () => {
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: `${theme.colors.brandPrimary}20`,
            color: theme.colors.brandPrimary,
          };
        case 'secondary':
          return {
            backgroundColor: `${theme.colors.brandSecondary}20`,
            color: theme.colors.brandSecondary,
          };
        case 'success':
          return {
            backgroundColor: `${theme.colors.success}20`,
            color: theme.colors.success,
          };
        case 'warning':
          return {
            backgroundColor: `${theme.colors.warning}20`,
            color: theme.colors.warning,
          };
        case 'error':
          return {
            backgroundColor: `${theme.colors.error}20`,
            color: theme.colors.error,
          };
        case 'info':
          return {
            backgroundColor: `${theme.colors.info}20`,
            color: theme.colors.info,
          };
        case 'active':
          return {
            backgroundColor: `${theme.colors.brandSecondary}20`,
            color: theme.colors.brandSecondary,
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
          return { paddingHorizontal: 8, paddingVertical: 2, fontSize: 10 };
        case 'md':
          return { paddingHorizontal: 10, paddingVertical: 2, fontSize: 12 };
        case 'lg':
          return { paddingHorizontal: 12, paddingVertical: 4, fontSize: 14 };
        default:
          return { paddingHorizontal: 10, paddingVertical: 2, fontSize: 12 };
      }
    };

    const variantStyles = getVariantStyles();
    const sizeStyles = getSizeStyles();

    return (
      <View
        ref={ref}
        style={[
          styles.base,
          variantStyles,
          sizeStyles,
          style,
        ]}
        {...props}
      >
        {dot && (
          <View
            style={[
              styles.dot,
              { backgroundColor: dotColor || variantStyles.color },
            ]}
          />
        )}
        <Text style={[styles.text, { color: variantStyles.color, fontSize: sizeStyles.fontSize }]}>
          {children}
        </Text>
      </View>
    );
  }
);

Badge.displayName = 'Badge';

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
  },
  text: {
    fontWeight: '500',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
});