/**
 * Direction C - **Freight**. Expressive and branded.
 *
 * The screen is a parcel label: hard corners, a kraft tint, a deep highway
 * orange and a lot of black type. The brand shows through one block of
 * colour and one oversized number - not through a gradient, not through a
 * glassy panel, and not through a stack of rounded cards.
 *
 * The layout is deliberately asymmetric: the number sits in a block of
 * orange on the left, the address sits beside it, and the run of the day is
 * a list of black blocks. The perforated rule under the header is the
 * courier's parcel-label edge, drawn with a dashed border rather than an
 * illustration.
 *
 * The rules it obeys: the metric is 64 px and tabular, the body is never
 * smaller than 17 px, every row is 64 px or taller, the primary action is
 * 72 px, and the status is never colour-only - every row carries its word.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { directions } from '@courier/design-tokens/directions';
import { hapticFor } from '@/motion/haptics';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { run, statusLabels } from './runContent';
import { typeStyle } from './typeStyle';
import { enteringFor } from './entering';
import { VoiceBar } from './VoiceBar';

const direction = directions.freight;

export function FreightToday(): React.JSX.Element {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const entering = enteringFor(direction, reducedMotion);

  return (
    <View
      testID="today-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Today's list, Freight direction"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.brand, { backgroundColor: theme.colors.textPrimary }]}>
          <View style={styles.brandTop}>
            <Text
              style={[typeStyle(direction.type.label), { color: theme.colors.textInverse }]}
              accessibilityRole="header"
            >
              Courier Copilot
            </Text>
            <View style={styles.brandTopRight}>
              <Text
                style={[typeStyle(direction.type.caption), { color: theme.colors.textInverse }]}
                accessibilityLabel={`${run.date}, ${run.clock}, ${run.driver}`}
              >
                {`${run.date} ${run.clock} · ${run.driver}`}
              </Text>
              <Pressable
                style={styles.iconButton}
                onPress={() => hapticFor('confirm')}
                accessibilityRole="button"
                accessibilityLabel="Settings"
                accessibilityHint="Opens the settings"
                testID="today-settings"
              >
                <MaterialCommunityIcons name="cog" size={24} color={theme.colors.textInverse} />
              </Pressable>
            </View>
          </View>
          <Text
            style={[
              typeStyle(direction.type.title),
              styles.brandRun,
              { color: theme.colors.textInverse },
            ]}
          >
            {run.runName}
          </Text>
          <View style={styles.brandStrip}>
            <View style={[styles.brandMark, { backgroundColor: theme.colors.brandPrimary }]} />
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textInverse }]}>
              {`${run.remaining} STOPS LEFT · ${run.kilometres} KM TO DRIVE`}
            </Text>
          </View>
        </View>

        <View style={[styles.perforation, { borderColor: theme.colors.border }]} />

        <Animated.View entering={entering} style={styles.headline}>
          <View style={[styles.metricBlock, { backgroundColor: theme.colors.brandPrimary }]}>
            <Text
              style={[
                typeStyle(direction.type.metric),
                styles.metric,
                { color: theme.colors.textInverse },
              ]}
              accessibilityRole="heading"
              accessibilityLabel={`${run.remaining} stops left`}
            >
              {String(run.remaining)}
            </Text>
          </View>
          <View style={styles.headlineText}>
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
              {`${run.nextStop.suburb} · ${run.nextStop.eta} · ${run.nextStop.parcels} parcels`}
            </Text>
            {run.nextStop.note ? (
              <Text
                style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}
              >
                {run.nextStop.note}
              </Text>
            ) : null}
          </View>
        </Animated.View>

        <View style={styles.list}>
          {run.stops.map((stop) => (
            <Pressable
              key={stop.id}
              onPress={() => hapticFor('confirm')}
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel={`Stop ${stop.sequence}, ${stop.address}, ${stop.suburb}, ${statusLabels[stop.status]}`}
              testID={`today-stop-${stop.id}`}
            >
              <View
                style={[
                  styles.rowMark,
                  {
                    backgroundColor:
                      stop.status === 'active'
                        ? theme.colors.brandPrimary
                        : stop.status === 'delivered'
                          ? theme.colors.statusDelivered
                          : theme.colors.textPrimary,
                  },
                ]}
              >
                <Text
                  style={[typeStyle(direction.type.caption), { color: theme.colors.textInverse }]}
                >
                  {String(stop.sequence)}
                </Text>
              </View>
              <View style={styles.rowText}>
                <Text
                  style={[typeStyle(direction.type.row), { color: theme.colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {stop.address}
                </Text>
                <Text
                  style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}
                >
                  {`${stop.suburb} · ${stop.eta} · ${statusLabels[stop.status]}`}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.actions, { backgroundColor: theme.colors.background }]}>
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
      </View>

      <View style={[styles.voice, { paddingHorizontal: direction.spacing.pad }]}>
        <VoiceBar direction={direction} state={run.voice} queued={run.queuedActions} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 24 },
  brand: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, gap: 8 },
  brandTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandTopRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconButton: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  brandRun: { textTransform: 'uppercase' },
  brandStrip: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: { width: 16, height: 16 },
  perforation: {
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    marginHorizontal: 16,
  },
  headline: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  metricBlock: { width: 116, height: 116, alignItems: 'center', justifyContent: 'center' },
  metric: { fontVariant: ['tabular-nums'] },
  headlineText: { flex: 1, gap: 2, justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
  rowMark: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 1 },
  actions: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  voice: { paddingBottom: 8 },
});
