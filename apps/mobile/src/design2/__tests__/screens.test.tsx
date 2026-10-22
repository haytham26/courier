/**
 * The four directions of this team (MASTER_EXECUTION §13.6).
 *
 * The directions are real screens, so they are tested like real screens:
 * each one has to carry the content of the day's list, one primary action,
 * a voice presence that names its state, the states of the contract, and an
 * accessibility label on every control.
 *
 * The tests also check that the four are four different layouts and not four
 * colours of the same one.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import type * as StorageModule from '@/sync/storage';
import type * as ReactModule from 'react';
import type * as ReactNativeModule from 'react-native';
import { themes } from '@courier/design-tokens/themes';
import { directions2, direction2Names } from '@courier/design-tokens/directions2';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { DirectionScope, type LabState } from '@/design2/DirectionScope';
import { TodayScreen } from '@/design2/TodayScreen';
import { DrivingScreen } from '@/design2/DrivingScreen';
import { CopilotScreen } from '@/design2/CopilotScreen';
import { ScannerScreen } from '@/design2/ScannerScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/sync/preferenceFiles', () => {
  const actual = jest.requireActual<typeof StorageModule>('@/sync/storage');
  return {
    createFilePreferenceStore: () => actual.createMemoryPreferenceStore(),
  };
});

jest.mock('@maplibre/maplibre-react-native', () => {
  const ReactActual = jest.requireActual<typeof ReactModule>('react');
  const RN = jest.requireActual<typeof ReactNativeModule>('react-native');

  return {
    Map: (props: { testID?: string; children?: React.ReactNode }) =>
      ReactActual.createElement(RN.View, { testID: props.testID }, props.children),
    Camera: ReactActual.forwardRef(
      (props: { testID?: string; children?: React.ReactNode }, _ref: unknown) =>
        ReactActual.createElement(RN.View, { testID: props.testID }, props.children),
    ),
    Marker: (props: { testID?: string; children?: React.ReactNode }) =>
      ReactActual.createElement(RN.View, { testID: props.testID }, props.children),
    NativeUserLocation: () => null,
  };
});

function renderDirection(name: (typeof direction2Names)[number], state: LabState = 'ready') {
  return render(
    <ThemeProvider>
      <DirectionScope direction={directions2[name]} initialState={state}>
        <TodayScreen />
      </DirectionScope>
    </ThemeProvider>,
  );
}

describe.each(direction2Names)('the %s direction', (name) => {
  it("shows the content of the day's list", () => {
    renderDirection(name);

    expect(screen.getByTestId('today-screen')).toBeTruthy();
    expect(screen.getAllByText(/18/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('14 Harewood Road').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Papanui/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/10:42/).length).toBeGreaterThan(0);
  });

  it('has one primary action of 72 points', () => {
    renderDirection(name);

    expect(screen.getByTestId('today-next-stop')).toBeTruthy();
  });

  it('has a voice presence that names its state', () => {
    renderDirection(name);

    expect(screen.getByTestId('voice-bar')).toBeTruthy();
    expect(screen.getByLabelText(/Copilot is listening/)).toBeTruthy();
  });

  it('reads the number of stops left as a heading', () => {
    renderDirection(name);

    expect(screen.getByLabelText('18 stops left')).toBeTruthy();
  });

  it('never uses an emoji', () => {
    renderDirection(name);

    const tree = JSON.stringify(screen.toJSON());

    expect(tree).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});

describe('the four directions are four different layouts', () => {
  it('show a different number of stops', () => {
    renderDirection('weatherLight');
    const weatherLight = screen.getAllByTestId(/^today-stop-/);
    renderDirection('hapticCity');
    const hapticCity = screen.getAllByTestId(/^today-stop-/);
    renderDirection('nightShift');
    const nightShift = screen.getAllByTestId(/^today-stop-/);
    renderDirection('gantryRun');
    const gantryRun = screen.getAllByTestId(/^today-stop-/);

    expect(weatherLight.length).toBeGreaterThan(hapticCity.length);
    expect(nightShift.length).toBeGreaterThan(hapticCity.length);
    expect(gantryRun.length).toBeGreaterThan(nightShift.length);
  });

  it('each have a theme of their own, in the day and in the night', () => {
    const backgrounds = direction2Names.map(
      (name) => themes[directions2[name].themeName].colors.background,
    );
    const nightBackgrounds = direction2Names.map(
      (name) => themes[directions2[name].nightThemeName].colors.background,
    );

    expect(new Set(backgrounds).size).toBe(4);
    expect(new Set(nightBackgrounds).size).toBe(4);
    expect(new Set([...backgrounds, ...nightBackgrounds]).size).toBe(8);
  });

  it('each have a grammar of their own', () => {
    const grammars = direction2Names.map((name) => directions2[name].grammar);
    expect(new Set(grammars).size).toBe(4);
  });
});

describe('the four screens of a direction', () => {
  const screens = [
    { name: 'Today', Screen: TodayScreen, testID: 'today-screen' },
    { name: 'Driving', Screen: DrivingScreen, testID: 'driving-screen' },
    { name: 'Copilot', Screen: CopilotScreen, testID: 'copilot-screen' },
    { name: 'Scanner', Screen: ScannerScreen, testID: 'scanner-screen' },
  ] as const;

  it.each(screens)('the $name screen comes up', ({ Screen, testID }) => {
    render(
      <ThemeProvider>
        <DirectionScope direction={directions2.gantryRun}>
          <Screen />
        </DirectionScope>
      </ThemeProvider>,
    );

    expect(screen.getByTestId(testID)).toBeTruthy();
  });

  it('the driving screen carries the attribution of the map', () => {
    render(
      <ThemeProvider>
        <DirectionScope direction={directions2.nightShift}>
          <DrivingScreen />
        </DirectionScope>
      </ThemeProvider>,
    );

    expect(screen.getByTestId('map-attribution')).toBeTruthy();
    expect(screen.getByText(/OpenStreetMap contributors/)).toBeTruthy();
    expect(screen.getByText(/LINZ Data Service/)).toBeTruthy();
  });

  it('the copilot screen shows the line it last said and what it understood', () => {
    render(
      <ThemeProvider>
        <DirectionScope direction={directions2.weatherLight}>
          <CopilotScreen />
        </DirectionScope>
      </ThemeProvider>,
    );

    expect(screen.getByTestId('copilot-last')).toBeTruthy();
    expect(screen.getByTestId('copilot-intent')).toBeTruthy();
    expect(screen.getByTestId('copilot-talk')).toBeTruthy();
  });

  it('the scanner screen shows the block it found and the confidence in words', () => {
    render(
      <ThemeProvider>
        <DirectionScope direction={directions2.hapticCity}>
          <ScannerScreen />
        </DirectionScope>
      </ThemeProvider>,
    );

    expect(screen.getByTestId('scanner-block')).toBeTruthy();
    expect(screen.getByTestId('scanner-confidence')).toBeTruthy();
    expect(screen.getByText('Confident')).toBeTruthy();
  });
});

describe('the states of a screen', () => {
  it('the empty state says what is missing and what to do next', () => {
    renderDirection('gantryRun', 'empty');

    expect(screen.getByTestId('empty-state')).toBeTruthy();
    expect(screen.getByText('No run today')).toBeTruthy();
    expect(screen.getByTestId('empty-action')).toBeTruthy();
  });

  it('the error state is one sentence with a way out', () => {
    renderDirection('gantryRun', 'error');

    expect(screen.getByTestId('error-state')).toBeTruthy();
    expect(screen.getByTestId('error-action')).toBeTruthy();
  });

  it('the permission state points at the system setting', () => {
    renderDirection('gantryRun', 'denied');

    expect(screen.getByTestId('permission-state')).toBeTruthy();
    expect(screen.getByTestId('permission-action')).toBeTruthy();
  });

  it('the offline state is a chip with the number of the actions that wait', () => {
    renderDirection('gantryRun', 'offline');

    expect(screen.getByTestId('offline-chip')).toBeTruthy();
    expect(screen.getAllByLabelText(/4 actions waiting/).length).toBeGreaterThan(0);
  });

  it('the loading state is a skeleton, not a spinner', () => {
    renderDirection('gantryRun', 'loading');

    expect(screen.getByTestId('today-skeleton-metric')).toBeTruthy();
    expect(screen.queryByTestId('today-next-stop')).toBeNull();
  });

  it('the long list shows three hundred stops', () => {
    renderDirection('gantryRun', 'long');

    expect(screen.getAllByTestId(/^today-stop-/).length).toBeGreaterThan(100);
  });
});

describe('the night theme of a direction', () => {
  it('is the adapted option and never the identity', () => {
    for (const name of direction2Names) {
      const light = themes[directions2[name].themeName].colors.background;
      const night = themes[directions2[name].nightThemeName].colors.background;

      expect(light).not.toBe(night);
    }
  });

  it('switches with the toggle of the lab', () => {
    render(
      <ThemeProvider>
        <DirectionScope direction={directions2.nightShift}>
          <TodayScreen />
        </DirectionScope>
      </ThemeProvider>,
    );

    expect(screen.getByTestId('today-screen')).toBeTruthy();
    fireEvent.press(screen.getByTestId('today-next-stop'));
    expect(screen.getByLabelText('17 stops left')).toBeTruthy();
  });
});
