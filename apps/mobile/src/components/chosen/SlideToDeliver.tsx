/**
 * Slide to Deliver: the one way a parcel is delivered.
 *
 * The contract (docs/design/chosen/README.md component 8, D33):
 * - a 64 pt track at the `slideTrack` radius with a white thumb; a slide is
 *   REQUIRED, so a bump or a tap never marks a parcel delivered (a short
 *   drag returns the thumb); the main action while driving is at least
 *   64 pt high (`touch.drivingAction`);
 *   the delivery is the THUMB AT THE END of the travel - a drag that covers
 *   it delivers whether the courier lets go while moving or pauses at the
 *   end (the release velocity was a second gate until run 40000405667: a
 *   paused drag delivered nothing, and the E2E's fast swipe failed the same
 *   way; the position is the contract, not the fling);
 * - the label is BLACK on the success fill in both modes (`onSuccess`) at
 *   `slideLabel` 19/700;
 * - a haptic on success;
 * - accessibility: a double tap action with a confirmation exists for
 *   screen readers — the first activation asks, the second confirms the
 *   delivery, which keeps the two-step character of the slide.
 */
import React, { useCallback, useImperativeHandle, useState, forwardRef } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useChosen } from './context';

export interface SlideToDeliverProps {
  label?: string;
  onDeliver: () => void;
  disabled?: boolean;
  testID?: string;
}

export interface SlideToDeliverHandle {
  /** The screen-reader path: ask, then confirm. */
  confirm: () => void;
}

const THUMB = 54;

export const SlideToDeliver = forwardRef<SlideToDeliverHandle, SlideToDeliverProps>(
  ({ label = 'Slide to Deliver', onDeliver, disabled = false, testID }, ref) => {
    const { t } = useChosen();
    const { width: windowWidth } = useWindowDimensions();
    const [confirming, setConfirming] = useState(false);

    const trackPadding = 5;
    const trackWidth = Math.min(windowWidth - 32, 358);
    const travel = trackWidth - THUMB - trackPadding * 2 - 4;

    const x = useSharedValue(0);

    const fire = useCallback(() => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      x.value = withSpring(0, t.motion.spring.thumb);
      onDeliver();
    }, [onDeliver, t.motion.spring.thumb, x]);

    useImperativeHandle(ref, () => ({ confirm: fire }), [fire]);

    const pan = Gesture.Pan()
      .enabled(!disabled)
      .activeOffsetX([-10, 10])
      .onUpdate((event) => {
        x.value = Math.max(0, Math.min(travel, event.translationX));
      })
      .onEnd(() => {
        // The slide is the contract, and the THUMB AT THE END is the
        // contract: the travel being covered is what distinguishes a slide
        // from a bump (a short drag stops below the threshold and returns).
        // The release velocity used to be a second condition here, and it
        // was a false negative: a courier who drags to the end and PAUSES
        // (or a touch stream that ends at rest) delivered nothing - the
        // position already carries the intent, so it is the only gate.
        const atEnd = x.value > travel - 6;
        if (atEnd) {
          onDeliver();
        }
        // A short drag returns the thumb: a slide is required.
        x.value = withSpring(0, t.motion.spring.thumb);
      })
      .runOnJS(true);

    const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }), [x]);

    const confirm = () => {
      if (confirming) {
        setConfirming(false);
        fire();
      } else {
        setConfirming(true);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    };

    return (
      <GestureDetector gesture={pan}>
        <Pressable
          accessible
          role="button"
          accessibilityLabel={label}
          accessibilityHint={confirming ? 'Activates again to confirm the delivery' : 'Slides to deliver'}
          accessibilityActions={[{ name: 'activate', label: confirming ? 'Confirm the delivery' : 'Slide to deliver' }]}
          onAccessibilityAction={(event) => {
            if (!disabled && event.nativeEvent.actionName === 'activate') {
              confirm();
            }
          }}
          disabled={disabled}
          testID={testID ?? 'slide-to-deliver'}
          style={[
            styles.track,
            {
              width: trackWidth,
              borderRadius: t.radii.slideTrack,
              backgroundColor: disabled ? t.colors.fill : t.colors.success,
            },
            confirming ? { borderWidth: 2, borderColor: t.colors.onSuccess } : null,
          ]}
        >
          <Text
            style={[
              styles.label,
              { color: disabled ? t.colors.secondaryLabel : t.colors.onSuccess },
            ]}
            maxFontSizeMultiplier={1.3}
          >
            {confirming ? 'Activate again to confirm' : label}
          </Text>
          <Animated.View
            style={[
              styles.thumb,
              {
                width: THUMB,
                height: THUMB,
                borderRadius: t.radii.button,
                backgroundColor: t.colors.card,
                transform: disabled ? [] : undefined,
              },
              thumbStyle,
            ]}
          >
            <Text accessibilityElementsHidden style={[styles.check, { color: t.colors.successText }]}>
              ✓
            </Text>
          </Animated.View>
        </Pressable>
      </GestureDetector>
    );
  },
);

const styles = StyleSheet.create({
  track: {
    height: 64,
    justifyContent: 'center',
    padding: 5,
  },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '700',
    marginTop: 27,
  },
  thumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    fontSize: 24,
    fontWeight: '700',
  },
});
