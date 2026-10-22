/**
 * The live level of the microphone.
 *
 * The Voice Ribbon direction draws the amplitude of the courier's voice
 * along the bottom edge of the screen, so the ribbon needs the real level
 * and not a loop of invented movement (REVIEW-A4, REVIEW-E8).
 *
 * `expo-audio` reports the level of the recording in decibels when the
 * recorder is prepared with `isMeteringEnabled` (Expo SDK 58, the audio
 * reference of `docs/design/RESEARCH-2.md` §1.1). The module owns the
 * recorder: the screen never touches it.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  RecordingPresets,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import type { SharedValue } from 'react-native-reanimated';

/** The level the recorder reports in a silent van. */
export const SILENCE_DECIBELS = -60;

/** How often the recorder is read, in milliseconds. */
const POLL_MS = 120;

/**
 * How a level in decibels becomes a number between 0 and 1.
 *
 * The recorder reports -60 dB or lower in a silent van and 0 dB at the top
 * of the scale, so the level is the distance from the silence, clamped.
 */
export function levelFromMetering(decibels: number | undefined): number {
  if (decibels === undefined || !Number.isFinite(decibels)) {
    return 0;
  }
  const level = (decibels - SILENCE_DECIBELS) / -SILENCE_DECIBELS;
  if (level < 0) {
    return 0;
  }
  return level > 1 ? 1 : level;
}

/** What the app knows about the microphone. */
export type MicrophoneState = 'unknown' | 'granted' | 'denied';

/**
 * Whether the microphone is available, and asks for it if it has not been
 * asked for yet.
 *
 * The permission is never asked for on a screen the driver did not open: the
 * ribbon only asks when the courier is already talking to the assistant.
 */
export function useMicrophonePermission(active: boolean): MicrophoneState {
  const [state, setState] = useState<MicrophoneState>('unknown');

  useEffect(() => {
    if (!active) {
      return;
    }
    let cancelled = false;

    void (async () => {
      try {
        const current = await getRecordingPermissionsAsync();
        if (cancelled) {
          return;
        }
        if (current.granted) {
          setState('granted');
          return;
        }
        const asked = await requestRecordingPermissionsAsync();
        if (!cancelled) {
          setState(asked.granted ? 'granted' : 'denied');
        }
      } catch {
        if (!cancelled) {
          setState('denied');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active]);

  return state;
}

/**
 * Publishes the level of the microphone into a shared value.
 *
 * The value is read on the UI thread by the ribbon, so the animation never
 * waits for the JavaScript thread. The component renders nothing: it is a
 * source, not a control.
 */
export function MicrophoneLevel({
  level,
  active,
}: {
  level: SharedValue<number>;
  active: boolean;
}): React.JSX.Element | null {
  const recorder = useAudioRecorder({
    ...RecordingPresets.LOW_QUALITY,
    isMeteringEnabled: true,
  });
  const state = useAudioRecorderState(recorder, POLL_MS);
  const metering = state.metering;

  const start = useCallback(() => {
    try {
      recorder.record();
    } catch {
      // A recorder that cannot start leaves the ribbon flat, which is honest.
      level.value = 0;
    }
  }, [level, recorder]);

  useEffect(() => {
    if (!active) {
      level.value = 0;
      return;
    }
    start();
    return () => {
      void recorder.stop().catch(() => undefined);
    };
  }, [active, level, recorder, start]);

  useEffect(() => {
    level.value = active ? levelFromMetering(metering) : 0;
  }, [active, level, metering]);

  return null;
}
