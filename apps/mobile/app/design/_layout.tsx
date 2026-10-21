import React from 'react';
import { Stack } from 'expo-router';

/**
 * The design lab (MASTER_EXECUTION §13.4).
 *
 * The three directions of the founder's choice live here, one route each.
 * The chrome of the lab is part of the screen, so the founder always knows
 * which direction is on the phone.
 */
export default function DesignLayout() {
  return (
    <Stack id="design" screenOptions={{ headerShown: false, gestureEnabled: true }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="roadbook" />
      <Stack.Screen name="beacon" />
      <Stack.Screen name="freight" />
    </Stack>
  );
}
