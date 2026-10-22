/**
 * Direction 04 - **Voice Ribbon**. Scanner.
 *
 * The scanner reads the label of the parcel with the camera of the phone and
 * the ribbon language is kept: the guide is a soft band, the confidence is a
 * word, and the two actions sit above the ribbon so the thumb never has to
 * reach for the microphone and the button at the same time.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { labDirections } from '@courier/design-tokens/lab-directions';
import { hapticFor } from '@/motion/haptics';
import { VoiceRibbon, useRibbonLevel } from '../VoiceRibbon';
import { ScannerViewport, type ViewportState } from '../ScannerViewport';
import { LabMessage, LabOfflineChip, LabSkeleton } from '../LabStates';
import { typeStyle, type LabScreenState } from '../labTheme';
import { offlineChip, run, scanResult, voiceConditionWords } from '../labContent';

const direction = labDirections.voiceRibbon;

export function VoiceRibbonScanner({
  state = 'ready',
}: {
  state?: LabScreenState;
}): React.JSX.Element {
  const { theme } = useTheme();
  const level = useRibbonLevel();
  const rule = theme.colors.border;

  const viewport: ViewportState =
    state === 'permissionDenied' ? 'denied' : state === 'loading' ? 'starting' : 'live';

  if (state === 'loading') {
    return (
      <View
        testID="scanner-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Scanner, Voice Ribbon direction"
      >
        <LabSkeleton direction={direction} lines={4} testID="scanner-loading" />
        <View style={styles.spacer} />
        <VoiceRibbon
          direction={direction}
          state={voiceConditionWords.idle}
          listening={false}
          queued={0}
          level={level}
        />
      </View>
    );
  }

  if (state === 'permissionDenied') {
    return (
      <View
        testID="scanner-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Scanner, Voice Ribbon direction"
      >
        <LabMessage
          direction={direction}
          title="Camera is off"
          message="Turn on the camera for Courier Copilot in the system settings to scan a label."
          testID="scanner-permission"
        />
        <View style={styles.spacer} />
        <VoiceRibbon
          direction={direction}
          state={voiceConditionWords.idle}
          listening={false}
          queued={0}
          level={level}
        />
      </View>
    );
  }

  const offline = state === 'offline' || state === 'partialSync';
  const lowConfidence = state === 'error';

  return (
    <View
      testID="scanner-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Scanner, Voice Ribbon direction"
    >
      <View style={styles.viewport}>
        <ScannerViewport
          direction={direction}
          state={viewport}
          deniedMessage="The camera needs the permission to read a label."
        />
        <View style={[styles.guide, { borderColor: theme.colors.brandPrimary }]} />
      </View>

      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelBody}
        showsVerticalScrollIndicator={false}
      >
        {offline ? (
          <View style={styles.chipRow}>
            <LabOfflineChip
              direction={direction}
              label={
                state === 'offline' ? offlineChip.label : offlineChip.partialSyncLabel
              }
              queued={state === 'offline' ? offlineChip.queued : 2}
              onRetry={state === 'partialSync' ? () => hapticFor('confirm') : undefined}
            />
          </View>
        ) : null}

        <Text style={[typeStyle(direction.type.label), { color: theme.colors.brandPrimary }]}>
          The address
        </Text>
        <Text
          style={[typeStyle(direction.type.address), { color: theme.colors.textPrimary }]}
          accessibilityRole="heading"
          accessibilityLabel={`Address read, ${scanResult.address}, ${scanResult.suburb}`}
        >
          {scanResult.address}
        </Text>
        <Text style={[typeStyle(direction.type.body), { color: theme.colors.textSecondary }]}>
          {`${scanResult.suburb} · ${scanResult.postcode} · ${scanResult.parcels} parcels`}
        </Text>
        <View style={[styles.read, { borderTopColor: rule }]}>
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
            {lowConfidence ? 'Partial read' : scanResult.confidence}
          </Text>
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}>
            {lowConfidence ? 'The street line was not found. Check it before you go.' : scanResult.confidenceDetail}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            variant="primary"
            size="lg"
            onPress={() => hapticFor('deliver')}
            style={[styles.action, { borderRadius: direction.radii.control }]}
            accessibilityHint="Confirms the address that was read"
            testID="scanner-confirm"
          >
            Confirm
          </Button>
          <Button
            variant="outline"
            size="lg"
            onPress={() => hapticFor('confirm')}
            style={[styles.action, { borderRadius: direction.radii.control }]}
            accessibilityHint="Opens the address so it can be corrected"
            testID="scanner-correct"
          >
            Correct
          </Button>
        </View>
      </ScrollView>

      <VoiceRibbon
        direction={direction}
        state={voiceConditionWords.listening}
        listening
        queued={run.queuedActions}
        level={level}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  spacer: { flex: 1 },
  viewport: { flex: 1, position: 'relative' },
  guide: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '22%',
    bottom: '22%',
    borderWidth: 1,
    borderRadius: 12,
  },
  panel: {
    maxHeight: 320,
    backgroundColor: 'transparent',
  },
  panelBody: { padding: 20, gap: 4 },
  chipRow: { paddingBottom: 8 },
  read: { borderTopWidth: 1, marginTop: 8, paddingTop: 8, gap: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  action: { flex: 1 },
});
