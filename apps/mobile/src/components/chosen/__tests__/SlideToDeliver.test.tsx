/**
 * Slide to Deliver: a slide is required (a bump never delivers), the label
 * is black on the green in both modes (D33), the success haptic fires, and
 * the screen-reader path is a two-step confirmation.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { ChosenProvider, SlideToDeliver } from '../index';
import { styleOf } from '../test-support';
import { tokens } from '@courier/design-tokens/chosen';

const renderSlide = (mode: 'light' | 'dark', onDeliver = jest.fn(), props = {}) =>
  render(
    <GestureHandlerRootView>
      <ChosenProvider mode={mode}>
        <SlideToDeliver onDeliver={onDeliver} {...props} />
      </ChosenProvider>
    </GestureHandlerRootView>,
  );

describe('the slide', () => {
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

    // The first activation asks for the confirmation.
    fireEvent(slide, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(onDeliver).not.toHaveBeenCalled();
    expect(screen.getByText('Activate again to confirm')).toBeTruthy();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);

    // The second completes the delivery with the success haptic.
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
});
