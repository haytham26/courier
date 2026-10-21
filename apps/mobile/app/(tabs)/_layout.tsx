import React from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { useTheme } from '@/providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

const tabIcons: Record<string, { focused: string; unfocused: string }> = {
  index: { focused: 'home', unfocused: 'home-outline' },
  map: { focused: 'map', unfocused: 'map-outline' },
  stops: { focused: 'list', unfocused: 'list-outline' },
  settings: { focused: 'settings', unfocused: 'settings-outline' },
};

type IoniconsName = 'home' | 'home-outline' | 'map' | 'map-outline' | 'list' | 'list-outline' | 'settings' | 'settings-outline';

// The app is opened from the launcher without a deep link most of the time:
// the URL is then empty and the router needs to know which screen to open
// first, or the tabs have no child to render.
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function TabsLayout() {
  const { theme } = useTheme();

  const activeColor = String(theme.colors.brandPrimary);
  const inactiveColor = String(theme.colors.textTertiary);
  const surfaceColor = String(theme.colors.surface);
  const borderColor = String(theme.colors.border);

  return (
    <Tabs
      id="tabs"
      screenOptions={({ route }) => {
        const routeIcons = tabIcons[route.name] || tabIcons.index;
        return {
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: inactiveColor,
          tabBarStyle: {
            backgroundColor: surfaceColor,
            borderTopColor: borderColor,
            borderTopWidth: 1,
            height: 64,
            paddingBottom: Platform.OS === 'ios' ? 12 : 0,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
          },
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={(focused ? routeIcons.focused : routeIcons.unfocused) as IoniconsName}
              size={size}
              color={color as string}
            />
          ),
        };
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="map" options={{ title: 'Map' }} />
      <Tabs.Screen name="stops" options={{ title: 'Stops' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}