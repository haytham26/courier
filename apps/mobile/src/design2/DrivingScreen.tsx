/**
 * The Driving screen of the four directions.
 *
 * The brief is the same in the four (`docs/design/SPEC.md` §3.1): the route
 * to the next stop on a map in the style of the direction, the address
 * readable in one glance, the distance and the time on one line, one action
 * of 72 pt in the lower third, and the voice state in words.
 *
 * The map is the real one: MapLibre, the style built from the tokens of the
 * direction (`apps/mobile/src/maps/styles.ts`), the attribution of OpenStreetMap
 * and LINZ on the screen, and the camera of the direction.
 *
 * The camera of the four:
 *
 * - **Weather Light** leans with the light: 50 degrees in the clear morning.
 * - **Haptic City** never moves on its own; the voice moves it.
 * - **Night Shift** arrives: the camera settles onto the door of the stop.
 * - **Gantry Run** steps: it stays north-up and moves in 250 ms steps.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Camera, Map, Marker, type CameraRef, type MapRef } from '@maplibre/maplibre-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { typeStyle } from '@/design/typeStyle';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { ATTRIBUTION_LINES, getCourierStyle } from '@/maps/styles';
import { getConfiguredGlyphsUrl, getConfiguredTileUrl } from '@/maps/config';
import { subscribeToVoiceCommands } from '@/voice/commandChannel';
import { useDirection } from './DirectionScope';
import { run } from './content';
import { ErrorBlock, PermissionBlock, PrimaryAction, StateChip, VoicePresence, confirmDelivery } from './parts';

/** The centre of Christchurch, the middle of the region the pack covers. */
const MAP_CENTRE: [number, number] = [172.636, -43.533];

/** The zoom the camera goes to when it is sent to the next stop. */
const STOP_ZOOM = 17;

/** The door of the next stop, in the coordinates the app keeps for it. */
const NEXT_STOP: [number, number] = [172.6158, -43.5189];

