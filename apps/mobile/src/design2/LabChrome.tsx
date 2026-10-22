/**
 * The chrome of the design lab of the second round.
 *
 * The lab is a harness, not a product screen: the chrome says which
 * direction is on the phone, which of the four screens is open, whether the
 * screen is in the day or in the night, and which of the seven states of the
 * contract is being shown.
 *
 * The chrome keeps the app's own palette, so it never passes for part of a
 * direction.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { themes } from '@courier/design-tokens/themes';
import {
  labScreens,
  labScreenWords,
  labStateNames,
  labStateWords,
  useDirection,
} from './DirectionScope';

export function LabChrome(): React.JSX.Element {
  const theme = themes.day;
  const { direction, mode, setMode, state, setState } = useDirection();
  const router = useRouter();
  const [statesOpen, setStatesOpen] = useState(false);

  const base = `/design2/${direction.folder}`;

  return (
    <View
      style={[styles.bar, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}
      testID="design2-chrome"
    >
      <View style={styles.row}>
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Back to the directions"
          accessibilityHint="Opens the list of the directions"
          testID="design2-back"
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={theme.colors.textPrimary} />
        </Pressable>

        <Text
          style={[styles.name, { color: theme.colors.textPrimary }]}
          accessibilityLabel={`Direction ${direction.number}, ${direction.displayName}, ${mode} theme`}
          numberOfLines={1}
        >
          {`${direction.number} · ${direction.displayName}`}
        </Text>

        <Pressable
          onPress={() => setStatesOpen((open) => !open)}
          style={styles.chip}
          accessibilityRole="button"
          accessibilityLabel={`States, ${labStateWords[state]}`}
          accessibilityState={{ expanded: statesOpen }}
          testID="design2-states"
        >
          <Text style={[styles.chipText, { color: theme.colors.textSecondary }]}>
            {labStateWords[state]}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setMode(mode === 'light' ? 'night' : 'light')}
          style={styles.chip}
          accessibilityRole="button"
          accessibilityLabel={mode === 'light' ? 'Show the night theme' : 'Show the day theme'}
          accessibilityState={{ selected: mode === 'night' }}
          testID="design2-mode"
        >
          <Text style={[styles.chipText, { color: theme.colors.textSecondary }]}>
            {mode === 'light' ? 'Day' : 'Night'}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.links, { borderTopColor: theme.colors.border }]}>
        {labScreens.map((screen) => (
          <Pressable
            key={screen}
            onPress={() => router.push(`${base}/${screen}`)}
            style={styles.link}
            accessibilityRole="button"
            accessibilityLabel={labScreenWords[screen]}
            testID={`design2-link-${screen}`}
          >
            <Text style={[styles.linkText, { color: theme.colors.textSecondary }]}>
              {labScreenWords[screen]}
            </Text>
          </Pressable>
        ))}
      </View>

      {statesOpen ? (
        <View
          style={[
            styles.states,
            { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
          ]}
          testID="design2-state-panel"
        >
          {labStateNames.map((name) => (
            <Pressable
              key={name}
              onPress={() => {
                setState(name);
                setStatesOpen(false);
              }}
              style={[
                styles.stateChip,
                {
                  borderColor: state === name ? theme.colors.brandPrimary : theme.colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={labStateWords[name]}
              accessibilityState={{ selected: state === name }}
              testID={`design2-state-${name}`}
            >
              <Text style={[styles.chipText, { color: theme.colors.textPrimary }]}>
                {labStateWords[name]}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 56,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontSize: 17, fontWeight: '600' },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  chipText: { fontSize: 17 },
  links: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingHorizontal: 8,
  },
  link: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: 17, fontWeight: '500' },
  states: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
  },
  stateChip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
});
