/**
 * Settings - the Account tab on the chosen tokens (T6 slice 3, screen 11).
 *
 * The reference is a short, glanceable list: who is signed in, then the rows
 * that change the run - the voice, the map, the device and the team. The
 * previous screen held the same settings as a long form on the legacy theme;
 * this one keeps every one of them and puts them where the reference puts
 * them, and the settings stay real:
 *
 * - the detail level and the voice are the stored VoiceSettings, saved through
 *   the same hook the Copilot dock reads;
 * - the map style is the driver's stored mode (the same `viewModes` the Map
 *   tab reads) and the offline map row is the pack's real state;
 * - the haptics are the stored flag the motion module reads;
 * - light and dark follow the chosen mode, which follows the device: the second
 *   day/night selector is gone, exactly as it was on the Map tab (D37).
 *
 * The icon colour carries the meaning (the repo's own chip pattern, D33-safe as
 * a non-text role), on the fill tile: no tile invents a colour. The rows the
 * design gives no screen for yet are honest: they carry the reference's copy and
 * they do nothing rather than pretend. The tab testID is the Maestro contract,
 * so it stays.
 *
 * The copy is plain New Zealand English, there is no emoji anywhere, and every
 * control has an accessibility label and a role.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useChosen } from '@/components/chosen';
import { areHapticsEnabled, hapticFor, setHapticsEnabled } from '@/motion/haptics';
import { useMapBoot } from '@/maps/useMapBoot';
import { useDriverId } from '@/maps/useDriverId';
import { readStoredViewMode } from '@/maps/viewModes';
import { createFilePreferenceStore } from '@/sync/preferenceFiles';
import { createMemoryPreferenceStore } from '@/sync/storage';
import { VOICE_VERBOSITIES, type VoiceSettings, type VoiceVerbosity } from '@/voice/settings';
import { useCourierVoice } from '@/voice/useCourierVoice';
import { radii, spacing, typography } from '@courier/design-tokens/chosen';

/** The detail levels, as the reference's chips spell them. */
const VERBOSITY_LABELS: Record<VoiceVerbosity, string> = {
  minimal: 'Minimal',
  normal: 'Normal',
  chatty: 'Chatty',
};

/** The voices the app ships, as the row spells them. */
const VOICE_LABELS: Record<string, string> = {
  nz: 'Aria',
  en_au: 'Kahu',
  en_gb: 'Isla',
  en_us: 'Sage',
};

/** The map modes, as the row spells them. */
const VIEW_MODE_LABELS: Record<string, string> = {
  flat: '2D',
  '3d': '3D',
  satellite: 'Satellite',
  auto: 'Auto',
};

/** A tile colour: one of the token's meaning colours, never a raw value. */
type TileTone = 'accent' | 'success' | 'danger' | 'warning' | 'info2';

/** One row of a group. */
interface Row {
  key: string;
  label: string;
  /** The value the row carries, when it carries one. */
  value?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tone: TileTone;
  /** What the row does when the courier taps it. */
  onPress?: () => void;
  testID?: string;
}

/** The initials of the signed-in courier, for the profile card. */
const PROFILE_INITIALS = 'TR';

