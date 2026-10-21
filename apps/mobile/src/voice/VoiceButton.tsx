/**
 * Voice Button Component
 *
 * The button that starts the voice assistant. It is large (the contract sets
 * 56 pt as the floor and 72 pt for a primary action), it says what the voice
 * engine is doing, and it is the one place the driver can act without
 * looking.
 *
 * The movement runs on the UI thread through Reanimated 4, and the ring
 * pings **once** when the microphone opens - the contract forbids decorative
 * loops, and a courier's battery is the reason.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { tokens } from '@courier/design-tokens/tokens';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../providers/ThemeProvider';
import { useVoice } from './useVoice';
import type { VoiceState } from './VoiceService';
import { hapticFor } from '../motion/haptics';

interface VoiceButtonProps {
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  showLabel?: boolean;
  disabled?: boolean;
}

const sizes = {
  small: { width: 56, height: 56, fontSize: 24, labelSize: 17 },
  medium: { width: 72, height: 72, fontSize: 32, labelSize: 19 },
  large: { width: 96, height: 96, fontSize: 40, labelSize: 19 },
} as const;

/** The word for each state of the voice engine. */
const stateLabels: Record<VoiceState, string> = {
  idle: 'Tap to Speak',
  listening: 'Listening',
  processing: 'Thinking',
  speaking: 'Speaking',
  error: 'Error - Tap to retry',
};

/** The icon for each state of the voice engine. */
const stateIcons: Record<
  VoiceState,
  'microphone' | 'microphone-off' | 'volume-high' | 'brain' | 'alert-circle'
> = {
  idle: 'microphone',
  listening: 'microphone',
  processing: 'brain',
  speaking: 'volume-high',
  error: 'alert-circle',
};

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  size = 'large',
  onPress,
  showLabel = true,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const { state, startListening, stopListening, isReady } = useVoice();
  const [pressed, setPressed] = useState(false);

  // The press and the ring live on the UI thread.
  const scale = useSharedValue(1);
  const ping = useSharedValue(0);

  const { width, height, fontSize, labelSize } = sizes[size];

  // The ring pings once when the microphone opens.
  useEffect(() => {
    if (state === 'listening') {
      ping.value = 0;
      ping.value = withTiming(1, {
        duration: 250,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [state, ping]);

  const handlePressIn = useCallback(() => {
    setPressed(true);
    scale.value = withTiming(0.92, { duration: 150 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    setPressed(false);
    scale.value = withTiming(1, { duration: 150 });
  }, [scale]);

  const handlePress = useCallback(async () => {
    if (disabled || !isReady) {
      return;
    }

    if (state === 'listening') {
      await stopListening();
    } else {
      hapticFor('voice');
      await startListening();
    }
    onPress?.();
  }, [disabled, isReady, state, startListening, stopListening, onPress]);

  const getButtonColors = () => {
    switch (state) {
      case 'listening':
        return {
          background: theme.colors.brandPrimary,
          border: theme.colors.brandPrimary,
          icon: theme.colors.textInverse,
        };
      case 'speaking':
        return {
          background: theme.colors.info,
          border: theme.colors.info,
          icon: theme.colors.textInverse,
        };
      case 'processing':
        return {
          background: theme.colors.warning,
          border: theme.colors.warning,
          icon: theme.colors.textInverse,
        };
      case 'error':
        return {
          background: theme.colors.error,
          border: theme.colors.error,
          icon: theme.colors.textInverse,
        };
      default:
        return {
          background: theme.colors.surface,
          border: theme.colors.brandPrimary,
          icon: theme.colors.brandPrimary,
        };
    }
  };

  const colors = getButtonColors();
  const isActive = state === 'listening' || state === 'speaking' || state === 'processing';

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ping.value * 0.5 }],
    opacity: (1 - ping.value) * 0.4,
    backgroundColor: theme.colors.brandPrimary,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.container, { width, height }, containerStyle]}>
        {/* The ring pings once when the microphone opens. */}
        {state === 'listening' ? <Animated.View style={[styles.ping, pingStyle]} /> : null}

        <Pressable
          style={[
            styles.button,
            {
              width,
              height,
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
            isActive ? styles.active : null,
            pressed ? styles.pressed : null,
          ]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || !isReady}
          accessibilityLabel={state === 'listening' ? 'Stop listening' : 'Start voice command'}
          accessibilityRole="button"
          accessibilityState={{
            selected: state === 'listening',
            disabled: disabled || !isReady,
          }}
          testID="voice-button"
        >
          <MaterialCommunityIcons name={stateIcons[state]} size={fontSize} color={colors.icon} />
        </Pressable>
      </Animated.View>

      {showLabel ? (
        <Text
          style={[
            styles.label,
            { fontSize: labelSize, marginTop: 8 },
            state === 'listening' ? { color: theme.colors.brandPrimary, fontWeight: '600' } : null,
            disabled ? { color: theme.colors.textTertiary } : null,
          ]}
          accessibilityLiveRegion="polite"
        >
          {stateLabels[state]}
        </Text>
      ) : null}

      {/* Earbud hint */}
      {size === 'large' && !disabled ? (
        <View style={styles.hintContainer}>
          <Text style={[styles.hintText, { color: theme.colors.textTertiary }]}>
            Earbuds: 1x Delivered, 2x Skip, 3x Fail, hold to talk
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    borderRadius: 9999,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: {
    ...tokens.component.elevation.level2,
  },
  pressed: {
    opacity: 0.85,
  },
  ping: {
    ...StyleSheet.absoluteFill,
    borderRadius: 9999,
  },
  label: {
    textAlign: 'center',
    fontWeight: '500',
  },
  hintContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  hintText: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default VoiceButton;
