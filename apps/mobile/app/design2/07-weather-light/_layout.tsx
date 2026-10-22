/**
 * The route of the 07-weather-light direction of the Design Studio
 * (MASTER_EXECUTION §13.6).
 *
 * The route carries the palette of the direction, the day or the night, and
 * the state the screen is showing. The chrome of the lab sits above the four
 * screens of the direction, so the founder always knows which one is open.
 */
import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { directions2 } from '@courier/design-tokens/directions2';
import { DirectionScope } from '@/design2/DirectionScope';
import { LabChrome } from '@/design2/LabChrome';

export default function WeatherLightLayout() {
  return (
    <DirectionScope direction={directions2.weatherLight}>
      <View style={{ flex: 1 }}>
        <LabChrome />
        <Stack
          id="07-weather-light"
          screenOptions={{ headerShown: false, gestureEnabled: true }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="today" />
          <Stack.Screen name="driving" />
          <Stack.Screen name="copilot" />
          <Stack.Screen name="scanner" />
        </Stack>
      </View>
    </DirectionScope>
  );
}
