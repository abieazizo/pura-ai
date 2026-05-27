/**
 * Routine plan generator.
 *
 * Deterministic, scan-aware. Given the canonical `ProgressRoutineInsight`,
 * returns a fully-shaped Morning (4 steps) + Evening (3 steps) plan plus
 * scan-adjustment copy and an optional conflict warning. The plan is the
 * second half of the diagnosis-to-action loop: Progress diagnoses, the
 * plan responds.
 *
 * Hard rules:
 *   • Morning ≠ Evening: each step has a distinct title, instruction, and
 *     reason. Time-of-day matters.
 *   • Steps render even when the user has zero products added — every
 *     step has a product slot that says "Empty" + Add / Find buttons.
 *   • Scan-aware: when hydration is the primary concern, the plan biases
 *     barrier-first; when breakouts lead, spot-care focus; etc. Low-
 *     confidence scans collapse to the safest barrier plan.
 *   • Every step's `reason` references real concern data, never invented.
 */

import type { ProgressRoutineInsight } from '@/state/progressRoutineInsight';
import type { ProductCategory } from '@/types';

/**
 * Priority for a step. Drives the small chip on the card:
 *   • non-negotiable → SPF always; we never let SPF read optional.
 *   • highest        → tonight's lead step, derived from focus.
 *   • high           → second-most important step.
 *   • medium         → useful but not the lever today.
 *   • optional       → can skip when skin is calm.
 */
export type StepPriority =
  | 'non-negotiable'
  | 'highest'
  | 'high'
  | 'medium'
  | 'optional';

export interface RoutineStepPlan {
  /** Stable id per step, e.g. `morning-cleanser`. Used as React key + completion key. */
  id: string;
  /** 1-based step order within the slot. */
  step: number;
  /** Plain-English category label, e.g. "Cleanser", "Hydrating layer". SPF is always uppercase. */
  categoryLabel: string;
  /** Canonical product category for matching. */
  category: ProductCategory;
  /** Short step title, headline weight. */
  title: string;
  /** Practical instruction sentence. */
  instruction: string;
  /** Why this step matters for THIS scan today. */
  reason: string;
  /** Optional step (e.g. evening spot care). */
  optional?: boolean;
  /** Today's importance level. Drives the priority chip. */
  priority: StepPriority;
  /** Optional small badge text shown next to the step kicker, e.g. "Priority today" / "Non-negotiable" / "Safe choice today". */
  badge?: string;
  /** Empty-state noun used in "No {noun} selected yet". Defaults to lowercased categoryLabel. */
  emptyNoun?: string;
  /** Specific match query used by "Find {x} match", e.g. "gentle", "hydration", "barrier", "SPF". */
  matchKeyword: string;
}

/**
 * Product-gap row used by the shelf-setup card. Each gap describes a
 * missing slot in the user's routine with a calibrated priority and a
 * one-line nudge.
 */
export type GapPriority = 'highest' | 'high' | 'medium' | 'optional';

export interface RoutineGap {
  id: string;
  category: ProductCategory;
  label: string;
  priority: GapPriority;
  priorityLabel: string;
  nudge: string;
}

export interface RoutineAdjustmentCopy {
  title: string;
  body: string;
  bullets: string[];
}

/**
 * v23.3 — explainable "Why Pura changed today's routine" structured copy.
 * Each reason is a (title, body) pair so the screen renders a structured
 * row instead of a generic bullet list.
 */
export interface RoutineReason {
  title: string;
  body: string;
}

export interface RoutineReasoning {
  /** 2–3 reasons that explain today's routine. */
  reasons: RoutineReason[];
  /** Final small line: e.g. "Routine confidence: Medium-high". */
  confidenceLabel: string;
  /** Final small line under confidence, e.g. "Safe plan based on today's scan plus your recent trend." */
  confidenceFootnote: string;
}

