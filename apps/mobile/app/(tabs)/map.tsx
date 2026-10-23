import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import { subscribeToVoiceCommands } from '@/voice/commandChannel';
import { getSatelliteSource } from '@/maps/config';
import { describe } from '@/maps/offlinePack';
import { useMapBoot } from '@/maps/useMapBoot';
import { ATTRIBUTION_LINES, getCourierStyle } from '@/maps/styles';
import {
  markerLabelColor,
  mockStops,
  statusColor,
  stopsBounds,
  stopsForMap,
  type Stop,
} from '@/maps/stops';
import { LOOK_BACK_BEARING, TILTED_PITCH, cameraForMode } from '@/maps/cameraCommands';
import { isInTown, isMoving, type MapPosition } from '@/maps/driving';
import { MapSettingsSheet } from '@/maps/MapSettingsSheet';
import { isOnline } from '@/maps/network';
import { useDriverId } from '@/maps/useDriverId';
import { useMapToggles } from '@/maps/useMapToggles';
import { useMapViewMode } from '@/maps/useMapViewMode';
import type { MapViewMode } from '@/maps/viewModes';

/** The words of the status labels, so the screen reader reads a sentence. */
const statusLabels: Record<Stop['status'], string> = {
  delivered: 'Delivered',
  pending: 'Pending',
  active: 'Active',
  failed: 'Failed',
  skipped: 'Skipped',
};

/** Christchurch, the middle of the region the pack covers. */
const MAP_CENTRE: [number, number] = [172.636, -43.533];

/** The zoom the camera goes to when it is sent to the next stop. */
const STOP_ZOOM = 17;

/**
 * The four map modes, in the order they are shown.
 *
 * The courier picks the mode with one tap, and the voice can pick it too
 * ("3D on", "flat map", "satellite", "auto").
 */
const MODE_CHOICES: readonly {
  mode: MapViewMode;
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
}[] = [
  { mode: 'flat', label: 'Flat', icon: 'map-outline' },
  { mode: '3d', label: '3D', icon: 'cube-outline' },
  { mode: 'satellite', label: 'Satellite', icon: 'satellite-variant' },
  { mode: 'auto', label: 'Auto', icon: 'auto-fix' },
];

