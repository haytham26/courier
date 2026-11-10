/**
 * The A-to-Z simulation at scale (founder directive 2026-11-08, item 4).
 *
 * The whole path, one scripted turn at a time:
 *
 *   push-to-talk -> the armed WAV (option C, `audioSourceForThisBuild`)
 *     -> the recorded-utterance seam (`transcribeRecordedUtterance`)
 *     -> the finished transcript -> the turn flow (`useCourierVoice.sendTurn`)
 *     -> the turn router -> the command channel -> the run store
 *        (the action APPLIED to the run) -> the ack the phone SPEAKS
 *     -> the event log (the SYNC the outbox owes).
 *
 * The turns are REAL and the app is REAL. The audio is the TTS command audio
 * this directive built (`services/courier-voice/app/eval_tts.py`), every file's
 * sha256 is verified against the manifest sidecar before it is used, and every
 * turn's transcript is the pinned judge's own answer to that file
 * (`app/eval_scale.py`) - never the gold text.
 *
 * What is mocked, and why it is named rather than hidden:
 *
 * - the native STT (`react-native-sherpa-onnx/audio` and `../streamingStt`):
 *   the recognizer is a native library jest cannot run, so the seam answers the
 *   transcript the judge already produced for THIS file. The file, the path the
 *   app resolves it from and everything downstream are the app's own.
 * - the native TTS: the spoken confirmation is asserted by the call the app's
 *   own `speak` makes with the router's own ack line, not by a waveform nobody
 *   hears in jest.
 * - the voice service's HTTP client: a full-routed turn's answer is the
 *   server's, so the client is a stub and every turn that needed it is counted.
 *
 * What is NOT run here at all, and stays named in the evidence
 * (`docs/evidence/voice-scale/README.md`): the emulator's AudioRecord input
 * chain and its VAD (option C bypasses them BY DESIGN; option A of the
 * research is the real-mic parity leg), the on-device recognizer, and the
 * Android UI. Those are the CI AVDs' legs, and this file does not claim them.
 *
 * The chatter leg is the false-action leg (EVAL.md M9): a chatter turn must not
 * move the run. A command found in one is a BUG, counted and named by its turn
 * id rather than ignored.
 *
 * The run is deterministic (§17): the turn order is seeded, the clock is fixed,
 * and this file writes its own per-turn trace into
 * `docs/evidence/voice-scale/results/` so the same seed reproduces the same
 * bytes.
 */
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ replace: jest.fn(), play: jest.fn(), release: jest.fn() })),
}));

jest.mock('react-native-sherpa-onnx/stt', () => ({
  createSTT: jest.fn(() => ({
    destroy: jest.fn(),
    transcribeFile: jest.fn(() => Promise.resolve({ text: '' })),
  })),
  detectSttModel: jest.fn(() => Promise.resolve({ success: true, modelType: 'transducer' })),
  getOnlineTypeOrNull: jest.fn(() => 'transducer'),
  createStreamingSTT: jest.fn(),
}));

jest.mock('react-native-sherpa-onnx/audio', () => ({
  createPcmLiveStream: jest.fn(() => ({
    start: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
    onData: jest.fn(() => () => undefined),
    onError: jest.fn(() => () => undefined),
  })),
  decodeAudioFileToFloatSamples: jest.fn(() => Promise.resolve({ samples: [], sampleRate: 16000 })),
}));

jest.mock('react-native-sherpa-onnx/tts', () => ({
  createTTS: jest.fn(() => ({ destroy: jest.fn(), generateSpeech: jest.fn() })),
  detectTtsModel: jest.fn(() => Promise.resolve({ success: true })),
}));

jest.mock('expo-file-system', () => ({
  Paths: { document: { uri: 'file:///data/user/0/com.courier.copilot/files/' } },
}));

// The ear is the seam: it answers this turn's transcript, keyed by the file the
// app itself resolved from the build's audio source.
jest.mock('../streamingStt', () => ({
  aLiveListener: jest.fn(),
  transcribeRecordedUtterance: jest.fn(),
}));

