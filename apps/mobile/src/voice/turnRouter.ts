/**
 * The app-side pre-classifier of the voice turn flow (D1, founder decision:
 * the live voice assistant works throughout the shift; MASTER §22 technique
 * A on the phone).
 *
 * One routing decision per finished transcript, mirroring the service's own
 * gate (`services/courier-voice/app/turn_gate.py`, landed 2026-11-04):
 *
 * - a turn with no words in it routes `ignore` ("nothing was said") - the
 *   gate refuses to spend a model call on it;
 * - a catalog command whose answer does not depend on the day - the
 *   service's CONTEXT_FREE_COMMANDS, plus the map and camera verbs - routes
 *   `free`: the app answers it locally, publishes the command and speaks the
 *   ack, with NO HTTP call;
 * - anything else routes `full`: the server brain answers with the day the
 *   phone holds.
 *
 * The routing is pure and local - no model call, no gateway, no run fetch -
 * so it is tested without a device.
 */

import { parseVoiceCommand } from './commands';
import type { VoiceCommand } from './VoiceService';

/** The closed outcome set of the gate, the service's own three routes. */
export type TurnGate = 'free' | 'ignore' | 'full';

/** One routing decision: the route, why, and the command it found. */
export interface RoutedTurn {
  gate: TurnGate;
  command: VoiceCommand | null;
  reason: string;
}

/**
 * The commands whose answer does not depend on the day, so the app may answer
 * them without the service: the delivery verbs and the break/note ones (the
 * service's CONTEXT_FREE_COMMANDS) plus the map and camera verbs, which only
 * move the map the phone already shows.
 */
const CONTEXT_FREE_TYPES: ReadonlySet<VoiceCommand['type']> = new Set([
  'mark_delivered',
  'mark_failed',
  'mark_skipped',
  'add_stop',
  'add_location_note',
  'start_break',
  'end_break',
  'set_map_mode',
  'zoom_to_next_stop',
  'tilt_map',
  'follow_me',
  'look_back',
  'reset_camera',
]);

/** A turn with no words in it: not a command, not a conversation. */
const NO_WORDS = /^[\s.,!?:;'"()-]*$/;

/**
 * Routes one turn before anything is sent anywhere.
 *
 * The gate never reads the day: that dependency is exactly what makes a turn
 * full.
 */
export function routeTurn(transcript: string): RoutedTurn {
  const said = (transcript ?? '').trim();
  if (NO_WORDS.test(said)) {
    return { gate: 'ignore', command: null, reason: 'nothing was said' };
  }
  const command = parseVoiceCommand(said);
  if (command === null) {
    return {
      gate: 'full',
      command: null,
      reason: 'not a known command: the conversation is the model\'s',
    };
  }
  if (CONTEXT_FREE_TYPES.has(command.type)) {
    return {
      gate: 'free',
      command,
      reason: `the offline brain knows this command (${command.type}): no model call, no HTTP`,
    };
  }
  return {
    gate: 'full',
    command,
    reason: `the command ${command.type} reads the day the phone holds: the full path answers it`,
  };
}

/**
 * The line the voice speaks for a free turn, so a spoken command is answered
 * out loud the way the server brain answers a full one.
 */
export function ackLineFor(command: VoiceCommand): string {
  switch (command.type) {
    case 'mark_delivered':
      return 'Delivered.';
    case 'mark_skipped':
      return 'Skipped.';
    case 'mark_failed':
      return 'Marked failed.';
    case 'add_stop':
      return 'Stop added.';
    case 'start_break':
      return command.minutes === null ? 'Break started.' : `Break started, ${command.minutes} minutes.`;
    case 'end_break':
      return 'Back on the run.';
    case 'add_location_note':
      return 'Note saved.';
    case 'set_map_mode':
      return `Map: ${command.mode}.`;
    case 'zoom_to_next_stop':
      return 'Zooming to the next stop.';
    case 'tilt_map':
      return command.on ? 'Tilting the map.' : 'Map flattened.';
    case 'follow_me':
      return command.on ? 'Following you.' : 'Free camera.';
    case 'look_back':
      return 'Looking back.';
    case 'reset_camera':
      return 'Camera reset.';
    default:
      return '';
  }
}
