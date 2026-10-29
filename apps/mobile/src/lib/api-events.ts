/**
 * The delivery event, translated between the phone's words and the API's.
 *
 * The phone's log (`src/sync/types.ts`) records what the courier did in one
 * vocabulary; the contract (`packages/shared/src/generated/api.ts`) has
 * another. The transport is the only place the two meet, so the translation
 * lives here and nowhere else - a screen, a store or a flow should never
 * know that the API spells a safe place `left_at`.
 *
 * The translation is not total, and it must never pretend to be: an event the
 * API has no kind for is refused here, before a request is built, instead of
 * being sent and silently dropped by the server.
 */
import type { DeliveryEvent as ContractDeliveryEvent } from '@courier/shared/src/generated/api';

import type { DeliveryEvent, DeliveryEventKind } from '@/sync/types';

/** The kinds the contract's `DeliveryEvent` accepts. */
const CONTRACT_KINDS = ['delivered', 'left_at', 'skipped', 'failed'] as const;

export type EventMapping =
  | { status: 'mapped'; event: ContractDeliveryEvent }
  | { status: 'unmappable'; reason: string };

/**
 * How one phone event becomes the API's.
 *
 * `arrived` and `note` are the phone's own bookkeeping: they carry no
 * delivery, and the API's batch endpoint has no kind for them, so they are
 * refused rather than invented.
 */
export function toContractEvent(event: DeliveryEvent): EventMapping {
  const kind: ContractDeliveryEvent['kind'] | null =
    event.kind === 'delivered'
      ? 'delivered'
      : event.kind === 'failed'
        ? 'failed'
        : event.kind === 'skipped'
          ? 'skipped'
          : event.kind === 'safe_place'
            ? 'left_at'
            : null;

  if (kind === null) {
    return {
      status: 'unmappable',
      reason: `the API has no kind for a "${event.kind}" event`,
    };
  }

  return {
    status: 'mapped',
    event: {
      id: event.id,
      stop_id: event.stopId,
      kind,
      occurred_at: event.occurredAt,
      ...(event.utterance === undefined ? {} : { utterance: event.utterance }),
      ...(event.safePlace === undefined ? {} : { safe_place: event.safePlace }),
      ...(event.lat === undefined ? {} : { lat: event.lat }),
      ...(event.lon === undefined ? {} : { lon: event.lon }),
      ...(event.accuracyM === undefined ? {} : { accuracy_m: event.accuracyM }),
    },
  };
}

/** The kinds the contract can answer, as the phone spells them. */
const APP_KINDS: Record<ContractDeliveryEvent['kind'], DeliveryEventKind> = {
  delivered: 'delivered',
  left_at: 'safe_place',
  skipped: 'skipped',
  failed: 'failed',
};

/** Reads a contract event back into the phone's own vocabulary. */
export function toAppEvent(event: ContractDeliveryEvent): DeliveryEvent {
  return {
    id: event.id,
    stopId: event.stop_id,
    kind: APP_KINDS[event.kind],
    occurredAt: event.occurred_at,
    ...(event.utterance === undefined ? {} : { utterance: event.utterance }),
    ...(event.safe_place === undefined ? {} : { safePlace: event.safe_place }),
    ...(event.lat === undefined ? {} : { lat: event.lat }),
    ...(event.lon === undefined ? {} : { lon: event.lon }),
    ...(event.accuracy_m === undefined ? {} : { accuracyM: event.accuracy_m }),
  };
}

/** The kinds the API accepts, as the contract declares them. */
export const contractEventKinds: readonly ContractDeliveryEvent['kind'][] = CONTRACT_KINDS;
