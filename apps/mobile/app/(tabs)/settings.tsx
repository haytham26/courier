/**
 * The settings.
 *
 * Every row is a control with a label, a role and a hint. The theme choice
 * is a radio group, the switches name the setting they turn on or off, and
 * the data rows say what they do. There is no emoji: the icons come from
 * the one icon set of the app.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Switch,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { setHapticsEnabled } from '@/motion/haptics';

const THEME_CHOICES = [
  { name: 'day', label: 'Day', icon: 'white-balance-sunny' },
  { name: 'night', label: 'Night', icon: 'weather-night' },
  { name: 'highContrast', label: 'High Contrast', icon: 'contrast-circle' },
] as const;

export default function SettingsScreen() {
  const { theme, themeName, setTheme } = useTheme();
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [drivingMode, setDrivingMode] = useState(false);
  const [autoNavigate, setAutoNavigate] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  const onHapticFeedbackChange = (value: boolean) => {
    setHapticFeedback(value);
    setHapticsEnabled(value);
  };

  return (
    <SafeAreaView
      testID="settings-screen"
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
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
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                Choose your preferred colour scheme
              </Text>
            </View>
            <View style={styles.themeSelector} accessibilityRole="radiogroup">
              {THEME_CHOICES.map((choice) => {
                const selected = themeName === choice.name;
                return (
                  <TouchableOpacity
                    key={choice.name}
                    style={[
                      styles.themeOption,
                      selected
                        ? {
                            borderColor: theme.colors.brandPrimary,
                            borderWidth: 2,
                            backgroundColor: `${theme.colors.brandPrimary}20`,
                          }
                        : { borderColor: theme.colors.border },
                    ]}
                    onPress={() => setTheme(choice.name)}
                    accessibilityRole="radio"
                    accessibilityLabel={choice.label}
                    accessibilityState={{ selected }}
                    testID={`settings-theme-${choice.name}`}
                  >
                    <MaterialCommunityIcons
                      name={choice.icon}
                      size={20}
                      color={selected ? theme.colors.brandPrimary : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.themeOptionText,
                        {
                          color: selected ? theme.colors.brandPrimary : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {choice.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Card>

        {/* Voice Settings */}
        <Card
          style={[styles.sectionCard, { backgroundColor: theme.colors.surface, marginTop: 16 }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Voice Assistant
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                Voice Commands
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                Enable voice control for hands-free operation
              </Text>
            </View>
            <Switch
              value={voiceEnabled}
              onValueChange={setVoiceEnabled}
              thumbColor={voiceEnabled ? theme.colors.brandPrimary : theme.colors.textTertiary}
              trackColor={{
                true: `${theme.colors.brandPrimary}33`,
                false: theme.colors.border,
              }}
              accessibilityLabel="Voice Commands"
              accessibilityHint="Turn the voice commands on or off"
              testID="settings-voice-commands"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                Driving Mode
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                Turn on by itself when driving is detected
              </Text>
            </View>
            <Switch
              value={drivingMode}
              onValueChange={setDrivingMode}
              thumbColor={drivingMode ? theme.colors.brandPrimary : theme.colors.textTertiary}
              trackColor={{
                true: `${theme.colors.brandPrimary}33`,
                false: theme.colors.border,
              }}
              accessibilityLabel="Driving Mode"
              accessibilityHint="Turn the night driving mode on or off"
              testID="settings-driving-mode"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                Auto Navigate
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                Start the navigation to the next stop by itself
              </Text>
            </View>
            <Switch
              value={autoNavigate}
              onValueChange={setAutoNavigate}
              thumbColor={autoNavigate ? theme.colors.brandPrimary : theme.colors.textTertiary}
              trackColor={{
                true: `${theme.colors.brandPrimary}33`,
                false: theme.colors.border,
              }}
              accessibilityLabel="Auto Navigate"
              accessibilityHint="Start the navigation to the next stop by itself"
              testID="settings-auto-navigate"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                Haptic Feedback
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                Vibrate when a voice command is understood
              </Text>
            </View>
            <Switch
              value={hapticFeedback}
              onValueChange={onHapticFeedbackChange}
              thumbColor={hapticFeedback ? theme.colors.brandPrimary : theme.colors.textTertiary}
              trackColor={{
                true: `${theme.colors.brandPrimary}33`,
                false: theme.colors.border,
              }}
              accessibilityLabel="Haptic Feedback"
              accessibilityHint="Vibrate when a voice command is understood"
              testID="settings-haptics"
            />
          </View>
        </Card>

        {/* Earbud Protocol */}
        <Card
          style={[styles.sectionCard, { backgroundColor: theme.colors.surface, marginTop: 16 }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Earbud Controls
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            Set up your headset button shortcuts
          </Text>

          <View style={styles.earbudList}>
            {[
              {
                presses: '1x',
                action: 'Mark Delivered',
                desc: 'Confirm the delivery at the current stop',
              },
              {
                presses: '2x',
                action: 'Skip Stop',
                desc: 'Skip the current stop and move to the next',
              },
              {
                presses: '3x',
                action: 'Failed Delivery',
                desc: 'Mark the stop as failed - no access or closed',
              },
              {
                presses: 'Long',
                action: 'Voice Mode',
                desc: 'Start the voice assistant',
              },
            ].map((item) => (
              <View
                key={item.action}
                style={styles.earbudItem}
                accessible
                accessibilityLabel={`${item.presses} press, ${item.action}. ${item.desc}`}
              >
                <View style={styles.earbudPresses}>
                  <Text
                    style={[
                      styles.earbudPressesText,
                      {
                        color: theme.colors.brandPrimary,
                        backgroundColor: `${theme.colors.brandPrimary}20`,
                      },
                    ]}
                  >
                    {item.presses}
                  </Text>
                </View>
                <View style={styles.earbudInfo}>
                  <Text style={[styles.earbudAction, { color: theme.colors.textPrimary }]}>
                    {item.action}
                  </Text>
                  <Text style={[styles.earbudDesc, { color: theme.colors.textSecondary }]}>
                    {item.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Data & Sync */}
        <Card
          style={[styles.sectionCard, { backgroundColor: theme.colors.surface, marginTop: 16 }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Data and Sync
          </Text>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => console.log('Sync now')}
            accessibilityRole="button"
            accessibilityLabel="Sync Now"
            accessibilityHint="Syncs the run with the server"
            testID="settings-sync-now"
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                Sync Now
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                Sync the run with the server by hand
              </Text>
            </View>
            <MaterialCommunityIcons name="sync" size={24} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => console.log('Offline maps')}
            accessibilityRole="button"
            accessibilityLabel="Offline Maps"
            accessibilityHint="Canterbury region, 45 MB, updated every week"
            testID="settings-offline-maps"
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                Offline Maps
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                Canterbury region - 45 MB (updated weekly)
              </Text>
            </View>
            <MaterialCommunityIcons name="map" size={24} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => console.log('Clear cache')}
            accessibilityRole="button"
            accessibilityLabel="Clear Cache"
            accessibilityHint="Removes the temporary files and the cached data"
            testID="settings-clear-cache"
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                Clear Cache
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                Remove temporary files and cached data
              </Text>
            </View>
            <MaterialCommunityIcons
              name="delete-outline"
              size={24}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>
        </Card>

        {/* Diagnostics */}
        <Card
          style={[styles.sectionCard, { backgroundColor: theme.colors.surface, marginTop: 16 }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Diagnostics
          </Text>

          <TouchableOpacity
            testID="settings-compat"
            style={styles.settingRow}
            onPress={() => router.push('/compat')}
            accessibilityRole="button"
            accessibilityLabel="Compatibility"
            accessibilityHint="Checks the voice, camera, map, database and audio modules"
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                Compatibility
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                Check the voice, camera, map, database and audio modules
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>
        </Card>

        {/* About */}
        <Card
          style={[styles.sectionCard, { backgroundColor: theme.colors.surface, marginTop: 16 }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>About</Text>

          <View style={styles.aboutItem}>
            <Text style={[styles.aboutLabel, { color: theme.colors.textSecondary }]}>Version</Text>
            <Text style={[styles.aboutValue, { color: theme.colors.textPrimary }]}>
              0.1.0 (Alpha)
            </Text>
          </View>
          <View style={styles.aboutItem}>
            <Text style={[styles.aboutLabel, { color: theme.colors.textSecondary }]}>Build</Text>
            <Text style={[styles.aboutValue, { color: theme.colors.textPrimary }]}>
              Expo 58 / React Native 0.88
            </Text>
          </View>
          <View style={styles.aboutItem}>
            <Text style={[styles.aboutLabel, { color: theme.colors.textSecondary }]}>
              Voice Engine
            </Text>
            <Text style={[styles.aboutValue, { color: theme.colors.textPrimary }]}>
              On-device speech, server voice when online
            </Text>
          </View>
          <View style={styles.aboutItem}>
            <Text style={[styles.aboutLabel, { color: theme.colors.textSecondary }]}>Maps</Text>
            <Text style={[styles.aboutValue, { color: theme.colors.textPrimary }]}>
              MapLibre GL Native + PMTiles
            </Text>
          </View>
          <View style={styles.aboutItem}>
            <Text style={[styles.aboutLabel, { color: theme.colors.textSecondary }]}>Sync</Text>
            <Text style={[styles.aboutValue, { color: theme.colors.textPrimary }]}>
              op-sqlite (encrypted, offline-first)
            </Text>
          </View>
        </Card>

        {/* Danger Zone */}
        <Card
          style={[styles.sectionCard, { backgroundColor: theme.colors.surface, marginTop: 16 }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>Danger Zone</Text>
          <Button
            variant="outline"
            onPress={() => console.log('Reset all data')}
            style={styles.dangerButton}
          >
            <MaterialCommunityIcons name="delete-outline" size={20} color={theme.colors.error} />
            {' Reset All Data'}
          </Button>
          <Button
            variant="outline"
            onPress={() => console.log('Logout')}
            style={styles.dangerButton}
          >
            <MaterialCommunityIcons name="logout" size={20} color={theme.colors.error} />
            {' Sign Out'}
          </Button>
        </Card>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textTertiary }]}>
            Courier Copilot - Voice-first delivery for NZ/AU
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { fontSize: 34, fontWeight: '800' },
  sectionCard: { padding: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '600', marginBottom: 16 },
  sectionDescription: { fontSize: 19, marginBottom: 16 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 12,
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 20, fontWeight: '600', marginBottom: 2 },
  settingDescription: { fontSize: 17 },
  themeSelector: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 28,
    borderWidth: 1,
  },
  themeOptionText: { fontSize: 19, fontWeight: '600' },
  earbudList: { gap: 12 },
  earbudItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 4,
  },
  earbudPresses: {
    width: 64,
    minHeight: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earbudPressesText: { fontSize: 17, fontWeight: '700' },
  earbudInfo: { flex: 1 },
  earbudAction: { fontSize: 20, fontWeight: '600' },
  earbudDesc: { fontSize: 17 },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  aboutLabel: { fontSize: 19 },
  aboutValue: { fontSize: 19, fontWeight: '500' },
  dangerButton: { marginBottom: 8 },
  footer: { paddingTop: 24, alignItems: 'center' },
  footerText: { fontSize: 17 },
});
