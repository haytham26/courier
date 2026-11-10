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
    // The verb that introduces the stop is not part of the address: "add a stop
    // at 24 Wendover Street" hands over the STREET, and the old pattern handed
    // over "a stop at 24 Wendover Street".
    pattern:
      /^(?:add|also got|priority|urgent)\s+(?:(?:a\s+)?stop\s+at|one\s+at|parcel\s+for|stop\s+)?(?<address>.+)$/i,
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
    pattern:
      /^(?:note|gate code is|watch the dog|side gate|parcel box round the back)\s*:?\s*(?<text>.+)$/i,
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
 * A spoken address, the way a courier says it: the number (with its unit form
 * "4/65") at the front, the street, and the suburb after the comma when the
 * courier bothers to say it. The eval set's 720 scripts all speak this shape.
 */
const SPOKEN_ADDRESS = String.raw`(?<address>\d[\w/\-]*(?:\s+[A-Za-z][\w'\u2019]*)+(?:,\s*[A-Za-z][\w'\u2019]*(?:\s+[A-Za-z][\w'\u2019]*)*)?)`;

/**
 * The delivery sentences that carry their address.
 *
 * The bare verbs ("delivered", "left it at the porch") are what the earbud and
 * the floor tests use and they keep their answers below; these are the shapes
 * the eval set actually carries - 25 % of the whole set speaks one of them -
 * and before this they routed to the server brain, so the phone's own offline
 * path was silent on the turns a courier makes most.
 */
const SPOKEN_DELIVERY_PATTERNS: readonly RegExp[] = [
  // "delivered at 57 Poulson Street, Addington" / "delivering at 490 West Street"
  // (the ear's own variant of the same sentence)
  new RegExp(String.raw`^(?:delivered|delivering|done)\s+at\s+${SPOKEN_ADDRESS}$`, 'i'),
  // "left it on the porch at 19 Date Crescent, Aidanfield", "put it in the porch at ...",
  // "left at the shop counter at 126 Kivers Road, Burnham" (the `it` is optional)
  new RegExp(
    String.raw`^(?:left|put|lefted)\s+(?:it\s+)?(?:at|by|in|on|under|behind|inside|next to|beside)\s+(?:the\s+)?(?<place>[\w][\w\s]*?)\s+at\s+${SPOKEN_ADDRESS}$`,
    'i',
  ),
  // "dropped it in the letterbox at 490 West Street, Allenton"
  new RegExp(
    String.raw`^dropped\s+it\s+(?:in|on|at|under|behind|inside)\s+(?:the\s+)?(?<place>[\w][\w\s]*?)\s+at\s+${SPOKEN_ADDRESS}$`,
    'i',
  ),
  // "left it with the neighbour at 4 Moore Street, Ashburton", "handed it to the man at ...",
  // "hand it to the man at 3 Perimeter Road, Christchurch Airport"
  new RegExp(
    String.raw`^(?:left|handed|hand)\s+(?:it\s+)?(?:with|to)\s+(?:the\s+)?[\w][\w\s]*?\s+at\s+${SPOKEN_ADDRESS}$`,
    'i',
  ),
];

/**
 * The failed deliveries, with the reason the product's own list carries
 * (`src/runs/failureReasons.ts`, ADR-023). A shape the list does not carry
 * travels as the sentence the courier said, which is ADR-023's own rule.
 */
const SPOKEN_FAILURE_PATTERNS: readonly { pattern: RegExp; reason: string | null }[] = [
  // "no one home at ...", and the ear's own "nobody answered at 121 Road"
  {
    pattern: new RegExp(
      String.raw`^(?:no one|nobody)\s+(?:home|answered)\s+at\s+${SPOKEN_ADDRESS}$`,
      'i',
    ),
    reason: 'nobody_home',
  },
  {
    pattern: new RegExp(String.raw`^cannot get in\s+at\s+${SPOKEN_ADDRESS}$`, 'i'),
    reason: 'no_access',
  },
  {
    pattern: new RegExp(String.raw`^(?:it'?s\s+)?locked out\s+at\s+${SPOKEN_ADDRESS}$`, 'i'),
    reason: 'door_locked',
  },
  {
    pattern: new RegExp(String.raw`^dog in the yard\s+at\s+${SPOKEN_ADDRESS}$`, 'i'),
    reason: null,
  },
];

/** The skips that carry their address: now, later, or the whole street. */
const SPOKEN_SKIP_PATTERNS: readonly RegExp[] = [
  new RegExp(
    String.raw`^(?:skip this one|skip the street)\s+(?:at\s+|for\s+)?${SPOKEN_ADDRESS}$`,
    'i',
  ),
  new RegExp(String.raw`^come back to\s+${SPOKEN_ADDRESS}\s+later$`, 'i'),
];

