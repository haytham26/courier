/**
 * The push-to-talk wiring of the audio-file input (option C of the
 * audio-injection research, `docs/research/2026/voice-audio-injection.md`):
 * when the seam of this build (`audioSourceForThisBuild`) answers a file,
 * `startListening` feeds that file through the EXISTING
 * `transcribeRecordedUtterance` seam of `streamingStt.ts` - reused, not
 * duplicated - and the answer's sentence drives the same turn flow a live ear
 * drives (`holdTranscript` -> the `onFinalTranscript` delegate). When no file
 * is set, the live microphone path (`aLiveListener` over
 * `createPcmLiveStream`) is the one the build had before: same call, same
 * shape.
 *
 * The library's own native modules and the ear are mocked here, so what is
 * asserted is the app's own wiring: which path `startListening` takes and with
 * what.
 */
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ replace: jest.fn(), play: jest.fn(), release: jest.fn() })),
}));

jest.mock(
  'react-native-sherpa-onnx/stt',
  () => ({
    createSTT: jest.fn(() => ({
      destroy: jest.fn(),
      transcribeFile: jest.fn(() => Promise.resolve({ text: '' })),
    })),
    detectSttModel: jest.fn(() => Promise.resolve({ success: true, modelType: 'transducer' })),
    getOnlineTypeOrNull: jest.fn(() => 'transducer'),
    createStreamingSTT: jest.fn(),
  }),
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
);

jest.mock(
  'react-native-sherpa-onnx/tts',
  () => ({
    createTTS: jest.fn(() => ({ destroy: jest.fn(), generateSpeech: jest.fn() })),
    detectTtsModel: jest.fn(() => Promise.resolve({ success: true })),
  }),
);

jest.mock('expo-file-system', () => ({
  Paths: { document: { uri: 'file:///data/user/0/com.courier.copilot/files/' } },
}));

// The ear itself is the test's own answer: the two seams of streamingStt are
// spies, so the wiring (not the recognizer) is what is asserted.
jest.mock('../streamingStt', () => ({
  aLiveListener: jest.fn(),
  transcribeRecordedUtterance: jest.fn(),
}));
jest.mock('../commandChannel', () => ({ publishVoiceCommand: jest.fn() }));

import { aLiveListener, transcribeRecordedUtterance } from '../streamingStt';
import { voiceService } from '../VoiceService';
import type { VoiceCallbacks } from '../VoiceService';

const transcribeMock = transcribeRecordedUtterance as jest.Mock;
const aliveMock = aLiveListener as jest.Mock;

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
  shutdown: () => Promise<void>;
  state: string;
};

const svc = (): ServiceInternals => voiceService as unknown as ServiceInternals;

describe('the file input of the voice path (option C)', () => {
  beforeEach(async () => {
    transcribeMock.mockReset();
    aliveMock.mockReset();
    await svc().shutdown().catch(() => undefined);
    // `shutdown` releases the engines but not the state machine; the suite
    // starts every case from `idle` (the state `initialize` sets).
    svc().state = 'idle';
    delete process.env.EXPO_PUBLIC_E2E;
    delete process.env.EXPO_PUBLIC_E2E_AUDIO_FILE;
  });

  it('the file input reaches transcribeRecordedUtterance with the latency measured', async () => {
    process.env.EXPO_PUBLIC_E2E_AUDIO_FILE = 'utterance.wav';
    transcribeMock.mockResolvedValue({ status: 'ok', text: 'delivered', latencyMs: 42 });
    const onFinalTranscript = jest.fn();
    const callbacks = baseCallbacks({ onFinalTranscript });
    await voiceService.initialize(CONFIG, callbacks);

    await voiceService.startListening();

    // The named file, read from the app's own document dir, is the one
    // transcribeRecordedUtterance is called with - that seam measures the
    // latency the answer carries.
    expect(transcribeMock).toHaveBeenCalledTimes(1);
    expect(transcribeMock).toHaveBeenCalledWith(
      '/data/user/0/com.courier.copilot/files/utterance.wav',
      { path: 'models/stt.onnx' },
    );
    await expect(transcribeMock.mock.results[0]?.value).resolves.toMatchObject({
      status: 'ok',
      latencyMs: 42,
    });
    // The answer's sentence drives the same turn flow a live ear drives.
    expect(onFinalTranscript).toHaveBeenCalledWith('delivered');
    expect(callbacks.onTranscript).toHaveBeenCalledWith('delivered', true);
    // The microphone was never opened for it.
    expect(aliveMock).not.toHaveBeenCalled();
    expect(voiceService.getState()).toBe('idle');
  });

  it('the E2E build without the flag feeds the runner-armed default file', async () => {
    process.env.EXPO_PUBLIC_E2E = '1';
    transcribeMock.mockResolvedValue({ status: 'ok', text: 'how many stops are left', latencyMs: 7 });
    const onFinalTranscript = jest.fn();
    await voiceService.initialize(CONFIG, baseCallbacks({ onFinalTranscript }));

    await voiceService.startListening();

    expect(transcribeMock).toHaveBeenCalledWith(
      '/data/user/0/com.courier.copilot/files/e2e-utterance.wav',
      { path: 'models/stt.onnx' },
    );
    expect(onFinalTranscript).toHaveBeenCalledWith('how many stops are left');
  });

  it('with no file set the live mic path is unchanged', async () => {
    aliveMock.mockResolvedValue({
      status: 'ready',
      listener: {
        accept: jest.fn(),
        finish: jest.fn(),
        stop: jest.fn(() => Promise.resolve()),
      },
    });
    const callbacks = baseCallbacks();
    await voiceService.initialize(CONFIG, callbacks);

    await voiceService.startListening();

    // Not the file input: the ear is opened exactly as before the file input
    // existed - same call, same shape, same state afterwards.
    expect(transcribeMock).not.toHaveBeenCalled();
    expect(aliveMock).toHaveBeenCalledTimes(1);
    const [options] = aliveMock.mock.calls[0] as [
      { model: { path: string }; onTranscript: unknown },
    ];
    expect(options.model).toEqual({ path: 'models/stt.onnx' });
    expect(typeof options.onTranscript).toBe('function');
    expect(voiceService.getState()).toBe('listening');
  });

  it('a file the phone cannot read is answered, not thrown', async () => {
    process.env.EXPO_PUBLIC_E2E_AUDIO_FILE = 'gone.wav';
    transcribeMock.mockResolvedValue({
      status: 'unreadable',
      message: 'the utterance at /data/.../gone.wav could not be read: no such file',
    });
    const callbacks = baseCallbacks();
    await voiceService.initialize(CONFIG, callbacks);

    await voiceService.startListening();

    expect(voiceService.getState()).toBe('error');
    const onErrorMock = callbacks.onError as jest.Mock;
    const [error] = onErrorMock.mock.calls[0] as [Error];
    expect(error.message).toMatch(/could not be read/);
    expect(aliveMock).not.toHaveBeenCalled();
  });
});
