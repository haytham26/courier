/**
 * The event id the phone generates (src/sync/eventId.ts).
 *
 * BUG-176: the contract's `DeliveryEvent.id` is `format: uuid`, and the API
 * parses it as one - run 41541777473's a1 job answered
 * `POST /shifts/:id/events:batch` with **422 Unprocessable Entity** for every
 * batch, because the store built the id as `delivered-<stopId>-<ms>`, which is
 * not a uuid. The very same payload with a uuid id answered 200 against the
 * local compose stack (repro-batch.cjs), so the shape was the whole defect.
 */
import { isUuid, newEventId } from '../eventId';

/** A v4 uuid, the shape newEventId answers with. */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('the event id', () => {
  it('is a fresh v4 uuid every time', () => {
    const first = newEventId();
    const second = newEventId();

    expect(first).toMatch(UUID_V4);
    expect(second).toMatch(UUID_V4);
    expect(first).not.toBe(second);
  });

  // BUG-177: Hermes has no `crypto` global at all - run 41552164167's a1 run
  // logged "Cannot read property 'getRandomValues' of undefined" on the first
  // mark, so the delivery was never recorded. With no crypto global the id
  // still has to come out a v4 uuid. Red before the fix: TypeError.
  it('still answers a v4 uuid when there is no crypto global (Hermes)', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    try {
      expect(newEventId()).toMatch(UUID_V4);
      expect(newEventId()).not.toBe(newEventId());
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, 'crypto', descriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'crypto');
      }
    }
  });

  it('recognises any uuid and refuses the old readable id', () => {
    expect(isUuid('11111111-1111-1111-1111-111111111111')).toBe(true);
    expect(isUuid('11111111-1111-4111-8111-111111111111')).toBe(true);
    expect(isUuid(newEventId())).toBe(true);
    // The shape the store used before BUG-176 - readable, but the server's
    // uuid parse rejects it, and with it the whole batch (422).
    expect(isUuid('delivered-stop-1-1772000000000')).toBe(false);
    expect(isUuid('event-1')).toBe(false);
    expect(isUuid('')).toBe(false);
  });
});
