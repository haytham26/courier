import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Card } from '@/components/Card';
import { KeyNumber } from '@/components/KeyNumber';
import { LoadingSkeleton, StateMessage } from '@/components/StateMessage';
import { earningsKindLabel } from '@/earnings/labels';
import { formatDuration, formatMoney, formatPercent } from '@/earnings/money';
import { useEarnings } from '@/earnings/useEarnings';
import { useEarningsSummary } from '@/earnings/useEarningsSummary';
import { useShift } from '@/providers/ShiftProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, radius, space, target } from '@/styles/tokens';

/** The short name of a stop, so the row fits on a phone. */
function stopLabel(stopId: string): string {
  return `Stop ${stopId.slice(0, 8)}`;
}

export default function EarningsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { shiftId } = useShift();

  const earnings = useEarnings(shiftId);
  const summary = useEarningsSummary(shiftId);

  const money = earnings.earnings;
  const day = summary.summary;

  return (
    <SafeAreaView testID="earnings-screen" style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          testID="earnings-back"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to today's list"
          style={[styles.backButton, { minHeight: target.comfortable, minWidth: target.comfortable }]}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.textPrimary, fontSize: fontSize.xxl }]}>Earnings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {earnings.status === 'loading' && (
          <View testID="earnings-loading" style={styles.loadingBlock}>
            <LoadingSkeleton height={fontSize.key} />
            <LoadingSkeleton height={fontSize.lg} />
          </View>
        )}

        {earnings.status === 'error' && earnings.earnings === null && (
          <StateMessage
            testID="earnings-error"
            title="The money did not come through"
            message={earnings.error ?? 'Try again in a moment.'}
            actionLabel="Try again"
            onAction={() => void earnings.refresh()}
            tone="error"
          />
        )}

        {money !== null && (
          <Card style={styles.totalCard}>
            <Text style={[styles.cardLabel, { color: theme.colors.textSecondary, fontSize: fontSize.sm }]}>NET FOR TODAY</Text>
            <KeyNumber
              testID="earnings-net"
              value={formatMoney(money.net, money.currency)}
              accessibilityLabel={`Net for today ${formatMoney(money.net, money.currency)}`}
            />
            <Text style={[styles.detail, { color: theme.colors.textSecondary, fontSize: fontSize.lg }]}>
              {`Gross ${formatMoney(money.gross, money.currency)} · GST ${formatMoney(money.gst, money.currency)}`}
            </Text>
            <Text style={[styles.detail, { color: theme.colors.textSecondary, fontSize: fontSize.lg }]}>
              {`${formatMoney(money.rate, money.currency)} per stop`}
            </Text>
            {earnings.isStale && (
              <Text
                testID="earnings-not-updated"
                style={[styles.warning, { color: theme.colors.warning, fontSize: fontSize.lg }]}
              >
                Not updated — offline
              </Text>
            )}
          </Card>
        )}

        {earnings.status === 'ready' && money === null && (
          <StateMessage
            testID="earnings-empty"
            title="Nothing earned yet today"
            message="The money shows up here as soon as the first stop is delivered."
          />
        )}

        {money !== null && (
          <View style={styles.counts}>
            <View style={[styles.countBox, { borderColor: theme.colors.border }]}>
              <Text style={[styles.countValue, { color: theme.colors.statusDelivered, fontSize: fontSize.xl }]}>{money.delivered}</Text>
              <Text style={[styles.countLabel, { color: theme.colors.textSecondary, fontSize: fontSize.lg }]}>Delivered</Text>
            </View>
            <View style={[styles.countBox, { borderColor: theme.colors.border }]}>
              <Text style={[styles.countValue, { color: theme.colors.statusFailed, fontSize: fontSize.xl }]}>{money.failed}</Text>
              <Text style={[styles.countLabel, { color: theme.colors.textSecondary, fontSize: fontSize.lg }]}>Failed</Text>
            </View>
            <View style={[styles.countBox, { borderColor: theme.colors.border }]}>
              <Text style={[styles.countValue, { color: theme.colors.statusSkipped, fontSize: fontSize.xl }]}>{money.skipped}</Text>
              <Text style={[styles.countLabel, { color: theme.colors.textSecondary, fontSize: fontSize.lg }]}>Skipped</Text>
            </View>
          </View>
        )}

        {money !== null && money.breakdown.length > 0 && (
          <Card style={styles.card}>
            <Text style={[styles.cardLabel, { color: theme.colors.textSecondary, fontSize: fontSize.sm }]}>EVERY STOP</Text>
            {money.breakdown.map((line) => (
              <View
                key={`${line.stop_id}-${line.kind}`}
                style={[styles.row, { borderTopColor: theme.colors.border }]}
                testID="earnings-line"
              >
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}>
                    {earningsKindLabel(line.kind)}
                  </Text>
                  <Text style={[styles.rowSub, { color: theme.colors.textTertiary, fontSize: fontSize.sm }]}>
                    {stopLabel(line.stop_id)}
                  </Text>
                </View>
                <Text style={[styles.rowAmount, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}>
                  {formatMoney(line.amount, money.currency)}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {day !== null && (
          <Card style={styles.card}>
            <Text style={[styles.cardLabel, { color: theme.colors.textSecondary, fontSize: fontSize.sm }]}>END OF DAY</Text>

            <View style={[styles.row, { borderTopColor: theme.colors.border }]}>
              <Text style={[styles.rowTitle, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}>
                Average delivery
              </Text>
              <Text style={[styles.rowAmount, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}>
                {formatDuration(day.average_delivery_seconds)}
              </Text>
            </View>

            <View style={[styles.row, { borderTopColor: theme.colors.border }]}>
              <Text style={[styles.rowTitle, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}>
                Success rate
              </Text>
              <Text
                testID="earnings-success-rate"
                style={[styles.rowAmount, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}
              >
                {formatPercent(day.success_rate)}
              </Text>
            </View>

            <View style={[styles.row, { borderTopColor: theme.colors.border }]}>
              <Text style={[styles.rowTitle, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}>
                Delivered
              </Text>
              <Text style={[styles.rowAmount, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}>{day.delivered}</Text>
            </View>

            <View style={[styles.row, { borderTopColor: theme.colors.border }]}>
              <Text style={[styles.rowTitle, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}>
                Failed
              </Text>
              <Text style={[styles.rowAmount, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}>{day.failed}</Text>
            </View>

            {day.failed_stops.length > 0 && (
              <>
                <Text style={[styles.failedTitle, { color: theme.colors.textSecondary, fontSize: fontSize.lg }]}>
                  THE STOPS THAT DID NOT GO
                </Text>
                {day.failed_stops.map((stop) => (
                  <View
                    key={`${stop.stop_id}-${stop.occurred_at}`}
                    style={[styles.row, { borderTopColor: theme.colors.border }]}
                    testID="earnings-failed-stop"
                  >
                    <View style={styles.rowInfo}>
                      <Text style={[styles.rowTitle, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}>
                        {stop.reason ?? earningsKindLabel(stop.kind)}
                      </Text>
                      <Text style={[styles.rowSub, { color: theme.colors.textTertiary, fontSize: fontSize.sm }]}>
                        {stopLabel(stop.stop_id)}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {summary.isStale && (
              <Text
                testID="earnings-summary-not-updated"
                style={[styles.warning, { color: theme.colors.warning, fontSize: fontSize.lg }]}
              >
                Not updated — offline
              </Text>
            )}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
  },
  backButton: { alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700' },
  content: { padding: space.lg, paddingBottom: space.huge, gap: space.lg },
  loadingBlock: { gap: space.md },
  totalCard: { padding: space.lg },
  card: { padding: space.lg },
  cardLabel: { fontWeight: '700', letterSpacing: 1, marginBottom: space.sm },
  detail: { marginTop: space.xs, fontWeight: '500' },
  warning: { marginTop: space.sm, fontWeight: '600' },
  counts: { flexDirection: 'row', gap: space.md },
  countBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
    alignItems: 'center',
  },
  countValue: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  countLabel: { fontWeight: '500' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.sm,
    borderTopWidth: 1,
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontWeight: '600' },
  rowSub: { fontWeight: '500' },
  rowAmount: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  failedTitle: { fontWeight: '700', letterSpacing: 1, marginTop: space.md },
});
