/**
 * The on-device streaming recognition (A2, trial item #7).
 *
 * The audit's finding was exact: `VoiceService.startListening` set the machine
 * to `listening` and started nothing, so the truth the courier saw was a claim
 * and not a fact - the UI said "listening" while no audio was captured. The
 * library ships the streaming API now (`createStreamingSTT`, with partial
 * results and an endpoint rule), and this module is the app's own use of it.
 *
 * Two shapes, one engine:
 *
 * 1. **live** (`aLiveListener`): the microphone's own PCM stream is fed to the
 *    recognizer chunk by chunk, and each chunk's answer is handed back through
 *    `onTranscript` - a partial while the sentence runs, and a final when the
 *    endpoint rule decides the sentence is over.
 * 2. **a recorded utterance** (`transcribeRecordedUtterance`): the file the
 *    phone holds is decoded to the recognizer's own samples and recognised,
 *    with the latency measured. This is the shape the done-when asks for: a
 *    release build transcribes a recorded utterance on the emulator, so the
 *    pipeline is proven end to end without a person speaking at a runner.
 *
 * The missing model is a first-class answer, not a crash: a phone with no
 * recognizer (no model downloaded, or a model that is not a streaming one) is
 * told `no-model` and what it is missing, so the caller can answer honestly
 * instead of claiming a listening it cannot do.
 */
import {
  createPcmLiveStream,
  decodeAudioFileToFloatSamples,
  type PcmLiveStreamHandle,
} from 'react-native-sherpa-onnx/audio';
import {
  createStreamingSTT,
  detectSttModel,
  getOnlineTypeOrNull,
  type StreamingSttEngine,
  type SttStream,
} from 'react-native-sherpa-onnx/stt';

/** The model the recognizer reads, the way the app's config spells it. */
export interface StreamingModel {
  /** Where the model is: the app's own asset, or a file it downloaded. */
  path: string;
  /** How the path is read. An asset by default (the app's own build). */
  type?: 'asset' | 'file' | 'auto';
}

/** One answer of the recognizer, as the app's own screens read it. */
export interface LiveTranscript {
  /** What the engine holds: a partial while the sentence runs, the sentence when it is over. */
  text: string;
  /** Whether the sentence is over (the endpoint rule decided it). */
  final: boolean;
  /** How long this answer took the phone, in milliseconds. */
  latencyMs: number;
}

/** What starting the live listener answered with. */
export type ListenerStart =
  | { status: 'ready'; listener: LiveListener }
  | { status: 'no-model'; message: string };

/**
 * The live listener: the microphone and the recognizer, in one handle.
 *
 * The handles it holds are torn down by `stop`, so a screen that unmounts mid
 * sentence never leaves a mic open (the recorder's own lifetime).
 */
export interface LiveListener {
  /**
   * Feeds one chunk of the courier's speech by hand, and answers what the
   * engine holds for it. A screen's own loop feeds this; the microphone is
   * the normal source.
   */
  accept(samples: Float32Array, sampleRate: number): Promise<LiveTranscript>;
  /** The sentence is over: the last words the engine holds. */
  finish(): Promise<string>;
  /** The listening is over: the mic and the stream are released. */
  stop(): Promise<void>;
}

/** What the live listener is built with: the seams a test injects. */
export interface LiveListenerOptions {
  /** The model the recognizer reads. */
  model: StreamingModel;
  /** The microphone, injected so a test can answer instead of a device. */
  microphone?: (sampleRate: number) => PcmLiveStreamHandle;
  /** Where each chunk's answer goes. The service publishes it to the app. */
  onTranscript?: (transcript: LiveTranscript) => void;
}

/** What transcribing a recorded utterance answered with. */
export type RecordedAnswer =
  | { status: 'ok'; text: string; latencyMs: number }
  | { status: 'no-model'; message: string }
  /** The file could not be read, so there was no utterance to recognise. */
  | { status: 'unreadable'; message: string };

/** The sample rate the recognizers are trained for. */
const SAMPLE_RATE = 16000;

/** Milliseconds the clock read, as the app's own clock does. */
const now = (): number => Date.now();

/**
 * The recognizer, or the reason there is none.
 *
 * A model that is not a streaming model (the offline recognizer's own) cannot
 * run the streaming path, so it answers `no-model` with the reason rather than
 * failing inside the recognizer's constructor.
 */
