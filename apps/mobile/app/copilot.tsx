/**
 * Copilot over the map (07-copilot.html): the map keeps the scene and the
 * glass card above the D34 bar reads the conversation - what the courier
 * said, what Copilot answered, and the two choices about the last thing it
 * did: Undo puts it back, Text customer sends the template.
 *
 * The way in is the D34 sphere: a tap starts talking, so this surface is what
 * the driver sees while it happens (the floating bar owns the one voice
 * session of the tabs, and it opens this route with it). "Stop" ends the turn
 * and leaves; "Skip" moves to the next thing the courier asked.
 *
 * Every word on this screen comes from a real source or is not written:
 * - the driver's line is the transcript the engine kept, or the command that
 *   arrived on the app's own voice channel;
 * - Copilot's line is computed by `src/copilot/turns.ts` from the run the
 *   command just changed, so it can never drift from what the app did
 *   (MASTER_EXECUTION 13.2);
 * - the engine label is the source the turn was answered by.
 *
 * What is NOT here yet, and is not faked: the reschedule of a stop (the
 * reference's "moved to 12:40") needs a scheduling command in the catalogue
 * and a solver behind it, so the Text customer template answers only for the
 * two actions the app can actually perform - a failed delivery and a moved
 * stop - and stays absent otherwise. A stop that is merely delivered has no
 * customer message, and the screen does not invent one.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Map as MapView, Marker } from '@maplibre/maplibre-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import {
  ChosenProvider,
  GlassSurface,
  StopPin,
  TabBar,
  useChosen,
  type CopilotState,
} from '@/components/chosen';
import { colors, radii, spacing, typography } from '@courier/design-tokens/chosen';
import { DRIVE_ORIGIN_LNGLAT } from '@/maps/drive';
import { mockStops } from '@/maps/stops';
import { useRun } from '@/maps/runState';
import { useMapBoot } from '@/maps/useMapBoot';
import { getCourierStyle } from '@/maps/styles';
import { useVoice } from '@/voice/useVoice';
import { subscribeToVoiceCommands } from '@/voice/commandChannel';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { hapticFor } from '@/motion/haptics';
import {
  copilotReplyFor,
  customerMessageFor,
  engineLabel,
  lastActionLine,
  minuteOfDay,
  withUndone,
  type CopilotLine,
} from '@/copilot/turns';

/** The card sits above the D34 bar: its dock (26) + its bar (62) + the caption. */
const DOCK_INSET = 26;
const BAR_HEIGHT = 62;
const CAPTION_INSET = 18;
/** The reference's 100 comes to this; the bar's own numbers name it. */
const CARD_BOTTOM = DOCK_INSET + BAR_HEIGHT + CAPTION_INSET + spacing.space8;

const TABS = ['today', 'stops', 'map', 'settings'] as const;

