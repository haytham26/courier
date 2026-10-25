/**
 * The delivered badge (05-delivered.html): the 52 pt circle of the success
 * fill with the check that pops into place on arrival.
 *
 * The reference draws the check in white on the green, and D33 changed the
 * pair here the same way it changed the filled chips and the Slide to
 * Deliver (ADR-008 §3): white on the green is 2.2:1 and non-text contrast
 * asks for 3:1, so the check rides `onSuccess` (black, both modes) - the
 * pair the D33 record already names. The geometry is the reference's.
 */
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useChosen } from './context';

/** The badge's own geometry (05-delivered.html: 52 circle, 28 check). */
export const DELIVERED_BADGE = 52;
export const DELIVERED_CHECK = 28;

export interface DeliveredBadgeProps {
  reduced?: boolean;
  testID?: string;
  /**
   * The circle's diameter. The delivered confirm uses the reference's 52;
   * the scanner's match row uses its own 44 (06-scan.html). The check keeps
   * the reference's proportion (28 in 52), so the pair reads the same.
   */
  size?: number;
}

export const DeliveredBadge = ({ reduced = false, testID, size = DELIVERED_BADGE }: DeliveredBadgeProps) => {
  const { t } = useChosen();
  const [reducedState, setReducedState] = useState(false);
  const effective = reduced || reducedState;
  const checkSize = Math.round((size * DELIVERED_CHECK) / DELIVERED_BADGE);

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

  // The pop: the badge scales in from 0.6 with the pin spring (the
  // reference's pop keyframe); reduced motion keeps it still at full scale.
  const scale = useSharedValue(effective ? 1 : 0.6);

  useEffect(() => {
    scale.value = effective
      ? withTiming(1, { duration: t.motion.reduced.duration.standard })
      : withSpring(1, t.motion.spring.pin);
  }, [scale, effective, t]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      // The badge is decorative - the row's texts ("Delivered" and the
      // address) carry the meaning - but it stays reachable in the tree so
      // the tests and the flows find it. The animated wrapper carries the
      // scale; the token look and the testID stay on the static view.
      style={animated}
    >
      <View
        testID={testID ?? 'delivered-badge'}
        style={[
          styles.badge,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: t.colors.success },
        ]}
      >
        <View testID={`${testID ?? 'delivered-badge'}-check`} style={styles.check}>
          <Ionicons name="checkmark" size={checkSize} color={t.colors.onSuccess} />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
