/**
 * Skin Edit — canonical recommendation/decision model (v27).
 *
 * The Products tab is no longer a generic catalog. It is "The Skin Edit":
 * a deterministic, scan-driven recommendation surface that makes ONE
 * defensible decision about what belongs on the user's skin tonight,
 * and is honest enough to defer products that are excellent — just not
 * right yet.
 *
 * This module is the canonical contract every Skin Edit / Verdict-page
 * surface reads from. Per CLAUDE.md and the project's "no patch loops"
 * rule, screens must NEVER assemble recommendation logic inline; they
 * select from these typed objects.
 *
 * Pipeline:
 *   buildSkinSnapshot(scans, store) → SkinSnapshot
 *   buildRoutineState(store)        → RoutineState
 *   buildSkinEdit(snapshot, routine, lens?) → SkinEdit
 *
 * The SkinEdit object carries:
 *   • primaryRecommendation         (the hero — "right now")
 *   • honestyInterruption           (the "excellent later" deferral)
 *   • priorities                    (tonight's ranked decisions)
 *   • modes                         (use_tonight / add_next / keep_gentle / skip)
 *   • timeline                      (84-day phased plan)
 *   • compareConclusion             (which product earns tonight)
 *
 * Per-product detail is resolved with:
 *   buildProductRecommendation(productId, snapshot, routine) → Recommendation
 *
 * Every selector is pure and side-effect-free. No store imports; callers
 * pass the slice they want.
 */

import type {
  Concern,
  ConcernCategory,
  Product,
  Scan,
} from '@/types';
import { seedProducts } from '@/data/seed';
import { getConcerns } from '@/utils/concerns';

// ============================================================================
// Lens — what the user is prioritising right now.
// ============================================================================

/**
 * The "decision lens" governs how the engine ranks. It is set from the
 * Decision Lens bottom sheet or, by default, derived from the latest scan.
 */
export type SkinEditLens =
  | 'auto_from_scan'
  | 'target_active_breakouts'
  | 'fade_marks_gently'
  | 'fastest_improvement'
  | 'gentlest_routine'
  | 'lowest_cost'
  | 'fewest_products';

export interface DecisionLens {
  priority: SkinEditLens;
  avoid: {
    strongActives: boolean;
    fragrance: boolean;
    over25: boolean;
    duplicateIngredients: boolean;
    routineConflicts: boolean;
  };
  routineFit: {
    onlySafeNow: boolean;
    hideOwned: boolean;
    lowIrritation: boolean;
  };
}

export const DEFAULT_LENS: DecisionLens = {
  priority: 'auto_from_scan',
  avoid: {
    strongActives: false,
    fragrance: false,
    over25: false,
    duplicateIngredients: false,
    routineConflicts: false,
  },
  routineFit: {
    onlySafeNow: false,
    hideOwned: false,
    lowIrritation: false,
  },
};

// ============================================================================
// SkinSnapshot — derived from the latest scan + concerns.
// ============================================================================

export type BarrierState = 'stable' | 'watch' | 'compromised';
export type ActivityLevel = 'active' | 'emerging' | 'calm';

export interface SkinSnapshot {
  /** Scan ISO timestamp (or null when no scan exists). */
  capturedAt: string | null;
  /** Pretty-printed time like "8:42 PM" used in the header label. */
  capturedAtLabel: string;
  /** Ordered concerns (top concern first). */
  concerns: Concern[];
  /** Top concern category (drives the editorial statement). */
  primaryConcern: ConcernCategory | null;
  /** Secondary concern (drives the honesty card pairing). */
  secondaryConcern: ConcernCategory | null;
  /** Plain-English region of the primary concern ("chin", "cheeks"...). */
  primaryRegion: string;
  /** Activity level of primary concern. */
  activity: ActivityLevel;
  /** Barrier state — read from severity of dryness/sensitivity-adjacent signals. */
  barrier: BarrierState;
  /** Whether early post-blemish marks were detected (drives "marks emerging"). */
  marksEmerging: boolean;
  /** Three evidence markers shown under the editorial statement. */
  markers: Array<{ label: string; value: string; emphasised: boolean }>;
  /** One-sentence editorial statement for the hero. */
  editorialStatement: string;
  /** Supporting paragraph for the statement. */
  editorialExplanation: string;
}

const TIME_FALLBACK = '8:42 PM';

function formatTimeOf(iso: string | null): string {
  if (!iso) return TIME_FALLBACK;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return TIME_FALLBACK;
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${suffix}`;
  } catch {
    return TIME_FALLBACK;
  }
}

function severityScore(c: Concern): number {
  switch (c.severity) {
    case 'needs-attention':
      return 3;
    case 'moderate':
      return 2;
    case 'mild':
      return 1;
    case 'calm':
    default:
      return 0;
  }
}

/**
 * Build the SkinSnapshot from the latest scan plus the prior scan
 * (used by `getConcerns` to compute trends). Fully deterministic.
 *
 * When no scan exists, returns a sensible default scenario matching
 * the v27 master spec (active-looking chin breakouts + emerging
 * marks + stable barrier) so the page never displays an empty
 * editorial statement. This is the only "demo" path; per CLAUDE.md
 * never shipped as live AI output.
 */
export function buildSkinSnapshot(scans: Scan[]): SkinSnapshot {
  const latest = scans[scans.length - 1];
  if (!latest) {
    return defaultSnapshot();
  }
  const previous = scans.length >= 2 ? scans[scans.length - 2] : undefined;
  const concerns = getConcerns(latest, previous);
  const ranked = [...concerns].sort((a, b) => severityScore(b) - severityScore(a));
  const primary = ranked.find((c) => c.severity !== 'calm') ?? ranked[0] ?? null;
  const secondary =
    ranked.find((c) => c !== primary && c.severity !== 'calm') ??
    ranked.find((c) => c !== primary) ??
    null;

  // Marks emerging — if there's any moderate+ tone concern OR a chin/
  // jawline breakout that is improving (it leaves marks behind).
  const marksEmerging = ranked.some(
    (c) =>
      (c.category === 'tone' && severityScore(c) >= 1) ||
      (c.category === 'breakouts' && c.trend === 'improved')
  );

  const barrier: BarrierState = ranked.some(
    (c) => c.category === 'hydration' && severityScore(c) >= 2
  )
    ? 'watch'
    : 'stable';

  const activity: ActivityLevel = primary
    ? severityScore(primary) >= 2
      ? 'active'
      : severityScore(primary) === 1
      ? 'emerging'
      : 'calm'
    : 'calm';

  const markers = [
    {
      label: 'ACTIVE AREAS',
      value: primary ? primary.region.toUpperCase() : '—',
      emphasised: activity === 'active',
    },
    {
      label: 'MARKS',
      value: marksEmerging ? 'EMERGING' : 'CLEAR',
      emphasised: false,
    },
    {
      label: 'BARRIER',
      value: barrier === 'stable' ? 'STABLE' : barrier === 'watch' ? 'WATCH' : 'STRESSED',
      emphasised: barrier !== 'stable',
    },
  ];

  return {
    capturedAt: latest.capturedAt,
    capturedAtLabel: formatTimeOf(latest.capturedAt),
    concerns: ranked,
    primaryConcern: primary?.category ?? null,
    secondaryConcern: secondary?.category ?? null,
    primaryRegion: primary?.region ?? 'face',
    activity,
    barrier,
    marksEmerging,
    markers,
    editorialStatement: editorialStatementFor(primary, barrier, marksEmerging),
    editorialExplanation: editorialExplanationFor(primary, barrier, marksEmerging),
  };
}

function defaultSnapshot(): SkinSnapshot {
  // Default scenario per the v27 master spec. Used only pre-scan.
  return {
    capturedAt: null,
    capturedAtLabel: TIME_FALLBACK,
    concerns: [],
    primaryConcern: 'breakouts',
    secondaryConcern: 'tone',
    primaryRegion: 'chin',
    activity: 'active',
    barrier: 'stable',
    marksEmerging: true,
    markers: [
      { label: 'ACTIVE AREAS', value: 'CHIN', emphasised: true },
      { label: 'MARKS', value: 'EMERGING', emphasised: false },
      { label: 'BARRIER', value: 'STABLE', emphasised: false },
    ],
    editorialStatement: 'Tonight, your skin needs calm before correction.',
    editorialExplanation:
      'Your chin shows active-looking breakouts with early post-blemish marks. Start by controlling irritation, then treat tone.',
  };
}

function editorialStatementFor(
  primary: Concern | null,
  barrier: BarrierState,
  marksEmerging: boolean
): string {
  if (!primary) {
    return 'Tonight, hold steady. Your skin is reading calm.';
  }
  if (barrier !== 'stable') {
    return 'Tonight, the barrier comes before the treatment.';
  }
  switch (primary.category) {
    case 'breakouts':
      return marksEmerging
        ? 'Tonight, your skin needs calm before correction.'
        : 'Tonight, tackle the active areas first.';
    case 'tone':
      return 'Tonight, support the marks without overdoing it.';
    case 'hydration':
      return 'Tonight, restore comfort before adding anything new.';
    case 'texture':
      return 'Tonight, smooth the surface — gently.';
  }
}

function editorialExplanationFor(
  primary: Concern | null,
  barrier: BarrierState,
  marksEmerging: boolean
): string {
  if (!primary) {
    return 'No concern is pulling priority tonight. Keep the routine simple and protective.';
  }
  if (barrier !== 'stable') {
    return 'Your skin is reading dehydrated or reactive. Pause strong actives and rebuild comfort before introducing more.';
  }
  const region = primary.region;
  switch (primary.category) {
    case 'breakouts':
      return marksEmerging
        ? `Your ${region} shows active-looking breakouts with early post-blemish marks. Start by controlling irritation, then treat tone.`
        : `Your ${region} shows active-looking breakouts. Treat the cause tonight; everything else can wait.`;
    case 'tone':
      return `Visible marks remain on your ${region}. Pura's selection tonight supports fading without pushing the barrier.`;
    case 'hydration':
      return `Your ${region} is reading dehydrated. Build comfort tonight before adding correction.`;
    case 'texture':
      return `Uneven surface on your ${region}. A gentle resurfacing step is the right next move — paired with a moisturizer that holds water in.`;
  }
}

