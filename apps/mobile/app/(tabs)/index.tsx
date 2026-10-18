import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { VoiceButton } from '@/voice/VoiceButton';
import { useVoice } from '@/voice/VoiceService';

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

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { state: voiceState, lastCommand, startListening, stopListening, isReady } = useVoice();

  const pendingCount = mockStops.filter(s => s.status === 'pending').length;
  const deliveredCount = mockStops.filter(s => s.status === 'delivered').length;
  const activeStop = mockStops.find(s => s.status === 'active');

  const statusColorMap: Record<string, keyof typeof theme.colors> = {
    delivered: 'statusDelivered',
    pending: 'statusPending',
    active: 'statusActive',
    failed: 'statusFailed',
    skipped: 'statusSkipped',
  };

  const getStatusColor = (status: Stop['status']) => {
    return theme.colors[statusColorMap[status]] || theme.colors.textTertiary;
  };

  const handleVoiceCommand = (command: string) => {
    console.log('Voice command:', command);
    // TODO: Connect to voice module
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.colors.textPrimary }]}>Good morning</Text>
            <Text style={[styles.driverName, { color: theme.colors.textPrimary }]}>Driver</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/settings')}>
              <Text style={{ fontSize: 24 }}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Delivered</Text>
            <Text style={[styles.statValue, { color: theme.colors.statusDelivered }]}>{deliveredCount}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Remaining</Text>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{pendingCount}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Success Rate</Text>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>98%</Text>
          </Card>
        </View>

        {/* Current Run Progress */}
        {activeStop && (
          <Card style={[styles.currentRunCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.currentRunHeader}>
              <Text style={[styles.currentRunTitle, { color: theme.colors.textPrimary }]}>Current Run</Text>
              <Badge variant="active">IN PROGRESS</Badge>
            </View>
            <View style={styles.currentStopInfo}>
              <View style={styles.stopNumber}>
                <Text style={[styles.stopNumberText, { color: theme.colors.textInverse, backgroundColor: theme.colors.brandPrimary }]}>
                  #{activeStop.sequence}
                </Text>
              </View>
              <View style={styles.stopDetails}>
                <Text style={[styles.stopAddress, { color: theme.colors.textPrimary }]}>{activeStop.address}</Text>
                <Text style={[styles.stopSuburb, { color: theme.colors.textSecondary }]}>{activeStop.suburb}</Text>
              </View>
            </View>
            <View style={styles.currentRunActions}>
              <Button
                variant="primary"
                onPress={() => handleVoiceCommand('mark delivered')}
                style={styles.actionButton}
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

        {/* Recent Stops */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Recent Stops</Text>
          <TouchableOpacity onPress={() => router.push('/stops')}>
            <Text style={[styles.seeAll, { color: theme.colors.brandPrimary }]}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.stopsList}>
          {mockStops.slice(0, 5).map((stop) => (
            <TouchableOpacity
              key={stop.id}
              style={styles.stopItem}
              onPress={() => router.push(`/stops/${stop.id}`)}
            >
              <View style={[
                styles.stopStatusDot,
                { backgroundColor: getStatusColor(stop.status) }
              ]} />
              <View style={styles.stopInfo}>
                <Text style={[styles.stopAddress, { color: theme.colors.textPrimary }]}>{stop.address}</Text>
                <Text style={[styles.stopSuburb, { color: theme.colors.textSecondary }]}>{stop.suburb}</Text>
              </View>
              <Badge variant={stop.status === 'delivered' ? 'success' : stop.status === 'active' ? 'active' : 'default'}>
                {stop.status}
              </Badge>
            </TouchableOpacity>
          ))}
        </View>

        {/* Voice Assistant */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Voice Assistant</Text>
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

        {/* Voice Status Display */}
        {voiceState !== 'idle' && (
          <View style={styles.voiceStatus}>
            <Text style={[styles.voiceStatusText, { color: theme.colors.textSecondary }]}>
              Status: {voiceState === 'listening' ? '🎙️ Listening...' : 
                       voiceState === 'speaking' ? '🔊 Speaking...' :
                       voiceState === 'processing' ? '⏳ Processing...' :
                       'Ready'}
            </Text>
          </View>
        )}

        {/* Quick Commands */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Quick Commands</Text>
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
              style={styles.quickCommandChip}
              onPress={() => handleVoiceCommand(cmd.toLowerCase())}
            >
              <Text style={[styles.quickCommandText, { color: theme.colors.brandPrimary }]}>{cmd}</Text>
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
  greeting: { fontSize: 18, fontWeight: '400' },
  driverName: { fontSize: 28, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconButton: { padding: 8 },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: { flex: 1, padding: 16 },
  statLabel: { fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: '700' },
  currentRunCard: { marginBottom: 24 },
  currentRunHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  currentRunTitle: { fontSize: 18, fontWeight: '600' },
  currentStopInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  stopNumber: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  stopNumberText: { fontSize: 16, fontWeight: '700' },
  stopDetails: { flex: 1 },
  stopAddress: { fontSize: 16, fontWeight: '500' },
  stopSuburb: { fontSize: 14 },
  currentRunActions: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  seeAll: { fontSize: 14, fontWeight: '500' },
  stopsList: { gap: 8 },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  stopStatusDot: { width: 10, height: 10, borderRadius: 5 },
  stopInfo: { flex: 1 },
  quickCommands: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  quickCommandChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  quickCommandText: { fontSize: 13, fontWeight: '500' },
  voiceButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'center',
    minWidth: 200,
    alignItems: 'center',
  },
  voiceButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});