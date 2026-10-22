/**
 * Direction 06 - **Scanline**. Driving.
 *
 * The map is printed like a chart: the plan stays flat, the roads are
 * hairlines and the address arrives as a band at the bottom of the screen,
 * the way a page of a run sheet is read from the foot up.
 *
 * The camera never tilts while the driver is reading the address: the plan
 * is north-up in the stop list and heading-up while the van moves, and it
 * changes only on the turn (REVIEW-F2).
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Camera, Map } from '@maplibre/maplibre-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { labDirections } from '@courier/design-tokens/lab-directions';
import { hapticFor } from '@/motion/haptics';
import { getConfiguredGlyphsUrl, getConfiguredTileUrl } from '@/maps/config';
import { getCourierStyle } from '@/maps/styles';
import { LabMessage, LabOfflineChip } from '../LabStates';
import { Band } from './Band';
import { typeStyle, type LabScreenState } from '../labTheme';
import {
  distanceToNextStop,
  doorAnswer,
  emptyMessage,
  offlineChip,
  run,
  voiceConditionWords,
} from '../labContent';

const direction = labDirections.scanline;

export function ScanlineDriving({
  state = 'ready',
}: {
  state?: LabScreenState;
}): React.JSX.Element {
  const { theme } = useTheme();
  const rule = theme.colors.border;

  const style = useMemo(
    () =>
      getCourierStyle(
        direction.themeName,
        getConfiguredTileUrl(),
        getConfiguredGlyphsUrl(),
        { buildings: true, buildings3d: false },
      ),
    [],
  );

  if (state === 'permissionDenied') {
    return (
      <View
        testID="driving-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Driving, Scanline direction"
      >
        <LabMessage
          direction={direction}
          title="Location is off"
          message="Turn on location for Courier Copilot in the system settings to follow the route."
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
        accessibilityLabel="Driving, Scanline direction"
      >
        <LabMessage
          direction={direction}
          title="The map did not load"
          message="The map tiles are missing on this device. The stop is still here."
          action="Try again"
          onAction={() => hapticFor('confirm')}
          testID="driving-error"
        />
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View
        testID="driving-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Driving, Scanline direction"
      >
        <LabMessage direction={direction} title="No route" message={emptyMessage} testID="driving-empty" />
      </View>
    );
  }

  const offline = state === 'offline' || state === 'partialSync';

  return (
    <View
      testID="driving-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Driving, Scanline direction"
    >
      <View style={styles.map}>
        <Map testID="courier-map" mapStyle={style} style={styles.mapSurface}>
          <Camera
            initialViewState={{ center: [172.636, -43.533], zoom: 16 }}
            minZoom={4}
            maxZoom={19}
            pitch={0}
            bearing={0}
          />
        </Map>
      </View>

      <View style={[styles.plate, { backgroundColor: theme.colors.surface, borderTopColor: rule }]}>
        {offline ? (
          <View style={styles.chipRow}>
            <LabOfflineChip
              direction={direction}
              label={state === 'offline' ? offlineChip.label : offlineChip.partialSyncLabel}
              queued={state === 'offline' ? offlineChip.queued : 2}
              onRetry={state === 'partialSync' ? () => hapticFor('confirm') : undefined}
            />
          </View>
        ) : null}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.plateBody}>
          <Band label="NEXT STOP" value={run.nextStop.address} rule={theme.colors.brandPrimary}>
            <Text
              style={[typeStyle(direction.type.address), { color: theme.colors.textPrimary }]}
              accessibilityRole="heading"
              accessibilityLabel={`Next stop, ${run.nextStop.address}, ${run.nextStop.suburb}`}
            >
              {run.nextStop.address}
            </Text>
          </Band>
          <Band
            label="DISTANCE"
            value={`${distanceToNextStop} km`}
            rule={rule}
          />
          <Band label="ARRIVAL" value={run.nextStop.eta} rule={rule} />
          <Band label="DOOR" value={doorAnswer} rule={rule} />
        </ScrollView>

        <View style={styles.actions}>
          <View
            style={[styles.primary, { backgroundColor: theme.colors.brandPrimary }]}
            accessibilityRole="button"
            accessibilityLabel="Next stop"
            accessibilityHint="Opens the next stop"
            testID="driving-next-stop"
          >
            <Text style={[typeStyle(direction.type.address), { color: theme.colors.textInverse }]}>
              Next stop
            </Text>
          </View>
          <Text
            style={[styles.voice, typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}
            accessibilityRole="text"
            accessibilityLabel={`Copilot is ${voiceConditionWords.listening.toLowerCase()}`}
            testID="voice-bar"
          >
            {`> ${voiceConditionWords.listening.toUpperCase()}`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  map: { flex: 1 },
  mapSurface: { flex: 1 },
  plate: { borderTopWidth: 1, paddingTop: 8 },
  plateBody: { paddingBottom: 4 },
  chipRow: { paddingHorizontal: 16, paddingBottom: 8 },
  actions: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 8 },
  primary: { minHeight: 72, alignItems: 'center', justifyContent: 'center' },
  voice: { textAlign: 'left' },
});
