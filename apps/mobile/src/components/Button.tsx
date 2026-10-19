import React from 'react';
import { Pressable, Text, View, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { useTheme } from '../providers/ThemeProvider';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-default transition-colors disabled:opacity-50 disabled:pointer-events-none touch-target-comfortable',
  {
    variants: {
      variant: {
        primary: 'bg-brand-primary-500 text-white hover:bg-brand-primary-600 active:bg-brand-primary-700',
        secondary: 'bg-brand-secondary-500 text-white hover:bg-brand-secondary-600 active:bg-brand-secondary-700',
        outline: 'border border-border-default bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800',
        ghost: 'bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800',
        destructive: 'bg-semantic-error-DEFAULT text-white hover:bg-semantic-error-dark active:bg-semantic-error-dark',
        success: 'bg-semantic-success-DEFAULT text-white hover:bg-semantic-success-dark',
        warning: 'bg-semantic-warning-DEFAULT text-white hover:bg-semantic-warning-dark',
      },
      size: {
        sm: 'h-9 px-3 text-xs',
        md: 'h-11 px-4 text-sm',
        lg: 'h-13 px-6 text-base',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

interface ButtonProps
  extends React.ComponentPropsWithoutRef<typeof Pressable>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const { theme } = useTheme();
    
    // Map variant to theme colors
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
            backgroundColor: theme.colors.brandSecondary,
            borderColor: theme.colors.brandSecondary,
            color: theme.colors.textInverse,
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

    const getSizeStyles = () => {
      switch (size) {
        case 'sm':
          return { height: 36, paddingHorizontal: 12, fontSize: 12 };
        case 'md':
          return { height: 44, paddingHorizontal: 16, fontSize: 14 };
        case 'lg':
          return { height: 52, paddingHorizontal: 24, fontSize: 16 };
        default:
          return { height: 44, paddingHorizontal: 16, fontSize: 14 };
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

    return (
      <Pressable
        ref={ref as any}
        style={baseStyles}
        disabled={disabled || loading}
        {...props}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
        onPressIn={() => {}}
        onPressOut={() => {}}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={
              variant === 'primary' ||
              variant === 'secondary' ||
              variant === 'destructive' ||
              variant === 'success' ||
              variant === 'warning'
                ? '#ffffff'
                : undefined
            }
            style={{ marginRight: leftIcon ? 8 : 0 }}
          />
        ) : (
          <>
            {leftIcon && <View style={{ marginRight: 8 }}>{leftIcon}</View>}
            <Text style={[styles.text, { color: variantStyles.color, fontSize: sizeStyles.fontSize }]}>
              {children}
            </Text>
            {rightIcon && <View style={{ marginLeft: 8 }}>{rightIcon}</View>}
          </>
        )}
      </Pressable>
    );
  }
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    minHeight: 44,
    minWidth: 48,
  },
  text: {
    fontWeight: '500',
  },
});

export { buttonVariants };