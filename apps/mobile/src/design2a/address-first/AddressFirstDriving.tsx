/**
 * 03 Address First - **Driving**.
 *
 * The map drifts under the page. The address stays exactly where it is and
 * the world moves beneath it, so the driver never loses the line they are
 * reading - which is the map movement of this direction.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { directions2a } from '@courier/design-tokens/directions2a';
import { hapticFor } from '@/motion/haptics';
import { permissionCopy, run, type LabState } from '../content';
import { LabChip, LabStateMessage } from '../kit';
import { DirectionMap } from '../DirectionMap';
import { stepStyle } from '../typeStyle';

const direction = directions2a.addressFirst;

export function AddressFirstDriving({ state = 'ready' }: { state?: LabState }): React.JSX.Element {
  const { theme } = useTheme();
  // The palette of the scope decides whether the map is the day map or the
  // night map: the two switch together, never one without the other.
  const night = theme.name === direction.nightThemeName;

  if (state === 'permission') {
    return (
      <View testID="driving-screen" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <LabStateMessage
          direction={direction}
          title="Location is off"
          body={permissionCopy.location}
          action={permissionCopy.action}
          onAction={() => hapticFor('confirm')}
          testID="driving-permission"
        />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View testID="driving-screen" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <LabStateMessage
          direction={direction}
          title="The map did not load"
          body="The offline pack is not on the device. The address is still on the page."
          action="Try again"
          onAction={() => hapticFor('confirm')}
          testID="driving-error"
        />
      </View>
    );
  }

  return (
    <View
      testID="driving-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Driving, Address First direction"
    >
      <View style={styles.mapWrap}>
        <DirectionMap direction={direction} night={night} />
        {state === 'offline' || state === 'partial' ? (
          <View style={styles.chipHolder}>
            <LabChip
              direction={direction}
              queued={run.queuedActions}
              partial={state === 'partial'}
              onRetry={() => hapticFor('confirm')}
              testID="driving-chip"
            />
          </View>
        ) : null}
      </View>

      <View style={[styles.page, { backgroundColor: theme.colors.surface }]}>
        <Text style={[stepStyle(direction, 'label'), { color: theme.colors.brandPrimary }]}>
          {`STOP ${run.nextStop.sequence}`}
        </Text>
        <Text
          style={[stepStyle(direction, 'address'), { color: theme.colors.textPrimary }]}
          accessibilityRole="heading"
          accessibilityLabel={`Next stop, ${run.nextStop.address}, ${run.nextStop.suburb}`}
        >
          {run.nextStop.address}
        </Text>
        <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textSecondary }]}>
          {`${run.nextStop.suburb} · ${run.nextStop.km.toFixed(1)} km · ${run.nextStop.eta}`}
        </Text>
        <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
          {`${run.nextStop.note} · ${run.nextStop.rack}`}
        </Text>

        <View style={styles.actions}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => hapticFor('confirm')}
            style={{ borderRadius: direction.radii.control }}
            accessibilityHint="Confirms the delivery at this stop"
            testID="driving-next-stop"
          >
            Delivered
          </Button>
        </View>

        <View
          style={[styles.voice, { borderTopColor: theme.colors.border }]}
          accessibilityRole="text"
          accessibilityLabel="Copilot is listening"
          testID="voice-bar"
        >
          <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textSecondary }]}>
            Copilot is listening
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  mapWrap: { flex: 1, minHeight: 300 },
  chipHolder: { position: 'absolute', top: 12, left: 16 },
  page: { paddingHorizontal: 24, paddingTop: 16 },
  actions: { marginTop: 16, marginBottom: 12 },
  voice: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    borderTopWidth: 1,
  },
});
