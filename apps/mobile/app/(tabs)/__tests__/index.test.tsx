/**
 * The today's list.
 *
 * The screen the courier opens: the run in front of them, the door memory of
 * the next stop on one line, and the money of today with one tap to the
 * earnings screen.
 */
import React from 'react';
import { renderAsync, fireEvent, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

jest.mock('@/voice/useVoice', () => ({
  useVoice: () => ({
    state: 'idle',
    lastCommand: null,
    isReady: false,
    startListening: jest.fn(),
    stopListening: jest.fn(),
  }),
}));

jest.mock('@/voice/VoiceButton', () => ({
  VoiceButton: () => null,
}));

import { setDoorMemoryService } from '@/doorMemory/runtime';
import type { DoorMemoryService } from '@/doorMemory/doorMemoryService';
import { setEarningsService } from '@/earnings/runtime';
import type { EarningsService } from '@/earnings/earningsService';
import { setSyncService } from '@/sync/runtime';
import { SyncService } from '@/sync/syncService';
import { EventLog } from '@/sync/eventLog';
import { MemoryKeyValueStore } from '@/sync/storage';
import { FixedNetworkMonitor } from '@/sync/network';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { ShiftProvider } from '@/providers/ShiftProvider';
import HomeScreen from '../index';

const EARNINGS = {
  currency: 'NZD',
  delivered: 41,
  failed: 3,
  skipped: 2,
  gross: '412.60',
  gst: '53.86',
  net: '358.74',
  rate: '1.50',
  breakdown: [],
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
  failed_stops: [],
};

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ShiftProvider>{children}</ShiftProvider>
    </ThemeProvider>
  );
}

describe("the today's list", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSyncService(
      new SyncService(
        new EventLog(new MemoryKeyValueStore()),
        { send: async () => undefined },
        new FixedNetworkMonitor(true),
      ),
    );
  });

  afterEach(() => {
    setDoorMemoryService(null);
    setEarningsService(null);
    setSyncService(null);
  });

  it('shows the money of today and opens the earnings screen in one tap', async () => {
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
    setDoorMemoryService({
      get: jest.fn(async () => ({ memory: null, pending: false, isStale: false, error: null })),
      save: jest.fn(async () => ({ memory: null, pending: false, isStale: false, error: null })),
    });

    const { getByTestId } = await renderAsync(<HomeScreen />, { wrapper });

    await waitFor(() => expect(getByTestId('today-earnings-net')).toBeTruthy());
    expect(getByTestId('today-earnings-net').props.children).toBe('$358.74');

    fireEvent.press(getByTestId('earnings-card'));

    expect(mockPush).toHaveBeenCalledWith('/earnings');
  });

  it('shows the door memory of the next stop on one line', async () => {
    setEarningsService({
      get: jest.fn(async () => ({ value: null, isStale: false, updatedAt: null, error: null })),
      getSummary: jest.fn(async () => ({ value: null, isStale: false, updatedAt: null, error: null })),
    });
    setDoorMemoryService({
      get: jest.fn(async () => ({
        memory: {
          address_key: '45 papanui road merivale',
          note: 'Leave it behind the pot',
          safe_place: 'side gate',
          updated_at: '2026-10-21T08:30:00Z',
        },
        pending: false,
        isStale: false,
        error: null,
      })),
      save: jest.fn(async () => ({
        memory: {
          address_key: '45 papanui road merivale',
          note: 'Leave it behind the pot',
          safe_place: 'side gate',
          updated_at: '2026-10-21T08:30:00Z',
        },
        pending: false,
        isStale: false,
        error: null,
      })),
    });

    const { getByTestId } = await renderAsync(<HomeScreen />, { wrapper });

    await waitFor(() => expect(getByTestId('door-memory-tip')).toBeTruthy());
    expect(getByTestId('door-memory-tip')).toBeTruthy();
  });
});
