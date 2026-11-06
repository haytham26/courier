/**
 * The transcript path of `VoiceService` (D1, BUG-231): a finished sentence is
 * handed to the `onFinalTranscript` delegate when one is set - the tab layout
 * sets it, so every final transcript reaches the turn flow
 * (`courierVoice.sendTurn`) - and when no delegate is set the app's own
 * offline parser answers, exactly as before.
 *
 * `initialize` must tolerate a phone without the model files: the problem is
 * recorded (not thrown), and `startListening` answers `no-model` with the
 * reason rather than a listening that captures nothing.
 *
 * The native modules are virtual mocks, the way the lifecycle suite writes
 * them; `streamingStt` is mocked so the ear's answer is the test's own.
 */
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn(() => ({ replace: jest.fn(), play: jest.fn(), release: jest.fn() })) }), { virtual: true });

jest.mock(
  'react-native-sherpa-onnx/stt',
  () => ({
    createSTT: jest.fn(() => ({ destroy: jest.fn(), transcribeFile: jest.fn(() => Promise.resolve({ text: '' })) })),
    detectSttModel: jest.fn(() => ({ success: true, modelType: 'transducer' })),
    getOnlineTypeOrNull: jest.fn(() => 'transducer'),
    createStreamingSTT: jest.fn(),
  }),
  { virtual: true },
);
jest.mock(
  'react-native-sherpa-onnx/audio',
  () => ({
    createPcmLiveStream: jest.fn(() => ({
      start: jest.fn(() => Promise.resolve()),
      stop: jest.fn(() => Promise.resolve()),
      onData: jest.fn(() => () => undefined),
      onError: jest.fn(() => () => undefined),
    })),
    decodeAudioFileToFloatSamples: jest.fn(() => Promise.resolve({ samples: [], sampleRate: 16000 })),
  }),
  { virtual: true },
);
jest.mock(
  'react-native-sherpa-onnx/tts',
  () => ({
    createTTS: jest.fn(() => ({ destroy: jest.fn(), generateSpeech: jest.fn() })),
    detectTtsModel: jest.fn(() => ({ success: true })),
  }),
  { virtual: true },
);
jest.mock('../streamingStt', () => ({ aLiveListener: jest.fn() }));
jest.mock('../commandChannel', () => ({ publishVoiceCommand: jest.fn() }));

import { detectSttModel } from 'react-native-sherpa-onnx/stt';
import { aLiveListener } from '../streamingStt';
import { publishVoiceCommand } from '../commandChannel';
import { voiceService } from '../VoiceService';
import type { VoiceCallbacks } from '../VoiceService';

const publishMock = publishVoiceCommand as jest.Mock;
const detectSttMock = detectSttModel as jest.Mock;
const aliveListenerMock = aLiveListener as jest.Mock;

const CONFIG = {
  sttModelPath: 'models/stt.onnx',
  ttsModelPath: 'models/tts.onnx',
  vadModelPath: 'models/vad.onnx',
  kwsModelPath: 'models/kws.onnx',
  pipecatServerUrl: 'http://localhost:8080',
  language: 'en-NZ' as const,
};

function baseCallbacks(overrides: Partial<VoiceCallbacks> = {}): VoiceCallbacks {
  return {
    onStateChange: jest.fn(),
    onTranscript: jest.fn(),
    onCommand: jest.fn(),
    onError: jest.fn(),
    onEarbudEvent: jest.fn(),
    ...overrides,
  };
}

type ServiceInternals = {
  callbacks: VoiceCallbacks | null;
  holdTranscript: (text: string, final: boolean) => void;
  shutdown: () => Promise<void>;
};

const svc = (): ServiceInternals => voiceService as unknown as ServiceInternals;

describe('the transcript path of VoiceService (D1, BUG-231)', () => {
  beforeEach(async () => {
    publishMock.mockClear();
    detectSttMock.mockClear();
    detectSttMock.mockReturnValue({ success: true, modelType: 'transducer' });
    aliveListenerMock.mockReset();
    await svc().shutdown().catch(() => undefined);
  });

  it('hands a final transcript to the delegate when one is set', () => {
    const onFinalTranscript = jest.fn();
    svc().callbacks = baseCallbacks({ onFinalTranscript });

    svc().holdTranscript('delivered', true);

    expect(onFinalTranscript).toHaveBeenCalledWith('delivered');
    // The delegate owns the turn now: the local parser must not double-fire.
    expect(publishMock).not.toHaveBeenCalled();
  });

  it('answers with the local parser when no delegate is set (the pre-D1 behaviour)', () => {
    svc().callbacks = baseCallbacks();

    svc().holdTranscript('delivered', true);

    expect(publishMock).toHaveBeenCalledWith({ type: 'mark_delivered', stopId: 'current' });
  });

  it('only reports a partial transcript', () => {
    const callbacks = baseCallbacks({ onFinalTranscript: jest.fn() });
    svc().callbacks = callbacks;

    svc().holdTranscript('deliv', false);

    expect(callbacks.onTranscript).toHaveBeenCalledWith('deliv', false);
    expect(callbacks.onFinalTranscript).not.toHaveBeenCalled();
    expect(publishMock).not.toHaveBeenCalled();
  });

  it('submitTranscript pushes a finished sentence through the same path', () => {
    const onFinalTranscript = jest.fn();
    svc().callbacks = baseCallbacks({ onFinalTranscript });

    voiceService.submitTranscript('how many stops are left on the run');

    expect(onFinalTranscript).toHaveBeenCalledWith('how many stops are left on the run');
  });

  it('initialize tolerates a missing model: it records the problem instead of throwing', async () => {
    detectSttMock.mockReturnValueOnce({ success: false, error: 'asset not found: models/stt.onnx' });
    const callbacks = baseCallbacks();

    await expect(voiceService.initialize(CONFIG, callbacks)).resolves.toBeUndefined();

    expect(voiceService.isReady()).toBe(true);
    expect(voiceService.initialisationProblem()).toMatch(/asset not found/);
  });

  it('startListening answers no-model with the reason when the ear cannot start', async () => {
    const callbacks = baseCallbacks();
    await voiceService.initialize(CONFIG, callbacks);
    aliveListenerMock.mockResolvedValueOnce({
      status: 'no-model',
      message: 'no streaming model at models/stt.onnx',
    });

    await voiceService.startListening();

    expect(voiceService.getState()).toBe('error');
    const onErrorMock = callbacks.onError as jest.Mock;
    const calls = onErrorMock.mock.calls as unknown[][];
    const failure = calls[0][0] as Error;
    expect(failure.message).toContain('no streaming model');
  });
});
