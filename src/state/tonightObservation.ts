/**
 * Tonight Observation — the single canonical contract that powers
 * every redesigned tab (Home / Scan / AI Assist / Routine / Products).
 *
 * Per the v29 spec: "the connective artifact across the app is a
 * subtle scan-derived observation visual and one human-readable
 * truth." This module is that contract.
 *
 * Reads from `useAppStore.scans` + `userRoutineMorning` + `wishlist`
 * — never recomposes its own state. Screens consume the derived
 * `TonightObservation` object and the `useTonightObservation()` hook.
 *
 * Pre-scan: returns the no-baseline shape with copy that invites a
 * check-in. Post-scan: returns the observation shape with the focus
 * zone + headline + supporting text + routine + avoid directives,
 * all derived deterministically from the latest scan.
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store/useAppStore';
import { seedProducts } from '@/data/seed';
import {
  buildRoutineState,
  buildSkinSnapshot,
  type SkinSnapshot,
} from '@/state/skinEdit';

export type ConcernZone = 'chin' | 'forehead' | 'cheeks' | 'nose' | 'full_face';

export type TonightFocusType =
  | 'localized_breakout'
  | 'barrier_support'
  | 'hydration'
  | 'calm_irritation'
  | 'maintain';

export type ProductTonightStatus =
  | 'tonight'
  | 'optional'
  | 'skip'
  | 'missing'
  | 'unreviewed';

export type RitualStepState = 'upcoming' | 'active' | 'done' | 'skipped';

export interface ShelfProduct {
  id: string;
  name: string;
  brand: string;
  role: 'cleanser' | 'treatment' | 'moisturizer' | 'serum' | 'spf';
  imageUri?: string;
  initialFallback?: string;
  tonightStatus: ProductTonightStatus;
  shortReason: string;
  detailedReason: string;
  mappedRoutineStepId?: string;
}

export interface RitualStep {
  id: string;
  order: number;
  title: string;
  productId?: string;
  productName?: string;
  instruction: string;
  reason: string;
  placementZone?: ConcernZone;
  state: RitualStepState;
  isFocusStep?: boolean;
}

export interface TonightObservation {
  id: string;
  scanCompleted: boolean;
  scanTimestamp?: string;
  dateLabel: string;
  focusType?: TonightFocusType;
  zone: ConcernZone;
  observationLabel: string;
  /** The single emotional truth the screen leads with. */
  headline: string;
  supportText: string;
  routineDirective: string;
  avoidDirective: string;
  confidenceLanguage: string;
}

// ============================================================================
// Helpers
// ============================================================================

function regionToZone(region: string): ConcernZone {
  const lower = region.toLowerCase();
  if (lower.includes('chin') || lower.includes('jaw')) return 'chin';
  if (lower.includes('forehead')) return 'forehead';
  if (lower.includes('cheek')) return 'cheeks';
  if (lower.includes('nose') || lower.includes('center')) return 'nose';
  return 'full_face';
}

function dateLabelFor(iso: string | null | undefined): string {
  const now = iso ? new Date(iso) : new Date();
  if (Number.isNaN(now.getTime())) return 'TONIGHT';
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const monthDay = now
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    .toUpperCase();
  // Distinguish "TONIGHT" vs e.g. "FRIDAY NIGHT" — pre-scan we say the
  // weekday + NIGHT, post-scan we say TONIGHT.
  return iso ? `TONIGHT · ${monthDay}` : `${weekday} NIGHT · ${monthDay}`;
}

function captureTimeLabel(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return undefined;
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  } catch {
    return undefined;
  }
}

// ============================================================================
// Builder
// ============================================================================

