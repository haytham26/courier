/**
 * The parcel.
 *
 * The signature object of the X-ray Parcel direction: a dimensional box with
 * its label and its handling marks, drawn with plain views and three skewed
 * faces. The research is explicit that the 3D of 2026 is information only 3D
 * can carry (`docs/design/RESEARCH-2.md` §1.2) - here it carries the shape of
 * the thing the courier is holding, and the depth is real occlusion, never a
 * glow.
 *
 * The box has three faces: the front, the top and the side. The top and the
 * side are the same rectangle put on a slant, which is what a skew does.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { useReducedMotion } from '@/motion/useReducedMotion';
import type { LabDirection } from '@courier/design-tokens/lab-directions';
import { typeStyle } from './labTheme';

interface ParcelBoxProps {
  direction: LabDirection;
  /** The width of the front face, in points. */
  width?: number;
  /** The address on the label of the box. */
  address: string;
  /** The suburb on the label of the box. */
  suburb: string;
  /** The state of the box: on the rack, in the hand or delivered. */
  state: 'inVan' | 'inHand' | 'delivered';
}

/** The spring the parcel opens with, from the motion language of the direction. */
const UNFOLD_SPRING = { damping: 30, stiffness: 260, mass: 1.2 };

export function ParcelBox({
  direction,
  width = 132,
  address,
  suburb,
  state,
}: ParcelBoxProps): React.JSX.Element {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const opened = useSharedValue(0);

  // The parcel opens out of its flat state when the screen opens, and turns
  // edge-on when the delivery is confirmed.
  useEffect(() => {
    const target = state === 'delivered' ? 0 : 1;
    opened.value = reducedMotion
      ? withTiming(target, { duration: 0 })
      : withSpring(target, UNFOLD_SPRING);
  }, [opened, reducedMotion, state]);

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${(1 - opened.value) * 70}deg` }],
  }));

  const lidStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + 0.75 * opened.value,
    transform: [{ translateY: (1 - opened.value) * -10 }],
  }));

  const height = Math.round(width * 0.82);
  const depth = Math.round(width * 0.3);

  return (
    <Animated.View
      style={[styles.box, { width, height }, faceStyle]}
      accessibilityRole="image"
      accessibilityLabel={`Parcel for ${address}, ${suburb}, ${state === 'delivered' ? 'delivered' : 'in the van'}`}
      testID="parcel-box"
    >
      <View
        style={[
          styles.top,
          {
            width,
            height: depth,
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
          },
        ]}
      />
      <View
        style={[
          styles.side,
          {
            width: depth,
            height,
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
          },
        ]}
      />
      <View
        style={[
          styles.front,
          {
            width,
            height,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.label,
            { backgroundColor: theme.colors.background, borderColor: theme.colors.brandPrimary },
            lidStyle,
          ]}
        >
          <Text
            style={[typeStyle(direction.type.caption), { color: theme.colors.textPrimary }]}
            numberOfLines={2}
          >
            {address}
          </Text>
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}>
            {suburb}
          </Text>
        </Animated.View>
        <View style={[styles.tape, { backgroundColor: theme.colors.brandPrimary }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'relative' },
  front: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    borderWidth: 1,
    overflow: 'hidden',
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    transform: [{ skewY: '-28deg' }],
  },
  side: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderWidth: 1,
    borderLeftWidth: 0,
    transform: [{ skewX: '-28deg' }],
  },
  label: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    padding: 8,
    borderWidth: 1,
  },
  tape: { position: 'absolute', left: 0, right: 0, top: 0, height: 6 },
});
