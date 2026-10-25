/**
 * The Copilot sphere (D34), and the BUG-061 decision that keeps it alive.
 *
 * The sphere is a living 3D glass object drawn with Skia. The tombstone PR #18
 * kept producing is a native heap error in Skia's GPU path on the emulator's
 * software GL, so the live sphere is drawn on a real device and the safe
 * renderer on an emulator - the same Pressable, the same label, the same size,
 * the same testID either way. These tests pin BOTH paths, so a change that
 * quietly drops the live sphere on real devices fails here.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { ChosenProvider, CopilotSphere } from '../index';

/** What the environment reports: `isDevice` false on an emulator, true on a phone. */
const mockConstants = { isDevice: true as boolean | undefined };

// The getter is the point: the factory runs while `mockConstants` is still in
// its temporal dead zone, so the value is read lazily at property access.
jest.mock('expo-constants', () => ({
  get isDevice() {
    return mockConstants.isDevice;
  },
}));

const press = () => {};

const renderSphere = (
  state: 'idle' | 'muted' | 'listening' = 'idle',
  mode: 'light' | 'dark' = 'light',
) =>
  render(
    <ChosenProvider mode={mode}>
      <CopilotSphere state={state} onPress={press} onLongPress={press} />
    </ChosenProvider>,
  );

/** The sphere's own style, flattened (a Pressable's style is an array). */
const styleOfSphere = (): { width?: number; height?: number } => {
  const style = (screen.getByTestId('copilot-sphere').props as { style?: unknown }).style;
  const parts = Array.isArray(style)
    ? (style as Record<string, unknown>[])
    : [style as Record<string, unknown>];
  return Object.assign({}, ...parts) as { width?: number; height?: number };
};

describe('the Copilot sphere', () => {
  it('answers as the Copilot button, in light and in dark', () => {
    mockConstants.isDevice = true;
    for (const mode of ['light', 'dark'] as const) {
      renderSphere('idle', mode);
      expect(screen.getByTestId('copilot-sphere')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Copilot, idle' })).toBeTruthy();
    }
  });

  it('keeps the raised centre target at 68 pt (D34)', () => {
    mockConstants.isDevice = true;
    renderSphere();
    expect(styleOfSphere().width).toBe(68);
    expect(styleOfSphere().height).toBe(68);
  });

  it('the muted state strikes through and says so', () => {
    mockConstants.isDevice = true;
    renderSphere();
    expect(screen.getByTestId('copilot-sphere').props.accessibilityHint).toMatch(/Taps to talk/);

    renderSphere('muted');
    expect(screen.getByTestId('copilot-sphere').props.accessibilityHint).toMatch(/muted/);
  });

  describe('BUG-061: the live sphere on a real device, the safe one on an emulator', () => {
    it('a real device draws the live sphere (the feature is not removed)', () => {
      mockConstants.isDevice = true;
      renderSphere();
      expect(screen.getByTestId('copilot-sphere')).toBeTruthy();
      // The safe renderer's marker is absent: the Skia surface is what draws.
      expect(screen.queryByTestId('copilot-sphere-fallback')).toBeNull();
    });

    it('an emulator draws the same button with the safe renderer (no Skia surface)', () => {
      mockConstants.isDevice = false;
      renderSphere();
      expect(screen.getByTestId('copilot-sphere')).toBeTruthy();
      expect(screen.getByTestId('copilot-sphere-fallback')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Copilot, idle' })).toBeTruthy();
    });

    it('the two paths agree on size, role and label (the contract is one)', () => {
      mockConstants.isDevice = true;
      renderSphere('listening');
      const liveStyle = styleOfSphere();
      const live = screen.getByTestId('copilot-sphere').props as {
        accessibilityLabel?: string;
        accessibilityHint?: string;
      };
      const liveLabel = live.accessibilityLabel;
      const liveHint = live.accessibilityHint;

      mockConstants.isDevice = false;
      renderSphere('listening');
      expect(styleOfSphere().width).toBe(liveStyle.width);
      expect(styleOfSphere().height).toBe(liveStyle.height);
      expect(screen.getByTestId('copilot-sphere').props.accessibilityLabel).toBe(liveLabel);
      expect(screen.getByTestId('copilot-sphere').props.accessibilityHint).toBe(liveHint);
    });

    it('an unknown environment (isDevice undefined) keeps the live sphere', () => {
      // A device whose Constants did not answer is treated as a real device: the
      // feature is never dropped on a guess.
      mockConstants.isDevice = undefined;
      renderSphere();
      expect(screen.queryByTestId('copilot-sphere-fallback')).toBeNull();
      expect(screen.getByTestId('copilot-sphere')).toBeTruthy();
    });
  });
});
