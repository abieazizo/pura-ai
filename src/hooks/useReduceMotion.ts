import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Observes the OS-level Reduce Motion accessibility setting. Screens that
 * run large springs / infinite pulses should consult this and render a static
 * variant when it returns true.
 *
 * On web, also honors the `(prefers-reduced-motion: reduce)` media query and
 * a `window.__puraStaticPreview__` flag set by design-audit tooling so a
 * static frame can be captured without animation jitter.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if ((window as any).__puraStaticPreview__) return true;
      try {
        if (window.localStorage?.getItem('__pura_static_preview__') === '1') {
          return true;
        }
      } catch {}
      const mql = window.matchMedia?.('(prefers-reduced-motion: reduce)');
      if (mql?.matches) return true;
    }
    return false;
  });

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
