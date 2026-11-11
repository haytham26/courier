/**
 * BUG-300: Today's sheet on the large AVD's tall window (411x731 dp).
 *
 * The flows raise the sheet with ONE grabber swipe (peek to half) and then run
 * `scrollUntilVisible` on a RUN ACTIONS row with a 20 s timeout
 * (today-list.yaml, today-fail.yaml). On the large AVD one hierarchy dump
 * takes 4-11 s and one swipe+settle up to 27 s (run 42455960697's api-34
 * leg), so the find AFTER the first swipe often does not fit in the 20 s and
 * the flow fails even though the row became visible. The deterministic fix is
 * geometric: at the level one grabber swipe reaches (half), the RUN ACTIONS
 * row must already sit fully inside the sheet's own ScrollView at scroll 0, so
 * the FIRST find succeeds.
 *
 * The first test computes that geometry from the ONE token file plus the
 * styles the screen actually applied (the gaps read off the rendered tree),
 * the way the chosen components' own suite reads a sheet's card height. The
 * other two pin the perf/visibility contract for the stops and import flows:
 * the backdrop map is hidden from the accessibility tree (no flow taps it - the
 * dumps shrink), and typing does not re-render it.
 */
import React from 'react';
import { Dimensions, ScrollView, StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ChosenProvider } from '@/components/chosen';
import { RunProvider } from '@/maps/runState';
import { e2eDay } from '@/run/dayForThisBuild';
import type { DeliveredMark } from '@/run/types';
import { resetSyncAnswers } from '@/sync/syncAnswers';
import { spacing, touch, typography } from '@courier/design-tokens/chosen';
import { BriefContext } from '../briefContext';
import { sheetHeightsFor } from '@/components/chosen/BottomSheet';
import { DEFAULT_VOICE_SETTINGS } from '@/voice/settings';
import type { CourierVoiceApi } from '@/voice/useCourierVoice';
import TodayScreen from '../index';

/** How many times the map component rendered. */
const mockMapRenders = jest.fn();

