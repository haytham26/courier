/**
 * The consent contract of the debug-build recorder (audit A3 item 3,
 * EVAL.md's consent rules): explicit, per-purpose, revocable, and the record
 * carries the wording version, the driver id (never a name), the scopes and
 * the revocation timestamp.
 */
import {
  CONSENT_SCOPES,
  CONSENT_WORDING,
  CONSENT_WORDING_VERSION,
  consentRecordFor,
  isConsentActive,
  newConsentedId,
  parseConsentRecord,
  revokedRecord,
} from '../consent';

describe('the consent record', () => {
  const now = new Date('2026-11-07T09:00:00.000Z');

  it('parses a stored record, and refuses anything that is not one', () => {
    const record = consentRecordFor('driver-1', ['evaluation'], null, now);
    expect(parseConsentRecord(JSON.parse(JSON.stringify(record)))).toEqual(record);

    expect(parseConsentRecord(null)).toBeNull();
    expect(parseConsentRecord('yes')).toBeNull();
    expect(parseConsentRecord({ version: 1 })).toBeNull();
    expect(parseConsentRecord({ ...record, scopes: ['evaluation', 'marketing'] })?.scopes).toEqual([
      'evaluation',
    ]);
  });

  it('grants per purpose and keeps the consented id across grants', () => {
    const first = consentRecordFor('driver-1', ['evaluation'], null, now);
    expect(first.version).toBe(CONSENT_WORDING_VERSION);
    expect(first.driverId).toBe('driver-1');
    expect(first.scopes).toEqual(['evaluation']);
    expect(first.revokedAt).toBeNull();
    expect(isConsentActive(first)).toBe(true);

    const second = consentRecordFor('driver-1', ['evaluation', 'training'], first, now);
    expect(second.scopes).toEqual(['evaluation', 'training']);
    expect(second.consentedId).toBe(first.consentedId);
  });

  it('a revocation keeps the timestamp and clears the scopes', () => {
    const record = consentRecordFor('driver-1', CONSENT_SCOPES.slice(), null, now);
    const revoked = revokedRecord(record, new Date('2026-11-08T09:00:00.000Z'));
    expect(revoked.revokedAt).toBe('2026-11-08T09:00:00.000Z');
    expect(revoked.scopes).toEqual([]);
    expect(isConsentActive(revoked)).toBe(false);
    expect(isConsentActive(null)).toBe(false);
  });

  it('consented ids are fresh pointers', () => {
    expect(newConsentedId(now)).not.toBe(newConsentedId(now));
    expect(newConsentedId(now)).toMatch(/^consented-/);
  });

  it('the wording is per purpose, never bundled', () => {
    expect(CONSENT_SCOPES).toEqual(['evaluation', 'training']);
    expect(CONSENT_WORDING.evaluation).not.toBe(CONSENT_WORDING.training);
    expect(CONSENT_WORDING.evaluation).toMatch(/never uploaded automatically/);
    expect(CONSENT_WORDING.training).toMatch(/withdraw/);
  });
});
