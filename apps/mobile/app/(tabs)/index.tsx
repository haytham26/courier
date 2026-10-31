/**
 * Today - the opening screen on the chosen tokens (T6 slice 3).
 *
 * The map is the backdrop (the run lives on it), and the glass sheet on the
 * sheet envelope carries the day: the morning brief line, the three
 * numbers, the next stop with its Go, and the day's actions. The Maestro
 * testIDs (`today-*`) are the contract, so they stay; the settings
 * affordance moved to the Account tab (D34), which the flow now asserts.
 *
 * The copy is plain New Zealand English, there is no emoji anywhere, and
 * every control has an accessibility label and a role.
 */
import React, { useCallback, useEffect, useMemo } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Camera, Map as MapView, Marker } from '@maplibre/maplibre-react-native';

import {
  BottomSheet,
  MapButton,
  MapButtonColumn,
  NoteChips,
  StatRow,
  StopPin,
  TopPills,
  useChosen,
} from '@/components/chosen';
import { errorMessage } from '@/lib/errors';
import { hapticFor } from '@/motion/haptics';
import { useRun } from '@/maps/runState';
import { getCourierStyle } from '@/maps/styles';
import type { Stop } from '@/maps/stops';
import { useSyncAnswers } from '@/sync/syncAnswers';
import { useMapBoot } from '@/maps/useMapBoot';
import { publishVoiceCommand } from '@/voice/commandChannel';
import { useVoice } from '@/voice/useVoice';
import { radii, spacing, touch, typography, type Tokens } from '@courier/design-tokens/chosen';
import { useBriefOfTabs } from './briefContext';

/** Christchurch, the middle of the region the pack covers. */
const MAP_CENTRE: [number, number] = [172.636, -43.533];

/** The minutes one delivered stop takes, for the finish estimate. */
const MINUTES_PER_STOP = 5;

/** The sheet floor sits above the dock: the bar, its caption and its raise. */
const SHEET_INSET = spacing.space64 + spacing.space32 + spacing.space4;

const RUN_NAME = 'Northwood AM';

const BRIEF_FALLBACK = 'Five stops on the Northwood AM run. Dry until the afternoon.';

const TODAY_NOTE_CHIPS = [
  { icon: 'home' as const, tone: 'accent' as const, label: 'Side gate' },
  { icon: 'cube' as const, tone: 'info2' as const, label: 'Shelf B3' },
];

/** The clock time the run finishes at, as an estimate the courier can trust. */
const finishTime = (stopsLeft: number): string => {
  const at = new Date(Date.now() + stopsLeft * MINUTES_PER_STOP * 60 * 1000);
  return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
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
  sheetScroll: {
    flex: 1,
  },
  sheetContent: {
    gap: spacing.space16,
    paddingHorizontal: spacing.space24,
    paddingBottom: spacing.space64,
  },
  greetingRow: {
    gap: spacing.space8,
  },
  greeting: {
    fontSize: typography.paragraph.size,
    lineHeight: typography.paragraph.lineHeight,
    fontWeight: typography.paragraph.weight,
  },
  driverName: {
    fontSize: typography.streetTitle.size,
    lineHeight: typography.streetTitle.lineHeight,
    fontWeight: '700',
    fontFamily: typography.family.numbers.iOS,
  },
  briefLine: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.weight,
  },
  syncNote: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: typography.secondary.weight,
  },
  sectionLabel: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: typography.secondary.weight,
  },
  nextStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space16,
  },
  nextStopText: {
    flex: 1,
    gap: spacing.space8,
  },
  street: {
    fontSize: typography.streetTitle.size,
    lineHeight: typography.streetTitle.lineHeight,
    fontWeight: typography.streetTitle.weight,
  },
  chips: {
    paddingRight: spacing.space8,
  },
  goButton: {
    height: touch.drivingAction,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.space24,
    minWidth: spacing.space48 + spacing.space48,
  },
  goLabel: {
    fontSize: typography.button.size,
    lineHeight: typography.button.lineHeight,
    fontWeight: typography.button.weight,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.space12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.space12,
  },
  ghostButton: {
    flex: 1,
    height: touch.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space8,
  },
  ghostLabel: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.weight,
  },
});

