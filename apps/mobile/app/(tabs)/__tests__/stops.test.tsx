/**
 * The stop sheet and the door memory.
 *
 * The courier opens a stop and reads what they remember about the door: the
 * safe place and the note. They can change it, and with no network the note
 * waits on the phone.
 */
import React from 'react';
import { renderAsync, fireEvent, waitFor } from '@testing-library/react-native';

import { setDoorMemoryService } from '@/doorMemory/runtime';
import type { DoorMemoryService } from '@/doorMemory/doorMemoryService';
import { ThemeProvider } from '@/providers/ThemeProvider';
import StopsScreen from '../stops';

const MEMORY = {
  address_key: '45 papanui road merivale',
  note: 'Leave it behind the pot',
  safe_place: 'side gate',
  updated_at: '2026-10-21T08:30:00Z',
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('the stop sheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    setDoorMemoryService(null);
  });

  it('shows the door memory of the stop', async () => {
    const service: DoorMemoryService = {
      get: jest.fn(async () => ({
        memory: MEMORY,
        pending: false,
        isStale: false,
        error: null,
      })),
      save: jest.fn(async () => ({
        memory: MEMORY,
        pending: false,
        isStale: false,
        error: null,
      })),
    };
    setDoorMemoryService(service);

    const { getByTestId } = await renderAsync(<StopsScreen />, { wrapper });

    fireEvent.press(getByTestId('stop-2'));

    await waitFor(() => expect(getByTestId('door-memory-safe-place')).toBeTruthy());
    expect(getByTestId('door-memory-safe-place').props.children).toBe('Side gate');
    expect(getByTestId('door-memory-note-text').props.children).toBe('Leave it behind the pot');
    expect(service.get).toHaveBeenCalledWith('2');
  });

  it('says when the address has no door note yet', async () => {
    const service: DoorMemoryService = {
      get: jest.fn(async () => ({
        memory: null,
        pending: false,
        isStale: false,
        error: null,
      })),
      save: jest.fn(async () => ({
        memory: null,
        pending: false,
        isStale: false,
        error: null,
      })),
    };
    setDoorMemoryService(service);

    const { getByTestId } = await renderAsync(<StopsScreen />, { wrapper });

    fireEvent.press(getByTestId('stop-2'));

    await waitFor(() => expect(getByTestId('door-memory-empty')).toBeTruthy());
  });

  it('writes the note and the safe place the courier picked', async () => {
    const service: DoorMemoryService = {
      get: jest.fn(async () => ({
        memory: null,
        pending: false,
        isStale: false,
        error: null,
      })),
      save: jest.fn(async () => ({
        memory: { ...MEMORY, note: 'The dog barks', safe_place: 'shed' },
        pending: true,
        isStale: false,
        error: null,
      })),
    };
    setDoorMemoryService(service);

    const { getByTestId } = await renderAsync(<StopsScreen />, { wrapper });

    fireEvent.press(getByTestId('stop-2'));
    await waitFor(() => expect(getByTestId('door-memory-edit')).toBeTruthy());
    fireEvent.press(getByTestId('door-memory-edit'));

    await waitFor(() => expect(getByTestId('door-memory-editor')).toBeTruthy());

    fireEvent.changeText(getByTestId('door-memory-note'), 'The dog barks');
    fireEvent.press(getByTestId('safe-place-shed'));
    fireEvent.press(getByTestId('door-memory-save'));

    await waitFor(() =>
      expect(service.save).toHaveBeenCalledWith('2', { note: 'The dog barks', safePlace: 'shed' }),
    );
  });

  it('says the note is on the phone when the server has not taken it', async () => {
    const service: DoorMemoryService = {
      get: jest.fn(async () => ({
        memory: { ...MEMORY, address_key: null, updated_at: null },
        pending: true,
        isStale: false,
        error: null,
      })),
      save: jest.fn(async () => ({
        memory: { ...MEMORY, address_key: null, updated_at: null },
        pending: true,
        isStale: false,
        error: null,
      })),
    };
    setDoorMemoryService(service);

    const { getByTestId } = await renderAsync(<StopsScreen />, { wrapper });

    fireEvent.press(getByTestId('stop-2'));

    await waitFor(() => expect(getByTestId('door-memory-pending')).toBeTruthy());
    expect(getByTestId('door-memory-pending').props.children).toBe(
      'Saved on this phone — it will sync when you are back online.',
    );
  });
});
