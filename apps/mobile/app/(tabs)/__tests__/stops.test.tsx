/**
 * The Route screen's contract (T6 slice 3, screen 08).
 *
 * The tab keeps the Maestro testIDs the flows assert - `stops-screen`,
 * `stop-<id>` for a row, `stop-detail-sheet` for the sheet a row opens - and it
 * reads the SHARED run, so a stop delivered on the drive is the same stop here.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import RouteTab from '../stops';
import { RunProvider } from '@/maps/runState';
import { mockStops } from '@/maps/stops';

jest.mock('@maplibre/maplibre-react-native', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  const view = (props: { testID?: string; children?: React.ReactNode }) =>
    ReactActual.createElement(RN.View, { testID: props.testID }, props.children);
  return { Map: view, Camera: () => null, Marker: view, NativeUserLocation: () => null };
});

jest.mock('@/maps/useMapBoot', () => ({ useMapBoot: () => ({ tileSource: { kind: 'none' }, glyphsUrl: null }) }));
jest.mock('@/maps/styles', () => ({ getCourierStyle: () => ({ name: 'courier-copilot-day' }) }));
jest.mock('@/maps/drive', () => ({ DRIVE_ORIGIN_LNGLAT: [172.6, -43.5], hourMinuteOf: () => '10:38' }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), navigate: jest.fn(), back: jest.fn() }) }));
jest.mock('@/motion/haptics', () => ({ hapticFor: jest.fn() }));

const renderTab = () =>
  render(
    <GestureHandlerRootView>
      <RunProvider>
        <RouteTab />
      </RunProvider>
    </GestureHandlerRootView>,
  );

describe('the Route screen (08)', () => {
  it('renders the map, the sheet and the route title', () => {
    const { getByTestId } = renderTab();

    expect(getByTestId('stops-screen')).toBeTruthy();
    expect(getByTestId('stops-map')).toBeTruthy();
    expect(getByTestId('stops-panel')).toBeTruthy();
    expect(screen.getByText('Route')).toBeTruthy();
  });

  it('shows the three states of a stop as one segmented control', () => {
    const { getByTestId } = renderTab();

    expect(getByTestId('stops-segment')).toBeTruthy();
    // 5 mock stops: 4 to go, 1 active, 1 delivered by the mock's own status.
    expect(screen.getByText(/To go/)).toBeTruthy();
    expect(screen.getByText(/Later/)).toBeTruthy();
    expect(screen.getByText(/Done/)).toBeTruthy();
  });

  it('a row is the stop, and it opens the sheet', () => {
    const { getByTestId } = renderTab();

    // The flow's contract: a row is `stop-<id>`.
    expect(getByTestId('stop-2')).toBeTruthy();
    expect(screen.getByText('45 Papanui Road')).toBeTruthy();

    fireEvent.press(getByTestId('stop-2'));

    expect(getByTestId('stop-detail-sheet')).toBeTruthy();
    expect(screen.getByText('Merivale')).toBeTruthy();
  });

  it('the Done segment counts only what the run actually holds', () => {
    const { getByTestId } = renderTab();

    fireEvent.press(getByTestId('stops-segment-done'));

    // The mock run's own delivered stop, and nothing invented beside it.
    expect(getByTestId('stop-1')).toBeTruthy();
    expect(screen.queryByTestId('stop-2')).toBeNull();
  });

  it('Optimise answers honestly instead of pretending it resequenced', () => {
    const { getByTestId } = renderTab();

    fireEvent.press(getByTestId('stops-optimise'));

    expect(getByTestId('stops-optimise-note')).toBeTruthy();
    expect(screen.getByText(/solver/)).toBeTruthy();
  });

  it('a segment with nothing in it says so', () => {
    const { getByTestId } = renderTab();

    fireEvent.press(getByTestId('stops-segment-later'));

    expect(getByTestId('stops-empty')).toBeTruthy();
  });

  it('the list is the shared run, not a private copy of it', () => {
    const { getByTestId } = renderTab();

    // Every to-go stop of the shared mock is a row here.
    for (const stop of mockStops.filter((entry) => entry.status !== 'delivered')) {
      expect(getByTestId(`stop-${stop.id}`)).toBeTruthy();
    }
  });
});