export default function TodayScreen() {
  const { t } = useChosen();
  const router = useRouter();
  const voice = useVoice();
  const courierVoice = useBriefOfTabs();
  const { tileSource, glyphsUrl } = useMapBoot();
  // A1 slice 3: the day is read from the one run store the marks are written
  // to, so Today shows the day the phone holds (and not a mock's copy of it),
  // and a stop delivered on the drive is a stop Today counts. The write path
  // is the run state's own, which records the delivery into the outbox.
  const run = useRun();
  const day = run.day;
  // What the server answered the last send (ADR-014's conflicts and
  // quarantine, in the courier's words): the outbox reports it, this screen
  // says it.
  const answers = useSyncAnswers();

  const stops = day.stops;
  const remaining = useMemo(() => stops.filter((stop) => !day.isDelivered(stop.id)), [stops, day]);
  const delivered = useMemo(() => stops.filter((stop) => day.isDelivered(stop.id)), [stops, day]);
  const nextStop: Stop | null = day.nextStop;
  const progress = stops.length === 0 ? 0 : delivered.length / stops.length;

  const style = useMemo(
    () =>
      getCourierStyle('day', tileSource.kind === 'none' ? null : tileSource.url, glyphsUrl, {
        labelSize: 'normal',
        buildings: true,
        buildings3d: false,
        satellite: null,
      }),
    [tileSource, glyphsUrl],
  );

  // The morning brief, asked for once: the line the voice wants to say
  // first. A failure keeps the fallback sentence; the screen never goes
  // quiet because the service did (MASTER_EXECUTION §12).
  useEffect(() => {
    void (async () => {
      try {
        await courierVoice?.refreshBrief();
      } catch (error) {
        console.warn(`today: the brief could not be read: ${errorMessage(error)}`);
      }
    })();
  }, [courierVoice]);

  const handleMarkDone = useCallback(
    (stop: Stop) => {
      // The write path is the run state's own: the mark is written through the
      // store (so it survives a cold start) and the delivery is recorded in the
      // outbox, which sends it when there is signal (A1 slice 3).
      run.markDelivered(stop);
      hapticFor('deliver');
    },
    [run],
  );

  // A skipped stop and a failed one are both still on the run: the run state
  // keeps them, and Today's own copy of them is gone (C1 squad 1 #15). The
  // haptics are the screen's own answer to the courier's hand.
  const handleSkip = useCallback((_stop: Stop) => {
    hapticFor('confirm');
  }, []);

  const handleFail = useCallback((_stop: Stop) => {
    hapticFor('error');
  }, []);

  // The Go starts the drive: the command zooms the drive camera to the next
  // stop, and the router hands the courier to the driving screen.
  const handleGo = useCallback(() => {
    if (!nextStop) {
      return;
    }
    publishVoiceCommand({ type: 'zoom_to_next_stop' });
    router.navigate('/driving');
  }, [nextStop, router]);

  const handleRecentre = useCallback(() => {
    publishVoiceCommand({ type: 'zoom_to_next_stop' });
    router.navigate('/map');
  }, [router]);

  const handleScan = useCallback(() => {
    router.push('/scan');
  }, [router]);

  const handleAddByVoice = useCallback(() => {
    hapticFor('voice');
    void voice.startListening();
  }, [voice]);

  const ghost = (c: Tokens['colors']): { backgroundColor: string; borderRadius: number } => ({
    backgroundColor: c.fill,
    borderRadius: radii.ghostButton,
  });

  return (
    <SafeAreaView testID="today-screen" style={styles.container}>
      {/* The map is the backdrop: the run is on it, the sheet floats above. */}
      <View style={styles.map}>
        <MapView testID="today-map" mapStyle={style} style={styles.map}>
          <Camera initialViewState={{ center: MAP_CENTRE, zoom: 12 }} minZoom={4} maxZoom={19} />
          {stops.map((stop) => (
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
      </View>

      <View style={styles.pills}>
        <TopPills runName={RUN_NAME} weather="Rain 2 pm" weatherIcon="cloud" />
      </View>

      <View style={styles.mapButtons}>
        <MapButtonColumn>
          <MapButton
            name="layers"
            tone="label"
            accessibilityLabel="Map style"
            onPress={() => router.navigate('/map')}
            testID="today-map-style"
          />
          <MapButton
            name="locate"
            tone="accent"
            accessibilityLabel="Recentre"
            onPress={handleRecentre}
            testID="today-recentre"
          />
        </MapButtonColumn>
      </View>

      <BottomSheet height="peek" bottomInset={SHEET_INSET} testID="today-sheet">
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.greetingRow}>
            <Text style={[styles.greeting, { color: t.colors.secondaryLabel }]}>Good morning</Text>
            <Text style={[styles.driverName, { color: t.colors.label }]}>Driver</Text>
            <Text
              style={[styles.briefLine, { color: t.colors.secondaryLabel }]}
              maxFontSizeMultiplier={1.4}
            >
              {courierVoice?.brief?.text ?? BRIEF_FALLBACK}
            </Text>
          </View>

          <StatRow
            items={[
              { label: 'Delivered', value: String(delivered.length), tone: 'success' as const },
              { label: 'To go', value: String(remaining.length) },
              { label: 'Finish', value: finishTime(remaining.length) },
            ]}
            progress={progress}
          />

          {/* ADR-014's answers, in the courier's own words (A1 slice 3): a
              delivery that could not be sent, or that the server already had,
              is said out loud here rather than hidden in a log. A courier who
              is told "all good" while three deliveries are quarantined is
              being lied to. */}
          {answers.message !== null ? (
            <Text
              testID="today-sync-note"
              accessibilityLiveRegion="polite"
              style={[styles.syncNote, { color: t.colors.secondaryLabel }]}
              maxFontSizeMultiplier={1.4}
            >
              {answers.message}
            </Text>
          ) : null}

          {nextStop ? (
            <>
              <Text style={[styles.sectionLabel, { color: t.colors.secondaryLabel }]}>
                NEXT STOP
              </Text>
              <View style={styles.nextStopRow}>
                <View style={styles.nextStopText}>
                  <Text
                    style={[styles.street, { color: t.colors.label }]}
                    maxFontSizeMultiplier={1.4}
                  >
                    {nextStop.address}
                  </Text>
                  <View style={styles.chips}>
                    <NoteChips chips={TODAY_NOTE_CHIPS} testID="today-notes" />
                  </View>
                </View>
                <Pressable
                  role="button"
                  accessibilityLabel={`Go to ${nextStop.address}`}
                  accessibilityHint="Shows the run on the map"
                  onPress={handleGo}
                  testID="today-go"
                  style={[
                    styles.goButton,
                    { backgroundColor: t.colors.accent, borderRadius: radii.button },
                  ]}
                >
                  <Text style={[styles.goLabel, { color: t.colors.onAccent }]}>Go</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Text style={[styles.street, { color: t.colors.label }]}>Every stop is delivered.</Text>
          )}

          <View style={styles.secondaryRow}>
            <Pressable
              role="button"
              accessibilityLabel="Scan"
              accessibilityHint="Opens the parcel scanner"
              onPress={handleScan}
              testID="today-scan"
              style={[styles.ghostButton, ghost(t.colors)]}
            >
              <Ionicons name="scan" size={18} color={t.colors.accentText} />
              <Text style={[styles.ghostLabel, { color: t.colors.accentText }]}>Scan</Text>
            </Pressable>
            <Pressable
              role="button"
              accessibilityLabel="Add by Voice"
              accessibilityHint="Adds a stop by saying the address"
              onPress={handleAddByVoice}
              testID="today-add-by-voice"
              style={[styles.ghostButton, ghost(t.colors)]}
            >
              <Ionicons name="mic" size={18} color={t.colors.accentText} />
              <Text style={[styles.ghostLabel, { color: t.colors.accentText }]}>Add by Voice</Text>
            </Pressable>
            {/* The way to the end of the day: the summary of the run (screen
                10). The dock carries no summary tab, so Today opens it. */}
            <Pressable
              role="button"
              accessibilityLabel="End of day"
              accessibilityHint="Opens the summary of the day"
              onPress={() => router.navigate('/summary')}
              testID="today-end-of-day"
              style={[styles.ghostButton, ghost(t.colors)]}
            >
              <Ionicons name="sunny" size={18} color={t.colors.accentText} />
              <Text style={[styles.ghostLabel, { color: t.colors.accentText }]}>End of day</Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionLabel, { color: t.colors.secondaryLabel }]}>RUN ACTIONS</Text>
          {nextStop ? (
            <View style={styles.actionsRow}>
              <Pressable
                role="button"
                accessibilityLabel={`Mark ${nextStop.address} delivered`}
                accessibilityHint="Confirms the delivery"
                onPress={() => handleMarkDone(nextStop)}
                testID="today-mark-delivered"
                style={[styles.ghostButton, ghost(t.colors)]}
              >
                <Ionicons name="checkmark-circle" size={18} color={t.colors.accentText} />
                <Text style={[styles.ghostLabel, { color: t.colors.accentText }]}>Delivered</Text>
              </Pressable>
              <Pressable
                role="button"
                accessibilityLabel={`Skip ${nextStop.address}`}
                accessibilityHint="Leaves the stop for later"
                onPress={() => handleSkip(nextStop)}
                testID="today-skip"
                style={[styles.ghostButton, ghost(t.colors)]}
              >
                <Ionicons name="pause-circle" size={18} color={t.colors.accentText} />
                <Text style={[styles.ghostLabel, { color: t.colors.accentText }]}>Skip</Text>
              </Pressable>
              <Pressable
                role="button"
                accessibilityLabel={`Mark ${nextStop.address} failed`}
                accessibilityHint="Records the failed delivery"
                onPress={() => handleFail(nextStop)}
                testID="today-fail"
                style={[styles.ghostButton, ghost(t.colors)]}
              >
                <Ionicons name="close-circle" size={18} color={t.colors.accentText} />
                <Text style={[styles.ghostLabel, { color: t.colors.accentText }]}>Fail</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}
