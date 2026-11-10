/**
 * The spoken forms the courier actually says, read as commands.
 *
 * The eval set's 720 scripts (`packages/eval/voice/manifest/scripts.jsonl`) are
 * written the way a courier TALKS: "delivered at 57 Poulson Street, Addington",
 * "no one home at 3411 Thompsons Track, Ashburton Forks", "taking a ten minute
 * break". The offline parser (`apps/mobile/src/voice/commands.ts`) answered
 * only the bare catalog verbs - "delivered", "fail", "skip" - so a sentence
 * with its address in it routed to the server brain and the phone's own
 * offline path stayed silent on exactly the turns the founder's A-to-Z
 * simulation is made of.
 *
 * Every case below is a shape the set carries, quoted with its script id, so
 * the parser cannot drift away from the sentences real couriers say. The
 * address travels with the command (BUG-073's rule: the courier's own words are
 * carried, never thrown away).
 */
import { parseVoiceCommand } from '../commands';

/** A shape the set carries, with the script id it comes from. */
interface SpokenForm {
  script: string;
  said: string;
}

const DELIVERIES: readonly SpokenForm[] = [
  { script: 'S0001', said: 'delivered at 57 Poulson Street, Addington' },
  { script: 'S0002', said: 'left it on the porch at 19 Date Crescent, Aidanfield' },
  { script: 'S0003', said: 'dropped it in the letterbox at 490 West Street, Allenton' },
  { script: 'S0004', said: 'put it in the porch at 190 Breezes Road, Aranui' },
  { script: 'S0005', said: 'left it with the neighbour at 4 Moore Street, Ashburton' },
  { script: 'S0006', said: 'delivered at 1636 Clintons Road, Darfield' },
  { script: 'S0007', said: 'left it at the door at 490 West Street, Allenton' },
];

/**
 * The same sentences as the ear hands them over, from the runs of the scale
 * simulation in `docs/evidence/voice-scale/results/per_turn.csv`: a phone
 * parser that only answers the pristine sentence is a phone that goes deaf in
 * a van (§12), so the ear's own variants are pinned here too.
 */
const AS_HEARD: readonly SpokenForm[] = [
  { script: 'S0005-snr0', said: 'hand it to the man at 3 Perimeter Road, Christchurch Airport' },
  { script: 'S0121-snr0', said: 'nobody answered at 121 Road' },
  { script: 'S0123-snr0', said: "it's locked out at 3411 Thompsons Track, Ashburton Forks" },
  { script: 'S0481-snr0', said: 'taking a 10 minute break' },
  {
    script: 'S0464-snr0',
    said: 'lefted at the shop counter at 5 Kennedy\u2019s Bush Road, Kennedy\u2019s Bush',
  },
];

const FAILURES: readonly (SpokenForm & { reason: string })[] = [
  {
    script: 'S0121',
    said: 'no one home at 3411 Thompsons Track, Ashburton Forks',
    reason: 'nobody_home',
  },
  { script: 'S0122', said: 'cannot get in at 81 Hawthornden Road, Avonhead', reason: 'no_access' },
  // A reason the picker's own list does not carry travels as the sentence the
  // courier said, bounded the way ADR-023 bounds it.
  {
    script: 'S0123',
    said: 'dog in the yard at 70 Rakaia Terrace Road, Bankside',
    reason: 'dog in the yard',
  },
];

const SKIPS: readonly SpokenForm[] = [
  { script: 'S0241', said: 'skip this one at 33 A Darroch Street, Belfast' },
  { script: 'S0242', said: 'come back to 1790 Bayleys Road, Birdlings Flat later' },
  { script: 'S0243', said: 'skip the street for 81 Hawthornden Road, Avonhead' },
];

const ADDITIONS: readonly SpokenForm[] = [
  { script: 'S0361', said: 'add a stop at 24 Wendover Street, Bishopdale' },
  { script: 'S0362', said: 'also got one at 1 Ben Nevis Drive, Broomfield' },
  { script: 'S0363', said: 'priority parcel for 438 Ilam Road, Bryndwr' },
];

/**
 * The address an add-stop sentence is meant to carry: everything after the
 * verb that introduced it, which is what the command has to hand over.
 */
function expectedAddress(said: string): string {
  return said.replace(/^(?:add a stop at|also got one at|priority parcel for)\s+/i, '');
}

const NOTES: readonly SpokenForm[] = [
  { script: 'S0461', said: 'gate code is one four two one at 126 Kivers Road, Burnham' },
  { script: 'S0462', said: 'watch the dog at 27 A Parnwell Street, Burwood' },
  { script: 'S0463', said: 'parcel box round the back at 15 MacMillan Avenue, Cashmere' },
  { script: 'S0464', said: 'side gate left of the garage at 1234 Highfield Road, Charing Cross' },
];

const REPEATS: readonly SpokenForm[] = [
  { script: 'S0561', said: 'what was that' },
  { script: 'S0562', said: 'repeat that' },
  { script: 'S0563', said: 'where is it in the van' },
  { script: 'S0564', said: 'read me the next one' },
];

