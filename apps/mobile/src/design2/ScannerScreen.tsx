/**
 * The Scanner screen of the four directions.
 *
 * The brief is the same in the four (`docs/design/SPEC.md` §3.1): the view
 * with the label in it, the guide that says where the app is reading, the
 * block of the address it found, the confidence in words, and the action:
 * confirm or correct, with the corrected address ready to edit.
 *
 * The scan is on the phone, so the screen works with no network. The
 * permission state is one of the states of the contract: one line, and the
 * system setting is the next step.
 *
 * The crop guide is the language of the direction: the corners of a camera
 * in Weather Light, a bracket in Haptic City, a frame in Night Shift and a
 * window of a sign in Gantry Run.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { typeStyle } from '@/design/typeStyle';
import { hapticFor } from '@/motion/haptics';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { useDirection } from './DirectionScope';
import { run, scanRead } from './content';
import { ErrorBlock, PermissionBlock, PrimaryAction, StateChip } from './parts';

export function ScannerScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const { direction, state } = useDirection();
  const reducedMotion = useReducedMotion();
  const [confirmed, setConfirmed] = useState(false);
  const [editing, setEditing] = useState(false);
  const close = useSharedValue(0);

  const closeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - close.value * 0.04 }],
    opacity: 1 - close.value * 0.3,
  }));

  const onConfirm = useCallback(() => {
    hapticFor('deliver');
    close.value = withSpring(1, { damping: 26, stiffness: 220, mass: 1.1 });
    setConfirmed(true);
  }, [close]);

  if (state === 'error') {
    return (
      <View testID="scanner-screen" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <View style={styles.stateBlock}>
          <ErrorBlock
            message="The scan did not finish."
            action="Scan it again"
            onAction={() => setConfirmed(false)}
          />
        </View>
      </View>
    );
  }

  if (state === 'denied') {
    return (
      <View testID="scanner-screen" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <View style={styles.stateBlock}>
          <PermissionBlock
            message="The camera is off, so the scanner cannot see the label."
            action="Open the camera setting"
            onAction={() => undefined}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      testID="scanner-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel={`Scanner, ${direction.displayName} direction`}
    >
      <View
        style={[
          styles.viewfinder,
          {
            backgroundColor: theme.colors.textPrimary,
            borderRadius: direction.radii.card,
          },
        ]}
        testID="scanner-viewfinder"
      >
        <View style={styles.labelPlate}>
          <Text style={[styles.labelLine, styles.labelBig, { color: theme.colors.textInverse }]}>{scanRead.block}</Text>
          <Text style={[styles.labelLine, styles.labelSmall, { color: theme.colors.textInverse }]}>{scanRead.suburb}</Text>
          <Text style={[styles.labelLine, styles.labelFaint, { color: theme.colors.textInverse }]}>14 HAREWOOD RD · PAPANUI · 8014</Text>
        </View>

        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.duration(direction.motion.durationMs)}
          style={[styles.guide, { borderColor: theme.colors.brandPrimary }, closeStyle]}
          testID="scanner-guide"
        >
          {direction.name === 'hapticCity' ? (
            <View style={[styles.bracket, { borderColor: theme.colors.brandPrimary }]} />
          ) : null}
          {direction.name === 'nightShift' ? (
            <View style={[styles.frame, { borderColor: theme.colors.brandPrimary }]} />
          ) : null}
          {direction.name === 'gantryRun' ? (
            <View style={[styles.window, { borderColor: theme.colors.brandPrimary }]} />
          ) : null}
        </Animated.View>

        <View style={styles.viewfinderFoot}>
          <Text style={[styles.labelLine, styles.labelFaint, { color: theme.colors.textInverse }]}>
            {state === 'offline' ? 'Scanning with no network' : 'Reading the address block'}
          </Text>
        </View>
      </View>

      {state === 'offline' ? <StateChip kind="offline" queued={run.queuedActions} /> : null}
      {state === 'partial' ? (
        <StateChip kind="partial" queued={run.queuedActions} onRetry={() => undefined} />
      ) : null}

      <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(direction.motion.durationMs)} style={styles.readout}>
        <View style={styles.readoutHead}>
          <Text style={[typeStyle(direction.type.label), { color: theme.colors.textSecondary }]}>
            Found
          </Text>
          <Text
            style={[typeStyle(direction.type.caption), { color: theme.colors.statusDelivered }]}
            testID="scanner-confidence"
          >
            {scanRead.confidence}
          </Text>
        </View>

        {editing ? (
          <View style={styles.editBlock}>
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
              Corrected address
            </Text>
            <Text
              style={[typeStyle(direction.type.row), { color: theme.colors.textPrimary }]}
              testID="scanner-corrected"
            >
              {scanRead.corrected}
            </Text>
            <Pressable
              onPress={() => setEditing(false)}
              accessibilityRole="button"
              accessibilityLabel="Keep the address as read"
              testID="scanner-keep"
              style={[styles.secondaryAction, { borderColor: theme.colors.border }]}
            >
              <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textPrimary }]}>
                Keep as read
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.editBlock}>
            <Text
              style={[typeStyle(direction.type.address), { color: theme.colors.textPrimary }]}
              testID="scanner-block"
            >
              {scanRead.block}
            </Text>
            <Text style={[typeStyle(direction.type.body), { color: theme.colors.textSecondary }]}>
              {`Stop ${scanRead.sequence} · ${scanRead.suburb}`}
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <PrimaryAction
            label={confirmed ? 'Address confirmed' : 'Confirm the address'}
            onPress={onConfirm}
            testID="scanner-confirm"
            hint="Confirms the address of stop 45"
          />
          <Pressable
            onPress={() => setEditing(true)}
            accessibilityRole="button"
            accessibilityLabel="Correct this address"
            accessibilityHint="Opens the address so it can be corrected"
            testID="scanner-correct"
            style={[styles.secondaryAction, { borderColor: theme.colors.border }]}
          >
            <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.colors.textPrimary} />
            <Text style={[typeStyle(direction.type.row), { color: theme.colors.textPrimary }]}>
              Correct this address
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  stateBlock: { padding: 24 },
  viewfinder: { flex: 1, margin: 16, padding: 24, justifyContent: 'space-between' },
  labelPlate: { gap: 6 },
  labelLine: {},
  labelBig: { fontSize: 26, fontWeight: '700' },
  labelSmall: { fontSize: 20, fontWeight: '600' },
  labelFaint: { fontSize: 15 },
  guide: {
    position: 'absolute',
    left: 32,
    right: 32,
    top: 80,
    height: 120,
    borderWidth: 2,
    borderRadius: 8,
  },
  bracket: {
    position: 'absolute',
    left: -2,
    top: -2,
    width: 40,
    height: 40,
    borderWidth: 4,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  frame: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderWidth: 1,
  },
  window: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 12,
    bottom: 12,
    borderWidth: 2,
    borderTopWidth: 6,
  },
  viewfinderFoot: { flexDirection: 'row', justifyContent: 'space-between' },
  readout: { padding: 24, gap: 12 },
  readoutHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editBlock: { gap: 4 },
  actions: { gap: 12, paddingTop: 8 },
  secondaryAction: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
});
