/**
 * Map - the map tab on the chosen tokens (T6 slice 3, screen 09).
 *
 * The map is the app: the run lives on it and everything else floats above it
 * on glass. This screen is the reference's 09 Map style sheet - the four modes
 * with their previews and their one line each, and the offline map row under
 * them. The map logic is the existing modules (`viewModes`, `offlinePack`,
 * `styles`): this is a re-skin, not new map code.
 *
 * The Maestro testIDs (`map-screen`, `map-mode-*`, `map-mode-message`,
 * `map-pack-status`, `map-attribution`, `map-settings`) are the contract, so
 * they stay. Two contract changes are deliberate:
 *
 * 1. **Light and dark have ONE source.** The map style follows the chosen mode
 *    (`useChosen`, which follows the OS and can be pinned), so the legacy
 *    day/night selector that MapSettingsSheet used to carry is gone: a second
 *    light/dark control on one screen is a lie waiting to happen.
 * 2. **A marker tap zooms, it does not open the run actions.** Delivered, Skip
 *    and Navigate are the Today and Driving screens' business (the reference 09
 *    carries no stop card); the map orients the courier, it does not duplicate
 *    the day's actions.
 *
 * The copy is plain New Zealand English, there is no emoji anywhere, and every
 * control has an accessibility label and a role.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import {
  Camera,
  Map,
  Marker,
  NativeUserLocation,
  type CameraRef,
  type LngLatBounds,
  type MapRef,
} from '@maplibre/maplibre-react-native';

import {
  BottomSheet,
  MapButton,
  MapButtonColumn,
  StopPin,
  TopPills,
  useChosen,
  type SheetHeight,
} from '@/components/chosen';
import { hapticFor } from '@/motion/haptics';
import { subscribeToVoiceCommands } from '@/voice/commandChannel';
import { getSatelliteSource } from '@/maps/config';
import { describe } from '@/maps/offlinePack';
import { useMapBoot } from '@/maps/useMapBoot';
import { ATTRIBUTION_LINES, getCourierStyle } from '@/maps/styles';
import { mockStops, stopsBounds, stopsForMap, type Stop } from '@/maps/stops';
import { LOOK_BACK_BEARING, TILTED_PITCH, cameraForMode } from '@/maps/cameraCommands';
import { isInTown, isMoving, type MapPosition } from '@/maps/driving';
import { MapSettingsSheet } from '@/maps/MapSettingsSheet';
import { isOnline } from '@/maps/network';
import { useDriverId } from '@/maps/useDriverId';
import { useMapToggles } from '@/maps/useMapToggles';
import { useMapViewMode } from '@/maps/useMapViewMode';
import type { MapViewMode } from '@/maps/viewModes';
import { motion, radii, spacing, tokens, typography } from '@courier/design-tokens/chosen';

/** Christchurch, the middle of the region the pack covers. */
const MAP_CENTRE: [number, number] = [172.636, -43.533];

/** The zoom the camera goes to when it is sent to a stop. */
const STOP_ZOOM = 17;

/** The sheet floor sits above the dock: the bar, its caption and its raise. */
const SHEET_INSET = spacing.space64 + spacing.space32 + spacing.space4;

const RUN_NAME = 'Northwood AM';

/** The height the sheet opens at: the mode picker, per the reference. */
const OPEN_HEIGHT: SheetHeight = 'half';

/**
 * The four modes, in the order the reference shows them, each with the one
 * line that tells the courier what they are choosing.
 */
const MODE_CHOICES: readonly { mode: MapViewMode; label: string; description: string }[] = [
  { mode: 'flat', label: '2D', description: 'Flat and clear' },
  { mode: '3d', label: '3D', description: 'Buildings and depth' },
  { mode: 'satellite', label: 'Satellite', description: 'Real roofs and yards' },
  { mode: 'auto', label: 'Auto', description: '3D in town, dark at night' },
];

/** The dark set, read once: the Auto preview's night half is the dark land. */
const DARK = tokens('dark');

/** One MB, in bytes, for the offline row. */
const BYTES_PER_MB = 1024 * 1024;

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** The size of the pack in whole megabytes. */
const sizeInMb = (bytes: number): string => (Math.round(bytes / BYTES_PER_MB) || 1).toString();

/** The day the pack was built on, the way a courier says it. */
const updatedDay = (builtAt: string): string => {
  const parsed = new Date(builtAt);
  if (Number.isNaN(parsed.getTime())) {
    return 'recently';
  }
  return WEEKDAYS[parsed.getDay()];
};