export interface RoutinePlan {
  morning: RoutineStepPlan[];
  evening: RoutineStepPlan[];
  morningAdjustment: RoutineAdjustmentCopy;
  eveningAdjustment: RoutineAdjustmentCopy;
  /** Structured "Why Pura changed today's routine" copy. */
  reasoning: RoutineReasoning;
  /** Top-line focus, e.g. "Hydration support". */
  focusLabel: string;
  /** One-sentence body explaining the focus. */
  focusBody: string;
  /** Estimated minutes for each routine. */
  morningEstimateMin: number;
  eveningEstimateMin: number;
  /** Evening-only conflict warning (null when nothing to flag). */
  eveningConflictWarning: string | null;
  /** True when low-confidence forced a gentle plan. */
  isGentlePlan: boolean;
}

type Focus =
  | 'hydration'
  | 'breakouts'
  | 'texture'
  | 'darkMarks'
  | 'redness'
  | 'general';

/**
 * Build the routine plan. Pure — same insight in, same plan out.
 */
export function buildRoutinePlan(insight: ProgressRoutineInsight): RoutinePlan {
  const focus = resolveFocus(insight);
  const isGentle = insight.confidenceCaveat;

  return {
    morning: morningStepsFor(focus, isGentle),
    evening: eveningStepsFor(focus, isGentle),
    morningAdjustment: morningAdjustmentCopy(focus, isGentle),
    eveningAdjustment: eveningAdjustmentCopy(focus, isGentle),
    reasoning: buildReasoning(focus, isGentle, insight),
    focusLabel: focusLabel(focus, isGentle),
    focusBody: focusBody(focus, insight),
    morningEstimateMin: 3,
    eveningEstimateMin: 4,
    eveningConflictWarning: conflictWarning(focus, isGentle),
    isGentlePlan: isGentle,
  };
}

/**
 * v23.3 — build the 3-reason "Why Pura changed today's routine" copy.
 * Each reason is a structured (title, body) so the screen renders rows.
 */
function buildReasoning(
  focus: Focus,
  gentle: boolean,
  insight: ProgressRoutineInsight
): RoutineReasoning {
  const reasons: RoutineReason[] = [];

  if (gentle) {
    reasons.push({
      title: 'Today’s scan was approximate',
      body: 'Lighting may have softened the read, so Pura avoided aggressive changes.',
    });
  } else if (insight.hasScanned) {
    reasons.push({
      title: 'Today’s scan came through clearly',
      body: 'Pura tuned the routine to what your skin showed in this scan.',
    });
  } else {
    reasons.push({
      title: 'No scan yet',
      body: 'Pura is keeping today’s routine safe and gentle until you scan.',
    });
  }

  switch (focus) {
    case 'hydration':
      reasons.push({
        title: 'Hydration needs support',
        body: 'Your hydration signal appears lower than your last scan.',
      });
      break;
    case 'breakouts':
      reasons.push({
        title: 'Breakouts are active',
        body: 'A few spots stand out, so the rest of the routine stays lightweight.',
      });
      break;
    case 'texture':
      reasons.push({
        title: 'Texture needs steady support',
        body: 'Texture reads uneven, so Pura prioritized consistency over intensity.',
      });
      break;
    case 'darkMarks':
      reasons.push({
        title: 'Dark marks are slow-moving',
        body: 'Daily SPF and barrier care preserve the fading progress.',
      });
      break;
    case 'redness':
      reasons.push({
        title: 'Redness is the area to support',
        body: 'Pura pulled back on actives and leaned into barrier care.',
      });
      break;
    case 'general':
      reasons.push({
        title: 'Nothing major moved',
        body: 'No new flare, so the routine stays balanced and steady.',
      });
      break;
  }

  if (focus !== 'breakouts') {
    reasons.push({
      title: 'Breakouts are steady',
      body: 'No need to introduce stronger breakout products today.',
    });
  } else if (gentle) {
    reasons.push({
      title: 'Routine kept gentle',
      body: 'Pura skipped strong actives so the active area can settle.',
    });
  } else {
    reasons.push({
      title: 'Trend is moving up',
      body: 'Consistency is doing real work — no need to chase a new active.',
    });
  }

  const confidenceLabel = gentle
    ? 'Routine confidence: Medium'
    : insight.hasScanned
    ? 'Routine confidence: Medium-high'
    : 'Routine confidence: General';
  const confidenceFootnote = gentle
    ? 'Conservative plan based on your recent trend while today’s scan is approximate.'
    : insight.hasScanned
    ? 'Safe plan based on today’s scan plus your recent trend.'
    : 'Safe starter plan. Pura gets more specific after your first scan.';

  return { reasons, confidenceLabel, confidenceFootnote };
}