// The hook imports the app's auth client for its default token getter; better-auth
// is ESM-only and does not load in jest (the same mock the turn-routing suite uses).
jest.mock('@/lib/auth-client', () => ({
  sessionToken: jest.fn(() => Promise.resolve('sim-token')),
}));

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { act, renderHook } from '@testing-library/react-native';

import type { ApiOutcome } from '@/lib/api-client';
import { EventLog } from '@/sync/eventLog';
import type { DeliveryEvent, EventStore } from '@/sync/types';

import { transcribeRecordedUtterance } from '../streamingStt';
import type {
  CourierVoiceClient,
  CourierVoiceProactive,
  CourierVoiceSession,
  CourierVoiceTurn,
  CourierVoiceTurnRequest,
  VoiceSettings,
} from '../courierVoiceClient';
import { subscribeToVoiceCommands } from '../commandChannel';
import type { VoiceCommand } from '../VoiceService';
import { voiceService } from '../VoiceService';
import type { VoiceCallbacks } from '../VoiceService';
import { routeTurn } from '../turnRouter';
import { useCourierVoice } from '../useCourierVoice';
import { RunStore } from '@/run/runStore';
import type { DeliveredMark, RunApi, RunCache, RunSnapshot } from '@/run/types';
import type { RunResponse, StopResponse } from '@courier/shared/src/generated/api';
import { DEFAULT_VOICE_SETTINGS } from '../settings';

const transcribeMock = transcribeRecordedUtterance as jest.Mock;

/** The repository root, from `apps/mobile/src/voice/__tests__/`. */
const REPO_ROOT = join(__dirname, '../../../../../');

/** The seed of the turn order (§17): the same seed, the same run. */
const SEED = 20261110;

/** The turn set the simulation drives: the committed, already-scored turns. */
const TURN_SET = join(REPO_ROOT, 'packages/eval/voice/fixtures/scale-turns.jsonl');

/** Where this run writes its own trace, so the evidence is reproducible. */
const RESULTS = join(REPO_ROOT, 'docs/evidence/voice-scale/results');

/** One scripted turn, as the committed turn set spells it. */
interface ScaleTurn {
  turn_id: string;
  script_id: string;
  slice: string;
  variant: string;
  bed: string | null;
  snr_db: number | null;
  file: string;
  sha256: string;
  gold_text: string;
  spoken_text: string;
  hypothesis: string;
  gold_intent: string;
  parsed_intent: string;
  oov_words: string[];
  held_out: boolean;
}

