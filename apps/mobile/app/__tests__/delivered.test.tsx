/**
 * The delivered confirm's contract (T6 slice 3, screen 05).
 *
 * The contract the flows pin: the confirm answers as `delivered-screen`,
 * the badge row reads "Delivered" plus the delivery's address with the
 * minute the mark carries, Undo takes the mark off the run and hands back
 * to the drive through the router, Next Stop pans the map's camera to the
 * next stop and returns, and a screen without a delivery to confirm says
 * so and disables its Undo. The map, the icons and the boot are mocked the
 * way the drive's tests mock them; the run state is seeded into a real
 * RunProvider, exactly as the layout holds it above the stack.
 */
import React, { useEffect } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import DeliveredRoute from '../delivered';
import { styleOf } from '../../src/components/chosen/test-support';
import { hourMinuteOf } from '@/maps/drive';
import { e2eDay } from '@/run/dayForThisBuild';
import type { DeliveredMark } from '@/run/types';
import { RunProvider, useRun } from '@/maps/runState';
import { tokens } from '@courier/design-tokens/chosen';

jest.mock('@maplibre/maplibre-react-native', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');

  const view = (props: { testID?: string; children?: React.ReactNode }) =>
    ReactActual.createElement(RN.View, { testID: props.testID }, props.children);

  return {
    Map: view,
    Camera: view,
    Marker: view,
    NativeUserLocation: () => null,
  };
});

jest.mock('@expo/vector-icons', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');

  const icon = (props: { name: string }) =>
    ReactActual.createElement(RN.Text, { accessibilityLabel: props.name }, props.name);
  return { Ionicons: icon, MaterialCommunityIcons: icon };
});

jest.mock('@/maps/packFiles', () => ({
  loadOfflinePack: jest.fn(() =>
    Promise.resolve({
      state: { status: 'missing' },
      locations: { downloadedFileUrl: null, bundledFileUrl: null },
    }),
  ),
  localGlyphsUrl: jest.fn(() => null),
}));

/** The route params the suite controls (the mock keeps the variable live). */
let mockParams: { stop?: string } = { stop: '2' };

/** The stable spies, poured out by the mocks' factories (the `mock` prefix is the hoisting contract). */
let mockBack: jest.Mock | undefined;
let mockPublish: jest.Mock | undefined;

jest.mock('expo-router', () => {
  const back = jest.fn();
  mockBack = back;
  return {
    useLocalSearchParams: () => mockParams,
    useRouter: () => ({ back, push: jest.fn(), navigate: jest.fn() }),
  };
});

jest.mock('@/voice/commandChannel', () => {
  const publish = jest.fn(() => undefined);
  mockPublish = publish;
  return { publishVoiceCommand: publish };
});

/** The live spies of the mocked modules. */
const theBack = (): jest.Mock => {
  if (!mockBack) {
    throw new Error("the router mock never ran — the spy isn't there");
  }
  return mockBack;
};
const thePublish = (): jest.Mock => {
  if (!mockPublish) {
    throw new Error("the command-channel mock never ran — the spy isn't there");
  }
  return mockPublish;
};

/**
 * The deliver's mark landed before the confirm opens, the way the slide to
 * deliver would have left it: a real RunProvider, a real mark, the clock
 * pinned when `at` is given. A4: the stop comes from the run's own day, so
 * the mark is made on the day's stop and not on the mock list's.
 */
/** One stop of the run's own day, as the app's own view of a stop. */
function toAppStop(stop: { id: string; seq: number; address?: string; lat?: number; lon?: number }) {
  const parts = (stop.address ?? '').split(',').map((part) => part.trim());
  const hasSuburb = parts.length > 1;
  return {
    id: stop.id,
    sequence: stop.seq,
    address: hasSuburb ? parts.slice(0, -1).join(', ') : (stop.address ?? ''),
    suburb: hasSuburb ? (parts[parts.length - 1] ?? '') : '',
    status: 'pending' as const,
    coordinates: { lat: stop.lat ?? -43.5, lng: stop.lon ?? 172.6 },
  };
}

function Seed({ stopId, at }: { stopId?: string; at?: number }) {
  const run = useRun();
  useEffect(() => {
    // The run's own day (the app's E2E day the provider answers with), marked
    // as the drive's slide would leave it - the day's asynchronous load is
    // the screen's business, not the mark's.
    const stop = e2eDay().stops.find((entry) => entry.id === stopId);
    if (!stop) {
      return;
    }
    const nowSpy = at === undefined ? null : jest.spyOn(Date, 'now').mockReturnValue(at);
    run.markDelivered(toAppStop(stop));
    nowSpy?.mockRestore();
  }, [run, stopId, at]);
  return null;
}

