/**
 * Voice Button Component
 * Large touch target for voice activation while driving
 * Supports earbud button protocol and visual feedback
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { useVoice } from './useVoice';
import type { VoiceState } from './VoiceService';

interface VoiceButtonProps {
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  showLabel?: boolean;
  disabled?: boolean;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  size = 'large',
  onPress,
  showLabel = true,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const { state, startListening, stopListening, isReady } = useVoice();
  const [scale, setScale] = useState(new Animated.Value(1));
  const [pulseAnim] = useState(new Animated.Value(0));

  const sizes = {
    small: { width: 56, height: 56, fontSize: 24, labelSize: 12 },
    medium: { width: 72, height: 72, fontSize: 32, labelSize: 14 },
    large: { width: 96, height: 96, fontSize: 40, labelSize: 16 },
  };

  const { width, height, fontSize, labelSize } = sizes[size];

  // Pulse animation when listening
  useEffect(() => {
    if (state === 'listening') {
      Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
    }
  }, [state, pulseAnim]);

  // Scale animation on press
  const handlePressIn = useCallback(() => {
    Animated.timing(scale, {
      toValue: 0.9,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const handlePress = useCallback(async () => {
    if (disabled || !isReady) return;
    
    if (state === 'listening') {
      await stopListening();
    } else {
      await startListening();
    }
    onPress?.();
  }, [disabled, isReady, state, startListening, stopListening, onPress]);

  // Determine button colors based on state
  const getButtonColors = () => {
    switch (state) {
      case 'listening':
        return {
          background: theme.colors.brandPrimary,
          border: theme.colors.brandPrimary,
          icon: theme.colors.textInverse,
          pulse: theme.colors.brandPrimary,
        };
      case 'speaking':
        return {
          background: theme.colors.info,
          border: theme.colors.info,
          icon: theme.colors.textInverse,
          pulse: theme.colors.info,
        };
      case 'processing':
        return {
          background: theme.colors.warning,
          border: theme.colors.warning,
          icon: theme.colors.textInverse,
          pulse: theme.colors.warning,
        };
      case 'error':
        return {
          background: theme.colors.error,
          border: theme.colors.error,
          icon: theme.colors.textInverse,
          pulse: theme.colors.error,
        };
      default:
        return {
          background: theme.colors.surface,
          border: theme.colors.brandPrimary,
          icon: theme.colors.brandPrimary,
          pulse: theme.colors.brandPrimary,
        };
    }
  };

  const colors = getButtonColors();
  const isActive = state === 'listening' || state === 'speaking' || state === 'processing';

  // Get icon based on state
  const getIcon = () => {
    switch (state) {
      case 'listening':
        return '🎙️';
      case 'speaking':
        return '🔊';
      case 'processing':
        return '⏳';
      case 'error':
        return '⚠️';
      default:
        return '🎤';
    }
  };

  const animatedStyle = {
    transform: [
      { scale },
      { scale: pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.1],
      })},
    ],
  };

  const pulseStyle = {
    ...StyleSheet.absoluteFill,
    borderRadius: width / 2,
    backgroundColor: colors.pulse,
    opacity: pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 0],
    }),
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={[styles.container, { width, height }, animatedStyle]}>
        {/* Pulse ring when active */}
        {isActive && <Animated.View style={pulseStyle} />}
        
        <TouchableOpacity
          style={[
            styles.button,
            { width, height, backgroundColor: colors.background, borderColor: colors.border },
            isActive && styles.active,
          ]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || !isReady}
          activeOpacity={0.8}
          accessibilityLabel={state === 'listening' ? 'Stop listening' : 'Start voice command'}
          accessibilityRole="button"
          accessibilityState={{ selected: state === 'listening' }}
        >
          <Text style={[styles.icon, { fontSize, color: colors.icon }]}>
            {getIcon()}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {showLabel && (
        <Text
          style={[
            styles.label,
            { fontSize: labelSize, marginTop: 8 },
            state === 'listening' && { color: theme.colors.brandPrimary, fontWeight: '600' },
            disabled && { color: theme.colors.textTertiary },
          ]}
        >
          {state === 'listening' ? 'Listening...' : 
           state === 'speaking' ? 'Speaking...' :
           state === 'processing' ? 'Thinking...' :
           state === 'error' ? 'Error - Tap to retry' :
           'Tap to Speak'}
        </Text>
      )}

      {/* Earbud hint */}
      {size === 'large' && !disabled && (
        <View style={styles.hintContainer}>
          <Text style={[styles.hintText, { color: theme.colors.textTertiary }]}>
            Earbuds: 1× Delivered · 2× Skip · 3× Fail · Hold Talk
          </Text>
        </View>
      )}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  active: {
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  icon: {
    lineHeight: 1,
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
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default VoiceButton;