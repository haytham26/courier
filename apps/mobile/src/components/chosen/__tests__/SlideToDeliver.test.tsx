/**
 * Slide to Deliver: a slide is required (a bump never delivers), the label
 * is black on the green in both modes (D33), the success haptic fires, and
 * the screen-reader path is a two-step confirmation.
 *
 * The gesture half (PLAYBOOK section 12): the delivery's decision must not
 * depend on WHEN the gesture's events arrive. RNGH delivers a JS-thread pan
 * asynchronously, so on a busy device - a cold launch whose map is still
 * settling, the first slide of a run - the end event can arrive before the
 * updates were processed, with a partial translation, or in an order a test
 * would never choose. These tests drive those shapes through a captured
 * harness and assert the DELIVERY's decision, never the timing.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { ChosenProvider, SlideToDeliver } from '../index';
import { styleOf } from '../test-support';
import { tokens } from '@courier/design-tokens/chosen';

// The pan gesture's handlers, captured at render time so a test can drive them
// directly: what the component decides from the events is the contract, and a
// test must be able to send a late, partial or reordered one. The module is
// replaced with the smallest surface the component uses, so the test does not
// depend on the library's internals.
const panStore: {
  onBegin?: unknown;
  onUpdate?: (event: { translationX: number }) => void;
  onEnd?: (event: { translationX: number }) => void;
} = {};

jest.mock('react-native-gesture-handler', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    ReactActual.createElement(ReactActual.Fragment, null, children);
  const chain = {
    enabled: () => chain,
    activeOffsetX: () => chain,
    onBegin: (fn: unknown) => {
      panStore.onBegin = fn;
      return chain;
    },
    onUpdate: (fn: unknown) => {
      panStore.onUpdate = fn as never;
      return chain;
    },
    onEnd: (fn: unknown) => {
      panStore.onEnd = fn as never;
      return chain;
    },
    runOnJS: () => chain,
  };
  return {
    GestureHandlerRootView: passthrough,
    GestureDetector: passthrough,
    Gesture: { Pan: () => chain, Tap: () => chain, LongPress: () => chain },
  };
});

const renderSlide = (mode: 'light' | 'dark', onDeliver = jest.fn(), props = {}) =>
  render(
    <GestureHandlerRootView>
      <ChosenProvider mode={mode}>
        <SlideToDeliver onDeliver={onDeliver} {...props} />
      </ChosenProvider>
    </GestureHandlerRootView>,
  );

/** The track's own width and the thumb's travel, as the component computes it. */
const geometry = () => {
  const track = styleOf(screen.getByTestId('slide-to-deliver'));
  const trackWidth = track['width'] as number;
  return { trackWidth, travel: trackWidth - 54 - 5 * 2 - 4 };
};

