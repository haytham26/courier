/**
 * A fake WebAuthn authenticator for the tests.
 *
 * The passkey plugin proves a registration and a sign-in with the real
 * WebAuthn verification of `@simplewebauthn/server` (the library the plugin
 * uses). The test therefore has to behave like a phone: it holds a key pair,
 * signs the authenticator data, and answers with the JSON the browser would
 * send.
 *
 * The CBOR encoder below is written out on purpose: the test must not depend
 * on the encoder the library uses, or a bug in one would hide a bug in the
 * other.
 */
import { createHash, generateKeyPairSync, sign } from "node:crypto";

const MAJOR_UNSIGNED = 0;
const MAJOR_NEGATIVE = 1;
const MAJOR_BYTES = 2;
const MAJOR_TEXT = 3;
const MAJOR_MAP = 5;

function head(major: number, argument: number): number[] {
  if (argument < 24) {
    return [(major << 5) | argument];
  }
  if (argument < 0x100) {
    return [(major << 5) | 24, argument];
  }
  if (argument < 0x10000) {
    return [(major << 5) | 25, (argument >> 8) & 0xff, argument & 0xff];
  }
  return [
    (major << 5) | 26,
    (argument >>> 24) & 0xff,
    (argument >>> 16) & 0xff,
    (argument >>> 8) & 0xff,
    argument & 0xff,
  ];
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function cborUint(value: number): Uint8Array {
  return Uint8Array.from(head(MAJOR_UNSIGNED, value));
}

/** A negative CBOR integer: the argument is `-1 - value`. */
function cborNegative(value: number): Uint8Array {
  return Uint8Array.from(head(MAJOR_NEGATIVE, -1 - value));
}

function cborBytes(value: Uint8Array): Uint8Array {
  return concat([Uint8Array.from(head(MAJOR_BYTES, value.length)), value]);
}

function cborText(value: string): Uint8Array {
  const bytes = Buffer.from(value, "utf8");
  return concat([Uint8Array.from(head(MAJOR_TEXT, bytes.length)), bytes]);
}

function cborMap(entries: Array<[Uint8Array, Uint8Array]>): Uint8Array {
  return concat([Uint8Array.from(head(MAJOR_MAP, entries.length)), ...entries.flat()]);
}

/** The COSE public key of a P-256 key pair, as the WebAuthn spec writes it. */
function cosePublicKey(x: Uint8Array, y: Uint8Array): Uint8Array {
  return cborMap([
    [cborUint(1), cborUint(2)], // kty: EC2
    [cborUint(3), cborNegative(-7)], // alg: ES256
    [cborNegative(-1), cborUint(1)], // crv: P-256
    [cborNegative(-2), cborBytes(x)], // x
    [cborNegative(-3), cborBytes(y)], // y
  ]);
}

function attestationObject(authData: Uint8Array): Uint8Array {
  return cborMap([
    [cborText("fmt"), cborText("none")],
    [cborText("attStmt"), cborMap([])],
    [cborText("authData"), cborBytes(authData)],
  ]);
}

function counterBytes(counter: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, counter, false);
  return bytes;
}

export interface AttestedCredential {
  credentialId: Uint8Array;
  credentialPublicKey: Uint8Array;
}

/** The authenticator data: the hash of the relying party, the flags, the counter. */
function authenticatorData(
  rpId: string,
  flags: number,
  counter: number,
  attested?: AttestedCredential,
): Uint8Array {
  const parts: Uint8Array[] = [
    new Uint8Array(createHash("sha256").update(rpId).digest()),
    Uint8Array.from([flags]),
    counterBytes(counter),
  ];
  if (attested !== undefined) {
    parts.push(new Uint8Array(16)); // the AAGUID
    parts.push(Uint8Array.from([0, attested.credentialId.length]));
    parts.push(attested.credentialId);
    parts.push(attested.credentialPublicKey);
  }
  return concat(parts);
}

export interface FakeAuthenticator {
  /** The credential id, as the browser sends it. */
  credentialId: string;
  /** The public key of the credential, as the COSE bytes. */
  credentialPublicKey: Uint8Array;
  /** Signs the data the way the authenticator does. */
  sign(data: Uint8Array): Uint8Array;
}

/** Creates an authenticator with a fresh P-256 key pair. */
export function createAuthenticator(): FakeAuthenticator {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const jwk = publicKey.export({ format: "jwk" }) as { x: string; y: string };
  const x = new Uint8Array(Buffer.from(jwk.x, "base64url"));
  const y = new Uint8Array(Buffer.from(jwk.y, "base64url"));
  const credentialId = new Uint8Array(
    createHash("sha256")
      .update(publicKey.export({ type: "spki", format: "der" }))
      .digest(),
  );

  return {
    credentialId: Buffer.from(credentialId).toString("base64url"),
    credentialPublicKey: cosePublicKey(x, y),
    sign(data: Uint8Array): Uint8Array {
      return new Uint8Array(sign("sha256", data, privateKey));
    },
  };
}

export interface CeremonyOptions {
  /** The challenge the server sent, base64url. */
  challenge: string;
  /** The origin the app runs on. */
  origin: string;
  /** The relying party id. */
  rpId: string;
}

/** The JSON a browser sends after a passkey registration. */
export function registrationResponse(
  authenticator: FakeAuthenticator,
  options: CeremonyOptions,
): Record<string, unknown> {
  const clientDataJSON = Buffer.from(
    JSON.stringify({
      type: "webauthn.create",
      challenge: options.challenge,
      origin: options.origin,
      crossOrigin: false,
    }),
    "utf8",
  );
  const credentialId = new Uint8Array(Buffer.from(authenticator.credentialId, "base64url"));
  const authData = authenticatorData(options.rpId, 0x45, 0, {
    credentialId,
    credentialPublicKey: authenticator.credentialPublicKey,
  });

  return {
    id: authenticator.credentialId,
    rawId: authenticator.credentialId,
    type: "public-key",
    clientExtensionResults: {},
    response: {
      clientDataJSON: clientDataJSON.toString("base64url"),
      attestationObject: Buffer.from(attestationObject(authData)).toString("base64url"),
      transports: ["internal"],
    },
  };
}

/** The JSON a browser sends after a passkey sign-in. */
export function authenticationResponse(
  authenticator: FakeAuthenticator,
  options: CeremonyOptions & { counter?: number },
): Record<string, unknown> {
  const clientDataJSON = Buffer.from(
    JSON.stringify({
      type: "webauthn.get",
      challenge: options.challenge,
      origin: options.origin,
      crossOrigin: false,
    }),
    "utf8",
  );
  const authData = authenticatorData(options.rpId, 0x05, options.counter ?? 1);
  const clientDataHash = new Uint8Array(createHash("sha256").update(clientDataJSON).digest());
  const signature = authenticator.sign(concat([authData, clientDataHash]));

  return {
    id: authenticator.credentialId,
    rawId: authenticator.credentialId,
    type: "public-key",
    clientExtensionResults: {},
    response: {
      clientDataJSON: clientDataJSON.toString("base64url"),
      authenticatorData: Buffer.from(authData).toString("base64url"),
      signature: Buffer.from(signature).toString("base64url"),
    },
  };
}
