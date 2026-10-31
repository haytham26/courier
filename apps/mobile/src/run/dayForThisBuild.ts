/**
 * The day this build answers with when there is no server to ask (A1 slice 3).
 *
 * The emulator run has no API (the E2E mode is local mocks: no Metro, no auth
 * service, no API), and the flows drive the real screens against the mock
 * run's own stops. A build with no network would otherwise answer with an
 * empty day, and the flows that walk the day would have nothing to walk.
 *
 * This is the same seam the scanner's `readerForThisBuild` already uses, and
 * it carries the same obligation: audit item A4 makes the mock list
 * unreachable from a non-E2E entry, so the one import of `mockStops` a
 * release build can reach is through this module and no other. The mock day
 * is only ever the answer when the network has already said it cannot answer.
 */
import { mockStops } from '@/maps/stops';

import type { RunSnapshot } from './types';

/** The shift the mock day belongs to (the E2E mode's own, not a real one). */
export const E2E_SHIFT_ID = 'shift-e2e';

/**
 * The contract's own vocabulary for a stop's status.
 *
 * The mock list carries the app's own view (an `active` stop is the one the
 * courier is driving to); the contract answers `pending` for a stop that is
 * still to deliver. The mapping is the one word that changes, and the rest of
 * the stop is the mock's own.
 */
function contractStatus(status: string): 'pending' | 'delivered' | 'skipped' | 'deferred' | 'failed' {
  return status === 'delivered' ? 'delivered' : status === 'skipped' ? 'skipped' : status === 'failed' ? 'failed' : 'pending';
}

/**
 * The mock run's own day, in the contract's shape.
 *
 * The ids, the sequences and the addresses are the mock list's own, because
 * the flows assert them (`stop-2`, "45 Papanui Road"); the location ids are
 * the E2E mode's own, because a mock stop has no door identity on a server.
 */
export function e2eDay(): RunSnapshot {
  return {
    run: {
      id: 'run-e2e',
      shift_id: E2E_SHIFT_ID,
      name: 'Northwood AM',
      depot: { lat: -43.532, lon: 172.599 },
      speed_kmh: 40,
      start_at: '2026-10-31T07:30:00.000Z',
    },
    stops: mockStops.map((stop) => ({
      id: stop.id,
      seq: stop.sequence,
      address: stop.address,
      status: contractStatus(stop.status),
      location_id: `e2e-loc-${stop.id}`,
      lat: stop.coordinates.lat,
      lon: stop.coordinates.lng,
      priority: false,
      parcels: 1,
    })),
  };
}
