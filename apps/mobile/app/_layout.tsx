import React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Providers } from '@/providers/Providers';
import { useAuth } from '@/providers/AuthProvider';
import '@/unistyles';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Providers>
        <AuthNavigator />
      </Providers>
    </GestureHandlerRootView>
  );
}

function AuthNavigator() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return null; // Or show a loading screen
  }

  return (
    <Stack
      id="root"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      {/* The guarded screens keep every other route of the app registered
          (the compatibility screen, for one): a deep link to a route that the
          stack does not know is ignored by the router. */}
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}