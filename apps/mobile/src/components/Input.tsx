import React from 'react';
import { TextInput, View, Text, StyleSheet, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { useUnistyles } from 'react-native-unistyles';

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
  disabled?: boolean;
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
      disabled,
      ...props
    },
    ref
  ) => {
    const { theme } = useUnistyles();
    const hasError = state === 'error' || !!error;
    const hasHelper = helperText || error;

    const baseStyles = StyleSheet.create({
      input: {
        height: 44,
        paddingHorizontal: 16,
        fontSize: 16,
        borderWidth: 1,
        borderRadius: 8,
        backgroundColor: theme.colors.surface ?? '#fafafa',
        color: theme.colors.textPrimary ?? '#18181b',
      },
      inputError: {
        borderColor: theme.colors.error ?? '#ef4444',
      },
      inputSuccess: {
        borderColor: theme.colors.success ?? '#059669',
      },
      inputDefault: {
        borderColor: theme.colors.border ?? '#e4e4e7',
      },
      inputDisabled: {
        backgroundColor: theme.colors.surfaceElevated ?? '#ffffff',
      },
    });

    const sizeStyles = StyleSheet.create({
      sm: { height: 36, paddingHorizontal: 12, fontSize: 14 },
      md: { height: 44, paddingHorizontal: 16, fontSize: 16 },
      lg: { height: 52, paddingHorizontal: 20, fontSize: 18 },
    });

    const inputStyle = [
      baseStyles.input,
      sizeStyles[size as keyof typeof sizeStyles],
      hasError ? baseStyles.inputError : state === 'success' ? baseStyles.inputSuccess : baseStyles.inputDefault,
      disabled ? baseStyles.inputDisabled : null,
      leftIcon && { paddingLeft: 44 },
      rightIcon && { paddingRight: 44 },
      style,
    ] as StyleProp<TextStyle>;

    return (
      <View style={{ width: '100%' }}>
        {label && (
          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary ?? '#000000', marginBottom: 6 }}>{label}</Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {leftIcon && (
            <View style={{ position: 'absolute', left: 12, zIndex: 10 }}>
              {leftIcon}
            </View>
          )}
          <TextInput
            ref={ref}
            style={inputStyle}
            editable={!disabled}
            {...props}
            accessibilityLabel={label}
            accessibilityHint={helperText}
          />
          {rightIcon && (
            <View style={{ position: 'absolute', right: 12, zIndex: 10 }}>
              {rightIcon}
            </View>
          )}
        </View>
        {hasHelper && (
          <Text style={{ fontSize: 12, marginTop: 6, color: hasError ? theme.colors.error ?? '#ef4444' : theme.colors.textTertiary ?? '#a1a1aa' }}>
            {error || helperText}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

export { inputVariants };