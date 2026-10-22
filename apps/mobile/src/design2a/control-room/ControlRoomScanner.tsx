/**
 * 01 Control Room - **Scanner**.
 *
 * The scanner is a read head: the label sits in the crop guide, the address
 * that was read is on the panel under it, and the confidence is written in
 * words. The scan works with no network, so the screen never waits for one.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { directions2a } from '@courier/design-tokens/directions2a';
import { hapticFor } from '@/motion/haptics';
import { emptyCopy, permissionCopy, scan, type LabState } from '../content';
import { LabStateMessage } from '../kit';
import { stepStyle } from '../typeStyle';

const direction = directions2a.controlRoom;

export function ControlRoomScanner({ state = 'ready' }: { state?: LabState }): React.JSX.Element {
  const { theme } = useTheme();
  const [correcting, setCorrecting] = useState(false);

  if (state === 'permission') {
    return (
      <View
        testID="scanner-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      >
        <LabStateMessage
          direction={direction}
          title="The camera is off"
          body={permissionCopy.camera}
          action={permissionCopy.action}
          onAction={() => hapticFor('confirm')}
          testID="scanner-permission"
        />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View
        testID="scanner-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      >
        <LabStateMessage
          direction={direction}
          title="The label did not read"
          body="The address was not found on the label. Hold the phone closer and try again."
          action="Scan again"
          onAction={() => hapticFor('confirm')}
          testID="scanner-error"
        />
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View
        testID="scanner-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      >
        <LabStateMessage
          direction={direction}
          title="No address on the label"
          body={emptyCopy.scanner}
          action="Scan again"
          onAction={() => hapticFor('confirm')}
          testID="scanner-empty"
        />
      </View>
    );
  }

  return (
    <View
      testID="scanner-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Scanner, Control Room direction"
    >
      <View style={[styles.viewfinder, { backgroundColor: theme.colors.textPrimary }]}>
        <View
          style={[styles.guide, { borderColor: theme.colors.brandPrimary }]}
          accessibilityElementsHidden
        >
          <View style={[styles.corner, styles.cornerTopLeft, { borderColor: theme.colors.brandPrimary }]} />
          <View style={[styles.corner, styles.cornerTopRight, { borderColor: theme.colors.brandPrimary }]} />
          <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: theme.colors.brandPrimary }]} />
          <View style={[styles.corner, styles.cornerBottomRight, { borderColor: theme.colors.brandPrimary }]} />
        </View>

        <View style={[styles.label, { backgroundColor: theme.colors.surface }]}>
          <Text style={[stepStyle(direction, 'row'), { color: theme.colors.textPrimary }]}>
            {scan.block.address}
          </Text>
          <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textSecondary }]}>
            {`${scan.block.suburb} · ${scan.block.city} · ${scan.block.postcode}`}
          </Text>
          <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
            {scan.parcel}
          </Text>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <Text style={[stepStyle(direction, 'label'), { color: theme.colors.textSecondary }]}>
            READ
          </Text>
          <View
            style={[
              styles.confidence,
              { borderColor: theme.colors.statusDelivered, borderRadius: direction.radii.control },
            ]}
            accessibilityRole="text"
            accessibilityLabel={`Confidence: ${scan.confidence}`}
            testID="scanner-confidence"
          >
            <Text
              style={[stepStyle(direction, 'caption'), { color: theme.colors.statusDelivered }]}
            >
              {scan.confidence.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text
          style={[stepStyle(direction, 'address'), { color: theme.colors.textPrimary }]}
          accessibilityRole="heading"
        >
          {correcting ? '14 Harewood Road' : scan.block.address}
        </Text>
        <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textSecondary }]}>
          {`${scan.block.suburb} · ${scan.block.city} · ${scan.block.postcode}`}
        </Text>
        <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
          {scan.note}
        </Text>

        <View style={styles.actions}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => hapticFor('deliver')}
            style={{ borderRadius: direction.radii.control }}
            accessibilityHint="Confirms the address that was read"
            testID="scanner-confirm"
          >
            Use this address
          </Button>
          <Pressable
            onPress={() => {
              hapticFor('confirm');
              setCorrecting(true);
            }}
            style={({ pressed }) => [
              styles.secondary,
              {
                borderColor: theme.colors.border,
                borderRadius: direction.radii.control,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Correct this address"
            testID="scanner-correct"
          >
            <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textPrimary }]}>
              Correct this address
            </Text>
          </Pressable>
        </View>

        <Text style={[stepStyle(direction, 'caption'), styles.offline, { color: theme.colors.textTertiary }]}>
          The scan works with no network.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  viewfinder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  guide: { width: 280, height: 180, borderWidth: 0 },
  corner: { position: 'absolute', width: 24, height: 24 },
  cornerTopLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTopRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  label: { marginTop: 24, paddingHorizontal: 16, paddingVertical: 12, gap: 2 },
  panel: { padding: 16, gap: 2 },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  confidence: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  actions: { gap: 8, marginTop: 16 },
  secondary: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  offline: { marginTop: 12, textAlign: 'center' },
});
