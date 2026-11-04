/**
 * Tests for the lock screen (screen 13).
 *
 * The reference is the run's glance on a locked phone: the Dynamic Island pill
 * with the distance and the ETA, the date and the clock, the Live Activity card
 * with the stop's progress and its two actions, and the phone's own buttons.
 *
 * A4: the day's numbers are the RUN's own, read through the run store under a
 * RunProvider - not the mock list. The screen is a root-stack route inside the
 * root layout's RunSession, so the provider is above it there; these tests
 * hand it one with the day the store answers with.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react-native';

import { RunProvider } from '@/maps/runState';
import { e2eDay } from '@/run/dayForThisBuild';
import type { DeliveredMark } from '@/run/types';

import LockScreen from '../lock-screen';

/** The event log over nothing: the lock screen makes no marks of its own. */

/**
 * The day the phone holds, as a store the run state can read and write: the
 * app's own E2E day in the contract's shape, with the marks this test plants.
 * This is the same shape the tab suites hand their providers, because it is
 * the shape the run state above the screens reads.
 */
function aDayStore(marks: DeliveredMark[] = []) {
  const carried: DeliveredMark[] = [...marks];
  return {
    load: () =>
      Promise.resolve({ status: 'ok' as const, source: 'cache' as const, snapshot: e2eDay() }),
    refresh: () =>
      Promise.resolve({ status: 'ok' as const, source: 'cache' as const, snapshot: e2eDay() }),
    deliveredMarks: () => Promise.resolve([...carried]),
    markDelivered: (stop: { id: string; sequence: number }) => {
      carried.push({ stopId: stop.id, sequence: stop.sequence, at: 1_800_000_000_000, eventId: `e-${stop.id}` });
      return Promise.resolve();
    },
    undoDelivered: (stopId: string) => {
      const at = carried.findIndex((mark) => mark.stopId === stopId);
      if (at >= 0) {
        carried.splice(at, 1);
      }
      return Promise.resolve();
    },
    close: () => Promise.resolve(),
  };
}

/** A cache over the app's own E2E day, so the run has a real day to show. */

function renderLockScreen(_marks: DeliveredMark[] = []) {
  return render(
    <RunProvider store={aDayStore(_marks) as unknown as never}>
      <LockScreen />
    </RunProvider>,
  );
}

describe('the lock screen', () => {
  it('answers inside the run state the root layout gives it', () => {
    renderLockScreen();
    expect(screen.getByTestId('lock-screen')).toBeTruthy();
  });

  it('shows the clock and the date of the day', () => {
    renderLockScreen();
    // The clock is the real now, so the test pins the FORMAT, not a frozen
    // mock: a weekday, the day's number, a month, and 24-hour HH:mm.
    expect(
      screen.getByText(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) \d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December)$/),
    ).toBeTruthy();
    expect(screen.getByText(/^\d{2}:\d{2}$/)).toBeTruthy();
  });

  it('shows the pill with the distance to the next turn and the ETA', () => {
    renderLockScreen();
    // The pill and the activity card both carry the ETA, exactly as the
    // reference does, so the assert is scoped to the pill.
    const pill = screen.getByTestId('lock-pill');
    expect(pill).toBeTruthy();
    expect(within(pill).getByText('120 m')).toBeTruthy();
    expect(within(pill).getByText('2 min')).toBeTruthy();
  });

  // A4: the glance is the RUN's own day. The day's first stop is delivered,
  // so the next stop the lock screen names is the day's own second stop -
  // the same one the count points at.
  it('shows the run\u2019s next stop with its notes and its ETA', async () => {
    renderLockScreen();
    const activity = screen.getByTestId('lock-activity');
    expect(activity).toBeTruthy();
    await waitFor(() => expect(screen.getByText('45 Papanui Road')).toBeTruthy());
    expect(screen.getByText('Side gate, shelf B3')).toBeTruthy();
    expect(screen.getByText('12 min ahead')).toBeTruthy();
  });

  // The count and the progress follow the run's own stops: a stop the run
  // carries as delivered (the API's own status, which is what the Live
  // Activity shows) is the number the lock screen counts.
  it('counts the run\u2019s own deliveries in its progress', async () => {
    renderLockScreen();
    // The run's own day: its first stop is delivered, so the lock screen
    // shows the second of five with a fifth of the day behind it.
    await waitFor(() => expect(screen.getByText('Stop 2 of 5')).toBeTruthy());
    const fill = screen.getByTestId('lock-progress').props as { style?: unknown };
    const parts = Array.isArray(fill.style)
      ? (fill.style as Record<string, unknown>[])
      : [fill.style as Record<string, unknown>];
    const style = Object.assign({}, ...parts) as { width?: string };
    expect(String(style.width)).toBe('20%');
  });

  it('carries the two lock-screen actions as real buttons', () => {
    renderLockScreen();
    expect(screen.getByTestId('lock-delivered')).toBeTruthy();
    expect(screen.getByTestId('lock-call')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delivered' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Call' })).toBeTruthy();
  });

  it('shows the run\u2019s progress as a filled line', () => {
    renderLockScreen();
    const fill = screen.getByTestId('lock-progress').props as { style?: unknown };
    const parts = Array.isArray(fill.style)
      ? (fill.style as Record<string, unknown>[])
      : [fill.style as Record<string, unknown>];
    const style = Object.assign({}, ...parts) as { width?: string };
    expect(String(style.width)).toMatch(/%$/);
  });
});