/**
 * The day the phone holds, as a store the run state can read and write: the
 * app's own E2E day in the contract's shape (the same day the flows and the
 * E2E legs assert), with the marks planted by the render.
 */
function aDayStore() {
  const marks: DeliveredMark[] = [];
  return {
    load: () =>
      Promise.resolve({ status: 'ok' as const, source: 'cache' as const, snapshot: e2eDay() }),
    refresh: () =>
      Promise.resolve({ status: 'ok' as const, source: 'cache' as const, snapshot: e2eDay() }),
    deliveredMarks: () => Promise.resolve([...marks]),
    markDelivered: (stop: { id: string; sequence: number }) => {
      // The store's own clock: the same read the app's store makes, so a
      // test's pinned `at` is what the confirm shows.
      marks.push({
        stopId: stop.id,
        sequence: stop.sequence,
        at: Date.now(),
        eventId: `e-${stop.id}`,
      });
      return Promise.resolve();
    },
    undoDelivered: (stopId: string) => {
      const at = marks.findIndex((mark) => mark.stopId === stopId);
      if (at >= 0) {
        marks.splice(at, 1);
      }
      return Promise.resolve();
    },
    close: () => Promise.resolve(),
  };
}

/** The render helper: the layout's rule — the run above, the route inside. */
const renderConfirm = (options: { seed?: string; at?: number; params?: { stop?: string } } = {}) => {
  const { seed, at, params } = options;
  if (params !== undefined) {
    mockParams = params;
  }
  return render(
    <RunProvider store={aDayStore() as unknown as never}>
      <GestureHandlerRootView>
        {seed ? <Seed stopId={seed} at={at} /> : null}
        <DeliveredRoute />
      </GestureHandlerRootView>
    </RunProvider>,
  );
};

describe('Delivered', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBack?.mockClear();
    mockParams = { stop: '2' };
  });

  it('renders the confirm exactly as the flows find it', () => {
    renderConfirm();

    expect(screen.getByTestId('delivered-screen')).toBeTruthy();
    expect(screen.getByTestId('delivered-panel')).toBeTruthy();
    expect(screen.getByTestId('delivered-badge')).toBeTruthy();
    expect(screen.getByTestId('delivered-undo')).toBeTruthy();
    expect(screen.getByTestId('delivered-next')).toBeTruthy();
    expect(screen.getByText('Delivered')).toBeTruthy();
  });

  it('reads the address with the minute the run mark carries', async () => {
    const at = Date.parse('2026-10-23T10:43:00');
    renderConfirm({ seed: '2', at });

    // The reference's line: the full address of the delivery, then its minute.
    await screen.findByText(`45 Papanui Road, ${hourMinuteOf(at)}`);
  });

  it('the D33 pairs: Undo rides the fill with the label, Next Stop the accent with onAccent', () => {
    renderConfirm({ seed: '2' });
    const t = tokens('light');

    // The labels: the D33 typography and the pairs of the two fills.
    expect(styleOf(screen.getByText('Undo')).color).toBe(t.colors.label);
    expect(styleOf(screen.getByText('Next Stop')).color).toBe(t.colors.onAccent);

    // The fills: RNTL resolves the Pressable's own style callback, so the
    // merged array reads straight off the rendered element.
    expect(styleOf(screen.getByTestId('delivered-undo')).backgroundColor).toBe(t.colors.fill);
    expect(styleOf(screen.getByTestId('delivered-next')).backgroundColor).toBe(t.colors.accent);
  });

  it('the undo takes the mark off the run and hands back to the drive', async () => {
    renderConfirm({ seed: '2' });

    const undo = await screen.findByTestId('delivered-undo');
    fireEvent.press(undo);

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    expect(theBack()).toHaveBeenCalledTimes(1);
  });

  it('the next stop pans the map camera to the next stop and hands back', async () => {
    renderConfirm({ seed: '2' });

    const next = await screen.findByTestId('delivered-next');
    fireEvent.press(next);

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    expect(thePublish()).toHaveBeenCalledWith({ type: 'zoom_to_next_stop' });
    expect(theBack()).toHaveBeenCalledTimes(1);
  });

  it('without a delivery to confirm the screen says so and the undo sits out', () => {
    renderConfirm({ params: {} });

    expect(screen.getByText('no delivery to confirm')).toBeTruthy();
    expect(screen.getByTestId('delivered-undo').props).toMatchObject({
      accessibilityState: { disabled: true },
    });
  });

  it('without the handover the confirm falls to the run last delivery', async () => {
    renderConfirm({ params: {}, seed: '2' });

    await screen.findByText(/45 Papanui Road, \d{2}:\d{2}/);
  });
});
