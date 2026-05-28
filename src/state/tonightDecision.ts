/**
 * Tonight Decision — canonical state for the AI Assist Decision Room.
 *
 * This module is the single source of truth for the question that owns
 * the AI Assist tab:
 *
 *   "Given what Pura knows about my skin today, what should I do
 *    differently tonight?"
 *
 * The screen and every conversation response read from this object;
 * they NEVER recompute it inline.
 *
 * Hard rules:
 *   - Never claim personalization without a recent scan.
 *   - Never escalate to RESET unless the user reported burning/stinging
 *     (or an equivalent severity report), regardless of scan trend.
 *   - User sensation report (handled by the evidence sheet) wins over
 *     pure scan derivation.
 *   - Adjustments prefer products the user actually owns; categorical
 *     fallbacks are clearly marked as such so the UI can render them
 *     without inventing ownership.
 */

import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Product, Scan, SkinZone } from '@/types';
import { seedProducts } from '@/data/seed';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type DecisionState =
  | 'STANDARD_NIGHT'
  | 'RECOVERY_NIGHT'
  | 'TREATMENT_NIGHT'
  | 'RESET_NIGHT'
  | 'CHECK_IN_REQUIRED';

export type ProductDecisionStatus =
  | 'USE_TONIGHT'
  | 'PRIORITIZED_TONIGHT'
  | 'HELD_TONIGHT'
  | 'AVOID_UNTIL_RECHECK'
  | 'NEEDS_REVIEW';

export type UserSensation =
  | 'NORMAL'
  | 'TIGHT_OR_DRY'
  | 'STINGS_OR_BURNS'
  | null;

export type AdjustmentKind = 'OWNED_PRODUCT' | 'CATEGORY_FALLBACK';

export interface ScanObservation {
  latestScanAt: string;
  latestScanLabel: string;
  skinScore: number;
  scoreDeltaFromPrevious: number;
  keyArea: string;
  changeSummary: string;
  comparisonSummary: string;
  hasRecentScan: boolean;
  hasPreviousScan: boolean;
  /** Direction-aware label for the evidence tile ("Irritation increased",
   *  "Skin calming", or "Skin status" when delta is negligible). */
  areaChangeLabel: string;
  /** Hours elapsed since the scan was captured — drives stale-scan UI. */
  scanAgeHours: number;
}

export interface ProductAdjustment {
  productId: string | null;
  productName: string;
  category: string;
  status: ProductDecisionStatus;
  reason: string;
  kind: AdjustmentKind;
}

export interface ProvenanceFlags {
  usedLatestScan: boolean;
  usedPreviousScan: boolean;
  usedRoutine: boolean;
  usedIngredientCheck: boolean;
  usedUserReport: boolean;
}

export interface TonightDecision {
  state: DecisionState;
  /** UI title — e.g. "Recovery night". */
  title: string;
  /** One-sentence decision — e.g. "Skip exfoliation and retinoid tonight." */
  decisionStatement: string;
  /** Two-to-three-sentence explanation — never includes medical claims. */
  explanation: string;
  scanObservation: ScanObservation | null;
  adjustments: ProductAdjustment[];
  /** Short provenance items used by the "Based on…" line. */
  basedOn: string[];
  provenance: ProvenanceFlags;
  applied: boolean;
  appliedAt: string | null;
  appliesToTonightOnly: boolean;
  userSensation: UserSensation;
  /** Pre-computed eyebrow text for the decision card (scan freshness-aware). */
  eyebrowLabel: string;
}

// ---------------------------------------------------------------------------
// Risk fingerprints
// ---------------------------------------------------------------------------

interface RiskFingerprint {
  productId?: string;
  /** Required if no productId — used for keyword sweeps on name/category. */
  match: (p: Product) => boolean;
  /** ProductAdjustment.category label. */
  category: string;
  /** Used as the held-product reason. */
  reason: string;
}

