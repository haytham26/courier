/**
 * The content of the run the three directions show.
 *
 * The same content in three different languages is the point of the design
 * lab (MASTER_EXECUTION §13.4): the founder compares the directions, not the
 * data. Every screen therefore reads from this one file.
 *
 * The content is the content of `docs/design/mockups/today.md`: the number of
 * stops left, the delivered count, the next stop with its address, the suburb
 * and the ETA, the door note, the voice state and the run name.
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
  /** The door note the driver said out loud at the depot. */
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

export const run: RunContent = {
  runName: 'Northwood AM',
  date: 'Monday',
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