/** What one turn did, end to end: the trace the evidence quotes. */
interface TurnTrace {
  turn_id: string;
  slice: string;
  variant: string;
  file: string;
  sha_verified: boolean;
  armed_file: string | null;
  gold_intent: string;
  gold_text: string;
  hypothesis: string;
  router: string;
  command: string | null;
  command_published: boolean;
  spoken: boolean;
  ack: string | null;
  run_delivered: number;
  run_failed: number;
  events_logged: number;
  events_pending: number;
  false_action: boolean;
  full_turn: boolean;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** The seeded turn order: every turn of the set, in a fixed shuffled order. */
function theTurnOrder(turns: ScaleTurn[]): ScaleTurn[] {
  const random = mulberry32(SEED);
  const order = turns.map((turn, index) => ({ turn, key: random() + index / turns.length }));
  order.sort((left, right) => left.key - right.key);
  return order.map((entry) => entry.turn);
}

/** The committed turn set: one JSON line per scored turn. */
function theTurnSet(): ScaleTurn[] {
  return readFileSync(TURN_SET, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as ScaleTurn);
}

function sha256Of(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** The API the run store would talk to: the server's own suite tests the API. */
class FakeApi implements RunApi {
  seedDemoRun(): Promise<ApiOutcome<{ run_id: string; shift_id: string }>> {
    return Promise.resolve({ status: 'server', code: 500, message: 'not seeded in the sim' });
  }

  getRun(): Promise<ApiOutcome<RunResponse>> {
    return Promise.resolve({ status: 'server', code: 500, message: 'not read in the sim' });
  }

  getStops(): Promise<ApiOutcome<StopResponse[]>> {
    return Promise.resolve({ status: 'server', code: 500, message: 'not read in the sim' });
  }
}

/**
 * The day the sim works: a long deterministic run, so every delivery turn has
 * a stop still on it to mark (the real day is 20-200 stops; the set speaks far
 * more turns than that, and a run that ran out of stops mid-simulation would
 * be a simulation that stopped acting).
 */
const THE_STOPS: StopResponse[] = Array.from({ length: 1200 }, (_unused, index) => ({
  id: `stop-${index + 1}`,
  location_id: `loc-${index + 1}`,
  address: `${index + 1} Poulson Street, Addington`,
  seq: index + 1,
  status: 'pending',
  type: 'delivery',
  lat: -43.53,
  lon: 172.6,
  parcels: 1,
}));

const THE_DAY: RunSnapshot = {
  run: {
    id: 'sim-run',
    shift_id: 'sim-shift',
    name: 'the simulation run',
    depot: 'Christchurch',
    speed_kmh: 0,
    start_at: '2026-11-10T06:00:00+13:00',
  } as unknown as RunResponse,
  stops: THE_STOPS,
};

/** The clock of the deterministic run (§17): no wall clock in the trace. */
function theClock(): () => number {
  let at = 1760052000000;
  return () => {
    at += 1000;
    return at;
  };
}

/** The cache the phone keeps the day in: the day, and the marks above it. */
class FakeCache implements RunCache {
  readonly marks: DeliveredMark[] = [];

  read(): Promise<RunSnapshot | null> {
    return Promise.resolve(THE_DAY);
  }

  write(): Promise<void> {
    return Promise.resolve();
  }

  markDelivered(mark: DeliveredMark): Promise<void> {
    this.marks.push(mark);
    return Promise.resolve();
  }

  undoDelivered(stopId: string): Promise<void> {
    const index = this.marks.findIndex((mark) => mark.stopId === stopId);
    if (index >= 0) {
      this.marks.splice(index, 1);
    }
    return Promise.resolve();
  }

  markOf(stopId: string): Promise<DeliveredMark | null> {
    return Promise.resolve(this.marks.find((mark) => mark.stopId === stopId) ?? null);
  }

  deliveredMarks(): Promise<DeliveredMark[]> {
    return Promise.resolve([...this.marks]);
  }

  clear(): Promise<void> {
    this.marks.length = 0;
    return Promise.resolve();
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

/** The event log's storage, in memory: the real EventLog sits above it. */
class FakeEventStore implements EventStore {
  readonly events: DeliveryEvent[] = [];
  readonly synced = new Set<string>();
  readonly quarantined: DeliveryEvent[] = [];

  append(event: DeliveryEvent): Promise<void> {
    if (!this.events.some((stored) => stored.id === event.id)) {
      this.events.push(event);
    }
    return Promise.resolve();
  }

  pending(limit: number): Promise<DeliveryEvent[]> {
    return Promise.resolve(
      this.events
        .filter(
          (event) => !this.synced.has(event.id) && !this.quarantined.some((q) => q.id === event.id),
        )
        .slice(0, limit),
    );
  }

  markSynced(ids: string[]): Promise<void> {
    ids.forEach((id) => this.synced.add(id));
    return Promise.resolve();
  }

  quarantine(events: DeliveryEvent[]): Promise<void> {
    events.forEach((event) => this.quarantined.push(event));
    return Promise.resolve();
  }

  forget(id: string): Promise<void> {
    const index = this.events.findIndex((event) => event.id === id);
    if (index >= 0 && !this.synced.has(id)) {
      this.events.splice(index, 1);
    }
    return Promise.resolve();
  }

  pendingCount(): Promise<number> {
    return Promise.resolve(this.events.length - this.synced.size - this.quarantined.length);
  }
}

/** The voice service's HTTP client: the answer a full-routed turn gets. */
class FakeVoiceClient {
  fullTurns: string[] = [];

  startSession(): Promise<CourierVoiceSession> {
    return Promise.resolve({
      id: 'sim-session',
      driver_id: 'sim-driver',
      shift_id: 'sim-shift',
      turns: 0,
      settings: DEFAULT_VOICE_SETTINGS,
      remembered: true,
    });
  }

  readSession(): Promise<CourierVoiceSession> {
    return Promise.resolve({
      id: 'sim-session',
      driver_id: 'sim-driver',
      shift_id: 'sim-shift',
      turns: 0,
      settings: DEFAULT_VOICE_SETTINGS,
      remembered: true,
    });
  }

  sendTurn(_sessionId: string, turn: CourierVoiceTurnRequest): Promise<CourierVoiceTurn> {
    this.fullTurns.push(turn.transcript);
    return Promise.resolve({
      speech: 'Noted.',
      action: null,
      engine: 'sim-server-brain',
      source: 'server',
      mode: 'auto',
      barge_in: false,
      ended_turn: true,
      priority: 'now',
      notice: null,
      words: 1,
      latency_ms: 1,
      gate: 'full',
    });
  }

  proactive(): Promise<CourierVoiceProactive> {
    return Promise.resolve({ kind: 'morning_brief', text: 'Three stops on the run.', words: 5 });
  }

  forgetSession(): Promise<void> {
    return Promise.resolve();
  }

  readSettings(): Promise<VoiceSettings> {
    return Promise.resolve(DEFAULT_VOICE_SETTINGS);
  }

  writeSettings(settings: VoiceSettings): Promise<VoiceSettings> {
    return Promise.resolve(settings);
  }

  engines(): Promise<unknown[]> {
    return Promise.resolve([]);
  }

  licences(): Promise<unknown[]> {
    return Promise.resolve([]);
  }
}

/** The same client, as the hook's own seam takes it. */
const asClient = (client: FakeVoiceClient): CourierVoiceClient =>
  client as unknown as CourierVoiceClient;

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

/** The active stop of the run, the way the layout's own bridge reads it. */
function activeOf(stops: StopResponse[], deliveredIds: readonly string[]): StopResponse | null {
  const pending = stops
    .filter((stop) => !deliveredIds.includes(stop.id))
    .sort((left, right) => (left.seq ?? 0) - (right.seq ?? 0));
  return pending.length === 0 ? null : pending[0];
}

describe('the A-to-Z voice simulation at scale (founder directive item 4)', () => {
  const turns = theTurnSet();
  const ordered = theTurnOrder(turns);
  const traces: TurnTrace[] = [];
  const eventStore = new FakeEventStore();
  const events = new EventLog(eventStore);
  const cache = new FakeCache();
  const client = new FakeVoiceClient();
  const store = new RunStore({
    client: new FakeApi(),
    cache,
    events,
    reason: 'e2e',
    clock: theClock(),
  });
  const delivered: string[] = [];
  const failed: string[] = [];
  /** Every command the channel carried, in order: the sim's own count of them. */
  const published: VoiceCommand[] = [];
  let speak: jest.SpyInstance;
  let releaseBridge: () => void = () => undefined;

  beforeAll(async () => {
    await store.load();
    // The tab layout's own bridge (`app/(tabs)/_layout.tsx`): a spoken delivery
    // or failure marks the run's ACTIVE stop, whichever screen the courier is
    // on. The layout itself needs the whole router tree; the run store it drives
    // here is the real one, and its event log is the real one under it.
    releaseBridge = subscribeToVoiceCommands((command) => {
      // The count the trace quotes: the channel really carried this command.
      published.push(command);
      if (command.type !== 'mark_delivered' && command.type !== 'mark_failed') {
        return;
      }
      // The run's active stop, read the way `@/maps/drive`'s `activeOf` reads
      // it: the first stop still on the run, which a delivery or a failure both
      // take off it.
      const active = activeOf(THE_STOPS, [...delivered, ...failed]);
      if (active === null) {
        return;
      }
      if (command.type === 'mark_delivered') {
        delivered.push(active.id);
        void store.markDelivered({ id: active.id, sequence: active.seq ?? 0 });
      } else {
        failed.push(active.id);
        void store.markFailed(
          { id: active.id, sequence: active.seq ?? 0 },
          { reason: command.reason, utterance: 'voice' },
        );
      }
    });
  });

  afterAll(async () => {
    // The trace is written FIRST: an evidence file that never lands because the
    // store was closing is a run nobody can read (§15's discipline applied to
    // the run's own output).
    const pending = await events.nextBatch(1000);
    writeTheEvidence(traces, {
      turns: traces.length,
      action_turns: traces.filter((trace) => trace.gold_intent !== 'noop').length,
      chatter_turns: traces.filter((trace) => trace.gold_intent === 'noop').length,
      false_actions: traces.filter((trace) => trace.false_action).length,
      full_turns: traces.filter((trace) => trace.full_turn).length,
      delivered: delivered.length,
      failed: failed.length,
      events_logged: eventStore.events.length,
      events_pending: pending.length,
    });
    releaseBridge();
    await store.close();
  });

  it(`carries all ${ordered.length} scripted turns through the whole path`, async () => {
    const { result } = renderHook(() =>
      useCourierVoice({ driverId: 'sim-driver', client: asClient(client), online: false }),
    );
    // The tab layout's own delegate: every finished transcript reaches the turn
    // flow, so the full conversation (not only the catalog commands) is routed.
    await voiceService.initialize(
      CONFIG,
      baseCallbacks({
        onFinalTranscript: (text) => {
          void result.current.sendTurn(text, { trigger: 'push_to_talk' });
        },
      }),
    );
    speak = jest.spyOn(voiceService, 'speak').mockResolvedValue(undefined);
    await act(async () => {
      await Promise.resolve();
    });

    expect(ordered.length).toBeGreaterThanOrEqual(500);
    for (const turn of ordered) {
      await runOneTurn(turn);
    }
    expect(traces.length).toBe(ordered.length);
  }, 900000);

  it('every action turn the phone answered applied it, spoke it and synced it', () => {
    const answered = traces.filter((trace) => trace.command_published);
    // The directive's floor: >= 500 action turns carried end to end.
    expect(answered.length).toBeGreaterThanOrEqual(500);
    for (const trace of answered) {
      expect(trace.sha_verified).toBe(true);
      expect(trace.command).not.toBeNull();
      // The phone spoke the router's own ack line for what it just did.
      expect(trace.spoken).toBe(true);
      expect(trace.ack).not.toBeNull();
      // The commands that move a stop moved one, and the event log carries it
      // for the outbox that has not sent it yet.
      if (trace.command === 'mark_delivered' || trace.command === 'mark_failed') {
        expect(trace.run_delivered + trace.run_failed).toBeGreaterThanOrEqual(1);
        expect(trace.events_logged).toBeGreaterThanOrEqual(1);
        expect(trace.events_pending).toBeGreaterThanOrEqual(1);
      }
    }
    // The turns the recognizer defeated are NAMED, not quietly dropped: the
    // evidence's per_turn.csv carries every one of them with the transcript
    // that defeated it (docs/evidence/voice-scale/README.md).
    const unread = traces.filter(
      (trace) => trace.gold_intent !== 'noop' && !trace.command_published,
    );
    expect(unread.length + answered.length).toBe(
      traces.filter((trace) => trace.gold_intent !== 'noop').length,
    );
  });

  it('the build seam armed the file the run asked for, turn after turn', () => {
    const answered = traces.filter((trace) => trace.command_published);
    expect(answered.length).toBeGreaterThanOrEqual(500);
    for (const trace of answered) {
      // The path the app resolved is the one this run armed, and it is the
      // committed set's own file: option C's wiring, asserted per turn.
      expect(trace.armed_file).toBe(join(REPO_ROOT, trace.file));
    }
  });

  it('every chatter turn acted on nothing: the false-action count is the failure count', () => {
    const chatter = traces.filter((trace) => trace.gold_intent === 'noop');
    expect(chatter.length).toBeGreaterThanOrEqual(100);
    const acted = chatter.filter((trace) => trace.command_published);
    expect(acted.map((trace) => trace.turn_id)).toEqual([]);
    for (const trace of chatter) {
      expect(trace.command).toBeNull();
      expect(trace.run_delivered + trace.run_failed).toBe(0);
      // The app's own parser found no command: that is the false-action leg on
      // the PHONE. The service's own brain on the same transcripts is scored by
      // app/eval_scale.py and quoted in the evidence.
      expect(trace.router === 'full' || trace.router === 'ignore').toBe(true);
    }
  });

  it('the run, the log and the trace tell the same story', async () => {
    const marks = await store.deliveredMarks();
    expect(marks.length).toBeGreaterThanOrEqual(1);
    const pending = await events.nextBatch(1000);
    expect(pending.length).toBeGreaterThanOrEqual(marks.length);
    const moving = traces.filter((trace) => trace.run_delivered + trace.run_failed > 0);
    expect(moving.length).toBeGreaterThanOrEqual(1);
    expect(delivered.length + failed.length).toBe(moving.length);
  });

  it('the seeded order is the same for the same seed', () => {
    const again = theTurnOrder(turns);
    expect(again.map((turn) => turn.turn_id)).toEqual(ordered.map((turn) => turn.turn_id));
    // And it is a real shuffle, not the manifest's own order.
    expect(again[0].turn_id).not.toBe(turns[0].turn_id);
  });

  /**
   * One turn, end to end: arm the file, push to talk, follow the answer.
   *
   * The trace is the claim: which file was armed and that it still hashed, what
   * the router decided, what command was published, what the run did, what was
   * spoken and what the event log holds. A chatter turn that published a
   * command is a FALSE ACTION and is counted, not ignored.
   */
  async function runOneTurn(turn: ScaleTurn): Promise<void> {
    const path = join(REPO_ROOT, turn.file);
    const shaVerified = existsAndMatches(path, turn.sha256);
    // The armed file is the one the seam answers with this turn's transcript.
    // The flag names it the way the E2E runner's push does: a file:// URI, which
    // the app's own `audioFileInput` takes as it is (a bare name would be read
    // from the app's document directory instead).
    process.env.EXPO_PUBLIC_E2E = '1';
    process.env.EXPO_PUBLIC_E2E_AUDIO_FILE = `file://${path}`;
    transcribeMock.mockResolvedValue({ status: 'ok', text: turn.hypothesis, latencyMs: 3 });

    const beforeDelivered = delivered.length;
    const beforeFailed = failed.length;
    const beforeSpoken = speak.mock.calls.length;
    const beforeEvents = eventStore.events.length;
    const beforePending = (await events.nextBatch(1000)).length;
    const beforePublished = published.length;

    await act(async () => {
      await voiceService.startListening();
      // The turn flow runs on the side of the transcript: the free path awaits
      // its own speak before the sentence is over.
      for (let tick = 0; tick < 8; tick += 1) {
        await Promise.resolve();
      }
    });

    const carried = published.slice(beforePublished);
    const command = carried.length > 0 ? carried[0] : null;
    const routed = routeTurn(turn.hypothesis);
    // The seam answered for THIS file: the app's own build seam resolved the
    // path the run armed, and the recorded-utterance seam was handed exactly it.
    // The LAST call is this turn's (the mock keeps the whole run's history).
    const armedCalls = transcribeMock.mock.calls as unknown[][];
    const armed = armedCalls.length > 0 ? textOf(armedCalls[armedCalls.length - 1][0]) : null;
    const spokenCalls = speak.mock.calls.slice(beforeSpoken) as unknown[][];
    const spoken = spokenCalls.length > 0;
    const ack = spoken ? textOf(spokenCalls[0][0]) : null;
    const pendingCount = (await events.nextBatch(1000)).length;
    traces.push({
      turn_id: turn.turn_id,
      slice: turn.slice,
      variant: turn.variant,
      file: turn.file,
      sha_verified: shaVerified,
      armed_file: armed,
      gold_intent: turn.gold_intent,
      gold_text: turn.gold_text,
      hypothesis: turn.hypothesis,
      router: routed.gate,
      command: command === null ? null : command.type,
      command_published: carried.length > 0,
      spoken,
      ack,
      run_delivered: delivered.length - beforeDelivered,
      run_failed: failed.length - beforeFailed,
      events_logged: eventStore.events.length - beforeEvents,
      events_pending: pendingCount - beforePending,
      false_action: turn.gold_intent === 'noop' && carried.length > 0,
      full_turn: routed.gate === 'full',
    });
  }
});

/** A value as a CSV cell: objects are named by their type, never [object Object]. */
function textOf(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(textOf).join(';');
  }
  return JSON.stringify(value);
}

/** The file is on disk and still hashes to its sidecar row: the pin. */
function existsAndMatches(path: string, sha256: string): boolean {
  try {
    const bytes = readFileSync(path);
    return sha256Of(bytes) === sha256;
  } catch {
    // A turn whose audio is not on this machine is named in the evidence, never
    // quietly counted as carried.
    return false;
  }
}

/** The run's own evidence: the per-turn CSV and the counts, written fresh. */
function writeTheEvidence(traces: TurnTrace[], counts: Record<string, number>): void {
  mkdirSync(RESULTS, { recursive: true });
  const header = [
    'turn_id',
    'slice',
    'variant',
    'sha_verified',
    'gold_intent',
    'router',
    'command',
    'command_published',
    'spoken',
    'ack',
    'run_delivered',
    'run_failed',
    'events_logged',
    'false_action',
    'full_turn',
    'hypothesis',
    'gold_text',
  ].join(',');
  const cell = (value: unknown): string => {
    const text = textOf(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const rows = traces.map((trace) =>
    [
      trace.turn_id,
      trace.slice,
      trace.variant,
      trace.sha_verified,
      trace.gold_intent,
      trace.router,
      trace.command,
      trace.command_published,
      trace.spoken,
      trace.ack,
      trace.run_delivered,
      trace.run_failed,
      trace.events_logged,
      trace.false_action,
      trace.full_turn,
      trace.hypothesis,
      trace.gold_text,
    ]
      .map(cell)
      .join(','),
  );
  writeFileSync(join(RESULTS, 'per_turn.csv'), `${header}\n${rows.join('\n')}\n`, 'utf8');
  writeFileSync(
    join(RESULTS, 'simulation-summary.json'),
    `${JSON.stringify(
      {
        ...counts,
        seed: SEED,
        by_slice: traces.reduce<Record<string, number>>((totals, trace) => {
          totals[trace.slice] = (totals[trace.slice] ?? 0) + 1;
          return totals;
        }, {}),
        by_variant: traces.reduce<Record<string, number>>((totals, trace) => {
          totals[trace.variant] = (totals[trace.variant] ?? 0) + 1;
          return totals;
        }, {}),
        commands: traces.reduce<Record<string, number>>((totals, trace) => {
          if (trace.command !== null) {
            totals[trace.command] = (totals[trace.command] ?? 0) + 1;
          }
          return totals;
        }, {}),
        false_action_turns: traces
          .filter((trace) => trace.false_action)
          .map((trace) => trace.turn_id),
        unverified_files: traces.filter((trace) => !trace.sha_verified).map((trace) => trace.file),
      },
      null,
      1,
    )}\n`,
    'utf8',
  );
}
