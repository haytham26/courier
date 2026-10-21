/**
 * The earnings screen.
 *
 * The money the courier earned today, and the end-of-day summary. When the
 * phone has no network the screen shows the last money it had and says
 * plainly that it is not up to date.
 */
import React from 'react';
import { renderAsync, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

import { setEarningsService } from '@/earnings/runtime';
import type { EarningsService } from '@/earnings/earningsService';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { ShiftProvider } from '@/providers/ShiftProvider';
import EarningsScreen from '../earnings';

const EARNINGS = {
  currency: 'NZD',
  delivered: 41,
  failed: 3,
  skipped: 2,
  gross: '412.60',
  gst: '53.86',
  net: '358.74',
  rate: '1.50',
  breakdown: [{ stop_id: 'stop-1', amount: '1.70', kind: 'delivered' }],
};

const SUMMARY = {
  shift_id: 'shift-1',
  date: '2026-10-21',
  currency: 'NZD',
  delivered: 41,
  failed: 3,
  skipped: 2,
  gross: '412.60',
  gst: '53.86',
  net: '358.74',
  average_delivery_seconds: 214,
  success_rate: 0.9318,
  failed_stops: [
    { stop_id: 'stop-9', kind: 'failed_access', reason: 'No access', occurred_at: '2026-10-21T10:15:00Z' },
  ],
};

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ShiftProvider>{children}</ShiftProvider>
    </ThemeProvider>
  );
}

describe('the earnings screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    setEarningsService(null);
  });

  it('shows the money of today and the end-of-day summary', async () => {
    const service: EarningsService = {
      get: jest.fn(async () => ({
        value: EARNINGS,
        isStale: false,
        updatedAt: '2026-10-21T08:30:00Z',
        error: null,
      })),
      getSummary: jest.fn(async () => ({
        value: SUMMARY,
        isStale: false,
        updatedAt: '2026-10-21T08:30:00Z',
        error: null,
      })),
    };
    setEarningsService(service);

    const { getByTestId, queryByTestId } = await renderAsync(<EarningsScreen />, { wrapper });

    await waitFor(() => expect(getByTestId('earnings-net')).toBeTruthy());
    expect(getByTestId('earnings-net').props.children).toBe('$358.74');
    expect(getByTestId('earnings-success-rate').props.children).toBe('93%');
    expect(getByTestId('earnings-line')).toBeTruthy();
    expect(getByTestId('earnings-failed-stop')).toBeTruthy();
    expect(queryByTestId('earnings-not-updated')).toBeNull();
  });

  it('shows the last money it had and says it is not updated', async () => {
    const service: EarningsService = {
      get: jest.fn(async () => ({
        value: EARNINGS,
        isStale: true,
        updatedAt: '2026-10-21T08:30:00Z',
        error: 'No connection.',
      })),
      getSummary: jest.fn(async () => ({
        value: SUMMARY,
        isStale: true,
        updatedAt: '2026-10-21T08:30:00Z',
        error: 'No connection.',
      })),
    };
    setEarningsService(service);

    const { getByTestId } = await renderAsync(<EarningsScreen />, { wrapper });

    await waitFor(() => expect(getByTestId('earnings-not-updated')).toBeTruthy());
    expect(getByTestId('earnings-net').props.children).toBe('$358.74');
    expect(getByTestId('earnings-not-updated').props.children).toBe('Not updated — offline');
  });

  it('says the money did not come through when there is nothing to show', async () => {
    const service: EarningsService = {
      get: jest.fn(async () => ({
        value: null,
        isStale: true,
        updatedAt: null,
        error: 'No connection.',
      })),
      getSummary: jest.fn(async () => ({
        value: null,
        isStale: true,
        updatedAt: null,
        error: 'No connection.',
      })),
    };
    setEarningsService(service);

    const { getByTestId, queryByTestId } = await renderAsync(<EarningsScreen />, { wrapper });

    await waitFor(() => expect(getByTestId('earnings-error')).toBeTruthy());
    expect(queryByTestId('earnings-net')).toBeNull();
    expect(getByTestId('earnings-error')).toBeTruthy();
  });
});
