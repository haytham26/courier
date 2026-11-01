/**
 * The voice machine during an answer: the earbud's long press (BUG-083).
 *
 * The audit's probe: a long press during speech flipped the state machine to
 * `listening` while the answer's playback carried on. The amended impact is a
 * CORRUPT STATE, not an interrupted answer - the machine claimed to be hearing
 * while it was still talking, and the next transition ran from a state that
 * was never true.
 *
 * The contract these tests pin: while the service speaks, the press does not
 * move the machine; the answer finishes and the machine returns to idle on its
 * own. Barge-in (stop the answer, then listen) is not this guard.
 *
 * The engines are virtual mocks, the way the lifecycle suite writes them: the
 * test is about the state decision, not about sherpa-onnx. The TTS engine's
 * answer is held open so the machine can be observed mid-speech.
 */

// The answer that never finishes until the test lets it.
const mockPendingAnswer: { release?: () => void } = {};

jest.mock(
  'expo-audio',
  () => ({ createAudioPlayer: jest.fn(() => ({ replace: jest.fn(), play: jest.fn() })) }),
  { virtual: true },
);
jest.mock(
  'react-native-sherpa-onnx/stt',
  () => ({
    createSTT: jest.fn(async () => ({ destroy: jest.fn() })),
    detectSttModel: jest.fn(async () => ({ success: true })),
  }),
  { virtual: true },
);
jest.mock(
  'react-native-sherpa-onnx/tts',
  () => ({
    createTTS: jest.fn(async () => ({
      destroy: jest.fn(),
      generateSpeech: jest.fn(
        () =>
          new Promise((resolve) => {
            mockPendingAnswer.release = () =>
              resolve({ samples: new Float32Array(4), sampleRate: 16000 });
          }),
      ),
    })),
    detectTtsModel: jest.fn(async () => ({ success: true })),
  }),
  { virtual: true },
);
jest.mock('../commandChannel', () => ({ publishVoiceCommand: jest.fn() }));

import { voiceService } from '../VoiceService';
import type { VoiceCallbacks } from '../VoiceService';

const CONFIG = {
  sttModelPath: 'stt',
  ttsModelPath: 'tts',
  vadModelPath: 'vad',
  pipecatServerUrl: 'http://127.0.0.1:1',
  language: 'en-NZ' as const,
};

const CALLBACKS: VoiceCallbacks = {
  onStateChange: jest.fn(),
  onTranscript: jest.fn(),
  onCommand: jest.fn(),
  onError: jest.fn(),
  onEarbudEvent: jest.fn(),
};

describe('the voice machine during an answer (BUG-083)', () => {
  beforeEach(async () => {
    const service = voiceService as unknown as { shutdown: () => Promise<void> };
    await service.shutdown().catch(() => undefined);
  });

  it('does not move to listening while it is speaking', async () => {
    // RED first: with the unguarded transition, this state read `listening`
    // while the answer was still playing.
    await voiceService.initialize(CONFIG, CALLBACKS);

    const speaking = voiceService.speak('the next stop is Riccarton Road');
    await Promise.resolve();
    expect(voiceService.getState()).toBe('speaking');

    voiceService.onEarbudEvent({ type: 'long', timestamp: 1 });

    expect(voiceService.getState()).toBe('speaking');

    mockPendingAnswer.release?.();
    await speaking;
    expect(voiceService.getState()).toBe('idle');
  });

  it('still listens when it is idle', async () => {
    await voiceService.initialize(CONFIG, CALLBACKS);

    voiceService.onEarbudEvent({ type: 'long', timestamp: 1 });

    expect(voiceService.getState()).toBe('listening');
  });
});
