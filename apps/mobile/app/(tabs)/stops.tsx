/**
 * Route - the run as a timeline, on the chosen tokens (T6 slice 3, screen 08).
 *
 * The reference (08-route.html): the map is the scene, and the glass sheet
 * from the top carries the route - its title, Optimise, the three states of
 * a stop (To go / Later / Done) as one segmented control, and the timeline
 * that reads the run in order. A row is the stop: its number, the address,
 * and the minute the run recorded for it.
 *
 * This route was the last one still speaking the LEGACY theme (its own copy
 * of the stops, `@/providers/ThemeProvider`, the old Sheet and Button). It now
 * reads the ONE token file like every other screen, and it reads the SHARED
 * run (`@/maps/stops` + `@/maps/runState`) instead of a private copy of it,
 * so a stop delivered on the drive is the same stop here (the same-stop
 * contract the confirm and Today read).
 *
 * The Maestro testIDs are the contract and they stay: `stops-screen`,
 * `stop-<id>` for a row, `stop-detail-sheet` for the sheet a row opens. The
 * words moved with the design; the testIDs did not.
 *
 * Optimise: the control is real and it answers honestly. There is no solver
 * on the phone (the router is the backend session's, and Part C wires it), so
 * pressing Optimise says so in one line rather than reordering a route it
 * cannot. The record is in the evidence sheet; the button is never faked.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Map as MapView, Marker } from '@maplibre/maplibre-react-native';

import { ChosenProvider, GlassSurface, Segmented, StopPin, Timeline, useChosen } from '@/components/chosen';
import type { TimelineItem } from '@/components/chosen';
import { radii, spacing, typography } from '@courier/design-tokens/chosen';
import { DRIVE_ORIGIN_LNGLAT } from '@/maps/drive';
import { mockStops, type Stop } from '@/maps/stops';
import { useRun, type RunState } from '@/maps/runState';
import { useMapBoot } from '@/maps/useMapBoot';
import { getCourierStyle } from '@/maps/styles';
import { hourMinuteOf } from '@/maps/drive';
import { hapticFor } from '@/motion/haptics';

/** The three states of a stop, as the reference's segmented control names them. */
const SEGMENTS = [
  { key: 'to-go', label: 'To go' },
  { key: 'later', label: 'Later' },
  { key: 'done', label: 'Done' },
] as const;

type SegmentKey = (typeof SEGMENTS)[number]['key'];

/**
 * Which segment a stop's status sits in.
 *
 * The run decides, not the list (BUG-080, the C1 audit's medium finding): a
 * stop the courier delivered is the run's own mark, and reading the immutable
 * `mockStops[].status` instead put a stop delivered on Driving back under
 * "To go" - the two screens disagreeing about the same delivery. The list's
 * own statuses stay for what they are: the plan's shape, so a stop the plan
 * already called delivered, skipped or failed keeps its segment, and a mark
 * the run made on top of the plan moves the stop to "Done".
 *
 * The run is passed rather than its `isDelivered` method: the method belongs
 * to the run object and the screen's own lint rule refuses a detached method
 * reference, which is the same reason every other call site in the app calls
 * it as `run.isDelivered(...)`.
 */
const segmentOf = (stop: Stop, run: RunState): SegmentKey =>
  run.isDelivered(stop.id) || stop.status === 'delivered'
    ? 'done'
    : stop.status === 'skipped' || stop.status === 'failed'
      ? 'later'
      : 'to-go';

