/**
 * BUG-300: the settings list on the large AVD's tall window (411x731 dp).
 *
 * On the large AVD every Maestro hierarchy dump takes 4-11 s and every
 * `scrollUntilVisible` gets only one or two find+swipe iterations inside its
 * 20 s timeout (run 42455960697: lock-screen and voice-memory failed on both
 * large legs). The rows the flows scroll for - `settings-lock-screen` (the
 * Device group) and `settings-remember` / `settings-forget-memory` (the
 * MEMORY group) - sat near the bottom of the list, ~5000-5200 px down a
 * ~5900 px content, unreachable in one or two swipes.
 *
 * The contract these tests pin: on a tall window the Device and MEMORY groups
 * sit directly under the Debug group (which itself sits under Legal and
 * Session, the rows the flows tap with NO scroll), so the scrolled-for rows
 * are in the first screenful; on a short window the order is unchanged. And
 * the list's bottom padding clears the tab dock (bottom 26 + bar 62 = 88 dp),
 * so the last rows can scroll above it.
 */
import React from 'react';
import { Dimensions, ScrollView, StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ChosenProvider } from '@/components/chosen';
import SettingsScreen from '../settings';

// The preferences are kept in memory, so one test cannot leave a choice behind
// for the next one (the same mock the settings screen's own suite uses).
jest.mock('@/sync/preferenceFiles', () => {
  const actual = jest.requireActual<typeof import('@/sync/storage')>('@/sync/storage');
  return {
    createFilePreferenceStore: () => actual.createMemoryPreferenceStore(),
  };
});

jest.mock('@/voice/useCourierVoice', () => ({
  useCourierVoice: () => ({
    ready: true,
    session: null,
    settings: {
      verbosity: 'normal',
      voice: 'nz',
      speed: 1,
      quietMode: false,
      essentialsOnly: false,
      language: 'en-NZ',
      remember: true,
      proactive: {},
    },
    saveSettings: jest.fn(() => Promise.resolve()),
    forgetMemory: jest.fn(() => Promise.resolve(true)),
    brief: null,
    refreshBrief: jest.fn(() => Promise.resolve(null)),
  }),
}));

jest.mock('@/maps/packFiles', () => ({
  loadOfflinePack: jest.fn(() =>
    Promise.resolve({
      state: { status: 'missing' },
      locations: { downloadedFileUrl: null, bundledFileUrl: null },
    }),
  ),
  localGlyphsUrl: jest.fn(() => null),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ logout: jest.fn(() => Promise.resolve()) }),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), navigate: jest.fn(), push: jest.fn(), back: jest.fn() },
  useRouter: () => ({ replace: jest.fn(), navigate: jest.fn(), push: jest.fn() }),
}));

jest.mock('expo-linking', () => ({ openURL: jest.fn(() => Promise.resolve()) }));

function renderScreen() {
  return render(
    <GestureHandlerRootView>
      <ChosenProvider mode="light">
        <SettingsScreen />
      </ChosenProvider>
    </GestureHandlerRootView>,
  );
}

/** The large AVD's window: 1440x2560 px at 560 dpi = 411x731 dp. */
const LARGE_WINDOW = { width: 411, height: 731, scale: 3.5, fontScale: 1 };
/** The small AVD's window: 320x640 dp. */
const SMALL_WINDOW = { width: 320, height: 640, scale: 2, fontScale: 1 };

/** The dock's own footprint: bottom 26 + bar height 62 (TabBar's geometry). */
const DOCK_DP = 26 + 62;

/** Where a group title sits in the rendered tree's JSON. */
function indexOfGroup(flat: string, title: string): number {
  const at = flat.indexOf(title);
  if (at < 0) {
    throw new Error(`the group ${title} is not in the tree`);
  }
  return at;
}

