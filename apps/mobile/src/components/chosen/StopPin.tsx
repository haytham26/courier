/**
 * The stop pin.
 *
 * D33 changed the design here (ADR-008 §3): the reference's white-on-colour
 * number badges are unmeetable (white on the green is 2.2:1, and black on
 * the mid-red tops out at 5.92 at any size), so the number rides the inset
 * WHITE CARD CHIP instead — the Apple Maps pattern, and the pair the gate
 * asserts is `label` on `card` (21:1 light, 17:1 dark, 7:1 asked, driving).
 *
 * The pin fill keeps the meaning (success is the next stop, danger is the
 * next stop with a hazard), and it rises with the pin spring.
 */
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useChosen } from './context';

export interface StopPinProps {
  number: string;
  tone?: 'success' | 'danger';
  reduced?: boolean;
  testID?: string;
}

export const StopPin = ({ number, tone = 'success', reduced = false, testID }: StopPinProps) => {
  const { t } = useChosen();
  const [reducedState, setReducedState] = useState(false);
  const effective = reduced || reducedState;

  useEffect(() => {
    if (reduced) {
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
  }, [reduced]);

  // The pin rises gently (the pin spring); reduced keeps it a quick fade.
  const scale = useSharedValue(effective ? 1 : 0.6);

  useEffect(() => {
    scale.value = effective ? withTiming(1, { duration: t.motion.reduced.duration.standard }) : withSpring(1, t.motion.spring.pin);
  }, [scale, effective, t]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      accessible
      accessibilityLabel={`Stop ${number}`}
      testID={testID}
      style={[styles.pin, animated]}
    >
      <View style={[styles.body, { backgroundColor: tone === 'success' ? t.colors.success : t.colors.danger }]} />
      <View
        testID={`${testID ?? 'pin'}-chip`}
        style={[styles.chip, { backgroundColor: t.colors.card }]}
      >
        <Text
          style={{
            color: t.colors.label,
            fontSize: 13,
            lineHeight: 16,
            fontWeight: '700',
            fontVariant: ['tabular-nums'],
          }}
          maxFontSizeMultiplier={1.3}
        >
          {number}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  pin: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 22,
  },
  chip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
