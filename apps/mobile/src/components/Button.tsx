import React from 'react';
import { Pressable, Text, View, StyleSheet, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { useTheme } from 'react-native-unistyles';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-default transition-colors disabled:opacity-50 disabled:pointer-events-none touch-target-comfortable',
  {
    variants: {
      variant: {
        primary: 'bg-brand-primary text-white',
        secondary: 'bg-brand-secondary text-white',
        outline: 'border border-border bg-transparent',
        ghost: 'bg-transparent',
        destructive: 'bg-error text-white',
        success: 'bg-success text-white',
        warning: 'bg-warning text-white',
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

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
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

    const baseStyles = StyleSheet.create({
      primary: {
        backgroundColor: theme.colors.brandPrimary,
      },
      secondary: {
        backgroundColor: theme.colors.brandSecondary,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      ghost: {
        backgroundColor: 'transparent',
      },
      destructive: {
        backgroundColor: theme.colors.error,
      },
      success: {
        backgroundColor: theme.colors.success,
      },
      warning: {
        backgroundColor: theme.colors.warning,
      },
    });

    const variantStyle = baseStyles[variant as keyof typeof baseStyles] || baseStyles.primary;

    return (
      <Pressable
        ref={ref as any}
        disabled={disabled || loading}
        style={[{ borderRadius: theme.borderRadius.default }, variantStyle, style] as StyleProp<ViewStyle>}
        {...props}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={['primary', 'secondary', 'destructive', 'success', 'warning'].includes(variant) ? '#ffffff' : theme.colors.textPrimary}
            style={{ marginRight: leftIcon ? 8 : 0 }}
          />
        ) : (
          <>
            {leftIcon && <View style={{ marginRight: 8 }}>{leftIcon}</View>}
            <Text style={{ fontWeight: '600', color: ['outline', 'ghost'].includes(variant) ? theme.colors.textPrimary : '#ffffff' }}>{children}</Text>
            {rightIcon && <View style={{ marginLeft: 8 }}>{rightIcon}</View>}
          </>
        )}
      </Pressable>
    );
  }
);

Button.displayName = 'Button';

export { buttonVariants };