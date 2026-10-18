import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Switch, ScrollView } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { cn } from '@/utils/cn';

export default function SettingsScreen() {
  const { theme, themeName, setTheme, toggleTheme } = useTheme();
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [drivingMode, setDrivingMode] = useState(false);
  const [autoNavigate, setAutoNavigate] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Settings</Text>
        </View>

        {/* Theme Section */}
        <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Appearance</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>Theme</Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>Choose your preferred color scheme</Text>
            </View>
            <View style={styles.themeSelector}>
              {(['day', 'night', 'highContrast'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.themeOption,
                    themeName === t && { borderColor: theme.colors.brandPrimary, borderWidth: 2, backgroundColor: theme.colors.brandPrimary + '15' },
                    { borderColor: theme.colors.border }
                  ]}
                  onPress={() => setTheme(t)}
                >
                  <Text style={[
                    styles.themeOptionText,
                    { color: themeName === t ? theme.colors.brandPrimary : theme.colors.textSecondary }
                  ]}>
                    {t === 'day' ? '☀️ Day' : t === 'night' ? '🌙 Night' : '🌓 High Contrast'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        {/* Voice Settings */}
        <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface, marginTop: 16 }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Voice Assistant</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>Voice Commands</Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>Enable voice control for hands-free operation</Text>
            </View>
            <Switch
              value={voiceEnabled}
              onValueChange={setVoiceEnabled}
              thumbColor={voiceEnabled ? theme.colors.brandPrimary : theme.colors.textTertiary}
              trackColor={{ true: theme.colors.brandPrimary + '33', false: theme.colors.border }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>Driving Mode</Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>Auto-activate when driving detected</Text>
            </View>
            <Switch
              value={drivingMode}
              onValueChange={setDrivingMode}
              thumbColor={drivingMode ? theme.colors.brandPrimary : theme.colors.textTertiary}
              trackColor={{ true: theme.colors.brandPrimary + '33', false: theme.colors.border }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>Auto Navigate</Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>Auto-start navigation to next stop</Text>
            </View>
            <Switch
              value={autoNavigate}
              onValueChange={setAutoNavigate}
              thumbColor={autoNavigate ? theme.colors.brandPrimary : theme.colors.textTertiary}
              trackColor={{ true: theme.colors.brandPrimary + '33', false: theme.colors.border }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>Haptic Feedback</Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>Vibration on voice command recognition</Text>
            </View>
            <Switch
              value={hapticFeedback}
              onValueChange={setHapticFeedback}
              thumbColor={hapticFeedback ? theme.colors.brandPrimary : theme.colors.textTertiary}
              trackColor={{ true: theme.colors.brandPrimary + '33', false: theme.colors.border }}
            />
          </View>
        </Card>

        {/* Earbud Protocol */}
        <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface, marginTop: 16 }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Earbud Controls</Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>Configure your headset button shortcuts</Text>
          
          <View style={styles.earbudList}>
            {[
              { presses: '1×', action: 'Mark Delivered', desc: 'Confirm delivery at current stop' },
              { presses: '2×', action: 'Skip Stop', desc: 'Skip current stop, move to next' },
              { presses: '3×', action: 'Failed Delivery', desc: 'Mark as failed - no access/closed' },
              { presses: 'Long', action: 'Voice Mode', desc: 'Activate voice assistant' },
            ].map((item, i) => (
              <View key={i} style={styles.earbudItem}>
                <View style={styles.earbudPresses}>
                  <Text style={[styles.earbudPressesText, { color: theme.colors.brandPrimary, backgroundColor: theme.colors.brandPrimary + '15' }]}>{item.presses}</Text>
                </View>
                <View style={styles.earbudInfo}>
                  <Text style={[styles.earbudAction, { color: theme.colors.textPrimary }]}>{item.action}</Text>
                  <Text style={[styles.earbudDesc, { color: theme.colors.textSecondary }]}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Data & Sync */}
        <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface, marginTop: 16 }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Data & Sync</Text>
          
          <TouchableOpacity style={styles.settingRow} onPress={() => console.log('Sync now')}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>Sync Now</Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>Manually sync with server</Text>
            </View>
            <Text style={{ fontSize: 20 }}>↻</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={() => console.log('Offline maps')}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>Offline Maps</Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>Canterbury region - 45 MB (updated weekly)</Text>
            </View>
            <Text style={{ fontSize: 20 }}>🗺️</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={() => console.log('Clear cache')}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>Clear Cache</Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>Remove temporary files and cached data</Text>
            </View>
            <Text style={{ fontSize: 20 }}>🗑️</Text>
          </TouchableOpacity>
        </Card>

        {/* About */}
        <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface, marginTop: 16 }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>About</Text>
          
          <View style={styles.aboutItem}>
            <Text style={[styles.aboutLabel, { color: theme.colors.textSecondary }]}>Version</Text>
            <Text style={[styles.aboutValue, { color: theme.colors.textPrimary }]}>0.1.0 (Alpha)</Text>
          </View>
          <View style={styles.aboutItem}>
            <Text style={[styles.aboutLabel, { color: theme.colors.textSecondary }]}>Build</Text>
            <Text style={[styles.aboutValue, { color: theme.colors.textPrimary }]}>Expo 58 / React Native 0.88</Text>
          </View>
          <View style={styles.aboutItem}>
            <Text style={[styles.aboutLabel, { color: theme.colors.textSecondary }]}>Voice Engine</Text>
            <Text style={[styles.aboutValue, { color: theme.colors.textPrimary }]}>Sherpa-onnx + Pipecat (offline-first)</Text>
          </View>
          <View style={styles.aboutItem}>
            <Text style={[styles.aboutLabel, { color: theme.colors.textSecondary }]}>Maps</Text>
            <Text style={[styles.aboutValue, { color: theme.colors.textPrimary }]}>MapLibre GL Native + PMTiles</Text>
          </View>
          <View style={styles.aboutItem}>
            <Text style={[styles.aboutLabel, { color: theme.colors.textSecondary }]}>Sync</Text>
            <Text style={[styles.aboutValue, { color: theme.colors.textPrimary }]}>PowerSync + op-sqlite</Text>
          </View>
        </Card>

        {/* Danger Zone */}
        <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface, marginTop: 16 }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>Danger Zone</Text>
          <Button variant="outline" onPress={() => console.log('Reset all data')} style={styles.dangerButton}>
            🗑️ Reset All Data
          </Button>
          <Button variant="outline" onPress={() => console.log('Logout')} style={styles.dangerButton}>
            🚪 Sign Out
          </Button>
        </Card>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textTertiary }]}>Courier Copilot — Voice-first delivery for NZ/AU</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700' },
  sectionCard: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  sectionDescription: { fontSize: 14, marginBottom: 16 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
  settingDescription: { fontSize: 13 },
  themeSelector: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  themeOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  themeOptionText: { fontSize: 13, fontWeight: '600' },
  earbudList: { gap: 12 },
  earbudItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 4 },
  earbudPresses: { width: 60, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  earbudPressesText: { fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
  earbudInfo: { flex: 1 },
  earbudAction: { fontSize: 16, fontWeight: '500' },
  earbudDesc: { fontSize: 13 },
  aboutItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  aboutLabel: { fontSize: 14 },
  aboutValue: { fontSize: 14, fontWeight: '500', fontFamily: 'monospace' },
  dangerButton: { marginBottom: 8 },
  footer: { paddingTop: 24, alignItems: 'center' },
  footerText: { fontSize: 13 },
});