/**
 * The input.
 *
 * The contract: body text is at least 17 pt, a touch target is at least
 * 56 pt, and the field has to grow with the text rather than clip it at
 * 200 %. The field therefore has a **minimum** height, not a fixed one.
 */
import React from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

interface InputProps extends React.ComponentPropsWithoutRef<typeof TextInput> {
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
      accessibilityLabel,
      accessibilityHint,
      ...props
    },
    ref,
  ) => {
    const { theme } = useTheme();
    const hasError = state === 'error' || !!error;
    const hasHelper = helperText || error;

    const getInputStyles = () => {
      const baseStyles = {
        flex: 1,
        minHeight: 56,
        paddingHorizontal: 16,
        fontSize: 20,
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
          return { minHeight: 56, paddingHorizontal: 12, fontSize: 19 };
        case 'lg':
          return { minHeight: 72, paddingHorizontal: 20, fontSize: 22 };
        case 'md':
        default:
          return { minHeight: 56, paddingHorizontal: 16, fontSize: 20 };
      }
    };

    const inputStyles = getInputStyles();
    const sizeStyles = getSizeStyles();

    const leftPadding = leftIcon ? 48 : 0;
    const rightPadding = rightIcon ? 48 : 0;

    return (
      <View style={styles.container}>
        {label ? (
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
        ) : null}
        <View style={styles.inputWrapper}>
          {leftIcon ? (
            <View style={styles.iconLeft} importantForAccessibility="no-hide-descendants">
              <Text style={{ color: theme.colors.textTertiary }}>{leftIcon}</Text>
            </View>
          ) : null}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              inputStyles,
              sizeStyles,
              { paddingLeft: leftPadding, paddingRight: rightPadding },
              style,
            ]}
            {...props}
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityHint={accessibilityHint ?? helperText}
          />
          {rightIcon ? (
            <View style={styles.iconRight} importantForAccessibility="no-hide-descendants">
              <Text style={{ color: theme.colors.textTertiary }}>{rightIcon}</Text>
            </View>
          ) : null}
        </View>
        {hasHelper ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[
              styles.helperText,
              {
                color: hasError ? theme.colors.error : theme.colors.textTertiary,
              },
            ]}
          >
            {error || helperText}
          </Text>
        ) : null}
      </View>
    );
  },
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 8,
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
    fontSize: 17,
    marginTop: 8,
  },
});
