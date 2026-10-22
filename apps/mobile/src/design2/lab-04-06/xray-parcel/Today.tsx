/**
 * Direction 05 - **X-ray Parcel**. Today.
 *
 * The parcel is the hero object and the run is the ground it stands on. The
 * box is drawn as a real object on the left, the number of stops left is the
 * loudest thing in the type, and every row of the run carries the place the
 * parcel sits in the van - the thing a courier actually needs to know.
 *
 * The rules it obeys: the metric is 72 px and tabular, the body is never
 * smaller than 17 px, every row is 56 px or taller, the primary action is
 * 72 px, and the status is never colour-only.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { labDirections } from '@courier/design-tokens/lab-directions';
import { hapticFor } from '@/motion/haptics';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { ParcelBox } from '../ParcelBox';
import { LabMessage, LabOfflineChip, LabSkeleton } from '../LabStates';
import { enteringFor, typeStyle, type LabScreenState } from '../labTheme';
import {
  distanceToNextStop,
  emptyMessage,
  errorRecovery,
  offlineChip,
  parcelInVan,
  run,
  statusLabels,
  voiceConditionWords,
} from '../labContent';

const direction = labDirections.xrayParcel;

export function XrayParcelToday({
  state = 'ready',
}: {
  state?: LabScreenState;
}): React.JSX.Element {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const entering = enteringFor(direction, reducedMotion);
  const rule = theme.colors.border;

  if (state === 'loading') {
    return (
      <View
        testID="today-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Today's list, X-ray Parcel direction"
      >
        <LabSkeleton direction={direction} lines={5} />
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View
        testID="today-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Today's list, X-ray Parcel direction"
      >
        <LabMessage
          direction={direction}
          title="No run yet"
          message={emptyMessage}
          testID="today-empty"
        />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View
        testID="today-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Today's list, X-ray Parcel direction"
      >
        <LabMessage
          direction={direction}
          title="The run did not load"
          message="The manifest could not be read. Check the connection and try again."
          action={errorRecovery}
          onAction={() => hapticFor('confirm')}
          testID="today-error"
        />
      </View>
    );
  }

  const offline = state === 'offline' || state === 'partialSync';

  return (
    <View
      testID="today-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Today's list, X-ray Parcel direction"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text
              style={[typeStyle(direction.type.title), { color: theme.colors.textPrimary }]}
              accessibilityRole="header"
            >
              {run.runName}
            </Text>
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
              {`${run.date} ${run.clock} · ${run.driver}`}
            </Text>
          </View>
          <Pressable
            style={styles.iconButton}
            onPress={() => hapticFor('confirm')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            accessibilityHint="Opens the settings"
            testID="today-settings"
          >
            <MaterialCommunityIcons name="cog" size={24} color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        {offline ? (
          <View style={styles.chipRow}>
            <LabOfflineChip
              direction={direction}
              label={state === 'offline' ? offlineChip.label : offlineChip.partialSyncLabel}
              queued={state === 'offline' ? offlineChip.queued : 2}
              onRetry={state === 'partialSync' ? () => hapticFor('confirm') : undefined}
            />
          </View>
        ) : null}

        <View style={styles.hero}>
          <ParcelBox
            direction={direction}
            address={run.nextStop.address}
            suburb={run.nextStop.suburb}
            state="inVan"
          />
          <View style={styles.heroText}>
            <Text
              style={[
                typeStyle(direction.type.metric),
                styles.metric,
                { color: theme.colors.brandPrimary },
              ]}
              accessibilityRole="heading"
              accessibilityLabel={`${run.remaining} stops left`}
            >
              {String(run.remaining)}
            </Text>
            <Text style={[typeStyle(direction.type.label), { color: theme.colors.textSecondary }]}>
              Stops left
            </Text>
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
              {`${run.delivered} delivered · ${run.kilometres} km to drive`}
            </Text>
          </View>
        </View>

        <Animated.View entering={entering} style={styles.next}>
          <View style={[styles.nextRule, { backgroundColor: theme.colors.brandPrimary }]} />
          <View style={styles.nextBody}>
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
              {`${run.nextStop.suburb} · ${run.nextStop.eta} · ${distanceToNextStop} km`}
            </Text>
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
              {`${parcelInVan} · ${run.nextStop.parcels} parcels`}
            </Text>
          </View>
        </Animated.View>

        {run.stops.slice(0, state === 'longList' ? 6 : 3).map((stop) => (
          <Pressable
            key={stop.id}
            onPress={() => hapticFor('confirm')}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: rule, opacity: pressed ? 0.6 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Stop ${stop.sequence}, ${stop.address}, ${stop.suburb}, ${statusLabels[stop.status]}, ${parcelInVan}`}
            testID={`today-stop-${stop.id}`}
          >
            <View
              style={[
                styles.mark,
                {
                  backgroundColor:
                    stop.status === 'active'
                      ? theme.colors.brandPrimary
                      : stop.status === 'delivered'
                        ? theme.colors.statusDelivered
                        : theme.colors.textTertiary,
                },
              ]}
            />
            <View style={styles.rowMain}>
              <Text
                style={[typeStyle(direction.type.row), { color: theme.colors.textPrimary }]}
                numberOfLines={1}
              >
                {stop.address}
              </Text>
              <Text
                style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}
                numberOfLines={1}
              >
                {`${stop.suburb} · ${statusLabels[stop.status]}`}
              </Text>
            </View>
            <Text
              style={[typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}
            >
              {parcelInVan}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => hapticFor('confirm')}
          style={{ borderRadius: direction.radii.control }}
          accessibilityHint="Opens the next stop"
          testID="today-next-stop"
        >
          Next stop
        </Button>
        <Text
          style={[styles.voice, typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}
          accessibilityRole="text"
          accessibilityLabel={`Copilot is ${voiceConditionWords.listening.toLowerCase()}`}
          testID="voice-bar"
        >
          {`Copilot · ${voiceConditionWords.listening}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerText: { flex: 1, gap: 2 },
  iconButton: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  chipRow: { paddingHorizontal: 16, paddingBottom: 8 },
  hero: { flexDirection: 'row', gap: 16, paddingHorizontal: 16, paddingVertical: 16 },
  heroText: { flex: 1, justifyContent: 'center', gap: 2 },
  metric: { fontVariant: ['tabular-nums'] },
  next: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  nextRule: { width: 4, borderRadius: 2 },
  nextBody: { flex: 1, gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  mark: { width: 12, height: 12, borderRadius: 2 },
  rowMain: { flex: 1, gap: 1 },
  actions: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 8 },
  voice: { textAlign: 'center' },
});
