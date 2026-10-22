/**
 * Direction 05 - **X-ray Parcel**. Driving.
 *
 * The map is a place, not a picture: the buildings stand up in the kelp
 * green of the palette, the camera pulls back to 55 degrees so the road
 * runs between the blocks, and the rack of the van is drawn under the
 * address so the courier can see which parcel is in their hand.
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
import { LabMessage, LabOfflineChip } from '../LabStates';
import { typeStyle, type LabScreenState } from '../labTheme';
import {
  distanceToNextStop,
  doorAnswer,
  emptyMessage,
  offlineChip,
  parcelInVan,
  run,
  voiceConditionWords,
} from '../labContent';

const direction = labDirections.xrayParcel;

/** The pitch of the camera: the buildings stand beside the road. */
export const XRAY_PITCH = 55;

export function XrayParcelDriving({
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
        { buildings: true, buildings3d: true },
      ),
    [],
  );

  if (state === 'permissionDenied') {
    return (
      <View
        testID="driving-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Driving, X-ray Parcel direction"
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
        accessibilityLabel="Driving, X-ray Parcel direction"
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
        accessibilityLabel="Driving, X-ray Parcel direction"
      >
        <LabMessage
          direction={direction}
          title="No route"
          message={emptyMessage}
          testID="driving-empty"
        />
      </View>
    );
  }

  const offline = state === 'offline' || state === 'partialSync';

  return (
    <View
      testID="driving-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Driving, X-ray Parcel direction"
    >
      <View style={styles.map}>
        <Map testID="courier-map" mapStyle={style} style={styles.mapSurface}>
          <Camera
            initialViewState={{ center: [172.636, -43.533], zoom: 15 }}
            minZoom={4}
            maxZoom={19}
            pitch={XRAY_PITCH}
            bearing={0}
          />
        </Map>
      </View>

      <View
        style={[
          styles.plate,
          { backgroundColor: theme.colors.surface, borderTopColor: rule },
        ]}
      >
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

        <View style={[styles.rack, { borderTopColor: rule }]}>
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
            {parcelInVan}
          </Text>
          <View style={styles.rackRow}>
            {Array.from({ length: run.nextStop.parcels }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.rackBox,
                  {
                    backgroundColor:
                      index === 0 ? theme.colors.brandPrimary : theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ]}
                accessibilityElementsHidden
              />
            ))}
          </View>
        </View>

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
          <Text
            style={[styles.voice, typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}
            accessibilityRole="text"
            accessibilityLabel={`Copilot is ${voiceConditionWords.listening.toLowerCase()}`}
            testID="voice-bar"
          >
            {`Copilot · ${voiceConditionWords.listening}`}
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
  plate: { borderTopWidth: 1, paddingTop: 12 },
  plateBody: { paddingHorizontal: 16, paddingBottom: 4, gap: 2 },
  chipRow: { paddingHorizontal: 16, paddingBottom: 8 },
  rack: { borderTopWidth: 1, marginTop: 8, paddingHorizontal: 16, paddingTop: 8, gap: 6 },
  rackRow: { flexDirection: 'row', gap: 6 },
  rackBox: { width: 28, height: 20, borderWidth: 1, borderRadius: 2 },
  actions: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 8 },
  voice: { textAlign: 'center' },
});
