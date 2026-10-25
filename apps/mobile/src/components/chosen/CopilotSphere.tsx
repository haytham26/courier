/**
 * BUG-061 EXPERIMENT — the scratch branch exp/bug-061-no-sphere, NEVER merged.
 *
 * The founder's hypothesis: the D34 Copilot sphere renders through Skia, which
 * is native GPU code, and the emulator now runs on software GL (swiftshader,
 * BUG-060) — so the sphere may be what dies at cold start with the
 * SIGSEGV/gwp_asan tombstone PR #18 keeps producing.
 *
 * The experiment: the Skia surface is replaced by a plain View of the same
 * size and the same testID. Deliberately NOT the reduced-motion path (it may
 * still render through Skia) and NOT an EXPO_PUBLIC_ flag (it would be baked
 * into a build). Everything else — the Pressable, the accessibility label, the
 * morph scale — stays, so the interaction contract the flows assert is intact
 * and only the drawing surface changes.
 *
 * Real devices with a GPU keep the live 3D sphere: whatever this experiment
 * proves, the feature is not removed to get green.
 */
import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useChosen, resolveOverCard } from './context';
import type { CopilotState } from './types';

export interface CopilotSphereProps {
  state: CopilotState;
  /** The live voice level, 0 to 1 (the driver's or Copilot's own). */
  level?: number;
  reduced?: boolean;
  onPress: () => void;
  /** A long press keeps the microphone listening. */
  onLongPress: () => void;
  size?: number;
}

/** D34: the raised centre target is the largest on the bar, 64 to 72 pt. */
const SPHERE_BASE = 68;

const bodyTones: Record<CopilotState, 'accent' | 'success' | 'info2' | 'fill'> = {
  idle: 'accent',
  listening: 'success',
  thinking: 'info2',
  speaking: 'accent',
  muted: 'fill',
  offline: 'fill',
};

export const CopilotSphere = ({
  state,
  level = 0,
  reduced = false,
  onPress,
  onLongPress,
  size = SPHERE_BASE,
}: CopilotSphereProps) => {
  const { t } = useChosen();
  const tone = bodyTones[state];
  const core = resolveOverCard(t, tone);
  const previousState = useRef<CopilotState | null>(null);

  // The morph: scale and light with the sphere spring; reduced stays linear.
  const scale = useSharedValue(1);

  useEffect(() => {
    const firstMount = previousState.current === null;
    previousState.current = state;
    if (firstMount) {
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (reduced) {
      scale.value = withTiming(1, { duration: t.motion.reduced.duration.morph });
    } else {
      scale.value = withSpring(1.04, t.motion.spring.sphere);
      scale.value = withSpring(1, t.motion.spring.sphere);
    }
  }, [state, reduced, scale, t]);

  const morphStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    // speaking breathes with Copilot's own voice envelope
    opacity: state === 'speaking' && !reduced ? 0.72 + 0.28 * Math.min(1, level) : 1,
  }));

  // The muted and the offline states strike through; the label says it too.
  const struck = state === 'muted' || state === 'offline';

  return (
    <Pressable
      accessible
      role="button"
      accessibilityLabel={`Copilot, ${state}`}
      accessibilityHint={struck ? 'Copilot is muted' : 'Taps to talk, or holds to keep listening'}
      onPress={onPress}
      onLongPress={onLongPress}
      testID="copilot-sphere"
      style={[styles.button, { width: size, height: size }]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, morphStyle]}>
        {/* THE EXPERIMENT: a plain View where the Skia Canvas used to be. The
            same size, the same radius, and the colour the glass carried, so
            the a11y tree, the layout and the flows all see the same button. */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: core, borderRadius: size / 2 },
          ]}
        />
        {struck && <View style={styles.strike} pointerEvents="none" />}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  strike: {
    position: 'absolute',
    left: '30%',
    right: '30%',
    top: '49%',
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
