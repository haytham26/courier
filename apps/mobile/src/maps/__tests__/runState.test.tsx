/**
 * The run state above the screens (src/maps/runState.tsx): the marks one
 * provider keeps, the double mark that stays one event, the undo, the clock
 * read of the delivery moment - and the store the marks are written through,
 * so a cold start or a driver swap no longer loses them (BUG-069).
 */
import React from 'react';
import { Pressable, Text } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import type { DeliveredMark, MarkStore } from '@/run/types';

import { mockStops } from '../stops';
import { RunProvider, useRun, type DeliveredEvent } from '../runState';

/** A readable harness: marks stops 2 and 3, undoes stop 2, and reads. */
function RunHarness() {
  const run = useRun();
  const last: DeliveredEvent | undefined = run.delivered[run.delivered.length - 1];
  return (
    <>
      <Text testID="run-count">{String(run.delivered.length)}</Text>
      <Text testID="run-last">{last ? last.stopId : '—'}</Text>
      <Text testID="run-at">{last ? String(last.at) : '—'}</Text>
      <Text testID="run-2-delivered">{run.isDelivered('2') ? 'yes' : 'no'}</Text>
      <Pressable testID="run-mark-2" onPress={() => run.markDelivered(mockStops[1])}>
        <Text>mark 2</Text>
      </Pressable>
      <Pressable testID="run-mark-3" onPress={() => run.markDelivered(mockStops[2])}>
        <Text>mark 3</Text>
      </Pressable>
      <Pressable testID="run-undo-2" onPress={() => run.undoDelivered('2')}>
        <Text>undo 2</Text>
      </Pressable>
    </>
  );
}

/** The string the test id's Text carries (the house's plain RNTL read). */
const textOf = (testId: string): string =>
  String(screen.getByTestId(testId).props.children);

const renderHarness = () =>
  render(
    <RunProvider>
      <RunHarness />
    </RunProvider>,
  );

/** A mark store that keeps what it was given, like the phone would. */
function aMemoryMarkStore(already: DeliveredMark[] = []): {
  marks: DeliveredMark[];
  store: MarkStore;
} {
  const marks = [...already];
  return {
    marks,
    store: {
      markDelivered: (stop) => {
        marks.push({ stopId: stop.id, sequence: stop.sequence, at: Date.now(), eventId: `event-${stop.id}` });
        return Promise.resolve();
      },
      undoDelivered: (stopId) => {
        const index = marks.findIndex((mark) => mark.stopId === stopId);
        if (index >= 0) {
          marks.splice(index, 1);
        }
        return Promise.resolve();
      },
      deliveredMarks: () => Promise.resolve([...marks]),
      close: () => Promise.resolve(),
    },
  };
}

const renderOverStore = (store: MarkStore) =>
  render(
    <RunProvider store={store}>
      <RunHarness />
    </RunProvider>,
  );

describe('the run state', () => {
  it('marks the stop with its sequence and the clock read of the moment', () => {
    const now = Date.parse('2026-10-23T10:43:00+13:00');
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
    try {
      renderHarness();
      expect(textOf('run-count')).toBe('0');
      fireEvent.press(screen.getByTestId('run-mark-2'));
      expect(textOf('run-count')).toBe('1');
      expect(textOf('run-last')).toBe('2');
      expect(textOf('run-at')).toBe(String(now));
      expect(textOf('run-2-delivered')).toBe('yes');
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('keeps the double mark at one event', () => {
    renderHarness();
    fireEvent.press(screen.getByTestId('run-mark-2'));
    fireEvent.press(screen.getByTestId('run-mark-2'));
    expect(textOf('run-count')).toBe('1');
  });

  it('the undo takes the mark off the run', () => {
    renderHarness();
    fireEvent.press(screen.getByTestId('run-mark-2'));
    expect(textOf('run-2-delivered')).toBe('yes');
    fireEvent.press(screen.getByTestId('run-undo-2'));
    expect(textOf('run-2-delivered')).toBe('no');
    expect(textOf('run-count')).toBe('0');
  });

  it('the marks stack in delivery order, and the last stays last through an earlier undo', () => {
    renderHarness();
    fireEvent.press(screen.getByTestId('run-mark-2'));
    fireEvent.press(screen.getByTestId('run-mark-3'));
    expect(textOf('run-last')).toBe('3');
    fireEvent.press(screen.getByTestId('run-undo-2'));
    expect(textOf('run-last')).toBe('3');
    expect(textOf('run-count')).toBe('1');
  });
});

describe('the run state above the run store (BUG-069)', () => {
  it('hydrates the marks the store carries when the provider mounts', async () => {
    const memory = aMemoryMarkStore([
      { stopId: '2', sequence: 2, at: 1_800_000_000_000, eventId: 'event-2' },
    ]);

    renderOverStore(memory.store);

    await waitFor(() => expect(textOf('run-count')).toBe('1'));
    expect(textOf('run-2-delivered')).toBe('yes');
  });

  it('writes the mark through the store, so a cold start finds it again', async () => {
    const memory = aMemoryMarkStore();
    const first = renderOverStore(memory.store);

    fireEvent.press(screen.getByTestId('run-mark-2'));
    await waitFor(() => expect(memory.marks.map((mark) => mark.stopId)).toEqual(['2']));

    first.unmount();
    renderOverStore(memory.store);

    await waitFor(() => expect(textOf('run-count')).toBe('1'));
    expect(textOf('run-2-delivered')).toBe('yes');
  });

  it('takes the mark off the store when the courier undoes it', async () => {
    const memory = aMemoryMarkStore();
    renderOverStore(memory.store);

    fireEvent.press(screen.getByTestId('run-mark-2'));
    await waitFor(() => expect(memory.marks).toHaveLength(1));
    fireEvent.press(screen.getByTestId('run-undo-2'));

    expect(memory.marks).toEqual([]);
    expect(textOf('run-count')).toBe('0');
  });
});
