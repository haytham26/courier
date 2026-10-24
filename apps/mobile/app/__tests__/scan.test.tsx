/**
 * The scanner (T6 slice 3, screen 06).
 *
 * The screen is the camera, the reading and the van: the camera opens when
 * the permission is granted, a label that was read puts the match sheet up,
 * "Add and Scan Next" puts the parcel in the van and keeps the scanner open,
 * and the permission is asked for while the system still allows it.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { PermissionStatus } from 'react-native-vision-camera';

import ScanRoute from '../scan';
import { ChosenProvider } from '@/components/chosen';
import { ScanLoadProvider } from '@/scans/scanLoad';

/** The camera library is a native module: the test gets a stand-in. */
const mockRequestPermission = jest.fn();
const mockPermission: {
  status: PermissionStatus;
  hasPermission: boolean;
  canRequestPermission: boolean;
} = {
  status: 'authorized',
  hasPermission: true,
  canRequestPermission: false,
};

jest.mock('react-native-vision-camera', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Camera: (props: { testID?: string }) => ReactActual.createElement(RN.View, props, null),
    useCameraDevice: () => ({ id: 'back-camera', position: 'back' }),
    useCameraPermission: () => ({
      ...mockPermission,
      requestPermission: mockRequestPermission,
    }),
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), navigate: jest.fn() }),
}));

/** The reader: the E2E build reads the mock run's labels. */
jest.mock('@/scans/labelReader', () => ({
  ...jest.requireActual<typeof import('@/scans/labelReader')>('@/scans/labelReader'),
  readerForThisBuild: () => ({
    read: () =>
      Promise.resolve({
        kind: 'found' as const,
        match: { address: '45 Papanui Road', suburb: 'Merivale' },
      }),
  }),
}));

const renderScan = () =>
  render(
    <ChosenProvider mode="light">
      <ScanLoadProvider>
        <ScanRoute />
      </ScanLoadProvider>
    </ChosenProvider>,
  );

describe('the scanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermission.status = 'authorized';
    mockPermission.hasPermission = true;
    mockPermission.canRequestPermission = false;
  });

  it('opens the camera with the surface around it', () => {
    renderScan();

    expect(screen.getByTestId('scan-screen')).toBeTruthy();
    expect(screen.getByTestId('scan-camera')).toBeTruthy();
    expect(screen.getByTestId('scan-overlay')).toBeTruthy();
    expect(screen.getByTestId('scan-done')).toBeTruthy();
    expect(screen.getByTestId('scan-status')).toHaveTextContent('Point the camera at the label.');
  });

  it('reads the label and puts the match sheet up', async () => {
    renderScan();

    await waitFor(() => expect(screen.getByTestId('scan-match-sheet')).toBeTruthy());
    expect(screen.getByTestId('scan-match-address')).toHaveTextContent('45 Papanui Road');
    expect(screen.getByTestId('scan-status')).toHaveTextContent('Address found. Hold steady.');
  });

  it('puts the parcel in the van and keeps the scanner open for the next one', async () => {
    renderScan();

    await waitFor(() => expect(screen.getByTestId('scan-add')).toBeTruthy());
    fireEvent.press(screen.getByTestId('scan-add'));

    await waitFor(() => expect(screen.getByText('1 scanned')).toBeTruthy());
    expect(screen.getByTestId('scan-screen')).toBeTruthy();
  });

  it('asks for the camera permission while the system still allows it', () => {
    mockPermission.hasPermission = false;
    mockPermission.canRequestPermission = true;
    mockPermission.status = 'not-determined';

    renderScan();

    expect(mockRequestPermission).toHaveBeenCalled();
  });
});
