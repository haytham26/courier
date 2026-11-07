/**
 * The voice-sample recorder (audit A3 item 3), in a TEST build only: a debug
 * build or the E2E emulator build (both answer `recorderForThisBuild()`), so
 * beta couriers can add real in-van samples to the eval set later, under the
 * consent rules `docs/squads/voice/EVAL.md` sets - consent explicit,
 * per-purpose and revocable, the exact wording shown recorded with every
 * sample, and real audio never uploaded and never in the repository. A shipped
 * release build can reach neither condition (BUG-079 refuses the E2E flag in
 * a release variant), and then the route says the tool is not there.
 *
 * The way in is the settings' Debug row (rendered only when
 * `recorderForThisBuild()` is on). In a release build the route says the
 * tool is not there, so a deep link cannot pretend otherwise.
 *
 * The copy is plain New Zealand English, there is no emoji anywhere, and
 * every control has an accessibility label and role.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecordingPresets, useAudioRecorder } from 'expo-audio';

import { ChosenProvider, useChosen } from '@/components/chosen';
import { hapticFor } from '@/motion/haptics';
import { useDriverId } from '@/maps/useDriverId';
import { createFilePreferenceStore } from '@/sync/preferenceFiles';
import { createMemoryPreferenceStore, readDriverPreferences, writeDriverPreference } from '@/sync/storage';
import { radii, spacing, touch, typography } from '@courier/design-tokens/chosen';
import {
  CONSENT_PREFERENCE_KEY,
  CONSENT_SCOPES,
  CONSENT_WORDING,
  consentRecordFor,
  isConsentActive,
  parseConsentRecord,
  revokedRecord,
  type ConsentRecord,
  type ConsentScope,
} from '@/voice/testing/consent';
import { recorderForThisBuild } from '@/voice/testing/recorderForThisBuild';
import {
  beginSample,
  deleteAllSamples,
  deleteSample,
  readManifest,
  type RecordingHandle,
} from '@/voice/testing/sampleRecorder';
import type { SampleRecord } from '@/voice/testing/sampleManifest';

/** The short label of each purpose, on the switch row. */
const SCOPE_LABELS: Record<ConsentScope, string> = {
  evaluation: 'Use in the eval set',
  training: 'Use to train Courier Voice',
};

