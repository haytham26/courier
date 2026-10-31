/**
 * The voice command catalogue.
 *
 * The parser is the offline path of the voice: it reads the sentence the
 * courier said and turns it into one command of the catalogue in
 * `VoiceService.ts`, without a network and without the language model. The
 * wording follows the server catalogue in `services/api/app/agents/copilot.py`,
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

/**
 * The delivery verbs, in the shape the server catalogue uses.
 *
 * The patterns carry the case-insensitive flag and are matched against the
 * sentence as it was said, so the words the courier spoke keep their case: an
 * address ("5 Rimu Street") has to reach the address engine the way it was
 * said.
 */
const DELIVERY_PATTERNS: readonly { pattern: RegExp; command: VoiceCommand }[] = [
  {
    pattern: /^(?:delivered|done|dropped(?: it)?|tick)\.?$/i,
    command: { type: 'mark_delivered', stopId: 'current' },
  },
  {
    // BUG-073 (the C1 audit, squad 1 finding 4): the place the courier spoke
    // ("left it at the side gate") used to be captured by this pattern and
    // then thrown away, so the delivery reached the app with nowhere recorded.
    // The courier's own words are carried now, through the command and into
    // the delivery request, because the next person who looks for the parcel
    // has nothing else to go on.
    //
    // The preposition list is the words a NZ courier actually says for a
    // parcel's resting spot, including "under" and "behind", which were not
    // there before and are the reason "left it under the mat" made no command
    // at all.
    pattern:
      /^left(?:\s+it)?\s+(?:at|by|in|on|under|behind|inside|next to|beside)\s+(?:the\s+)?(?<place>[\w\s]+?)\.?$/i,
    command: { type: 'mark_delivered', stopId: 'current' },
  },
  {
    pattern: /^(?:skip|come back(?: to it)?)\.?$/i,
    command: { type: 'mark_skipped', stopId: 'current' },
  },
  {
    pattern: /^(?:fail|failed|no access|could not deliver|not delivered)\.?$/i,
    command: { type: 'mark_failed', stopId: 'current', reason: 'voice' },
  },
  {
    pattern: /^(?:add|also got|priority|urgent)\s+(?:stop\s+)?(?<address>.+)$/i,
    command: { type: 'add_stop', rawAddress: '' },
  },
  {
    pattern: /^start (?:a )?break(?: for (?<minutes>\d+) minutes?)?\.?$/i,
    command: { type: 'start_break', minutes: null },
  },
  {
    pattern: /^(?:end break|break'?s over|back to work)\.?$/i,
    command: { type: 'end_break' },
  },
  {
    pattern: /^(?:note|gate code is|watch the dog|side gate)\s*:?\s*(?<text>.+)$/i,
    command: { type: 'add_location_note', kind: 'note', text: '' },
  },
  {
    pattern: /^(?:repeat|say again|what)\??$/i,
    command: { type: 'repeat_instruction' },
  },
  {
    pattern: /^where am i\b/i,
    command: { type: 'where_am_i' },
  },
  {
    pattern: /^how many\s+(?:left|stops left|to go)\b/i,
    command: { type: 'how_many_left' },
  },
  {
    pattern: /^start\s+(?:my\s+)?shift\b/i,
    command: { type: 'start_shift' },
  },
  {
    pattern: /^end\s+(?:my\s+)?shift\b/i,
    command: { type: 'end_shift' },
  },
  {
    pattern: /^emergency\b/i,
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
  const trimmed = transcript.trim().replace(/[.!?,]+$/, '');
  const said = trimmed.toLowerCase();
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
    // The sentence is matched as it was said, so the words the courier spoke
    // keep their case: an address has to reach the address engine the way it
    // was said.
    const match = entry.pattern.exec(trimmed);
    if (match === null) {
      continue;
    }
    const groups = match.groups ?? {};
    if (groups.place !== undefined) {
      // BUG-073: the place is carried, as the courier said it. The pattern
      // matched against the sentence with its case kept, so "Left It At The
      // Side Gate" stays the way it was spoken; the leading "the" the pattern
      // allows is not part of the place itself.
      const place = groups.place.trim();
      return {
        type: 'mark_delivered',
        stopId: 'current',
        safePlace: place.length > 0 ? place : undefined,
      };
    }
    if (groups.address !== undefined) {
      return { type: 'add_stop', rawAddress: groups.address.trim() };
    }
    if (groups.minutes !== undefined) {
      return { type: 'start_break', minutes: Number.parseInt(groups.minutes, 10) };
    }
    if (groups.text !== undefined) {
      return { type: 'add_location_note', kind: 'note', text: groups.text.trim() };
    }
    return entry.command;
  }

  return null;
}