const HELD_RISK_FINGERPRINTS: RiskFingerprint[] = [
  {
    productId: 'paulas-choice-2-bha',
    match: (p) =>
      /bha/i.test(p.name) ||
      /salicylic/i.test(p.keyIngredients.join(' ')) ||
      /\baha\b/i.test(p.name),
    category: 'Exfoliating acid',
    reason: 'Hold tonight · Exfoliating acid',
  },
  {
    productId: 'the-ordinary-retinal',
    match: (p) =>
      /retin(al|oid|ol)/i.test(p.name) ||
      /retin/i.test(p.keyIngredients.join(' ')),
    category: 'Active treatment',
    reason: 'Hold tonight · Active treatment',
  },
  {
    productId: 'paulas-choice-azelaic',
    match: (p) => /azelaic/i.test(p.name) || /azelaic/i.test(p.keyIngredients.join(' ')),
    category: 'Active treatment',
    reason: 'Hold tonight · Active treatment',
  },
  {
    productId: 'the-ordinary-lactic-acid',
    match: (p) => /lactic/i.test(p.name) || /glycolic/i.test(p.name),
    category: 'Exfoliating acid',
    reason: 'Hold tonight · Exfoliating acid',
  },
];

const PRIORITIZED_BARRIER_PRODUCTS = [
  'la-roche-posay-toleriane-dd',
  'cerave-pm-lotion',
  'illiyoon-ceramide-cream',
  'kiehls-ultra-facial-cream',
];

/** Demo product fixtures used when the user does not own any matching item.
 *
 *  The Decision Card always shows TWO held adjustments and ONE prioritized
 *  adjustment in Recovery night so the user can see what would change once
 *  they add the relevant products to their shelf. The names match the
 *  spec verbatim so the demo state is identical to the design brief. */