function buildFromSnapshot(snapshot: SkinSnapshot): TonightObservation {
  const zone = regionToZone(snapshot.primaryRegion);
  const barrierStressed = snapshot.barrier !== 'stable';
  const concern = snapshot.primaryConcern;

  let focusType: TonightFocusType = 'maintain';
  let headline = 'Keep it exactly as it is.';
  let supportText = 'Your skin is reading calm.';
  let routineDirective = 'Stay with what is already working.';
  let avoidDirective = 'No new actives tonight.';

  if (barrierStressed) {
    focusType = 'barrier_support';
    headline = 'Your skin is asking for comfort.';
    supportText = `Your ${snapshot.primaryRegion} is reading reactive.`;
    routineDirective = 'Lead with moisture. Pause active steps.';
    avoidDirective = 'Skip exfoliating acids and retinoids tonight.';
  } else if (concern === 'breakouts') {
    focusType = 'localized_breakout';
    headline = 'A quieter night will help most.';
    supportText = `Activity appears concentrated on your ${snapshot.primaryRegion}.`;
    routineDirective = 'Keep treatment targeted. Prioritize moisture.';
    avoidDirective = 'Skip additional active products tonight.';
  } else if (concern === 'tone') {
    focusType = 'maintain';
    headline = 'Take it slow on marks tonight.';
    supportText = 'Tone-evening works through consistency, not intensity.';
    routineDirective = 'A gentle layer is enough.';
    avoidDirective = 'Avoid stacking actives in one night.';
  } else if (concern === 'hydration') {
    focusType = 'hydration';
    headline = 'Restore comfort first.';
    supportText = `Your ${snapshot.primaryRegion} is asking for more water.`;
    routineDirective = 'Lead with hydration. Hold treatment.';
    avoidDirective = 'Avoid anything stripping tonight.';
  } else if (concern === 'texture') {
    focusType = 'calm_irritation';
    headline = 'Smooth gently.';
    supportText = 'A light resurfacing step is enough tonight.';
    routineDirective = 'One treatment, then comfort.';
    avoidDirective = 'Avoid layering acids.';
  }

  return {
    id: snapshot.capturedAt ?? 'no-scan',
    scanCompleted: snapshot.capturedAt !== null,
    scanTimestamp: captureTimeLabel(snapshot.capturedAt),
    dateLabel: dateLabelFor(snapshot.capturedAt),
    focusType,
    zone,
    observationLabel: `${capitalize(snapshot.primaryRegion)} · active tonight`,
    headline,
    supportText,
    routineDirective,
    avoidDirective,
    confidenceLanguage: `Visible activity on ${snapshot.primaryRegion} · low irritation elsewhere`,
  };
}

function emptyObservation(): TonightObservation {
  return {
    id: 'no-baseline',
    scanCompleted: false,
    dateLabel: dateLabelFor(null),
    zone: 'chin',
    observationLabel: 'No scan yet tonight',
    headline: 'How is your skin\nfeeling tonight?',
    supportText: 'One private check-in. One clear routine.',
    routineDirective: 'Routine will tune to tonight after your check-in.',
    avoidDirective: 'Pura will not guess before tonight\'s scan.',
    confidenceLanguage: 'No reading yet tonight',
  };
}

