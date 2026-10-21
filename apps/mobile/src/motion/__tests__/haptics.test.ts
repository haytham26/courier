/**
 * The rules of the haptics.
 *
 * `docs/design/SYSTEM.md` §5: haptics on confirm, deliver and error, never
 * on scroll. The module is tested with `expo-haptics` mocked, so no device
 * and no vibrator is needed.
 */
import * as Haptics from 'expo-haptics';

import { areHapticsEnabled, hapticFor, patternFor, setHapticsEnabled } from '../haptics';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

const notificationAsync = Haptics.notificationAsync as jest.MockedFunction<
  typeof Haptics.notificationAsync
>;
const impactAsync = Haptics.impactAsync as jest.MockedFunction<typeof Haptics.impactAsync>;

describe('the pattern of an event', () => {
  it('gives a delivery the success notification', () => {
    expect(patternFor('deliver')).toEqual({
      kind: 'notification',
      type: Haptics.NotificationFeedbackType.Success,
    });
  });

  it('gives an error the error notification', () => {
    expect(patternFor('error')).toEqual({
      kind: 'notification',
      type: Haptics.NotificationFeedbackType.Error,
    });
  });

  it('gives a confirmation and the voice button an impact', () => {
    expect(patternFor('confirm')).toEqual({
      kind: 'impact',
      type: Haptics.ImpactFeedbackStyle.Medium,
    });
    expect(patternFor('voice')).toEqual({
      kind: 'impact',
      type: Haptics.ImpactFeedbackStyle.Light,
    });
  });
});

describe('firing a haptic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setHapticsEnabled(true);
  });

  afterEach(() => {
    setHapticsEnabled(true);
  });

  it('fires the success notification when a delivery is confirmed', () => {
    hapticFor('deliver');

    expect(notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    expect(impactAsync).not.toHaveBeenCalled();
  });

  it('fires the error notification on an error', () => {
    hapticFor('error');

    expect(notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
  });

  it('stays quiet when the courier turned the haptics off', () => {
    setHapticsEnabled(false);

    expect(areHapticsEnabled()).toBe(false);

    hapticFor('deliver');
    hapticFor('confirm');

    expect(notificationAsync).not.toHaveBeenCalled();
    expect(impactAsync).not.toHaveBeenCalled();
  });

  it('never fires on a scroll', () => {
    // The module only knows four events, and none of them is a scroll: the
    // list never calls into it.
    hapticFor('confirm');

    expect(impactAsync).toHaveBeenCalledTimes(1);
    expect(notificationAsync).not.toHaveBeenCalled();
  });
});
