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

    // The LAST field scrolls to the end of the form, so the submit button
    // under it clears the keyboard too (run 41394528001: confirm was focused
    // and visible, the button was still pruned under the keyboard's clip).
    const scrollToEnd = jest
      .spyOn(scrollView.instance as unknown as { scrollToEnd: (o: unknown) => void }, 'scrollToEnd')
      .mockImplementation(() => {});
    fireEvent(screen.getByTestId('register-confirm-password'), 'focus');
    expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });

    // BUG-113's other half, proven on run 41380466474: with the default
    // removeClippedSubviews, Android drops a below-the-fold field from the
    // native hierarchy before it layouts, so its slot never reports the
    // layout the focus scroll needs (the email focus scrolled, the password
    // focus did not). The slots stay in the tree.
    expect(scrollView.props.removeClippedSubviews).toBe(false);

    // Run 41385988136's dump: with the keyboard up the register form sat at
    // y=3 and the ScrollView could not scroll at all, so the onFocus scroll
    // above had nowhere to go and the confirm field stayed below the
    // keyboard's clip (pruned from the a11y tree, "Element not found").
    // Cause: `justifyContent: 'center'` on a flexGrow'd content container
    // centers overflowing children, which clamps the scroll range to zero.
    // The sign-in screen's content is top-aligned (login.tsx's `content` has
    // no justifyContent); the register form is the same now.
    const contentStyle = scrollView.props.contentContainerStyle as {
      justifyContent?: string;
    };
    expect(contentStyle.justifyContent).not.toBe('center');

    // Run 41398593946's dump: the app window stays 640 tall with the keyboard
    // overlaying y=382..640, so the ScrollView's scroll range (computed
    // against the full window) can never lift the submit button above the
    // keyboard - the onFocus scrollToEnd had nothing to work with. The sign-in
    // screen's ScrollView carries `automaticallyAdjustKeyboardInsets`, which
    // shrinks the scroll viewport to above the keyboard and is what makes its
    // own flows' scrolls work on this AVD; the register form carries it too.
    expect(scrollView.props.automaticallyAdjustKeyboardInsets).toBe(true);
    expect(scrollView.props.keyboardDismissMode).toBe('on-drag');
  });
});
