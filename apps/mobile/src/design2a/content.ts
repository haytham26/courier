/**
 * The content of the run the three directions show.
 *
 * The content is the content of `docs/design/mockups/today.md` and the
 * approved mockups: a real Christchurch run, with the same next stop on
 * Today, on Driving, on Copilot and in the Scanner. The founder compares the
 * directions, not the data, so every screen reads from this one file
 * (`docs/design/SPEC.md` §3.2).
 */

export type StopStatus = 'delivered' | 'pending' | 'active' | 'failed' | 'skipped';

/** The state a screen of the lab can be in (SPEC-5). */
export type LabState = 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'partial' | 'permission';

export interface LabStop {
  id: string;
  sequence: number;
  address: string;
  suburb: string;
  eta: string;
  parcels: number;
  status: StopStatus;
  /** The door note the driver said out loud at the depot. */
  note?: string;
  /** Where the parcel sits in the van, when the depot said. */
  rack?: string;
  /** The distance to the stop, in kilometres. */
  km: number;
  /** The coordinates of the stop, for the map. */
  coordinates: { lat: number; lng: number };
}

/** The words of the statuses, so the screen reader reads a sentence. */
export const statusLabels: Record<StopStatus, string> = {
  delivered: 'Delivered',
  pending: 'Pending',
  active: 'Next',
  failed: 'Failed',
  skipped: 'Skipped',
};

export const run = {
  runName: 'Northwood AM',
  date: 'Monday',
  clock: '10:38',
  driver: 'Tane Rua',
  /** The number the courier reads first. */
  remaining: 18,
  delivered: 42,
  failed: 2,
  skipped: 1,
  /** The kilometres still to drive. */
  kilometres: 6.4,
  /** The state of the voice engine. */
  voice: 'listening' as const,
  /** The actions that are waiting for the network. */
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
    rack: 'Rear rack, bay 2',
    km: 2.1,
    coordinates: { lat: -43.518, lng: 172.625 },
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
      rack: 'Rear rack, bay 2',
      km: 2.1,
      coordinates: { lat: -43.518, lng: 172.625 },
    },
    {
      id: '46',
      sequence: 46,
      address: '22 Westminster Street',
      suburb: 'Merivale',
      eta: '10:49',
      parcels: 1,
      status: 'pending',
      km: 3.4,
      coordinates: { lat: -43.523, lng: 172.64 },
    },
    {
      id: '47',
      sequence: 47,
      address: '3/120 Blenheim Road',
      suburb: 'Upper Riccarton',
      eta: '11:02',
      parcels: 5,
      status: 'pending',
      km: 4.0,
      coordinates: { lat: -43.545, lng: 172.595 },
    },
    {
      id: '48',
      sequence: 48,
      address: '78 Main South Road',
      suburb: 'Sockburn',
      eta: '11:14',
      parcels: 2,
      status: 'pending',
      km: 4.6,
      coordinates: { lat: -43.565, lng: 172.575 },
    },
    {
      id: '49',
      sequence: 49,
      address: '234 Colombo Street',
      suburb: 'Sydenham',
      eta: '11:26',
      parcels: 4,
      status: 'pending',
      km: 5.2,
      coordinates: { lat: -43.548, lng: 172.638 },
    },
    {
      id: '50',
      sequence: 50,
      address: '9 Cashel Street',
      suburb: 'Addington',
      eta: '11:41',
      parcels: 1,
      status: 'pending',
      km: 5.8,
      coordinates: { lat: -43.55, lng: 172.61 },
    },
    {
      id: '51',
      sequence: 51,
      address: '41 Cranmer Street',
      suburb: 'Halswell',
      eta: '11:55',
      parcels: 6,
      status: 'pending',
      km: 6.1,
      coordinates: { lat: -43.575, lng: 172.59 },
    },
    {
      id: '52',
      sequence: 52,
      address: '7 Bexley Street',
      suburb: 'Halswell',
      eta: '12:07',
      parcels: 2,
      status: 'pending',
      km: 6.4,
      coordinates: { lat: -43.578, lng: 172.585 },
    },
  ] as LabStop[],
};

/** What the assistant last said, and what it understood. */
export const voice = {
  state: 'listening' as const,
  /** The line the assistant said, in full. */
  lastSaid: 'Fourteen Harewood Road, Papanui. Side gate, small box in the rear rack.',
  /** What the app understood the driver to mean. */
  intent: 'Stop 45 confirmed, delivered to the side gate',
  /** What the driver said that the app read. */
  heard: 'Delivered, left it in the side gate',
};

/** The block of the address the scanner found on the label. */
export const scan = {
  /** The address block, read off the label. */
  block: {
    address: '14 Harewood Road',
    suburb: 'Papanui',
    city: 'Christchurch',
    postcode: '8053',
  },
  /** The confidence, in words: never a bare percentage. */
  confidence: 'Clear read',
  /** The note on the label, read with the address. */
  note: 'Side gate, small box in the rear rack',
  /** The parcel number on the label. */
  parcel: 'CP-48155',
};

/** The sentence the error state shows, and the action that recovers it. */
export const errorCopy = {
  sentence: 'The run did not load. The manifest is still on the depot server.',
  action: 'Try again',
};

/** The sentence the permission state shows, and the action that recovers it. */
export const permissionCopy = {
  location: 'Location is off, so the map cannot follow the van.',
  camera: 'The camera is off, so the label cannot be read.',
  action: 'Open settings',
};

/** The sentence the empty state shows, and what to do next. */
export const emptyCopy = {
  today: 'No stops left on this run. The next manifest arrives at 14:00.',
  scanner: 'No address on the label. Hold the phone closer to the parcel.',
};

/**
 * The state a screen of the lab is in.
 *
 * The state comes from the query of the route, so every state of every
 * screen can be opened on the device: `/design2/01-control-room/today?state=empty`.
 */
export function labState(value: unknown): LabState {
  if (
    value === 'loading' ||
    value === 'empty' ||
    value === 'error' ||
    value === 'offline' ||
    value === 'partial' ||
    value === 'permission'
  ) {
    return value;
  }
  return 'ready';
}
