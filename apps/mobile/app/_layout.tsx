import React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Providers } from '@/providers/Providers';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Providers>
        <Stack
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
      </Providers>
    </GestureHandlerRootView>
  );
}