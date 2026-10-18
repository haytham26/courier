import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/providers/ThemeProvider';
import TabsLayout from '../(tabs)/_layout';

// Mock expo-router
jest.mock('expo-router/js-tabs', () => ({
  Tabs: ({ children, screenOptions }: any) => (
    <React.Fragment>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type && child.type.displayName === 'Screen') {
          return React.cloneElement(child, { screenOptions });
        }
        return child;
      })}
    </React.Fragment>
  ),
  Screen: ({ name, options }: any) => <View data-testid={`tab-${name}`}><Text>{options?.title || name}</Text></View>,
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color }: any) => <View data-testid={`icon-${name}`} style={{ width: size, height: size }} />,
}));

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

// Mock Platform
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Platform: { OS: 'ios' },
  View: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  StyleSheet: { create: (x: any) => x },
}));

import { View, Text, StyleSheet } from 'react-native';

describe('TabsLayout', () => {
  it('renders all 4 tabs', () => {
    render(
      <ThemeProvider>
        <TabsLayout />
      </ThemeProvider>
    );

    expect(screen.getByTestId('tab-index')).toBeTruthy();
    expect(screen.getByTestId('tab-map')).toBeTruthy();
    expect(screen.getByTestId('tab-stops')).toBeTruthy();
    expect(screen.getByTestId('tab-settings')).toBeTruthy();
  });

  it('renders correct tab titles', () => {
    render(
      <ThemeProvider>
        <TabsLayout />
      </ThemeProvider>
    );

    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Map')).toBeTruthy();
    expect(screen.getByText('Stops')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('uses correct icons for each tab', () => {
    render(
      <ThemeProvider>
        <TabsLayout />
      </ThemeProvider>
    );

    expect(screen.getByTestId('icon-home')).toBeTruthy();
    expect(screen.getByTestId('icon-map')).toBeTruthy();
    expect(screen.getByTestId('icon-list')).toBeTruthy();
    expect(screen.getByTestId('icon-settings')).toBeTruthy();
  });

  it('applies theme colors to tab bar', () => {
    render(
      <ThemeProvider>
        <TabsLayout />
      </ThemeProvider>
    );

    // The theme colors should be used in the component
    const themeProvider = require('@/providers/ThemeProvider');
    expect(themeProvider.useTheme).toHaveBeenCalled();
  });
});