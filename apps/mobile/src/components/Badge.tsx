import React from 'react';
import { Text, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { useTheme } from 'react-native-unistyles';

const badgeVariants = cva(
  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: '',
        primary: '',
        secondary: '',
        success: '',
        warning: '',
        error: '',
        info: '',
        pending: '',
        active: '',
        delivered: '',
        failed: '',
        skipped: '',
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
    const { theme } = useTheme();

    const baseStyles = StyleSheet.create({
      default: {
        backgroundColor: `${theme.colors.border}40`, // 25% opacity
        color: theme.colors.textSecondary,
      },
      primary: {
        backgroundColor: `${theme.colors.brandPrimary}33`, // 20% opacity
        color: theme.colors.brandPrimary,
      },
      secondary: {
        backgroundColor: `${theme.colors.brandSecondary}33`,
        color: theme.colors.brandSecondary,
      },
      success: {
        backgroundColor: `${theme.colors.success}33`,
        color: theme.colors.success,
      },
      warning: {
        backgroundColor: `${theme.colors.warning}33`,
        color: theme.colors.warning,
      },
      error: {
        backgroundColor: `${theme.colors.error}33`,
        color: theme.colors.error,
      },
      info: {
        backgroundColor: `${theme.colors.info}33`,
        color: theme.colors.info,
      },
      pending: {
        backgroundColor: `${theme.colors.statusPending}33`,
        color: theme.colors.statusPending,
      },
      active: {
        backgroundColor: `${theme.colors.statusActive}33`,
        color: theme.colors.statusActive,
      },
      delivered: {
        backgroundColor: `${theme.colors.statusDelivered}33`,
        color: theme.colors.statusDelivered,
      },
      failed: {
        backgroundColor: `${theme.colors.statusFailed}33`,
        color: theme.colors.statusFailed,
      },
      skipped: {
        backgroundColor: `${theme.colors.statusSkipped}33`,
        color: theme.colors.statusSkipped,
      },
    });

    const variantStyle = baseStyles[variant as keyof typeof baseStyles] || baseStyles.default;

    const sizeStyles = StyleSheet.create({
      sm: { paddingHorizontal: theme.spacing[1.5], paddingVertical: 0, fontSize: 10 },
      md: { paddingHorizontal: theme.spacing[2], paddingVertical: theme.spacing[0.5], fontSize: 12 },
      lg: { paddingHorizontal: theme.spacing[2.5], paddingVertical: theme.spacing[1], fontSize: 14 },
    });

    return (
      <View
        ref={ref}
        style={[
          {
            borderRadius: 9999,
            flexDirection: dot ? 'row' : 'column',
            alignItems: 'center',
            gap: dot ? theme.spacing[1.5] : 0,
          },
          variantStyle,
          sizeStyles[size as keyof typeof sizeStyles],
          style,
        ] as StyleProp<ViewStyle>}
        {...props}
      >
        {dot && (
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: dotColor || (variantStyle as any).color,
              flexShrink: 0,
            }}
          />
        )}
        <Text style={{ fontWeight: '600' }} selectable={false}>{children}</Text>
      </View>
    );
  }
);

Badge.displayName = 'Badge';

export { badgeVariants };