/**
 * The Copilot transcript model (T6 slice 3, screen 07).
 *
 * The screen reads a conversation and gives the courier two choices about
 * the last thing Copilot did: Undo puts it back, Text customer sends the
 * template. Both work on the line's own data, so nothing is invented when the
 * action carried nothing a customer needs to know.
 */
// describe/expect/it are jest's ambient globals here, the same namespace the
// other mobile suites use.
import {
  copilotReplyFor,
  customerMessageFor,
  engineLabel,
  lastActionLine,
  withLine,
  withUndone,
  type CopilotLine,
} from '../turns';

function line(overrides: Partial<CopilotLine> = {}): CopilotLine {
  return {
    id: overrides.id ?? 'line-1',
    role: overrides.role ?? 'copilot',
    text: overrides.text ?? 'Done.',
    at: overrides.at ?? 0,
    action: overrides.action ?? null,
    undone: overrides.undone ?? false,
  };
}

const clockMinute = (hours: number, minutes: number) => hours * 60 + minutes;

const SAID = 'Skip 45 and come back after lunch';
const REPLY = 'Done. 140 Harewood Road moved to 12:40. You still finish at 2:15.';

describe('the transcript', () => {
  it('keeps the driver line and the copilot reply apart', () => {
    const turns = [
      line({ id: 'a', role: 'driver', text: SAID, at: 1 }),
      line({ id: 'b', role: 'copilot', text: REPLY, at: 2 }),
    ];

    expect(turns.filter((entry) => entry.role === 'driver')).toHaveLength(1);
    expect(turns.filter((entry) => entry.role === 'copilot')).toHaveLength(1);
    expect(withLine([], line({ id: 'a', role: 'driver', text: SAID })).map((entry) => entry.text)).toEqual([SAID]);
  });

  it('appends in time order and never reorders what is already there', () => {
    const first = line({ id: 'a', text: 'first', at: 1 });
    const second = line({ id: 'b', text: 'second', at: 2 });
    const turns = withLine(withLine([], first), second);

    expect(turns.map((entry) => entry.id)).toEqual(['a', 'b']);
  });
});

describe('the Undo of the last action', () => {
  const moved = line({
    id: 'b',
    role: 'copilot',
    text: REPLY,
    at: 2,
    action: { type: 'move_stop', stopId: 'stop-2', minutes: 95 },
  });

  it('targets the last line that carried an action', () => {
    const turns = [line({ id: 'a', role: 'driver', text: SAID, at: 1 }), moved];

    expect(lastActionLine(turns)?.id).toBe('b');
  });

  it('has no target when nothing was done', () => {
    const turns = [line({ id: 'a', role: 'driver', text: SAID, at: 1 })];

    expect(lastActionLine(turns)).toBeNull();
  });

  it('has no target once the last action is undone', () => {
    expect(lastActionLine(withUndone([moved], 'b'))).toBeNull();
  });
  it('leaves the undone line in place so the courier can still read it', () => {
    const [entry] = withUndone([moved], 'b');

    expect(entry.undone).toBe(true);
    expect(entry.text).toBe(REPLY);
  });
});

describe('the Text customer template', () => {
  it('names the address and the new time of the move', () => {
    const moved = line({
      id: 'b',
      action: { type: 'move_stop', stopId: 'stop-2', text: '140 Harewood Road', minutes: 95 },
      text: REPLY,
    });

    // The turn happened at 11:05 and the stop moved 95 minutes, so the
    // customer's window reads 12:40 - the same hour the reply names.
    const message = customerMessageFor(moved, clockMinute(11, 5));

    expect(message).toContain('140 Harewood Road');
    expect(message).toContain('12:40');
    expect(message).not.toMatch(/emoji|\.{3}|undefined|NaN/);
  });

  it('is null when the action carried nothing a customer needs to know', () => {
    const plain = line({ id: 'b', text: 'You are 12 minutes ahead.', action: null });

    expect(customerMessageFor(plain, clockMinute(11, 5))).toBeNull();
  });
});

describe('the engine label', () => {
  it('says ON DEVICE for the on-device engine and ONLINE for the server', () => {
    expect(engineLabel('on-device')).toBe('ON DEVICE');
    expect(engineLabel('server')).toBe('ONLINE');
  });
});

describe("Copilot's reply to a command", () => {
  const run = { total: 5, delivered: 2, address: '140 Harewood Road' };

  it('names the address and the count the run actually holds', () => {
    expect(copilotReplyFor({ type: 'mark_delivered', stopId: 'stop-2' }, run)).toEqual({
      text: 'Stop 140 Harewood Road delivered. 3 to go.',
      action: { type: 'mark_delivered', stopId: 'stop-2', text: '140 Harewood Road' },
    });
  });

  it('never claims a negative count when the run is finished', () => {
    expect(copilotReplyFor({ type: 'mark_skipped', stopId: 's' }, { ...run, delivered: 7 }).text).toContain(
      '0 to go.',
    );
  });

  it('says it did not catch the command when the run cannot describe it', () => {
    const reply = copilotReplyFor({ type: 'tilt_map' }, run);

    expect(reply.action).toBeNull();
    expect(reply.text).not.toMatch(/undefined|NaN/);
  });

  it('offers the customer message only for a failed delivery', () => {
    const failed = line({ id: 'f', action: { type: 'mark_failed', stopId: 'stop-2', text: '140 Harewood Road' } });

    expect(customerMessageFor(failed, clockMinute(11, 5))).toContain('could not');
    expect(customerMessageFor(line({ id: 'd', action: { type: 'mark_delivered', stopId: 's' } }), clockMinute(11, 5))).toBeNull();
  });
});