const DEMO_RECOVERY_FIXTURE = {
  hold: [
    {
      productName: 'Paula’s Choice 2% BHA Liquid',
      category: 'Exfoliating acid',
      reason: 'Hold tonight · Exfoliating acid',
      productId: 'paulas-choice-2-bha',
    },
    {
      productName: 'Differin Gel',
      category: 'Active treatment',
      reason: 'Hold tonight · Active treatment',
      productId: null,
    },
  ],
  prioritize: {
    productName: 'La Roche-Posay Cicaplast Balm B5',
    category: 'Barrier support',
    reason: 'Prioritize tonight · Barrier support',
    productId: null,
  },
};

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function formatScanLabel(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Recent scan';
  const diffMs = Date.now() - then;
  if (diffMs < 0) return 'Today';
  const dayMs = 86_400_000;
  if (diffMs < 6 * 60 * 60 * 1000) return 'Today';
  if (diffMs < dayMs) return 'Today';
  if (diffMs < 2 * dayMs) return 'Yesterday';
  const days = Math.floor(diffMs / dayMs);
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function deltaIsRiskier(delta: number): boolean {
  return delta <= -3;
}

/** True when the user's "applied" stamp is from before today's 4AM rollover.
 *  4AM is used so a late-night apply stays active through the following
 *  morning without re-triggering tomorrow evening. */
function isAppliedStale(appliedAt: string | null): boolean {
  if (!appliedAt) return false;
  const then = new Date(appliedAt).getTime();
  if (Number.isNaN(then)) return false;
  const now = new Date();
  const rollover = new Date(now);
  rollover.setHours(4, 0, 0, 0);
  if (now.getTime() < rollover.getTime()) {
    rollover.setDate(rollover.getDate() - 1);
  }
  return then < rollover.getTime();
}

function getScanAgeHours(scan: Scan): number {
  const diffMs = Date.now() - new Date(scan.capturedAt).getTime();
  return Math.max(0, diffMs / (60 * 60 * 1000));
}

/** Returns the eyebrow text for the decision card based on scan freshness. */
function computeDecisionEyebrow(scans: Scan[]): string {
  if (scans.length === 0) return 'NO SCAN YET';
  const latest = scans[scans.length - 1];
  const ageH = getScanAgeHours(latest);
  if (ageH < 6) return 'UPDATED JUST NOW';
  if (ageH < 24) return 'SCAN FROM TODAY';
  if (ageH < 48) return 'SCAN FROM YESTERDAY';
  const days = Math.floor(ageH / 24);
  if (days < 7) return `SCAN FROM ${days} DAYS AGO`;
  const dateStr = new Date(latest.capturedAt)
    .toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    .toUpperCase();
  return `SCAN FROM ${dateStr}`;
}

function pickKeyArea(scan: Scan): { area: string; observation: string } {
  // Prefer aiAnalysis findings for the most reactive region.
  const ai = scan.aiAnalysis;
  if (ai?.findings?.length) {
    const ordered = [...ai.findings]
      .filter((f) => f.severity !== 'none' && f.direction_vs_previous !== 'better')
      .sort((a, b) => (a.marker_priority ?? 9) - (b.marker_priority ?? 9));
    const top = ordered[0];
    if (top) {
      const region = top.regions?.[0];
      const label = region && region !== 'across_face' ? prettyRegion(region) : null;
      return {
        area: label ?? 'Active area',
        observation: label
          ? `${label} appears more reactive than yesterday`
          : 'Active area appears more reactive than yesterday',
      };
    }
  }
  if (scan.zones?.length) {
    const ranked: SkinZone[] = [...scan.zones]
      .filter((z) => z.status !== 'calm')
      .sort((a, b) => {
        const order = { active: 0, monitor: 1, calm: 2 } as const;
        return order[a.status] - order[b.status];
      });
    const top = ranked[0];
    if (top) {
      return {
        area: `${top.label} area`,
        observation: `${top.label} appears more reactive than yesterday`,
      };
    }
  }
  if (scan.concerns?.length) {
    const top = scan.concerns[0];
    return {
      area: top.region || 'Active area',
      observation: top.finding ?? 'Some areas appear more reactive than yesterday',
    };
  }
  return {
    area: 'Active area',
    observation: 'Some areas appear more reactive than yesterday',
  };
}

function prettyRegion(region: string): string {
  switch (region) {
    case 'chin':
      return 'Chin';
    case 'forehead':
      return 'Forehead';
    case 'tZone':
    case 't_zone':
      return 'T-zone';
    case 'cheeks':
      return 'Cheeks';
    case 'nose':
      return 'Nose';
    case 'jawline':
      return 'Jawline';
    default:
      return region
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

// ---------------------------------------------------------------------------
// Adjustment builders
// ---------------------------------------------------------------------------

function buildAdjustmentsFromOwned(
  owned: Product[]
): { held: ProductAdjustment[]; usedOwned: boolean } {
  const held: ProductAdjustment[] = [];
  for (const fingerprint of HELD_RISK_FINGERPRINTS) {
    const match = owned.find(
      (p) =>
        p.id === fingerprint.productId ||
        fingerprint.match(p)
    );
    if (match) {
      held.push({
        productId: match.id,
        productName: `${match.brand} — ${match.name}`.replace(/^—\s*/, ''),
        category: fingerprint.category,
        status: 'HELD_TONIGHT',
        reason: fingerprint.reason,
        kind: 'OWNED_PRODUCT',
      });
    }
  }
  return { held, usedOwned: held.length > 0 };
}

function buildPrioritizedAdjustmentFromOwned(
  owned: Product[]
): ProductAdjustment | null {
  for (const id of PRIORITIZED_BARRIER_PRODUCTS) {
    const match = owned.find((p) => p.id === id);
    if (match) {
      return {
        productId: match.id,
        productName: cleanProductName(match),
        category: 'Barrier support',
        status: 'PRIORITIZED_TONIGHT',
        reason: 'Prioritize tonight · Barrier support',
        kind: 'OWNED_PRODUCT',
      };
    }
  }
  // Fall back: any moisturizer the user owns becomes the barrier pick.
  const moisturizer = owned.find((p) => p.category === 'moisturizer');
  if (moisturizer) {
    return {
      productId: moisturizer.id,
      productName: cleanProductName(moisturizer),
      category: 'Barrier support',
      status: 'PRIORITIZED_TONIGHT',
      reason: 'Prioritize tonight · Barrier support',
      kind: 'OWNED_PRODUCT',
    };
  }
  return null;
}

function cleanProductName(p: Product): string {
  const brand = (p.brand ?? '').trim();
  const name = (p.name ?? '').trim();
  if (!brand || brand.toLowerCase() === name.toLowerCase()) return name;
  return `${brand} ${name}`;
}

function fixtureAdjustments(): ProductAdjustment[] {
  return [
    {
      productId: DEMO_RECOVERY_FIXTURE.hold[0].productId,
      productName: DEMO_RECOVERY_FIXTURE.hold[0].productName,
      category: DEMO_RECOVERY_FIXTURE.hold[0].category,
      status: 'HELD_TONIGHT',
      reason: DEMO_RECOVERY_FIXTURE.hold[0].reason,
      kind: 'CATEGORY_FALLBACK',
    },
    {
      productId: DEMO_RECOVERY_FIXTURE.hold[1].productId,
      productName: DEMO_RECOVERY_FIXTURE.hold[1].productName,
      category: DEMO_RECOVERY_FIXTURE.hold[1].category,
      status: 'HELD_TONIGHT',
      reason: DEMO_RECOVERY_FIXTURE.hold[1].reason,
      kind: 'CATEGORY_FALLBACK',
    },
    {
      productId: DEMO_RECOVERY_FIXTURE.prioritize.productId,
      productName: DEMO_RECOVERY_FIXTURE.prioritize.productName,
      category: DEMO_RECOVERY_FIXTURE.prioritize.category,
      status: 'PRIORITIZED_TONIGHT',
      reason: DEMO_RECOVERY_FIXTURE.prioritize.reason,
      kind: 'CATEGORY_FALLBACK',
    },
  ];
}

/**
 * Build the Recovery-night adjustments list using owned products when
 * available, falling back to the canonical demo fixture so the UI never
 * lies about ownership and the experience remains testable end-to-end.
 */
function buildRecoveryAdjustments(owned: Product[]): ProductAdjustment[] {
  const ownedResult = buildAdjustmentsFromOwned(owned);
  if (ownedResult.held.length >= 1) {
    // Pad to 2 held adjustments using categorical fallbacks if needed.
    const held: ProductAdjustment[] = [...ownedResult.held];
    if (held.length === 1) {
      const fallback = DEMO_RECOVERY_FIXTURE.hold.find(
        (f) => !held.some((h) => h.category === f.category)
      );
      if (fallback) {
        held.push({
          productId: fallback.productId,
          productName: fallback.productName,
          category: fallback.category,
          status: 'HELD_TONIGHT',
          reason: fallback.reason,
          kind: 'CATEGORY_FALLBACK',
        });
      }
    }
    const prioritized =
      buildPrioritizedAdjustmentFromOwned(owned) ?? {
        productId: DEMO_RECOVERY_FIXTURE.prioritize.productId,
        productName: DEMO_RECOVERY_FIXTURE.prioritize.productName,
        category: DEMO_RECOVERY_FIXTURE.prioritize.category,
        status: 'PRIORITIZED_TONIGHT' as ProductDecisionStatus,
        reason: DEMO_RECOVERY_FIXTURE.prioritize.reason,
        kind: 'CATEGORY_FALLBACK' as AdjustmentKind,
      };
    return [...held.slice(0, 2), prioritized];
  }
  return fixtureAdjustments();
}

// ---------------------------------------------------------------------------
// Decision derivation
// ---------------------------------------------------------------------------

interface DeriveInput {
  scans: Scan[];
  ownedProductIds: string[];
  userSensation: UserSensation;
  decisionStateOverride: DecisionState | null;
  /**
   * Demo trigger. When `true` and a scan is present, a Recovery night is
   * surfaced even when the deterministic computation would land on
   * Standard. The redesign requires the four interactive states to be
   * reachable in real UI — this flag lets that happen without inventing
   * scan data. False by default.
   */
  forceRecoveryDemo?: boolean;
  applied: boolean;
  appliedAt: string | null;
}

function ownedProductsFromIds(ids: string[]): Product[] {
  const out: Product[] = [];
  for (const id of ids) {
    const p = seedProducts.find((s) => s.id === id);
    if (p) out.push(p);
  }
  return out;
}

function buildScanObservation(scans: Scan[]): ScanObservation | null {
  if (scans.length === 0) return null;
  const latest = scans[scans.length - 1];
  const previous = scans.length >= 2 ? scans[scans.length - 2] : undefined;
  const delta = previous
    ? Math.round((latest.overallScore ?? 0) - (previous.overallScore ?? 0))
    : 0;
  const { area } = pickKeyArea(latest);
  const ageH = getScanAgeHours(latest);
  // Observation copy is direction-aware — never claim "more reactive" when
  // the scan is unchanged or improving.
  const changeSummary = !previous
    ? `${area} was scanned today`
    : delta <= -3
      ? `${area} appears more reactive than yesterday`
      : delta >= 3
        ? `${area} appears calmer than yesterday`
        : `${area} looks about the same as yesterday`;
  const areaChangeLabel =
    delta <= -3 ? 'Irritation increased' :
    delta >= 3  ? 'Skin calming' : 'Skin status';
  return {
    latestScanAt: latest.capturedAt,
    latestScanLabel: formatScanLabel(latest.capturedAt),
    skinScore: Math.max(0, Math.min(100, Math.round(latest.overallScore ?? 0))),
    scoreDeltaFromPrevious: delta,
    keyArea: area,
    changeSummary,
    comparisonSummary: previous
      ? 'Compared with yesterday'
      : 'No previous scan to compare against',
    hasRecentScan: true,
    hasPreviousScan: !!previous,
    areaChangeLabel,
    scanAgeHours: ageH,
  };
}

/**
 * Classify tonight's state — the brain of the Decision Room.
 *
 * Order of precedence:
 *   1. explicit RESET override (from "stings or burns" report)
 *   2. user sensation = STINGS_OR_BURNS → RESET
 *   3. no scan ever → CHECK_IN_REQUIRED
 *   4. forceRecoveryDemo flag → RECOVERY
 *   5. scan delta ≤ -3 OR active irritation flag in store → RECOVERY
 *   6. otherwise → STANDARD
 *
 * TREATMENT_NIGHT is reserved for an explicit user-scheduled active and
 * stable skin — we don't ship a calendar here, so this state is reachable
 * only via explicit override (kept available so future scheduling code
 * can wire to it).
 */
function classifyDecisionState(input: DeriveInput): DecisionState {
  if (input.decisionStateOverride) return input.decisionStateOverride;
  if (input.userSensation === 'STINGS_OR_BURNS') return 'RESET_NIGHT';

  if (input.scans.length === 0) return 'CHECK_IN_REQUIRED';

  if (input.forceRecoveryDemo) return 'RECOVERY_NIGHT';

  const observation = buildScanObservation(input.scans);
  if (observation && observation.hasPreviousScan) {
    if (deltaIsRiskier(observation.scoreDeltaFromPrevious)) {
      return 'RECOVERY_NIGHT';
    }
  }

  return 'STANDARD_NIGHT';
}

// ---------------------------------------------------------------------------
// Copy builders per state
// ---------------------------------------------------------------------------

const COPY = {
  RECOVERY_NIGHT: {
    title: 'Recovery night',
    decisionStatement: 'Skip exfoliation and retinoid tonight.',
    explanation:
      'Your chin area looks more irritated than yesterday. Because your routine included an active treatment recently, tonight should focus on calming and protecting your skin.',
  },
  STANDARD_NIGHT: {
    title: 'Standard night',
    decisionStatement: 'Stay consistent tonight.',
    explanation:
      'Your skin appears stable compared with your previous scan. Keep your usual evening routine unless something feels different.',
  },
  TREATMENT_NIGHT: {
    title: 'Treatment night',
    decisionStatement: 'Your planned active is appropriate tonight.',
    explanation:
      'Your skin appears stable and the active you scheduled is a reasonable fit. Apply it after a gentle cleanse and follow with moisturizer.',
  },
  RESET_NIGHT: {
    title: 'Reset night',
    decisionStatement: 'Stop active products tonight.',
    explanation:
      'Burning can mean your skin is reacting poorly to something in your routine. Do not apply exfoliating acids, retinoids, or new treatment products tonight.',
  },
  CHECK_IN_REQUIRED: {
    title: 'One detail needed',
    decisionStatement: 'Tell me how your skin feels before I change tonight’s routine.',
    explanation:
      'A scan makes tonight’s guidance personal. Start a scan to get guidance based on what your skin looks like today.',
  },
} as const;

// ---------------------------------------------------------------------------
// Public derivation entry points
// ---------------------------------------------------------------------------

function dynamicChinExplanation(observation: ScanObservation | null): string {
  if (!observation) return COPY.RECOVERY_NIGHT.explanation;
  // Use the pre-computed changeSummary — it is already direction-aware and
  // starts with "[Area] appears …", so we just capitalise and append context.
  const firstSentence =
    observation.changeSummary.charAt(0).toUpperCase() +
    observation.changeSummary.slice(1);
  return `${firstSentence}. Because your routine included an active treatment recently, tonight should focus on calming and protecting your skin.`;
}

export function deriveTonightDecision(input: DeriveInput): TonightDecision {
  const state = classifyDecisionState(input);
  const observation = buildScanObservation(input.scans);
  const owned = ownedProductsFromIds(input.ownedProductIds);

  let adjustments: ProductAdjustment[] = [];
  if (state === 'RECOVERY_NIGHT' || state === 'RESET_NIGHT') {
    adjustments = buildRecoveryAdjustments(owned);
    if (state === 'RESET_NIGHT') {
      // Mark all holds as AVOID_UNTIL_RECHECK so the row treatment can
      // shift slightly (reset is more decisive than recovery).
      adjustments = adjustments.map((a) =>
        a.status === 'HELD_TONIGHT'
          ? { ...a, status: 'AVOID_UNTIL_RECHECK', reason: 'Avoid until recheck · ' + a.category }
          : a
      );
    }
  } else if (state === 'STANDARD_NIGHT') {
    adjustments = [];
  } else if (state === 'TREATMENT_NIGHT') {
    adjustments = [];
  } else if (state === 'CHECK_IN_REQUIRED') {
    adjustments = [];
  }

  const explanation =
    state === 'RECOVERY_NIGHT'
      ? dynamicChinExplanation(observation)
      : COPY[state].explanation;

  const provenance: ProvenanceFlags = {
    usedLatestScan: !!observation,
    usedPreviousScan: !!observation?.hasPreviousScan,
    usedRoutine: owned.length > 0,
    usedIngredientCheck: owned.length > 0,
    usedUserReport: input.userSensation !== null,
  };

  return {
    state,
    title: COPY[state].title,
    decisionStatement: COPY[state].decisionStatement,
    explanation,
    scanObservation: observation,
    adjustments,
    basedOn: buildProvenanceLines(provenance),
    provenance,
    applied: input.applied,
    appliedAt: input.appliedAt,
    appliesToTonightOnly: true,
    userSensation: input.userSensation,
    eyebrowLabel: computeDecisionEyebrow(input.scans),
  };
}

function buildProvenanceLines(p: ProvenanceFlags): string[] {
  const items: string[] = [];
  if (p.usedLatestScan) items.push('Today’s scan');
  if (p.usedPreviousScan) items.push('Previous-scan comparison');
  if (p.usedRoutine) items.push('Evening routine');
  if (p.usedIngredientCheck) items.push('Ingredient check');
  if (p.usedUserReport) items.push('Your latest report');
  return items;
}

// ---------------------------------------------------------------------------
// Live hook — reads the store, wraps it as a TonightDecision.
// ---------------------------------------------------------------------------

/**
 * Live hook. The Decision Room reads this; nothing else recomputes the
 * decision from raw scans.
 */
export function useTonightDecision(): TonightDecision {
  const scans = useAppStore((s) => s.scans);
  const morning = useAppStore((s) => s.userRoutineMorning);
  const evening = useAppStore((s) => s.userRoutineEvening);
  const wishlist = useAppStore((s) => s.wishlist);
  const userSensation = useAppStore((s) => s.tonightUserSensation);
  const decisionStateOverride = useAppStore((s) => s.tonightDecisionOverride);
  const applied = useAppStore((s) => s.tonightDecisionApplied);
  const appliedAt = useAppStore((s) => s.tonightDecisionAppliedAt);

  return useMemo(() => {
    const ownedProductIds = Array.from(new Set([...morning, ...evening, ...wishlist]));
    // If the apply stamp is from before today's 4AM rollover, treat the
    // decision as not-yet-applied for this new evening cycle.
    const effectiveApplied = applied && !isAppliedStale(appliedAt);
    return deriveTonightDecision({
      scans,
      ownedProductIds,
      userSensation,
      decisionStateOverride,
      forceRecoveryDemo: false,
      applied: effectiveApplied,
      appliedAt: effectiveApplied ? appliedAt : null,
    });
  }, [
    scans,
    morning,
    evening,
    wishlist,
    userSensation,
    decisionStateOverride,
    applied,
    appliedAt,
  ]);
}

/**
 * Returns true when the morning-after window is open (≥6h since
 * applied, ≤24h since applied) and the user has not yet responded.
 */
export function useMorningAfterPromptVisible(): boolean {
  const applied = useAppStore((s) => s.tonightDecisionApplied);
  const appliedAt = useAppStore((s) => s.tonightDecisionAppliedAt);
  const feedback = useAppStore((s) => s.morningAfterFeedback);

  return useMemo(() => {
    if (!applied || !appliedAt) return false;
    if (feedback) return false;
    const then = new Date(appliedAt).getTime();
    if (Number.isNaN(then)) return false;
    const elapsed = Date.now() - then;
    // The window opens 6h after apply and closes 36h after to keep the
    // morning-after prompt feeling specific to the night just past.
    return elapsed >= 6 * 60 * 60 * 1000 && elapsed <= 36 * 60 * 60 * 1000;
  }, [applied, appliedAt, feedback]);
}
