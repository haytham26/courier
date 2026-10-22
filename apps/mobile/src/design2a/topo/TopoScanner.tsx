/**
 * 02 Topo - **Scanner**.
 *
 * The scanner reads a label the way a survey reads a benchmark: the frame is
 * a measured rectangle with corner ticks and a scale, and what was read is
 * written out in full under it.
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

const direction = directions2a.topo;

export function TopoScanner({ state = 'ready' }: { state?: LabState }): React.JSX.Element {
  const { theme } = useTheme();
  const [correcting, setCorrecting] = useState(false);

  if (state === 'permission') {
    return (
      <View testID="scanner-screen" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
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
      <View testID="scanner-screen" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <LabStateMessage
          direction={direction}
          title="The label did not read"
          body="No address was found inside the frame. Hold the phone closer and read again."
          action="Read again"
          onAction={() => hapticFor('confirm')}
          testID="scanner-error"
        />
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View testID="scanner-screen" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <LabStateMessage
          direction={direction}
          title="Nothing in the frame"
          body={emptyCopy.scanner}
          action="Read again"
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
      accessibilityLabel="Scanner, Topo direction"
    >
      <View style={[styles.viewfinder, { backgroundColor: theme.colors.textPrimary }]}>
        <View style={[styles.frame, { borderColor: theme.colors.textSecondary }]}>
          <View style={[styles.tick, styles.tickTop, { backgroundColor: theme.colors.textSecondary }]} />
          <View style={[styles.tick, styles.tickBottom, { backgroundColor: theme.colors.textSecondary }]} />
        </View>

        <View style={styles.readout}>
          <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
            READ
          </Text>
          <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textPrimary }]}>
            {scan.block.address}
          </Text>
          <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textSecondary }]}>
            {`${scan.block.suburb} ${scan.block.postcode}`}
          </Text>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <Text style={[stepStyle(direction, 'label'), { color: theme.colors.textSecondary }]}>
            FIX
          </Text>
          <Text
            style={[stepStyle(direction, 'caption'), { color: theme.colors.statusDelivered }]}
            accessibilityRole="text"
            accessibilityLabel={`Confidence: ${scan.confidence}`}
            testID="scanner-confidence"
          >
            {scan.confidence.toUpperCase()}
          </Text>
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
          {`${scan.parcel} · ${scan.note}`}
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
  viewfinder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  frame: { width: 280, height: 170, borderWidth: 1 },
  tick: { position: 'absolute', left: 0, right: 0, height: 1 },
  tickTop: { top: 0 },
  tickBottom: { bottom: 0 },
  readout: { alignItems: 'center', gap: 2 },
  panel: { padding: 20, gap: 2 },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { gap: 8, marginTop: 16 },
  secondary: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  offline: { marginTop: 12, textAlign: 'center' },
});
