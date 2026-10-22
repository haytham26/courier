/**
 * The button.
 *
 * The contract (`docs/design/SYSTEM.md` §2 and §3): a touch target is at
 * least **56 pt**, the primary action is **72 pt**, there is one primary
 * action per screen, and every interactive element has an accessibility
 * label and a role.
 *
 * The secondary action is a surface with a border, not a second brand colour:
 * "one primary action per screen" means the second button must not compete
 * with the first.
 */
import React from 'react';
import { Pressable, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import type { ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

interface ButtonProps extends React.ComponentPropsWithoutRef<typeof Pressable> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      style,
      onPressIn,
      onPressOut,
      accessibilityLabel,
      ...props
    },
    ref,
  ) => {
    const { theme } = useTheme();

    // The variant decides the colours: the fill, the border and the label.
    const getVariantStyles = () => {
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: theme.colors.brandPrimary,
            borderColor: theme.colors.brandPrimary,
            color: theme.colors.textInverse,
          };
        case 'secondary':
          return {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.textPrimary,
          };
        case 'outline':
          return {
            backgroundColor: 'transparent',
            borderColor: theme.colors.border,
            color: theme.colors.textPrimary,
            borderWidth: 1,
          };
        case 'ghost':
          return {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            color: theme.colors.textPrimary,
          };
        case 'destructive':
          return {
            backgroundColor: theme.colors.error,
            borderColor: theme.colors.error,
            color: theme.colors.textInverse,
          };
        case 'success':
          return {
            backgroundColor: theme.colors.success,
            borderColor: theme.colors.success,
            color: theme.colors.textInverse,
          };
        case 'warning':
          return {
            backgroundColor: theme.colors.warning,
            borderColor: theme.colors.warning,
            color: theme.colors.textInverse,
          };
        default:
          return {
            backgroundColor: theme.colors.brandPrimary,
            borderColor: theme.colors.brandPrimary,
            color: theme.colors.textInverse,
          };
      }
    };

    // The size decides the height: 56 pt for a normal action, 72 pt for the
    // primary action of a screen.
    const getSizeStyles = () => {
      switch (size) {
        case 'sm':
          return { height: 56, paddingHorizontal: 12, fontSize: 17 };
        case 'lg':
          return { height: 72, paddingHorizontal: 24, fontSize: 22 };
        case 'md':
        default:
          return { height: 56, paddingHorizontal: 16, fontSize: 19 };
      }
    };

    const variantStyles = getVariantStyles();
    const sizeStyles = getSizeStyles();

    // Build the static style array (without press state)
    const baseStyles = [
      styles.base,
      variantStyles,
      sizeStyles,
      { width: fullWidth ? '100%' : 'auto' },
      { opacity: disabled || loading ? 0.5 : 1 },
      style,
    ].filter(Boolean) as StyleProp<ViewStyle>[];

    // The label of the button is its own text, unless the caller gives one.
    const label = accessibilityLabel ?? (typeof children === 'string' ? children : undefined);

    return (
      <Pressable
        ref={ref}
        style={baseStyles}
        disabled={disabled || loading}
        {...props}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variantStyles.color}
            style={{ marginRight: leftIcon ? 8 : 0 }}
          />
        ) : (
          <>
            {leftIcon ? <View style={{ marginRight: 8 }}>{leftIcon}</View> : null}
            <Text
              style={[styles.text, { color: variantStyles.color, fontSize: sizeStyles.fontSize }]}
            >
              {children}
            </Text>
            {rightIcon ? <View style={{ marginLeft: 8 }}>{rightIcon}</View> : null}
          </>
        )}
      </Pressable>
    );
  },
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    minHeight: 56,
    minWidth: 56,
  },
  text: {
    fontWeight: '600',
  },
});