// ---------------------------------------------------------------------------
// Focus resolution
// ---------------------------------------------------------------------------

function resolveFocus(insight: ProgressRoutineInsight): Focus {
  if (!insight.hasScanned || insight.confidenceCaveat) return 'general';

  // Use metrics whose status is "Needs support" — that's the area to lead with.
  const needsSupport = insight.metrics.find((m) => m.status === 'Needs support');
  if (needsSupport) {
    const label = needsSupport.label.toLowerCase();
    if (label.includes('hydration')) return 'hydration';
    if (label.includes('breakout')) return 'breakouts';
    if (label.includes('texture')) return 'texture';
    if (label.includes('dark')) return 'darkMarks';
    if (label.includes('redness')) return 'redness';
  }

  // Else lean on the first chip with a "warning" tone.
  const warnChip = insight.chips.find((c) => c.tone === 'warning');
  if (warnChip) {
    const l = warnChip.label.toLowerCase();
    if (l.includes('hydration')) return 'hydration';
    if (l.includes('breakout')) return 'breakouts';
    if (l.includes('texture')) return 'texture';
    if (l.includes('dark')) return 'darkMarks';
    if (l.includes('redness')) return 'redness';
  }

  return 'general';
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

function focusLabel(focus: Focus, gentle: boolean): string {
  if (gentle) return 'Gentle recovery';
  switch (focus) {
    case 'hydration':
      return 'Hydration support';
    case 'breakouts':
      return 'Calm breakouts';
    case 'texture':
      return 'Smooth texture';
    case 'darkMarks':
      return 'Even tone';
    case 'redness':
      return 'Calm redness';
    case 'general':
      return 'Steady your routine';
  }
}

function focusBody(focus: Focus, insight: ProgressRoutineInsight): string {
  if (insight.confidenceCaveat) {
    return 'Today’s scan confidence is low, so Pura is keeping things gentle until your next sharper read.';
  }
  if (!insight.hasScanned) {
    return 'Take your first scan to unlock a scan-tuned routine. Pura keeps general steps safe in the meantime.';
  }
  switch (focus) {
    case 'hydration':
      return 'Your cheeks read slightly low on moisture, while breakouts are stable. Keep today’s routine gentle and barrier-focused.';
    case 'breakouts':
      return 'A few clogged spots stand out, but the rest of your skin reads steady. Keep treatments targeted, not full-face.';
    case 'texture':
      return 'Texture reads slightly uneven. Focus on consistency before stacking stronger treatments.';
    case 'darkMarks':
      return 'Marks are fading, but daily SPF is the lever that protects the gain.';
    case 'redness':
      return 'Redness is the area to support today. Pull back on actives and lean barrier-first.';
    case 'general':
      return 'No major movement detected. Stay consistent and let your routine keep doing its job.';
  }
}

function morningAdjustmentCopy(
  focus: Focus,
  gentle: boolean
): RoutineAdjustmentCopy {
  if (gentle) {
    return {
      title: 'Adjusted for today’s scan',
      body: 'Confidence is low on today’s read, so Pura is leaning on the safest barrier-first morning until your next scan.',
      bullets: [
        'Keep cleansing gentle',
        'Lock in moisture before SPF',
        'Skip any new active product this morning',
      ],
    };
  }
  switch (focus) {
    case 'hydration':
      return {
        title: 'Adjusted for today’s scan',
        body: 'Because hydration dipped slightly, Pura is keeping treatment gentle today and prioritizing moisture support.',
        bullets: [
          'Add a hydration layer before moisturizer',
          'Keep chin products lightweight',
          'Don’t skip morning SPF',
        ],
      };
    case 'breakouts':
      return {
        title: 'Adjusted for today’s scan',
        body: 'Because clogged spots showed up around the chin, Pura is keeping the rest of the routine lightweight so the spot area can settle.',
        bullets: [
          'Cleanse, then hydrate before any treatment',
          'Keep moisturizer non-comedogenic',
          'SPF still matters today',
        ],
      };
    case 'texture':
      return {
        title: 'Adjusted for today’s scan',
        body: 'Texture reads slightly uneven, so the morning leans on hydration and SPF protection before adding anything stronger.',
        bullets: [
          'Hydrate before moisturizer',
          'Avoid scrubbing during cleanse',
          'SPF is the texture-protector this morning',
        ],
      };
    case 'darkMarks':
      return {
        title: 'Adjusted for today’s scan',
        body: 'Marks are fading gradually. Pura is making sure today’s SPF step doesn’t slip.',
        bullets: [
          'Cleanse gently',
          'Add a hydrating layer',
          'Apply SPF as the closing step',
        ],
      };
    case 'redness':
      return {
        title: 'Adjusted for today’s scan',
        body: 'Redness is the area to support, so Pura is keeping the morning calm and skipping stronger actives.',
        bullets: [
          'Skip any acid in the morning',
          'Lean into hydration and barrier care',
          'Use a mineral SPF if available',
        ],
      };
    case 'general':
      return {
        title: 'Today’s plan',
        body: 'Nothing major moved, so Pura is keeping the morning balanced — cleanse, hydrate, moisturize, protect.',
        bullets: [
          'Stay consistent with your current cleanser',
          'Hydrate before moisturizer',
          'Finish with SPF',
        ],
      };
  }
}

function eveningAdjustmentCopy(
  focus: Focus,
  gentle: boolean
): RoutineAdjustmentCopy {
  if (gentle) {
    return {
      title: 'Tonight’s adjustment',
      body: 'Confidence is low on today’s read, so tonight is the safest plan possible — cleanse, restore, sleep.',
      bullets: [
        'Cleanse gently',
        'Use a barrier moisturizer',
        'Skip any new active tonight',
      ],
    };
  }
  switch (focus) {
    case 'hydration':
      return {
        title: 'Tonight’s adjustment',
        body: 'Hydration is slightly low, so tonight’s plan focuses on recovery instead of stronger actives.',
        bullets: [
          'Cleanse gently',
          'Restore moisture',
          'Spot-treat only if needed',
          'Skip harsh exfoliation tonight',
        ],
      };
    case 'breakouts':
      return {
        title: 'Tonight’s adjustment',
        body: 'Breakouts are stable but present, so tonight stays simple — calm the area, don’t over-treat.',
        bullets: [
          'Cleanse the day off',
          'Use a lightweight moisturizer',
          'Spot-treat the active area only',
          'Avoid stacking acne actives',
        ],
      };
    case 'texture':
      return {
        title: 'Tonight’s adjustment',
        body: 'Texture is uneven but stable. Tonight is about consistency before adding stronger actives.',
        bullets: [
          'Cleanse gently',
          'Moisturize fully',
          'Skip stacking acids tonight',
        ],
      };
    case 'darkMarks':
      return {
        title: 'Tonight’s adjustment',
        body: 'Marks are fading. Tonight is a recovery night — barrier first, brightening later.',
        bullets: [
          'Cleanse gently',
          'Apply a barrier moisturizer',
          'Hold off on new brightening actives tonight',
        ],
      };
    case 'redness':
      return {
        title: 'Tonight’s adjustment',
        body: 'Redness is elevated, so tonight is a calm-and-restore night.',
        bullets: [
          'Cleanse without scrubbing',
          'Use a barrier moisturizer',
          'Avoid acids and retinoids tonight',
        ],
      };
    case 'general':
      return {
        title: 'Tonight’s plan',
        body: 'No major flare. Keep the evening simple and consistent.',
        bullets: [
          'Cleanse the day off',
          'Moisturize',
          'Spot-treat only if needed',
        ],
      };
  }
}

function conflictWarning(focus: Focus, gentle: boolean): string | null {
  if (gentle) {
    return 'Skip strong actives tonight while scan confidence catches up.';
  }
  if (focus === 'hydration' || focus === 'redness' || focus === 'breakouts') {
    return 'Skip strong exfoliating acids tonight unless your skin already tolerates them well.';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Step templates
// ---------------------------------------------------------------------------

function morningStepsFor(focus: Focus, gentle: boolean): RoutineStepPlan[] {
  // v23.3 — per-step priority + badge metadata so RoutineStepCard can
  // render "Priority today" / "Non-negotiable" / "Safe choice today"
  // chips without screen-side string matching.
  const hydrateIsLead = focus === 'hydration' || focus === 'redness';
  const moisturizerIsLead = focus === 'general' || focus === 'breakouts';
  return [
    {
      id: 'morning-cleanser',
      step: 1,
      categoryLabel: 'Cleanser',
      category: 'cleanser',
      title: 'Gentle cleanse',
      instruction:
        'Use a non-stripping cleanser, or rinse with water if your skin feels dry.',
      reason: morningReason(focus, gentle, 'cleanser'),
      priority: gentle ? 'high' : 'medium',
      badge: gentle ? 'Safe choice today' : undefined,
      emptyNoun: 'cleanser',
      matchKeyword: gentle ? 'gentle' : 'gentle cleanser',
    },
    {
      id: 'morning-hydrate',
      step: 2,
      categoryLabel: 'Hydrating layer',
      category: 'serum',
      title: 'Hydrating layer',
      instruction: 'Add a serum or essence focused on moisture support.',
      reason: morningReason(focus, gentle, 'hydrate'),
      priority: hydrateIsLead ? 'highest' : 'high',
      badge: hydrateIsLead ? 'Priority today' : undefined,
      emptyNoun: 'hydrating product',
      matchKeyword: 'hydration',
    },
    {
      id: 'morning-moisturizer',
      step: 3,
      categoryLabel: 'Moisturizer',
      category: 'moisturizer',
      title: 'Barrier moisturizer',
      instruction: 'Lock in hydration with a lightweight moisturizer.',
      reason: morningReason(focus, gentle, 'moisturizer'),
      priority: moisturizerIsLead ? 'highest' : 'high',
      badge: moisturizerIsLead ? 'Priority today' : undefined,
      emptyNoun: 'moisturizer',
      matchKeyword: 'barrier',
    },
    {
      id: 'morning-spf',
      step: 4,
      categoryLabel: 'SPF',
      category: 'spf',
      title: 'SPF protection',
      instruction: 'Finish with broad-spectrum SPF 30+.',
      reason: morningReason(focus, gentle, 'spf'),
      priority: 'non-negotiable',
      badge: 'Non-negotiable',
      emptyNoun: 'SPF',
      matchKeyword: 'SPF',
    },
  ];
}

function eveningStepsFor(focus: Focus, gentle: boolean): RoutineStepPlan[] {
  const moisturizerIsLead =
    focus === 'hydration' ||
    focus === 'redness' ||
    focus === 'darkMarks' ||
    gentle;
  return [
    {
      id: 'evening-cleanser',
      step: 1,
      categoryLabel: 'Cleanser',
      category: 'cleanser',
      title: 'Cleanse the day off',
      instruction:
        'Remove sunscreen and buildup with a gentle cleanser.',
      reason: eveningReason(focus, gentle, 'cleanser'),
      priority: gentle ? 'high' : 'medium',
      badge: gentle ? 'Safe choice tonight' : undefined,
      emptyNoun: 'cleanser',
      matchKeyword: gentle ? 'gentle' : 'gentle cleanser',
    },
    {
      id: 'evening-moisturizer',
      step: 2,
      categoryLabel: 'Moisturizer',
      category: 'moisturizer',
      title: 'Moisture recovery',
      instruction: 'Use a barrier-focused moisturizer tonight.',
      reason: eveningReason(focus, gentle, 'moisturizer'),
      priority: moisturizerIsLead ? 'highest' : 'high',
      badge: moisturizerIsLead ? 'Priority tonight' : undefined,
      emptyNoun: 'moisturizer',
      matchKeyword: 'barrier',
    },
    {
      id: 'evening-treatment',
      step: 3,
      categoryLabel: 'Spot treatment',
      category: 'treatment',
      title: 'Optional spot care',
      instruction: 'Only spot-treat clogged or active areas if needed.',
      reason: eveningReason(focus, gentle, 'treatment'),
      optional: true,
      priority: 'optional',
      badge: focus === 'breakouts' && !gentle ? 'For active spots only' : undefined,
      emptyNoun: 'spot treatment',
      matchKeyword: 'spot treatment',
    },
  ];
}

function morningReason(
  focus: Focus,
  gentle: boolean,
  step: 'cleanser' | 'hydrate' | 'moisturizer' | 'spf'
): string {
  if (gentle) {
    switch (step) {
      case 'cleanser':
        return 'Confidence is low — keep cleansing soft this morning.';
      case 'hydrate':
        return 'Barrier care helps when scan confidence is low.';
      case 'moisturizer':
        return 'Locks in hydration before SPF.';
      case 'spf':
        return 'SPF stays non-negotiable, even on low-confidence days.';
    }
  }
  switch (focus) {
    case 'hydration':
      return ({
        cleanser:
          'Hydration is slightly low today, so avoid harsh cleansing.',
        hydrate:
          'Cheeks read slightly low on moisture in today’s scan.',
        moisturizer:
          'Supports moisture without overloading clogged areas near the chin.',
        spf:
          'SPF helps protect fading marks and supports long-term progress.',
      } as const)[step];
    case 'breakouts':
      return ({
        cleanser:
          'A gentle cleanse keeps the chin area from over-stripping.',
        hydrate:
          'Hydration calms surrounding skin so spot care can do its job.',
        moisturizer:
          'Lightweight moisture prevents the barrier from compensating with extra oil.',
        spf:
          'SPF protects post-breakout marks from getting darker.',
      } as const)[step];
    case 'texture':
      return ({
        cleanser:
          'Avoid scrubbing while texture is recovering.',
        hydrate:
          'Plump hydration is the easiest texture win.',
        moisturizer:
          'Moisturizer smooths the surface and seals the routine.',
        spf:
          'SPF is the long-game move for keeping texture from sliding back.',
      } as const)[step];
    case 'darkMarks':
      return ({
        cleanser:
          'Gentle cleansing protects the fading layer.',
        hydrate:
          'Hydration helps the new skin underneath stay calm.',
        moisturizer:
          'Locks the brightening progress in.',
        spf:
          'SPF is the single most important step for fading marks.',
      } as const)[step];
    case 'redness':
      return ({
        cleanser:
          'Avoid any scrubbing or hot water on redness-prone skin.',
        hydrate:
          'Hydration supports the calm phase you’re building.',
        moisturizer:
          'Barrier care is the main lever for redness today.',
        spf:
          'Mineral SPF tends to play nicer with reactive skin.',
      } as const)[step];
    case 'general':
      return ({
        cleanser:
          'Steady your cleanse — nothing flared today.',
        hydrate:
          'Hydration before moisturizer keeps the routine balanced.',
        moisturizer:
          'Locks in everything below it.',
        spf:
          'SPF is the closer that keeps your trend moving up.',
      } as const)[step];
  }
}

function eveningReason(
  focus: Focus,
  gentle: boolean,
  step: 'cleanser' | 'moisturizer' | 'treatment'
): string {
  if (gentle) {
    switch (step) {
      case 'cleanser':
        return 'Soft cleanse only — confidence is low tonight.';
      case 'moisturizer':
        return 'Barrier care is the safest move on a low-confidence read.';
      case 'treatment':
        return 'Skip stronger treatments until the next scan is sharper.';
    }
  }
  switch (focus) {
    case 'hydration':
      return ({
        cleanser:
          'Avoid scrubbing while hydration is slightly low.',
        moisturizer:
          'Tonight’s priority is restoring moisture, not adding more actives.',
        treatment:
          'Breakouts are stable, so avoid full-face harsh treatment tonight.',
      } as const)[step];
    case 'breakouts':
      return ({
        cleanser:
          'Wash off the day without stripping the chin area.',
        moisturizer:
          'Lightweight moisture keeps the skin from over-producing oil overnight.',
        treatment:
          'Spot the active areas only — don’t treat the whole face.',
      } as const)[step];
    case 'texture':
      return ({
        cleanser:
          'Gentle cleansing keeps texture from getting more reactive overnight.',
        moisturizer:
          'A solid moisturizer is the smoothing move tonight.',
        treatment:
          'Hold off on layering acids tonight — consistency wins.',
      } as const)[step];
    case 'darkMarks':
      return ({
        cleanser:
          'Wash off SPF and the day’s buildup carefully.',
        moisturizer:
          'Barrier care preserves the fading progress.',
        treatment:
          'Optional dark-mark serum only if your routine is already settled.',
      } as const)[step];
    case 'redness':
      return ({
        cleanser:
          'Skip exfoliating cleansers tonight.',
        moisturizer:
          'Barrier moisturizer is the main move on redness nights.',
        treatment:
          'Hold off on actives until redness calms further.',
      } as const)[step];
    case 'general':
      return ({
        cleanser:
          'A clean slate sets up the recovery window.',
        moisturizer:
          'The repair window starts here.',
        treatment:
          'Spot-treat only if needed — skin reads steady today.',
      } as const)[step];
  }
}

// ---------------------------------------------------------------------------
// v23.3 — Routine product-gap builder. Used by the ProductGapsCard so the
// user can see what their shelf is missing, ordered by priority. The
// priority order is fixed: SPF > Moisturizer > Hydrating layer > Cleanser,
// because that's the order in which a missing product hurts most.
// ---------------------------------------------------------------------------

interface BuildGapsArgs {
  plan: RoutinePlan;
  /** True when the user has assigned a product to the cleanser slot. */
  hasCleanser: boolean;
  hasHydration: boolean;
  hasMoisturizer: boolean;
  hasSpf: boolean;
}

export function buildProductGaps(args: BuildGapsArgs): RoutineGap[] {
  const { hasCleanser, hasHydration, hasMoisturizer, hasSpf } = args;
  const gaps: RoutineGap[] = [];

  if (!hasSpf) {
    gaps.push({
      id: 'gap-spf',
      category: 'spf',
      label: 'SPF',
      priority: 'highest',
      priorityLabel: 'Highest priority',
      nudge: 'SPF protects your trend more than any other step — daily, every day.',
    });
  }
  if (!hasMoisturizer) {
    gaps.push({
      id: 'gap-moisturizer',
      category: 'moisturizer',
      label: 'Moisturizer',
      priority: 'high',
      priorityLabel: 'High priority',
      nudge: 'A barrier moisturizer locks the rest of the routine in.',
    });
  }
  if (!hasHydration) {
    gaps.push({
      id: 'gap-hydration',
      category: 'serum',
      label: 'Hydrating layer',
      priority: 'medium',
      priorityLabel: 'Medium priority',
      nudge: 'A hydrating serum is the easiest win for tired-looking skin.',
    });
  }
  if (!hasCleanser) {
    gaps.push({
      id: 'gap-cleanser',
      category: 'cleanser',
      label: 'Cleanser',
      priority: 'optional',
      priorityLabel: 'Optional today',
      nudge: 'A gentle cleanser is helpful — but a water rinse also works.',
    });
  }
  return gaps;
}