jest.mock('@maplibre/maplibre-react-native', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    Map: (props: { testID?: string; children?: React.ReactNode }) => {
      mockMapRenders();
      return ReactActual.createElement(RN.View, { testID: props.testID }, props.children);
    },
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

const mockRouter = { navigate: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

const makeBrief = (): CourierVoiceApi => ({
  ready: false,
  session: null,
  settings: DEFAULT_VOICE_SETTINGS,
  saveSettings: () => Promise.resolve(),
  brief: null,
  refreshBrief: jest.fn(() => Promise.resolve(null)),
  sendTurn: () => Promise.resolve(null),
  error: null,
  lastGate: null,
  lastAnswer: null,
  lastQuestion: null,
  forgetMemory: () => Promise.resolve(false),
});

function makeDayStore() {
  const marks: DeliveredMark[] = [];
  return {
    load: () =>
      Promise.resolve({ status: 'ok' as const, source: 'network' as const, snapshot: e2eDay() }),
    refresh: () =>
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

const renderScreen = () =>
  render(
    <ChosenProvider mode="light">
      <RunProvider store={makeDayStore()}>
        <BriefContext.Provider value={makeBrief()}>
          <TodayScreen />
        </BriefContext.Provider>
      </RunProvider>
    </ChosenProvider>,
  );

/** The large AVD's window: 1440x2560 px at 560 dpi = 411x731 dp. */
const LARGE_WINDOW = { width: 411, height: 731, scale: 3.5, fontScale: 1 };
/** The small AVD's window: 320x640 dp. */
const SMALL_WINDOW = { width: 320, height: 640, scale: 2, fontScale: 1 };

/** The sheet's own geometry, read from the component under test (BUG-300: a hardcoded fraction is how the tall-window defect reads as a test defect). */
const LARGE_HALF = sheetHeightsFor(LARGE_WINDOW.height).half;
const LARGE_GRABBER = sheetHeightsFor(LARGE_WINDOW.height).grabberArea;

describe('the today sheet on a tall window (411x731 dp, BUG-300)', () => {
  let windowSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    resetSyncAnswers();
    windowSpy = jest.spyOn(Dimensions, 'get').mockReturnValue(LARGE_WINDOW);
  });

  afterEach(() => {
    windowSpy.mockRestore();
  });

  it('at the level one grabber swipe reaches (half), the RUN ACTIONS row (today-mark-delivered) sits fully inside the sheet viewport at scroll 0', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId('today-mark-delivered')).toBeTruthy());

    // The gaps the screen actually applied, read off the rendered tree.
    const scroll = screen.UNSAFE_getByType(ScrollView);
    const content = StyleSheet.flatten(scroll.props.contentContainerStyle as never) as {
      gap?: number;
    };
    const sheetGap = content.gap ?? spacing.space16;
    const greetingRow = screen.getByText('Good morning').parent?.parent ?? null;
    if (greetingRow === null) {
      throw new Error('the greeting row never rendered');
    }
    const greetingGap = (StyleSheet.flatten(greetingRow.props.style as never) as { gap?: number })
      .gap ?? spacing.space8;

    // The content above the actions row's bottom, from the ONE token file:
    // greeting row, stat row (number + label + 6 gap + 4 track), section
    // label, next-stop row (street + 8 + 30 chip, or the 64 dp Go button),
    // the secondary actions row (48), the RUN ACTIONS label, the actions row
    // itself (48) - with the sheet's gap between each pair.
    const greetingHeight =
      typography.paragraph.lineHeight +
      greetingGap +
      typography.streetTitle.lineHeight +
      greetingGap +
      typography.body.lineHeight;
    const statHeight = typography.stat.lineHeight + typography.secondary.lineHeight + 6 + 4;
    const nextStopHeight = Math.max(
      typography.streetTitle.lineHeight + spacing.space8 + 30,
      touch.drivingAction,
    );
    const contentAboveActionsRowBottom =
      greetingHeight +
      sheetGap +
      statHeight +
      sheetGap +
      typography.secondary.lineHeight +
      sheetGap +
      nextStopHeight +
      sheetGap +
      touch.minimum +
      sheetGap +
      typography.secondary.lineHeight +
      sheetGap +
      touch.minimum;

    // The viewport of the sheet's ScrollView at half: the card's height minus
    // the grabber's own area. The card's bottom is pinned above the dock, so
    // the viewport's bottom does not move between levels - only its height.
    const viewportHeight = LARGE_HALF - LARGE_GRABBER;

    expect(contentAboveActionsRowBottom).toBeLessThanOrEqual(viewportHeight);
  });

  it('hides the backdrop map from the accessibility tree (no flow taps it; the dumps shrink)', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId('today-mark-delivered')).toBeTruthy());

    // The wrapper carries the a11y props and is intentionally OUTSIDE the tree,
    // so the query asks for hidden elements and names the wrapper itself:
    // walking parents reaches whatever the map library renders in between.
    const wrapper = screen.getByTestId('today-map-veil', { includeHiddenElements: true });    expect(wrapper.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(wrapper.props.accessibilityElementsHidden).toBe(true);
  });

  it("typing the failure's own words does not re-render the map behind the sheet", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId('today-mark-delivered')).toBeTruthy());

    // Open the fail picker, then type: each keystroke is a state update on the
    // screen, and the map must not pay for it.
    fireEvent.press(screen.getByTestId('today-fail'));
    await waitFor(() => expect(screen.getByTestId('today-fail-note')).toBeTruthy());

    const before = mockMapRenders.mock.calls.length;
    fireEvent.changeText(screen.getByTestId('today-fail-note'), 'a');
    fireEvent.changeText(screen.getByTestId('today-fail-note'), 'ab');
    fireEvent.changeText(screen.getByTestId('today-fail-note'), 'abc');

    expect(mockMapRenders.mock.calls.length).toBe(before);
  });
});

describe('the today sheet on a short window (320x640 dp) keeps its content gaps', () => {
  let windowSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    resetSyncAnswers();
    windowSpy = jest.spyOn(Dimensions, 'get').mockReturnValue(SMALL_WINDOW);
  });

  afterEach(() => {
    windowSpy.mockRestore();
  });

  it('keeps the sheet content gap at the design value, so the small AVD layout is unchanged', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId('today-mark-delivered')).toBeTruthy());

    const scroll = screen.UNSAFE_getByType(ScrollView);
    const content = StyleSheet.flatten(scroll.props.contentContainerStyle as never) as {
      gap?: number;
    };
    expect(content.gap).toBe(spacing.space16);

    const greetingRow = screen.getByText('Good morning').parent?.parent ?? null;
    if (greetingRow === null) {
      throw new Error('the greeting row never rendered');
    }
    const greetingGap = (StyleSheet.flatten(greetingRow.props.style as never) as { gap?: number })
      .gap;
    expect(greetingGap).toBe(spacing.space8);
  });
});
