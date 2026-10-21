/**
 * Direction B - Beacon - as a route of the app.
 */
import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { themes } from '@courier/design-tokens/themes';
import { ThemeScope } from '@/providers/ThemeProvider';
import { DirectionChrome } from '@/design/DirectionChrome';
import { BeaconToday } from '@/design/BeaconToday';

export default function BeaconRoute() {
  const router = useRouter();

  return (
    <View style={{ flex: 1 }}>
      <DirectionChrome
        letter="B"
        name="Beacon"
        density="calm and glanceable"
        onBack={() => router.back()}
      />
      <ThemeScope theme={themes.beacon}>
        <BeaconToday />
      </ThemeScope>
    </View>
  );
}
