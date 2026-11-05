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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Map as MapView, Marker } from '@maplibre/maplibre-react-native';

import { ChosenProvider, GlassSurface, Segmented, StopPin, Timeline, useChosen } from '@/components/chosen';
import type { TimelineItem } from '@/components/chosen';
import { errorMessage } from '@/lib/errors';
import { CourierApiClient } from '@/lib/api-client';
import type { RouteOrderEntry } from '@/run/types';
import { radii, spacing, typography } from '@courier/design-tokens/chosen';
import { DRIVE_ORIGIN_LNGLAT } from '@/maps/drive';
import { type Stop } from '@/maps/stops';
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

/** The app's one HTTP boundary: the trial's queue 4.2 asks the server's solver. */
const apiClient = new CourierApiClient();

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
  // One ask at a time: a second press while the solver is working would race
  // two answers into one note.
  const [optimising, setOptimising] = useState(false);
  // The screen's own lifetime: a note the courier has already navigated away
  // from must not be written, which React names as one.
  const aliveRef = useRef(true);
  useEffect(() => () => {
    aliveRef.current = false;
  }, []);

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
  // A4: the stops are the run's own, from the day the store holds.
  const marksCount = run.delivered.length;
  const stops = run.day.stops;

  const counts = useMemo(() => {
    const tally: Record<SegmentKey, number> = { 'to-go': 0, later: 0, done: 0 };
    for (const stop of stops) tally[segmentOf(stop, run)] += 1;
    return tally;
  }, [marksCount, run, stops]);

  const shown = useMemo(
    () => stops.filter((stop) => segmentOf(stop, run) === segment),
    [segment, marksCount, run, stops],
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
    // The trial's queue 4.2: the solver runs on the server
    // (`POST /runs/{run_id}/route:reopt`), so the order the courier drives is
    // the order the server worked out - never a phone's own guess at one. The
    // stops the courier has not driven yet are the ones the solver re-places.
    //
    // BUG-189: the run's own id is the request's subject, and a press before
    // the day has been read is a press about no run. The boundary refuses such
    // a call itself (see ApiOutcome 'refused'); the screen also answers here
    // rather than asking a question with no subject.
    const runId = run.day.runId;
    if (runId === null || runId.trim().length === 0) {
      setOptimiseNote(
        'The day is still being read from the server, so there is no run to reorder yet.',
      );
      return;
    }
    // A second press while the first is in flight would ask the solver twice
    // for the same day and race two answers into one note. One ask at a time.
    if (optimising) {
      return;
    }
    const affected = stops
      .filter((stop) => segmentOf(stop, run) !== 'done')
      .map((stop) => stop.id);
    if (affected.length < 2) {
      setOptimiseNote('Fewer than two stops are left, so there is nothing to reorder.');
      return;
    }
    hapticFor('confirm');
    setOptimising(true);
    setOptimiseNote('Asking the server to resequence the run...');
    void (async () => {
      try {
        const answer = await apiClient.reoptRoute(runId, affected);
        // The screen may have moved on: a note written after the courier left
        // is a state update on an unmounted tree, which React names as one.
        if (!aliveRef.current) {
          return;
        }
        if (answer.status === 'refused') {
          setOptimiseNote(`${answer.message}. The order stays as it is.`);
          return;
        }
        if (answer.status !== 'ok') {
          const why =
            answer.status === 'unauthorized'
              ? 'the session is no longer valid'
              : answer.status === 'offline'
                ? 'there was no signal'
                : answer.message;
          setOptimiseNote(`The solver could not be asked (${why}). The order stays as it is.`);
          return;
        }
        // The answer's own order, applied to the day the phone holds: the
        // server stores the plan and not the stops' own sequence, so its answer
        // is the only place a new order exists. The courier is told the day
        // changed only once the phone actually carries the change.
        //
        // The contract's answer carries its stops as free records, so the
        // screen narrows each one the way it reads it: a stop the app cannot
        // name cannot be reordered onto the courier's day.
        const order: RouteOrderEntry[] = [];
        let readable = true;
        for (const stop of answer.data.stops) {
          const stopId = stop.stop_id;
          const sequence = stop.sequence;
          if (typeof stopId !== 'string' || typeof sequence !== 'number') {
            readable = false;
            break;
          }
          order.push({ stopId, sequence });
        }
        if (!readable) {
          setOptimiseNote(
            'The server answered with an order the app could not read, so the route is unchanged.',
          );
          return;
        }
        const applied = await run.applyRouteOrder(order);
        if (!aliveRef.current) {
          return;
        }
        if (!applied) {
          setOptimiseNote(
            'The server resequenced the run, but the phone could not keep the new order, so the route is unchanged.',
          );
          return;
        }
        // The contract's own field: the day's finish-time delta in SECONDS.
        const delta = answer.data.finish_delta_s;
        const shape =
          typeof delta !== 'number'
            ? ''
            : ` The day now finishes ${Math.abs(Math.round(delta / 60))} min ${delta < 0 ? 'earlier' : 'later'}.`;
        setOptimiseNote(`The server resequenced the run.${shape}`);
      } catch (error) {
        if (aliveRef.current) {
          setOptimiseNote(
            `The solver could not be asked (${errorMessage(error)}). The order stays as it is.`,
          );
        }
      } finally {
        if (aliveRef.current) {
          setOptimising(false);
        }
      }
    })();
  }, [optimising, run, stops]);

  return (
    <View testID="stops-screen" style={styles.screen}>
      <MapView testID="stops-map" mapStyle={mapStyle} style={styles.map}>
        <Camera initialViewState={{ center: DRIVE_ORIGIN_LNGLAT, zoom: 12 }} minZoom={4} maxZoom={19} />
        {stops.map((stop) => (
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
            // BUG-189: the request's subject is the run's own id, so the
            // control is not answerable until the day has been read - and not
            // answerable twice while one ask is in flight.
            disabled={run.day.runId === null || optimising}
            testID="stops-optimise"
            style={({ pressed }) => [
              styles.optimise,
              { backgroundColor: t.colors.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.optimiseLabel, { color: t.colors.onAccent }]}>
              {optimising ? 'Reordering\u2026' : 'Optimise'}
            </Text>
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