export default function MapScreen() {
  const { theme, themeName, themePreference, setThemePreference } = useTheme();
  const driverId = useDriverId();
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [bounds, setBounds] = useState<LngLatBounds | null>(null);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [online, setOnline] = useState(false);
  const [position, setPosition] = useState<MapPosition | null>(null);
  const [moving, setMoving] = useState(false);
  const [tilted, setTilted] = useState<boolean | null>(null);
  const [lookBack, setLookBack] = useState(false);
  const [followMe, setFollowMe] = useState(false);
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

  const { mode, decision, setMode } = useMapViewMode({
    driverId,
    batterySaver: toggles.batterySaver,
    moving,
    inTown,
    online,
    satelliteLicensed: satelliteSource !== null,
    buildingsInPack: packHasBuildings,
  });

  const style = useMemo(
    () =>
      getCourierStyle(themeName, tileSource.kind === 'none' ? null : tileSource.url, glyphsUrl, {
        labelSize: toggles.labelSize,
        buildings: toggles.buildings,
        buildings3d: decision.effective === '3d' && packHasBuildings,
        satellite: decision.effective === 'satellite' ? satelliteSource : null,
      }),
    [
      themeName,
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

  const handleNavigateToStop = useCallback((stop: Stop) => {
    // The turn-by-turn hand-off arrives with the navigation module (T7.7);
    // until then the stop is the only thing the driver can act on here.
    console.info(`maps: navigate to stop ${stop.sequence}, ${stop.address}`);
  }, []);

  const handleMarkDelivered = useCallback((stop: Stop) => {
    console.info(`maps: stop ${stop.sequence} delivered`);
    setSelectedStop(null);
  }, []);

  const handleSkipStop = useCallback((stop: Stop) => {
    console.info(`maps: stop ${stop.sequence} skipped`);
    setSelectedStop(null);
  }, []);

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

  const zoomToNextStop = useCallback(() => {
    const stop = mockStops.find((entry) => entry.status === 'active') ?? mockStops[0];
    if (!stop) {
      return;
    }
    cameraRef.current?.easeTo({
      center: [stop.coordinates.lng, stop.coordinates.lat],
      zoom: STOP_ZOOM,
      duration: 600,
    });
  }, []);

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

  const packLabel = useMemo(() => {
    if (!pack) {
      return 'Looking for the offline map';
    }
    if (pack.state.status === 'ready') {
      return `Offline map: ${pack.state.manifest.region} (${pack.state.origin})`;
    }
    if (tileSource.kind === 'online') {
      return 'Online map: the offline pack is not on the device';
    }
    return 'No map tiles: the stops are still here';
  }, [pack, tileSource]);

  return (
    <SafeAreaView
      testID="map-screen"
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
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
              onPress={() => setSelectedStop(stop)}
            >
              <View
                style={[
                  styles.marker,
                  {
                    backgroundColor: statusColor(stop.status, theme),
                    borderColor: theme.colors.background,
                  },
                ]}
              >
                <Text style={[styles.markerLabel, { color: markerLabelColor(stop.status, theme) }]}>
                  {stop.sequence}
                </Text>
              </View>
            </Marker>
          ))}
        </Map>

        <View
          testID="map-pack-status"
          style={[
            styles.packStatus,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.packStatusText, { color: theme.colors.textSecondary }]}>
            {packLabel}
          </Text>
        </View>

        <View
          testID="map-attribution"
          style={[styles.attribution, { backgroundColor: theme.colors.surface }]}
          pointerEvents="none"
        >
          {ATTRIBUTION_LINES.map((line) => (
            <Text
              key={line}
              style={[styles.attributionText, { color: theme.colors.textSecondary }]}
            >
              {line}
            </Text>
          ))}
        </View>
      </View>

      <View
        style={[
          styles.bottomControls,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.controlRow}>
          {MODE_CHOICES.map((choice) => {
            const selected = mode === choice.mode;
            return (
              <TouchableOpacity
                key={choice.mode}
                testID={`map-mode-${choice.mode}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${choice.label} map`}
                style={[
                  styles.controlButton,
                  {
                    borderColor: selected ? theme.colors.brandPrimary : theme.colors.border,
                    backgroundColor: selected ? theme.colors.background : theme.colors.surface,
                  },
                ]}
                onPress={() => setMode(choice.mode)}
              >
                <MaterialCommunityIcons
                  name={choice.icon}
                  size={22}
                  color={selected ? theme.colors.brandPrimary : theme.colors.textSecondary}
                />
                <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>
                  {choice.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {decision.message ? (
          <Text
            testID="map-mode-message"
            style={[styles.modeMessage, { color: theme.colors.textSecondary }]}
          >
            {decision.message}
          </Text>
        ) : null}

        <View style={styles.controlRow}>
          <Button
            variant="secondary"
            leftIcon={
              <MaterialCommunityIcons
                name="crosshairs-gps"
                size={20}
                color={theme.colors.textPrimary}
              />
            }
            onPress={() => console.info('maps: centre the map on the courier')}
            accessibilityLabel="My location"
          >
            My location
          </Button>
          {activeStop ? (
            <Button
              variant="primary"
              leftIcon={
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={20}
                  color={theme.colors.textInverse}
                />
              }
              onPress={() => handleNavigateToStop(activeStop)}
              accessibilityLabel="Next stop"
            >
              Next stop
            </Button>
          ) : null}
          <Button
            variant="outline"
            leftIcon={
              <MaterialCommunityIcons
                name="tune-variant"
                size={20}
                color={theme.colors.textPrimary}
              />
            }
            onPress={() => setSettingsOpen(true)}
            accessibilityLabel="Map settings"
            testID="map-settings"
          >
            Settings
          </Button>
        </View>
      </View>

      <MapSettingsSheet
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        toggles={toggles}
        onTogglesChange={setToggles}
        themePreference={themePreference}
        onThemePreferenceChange={setThemePreference}
      />

      <Sheet
        isOpen={selectedStop !== null}
        onClose={() => setSelectedStop(null)}
        title={selectedStop ? `Stop ${selectedStop.sequence}` : undefined}
        subtitle={selectedStop ? statusLabels[selectedStop.status] : undefined}
        size="medium"
        testID="map-stop-sheet"
      >
        {selectedStop ? (
          <>
            <View style={styles.modalBody}>
              <Text style={[styles.modalAddress, { color: theme.colors.textPrimary }]}>
                {selectedStop.address}
              </Text>
              <Text style={[styles.modalSuburb, { color: theme.colors.textSecondary }]}>
                {selectedStop.suburb}
              </Text>
              <View style={[styles.modalCoordinates, { borderTopColor: theme.colors.border }]}>
                <Text style={[styles.modalCoordLabel, { color: theme.colors.textTertiary }]}>
                  Coordinates
                </Text>
                <Text style={[styles.modalCoordValue, { color: theme.colors.textSecondary }]}>
                  {selectedStop.coordinates.lat.toFixed(6)},{' '}
                  {selectedStop.coordinates.lng.toFixed(6)}
                </Text>
              </View>
            </View>
            <View style={styles.modalActions}>
              <Button
                variant={selectedStop.status === 'delivered' ? 'outline' : 'primary'}
                leftIcon={
                  <MaterialCommunityIcons
                    name="check"
                    size={20}
                    color={
                      selectedStop.status === 'delivered'
                        ? theme.colors.textPrimary
                        : theme.colors.textInverse
                    }
                  />
                }
                onPress={() => handleMarkDelivered(selectedStop)}
                disabled={selectedStop.status === 'delivered'}
                style={styles.modalActionButton}
                accessibilityLabel="Mark Delivered"
              >
                Delivered
              </Button>
              <Button
                variant="secondary"
                leftIcon={
                  <MaterialCommunityIcons
                    name="skip-next"
                    size={20}
                    color={theme.colors.textPrimary}
                  />
                }
                onPress={() => handleSkipStop(selectedStop)}
                style={styles.modalActionButton}
                accessibilityLabel="Skip"
              >
                Skip
              </Button>
              <Button
                variant="outline"
                leftIcon={
                  <MaterialCommunityIcons
                    name="navigation-variant"
                    size={20}
                    color={theme.colors.textPrimary}
                  />
                }
                onPress={() => handleNavigateToStop(selectedStop)}
                style={styles.modalActionButton}
                accessibilityLabel="Navigate"
              >
                Navigate
              </Button>
            </View>
          </>
        ) : null}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  packStatus: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: '80%',
  },
  packStatusText: { fontSize: 12, fontWeight: '500' },
  attribution: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  attributionText: { fontSize: 10, lineHeight: 13 },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerLabel: { fontSize: 12, fontWeight: '700' },
  bottomControls: { padding: 16, paddingBottom: 32, borderTopWidth: 1 },
  controlRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  controlButton: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  controlLabel: { fontSize: 12, fontWeight: '500' },
  modeMessage: { fontSize: 17, marginBottom: 12 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  modalStatusBadge: { width: 12, height: 12, borderRadius: 6 },
  modalStopNumber: { fontSize: 18, fontWeight: '600', flex: 1 },
  modalBody: { paddingHorizontal: 24, marginBottom: 24 },
  modalAddress: { fontSize: 20, fontWeight: '500', marginBottom: 4 },
  modalSuburb: { fontSize: 16, marginBottom: 12 },
  modalCoordinates: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  modalCoordLabel: { fontSize: 13, fontWeight: '500' },
  modalCoordValue: { fontSize: 13 },
  modalActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 24 },
  modalActionButton: { flex: 1 },
});
