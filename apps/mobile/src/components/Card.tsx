import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { useTheme } from 'react-native-unistyles';

const cardVariants = cva(
  'rounded-lg border transition-shadow',
  {
    variants: {
      variant: {
        default: '',
        elevated: '',
        outlined: 'shadow-none',
        filled: 'border-none',
        interactive: 'touch-target-comfortable',
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
    const { theme } = useTheme();

    const baseStyles = StyleSheet.create({
      default: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
      elevated: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      },
      outlined: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderWidth: 1,
      },
      filled: {
        backgroundColor: theme.colors.surfaceElevated,
        borderWidth: 0,
      },
      interactive: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderWidth: 1,
      },
    });

    const variantStyle = baseStyles[variant as keyof typeof baseStyles] || baseStyles.default;

    const paddingStyles = StyleSheet.create({
      none: { padding: 0 },
      sm: { padding: theme.spacing[3] },
      md: { padding: theme.spacing[4] },
      lg: { padding: theme.spacing[6] },
    });

    return (
      <View
        ref={ref}
        style={[
          { borderRadius: theme.borderRadius.lg },
          variantStyle,
          paddingStyles[padding as keyof typeof paddingStyles],
          style,
        ] as StyleProp<ViewStyle>}
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