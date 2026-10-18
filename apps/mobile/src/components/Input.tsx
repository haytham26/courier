import React from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';

const inputVariants = cva(
  'flex-1 h-11 px-4 text-base rounded-default border border-border-default bg-surface-primary text-text-primary placeholder-text-tertiary transition-colors disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:pointer-events-none',
  {
    variants: {
      state: {
        default: '',
        error: 'border-error focus:border-error focus:ring-2 focus:ring-error/20',
        success: 'border-success focus:border-success focus:ring-2 focus:ring-success/20',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-base',
        lg: 'h-13 px-5 text-lg',
      },
    },
    defaultVariants: {
      state: 'default',
      size: 'md',
    },
  }
);

interface InputProps
  extends React.ComponentPropsWithoutRef<typeof TextInput>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<React.ElementRef<typeof TextInput>, InputProps>(
  (
    {
      className,
      state,
      size,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      style,
      ...props
    },
    ref
  ) => {
    const hasError = state === 'error' || !!error;
    const hasHelper = helperText || error;

    return (
      <View className="w-full">
        {label && (
          <Text className="text-sm font-medium text-text-secondary mb-1.5">{label}</Text>
        )}
        <View className="flex-row items-center">
          {leftIcon && (
            <View className="absolute left-3 z-10 text-text-tertiary">
              {leftIcon}
            </View>
          )}
          <TextInput
            ref={ref}
            className={inputVariants({ state, size, className })}
            style={[
              style,
              leftIcon && { paddingLeft: 40 },
              rightIcon && { paddingRight: 40 },
            ] as any}
            {...props}
            accessibilityLabel={label}
            accessibilityHint={helperText}
          />
          {rightIcon && (
            <View className="absolute right-3 z-10 text-text-tertiary">
              {rightIcon}
            </View>
          )}
        </View>
        {hasHelper && (
          <Text
            className={`text-xs mt-1.5 ${hasError ? 'text-error' : 'text-text-tertiary'}`}
          >
            {error || helperText}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

export { inputVariants };