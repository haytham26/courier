/**
 * Slide to Deliver: the one way a parcel is delivered.
 *
 * The contract (docs/design/chosen/README.md component 8, D33):
 * - a 64 pt track at the `slideTrack` radius with a white thumb; a slide is
 *   REQUIRED, so a bump or a tap never marks a parcel delivered (a short
 *   drag returns the thumb); the main action while driving is at least
 *   64 pt high (`touch.drivingAction`);
 *   the delivery is the slide covering most of the thumb's travel: the
 *   gesture's own final translation is the contract, and the fraction
 *   (SLIDE_FRACTION) is chosen so a slide always clears it and a bump never
 *   does. Nothing in the decision reads the thumb's animated position or the
 *   device's frame rate (PLAYBOOK section 12): the first slide after a cold
 *   launch - the busiest moment the app has - delivers exactly like the
 *   tenth.
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

/**
 * The fraction of the thumb's travel a slide must cover to deliver.
 *
 * The design's own gesture is a swipe from 10% to 90% of the track, which
 * covers essentially the whole travel; a bump or a tap covers a fifth of it at
 * most. Three quarters sits between the two with room on both sides, so the
 * decision is a property of the GESTURE and never of the device's frame rate.
 */
const SLIDE_FRACTION = 0.75;

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
      .onEnd((event) => {
        // The delivery's decision is the GESTURE'S OWN FINAL TRANSLATION, and
        // nothing else (PLAYBOOK section 12: an action that works most of the
        // time is an app bug, and never fix the flow).
        //
        // Two things made the old decision depend on the device's frame
        // timing, and both cost real deliveries on a cold launch:
        //
        // 1. It read the THUMB's animated value (`x.value`). That value is
        //    visual feedback driven by the frames the JS thread processes, so
        //    on a busy thread - the first slide of a run, whose bundle and map
        //    are still settling - it lags the gesture, and the delivery's
        //    answer changed with the frame rate. RNGH's end event carries the
        //    drag's own final translation, which is the gesture's ground truth
        //    whether the frames arrived or not.
        // 2. The threshold was the last 6 PIXELS of the travel. A real slide
        //    (the design's own 10% to 90% swipe) clears it by a few pixels on
        //    a wide window and by a comfortable margin on a narrow one, so the
        //    same courier gesture delivered on one device and not on another.
        //
        // The threshold is now a fraction of the travel: a slide covers most
        // of it, a bump never gets past a quarter, and the line between them
        // is not a measurement of the device's speed.
        const covered = Math.min(travel, event.translationX);
        if (covered >= travel * SLIDE_FRACTION) {
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
