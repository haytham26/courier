/**
 * The bottom sheet.
 *
 * The sheet is the way the app shows something over the current screen: a
 * stop, a dictation report, a set of choices. It follows
 * `docs/design/SYSTEM.md` §5:
 *
 * - **Reanimated 4 on the UI thread** - the movement never touches the JS
 *   thread, so it keeps its frames while the voice engine is busy.
 * - **Spring physics** - a critically damped spring, so the sheet settles
 *   without overshooting and the finger can carry its velocity into the
 *   dismissal.
 * - **Drag to dismiss** - the handle is the drag affordance, so a scrolling
 *   area inside the sheet keeps working.
 * - **Reduce motion is respected** - the transition still happens, it simply
 *   has no duration.
 * - **The content below the sheet is hidden from the screen reader**
 *   (`accessibilityViewIsModal` on iOS, `importantForAccessibility` on
 *   Android), the way a modal should behave.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, Keyboard } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { tokens } from '@courier/design-tokens/tokens';
import { useTheme } from '../providers/ThemeProvider';
import { useReducedMotion } from '../motion/useReducedMotion';
import { shouldDismiss, springFor } from '../motion/transitions';

/** The insets of a screen with no safe area at all. */
const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

interface SheetProps extends React.ComponentPropsWithoutRef<typeof View> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  handleStyle?: 'default' | 'hidden';
  backdropDismissible?: boolean;
  onBackdropPress?: () => void;
  size?: 'small' | 'medium' | 'large' | 'full' | 'auto';
  /** Whether the header carries a close button. */
  closable?: boolean;
}