/** What the offline map row says. */
interface OfflineRow {
  title: string;
  detail: string;
  state: string;
  ready: boolean;
}

/**
 * The mode preview: the same fragment of map in each mode's own reading, drawn
 * with the map palette tokens and nothing else. 3D stands two buildings up,
 * Satellite is the imagery reading (dark ground, light roads) and Auto carries
 * the dark land under the day one, which is the whole promise of "3D in town,
 * dark at night".
 */
function ModePreview({ mode }: { mode: MapViewMode }) {
  const { t } = useChosen();
  const satellite = mode === 'satellite';
  const ground = satellite ? t.colors.mapRoad : t.colors.mapLand;
  const roads = satellite ? t.colors.mapLand : t.colors.mapRoad;

  return (
    <View style={[styles.preview, { backgroundColor: ground }]} pointerEvents="none">
      <View style={[styles.previewWater, { backgroundColor: t.colors.mapWater }]} />
      <View style={[styles.previewPark, { backgroundColor: t.colors.mapPark }]} />
      <View style={[styles.previewRoad, { backgroundColor: roads }]} />
      <View style={[styles.previewRoadShort, { backgroundColor: roads }]} />
      {mode === '3d' ? (
        <>
          <View style={[styles.previewBuilding, { backgroundColor: roads, borderColor: ground }]} />
          <View
            style={[styles.previewBuildingSmall, { backgroundColor: roads, borderColor: ground }]}
          />
        </>
      ) : null}
      {mode === 'auto' ? <View style={[styles.previewNight, { backgroundColor: DARK.colors.mapLand }]} /> : null}
      <View style={[styles.previewRoute, { backgroundColor: t.colors.accent }]} />
    </View>
  );
}

