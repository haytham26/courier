import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import {
  Camera,
  Map,
  Marker,
  NativeUserLocation,
  type LngLatBounds,
  type MapRef,
} from '@maplibre/maplibre-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { getConfiguredGlyphsUrl, getConfiguredTileUrl } from '@/maps/config';
import { describe, resolveTileSource, type TileSource } from '@/maps/offlinePack';
import { loadOfflinePack, localGlyphsUrl, type OfflinePackRuntime } from '@/maps/packFiles';
import { ATTRIBUTION_LINES, getCourierStyle } from '@/maps/styles';
import {
  markerLabelColor,
  mockStops,
  statusColor,
  stopsForMap,
  type Stop,
} from '@/maps/stops';

/** Christchurch, the middle of the region the pack covers. */
const MAP_CENTRE: [number, number] = [172.636, -43.533];

const THEME_CHOICES = [
  { name: 'day', label: 'Day', icon: 'white-balance-sunny' },
  { name: 'night', label: 'Night', icon: 'weather-night' },
  { name: 'highContrast', label: 'Contrast', icon: 'contrast-circle' },
] as const;

export default function MapScreen() {
  const { theme, themeName, setTheme } = useTheme();
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [pack, setPack] = useState<OfflinePackRuntime | null>(null);
  const [glyphsUrl, setGlyphsUrl] = useState<string | null>(null);
  const [bounds, setBounds] = useState<LngLatBounds | null>(null);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const mapRef = useRef<MapRef | null>(null);

  // The offline pack and the glyph bundle are read once, when the screen
  // opens. Neither needs the network, and neither may take the screen down.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const result = await loadOfflinePack();
        if (!cancelled) {
          setPack(result);
        }
      } catch (error) {
        console.warn(`maps: the offline pack could not be loaded: ${describe(error)}`);
      }
      try {
        const local = localGlyphsUrl();
        if (!cancelled) {
          setGlyphsUrl(local ?? getConfiguredGlyphsUrl());
        }
      } catch (error) {
        console.warn(`maps: the glyph bundle could not be read: ${describe(error)}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const tileSource: TileSource = useMemo(() => {
    const online = getConfiguredTileUrl();
    if (!pack) {
      return online ? { kind: 'online', url: online } : { kind: 'none' };
    }
    return resolveTileSource(pack.state, pack.locations, online);
  }, [pack]);

  const style = useMemo(
    () => getCourierStyle(themeName, tileSource.kind === 'none' ? null : tileSource.url, glyphsUrl),
    [themeName, tileSource, glyphsUrl],
  );

  const visibleStops = useMemo(() => stopsForMap(mockStops, bounds), [bounds]);

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
          <Camera initialViewState={{ center: MAP_CENTRE, zoom: 12 }} minZoom={4} maxZoom={19} />
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
          style={[styles.packStatus, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          pointerEvents="none"
        >
          <Text style={[styles.packStatusText, { color: theme.colors.textSecondary }]}>{packLabel}</Text>
        </View>

        <View
          testID="map-attribution"
          style={[styles.attribution, { backgroundColor: theme.colors.surface }]}
          pointerEvents="none"
        >
          {ATTRIBUTION_LINES.map((line) => (
            <Text key={line} style={[styles.attributionText, { color: theme.colors.textSecondary }]}>
              {line}
            </Text>
          ))}
        </View>
      </View>

      <View
        style={[
          styles.bottomControls,
          { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        ]}
      >
        <View style={styles.controlRow}>
          {THEME_CHOICES.map((choice) => {
            const selected = themeName === choice.name;
            return (
              <TouchableOpacity
                key={choice.name}
                testID={`map-theme-${choice.name}`}
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
                onPress={() => setTheme(choice.name)}
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

        <View style={styles.controlRow}>
          <Button
            variant="secondary"
            leftIcon={<MaterialCommunityIcons name="crosshairs-gps" size={18} color={theme.colors.textInverse} />}
            onPress={() => console.info('maps: centre the map on the courier')}
          >
            My location
          </Button>
          {mockStops.find((stop) => stop.status === 'active') ? (
            <Button
              variant="primary"
              leftIcon={<MaterialCommunityIcons name="arrow-right" size={18} color={theme.colors.textInverse} />}
              onPress={() => handleNavigateToStop(mockStops.find((stop) => stop.status === 'active')!)}
            >
              Next stop
            </Button>
          ) : null}
        </View>
      </View>

      <Modal
        visible={selectedStop !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedStop(null)}
      >
        <View style={styles.modalOverlay} onTouchStart={() => setSelectedStop(null)}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.colors.border }]} />
            {selectedStop ? (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalStatusBadge,
                      { backgroundColor: statusColor(selectedStop.status, theme) },
                    ]}
                  />
                  <Text style={[styles.modalStopNumber, { color: theme.colors.textPrimary }]}>
                    Stop #{selectedStop.sequence}
                  </Text>
                  <Badge variant={selectedStop.status === 'delivered' ? 'success' : 'outline'}>
                    {selectedStop.status}
                  </Badge>
                </View>
                <View style={styles.modalBody}>
                  <Text style={[styles.modalAddress, { color: theme.colors.textPrimary }]}>
                    {selectedStop.address}
                  </Text>
                  <Text style={[styles.modalSuburb, { color: theme.colors.textSecondary }]}>
                    {selectedStop.suburb}
                  </Text>
                  <View style={[styles.modalCoordinates, { borderTopColor: theme.colors.border }]}>
                    <Text style={[styles.modalCoordLabel, { color: theme.colors.textTertiary }]}>
                      Coordinates:
                    </Text>
                    <Text style={[styles.modalCoordValue, { color: theme.colors.textSecondary }]}>
                      {selectedStop.coordinates.lat.toFixed(6)}, {selectedStop.coordinates.lng.toFixed(6)}
                    </Text>
                  </View>
                </View>
                <View style={styles.modalActions}>
                  <Button
                    variant={selectedStop.status === 'delivered' ? 'outline' : 'primary'}
                    leftIcon={<MaterialCommunityIcons name="check" size={18} color={theme.colors.textPrimary} />}
                    onPress={() => handleMarkDelivered(selectedStop)}
                    disabled={selectedStop.status === 'delivered'}
                    style={styles.modalActionButton}
                  >
                    Delivered
                  </Button>
                  <Button
                    variant="secondary"
                    leftIcon={<MaterialCommunityIcons name="skip-next" size={18} color={theme.colors.textInverse} />}
                    onPress={() => handleSkipStop(selectedStop)}
                    style={styles.modalActionButton}
                  >
                    Skip
                  </Button>
                  <Button
                    variant="outline"
                    leftIcon={
                      <MaterialCommunityIcons name="navigation-variant" size={18} color={theme.colors.textPrimary} />
                    }
                    onPress={() => handleNavigateToStop(selectedStop)}
                    style={styles.modalActionButton}
                  >
                    Navigate
                  </Button>
                </View>
              </>
            ) : (
              <ActivityIndicator />
            )}
          </View>
        </View>
      </Modal>
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, maxHeight: '85%' },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, marginBottom: 16 },
  modalStatusBadge: { width: 12, height: 12, borderRadius: 6 },
  modalStopNumber: { fontSize: 18, fontWeight: '600', flex: 1 },
  modalBody: { paddingHorizontal: 24, marginBottom: 24 },
  modalAddress: { fontSize: 20, fontWeight: '500', marginBottom: 4 },
  modalSuburb: { fontSize: 16, marginBottom: 12 },
  modalCoordinates: { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1 },
  modalCoordLabel: { fontSize: 13, fontWeight: '500' },
  modalCoordValue: { fontSize: 13 },
  modalActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 24 },
  modalActionButton: { flex: 1 },
});
