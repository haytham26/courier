/**
 * The TOTP code generator for the tests.
 *
 * The service uses the same algorithm as every authenticator app: HMAC-SHA1
 * over the time counter, truncated to six digits (RFC 6238). The test
 * computes the code itself so it does not trust the library that verifies it.
 */
import { createHmac } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Decodes a base32 secret (RFC 4648, without padding). */
export function base32Decode(input: string): Buffer {
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const character of input.toUpperCase().replace(/=+$/, "")) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) {
      continue;
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output.push((value >>> bits) & 0xff);
    }
  }

  return Buffer.from(output);
}

/** Reads the secret out of an `otpauth://` URI. */
export function secretFromTotpUri(uri: string): Buffer {
  const match = /[?&]secret=([^&]+)/.exec(uri);
  if (match?.[1] === undefined) {
    throw new Error("the totp URI carries no secret");
  }
  return base32Decode(decodeURIComponent(match[1]));
}

/** The code the authenticator app would show right now. */
export function totpCode(secret: Buffer, nowMs = Date.now(), periodSeconds = 30): string {
  const counter = Math.floor(nowMs / (periodSeconds * 1000));
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac("sha1", secret).update(counterBuffer).digest();
  const byte = (index: number): number => digest[index] ?? 0;
  const offset = byte(digest.length - 1) & 0x0f;
  const binary =
    ((byte(offset) & 0x7f) << 24) |
    ((byte(offset + 1) & 0xff) << 16) |
    ((byte(offset + 2) & 0xff) << 8) |
    (byte(offset + 3) & 0xff);

  return (binary % 1_000_000).toString().padStart(6, "0");
}
