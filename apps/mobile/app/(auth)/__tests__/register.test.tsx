/**
 * Tests for the create-account screen (screen 03).
 *
 * The one behaviour this file pins is the one the a1 job proved on a device:
 * on the 320x640 AVD the keyboard owns the bottom of the screen, so a field
 * below the fold is not in the accessibility tree at all and the flow's own
 * centre-swipe never reaches the ScrollView (run 41374393642: the tap on
 * register-confirm-password timed out with "Element not found" while the
 * hierarchy showed the password field filled and the confirm field missing).
 * The app's own answer is the deterministic one - a field that is focused
 * scrolls itself into view, from the layout it just reported, with enough
 * headroom for the field under it. No timed scroll racing a reveal (that was
 * the sign-in screen's wrong fix, run 41010537066).
 */
import React from 'react';
import { ScrollView } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ChosenProvider } from '@/components/chosen';
import { ThemeProvider } from '@/providers/ThemeProvider';
import RegisterScreen from '../register';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

const mockAuth = { register: jest.fn(() => Promise.resolve()) };

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => mockAuth,
}));

function renderScreen() {
  return render(
    <GestureHandlerRootView>
      <ChosenProvider mode="light">
        <ThemeProvider>
          <RegisterScreen />
        </ThemeProvider>
      </ChosenProvider>
    </GestureHandlerRootView>,
  );
}

describe('the create-account screen', () => {
  it('scrolls a focused field into view, with the next field in reach (run 41374393642)', () => {
    renderScreen();

    const scrollView = screen.UNSAFE_getByType(ScrollView);
    const scrollTo = jest
      .spyOn(scrollView.instance as unknown as { scrollTo: (o: unknown) => void }, 'scrollTo')
      .mockImplementation(() => {});

    // The layout the device reports: the form starts 120 pt into the scroll
    // content and the password slot 200 pt into the form.
    fireEvent(screen.getByTestId('register-form'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 120, width: 272, height: 520 } },
    });
    fireEvent(screen.getByTestId('field-password'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 200, width: 272, height: 88 } },
    });

    // Focusing the password must put it 96 pt below the top of the visible
    // area, so the confirm field under it (label + 56 pt input + gaps) is on
    // screen too and the courier's next tap lands without another scroll.
    fireEvent(screen.getByTestId('register-password'), 'focus');
    expect(scrollTo).toHaveBeenCalledWith({ y: 120 + 200 - 96, animated: true });

    // A field whose layout has not been reported does not scroll: there is
    // nothing to scroll to, and a scroll on a guess is the timing dependence
    // the sign-in screen learned to avoid (run 41010537066).
    scrollTo.mockClear();
    fireEvent(screen.getByTestId('register-email'), 'focus');
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
