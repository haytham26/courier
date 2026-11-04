/**
 * Tests for the shared schemas' timestamp contract (BUG-143).
 *
 * `occurred_at` is the one stamp the phone validates itself
 * (`apps/mobile/src/sync/eventSchema.ts` requires a `Z` or `±HH:MM` suffix)
 * and the API refuses a naive one (`services/api/app/occurred_at.py`), so the
 * shared schema must accept what the phone's gate accepts and refuse what the
 * server refuses - the two validators may not disagree again.
 */

import { describe, it, expect } from 'vitest';
import { DeliveryEventSchema } from '../schemas';

const an_event = (occurred_at: string) => ({
  id: '0f8fad5b-d9cb-469f-a165-70867728950e',
  stop_id: '6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b',
  kind: 'delivered',
  occurred_at,
});

describe('DeliveryEventSchema.occurred_at', () => {
  it('accepts a Zulu stamp, the shape the phone normalises every event to', () => {
    expect(DeliveryEventSchema.safeParse(an_event('2026-10-30T08:00:00Z')).success).toBe(true);
  });

  it("accepts an offset stamp, the shape the phone's own gate accepts (BUG-143)", () => {
    expect(DeliveryEventSchema.safeParse(an_event('2026-10-30T08:00:00+13:00')).success).toBe(true);
  });

  it('refuses an offset-less local-time stamp, the way the server refuses it (BUG-143)', () => {
    expect(DeliveryEventSchema.safeParse(an_event('2026-10-30T08:00:00')).success).toBe(false);
  });
});