describe('the settings list on a tall window (411x731 dp, BUG-300)', () => {
  let windowSpy: jest.SpyInstance;

  beforeEach(() => {
    windowSpy = jest.spyOn(Dimensions, 'get').mockReturnValue(LARGE_WINDOW);
  });

  afterEach(() => {
    windowSpy.mockRestore();
  });

  it('puts Device and MEMORY directly under Debug, so settings-lock-screen and settings-remember/forget-memory are in the first screenful the flows scroll to', () => {
    const { toJSON } = renderScreen();
    const flat = JSON.stringify(toJSON());

    // The rows the flows tap with NO scroll stay on top: Legal, Session,
    // Debug - then the rows they scroll one screen for: Device, MEMORY -
    // and only then Voice.
    const legal = indexOfGroup(flat, 'LEGAL');
    const session = indexOfGroup(flat, 'SESSION');
    const debug = indexOfGroup(flat, 'DEBUG');
    const device = indexOfGroup(flat, 'DEVICE');
    const memory = indexOfGroup(flat, 'MEMORY');
    const voice = indexOfGroup(flat, 'VOICE');
    expect(legal).toBeLessThan(session);
    expect(session).toBeLessThan(debug);
    expect(debug).toBeLessThan(device);
    expect(device).toBeLessThan(memory);
    expect(memory).toBeLessThan(voice);

    // The scrolled-for rows are all on the screen.
    expect(screen.getByTestId('settings-lock-screen')).toBeTruthy();
    expect(screen.getByTestId('settings-remember')).toBeTruthy();
    expect(screen.getByTestId('settings-forget-memory')).toBeTruthy();
  });

  it("ends the list's VIEWPORT above the dock, so a scrolled-to row is never covered by it (BUG-300: the api-34 large leg tapped the dock)", () => {
    renderScreen();

    // The run 42455960697 / 42542068115 failure: scrollUntilVisible stops at the
    // row's first fully-visible frame, which on a tall window puts the row's centre
    // INSIDE the floating dock's bounds - the tap lands on the glass, not the row,
    // and the lock-screen route never opens. The frame, not the content padding, is
    // what keeps a row clear of the dock: the dock is 26 dp off the bottom plus 62
    // dp of bar, so the list must end that much above the screen bottom.
    const scroll = screen.UNSAFE_getByType(ScrollView);
    const frame = StyleSheet.flatten(scroll.props.style as never) as { marginBottom?: number };
    expect(frame.marginBottom ?? 0).toBeGreaterThanOrEqual(DOCK_DP);
  });
  it("pads the list's bottom past the 88 dp tab dock, so the last rows can scroll above it", () => {
    renderScreen();

    const scroll = screen.UNSAFE_getByType(ScrollView);
    const content = StyleSheet.flatten(scroll.props.contentContainerStyle as never) as {
      paddingBottom?: number;
    };
    expect(content.paddingBottom).toBeGreaterThanOrEqual(DOCK_DP);
  });
});

describe('the settings list on a short window (320x640 dp) keeps its order', () => {
  let windowSpy: jest.SpyInstance;

  beforeEach(() => {
    windowSpy = jest.spyOn(Dimensions, 'get').mockReturnValue(SMALL_WINDOW);
  });

  afterEach(() => {
    windowSpy.mockRestore();
  });

  it('keeps Voice above MEMORY above Map above Device, the order the small AVD passes with', () => {
    const { toJSON } = renderScreen();
    const flat = JSON.stringify(toJSON());

    const voice = indexOfGroup(flat, 'VOICE');
    const memory = indexOfGroup(flat, 'MEMORY');
    const map = indexOfGroup(flat, 'MAP');
    const device = indexOfGroup(flat, 'DEVICE');
    expect(voice).toBeLessThan(memory);
    expect(memory).toBeLessThan(map);
    expect(map).toBeLessThan(device);

    // The no-scroll rows stay on top here too.
    const legal = indexOfGroup(flat, 'LEGAL');
    const session = indexOfGroup(flat, 'SESSION');
    const debug = indexOfGroup(flat, 'DEBUG');
    expect(legal).toBeLessThan(session);
    expect(session).toBeLessThan(debug);
    expect(debug).toBeLessThan(voice);
  });

  it('still pads the list bottom past the dock', () => {
    renderScreen();

    const scroll = screen.UNSAFE_getByType(ScrollView);
    const content = StyleSheet.flatten(scroll.props.contentContainerStyle as never) as {
      paddingBottom?: number;
    };
    expect(content.paddingBottom).toBeGreaterThanOrEqual(DOCK_DP);
  });
});