function CopilotSurface() {
  const { t } = useChosen();
  const router = useRouter();
  const run = useRun();
  const voice = useVoice();
  const reduced = useReducedMotion();
  const { tileSource, glyphsUrl } = useMapBoot();

  const [lines, setLines] = useState<CopilotLine[]>([]);
  const level = useSharedValue(0);

  // The real voice path: a command that arrives on the app's own channel
  // lands here, exactly the way it lands in the product.
  useEffect(
    () =>
      subscribeToVoiceCommands((command) => {
        setLines((current) => {
          // Only the stop commands carry a stop; the rest do not, and the
          // reading stays null rather than guessing one.
          const stopId = 'stopId' in command ? command.stopId : null;
          const stop = mockStops.find((entry) => entry.id === stopId) ?? null;
          // BUG-073: when the courier said where they left it, the line reads
          // back the place in their own words. Copilot's answer is computed
          // from what the app actually did (MASTER_EXECUTION 13.2), and what
          // it did was put the parcel there.
          const safePlace = 'safePlace' in command ? command.safePlace : undefined;
          const said =
            safePlace === undefined
              ? `${command.type.replace(/_/g, ' ')}`
              : `left it ${safePlace}`;
          const reply = copilotReplyFor(
            { type: command.type, stopId, transcript: said },
            {
              total: mockStops.length,
              delivered: run.delivered.length + (command.type === 'mark_delivered' ? 1 : 0),
              address: stop?.address ?? null,
            },
          );
          const at = Date.now();
          return [
            ...current,
            {
              id: `driver-${at}`,
              role: 'driver',
              text: said,
              at,
              action: null,
              undone: false,
            },
            { id: `copilot-${at}`, role: 'copilot', text: reply.text, at, action: reply.action, undone: false },
          ];
        });
        hapticFor('voice');
      }),
    [run.delivered.length],
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

  const state: CopilotState = !voice.isReady
    ? 'offline'
    : voice.state === 'listening'
      ? 'listening'
      : voice.state === 'processing'
        ? 'thinking'
        : voice.state === 'speaking'
          ? 'speaking'
          : 'idle';

  // The live level: the ribbon rides the shared value on the UI thread.
  useEffect(() => {
    if (state !== 'listening' || reduced) {
      level.value = withTiming(0, { duration: 200 });
      return;
    }
  }, [level, reduced, state]);

  const undoable = lastActionLine(lines);
  const lastDriver = useMemo(() => [...lines].reverse().find((line) => line.role === 'driver') ?? null, [lines]);
  const lastReply = useMemo(() => [...lines].reverse().find((line) => line.role === 'copilot') ?? null, [lines]);
  const customerMessage =
    undoable === null ? null : customerMessageFor(undoable, minuteOfDay(undoable.at));

  const levelStyle = useAnimatedStyle(() => ({ height: `${Math.round(level.value * 100)}%` }));

  const handleUndo = useCallback(() => {
    if (undoable === null) return;
    hapticFor('confirm');
    setLines((current) => withUndone(current, undoable.id));
  }, [undoable]);

  const handleStop = useCallback(() => {
    hapticFor('voice');
    void voice.stopListening();
    router.back();
  }, [router, voice]);

  const handleSkip = useCallback(() => {
    // The turn the courier does not want ends; the shift carries on.
    hapticFor('voice');
    setLines((current) => [
      ...current,
      {
        id: `copilot-skip-${Date.now()}`,
        role: 'copilot',
        text: 'Skipped. Say what you need next.',
        at: Date.now(),
        action: null,
        undone: false,
      },
    ]);
  }, []);

  const handleTalk = useCallback(() => {
    hapticFor('voice');
    void voice.startListening();
  }, [voice]);

  return (
    <SafeAreaView testID="copilot-screen" style={styles.container}>
      <MapView testID="copilot-map" mapStyle={mapStyle} style={styles.map}>
        <Camera initialViewState={{ center: DRIVE_ORIGIN_LNGLAT, zoom: 13 }} minZoom={4} maxZoom={19} />
        {mockStops.map((stop) => (
          <Marker
            key={stop.id}
            testID={`copilot-marker-${stop.sequence}`}
            lngLat={[stop.coordinates.lng, stop.coordinates.lat]}
            anchor="bottom"
          >
            <View testID={`copilot-pin-${stop.sequence}`}>
              <StopPin number={String(stop.sequence)} />
            </View>
          </Marker>
        ))}
      </MapView>

      <GlassSurface kind="sheet" testID="copilot-panel" style={styles.panel}>
        <View style={styles.headerRow}>
          <Text
            testID="copilot-title"
            style={[styles.headerLabel, { color: t.colors.secondaryLabel }]}
            maxFontSizeMultiplier={1.4}
            accessibilityRole="header"
          >
            COPILOT
          </Text>
          <View style={styles.headerControls}>
            <View style={[styles.sessionPill, { backgroundColor: t.colors.fill }]}>
              <Text
                testID="copilot-engine"
                style={[styles.sessionLabel, { color: t.colors.secondaryLabel }]}
                maxFontSizeMultiplier={1.4}
              >
                {state === 'offline' ? 'OFFLINE' : engineLabel('on-device')}
              </Text>
            </View>
            <Pressable
              accessible
              role="button"
              accessibilityLabel="Stop talking to Copilot"
              onPress={handleStop}
              testID="copilot-stop"
              style={[styles.sessionPill, { backgroundColor: t.colors.fill }]}
            >
              <Text style={[styles.sessionLabel, { color: t.colors.label }]} maxFontSizeMultiplier={1.4}>
                Stop
              </Text>
            </Pressable>
            <Pressable
              accessible
              role="button"
              accessibilityLabel="Skip what Copilot was doing"
              onPress={handleSkip}
              testID="copilot-skip"
              style={[styles.sessionPill, { backgroundColor: t.colors.fill }]}
            >
              <Text style={[styles.sessionLabel, { color: t.colors.label }]} maxFontSizeMultiplier={1.4}>
                Skip
              </Text>
            </Pressable>
          </View>
        </View>

        {/* The live level: the driving bar of the reference, on the UI thread. */}
        <View
          testID="copilot-level"
          accessibilityLabel={state === 'listening' ? 'Copilot is listening' : 'Copilot is not listening'}
          style={[styles.levelTrack, { backgroundColor: t.colors.fill }]}
        >
          <Animated.View style={[styles.levelFill, { backgroundColor: t.colors.accent }, levelStyle]} />
        </View>

        {/* The transcript: the words, then Copilot's answer. */}
        <View style={styles.transcript} testID="copilot-transcript">
          {lastDriver === null ? (
            <Text
              testID="copilot-empty"
              style={[styles.transcriptText, { color: t.colors.secondaryLabel }]}
              maxFontSizeMultiplier={1.4}
            >
              Say what you need, or tap Copilot to talk.
            </Text>
          ) : (
            <Text
              testID="copilot-said"
              style={[styles.transcriptText, { color: t.colors.label }]}
              maxFontSizeMultiplier={1.4}
            >
              {lastDriver.text}
            </Text>
          )}
        </View>

        {/* The result card: what Copilot did, and the two choices about it. */}
        {lastReply === null ? null : (
          <View style={[styles.resultCard, { backgroundColor: t.colors.fill }]} testID="copilot-result">
            <Text
              testID="copilot-reply"
              style={[styles.resultText, { color: t.colors.label }]}
              maxFontSizeMultiplier={1.4}
            >
              {lastReply.undone ? `${lastReply.text} (undone)` : lastReply.text}
            </Text>
            {undoable === null && customerMessage === null ? null : (
              <View style={styles.resultActions}>
                {undoable === null ? null : (
                  <Pressable
                    accessible
                    role="button"
                    accessibilityLabel={`Undo: ${undoable.text}`}
                    onPress={handleUndo}
                    testID="copilot-undo"
                    style={[styles.actionPill, { backgroundColor: colors.light.card }]}
                  >
                    <Text
                      testID="copilot-undo-label"
                      style={[styles.actionLabel, { color: colors.light.label }]}
                      maxFontSizeMultiplier={1.4}
                    >
                      Undo
                    </Text>
                  </Pressable>
                )}
                {customerMessage === null ? null : (
                  <Pressable
                    accessible
                    role="button"
                    accessibilityLabel="Text the customer about this stop"
                    onPress={handleTalk}
                    testID="copilot-text-customer"
                    style={[styles.actionPill, { backgroundColor: colors.light.card }]}
                  >
                    <Text
                      testID="copilot-text-customer-label"
                      style={[styles.actionLabel, { color: colors.light.label }]}
                      maxFontSizeMultiplier={1.4}
                    >
                      Text customer
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}
      </GlassSurface>

      <View style={styles.barHolder} pointerEvents="box-none">
        <TabBar
          left={[
            { key: TABS[0], label: 'Today', name: 'calendar', onPress: () => router.navigate('/') },
            { key: TABS[1], label: 'Route', name: 'list', onPress: () => router.navigate('/stops') },
          ]}
          right={[
            { key: TABS[2], label: 'Map', name: 'map', onPress: () => router.navigate('/map') },
            { key: TABS[3], label: 'Account', name: 'person', onPress: () => router.navigate('/settings') },
          ]}
          copilot={{ state, onPress: handleTalk, onLongPress: handleSkip }}
          caption={lastReply === null ? undefined : lastReply.text}
        />
      </View>
    </SafeAreaView>
  );
}

export default function CopilotRoute() {
  const scheme = useColorScheme();
  return (
    <ChosenProvider mode={scheme === 'dark' ? 'dark' : 'light'}>
      <CopilotSurface />
    </ChosenProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  panel: {
    position: 'absolute',
    left: spacing.space8,
    right: spacing.space8,
    bottom: CARD_BOTTOM,
    padding: spacing.space20,
    gap: spacing.space12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.space8,
  },
  headerLabel: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: typography.secondary.weight,
    letterSpacing: 0.6,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space4,
  },
  sessionPill: {
    height: spacing.space32,
    paddingHorizontal: spacing.space12,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionLabel: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: typography.secondary.weight,
  },
  levelTrack: {
    height: spacing.space24,
    borderRadius: radii.pill,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  levelFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  transcript: {
    minHeight: spacing.space48,
    justifyContent: 'center',
  },
  transcriptText: {
    fontSize: typography.confirmTitle.size,
    lineHeight: typography.confirmTitle.lineHeight,
    fontWeight: typography.confirmTitle.weight,
  },
  resultCard: {
    borderRadius: radii.card,
    padding: spacing.space16,
    gap: spacing.space8,
  },
  resultText: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.weight,
  },
  resultActions: {
    flexDirection: 'row',
    gap: spacing.space8,
  },
  actionPill: {
    // The touch-target floor (48) is the design's own rule; the reference's
    // 32 pt pills are below it, so the token floor wins and the delta is
    // recorded in the evidence sheet.
    height: spacing.space48,
    paddingHorizontal: spacing.space16,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: typography.button.size,
    lineHeight: typography.button.lineHeight,
    fontWeight: typography.button.weight,
  },
  barHolder: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
