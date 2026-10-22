/**
 * 02 Topo - **Driving**.
 *
 * The chart is the page and the panel is its margin. The map of this
 * direction tilts to the land - 58 degrees, so the contours separate - and
 * it comes back north-up in one move, because a survey chart is read with
 * north at the top.
 *
 * The address sits in the margin under the chart, with the coordinates of
 * the door, so the driver reads the line and the position together.
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

const direction = directions2a.topo;

export function TopoDriving({ state = 'ready' }: { state?: LabState }): React.JSX.Element {
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
          title="The chart did not load"
          body="The offline pack is not on the device. The stop is still in the margin."
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
      accessibilityLabel="Driving, Topo direction"
    >
      <View style={styles.mapWrap}>
        <DirectionMap direction={direction} night={night} />
        <View style={styles.scale} accessibilityElementsHidden>
          <View style={[styles.scaleBar, { backgroundColor: theme.colors.textPrimary }]} />
          <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textPrimary }]}>
            200 m
          </Text>
        </View>
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

      <View style={[styles.margin, { borderTopColor: theme.colors.border }]}>
        <View style={styles.marginGrid}>
          <View style={styles.marginCell}>
            <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
              DISTANCE
            </Text>
            <Text
              style={[
                stepStyle(direction, 'row'),
                styles.tabular,
                { color: theme.colors.textPrimary },
              ]}
            >
              {`${run.nextStop.km.toFixed(1)} km`}
            </Text>
          </View>
          <View style={styles.marginCell}>
            <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
              ARRIVAL
            </Text>
            <Text
              style={[
                stepStyle(direction, 'row'),
                styles.tabular,
                { color: theme.colors.textPrimary },
              ]}
            >
              {run.nextStop.eta}
            </Text>
          </View>
          <View style={styles.marginCell}>
            <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
              BEARING
            </Text>
            <Text
              style={[
                stepStyle(direction, 'row'),
                styles.tabular,
                { color: theme.colors.textPrimary },
              ]}
            >
              024°
            </Text>
          </View>
        </View>

        <Text
          style={[stepStyle(direction, 'address'), { color: theme.colors.textPrimary }]}
          accessibilityRole="heading"
          accessibilityLabel={`Next stop, ${run.nextStop.address}, ${run.nextStop.suburb}`}
        >
          {run.nextStop.address}
        </Text>
        <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textSecondary }]}>
          {`${run.nextStop.suburb} · ${run.nextStop.parcels} parcels`}
        </Text>
        <Text
          style={[
            stepStyle(direction, 'caption'),
            styles.tabular,
            { color: theme.colors.textTertiary },
          ]}
        >
          {`43.5180 S · 172.6250 E · ${run.nextStop.note}`}
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
            LISTENING
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  mapWrap: { flex: 1, minHeight: 300 },
  scale: { position: 'absolute', left: 20, bottom: 12, alignItems: 'flex-start', gap: 2 },
  scaleBar: { width: 60, height: 2 },
  chipHolder: { position: 'absolute', top: 12, right: 12 },
  margin: { paddingHorizontal: 20, paddingTop: 12 },
  marginGrid: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  marginCell: { gap: 2 },
  tabular: { fontVariant: ['tabular-nums'] },
  actions: { marginTop: 16, marginBottom: 12 },
  voice: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    borderTopWidth: 1,
  },
});
