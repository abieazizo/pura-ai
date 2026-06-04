/**
 * Pura Shop — HOME feed model (the data contract for the card-stack rebuild).
 *
 * The shop home is "a personalized skincare consultant feed," not a catalog
 * with personalization bolted on. This module is the single typed model the
 * screen renders from. Per CLAUDE.md canonical-state law + the project's
 * "stabilize data contracts before UI" rule, the screen reads ONLY this model
 * — never the store, never raw AI output, never the scorer directly.
 *
 *   buildShopHomeModel(input)  → ShopHomeModel   (pure, deterministic)
 *   useShopHomeModel()         → ShopHomeModel   (store-bound hook)
 *
 * Determinism: every card, every score, every line of copy is produced by
 * pure code from (a) the canonical `SkinState`, (b) the deterministic
 * `scoreForUser` matcher, and (c) the static `SHOP_CATALOG`. AI match scores,
 * when a real scan produced them, are blended in exactly as the legacy view
 * model did — AI is a rerank signal layered on top, never the source of a
 * card. The "match %" claim only renders when personalization is REAL
 * (`hasRealPersonalization`), so the feed never fakes precision.
 */

import { useMemo } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store/useAppStore';
import type { ProductMatch } from '@/ai/ai-contracts';
import type { ConcernType } from '@/ai/ai-contracts';
import type { SkinState } from '@/types/canonical';
import { selectSkinState } from '@/state/canonical';
import {
  SHOP_CATALOG,
  type ShopCatalogProduct,
  type ShopCategory,
} from './shopCatalog';
import {
  scoreForUser,
  describeMatch,
  type UserProfileSnapshot,
  type UserMatch,
  type MatchedFactor,
} from './personalization';
import {
  pillarForCategory,
  PILLAR_THEME,
  type ShopPillar,
  type PillarTheme,
} from './shopHomeTokens';
import { puraShopHome } from '@/theme';

// ===========================================================================
// Types — the contract the screen renders from.
// ===========================================================================

/**
 * Each card in the stack is one of seven editorial types. The screen switches
 * its render + copy emphasis on this discriminant:
 *   • pick      — a personalized recommendation (the spine of the feed)
 *   • budget    — a cheaper sibling in the same pillar as a nearby pick
 *   • splurge   — a premium sibling in the same pillar as a nearby pick
 *   • missing   — fills a pillar the user's routine has no product for
 *   • swap      — a stronger-scoring replacement for something already owned
 *   • adjacent  — a "while you're here" complementary discovery
 *   • end       — the terminal editorial card (no product; escape hatches)
 */
export type StackCardType =
  | 'pick'
  | 'budget'
  | 'splurge'
  | 'missing'
  | 'swap'
  | 'adjacent'
  | 'end';

/** A reference to the card this one is being compared against (budget/splurge/swap). */
export interface CompareRef {
  id: string;
  shortName: string;
  /** Brand + packshot of the reference pick, so a card can render it side-by-side. */
  brand: string;
  packshot: ImageSourcePropType;
  price: number;
  /** This card's price minus the reference price. Negative = cheaper. */
  priceDelta: number;
}

export interface StackCard {
  /** Stable React key. */
  key: string;
  type: StackCardType;
  /** Present for every product card; null only for the terminal `end` card. */
  product: ShopCatalogProduct | null;
  pillar: ShopPillar | null;
  pillarTheme: PillarTheme | null;
  /** 0–100. Null unless personalization is real (never fake a match number). */
  matchPercent: number | null;
  hasRealPersonalization: boolean;
  factors: MatchedFactor[];
  /** Editorial eyebrow, e.g. "YOUR TOP PICK", "SAME JOB · LESS". */
  eyebrow: string;
  /** One editorial sentence — why this card, this user, tonight. */
  reason: string;
  /** Optional price framing line (budget/splurge). */
  priceNote: string | null;
  compareTo: CompareRef | null;
  isSaved: boolean;
  isInRoutine: boolean;
  /** True for STATE-A pre-scan picks rendered behind the scan gate. */
  locked: boolean;
}

export type ShopHomeState = 'pre-scan' | 'post-scan';

export interface AcknowledgmentLine {
  kind: 'reactive' | 'first-scan' | 'improving' | 'gap' | 'default';
  text: string;
}

export interface ScanFreshness {
  label: string;
  daysSince: number;
  /** ≥ 14 days — the feed gently nudges a re-scan. */
  isStale: boolean;
}

