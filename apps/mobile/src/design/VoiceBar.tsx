/**
 * The voice bar.
 *
 * The contract (`docs/design/SYSTEM.md` §3): a 64 dp bar at the bottom that
 * always shows the state of the voice engine - idle, listening, thinking,
 * speaking, offline, muted or error - with its own earcon and haptic.
 *
 * The state is never colour-only: the bar carries the word as well as the
 * dot, and the dot is decorative for the screen reader.
 *
 * Each direction dresses the bar in its own language: Roadbook sets it as a
 * ruled strip under the ledger, Beacon as a quiet pill, Freight as an ink
 * block with an orange square.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import type { Direction } from '@courier/design-tokens/directions';
import { typeStyle } from './typeStyle';

export type VoiceState = 'listening' | 'idle' | 'offline';

interface VoiceBarProps {
  direction: Direction;
  state: VoiceState;
  /** The actions that are waiting for the network. */
  queued: number;
}

const stateWords: Record<VoiceState, string> = {
  listening: 'Listening',
  idle: 'Ready',
  offline: 'Offline',
};

export function VoiceBar({ direction, state, queued }: VoiceBarProps): React.JSX.Element {
  const { theme } = useTheme();
  const word = stateWords[state];
  const dot = state === 'listening' ? theme.colors.brandPrimary : theme.colors.textTertiary;

  if (direction.name === 'freight') {
    return (
      <View
        style={[styles.freightBar, { backgroundColor: theme.colors.textPrimary }]}
        accessibilityRole="text"
        accessibilityLabel={`Courier Voice is ${word.toLowerCase()}, ${queued} actions waiting`}
        testID="voice-bar"
      >
        <View style={[styles.freightMark, { backgroundColor: theme.colors.brandPrimary }]} />
        <Text
          style={[
            styles.freightText,
            typeStyle(direction.type.caption),
            { color: theme.colors.textInverse },
          ]}
          numberOfLines={1}
        >
          {`COURIER VOICE · ${word.toUpperCase()}`}
        </Text>
        <Text
          style={[
            styles.freightQueue,
            typeStyle(direction.type.caption),
            { color: theme.colors.textInverse },
          ]}
        >
          {`${queued} WAITING`}
        </Text>
      </View>
    );
  }

  if (direction.name === 'beacon') {
    return (
      <View
        style={[
          styles.beaconBar,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: direction.radii.pill,
          },
        ]}
        accessibilityRole="text"
        accessibilityLabel={`Courier Voice is ${word.toLowerCase()}, ${queued} actions waiting`}
        testID="voice-bar"
      >
        <View style={[styles.beaconDot, { backgroundColor: dot }]} />
        <Text
          style={[
            styles.beaconText,
            typeStyle(direction.type.body),
            { color: theme.colors.textSecondary },
          ]}
        >
          {word}
        </Text>
        {queued > 0 ? (
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
            {`${queued} waiting`}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={[styles.roadbookBar, { borderTopColor: theme.colors.border }]}
      accessibilityRole="text"
      accessibilityLabel={`Courier Voice is ${word.toLowerCase()}, ${queued} actions waiting`}
      testID="voice-bar"
    >
      <View style={[styles.roadbookDot, { backgroundColor: dot }]} />
      <Text
        style={[
          styles.roadbookText,
          typeStyle(direction.type.caption),
          { color: theme.colors.textSecondary },
        ]}
      >
        {word}
      </Text>
      {queued > 0 ? (
        <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
          {`${queued} waiting`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  roadbookBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 64,
    borderTopWidth: 1,
  },
  roadbookDot: { width: 8, height: 8, borderRadius: 4 },
  roadbookText: { flex: 1 },
  beaconBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 64,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  beaconDot: { width: 10, height: 10, borderRadius: 5 },
  beaconText: { flex: 1 },
  freightBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 64,
    paddingHorizontal: 16,
  },
  freightMark: { width: 12, height: 12 },
  freightText: { flex: 1, color: '#ffffff' },
  freightQueue: {},
});
