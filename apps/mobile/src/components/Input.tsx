import React from 'react';
import { TextInput, View, Text, StyleSheet, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { useTheme } from 'react-native-unistyles';

const inputVariants = cva(
  'flex-1 rounded-default border transition-colors disabled:pointer-events-none',
  {
    variants: {
      state: {
        default: '',
        error: '',
        success: '',
      },
      size: {
        sm: '',
        md: '',
        lg: '',
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

    const baseStyles = StyleSheet.create({
      input: {
        height: 44,
        paddingHorizontal: theme.spacing[4],
        fontSize: theme.typography.fontSizes.base,
        borderWidth: 1,
        borderRadius: theme.borderRadius.default,
        backgroundColor: theme.colors.surface,
        color: theme.colors.textPrimary,
        placeholderTextColor: theme.colors.textTertiary,
      },
      inputError: {
        borderColor: theme.colors.error,
      },
      inputSuccess: {
        borderColor: theme.colors.success,
      },
      inputDefault: {
        borderColor: theme.colors.border,
      },
      inputDisabled: {
        backgroundColor: theme.colors.surfaceElevated,
      },
    });

    const sizeStyles = StyleSheet.create({
      sm: { height: 36, paddingHorizontal: theme.spacing[3], fontSize: theme.typography.fontSizes.sm },
      md: { height: 44, paddingHorizontal: theme.spacing[4], fontSize: theme.typography.fontSizes.base },
      lg: { height: 52, paddingHorizontal: theme.spacing[5], fontSize: theme.typography.fontSizes.lg },
    });

    const inputStyle = [
      baseStyles.input,
      sizeStyles[size as keyof typeof sizeStyles],
      hasError ? baseStyles.inputError : state === 'success' ? baseStyles.inputSuccess : baseStyles.inputDefault,
      props.disabled ? baseStyles.inputDisabled : null,
      leftIcon && { paddingLeft: 44 },
      rightIcon && { paddingRight: 44 },
      style,
    ] as StyleProp<TextStyle>;

    return (
      <View style={{ width: '100%' }}>
        {label && (
          <Text style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: '500', color: theme.colors.textSecondary, marginBottom: theme.spacing[1.5] }}>{label}</Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {leftIcon && (
            <View style={{ position: 'absolute', left: theme.spacing[3], zIndex: 10, color: theme.colors.textTertiary }}>
              {leftIcon}
            </View>
          )}
          <TextInput
            ref={ref}
            style={inputStyle}
            {...props}
            accessibilityLabel={label}
            accessibilityHint={helperText}
          />
          {rightIcon && (
            <View style={{ position: 'absolute', right: theme.spacing[3], zIndex: 10, color: theme.colors.textTertiary }}>
              {rightIcon}
            </View>
          )}
        </View>
        {hasHelper && (
          <Text style={{ fontSize: theme.typography.fontSizes.xs, marginTop: theme.spacing[1.5], color: hasError ? theme.colors.error : theme.colors.textTertiary }}>
            {error || helperText}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

export { inputVariants };