export interface ConcernChip {
  key: string;
  label: string;
  severityLabel: string;
  accent: string;
  direction: 'better' | 'worse' | 'same' | 'new' | null;
}

export interface ShopHomeModel {
  state: ShopHomeState;
  greetingName: string | null;
  acknowledgment: AcknowledgmentLine;
  scanFreshness: ScanFreshness | null;
  showRescanBanner: boolean;
  /** "What we saw tonight" — real scan concerns only (empty pre-scan). */
  concernsTonight: ConcernChip[];
  /** The STATE-B swipeable stack. Always terminates in an `end` card. */
  cards: StackCard[];
  /** STATE-A gated editorial picks (shown blurred behind the scan gate). */
  preScanPicks: StackCard[];
  /** "Saved by you" shelf. */
  savedCards: StackCard[];
  /** Total catalog size — drives the quiet "browse all N" escape hatch. */
  catalogCount: number;
}

// ===========================================================================
// Builder input.
// ===========================================================================

export interface BuildShopHomeInput {
  hasScan: boolean;
  skinState: SkinState | null;
  profile: UserProfileSnapshot;
  greetingName: string | null;
  savedIds: ReadonlySet<string>;
  routineIds: ReadonlySet<string>;
  aiMatches: readonly ProductMatch[];
  scanCount: number;
  latestScanAtIso: string | null;
  previousScanAtIso: string | null;
  scoreDelta: number | null;
  /** Injected for purity/testability; defaults to Date.now() at the hook. */
  now: number;
}

/** Max personalized product cards before the terminal card (keeps it digestible). */
const MAX_STACK_PRODUCTS = 6;
const PRE_SCAN_PICK_COUNT = 3;

// ---------------------------------------------------------------------------
// Internal scored-entry shape.
// ---------------------------------------------------------------------------

interface ScoredEntry {
  p: ShopCatalogProduct;
  match: UserMatch;
  /** AI score override applied when a real scan produced one. */
  displayScore: number;
  hasRealPersonalization: boolean;
}

// ===========================================================================
// buildShopHomeModel — pure, deterministic.
// ===========================================================================

