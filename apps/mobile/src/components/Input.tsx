import React from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

interface InputProps
  extends React.ComponentPropsWithoutRef<typeof TextInput> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  state?: 'default' | 'error' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

export const Input = React.forwardRef<React.ElementRef<typeof TextInput>, InputProps>(
  (
    {
      state = 'default',
      size = 'md',
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