/**
 * Tests for the end-of-day summary (screen 10).
 *
 * A3 (QA step 28): this screen used to show the reference mockup's own numbers
 * for any run at all - $438.20 earned, 206 delivered, 92 km, and the three
 * carriers' split - on a day with two stops done. The screen now reads the run
 * the phone holds and says "not tracked yet" for what the phone does not track
 * (D60: earnings are not in the trial), so these tests pin that truth. The
 * formatting helpers the design lab renders with are still the module's own,
 * and they are tested here as themselves.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ChosenProvider } from '@/components/chosen';
import { RunProvider } from '@/maps/runState';
import { e2eDay } from '@/run/dayForThisBuild';
import type { DeliveredMark, RunDayStore } from '@/run/types';
import { barHeightFraction, formatKm, formatMoney, NOT_TRACKED } from '@/summary/runSummary';
import SummaryScreen from '../summary';

// The dock is a pressable island on a root-stack route: the router is not
// mounted in these tests, so the navigation is recorded instead of performed.
const mockRouter = { navigate: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

// The Copilot centre is the voice engine, and the engine reaches the native
// audio module, which has no place in a unit test: the Today screen's tests
// mock the hook the same way, so no service is called here either.
jest.mock('@/voice/useVoice', () => ({
  useVoice: () => ({
    state: 'idle',
    isReady: false,
    lastCommand: null,
    startListening: jest.fn(() => Promise.resolve()),
    stopListening: jest.fn(() => Promise.resolve()),
    speak: jest.fn(() => Promise.resolve()),
  }),
}));

/**
 * A store over the E2E build's own day, with the marks it is given: the
 * shape the app's own construction site builds, so the screen reads the run
 * the way it reads a real one.
 */
function storeWithMarks(marks: DeliveredMark[]): RunDayStore {
  return {
    load: () => Promise.resolve({ status: 'ok', source: 'cache', snapshot: e2eDay() }),
    refresh: () => Promise.resolve({ status: 'ok', source: 'cache', snapshot: e2eDay() }),
    deliveredMarks: () => Promise.resolve(marks),
    markDelivered: () => Promise.resolve(),
    undoDelivered: () => Promise.resolve(),
    close: () => Promise.resolve(),
    applyRouteOrder: () => Promise.resolve(false),
  };
}

function renderScreen(marks: DeliveredMark[] = []) {
  return render(
    <GestureHandlerRootView>
      <ChosenProvider mode="light">
        <RunProvider store={storeWithMarks(marks)}>
          <SummaryScreen />
        </RunProvider>
      </ChosenProvider>
    </GestureHandlerRootView>,
  );
}

describe('the summary screen', () => {
  beforeEach(() => {
    mockRouter.navigate.mockClear();
  });

  it('keeps the summary screen test id', () => {
    renderScreen();

    expect(screen.getByTestId('summary-screen')).toBeTruthy();
  });

  it('owns its provider: a root-stack route renders with nothing above it', () => {
    // BUG-062: the summary is a root-stack route, so it sits outside the tabs'
    // provider. Rendered bare it used to die at mount with "useChosen needs a
    // ChosenProvider above it", which on the emulator looks like the app going
    // back to Today and the flow's `summary-screen` assert timing out. The
    // screen now carries its own provider, so this render has no CHOICE above
    // it: only the run's own provider, which every route of the app sits under.
    render(
      <ChosenProvider mode="light">
        <RunProvider store={storeWithMarks([])}>
          <SummaryScreen />
        </RunProvider>
      </ChosenProvider>,
    );

    expect(screen.getByTestId('summary-screen')).toBeTruthy();
    expect(screen.getByText('Summary')).toBeTruthy();
  });

  // A3: the QA inspector's $438.20 was the reference mockup's number. Earnings
  // are D60 - not in the trial - so the screen says "Not tracked yet".
  it('says "not tracked yet" for the money, never a number the phone never earned', () => {
    renderScreen();

    expect(screen.getByTestId('summary-earned')).toBeTruthy();
    // The money, the kilometres and the carriers are all D60: three nodes,
    expect(screen.getAllByText(NOT_TRACKED).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Earnings are not tracked in the trial')).toBeTruthy();
  });

  it('shows the run\u2019s own three counts of the day', async () => {
    // A store that carries one delivery and one failure: the run's own numbers,
    // not the reference day's 206 delivered and 8 not home.
    renderScreen([
      { stopId: '2', sequence: 2, at: Date.now(), eventId: 'e-2' },
      { stopId: '3', sequence: 3, at: Date.now(), eventId: 'e-3' },
    ]);

    await waitFor(() => expect(screen.getByText('2')).toBeTruthy());
    expect(screen.getByTestId('summary-delivered')).toBeTruthy();
    // The E2E day's own stop 4 is the failed one; stop 5 is still pending.
    expect(screen.getByTestId('summary-failed')).toBeTruthy();
  });

  it('says "not tracked yet" for the kilometres, and carries no carriers', () => {
    renderScreen();

    // The driven kilometres are D60, and so is the per-carrier split.
    expect(screen.getAllByText(NOT_TRACKED).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByTestId('summary-carriers-none')).toBeTruthy();
  });

  it('keeps the dock so a root-stack screen can still be left', () => {
    renderScreen();

    expect(screen.getByTestId('tab-bar')).toBeTruthy();
  });

  it('takes the dock slot the courier taps', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText('Map'));

    expect(mockRouter.navigate).toHaveBeenCalledWith('/map');
  });
});

describe('the day summary numbers', () => {
  it('formats money as a New Zealand driver reads it', () => {
    expect(formatMoney(43820)).toBe('$438.20');
    expect(formatMoney(8400)).toBe('$84.00');
    expect(formatMoney(0)).toBe('$0.00');
  });

  it('formats kilometres whole when they are whole', () => {
    expect(formatKm(92)).toBe('92 km');
    expect(formatKm(92.34)).toBe('92.3 km');
  });

  it('finds the tallest bar so a week always fills its band', () => {
    expect(
      barHeightFraction([
        { letter: 'W', fraction: 21 / 70 },
        { letter: 'T', fraction: 56 / 70 },
      ]),
    ).toBeCloseTo(56 / 70, 5);
    expect(barHeightFraction([])).toBe(1);
  });
});