// ============================================================================
// RoutineState — what the user already owns/uses.
// ============================================================================

export interface RoutineState {
  morningIds: string[];
  eveningIds: string[];
  ownedIds: string[];
  savedIds: string[];
  /** Inferred role coverage: a Set of categories already filled. */
  coveredCategories: Set<string>;
}

export function buildRoutineState(args: {
  userRoutineMorning?: string[];
  userRoutineEvening?: string[];
  wishlist?: string[];
}): RoutineState {
  const morning = args.userRoutineMorning ?? [];
  const evening = args.userRoutineEvening ?? [];
  const owned = Array.from(new Set([...morning, ...evening]));
  const covered = new Set<string>();
  for (const id of owned) {
    const p = seedProducts.find((sp) => sp.id === id);
    if (p) covered.add(p.category);
  }
  return {
    morningIds: morning,
    eveningIds: evening,
    ownedIds: owned,
    savedIds: args.wishlist ?? [],
    coveredCategories: covered,
  };
}

// ============================================================================
// Recommendation states — Pura's six possible decisions.
// ============================================================================

export type RecommendationState =
  | 'treat_now'
  | 'add_next'
  | 'gentle_support'
  | 'already_covered'
  | 'pause_for_now'
  | 'not_primary_concern';

export const RECOMMENDATION_STATE_LABEL: Record<RecommendationState, string> = {
  treat_now: 'Treat now',
  add_next: 'Add next',
  gentle_support: 'Gentle support',
  already_covered: 'Already covered',
  pause_for_now: 'Pause for now',
  not_primary_concern: 'Not first tonight',
};

export type ProductPhase = 'now' | 'next' | 'maintain' | 'pause';

export const PHASE_LABEL: Record<ProductPhase, string> = {
  now: 'Days 1–14',
  next: 'Days 15–42',
  maintain: 'Days 43–84',
  pause: 'On pause',
};

// ============================================================================
// Edit modes — the segmented control under "The Edit".
// ============================================================================

export type EditMode = 'use_tonight' | 'add_next' | 'keep_gentle' | 'skip';

export const EDIT_MODE_META: Array<{ key: EditMode; label: string; description: string }> = [
  { key: 'use_tonight', label: 'Use tonight', description: 'Right now, in your routine.' },
  { key: 'add_next', label: 'Add next', description: 'Excellent later, not first.' },
  { key: 'keep_gentle', label: 'Keep gentle', description: 'Quiet support steps.' },
  { key: 'skip', label: 'Skip for now', description: 'Not worth adding tonight.' },
];

// ============================================================================
// Recommendation — Pura's verdict for a single product.
// ============================================================================

export type CTAKind =
  | 'add_to_tonight'
  | 'save_for_phase_two'
  | 'add_gentle_support'
  | 'review_conflict'
  | 'compare_with_own'
  | 'view_better_match';

export interface AdaptiveCTA {
  kind: CTAKind;
  primaryLabel: string;
  secondaryLabel: string;
}

export type IrritationRisk = 'low' | 'low_medium' | 'medium' | 'high';
export type CompatibilityStatus = 'safe_now' | 'introduce_gradually' | 'conflict' | 'already_covered';

export interface VerdictCell {
  label: string;
  value: string;
}

export interface Recommendation {
  productId: string;
  product: Product;
  state: RecommendationState;
  phase: ProductPhase;

  /** Single editorial headline (e.g. "Not first tonight. Excellent later."). */
  judgmentHeadline: string;
  judgmentExplanation: string;

  /** Verdict card content. */
  verdictHeadline: string;
  verdictBody: string;
  verdictCells: VerdictCell[];

  /** Linked-to-scan explanation tied to the user's snapshot. */
  scanRelation: string;

  /** Routine placement strip (e.g. "Cleanser → This serum → Moisturizer"). */
  routinePathway: string[];
  routinePathwayActiveIndex: number;

  /** Start frequency + safety notes. */
  startFrequency: string;
  increaseIf: string;
  avoidWith: string;

  /** Compatibility module rows. */
  compatibility: CompatibilityStatus;
  compatibilityRows: Array<{ label: string; value: string; isWarning?: boolean }>;
  irritationRisk: IrritationRisk;

  /** Worth-buying judgment. */
  buyIf: string[];
  skipIf: string[];
  buyVerdict: string;

  /** Hero ingredient explanations (max 4). */
  ingredientPurpose: Array<{ name: string; purpose: string }>;

  /** Alternatives as tradeoffs. */
  alternatives: Array<{
    productId: string;
    product: Product;
    purposeLabel: string;
    reason: string;
    state: RecommendationState;
  }>;

  /** Adaptive CTA pair. */
  cta: AdaptiveCTA;

  /** Confidence score (0–100). Decorative only — never the primary message. */
  relevanceScore: number;
  relevanceLabel: string;

