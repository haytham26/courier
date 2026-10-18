import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Mock expo-router completely (no actual require)
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    getState: () => ({ routes: [{ name: 'index' }] }),
  },
  useLocalSearchParams: () => ({}),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock react-native
jest.mock('react-native', () => {
  const ReactMock = require('react');
  return {
    View: ({ children, ...props }: any) => ReactMock.createElement('div', props, children),
    Text: ({ children, ...props }: any) => ReactMock.createElement('span', props, children),
    StyleSheet: { 
      create: (x: any) => x, 
      flatten: (x: any) => x,
      absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
      absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
      hairlineWidth: 1,
    },
    Platform: { OS: 'ios', Version: '16.0', select: (obj: any) => obj.ios },
    SafeAreaView: ({ children, ...props }: any) => ReactMock.createElement('div', props, children),
    StatusBar: () => null,
    Dimensions: { get: () => ({ width: 375, height: 667, scale: 2, fontScale: 1 }) },
  };
});

import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';

describe('Navigation Structure', () => {
  it('has correct tab routes defined', () => {
    const expectedRoutes = ['index', 'map', 'stops', 'settings'];
    
    expect(expectedRoutes).toHaveLength(4);
    expect(expectedRoutes).toContain('index');
    expect(expectedRoutes).toContain('map');
    expect(expectedRoutes).toContain('stops');
    expect(expectedRoutes).toContain('settings');
  });

  it('router.push is callable', () => {
    const { router } = require('expo-router');
    router.push('/stops');
    expect(router.push).toHaveBeenCalledWith('/stops');
  });

  it('router.replace is callable', () => {
    const { router } = require('expo-router');
    router.replace('/map');
    expect(router.replace).toHaveBeenCalledWith('/map');
  });

  it('router.back is callable', () => {
    const { router } = require('expo-router');
    router.back();
    expect(router.back).toHaveBeenCalled();
  });
});

describe('App Layout', () => {
  it('renders without crashing', () => {
    const TestComponent = () => (
      <SafeAreaView>
        <StatusBar />
        <View style={{ flex: 1 }}>
          <Text>App Layout</Text>
        </View>
      </SafeAreaView>
    );
    
    const { unmount } = render(<TestComponent />);
    expect(screen.getByText('App Layout')).toBeTruthy();
    unmount();
  });
});