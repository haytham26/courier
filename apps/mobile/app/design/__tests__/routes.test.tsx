/**
 * The routes of the design lab.
 *
 * The three directions are routes of the app, not a story about them: the
 * test renders each route the way the router does and checks that the screen
 * of the direction comes up in the palette of the direction.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type * as StorageModule from '@/sync/storage';
import { ThemeProvider } from '@/providers/ThemeProvider';
import DesignIndex from '../index';
import RoadbookRoute from '../roadbook';
import BeaconRoute from '../beacon';
import FreightRoute from '../freight';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@/sync/preferenceFiles', () => {
  const actual = jest.requireActual<typeof StorageModule>('@/sync/storage');
  return {
    createFilePreferenceStore: () => actual.createMemoryPreferenceStore(),
  };
});

function renderRoute(element: React.JSX.Element) {
  return render(<ThemeProvider>{element}</ThemeProvider>);
}

describe('the design lab routes', () => {
  it('the picker names the three directions and links to them', () => {
    renderRoute(<DesignIndex />);

    expect(screen.getByTestId('design-index')).toBeTruthy();
    expect(screen.getByTestId('design-roadbook')).toBeTruthy();
    expect(screen.getByTestId('design-beacon')).toBeTruthy();
    expect(screen.getByTestId('design-freight')).toBeTruthy();
  });

  it('the picker opens a direction', () => {
    renderRoute(<DesignIndex />);

    fireEvent.press(screen.getByTestId('design-freight'));

    expect(mockRouter.push).toHaveBeenCalledWith('/design/freight');
  });

  it.each([
    ['A', RoadbookRoute, 'Roadbook'],
    ['B', BeaconRoute, 'Beacon'],
    ['C', FreightRoute, 'Freight'],
  ] as const)('direction %s opens its own screen', (_letter, Route, name) => {
    renderRoute(<Route />);

    expect(screen.getByTestId('today-screen')).toBeTruthy();
    expect(screen.getByLabelText(new RegExp(`Direction [ABC], ${name}`))).toBeTruthy();
  });

  it('the chrome goes back to the picker', () => {
    renderRoute(<RoadbookRoute />);

    fireEvent.press(screen.getByTestId('design-back'));

    expect(mockRouter.back).toHaveBeenCalled();
  });
});