export function buildShopHomeModel(input: BuildShopHomeInput): ShopHomeModel {
  const {
    hasScan,
    skinState,
    profile,
    greetingName,
    savedIds,
    routineIds,
    aiMatches,
    scanCount,
    latestScanAtIso,
    scoreDelta,
    now,
  } = input;

  const aiById = new Map<string, ProductMatch>();
  for (const m of aiMatches) aiById.set(m.product_id, m);

  // Score the whole catalog once. AI override mirrors the legacy VM: a real
  // scan's AI match score wins for display + always counts as real signal.
  const scored: ScoredEntry[] = SHOP_CATALOG.map((p) => {
    const match = scoreForUser(p, profile);
    const ai = aiById.get(p.id);
    const displayScore = ai?.match_score ?? match.score;
    return {
      p,
      match,
      displayScore,
      hasRealPersonalization: match.hasRealPersonalization || ai != null,
    };
  });
  const byScore = [...scored].sort((a, b) => b.displayScore - a.displayScore);
  const entryById = new Map(scored.map((e) => [e.p.id, e]));

  const used = new Set<string>();
  const cards: StackCard[] = [];

  const toCard = (
    entry: ScoredEntry,
    type: StackCardType,
    over: Partial<StackCard> & Pick<StackCard, 'eyebrow' | 'reason'>,
  ): StackCard => {
    const pillar = pillarForCategory(entry.p.category);
    const theme = PILLAR_THEME[pillar];
    return {
      key: `${type}:${entry.p.id}`,
      type,
      product: entry.p,
      pillar,
      pillarTheme: theme,
      matchPercent: entry.hasRealPersonalization
        ? Math.round(entry.displayScore)
        : null,
      hasRealPersonalization: entry.hasRealPersonalization,
      factors: entry.match.factors,
      priceNote: null,
      compareTo: null,
      isSaved: savedIds.has(entry.p.id),
      isInRoutine: routineIds.has(entry.p.id),
      locked: false,
      ...over,
    };
  };

  // -------------------------------------------------------------------------
  // STATE B — the personalized stack.
  // -------------------------------------------------------------------------

  if (hasScan) {
    // 1. The single best pick.
    const top = byScore.find((e) => !used.has(e.p.id)) ?? null;
    if (top) {
      used.add(top.p.id);
      cards.push(
        toCard(top, 'pick', {
          eyebrow: 'YOUR TOP PICK TONIGHT',
          reason: top.hasRealPersonalization
            ? describeMatch(top.match)
            : top.p.benefitLine,
        }),
      );

      // 2. Price siblings of the top pick — same pillar, meaningfully
      //    cheaper / pricier. These sit adjacent so the comparison gesture
      //    pairs them with the pick above.
      const topPillar = pillarForCategory(top.p.category);
      const budget = byScore.find(
        (e) =>
          !used.has(e.p.id) &&
          pillarForCategory(e.p.category) === topPillar &&
          e.p.price <= top.p.price * 0.7,
      );
      if (budget) {
        used.add(budget.p.id);
        const delta = Math.round(budget.p.price - top.p.price);
        cards.push(
          toCard(budget, 'budget', {
            eyebrow: 'SAME STEP · LESS',
            reason: `The same ${PILLAR_THEME[topPillar].label.toLowerCase()} step as the ${top.p.shortName ?? top.p.name}, for ${money(Math.abs(delta))} less.`,
            priceNote: money(budget.p.price),
            compareTo: compareRef(top.p, delta),
          }),
        );
      }
      const splurge = byScore.find(
        (e) =>
          !used.has(e.p.id) &&
          pillarForCategory(e.p.category) === topPillar &&
          e.p.price >= top.p.price * 1.4,
      );
      if (splurge) {
        used.add(splurge.p.id);
        const delta = Math.round(splurge.p.price - top.p.price);
        cards.push(
          toCard(splurge, 'splurge', {
            eyebrow: 'THE UPGRADE',
            reason: `If you'd rather invest in this step — ${money(Math.abs(delta))} more than the pick above.`,
            priceNote: money(splurge.p.price),
            compareTo: compareRef(top.p, delta),
          }),
        );
      }
    }

    // 3. A "missing pillar" card — what the scan says to add that the
    //    routine has no product for.
    const missingCat = resolveMissingCategory(skinState, routineIds);
    if (missingCat) {
      const m = byScore.find(
        (e) => !used.has(e.p.id) && e.p.category === missingCat,
      );
      if (m) {
        used.add(m.p.id);
        cards.push(
          toCard(m, 'missing', {
            eyebrow: "YOUR ROUTINE'S MISSING THIS",
            reason: missingReason(pillarForCategory(missingCat)),
          }),
        );
      }
    }

    // 4. More picks, one per remaining real concern, in severity order.
    const concernKeysOrdered = orderedConcernKeys(skinState, profile);
    for (const ck of concernKeysOrdered) {
      if (productCount(cards) >= MAX_STACK_PRODUCTS) break;
      const c = byScore.find(
        (e) =>
          !used.has(e.p.id) &&
          e.hasRealPersonalization &&
          e.p.concernTags.includes(ck),
      );
      if (c) {
        used.add(c.p.id);
        cards.push(
          toCard(c, 'pick', {
            eyebrow: `FOR YOUR ${concernEyebrow(ck)}`,
            reason: c.hasRealPersonalization
              ? describeMatch(c.match)
              : c.p.benefitLine,
          }),
        );
      }
    }

    // 5. One "while you're here" adjacent discovery, if there's room.
    if (productCount(cards) < MAX_STACK_PRODUCTS) {
      const adj = byScore.find((e) => !used.has(e.p.id));
      if (adj) {
        used.add(adj.p.id);
        cards.push(
          toCard(adj, 'adjacent', {
            eyebrow: 'WHILE YOU’RE HERE',
            reason: adj.p.benefitLine,
          }),
        );
      }
    }

    // 6. Terminal card — closes the edit, hosts the escape hatches.
    cards.push(endCard(productCount(cards)));
  }

  // -------------------------------------------------------------------------
  // STATE A — pre-scan gated editorial picks.
  // -------------------------------------------------------------------------

  const preScanPicks: StackCard[] = !hasScan
    ? [...scored]
        .sort(
          (a, b) =>
            (b.p.affinityHint ?? 0) - (a.p.affinityHint ?? 0) ||
            Number(b.p.eligibleHero ?? false) - Number(a.p.eligibleHero ?? false),
        )
        .slice(0, PRE_SCAN_PICK_COUNT)
        .map((e) =>
          toCard(e, 'pick', {
            eyebrow: "EDITOR'S PICK",
            reason: e.p.benefitLine,
            matchPercent: null,
            hasRealPersonalization: false,
            locked: true,
          }),
        )
    : [];

  // -------------------------------------------------------------------------
  // Saved shelf — real saved items, scored for display.
  // -------------------------------------------------------------------------

  const savedCards: StackCard[] = SHOP_CATALOG.filter((p) =>
    savedIds.has(p.id),
  ).map((p) => {
    const entry = entryById.get(p.id)!;
    return toCard(entry, 'pick', {
      eyebrow: 'SAVED BY YOU',
      reason: entry.hasRealPersonalization
        ? describeMatch(entry.match)
        : p.benefitLine,
    });
  });

  // -------------------------------------------------------------------------
  // Header furniture.
  // -------------------------------------------------------------------------

  const daysSince = latestScanAtIso
    ? daysBetween(latestScanAtIso, now)
    : null;
  const scanFreshness: ScanFreshness | null =
    hasScan && daysSince !== null
      ? {
          label: relativeScanLabel(daysSince),
          daysSince,
          isStale: daysSince >= 14,
        }
      : null;

  return {
    state: hasScan ? 'post-scan' : 'pre-scan',
    greetingName,
    acknowledgment: buildAcknowledgment({
      hasScan,
      scanCount,
      scoreDelta,
      skinState,
      daysSince,
    }),
    scanFreshness,
    showRescanBanner: scanFreshness?.isStale ?? false,
    concernsTonight: buildConcernChips(skinState),
    cards,
    preScanPicks,
    savedCards,
    catalogCount: SHOP_CATALOG.length,
  };
}