function RouteScreen() {
  const { t } = useChosen();
  const router = useRouter();
  const run = useRun();
  const { tileSource, glyphsUrl } = useMapBoot();

  const [segment, setSegment] = useState<SegmentKey>('to-go');
  const [selected, setSelected] = useState<Stop | null>(null);
  const [optimiseNote, setOptimiseNote] = useState<string | null>(null);

  // The minute a delivered stop landed: the run's own event, never a copy.
  const minuteOf = useCallback(
    (stopId: string) => {
      const event = run.delivered.find((entry) => entry.stopId === stopId);
      return event ? hourMinuteOf(event.at) : undefined;
    },
    [run.delivered],
  );

  // The run's marks are the dependency: `isDelivered` is a callback the run
  // rebuilds whenever its marks move, so the length of the marks is what the
  // memo reads - and it is what this screen already keyed its minutes on.
  const marksCount = run.delivered.length;

  const counts = useMemo(() => {
    const tally: Record<SegmentKey, number> = { 'to-go': 0, later: 0, done: 0 };
    for (const stop of mockStops) tally[segmentOf(stop, run)] += 1;
    return tally;
  }, [marksCount, run]);

  const shown = useMemo(
    () => mockStops.filter((stop) => segmentOf(stop, run) === segment),
    [segment, marksCount, run],
  );

  const mapStyle = useMemo(
    () =>
      getCourierStyle('day', tileSource.kind === 'none' ? null : tileSource.url, glyphsUrl, {
        labelSize: 'normal',
        buildings: true,
        buildings3d: false,
        satellite: null,
      }),
    [tileSource, glyphsUrl],
  );

  const handleOptimise = useCallback(() => {
    hapticFor('confirm');
    setOptimiseNote(
      'Optimising the route needs the solver, which runs on the server and is wired with the API (Part C). Nothing is reordered on the phone.',
    );
  }, []);

  return (
    <View testID="stops-screen" style={styles.screen}>
      <MapView testID="stops-map" mapStyle={mapStyle} style={styles.map}>
        <Camera initialViewState={{ center: DRIVE_ORIGIN_LNGLAT, zoom: 12 }} minZoom={4} maxZoom={19} />
        {mockStops.map((stop) => (
          <Marker
            key={stop.id}
            testID={`stops-marker-${stop.sequence}`}
            lngLat={[stop.coordinates.lng, stop.coordinates.lat]}
            anchor="bottom"
          >
            <View testID={`stops-pin-${stop.sequence}`}>
              <StopPin number={String(stop.sequence)} />
            </View>
          </Marker>
        ))}
      </MapView>

      <GlassSurface kind="sheet" testID="stops-panel" style={styles.panel}>
        <View style={styles.headerRow}>
          <Text testID="stops-title" style={[styles.title, { color: t.colors.label }]} accessibilityRole="header">
            Route
          </Text>
          <Pressable
            accessible
            role="button"
            accessibilityLabel="Optimise the route"
            accessibilityHint="Resequences the run with the solver"
            onPress={handleOptimise}
            testID="stops-optimise"
            style={({ pressed }) => [
              styles.optimise,
              { backgroundColor: t.colors.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.optimiseLabel, { color: t.colors.onAccent }]}>Optimise</Text>
          </Pressable>
        </View>

        <Segmented
          options={SEGMENTS.map((entry) => ({ ...entry, count: counts[entry.key] }))}
          value={segment}
          onChange={(key) => setSegment(key as SegmentKey)}
          testID="stops-segment"
        />

        {optimiseNote === null ? null : (
          <Text testID="stops-optimise-note" style={[styles.note, { color: t.colors.secondaryLabel }]}>
            {optimiseNote}
          </Text>
        )}

        <ScrollView contentContainerStyle={styles.list} testID="stops-list">
          {shown.length === 0 ? (
            <Text testID="stops-empty" style={[styles.empty, { color: t.colors.secondaryLabel }]}>
              Nothing here for {segment === 'done' ? 'Done' : segment === 'later' ? 'Later' : 'To go'}.
            </Text>
          ) : (
            <Timeline
              items={shown.map((stop): TimelineItem => {
                const inDone = segmentOf(stop, run) === 'done';
                const state: TimelineItem['state'] =
                  inDone ? 'done' : stop.status === 'active' ? 'next' : 'later';
                return {
                  id: stop.id,
                  street: stop.address,
                  time: inDone ? minuteOf(stop.id) : undefined,
                  state,
                  icon: inDone ? 'checkmark-circle' : 'ellipse-outline',
                  onPress: () => setSelected(stop),
                  // The Maestro contract: a row is `stop-<id>`.
                  testID: `stop-${stop.id}`,
                };
              })}
              testID="stops-timeline"
            />          )}
        </ScrollView>
      </GlassSurface>

      {/* The stop a row opens: the run's own stop, with the suburb the flow
          asserts. It is the same sheet gesture the drive uses. */}
      {selected === null ? null : (
        <>
          <Pressable
            style={styles.scrim}
            accessibilityLabel="Close the stop"
            onPress={() => setSelected(null)}
            testID="stops-scrim"
          />
          <GlassSurface kind="sheet" testID="stop-detail-sheet" style={styles.detail}>
            <View style={styles.detailHeader}>
              <Text style={[styles.detailTitle, { color: t.colors.label }]}>{selected.address}</Text>
              <Text style={[styles.detailSuburb, { color: t.colors.secondaryLabel }]}>{selected.suburb}</Text>
            </View>
            <Pressable
              accessible
              role="button"
              accessibilityLabel="Drive to this stop"
              accessibilityHint="Opens the drive for this stop"
              onPress={() => {
                setSelected(null);
                router.push('/driving');
              }}
              testID="stop-detail-drive"
              style={({ pressed }) => [
                styles.detailAction,
                { backgroundColor: t.colors.accent, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.detailActionLabel, { color: t.colors.onAccent }]}>Drive</Text>
            </Pressable>
          </GlassSurface>
        </>
      )}
    </View>
  );
}

export default function RouteTab() {
  const scheme = useColorScheme();
  return (
    <ChosenProvider mode={scheme === 'dark' ? 'dark' : 'light'}>
      <RouteScreen />
    </ChosenProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  map: { flex: 1 },
  panel: {
    position: 'absolute',
    left: spacing.space12,
    right: spacing.space12,
    top: spacing.space32,
    paddingTop: spacing.space12,
    paddingHorizontal: spacing.space20,
    paddingBottom: spacing.space24,
    gap: spacing.space12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.space12,
  },
  title: {
    // The design's own type scale names a screen's large title 34 (README
    // "Large title 34/41 bold"); the reference HTML's 28 has no token row and
    // the editable-by-design rule is that the token file wins.
    fontSize: typography.largeTitle.size,
    lineHeight: typography.largeTitle.lineHeight,
    fontWeight: typography.largeTitle.weight,
  },
  optimise: {
    height: spacing.space48,
    paddingHorizontal: spacing.space20,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optimiseLabel: {
    fontSize: typography.button.size,
    lineHeight: typography.button.lineHeight,
    fontWeight: typography.button.weight,
  },
  note: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
  },
  list: {
    paddingBottom: spacing.space64,
    gap: spacing.space8,
  },
  empty: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    paddingVertical: spacing.space24,
    textAlign: 'center',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  detail: {
    position: 'absolute',
    left: spacing.space8,
    right: spacing.space8,
    bottom: spacing.space64,
    padding: spacing.space20,
    gap: spacing.space12,
  },
  detailHeader: { gap: spacing.space4 },
  detailTitle: {
    fontSize: typography.largeTitle.size,
    lineHeight: typography.largeTitle.lineHeight,
    fontWeight: typography.largeTitle.weight,
  },
  detailSuburb: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
  },
  detailAction: {
    height: spacing.space48,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailActionLabel: {
    fontSize: typography.button.size,
    lineHeight: typography.button.lineHeight,
    fontWeight: typography.button.weight,
  },
});
