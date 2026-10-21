/**
 * The reduce-motion setting of the device.
 *
 * Reanimated's own `useReducedMotion()` reads the setting once, when its
 * module loads, and never re-renders when the user changes it
 * (`docs/research/2026/react-native-design-systems-motion.md` §3.1). The
 * contract says the setting is respected, so the app keeps its own
 * subscription: the value is read when the screen opens and it follows every
 * change the user makes while the app is open.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the user asked for less motion.
 *
 * The first render is `false`, because the setting is asynchronous. The
 * movement therefore starts on the default physics and settles on the
 * reduced one as soon as the answer arrives.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let active = true;

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) {
          setReducedMotion(enabled);
        }
      })
      .catch(() => {
        // A device that cannot answer keeps the default motion.
      });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReducedMotion(enabled);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reducedMotion;
}