describe('the slide', () => {
  beforeEach(() => {
    panStore.onUpdate = undefined;
    panStore.onEnd = undefined;
  });

  it.each(['light', 'dark'] as const)('%s: the label is black (onSuccess) on the success fill at slideLabel size', (mode) => {
    const t = tokens(mode);
    renderSlide(mode);
    const label = styleOf(screen.getByText('Slide to Deliver'));
    expect(label['color']).toBe(t.colors.onSuccess);
  });

  it('the track is the success token at the slideTrack radius and the thumb the card colour', () => {
    const t = tokens('light');
    renderSlide('light');
    const track = styleOf(screen.getByTestId('slide-to-deliver'));
    expect(track['backgroundColor']).toBe(t.colors.success);
    expect(track['borderRadius']).toBe(t.radii.slideTrack);
  });

  it('the screen-reader path: the first activation asks, the second delivers with the haptic', () => {
    const onDeliver = jest.fn();
    renderSlide('light', onDeliver);
    const slide = screen.getByTestId('slide-to-deliver');

    fireEvent(slide, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(onDeliver).not.toHaveBeenCalled();
    expect(screen.getByText('Activate again to confirm')).toBeTruthy();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);

    fireEvent(slide, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(onDeliver).toHaveBeenCalledTimes(1);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });

  it('disabled keeps the slide inert', () => {
    const onDeliver = jest.fn();
    renderSlide('dark', onDeliver, { disabled: true });
    fireEvent(screen.getByTestId('slide-to-deliver'), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(onDeliver).not.toHaveBeenCalled();
  });

  describe("the delivery's decision (PLAYBOOK section 12)", () => {
    it('a slide that covers the travel delivers, with the events in order', () => {
      const onDeliver = jest.fn();
      renderSlide('light', onDeliver);
      const { travel } = geometry();

      panStore.onUpdate?.({ translationX: travel * 0.5 });
      panStore.onUpdate?.({ translationX: travel * 0.99 });
      panStore.onEnd?.({ translationX: travel * 0.99 });

      expect(onDeliver).toHaveBeenCalledTimes(1);
    });

    it('an end event that arrives BEFORE the updates were processed still delivers', () => {
      // The cold-launch shape: the end is delivered to the JS thread with its
      // own final translation while the thumb is still near zero.
      const onDeliver = jest.fn();
      renderSlide('light', onDeliver);
      const { travel } = geometry();

      panStore.onEnd?.({ translationX: travel * 0.99 });
      panStore.onUpdate?.({ translationX: travel * 0.2 });

      expect(onDeliver).toHaveBeenCalledTimes(1);
    });

    it("delivers on the design's own swipe (10% to 90% of the track) with no update at all", () => {
      const onDeliver = jest.fn();
      renderSlide('light', onDeliver);
      const { trackWidth } = geometry();

      panStore.onEnd?.({ translationX: trackWidth * 0.8 });

      expect(onDeliver).toHaveBeenCalledTimes(1);
    });

    it('delivers when the end event carries only part of a slide that covered the track', () => {
      // Run 40168262235, the only failure of delivered.yaml: the first Slide to
      // Deliver after a cold launch. The JS thread was still settling, so the
      // end event the component received carried a fraction of the drag the
      // courier actually made. A slide that covered most of the track must not
      // be lost to the device's frame timing.
      const onDeliver = jest.fn();
      renderSlide('light', onDeliver);
      const { trackWidth } = geometry();

      panStore.onUpdate?.({ translationX: trackWidth * 0.85 });
      panStore.onEnd?.({ translationX: trackWidth * 0.85 });

      expect(onDeliver).toHaveBeenCalledTimes(1);
    });

    it('never delivers on the thumb\u2019s animated value alone: the end event is the contract', () => {
      // The thumb's x is visual feedback driven by the frames the JS thread
      // processes, so it can be ahead of (or behind) the gesture's own final
      // translation. A courier who slid the thumb across and then let go much
      // earlier has not delivered: the END EVENT decides, not the animation.
      const onDeliver = jest.fn();
      renderSlide('light', onDeliver);
      const { travel } = geometry();

      panStore.onUpdate?.({ translationX: travel * 0.99 });
      panStore.onEnd?.({ translationX: travel * 0.2 });

      expect(onDeliver).not.toHaveBeenCalled();
    });

    it('a bump never delivers, whatever the order of the events', () => {
      const onDeliver = jest.fn();
      renderSlide('light', onDeliver);
      const { travel } = geometry();

      panStore.onEnd?.({ translationX: travel * 0.2 });
      panStore.onUpdate?.({ translationX: travel * 0.25 });

      expect(onDeliver).not.toHaveBeenCalled();
    });

    it('a tap (no movement at all) never delivers', () => {
      const onDeliver = jest.fn();
      renderSlide('light', onDeliver);

      panStore.onEnd?.({ translationX: 0 });
      panStore.onUpdate?.({ translationX: 0 });

      expect(onDeliver).not.toHaveBeenCalled();
    });
  });
});
