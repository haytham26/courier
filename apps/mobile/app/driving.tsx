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
import { SafeAreaView, StyleSheet, Text, Pressable, View, useColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import {
  Camera,
  Map as MapView,
  Marker,
  NativeUserLocation,
} from '@maplibre/maplibre-react-native';

import { handOffToNavApp } from '@/maps/navHandoff';

import {
  ChosenProvider,
  GlassSurface,
  LocationDisclosure,
  MapButton,
  MapButtonColumn,
  SlideToDeliver,
  StopPin,
  TurnCard,
  useChosen,
} from '@/components/chosen';
import { radii, spacing, touch, typography } from '@courier/design-tokens/chosen';
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
import { useRun } from '@/maps/runState';
import { useMapBoot } from '@/maps/useMapBoot';
import { disclosureForThisBuild } from '@/location/disclosureForThisBuild';
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
  navButton: {
    marginTop: spacing.space12,
    minHeight: touch.minimum,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.space16,
  },
  navLabel: {
    fontSize: typography.label.size,
    fontWeight: typography.label.weight,
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

/**
 * The drive itself, exported so the night route (12-driving-night.html) renders
 * the SAME screen with the mode pinned to dark: one implementation, one place
 * to fix, and the design gate compares light against dark side by side.
 */
export function DrivingScreen() {
  const { t } = useChosen();
  const voice = useVoice();
  const scheme = useColorScheme();
  const { tileSource, glyphsUrl } = useMapBoot();

  // The map's day and night: the system's mode opens the drive, and the
  // map-style button turns it by hand - the night drive is its own
  // reference (12-driving-night.html).
  const [night, setNight] = useState(scheme === 'dark');
  const [locationAllowed, setLocationAllowed] = useState(false);
  // Audit B5: the prominent in-app disclosure for the background location is
  // on screen BEFORE the app asks for the permission (Play's review rule).
  const [disclosureVisible, setDisclosureVisible] = useState(false);
  const searchParams = useLocalSearchParams<{ disclose?: string }>();
  // The E2E seam: a drive opened with ?disclose=1 in the E2E build forces the
  // disclosure even when the emulator's pm grant already gave the
  // permission, so the flow can prove the order. A release build never
  // forces it.
  const forceDisclosure = searchParams.disclose === '1' && disclosureForThisBuild();

  // The run the drive moves on: the delivered marks live in the run state
  // above the routes (src/maps/runState.tsx - the boundary shift the
  // confirm panel recorded: a separate route cannot read this screen's own
  // state), so the slide here, the confirm panel (05) and the Route's
  // planner (08, later) read the same marks.
  const run = useRun();
  const router = useRouter();
  const deliveredIds = useMemo(() => run.delivered.map((event) => event.stopId), [run.delivered]);

  // A1 slice 3: the drive moves on the run's own stops, read through the same
  // store the marks are written to. The list is the day's own order, so the
  // drive, Today and the confirm panel all answer with the same next stop.
  const dayStops = run.day.stops;

  const active = activeOf(dayStops, deliveredIds);
  const after = active ? nextOf(dayStops, active.sequence, deliveredIds) : null;

  const distance = active ? formatDistance(haversineMeters(DRIVE_ORIGIN, positionOf(active))) : '—';

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
  // Audit B5: the permission is only REQUESTED after the disclosure's
  // Continue - the disclosure is what Play reviews, so it is never skipped
  // on the way to the system prompt.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const current = await Location.getForegroundPermissionsAsync();
        if (cancelled) {
          return;
        }
        if (current.granted && !forceDisclosure) {
          setLocationAllowed(true);
          return;
        }
        setDisclosureVisible(true);
      } catch {
        // The drive is useable without a fix: the map shows the run, and the
        // disclosure still comes first if a request follows.
        if (!cancelled) {
          setDisclosureVisible(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [forceDisclosure]);

  // The disclosure's one action: close the sheet, then ask. The emulator
  // pre-grants the permission, so in the E2E build this answers at once.
  const handleDisclosureContinue = useCallback(() => {
    setDisclosureVisible(false);
    hapticFor('confirm');
    void (async () => {
      try {
        const result = await Location.requestForegroundPermissionsAsync();
        setLocationAllowed(result.granted);
      } catch {
        setLocationAllowed(false);
      }
    })();
  }, []);

  // Queue 4.1: the navigation hand-off. The destination is the run's own
  // stop, and the hand-off answers what happened - a phone with no nav app
  // is told, rather than left in a silence.
  const handleNavHandoff = useCallback(() => {
    if (!active) {
      return;
    }
    hapticFor('confirm');
    void handOffToNavApp({
      lat: active.coordinates.lat,
      lng: active.coordinates.lng,
      // The whole address: the street and the suburb, the way the courier
      // would say it out loud.
      label: active.suburb.length > 0 ? `${active.address}, ${active.suburb}` : active.address,
    }).then((answer) => {
      if (answer.status === 'failed') {
        console.warn(`driving: the nav hand-off did not open (${answer.message})`);
      }
    });
  }, [active]);

  const handleDeliver = useCallback(() => {
    // The slide carries the success haptic; here the mark moves the run and
    // the confirm panel (05) takes over: the courier undoes it, or takes
    // the drive's next stop.
    if (!active) {
      return;
    }
    run.markDelivered(active);
    router.push(`/delivered?stop=${active.id}`);
  }, [active, run, router]);

  const handleNight = useCallback(() => {
    setNight((current) => !current);
    hapticFor('confirm');
  }, []);

  const handleCopilot = useCallback(() => {
    hapticFor('voice');
    void voice.startListening();
    // The voice session starts, and Copilot's own surface opens over the
    // map so the driver can read what was said (screen 07).
    router.push('/copilot');
  }, [router, voice]);

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
        {dayStops.map((stop) => (
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
              {active ? `STOP ${active.sequence} OF ${dayStops.length}` : 'THE RUN IS DELIVERED'}
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
        {/* Queue 4.1: the navigation hand-off. The drive's own map is not a
            nav engine, and a courier mid-shift needs turn-by-turn, so the
            stop is handed to the nav app the courier already has with the
            key-free Google Maps deep link. The destination is the run's own
            stop, so the hand-off carries the run and not an invented one. */}
        {active ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${streetLine(active.address)} in the nav app`}
            accessibilityHint="Opens the stop in the phone's navigation app"
            onPress={handleNavHandoff}
            testID="driving-nav-handoff"
            style={[styles.navButton, { backgroundColor: t.colors.accent }]}
          >
            <Text style={[styles.navLabel, { color: t.colors.accentText }]} maxFontSizeMultiplier={1.4}>
              Open in nav app
            </Text>
          </Pressable>
        ) : null}
      </GlassSurface>

      {/* Audit B5: the prominent background-location disclosure, shown
          before the permission request (and reachable from the settings). */}
      <LocationDisclosure
        visible={disclosureVisible}
        onContinue={handleDisclosureContinue}
      />
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
