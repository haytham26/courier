/**
 * The camera viewport of the scanner.
 *
 * The scanner reads the label with the camera of the phone, so the viewport
 * is the live preview when the camera is available and a drawn surface when
 * it is not. A screen that shows a black rectangle because a permission was
 * refused is a broken screen; a screen that says what is missing and what to
 * do next is a designed state (SPEC-5, REVIEW-J5).
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useTheme } from '@/providers/ThemeProvider';
import type { LabDirection } from '@courier/design-tokens/lab-directions';
import { typeStyle } from './labTheme';

/** What the viewport is showing. */
export type ViewportState = 'starting' | 'live' | 'denied' | 'unavailable';

interface ScannerViewportProps {
  direction: LabDirection;
  /** The state the screen is in. */
  state: ViewportState;
  /** What the viewport says when the camera is not there. */
  deniedMessage: string;
}

export function ScannerViewport({
  direction,
  state,
  deniedMessage,
}: ScannerViewportProps): React.JSX.Element {
  const { theme } = useTheme();
  const device = useCameraDevice('back');
  const permission = useCameraPermission();

  // The permission of the camera is only asked for when the scanner screen
  // is open, and the answer is what the screen shows.
  useEffect(() => {
    if (state !== 'starting' && !permission.hasPermission && permission.canRequestPermission) {
      void permission.requestPermission();
    }
  }, [permission, state]);

  const live = state === 'live' && permission.hasPermission && device !== undefined;

  return (
    <View
      style={[styles.viewport, { backgroundColor: theme.colors.background }]}
      testID="scanner-viewport"
    >
      {live ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          enableNativeTapToFocusGesture
        />
      ) : (
        <View style={styles.fallback}>
          <View
            style={[styles.fallbackLabel, { borderColor: theme.colors.border }]}
            accessibilityElementsHidden
          >
            <Text style={[typeStyle(direction.type.label), { color: theme.colors.textTertiary }]}>
              {state === 'denied' ? 'CAMERA REFUSED' : state === 'unavailable' ? 'NO CAMERA' : 'STARTING'}
            </Text>
          </View>
          <Text
            style={[
              typeStyle(direction.type.body),
              { color: theme.colors.textSecondary, textAlign: 'center' },
            ]}
            accessibilityRole="text"
          >
            {deniedMessage}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1, overflow: 'hidden' },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  fallbackLabel: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
