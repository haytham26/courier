/**
 * Tests for the lock screen (screen 13).
 *
 * The reference is the run's glance on a locked phone: the Dynamic Island pill
 * with the distance and the ETA, the date and the clock, the Live Activity card
 * with the stop's progress and its two actions, and the phone's own buttons.
 * The screen is a root-stack route, so it carries its own provider: rendered
 * bare it must still answer, which is what the first test pins.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react-native';

import LockScreen from '../lock-screen';

describe('the lock screen', () => {
  it('owns its provider: a root-stack route renders with nothing above it', () => {
    render(<LockScreen />);
    expect(screen.getByTestId('lock-screen')).toBeTruthy();
  });

  it('shows the clock and the date of the day', () => {
    render(<LockScreen />);
    // The clock is the real now, so the test pins the FORMAT, not a frozen
    // mock: a weekday, the day’s number, a month, and 24-hour HH:mm.
    expect(
      screen.getByText(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) \d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December)$/),
    ).toBeTruthy();
    expect(screen.getByText(/^\d{2}:\d{2}$/)).toBeTruthy();
  });

  it('shows the pill with the distance to the next turn and the ETA', () => {
    render(<LockScreen />);
    // The pill and the activity card both carry the ETA, exactly as the
    // reference does, so the assert is scoped to the pill.
    const pill = screen.getByTestId('lock-pill');
    expect(pill).toBeTruthy();
    expect(within(pill).getByText('120 m')).toBeTruthy();
    expect(within(pill).getByText('2 min')).toBeTruthy();
  });

  it('shows the run\u2019s next stop with its notes and its ETA', () => {
    render(<LockScreen />);
    const activity = screen.getByTestId('lock-activity');
    expect(activity).toBeTruthy();
    expect(screen.getByText('45 Papanui Road')).toBeTruthy();
    expect(screen.getByText('Side gate, shelf B3')).toBeTruthy();
    expect(screen.getByText('12 min ahead')).toBeTruthy();
  });

  it('carries the two lock-screen actions as real buttons', () => {
    render(<LockScreen />);
    expect(screen.getByTestId('lock-delivered')).toBeTruthy();
    expect(screen.getByTestId('lock-call')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delivered' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Call' })).toBeTruthy();
  });

  it('shows the run\u2019s progress as a filled line', () => {
    render(<LockScreen />);
    const fill = screen.getByTestId('lock-progress').props as { style?: unknown };
    const parts = Array.isArray(fill.style)
      ? (fill.style as Record<string, unknown>[])
      : [fill.style as Record<string, unknown>];
    const style = Object.assign({}, ...parts) as { width?: string };
    expect(String(style.width)).toMatch(/%$/);
  });
});
