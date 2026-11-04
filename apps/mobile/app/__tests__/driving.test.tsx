/**
 * The drive screen's contract (T6 slice 3, screen 02).
 *
 * The contract the flows pin: the screen answers as `driving-screen`, the
 * glance blocks are on it, the turn card reads the run's real numbers (the
 * same stop Today reads, the straight-line distance from the map's home
 * centre), the panel counts the stops, and the slide hands the run to the
 * next stop through its two-step activation. The map, the boot, the icons
 * and the voice are mocked the way Today's tests mock them.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import DrivingRoute from '../driving';
import { RunProvider } from '@/maps/runState';
import { e2eDay } from '@/run/dayForThisBuild';
import type { DeliveredMark } from '@/run/types';

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

/** The stable mic spy, poured out by the mock's factory (the `mock` prefix is the hoisting contract). */
let mockMic: jest.Mock | undefined;

jest.mock('@/voice/useVoice', () => {
  const startListening = jest.fn(() => Promise.resolve());
  mockMic = startListening;
  return {
    useVoice: () => ({
      state: 'idle',
      isReady: false,
      lastCommand: null,
      startListening,
      stopListening: jest.fn(() => Promise.resolve()),
      speak: jest.fn(() => Promise.resolve()),
    }),
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: jest.fn(), push: jest.fn() }),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false })),
}));

/** The live startListening spy of the mocked voice. */
const theMic = (): jest.Mock => {
  if (!mockMic) {
    throw new Error("the voice mock never ran — the spy isn't there");
  }
  return mockMic;
};

/**
 * The day the drive moves on.
 *
 * A1 slice 3: the drive reads the run's own stops through the run store, so the
 * suite hands it one - the E2E build's own day, in the contract's shape, which
 * is the day the flows walk.
 */
function makeDayStore() {
  const marks: DeliveredMark[] = [];
  return {
    load: () =>
      Promise.resolve({ status: 'ok' as const, source: 'network' as const, snapshot: e2eDay() }),
    deliveredMarks: () => Promise.resolve([...marks]),
    markDelivered: (stop: { id: string; sequence: number }) => {
      marks.push({
        stopId: stop.id,
        sequence: stop.sequence,
        at: Date.now(),
        eventId: `event-${stop.id}-${String(marks.length)}`,
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

/** The render helper: the slide's gestures need the root handler above them,
 * and the run state sits above the route the way the root layout holds it. */
const renderDrive = () =>
  render(
    <RunProvider store={makeDayStore()}>
      <GestureHandlerRootView>
        <DrivingRoute />
      </GestureHandlerRootView>
    </RunProvider>,
  );

describe('Driving', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the glance blocks exactly as the flows find them', async () => {
    renderDrive();

    expect(screen.getByTestId('driving-screen')).toBeTruthy();
    expect(screen.getByTestId('driving-turn')).toBeTruthy();
    expect(screen.getByTestId('driving-panel')).toBeTruthy();
    expect(screen.getByTestId('driving-slide')).toBeTruthy();
    expect(screen.getByTestId('driving-map-style')).toBeTruthy();
    expect(screen.getByTestId('driving-copilot')).toBeTruthy();
    // The day is the run store's own read: it arrives after the store answers,
    // so the pins the flows walk are waited for rather than assumed.
    await waitFor(() => expect(screen.getByTestId('stop-pin-2')).toBeTruthy());
  });

  it('reads the run the same one Today reads, with the real numbers', async () => {
    renderDrive();
    await waitFor(() => expect(screen.getByText('STOP 2 OF 5')).toBeTruthy());

    // The street runs twice on purpose: on the turn card and on the panel.
    expect(screen.getAllByText('Papanui Road')).toHaveLength(2);
    expect(screen.getByText('Merivale')).toBeTruthy();
    // The straight line from the map's home centre to the stop: not a
    // design sample, the maths the flow can re-derive.
    expect(screen.getByText('1.9 km')).toBeTruthy();
    // The turn after this one (the Then strip): the strip's own words.
    expect(screen.getByText('Then Blenheim Road')).toBeTruthy();
  });

  it('hands the run to the next stop through the two-step activation', async () => {
    renderDrive();
    // The run has to be on the phone before a slide can deliver it.
    await waitFor(() => expect(screen.getByText('STOP 2 OF 5')).toBeTruthy());

    const slide = screen.getByTestId('driving-slide');

    // The first activation asks.
    fireEvent(slide, 'onAccessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(screen.getByText('Activate again to confirm')).toBeTruthy();

    // The second confirms: the slide is delivered, the run moves on.
    fireEvent(slide, 'onAccessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success,
    );
    expect(screen.getByText('STOP 3 OF 5')).toBeTruthy();
  });

  it('the map-style button turns the day to night and back', () => {
    renderDrive();

    // The drive opens on the light: the moon offers the night.
    expect(screen.getByText('moon')).toBeTruthy();
    expect(screen.getByLabelText('Night map')).toBeTruthy();

    fireEvent.press(screen.getByTestId('driving-map-style'));
    expect(Haptics.impactAsync).toHaveBeenCalled();
    expect(screen.getByText('sunny')).toBeTruthy();
    expect(screen.getByLabelText('Day map')).toBeTruthy();

    fireEvent.press(screen.getByTestId('driving-map-style'));
    expect(screen.getByText('moon')).toBeTruthy();
  });

  it('the copilot button speaks to the mic, not to a screen that is not there', () => {
    renderDrive();

    const startListening = theMic();
    fireEvent.press(screen.getByTestId('driving-copilot'));

    expect(startListening).toHaveBeenCalledTimes(1);
  });
});
