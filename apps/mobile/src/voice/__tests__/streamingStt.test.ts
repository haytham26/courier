/**
 * The streaming recognition (A2, trial item #7).
 *
 * The library's own native modules are mocked here, so what is asserted is
 * the app's own use of them: the missing model is answered, the recorded
 * utterance is decoded to the recognizer's own samples and recognised with its
 * latency, and the microphone's own chunks are fed and torn down. The module's
 * own behaviour on a device is the E2E job's proof (the release APK transcribes
 * a recorded utterance on the emulator).
 *
 * A2's finding, re-stated as the tests that would have caught it: the service
 * claimed `listening` with no engine and no mic. Here every path is a fact.
 */
/** The library's own answers, as the module reads them. */
type Detection = { success: boolean; error?: string; modelType?: string };

const mockDetectSttModel = jest.fn((_path: unknown): Promise<Detection> =>
  Promise.resolve({ success: true, modelType: 'transducer' }),
);
const mockGetOnlineTypeOrNull = jest.fn((detected: string | undefined) =>
  detected === 'whisper' ? null : ('transducer' as const),
);
const mockCreateStreamingSTT = jest.fn((_options: unknown) => Promise.resolve(anEngine()));
const mockDecodeAudioFileToFloatSamples = jest.fn((_path: string, _rate?: number) =>
  Promise.resolve({ samples: [0.1, 0.2, 0.3], sampleRate: 16000 }),
);
const mockCreatePcmLiveStream = jest.fn((_options?: unknown) => aMicrophone().handle);

jest.mock('react-native-sherpa-onnx/stt', () => ({
  detectSttModel: (path: unknown) => mockDetectSttModel(path),
  getOnlineTypeOrNull: (detected: string | undefined) => mockGetOnlineTypeOrNull(detected),
  createStreamingSTT: (options: unknown) => mockCreateStreamingSTT(options),
}));

jest.mock('react-native-sherpa-onnx/audio', () => ({
  createPcmLiveStream: (options?: unknown) => mockCreatePcmLiveStream(options),
  decodeAudioFileToFloatSamples: (path: string, rate?: number) => mockDecodeAudioFileToFloatSamples(path, rate),
}));

import { aLiveListener, transcribeRecordedUtterance } from '../streamingStt';

/** The streaming engine and stream, as the library answers them. */
function aStream(overrides: { text?: string; ready?: boolean; endpoint?: boolean } = {}) {
  const state = { text: overrides.text ?? 'delivered', ready: overrides.ready ?? true, endpoint: overrides.endpoint ?? false };
  const answer = { text: state.text, tokens: [], timestamps: [] };
  return {
    acceptWaveform: jest.fn((_samples: number[], _rate: number) => Promise.resolve()),
    inputFinished: jest.fn(() => Promise.resolve()),
    decode: jest.fn(() => Promise.resolve()),
    isReady: jest.fn(() => Promise.resolve(state.ready)),
    getResult: jest.fn(() => Promise.resolve(answer)),
    isEndpoint: jest.fn(() => Promise.resolve(state.endpoint)),
    processAudioChunk: jest.fn((_samples: Float32Array, _rate: number) =>
      Promise.resolve({ result: answer, isEndpoint: state.endpoint }),
    ),
    reset: jest.fn(() => Promise.resolve()),
    release: jest.fn(() => Promise.resolve()),
  };
}

function anEngine(stream = aStream()) {
  return {
    createStream: jest.fn(() => Promise.resolve(stream)),
    destroy: jest.fn(() => Promise.resolve()),
    stream,
  };
}

/** The library answers with a streaming model it has. */
function aModelOnThePhone(): void {
  mockDetectSttModel.mockResolvedValue({ success: true, modelType: 'transducer' });
  mockGetOnlineTypeOrNull.mockReturnValue('transducer');
}

