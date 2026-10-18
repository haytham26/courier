import React from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, Keyboard } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const sheetVariants = cva(
  'rounded-t-lg bg-surface-primary shadow-elevation5',
  {
    variants: {
      size: {
        small: 'h-[30%]',
        medium: 'h-[50%]',
        large: 'h-[75%]',
        full: 'h-[90%]',
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
    }, [isOpen]);

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
              transform: [{ translateY }],
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingBottom: insets.bottom,
            },
            style,
          ]}
          {...props}
        >
          {handleStyle !== 'hidden' && (
            <View className="flex-row items-center justify-center pb-3">
              <View
                className="w-10 h-1 bg-border-default rounded-full"
                importantForAccessibility="no-hide-descendants"
              />
            </View>
          )}
          {(title || subtitle) && (
            <View className="px-4 pb-3 border-b border-border-light">
              {title && (
                <Text className="text-lg font-semibold text-text-primary">{title}</Text>
              )}
              {subtitle && (
                <Text className="text-sm text-text-secondary mt-0.5">{subtitle}</Text>
              )}
            </View>
          )}
          <View className="flex-1 overflow-y-auto px-4 py-4">
            {children}
          </View>
        </Animated.View>
      </Animated.View>
    );
  }
);

Sheet.displayName = 'Sheet';

export { sheetVariants };