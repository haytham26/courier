/**
 * The content of the run the four directions show.
 *
 * The same content in four different languages is the point of the design
 * lab (MASTER_EXECUTION §13.6): the founder compares the directions, not the
 * data. Every screen therefore reads from this one file, and the next stop
 * on Today is the next stop on Driving, with the same number, the same time
 * and the same door note (SPEC-3).
 *
 * The addresses, the suburbs and the times are real Christchurch content:
 * the run of a courier who works the north of the city.
 */

export type StopStatus = 'delivered' | 'pending' | 'active' | 'failed' | 'skipped';

export interface RunStop {
  id: string;
  sequence: number;
  address: string;
  suburb: string;
  eta: string;
  parcels: number;
  status: StopStatus;
  /** The door note the driver was told at the depot. */
  note?: string;
}

export interface RunContent {
  runName: string;
  date: string;
  clock: string;
  driver: string;
  /** The number the courier reads first. */
  remaining: number;
  delivered: number;
  failed: number;
  skipped: number;
  /** The kilometres still to drive. */
  kilometres: number;
  nextStop: RunStop;
  stops: RunStop[];
  /** The state of the voice engine. */
  voice: 'listening' | 'idle' | 'offline';
  /** The actions that are waiting for the network. */
  queuedActions: number;
}

/** The words of the statuses, so the screen reader reads a sentence. */
export const statusLabels: Record<StopStatus, string> = {
  delivered: 'Delivered',
  pending: 'Pending',
  active: 'Next',
  failed: 'Failed',
  skipped: 'Skipped',
};

/** The run the four directions of the lab show. */
export const run: RunContent = {
  runName: 'Harewood AM',
  date: 'Monday 22 October',
  clock: '10:38',
  driver: 'Tane Rua',
  remaining: 18,
  delivered: 42,
  failed: 2,
  skipped: 1,
  kilometres: 6.4,
  voice: 'listening',
  queuedActions: 4,
  nextStop: {
    id: '45',
    sequence: 45,
    address: '14 Harewood Road',
    suburb: 'Papanui',
    eta: '10:42',
    parcels: 3,
    status: 'active',
    note: 'Side gate, small box in the rear rack',
  },
  stops: [
    {
      id: '45',
      sequence: 45,
      address: '14 Harewood Road',
      suburb: 'Papanui',
      eta: '10:42',
      parcels: 3,
      status: 'active',
      note: 'Side gate, small box in the rear rack',
    },
    {
      id: '46',
      sequence: 46,
      address: '22 Westminster Street',
      suburb: 'Merivale',
      eta: '10:49',
      parcels: 1,
      status: 'pending',
    },
    {
      id: '47',
      sequence: 47,
      address: '3/120 Blenheim Road',
      suburb: 'Upper Riccarton',
      eta: '11:02',
      parcels: 5,
      status: 'pending',
      note: 'Ring the intercom, unit 3 is on the left',
    },
    {
      id: '48',
      sequence: 48,
      address: '78 Main South Road',
      suburb: 'Sockburn',
      eta: '11:14',
      parcels: 2,
      status: 'pending',
    },
    {
      id: '49',
      sequence: 49,
      address: '234 Colombo Street',
      suburb: 'Sydenham',
      eta: '11:26',
      parcels: 4,
      status: 'pending',
    },
    {
      id: '50',
      sequence: 50,
      address: '9 Cashel Street',
      suburb: 'Addington',
      eta: '11:41',
      parcels: 1,
      status: 'pending',
      note: 'Leave behind the letterbox if nobody answers',
    },
    {
      id: '51',
      sequence: 51,
      address: '41 Cranmer Street',
      suburb: 'Halswell',
      eta: '11:55',
      parcels: 6,
      status: 'pending',
    },
    {
      id: '52',
      sequence: 52,
      address: '7 Bexley Street',
      suburb: 'Halswell',
      eta: '12:07',
      parcels: 2,
      status: 'pending',
    },
  ],
};

/**
 * The run of three hundred stops, for the long-list state.
 *
 * The list has to scroll at sixty frames a second with a full day of stops,
 * so the long-list state is not a short list of long rows: it is the real
 * number of rows of a real day.
 */
export const longRun: RunStop[] = Array.from({ length: 300 }, (_unused, index) => {
  const sequence = 45 + index;
  const base = run.stops[index % run.stops.length];
  const stop = base ?? run.nextStop;

  return {
    id: String(sequence),
    sequence,
    address: stop.address,
    suburb: stop.suburb,
    eta: stop.eta,
    parcels: stop.parcels,
    status: 'pending',
    note: stop.note,
  };
});

/**
 * The light of the day.
 *
 * Weather Light is the direction that follows the light, so the light is
 * content, not decoration: the hour of the day and the weather decide the
 * tint of the palette and the contrast it needs.
 */
export interface DayLight {
  /** The word the driver reads: Clear, Overcast, Rain, Dusk. */
  condition: 'Clear' | 'Overcast' | 'Rain' | 'Dusk';
  /** The temperature, in the way a courier would say it. */
  temperature: string;
  /** The hour of the day, on the scale of the direction. */
  step: 'morning' | 'midday' | 'dusk';
  /** The contrast the screen needs at this light, measured. */
  contrast: string;
}

export const dayLight: DayLight = {
  condition: 'Clear',
  temperature: '14°',
  step: 'morning',
  contrast: '8.4:1',
};

/** The light after dark: the night theme is the adapted option. */
export const nightLight: DayLight = {
  condition: 'Dusk',
  temperature: '9°',
  step: 'dusk',
  contrast: '16.9:1',
};

/**
 * The scanner read-out.
 *
 * The scanner works with no network, so the read is on the phone: the block
 * of text it found, the confidence in words, and the address ready to edit.
 */
export interface ScanRead {
  /** The block of the address the scanner found. */
  block: string;
  /** The suburb line under it. */
  suburb: string;
  /** The confidence, in words. Never a bare percentage. */
  confidence: 'Confident' | 'Not sure';
  /** The corrected address, ready to edit. */
  corrected: string;
  /** The stop the read belongs to. */
  sequence: number;
}

export const scanRead: ScanRead = {
  block: '14 HAREWOOD RD',
  suburb: 'PAPANUI',
  confidence: 'Confident',
  corrected: '14 Harewood Road, Papanui',
  sequence: 45,
};

/**
 * The last thing Copilot said, and what it understood.
 *
 * The line is short because the courier is driving: eight words or fewer
 * (SYSTEM.md §8).
 */
export interface CopilotTurn {
  /** The state of the assistant. */
  state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'offline' | 'muted' | 'error';
  /** The last thing the assistant said, in full. */
  last: string;
  /** What the app understood, when the driver spoke an action. */
  intent: string;
  /** The last thing the driver said. */
  heard: string;
}

export const copilotTurn: CopilotTurn = {
  state: 'listening',
  last: 'Stop 45 is delivered. 17 stops left.',
  intent: 'Marked stop 45 as delivered',
  heard: 'Delivered',
};

/** The words of every state of the assistant, so the state is never colour alone. */
export const voiceStateWords: Record<CopilotTurn['state'], string> = {
  idle: 'Ready',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  offline: 'Offline',
  muted: 'Muted',
  error: 'Problem',
};
