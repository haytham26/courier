/**
 * The Copilot button (D34): a living 3D glass sphere, the centre of the
 * floating tab bar, raised 64 to 72 pt, the largest target on the bar, on
 * every main screen.
 *
 * The spec (docs/design/chosen/README.md component 2, DECISIONS D34):
 * - the states: idle, listening, thinking, speaking, muted, offline;
 * - a state change morphs (scale, light and tint) in 200 to 350 ms with a
 *   light haptic; the token duration `morph` (280 ms) carries the timing and
 *   the sphere spring (damping 20, stiffness 180) the smoothing;
 * - the sphere reacts to the live voice: the level drives a ripple ring on
 *   the surface; thinking adds a slow inner swirl; reduced motion keeps a
 *   calm ring and no surface motion;
 * - one specular highlight, a contact shadow on the bar, the accent blue in
 *   the glass: a premium physical object, never neon, never particles;
 * - a tap starts talking, a long press keeps listening.
 *
 * The sphere is drawn with Skia primitives and no runtime shader: three
 * circles (the contact shadow, the refraction body with the accent radial
 * fill, the specular highlight) plus the stroked level ripple. The motion
 * rides Reanimated on the wrappers (the morph scale, the thinking swirl),
 * which keeps every Skia prop static and the UI thread free.
 */
import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Canvas, Circle, RadialGradient, BlurMask } from '@shopify/react-native-skia';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, withRepeat } from 'react-native-reanimated';
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
  const swirl = useSharedValue(0);

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

  // The thinking swirl: a slow drift, smoothed; reduced keeps it still.
  useEffect(() => {
    if (state === 'thinking' && !reduced) {
      swirl.value = withRepeat(withTiming(360, { duration: t.motion.duration.slow * 4 }), -1);
      return () => {
        swirl.value = 0;
      };
    }
  }, [state, reduced, swirl, t]);

  const morphStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    // speaking breathes with Copilot's own voice envelope
    opacity: state === 'speaking' && !reduced ? 0.72 + 0.28 * Math.min(1, level) : 1,
  }));
  const swirlStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${swirl.value}deg` }],
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
        <Canvas style={{ width: size, height: size }}>
          {/* the contact shadow on the bar */}
          <Circle cx={size / 2} cy={size / 2 + 3} r={size / 2 - 3} color="rgba(0,0,0,0.3)">
            <BlurMask blur={6} />
          </Circle>
          {/* the glass body: the meaning colour sits IN the glass */}
          <Circle cx={size / 2} cy={size / 2} r={size / 2 - 3}>
            <RadialGradient
              c={{ x: size * 0.4, y: size * 0.38 }}
              r={size / 2}
              positions={[0, 0.85, 1]}
              colors={[core, core, core]}
            />
          </Circle>
          {/* the one specular highlight, riding the light from the top left */}
          <Circle cx={size * 0.34} cy={size * 0.28} r={size * 0.13} color="rgba(255,255,255,0.7)">
            <BlurMask blur={3} />
          </Circle>
          {/* the live level ripple; reduced motion keeps a calm surface */}
          {!reduced && level > 0 && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={size * (0.34 + 0.1 * Math.min(1, level))}
              style="stroke"
              strokeWidth={2.5}
              color="rgba(255,255,255,0.5)"
            >
              <BlurMask blur={2} />
            </Circle>
          )}
        </Canvas>
        {/* the inner swirl of thinking: a faint arc grazing the rim */}
        {state === 'thinking' && !reduced && (
          <Animated.View style={[StyleSheet.absoluteFill, styles.arcSpin, swirlStyle]} pointerEvents="none">
            <View style={styles.arc} />
          </Animated.View>
        )}
        {struck && (
          <View style={styles.strike} pointerEvents="none" />
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcSpin: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arc: {
    width: '46%',
    aspectRatio: 1,
    borderRadius: '50%',
    borderWidth: 2.5,
    borderTopColor: 'rgba(255,255,255,0.85)',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
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
