/**
 * The layout of a direction of the lab.
 *
 * Every direction of the round is a folder with the same four screens, so
 * the layout is made once and each folder names its direction. The layout
 * holds the palette of the direction: the day palette by default, and the
 * adapted night palette when the driver switches to it, which is the same
 * switch the product makes at sunset (`docs/design/SPEC.md` §4).
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams, useSegments } from 'expo-router';
import { themes } from '@courier/design-tokens/themes';
import { directions2a, type Direction2aName } from '@courier/design-tokens/directions2a';
import { ThemeScope } from '@/providers/ThemeProvider';
import { DirectionTabs, type ScreenKey } from './DirectionTabs';

const SCREEN_KEYS: readonly ScreenKey[] = ['today', 'driving', 'copilot', 'scanner'];

/**
 * The layout of one direction.
 *
 * The function returns the component the folder exports: the router only
 * needs a component, and every direction has the same one in its own
 * palette.
 */
export function createDirectionLayout(name: Direction2aName): () => React.JSX.Element {
  function DirectionLayout(): React.JSX.Element {
    const direction = directions2a[name];
    const params = useLocalSearchParams<{ theme?: string }>();
    const segments = useSegments();
    const [night, setNight] = useState(params.theme === 'night');

    const last = segments[segments.length - 1] ?? 'today';
    const current: ScreenKey = SCREEN_KEYS.includes(last as ScreenKey)
      ? (last as ScreenKey)
      : 'today';

    const theme = night ? themes[direction.nightThemeName] : themes[direction.themeName];

    return (
      <ThemeScope theme={theme}>
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <Stack id={direction.folder} screenOptions={{ headerShown: false, gestureEnabled: true }} />
          <DirectionTabs
            direction={direction}
            folder={direction.folder}
            current={current}
            night={night}
            onToggleNight={() => setNight((value) => !value)}
          />
        </View>
      </ThemeScope>
    );
  }

  return DirectionLayout;
}
