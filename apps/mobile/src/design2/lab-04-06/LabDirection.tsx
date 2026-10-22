/**
 * The frame of a direction in the lab.
 *
 * Every direction of the round has the same four screens in the same order,
 * so the frame is one component: the chrome that says which direction is on
 * the phone, the two switches of the lab (the palette and the state of the
 * screen) and the four tabs.
 *
 * The chrome keeps the app's own theme, so it can never pass for part of
 * the product; the four screens below it wear the palette of the direction.
 */
import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, useLocalSearchParams, useRouter } from 'expo-router';
import { ThemeScope } from '@/providers/ThemeProvider';
import type { LabDirection as LabDirectionType } from '@courier/design-tokens/lab-directions';
import { LabChrome, LabSwitches } from './LabChrome';
import { LabScope, labStateFrom, themeFor, type LabScreenState, type LabVariant } from './labTheme';

export function LabDirection({
  direction,
}: {
  direction: LabDirectionType;
}): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ theme?: string; state?: string }>();

  const [variant, setVariantState] = useState<LabVariant>(
    params.theme === 'night' ? 'night' : 'day',
  );
  const [state, setStateState] = useState<LabScreenState>(labStateFrom(params.state));

  const setVariant = useCallback(
    (next: LabVariant) => {
      setVariantState(next);
      router.setParams({ theme: next });
    },
    [router],
  );

  const setState = useCallback(
    (next: LabScreenState) => {
      setStateState(next);
      router.setParams({ state: next });
    },
    [router],
  );

  const theme = themeFor(direction, variant);

  return (
    <View style={styles.frame}>
      <LabChrome
        direction={direction}
        variant={variant}
        state={state}
        onVariant={setVariant}
        onState={setState}
        onBack={() => router.back()}
      />
      <LabSwitches
        variant={variant}
        state={state}
        onVariant={setVariant}
        onState={setState}
      />
      <LabScope variant={variant} state={state} setVariant={setVariant} setState={setState}>
        <ThemeScope theme={theme}>
          <Tabs
            id={`lab-${direction.name}`}
            screenOptions={{ headerShown: false, tabBarLabelStyle: styles.tabLabel }}
          >
            <Tabs.Screen name="today" options={{ title: 'Today' }} />
            <Tabs.Screen name="driving" options={{ title: 'Driving' }} />
            <Tabs.Screen name="copilot" options={{ title: 'Copilot' }} />
            <Tabs.Screen name="scanner" options={{ title: 'Scanner' }} />
          </Tabs>
        </ThemeScope>
      </LabScope>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  tabLabel: { fontSize: 17 },
});
