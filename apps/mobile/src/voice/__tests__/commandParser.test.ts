/**
 * Tests for the voice command catalogue.
 *
 * The parser is the offline path of the voice: it reads the sentence the
 * courier said and turns it into one command. These tests need no device,
 * no model and no network.
 */

import { parseVoiceCommand } from '../commands';

describe('the voice command catalogue', () => {
  describe('the map modes', () => {
    it('turns the 3D map on', () => {
      expect(parseVoiceCommand('3D on')).toEqual({ type: 'set_map_mode', mode: '3d' });
      expect(parseVoiceCommand('three d on')).toEqual({ type: 'set_map_mode', mode: '3d' });
    });

    it('flattens the map', () => {
      expect(parseVoiceCommand('flat map')).toEqual({ type: 'set_map_mode', mode: 'flat' });
      expect(parseVoiceCommand('2D')).toEqual({ type: 'set_map_mode', mode: 'flat' });
    });

    it('asks for the satellite imagery', () => {
      expect(parseVoiceCommand('satellite')).toEqual({ type: 'set_map_mode', mode: 'satellite' });
    });

    it('hands the map back to the app', () => {
      expect(parseVoiceCommand('auto')).toEqual({ type: 'set_map_mode', mode: 'auto' });
    });
  });

  describe('the camera', () => {
    it('goes to the next stop', () => {
      expect(parseVoiceCommand('zoom to the next stop')).toEqual({ type: 'zoom_to_next_stop' });
    });

    it('tilts the map and lays it flat again', () => {
      expect(parseVoiceCommand('tilt the map')).toEqual({ type: 'tilt_map', on: true });
      expect(parseVoiceCommand('flatten the map')).toEqual({ type: 'tilt_map', on: false });
    });

    it('follows the courier', () => {
      expect(parseVoiceCommand('follow me')).toEqual({ type: 'follow_me', on: true });
      expect(parseVoiceCommand('stop following')).toEqual({ type: 'follow_me', on: false });
    });

    it('looks back', () => {
      expect(parseVoiceCommand('look back')).toEqual({ type: 'look_back' });
    });
  });

  describe('the delivery commands', () => {
    it('marks the stop delivered', () => {
      expect(parseVoiceCommand('delivered')).toEqual({
        type: 'mark_delivered',
        stopId: 'current',
      });
    });

    it('skips the stop', () => {
      expect(parseVoiceCommand('skip')).toEqual({ type: 'mark_skipped', stopId: 'current' });
    });

    it('does not read "zoom to the next stop" as a skip', () => {
      expect(parseVoiceCommand('zoom to the next stop')).not.toEqual({
        type: 'mark_skipped',
        stopId: 'current',
      });
    });

    // BUG-073 (the C1 audit, squad 1 finding 4, accepted high): this test's
    // name said "takes the safe place of a delivery" while its assertions
    // proved the place was thrown away - a test whose name is not its claim
    // (PLAYBOOK 14.2). The courier said "left it at the side gate" and the
    // delivery reached the app with nowhere recorded, so the next person who
    // looked for the parcel had nothing to go on.
    //
    // The claim is the name: the place the courier spoke is carried.
    it('takes the safe place of a delivery', () => {
      // The place is the thing itself, without the preposition the courier
      // used to say it: "on the porch" and "at the side gate" both describe
      // where, and the spot they describe is what the next person needs.
      expect(parseVoiceCommand('left it on the porch')).toEqual({
        type: 'mark_delivered',
        stopId: 'current',
        safePlace: 'porch',
      });
      expect(parseVoiceCommand('left at the side gate')).toEqual({
        type: 'mark_delivered',
        stopId: 'current',
        safePlace: 'side gate',
      });
      expect(parseVoiceCommand('left it at the front door')).toEqual({
        type: 'mark_delivered',
        stopId: 'current',
        safePlace: 'front door',
      });
    });

    // The other delivery verb carries the place too, or the two paths disagree
    // about what "the porch" means.
    it('carries the safe place on the plain delivery verb', () => {
      expect(parseVoiceCommand('left it under the mat')).toEqual({
        type: 'mark_delivered',
        stopId: 'current',
        safePlace: 'mat',
      });
      expect(parseVoiceCommand('left it behind the bins')).toEqual({
        type: 'mark_delivered',
        stopId: 'current',
        safePlace: 'bins',
      });
    });

    // A delivery with no place spoken keeps the field absent rather than
    // carrying an empty string, so nothing downstream writes a blank row.
    it('leaves the safe place out when the courier says no place', () => {
      expect(parseVoiceCommand('delivered')).toEqual({
        type: 'mark_delivered',
        stopId: 'current',
      });
    });

    it('adds a stop from a spoken address', () => {
      expect(parseVoiceCommand('add stop 5 Rimu Street')).toEqual({
        type: 'add_stop',
        rawAddress: '5 Rimu Street',
      });
    });

    it('starts and ends a break', () => {
      expect(parseVoiceCommand('start break')).toEqual({ type: 'start_break', minutes: null });
      expect(parseVoiceCommand('start break for 15 minutes')).toEqual({
        type: 'start_break',
        minutes: 15,
      });
      expect(parseVoiceCommand('end break')).toEqual({ type: 'end_break' });
    });

    it('keeps a note for the door', () => {
      expect(parseVoiceCommand('note: the gate code is 4821')).toEqual({
        type: 'add_location_note',
        kind: 'note',
        text: 'the gate code is 4821',
      });
    });
  });

  it('says nothing when the sentence is not a command', () => {
    expect(parseVoiceCommand('the weather in Christchurch is wet')).toBeNull();
    expect(parseVoiceCommand('')).toBeNull();
    expect(parseVoiceCommand('   ')).toBeNull();
  });

  it('does not care about the case or the punctuation', () => {
    expect(parseVoiceCommand('  3D ON!  ')).toEqual({ type: 'set_map_mode', mode: '3d' });
  });
});