const SHEET_SIZES = {
  small: '30%',
  medium: '50%',
  large: '75%',
  full: '90%',
  auto: '90%',
} as const;

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
      closable = true,
      style,
      ...props
    },
    ref,
  ) => {
    const insets = React.useContext(SafeAreaInsetsContext) ?? NO_INSETS;
    const { theme } = useTheme();
    const reducedMotion = useReducedMotion();

    // 0 is closed, 1 is open. The value lives on the UI thread.
    const progress = useSharedValue(0);
    // The live finger offset, in pixels, while the sheet is being dragged.
    const drag = useSharedValue(0);
    // The measured height of the sheet, in pixels.
    const sheetHeight = useSharedValue(0);
    // 0 until the sheet has been measured, so the first frame is never a
    // half-open sheet in the wrong place.
    const measured = useSharedValue(0);

    const [isVisible, setIsVisible] = React.useState(isOpen);
    // Whether the sheet has been measured. The state is what starts the
    // movement; the shared value is what the style reads.
    const [isMeasured, setIsMeasured] = React.useState(false);
    // Whether the parent has already been told to close the sheet.
    const closeRequested = React.useRef(false);
    // The latest `onClose`, so the movement never restarts when the parent
    // passes a new function.
    const onCloseRef = React.useRef(onClose);

    React.useEffect(() => {
      onCloseRef.current = onClose;
    }, [onClose]);

    // The spring never changes, so it is kept between the renders.
    const spring = React.useMemo(() => springFor('sheet'), []);

    /** The parent is asked to close the sheet. */
    const requestClose = React.useCallback(() => {
      closeRequested.current = true;
      onCloseRef.current();
    }, []);

    /** The sheet has finished closing. */
    const finishClose = React.useCallback(() => {
      setIsVisible(false);
      if (!closeRequested.current) {
        closeRequested.current = true;
        onCloseRef.current();
      }
    }, []);

    // The sheet has to be on screen before it can be measured.
    React.useEffect(() => {
      if (isOpen) {
        closeRequested.current = false;
        setIsVisible(true);
      }
    }, [isOpen]);

    // The movement itself. It waits for the measurement, so the sheet never
    // jumps from the wrong position.
    React.useEffect(() => {
      if (!isVisible) {
        return;
      }

      if (isOpen) {
        if (!isMeasured) {
          return;
        }
        Keyboard.dismiss();
        drag.value = 0;
        if (reducedMotion) {
          progress.value = withTiming(1, { duration: 0 });
        } else {
          progress.value = withSpring(1, spring.config);
        }
        return;
      }

      if (reducedMotion) {
        progress.value = withTiming(0, { duration: 0 }, (finished) => {
          if (finished) {
            runOnJS(finishClose)();
          }
        });
      } else {
        progress.value = withSpring(0, spring.config, (finished) => {
          if (finished) {
            runOnJS(finishClose)();
          }
        });
      }
    }, [isOpen, isVisible, isMeasured, reducedMotion, spring, drag, progress, finishClose]);

    const handleLayout = React.useCallback(
      (event: { nativeEvent: { layout: { height: number } } }) => {
        sheetHeight.value = event.nativeEvent.layout.height;
        if (measured.value === 0) {
          measured.value = 1;
          setIsMeasured(true);
        }
      },
      [measured, sheetHeight],
    );

    const dismiss = React.useCallback(() => {
      requestClose();
    }, [requestClose]);

    // The drag lives on the UI thread: the sheet follows the finger without
    // a single frame through JS.
    const panGesture = React.useMemo(
      () =>
        Gesture.Pan()
          .activeOffsetY(6)
          .failOffsetX([-16, 16])
          .onUpdate((event) => {
            if (event.translationY > 0) {
              drag.value = event.translationY;
            }
          })
          .onEnd((event) => {
            if (shouldDismiss(event.translationY, event.velocityY, sheetHeight.value)) {
              drag.value = 0;
              progress.value = withSpring(0, spring.config, (finished) => {
                if (finished) {
                  runOnJS(requestClose)();
                }
              });
              return;
            }
            drag.value = withSpring(0, spring.config);
          }),
      [drag, progress, requestClose, sheetHeight, spring],
    );

    const sheetAnimatedStyle = useAnimatedStyle(() => ({
      opacity: measured.value,
      transform: [
        {
          translateY:
            interpolate(
              progress.value,
              [0, 1],
              [Math.max(sheetHeight.value, 1), 0],
              Extrapolation.CLAMP,
            ) + drag.value,
        },
      ],
    }));

    const backdropAnimatedStyle = useAnimatedStyle(() => ({
      opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    }));

    if (!isVisible) {
      return null;
    }

    const sizeStyles = { maxHeight: SHEET_SIZES[size] };

    const sheetStyle = {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: insets.bottom,
      backgroundColor: theme.colors.surfaceElevated,
      ...tokens.component.elevation.level3,
      ...sizeStyles,
    };

    return (
      <Animated.View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'none'}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.colors.overlay },
            backdropAnimatedStyle,
          ]}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {backdropDismissible ? (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={onBackdropPress ?? dismiss}
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              testID="sheet-backdrop"
            />
          ) : null}
        </Animated.View>

        <Animated.View
          ref={ref}
          onLayout={handleLayout}
          style={[styles.sheet, sheetStyle, sheetAnimatedStyle, style]}
          accessibilityViewIsModal
          importantForAccessibility="yes"
          onAccessibilityEscape={dismiss}
          {...props}
        >
          {handleStyle !== 'hidden' && (
            <GestureDetector gesture={panGesture}>
              <View style={styles.handleContainer}>
                <View
                  style={[styles.handle, { backgroundColor: theme.colors.border }]}
                  importantForAccessibility="no-hide-descendants"
                />
              </View>
            </GestureDetector>
          )}
          {(title || subtitle || closable) && (
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.headerText}>
                {title ? (
                  <Text role="heading" style={[styles.title, { color: theme.colors.textPrimary }]}>
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              {closable ? (
                <Pressable
                  onPress={dismiss}
                  style={[styles.closeButton, { borderColor: theme.colors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  accessibilityHint="Closes this sheet"
                  testID="sheet-close"
                >
                  <MaterialCommunityIcons name="close" size={24} color={theme.colors.textPrimary} />
                </Pressable>
              ) : null}
            </View>
          )}
          <View style={[styles.content, { paddingBottom: insets.bottom }]}>{children}</View>
        </Animated.View>
      </Animated.View>
    );
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 17,
    marginTop: 4,
  },
  closeButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});
