/**
 * Tests for the end-of-day summary (screen 10).
 *
 * The screen is pure layout over `src/summary/daySummary.ts`, so these tests
 * ride the wiring, the copy and the number formatting, and nothing else: the
 * numbers themselves are the module's contract (the reference's mock day), and
 * the module is tested separately below.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ChosenProvider } from '@/components/chosen';
import {
  REFERENCE_DAY,
  barHeightFraction,
  formatKm,
  formatMoney,
} from '@/summary/daySummary';
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

function renderScreen() {
  return render(
    <GestureHandlerRootView>
      <ChosenProvider mode="light">
        <SummaryScreen />
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
    // screen now carries its own provider, so this render has none above it.
    render(<SummaryScreen />);

    expect(screen.getByTestId('summary-screen')).toBeTruthy();
    expect(screen.getByText('Summary')).toBeTruthy();
  });

  it('shows what the day earned', () => {
    renderScreen();

    expect(screen.getByTestId('summary-earned')).toBeTruthy();
    expect(screen.getByText(formatMoney(REFERENCE_DAY.earnedCents))).toBeTruthy();
  });

  it('shows the three counts of the day', () => {
    renderScreen();

    expect(screen.getByText(String(REFERENCE_DAY.delivered))).toBeTruthy();
    expect(screen.getByText(String(REFERENCE_DAY.notHome))).toBeTruthy();
    expect(screen.getByText(formatKm(REFERENCE_DAY.drivenKm))).toBeTruthy();
  });

  it('shows one line per carrier, with the amount in tabular numbers', () => {
    renderScreen();

    for (const [index, carrier] of REFERENCE_DAY.carriers.entries()) {
      expect(screen.getByText(carrier.name)).toBeTruthy();
      const amount = screen.getByTestId(`summary-carrier-${index}`);
      expect(amount.props.children).toBe(formatMoney(carrier.cents));
    }
  });

  it('draws a bar per day of the week, and the tallest one is full height', () => {
    renderScreen();

    const bars = screen.getByLabelText('The earnings of the last seven days');
    expect(bars.props.children).toHaveLength(REFERENCE_DAY.bars.length);
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
    expect(barHeightFraction(REFERENCE_DAY.bars)).toBeCloseTo(56 / 70, 5);
    expect(barHeightFraction([])).toBe(1);
  });

  it('carries the reference day, so the screen never invents a number', () => {
    expect(REFERENCE_DAY.finishedAt).toBe('2:31 pm');
    expect(REFERENCE_DAY.delivered).toBe(206);
    expect(REFERENCE_DAY.carriers).toHaveLength(3);
  });
});
