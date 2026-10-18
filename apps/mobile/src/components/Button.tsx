import React from 'react';
import { Pressable, Text, View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';

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
    return (
      <Pressable
        ref={ref as any}
        className={buttonVariants({ variant, size, fullWidth, className })}
        disabled={disabled || loading}
        style={style}
        {...props}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' || variant === 'secondary' || variant === 'destructive' || variant === 'success' || variant === 'warning' ? '#ffffff' : undefined}
            style={{ marginRight: leftIcon ? 8 : 0 }}
          />
        ) : (
          <>
            {leftIcon && <View style={{ marginRight: 8 }}>{leftIcon}</View>}
            <Text className="font-medium">{children}</Text>
            {rightIcon && <View style={{ marginLeft: 8 }}>{rightIcon}</View>}
          </>
        )}
      </Pressable>
    );
  }
);

Button.displayName = 'Button';

export { buttonVariants };