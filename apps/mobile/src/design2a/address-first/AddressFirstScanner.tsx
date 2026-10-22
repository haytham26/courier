/**
 * 03 Address First - **Scanner**.
 *
 * The label is read and set as a headline, the way the address is set on
 * every other screen of the direction. The confidence is written in words
 * under it and the correction is one line away.
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

const direction = directions2a.addressFirst;

export function AddressFirstScanner({ state = 'ready' }: { state?: LabState }): React.JSX.Element {
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
          body="No address was found on the label. Hold the phone closer and read it again."
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
          title="No address on the label"
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
      accessibilityLabel="Scanner, Address First direction"
    >
      <View style={[styles.viewfinder, { backgroundColor: theme.colors.textPrimary }]}>
        <View style={styles.crop} accessibilityElementsHidden>
          <View style={[styles.cropEdge, { borderColor: theme.colors.surface }]} />
          <View style={[styles.label, { backgroundColor: theme.colors.surface }]}>
            <Text style={[stepStyle(direction, 'row'), { color: theme.colors.textPrimary }]}>
              {scan.block.address}
            </Text>
            <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textSecondary }]}>
              {`${scan.block.suburb} · ${scan.block.city}`}
            </Text>
            <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
              {scan.parcel}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.page}>
        <Text style={[stepStyle(direction, 'label'), { color: theme.colors.brandPrimary }]}>
          READ FROM THE LABEL
        </Text>
        <Text
          style={[stepStyle(direction, 'address'), { color: theme.colors.textPrimary }]}
          accessibilityRole="heading"
        >
          {correcting ? '14 Harewood Road' : scan.block.address}
        </Text>
        <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textSecondary }]}>
          {`${scan.block.suburb} · ${scan.block.city} · ${scan.block.postcode}`}
        </Text>
        <Text
          style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}
          accessibilityRole="text"
          accessibilityLabel={`Confidence: ${scan.confidence}`}
          testID="scanner-confidence"
        >
          {`${scan.confidence} · ${scan.note}`}
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
  crop: { width: 300, alignItems: 'center', gap: 16 },
  cropEdge: { height: 1, alignSelf: 'stretch', borderBottomWidth: 1 },
  label: { paddingHorizontal: 16, paddingVertical: 12, gap: 2 },
  page: { padding: 24, gap: 2 },
  actions: { gap: 8, marginTop: 16 },
  secondary: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  offline: { marginTop: 12, textAlign: 'center' },
});
