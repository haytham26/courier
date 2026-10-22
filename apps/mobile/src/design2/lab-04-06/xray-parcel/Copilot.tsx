/**
 * Direction 05 - **X-ray Parcel**. Copilot.
 *
 * The signature moment of the direction: Copilot appears as a stamped band
 * across the face of the parcel, the way a label is taped onto a box. The
 * stamp carries the line the assistant said and the intent it understood,
 * and the parcel is the control: the courier taps the box to talk.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { labDirections } from '@courier/design-tokens/lab-directions';
import { hapticFor } from '@/motion/haptics';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { ParcelBox } from '../ParcelBox';
import { typeStyle } from '../labTheme';
import {
  lastThingSaid,
  run,
  understoodIntent,
  voiceConditionWords,
  type VoiceCondition,
} from '../labContent';

const direction = labDirections.xrayParcel;

export function XrayParcelCopilot({
  condition = 'listening',
  confirmed = false,
}: {
  condition?: VoiceCondition;
  confirmed?: boolean;
}): React.JSX.Element {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();

  // The stamp comes down onto the box: it is the one moment of the
  // direction that is allowed a hair of overshoot.
  const stamp = useSharedValue(0);

  React.useEffect(() => {
    stamp.value = reducedMotion
      ? withTiming(1, { duration: 0 })
      : withSpring(1, { damping: 30, stiffness: 260, mass: 1.2 });
  }, [reducedMotion, stamp]);

  const stampStyle = useAnimatedStyle(() => ({
    opacity: stamp.value,
    transform: [{ translateY: (1 - stamp.value) * 12 }],
  }));

  return (
    <View
      testID="copilot-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Copilot, X-ray Parcel direction"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text
          style={[typeStyle(direction.type.label), { color: theme.colors.brandPrimary }]}
          accessibilityRole="header"
        >
          {voiceConditionWords[condition]}
        </Text>

        <View style={styles.stage}>
          <ParcelBox
            direction={direction}
            width={168}
            address={run.nextStop.address}
            suburb={run.nextStop.suburb}
            state={confirmed ? 'delivered' : 'inHand'}
          />
          <Animated.View
            style={[
              styles.stamp,
              { backgroundColor: theme.colors.brandPrimary, borderColor: theme.colors.surface },
              stampStyle,
            ]}
            accessibilityRole="text"
            accessibilityLabel={`Copilot said, ${lastThingSaid}`}
            testID="copilot-stamp"
          >
            <Text
              style={[typeStyle(direction.type.caption), { color: theme.colors.textInverse }]}
              numberOfLines={3}
            >
              {lastThingSaid}
            </Text>
          </Animated.View>
        </View>

        <View style={[styles.intent, { borderTopColor: theme.colors.border }]}>
          <Text style={[typeStyle(direction.type.body), { color: theme.colors.textSecondary }]}>
            {understoodIntent}
          </Text>
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
            {`${run.nextStop.address}, ${run.nextStop.suburb}`}
          </Text>
        </View>

        {confirmed ? (
          <View
            style={styles.confirmed}
            accessibilityRole="text"
            accessibilityLabel={`Delivered, ${run.nextStop.address}`}
            testID="copilot-confirmed"
          >
            <Text style={[typeStyle(direction.type.label), { color: theme.colors.statusDelivered }]}>
              Delivered
            </Text>
            <Text style={[typeStyle(direction.type.row), { color: theme.colors.textSecondary }]}>
              {run.nextStop.address}
            </Text>
          </View>
        ) : null}

        {condition === 'error' ? (
          <Text style={[typeStyle(direction.type.body), { color: theme.colors.error }]}>
            The microphone is not answering. Say it again, or use the screen.
          </Text>
        ) : null}

        {condition === 'offline' ? (
          <Text style={[typeStyle(direction.type.body), { color: theme.colors.textSecondary }]}>
            The voice service needs a network. The run is still on the device.
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          onPress={() => hapticFor('voice')}
          style={[styles.talk, { borderColor: theme.colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Talk to Copilot"
          accessibilityHint="Starts the microphone"
          testID="copilot-talk"
        >
          <Text style={[typeStyle(direction.type.body), { color: theme.colors.textPrimary }]}>
            Talk to Copilot
          </Text>
        </Pressable>
        <Text
          style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}
          accessibilityRole="text"
        >
          {`${run.remaining} stops left · ${run.queuedActions} actions waiting`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12 },
  stage: { alignItems: 'center', paddingVertical: 12 },
  stamp: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    transform: [{ rotate: '-2deg' }],
    maxWidth: 260,
  },
  intent: { borderTopWidth: 1, paddingTop: 12, gap: 2 },
  confirmed: { paddingTop: 8, gap: 2 },
  actions: { padding: 16, gap: 8 },
  talk: {
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
  },
});
