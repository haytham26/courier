import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200',
        primary: 'bg-brand-primary-100 text-brand-primary-700 dark:bg-brand-primary-900 dark:text-brand-primary-200',
        secondary: 'bg-brand-secondary-100 text-brand-secondary-700 dark:bg-brand-secondary-900 dark:text-brand-secondary-200',
        success: 'bg-semantic-success-bg text-semantic-success-dark dark:bg-semantic-success-dark/20 dark:text-semantic-success-light',
        warning: 'bg-semantic-warning-bg text-semantic-warning-dark dark:bg-semantic-warning-dark/20 dark:text-semantic-warning-light',
        error: 'bg-semantic-error-bg text-semantic-error-dark dark:bg-semantic-error-dark/20 dark:text-semantic-error-light',
        info: 'bg-semantic-info-bg text-semantic-info-dark dark:bg-semantic-info-dark/20 dark:text-semantic-info-light',
        // Delivery status variants
        pending: 'bg-status-pending/20 text-status-pending',
        active: 'bg-status-active/20 text-status-active',
        delivered: 'bg-status-delivered/20 text-status-delivered',
        failed: 'bg-status-failed/20 text-status-failed',
        skipped: 'bg-status-skipped/20 text-status-skipped',
      },
      size: {
        sm: 'px-1.5 py-0 text-[10px]',
        md: 'px-2 py-0.5 text-xs',
        lg: 'px-2.5 py-1 text-sm',
      },
      dot: {
        true: 'flex-row gap-1.5',
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
    return (
      <View
        ref={ref}
        className={badgeVariants({ variant, size, dot, className })}
        style={style}
        {...props}
      >
        {dot && (
          <View
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: dotColor }}
          />
        )}
        <Text className="select-none">{children}</Text>
      </View>
    );
  }
);

Badge.displayName = 'Badge';

export { badgeVariants };