// ===========================================================================
// Pure helpers.
// ===========================================================================

function productCount(cards: StackCard[]): number {
  return cards.filter((c) => c.product !== null).length;
}

function compareRef(ref: ShopCatalogProduct, priceDelta: number): CompareRef {
  return {
    id: ref.id,
    shortName: ref.shortName ?? ref.name,
    brand: ref.brand,
    packshot: ref.catalogPackshot,
    price: ref.price,
    priceDelta,
  };
}

function endCard(count: number): StackCard {
  return {
    key: 'end',
    type: 'end',
    product: null,
    pillar: null,
    pillarTheme: null,
    matchPercent: null,
    hasRealPersonalization: false,
    factors: [],
    eyebrow: "THAT'S TONIGHT'S EDIT",
    reason:
      count > 0
        ? `${count} picks, read against your last scan. Tap the heart on anything to keep it.`
        : 'No standout picks tonight — your routine is holding steady.',
    priceNote: null,
    compareTo: null,
    isSaved: false,
    isInRoutine: false,
    locked: false,
  };
}

function money(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

/**
 * Which pillar/category the scan implies the user should ADD — i.e. the
 * canonical `nextStepCategory`, mapped to a shop category, but only when the
 * routine has nothing in that pillar yet. Falls back to SPF, then moisturizer,
 * then cleanser if those essential pillars are uncovered.
 */
function resolveMissingCategory(
  skinState: SkinState | null,
  routineIds: ReadonlySet<string>,
): ShopCategory | null {
  const coveredPillars = new Set<ShopPillar>();
  for (const id of routineIds) {
    const p = SHOP_CATALOG.find((x) => x.id === id);
    if (p) coveredPillars.add(pillarForCategory(p.category));
  }

  const candidates: ShopCategory[] = [];
  const next = mapCanonicalCategory(skinState?.nextStepCategory ?? null);
  if (next) candidates.push(next);
  // Essential-pillar fallbacks in priority order.
  candidates.push('spf', 'moisturizer', 'cleanser');

  for (const cat of candidates) {
    if (!coveredPillars.has(pillarForCategory(cat))) return cat;
  }
  return null;
}

/** Map a canonical `ProductCategory` onto the shop's coarse `ShopCategory`. */
function mapCanonicalCategory(
  c: SkinState['nextStepCategory'],
): ShopCategory | null {
  switch (c) {
    case 'spot_treatment':
      return 'treatment';
    case 'moisturizer':
      return 'moisturizer';
    case 'serum':
      return 'serum';
    case 'cleanser':
      return 'cleanser';
    case 'spf':
      return 'spf';
    case 'toner':
      return 'toner';
    case 'mask':
      return 'mask';
    default:
      return null; // 'unknown' | null
  }
}

function missingReason(pillar: ShopPillar): string {
  switch (pillar) {
    case 'protect':
      return "Nothing in your routine is shielding tonight's progress from tomorrow's sun.";
    case 'moisturize':
      return 'Your routine skips a moisturizer — the barrier step everything else leans on.';
    case 'cleanse':
      return 'No cleanser in your routine yet — the step that lets the rest absorb.';
    case 'treat':
      return "You've no active targeting your top concern yet.";
  }
}

const CONCERN_TO_KEY: Partial<Record<ConcernType, 'breakouts' | 'hydration' | 'marks' | 'barrier' | 'bright'>> = {
  breakouts: 'breakouts',
  oiliness: 'breakouts',
  pores: 'breakouts',
  hydration: 'hydration',
  dark_marks: 'marks',
  texture: 'marks',
  redness: 'barrier',
  sensitivity: 'barrier',
};

/** Ordered catalog concern keys from the scan's top concerns, then profile. */
function orderedConcernKeys(
  skinState: SkinState | null,
  profile: UserProfileSnapshot,
): Array<'breakouts' | 'hydration' | 'marks' | 'barrier' | 'bright'> {
  const out: Array<'breakouts' | 'hydration' | 'marks' | 'barrier' | 'bright'> = [];
  const push = (k: (typeof out)[number] | undefined | null) => {
    if (k && !out.includes(k)) out.push(k);
  };
  for (const c of skinState?.topConcerns ?? []) push(CONCERN_TO_KEY[c.concern]);
  // Fall back to the onboarding concerns when the scan surfaced nothing.
  for (const c of profile.concerns) {
    const s = c.toLowerCase();
    if (s.includes('break')) push('breakouts');
    else if (s.includes('mark') || s.includes('scar')) push('marks');
    else if (s.includes('hydra') || s.includes('dehydr')) push('hydration');
    else if (s.includes('sensit') || s.includes('red') || s.includes('barr')) push('barrier');
    else if (s.includes('bright') || s.includes('dull') || s.includes('tone')) push('bright');
  }
  return out;
}

function concernEyebrow(
  k: 'breakouts' | 'hydration' | 'marks' | 'barrier' | 'bright',
): string {
  switch (k) {
    case 'breakouts':
      return 'BREAKOUTS';
    case 'hydration':
      return 'HYDRATION';
    case 'marks':
      return 'MARKS';
    case 'barrier':
      return 'BARRIER';
    case 'bright':
      return 'TONE';
  }
}

// ----- Concern chips ("What we saw tonight") -----

function concernToPillar(c: ConcernType): ShopPillar {
  switch (c) {
    case 'hydration':
      return 'moisturize';
    case 'redness':
    case 'sensitivity':
    case 'oiliness':
      return 'cleanse';
    default:
      return 'treat';
  }
}

function severityWord(s: SkinState['topConcerns'][number]['severity']): string {
  switch (s) {
    case 'high':
      return 'needs care';
    case 'moderate':
      return 'moderate';
    case 'mild':
      return 'mild';
    case 'low':
      return 'settling';
    case 'none':
      return 'calm';
  }
}

function buildConcernChips(skinState: SkinState | null): ConcernChip[] {
  if (!skinState) return [];
  return skinState.topConcerns.map((c) => {
    const pillar = concernToPillar(c.concern);
    return {
      key: c.concern,
      label: humanConcern(c.concern),
      severityLabel: severityWord(c.severity),
      accent: PILLAR_THEME[pillar].accent,
      direction: c.direction ?? null,
    };
  });
}

function humanConcern(c: ConcernType): string {
  switch (c) {
    case 'breakouts':
      return 'Breakouts';
    case 'hydration':
      return 'Hydration';
    case 'texture':
      return 'Texture';
    case 'dark_marks':
      return 'Dark marks';
    case 'redness':
      return 'Redness';
    case 'oiliness':
      return 'Oiliness';
    case 'sensitivity':
      return 'Sensitivity';
    case 'pores':
      return 'Pores';
  }
}

// ----- Acknowledgment line -----

function buildAcknowledgment(args: {
  hasScan: boolean;
  scanCount: number;
  scoreDelta: number | null;
  skinState: SkinState | null;
  daysSince: number | null;
}): AcknowledgmentLine {
  const { hasScan, scanCount, scoreDelta, skinState, daysSince } = args;
  if (!hasScan) {
    return {
      kind: 'default',
      text: 'A storefront that waits for your skin before it recommends anything.',
    };
  }
  const worseOrNew = (skinState?.topConcerns ?? []).some(
    (c) => c.direction === 'worse' || c.direction === 'new',
  );
  // Priority: reactive > first-scan > improving > gap > default.
  if ((scoreDelta !== null && scoreDelta <= -2) || worseOrNew) {
    return {
      kind: 'reactive',
      text: "Your skin's asking for a little more support tonight. Here's where I'd start.",
    };
  }
  if (scanCount <= 1) {
    return {
      kind: 'first-scan',
      text: "Your first reading's in. Here's the edit I'd build around it.",
    };
  }
  if (scoreDelta !== null && scoreDelta >= 2) {
    return {
      kind: 'improving',
      text: "You're trending up — let's protect the progress.",
    };
  }
  if (daysSince !== null && daysSince >= 7) {
    return {
      kind: 'gap',
      text: "Been a little while. Here's what still matters for your skin.",
    };
  }
  return {
    kind: 'default',
    text: 'Picked for where your skin is right now.',
  };
}

// ----- Time helpers -----

function daysBetween(iso: string, now: number): number {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((now - then) / 86_400_000));
}