function VoiceSamplesScreen() {
  const { t } = useChosen();
  const driverId = useDriverId();

  // The same store rule as the settings: the file store when the device
  // opens, the memory store when it does not.
  const store = useMemo(() => {
    try {
      return createFilePreferenceStore();
    } catch {
      return createMemoryPreferenceStore();
    }
  }, []);

  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [samples, setSamples] = useState<SampleRecord[]>([]);
  const [recording, setRecording] = useState<RecordingHandle | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  // The recorder the screen owns (expo-audio SDK 58 creates recorders through
  // the hook); the glue in sampleRecorder takes it from here.
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // The standing consent and the samples, read once on mount.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const preferences = await readDriverPreferences(store, driverId);
      const manifest = await readManifest();
      if (!cancelled) {
        setConsent(parseConsentRecord(preferences[CONSENT_PREFERENCE_KEY]));
        setSamples(manifest.samples);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [driverId, store]);

  const active = isConsentActive(consent);

  /** Grants or withdraws one purpose; the record stores the exact wording's version. */
  const toggleScope = useCallback(
    async (scope: ConsentScope, on: boolean) => {
      const current = isConsentActive(consent) ? (consent?.scopes ?? []) : [];
      const scopes = on ? [...current, scope] : current.filter((entry) => entry !== scope);
      const next = consentRecordFor(driverId, scopes, consent, new Date());
      await writeDriverPreference(store, driverId, CONSENT_PREFERENCE_KEY, next);
      setConsent(next);
      hapticFor('confirm');
    },
    [consent, driverId, store],
  );

  /** Starts a recording; the control is disabled without a standing consent. */
  const startRecording = useCallback(async () => {
    if (!isConsentActive(consent) || recording) {
      return;
    }
    setRefusal(null);
    const outcome = await beginSample(recorder, consent);
    if (outcome.status === 'refused') {
      setRefusal(outcome.reason);
      return;
    }
    setRecording(outcome.handle);
    hapticFor('confirm');
  }, [consent, recorder, recording]);

  /** Stops the recording and lands the sample in the list. */
  const stopRecording = useCallback(async () => {
    if (!recording) {
      return;
    }
    const handle = recording;
    setRecording(null);
    const outcome = await handle.stop();
    if (outcome.status === 'recorded') {
      setSamples((await readManifest()).samples);
      hapticFor('confirm');
    } else {
      setRefusal(outcome.reason);
    }
  }, [recording]);

  const removeSample = useCallback(async (id: string) => {
    const outcome = await deleteSample(id);
    if (outcome.status === 'refused') {
      setRefusal(outcome.reason);
      return;
    }
    setSamples((await readManifest()).samples);
    hapticFor('confirm');
  }, []);

  /**
   * The revocation path: the first tap arms the question, the second deletes
   * every sample and stamps the consent revoked (EVAL.md: withdrawing
   * consent removes the recordings).
   */
  const revoke = useCallback(async () => {
    if (!isConsentActive(consent)) {
      return;
    }
    if (!confirmRevoke) {
      setConfirmRevoke(true);
      return;
    }
    setConfirmRevoke(false);
    await deleteAllSamples();
    const revoked = revokedRecord(consent, new Date());
    await writeDriverPreference(store, driverId, CONSENT_PREFERENCE_KEY, revoked);
    setConsent(revoked);
    setSamples([]);
    hapticFor('error');
  }, [confirmRevoke, consent, driverId, store]);

  // A shipped release build has no recorder: the route says so instead of
  // pretending.
  if (!recorderForThisBuild()) {
    return (
      <SafeAreaView testID="voice-samples-gone" style={[styles.screen, { backgroundColor: t.colors.background }]}>
        <Text style={[styles.title, { color: t.colors.label }]} maxFontSizeMultiplier={1.6}>
          Voice samples
        </Text>
        <Text style={[styles.body, { color: t.colors.secondaryLabel }]} maxFontSizeMultiplier={1.6}>
          The sample recorder is a debug-build tool. It is not in this build.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView testID="voice-samples-screen" style={[styles.screen, { backgroundColor: t.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: t.colors.label }]} maxFontSizeMultiplier={1.6}>
          Voice samples
        </Text>
        <Text style={[styles.body, { color: t.colors.secondaryLabel }]} maxFontSizeMultiplier={1.6}>
          Beta tool: record real in-van samples for the voice eval set. Nothing is uploaded automatically —
          a recording stays on this phone until you share it yourself or delete it.
        </Text>

        <View style={[styles.card, { backgroundColor: t.colors.card, borderRadius: radii.card }]}>
          <Text style={[styles.cardTitle, { color: t.colors.label }]} maxFontSizeMultiplier={1.4}>
            Your consent
          </Text>
          {CONSENT_SCOPES.map((scope) => {
            const on = consent?.scopes.includes(scope) ?? false;
            return (
              <View key={scope} style={styles.consentRow}>
                <View style={styles.consentText}>
                  <Text style={[styles.rowLabel, { color: t.colors.label }]} maxFontSizeMultiplier={1.4}>
                    {SCOPE_LABELS[scope]}
                  </Text>
                  <Text
                    testID={`voice-samples-wording-${scope}`}
                    style={[styles.wording, { color: t.colors.secondaryLabel }]}
                    maxFontSizeMultiplier={1.6}
                  >
                    {CONSENT_WORDING[scope]}
                  </Text>
                </View>
                <Switch
                  value={on}
                  onValueChange={(next) => void toggleScope(scope, next)}
                  accessibilityLabel={SCOPE_LABELS[scope]}
                  accessibilityHint={`Consents this recording to ${scope} use, separately from the other purpose`}
                  testID={`voice-samples-consent-${scope}`}
                  thumbColor={t.colors.accent}
                  trackColor={{ true: t.colors.accent, false: t.colors.separator }}
                />
              </View>
            );
          })}
        </View>

        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Stop recording' : 'Record a sample'}
          accessibilityHint={
            recording
              ? 'Stops the recording and keeps the sample'
              : 'Starts a recording; needs a consent above'
          }
          accessibilityState={{ disabled: !active, busy: recording !== null }}
          disabled={!active}
          onPress={() => void (recording ? stopRecording() : startRecording())}
          testID={recording ? 'voice-samples-stop' : 'voice-samples-record'}
          style={[
            styles.action,
            {
              backgroundColor: recording ? t.colors.danger : t.colors.accent,
              borderRadius: radii.button,
              opacity: !active && !recording ? 0.4 : 1,
            },
          ]}
        >
          <Ionicons name={recording ? 'stop' : 'mic'} size={20} color={t.colors.onAccent} />
          <Text style={[styles.actionLabel, { color: t.colors.onAccent }]} maxFontSizeMultiplier={1.4}>
            {recording ? 'Stop' : 'Record a sample'}
          </Text>
        </Pressable>

        {refusal !== null && (
          <Text testID="voice-samples-refusal" accessibilityRole="alert" style={[styles.refusal, { color: t.colors.danger }]} maxFontSizeMultiplier={1.4}>
            {refusal}
          </Text>
        )}

        <View style={[styles.card, { backgroundColor: t.colors.card, borderRadius: radii.card }]}>
          <Text style={[styles.cardTitle, { color: t.colors.label }]} maxFontSizeMultiplier={1.4}>
            Samples on this phone
          </Text>
          <View testID="voice-samples-list">
            {samples.length === 0 ? (
              <Text testID="voice-samples-empty" style={[styles.body, { color: t.colors.secondaryLabel }]} maxFontSizeMultiplier={1.6}>
                No samples yet.
              </Text>
            ) : (
              samples.map((sample) => (
                <View key={sample.id} testID={`voice-samples-sample-${sample.id}`} style={styles.sampleRow}>
                  <View style={styles.sampleText}>
                    <Text style={[styles.rowLabel, { color: t.colors.label }]} maxFontSizeMultiplier={1.4}>
                      {new Date(sample.createdAt).toLocaleString()}
                    </Text>
                    <Text style={[styles.wording, { color: t.colors.secondaryLabel }]} maxFontSizeMultiplier={1.4}>
                      {sample.scopes.join(', ')} · consented under {sample.wordingVersion}
                    </Text>
                  </View>
                  <Pressable
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`Delete sample ${sample.id}`}
                    onPress={() => void removeSample(sample.id)}
                    testID={`voice-samples-sample-${sample.id}-delete`}
                    style={[styles.delete, { borderColor: t.colors.separator }]}
                  >
                    <Ionicons name="trash" size={18} color={t.colors.danger} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </View>

        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={confirmRevoke ? 'Revoke consent?' : 'Revoke consent'}
          accessibilityHint="Deletes every sample on this phone and ends the consent"
          accessibilityState={{ disabled: !active }}
          disabled={!active}
          onPress={() => void revoke()}
          testID="voice-samples-revoke"
          style={[
            styles.action,
            {
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: t.colors.danger,
              borderRadius: radii.button,
              opacity: !active ? 0.4 : 1,
            },
          ]}
        >
          <Text style={[styles.actionLabel, { color: t.colors.danger }]} maxFontSizeMultiplier={1.4}>
            {confirmRevoke ? 'Revoke consent?' : 'Revoke consent'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function VoiceSamplesRoute() {
  return (
    <ChosenProvider>
      <VoiceSamplesScreen />
    </ChosenProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.space24,
    gap: spacing.space16,
  },
  title: {
    fontSize: typography.largeTitle.size,
    lineHeight: typography.largeTitle.lineHeight,
    fontWeight: typography.largeTitle.weight,
  },
  body: {
    fontSize: typography.paragraph.size,
    lineHeight: typography.paragraph.lineHeight,
    fontWeight: typography.paragraph.weight,
  },
  card: {
    padding: spacing.space16,
    gap: spacing.space12,
  },
  cardTitle: {
    fontSize: typography.confirmTitle.size,
    lineHeight: typography.confirmTitle.lineHeight,
    fontWeight: typography.confirmTitle.weight,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
  },
  consentText: {
    flex: 1,
    gap: spacing.space4,
  },
  rowLabel: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.weight,
  },
  wording: {
    fontSize: typography.matchSubtitle.size,
    lineHeight: typography.matchSubtitle.lineHeight,
    fontWeight: typography.matchSubtitle.weight,
  },
  action: {
    minHeight: touch.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space8,
  },
  actionLabel: {
    fontSize: typography.button.size,
    lineHeight: typography.button.lineHeight,
    fontWeight: typography.button.weight,
  },
  refusal: {
    fontSize: typography.paragraph.size,
    lineHeight: typography.paragraph.lineHeight,
    fontWeight: typography.paragraph.weight,
  },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
  },
  sampleText: {
    flex: 1,
    gap: spacing.space4,
  },
  delete: {
    minHeight: touch.minimum,
    minWidth: touch.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.button,
  },
});
