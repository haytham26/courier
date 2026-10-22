/**
 * 01 Control Room - **Driving**.
 *
 * The map is the top of the screen and the panel is under it. The next
 * address sits on a solid plate above the map and the distance and the ETA
 * are on one line under it, so the driver reads the address, the distance
 * and the time in a single glance.
 *
 * The camera of this direction never turns while the driver is reading: it
 * steps from one stop to the next, with a follow pitch of 38 degrees so the
 * road is visible over the bonnet.
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

const direction = directions2a.controlRoom;

export function ControlRoomDriving({ state = 'ready' }: { state?: LabState }): React.JSX.Element {
  const { theme } = useTheme();
  // The palette of the scope decides whether the map is the day map or the
  // night map: the two switch together, never one without the other.
  const night = theme.name === direction.nightThemeName;

  if (state === 'permission') {
    return (
      <View
        testID="driving-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      >
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
      <View
        testID="driving-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      >
        <LabStateMessage
          direction={direction}
          title="The map did not load"
          body="The offline pack is not on the device. The stop is still on the panel."
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
      accessibilityLabel="Driving, Control Room direction"
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

      <View style={[styles.plate, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.plateHead}>
          <Text style={[stepStyle(direction, 'label'), { color: theme.colors.brandPrimary }]}>
            NEXT MOVE
          </Text>
          <Text
            style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}
          >
            {`STOP ${run.nextStop.sequence}`}
          </Text>
        </View>

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

        <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

        <View style={styles.readoutRow}>
          <View style={styles.readout}>
            <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textSecondary }]}>
              Door note
            </Text>
            <Text style={[stepStyle(direction, 'row'), { color: theme.colors.textPrimary }]}>
              {run.nextStop.note}
            </Text>
          </View>
          <View style={styles.readout}>
            <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textSecondary }]}>
              In the van
            </Text>
            <Text style={[stepStyle(direction, 'row'), { color: theme.colors.textPrimary }]}>
              {run.nextStop.rack}
            </Text>
          </View>
        </View>

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
          <View style={[styles.lamp, { backgroundColor: theme.colors.brandPrimary }]} />
          <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textSecondary }]}>
            Listening
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  mapWrap: { flex: 1, minHeight: 280 },
  chipHolder: { position: 'absolute', top: 12, left: 12 },
  plate: { paddingHorizontal: 16, paddingTop: 12 },
  plateHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rule: { height: 1, marginVertical: 12 },
  readoutRow: { flexDirection: 'row', gap: 16 },
  readout: { flex: 1, gap: 2 },
  actions: { marginTop: 16, marginBottom: 12 },
  voice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 64,
    borderTopWidth: 1,
  },
  lamp: { width: 8, height: 8 },
});