describe('the spoken forms of the voice parser (the shapes the eval set carries)', () => {
  it('the delivery sentence with its address in it is a delivery command', () => {
    for (const form of DELIVERIES) {
      const command = parseVoiceCommand(form.said);
      expect(command).not.toBeNull();
      expect(command).toMatchObject({ type: 'mark_delivered' });
    }
  });

  it('the same sentences as the ear hands them over are still commands', () => {
    for (const form of AS_HEARD) {
      const command = parseVoiceCommand(form.said);
      expect(command).not.toBeNull();
    }
    expect(
      parseVoiceCommand('hand it to the man at 3 Perimeter Road, Christchurch Airport'),
    ).toMatchObject({
      type: 'mark_delivered',
      rawAddress: '3 Perimeter Road, Christchurch Airport',
    });
    expect(parseVoiceCommand('nobody answered at 121 Road')).toMatchObject({
      type: 'mark_failed',
      reason: 'nobody_home',
    });
    expect(parseVoiceCommand('taking a 10 minute break')).toMatchObject({
      type: 'start_break',
      minutes: 10,
    });
  });

  it('the place the courier said the parcel was left travels with it', () => {
    const porch = parseVoiceCommand('left it on the porch at 19 Date Crescent, Aidanfield');
    expect(porch).toMatchObject({ type: 'mark_delivered', safePlace: 'porch' });
    const letterbox = parseVoiceCommand('dropped it in the letterbox at 490 West Street, Allenton');
    expect(letterbox).toMatchObject({ type: 'mark_delivered', safePlace: 'letterbox' });
  });

  it('the address the courier said travels with the command', () => {
    const command = parseVoiceCommand('delivered at 57 Poulson Street, Addington');
    expect(command).toMatchObject({
      type: 'mark_delivered',
      rawAddress: '57 Poulson Street, Addington',
    });
  });

  it('a unit number in the spoken address is not cut in half', () => {
    const command = parseVoiceCommand('delivered at 4/65 Carlton Mill Road, Merivale');
    expect(command).toMatchObject({
      type: 'mark_delivered',
      rawAddress: '4/65 Carlton Mill Road, Merivale',
    });
    const other = parseVoiceCommand('delivered at 5759 Arundel Rakaia Gorge Road, Methven');
    expect(other).toMatchObject({ rawAddress: '5759 Arundel Rakaia Gorge Road, Methven' });
  });

  it("the failed sentence names the reason the product's own list carries", () => {
    for (const form of FAILURES) {
      const command = parseVoiceCommand(form.said);
      expect(command).not.toBeNull();
      expect(command).toMatchObject({ type: 'mark_failed' });
      const reason = (command as { reason?: string } | null)?.reason ?? '';
      if (form.reason === 'dog in the yard') {
        // A reason the picker's list does not carry: the courier's own words.
        expect(reason).toBe(form.said);
      } else {
        expect(reason).toBe(form.reason);
      }
    }
  });

  it('the skip sentence with its address in it is a skip', () => {
    for (const form of SKIPS) {
      const command = parseVoiceCommand(form.said);
      expect(command).not.toBeNull();
      expect(command).toMatchObject({ type: 'mark_skipped' });
    }
  });

  it('the add-stop sentence keeps the address, not the verb that carried it', () => {
    for (const form of ADDITIONS) {
      const command = parseVoiceCommand(form.said);
      expect(command).not.toBeNull();
      expect(command).toMatchObject({ type: 'add_stop', rawAddress: expectedAddress(form.said) });
    }
  });

  it('the break a courier says out loud starts and ends the break', () => {
    expect(parseVoiceCommand('taking a ten minute break')).toMatchObject({
      type: 'start_break',
      minutes: 10,
    });
    expect(parseVoiceCommand('back on the road')).toMatchObject({ type: 'end_break' });
  });

  it('the note shapes keep the whole of what the courier said', () => {
    for (const form of NOTES) {
      const command = parseVoiceCommand(form.said);
      expect(command).not.toBeNull();
      expect(command).toMatchObject({ type: 'add_location_note' });
    }
  });

  it('the repeat shapes are one command, not four unmatched sentences', () => {
    for (const form of REPEATS) {
      const command = parseVoiceCommand(form.said);
      expect(command).not.toBeNull();
      expect(command).toMatchObject({ type: 'repeat_instruction' });
    }
  });

  it('the bare verbs the app already answered keep their answers', () => {
    // The short forms are what the earbud and the floor tests use: the new
    // shapes must not take their answers away.
    expect(parseVoiceCommand('delivered')).toEqual({ type: 'mark_delivered', stopId: 'current' });
    expect(parseVoiceCommand('skip')).toEqual({ type: 'mark_skipped', stopId: 'current' });
    expect(parseVoiceCommand('fail')).toEqual({
      type: 'mark_failed',
      stopId: 'current',
      reason: 'voice',
    });
    expect(parseVoiceCommand('start break')).toEqual({ type: 'start_break', minutes: null });
    expect(parseVoiceCommand('end break')).toEqual({ type: 'end_break' });
  });

  it('the chatter the set carries is still not a command', () => {
    // The false-action leg: a sentence that is talk, not a command.
    for (const said of [
      'is the traffic on Blenheim still silly',
      'bloody fuel prices eh',
      'radio says the road is closed',
      'starting my run',
    ]) {
      expect(parseVoiceCommand(said)).toBeNull();
    }
  });
});