export function DrivingScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const { direction, state, confirmed, confirm } = useDirection();
  const reducedMotion = useReducedMotion();
  const mapRef = useRef<MapRef | null>(null);
  const cameraRef = useRef<CameraRef | null>(null);
  const [arrived, setArrived] = useState(false);
  const [voicePitch, setVoicePitch] = useState<number | null>(null);

  const tileUrl = useMemo(() => getConfiguredTileUrl(), []);
  const glyphsUrl = useMemo(() => getConfiguredGlyphsUrl(), []);

  // The style is the style of the direction: the road colours, the label
  // colours and the building treatment all come from its tokens.
  const mapStyle = useMemo(
    () =>
      getCourierStyle(theme.name, tileUrl, glyphsUrl, {
        buildings: true,
        buildings3d: true,
      }),
    [theme.name, tileUrl, glyphsUrl],
  );

  const pitch = voicePitch ?? (direction.grammar === 'full-bleed-map' ? direction.camera.pitch3d : direction.camera.followPitch);
  const bearing = direction.camera.bearing === 'north' ? 0 : 45;

  const arrive = useCallback(() => {
    // The arrival: the camera settles onto the door of the next stop. It is
    // the one move of the direction that is allowed to overshoot.
    setArrived(true);
    cameraRef.current?.easeTo({
      center: NEXT_STOP,
      zoom: STOP_ZOOM,
      pitch: direction.camera.pitch3d,
      bearing: 0,
      duration: reducedMotion ? 0 : 400,
    });
  }, [direction.camera.pitch3d, reducedMotion]);

  // The voice moves the map: the same verbs the product understands.
  useEffect(() => {
    const unsubscribe = subscribeToVoiceCommands((command) => {
      if (command.type === 'tilt_map') {
        setVoicePitch(command.on ? direction.camera.pitch3d : 0);
      }
      if (command.type === 'zoom_to_next_stop') {
        cameraRef.current?.easeTo({
          center: NEXT_STOP,
          zoom: STOP_ZOOM,
          duration: reducedMotion ? 0 : 250,
        });
      }
    });
    return unsubscribe;
  }, [direction.camera.pitch3d, reducedMotion]);

  const onNext = useCallback(() => {
    confirmDelivery();
    arrive();
    confirm();
  }, [arrive, confirm]);

  if (state === 'error') {
    return (
      <View
        testID="driving-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.stateBlock}>
          <ErrorBlock
            message="The map did not load."
            action="Try again"
            onAction={() => undefined}
          />
        </View>
      </View>
    );
  }

  if (state === 'denied') {
    return (
      <View
        testID="driving-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.stateBlock}>
          <PermissionBlock
            message="Location is off, so the map cannot follow you."
            action="Open the location setting"
            onAction={() => undefined}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      testID="driving-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel={`Driving to the next stop, ${direction.displayName} direction`}
    >
      <View style={styles.mapArea}>
        <Map
          ref={mapRef}
          testID="courier-map"
          mapStyle={mapStyle}
          style={styles.map}
        >
          <Camera
            ref={cameraRef}
            initialViewState={{ center: MAP_CENTRE, zoom: 12 }}
            minZoom={4}
            maxZoom={19}
            pitch={pitch}
            bearing={bearing}
          />
          <Marker
            testID="stop-marker-45"
            lngLat={NEXT_STOP}
            anchor="bottom"
          >
            <View
              style={[
                styles.marker,
                {
                  backgroundColor: theme.colors.stopPin,
                  borderColor: theme.colors.surface,
                  borderRadius: direction.radii.pill,
                },
              ]}
            >
              <Text style={[styles.markerLabel, { color: theme.colors.textInverse }]}>45</Text>
            </View>
          </Marker>
        </Map>

        <View
          style={[
            styles.attribution,
            { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
          ]}
          pointerEvents="none"
          testID="map-attribution"
        >
          {ATTRIBUTION_LINES.map((line) => (
            <Text
              key={line}
              style={[typeStyle(direction.type.caption), { color: theme.colors.textSecondary, fontSize: 12 }]}
            >
              {line}
            </Text>
          ))}
        </View>
      </View>

      <Animated.View
        entering={reducedMotion ? undefined : FadeIn.duration(direction.motion.durationMs)}
        style={[
          styles.plate,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: direction.radii.card,
            padding: direction.spacing.pad,
          },
        ]}
        testID="driving-plate"
      >
        {state === 'offline' ? <StateChip kind="offline" queued={run.queuedActions} /> : null}
        {state === 'partial' ? (
          <StateChip kind="partial" queued={run.queuedActions} onRetry={() => undefined} />
        ) : null}

        <View style={styles.plateRow}>
          <View style={styles.plateMain}>
            <Text style={[typeStyle(direction.type.label), { color: theme.colors.brandPrimary }]}>
              Next stop
            </Text>
            <Text
              style={[typeStyle(direction.type.address), { color: theme.colors.textPrimary }]}
              accessibilityRole="heading"
              accessibilityLabel={`Next stop, ${run.nextStop.address}, ${run.nextStop.suburb}`}
            >
              {run.nextStop.address}
            </Text>
            <Text style={[typeStyle(direction.type.body), { color: theme.colors.textSecondary }]}>
              {`${run.nextStop.suburb} · ${run.nextStop.eta} · 1.2 km`}
            </Text>
          </View>
          <View style={styles.plateSide}>
            <Text style={[typeStyle(direction.type.metric), styles.metric, { color: theme.colors.textPrimary }]}>
              1.2
            </Text>
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}>
              km away
            </Text>
          </View>
        </View>

        <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
          {run.nextStop.note}
        </Text>

        <View style={styles.actions}>
          <PrimaryAction
            label={confirmed ? 'Delivered' : 'Next stop'}
            onPress={onNext}
            testID="driving-next-stop"
            hint="Opens the next stop"
          />
        </View>

        <VoicePresence state={run.voice} queued={run.queuedActions} />
      </Animated.View>

      {arrived ? (
        <View
          style={[
            styles.arrived,
            {
              backgroundColor: theme.colors.brandPrimary,
              borderRadius: direction.radii.pill,
            },
          ]}
          testID="driving-arrived"
        >
          <MaterialCommunityIcons name="map-marker-check" size={18} color={theme.colors.textInverse} />
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textInverse }]}>
            At the door
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  mapArea: { flex: 1 },
  map: { flex: 1 },
  stateBlock: { padding: 24 },
  attribution: { paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: 1 },
  marker: {
    width: 32,
    height: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerLabel: { fontSize: 14, fontWeight: '700' },
  plate: { borderWidth: 1, gap: 12 },
  plateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  plateMain: { flex: 1, gap: 2 },
  plateSide: { alignItems: 'flex-end' },
  metric: { fontVariant: ['tabular-nums'] },
  actions: { paddingTop: 8 },
  arrived: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
