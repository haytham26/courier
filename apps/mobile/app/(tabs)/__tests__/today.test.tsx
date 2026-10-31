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
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { ChosenProvider } from '@/components/chosen';
import { RunProvider } from '@/maps/runState';
import { e2eDay } from '@/run/dayForThisBuild';
import { RunStore } from '@/run/runStore';
import { EventLog } from '@/sync/eventLog';
import type { DeliveredMark, RunCache } from '@/run/types';
import type { EventStore } from '@/sync/types';
import { reportSyncAnswers, resetSyncAnswers } from '@/sync/syncAnswers';
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

/**
 * The day the phone holds in these tests.
 *
 * A1 slice 3: Today reads the day through the run store, so the screen's own
 * test suite has to hand it one. The day is the E2E build's own - the mock
 * run's stops, in the contract's shape - because that is the day the flows
 * assert (`stop-2`, "45 Papanui Road"), and the marks are the store's own so a
 * mark written by the screen is a mark the screen reads back.
 */
function makeDayStore() {
  const marks: DeliveredMark[] = [];
  return {
    load: () =>
      Promise.resolve({ status: 'ok' as const, source: 'network' as const, snapshot: e2eDay() }),
    refresh: () =>
      Promise.resolve({ status: 'ok' as const, source: 'network' as const, snapshot: e2eDay() }),
    deliveredMarks: () => Promise.resolve([...marks]),
    // The run state's own write path: a stop is marked, and the mark the
    // screen reads back is the one the store kept.
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

/**
 * An event log over an in-memory store, so no database is opened behind a
 * screen's marks in these tests.
 */
function makeEventStore(): EventStore {
  return {
    append: () => Promise.resolve(),
    pending: () => Promise.resolve([]),
    markSynced: () => Promise.resolve(),
    quarantine: () => Promise.resolve(),
    forget: () => Promise.resolve(),
    pendingCount: () => Promise.resolve(0),
  };
}

const renderScreen = () => {
  const brief = makeBrief();
  const screenHandle = render(
    <ChosenProvider mode="light">
      {/* The run state above the stack, which the root layout wraps every
          screen in: Today reads the day and its marks through it (A1 slice
          3), so the provider is handed a store that has a day. */}
      <RunProvider store={makeDayStore()}>
        <BriefContext.Provider value={brief}>
          <TodayScreen />
        </BriefContext.Provider>
      </RunProvider>
    </ChosenProvider>,
  );
  return { brief, ...screenHandle };
};

describe('Today', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The outbox's answers are the session's own: one suite's answer must not
    // leak into the next test's screen.
    resetSyncAnswers();
  });

  // The E2E build's own composition, which the mock legs of the Android E2E run
  // against: the root layout hands the run state the production store, and its
  // `load` answers the E2E build's day (the mock run's stops). The run of
  // e59aaaf (both legs) showed why this composition has to be pinned: the day
  // the screen answered with was EMPTY - "Every stop is delivered." with no
  // `today-go` and no `today-mark-delivered` in the tree - and five flows of
  // the suite died on those two testIDs. A screen that reads the run store and
  // answers no stops is a courier shown an empty shift.
  it('answers the E2E build\'s own day through the run store the root layout hands it', async () => {
    // The store the E2E build's production construction site builds: the same
    // reason it passes (`EXPO_PUBLIC_E2E=1` seeds `e2e`), over the app's own
    // day. The cache is in memory, so no database is opened behind it - this
    // test is about the DAY reaching the screen, which is what the run of
    // e59aaaf lost.
    const cache: RunCache = {
      read: () => Promise.resolve(null),
      write: () => Promise.resolve(),
      markDelivered: () => Promise.resolve(),
      markOf: () => Promise.resolve(null),
      undoDelivered: () => Promise.resolve(),
      deliveredMarks: () => Promise.resolve([]),
      clear: () => Promise.resolve(),
      close: () => Promise.resolve(),
    };

    const store = new RunStore({
      client: {
        seedDemoRun: () => Promise.resolve({ status: 'offline' }),
        getRun: () => Promise.resolve({ status: 'offline' }),
        getStops: () => Promise.resolve({ status: 'offline' }),
      },
      cache,
      events: new EventLog(makeEventStore()),
      reason: 'e2e',
    });

    render(
      <ChosenProvider mode="light">
        <RunProvider store={store}>
          <BriefContext.Provider value={makeBrief()}>
            <TodayScreen />
          </BriefContext.Provider>
        </RunProvider>
      </ChosenProvider>,
    );

    // The day is the E2E build's own: five stops, and the first is the next one
    // the courier drives to.
    await waitFor(() => {
      expect(screen.getByTestId('today-go')).toBeTruthy();
    });
    expect(screen.getByTestId('today-mark-delivered')).toBeTruthy();
    expect(screen.queryByText('Every stop is delivered.')).toBeNull();
  });

  it('renders the root, the greeting and the day exactly as the flows find them', async () => {
    renderScreen();

    expect(screen.getByTestId('today-screen')).toBeTruthy();
    expect(screen.getByText('Good morning')).toBeTruthy();
    expect(screen.getByTestId('today-map-style')).toBeTruthy();
    expect(screen.getByTestId('today-recentre')).toBeTruthy();
    // The day is the phone's own read: it arrives after the store answers, so
    // the stop rows the flows walk are waited for rather than assumed (A1
    // slice 3 reads the day through the run store, not a module constant).
    await waitFor(() => expect(screen.getByTestId('today-go')).toBeTruthy());
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

  it('a delivery is a success notification', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId('today-mark-delivered')).toBeTruthy());

    fireEvent.press(screen.getByTestId('today-mark-delivered'));

    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success,
    );
  });

  it('a skip confirms with an impact', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId('today-skip')).toBeTruthy());

    fireEvent.press(screen.getByTestId('today-skip'));

    expect(Haptics.impactAsync).toHaveBeenCalled();
  });

  it('a failure is an error notification', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId('today-fail')).toBeTruthy());

    fireEvent.press(screen.getByTestId('today-fail'));

    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
  });

  // ADR-014's answers are the courier's (A1 slice 3): a delivery the server
  // refused is said on the screen the courier is looking at, not left in a log
  // nobody reads. A courier told "all good" while three deliveries are
  // quarantined is being lied to.
  it('says out loud when a delivery could not be sent', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId('today-go')).toBeTruthy());

    act(() => {
      reportSyncAnswers({
        sent: 2,
        accepted: 0,
        cursor: 0,
        failed: true,
        conflicts: ['delivered-1'],
        quarantined: ['delivered-1'],
        retryAfterMs: 0,
      });
    });

    expect(screen.getByTestId('today-sync-note')).toBeTruthy();
    expect(screen.getByText(/1 delivery could not be sent and is kept on this phone/)).toBeTruthy();
  });

  it('says nothing about the send when there is nothing to say', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId('today-go')).toBeTruthy());

    act(() => {
      reportSyncAnswers({
        sent: 2,
        accepted: 2,
        cursor: 0,
        failed: false,
        conflicts: [],
        quarantined: [],
        retryAfterMs: 0,
      });
    });

    expect(screen.queryByTestId('today-sync-note')).toBeNull();
  });
});