/** One mode card: the preview, the name and the one line, selected or not. */
function ModeCard({
  mode,
  label,
  description,
  selected,
  onPress,
}: {
  mode: MapViewMode;
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useChosen();
  const cardWidth = useCardWidth();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} map, ${description}`}
      accessibilityHint="Chooses the map mode"
      onPress={onPress}
      testID={`map-mode-${mode}`}
      style={[
        styles.modeCard,
        {
          backgroundColor: t.colors.fill,
          borderRadius: radii.pill,
          borderColor: selected ? t.colors.accent : 'transparent',
          width: cardWidth,
        },
      ]}
    >
      <ModePreview mode={mode} />
      <Text
        style={[styles.modeName, { color: t.colors.label }]}
        maxFontSizeMultiplier={1.4}
      >
        {label}
      </Text>
      <Text
        style={[styles.modeDescription, { color: t.colors.secondaryLabel }]}
        maxFontSizeMultiplier={1.4}
      >
        {description}
      </Text>
    </Pressable>
  );
}

export default function MapScreen() {
  const { t, mode } = useChosen();
  const driverId = useDriverId();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bounds, setBounds] = useState<LngLatBounds | null>(null);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [online, setOnline] = useState(false);
  const [position, setPosition] = useState<MapPosition | null>(null);
  const [moving, setMoving] = useState(false);
  const [tilted, setTilted] = useState<boolean | null>(null);
  const [lookBack, setLookBack] = useState(false);
  const [followMe, setFollowMe] = useState(false);
  const [sheetHeight, setSheetHeight] = useState<SheetHeight>(OPEN_HEIGHT);
  const mapRef = useRef<MapRef | null>(null);
  const cameraRef = useRef<CameraRef | null>(null);

  const { toggles, setToggles } = useMapToggles({ driverId });

  // The offline pack and the glyphs, read once by the shared boot (SYSTEM
  // §6): the tiles of the pack when it is ready, the online tiles when it
  // is not, and the grey style when there is nothing at all.
  const { tileSource, glyphsUrl, pack } = useMapBoot();

  // The position puck is only drawn when the courier has allowed the
  // location. Without the permission the map still works.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!cancelled) {
          setLocationAllowed(permission?.granted === true);
        }
      } catch (error) {
        console.warn(`maps: the location permission could not be read: ${describe(error)}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Whether the device has a network: the satellite mode needs one.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const state = await isOnline();
      if (!cancelled) {
        setOnline(state);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // The speed of the courier, which is what the auto mode watches.
  useEffect(() => {
    if (!locationAllowed) {
      return;
    }

    let subscription: Location.LocationSubscription | null = null;

    void (async () => {
      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 10,
            timeInterval: 5000,
          },
          (result) => {
            setPosition({ lat: result.coords.latitude, lng: result.coords.longitude });
            setMoving(isMoving(result.coords.speed));
          },
        );
      } catch (error) {
        console.warn(`maps: the position could not be watched: ${describe(error)}`);
      }
    })();

    return () => {
      subscription?.remove();
    };
  }, [locationAllowed]);

  // The satellite imagery is only ever used when the build names the
  // provider and its licence.
  const satelliteSource = useMemo(() => getSatelliteSource(), []);

  // The pack says whether it carries the building outlines that make the 3D
  // buildings possible.
  const packHasBuildings =
    pack?.state.status === 'ready' && pack.state.manifest.buildings?.present === true;

  const townBounds = useMemo(() => stopsBounds(mockStops), []);
  const inTown = useMemo(() => isInTown(position, townBounds), [position, townBounds]);

  const { mode: viewMode, decision, setMode } = useMapViewMode({
    driverId,
    batterySaver: toggles.batterySaver,
    moving,
    inTown,
    online,
    satelliteLicensed: satelliteSource !== null,
    buildingsInPack: packHasBuildings,
  });

  // The map style follows the chosen mode: ONE light/dark truth (the OS, or a
  // pinned test), never a second selector.
  const style = useMemo(
    () =>
      getCourierStyle(mode === 'dark' ? 'night' : 'day', tileSource.kind === 'none' ? null : tileSource.url, glyphsUrl, {
        labelSize: toggles.labelSize,
        buildings: toggles.buildings,
        buildings3d: decision.effective === '3d' && packHasBuildings,
        satellite: decision.effective === 'satellite' ? satelliteSource : null,
      }),
    [
      mode,
      tileSource,
      glyphsUrl,
      toggles.labelSize,
      toggles.buildings,
      decision.effective,
      packHasBuildings,
      satelliteSource,
    ],
  );

  const visibleStops = useMemo(() => stopsForMap(mockStops, bounds), [bounds]);

  const activeStop = useMemo(() => mockStops.find((stop) => stop.status === 'active'), []);

  const handleRegionDidChange = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    void map
      .getBounds()
      .then((next) => {
        setBounds(next);
      })
      .catch((error) => {
        console.warn(`maps: the map bounds could not be read: ${describe(error)}`);
      });
  }, []);

  /** Sends the camera to a stop: the one action a marker needs. */
  const zoomTo = useCallback((coordinates: { lat: number; lng: number }) => {
    cameraRef.current?.easeTo({
      center: [coordinates.lng, coordinates.lat],
      zoom: STOP_ZOOM,
      duration: motion.duration.camera,
    });
  }, []);

  const zoomToNextStop = useCallback(() => {
    const stop = activeStop ?? mockStops[0];
    if (stop) {
      zoomTo(stop.coordinates);
    }
  }, [activeStop, zoomTo]);

  const handleMarkerPress = useCallback(
    (stop: Stop) => {
      zoomTo(stop.coordinates);
    },
    [zoomTo],
  );

  const handleRecentre = useCallback(() => {
    if (position) {
      zoomTo(position);
      return;
    }
    zoomToNextStop();
  }, [position, zoomTo, zoomToNextStop]);

  const handleChooseMode = useCallback(
    (next: MapViewMode) => {
      setMode(next);
      hapticFor('confirm');
    },
    [setMode],
  );

  // The voice commands the map understands.
  useEffect(() => {
    const unsubscribe = subscribeToVoiceCommands((command) => {
      switch (command.type) {
        case 'set_map_mode':
          setMode(command.mode);
          break;
        case 'tilt_map':
          setTilted(command.on);
          break;
        case 'follow_me':
          setFollowMe(command.on);
          break;
        case 'look_back':
          setLookBack(true);
          break;
        case 'reset_camera':
          setTilted(null);
          setLookBack(false);
          setFollowMe(false);
          break;
        case 'zoom_to_next_stop':
          zoomToNextStop();
          break;
        default:
          break;
      }
    });

    return unsubscribe;
  }, [setMode, zoomToNextStop]);

  // The camera, in the mode the courier is in. The voice can tilt the map and
  // turn it around; the mode decides what it is when nothing else has.
  const modeCamera = cameraForMode(decision.effective);
  const camera = useMemo(
    () => ({
      pitch: tilted === null ? modeCamera.pitch : tilted ? TILTED_PITCH : 0,
      bearing: lookBack ? LOOK_BACK_BEARING : modeCamera.bearing,
    }),
    [lookBack, modeCamera, tilted],
  );

  // What the offline map row says, honestly: the pack when it is ready, the
  // online map when it is not, and the plain truth when there is nothing.
  const offlineRow = useMemo<OfflineRow>(() => {
    if (pack?.state.status === 'ready') {
      const manifest = pack.state.manifest;
      return {
        title: 'Canterbury offline map',
        detail: `${sizeInMb(manifest.bytes)} MB, updated ${updatedDay(manifest.builtAt)}`,
        state: 'Ready',
        ready: true,
      };
    }
    if (tileSource.kind === 'online') {
      return {
        title: 'Canterbury offline map',
        detail: 'Online map: the offline pack is not on the device',
        state: 'Online',
        ready: false,
      };
    }
    return {
      title: 'Canterbury offline map',
      detail: 'No map tiles: the stops are still here',
      state: 'Offline',
      ready: false,
    };
  }, [pack, tileSource]);

  /** The row is the peek content and the bottom of the picker: it is the way back up. */
  const offlineRowNode = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${offlineRow.title}, ${offlineRow.detail}, ${offlineRow.state}`}
      accessibilityHint="Shows the map modes"
      onPress={() => setSheetHeight('half')}
      testID="map-pack-status"
      style={[styles.offlineRow, { backgroundColor: t.colors.fill, borderRadius: radii.stripCorner }]}
    >
      <Ionicons
        name="map-outline"
        size={22}
        color={offlineRow.ready ? t.colors.success : t.colors.secondaryLabel}
      />
      <View style={styles.offlineText}>
        <Text style={[styles.offlineTitle, { color: t.colors.label }]} maxFontSizeMultiplier={1.4}>
          {offlineRow.title}
        </Text>
        <Text style={[styles.offlineDetail, { color: t.colors.secondaryLabel }]} maxFontSizeMultiplier={1.4}>
          {offlineRow.detail}
        </Text>
      </View>
      <Text
        style={[
          styles.offlineState,
          { color: offlineRow.ready ? t.colors.successText : t.colors.secondaryLabel },
        ]}
        maxFontSizeMultiplier={1.4}
      >
        {offlineRow.state}
      </Text>
    </Pressable>
  );

  const modePicker = (
    <View style={styles.sheetContent}>
      <View style={styles.sheetHeader}>
        <Text style={[styles.sheetTitle, { color: t.colors.label }]} maxFontSizeMultiplier={1.4}>
          Map
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          accessibilityHint="Puts the map style away"
          onPress={() => setSheetHeight('peek')}
          testID="map-style-close"
          style={[styles.closeButton, { backgroundColor: t.colors.fill }]}
        >
          <Ionicons name="close" size={16} color={t.colors.secondaryLabel} />
        </Pressable>
      </View>

      <View style={styles.modeGrid}>
        {MODE_CHOICES.map((choice) => (
          <ModeCard
            key={choice.mode}
            mode={choice.mode}
            label={choice.label}
            description={choice.description}
            selected={viewMode === choice.mode}
            onPress={() => handleChooseMode(choice.mode)}
          />
        ))}
      </View>

      {decision.message ? (
        <Text
          testID="map-mode-message"
          style={[styles.modeMessage, { color: t.colors.secondaryLabel }]}
          maxFontSizeMultiplier={1.4}
        >
          {decision.message}
        </Text>
      ) : null}

      {offlineRowNode}
    </View>
  );

  return (
    <SafeAreaView testID="map-screen" style={styles.container}>
      <View style={styles.mapContainer}>
        <Map
          ref={mapRef}
          testID="courier-map"
          mapStyle={style}
          style={styles.map}
          onRegionDidChange={handleRegionDidChange}
        >
          <Camera
            ref={cameraRef}
            initialViewState={{ center: MAP_CENTRE, zoom: 12 }}
            minZoom={4}
            maxZoom={19}
            pitch={camera.pitch}
            bearing={camera.bearing}
            trackUserLocation={followMe ? 'course' : undefined}
          />
          {locationAllowed ? <NativeUserLocation /> : null}
          {visibleStops.map((stop) => (
            <Marker
              key={stop.id}
              testID={`stop-marker-${stop.sequence}`}
              lngLat={[stop.coordinates.lng, stop.coordinates.lat]}
              anchor="bottom"
              onPress={() => handleMarkerPress(stop)}
            >
              <View testID={`stop-pin-${stop.sequence}`}>
                <StopPin number={String(stop.sequence)} />
              </View>
            </Marker>
          ))}
        </Map>

        <View style={styles.pills}>
          <TopPills runName={RUN_NAME} weather="Rain 2 pm" weatherIcon="cloud" />
        </View>

        <View style={styles.mapButtons}>
          <MapButtonColumn>
            <MapButton
              name="options"
              tone="label"
              accessibilityLabel="Map settings"
              onPress={() => setSettingsOpen(true)}
              testID="map-settings"
            />
            <MapButton
              name="locate"
              tone="accent"
              accessibilityLabel="Recentre"
              onPress={handleRecentre}
              testID="map-recentre"
            />
          </MapButtonColumn>
        </View>

        <View style={styles.attribution} pointerEvents="none" testID="map-attribution">
          {ATTRIBUTION_LINES.map((line) => (
            <Text
              key={line}
              style={[styles.attributionText, { color: t.colors.secondaryLabel }]}
              maxFontSizeMultiplier={1.2}
            >
              {line}
            </Text>
          ))}
        </View>
      </View>

      <BottomSheet
        height={sheetHeight}
        onHeightChange={setSheetHeight}
        bottomInset={SHEET_INSET}
        testID="map-sheet"
      >
        {sheetHeight === 'peek' ? (
          <View style={styles.peekContent}>{offlineRowNode}</View>
        ) : (
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {modePicker}
          </ScrollView>
        )}
      </BottomSheet>

      <MapSettingsSheet
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        toggles={toggles}
        onTogglesChange={setToggles}
      />
    </SafeAreaView>
  );
}

/** The card width: two to a row inside the sheet's 24 pt padding, with a 12 pt gutter. */
const useCardWidth = (): number =>
  useMemo(() => {
    const usable = Dimensions.get('window').width - spacing.space24 * 2 - spacing.space12;
    return Math.floor(usable / 2);
  }, []);

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  pills: {
    position: 'absolute',
    top: spacing.space12,
    left: spacing.space16,
    right: spacing.space16,
  },
  mapButtons: {
    position: 'absolute',
    right: spacing.space16,
    top: spacing.space64,
  },
  attribution: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.space8,
    paddingVertical: spacing.space4,
  },
  attributionText: { fontSize: 10, lineHeight: 13 },
  sheetScroll: { flex: 1 },
  sheetScrollContent: { paddingBottom: spacing.space32 },
  sheetContent: {
    gap: spacing.space16,
    paddingHorizontal: spacing.space24,
    paddingBottom: spacing.space48,
  },
  peekContent: {
    paddingHorizontal: spacing.space24,
    paddingBottom: spacing.space16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: typography.streetTitle.size,
    lineHeight: typography.streetTitle.lineHeight,
    fontWeight: typography.streetTitle.weight,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space12,
  },
  modeCard: {
    padding: spacing.space4,
    borderWidth: 2.5,
  },
  preview: {
    height: 80,
    borderRadius: radii.segmented,
    overflow: 'hidden',
  },
  previewWater: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 26,
    height: 10,
  },
  previewPark: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    width: 26,
    height: 18,
    borderRadius: 4,
  },
  previewRoad: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 52,
    height: 5,
  },
  previewRoadShort: {
    position: 'absolute',
    left: 22,
    top: 0,
    bottom: 0,
    width: 5,
  },
  previewBuilding: {
    position: 'absolute',
    left: 12,
    bottom: 20,
    width: 22,
    height: 20,
    borderWidth: 2,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 2,
  },
  previewBuildingSmall: {
    position: 'absolute',
    right: 14,
    bottom: 20,
    width: 14,
    height: 13,
    borderWidth: 2,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 2,
  },
  previewNight: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 30,
  },
  previewRoute: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '46%',
    height: 5,
  },
  modeName: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.weight,
    marginTop: spacing.space8,
    marginLeft: spacing.space4,
  },
  modeDescription: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: '400',
    marginLeft: spacing.space4,
    marginBottom: spacing.space4,
  },
  modeMessage: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: typography.secondary.weight,
  },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    padding: spacing.space12,
  },
  offlineText: { flex: 1, gap: spacing.space4 },
  offlineTitle: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.weight,
  },
  offlineDetail: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: '400',
  },
  offlineState: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.weight,
  },
});
