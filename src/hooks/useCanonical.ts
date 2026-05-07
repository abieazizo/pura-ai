/**
 * Pura AI — canonical state hooks (v19.15).
 *
 * React-friendly readers for the three canonical state objects.
 * Every screen that needs `displayName`, `topConcerns`, etc.
 * should use these hooks instead of reading from `useAppStore`
 * directly + composing the same shape inline.
 *
 *   • useUserProfileContext() — always returns a UserProfileContext
 *   • useSkinState(scanId?)   — returns SkinState | null
 *
 * These wrap the pure selectors in `src/state/canonical.ts` and
 * subscribe to the relevant slices of the Zustand store so React
 * re-renders correctly when the underlying signals change.
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store/useAppStore';
import { selectSkinState, selectUserProfileContext } from '@/state/canonical';
import {
  resolveScanResultState,
  type ResultViewModel,
} from '@/state/resultResolver';
import type {
  RecommendationContext,
  SkinState,
  UserProfileContext,
} from '@/types/canonical';

/**
 * Subscribe to UserProfileContext. Re-renders when any field that
 * feeds into the canonical object changes (name, skinType, goal,
 * sensitivity tags, safety profile inputs, latest scan, routine).
 */
export function useUserProfileContext(): UserProfileContext {
  const slice = useAppStore(
    useShallow((s) => ({
      user: s.user,
      name: s.name,
      skinType: s.skinType,
      sensitivity: s.sensitivity,
      goal: s.goal,
      effort: s.effort,
      priceTier: s.priceTier,
      skinConditions: s.skinConditions,
      prescriptionFlag: s.prescriptionFlag,
      fragranceSensitive: s.fragranceSensitive,
      activeIrritation: s.activeIrritation,
      pregnancyCaution: s.pregnancyCaution,
      avoidIngredients: s.avoidIngredients,
      userRoutineMorning: s.userRoutineMorning,
      userRoutineEvening: s.userRoutineEvening,
      wishlist: s.wishlist,
      scans: s.scans,
    }))
  );
  // selectUserProfileContext takes the full AppState shape but only
  // touches the fields above; cast is safe.
  return useMemo(
    () => selectUserProfileContext(slice as never),
    [slice]
  );
}

/**
 * Subscribe to SkinState for a specific scan. When `scanId` is
 * undefined, defaults to the most recent scan. Returns null when
 * the scan can't be found or scans is empty.
 */
export function useSkinState(scanId?: string): SkinState | null {
  const scans = useAppStore((s) => s.scans);
  return useMemo(() => {
    if (scans.length === 0) return null;
    const scan = scanId
      ? scans.find((s) => s.id === scanId) ?? scans[scans.length - 1]
      : scans[scans.length - 1];
    if (!scan) return null;
    const previous = scans
      .filter((s) => s.capturedAt < scan.capturedAt)
      .slice(-1)[0];
    return selectSkinState(scan, previous, scans);
  }, [scans, scanId]);
}

/**
 * Single canonical resolver for the result-screen view-model.
 * v19.16 (Phase 6C) — every result/scan/map screen should read
 * from this hook rather than re-deriving thresholds or copy.
 *
 * Pass an optional RecommendationContext when the caller has a
 * fresh recommendation in flight; the resolver composes the rich
 * result-state mode from skin-quality branch + product state.
 */
export function useResultViewModel(args: {
  scanId?: string;
  recommendation?: RecommendationContext | null;
}): ResultViewModel {
  const skinState = useSkinState(args.scanId);
  return useMemo(
    () =>
      resolveScanResultState({
        skinState,
        recommendation: args.recommendation,
      }),
    [skinState, args.recommendation]
  );
}
