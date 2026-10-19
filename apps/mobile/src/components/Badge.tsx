import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { useTheme } from '../providers/ThemeProvider';

const badgeVariants = cva(
  'flex-row items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200',
        primary: 'bg-brand-primary-100 text-brand-primary-700 dark:bg-brand-primary-900/30 dark:text-brand-primary-300',
        secondary: 'bg-brand-secondary-100 text-brand-secondary-700 dark:bg-brand-secondary-900/30 dark:text-brand-secondary-300',
        success: 'bg-semantic-success-bg text-semantic-success-DEFAULT dark:bg-semantic-success-DEFAULT/20 dark:text-semantic-success-light',
        warning: 'bg-semantic-warning-bg text-semantic-warning-DEFAULT dark:bg-semantic-warning-DEFAULT/20 dark:text-semantic-warning-light',
        error: 'bg-semantic-error-bg text-semantic-error-DEFAULT dark:bg-semantic-error-DEFAULT/20 dark:text-semantic-error-light',
        info: 'bg-semantic-info-bg text-semantic-info-DEFAULT dark:bg-semantic-info-DEFAULT/20 dark:text-semantic-info-light',
        outline: 'border border-border-default bg-transparent',
        active: 'bg-brand-secondary-100 text-brand-secondary-700 dark:bg-brand-secondary-900/30 dark:text-brand-secondary-300',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
      dot: {
        true: 'flex-row items-center',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      dot: false,
    },
  }
);

interface BadgeProps
  extends React.ComponentPropsWithoutRef<typeof View>,
    VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  dotColor?: string;
}

export const Badge = React.forwardRef<React.ElementRef<typeof View>, BadgeProps>(
  ({ className, variant, size, dot, dotColor, children, style, ...props }, ref) => {
    const { theme } = useTheme();

    const getVariantStyles = () => {
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: `${theme.colors.brandPrimary}20`,
            color: theme.colors.brandPrimary,
          };
        case 'secondary':
          return {
            backgroundColor: `${theme.colors.brandSecondary}20`,
            color: theme.colors.brandSecondary,
          };
        case 'success':
          return {
            backgroundColor: `${theme.colors.success}20`,
            color: theme.colors.success,
          };
        case 'warning':
          return {
            backgroundColor: `${theme.colors.warning}20`,
            color: theme.colors.warning,
          };
        case 'error':
          return {
            backgroundColor: `${theme.colors.error}20`,
            color: theme.colors.error,
          };
        case 'info':
          return {
            backgroundColor: `${theme.colors.info}20`,
            color: theme.colors.info,
          };
        case 'active':
          return {
            backgroundColor: `${theme.colors.brandSecondary}20`,
            color: theme.colors.brandSecondary,
          };
        case 'outline':
          return {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: theme.colors.border,
            color: theme.colors.textPrimary,
          };
        default:
          return {
            backgroundColor: theme.colors.surface,
            color: theme.colors.textPrimary,
          };
      }
    };

    const getSizeStyles = () => {
      switch (size) {
        case 'sm':
          return { paddingHorizontal: 8, paddingVertical: 2, fontSize: 10 };
        case 'md':
          return { paddingHorizontal: 10, paddingVertical: 2, fontSize: 12 };
        case 'lg':
          return { paddingHorizontal: 12, paddingVertical: 4, fontSize: 14 };
        default:
          return { paddingHorizontal: 10, paddingVertical: 2, fontSize: 12 };
      }
    };

    const variantStyles = getVariantStyles();
    const sizeStyles = getSizeStyles();

    return (
      <View
        ref={ref}
        style={[
          styles.base,
          variantStyles,
          sizeStyles,
          style,
        ]}
        {...props}
      >
        {dot && (
          <View
            style={[
              styles.dot,
              { backgroundColor: dotColor || variantStyles.color },
            ]}
          />
        )}
        <Text style={[styles.text, { color: variantStyles.color, fontSize: sizeStyles.fontSize }]}>
          {children}
        </Text>
      </View>
    );
  }
);

Badge.displayName = 'Badge';

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
  },
  text: {
    fontWeight: '500',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
});

export { badgeVariants };