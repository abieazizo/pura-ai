/**
 * NoClearFindingsScreen — DELETED in v32.
 *
 * The "Nothing specific stood out" / "We could not identify a visible
 * focus area" copy paths are gone. The new ScanResultV2 contract
 * guarantees 3-6 findings via schema + retry + deterministic fallback,
 * so the empty-state surface is no longer reachable.
 *
 * This file remains as a placeholder export so any straggler import
 * fails loudly at runtime instead of silently rendering an unused
 * screen. If you land here, route to `ScanResultsV2Screen` instead.
 */

import React from 'react';

export interface NoClearFindingsScreenProps {
  onRetake?(): void;
  onReturnHome?(): void;
  limitedScan?: boolean;
  presence?: 'none' | 'possible_only';
}

export function NoClearFindingsScreen(
  _props: NoClearFindingsScreenProps,
): React.ReactElement | null {
  if (
    typeof globalThis !== 'undefined' &&
    typeof console !== 'undefined' &&
    typeof console.error === 'function'
  ) {
    console.error(
      '[Pura] NoClearFindingsScreen was rendered but is deleted in v32. ' +
        'Route to ScanResultsV2Screen instead — every scan now carries ' +
        'a guaranteed 3-6 findings ScanResultV2.',
    );
  }
  return null;
}
