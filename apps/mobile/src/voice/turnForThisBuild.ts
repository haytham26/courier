/**
 * The voice turn flow of this build (D1, BUG-231) - the same seam pattern as
 * `src/pod/podForThisBuild.ts`:
 *
 * - in the E2E build (`EXPO_PUBLIC_E2E === '1'`, inlined at bundle time) a tap
 *   on the Copilot sphere injects a canned transcript into the turn flow
 *   instead of opening a microphone there is no model for, and the voice
 *   client answers the canned session and the canned turn - so the Maestro
 *   flow can prove the whole path: the routing, the answer in the dock's
 *   caption, and the voice→run bridge;
 * - in every other build the seam is inert: `cannedTurnForThisBuild` answers
 *   false (the caller opens the real microphone) and the client is the real
 *   `CourierVoiceClient`.
 *
 * The flags are read at CALL time (like the pod seam), and the queue is module
 * state, so the flow's taps get the canned turns in order.
 */

import { sessionToken } from '@/lib/auth-client';

import {
  CourierVoiceClient,
  type CourierVoiceProactive,
  type CourierVoiceSession,
  type CourierVoiceTurn,
  type CourierVoiceTurnRequest,
} from './courierVoiceClient';
import { DEFAULT_VOICE_SETTINGS, type VoiceSettings } from './settings';

/**
 * Where the voice service lives in a real build - the same default
 * `useCourierVoice`'s `VOICE_SERVICE_URL` answers (kept local so this seam does
 * not pull the voice service's native imports into every importer).
 */
const REAL_BASE_URL = process.env.EXPO_PUBLIC_VOICE_SERVICE_URL ?? 'http://localhost:8080';

/** The canned transcripts the E2E build injects, one per tap, in order. */
const CANNED_TRANSCRIPTS: readonly string[] = [
  'how many stops are left on the run',
  'delivered',
];

/** The canned queue, drained by the taps. */
const queue: string[] = [...CANNED_TRANSCRIPTS];

/** The next canned transcript, or null when the queue is drained (or not E2E). */
export function nextCannedTranscript(): string | null {
  if (process.env.EXPO_PUBLIC_E2E !== '1') {
    return null;
  }
  return queue.shift() ?? null;
}

/**
 * Injects the next canned transcript into the turn flow, in the E2E build.
 *
 * Answers true when a canned turn was sent (the caller must NOT open the
 * microphone), false everywhere else and once the queue is drained.
 */
export function cannedTurnForThisBuild(send: (transcript: string) => unknown): boolean {
  const canned = nextCannedTranscript();
  if (canned === null) {
    return false;
  }
  send(canned);
  return true;
}

/** The canned session of the E2E build. */
const CANNED_SESSION: CourierVoiceSession = {
  id: 'e2e-voice-session',
  driver_id: 'e2e-driver',
  shift_id: null,
  turns: 0,
  settings: DEFAULT_VOICE_SETTINGS,
  remembered: true,
};

/**
 * The canned answer of the E2E build's client: the question the flow asks is
 * answered with the spoken line the flow asserts in the dock's caption.
 */
function cannedAnswerFor(transcript: string): CourierVoiceTurn {
  const base = {
    action: null,
    engine: 'e2e-server-brain',
    source: 'server' as const,
    mode: 'auto' as const,
    barge_in: false,
    ended_turn: true,
    priority: 'now' as const,
    notice: null,
    words: 0,
    latency_ms: 1,
    gate: 'full',
  };
  if (/how many/i.test(transcript)) {
    return { ...base, speech: 'Four stops left on the run.', words: 6 };
  }
  return { ...base, speech: 'Noted.', words: 1 };
}

/** The mock voice client of the E2E build: canned, and never on the network. */
function createMockVoiceClient(): CourierVoiceClient {
  const mock = {
    startSession: () => Promise.resolve({ ...CANNED_SESSION }),
    readSession: () => Promise.resolve({ ...CANNED_SESSION }),
    sendTurn: (_sessionId: string, turn: CourierVoiceTurnRequest) =>
      Promise.resolve(cannedAnswerFor(turn.transcript)),
    proactive: (): Promise<CourierVoiceProactive> =>
      Promise.resolve({ kind: 'morning_brief', text: 'Five stops on the run today.', words: 5 }),
    forgetSession: () => Promise.resolve(),
    readSettings: (): Promise<VoiceSettings> => Promise.resolve(DEFAULT_VOICE_SETTINGS),
    writeSettings: (settings: VoiceSettings) => Promise.resolve(settings),
    engines: () => Promise.resolve([]),
    licences: () => Promise.resolve([]),
  };
  return mock as unknown as CourierVoiceClient;
}

/**
 * The voice client of this build: the canned one in the E2E build, the real
 * client (at the build's own service URL, with the courier's token) in every
 * other build.
 */
export function voiceClientForThisBuild(): CourierVoiceClient {
  if (process.env.EXPO_PUBLIC_E2E === '1') {
    return createMockVoiceClient();
  }
  return new CourierVoiceClient({ baseUrl: REAL_BASE_URL, getToken: sessionToken });
}
