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
}

export const DeliveredBadge = ({ reduced = false, testID }: DeliveredBadgeProps) => {
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
        style={[styles.badge, { backgroundColor: t.colors.success }]}
      >
        <View testID={`${testID ?? 'delivered-badge'}-check`} style={styles.check}>
          <Ionicons name="checkmark" size={DELIVERED_CHECK} color={t.colors.onSuccess} />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    width: DELIVERED_BADGE,
    height: DELIVERED_BADGE,
    borderRadius: DELIVERED_BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
