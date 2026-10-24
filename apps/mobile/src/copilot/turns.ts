/**
 * The Copilot conversation (T6 slice 3, screen 07).
 *
 * The screen reads a transcript of the shift and gives the courier two
 * choices about the last thing Copilot did: **Undo** puts it back and **Text
 * customer** sends the template. Both work on the line's own data, so the
 * screen never invents an address, a minute or a message it was not given
 * (MASTER_EXECUTION §13.2).
 *
 * The turn itself is the voice service's `CourierVoiceTurn` (the speech, the
 * action, the engine and the source); this module is the translation of that
 * turn into what the screen can show and act on, kept pure so it is tested
 * on its own.
 */

/** The action a turn carried, as the screen needs it. */
export interface CopilotActionTag {
  type: string;
  stopId?: string | null;
  /** How far the stop moved, in minutes. */
  minutes?: number | null;
  /** The address the action named, when it named one. */
  text?: string | null;
}

/** One line of the conversation. */
export interface CopilotLine {
  /** The stable id: the clock read at the line's own moment. */
  id: string;
  role: 'driver' | 'copilot';
  text: string;
  /** The clock read at the line's own moment, ms. */
  at: number;
  action: CopilotActionTag | null;
  /** Whether the action has been undone (the line stays, for the record). */
  undone: boolean;
}

/** The engine a turn was answered by. */
export type CopilotSource = 'on-device' | 'server';

/** Appends a line to the transcript, in the order it arrived. */
export function withLine(lines: readonly CopilotLine[], line: CopilotLine): CopilotLine[] {
  return [...lines, line];
}

/**
 * The last line that did something and is not already undone: the target of
 * Undo. A line that only answered a question has no target, so the Undo never
 * appears for it.
 */
export function lastActionLine(lines: readonly CopilotLine[]): CopilotLine | null {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const entry = lines[index];
    if (entry === undefined) continue;
    if (entry.action !== null && !entry.undone) return entry;
  }
  return null;
}

/**
 * Marks one line's action undone. The line stays in the transcript: the
 * courier keeps what was said, and the Undo is spent.
 */
export function withUndone(lines: readonly CopilotLine[], id: string): CopilotLine[] {
  return lines.map((entry) => (entry.id === id ? { ...entry, undone: true } : entry));
}

/** The minute of the day a stop moves to, from the minute it is now. */
export function movedToMinuteOfDay(nowMinute: number, minutes: number): number {
  const moved = Math.round(nowMinute) + Math.round(minutes);
  return ((moved % (24 * 60)) + 24 * 60) % (24 * 60);
}

/** The clock read of a minute-of-day, as `HH:MM`. */
export function clockOf(minuteOfDay: number): string {
  const minute = Math.max(0, Math.floor(minuteOfDay));
  return `${String(Math.floor(minute / 60) % 24).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

/**
 * The minute of the day a clock read of an instant is, in the courier's own
 * timezone. It is not part of the pure contract because the local zone is the
 * environment's, not the model's.
 */
export function minuteOfDay(at: number): number {
  const moment = new Date(at);
  return moment.getHours() * 60 + moment.getMinutes();
}

/**
 * The Text customer template for a line, or null when the action carried
 * nothing a customer needs to know. There is no default template: a stop that
 * only moved and a stop the courier skipped are different messages, and the
 * screen says so only for the ones it can fill truthfully.
 *
 * @param nowMinute the minute of the day the action happened at.
 */
export function customerMessageFor(line: CopilotLine, nowMinute: number): string | null {
  const action = line.action;
  if (action === null) return null;

  const address = action.text?.trim();
  if (!address) return null;

  if (action.type === 'move_stop') {
    if (action.minutes === null || action.minutes === undefined) return null;
    const movedTo = clockOf(movedToMinuteOfDay(nowMinute, action.minutes));
    return `Your parcel to ${address} is now expected at about ${movedTo}. Reply STOP to opt out.`;
  }

  if (action.type === 'mark_failed') {
    return `We could not deliver your parcel to ${address} today. Reply or call to arrange a new time. Reply STOP to opt out.`;
  }

  return null;
}

/** The label of the engine that answered, as the screen's status says it. */
export function engineLabel(source: CopilotSource): string {
  return source === 'on-device' ? 'ON DEVICE' : 'ONLINE';
}

/**
 * What the run looked like when a command landed, as a reply needs it. Every
 * number in a reply comes from here, so a reply never invents a count.
 */
export interface RunReading {
  total: number;
  delivered: number;
  /** The address of the stop the command named, when it named one. */
  address: string | null;
}

/** A command as the Copilot screen receives it. */
export interface CopilotCommandReading {
  type: string;
  stopId?: string | null;
  /** The words the courier said, when the engine kept them. */
  transcript?: string | null;
}

/** What Copilot says back, and what it did. */
export interface CopilotReply {
  text: string;
  action: CopilotActionTag | null;
}

const words: Record<string, string> = {
  mark_delivered: 'delivered',
  mark_skipped: 'skipped',
  mark_failed: 'could not be delivered',
};

/**
 * Copilot's answer to a command, computed from the run it just changed. The
 * reply is a description of the real state - the address and the count the run
 * holds - so it can never drift from what the app actually did (MASTER_EXECUTION
 * §13.2). A command the run cannot describe gets the honest line that says so.
 */
export function copilotReplyFor(command: CopilotCommandReading, run: RunReading): CopilotReply {
  const remaining = Math.max(0, run.total - run.delivered);
  const word = words[command.type];

  if (word === undefined) {
    return {
      text: command.transcript?.trim() ? `Heard: ${command.transcript.trim()}` : 'I did not catch that.',
      action: null,
    };
  }

  const address = run.address;
  if (address === null) {
    return { text: `That stop ${word}. ${remaining} to go.`, action: null };
  }

  return {
    text: `Stop ${address} ${word}. ${remaining} to go.`,
    action: { type: command.type, stopId: command.stopId ?? null, text: address },
  };
}
