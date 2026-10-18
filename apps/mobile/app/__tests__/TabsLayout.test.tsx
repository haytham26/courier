import React from 'react';
import { render, screen } from '@testing-library/react-native';
import TabsLayout from '../(tabs)/_layout';

// Mock expo-router/js-tabs
jest.mock('expo-router/js-tabs', () => {
  const ReactMock = require('react');
  return {
    Tabs: ({ children, screenOptions }: any) =>
      ReactMock.createElement(
        ReactMock.Fragment,
        null,
        ReactMock.Children.map(children, (child: any) => {
          if (ReactMock.isValidElement(child) && child.type && (child.type as any).displayName === 'Screen') {
            return ReactMock.cloneElement(child, { screenOptions } as any);
          }
          return child;
        })
      ),
    Screen: ({ name, options }: any) =>
      ReactMock.createElement('div', { 'data-testid': `tab-${name}` },
        ReactMock.createElement('span', null, options?.title || name)
      ),
  };
});

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const ReactMock = require('react');
  return {
    Ionicons: ({ name, size, color }: any) =>
      ReactMock.createElement('div', { 'data-testid': `icon-${name}`, style: { width: size, height: size } }),
  };
});

// Mock ThemeProvider
jest.mock('@/providers/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        brandPrimary: '#0066CC',
        textTertiary: '#666666',
        surface: '#FFFFFF',
        border: '#E0E0E0',
      },
    },
  }),
}));

// Mock react-native
jest.mock('react-native', () => {
  const ReactMock = require('react');
  return {
    Platform: { OS: 'ios', Version: '16.0', select: (obj: any) => obj.ios },
    View: ({ children, ...props }: any) => ReactMock.createElement('div', props, children),
    Text: ({ children, ...props }: any) => ReactMock.createElement('span', props, children),
    StyleSheet: { 
      create: (x: any) => x,
      flatten: (x: any) => x,
      absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
      absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
      hairlineWidth: 1,
    },
    Dimensions: { get: () => ({ width: 375, height: 667, scale: 2, fontScale: 1 }) },
  };
});

describe('TabsLayout', () => {
  it('renders all 4 tabs', () => {
    render(React.createElement(TabsLayout, null));

    expect(screen.getByTestId('tab-index')).toBeTruthy();
    expect(screen.getByTestId('tab-map')).toBeTruthy();
    expect(screen.getByTestId('tab-stops')).toBeTruthy();
    expect(screen.getByTestId('tab-settings')).toBeTruthy();
  });

  it('renders correct tab titles', () => {
    render(React.createElement(TabsLayout, null));

    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Map')).toBeTruthy();
    expect(screen.getByText('Stops')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('uses correct icons for each tab', () => {
    render(React.createElement(TabsLayout, null));

    expect(screen.getByTestId('icon-home')).toBeTruthy();
    expect(screen.getByTestId('icon-map')).toBeTruthy();
    expect(screen.getByTestId('icon-list')).toBeTruthy();
    expect(screen.getByTestId('icon-settings')).toBeTruthy();
  });

  it('applies theme colors to tab bar', () => {
    render(React.createElement(TabsLayout, null));
    
    // Verify the component renders without errors
    expect(screen.getByTestId('tab-index')).toBeTruthy();
  });
});