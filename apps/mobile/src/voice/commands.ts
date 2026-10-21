/**
 * The voice command catalogue.
 *
 * The parser is the offline path of the voice: it reads the sentence the
 * courier said and turns it into one command of the catalogue in
 * `VoiceService.ts`, without a network and without the language model. The
 * wording follows the server catalogue in `apps/api/app/agents/copilot.py`,
 * so the same sentence means the same thing online and offline.
 *
 * The map verbs - the map mode and the camera - are the ones MASTER_EXECUTION
 * §11 asks for: "3D on", "flat map", "satellite", "auto", "zoom to the next
 * stop", "tilt the map", "follow me", "look back".
 */

import { parseCameraCommand } from '@/maps/cameraCommands';
import type { MapViewMode } from '@/maps/viewModes';
import type { VoiceCommand } from './VoiceService';

/** The map modes a courier can ask for by voice. */
const MODE_PATTERNS: readonly { pattern: RegExp; mode: MapViewMode }[] = [
  {
    pattern: /^(?:3d|three d|3-d)\s*(?:on|map|view|mode)?\b/,
    mode: '3d',
  },
  {
    pattern: /^(?:flat|2d|two d|2-d)\s*(?:map|view|mode|on)?\b/,
    mode: 'flat',
  },
  {
    pattern: /^satellite(?:\s+(?:map|view|mode|on))?\b/,
    mode: 'satellite',
  },
  {
    pattern: /^auto(?:matic)?\s*(?:map|view|mode)?\b/,
    mode: 'auto',
  },
];

/** The delivery verbs, in the shape the server catalogue uses. */
const DELIVERY_PATTERNS: readonly { pattern: RegExp; command: VoiceCommand }[] = [
  {
    pattern: /^(?:delivered|done|dropped(?: it)?|tick)\.?$/,
    command: { type: 'mark_delivered', stopId: 'current' },
  },
  {
    pattern: /^left\s+(?:at|by|in|on)\s+(?:the\s+)?(?<place>[\w\s]+?)\.?$/,
    command: { type: 'mark_delivered', stopId: 'current' },
  },
  {
    pattern: /^(?:skip|come back(?: to it)?)\.?$/,
    command: { type: 'mark_skipped', stopId: 'current' },
  },
  {
    pattern: /^(?:fail|failed|no access|could not deliver|not delivered)\.?$/,
    command: { type: 'mark_failed', stopId: 'current', reason: 'voice' },
  },
  {
    pattern: /^(?:repeat|say again|what)\??$/,
    command: { type: 'repeat_instruction' },
  },
  {
    pattern: /^where\s+am\s+i\b/,
    command: { type: 'where_am_i' },
  },
  {
    pattern: /^how\s+many\s+(?:left|stops left|to go)\b/,
    command: { type: 'how_many_left' },
  },
  {
    pattern: /^start\s+(?:my\s+)?shift\b/,
    command: { type: 'start_shift' },
  },
  {
    pattern: /^end\s+(?:my\s+)?shift\b/,
    command: { type: 'end_shift' },
  },
  {
    pattern: /^emergency\b/,
    command: { type: 'emergency' },
  },
];

/**
 * Reads one command out of what the courier said.
 *
 * The map verbs come first: "zoom to the next stop" must not be read as a
 * skip, and "satellite" must not be read as anything else.
 *
 * It returns null when the sentence is not a command of the catalogue.
 */
export function parseVoiceCommand(transcript: string): VoiceCommand | null {
  const said = transcript
    .trim()
    .toLowerCase()
    .replace(/[.!?,]+$/, '');
  if (said.length === 0) {
    return null;
  }

  for (const entry of MODE_PATTERNS) {
    if (entry.pattern.test(said)) {
      return { type: 'set_map_mode', mode: entry.mode };
    }
  }

  const camera = parseCameraCommand(said);
  if (camera) {
    switch (camera.type) {
      case 'zoom_to_next_stop':
        return { type: 'zoom_to_next_stop' };
      case 'tilt_map':
        return { type: 'tilt_map', on: camera.on };
      case 'follow_me':
        return { type: 'follow_me', on: camera.on };
      case 'look_back':
        return { type: 'look_back' };
      case 'reset_camera':
        return { type: 'reset_camera' };
      default:
        break;
    }
  }

  for (const entry of DELIVERY_PATTERNS) {
    if (entry.pattern.test(said)) {
      return entry.command;
    }
  }

  return null;
}
