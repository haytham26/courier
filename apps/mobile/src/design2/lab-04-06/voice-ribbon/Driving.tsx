/**
 * Direction 04 - **Voice Ribbon**. Driving.
 *
 * The map is the surface and the ribbon is the bottom edge of it. The
 * address sits on a solid plate above the ribbon - never on a translucent
 * one, because a moving map under a translucent panel is unreadable in
 * daylight and unlawful at night (`docs/design/RESEARCH-2.md` §1.4).
 *
 * The camera is the direction's own: a 52 degree pitch in town, heading up
 * while the van is moving, and it never turns while the driver is reading
 * the address (REVIEW-F2).
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Camera, Map } from '@maplibre/maplibre-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { labDirections } from '@courier/design-tokens/lab-directions';
import { hapticFor } from '@/motion/haptics';
import { getConfiguredGlyphsUrl, getConfiguredTileUrl } from '@/maps/config';
import { getCourierStyle } from '@/maps/styles';
import { VoiceRibbon, useRibbonLevel } from '../VoiceRibbon';
import { LabMessage, LabOfflineChip } from '../LabStates';
import { typeStyle, type LabScreenState } from '../labTheme';
import {
  distanceToNextStop,
  doorAnswer,
  emptyMessage,
  offlineChip,
  run,
  voiceConditionWords,
} from '../labContent';

const direction = labDirections.voiceRibbon;

/** The pitch of the camera in the direction's own map treatment. */
export const RIBBON_PITCH = 52;

export function VoiceRibbonDriving({
  state = 'ready',
}: {
  state?: LabScreenState;
}): React.JSX.Element {
  const { theme } = useTheme();
  const level = useRibbonLevel();

  const style = useMemo(
    () =>
      getCourierStyle(
        direction.themeName,
        getConfiguredTileUrl(),
        getConfiguredGlyphsUrl(),
        { buildings: true, buildings3d: true },
      ),
    [],
  );

  if (state === 'permissionDenied') {
    return (
      <View
        testID="driving-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Driving, Voice Ribbon direction"
      >
        <LabMessage
          direction={direction}
          title="Location is off"
          message="Turn on location for Courier Copilot in the system settings to follow the route."
          testID="driving-permission"
        />
        <View style={styles.spacer} />
        <VoiceRibbon
          direction={direction}
          state={voiceConditionWords.idle}
          listening={false}
          queued={0}
          level={level}
        />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View
        testID="driving-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Driving, Voice Ribbon direction"
      >
        <LabMessage
          direction={direction}
          title="The map did not load"
          message="The map tiles are missing on this device. The stop is still here."
          action="Try again"
          onAction={() => hapticFor('confirm')}
          testID="driving-error"
        />
        <View style={styles.spacer} />
        <VoiceRibbon
          direction={direction}
          state={voiceConditionWords.error}
          listening={false}
          queued={0}
          level={level}
        />
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View
        testID="driving-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Driving, Voice Ribbon direction"
      >
        <LabMessage
          direction={direction}
          title="No route"
          message={emptyMessage}
          testID="driving-empty"
        />
        <View style={styles.spacer} />
        <VoiceRibbon
          direction={direction}
          state={voiceConditionWords.idle}
          listening={false}
          queued={0}
          level={level}
        />
      </View>
    );
  }

  const offline = state === 'offline' || state === 'partialSync';

  return (
    <View
      testID="driving-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Driving, Voice Ribbon direction"
    >
      <View style={styles.map}>
        <Map testID="courier-map" mapStyle={style} style={styles.mapSurface}>
          <Camera
            initialViewState={{ center: [172.636, -43.533], zoom: 15 }}
            minZoom={4}
            maxZoom={19}
            pitch={RIBBON_PITCH}
            bearing={0}
          />
        </Map>
      </View>

      <View
        style={[
          styles.plate,
          { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        ]}
      >
        {offline ? (
          <View style={styles.chipRow}>
            <LabOfflineChip
              direction={direction}
              label={
                state === 'offline' ? offlineChip.label : offlineChip.partialSyncLabel
              }
              queued={state === 'offline' ? offlineChip.queued : 2}
              onRetry={state === 'partialSync' ? () => hapticFor('confirm') : undefined}
            />
          </View>
        ) : null}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.plateBody}>
          <Text
            style={[typeStyle(direction.type.address), { color: theme.colors.textPrimary }]}
            accessibilityRole="heading"
            accessibilityLabel={`Next stop, ${run.nextStop.address}, ${run.nextStop.suburb}`}
          >
            {run.nextStop.address}
          </Text>
          <Text style={[typeStyle(direction.type.body), { color: theme.colors.textSecondary }]}>
            {`${run.nextStop.suburb} · ${distanceToNextStop} km · ${run.nextStop.eta}`}
          </Text>
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
            {doorAnswer}
          </Text>
        </ScrollView>

        <View style={styles.actions}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => hapticFor('confirm')}
            style={{ borderRadius: direction.radii.control }}
            accessibilityHint="Opens the next stop"
            testID="driving-next-stop"
          >
            Next stop
          </Button>
        </View>
      </View>

      <VoiceRibbon
        direction={direction}
        state={voiceConditionWords.listening}
        listening
        queued={run.queuedActions}
        level={level}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  spacer: { flex: 1 },
  map: { flex: 1 },
  mapSurface: { flex: 1 },
  plate: { borderTopWidth: 1, paddingTop: 12 },
  plateBody: { paddingHorizontal: 20, paddingBottom: 4, gap: 2 },
  chipRow: { paddingHorizontal: 20, paddingBottom: 8 },
  actions: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
});
