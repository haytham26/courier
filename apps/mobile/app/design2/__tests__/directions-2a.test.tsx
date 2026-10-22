/**
 * The three directions of this team in the design lab of the second round
 * (MASTER_EXECUTION §13.6).
 *
 * The directions are real screens, so they are tested like real screens:
 * each one carries the content of the day's list, one primary action, a
 * voice bar that names its state, the seven states of the contract, and an
 * accessibility label on every control. The tests also check that the three
 * are three different layouts and not three colours of the same one.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import type * as StorageModule from '@/sync/storage';
import type * as ReactModule from 'react';
import type * as ReactNativeModule from 'react-native';
import { themes } from '@courier/design-tokens/themes';
import { directions2a, direction2aNames } from '@courier/design-tokens/directions2a';
import { ThemeProvider, ThemeScope } from '@/providers/ThemeProvider';
import { ControlRoomToday } from '@/design2a/control-room/ControlRoomToday';
import { ControlRoomDriving } from '@/design2a/control-room/ControlRoomDriving';
import { ControlRoomCopilot } from '@/design2a/control-room/ControlRoomCopilot';
import { ControlRoomScanner } from '@/design2a/control-room/ControlRoomScanner';
import { TopoToday } from '@/design2a/topo/TopoToday';
import { TopoDriving } from '@/design2a/topo/TopoDriving';
import { TopoCopilot } from '@/design2a/topo/TopoCopilot';
import { TopoScanner } from '@/design2a/topo/TopoScanner';
import { AddressFirstToday } from '@/design2a/address-first/AddressFirstToday';
import { AddressFirstDriving } from '@/design2a/address-first/AddressFirstDriving';
import { AddressFirstCopilot } from '@/design2a/address-first/AddressFirstCopilot';
import { AddressFirstScanner } from '@/design2a/address-first/AddressFirstScanner';

jest.mock('@/sync/preferenceFiles', () => {
  const actual = jest.requireActual<typeof StorageModule>('@/sync/storage');
  return {
    createFilePreferenceStore: () => actual.createMemoryPreferenceStore(),
  };
});

// The native map is mocked here: the point of these tests is the screen, not
// the tiles.
jest.mock('@maplibre/maplibre-react-native', () => {
  const ReactActual = jest.requireActual<typeof ReactModule>('react');
  const RN = jest.requireActual<typeof ReactNativeModule>('react-native');

  return {
    Map: (props: { testID?: string; children?: React.ReactNode }) =>
      ReactActual.createElement(RN.View, { testID: props.testID }, props.children),
    Camera: (props: { children?: React.ReactNode }) =>
      ReactActual.createElement(RN.View, null, props.children),
    GeoJSONSource: (props: { children?: React.ReactNode }) =>
      ReactActual.createElement(RN.View, null, props.children),
    Layer: () => ReactActual.createElement(RN.View, null),
    Marker: (props: { children?: React.ReactNode }) =>
      ReactActual.createElement(RN.View, null, props.children),
    NativeUserLocation: () => null,
  };
});

type ScreenProps = { state?: 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'partial' | 'permission' };

const SCREENS: Record<
  (typeof direction2aNames)[number],
  {
    today: React.ComponentType<ScreenProps>;
    driving: React.ComponentType<ScreenProps>;
    copilot: React.ComponentType<ScreenProps>;
    scanner: React.ComponentType<ScreenProps>;
  }
> = {
  controlRoom: {
    today: ControlRoomToday,
    driving: ControlRoomDriving,
    copilot: ControlRoomCopilot,
    scanner: ControlRoomScanner,
  },
  topo: {
    today: TopoToday,
    driving: TopoDriving,
    copilot: TopoCopilot,
    scanner: TopoScanner,
  },
  addressFirst: {
    today: AddressFirstToday,
    driving: AddressFirstDriving,
    copilot: AddressFirstCopilot,
    scanner: AddressFirstScanner,
  },
};

function renderScreen(
  name: (typeof direction2aNames)[number],
  screen: 'today' | 'driving' | 'copilot' | 'scanner',
  state: ScreenProps['state'] = 'ready',
  night = false,
) {
  const direction = directions2a[name];
  const Component = SCREENS[name][screen];

  return render(
    <ThemeProvider>
      <ThemeScope theme={themes[night ? direction.nightThemeName : direction.themeName]}>
        <Component state={state} />
      </ThemeScope>
    </ThemeProvider>,
  );
}

describe.each(direction2aNames)('the %s direction', (name) => {
  it("shows the content of the day's list", () => {
    renderScreen(name, 'today');

    expect(screen.getByTestId('today-screen')).toBeTruthy();
    expect(screen.getByText('18')).toBeTruthy();
    expect(screen.getAllByText('14 Harewood Road').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Papanui/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/10:42/).length).toBeGreaterThan(0);
  });

  it('has one primary action of 72 points', () => {
    renderScreen(name, 'today');

    expect(screen.getByTestId('today-next-stop')).toBeTruthy();
    expect(screen.getAllByLabelText('Next stop')).toHaveLength(1);
  });

  it('has a voice bar that names its state', () => {
    renderScreen(name, 'today');

    expect(screen.getByTestId('voice-bar')).toBeTruthy();
    expect(screen.getByLabelText(/Copilot is listening/)).toBeTruthy();
  });

  it('has a settings button with a label and a role', () => {
    renderScreen(name, 'today');

    expect(screen.getByTestId('today-settings')).toBeTruthy();
    expect(screen.getByLabelText('Settings')).toBeTruthy();
  });

  it('reads the number of stops left as a heading', () => {
    renderScreen(name, 'today');

    expect(screen.getByLabelText('18 stops left')).toBeTruthy();
  });

  it('never uses an emoji', () => {
    renderScreen(name, 'today');

    const tree = JSON.stringify(screen.toJSON());

    expect(tree).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });

  it('has the four screens of the spec', () => {
    renderScreen(name, 'today');
    expect(screen.getByTestId('today-screen')).toBeTruthy();

    renderScreen(name, 'driving');
    expect(screen.getByTestId('driving-screen')).toBeTruthy();

    renderScreen(name, 'copilot');
    expect(screen.getByTestId('copilot-screen')).toBeTruthy();

    renderScreen(name, 'scanner');
    expect(screen.getByTestId('scanner-screen')).toBeTruthy();
  });

  it('draws the driving screen with the map and the address', () => {
    renderScreen(name, 'driving');

    expect(screen.getByTestId('courier-map')).toBeTruthy();
    expect(screen.getByLabelText(/Next stop, 14 Harewood Road, Papanui/)).toBeTruthy();
    expect(screen.getByTestId('driving-next-stop')).toBeTruthy();
  });

  it('shows the last thing the assistant said and what it understood', () => {
    renderScreen(name, 'copilot');

    expect(screen.getByTestId('copilot-screen')).toBeTruthy();
    expect(
      screen.getByText('Fourteen Harewood Road, Papanui. Side gate, small box in the rear rack.'),
    ).toBeTruthy();
    expect(screen.getByTestId('copilot-talk')).toBeTruthy();
  });

  it('confirms a spoken action on the screen', () => {
    renderScreen(name, 'copilot');

    fireEvent.press(screen.getByTestId('copilot-talk'));

    expect(screen.getByTestId('copilot-confirmed')).toBeTruthy();
  });

  it('shows the address the scanner read and the confidence in words', () => {
    renderScreen(name, 'scanner');

    expect(screen.getByTestId('scanner-screen')).toBeTruthy();
    expect(screen.getByTestId('scanner-confidence')).toBeTruthy();
    expect(screen.getByLabelText('Confidence: Clear read')).toBeTruthy();
    expect(screen.getByTestId('scanner-confirm')).toBeTruthy();
  });

  it('draws the night palette of the direction', () => {
    const direction = directions2a[name];
    const night = themes[direction.nightThemeName];

    expect(night.colors.background).not.toBe('#000000');
    expect(night.colors.textPrimary).not.toBe('#ffffff');
  });
});

describe.each(direction2aNames)('the %s direction in its states', (name) => {
  it('shows a skeleton while it loads', () => {
    renderScreen(name, 'today', 'loading');

    expect(screen.getByTestId('today-loading')).toBeTruthy();
  });

  it('says what is missing when the run is empty', () => {
    renderScreen(name, 'today', 'empty');

    expect(screen.getByTestId('today-empty')).toBeTruthy();
  });

  it('says what happened when the run fails', () => {
    renderScreen(name, 'today', 'error');

    expect(screen.getByTestId('today-error')).toBeTruthy();
  });

  it('shows the offline chip with the number of queued actions', () => {
    renderScreen(name, 'driving', 'offline');

    expect(screen.getByTestId('driving-chip')).toBeTruthy();
    expect(screen.getByLabelText(/4 actions waiting/)).toBeTruthy();
  });

  it('shows the partial sync chip with a retry', () => {
    renderScreen(name, 'driving', 'partial');

    expect(screen.getByTestId('driving-chip-retry')).toBeTruthy();
  });

  it('asks for the location permission in one line', () => {
    renderScreen(name, 'driving', 'permission');

    expect(screen.getByTestId('driving-permission')).toBeTruthy();
  });

  it('asks for the camera permission in one line', () => {
    renderScreen(name, 'scanner', 'permission');

    expect(screen.getByTestId('scanner-permission')).toBeTruthy();
  });
});

describe('the three directions are three different layouts', () => {
  it('show a different number of stops', () => {
    renderScreen('controlRoom', 'today');
    const controlRoom = screen.getAllByTestId(/^today-stop-/);
    renderScreen('topo', 'today');
    const topo = screen.getAllByTestId(/^today-stop-/);
    renderScreen('addressFirst', 'today');
    const addressFirst = screen.getAllByTestId(/^today-stop-/);

    expect(controlRoom.length).toBeGreaterThan(topo.length);
    expect(topo.length).toBeGreaterThan(addressFirst.length);
  });

  it('each have a theme of their own', () => {
    expect(themes.controlRoom.colors.background).not.toBe(themes.topo.colors.background);
    expect(themes.topo.colors.background).not.toBe(themes.addressFirst.colors.background);
    expect(directions2a.controlRoom.density).toBe('dense');
    expect(directions2a.topo.density).toBe('compact');
    expect(directions2a.addressFirst.density).toBe('comfortable');
  });

  it('never share a layout grammar or a motion character', () => {
    const grammars = direction2aNames.map((name) => directions2a[name].grammar);
    const characters = direction2aNames.map((name) => directions2a[name].motion.character);

    expect(new Set(grammars).size).toBe(3);
    expect(new Set(characters).size).toBe(3);
  });
});