export default function SettingsScreen() {
  const { t } = useChosen();
  const courierVoice = useCourierVoice();
  const { pack } = useMapBoot();
  const [haptics, setHaptics] = useState(() => areHapticsEnabled());

  // The preferences the map mode is kept in (the Map tab's own store): a device
  // whose file system will not open still gets the screen.
  const fileStore = useMemo(() => {
    try {
      return createFilePreferenceStore();
    } catch {
      return createMemoryPreferenceStore();
    }
  }, []);

  const settings = courierVoice.settings;
  // The detail level is held here so a tap answers at once; the hook's value is
  // the stored truth it is written back to.
  const [verbosity, setVerbosity] = useState<VoiceVerbosity>(settings?.verbosity ?? 'normal');
  const voiceLabel = settings ? VOICE_LABELS[settings.voice] ?? settings.voice : 'Aria';

  // The map style row shows the driver's stored mode: the same one the Map tab
  // reads, so the two never disagree. The choice itself stays on the Map tab.
  const driverId = useDriverId();
  const [viewMode, setViewMode] = useState<string>('flat');
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await readStoredViewMode(fileStore, driverId);
      if (!cancelled && stored) {
        setViewMode(stored);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [driverId]);

  const save = useCallback(
    (patch: VoiceSettings) => {
      void courierVoice.saveSettings(patch);
    },
    [courierVoice],
  );

  const chooseVerbosity = useCallback(
    (next: VoiceVerbosity) => {
      setVerbosity(next);
      if (settings) {
        save({ ...settings, verbosity: next });
      }
      hapticFor('confirm');
    },
    [save, settings],
  );

  const toggleHaptics = useCallback((next: boolean) => {
    setHaptics(next);
    setHapticsEnabled(next);
    if (next) {
      hapticFor('confirm');
    }
  }, []);

  // The offline map row says what is true: the pack when it is ready, and the
  // plain truth when it is not.
  const offlineState = useMemo(() => {
    if (pack?.state.status === 'ready') {
      return 'Ready';
    }
    if (pack?.state.status === 'missing') {
      return 'Not on this device';
    }
    return 'Checking';
  }, [pack]);

  const voiceRows: Row[] = [
    { key: 'voice', label: 'Voice', value: voiceLabel, icon: 'volume-medium', tone: 'warning', testID: 'settings-voice' },
    {
      key: 'verbosity',
      label: 'Detail level',
      value: VERBOSITY_LABELS[verbosity],
      icon: 'chatbubble-ellipses',
      tone: 'info2',
      testID: 'settings-verbosity',
    },
    { key: 'chat', label: 'Casual Chat', icon: 'cafe', tone: 'success', testID: 'settings-chat' },
  ];

  const mapRows: Row[] = [
    {
      key: 'map-style',
      label: 'Map Style',
      value: VIEW_MODE_LABELS[viewMode] ?? '2D',
      icon: 'map',
      tone: 'accent',
      onPress: () => router.navigate('/map'),
      testID: 'settings-map-style',
    },
    {
      key: 'offline',
      label: 'Offline Map',
      value: offlineState,
      icon: 'map-outline',
      tone: 'success',
      onPress: () => router.navigate('/map'),
      testID: 'settings-offline',
    },
  ];

  const deviceRows: Row[] = [
    { key: 'keep-on', label: 'Keep Screen On', icon: 'sunny', tone: 'accent', testID: 'settings-keep-on' },
    // The lock screen's glance (screen 13): the reference's content, opened
    // here because the phone's own lock screen is the OS surface (the Live
    // Activity and the ongoing notification) and this is the way to see it
    // without locking the phone.
    {
      key: 'lock-screen',
      label: 'Lock Screen',
      icon: 'lock-closed',
      tone: 'info2',
      onPress: () => {
        hapticFor('confirm');
        router.navigate('/lock-screen');
      },
      testID: 'settings-lock-screen',
    },
    { key: 'face-id', label: 'Face ID', icon: 'scan', tone: 'info2', testID: 'settings-face-id' },
  ];

  const teamRows: Row[] = [
    { key: 'team', label: 'Team', value: 'Northwood', icon: 'people', tone: 'warning', testID: 'settings-team' },
  ];

  return (
    <SafeAreaView testID="settings-screen" style={[styles.container, { backgroundColor: t.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: t.colors.label }]} maxFontSizeMultiplier={1.6}>
          Settings
        </Text>

        <View style={[styles.profile, { backgroundColor: t.colors.card }]}>
          <View style={[styles.avatar, { backgroundColor: t.colors.fill }]}>
            <Text style={[styles.avatarText, { color: t.colors.secondaryLabel }]} maxFontSizeMultiplier={1.4}>
              {PROFILE_INITIALS}
            </Text>
          </View>
          <View style={styles.profileText}>
            <Text style={[styles.profileName, { color: t.colors.label }]} maxFontSizeMultiplier={1.4}>
              Tane Rua
            </Text>
            <Text style={[styles.profileMeta, { color: t.colors.secondaryLabel }]} maxFontSizeMultiplier={1.4}>
              Signed in with Apple
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={t.colors.secondaryLabel} />
        </View>

        <SettingsGroup title="Voice" rows={voiceRows} />

        <View style={[styles.group, { backgroundColor: t.colors.card }]} accessibilityRole="radiogroup">
          {VOICE_VERBOSITIES.map((option) => {
            const selected = verbosity === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={VERBOSITY_LABELS[option]}
                accessibilityHint="Chooses how much Courier Voice says"
                onPress={() => chooseVerbosity(option)}
                testID={`settings-verbosity-${option}`}
                style={[
                  styles.choice,
                  {
                    borderColor: selected ? t.colors.accent : t.colors.separator,
                    backgroundColor: selected ? t.colors.fill : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.choiceLabel,
                    { color: selected ? t.colors.accentText : t.colors.secondaryLabel },
                  ]}
                  maxFontSizeMultiplier={1.4}
                >
                  {VERBOSITY_LABELS[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <SettingsGroup title="Map" rows={mapRows} />
        <SettingsGroup title="Device" rows={deviceRows} />
        <SettingsGroup title="Team" rows={teamRows} />

        <View style={[styles.group, { backgroundColor: t.colors.card }]}>
          <View style={styles.row}>
            <Tile name="phone-portrait" tone="info2" />
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: t.colors.label }]} maxFontSizeMultiplier={1.4}>
                Haptics
              </Text>
              <Text style={[styles.rowHint, { color: t.colors.secondaryLabel }]} maxFontSizeMultiplier={1.4}>
                The bump on a delivery, a mode and a slide.
              </Text>
            </View>
            <Switch
              value={haptics}
              onValueChange={toggleHaptics}
              accessibilityLabel="Haptics"
              accessibilityHint="Turns the haptics on or off"
              testID="settings-haptics"
              thumbColor={t.colors.accent}
              trackColor={{ true: t.colors.accent, false: t.colors.separator }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** One group of rows, with the reference's 12 pt inner radius. */
function SettingsGroup({ title, rows }: { title: string; rows: Row[] }) {
  const { t } = useChosen();
  return (
    <View style={styles.groupBlock}>
      <Text style={[styles.groupTitle, { color: t.colors.secondaryLabel }]} maxFontSizeMultiplier={1.4}>
        {title.toUpperCase()}
      </Text>
      <View style={[styles.group, { backgroundColor: t.colors.card }]}>
        {rows.map((row, index) => {
          const border =
            index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.separator } : null;
          const content = (
            <>
              <Tile name={row.icon} tone={row.tone} />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: t.colors.label }]} maxFontSizeMultiplier={1.4}>
                  {row.label}
                </Text>
              </View>
              {row.value ? (
                <Text style={[styles.rowValue, { color: t.colors.secondaryLabel }]} maxFontSizeMultiplier={1.4}>
                  {row.value}
                </Text>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={t.colors.secondaryLabel} />
            </>
          );

          // A row the design gives no screen for yet is a row, not a button:
          // it says what it carries and does nothing, rather than pretending.
          if (!row.onPress) {
            return (
              <View key={row.key} testID={row.testID} style={[styles.row, border]}>
                {content}
              </View>
            );
          }

          return (
            <Pressable
              key={row.key}
              accessibilityRole="button"
              accessibilityLabel={row.label}
              onPress={row.onPress}
              testID={row.testID}
              style={({ pressed }) => [styles.row, border, pressed ? { opacity: 0.7 } : null]}
            >
              {content}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** The row's icon tile: the meaning colour on the fill, the chip pattern. */
function Tile({ name, tone }: { name: React.ComponentProps<typeof Ionicons>['name']; tone: TileTone }) {
  const { t } = useChosen();
  return (
    <View style={[styles.tile, { backgroundColor: t.colors.fill }]}>
      <Ionicons name={name} size={17} color={t.colors[tone]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: spacing.space16,
    paddingTop: spacing.space16,
    paddingBottom: spacing.space64,
    gap: spacing.space20,
  },
  title: {
    fontSize: typography.largeTitle.size,
    lineHeight: typography.largeTitle.lineHeight,
    fontWeight: typography.largeTitle.weight,
    paddingHorizontal: spacing.space4,
  },
  profile: {
    borderRadius: radii.card,
    padding: spacing.space16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
  },
  profileText: { flex: 1, gap: spacing.space4 },
  profileName: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '600',
  },
  profileMeta: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.weight,
  },
  groupBlock: { gap: spacing.space8 },
  groupTitle: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: typography.secondary.weight,
    paddingHorizontal: spacing.space16,
  },
  group: {
    borderRadius: radii.segmented,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    paddingHorizontal: spacing.space16,
    paddingVertical: spacing.space12,
    minHeight: 44,
  },
  rowText: { flex: 1, gap: spacing.space4 },
  rowLabel: {
    fontSize: typography.paragraph.size,
    lineHeight: typography.paragraph.lineHeight,
    fontWeight: typography.paragraph.weight,
  },
  rowValue: {
    fontSize: typography.paragraph.size,
    lineHeight: typography.paragraph.lineHeight,
    fontWeight: typography.paragraph.weight,
  },
  rowHint: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: '400',
  },
  tile: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choice: {
    margin: spacing.space12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radii.segmentedSegment,
  },
  choiceLabel: {
    fontSize: typography.chipLabel.size,
    lineHeight: typography.chipLabel.lineHeight,
    fontWeight: typography.chipLabel.weight,
  },
});
