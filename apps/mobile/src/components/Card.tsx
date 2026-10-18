import React from 'react';
import { View, StyleSheet } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  'rounded-lg border border-border-light bg-surface-primary shadow-elevation1 transition-shadow',
  {
    variants: {
      variant: {
        default: '',
        elevated: 'shadow-elevation3',
        outlined: 'border-border-default shadow-none',
        filled: 'bg-surface-secondary border-none',
        interactive: 'touch-target-comfortable active:shadow-elevation2 active:scale-[0.99]',
      },
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

interface CardProps
  extends React.ComponentPropsWithoutRef<typeof View>,
    VariantProps<typeof cardVariants> {
  children: React.ReactNode;
}

export const Card = React.forwardRef<React.ElementRef<typeof View>, CardProps>(
  ({ className, variant, padding, children, style, ...props }, ref) => {
    return (
      <View
        ref={ref}
        className={cardVariants({ variant, padding, className })}
        style={style}
        {...props}
        accessibilityRole={variant === 'interactive' ? 'button' : undefined}
      >
        {children}
      </View>
    );
  }
);

Card.displayName = 'Card';

export { cardVariants };