  /** Concise reason for cards / tiles. */
  shortReason: string;

  /** Comparison-conclusion label when this is the pick. */
  isPick: boolean;
}

// ============================================================================
// SkinEdit — the full editorial page object.
// ============================================================================

export interface PriorityRow {
  rank: number;
  title: string;
  detail: string;
}

export interface PlanPhase {
  phase: ProductPhase;
  daysLabel: string;
  title: string;
  body: string;
  productIds: string[];
}

export interface ConcernExploreOption {
  key: ConcernCategory | 'barrier' | 'spf';
  label: string;
}

export interface SkinEdit {
  snapshot: SkinSnapshot;
  routine: RoutineState;
  lens: DecisionLens;

  /** The hero recommendation. Always returned. */
  primaryRecommendation: Recommendation;
  /** The "excellent later" deferral. Optional — null only when the
   *  primary IS the discoloration kind of product. */
  honestyInterruption: Recommendation | null;
  /** Tonight's ranked priorities. */
  priorities: PriorityRow[];
  /** The Edit — products bucketed by mode. */
  modes: Record<EditMode, Recommendation[]>;
  /** 84-day product plan. */
  timeline: PlanPhase[];
  /** Concern chips for "Explore another concern". */
  concernOptions: ConcernExploreOption[];

  /** Comparison conclusion ("Pura's pick tonight: …"). */
  pickConclusion: { productId: string; reason: string };
}

// ============================================================================
// Product role catalogue.
// ============================================================================
//
// A tiny static metadata layer that maps every seed product onto its
// Skin Edit role. Kept centralized so component code never has to
// branch on product ids.

interface ProductRoleMeta {
  /** Highest-fit concern category. */
  primaryConcern: ConcernCategory | 'barrier' | 'spf';
  /** "Cleanse" / "Treat" / "Moisturize" / "Protect" — the routine step. */
  routineStep: 'cleanse' | 'tone' | 'treat' | 'moisturize' | 'protect';
  /** "AM" | "PM" | "Both". */
  timing: 'AM' | 'PM' | 'Both';
  /** Base irritation risk before user-specific factors. */
  baseRisk: IrritationRisk;
  /** Phase Pura would normally introduce this in. */
  phase: ProductPhase;
  /** Hero ingredient purpose entries. */
  heroPurpose?: Array<{ name: string; purpose: string }>;
}

const PRODUCT_ROLE: Record<string, ProductRoleMeta> = {
  'paulas-choice-2-bha': {
    primaryConcern: 'breakouts',
    routineStep: 'treat',
    timing: 'PM',
    baseRisk: 'medium',
    phase: 'now',
    heroPurpose: [
      { name: 'Salicylic Acid 2%', purpose: 'Dissolves the plug inside the pore itself — not just the surface.' },
      { name: 'Green Tea Extract', purpose: 'Settles the irritation that follows active-looking areas.' },
    ],
  },
  'good-molecules-discoloration': {
    primaryConcern: 'tone',
    routineStep: 'treat',
    timing: 'PM',
    baseRisk: 'low_medium',
    phase: 'next',
    heroPurpose: [
      { name: 'Tranexamic Acid', purpose: 'Supports the appearance of fading post-breakout discoloration.' },
      { name: 'Niacinamide', purpose: 'Supports more even-looking tone and helps manage visible oiliness.' },
    ],
  },
  'cerave-hydrating-cleanser': {
    primaryConcern: 'hydration',
    routineStep: 'cleanse',
    timing: 'Both',
    baseRisk: 'low',
    phase: 'now',
    heroPurpose: [
      { name: 'Ceramides 1, 3, 6-II', purpose: 'Reinforce the lipid bilayer that holds water in.' },
      { name: 'Hyaluronic Acid', purpose: 'Pulls moisture back into the surface as you rinse.' },
    ],
  },
  'cerave-pm-lotion': {
    primaryConcern: 'barrier',
    routineStep: 'moisturize',
    timing: 'PM',
    baseRisk: 'low',
    phase: 'now',
  },
  'la-roche-posay-toleriane-dd': {
    primaryConcern: 'barrier',
    routineStep: 'moisturize',
    timing: 'Both',
    baseRisk: 'low',
    phase: 'now',
  },
  'kiehls-ultra-facial-cream': {
    primaryConcern: 'hydration',
    routineStep: 'moisturize',
    timing: 'Both',
    baseRisk: 'low',
    phase: 'maintain',
  },
  'la-roche-posay-toleriane-cleanser': {
    primaryConcern: 'barrier',
    routineStep: 'cleanse',
    timing: 'Both',
    baseRisk: 'low',
    phase: 'now',
  },
  'the-ordinary-niacinamide': {
    primaryConcern: 'tone',
    routineStep: 'treat',
    timing: 'AM',
    baseRisk: 'low',
    phase: 'next',
  },
  'elf-vitamin-c-serum': {
    primaryConcern: 'tone',
    routineStep: 'treat',
    timing: 'AM',
    baseRisk: 'low',
    phase: 'next',
  },
  'anua-heartleaf-toner': {
    primaryConcern: 'barrier',
    routineStep: 'tone',
    timing: 'Both',
    baseRisk: 'low',
    phase: 'now',
  },
  'beauty-of-joseon-relief-sun': {
    primaryConcern: 'spf',
    routineStep: 'protect',
    timing: 'AM',
    baseRisk: 'low',
    phase: 'now',
  },
  'supergoop-unseen': {
    primaryConcern: 'spf',
    routineStep: 'protect',
    timing: 'AM',
    baseRisk: 'low',
    phase: 'now',
  },
  'the-ordinary-retinal': {
    primaryConcern: 'texture',
    routineStep: 'treat',
    timing: 'PM',
    baseRisk: 'medium',
    phase: 'maintain',
  },
  'the-ordinary-lactic-acid': {
    primaryConcern: 'texture',
    routineStep: 'treat',
    timing: 'PM',
    baseRisk: 'low_medium',
    phase: 'next',
  },
  'paulas-choice-azelaic': {
    primaryConcern: 'tone',
    routineStep: 'treat',
    timing: 'PM',
    baseRisk: 'low_medium',
    phase: 'next',
  },
  'cosrx-snail-essence': {
    primaryConcern: 'barrier',
    routineStep: 'tone',
    timing: 'Both',
    baseRisk: 'low',
    phase: 'now',
  },
  'illiyoon-ceramide-cream': {
    primaryConcern: 'barrier',
    routineStep: 'moisturize',
    timing: 'PM',
    baseRisk: 'low',
    phase: 'maintain',
  },
  'beauty-of-joseon-ginseng-cleanser': {
    primaryConcern: 'breakouts',
    routineStep: 'cleanse',
    timing: 'PM',
    baseRisk: 'low',
    phase: 'now',
  },
  'biotherm-skin-oxygen-toner': {
    primaryConcern: 'hydration',
    routineStep: 'tone',
    timing: 'Both',
    baseRisk: 'low',
    phase: 'maintain',
  },
  'its-skin-collagen-ampoule': {
    primaryConcern: 'hydration',
    routineStep: 'treat',
    timing: 'AM',
    baseRisk: 'low',
    phase: 'maintain',
  },
  'beauty-of-joseon-rice-mask': {
    primaryConcern: 'hydration',
    routineStep: 'cleanse',
    timing: 'PM',
    baseRisk: 'low',
    phase: 'maintain',
  },
  'its-skin-power-mask': {
    primaryConcern: 'tone',
    routineStep: 'treat',
    timing: 'PM',
    baseRisk: 'low',
    phase: 'maintain',
  },
  'bonajour-green-tea-sun': {
    primaryConcern: 'spf',
    routineStep: 'protect',
    timing: 'AM',
    baseRisk: 'low',
    phase: 'now',
  },
  'youth-to-the-people-kale': {
    primaryConcern: 'hydration',
    routineStep: 'cleanse',
    timing: 'AM',
    baseRisk: 'low',
    phase: 'maintain',
  },
};

