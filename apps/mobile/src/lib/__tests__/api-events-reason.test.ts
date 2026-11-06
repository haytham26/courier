/**
 * The boundary's own half of the failed-delivery reason (queue 4b, ADR-023).
 *
 * The contract's `DeliveryEvent` has carried `reason` since the server half
 * landed (D63/ADR-023), and the server refuses a `failed` event without one -
 * the answer a whole batch for the courier's day. The phone's own vocabulary
 * and this translation are the app half, and they were the gap: the phone had
 * no word for "why it failed", so nothing could travel in the synced event.
 */
import { toAppEvent, toContractEvent } from '../api-events';
import type { DeliveryEvent } from '@/sync/types';

/** One event of the phone, as its own log records it. */
function anEvent(overrides: Partial<DeliveryEvent> = {}): DeliveryEvent {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    stopId: '22222222-2222-2222-2222-222222222222',
    kind: 'failed',
    occurredAt: '2026-10-21T02:00:00.000Z',
    ...overrides,
  };
}

describe('the failed-delivery reason on the boundary', () => {
  it('carries the courier\u2019s reason in the event the API reads', () => {
    const mapping = toContractEvent(anEvent({ reason: 'no_access' }));

    expect(mapping.status).toBe('mapped');
    if (mapping.status !== 'mapped') {
      return;
    }
    expect(mapping.event.reason).toBe('no_access');
  });

  it('reads the reason back into the phone\u2019s own words', () => {
    const app = toAppEvent({
      id: '11111111-1111-1111-1111-111111111111',
      stop_id: '22222222-2222-2222-2222-222222222222',
      kind: 'failed',
      reason: 'door_locked',
      occurred_at: '2026-10-21T02:00:00.000Z',
    });

    expect(app.reason).toBe('door_locked');
  });

  it('leaves a delivered event with no reason without one', () => {
    const mapping = toContractEvent(
      anEvent({ kind: 'delivered', reason: undefined }),
    );

    expect(mapping.status).toBe('mapped');
    if (mapping.status !== 'mapped') {
      return;
    }
    expect(mapping.event.reason).toBeUndefined();
  });
});
