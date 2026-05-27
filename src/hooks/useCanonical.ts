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
 *
 * v22.6 — the previous `useShallow((s) => ({ user, name, ...17
 * fields }))` selector was identified as a contributor to React 19's
 * `getSnapshot should be cached` warning, because every render
 * recomputed the slice object even when the underlying fields had
 * not changed. The fix splits the subscription into primitive
 * selectors (Object.is comparison stops the re-render at the source)
 * and reassembles the slice inside `useMemo` so
 * `selectUserProfileContext` only runs when one of its real inputs
 * changed.
 */
export function useUserProfileContext(): UserProfileContext {
  const user = useAppStore((s) => s.user);
  const name = useAppStore((s) => s.name);
  const skinType = useAppStore((s) => s.skinType);
  const sensitivity = useAppStore((s) => s.sensitivity);
  const goal = useAppStore((s) => s.goal);
  const effort = useAppStore((s) => s.effort);
  const priceTier = useAppStore((s) => s.priceTier);
  const skinConditions = useAppStore((s) => s.skinConditions);
  const prescriptionFlag = useAppStore((s) => s.prescriptionFlag);
  const fragranceSensitive = useAppStore((s) => s.fragranceSensitive);
  const activeIrritation = useAppStore((s) => s.activeIrritation);
  const pregnancyCaution = useAppStore((s) => s.pregnancyCaution);
  const avoidIngredients = useAppStore((s) => s.avoidIngredients);
  const userRoutineMorning = useAppStore((s) => s.userRoutineMorning);
  const userRoutineEvening = useAppStore((s) => s.userRoutineEvening);
  const wishlist = useAppStore((s) => s.wishlist);
  const scans = useAppStore((s) => s.scans);
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);

  return useMemo(
    () =>
      selectUserProfileContext({
        user,
        name,
        skinType,
        sensitivity,
        goal,
        effort,
        priceTier,
        skinConditions,
        prescriptionFlag,
        fragranceSensitive,
        activeIrritation,
        pregnancyCaution,
        avoidIngredients,
        userRoutineMorning,
        userRoutineEvening,
        wishlist,
        scans,
        onboardingComplete,
      } as never),
    [
      user,
      name,
      skinType,
      sensitivity,
      goal,
      effort,
      priceTier,
      skinConditions,
      prescriptionFlag,
      fragranceSensitive,
      activeIrritation,
      pregnancyCaution,
      avoidIngredients,
      userRoutineMorning,
      userRoutineEvening,
      wishlist,
      scans,
      onboardingComplete,
    ]
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
