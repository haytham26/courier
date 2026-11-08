/**
 * Determinism of the file input (option C of the audio-injection research,
 * `docs/research/2026/voice-audio-injection.md`): the same WAV bytes in give
 * the same transcript out, across two runs in the test - the property the
 * scale runs rely on (byte-identical input on any runner).
 *
 * The recognizer's native modules are mocked the way `streamingStt.test.ts`
 * mocks them, with the decode answering samples derived from the file's own
 * path (the stand-in for its bytes: same file, same samples) and the stream
 * answering text derived from the samples it was fed. What is asserted is the
 * app's own seam: `transcribeRecordedUtterance` decodes the file and
 * recognises exactly what was decoded, every run.
 */
const mockDetectSttModel = jest.fn(() =>
  Promise.resolve({ success: true, modelType: 'transducer' }),
);
const mockGetOnlineTypeOrNull = jest.fn(() => 'transducer' as const);
const mockCreateStreamingSTT = jest.fn(() => Promise.resolve(anEngine()));

// The file's "bytes": a deterministic function of the path, so the same file
// decodes to the same samples and a different file to different ones.
const mockDecodeAudioFileToFloatSamples = jest.fn((path: string, _rate?: number) => {
  let hash = 0;
  for (const character of path) {
    hash = (hash * 31 + character.charCodeAt(0)) % 100000;
  }
  return Promise.resolve({
    samples: [hash / 100000, (hash % 7) / 10, 0.5],
    sampleRate: 16000,
  });
});
const mockCreatePcmLiveStream = jest.fn(() => ({
  start: jest.fn(() => Promise.resolve()),
  stop: jest.fn(() => Promise.resolve()),
  onData: jest.fn(() => () => undefined),
  onError: jest.fn(() => () => undefined),
}));

jest.mock('react-native-sherpa-onnx/stt', () => ({
  detectSttModel: () => mockDetectSttModel(),
  getOnlineTypeOrNull: () => mockGetOnlineTypeOrNull(),
  createStreamingSTT: () => mockCreateStreamingSTT(),
}));

jest.mock('react-native-sherpa-onnx/audio', () => ({
  createPcmLiveStream: () => mockCreatePcmLiveStream(),
  decodeAudioFileToFloatSamples: (path: string, rate?: number) =>
    mockDecodeAudioFileToFloatSamples(path, rate),
}));

import { transcribeRecordedUtterance } from '../streamingStt';

/** The stream, whose answer is derived from the samples it was fed. */
function aStream() {
  let fed: number[] = [];
  return {
    acceptWaveform: jest.fn((samples: number[], _rate: number) => {
      fed = samples;
      return Promise.resolve();
    }),
    inputFinished: jest.fn(() => Promise.resolve()),
    decode: jest.fn(() => Promise.resolve()),
    isReady: jest.fn(() => Promise.resolve(true)),
    getResult: jest.fn(() =>
      Promise.resolve({ text: `heard ${fed.length} samples, first ${fed[0]}`, tokens: [], timestamps: [] }),
    ),
    release: jest.fn(() => Promise.resolve()),
  };
}

function anEngine() {
  const stream = aStream();
  return {
    createStream: jest.fn(() => Promise.resolve(stream)),
    destroy: jest.fn(() => Promise.resolve()),
    stream,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // The latency the answer carries is measured with the phone's clock; pinned,
  // the two runs answer with byte-identical answers, not just equal texts.
  jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the file input is deterministic', () => {
  it('the same WAV bytes give the same transcript across two runs', async () => {
    const first = await transcribeRecordedUtterance('/docs/e2e-utterance.wav', {
      path: 'models/streaming',
    });
    const second = await transcribeRecordedUtterance('/docs/e2e-utterance.wav', {
      path: 'models/streaming',
    });

    expect(first).toEqual(second);
    expect(first.status).toBe('ok');
    if (first.status !== 'ok' || second.status !== 'ok') {
      return;
    }
    expect(first.text).toBe(second.text);
    // Both runs decoded the same file to the same samples and fed the
    // recognizer exactly those.
    expect(mockDecodeAudioFileToFloatSamples).toHaveBeenCalledTimes(2);
    expect(mockDecodeAudioFileToFloatSamples).toHaveBeenNthCalledWith(
      2,
      '/docs/e2e-utterance.wav',
      16000,
    );
  });

  it('a different file decodes to different samples, so its transcript differs', async () => {
    const one = await transcribeRecordedUtterance('/docs/e2e-utterance.wav', {
      path: 'models/streaming',
    });
    const other = await transcribeRecordedUtterance('/docs/other-utterance.wav', {
      path: 'models/streaming',
    });

    expect(one.status).toBe('ok');
    expect(other.status).toBe('ok');
    if (one.status !== 'ok' || other.status !== 'ok') {
      return;
    }
    expect(one.text).not.toBe(other.text);
  });
});
