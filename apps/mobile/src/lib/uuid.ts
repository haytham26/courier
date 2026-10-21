/**
 * A version 4 UUID.
 *
 * The API keys its shifts, stops and events with UUIDs, and the app creates
 * the id of the shift it is running, so it needs the same shape. The value
 * only has to be unique on the courier's own device, so the device's random
 * source is enough; it is never a secret.
 */

const HEX = '0123456789abcdef';

function randomHex(count: number): string {
  let out = '';
  for (let index = 0; index < count; index += 1) {
    out += HEX[Math.floor(Math.random() * 16)];
  }
  return out;
}

export function createUuid(): string {
  const timeLow = randomHex(8);
  const timeHigh = randomHex(4);
  const clockSequence = randomHex(4);
  const node = randomHex(12);
  return `${timeLow}-${timeHigh}-4${clockSequence.slice(1)}-a${node.slice(1)}`;
}
