/**
 * Today's list - the opening screen.
 *
 * The contract (`docs/design/SYSTEM.md` §3): the big number first, the next
 * stop as the largest element, **one** primary action of 72 pt, and a voice
 * bar that shows the state of the voice engine.
 *
 * The copy is plain NZ English, there is no emoji anywhere, and every
 * control has an accessibility label and a role.
 */
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { VoiceButton } from '@/voice/VoiceButton';
import { useVoice } from '@/voice/useVoice';
import { MorningBriefCard } from '@/voice/MorningBriefCard';
import { useCourierVoice } from '@/voice/useCourierVoice';
import { useOptionalAuth } from '@/providers/AuthProvider';
import { hapticFor } from '@/motion/haptics';

interface Stop {
  id: string;
  address: string;
  suburb: string;
  status: 'pending' | 'active' | 'delivered' | 'failed' | 'skipped';
  sequence: number;
  coordinates?: { lat: number; lng: number };
}

const mockStops: Stop[] = [
  {
    id: '1',
    address: '2/14 Riccarton Road',
    suburb: 'Riccarton',
    status: 'delivered',
    sequence: 1,
  },
  {
    id: '2',
    address: '45 Papanui Road',
    suburb: 'Merivale',
    status: 'active',
    sequence: 2,
  },
  {
    id: '3',
    address: '120 Blenheim Road',
    suburb: 'Upper Riccarton',
    status: 'pending',
    sequence: 3,
  },
  {
    id: '4',
    address: '78 Main South Road',
    suburb: 'Sockburn',
    status: 'pending',
    sequence: 4,
  },
  {
    id: '5',
    address: '234 Colombo Street',
    suburb: 'Sydenham',
    status: 'pending',
    sequence: 5,
  },
];

