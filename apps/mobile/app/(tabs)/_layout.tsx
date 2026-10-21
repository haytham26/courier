import React from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { useTheme } from '@/providers/ThemeProvider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';

/**
 * The four tabs of the app.
 *
 * One icon set for the whole app: Material Symbols through
 * `@expo/vector-icons` (`docs/design/SYSTEM.md` §7 - no emoji, ever).
 *
 * Every tab has an accessibility label and a testID, because the Maestro
 * flows find the tabs by their label.
 */
const tabs = {
  index: {
    title: 'Home',
    label: 'Home',
    focused: 'home',
    unfocused: 'home-outline',
  },
  map: {
    title: 'Map',
    label: 'Map',
    focused: 'map',
    unfocused: 'map-outline',
  },
  stops: {
    title: 'Stops',
    label: 'Stops',
    focused: 'view-list',
    unfocused: 'view-list-outline',
  },
  settings: {
    title: 'Settings',
    label: 'Settings',
    focused: 'cog',
    unfocused: 'cog-outline',
  },
} as const;

type TabName = keyof typeof tabs;

// The app is opened from the launcher without a deep link most of the time:
// the URL is then empty and the router needs to know which screen to open
// first, or the tabs have no child to render.
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function TabsLayout() {
  const { theme } = useTheme();

  const activeColor = String(theme.colors.brandPrimary);
  const inactiveColor = String(theme.colors.textSecondary);
  const surfaceColor = String(theme.colors.surface);
  const borderColor = String(theme.colors.border);

  return (
    <Tabs
      id="tabs"
      screenOptions={({ route }) => {
        const routeTab = tabs[route.name as TabName] ?? tabs.index;
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
            fontSize: 17,
            fontWeight: '600',
            marginTop: 2,
          },
          tabBarIcon: ({ focused, color, size }) => (
            <MaterialCommunityIcons
              name={focused ? routeTab.focused : routeTab.unfocused}
              size={size}
              color={color as string}
            />
          ),
          // The tab is a control: it needs a name and a role, and the Maestro
          // flows find it by the name.
          tabBarAccessibilityLabel: routeTab.label,
          tabBarButtonTestID: `tab-${route.name}`,
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
