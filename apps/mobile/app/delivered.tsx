/**
 * The delivered confirm (05-delivered.html): the map keeps the scene and
 * the sheet at the bottom reads the delivery that just landed - the badge
 * pops, "Delivered" and the address with the minute of the delivery, and
 * the courier's two choices: Undo puts the stop back on the run, Next Stop
 * hands the drive the next one (the run's own next stop, the same contract
 * the drive reads).
 *
 * The reference's proof-photo card, the two note chips ("Side gate" /
 * "Safe place", "Voice note" / "0:06") and the Copilot reminder line are
 * RECORDED OMISSIONS until a source exists: the proof photo needs the Scan
 * camera wired to a store (P5, step 06), the chips and the reminder line
 * need a notes model on the stop (`src/doorMemory` is an empty placeholder
 * today). A mock with neither renders no invented picture and no invented
 * note - the numbers never invent themselves (MASTER_EXECUTION §13.2). The
 * delivery minute is a clock read at the mark (the event's own moment), so
 * what is here is true: the badge, the address, the minute, the two
 * choices.
 */
import React, { useCallback, useMemo } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, Map as MapView, Marker } from '@maplibre/maplibre-react-native';

import {
  ChosenProvider,
  DeliveredBadge,
  GlassSurface,
  StopPin,
  useChosen,
} from '@/components/chosen';
import { spacing, typography } from '@courier/design-tokens/chosen';
import { DRIVE_ORIGIN_LNGLAT, hourMinuteOf } from '@/maps/drive';
import { mockStops } from '@/maps/stops';
import { useRun } from '@/maps/runState';
import { useMapBoot } from '@/maps/useMapBoot';
import { getCourierStyle } from '@/maps/styles';
import { hapticFor } from '@/motion/haptics';
import { publishVoiceCommand } from '@/voice/commandChannel';

/** The height of the action row (the reference's 54; the floor is 48). */
const ROW_HEIGHT = 54;
/** The Undo's width (the reference's fixed 110 next to the flexing Next Stop). */
const UNDO_WIDTH = 110;
/** The grabber of the sheet (the same 36 x 5 handle the drive's panel has). */
const GRABBER_WIDTH = 36;
const GRABBER_HEIGHT = 5;
const GRABBER_RADIUS = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    left: spacing.space8,
    right: spacing.space8,
    bottom: spacing.space8,
    paddingTop: spacing.space8,
    paddingHorizontal: spacing.space16,
    paddingBottom: spacing.space24,
    gap: spacing.space16,
  },
  grabberRow: {
    alignItems: 'center',
  },
  grabber: {
    width: GRABBER_WIDTH,
    height: GRABBER_HEIGHT,
    borderRadius: GRABBER_RADIUS,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space16,
  },
  headerLeft: {
    flex: 1,
    gap: spacing.space4,
  },
  title: {
    fontSize: typography.confirmTitle.size,
    lineHeight: typography.confirmTitle.lineHeight,
    fontWeight: typography.confirmTitle.weight,
  },
  subtitle: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.weight,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.space12,
  },
  undo: {
    width: UNDO_WIDTH,
    height: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  next: {
    flex: 1,
    height: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: typography.button.size,
    lineHeight: typography.button.lineHeight,
    fontWeight: typography.button.weight,
  },
});

