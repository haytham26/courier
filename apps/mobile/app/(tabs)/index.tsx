import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { KeyNumber } from '@/components/KeyNumber';
import { OfflineChip } from '@/components/OfflineChip';
import { LoadingSkeleton } from '@/components/StateMessage';
import { VoiceButton } from '@/voice/VoiceButton';
import { useVoice } from '@/voice/useVoice';
import { useShift } from '@/providers/ShiftProvider';
import { useEarnings } from '@/earnings/useEarnings';
import { useEarningsSummary } from '@/earnings/useEarningsSummary';
import { formatMoney, formatPercent } from '@/earnings/money';
import { useDoorMemory } from '@/doorMemory/useDoorMemory';
import { safePlaceLabel } from '@/doorMemory/safePlaces';
import { useSyncStatus } from '@/sync/useSyncStatus';
import { fontSize, radius, space, target } from '@/styles/tokens';

interface Stop {
  id: string;
  address: string;
  suburb: string;
  status: 'pending' | 'active' | 'delivered' | 'failed' | 'skipped';
  sequence: number;
  coordinates?: { lat: number; lng: number };
}

const mockStops: Stop[] = [
  { id: '1', address: '2/14 Riccarton Road', suburb: 'Riccarton', status: 'delivered', sequence: 1 },
  { id: '2', address: '45 Papanui Road', suburb: 'Merivale', status: 'active', sequence: 2 },
  { id: '3', address: '120 Blenheim Road', suburb: 'Upper Riccarton', status: 'pending', sequence: 3 },
  { id: '4', address: '78 Main South Road', suburb: 'Sockburn', status: 'pending', sequence: 4 },
  { id: '5', address: '234 Colombo Street', suburb: 'Sydenham', status: 'pending', sequence: 5 },
];

