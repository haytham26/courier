import React from 'react';
import { Stack } from 'expo-router';

// The app is opened from the launcher without a deep link most of the time:
// the URL is then empty and the router needs to know which screen to open
// first, or the stack has no child to render.
export const unstable_settings = {
  initialRouteName: 'login',
};

export default function AuthLayout() {
  return (
    <Stack id="auth" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}