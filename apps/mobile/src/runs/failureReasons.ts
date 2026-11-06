/**
 * Why a delivery failed, in the courier's own words (queue 4b, ADR-023).
 *
 * ADR-023 is explicit that this list is a product decision, not a generic
 * enum: the courier reads it, and the server stores the word the courier
 * chose. The list is bounded because the log is bounded, and a courier can
 * always say it more precisely in their own sentence, which travels in the
 * event's utterance.
 */
export interface FailureReason {
  /** The word the event carries. */
  id: string;
  /** What the courier reads on the picker. */
  label: string;
}

/**
 * The reasons the trial build shows a courier.
 *
 * Six is the shape a courier's own list has on Christchurch streets: the ones
 * that happen daily, in the order they happen. A reason the list does not
 * carry is said in the sentence the picker takes below.
 */
export const FAILURE_REASONS: readonly FailureReason[] = [
  { id: 'no_access', label: 'No access' },
  { id: 'door_locked', label: 'Door locked' },
  { id: 'nobody_home', label: 'Nobody home' },
  { id: 'parcel_refused', label: 'Parcel refused' },
  { id: 'parcel_damaged', label: 'Parcel damaged' },
  { id: 'wrong_address', label: 'Wrong address' },
];

/** The id of a reason, the way the event carries it. */
export const isFailureReasonId = (id: string): boolean =>
  FAILURE_REASONS.some((reason) => reason.id === id);

/**
 * The reason the picker answers with: one of the list, or the courier's own
 * sentence bounded the way the contract bounds it.
 *
 * A sentence is trimmed and capped at 200 characters - the contract's own
 * bound - and a blank answer is no reason at all.
 */
export function boundReason(chosen: { id: string } | null, note: string): string | null {
  if (chosen !== null && isFailureReasonId(chosen.id)) {
    return chosen.id;
  }
  const said = note.trim();
  return said.length === 0 ? null : said.slice(0, 200);
}