/** The words of the status labels, so the screen reader reads a sentence. */
const statusLabels: Record<Stop['status'], string> = {
  delivered: 'Delivered',
  pending: 'Pending',
  active: 'Active',
  failed: 'Failed',
  skipped: 'Skipped',
};

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { state: voiceState, lastCommand, startListening, stopListening, isReady, speak } =
    useVoice();
  const auth = useOptionalAuth();
  const courierVoice = useCourierVoice({ driverId: auth?.user?.id ?? null });

  const pendingCount = mockStops.filter((s) => s.status === 'pending').length;
  const deliveredCount = mockStops.filter((s) => s.status === 'delivered').length;
  const activeStop = mockStops.find((s) => s.status === 'active');

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
      case 'delivered':
        return 'success';
      case 'active':
        return 'active';
      case 'failed':
        return 'error';
      case 'skipped':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleVoiceCommand = (command: string) => {
    // A delivery is confirmed with a haptic, an error with the error one.
    if (command === 'mark delivered') {
      hapticFor('deliver');
    } else if (command === 'fail') {
      hapticFor('error');
    } else {
      hapticFor('confirm');
    }
    console.log('Voice command:', command);
  };

  // Handle voice commands from the voice service
  useEffect(() => {
    if (lastCommand) {
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
          handleVoiceCommand('start shift');
          break;
        case 'end_shift':
          handleVoiceCommand('end shift');
          break;
        case 'emergency':
          handleVoiceCommand('emergency');
          break;
      }
    }
  }, [lastCommand]);

  return (
    <SafeAreaView
      testID="today-screen"
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>
              Good morning
            </Text>
            <Text style={[styles.driverName, { color: theme.colors.textPrimary }]}>Driver</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              accessibilityHint="Opens the settings"
              testID="today-settings"
            >
              <MaterialCommunityIcons name="cog" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* The morning brief */}
        <MorningBriefCard
          stops={mockStops.length}
          newAddresses={0}
          weather="dry"
          spoken={courierVoice.brief?.text ?? null}
          onSpeak={() => {
            void (async () => {
              const line = await courierVoice.refreshBrief();
              if (line !== null && line.text.length > 0) {
                await speak(line.text);
              }
            })();
          }}
        />

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Delivered</Text>
            <Text style={[styles.statValue, { color: theme.colors.statusDelivered }]}>
              {deliveredCount}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Remaining</Text>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {pendingCount}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Success Rate
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>98%</Text>
          </Card>
        </View>

        {/* Current Run Progress */}
        {activeStop ? (
          <Card style={[styles.currentRunCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.currentRunHeader}>
              <Text style={[styles.currentRunTitle, { color: theme.colors.textPrimary }]}>
                Current Run
              </Text>
              <Badge variant="active">IN PROGRESS</Badge>
            </View>
            <View style={styles.currentStopInfo}>
              <View style={styles.stopNumber}>
                <Text
                  style={[
                    styles.stopNumberText,
                    {
                      color: theme.colors.textInverse,
                      backgroundColor: theme.colors.brandPrimary,
                    },
                  ]}
                >
                  #{activeStop.sequence}
                </Text>
              </View>
              <View style={styles.stopDetails}>
                <Text style={[styles.stopAddress, { color: theme.colors.textPrimary }]}>
                  {activeStop.address}
                </Text>
                <Text style={[styles.stopSuburb, { color: theme.colors.textSecondary }]}>
                  {activeStop.suburb}
                </Text>
              </View>
            </View>
            <View style={styles.currentRunActions}>
              <Button
                variant="primary"
                size="lg"
                onPress={() => handleVoiceCommand('mark delivered')}
                style={styles.actionButton}
                testID="today-mark-delivered"
              >
                Mark Delivered
              </Button>
              <Button
                variant="secondary"
                onPress={() => handleVoiceCommand('skip')}
                style={styles.actionButton}
                testID="today-skip"
              >
                Skip
              </Button>
              <Button
                variant="outline"
                onPress={() => handleVoiceCommand('fail')}
                style={styles.actionButton}
                testID="today-fail"
              >
                Failed
              </Button>
            </View>
          </Card>
        ) : null}

        {/* Recent Stops */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Recent Stops
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/stops')}
            accessibilityRole="link"
            accessibilityLabel="See all stops"
            testID="today-see-all"
          >
            <Text style={[styles.seeAll, { color: theme.colors.brandPrimary }]}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.stopsList}>
          {mockStops.slice(0, 5).map((stop) => (
            <TouchableOpacity
              key={stop.id}
              style={styles.stopItem}
              onPress={() => router.push(`/stops/${stop.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Stop ${stop.sequence}, ${stop.address}, ${stop.suburb}, ${statusLabels[stop.status]}`}
              testID={`today-stop-${stop.id}`}
            >
              <View
                style={[styles.stopStatusDot, { backgroundColor: getStatusColor(stop.status) }]}
                importantForAccessibility="no-hide-descendants"
                accessibilityElementsHidden
              />
              <View style={styles.stopInfo}>
                <Text style={[styles.stopAddress, { color: theme.colors.textPrimary }]}>
                  {stop.address}
                </Text>
                <Text style={[styles.stopSuburb, { color: theme.colors.textSecondary }]}>
                  {stop.suburb}
                </Text>
              </View>
              <Badge variant={getBadgeVariant(stop.status)}>{statusLabels[stop.status]}</Badge>
            </TouchableOpacity>
          ))}
        </View>

        {/* Voice Assistant */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Voice Assistant
          </Text>
        </View>

        <VoiceButton
          size="large"
          disabled={!isReady}
          onPress={() => {
            if (voiceState === 'listening') {
              void stopListening();
            } else {
              void startListening();
            }
          }}
        />

        {/* Voice Status Display */}
        {voiceState !== 'idle' ? (
          <View style={[styles.voiceStatus, { backgroundColor: theme.colors.surface }]}>
            <MaterialCommunityIcons
              name={
                voiceState === 'listening'
                  ? 'microphone'
                  : voiceState === 'speaking'
                    ? 'volume-high'
                    : 'brain'
              }
              size={20}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.voiceStatusText, { color: theme.colors.textSecondary }]}>
              {voiceState === 'listening'
                ? 'Listening'
                : voiceState === 'speaking'
                  ? 'Speaking'
                  : voiceState === 'processing'
                    ? 'Thinking'
                    : 'Ready'}
            </Text>
          </View>
        ) : null}

        {/* Quick Commands */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Quick Commands
          </Text>
        </View>

        <View style={styles.quickCommands}>
          {[
            'Mark delivered',
            'Skip this stop',
            'Failed - no access',
            'Navigate to next',
            'Call customer',
            'Rescan label',
          ].map((cmd) => (
            <TouchableOpacity
              key={cmd}
              style={[
                styles.quickCommandChip,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                },
              ]}
              onPress={() => handleVoiceCommand(cmd.toLowerCase())}
              accessibilityRole="button"
              accessibilityLabel={cmd}
            >
              <Text style={[styles.quickCommandText, { color: theme.colors.brandPrimary }]}>
                {cmd}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerText: { flex: 1 },
  greeting: { fontSize: 19, fontWeight: '400' },
  driverName: { fontSize: 34, fontWeight: '800' },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: { flex: 1, padding: 16 },
  statLabel: { fontSize: 17, fontWeight: '500', marginBottom: 4 },
  statValue: { fontSize: 34, fontWeight: '800' },
  currentRunCard: { marginBottom: 24 },
  currentRunHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentRunTitle: { fontSize: 22, fontWeight: '600' },
  currentStopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  stopNumber: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberText: { fontSize: 20, fontWeight: '700' },
  stopDetails: { flex: 1 },
  stopAddress: { fontSize: 20, fontWeight: '600' },
  stopSuburb: { fontSize: 19 },
  currentRunActions: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 22, fontWeight: '600' },
  seeAll: { fontSize: 19, fontWeight: '600' },
  stopsList: { gap: 8 },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  stopStatusDot: { width: 12, height: 12, borderRadius: 6 },
  stopInfo: { flex: 1 },
  quickCommands: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  quickCommandChip: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 28,
    borderWidth: 1,
  },
  quickCommandText: { fontSize: 19, fontWeight: '500' },
  voiceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 8,
  },
  voiceStatusText: { fontSize: 19, fontWeight: '500', textAlign: 'center' },
});
