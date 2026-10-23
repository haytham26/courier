/**
 * The bottom sheet: the grabber, three heights (peek, half, full), and the
 * map stays live behind it.
 *
 * The sheet rides the sheet envelope of the glass (`glass.fillsBySurface`)
 * and moves with the sheet spring (damping 26, stiffness 260); reduced
 * motion turns the move into a quick linear fade. The grabber is the
 * 36 x 5 handle in the `grabber` token colour; dragging it (or its
 * accessible actions) changes the height.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Dimensions, PanResponder, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { GlassSurface } from './GlassSurface';
import { useChosen } from './context';

export type SheetHeight = 'peek' | 'half' | 'full';

export interface BottomSheetProps {
  height: SheetHeight;
  onHeightChange?: (height: SheetHeight) => void;
  children?: React.ReactNode;
  /** The ref of the `BlurTargetView` wrapping the map (the Android blur). */
  blurTarget?: React.RefObject<React.ComponentRef<typeof View> | null>;
  reduced?: boolean;
  /** How far the sheet floor sits above the screen bottom (the tab dock). */
  bottomInset?: number;
  testID?: string;
}

/** The heights as fractions of the window, from the reference sheets. */
const FRACTIONS: Record<SheetHeight, number> = {
  peek: 0.3,
  half: 0.55,
  full: 0.88,
};

export const BottomSheet = ({
  height,
  onHeightChange,
  children,
  blurTarget,
  reduced: reducedProp,
  bottomInset,
  testID,
}: BottomSheetProps) => {
  const { t, mode } = useChosen();
  const [reducedState, setReducedState] = useState(false);

  const reduced = reducedProp ?? (mode === 'light' ? reducedState : reducedState); // the accessibility check decides
  void mode;

  useEffect(() => {
    if (reducedProp !== undefined) {
      setReducedState(reducedProp);
    }
  }, [reducedProp]);

  useEffect(() => {
    if (reducedProp !== undefined) {
      return;
    }
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (live) {
        setReducedState(value);
      }
    });
    return () => {
      live = false;
    };
  }, [reducedProp]);

  const heights = useMemo(() => {
    const window = Dimensions.get('window').height;
    return {
      peek: Math.round(window * FRACTIONS.peek),
      half: Math.round(window * FRACTIONS.half),
      full: Math.round(window * FRACTIONS.full),
    };
  }, []);

  const [target, setTarget] = useState<SheetHeight>(height);

  useEffect(() => {
    setTarget(height);
  }, [height]);

  const translateY = useSharedValue(Dimensions.get('window').height - heights[height]);

  useEffect(() => {
    const next = Dimensions.get('window').height - heights[target];
    translateY.value = reduced
      ? withTiming(next, { duration: t.motion.reduced.duration.standard })
      : withSpring(next, t.motion.spring.sheet);
  }, [translateY, target, heights, reduced, t]);

  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }), [translateY]);

  const bump = useCallback(
    (direction: 1 | -1) => {
      const order: [SheetHeight, SheetHeight, SheetHeight] = ['peek', 'half', 'full'];
      const next = order[Math.max(0, Math.min(2, order.indexOf(target) + direction))];
      if (next !== target) {
        setTarget(next);
        onHeightChange?.(next);
      }
    },
    [target, onHeightChange],
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 12,
        onPanResponderEnd: (_event, gesture) => {
          if (gesture.dy < -30) bump(1);
          if (gesture.dy > 30) bump(-1);
        },
      }),
    [bump],
  );

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.warp, bottomInset ? { paddingBottom: bottomInset } : null, animated]}
      testID={testID}
    >
      <GlassSurface kind="sheet" runtime={{ blurTarget }} style={{ borderRadius: t.radii.sheet }}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="The stop sheet"
          accessibilityHint="Changes the sheet height: peek, half or full"
          accessibilityActions={[
            { name: 'increment', label: 'Raise the sheet' },
            { name: 'decrement', label: 'Lower the sheet' },
          ]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'increment') bump(1);
            if (event.nativeEvent.actionName === 'decrement') bump(-1);
          }}
          testID={testID ? `${testID}-grabber` : 'sheet-grabber'}
          style={styles.grabberArea}
          {...pan.panHandlers}
        >
          <View style={[styles.grabber, { backgroundColor: t.colors.grabber }]} />
        </View>
        {children}
      </GlassSurface>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  warp: {
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
  },
  grabberArea: {
    height: 24,
    paddingTop: 10,
    alignItems: 'center',
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
});
