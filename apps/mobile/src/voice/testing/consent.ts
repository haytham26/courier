/**
 * The consent contract for the debug-build voice-sample recorder (audit A3
 * item 3, with the rules `docs/squads/voice/EVAL.md` §consent sets):
 *
 * - consent is EXPLICIT, PER-PURPOSE and REVOCABLE - never bundled: the
 *   courier consents separately to evaluation use and to training use;
 * - the record stores the driver id (an id, never a name), the date, the
 *   EXACT WORDING shown, the scopes and the revocation timestamp;
 * - real audio never enters the repository and is never uploaded: it stays
 *   on the phone in the samples directory until the courier shares it or
 *   deletes it, and revoking consent deletes the recordings.
 *
 * The wording below is the DRAFT shown in debug builds. The founder approves
 * the final wording with the PIA (BUG-031) before any sample is collected
 * outside a debug build; the version travels with every sample, so a sample
 * always says which wording its consent was given under.
 */

/** The version of the wording shown, recorded with every consent and sample. */
export const CONSENT_WORDING_VERSION = 'draft-2026-11-07';

/** The one purpose a sample may be used for. */
export type ConsentScope = 'evaluation' | 'training';

/** The purposes, in the order the screen shows them. */
export const CONSENT_SCOPES: readonly ConsentScope[] = ['evaluation', 'training'];

/** The exact wording shown for each purpose, never bundled into one text. */
export const CONSENT_WORDING: Record<ConsentScope, string> = {
  evaluation:
    'I agree that this recording of my voice may be used to measure how well ' +
    'Courier Copilot understands couriers. It stays on this phone until I share ' +
    'it myself or delete it, and it is never uploaded automatically.',
  training:
    'I also agree that this recording may be used to train Courier Voice, our ' +
    'own voice model. I can withdraw this at any time, and withdrawing deletes ' +
    'my recordings.',
};

/** The key the consent record is stored under in the driver's preferences. */
export const CONSENT_PREFERENCE_KEY = 'voice.sampleConsent';

/** The consent record of one driver, as stored in the driver's preferences. */
export interface ConsentRecord {
  /** The wording version the consent was given under. */
  version: string;
  /** The driver id - an id, never a name. */
  driverId: string;
  /** The id the samples carry as their `consentedId` pointer (no PII). */
  consentedId: string;
  /** ISO date the consent was (last) granted. */
  grantedAt: string;
  /** The purposes consented to; empty once revoked. */
  scopes: ConsentScope[];
  /** ISO date of the revocation, or null while the consent stands. */
  revokedAt: string | null;
}

function isScope(value: unknown): value is ConsentScope {
  return typeof value === 'string' && (CONSENT_SCOPES as readonly string[]).includes(value);
}

/**
 * The consent record out of anything that was stored. A corrupt or absent
 * value is `null` - "no consent" - never a guess, because a recording made
 * on a guessed consent is exactly what the PIA forbids.
 */
export function parseConsentRecord(raw: unknown): ConsentRecord | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const source = raw as Record<string, unknown>;
  const scopes = Array.isArray(source.scopes)
    ? source.scopes.filter(isScope)
    : [];
  if (
    typeof source.version !== 'string' ||
    typeof source.driverId !== 'string' ||
    typeof source.consentedId !== 'string' ||
    typeof source.grantedAt !== 'string'
  ) {
    return null;
  }
  return {
    version: source.version,
    driverId: source.driverId,
    consentedId: source.consentedId,
    grantedAt: source.grantedAt,
    scopes,
    revokedAt: typeof source.revokedAt === 'string' ? source.revokedAt : null,
  };
}

/** Whether the record stands: present, not revoked, at least one scope. */
export function isConsentActive(record: ConsentRecord | null): boolean {
  return record !== null && record.revokedAt === null && record.scopes.length > 0;
}

/** A fresh consented id: a random pointer, so the audio files carry no PII. */
export function newConsentedId(now: Date): string {
  const stamp = now.getTime().toString(36);
  const roll = Math.floor(Math.random() * 0xffffffff).toString(36);
  return `consented-${stamp}-${roll}`;
}

/**
 * The record for a grant: `scopes` is the COMPLETE list of purposes the
 * courier has consented to (not a delta), so unchecking one of two purposes
 * really removes it. The consented id is kept from any standing record, so
 * the samples keep pointing at the same consent.
 */
export function consentRecordFor(
  driverId: string,
  scopes: ConsentScope[],
  existing: ConsentRecord | null,
  now: Date,
): ConsentRecord {
  const merged = Array.from(new Set(scopes));
  return {
    version: CONSENT_WORDING_VERSION,
    driverId,
    consentedId: existing?.consentedId ?? newConsentedId(now),
    grantedAt: now.toISOString(),
    scopes: merged,
    revokedAt: null,
  };
}

/** The record after a revocation: the timestamp is kept, the scopes cleared. */
export function revokedRecord(record: ConsentRecord, now: Date): ConsentRecord {
  return { ...record, scopes: [], revokedAt: now.toISOString() };
}
