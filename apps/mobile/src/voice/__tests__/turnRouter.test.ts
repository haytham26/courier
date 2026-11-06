/**
 * The app-side pre-classifier of the voice turn flow (D1, MASTER §22 technique
 * A on the phone): one routing decision per finished transcript, mirroring the
 * service's own gate (`services/courier-voice/app/turn_gate.py`):
 *
 * - a turn with no words routes `ignore` ("nothing was said") - no model call;
 * - a catalog command whose answer does not depend on the day (the service's
 *   CONTEXT_FREE_COMMANDS, plus the map/camera verbs) routes `free` - the app
 *   answers it locally, no HTTP;
 * - anything else routes `full` - the server brain answers with the day.
 *
 * The routing is pure, so it is tested without a device.
 */
import { ackLineFor, routeTurn } from '../turnRouter';

describe('routeTurn (the app-side pre-classifier, D1)', () => {
  it('ignores a turn with no words in it', () => {
    for (const said of ['', '   ', '...', '?!', '.,;:']) {
      const routed = routeTurn(said);
      expect(routed.gate).toBe('ignore');
      expect(routed.command).toBeNull();
      expect(routed.reason).toMatch(/nothing was said/);
    }
  });

  it('routes the context-free stop commands free', () => {
    const cases: [string, string][] = [
      ['delivered', 'mark_delivered'],
      ['done.', 'mark_delivered'],
      ['skip', 'mark_skipped'],
      ['come back to it', 'mark_skipped'],
      ['failed', 'mark_failed'],
      ['no access', 'mark_failed'],
      ['add 5 Rimu Street', 'add_stop'],
      ['start a break', 'start_break'],
      ['start break for 20 minutes', 'start_break'],
      ['end break', 'end_break'],
      ['note: gate code is 1234', 'add_location_note'],
    ];
    for (const [said, type] of cases) {
      const routed = routeTurn(said);
      expect(routed.gate).toBe('free');
      expect(routed.command?.type).toBe(type);
    }
  });

  it('carries the spoken safe place on a free delivered', () => {
    const routed = routeTurn('left it at the side gate');
    expect(routed.gate).toBe('free');
    expect(routed.command).toEqual({
      type: 'mark_delivered',
      stopId: 'current',
      safePlace: 'side gate',
    });
  });

  it('routes the map and camera verbs free', () => {
    const cases: [string, string][] = [
      ['satellite', 'set_map_mode'],
      ['3d on', 'set_map_mode'],
      ['auto', 'set_map_mode'],
      ['zoom to the next stop', 'zoom_to_next_stop'],
      ['tilt the map', 'tilt_map'],
      ['flatten the map', 'tilt_map'],
      ['follow me', 'follow_me'],
      ['stop following', 'follow_me'],
      ['look back', 'look_back'],
      ['reset the camera', 'reset_camera'],
    ];
    for (const [said, type] of cases) {
      const routed = routeTurn(said);
      expect(routed.gate).toBe('free');
      expect(routed.command?.type).toBe(type);
    }
  });

  it('routes the day-reading commands full', () => {
    for (const said of ['how many left', 'how many stops left', 'where am I', 'repeat']) {
      const routed = routeTurn(said);
      expect(routed.gate).toBe('full');
      expect(routed.command).not.toBeNull();
    }
  });

  it('routes a question phrasing the catalog does not spell out full with no command', () => {
    const routed = routeTurn('how many stops are left on the run');
    expect(routed.gate).toBe('full');
    expect(routed.command).toBeNull();
  });

  it('routes an unknown sentence full with no command: the conversation is the model\'s', () => {
    const routed = routeTurn('what is the weather like in Riccarton');
    expect(routed.gate).toBe('full');
    expect(routed.command).toBeNull();
  });
});

describe('ackLineFor (the spoken answer of a free turn)', () => {
  it('answers every free command with a line', () => {
    const commands = [
      routeTurn('delivered').command,
      routeTurn('skip').command,
      routeTurn('failed').command,
      routeTurn('add 5 Rimu Street').command,
      routeTurn('start a break').command,
      routeTurn('end break').command,
      routeTurn('note: dog').command,
      routeTurn('satellite').command,
      routeTurn('zoom to the next stop').command,
      routeTurn('tilt the map').command,
      routeTurn('follow me').command,
      routeTurn('look back').command,
      routeTurn('reset the camera').command,
    ];
    for (const command of commands) {
      expect(command).not.toBeNull();
      expect(ackLineFor(command as NonNullable<typeof command>).length).toBeGreaterThan(0);
    }
  });

  it('says "Delivered." for a spoken delivered', () => {
    const command = routeTurn('delivered').command;
    expect(command).not.toBeNull();
    expect(ackLineFor(command as NonNullable<typeof command>)).toBe('Delivered.');
  });
});