const VOICE_STATE_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  listening: 'mic',
  speaking: 'volume-up',
  processing: 'hourglass-empty',
};

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { state: voiceState, lastCommand, startListening, stopListening, isReady } = useVoice();
  const { shiftId, startShift, endShift } = useShift();
  const syncStatus = useSyncStatus();

  const activeStop = mockStops.find(s => s.status === 'active');
  const remainingCount = mockStops.filter(s => s.status === 'pending').length;
  const deliveredCount = mockStops.filter(s => s.status === 'delivered').length;

  const earnings = useEarnings(shiftId);
  const earningsSummary = useEarningsSummary(shiftId);
  const doorMemory = useDoorMemory(activeStop?.id ?? null);

  const statusColorMap: Record<Stop['status'], keyof typeof theme.colors> = {
    delivered: 'statusDelivered',
    pending: 'statusPending',
    active: 'statusActive',
    failed: 'statusFailed',
    skipped: 'statusSkipped',
  };

  const getStatusColor = (status: Stop['status']) => {
    return theme.colors[statusColorMap[status]] || theme.colors.textTertiary;
  };

  const getBadgeVariant = (status: Stop['status']) => {
    switch (status) {
      case 'delivered': return 'success';
      case 'active': return 'active';
      case 'failed': return 'error';
      case 'skipped': return 'warning';
      default: return 'default';
    }
  };

  const handleVoiceCommand = (command: string) => {
    console.log('Voice command:', command);
  };

  useEffect(() => {
    if (!lastCommand) {
      return;
    }
    switch (lastCommand.type) {
      case 'mark_delivered':
        handleVoiceCommand('mark delivered');
        break;
      case 'mark_skipped':
        handleVoiceCommand('skip');
        break;
      case 'mark_failed':
        handleVoiceCommand('fail');
        break;
      case 'navigate_next':
        handleVoiceCommand('navigate next');
        break;
      case 'navigate_previous':
        handleVoiceCommand('navigate previous');
        break;
      case 'repeat_instruction':
        handleVoiceCommand('repeat');
        break;
      case 'where_am_i':
        handleVoiceCommand('where am i');
        break;
      case 'how_many_left':
        handleVoiceCommand('how many left');
        break;
      case 'start_shift':
        startShift();
        break;
      case 'end_shift':
        endShift();
        break;
      case 'emergency':
        handleVoiceCommand('emergency');
        break;
    }
  }, [lastCommand, startShift, endShift]);

  const doorMemoryTip = doorMemory.memory
    ? safePlaceLabel(doorMemory.memory.safe_place) ?? doorMemory.memory.note?.trim() ?? 'No door note yet'
    : 'No door note yet';

  const voiceIcon = VOICE_STATE_ICONS[voiceState] ?? 'mic';

  return (
    <SafeAreaView testID="today-screen" style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}>Good morning</Text>
            <Text style={[styles.driverName, { color: theme.colors.textPrimary, fontSize: fontSize.xxxl }]}>Driver</Text>
          </View>
          <View style={styles.headerActions}>
            <OfflineChip pending={syncStatus.pending} online={syncStatus.online} />
            <TouchableOpacity
              testID="open-settings"
              style={[styles.iconButton, { minHeight: target.comfortable, minWidth: target.comfortable }]}
              onPress={() => router.push('/(tabs)/settings')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <MaterialIcons name="settings" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary, fontSize: fontSize.xs }]}>Delivered</Text>
            <Text style={[styles.statValue, { color: theme.colors.statusDelivered, fontSize: fontSize.xxl }]}>{deliveredCount}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary, fontSize: fontSize.xs }]}>Remaining</Text>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary, fontSize: fontSize.xxl }]}>{remainingCount}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary, fontSize: fontSize.xs }]}>Success Rate</Text>
            <Text
              testID="today-success-rate"
              style={[styles.statValue, { color: theme.colors.success, fontSize: fontSize.xxl }]}
            >
              {earningsSummary.summary === null
                ? '—'
                : formatPercent(earningsSummary.summary.success_rate)}
            </Text>
          </Card>
        </View>

        {/* Current Run Progress */}
        {activeStop && (
          <Card style={[styles.currentRunCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.currentRunHeader}>
              <Text style={[styles.currentRunTitle, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}>Current Run</Text>
              <Badge variant="active">IN PROGRESS</Badge>
            </View>
            <View style={styles.currentStopInfo}>
              <View style={styles.stopNumber}>
                <Text style={[styles.stopNumberText, { color: theme.colors.textInverse, backgroundColor: theme.colors.brandPrimary, fontSize: fontSize.base }]}>
                  #{activeStop.sequence}
                </Text>
              </View>
              <View style={styles.stopDetails}>
                <Text style={[styles.stopAddress, { color: theme.colors.textPrimary, fontSize: fontSize.xl }]}>{activeStop.address}</Text>
                <Text style={[styles.stopSuburb, { color: theme.colors.textSecondary, fontSize: fontSize.lg }]}>{activeStop.suburb}</Text>
              </View>
            </View>

            {/* The door memory: the one line the courier reads on arrival */}
            <View style={styles.doorTip} testID="door-memory-tip">
              <MaterialIcons name="lock-open" size={18} color={theme.colors.brandSecondary} />
              <Text
                style={[styles.doorTipText, { color: theme.colors.textSecondary, fontSize: fontSize.lg }]}
                numberOfLines={1}
              >
                {doorMemoryTip}
              </Text>
            </View>

            <View style={styles.currentRunActions}>
              <Button
                variant="primary"
                onPress={() => handleVoiceCommand('mark delivered')}
                style={styles.actionButton}
                leftIcon={<MaterialIcons name="check-circle" size={20} color={theme.colors.textInverse} />}
              >
                Mark Delivered
              </Button>
              <Button
                variant="secondary"
                onPress={() => handleVoiceCommand('skip')}
                style={styles.actionButton}
              >
                Skip
              </Button>
              <Button
                variant="outline"
                onPress={() => handleVoiceCommand('fail')}
                style={styles.actionButton}
              >
                Failed
              </Button>
            </View>
          </Card>
        )}

        {/* The money of today: one tap to the earnings screen */}
        <TouchableOpacity
          testID="earnings-card"
          accessibilityRole="button"
          accessibilityLabel="Today's earnings. Open the earnings screen."
          onPress={() => router.push('/earnings')}
          style={[styles.moneyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <View style={styles.moneyHeader}>
            <Text style={[styles.moneyLabel, { color: theme.colors.textSecondary, fontSize: fontSize.sm }]}>TODAY</Text>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.textTertiary} />
          </View>

          {earnings.status === 'loading' && (
            <LoadingSkeleton height={fontSize.key} testID="earnings-loading" />
          )}

          {earnings.status !== 'loading' && earnings.earnings !== null && (
            <>
              <KeyNumber
                testID="today-earnings-net"
                value={formatMoney(earnings.earnings.net, earnings.earnings.currency)}
                accessibilityLabel={`Earned today ${formatMoney(earnings.earnings.net, earnings.earnings.currency)}`}
              />
              <Text style={[styles.moneyDetail, { color: theme.colors.textSecondary, fontSize: fontSize.lg }]}>
                {`Gross ${formatMoney(earnings.earnings.gross, earnings.earnings.currency)} · GST ${formatMoney(earnings.earnings.gst, earnings.earnings.currency)}`}
              </Text>
            </>
          )}

          {earnings.status !== 'loading' && earnings.earnings === null && (
            <Text style={[styles.moneyDetail, { color: theme.colors.textSecondary, fontSize: fontSize.lg }]}>
              {earnings.error === null ? 'Nothing earned yet today' : 'Money not updated'}
            </Text>
          )}

          {earnings.isStale && (
            <Text testID="earnings-not-updated" style={[styles.moneyWarning, { color: theme.colors.warning, fontSize: fontSize.base }]}>
              Not updated — offline
            </Text>
          )}
        </TouchableOpacity>

        {/* Recent Stops */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}>Recent Stops</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/stops')}
            accessibilityRole="button"
            accessibilityLabel="See all the stops"
            style={[styles.seeAllButton, { minHeight: target.comfortable }]}
          >
            <Text style={[styles.seeAll, { color: theme.colors.brandPrimary, fontSize: fontSize.lg }]}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.stopsList}>
          {mockStops.slice(0, 5).map((stop) => (
            <TouchableOpacity
              key={stop.id}
              style={styles.stopItem}
              onPress={() => router.push('/(tabs)/stops')}
            >
              <View style={[styles.stopStatusDot, { backgroundColor: getStatusColor(stop.status) }]} />
              <View style={styles.stopInfo}>
                <Text style={[styles.stopAddress, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}>{stop.address}</Text>
                <Text style={[styles.stopSuburb, { color: theme.colors.textSecondary, fontSize: fontSize.lg }]}>{stop.suburb}</Text>
              </View>
              <Badge variant={getBadgeVariant(stop.status)}>
                {stop.status}
              </Badge>
            </TouchableOpacity>
          ))}
        </View>

        {/* Voice Assistant */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}>Voice Assistant</Text>
        </View>

        <VoiceButton
          size="large"
          disabled={!isReady}
          onPress={() => {
            if (voiceState === 'listening') {
              stopListening();
            } else {
              startListening();
            }
          }}
        />

        {voiceState !== 'idle' && (
          <View style={[styles.voiceStatus, { backgroundColor: theme.colors.surface }]}>
            <MaterialIcons name={voiceIcon} size={18} color={theme.colors.textSecondary} />
            <Text style={[styles.voiceStatusText, { color: theme.colors.textSecondary, fontSize: fontSize.lg }]}>
              {voiceState === 'listening'
                ? 'Listening'
                : voiceState === 'speaking'
                  ? 'Speaking'
                  : voiceState === 'processing'
                    ? 'Working it out'
                    : 'Ready'}
            </Text>
          </View>
        )}

        {/* Quick Commands */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}>Quick Commands</Text>
        </View>

        <View style={styles.quickCommands}>
          {[
            'Mark delivered',
            'Skip this stop',
            'Failed - no access',
            'Navigate to next',
            'Call customer',
            'Rescan label',
          ].map((cmd, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.quickCommandChip,
                { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
              ]}
              onPress={() => handleVoiceCommand(cmd.toLowerCase())}
              accessibilityRole="button"
              accessibilityLabel={cmd}
            >
              <Text style={[styles.quickCommandText, { color: theme.colors.brandPrimary, fontSize: fontSize.lg }]}>{cmd}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: space.lg, paddingBottom: space.huge },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.xl,
  },
  greeting: { fontWeight: '500' },
  driverName: { fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconButton: { padding: space.sm, alignItems: 'center', justifyContent: 'center' },
  statsGrid: {
    flexDirection: 'row',
    gap: space.md,
    marginBottom: space.xl,
  },
  statCard: { flex: 1, padding: space.lg },
  statLabel: { fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: space.xs },
  statValue: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  currentRunCard: { marginBottom: space.xl },
  currentRunHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.lg },
  currentRunTitle: { fontWeight: '600' },
  currentStopInfo: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  stopNumber: { width: 40, height: 40, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  stopNumberText: { fontWeight: '700' },
  stopDetails: { flex: 1 },
  stopAddress: { fontWeight: '600' },
  stopSuburb: {},
  doorTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    marginBottom: space.md,
  },
  doorTipText: { flex: 1, fontWeight: '500' },
  currentRunActions: { flexDirection: 'row', gap: space.sm },
  actionButton: { flex: 1 },
  moneyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
    marginBottom: space.xl,
    minHeight: target.comfortable,
  },
  moneyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moneyLabel: { fontWeight: '700', letterSpacing: 1 },
  moneyDetail: { marginTop: space.xs, fontWeight: '500' },
  moneyWarning: { marginTop: space.sm, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md, marginTop: space.sm },
  sectionTitle: { fontWeight: '600' },
  seeAll: { fontWeight: '600' },
  seeAllButton: { justifyContent: 'center' },
  stopsList: { gap: space.sm },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  stopStatusDot: { width: 10, height: 10, borderRadius: 5 },
  stopInfo: { flex: 1 },
  quickCommands: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  quickCommandChip: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    minHeight: target.comfortable,
    justifyContent: 'center',
  },
  quickCommandText: { fontWeight: '600' },
  voiceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    alignSelf: 'center',
    marginTop: space.sm,
  },
  voiceStatusText: { fontWeight: '600' },
});
