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
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      {/* The design lab is outside the guard: the founder has to be able to
          open the directions without signing in first. */}
      <Stack.Screen name="design" />
      <Stack.Screen name="design2" />
    </Stack>
  );
}