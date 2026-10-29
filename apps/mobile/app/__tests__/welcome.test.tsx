/**
 * Tests for the welcome screen (screen 01).
 *
 * The reference is the app's first screen for a courier who is not signed in:
 * the mark, the name, the one line that says what the app is for, and the two
 * ways in. The screen carries its own provider (a root route), and the two ways
 * in navigate to the sign-in.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import Welcome from '../welcome';

const mockRouter = { push: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

describe('the welcome', () => {
  it('owns its provider: a root route renders with nothing above it', () => {
    render(<Welcome />);
    expect(screen.getByTestId('welcome-screen')).toBeTruthy();
  });

  it('shows the app\u2019s name and the line that says what it is for', () => {
    render(<Welcome />);
    expect(screen.getByText('Courier Copilot')).toBeTruthy();
    expect(
      screen.getByText(/Scan your parcels, check every address and drive the best order\./),
    ).toBeTruthy();
    expect(screen.getByText(/Built for couriers in Canterbury\./)).toBeTruthy();
  });

  it('offers the two ways in as real buttons', () => {
    render(<Welcome />);
    expect(screen.getByRole('button', { name: 'Get Started' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeTruthy();
  });

  it('both ways in open the sign-in', () => {
    mockRouter.push.mockClear();
    render(<Welcome />);

    fireEvent.press(screen.getByTestId('welcome-get-started'));
    fireEvent.press(screen.getByTestId('welcome-sign-in'));

    expect(mockRouter.push).toHaveBeenCalledWith('/login');
    expect(mockRouter.push).toHaveBeenCalledTimes(2);
  });
});
