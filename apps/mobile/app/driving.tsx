/**
 * The drive (04-driving.html): the map fills the screen, the turn card and
 * the Then strip read at a glance at the top (no control in the top band,
 * REVIEW-C5), the map buttons ride under the card on the right, and the
 * glass panel at the bottom carries the run: the stop number, the street,
 * the slide as the one action.
 *
 * A root-stack route, not a tab: the D34 dock belongs to the run's
 * launches; the drive owns the whole screen. The way in is the Go on
 * Today - the camera command rides the channel so the map the driver left
 * behind keeps looking at the next stop.
 *
 * The numbers never invent themselves (MASTER_EXECUTION §13.2): the stop
 * is the run's next stop (the same one Today reads, the same-stop
 * contract), the distance is the straight line from the map's home
 * centre, the street is the address's street line. The reference's right
 * column (an arrival estimate) stays out until a real model exists - a
 * made-up minute on a driver's screen is not a choice. The night drive is
 * its own reference (12-driving-night.html): the map starts on the
 * system's mode and the map-style button turns it by hand (§13.3), the
 * icon and the label flip with it.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import * as Location from 'expo-location';
import {
  Camera,
  Map as MapView,
  Marker,
  NativeUserLocation,
} from '@maplibre/maplibre-react-native';

import {
  ChosenProvider,
  GlassSurface,
  MapButton,
  MapButtonColumn,
  SlideToDeliver,
  StopPin,
  TurnCard,
  useChosen,
} from '@/components/chosen';
import { spacing, typography } from '@courier/design-tokens/chosen';
import { hapticFor } from '@/motion/haptics';
import { TILTED_PITCH } from '@/maps/cameraCommands';
import {
  DRIVE_ORIGIN,
  DRIVE_ORIGIN_LNGLAT,
  activeOf,
  formatDistance,
  haversineMeters,
  nextOf,
  positionOf,
  streetLine,
} from '@/maps/drive';
import { getCourierStyle } from '@/maps/styles';
import { mockStops } from '@/maps/stops';
import { useMapBoot } from '@/maps/useMapBoot';
import { useVoice } from '@/voice/useVoice';

/** The map's home zoom: the run's stops all sit inside it. */
const MAP_ZOOM = 12;

/** The grabber's size (the reference's 36 x 5 handle; the colour is the token). */
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
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  buttonsRow: {
    alignItems: 'flex-end',
    marginTop: spacing.space12,
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
    alignItems: 'flex-start',
    gap: spacing.space16,
  },
  headerLeft: {
    flex: 1,
    gap: spacing.space4,
  },
  stopCount: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: typography.secondary.weight,
  },
  street: {
    fontSize: typography.stat.size,
    lineHeight: typography.stat.lineHeight,
    fontWeight: typography.stat.weight,
  },
  suburb: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.weight,
  },
});

