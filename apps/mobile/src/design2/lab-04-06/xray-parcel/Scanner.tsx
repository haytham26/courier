/**
 * Direction 05 - **X-ray Parcel**. Scanner.
 *
 * The scanner reads the label of a parcel, so the parcel is the subject of
 * the screen: the camera is the ground the box stands on, and the block the
 * scanner found is drawn as a label with the same shape as the label on the
 * box of the Today screen.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { labDirections } from '@courier/design-tokens/lab-directions';
import { hapticFor } from '@/motion/haptics';
import { ScannerViewport, type ViewportState } from '../ScannerViewport';
import { LabMessage, LabOfflineChip, LabSkeleton } from '../LabStates';
import { typeStyle, type LabScreenState } from '../labTheme';
import { offlineChip, run, scanResult, voiceConditionWords } from '../labContent';

const direction = labDirections.xrayParcel;

export function XrayParcelScanner({
  state = 'ready',
}: {
  state?: LabScreenState;
}): React.JSX.Element {
  const { theme } = useTheme();
  const rule = theme.colors.border;

  const viewport: ViewportState =
    state === 'permissionDenied' ? 'denied' : state === 'loading' ? 'starting' : 'live';

  if (state === 'loading') {
    return (
      <View
        testID="scanner-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Scanner, X-ray Parcel direction"
      >
        <LabSkeleton direction={direction} lines={4} testID="scanner-loading" />
      </View>
    );
  }

  if (state === 'permissionDenied') {
    return (
      <View
        testID="scanner-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Scanner, X-ray Parcel direction"
      >
        <LabMessage
          direction={direction}
          title="Camera is off"
          message="Turn on the camera for Courier Copilot in the system settings to scan a label."
          testID="scanner-permission"
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
      accessibilityLabel="Scanner, X-ray Parcel direction"
    >
      <View style={styles.viewport}>
        <ScannerViewport
          direction={direction}
          state={viewport}
          deniedMessage="The camera needs the permission to read a label."
        />
      </View>

      <ScrollView contentContainerStyle={styles.panel} showsVerticalScrollIndicator={false}>
        {offline ? (
          <View style={styles.chipRow}>
            <LabOfflineChip
              direction={direction}
              label={state === 'offline' ? offlineChip.label : offlineChip.partialSyncLabel}
              queued={state === 'offline' ? offlineChip.queued : 2}
              onRetry={state === 'partialSync' ? () => hapticFor('confirm') : undefined}
            />
          </View>
        ) : null}

        <View style={[styles.label, { borderColor: theme.colors.border }]}>
          <View style={[styles.tape, { backgroundColor: theme.colors.brandPrimary }]} />
          <Text
            style={[typeStyle(direction.type.address), { color: theme.colors.textPrimary }]}
            accessibilityRole="heading"
            accessibilityLabel={`Address read, ${scanResult.address}, ${scanResult.suburb}`}
          >
            {scanResult.address}
          </Text>
          <Text style={[typeStyle(direction.type.body), { color: theme.colors.textSecondary }]}>
            {`${scanResult.suburb} · ${scanResult.postcode}`}
          </Text>
          <View style={[styles.read, { borderTopColor: rule }]}>
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
              {lowConfidence ? 'Partial read' : scanResult.confidence}
            </Text>
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}>
              {lowConfidence
                ? 'The street line was not found. Check it before you go.'
                : scanResult.confidenceDetail}
            </Text>
          </View>
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

        <Text
          style={[styles.voice, typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}
          accessibilityRole="text"
          accessibilityLabel={`Copilot is ${voiceConditionWords.listening.toLowerCase()}`}
          testID="voice-bar"
        >
          {`Copilot · ${voiceConditionWords.listening}`}
        </Text>
        <Text style={[styles.reference, typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
          {`${scanResult.reference} · ${run.remaining} stops left`}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  viewport: { flex: 1 },
  panel: { padding: 16, gap: 8 },
  chipRow: { paddingBottom: 4 },
  label: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 2, overflow: 'hidden' },
  tape: { height: 6, marginHorizontal: -12, marginTop: -12, marginBottom: 8 },
  read: { borderTopWidth: 1, marginTop: 8, paddingTop: 8, gap: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  action: { flex: 1 },
  voice: { textAlign: 'center' },
  reference: { textAlign: 'center' },
});
