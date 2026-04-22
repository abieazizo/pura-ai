/**
 * Bridges the cinematic timeline with the real AI call.
 *
 * Contract:
 *   - The screen kicks off the real analysis in parallel with the 7.2s
 *     animation via `startAnalysis` (a callback passed in; this hook doesn't
 *     own the API layer).
 *   - `result` from the store is watched; when it arrives AFTER our
 *     `startedAt` timestamp we flip to `'ready'`. (We guard against a stale
 *     persisted result racing the fresh run.)
 *   - If 12s elapse with no ready signal we flip to `'failed'` so the
 *     parent can switch to ErrorState. The 12s cap is the hard outer bound
 *     from the spec; Beat 6 → Settle hold covers the 4.8s between the 7.2s
 *     cinema and this timeout.
 */

import { useEffect, useRef, useState } from 'react';
import { MAX_TOTAL_WAIT } from '../constants';
import { useInFlightScan, useLatestResult } from '@/store/useAppStore';

export type ReadinessStatus = 'pending' | 'ready' | 'failed';

export interface ReadinessArgs {
  /** Fired after mount — the screen uses this to initiate the real network
   * call in parallel with the animation. If no call is needed (e.g. result
   * is already cached), pass a no-op. */
  runAnalysis?: () => Promise<void> | void;
}

export function useAIReadiness(_args: ReadinessArgs = {}) {
  const result = useLatestResult();
  const inFlight = useInFlightScan();
  const [status, setStatus] = useState<ReadinessStatus>('pending');
  const mountedAt = useRef<number>(Date.now());

  // Flip to ready as soon as a result newer than this run lands.
  useEffect(() => {
    if (!result) return;
    const resultT = new Date(result.timestamp).getTime();
    const runStart = inFlight?.startedAt ?? mountedAt.current;
    if (resultT >= runStart) {
      setStatus('ready');
    }
  }, [result, inFlight]);

  // Hard timeout — if still pending after 12s, fail.
  useEffect(() => {
    if (status !== 'pending') return;
    const elapsed = Date.now() - mountedAt.current;
    if (elapsed >= MAX_TOTAL_WAIT) {
      setStatus('failed');
      return;
    }
    const remaining = MAX_TOTAL_WAIT - elapsed;
    const t = setTimeout(() => {
      setStatus((prev) => (prev === 'pending' ? 'failed' : prev));
    }, remaining);
    return () => clearTimeout(t);
  }, [status]);

  return { status, result };
}
