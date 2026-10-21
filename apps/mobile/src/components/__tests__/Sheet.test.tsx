/**
 * The sheet.
 *
 * The sheet is the modal surface of the app, so the test is about the two
 * things the contract cares about: the content is there and it is announced
 * as a modal, and the reduce-motion branch makes the movement instant
 * without removing it.
 */
import React from 'react';
import { AccessibilityInfo, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemeProvider } from '@/providers/ThemeProvider';
import { Sheet } from '../Sheet';

function renderSheet(isOpen: boolean) {
  return render(
    <GestureHandlerRootView>
      <ThemeProvider>
        <Sheet
          isOpen={isOpen}
          onClose={jest.fn()}
          title="Stop 2"
          subtitle="Active"
          testID="stop-sheet"
        >
          <Text>45 Papanui Road</Text>
        </Sheet>
      </ThemeProvider>
    </GestureHandlerRootView>,
  );
}

describe('the sheet', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows nothing when it is closed', () => {
    renderSheet(false);

    expect(screen.queryByText('45 Papanui Road')).toBeNull();
  });

  it('shows the title, the subtitle and the content when it is open', () => {
    renderSheet(true);

    expect(screen.getByText('Stop 2')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('45 Papanui Road')).toBeTruthy();
  });

  it('hides the content below it from the screen reader', () => {
    renderSheet(true);

    const sheet = screen.getByTestId('stop-sheet');
    expect(sheet.props.accessibilityViewIsModal).toBe(true);
  });

  it('has a close button with a label', () => {
    renderSheet(true);

    const close = screen.getByTestId('sheet-close');
    expect(close.props.accessibilityRole).toBe('button');
    expect(close.props.accessibilityLabel).toBe('Close');
  });

  it('still shows the content when the user asked for less motion', () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    renderSheet(true);

    // The transition becomes instant, it is never removed.
    expect(screen.getByText('45 Papanui Road')).toBeTruthy();
  });
});
