/**
 * The reduce-motion setting.
 *
 * Reanimated's own hook reads the setting once, when its module loads, so the
 * app keeps its own subscription. The test drives the platform API.
 */
import { AccessibilityInfo } from 'react-native';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useReducedMotion } from '../useReducedMotion';

type ReduceMotionListener = (enabled: boolean) => void;

describe('the reduce-motion setting', () => {
  const listeners: ReduceMotionListener[] = [];
  const remove = jest.fn();

  beforeEach(() => {
    listeners.length = 0;
    remove.mockClear();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'reduceMotionChanged') {
        listeners.push(handler);
      }
      return { remove };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is off when the user has not asked for less motion', async () => {
    const { result } = renderHook(() => useReducedMotion());

    await waitFor(() => expect(result.current).toBe(false));
  });

  it('is on when the device says so', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    const { result } = renderHook(() => useReducedMotion());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('follows the setting while the app is open', async () => {
    const { result } = renderHook(() => useReducedMotion());

    await waitFor(() => expect(result.current).toBe(false));

    listeners.forEach((listener) => listener(true));

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('stops listening when the screen goes away', () => {
    const { unmount } = renderHook(() => useReducedMotion());

    unmount();

    expect(remove).toHaveBeenCalled();
  });
});