function roleFor(id: string): ProductRoleMeta {
  return (
    PRODUCT_ROLE[id] ?? {
      primaryConcern: 'hydration',
      routineStep: 'treat',
      timing: 'PM',
      baseRisk: 'low_medium',
      phase: 'next',
    }
  );
}

// ============================================================================
// Recommendation builder.
// ============================================================================

function pathwayFor(role: ProductRoleMeta): { steps: string[]; active: number } {
  switch (role.routineStep) {
    case 'cleanse':
      return { steps: ['Cleanse', 'Tone', 'Moisturize'], active: 0 };
    case 'tone':
      return { steps: ['Cleanse', 'Tone', 'Moisturize'], active: 1 };
    case 'treat':
      return { steps: ['Cleanse', 'Treat tonight', 'Moisturize'], active: 1 };
    case 'moisturize':
      return { steps: ['Cleanse', 'Treat', 'Moisturize'], active: 2 };
    case 'protect':
      return { steps: ['Cleanse', 'Treat', 'Moisturize', 'SPF'], active: 3 };
  }
}

function riskLabel(r: IrritationRisk): string {
  switch (r) {
    case 'low':
      return 'Low';
    case 'low_medium':
      return 'Low–medium';
    case 'medium':
      return 'Medium';
    case 'high':
      return 'High';
  }
}

function determineState(
  product: Product,
  role: ProductRoleMeta,
  snapshot: SkinSnapshot,
  routine: RoutineState
): RecommendationState {
  if (routine.ownedIds.includes(product.id)) return 'already_covered';

  // Barrier compromised → anything aggressive pauses.
  if (snapshot.barrier !== 'stable' && role.baseRisk !== 'low') {
    return 'pause_for_now';
  }

  // Primary concern match → treat now (unless they already cover that role).
  if (
    snapshot.primaryConcern &&
    role.primaryConcern === snapshot.primaryConcern &&
    role.routineStep === 'treat'
  ) {
    const sameRoleOwned = Array.from(routine.coveredCategories).some(
      (c) => c === product.category
    );
    if (sameRoleOwned) return 'already_covered';
    return 'treat_now';
  }

  // Secondary concern → add next.
  if (snapshot.secondaryConcern && role.primaryConcern === snapshot.secondaryConcern) {
    return 'add_next';
  }

  // Mark fading products when primary is breakouts → add next.
  if (
    snapshot.primaryConcern === 'breakouts' &&
    role.primaryConcern === 'tone'
  ) {
    return 'add_next';
  }

  // Barrier / hydration / cleansing products → gentle support.
  if (
    role.primaryConcern === 'barrier' ||
    role.primaryConcern === 'hydration' ||
    role.routineStep === 'cleanse' ||
    role.routineStep === 'moisturize' ||
    role.routineStep === 'protect'
  ) {
    return 'gentle_support';
  }

  return 'not_primary_concern';
}

function phaseFor(role: ProductRoleMeta, state: RecommendationState): ProductPhase {
  if (state === 'treat_now' || state === 'gentle_support') return 'now';
  if (state === 'add_next') return 'next';
  if (state === 'pause_for_now') return 'pause';
  return role.phase;
}

function relevanceFor(
  state: RecommendationState,
  matchScore: number
): { score: number; label: string } {
  // Bias toward state so the label is honest. Live match score is a
  // light support, never the primary message.
  let base = matchScore || 70;
  switch (state) {
    case 'treat_now':
      base = Math.max(base, 92);
      return { score: base, label: 'High relevance for tonight' };
    case 'add_next':
      base = Math.max(base, 84);
      return { score: base, label: `${base}% relevance for the marks phase` };
    case 'gentle_support':
      base = Math.max(base, 80);
      return { score: base, label: 'Safe to layer alongside treatment' };
    case 'already_covered':
      return { score: base, label: 'Already covered by your routine' };
    case 'pause_for_now':
      return { score: base, label: 'On hold while skin recovers' };
    case 'not_primary_concern':
      return { score: base, label: `${base}% relevance — not first tonight` };
  }
}

function buildJudgment(
  state: RecommendationState,
  product: Product,
  snapshot: SkinSnapshot
): { headline: string; explanation: string } {
  switch (state) {
    case 'treat_now':
      return {
        headline: 'This is the right first step tonight.',
        explanation:
          `It directly addresses ${snapshot.activity === 'active' ? 'active-looking areas' : 'your top concern'} while fitting into your night routine with manageable irritation risk.`,
      };
    case 'add_next':
      return {
        headline: 'Not first tonight. Excellent later.',
        explanation: `Your scan currently prioritizes active-looking ${snapshot.primaryRegion} ${snapshot.primaryConcern === 'breakouts' ? 'breakouts' : 'concerns'}. This is better for ${product.category === 'serum' ? 'the marks they leave behind' : 'the next phase'} than for the immediate concern.`,
      };
    case 'gentle_support':
      return {
        headline: 'A quiet support step.',
        explanation: 'It supports comfort while active treatment is introduced — safe to use alongside what Pura picked tonight.',
      };
    case 'already_covered':
      return {
        headline: 'You already have this covered.',
        explanation:
          'Your routine already includes a product serving this exact role. Adding another is unlikely to improve tonight.',
      };
    case 'pause_for_now':
      return {
        headline: 'Pause this for now.',
        explanation: 'Your scan reads as reactive or compromised. Reintroduce this once comfort returns.',
      };
    case 'not_primary_concern':
      return {
        headline: 'Not first for what your skin needs.',
        explanation: `Tonight is about ${snapshot.primaryConcern ?? 'the immediate priority'}. This addresses something else — useful, just not first.`,
      };
  }
}

