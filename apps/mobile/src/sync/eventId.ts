/**
 * The event id the phone generates.
 *
 * BUG-176: the contract's `DeliveryEvent.id` is `format: uuid` and the API
 * parses it as one, so an id that is not a uuid gets the WHOLE batch refused
 * with a 422 - run 41541777473's a1 job logged
 * `POST /shifts/:id/events:batch 422 Unprocessable Entity` for every flush,
 * while the very same payload with a uuid id answered 200 against the local
 * compose stack (repro-batch.cjs). The store used to build the id as
 * `delivered-<stopId>-<ms>`: readable, but not a uuid.
 *
 * The id is now a random v4 uuid, generated once when the event is recorded
 * and then stored in the log and the mark - storing it, not deriving it, is
 * what makes an offline replay idempotent.
 */

/** Any uuid - what the contract's `format: uuid` names and the server parses. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whether a string is a uuid the API's parse accepts (any version). */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}

/**
 * One fresh event id: a random v4 uuid.
 *
 * BUG-177: Hermes ships NO `crypto` global at all - run 41552164167's a1
 * offline flow logged `Cannot read property 'getRandomValues' of undefined`
 * the moment the first mark was written, so no delivery was recorded and no
 * batch was ever dialed. The bytes come from `crypto.getRandomValues` when
 * there is one (jest, browsers) and from `Math.random` otherwise; the id
 * only has to be unique on this phone - the log STORES it, and the stored id
 * is what makes an offline replay idempotent - and uuid-shaped for the
 * server's parse.
 */
export function newEventId(): string {
  const bytes = new Uint8Array(16);
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.getRandomValues === 'function') {
    cryptoRef.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