function DeliveredScreen() {
  const { t } = useChosen();
  const router = useRouter();
  const run = useRun();
  const { tileSource, glyphsUrl } = useMapBoot();

  // The stop of the confirm: the one the drive handed over ("?stop="), or
  // the run's last delivery when the screen opens without the handover.
  const params = useLocalSearchParams<{ stop?: string }>();
  const lastEvent = run.delivered[run.delivered.length - 1] ?? null;
  const targetId = params.stop ?? lastEvent?.stopId ?? null;
  const target = useMemo(
    () => mockStops.find((stop) => stop.id === targetId) ?? null,
    [targetId],
  );
  const event = run.delivered.find((entry) => entry.stopId === targetId) ?? null;

  const mapStyle = useMemo(
    () =>
      getCourierStyle('day', tileSource.kind === 'none' ? null : tileSource.url, glyphsUrl, {
        labelSize: 'normal',
        buildings: true,
        // The backdrop is the picture of the street, not the drive's
        // perspective: the buildings carry their outlines and stay flat.
        buildings3d: false,
        satellite: null,
      }),
    [tileSource, glyphsUrl],
  );

  const handleUndo = useCallback(() => {
    if (target === null || event === null) {
      // Nothing of this stop's delivery is on the run: the undo cannot
      // pretend to take something off it.
      return;
    }
    hapticFor('confirm');
    run.undoDelivered(target.id);
    router.back();
  }, [event, run, router, target]);

  const handleNext = useCallback(() => {
    hapticFor('confirm');
    // Next Stop pans the map's camera to the run's next stop (the command
    // the Today Go publishes); the drive, back on top of the stack, reads
    // the run state and moves on with the courier.
    publishVoiceCommand({ type: 'zoom_to_next_stop' });
    router.back();
  }, [router]);

  return (
    <SafeAreaView testID="delivered-screen" style={styles.container}>
      {/* The map keeps the scene: the run's markers stay drawn (the same
          ones the drive reads), and the delivered stop rides the success
          pin like every stop of the run. */}
      <MapView testID="delivered-map" mapStyle={mapStyle} style={styles.map}>
        <Camera
          initialViewState={{
            center: target
              ? [target.coordinates.lng, target.coordinates.lat]
              : DRIVE_ORIGIN_LNGLAT,
            zoom: 14,
          }}
          minZoom={4}
          maxZoom={19}
          bearing={0}
        />
        {mockStops.map((stop) => (
          <Marker
            key={stop.id}
            testID={`stop-marker-${stop.sequence}`}
            lngLat={[stop.coordinates.lng, stop.coordinates.lat]}
            anchor="bottom"
          >
            <View testID={`stop-pin-${stop.sequence}`}>
              <StopPin number={String(stop.sequence)} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* The confirm sheet. */}
      <GlassSurface kind="sheet" testID="delivered-panel" style={styles.panel}>
        <View style={styles.grabberRow}>
          <View style={[styles.grabber, { backgroundColor: t.colors.grabber }]} />
        </View>
        <View style={styles.headerRow}>
          <DeliveredBadge testID="delivered-badge" />
          <View style={styles.headerLeft}>
            <Text testID="delivered-title" style={[styles.title, { color: t.colors.label }]}>
              Delivered
            </Text>
            <Text
              testID="delivered-address"
              style={[styles.subtitle, { color: t.colors.secondaryLabel }]}
              numberOfLines={1}
            >
              {target
                ? `${target.address}, ${event ? hourMinuteOf(event.at) : '—'}`
                : 'no delivery to confirm'}
            </Text>
          </View>
        </View>
        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Puts the stop back on the run"
            accessibilityState={{ disabled: event === null }}
            disabled={event === null}
            onPress={handleUndo}
            testID="delivered-undo"
            style={({ pressed }) => [
              styles.undo,
              { backgroundColor: t.colors.fill, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text
              testID="delivered-undo-label"
              style={[
                styles.buttonLabel,
                { color: event === null ? t.colors.secondaryLabel : t.colors.label },
              ]}
            >
              Undo
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Back to the drive, the next stop of the run"
            accessibilityState={{ disabled: false }}
            onPress={handleNext}
            testID="delivered-next"
            style={({ pressed }) => [
              styles.next,
              { backgroundColor: t.colors.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text
              testID="delivered-next-label"
              style={[styles.buttonLabel, { color: t.colors.onAccent }]}
            >
              Next Stop
            </Text>
          </Pressable>
        </View>
      </GlassSurface>
    </SafeAreaView>
  );
}

/**
 * The screen carries its own provider like the other root routes (the
 * light and the dark resolve per screen), and the run comes from the root
 * layout's RunProvider above the stack.
 */
export default function DeliveredRoute() {
  return (
    <ChosenProvider>
      <DeliveredScreen />
    </ChosenProvider>
  );
}
