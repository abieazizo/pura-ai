import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { useAppStore } from '@/store/useAppStore';

/**
 * Observes the OS-level Reduce Motion accessibility setting. Screens that
 * run large springs / infinite pulses should consult this and render a static
 * variant when it returns true.
 *
 * On web, also honors the `(prefers-reduced-motion: reduce)` media query and
 * a `window.__puraStaticPreview__` flag set by design-audit tooling so a
 * static frame can be captured without animation jitter.
 *
 * v28 — also honors the user's `motionPreference` from Settings ▸ Appearance.
 * 'reduced' forces this hook true regardless of the OS flag; 'system'
 * (default) defers entirely to the OS detection below.
 */
/**
 * Web-only floor for the reduce-motion flag — checks that must win regardless
 * of the OS accessibility setting:
 *
 * - `window.__puraStaticPreview__` / localStorage flag set by design-audit
 *   tooling so a static frame can be captured without animation jitter.
 * - Coarse pointer (phones, tablets): mobile / touch web has a far tighter
 *   memory ceiling and a single-threaded animation budget vs. desktop. The
 *   continuous orb + reveal loops can push mobile Safari past its per-tab
 *   memory limit and crash the page (not reproducible in desktop Chrome).
 *   Default these devices to the (complete, designed-for) reduced-motion
 *   render; desktop web (fine pointer) keeps the full animation.
 *
 * On react-native-web, AccessibilityInfo.isReduceMotionEnabled resolves from
 * `(prefers-reduced-motion: reduce)` only — false on a phone whose OS toggle
 * is off — so its result must never LOWER the flag below this floor (it may
 * still raise it). Returns false on native so the OS setting keeps toggling
 * the flag both ways on iOS/Android.
 */
function webReduceMotionFloor(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  if ((window as any).__puraStaticPreview__) return true;
  try {
    if (window.localStorage?.getItem('__pura_static_preview__') === '1') {
      return true;
    }
  } catch {}
  try {
    if (window.matchMedia?.('(pointer: coarse)')?.matches) return true;
  } catch {}
  return false;
}

export function useReduceMotion(): boolean {
  const forcedByUser = useAppStore((s) => s.motionPreference === 'reduced');
  const [reduce, setReduce] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const mql = window.matchMedia?.('(prefers-reduced-motion: reduce)');
      if (mql?.matches) return true;
    }
    return webReduceMotionFloor();
  });

  useEffect(() => {
    let mounted = true;
    const floor = webReduceMotionFloor();
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduce(enabled || floor);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        if (mounted) setReduce(enabled || floor);
      }
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return forcedByUser || reduce;
}