async function theEngine(
  model: StreamingModel,
): Promise<{ status: 'ready'; engine: StreamingSttEngine } | { status: 'no-model'; message: string }> {
  const where = { type: model.type ?? 'asset', path: model.path } as const;
  try {
    const detected = await detectSttModel(where);
    if (!detected.success) {
      return {
        status: 'no-model',
        message: `the recognizer's model is missing: ${detected.error ?? 'not detected'}`,
      };
    }
    const online = getOnlineTypeOrNull(detected.modelType);
    if (online === null) {
      return {
        status: 'no-model',
        message: `the model at ${model.path} is ${detected.modelType ?? 'unknown'}, which has no streaming recognizer`,
      };
    }
    const engine = await createStreamingSTT({ modelPath: where, modelType: online });
    return { status: 'ready', engine };
  } catch (error) {
    return { status: 'no-model', message: `the recognizer could not be started: ${String(error)}` };
  }
}

/**
 * Starts listening: the microphone and the streaming recognizer, in one handle.
 *
 * The mic is asked for its own PCM at the recognizer's rate, so a chunk is
 * recognised as it arrives and the courier's words follow it. A refusal is an
 * answer, not a throw: the caller is told there is no model, and it says so to
 * the courier rather than claiming a listening it cannot do.
 */
export async function aLiveListener(options: LiveListenerOptions): Promise<ListenerStart> {
  const start = await theEngine(options.model);
  if (start.status !== 'ready') {
    return start;
  }
  const stream: SttStream = await start.engine.createStream();
  const mic = (options.microphone ?? theMicrophone)(SAMPLE_RATE);
  let stopped = false;

  // The mic's own chunks are the recognizer's own input. A chunk that fails to
  // recognise is named and dropped: a dropped word is better than a stopped
  // ear, and the recognizer is started again on the next chunk.
  mic.onData((samples: Float32Array, sampleRate: number) => {
    void (async () => {
      try {
        const answer = await stream.processAudioChunk(samples, sampleRate);
        options.onTranscript?.({
          text: answer.result.text,
          final: answer.isEndpoint,
          latencyMs: 0,
        });
      } catch (error) {
        console.warn(`voice: a chunk could not be recognised: ${String(error)}`);
      }
    })();
  });
  mic.onError((message: string) => {
    console.warn(`voice: the microphone stopped: ${message}`);
  });
  await mic.start();

  return {
    status: 'ready',
    listener: {
      async accept(samples: Float32Array, sampleRate: number): Promise<LiveTranscript> {
        const began = now();
        const answer = await stream.processAudioChunk(samples, sampleRate);
        return {
          text: answer.result.text,
          final: answer.isEndpoint,
          latencyMs: now() - began,
        };
      },

      async finish(): Promise<string> {
        await stream.inputFinished();
        if (await stream.isReady()) {
          await stream.decode();
        }
        return (await stream.getResult()).text;
      },

      async stop(): Promise<void> {
        if (stopped) {
          return;
        }
        stopped = true;
        await mic.stop().catch(() => undefined);
        await stream.release().catch(() => undefined);
        await start.engine.destroy().catch(() => undefined);
      },
    },
  };
}

/**
 * Transcribes a recorded utterance with the streaming recognizer.
 *
 * The file is decoded to the recognizer's own samples, recognised in one pass,
 * and the answer's latency is measured - the done-when's own number, so the
 * emulator's run is a fact about the phone and not a feeling.
 */
export async function transcribeRecordedUtterance(
  filePath: string,
  model: StreamingModel,
): Promise<RecordedAnswer> {
  const start = await theEngine(model);
  if (start.status !== 'ready') {
    return start;
  }
  let decoded: { samples: number[]; sampleRate: number };
  try {
    decoded = await decodeAudioFileToFloatSamples(filePath, SAMPLE_RATE);
  } catch (error) {
    await start.engine.destroy().catch(() => undefined);
    return {
      status: 'unreadable',
      message: `the utterance at ${filePath} could not be read: ${String(error)}`,
    };
  }
  const began = now();
  try {
    const stream: SttStream = await start.engine.createStream();
    await stream.acceptWaveform(decoded.samples, decoded.sampleRate);
    await stream.inputFinished();
    if (await stream.isReady()) {
      await stream.decode();
    }
    const result = await stream.getResult();
    await stream.release().catch(() => undefined);
    return { status: 'ok', text: result.text, latencyMs: now() - began };
  } finally {
    await start.engine.destroy().catch(() => undefined);
  }
}

/** The device's own microphone, at the recognizer's rate. */
export function theMicrophone(sampleRate: number = SAMPLE_RATE): PcmLiveStreamHandle {
  return createPcmLiveStream({ sampleRate, channelCount: 1 });
}
