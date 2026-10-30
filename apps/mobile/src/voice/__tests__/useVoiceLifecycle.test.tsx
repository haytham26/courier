/**
 * The voice lifecycle with more than one consumer (BUG-075).
 *
 * The audit's probe: `voiceService` is a singleton, `shutdown()` nulls its
 * engines, and `useVoice`'s cleanup calls `shutdown()` on unmount. The app
 * mounts `useVoice()` from four screens, so a screen unmounting - including one
 * with no config at all, which never initialized anything - took the engines
 * away from the driving screen that was still using them, and its `speak()`
 * produced no audio. The courier's Copilot went silent because another screen
 * closed.
 *
 * The contract these tests pin: a consumer's unmount releases its own claim on
 * the service, and the service is shut down only when the last claim goes.
 *
 * The spy is on `shutdown` itself rather than on the engines, because the
 * engines are native objects the jest run does not have (sherpa-onnx and
 * expo-audio are not installed on the test machine, which is why they are
 * mocked virtually below). What the app owns - and what broke - is the
 * decision of WHEN the service is shut down, so that decision is what the
 * test asserts.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';

import { voiceService } from '../VoiceService';
import { useVoice } from '../useVoice';

// The native modules the service imports at load time. They are not installed
// on the test machine, so the mocks are virtual - the point of the test is the
// lifecycle decision, not the engines.
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }), { virtual: true });
jest.mock(
  'react-native-sherpa-onnx/stt',
  () => ({ createSTT: jest.fn(), detectSttModel: jest.fn() }),
  { virtual: true },
);
jest.mock(
  'react-native-sherpa-onnx/tts',
  () => ({ createTTS: jest.fn(), detectTtsModel: jest.fn() }),
  { virtual: true },
);
jest.mock('../commandChannel', () => ({ publishVoiceCommand: jest.fn() }));

/** The service's own shutdown, spied on for the lifecycle decision. */
function spyOnShutdown(): jest.SpyInstance {
  const service = voiceService as unknown as { shutdown: () => Promise<void> };
  const spy = jest.spyOn(service, 'shutdown').mockResolvedValue(undefined);
  return spy;
}

/** A config-less caller, which is what four of the app's screens mount. */
function Configless() {
  useVoice();
  return <Text testID="configless">here</Text>;
}

/** A screen that drives the voice, the way the driving screen does. */
function Driven() {
  useVoice(aConfig);
  return <Text testID="driven">driving</Text>;
}

/** The config the driving screen would pass. */
const aConfig = {
  sttModelPath: '/tmp/stt',
  ttsModelPath: '/tmp/tts',
  vadModelPath: '/tmp/vad',
  pipecatServerUrl: 'http://127.0.0.1:8080',
  language: 'en-NZ' as const,
};

describe('the voice service with more than one consumer (BUG-075)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not shut the service down for a consumer that never started it', async () => {
    const shutdown = spyOnShutdown();

    const mounted = render(<Configless />);
    await act(async () => {});

    // This caller asked for nothing, so it has no claim to release.
    expect(shutdown).not.toHaveBeenCalled();

    act(() => {
      mounted.unmount();
    });
    await act(async () => {});

    // The mount and unmount of a config-less screen never touched the shared
    // service: before the fix this is the line that took the driving screen's
    // voice away.
    expect(shutdown).not.toHaveBeenCalled();
  });

  it('keeps the service alive while another screen still holds it', async () => {
    const shutdown = spyOnShutdown();

    const driven = render(<Driven />);
    await act(async () => {});

    // The screen that drives the voice holds it open.
    expect(shutdown).not.toHaveBeenCalled();

    // Its neighbour asks for nothing and goes away - the automotive equivalent
    // of a settings or stops screen unmounting mid-shift.
    const neighbour = render(<Configless />);
    await act(async () => {});
    act(() => {
      neighbour.unmount();
    });
    await act(async () => {});

    // The driving screen still has its voice.
    expect(shutdown).not.toHaveBeenCalled();

    act(() => {
      driven.unmount();
    });
    await act(async () => {});

    // And when the last consumer that owns the service leaves, it is released.
    expect(shutdown).toHaveBeenCalledTimes(1);
  });
});