function capitalize(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

// ============================================================================
// Hook
// ============================================================================

export function useTonightObservation(): TonightObservation {
  const { scans } = useAppStore(
    useShallow((s) => ({ scans: s.scans }))
  );
  return useMemo(() => {
    if (scans.length === 0) {
      return emptyObservation();
    }
    const snapshot = buildSkinSnapshot(scans);
    return buildFromSnapshot(snapshot);
  }, [scans]);
}

// ============================================================================
// Curated shelf — derives the Tonight / Optional / Skip / Missing
// status for each product based on the canonical recommendation engine
// (`buildRoutineState` + the focus zone). Per the spec, the shelf is
// not inventory administration — it is what fits tonight.
// ============================================================================

export function useTonightShelf(): {
  tonight: ShelfProduct[];
  notTonight: ShelfProduct[];
  missing: ShelfProduct[];
  ownedCount: number;
  missingCount: number;
} {
  const { scans, userRoutineMorning, userRoutineEvening, wishlist } = useAppStore(
    useShallow((s) => ({
      scans: s.scans,
      userRoutineMorning: s.userRoutineMorning,
      userRoutineEvening: s.userRoutineEvening,
      wishlist: s.wishlist,
    }))
  );

  return useMemo(() => {
    const snapshot = buildSkinSnapshot(scans);
    const routine = buildRoutineState({
      userRoutineMorning,
      userRoutineEvening,
      wishlist,
    });
    const barrierStressed = snapshot.barrier !== 'stable';

    // Curated default: three "tonight" picks (cleanse / spot treat /
    // moisturize), one "skip" (an unnecessary serum), one "missing"
    // (SPF). We map by id to real seed products so the shelf shows
    // real brand + product names + image fallbacks.
    const cleanser = pickFirst(['cerave-hydrating-cleanser', 'la-roche-posay-toleriane-cleanser']);
    const treatment = barrierStressed
      ? null
      : pickFirst(['paulas-choice-2-bha']);
    const moisturizer = pickFirst([
      'la-roche-posay-toleriane-dd',
      'cerave-pm-lotion',
      'kiehls-ultra-facial-cream',
    ]);
    const skipSerum = pickFirst(['good-molecules-discoloration', 'the-ordinary-niacinamide']);
    const spfMissing: ShelfProduct = {
      id: 'daily-spf',
      name: 'Daily SPF',
      brand: '',
      role: 'spf',
      initialFallback: 'SPF',
      tonightStatus: 'missing',
      shortReason: 'Needed for daytime protection',
      detailedReason:
        'Daily sun protection helps protect progress during daytime exposure.',
    };

    const tonight: ShelfProduct[] = [];
    if (cleanser) {
      tonight.push({
        id: cleanser.id,
        name: cleanser.name,
        brand: cleanser.brand,
        role: 'cleanser',
        initialFallback: cleanser.brand[0],
        tonightStatus: 'tonight',
        shortReason: 'Cleanse',
        detailedReason:
          'Cleanses without adding an unnecessary active step.',
        mappedRoutineStepId: 'cleanse',
      });
    }
    if (treatment) {
      tonight.push({
        id: treatment.id,
        name: 'Spot Treatment',
        brand: treatment.brand,
        role: 'treatment',
        initialFallback: treatment.brand[0],
        tonightStatus: 'tonight',
        shortReason: snapshot.primaryConcern === 'breakouts' ? 'Chin only' : 'Treat',
        detailedReason:
          'Use only where Pura noticed activity tonight.',
        mappedRoutineStepId: 'treat',
      });
    }
    if (moisturizer) {
      tonight.push({
        id: moisturizer.id,
        name: moisturizer.name,
        brand: moisturizer.brand,
        role: 'moisturizer',
        initialFallback: moisturizer.brand[0],
        tonightStatus: 'tonight',
        shortReason: 'Finish',
        detailedReason: 'Supports comfort without adding another active.',
        mappedRoutineStepId: 'moisturize',
      });
    }

    const notTonight: ShelfProduct[] = skipSerum
      ? [
          {
            id: skipSerum.id,
            name: skipSerum.name,
            brand: skipSerum.brand,
            role: 'serum',
            initialFallback: skipSerum.brand[0],
            tonightStatus: 'skip',
            shortReason: 'Skip tonight',
            detailedReason:
              'Tonight is focused on localized treatment and barrier comfort.',
          },
        ]
      : [];

    // Hide the missing-SPF prompt once the user owns one. Detect by
    // wishlist / routine containing any product with category=spf.
    const ownsSpf = [...routine.ownedIds, ...wishlist].some((id) => {
      const p = seedProducts.find((sp) => sp.id === id);
      return p?.category === 'spf';
    });
    const missing = ownsSpf ? [] : [spfMissing];

    const ownedCount = tonight.length + notTonight.length;
    const missingCount = missing.length;
    return { tonight, notTonight, missing, ownedCount, missingCount };
  }, [scans, userRoutineMorning, userRoutineEvening, wishlist]);
}

function pickFirst(ids: string[]) {
  for (const id of ids) {
    const p = seedProducts.find((sp) => sp.id === id);
    if (p) return p;
  }
  return null;
}

// ============================================================================
// Tonight ritual — three-step ritual derived from the shelf.
// ============================================================================

export function useTonightRitual(): RitualStep[] {
  const { tonight } = useTonightShelf();
  const observation = useTonightObservation();
  return useMemo(() => {
    const cleanse = tonight.find((p) => p.role === 'cleanser');
    const treat = tonight.find((p) => p.role === 'treatment');
    const moist = tonight.find((p) => p.role === 'moisturizer');
    const steps: RitualStep[] = [];
    if (cleanse) {
      steps.push({
        id: 'cleanse',
        order: 1,
        title: 'Cleanse',
        productId: cleanse.id,
        productName: `${cleanse.brand} ${cleanse.name}`,
        instruction: 'Massage gently. Rinse lukewarm.',
        reason: 'A gentle cleanse clears buildup without adding another active step.',
        state: 'upcoming',
      });
    }
    if (treat) {
      steps.push({
        id: 'treat',
        order: 2,
        title: observation.zone === 'chin' ? 'Treat the chin only' : 'Treat the focus area',
        productId: treat.id,
        productName: `${treat.brand} Spot Treatment`,
        instruction: 'Apply a small amount only where Pura noticed activity.',
        reason:
          'The visible concern is localized tonight. Targeted care keeps the rest of your skin undisturbed.',
        placementZone: observation.zone,
        state: 'upcoming',
        isFocusStep: true,
      });
    }
    if (moist) {
      steps.push({
        id: 'moisturize',
        order: treat ? 3 : 2,
        title: 'Moisturize',
        productId: moist.id,
        productName: `${moist.brand} ${moist.name}`,
        instruction: 'A thin, even layer. Then leave skin alone tonight.',
        reason: 'After targeted treatment, a simple moisturizer supports comfort.',
        state: 'upcoming',
      });
    }
    return steps;
  }, [tonight, observation.zone]);
}