function buildVerdict(
  state: RecommendationState,
  product: Product,
  role: ProductRoleMeta,
  snapshot: SkinSnapshot
): { headline: string; body: string; cells: VerdictCell[] } {
  if (state === 'treat_now') {
    return {
      headline: snapshot.primaryConcern === 'breakouts'
        ? 'Treat active areas first.'
        : 'This earns the first spot tonight.',
      body:
        'This earns the first spot tonight because the immediate concern matters more right now than correcting the marks it may leave behind.',
      cells: [
        { label: 'Use for', value: snapshot.primaryConcern === 'breakouts' ? 'Active-looking breakouts' : snapshot.primaryConcern ?? 'Top concern' },
        { label: 'Start with', value: 'Two nights this week' },
        { label: 'Avoid with', value: 'Other exfoliating treatments tonight' },
        { label: 'Role', value: 'Primary treatment step' },
      ],
    };
  }
  if (state === 'add_next') {
    return {
      headline: 'Save for phase two.',
      body:
        'This is best for fading the marks left after blemishes. Your scan still shows active-looking areas, so use this as support after the immediate concern begins to settle.',
      cells: [
        { label: 'What it helps', value: 'Lingering post-breakout marks' },
        { label: 'Why not first', value: 'Active areas need attention before tone correction' },
        { label: 'When to add', value: 'After 7 calmer days or fewer active-looking spots' },
        { label: 'How it fits', value: `${role.timing === 'AM' ? 'Morning' : 'Night'} · Before moisturizer` },
      ],
    };
  }
  if (state === 'gentle_support') {
    return {
      headline: 'Use it as supportive comfort.',
      body: 'A calm layer that holds the barrier steady while the treatment step does its work. Safe across the routine.',
      cells: [
        { label: 'What it helps', value: 'Comfort and hydration' },
        { label: 'Risk level', value: riskLabel(role.baseRisk) },
        { label: 'When to use', value: role.timing === 'Both' ? 'AM or PM' : role.timing },
        { label: 'Role', value: role.routineStep === 'cleanse' ? 'Daily cleanse' : role.routineStep === 'moisturize' ? 'Daily moisturize' : 'Supportive layer' },
      ],
    };
  }
  if (state === 'already_covered') {
    return {
      headline: 'You already cover this role.',
      body: 'Adding another product in the same lane is unlikely to improve your routine. Compare with what you own before swapping.',
      cells: [
        { label: 'Same role as', value: 'A product already in your routine' },
        { label: 'Risk of stacking', value: 'Likely redundant' },
        { label: 'Better move', value: 'Compare before replacing' },
        { label: 'Status', value: 'Hold' },
      ],
    };
  }
  if (state === 'pause_for_now') {
    return {
      headline: 'Pause until comfort returns.',
      body: 'When the barrier is stressed, recovery outranks correction. Wait for the next calm scan before reintroducing this.',
      cells: [
        { label: 'Why pause', value: 'Reactive or compromised state' },
        { label: 'Reintroduce when', value: 'Skin reads stable for 7 nights' },
        { label: 'Risk level', value: riskLabel(role.baseRisk) },
        { label: 'Status', value: 'On hold' },
      ],
    };
  }
  return {
    headline: 'Useful — just not first.',
    body: 'This is a quality product for a different concern than tonight’s priority. Worth keeping in mind for a future phase.',
    cells: [
      { label: 'Best for', value: role.primaryConcern },
      { label: 'Risk level', value: riskLabel(role.baseRisk) },
      { label: 'When to consider', value: 'Once tonight’s priority settles' },
      { label: 'Status', value: 'Secondary' },
    ],
  };
}

function buildCompatibility(
  state: RecommendationState,
  role: ProductRoleMeta,
  snapshot: SkinSnapshot
): {
  status: CompatibilityStatus;
  rows: Array<{ label: string; value: string; isWarning?: boolean }>;
} {
  const rows: Array<{ label: string; value: string; isWarning?: boolean }> = [];
  let status: CompatibilityStatus = 'safe_now';
  if (state === 'already_covered') {
    status = 'already_covered';
    rows.push({ label: 'Current routine conflict', value: 'Same role already filled', isWarning: true });
    rows.push({ label: 'Better move', value: 'Compare with what you own' });
  } else if (state === 'pause_for_now') {
    status = 'conflict';
    rows.push({ label: 'Current routine conflict', value: 'Skin reading reactive', isWarning: true });
    rows.push({ label: 'Irritation risk', value: riskLabel(role.baseRisk), isWarning: true });
    rows.push({ label: 'Reintroduce', value: 'After 7 calmer nights' });
  } else if (state === 'treat_now') {
    status = 'introduce_gradually';
    rows.push({ label: 'Current routine conflict', value: 'None detected' });
    rows.push({ label: 'Irritation risk', value: riskLabel(role.baseRisk) });
    rows.push({ label: 'Active overlap', value: 'Avoid stacking with strong exfoliants' });
    rows.push({ label: 'Sensitive skin note', value: 'Patch test if reactive' });
  } else {
    rows.push({ label: 'Current routine conflict', value: 'None detected' });
    rows.push({ label: 'Irritation risk', value: riskLabel(role.baseRisk) });
    rows.push({ label: 'Sensitive skin note', value: 'Patch test first' });
    rows.push({
      label: 'Active overlap',
      value: state === 'add_next' ? 'Avoid stacking with strong exfoliants initially' : 'Safe to layer',
    });
  }
  return { status, rows };
}

function buildCTA(state: RecommendationState, price: number): AdaptiveCTA {
  const priceLabel = price > 0 ? ` · $${price}` : '';
  switch (state) {
    case 'treat_now':
      return {
        kind: 'add_to_tonight',
        primaryLabel: 'Add to tonight’s routine',
        secondaryLabel: `Buy${priceLabel}`,
      };
    case 'add_next':
      return {
        kind: 'save_for_phase_two',
        primaryLabel: 'Save for the marks phase',
        secondaryLabel: 'See what to use tonight',
      };
    case 'gentle_support':
      return {
        kind: 'add_gentle_support',
        primaryLabel: 'Add gentle support',
        secondaryLabel: `Buy${priceLabel}`,
      };
    case 'already_covered':
      return {
        kind: 'compare_with_own',
        primaryLabel: 'Compare with what I own',
        secondaryLabel: 'Do not add another',
      };
    case 'pause_for_now':
      return {
        kind: 'view_better_match',
        primaryLabel: 'View better match',
        secondaryLabel: 'Save for later',
      };
    case 'not_primary_concern':
      return {
        kind: 'save_for_phase_two',
        primaryLabel: 'Save for later',
        secondaryLabel: 'See tonight’s pick',
      };
  }
}

function shortReasonFor(
  state: RecommendationState,
  role: ProductRoleMeta,
  snapshot: SkinSnapshot
): string {
  switch (state) {
    case 'treat_now':
      return `For ${snapshot.primaryConcern === 'breakouts' ? 'active-looking breakouts' : 'tonight’s priority'}.`;
    case 'add_next':
      return `For ${role.primaryConcern === 'tone' ? 'marks once active areas settle' : 'the next phase'}.`;
    case 'gentle_support':
      return role.routineStep === 'cleanse'
        ? 'For cleansing without over-stripping.'
        : role.routineStep === 'moisturize'
        ? 'For comfort and barrier hold.'
        : 'For quiet daily support.';
    case 'already_covered':
      return 'You already own a product in this lane.';
    case 'pause_for_now':
      return 'On hold while skin recovers.';
    case 'not_primary_concern':
      return 'Useful — just not what tonight needs first.';
  }
}

