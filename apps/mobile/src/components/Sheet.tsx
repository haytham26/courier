import React from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, Keyboard, type StyleProp, type ViewStyle } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';

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
    const { theme } = useUnistyles();
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

    const sizeStyles = {
      small: '30%',
      medium: '50%',
      large: '75%',
      full: '90%',
      auto: 'auto',
    } as const;

    const maxHeight = sizeStyles[size as keyof typeof sizeStyles] || '50%';

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
              maxHeight,
            },
            style,
          ] as StyleProp<ViewStyle>}
          {...props}
        >
          {handleStyle !== 'hidden' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: theme.colors.border ?? '#e4e4e7',
                }}
                importantForAccessibility="no-hide-descendants"
              />
            </View>
          )}
          {(title || subtitle) && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border ?? '#e4e4e7' }}>
              {title && (
                <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary ?? '#18181b' }}>{title}</Text>
              )}
              {subtitle && (
                <Text style={{ fontSize: 14, color: theme.colors.textSecondary ?? '#52525b', marginTop: 2 }}>{subtitle}</Text>
              )}
            </View>
          )}
          <View style={{ flex: 1, overflow: 'hidden', paddingHorizontal: 16, paddingTop: 16 }}>
            {children}
          </View>
        </Animated.View>
      </Animated.View>
    );
  }
);

Sheet.displayName = 'Sheet';

export { sheetVariants };