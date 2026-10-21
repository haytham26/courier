/**
 * Direction A - Roadbook - as a route of the app.
 *
 * The route wraps the screen in the theme of the direction, so the shared
 * components (`Button`, `Badge`, the voice bar) paint themselves in the
 * palette of the direction.
 */
import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { themes } from '@courier/design-tokens/themes';
import { ThemeScope } from '@/providers/ThemeProvider';
import { DirectionChrome } from '@/design/DirectionChrome';
import { RoadbookToday } from '@/design/RoadbookToday';

export default function RoadbookRoute() {
  const router = useRouter();

  return (
    <View style={{ flex: 1 }}>
      <DirectionChrome
        letter="A"
        name="Roadbook"
        density="dense and operational"
        onBack={() => router.back()}
      />
      <ThemeScope theme={themes.roadbook}>
        <RoadbookToday />
      </ThemeScope>
    </View>
  );
}
