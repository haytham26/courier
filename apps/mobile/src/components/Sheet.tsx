import React from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, Keyboard, type StyleProp, type ViewStyle } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-unistyles';

const sheetVariants = cva(
  'rounded-t-lg',
  {
    variants: {
      size: {
        small: '',
        medium: '',
        large: '',
        full: '',
        auto: '',
      },
    },
    defaultVariants: {
      size: 'medium',
    },
  }
);

interface SheetProps
  extends React.ComponentPropsWithoutRef<typeof View>,
    VariantProps<typeof sheetVariants> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  handleStyle?: 'default' | 'hidden';
  backdropDismissible?: boolean;
  onBackdropPress?: () => void;
}

export const Sheet = React.forwardRef<React.ElementRef<typeof Animated.View>, SheetProps>(
  (
    {
      className,
      size,
      isOpen,
      onClose,
      title,
      subtitle,
      children,
      handleStyle = 'default',
      backdropDismissible = true,
      onBackdropPress,
      style,
      ...props
    },
    ref
  ) => {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const [animation] = React.useState(() => new Animated.Value(0));
    const [isAnimating, setIsAnimating] = React.useState(false);

    React.useEffect(() => {
      if (isOpen) {
        Keyboard.dismiss();
        setIsAnimating(true);
        Animated.timing(animation, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => setIsAnimating(false));
      } else {
        setIsAnimating(true);
        Animated.timing(animation, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          setIsAnimating(false);
          onClose();
        });
      }
    }, [isOpen, animation]);

    const translateY = animation.interpolate({
      inputRange: [0, 1],
      outputRange: ['100%', '0%'],
    });

    const backdropOpacity = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.5],
    });

    if (!isOpen && !isAnimating) {
      return null;
    }

    const variantClassName = sheetVariants({ size, className });

    const sizeStyles = StyleSheet.create({
      small: { maxHeight: '30%' },
      medium: { maxHeight: '50%' },
      large: { maxHeight: '75%' },
      full: { maxHeight: '90%' },
      auto: {},
    });

    return (
      <Animated.View
        style={StyleSheet.absoluteFill}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(0,0,0,0.5)', opacity: backdropOpacity },
          ] as const}
          onStartShouldSetResponder={() => true}
          onResponderGrant={backdropDismissible ? onBackdropPress || onClose : undefined}
          importantForAccessibility="no-hide-descendants"
        />
        <Animated.View
          ref={ref}
          className={variantClassName}
          style={[
            {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              transform: [{ translateY }] as any,
              borderTopLeftRadius: theme.borderRadius.xl,
              borderTopRightRadius: theme.borderRadius.xl,
              paddingBottom: insets.bottom,
              backgroundColor: theme.colors.surface,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
              maxHeight: sizeStyles[size as keyof typeof sizeStyles]?.maxHeight || '50%',
            },
            style,
          ] as StyleProp<ViewStyle>}
          {...props}
        >
          {handleStyle !== 'hidden' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: theme.spacing[3] }}>
              <View
                style={{
                  width: 40,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: theme.colors.border,
                }}
                importantForAccessibility="no-hide-descendants"
              />
            </View>
          )}
          {(title || subtitle) && (
            <View style={{ paddingHorizontal: theme.spacing[4], paddingBottom: theme.spacing[3], borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
              {title && (
                <Text style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: '600', color: theme.colors.textPrimary }}>{title}</Text>
              )}
              {subtitle && (
                <Text style={{ fontSize: theme.typography.fontSizes.sm, color: theme.colors.textSecondary, marginTop: theme.spacing[0.5] }}>{subtitle}</Text>
              )}
            </View>
          )}
          <View style={{ flex: 1, overflow: 'hidden', paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[4] }}>
            {children}
          </View>
        </Animated.View>
      </Animated.View>
    );
  }
);

Sheet.displayName = 'Sheet';

export { sheetVariants };