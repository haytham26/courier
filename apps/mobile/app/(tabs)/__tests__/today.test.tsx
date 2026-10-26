/**
 * Today on the chosen tokens (T6 slice 3).
 *
 * The contract the flows pin: the screen answers as `today-screen`, the
 * greeting is there, the map buttons and the day's actions are reachable,
 * and the actions carry the haptics of the contract (deliver and error are
 * notifications, a confirm is an impact). The map and the icon font are
 * mocked the same way the map screen's tests mock them; the brief of the
 * tabs is an in-memory context value, so no service is called.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { ChosenProvider } from '@/components/chosen';
import { BriefContext } from '../briefContext';
import { DEFAULT_VOICE_SETTINGS } from '@/voice/settings';
import type { CourierVoiceApi } from '@/voice/useCourierVoice';
import TodayScreen from '../index';

jest.mock('@maplibre/maplibre-react-native', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    Map: (props: { testID?: string; children?: React.ReactNode }) =>
      ReactActual.createElement(RN.View, { testID: props.testID }, props.children),
    Camera: (props: { testID?: string; children?: React.ReactNode }) =>
      ReactActual.createElement(RN.View, { testID: props.testID }, props.children),
    Marker: (props: { testID?: string; children?: React.ReactNode }) =>
      ReactActual.createElement(RN.View, { testID: props.testID }, props.children),
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

// The router is a shared mock so a test can assert where an action navigates:
// the End of day row is the way into the summary screen, and the flow that
// rides it needs the navigation to be a fact, not a hope.
const mockRouter = { navigate: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

/** The brief of the tabs, in memory: the ask is recorded, the line stays unset. */
const makeBrief = (): CourierVoiceApi => ({
  ready: false,
  session: null,
  settings: DEFAULT_VOICE_SETTINGS,
  saveSettings: () => Promise.resolve(),
  brief: null,
  refreshBrief: jest.fn(() => Promise.resolve(null)),
  sendTurn: () => Promise.resolve(null),
  error: null,
});

const renderScreen = () => {
  const brief = makeBrief();
  const screenHandle = render(
    <ChosenProvider mode="light">
      <BriefContext.Provider value={brief}>
        <TodayScreen />
      </BriefContext.Provider>
    </ChosenProvider>,
  );
  return { brief, ...screenHandle };
};

describe('Today', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the root, the greeting and the day exactly as the flows find them', () => {
    renderScreen();

    expect(screen.getByTestId('today-screen')).toBeTruthy();
    expect(screen.getByText('Good morning')).toBeTruthy();
    expect(screen.getByTestId('today-map-style')).toBeTruthy();
    expect(screen.getByTestId('today-recentre')).toBeTruthy();
    expect(screen.getByTestId('today-go')).toBeTruthy();
    expect(screen.getByTestId('today-scan')).toBeTruthy();
    expect(screen.getByTestId('today-add-by-voice')).toBeTruthy();
    expect(screen.getByTestId('today-end-of-day')).toBeTruthy();
    expect(screen.getByTestId('today-mark-delivered')).toBeTruthy();
    expect(screen.getByTestId('today-skip')).toBeTruthy();
    expect(screen.getByTestId('today-fail')).toBeTruthy();
    expect(screen.getByTestId('stop-pin-2')).toBeTruthy();
  });

  it("opens the summary of the day from Today's End of day action", () => {
    renderScreen();

    // The way in is a root-stack route, and the flow rides it: the dock carries
    // no summary tab, so Today opens it.
    fireEvent.press(screen.getByTestId('today-end-of-day'));

    expect(mockRouter.navigate).toHaveBeenCalledWith('/summary');
  });

  it('the brief line falls back to the plain sentence when the service is quiet', () => {
    renderScreen();

    expect(
      screen.getByText('Five stops on the Northwood AM run. Dry until the afternoon.'),
    ).toBeTruthy();
  });

  it('opening the screen asks the voice for the morning brief once', () => {
    const { brief } = renderScreen();

    expect(brief.refreshBrief).toHaveBeenCalledTimes(1);
  });

  it('a delivery is a success notification', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('today-mark-delivered'));

    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });

  it('a skip confirms with an impact', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('today-skip'));

    expect(Haptics.impactAsync).toHaveBeenCalled();
  });

  it('a failure is an error notification', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('today-fail'));

    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
  });
});
