/**
 * The courier's own half of the reason (queue 4b, trial #17).
 *
 * The Fail button on Today answered the courier's hand with a haptic and wrote
 * nothing: no status, no event, no reason - so the one thing the office needs
 * to know about a failed delivery never existed. The run state's own write path
 * now records it (RunStore.markFailed), and this is the surface that lets the
 * courier say WHY: a picker with the courier's own list, a sentence for the
 * case the list does not carry, and a mark that carries the chosen word.
 */
/** The stop the screen names, the way it reads it. */
type TheStop = typeof theStop;

const mockMarkFailed = jest.fn(
  (_stop: TheStop, _outcome: { reason: string; utterance?: string }) => Promise.resolve(),
);

/** The run's own next stop, the way the app's screens read it. */
const theStop = {
  id: '2',
  sequence: 2,
  address: '45 Papanui Road',
  suburb: 'Merivale',
  status: 'active' as const,
  coordinates: { lat: -43.518, lng: 172.625 },
  priority: false,
};

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), release: jest.fn() })),
}));

jest.mock('@/voice/useVoice', () => ({
  useVoice: () => ({
    state: 'idle',
    isReady: false,
    lastTranscript: '',
    lastCommand: null,
    lastEarbudEvent: null,
    startListening: jest.fn(),
    stopListening: jest.fn(),
    speak: jest.fn(),
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock('@expo/vector-icons', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  const icon = (props: { name: string }) =>
    ReactActual.createElement(RN.Text, { accessibilityLabel: props.name }, props.name);
  return { Ionicons: icon, MaterialCommunityIcons: icon, FontAwesome: icon };
});

jest.mock('@/voice/useCourierVoice', () => ({
  useCourierVoice: () => ({ brief: null, isReady: false, listening: 'no' }),
}));

jest.mock('@maplibre/maplibre-react-native', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  const view = (props: { testID?: string; children?: React.ReactNode }) =>
    ReactActual.createElement(RN.View, { testID: props.testID }, props.children);
  return { Map: view, Camera: view, Marker: view, NativeUserLocation: () => null };
});

jest.mock('@/maps/useMapBoot', () => ({
  useMapBoot: () => ({ tileSource: { kind: 'none' }, glyphsUrl: null }),
}));

jest.mock('@/maps/styles', () => ({ getCourierStyle: () => ({ name: 'courier-copilot-day' }) }));

jest.mock('@/maps/packFiles', () => ({
  loadOfflinePack: jest.fn(() =>
    Promise.resolve({
      state: { status: 'missing' },
      locations: { downloadedFileUrl: null, bundledFileUrl: null },
    }),
  ),
  localGlyphsUrl: jest.fn(() => null),
}));

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false, status: 'denied' })),
  watchPositionAsync: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
  Accuracy: { Balanced: 3 },
}));

jest.mock('@/sync/preferenceFiles', () => {
  const actual = jest.requireActual<typeof import('@/sync/storage')>('@/sync/storage');
  return { createFilePreferenceStore: () => actual.createMemoryPreferenceStore() };
});

jest.mock('@/maps/runState', () => {
  const actual = jest.requireActual<typeof import('@/maps/runState')>('@/maps/runState');
  return {
    ...actual,
    useRun: () => ({
      delivered: [],
      isDelivered: () => false,
      markDelivered: jest.fn(),
      markFailed: (stop: TheStop, outcome: { reason: string; utterance?: string }) =>
        mockMarkFailed(stop, outcome),
      day: {
        hasRun: true,
        runId: 'run-e2e',
        stops: [theStop],
        delivered: [],
        isDelivered: () => false,
        nextStop: theStop,
        remaining: 1,
        refreshMarks: () => Promise.resolve(),
      },
    }),
  };
});

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import TodayScreen from '..';
import { ChosenProvider } from '@/components/chosen';

/** The screen as the app's construction site mounts it. */
function theScreen() {
  return render(
    <GestureHandlerRootView>
      <ChosenProvider mode="light">
        <TodayScreen />
      </ChosenProvider>
    </GestureHandlerRootView>,
  );
}

/** Opens the picker and answers with its own sheet. */
async function thePicker() {
  fireEvent.press(screen.getByTestId('today-fail'));
  return screen.findByTestId('today-fail-sheet');
}

describe('the failed delivery\u2019s reason on Today', () => {
  beforeEach(() => {
    // One mock for the whole suite: one test must not read another's calls.
    mockMarkFailed.mockClear();
  });

  it('takes the reason the courier chose and records it on the run', async () => {
    theScreen();

    const sheet = await thePicker();

    // The picker is the courier's own list (ADR-023: the list is a product
    // decision, not a generic enum). A reason's own testID carries an
    // underscore because the reason ids are those words.
    expect(within(sheet).getByTestId('today-fail-reason-no_access')).toBeTruthy();
    expect(within(sheet).getByText('Nobody home')).toBeTruthy();

    fireEvent.press(within(sheet).getByTestId('today-fail-reason-no_access'));
    fireEvent.press(within(sheet).getByTestId('today-fail-confirm'));

    await waitFor(() => expect(mockMarkFailed).toHaveBeenCalled());
    const [stop, outcome] = mockMarkFailed.mock.calls[0];
    expect(outcome.reason).toBe('no_access');
    expect(stop).toBeTruthy();
  });

  it('records the courier\u2019s own sentence when the list does not carry it', async () => {
    theScreen();

    const sheet = await thePicker();

    fireEvent.changeText(within(sheet).getByTestId('today-fail-note'), 'the gate code changed');
    fireEvent.press(within(sheet).getByTestId('today-fail-confirm'));

    await waitFor(() => expect(mockMarkFailed).toHaveBeenCalled());
    const [, outcome] = mockMarkFailed.mock.calls[0];
    expect(outcome.reason).toBe('the gate code changed');
  });

  it('cannot record a failure with no reason at all', async () => {
    theScreen();

    const sheet = await thePicker();

    // The server refuses a failed event without its reason, so the phone
    // cannot send one: the confirm answers nothing until there is a reason.
    const confirm = within(sheet).getByTestId('today-fail-confirm').props as {
      accessibilityState?: { disabled?: boolean };
    };
    expect(confirm.accessibilityState?.disabled).toBe(true);
    fireEvent.press(within(sheet).getByTestId('today-fail-confirm'));

    expect(mockMarkFailed).not.toHaveBeenCalled();
  });
});