function relativeScanLabel(daysSince: number): string {
  if (daysSince <= 0) return 'Scanned today';
  if (daysSince === 1) return 'Scanned yesterday';
  if (daysSince < 7) return `Scanned ${daysSince} days ago`;
  if (daysSince < 14) return 'Scanned last week';
  if (daysSince < 30) return `Scanned ${Math.floor(daysSince / 7)} weeks ago`;
  return 'Scanned over a month ago';
}

// ===========================================================================
// useShopHomeModel — store-bound hook.
// ===========================================================================

export function useShopHomeModel(): ShopHomeModel {
  const s = useAppStore(
    useShallow((st) => ({
      name: st.name,
      skinType: st.skinType,
      sensitivity: st.sensitivity,
      concerns: st.concerns,
      goal: st.goal,
      routineTiming: st.routineTiming,
      fragranceSensitive: st.fragranceSensitive,
      avoidIngredients: st.avoidIngredients,
      wishlist: st.wishlist,
      morningIds: st.userRoutineMorning,
      eveningIds: st.userRoutineEvening,
      aiMatches: st.aiTopMatches,
      scans: st.scans,
    })),
  );

  return useMemo<ShopHomeModel>(() => {
    const scans = Array.isArray(s.scans) ? s.scans : [];
    const hasScan = scans.length > 0;
    const skinState = selectSkinState(
      scans[scans.length - 1],
      scans[scans.length - 2],
      scans,
    );

    const profile: UserProfileSnapshot = {
      primaryConcern: s.concerns?.[0] ?? null,
      concerns: (s.concerns ?? []).map((c) => c.toLowerCase()),
      skinType: s.skinType,
      sensitivity: s.sensitivity,
      goal: s.goal,
      routineTiming: s.routineTiming,
      avoidIngredients: (s.avoidIngredients ?? []).map((x) => x.toLowerCase()),
      fragranceSensitive: s.fragranceSensitive === 'yes',
      hasScan,
    };

    const savedIds = new Set<string>(Array.isArray(s.wishlist) ? s.wishlist : []);
    const routineIds = new Set<string>([
      ...(Array.isArray(s.morningIds) ? s.morningIds : []),
      ...(Array.isArray(s.eveningIds) ? s.eveningIds : []),
    ]);

    return buildShopHomeModel({
      hasScan,
      skinState,
      profile,
      greetingName: s.name && s.name.length > 0 ? s.name : null,
      savedIds,
      routineIds,
      aiMatches: Array.isArray(s.aiMatches) ? s.aiMatches : [],
      scanCount: scans.length,
      latestScanAtIso: skinState?.createdAt ?? scans[scans.length - 1]?.capturedAt ?? null,
      previousScanAtIso: scans[scans.length - 2]?.capturedAt ?? null,
      scoreDelta: skinState?.scoreDelta ?? null,
      now: Date.now(),
    });
  }, [s]);
}

// Re-exports so the screen + card components import the pillar system from one
// place (the model is the contract; the tokens are an implementation detail).
export { PILLAR_THEME, pillarForCategory, type ShopPillar, type PillarTheme };
export { puraShopHome };