function buildBuyJudgment(
  state: RecommendationState,
  role: ProductRoleMeta,
  snapshot: SkinSnapshot
): { buyIf: string[]; skipIf: string[]; verdict: string } {
  if (state === 'add_next') {
    return {
      buyIf: [
        'Dark marks after breakouts are one of your priorities.',
        'You want a gentle support product for your night routine.',
        'You do not already own a similar discoloration serum.',
      ],
      skipIf: [
        'Active pimples are the concern you want to solve first.',
        'Your skin currently feels raw, tight or irritated.',
        'You already own a product serving the same role.',
      ],
      verdict:
        'Worth adding later if fading marks remains important after the active areas calm down.',
    };
  }
  if (state === 'treat_now') {
    return {
      buyIf: [
        `Active-looking ${snapshot.primaryConcern === 'breakouts' ? 'breakouts' : 'concerns'} are your top priority tonight.`,
        'You can introduce a treatment gradually (start 2x/week).',
        'You will pair it with consistent SPF in the morning.',
      ],
      skipIf: [
        'Your skin currently feels raw, tight or irritated.',
        'You already use another strong exfoliant tonight.',
        'You’re looking for a gentle daily product rather than a treatment.',
      ],
      verdict:
        'A defensible buy if you’re ready to make this the primary treatment step in your night routine.',
    };
  }
  if (state === 'gentle_support') {
    return {
      buyIf: [
        'You’re building out the foundation of a calm routine.',
        'You want a low-risk layer that plays well with most treatments.',
        'You don’t already own a product in the same role.',
      ],
      skipIf: [
        'You already use a similar product daily.',
        'You’re prioritising spend on the treatment step instead.',
      ],
      verdict: 'A quiet, well-judged add when the routine still needs a supportive layer.',
    };
  }
  if (state === 'already_covered') {
    return {
      buyIf: [
        'You’re intentionally replacing your current product in this role.',
        'You’ve confirmed your existing one no longer suits your skin.',
      ],
      skipIf: [
        'You already use a similar product and it’s working.',
        'You’d prefer to invest in a different role instead.',
      ],
      verdict: 'Skip unless you’re consciously replacing what’s already in your routine.',
    };
  }
  if (state === 'pause_for_now') {
    return {
      buyIf: [
        'You want to keep it on hand for a calmer week ahead.',
        'You’re collecting for a longer-term phase, not tonight.',
      ],
      skipIf: [
        'You’d feel pressure to use it before your skin is ready.',
        'You’re trying to spend only on what serves the next 14 days.',
      ],
      verdict: 'Buy only if you can comfortably wait. Otherwise revisit at the next scan.',
    };
  }
  return {
    buyIf: [
      'You want a quality product to introduce in a future phase.',
      'You’ve already covered tonight’s priority.',
    ],
    skipIf: [
      'You don’t have a clear use for it yet.',
      'You’re trying to keep your routine minimal.',
    ],
    verdict: 'Worth keeping in mind — not worth adding to the routine tonight.',
  };
}

function startGuidance(role: ProductRoleMeta, state: RecommendationState) {
  if (state === 'treat_now' && role.routineStep === 'treat') {
    return {
      startFrequency: '2 nights per week for the first week.',
      increaseIf: 'Your skin remains comfortable.',
      avoidWith: 'Strong exfoliating acids or retinoids on the same night.',
    };
  }
  if (state === 'add_next') {
    return {
      startFrequency: '2 nights per week once active areas calm.',
      increaseIf: 'Your skin remains comfortable.',
      avoidWith: 'Strong exfoliating acids or retinoids.',
    };
  }
  if (state === 'gentle_support') {
    return {
      startFrequency: role.timing === 'Both' ? 'Daily, AM and PM.' : `Daily, ${role.timing}.`,
      increaseIf: 'You feel the layer holds comfort throughout the day.',
      avoidWith: 'Other product in the same role — keep one per layer.',
    };
  }
  return {
    startFrequency: 'When skin is calm enough to introduce.',
    increaseIf: 'Skin remains comfortable through the first week.',
    avoidWith: 'Anything else strong in the same routine.',
  };
}

function buildScanRelation(
  state: RecommendationState,
  product: Product,
  snapshot: SkinSnapshot
): string {
  if (state === 'add_next' || product.category === 'serum') {
    return `Pura noticed active-looking areas and early marks concentrated around the ${snapshot.primaryRegion}. This supports the marks that can remain after active areas settle.`;
  }
  if (state === 'treat_now') {
    return `This treatment is selected for the active-looking areas on your ${snapshot.primaryRegion} themselves.`;
  }
  return `This product supports comfort while active treatment is introduced.`;
}

export function buildProductRecommendation(
  product: Product,
  snapshot: SkinSnapshot,
  routine: RoutineState
): Recommendation {
  const role = roleFor(product.id);
  const state = determineState(product, role, snapshot, routine);
  const phase = phaseFor(role, state);
  const pathway = pathwayFor(role);
  const judgment = buildJudgment(state, product, snapshot);
  const verdict = buildVerdict(state, product, role, snapshot);
  const compat = buildCompatibility(state, role, snapshot);
  const start = startGuidance(role, state);
  const buy = buildBuyJudgment(state, role, snapshot);
  const relevance = relevanceFor(state, product.matchScore);
  const reason = shortReasonFor(state, role, snapshot);
  const cta = buildCTA(state, product.price);
  const heroIngredients = role.heroPurpose ?? [
    {
      name: product.keyIngredients[0] ?? 'Key actives',
      purpose: 'Supports the role this product plays in your routine.',
    },
    {
      name: product.keyIngredients[1] ?? 'Supporting ingredients',
      purpose: 'Rounds the formula — keeps the active well-tolerated.',
    },
  ];

  return {
    productId: product.id,
    product,
    state,
    phase,
    judgmentHeadline: judgment.headline,
    judgmentExplanation: judgment.explanation,
    verdictHeadline: verdict.headline,
    verdictBody: verdict.body,
    verdictCells: verdict.cells,
    scanRelation: buildScanRelation(state, product, snapshot),
    routinePathway: pathway.steps,
    routinePathwayActiveIndex: pathway.active,
    startFrequency: start.startFrequency,
    increaseIf: start.increaseIf,
    avoidWith: start.avoidWith,
    compatibility: compat.status,
    compatibilityRows: compat.rows,
    irritationRisk: role.baseRisk,
    buyIf: buy.buyIf,
    skipIf: buy.skipIf,
    buyVerdict: buy.verdict,
    ingredientPurpose: heroIngredients.slice(0, 4),
    alternatives: [],
    cta,
    relevanceScore: relevance.score,
    relevanceLabel: relevance.label,
    shortReason: reason,
    isPick: state === 'treat_now',
  };
}

// ============================================================================
// Skin Edit assembler.
// ============================================================================

function findById(id: string): Product | undefined {
  return seedProducts.find((p) => p.id === id);
}

const CONCERN_OPTIONS: ConcernExploreOption[] = [
  { key: 'breakouts', label: 'Breakouts' },
  { key: 'hydration', label: 'Hydration' },
  { key: 'tone', label: 'Dark marks' },
  { key: 'barrier', label: 'Barrier' },
  { key: 'texture', label: 'Texture' },
  { key: 'spf', label: 'SPF' },
];

interface HeroPickPair {
  primaryId: string;
  honestyId: string | null;
}

function selectHeroAndHonesty(
  snapshot: SkinSnapshot,
  routine: RoutineState
): HeroPickPair {
  // Default scenario from the v27 master spec.
  if (
    snapshot.primaryConcern === 'breakouts' ||
    snapshot.primaryConcern === null
  ) {
    return {
      primaryId: 'paulas-choice-2-bha',
      honestyId: 'good-molecules-discoloration',
    };
  }
  if (snapshot.primaryConcern === 'tone') {
    return {
      primaryId: 'good-molecules-discoloration',
      honestyId: 'the-ordinary-retinal',
    };
  }
  if (snapshot.primaryConcern === 'hydration') {
    return {
      primaryId: 'cerave-pm-lotion',
      honestyId: 'kiehls-ultra-facial-cream',
    };
  }
  if (snapshot.primaryConcern === 'texture') {
    return {
      primaryId: 'the-ordinary-lactic-acid',
      honestyId: 'the-ordinary-retinal',
    };
  }
  return {
    primaryId: 'paulas-choice-2-bha',
    honestyId: 'good-molecules-discoloration',
  };
}

function selectByConcern(concern: ConcernCategory | 'barrier' | 'spf'): string {
  switch (concern) {
    case 'breakouts':
      return 'paulas-choice-2-bha';
    case 'tone':
      return 'good-molecules-discoloration';
    case 'hydration':
      return 'cerave-pm-lotion';
    case 'texture':
      return 'the-ordinary-lactic-acid';
    case 'barrier':
      return 'la-roche-posay-toleriane-dd';
    case 'spf':
      return 'beauty-of-joseon-relief-sun';
  }
}

