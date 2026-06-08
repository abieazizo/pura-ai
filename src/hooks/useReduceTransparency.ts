/**
 * useReduceTransparency — mirrors `useReduceMotion`, for the iOS "Reduce
 * Transparency" accessibility setting. When ON, the First-Finding screen swaps
 * the additive, feathered glows for soft SOLID fills (no blend, no gradient
 * translucency) so the located findings stay fully legible and complete.
 *
 * RN exposes `AccessibilityInfo.isReduceTransparencyEnabled()` +
 * `reduceTransparencyChanged` on iOS; elsewhere it resolves false, which is the
 * correct default (full fidelity).
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReduceTransparency(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    // Guard: the method is iOS-only; on other platforms it may be undefined.
    const probe = AccessibilityInfo.isReduceTransparencyEnabled?.bind(
      AccessibilityInfo,
    );
    if (probe) {
      probe()
        .then((v) => {
          if (mounted) setEnabled(!!v);
        })
        .catch(() => {
          /* unsupported — keep false */
        });
    }
    const sub = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      (v) => setEnabled(!!v),
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return enabled;
}
