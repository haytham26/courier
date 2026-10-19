import React from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { useTheme } from '../providers/ThemeProvider';

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
    const { theme } = useTheme();
    const hasError = state === 'error' || !!error;
    const hasHelper = helperText || error;

    const getInputStyles = () => {
      const baseStyles = {
        flex: 1,
        height: 44,
        paddingHorizontal: 16,
        fontSize: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        color: theme.colors.textPrimary,
        placeholderTextColor: theme.colors.textTertiary,
      };

      if (hasError) {
        return {
          ...baseStyles,
          borderColor: theme.colors.error,
        };
      }

      if (state === 'success') {
        return {
          ...baseStyles,
          borderColor: theme.colors.success,
        };
      }

      return baseStyles;
    };

    const getSizeStyles = () => {
      switch (size) {
        case 'sm':
          return { height: 36, paddingHorizontal: 12, fontSize: 14 };
        case 'md':
          return { height: 44, paddingHorizontal: 16, fontSize: 16 };
        case 'lg':
          return { height: 52, paddingHorizontal: 20, fontSize: 18 };
        default:
          return { height: 44, paddingHorizontal: 16, fontSize: 16 };
      }
    };

    const inputStyles = getInputStyles();
    const sizeStyles = getSizeStyles();

    const leftPadding = leftIcon ? 48 : 0;
    const rightPadding = rightIcon ? 48 : 0;

    return (
      <View style={styles.container}>
        {label && (
          <Text style={[
            styles.label,
            { color: theme.colors.textSecondary },
          ]}>
            {label}
          </Text>
        )}
        <View style={styles.inputWrapper}>
          {leftIcon && (
            <View style={styles.iconLeft}>
              <Text style={{ color: theme.colors.textTertiary }}>{leftIcon}</Text>
            </View>
          )}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              inputStyles,
              sizeStyles,
              { paddingLeft: leftPadding, paddingRight: rightPadding },
              style,
            ] as const}
            {...props}
            accessibilityLabel={label}
            accessibilityHint={helperText}
          />
          {rightIcon && (
            <View style={styles.iconRight}>
              <Text style={{ color: theme.colors.textTertiary }}>{rightIcon}</Text>
            </View>
          )}
        </View>
        {hasHelper && (
          <Text style={[
            styles.helperText,
            { color: hasError ? theme.colors.error : theme.colors.textTertiary },
          ]}>
            {error || helperText}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
  },
  iconLeft: {
    position: 'absolute',
    left: 12,
    zIndex: 10,
  },
  iconRight: {
    position: 'absolute',
    right: 12,
    zIndex: 10,
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
  },
});

export { inputVariants };