/** A microphone that answers with the chunks the test feeds it. */
function aMicrophone(): {
  handle: {
    start: jest.Mock;
    stop: jest.Mock;
    onData: (callback: (samples: Float32Array, rate: number) => void) => () => void;
    onError: (callback: (message: string) => void) => () => void;
  };
  feed: (samples: Float32Array) => void;
} {
  let data: ((samples: Float32Array, rate: number) => void) | null = null;
  const handle = {
    start: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
    onData: (callback: (samples: Float32Array, rate: number) => void) => {
      data = callback;
      return () => {
        data = null;
      };
    },
    onError: () => () => undefined,
  };
  return {
    handle,
    feed: (samples: Float32Array) => data?.(samples, 16000),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  aModelOnThePhone();
});

describe('the missing model', () => {
  it('answers no-model when the recognizer has no model at all', async () => {
    mockDetectSttModel.mockResolvedValue({ success: false, error: 'no model directory' });

    const start = await aLiveListener({ model: { path: 'models/none' } });

    expect(start.status).toBe('no-model');
    if (start.status !== 'no-model') {
      return;
    }
    expect(start.message).toMatch(/the recognizer's model is missing/);
    expect(mockCreatePcmLiveStream).not.toHaveBeenCalled();
  });

  it('answers no-model when the model is not a streaming one', async () => {
    mockDetectSttModel.mockResolvedValue({ success: true, modelType: 'whisper' });
    mockGetOnlineTypeOrNull.mockReturnValue(null);

    const start = await aLiveListener({ model: { path: 'models/offline-whisper' } });

    expect(start.status).toBe('no-model');
    if (start.status !== 'no-model') {
      return;
    }
    // The phone is told WHY, so a user can be told what to download rather
    // than being shown a listening that does nothing.
    expect(start.message).toMatch(/offline-whisper is whisper/);
    expect(start.message).toMatch(/no streaming recognizer/);
  });

  it('answers no-model when the recognizer cannot be started', async () => {
    mockCreateStreamingSTT.mockRejectedValue(new Error('the model file is truncated'));

    const start = await aLiveListener({ model: { path: 'models/broken' } });

    expect(start.status).toBe('no-model');
    expect(mockCreatePcmLiveStream).not.toHaveBeenCalled();
  });
});

describe('the live listener', () => {
  it('starts the microphone and feeds its own chunks to the recognizer', async () => {
    const engine = anEngine();
    mockCreateStreamingSTT.mockResolvedValue(engine);
    const mic = aMicrophone();
    const heard: { text: string; final: boolean }[] = [];

    const start = await aLiveListener({
      model: { path: 'models/streaming' },
      microphone: () => mic.handle,
      onTranscript: (transcript) => heard.push({ text: transcript.text, final: transcript.final }),
    });

    expect(start.status).toBe('ready');
    if (start.status !== 'ready') {
      return;
    }
    expect(mic.handle.start).toHaveBeenCalled();

    // One chunk of the courier's speech, and the engine's answer is handed
    // back with whether the sentence is over.
    mic.feed(new Float32Array([0.1, -0.2, 0.3]));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // The mic's own Float32 samples reach the recognizer: the chunk is the
    // same one, at the recognizer's rate (Float32's own precision, so the
    // assertion is on the values the way the phone carries them).
    const fed = engine.stream.processAudioChunk.mock.calls[0]?.[0];
    expect(Array.from(fed)).toEqual([0.1, -0.2, 0.3].map((value) => Math.fround(value)));
    expect(engine.stream.processAudioChunk.mock.calls[0]?.[1]).toBe(16000);
    expect(heard).toEqual([{ text: 'delivered', final: false }]);
  });

  it('feeds a chunk by hand and answers with the latency it took', async () => {
    const engine = anEngine();
    mockCreateStreamingSTT.mockResolvedValue(engine);
    const mic = aMicrophone();

    const start = await aLiveListener({
      model: { path: 'models/streaming' },
      microphone: () => mic.handle,
    });
    if (start.status !== 'ready') {
      return;
    }

    const answer = await start.listener.accept(new Float32Array([0.4]), 16000);

    expect(answer.text).toBe('delivered');
    expect(answer.final).toBe(false);
    expect(answer.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('answers the sentence as final when the endpoint rule decides it is over', async () => {
    const engine = anEngine(aStream({ text: 'mark this delivered', endpoint: true }));
    mockCreateStreamingSTT.mockResolvedValue(engine);
    const mic = aMicrophone();
    const heard: { text: string; final: boolean }[] = [];

    const start = await aLiveListener({
      model: { path: 'models/streaming' },
      microphone: () => mic.handle,
      onTranscript: (transcript) => heard.push({ text: transcript.text, final: transcript.final }),
    });
    if (start.status !== 'ready') {
      return;
    }

    mic.feed(new Float32Array([0.5]));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(heard).toEqual([{ text: 'mark this delivered', final: true }]);
  });

  it('tears the microphone and the stream down when the listening stops', async () => {
    const engine = anEngine();
    mockCreateStreamingSTT.mockResolvedValue(engine);
    const mic = aMicrophone();

    const start = await aLiveListener({
      model: { path: 'models/streaming' },
      microphone: () => mic.handle,
    });
    if (start.status !== 'ready') {
      return;
    }

    await start.listener.stop();
    await start.listener.stop();

    expect(mic.handle.stop).toHaveBeenCalledTimes(1);
    expect(engine.stream.release).toHaveBeenCalledTimes(1);
    expect(engine.destroy).toHaveBeenCalledTimes(1);
  });

  it('answers the last words the engine holds when the sentence is finished by hand', async () => {
    const engine = anEngine(aStream({ text: 'where am i' }));
    mockCreateStreamingSTT.mockResolvedValue(engine);
    const mic = aMicrophone();

    const start = await aLiveListener({
      model: { path: 'models/streaming' },
      microphone: () => mic.handle,
    });
    if (start.status !== 'ready') {
      return;
    }

    expect(await start.listener.finish()).toBe('where am i');
    expect(engine.stream.inputFinished).toHaveBeenCalled();
    expect(engine.stream.decode).toHaveBeenCalled();
  });
});

describe('the recorded utterance', () => {
  it('transcribes a recorded utterance and measures how long the phone took', async () => {
    const engine = anEngine(aStream({ text: 'twelve riccarton road' }));
    mockCreateStreamingSTT.mockResolvedValue(engine);
    mockDecodeAudioFileToFloatSamples.mockResolvedValue({
      samples: [0.1, 0.2, 0.3],
      sampleRate: 16000,
    });

    const answer = await transcribeRecordedUtterance('/tmp/a-utterance.wav', { path: 'models/streaming' });

    expect(answer.status).toBe('ok');
    if (answer.status !== 'ok') {
      return;
    }
    expect(answer.text).toBe('twelve riccarton road');
    expect(answer.latencyMs).toBeGreaterThanOrEqual(0);
    // The utterance is decoded to the recognizer's own samples and fed whole.
    expect(mockDecodeAudioFileToFloatSamples).toHaveBeenCalledWith('/tmp/a-utterance.wav', 16000);
    expect(engine.stream.acceptWaveform).toHaveBeenCalledWith([0.1, 0.2, 0.3], 16000);
    expect(engine.stream.inputFinished).toHaveBeenCalled();
  });

  it('answers unreadable when the file is not an utterance the phone can read', async () => {
    const engine = anEngine();
    mockCreateStreamingSTT.mockResolvedValue(engine);
    mockDecodeAudioFileToFloatSamples.mockRejectedValue(new Error('no such file'));

    const answer = await transcribeRecordedUtterance('/tmp/gone.wav', { path: 'models/streaming' });

    expect(answer.status).toBe('unreadable');
    expect(engine.destroy).toHaveBeenCalled();
  });

  it('answers no-model when there is no recognizer on the phone', async () => {
    mockDetectSttModel.mockResolvedValue({ success: false, error: 'no model' });

    const answer = await transcribeRecordedUtterance('/tmp/a-utterance.wav', { path: 'models/none' });

    expect(answer.status).toBe('no-model');
    expect(mockDecodeAudioFileToFloatSamples).not.toHaveBeenCalled();
  });
});
