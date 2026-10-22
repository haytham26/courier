/**
 * Direction C - Freight - as a route of the app.
 */
import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { themes } from '@courier/design-tokens/themes';
import { ThemeScope } from '@/providers/ThemeProvider';
import { DirectionChrome } from '@/design/DirectionChrome';
import { FreightToday } from '@/design/FreightToday';

export default function FreightRoute() {
  const router = useRouter();

  return (
    <View style={{ flex: 1 }}>
      <DirectionChrome
        letter="C"
        name="Freight"
        density="expressive and branded"
        onBack={() => router.back()}
      />
      <ThemeScope theme={themes.freight}>
        <FreightToday />
      </ThemeScope>
    </View>
  );
}
