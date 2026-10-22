/**
 * Direction 06 - **Scanline**. Scanner.
 *
 * The scanner sets the language of the screen, so the guide is drawn the way
 * a scanner draws it - four crop marks and a hairline - and the block the
 * scanner found is monospaced data, the same size and the same rhythm as
 * every other line of the product.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { labDirections } from '@courier/design-tokens/lab-directions';
import { hapticFor } from '@/motion/haptics';
import { ScanFrame } from '../ScanFrame';
import { ScannerViewport, type ViewportState } from '../ScannerViewport';
import { LabMessage, LabOfflineChip, LabSkeleton } from '../LabStates';
import { Band } from './Band';
import { typeStyle, type LabScreenState } from '../labTheme';
import { offlineChip, run, scanResult, voiceConditionWords } from '../labContent';

const direction = labDirections.scanline;

export function ScanlineScanner({
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
        accessibilityLabel="Scanner, Scanline direction"
      >
        <LabSkeleton direction={direction} lines={5} testID="scanner-loading" />
      </View>
    );
  }

  if (state === 'permissionDenied') {
    return (
      <View
        testID="scanner-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Scanner, Scanline direction"
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
      accessibilityLabel="Scanner, Scanline direction"
    >
      <View style={styles.viewport}>
        <ScannerViewport
          direction={direction}
          state={viewport}
          deniedMessage="The camera needs the permission to read a label."
        />
        <View style={styles.crop}>
          <ScanFrame color={theme.colors.brandPrimary} />
        </View>
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

        <Band label="READ" value={scanResult.address} rule={theme.colors.brandPrimary}>
          <Text
            style={[typeStyle(direction.type.address), { color: theme.colors.textPrimary }]}
            accessibilityRole="heading"
            accessibilityLabel={`Address read, ${scanResult.address}, ${scanResult.suburb}`}
          >
            {scanResult.address}
          </Text>
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}>
            {`${scanResult.suburb} ${scanResult.postcode}`}
          </Text>
        </Band>
        <Band label="CONFIDENCE" value={scanResult.confidence} rule={rule} />
        <Band
          label="PARCELS"
          value={`${scanResult.parcels}`}
          rule={rule}
        />
        <Band label="REFERENCE" value={scanResult.reference} rule={rule} tone="muted" />

        {lowConfidence ? (
          <Text style={[typeStyle(direction.type.body), styles.warning, { color: theme.colors.error }]}>
            The street line was not found. Check it before you go.
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            onPress={() => hapticFor('deliver')}
            style={[styles.primary, { backgroundColor: theme.colors.brandPrimary }]}
            accessibilityRole="button"
            accessibilityLabel="Confirm"
            accessibilityHint="Confirms the address that was read"
            testID="scanner-confirm"
          >
            <Text style={[typeStyle(direction.type.body), { color: theme.colors.textInverse }]}>
              Confirm
            </Text>
          </Pressable>
          <Pressable
            onPress={() => hapticFor('confirm')}
            style={[styles.secondary, { borderColor: rule }]}
            accessibilityRole="button"
            accessibilityLabel="Correct"
            accessibilityHint="Opens the address so it can be corrected"
            testID="scanner-correct"
          >
            <Text style={[typeStyle(direction.type.body), { color: theme.colors.textPrimary }]}>
              Correct
            </Text>
          </Pressable>
        </View>

        <Text
          style={[styles.voice, typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}
          accessibilityRole="text"
          accessibilityLabel={`Copilot is ${voiceConditionWords.listening.toLowerCase()}`}
          testID="voice-bar"
        >
          {`> ${voiceConditionWords.listening.toUpperCase()} · ${run.remaining} STOPS LEFT`}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  viewport: { flex: 1 },
  crop: { position: 'absolute', left: 24, right: 24, top: '18%', bottom: '18%' },
  panel: { paddingVertical: 8, paddingBottom: 12 },
  chipRow: { paddingBottom: 4 },
  warning: { paddingHorizontal: 16, paddingTop: 8 },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  primary: { flex: 1, minHeight: 72, alignItems: 'center', justifyContent: 'center' },
  secondary: {
    flex: 1,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  voice: { paddingHorizontal: 16, paddingTop: 8 },
});