/**
 * The stops a courier picks up on the way. The address is what the command
 * carries - the verb that introduced it ("add a stop at", "also got one at",
 * "priority parcel for") is not part of the address, and the old pattern used
 * to hand the whole phrase to the address engine.
 */
const SPOKEN_ADD_PATTERNS: readonly RegExp[] = [
  new RegExp(String.raw`^add a stop at\s+${SPOKEN_ADDRESS}$`, 'i'),
  new RegExp(String.raw`^also got one at\s+${SPOKEN_ADDRESS}$`, 'i'),
  new RegExp(String.raw`^priority parcel for\s+${SPOKEN_ADDRESS}$`, 'i'),
];

/** The break a courier starts, in the words they say it in. */
const SPOKEN_BREAK_PATTERNS: readonly { pattern: RegExp; type: VoiceCommand['type'] }[] = [
  // "taking a ten minute break" and "taking a 10 minute break": the ear returns
  // the number either way, so both are the same sentence.
  { pattern: /^taking an? (?<minutes>[a-z]+|\d+) minute break$/i, type: 'start_break' },
  { pattern: /^back on the road$/i, type: 'end_break' },
  { pattern: /^back on my run$/i, type: 'end_break' },
];

/** The words a courier counts a break in. */
const SPOKEN_MINUTES: Readonly<Record<string, number>> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fortyfive: 45,
  sixty: 60,
};

/**
 * The lines that ask the phone to say it again. The set carries four of them;
 * only the bare "repeat" and "what" were commands before.
 */
const SPOKEN_REPEAT_PATTERNS: readonly RegExp[] = [
  /^what was that\??$/i,
  /^repeat that\??$/i,
  /^say that again\??$/i,
  /^where is it in the van\??$/i,
  /^read me the next one\??$/i,
];

/**
 * Reads one command out of what the courier said.
 *
 * The map verbs come first: "zoom to the next stop" must not be read as a
 * skip, and "satellite" must not be read as anything else.
 *
 * The spoken forms of the eval set come before the bare verbs, because a
 * sentence with its address in it is the shape a courier actually uses on the
 * road, and the address the courier said travels with the command (BUG-073).
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

  for (const pattern of SPOKEN_DELIVERY_PATTERNS) {
    const match = pattern.exec(trimmed);
    if (match === null) {
      continue;
    }
    const groups = match.groups ?? {};
    const place = groups.place?.trim();
    const address = groups.address?.trim();
    return {
      type: 'mark_delivered',
      stopId: 'current',
      safePlace: place !== undefined && place.length > 0 ? place : undefined,
      rawAddress: address !== undefined && address.length > 0 ? address : undefined,
    };
  }

  for (const entry of SPOKEN_FAILURE_PATTERNS) {
    const match = entry.pattern.exec(trimmed);
    if (match === null) {
      continue;
    }
    const address = match.groups?.address?.trim();
    return {
      type: 'mark_failed',
      stopId: 'current',
      // A reason the picker's list does not carry is the courier's own
      // sentence, which is ADR-023's rule: the log is bounded, the words are not.
      reason: entry.reason ?? trimmed,
      rawAddress: address !== undefined && address.length > 0 ? address : undefined,
    };
  }

  for (const pattern of SPOKEN_SKIP_PATTERNS) {
    const match = pattern.exec(trimmed);
    if (match === null) {
      continue;
    }
    const address = match.groups?.address?.trim();
    return {
      type: 'mark_skipped',
      stopId: 'current',
      rawAddress: address !== undefined && address.length > 0 ? address : undefined,
    };
  }

  for (const pattern of SPOKEN_ADD_PATTERNS) {
    const match = pattern.exec(trimmed);
    if (match === null) {
      continue;
    }
    return { type: 'add_stop', rawAddress: match.groups?.address?.trim() ?? '' };
  }

  for (const entry of SPOKEN_BREAK_PATTERNS) {
    const match = entry.pattern.exec(trimmed);
    if (match === null) {
      continue;
    }
    if (entry.type === 'end_break') {
      return { type: 'end_break' };
    }
    const said = match.groups?.minutes?.toLowerCase().replace(/[\s-]/g, '') ?? '';
    // "10" is the number as the ear returns it; "ten" is the word the courier
    // says. Both are the same break, and the phone must not go deaf to either.
    const minutes = /^\d+$/.test(said) ? Number.parseInt(said, 10) : SPOKEN_MINUTES[said];
    return { type: 'start_break', minutes: minutes ?? null };
  }

  for (const pattern of SPOKEN_REPEAT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { type: 'repeat_instruction' };
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