function buildAlternativesFor(
  rec: Recommendation,
  snapshot: SkinSnapshot,
  routine: RoutineState
): Recommendation['alternatives'] {
  // For the honesty / add_next case, alternatives are: the active treatment
  // first, then a gentler option.
  if (rec.state === 'add_next') {
    const ids = ['paulas-choice-2-bha', 'elf-vitamin-c-serum'];
    return ids
      .filter((id) => id !== rec.productId)
      .map((id) => {
        const p = findById(id);
        if (!p) return null;
        const altRec = buildProductRecommendation(p, snapshot, routine);
        return {
          productId: id,
          product: p,
          purposeLabel:
            id === 'paulas-choice-2-bha'
              ? 'FOR ACTIVE BREAKOUTS INSTEAD'
              : 'FOR A GENTLER START',
          reason:
            id === 'paulas-choice-2-bha'
              ? 'Choose this first if active-looking areas matter more tonight than lingering marks.'
              : 'Choose this if you want lighter support with a lower-intensity routine.',
          state: altRec.state,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }
  if (rec.state === 'treat_now') {
    const ids = ['good-molecules-discoloration', 'cerave-pm-lotion'];
    return ids
      .filter((id) => id !== rec.productId)
      .map((id) => {
        const p = findById(id);
        if (!p) return null;
        const altRec = buildProductRecommendation(p, snapshot, routine);
        return {
          productId: id,
          product: p,
          purposeLabel:
            id === 'good-molecules-discoloration'
              ? 'FOR THE MARKS PHASE LATER'
              : 'FOR BARRIER COMFORT',
          reason:
            id === 'good-molecules-discoloration'
              ? 'A strong choice once active areas settle — not first tonight.'
              : 'Pair alongside as the supportive moisturize step.',
          state: altRec.state,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }
  // Default: surface two complementary roles.
  const fallback = ['paulas-choice-2-bha', 'cerave-pm-lotion']
    .filter((id) => id !== rec.productId)
    .slice(0, 2);
  return fallback
    .map((id) => {
      const p = findById(id);
      if (!p) return null;
      const altRec = buildProductRecommendation(p, snapshot, routine);
      return {
        productId: id,
        product: p,
        purposeLabel: 'ANOTHER OPTION',
        reason: 'Consider for a different phase of your routine.',
        state: altRec.state,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

function buildPriorities(snapshot: SkinSnapshot): PriorityRow[] {
  if (snapshot.primaryConcern === 'breakouts') {
    return [
      { rank: 1, title: 'Reduce active-looking breakouts', detail: 'Highest priority tonight' },
      { rank: 2, title: 'Protect the barrier', detail: 'Keep irritation low while treating' },
      { rank: 3, title: 'Fade visible marks', detail: 'Introduce after active areas settle' },
    ];
  }
  if (snapshot.primaryConcern === 'tone') {
    return [
      { rank: 1, title: 'Support fading visible marks', detail: 'Highest priority tonight' },
      { rank: 2, title: 'Protect the barrier', detail: 'Keep irritation low while treating' },
      { rank: 3, title: 'Maintain a low-active baseline', detail: 'No new aggressive steps this week' },
    ];
  }
  if (snapshot.primaryConcern === 'hydration') {
    return [
      { rank: 1, title: 'Restore comfort', detail: 'Highest priority tonight' },
      { rank: 2, title: 'Protect the barrier', detail: 'Limit anything that strips' },
      { rank: 3, title: 'Reintroduce treatment slowly', detail: 'Once comfort returns' },
    ];
  }
  if (snapshot.primaryConcern === 'texture') {
    return [
      { rank: 1, title: 'Smooth the surface gently', detail: 'Highest priority tonight' },
      { rank: 2, title: 'Lock in moisture', detail: 'Pair with a holding moisturizer' },
      { rank: 3, title: 'Avoid stacking actives', detail: 'One treatment at a time' },
    ];
  }
  return [
    { rank: 1, title: 'Hold a calm baseline', detail: 'Highest priority tonight' },
    { rank: 2, title: 'Protect the barrier', detail: 'Keep irritation low' },
    { rank: 3, title: 'Watch the next scan', detail: 'Decide what to add then' },
  ];
}

function buildEditModes(
  snapshot: SkinSnapshot,
  routine: RoutineState
): Record<EditMode, Recommendation[]> {
  const all = seedProducts.map((p) => buildProductRecommendation(p, snapshot, routine));
  return {
    use_tonight: all.filter((r) => r.state === 'treat_now' || r.state === 'gentle_support').slice(0, 4),
    add_next: all.filter((r) => r.state === 'add_next').slice(0, 4),
    keep_gentle: all
      .filter((r) => r.state === 'gentle_support')
      .slice(0, 4),
    skip: all.filter((r) => r.state === 'pause_for_now' || r.state === 'not_primary_concern' || r.state === 'already_covered').slice(0, 4),
  };
}

function buildTimeline(snapshot: SkinSnapshot): PlanPhase[] {
  const hero = selectHeroAndHonesty(snapshot, {
    morningIds: [],
    eveningIds: [],
    ownedIds: [],
    savedIds: [],
    coveredCategories: new Set(),
  });
  return [
    {
      phase: 'now',
      daysLabel: 'Days 1–14',
      title: 'Calm and control',
      body: 'One treatment. No unnecessary stacking.',
      productIds: [hero.primaryId, 'la-roche-posay-toleriane-dd'].filter(Boolean) as string[],
    },
    {
      phase: 'next',
      daysLabel: 'Days 15–42',
      title: 'Treat marks and texture',
      body: 'Introduce correction only if skin remains comfortable.',
      productIds: [hero.honestyId, 'the-ordinary-niacinamide'].filter((x): x is string => !!x),
    },
    {
      phase: 'maintain',
      daysLabel: 'Days 43–84',
      title: 'Maintain and protect',
      body: 'Keep improvements stable with barrier support and SPF.',
      productIds: ['kiehls-ultra-facial-cream', 'beauty-of-joseon-relief-sun'],
    },
  ];
}

/**
 * Build the full Skin Edit. The lens optionally biases ranking; if
 * absent, the engine derives priority from the latest scan.
 */
export function buildSkinEdit(
  snapshot: SkinSnapshot,
  routine: RoutineState,
  lens: DecisionLens = DEFAULT_LENS
): SkinEdit {
  const pair = selectHeroAndHonesty(snapshot, routine);
  const primaryProduct = findById(pair.primaryId);
  if (!primaryProduct) {
    // Fail-safe: pick any seed product. Should never happen since
    // the seed catalogue is bundled.
    throw new Error('SkinEdit: hero product missing from seed catalogue');
  }
  const primaryRec = buildProductRecommendation(primaryProduct, snapshot, routine);
  primaryRec.isPick = true;
  primaryRec.alternatives = buildAlternativesFor(primaryRec, snapshot, routine);

  let honesty: Recommendation | null = null;
  if (pair.honestyId) {
    const honestyProduct = findById(pair.honestyId);
    if (honestyProduct) {
      honesty = buildProductRecommendation(honestyProduct, snapshot, routine);
      // Force the honesty card to read as add_next regardless of inferred
      // state, so the deferral story is always present (the spec's
      // signature moment).
      if (honesty.state !== 'add_next') {
        honesty.state = 'add_next';
        honesty.judgmentHeadline = 'Not first tonight. Excellent later.';
        honesty.judgmentExplanation =
          'Excellent for the next phase — but your scan still prioritizes tonight’s active concern.';
        honesty.shortReason = 'Excellent for marks. Not first for active breakouts.';
        honesty.cta = buildCTA('add_next', honesty.product.price);
        honesty.relevanceLabel = `${honesty.relevanceScore}% relevance for the marks phase`;
      }
      honesty.alternatives = buildAlternativesFor(honesty, snapshot, routine);
    }
  }

  const modes = buildEditModes(snapshot, routine);
  // Ensure the hero is always in use_tonight; ensure honesty is in add_next.
  if (!modes.use_tonight.find((r) => r.productId === primaryRec.productId)) {
    modes.use_tonight = [primaryRec, ...modes.use_tonight].slice(0, 4);
  }
  if (honesty && !modes.add_next.find((r) => r.productId === honesty!.productId)) {
    modes.add_next = [honesty, ...modes.add_next].slice(0, 4);
  }

  return {
    snapshot,
    routine,
    lens,
    primaryRecommendation: primaryRec,
    honestyInterruption: honesty,
    priorities: buildPriorities(snapshot),
    modes,
    timeline: buildTimeline(snapshot),
    concernOptions: CONCERN_OPTIONS,
    pickConclusion: {
      productId: primaryRec.productId,
      reason:
        snapshot.primaryConcern === 'breakouts'
          ? 'Because active-looking areas should be addressed before mark-fading support.'
          : `Because tonight’s priority is ${snapshot.primaryConcern ?? 'a calm baseline'}.`,
    },
  };
}

/**
 * Build a SkinEdit biased to a single explored concern. Used when the
 * user taps a concern chip in "Explore another concern".
 */
export function buildConcernEdit(
  concern: ConcernCategory | 'barrier' | 'spf',
  snapshot: SkinSnapshot,
  routine: RoutineState
): SkinEdit {
  const id = selectByConcern(concern);
  const product = findById(id);
  // Build a forked snapshot that reframes the page around the chosen
  // concern without losing the real scan data.
  const forkedSnapshot: SkinSnapshot = {
    ...snapshot,
    primaryConcern:
      concern === 'barrier' || concern === 'spf' ? snapshot.primaryConcern : concern,
    editorialStatement: concernEditorialHeadline(concern),
    editorialExplanation: concernEditorialBody(concern),
  };
  const edit = buildSkinEdit(forkedSnapshot, routine);
  // Force the primary recommendation to the chosen concern's pick.
  if (product) {
    const newPrimary = buildProductRecommendation(product, forkedSnapshot, routine);
    if (concern === 'tone') {
      newPrimary.state = 'add_next';
      newPrimary.judgmentHeadline = 'Excellent for marks once active areas settle.';
      newPrimary.cta = buildCTA('add_next', product.price);
    }
    if (concern === 'barrier') {
      newPrimary.state = 'gentle_support';
      newPrimary.judgmentHeadline = 'Repair first. Treat later.';
      // v26.1 — `buildCTA` is keyed on the canonical RecommendationState
      // union (gentle_support / treat_now / …). The previous string
      // literals (`add_gentle_support`, `add_to_tonight`) drifted from
      // the type definition and broke the typecheck. Align to the
      // canonical state name so the CTA copy stays consistent with
      // RECOMMENDATION_STATE_LABEL.
      newPrimary.cta = buildCTA('gentle_support', product.price);
    }
    if (concern === 'spf') {
      newPrimary.state = 'treat_now';
      newPrimary.judgmentHeadline = 'Non-negotiable: daily SPF protects every other step.';
      newPrimary.cta = buildCTA('treat_now', product.price);
    }
    newPrimary.alternatives = buildAlternativesFor(newPrimary, forkedSnapshot, routine);
    edit.primaryRecommendation = newPrimary;
  }
  return edit;
}

function concernEditorialHeadline(concern: ConcernCategory | 'barrier' | 'spf'): string {
  switch (concern) {
    case 'breakouts':
      return 'Breakout support, without overdoing it.';
    case 'hydration':
      return 'Hydration without the heavy finish.';
    case 'tone':
      return 'Treat what remains after the breakout.';
    case 'texture':
      return 'Smoother surface — the gentle way.';
    case 'barrier':
      return 'Repair first. Treat later.';
    case 'spf':
      return 'Protect everything you’re building.';
  }
}

function concernEditorialBody(concern: ConcernCategory | 'barrier' | 'spf'): string {
  switch (concern) {
    case 'breakouts':
      return 'Ranked for active-looking areas, oil balance and manageable irritation risk.';
    case 'hydration':
      return 'Selected for skin that appears oily in active areas but still needs barrier support.';
    case 'tone':
      return 'Selected to support visible tone recovery after active areas begin to settle.';
    case 'texture':
      return 'A short list of resurfacing options that won’t stress the barrier.';
    case 'barrier':
      return 'Gentle support for dryness, tightness or signs of irritation.';
    case 'spf':
      return 'Daily SPF you’ll actually reapply — invisible finish, no heavy cast.';
  }
}

// ============================================================================
// Comparison conclusion
// ============================================================================

export interface ComparisonRow {
  label: string;
  values: string[];
}

export interface ComparisonResult {
  productIds: string[];
  rows: ComparisonRow[];
  pickProductId: string;
  pickReason: string;
}

export function buildComparison(
  productIds: string[],
  snapshot: SkinSnapshot,
  routine: RoutineState
): ComparisonResult {
  const recs = productIds
    .map((id) => {
      const p = findById(id);
      return p ? buildProductRecommendation(p, snapshot, routine) : null;
    })
    .filter((r): r is Recommendation => r !== null);

  const rows: ComparisonRow[] = [
    {
      label: 'Pura’s role',
      values: recs.map((r) => RECOMMENDATION_STATE_LABEL[r.state]),
    },
    {
      label: 'Solves first',
      values: recs.map((r) => {
        const role = roleFor(r.productId);
        return role.primaryConcern === 'tone'
          ? 'Lingering marks'
          : role.primaryConcern === 'breakouts'
          ? 'Active-looking areas'
          : role.primaryConcern === 'barrier'
          ? 'Barrier comfort'
          : role.primaryConcern === 'hydration'
          ? 'Hydration'
          : role.primaryConcern === 'texture'
          ? 'Surface texture'
          : 'Daily SPF';
      }),
    },
    {
      label: 'Best moment',
      values: recs.map((r) =>
        r.state === 'treat_now'
          ? 'Current phase'
          : r.state === 'add_next'
          ? 'Marks phase'
          : r.state === 'gentle_support'
          ? 'Any phase'
          : 'On hold'
      ),
    },
    {
      label: 'Risk',
      values: recs.map((r) => riskLabel(r.irritationRisk)),
    },
    {
      label: 'Routine fit',
      values: recs.map((r) =>
        r.state === 'treat_now'
          ? 'Add carefully'
          : r.state === 'add_next'
          ? 'Save for later'
          : 'Safe now'
      ),
    },
    {
      label: 'Price',
      values: recs.map((r) => (r.product.price > 0 ? `$${r.product.price}` : '—')),
    },
  ];
  const pick = recs.find((r) => r.state === 'treat_now') ?? recs[0];
  return {
    productIds: recs.map((r) => r.productId),
    rows,
    pickProductId: pick.productId,
    pickReason:
      pick.state === 'treat_now'
        ? 'Because active-looking concerns should be addressed before later-phase support.'
        : 'Because it best fits where the routine is right now.',
  };
}
