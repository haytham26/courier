/**
 * The outbox's transport on the wire (A1 slice 3).
 *
 * The deliveries the phone records used to stop at the local event log: the
 * audit's A1 says the app does not sync, and the done-when is a CI job that
 * delivers a real day and sees the rows in Postgres. The half this file proves
 * is the app's: the events in the log reach
 * `POST /shifts/{shift_id}/events:batch`, with the batch's ids sent as the
 * server's own contract spells them, and the server's answer - the accepted
 * count and the refused ids - comes back as the app's own `SyncResult`, so the
 * outbox can confirm what the server took and repair what it refused
 * (ADR-014, and BUG-076's carry: the refused ids have to reach the caller).
 *
 * The client is the slice-1 one (`CourierApiClient.postDeliveryEvents`), which
 * is mocked here so what is asserted is the transport's own contract against
 * the client's seam.
 */
import { apiSyncTransport } from '../apiSyncTransport';
import type { DeliveryEvent } from '../types';

/** A delivery event the log would hand the transport. */
function anEvent(id: string, overrides: Partial<DeliveryEvent> = {}): DeliveryEvent {
  return {
    id,
    shiftId: 'shift-1',
    stopId: 'stop-1',
    kind: 'delivered',
    occurredAt: '2026-10-30T00:00:00.000Z',
    ...overrides,
  } as DeliveryEvent;
}

describe("the outbox's transport on the wire (A1 slice 3)", () => {
  it('sends the batch to the shift\u2019s events:batch, with the client\u2019s own call', async () => {
    const postDeliveryEvents = jest.fn(() =>
      Promise.resolve({ status: 'ok', data: { accepted: 2 } }),
    );

    const transport = apiSyncTransport({
      postDeliveryEvents,
    } as unknown as Parameters<typeof apiSyncTransport>[0]);

    const sent = [anEvent('e-1'), anEvent('e-2')];
    const result = await transport.send('shift-1', sent);

    // The batch goes to the shift the outbox named, and the client is the one
    // that spells the contract's body - so the transport's job is the call
    // itself, not a re-mapping of the events.
    expect(postDeliveryEvents).toHaveBeenCalledWith('shift-1', sent);
    expect(result).toEqual({ accepted: 2, cursor: 0, conflicts: [] });
  });

  // ADR-014 §3 and BUG-076: the server answers with the ids it refused, and
  // the transport has to carry them out. A transport that drops them makes the
  // outbox confirm a batch the server only partly took.
  it('carries the refused ids out as the conflicts the caller must see', async () => {
    const postDeliveryEvents = jest.fn(() =>
      Promise.resolve({ status: 'ok', data: { accepted: 1, conflicts: ['e-2'] } }),
    );

    const transport = apiSyncTransport({
      postDeliveryEvents,
    } as unknown as Parameters<typeof apiSyncTransport>[0]);

    const result = await transport.send('shift-1', [anEvent('e-1'), anEvent('e-2')]);

    expect(result.accepted).toBe(1);
    expect(result.conflicts).toEqual(['e-2']);
  });

  // A refusal the server answers with a status for (not a transport failure)
  // must surface as a refusal the outbox can act on, not as a success.
  it('answers a server refusal the way the outbox can act on it', async () => {
    const postDeliveryEvents = jest.fn(() =>
      Promise.resolve({ status: 'server', code: 409, message: 'the stop is already delivered' }),
    );

    const transport = apiSyncTransport({
      postDeliveryEvents,
    } as unknown as Parameters<typeof apiSyncTransport>[0]);

    await expect(transport.send('shift-1', [anEvent('e-1')])).rejects.toMatchObject({
      name: 'SyncRefusal',
    });
  });

  // No signal and no session are not refusals of the deliveries: the batch is
  // kept, and the courier is told why it has not gone yet - which is the
  // offline-first behaviour the app promises.
  it('keeps the batch and says why when there was no signal', async () => {
    const postDeliveryEvents = jest.fn(() => Promise.resolve({ status: 'offline' }));

    const transport = apiSyncTransport({
      postDeliveryEvents,
    } as unknown as Parameters<typeof apiSyncTransport>[0]);

    await expect(transport.send('shift-1', [anEvent('e-1')])).rejects.toThrow(
      /no signal/i,
    );
  });
});
