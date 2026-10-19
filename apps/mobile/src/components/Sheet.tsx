import React from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../providers/ThemeProvider';

interface SheetProps
  extends React.ComponentPropsWithoutRef<typeof View> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  handleStyle?: 'default' | 'hidden';
  backdropDismissible?: boolean;
  onBackdropPress?: () => void;
  size?: 'small' | 'medium' | 'large' | 'full' | 'auto';
}

export const Sheet = React.forwardRef<React.ElementRef<typeof Animated.View>, SheetProps>(
  (
    {
      size = 'medium',
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
    const { theme } = useTheme();
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

    const getSizeStyles = () => {
      switch (size) {
        case 'small':
          return { maxHeight: '30%' };
        case 'medium':
          return { maxHeight: '50%' };
        case 'large':
          return { maxHeight: '75%' };
        case 'full':
          return { maxHeight: '90%' };
        case 'auto':
          return { maxHeight: '90%' };
        default:
          return { maxHeight: '50%' };
      }
    };

    const sizeStyles = getSizeStyles();

    const sheetStyle = {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      transform: [{ translateY }] as any,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: insets.bottom,
      backgroundColor: theme.colors.surfaceElevated,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
      ...sizeStyles,
    };

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
          style={[
            styles.sheet,
            sheetStyle,
            style,
          ] as const}
          {...props}
        >
          {handleStyle !== 'hidden' && (
            <View style={styles.handleContainer}>
              <View
                style={[
                  styles.handle,
                  { backgroundColor: theme.colors.border },
                ]}
                importantForAccessibility="no-hide-descendants"
              />
            </View>
          )}
          {(title || subtitle) && (
            <View style={[
              styles.header,
              { borderBottomColor: theme.colors.border },
            ]}>
              {title && (
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                  {subtitle}
                </Text>
              )}
            </View>
          )}
          <View style={[
            styles.content,
            { paddingBottom: insets.bottom },
          ]}>
            {children}
          </View>
        </Animated.View>
      </Animated.View>
    );
  }
);

Sheet.displayName = 'Sheet';

const styles = StyleSheet.create({
  sheet: {
    overflow: 'hidden',
  },
  handleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});