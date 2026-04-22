import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Observes the OS-level Reduce Motion accessibility setting. Screens that
 * run large springs / infinite pulses should consult this and render a static
 * variant when it returns true.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduce(enabled);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        if (mounted) setReduce(enabled);
      }
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduce;
}