function DrivingScreen() {
  const { t } = useChosen();
  const voice = useVoice();
  const scheme = useColorScheme();
  const { tileSource, glyphsUrl } = useMapBoot();

  // The map's day and night: the system's mode opens the drive, and the
  // map-style button turns it by hand - the night drive is its own
  // reference (12-driving-night.html).
  const [night, setNight] = useState(scheme === 'dark');
  const [locationAllowed, setLocationAllowed] = useState(false);

  // The run the drive moves on: the screen's own copy of the day's stops
  // (the same boundary Today recorded - the shared write path lands with
  // the Route screen).
  const [deliveredIds, setDeliveredIds] = useState<string[]>([]);

  const active = activeOf(mockStops, deliveredIds);
  const after = active ? nextOf(mockStops, active.sequence, deliveredIds) : null;

  const distance = active
    ? formatDistance(haversineMeters(DRIVE_ORIGIN, positionOf(active)))
    : '—';

  const mapStyle = useMemo(
    () =>
      getCourierStyle(
        night ? 'night' : 'day',
        tileSource.kind === 'none' ? null : tileSource.url,
        glyphsUrl,
        // The drive is 3D by default (MASTER_EXECUTION §13.8.1): the
        // buildings rise when the pack has their outlines.
        { labelSize: 'normal', buildings: true, buildings3d: true, satellite: null },
      ),
    [night, tileSource, glyphsUrl],
  );

  // The position engine: without a grant the drive still reads (the map
  // stays centred on the run), with one the camera follows the vehicle.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const result = await Location.requestForegroundPermissionsAsync();
        if (!cancelled) {
          setLocationAllowed(result.granted);
        }
      } catch {
        // The drive is useable without a fix: the map shows the run.
        setLocationAllowed(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeliver = useCallback(() => {
    // The slide carries the success haptic: here the run moves on.
    setDeliveredIds((current) =>
      active ? [...current, active.id] : current,
    );
  }, [active]);

  const handleNight = useCallback(() => {
    setNight((current) => !current);
    hapticFor('confirm');
  }, []);

  const handleCopilot = useCallback(() => {
    hapticFor('voice');
    void voice.startListening();
  }, [voice]);

  return (
    <SafeAreaView testID="driving-screen" style={styles.container}>
      {/* The map is the screen: the drive rides on it, heading up. */}
      <MapView testID="driving-map" mapStyle={mapStyle} style={styles.map}>
        <Camera
          initialViewState={{ center: DRIVE_ORIGIN_LNGLAT, zoom: MAP_ZOOM }}
          minZoom={4}
          maxZoom={19}
          pitch={TILTED_PITCH}
          bearing={0}
          trackUserLocation={locationAllowed ? 'heading' : undefined}
        />
        {locationAllowed ? <NativeUserLocation /> : null}
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

      {/* The glance of the road ahead, and the map buttons under it. */}
      <View pointerEvents="box-none" style={styles.top}>
        <TurnCard
          testID="driving-turn"
          distance={distance}
          street={active ? streetLine(active.address) : ''}
          thenStreet={after ? streetLine(after.address) : undefined}
        />
        <View pointerEvents="box-none" style={styles.buttonsRow}>
          <MapButtonColumn>
            <MapButton
              name={night ? 'sunny' : 'moon'}
              tone="label"
              accessibilityLabel={night ? 'Day map' : 'Night map'}
              onPress={handleNight}
              testID="driving-map-style"
            />
            <MapButton
              name="mic"
              tone="accent"
              accessibilityLabel="Copilot"
              onPress={handleCopilot}
              testID="driving-copilot"
            />
          </MapButtonColumn>
        </View>
      </View>

      {/* The drive panel: the run, the street, the slide. */}
      <GlassSurface kind="sheet" testID="driving-panel" style={styles.panel}>
        <View style={styles.grabberRow}>
          <View style={[styles.grabber, { backgroundColor: t.colors.grabber }]} />
        </View>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={[styles.stopCount, { color: t.colors.secondaryLabel }]}>
              {active ? `STOP ${active.sequence} OF ${mockStops.length}` : 'THE RUN IS DELIVERED'}
            </Text>
            <Text style={[styles.street, { color: t.colors.label }]}>
              {active ? streetLine(active.address) : ''}
            </Text>
            <Text style={[styles.suburb, { color: t.colors.secondaryLabel }]}>
              {active ? active.suburb : ''}
            </Text>
          </View>
          {/* The reference's right column (an arrival estimate) returns with
              the position stream: no model, no invented minute. */}
        </View>
        <SlideToDeliver testID="driving-slide" onDeliver={handleDeliver} />
      </GlassSurface>
    </SafeAreaView>
  );
}

/**
 * The screen carries its own provider: a root route sits outside the tabs
 * and cannot read the tabs' one, so the light and the dark resolve here.
 * The Go on Today navigates here; the drive's own navigation (the Copilot
 * hand-off) comes with screen 07.
 */
export default function DrivingRoute() {
  const scheme = useColorScheme();

  return (
    <ChosenProvider mode={scheme === 'dark' ? 'dark' : 'light'}>
      <DrivingScreen />
    </ChosenProvider>
  );
}
