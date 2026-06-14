/**
 * buildSkinShop — the pure, deterministic Shop engine.
 *
 * Derives the whole Shop model from the canonical scan + the kept routine +
 * (only if present) confirmed-got dates. No store reads, no AI, no randomness.
 *
 * Honesty rules, enforced in code and proven by scripts/verifySkinShop.ts:
 *   H1  No scan → `notScanned`, zero products (never a generic catalog).
 *   H2  Concern picks are ranked by FIT to the finding. Price and tier appear
 *       NOWHERE in pick ordering (proven by price-shuffle invariance).
 *   H3  `restock.isReal` (and `restockSoon`) require BOTH a confirmed-got date
 *       AND a typical lifespan. Without them: plain reorder, restockSoon=false.
 *   H4  Dead/quarantined ids are filtered from picks AND collection.
 *   H5  Every product is tied to a finding (picks) or the kept routine
 *       (collection) — nothing generic is ever surfaced.
 *   H6  Evolution: a finding that improved on a newer scan marks its picks
 *       `lessNeededNow` and softens the label to "skippable".
 */

import type { ConcernType, Severity as AiSeverity } from '@/ai/ai-contracts';
import type { SkinState, SkinConcernSummary } from '@/types/canonical';
import { COMMERCE_CATALOG } from '@/commerce/catalog';
import type { CommerceSku, RoutineStepKind } from '@/commerce/types';
import { isQuarantined } from '@/commerce/linkHealth';
import {
  concernLabel,
  concernMetric,
  concernTags,
  concernTintHex,
  severityStrength,
  severityWeight,
} from './concernMap';
import { resolveProduct, skuToShopProduct } from './catalogBridge';
import type {
  CollectionItem,
  ConcernFilterOption,
  ConcernPick,
  FindingEcho,
  HonestyFlags,
  PickLabel,
  RestockState,
  ShopProduct,
  SkinShopModel,
} from './types';

const HONESTY: HonestyFlags = {
  worksWithoutBuying:
    'Your plan works with what you already own — buying anything here is optional.',
  affiliateDisclosure:
    'Some links go to Amazon, where Pura may earn a small commission at no extra cost to you. It never changes what gets recommended.',
  restockHonesty:
    'Pura can’t see purchases you make on Amazon, so “running low” only appears once you’ve told us you got something — it’s never guessed.',
};

export interface BuildSkinShopInput {
  /** Canonical last-scan truth. Only `topConcerns` is read. Null → notScanned. */
  skinState: Pick<SkinState, 'topConcerns'> | null;
  routineMorning: string[];
  routineEvening: string[];
  /** id → ISO date the user confirmed getting it. Empty today (no UI yet). */
  confirmedGotAt: Record<string, string>;
  now: number;

  // ── Injectables (defaults are the real wiring; overridable for tests) ──────
  catalog?: readonly CommerceSku[];
  /** Returns true for a dead/discontinued id (hidden everywhere). */
  isDead?: (id: string) => boolean;
  /** Resolve a routine id → unified product. */
  resolve?: (id: string) => ShopProduct | null;
  /** Fraction of lifespan elapsed before `restockSoon` flips (default 0.8). */
  restockThreshold?: number;
  /** Max primary picks for a high-severity finding (default 2; else 1). */
  maxPicksPerHighFinding?: number;
}

// ── Fit scoring (price-blind — H2) ──────────────────────────────────────────

/** The routine step that actually TARGETS a concern (relevance, not price). */
function targetStepFor(concern: ConcernType): RoutineStepKind {
  return concern === 'hydration' ? 'moisturize' : 'treat';
}

function fitFor(sku: CommerceSku, concern: ConcernType, severity: AiSeverity): number {
  const tags = concernTags(concern);
  const w = severityWeight(severity);
  let score = 0;
  if (tags[0] && sku.concerns.includes(tags[0])) score += 10 * w;
  if (tags[1] && sku.concerns.includes(tags[1])) score += 4 * w;
  // A product in the step that targets this concern is more on-point than one
  // that merely tolerates it (a BHA for breakouts beats a plain cleanser).
  if (sku.step === targetStepFor(concern)) score += 6 * w;
  // Gentle nudge: sensitive-tagged products for reactive findings.
  if (
    (concern === 'redness' || concern === 'sensitivity') &&
    sku.concerns.includes('sensitive')
  ) {
    score += 2;
  }
  return score;
}

const GENTLENESS: Record<CommerceSku['activeStrength'], number> = {
  none: 0,
  gentle: 1,
  active: 2,
};

/** Fit ↓, beginner-safe first, gentler first, id ↑. Never reads price. */
function rankByFit(
  skus: CommerceSku[],
  concern: ConcernType,
  severity: AiSeverity,
): CommerceSku[] {
  return [...skus].sort((a, b) => {
    const fa = fitFor(a, concern, severity);
    const fb = fitFor(b, concern, severity);
    if (fb !== fa) return fb - fa;
    if (a.beginnerSafe !== b.beginnerSafe) return a.beginnerSafe ? -1 : 1;
    // Presentation tiebreak (NOT price/commission): a SKU with a real packshot
    // wins a tie so the shop surfaces premium product photos, not blank tiles.
    const ia = a.image != null;
    const ib = b.image != null;
    if (ia !== ib) return ia ? -1 : 1;
    if (GENTLENESS[a.activeStrength] !== GENTLENESS[b.activeStrength]) {
      return GENTLENESS[a.activeStrength] - GENTLENESS[b.activeStrength];
    }
    return a.id < b.id ? -1 : 1;
  });
}

function pickLabel(severity: AiSeverity, improved: boolean): PickLabel {
  if (improved) return 'skippable';
  return severity === 'high' || severity === 'moderate' ? 'good_match' : 'optional';
}

function whyLineFor(finding: SkinConcernSummary): string {
  const label = concernLabel(finding.concern).toLowerCase();
  const region = (finding.regions?.[0] ?? '').trim();
  return region
    ? `For the ${label} on your ${region}.`
    : `For the ${label} the scan picked up.`;
}

function echoFor(finding: SkinConcernSummary, index: number): FindingEcho {
  return {
    findingId: `${finding.concern}-${index}`,
    concern: finding.concern,
    label: concernLabel(finding.concern),
    metric: concernMetric(finding.concern),
    tintHex: concernTintHex(finding.concern),
    strength: severityStrength(finding.severity),
    confidence: finding.confidence,
    direction: finding.direction ?? null,
  };
}

// ── Restock (H3) ────────────────────────────────────────────────────────────

function daysBetween(iso: string, now: number): number {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return -1;
  return Math.floor((now - then) / 86_400_000);
}

function computeRestock(
  product: ShopProduct,
  confirmedGotAt: string | null,
  now: number,
  threshold: number,
): RestockState {
  const life = product.typicalLifespanDays;
  if (confirmedGotAt && life != null) {
    const elapsed = daysBetween(confirmedGotAt, now);
    if (elapsed >= 0) {
      const daysLeft = life - elapsed;
      const restockSoon = elapsed >= life * threshold;
      return {
        isReal: true,
        restockSoon,
        daysLeft,
        confirmedGotAt,
        typicalLifespanDays: life,
        reason: restockSoon
          ? `About ${Math.max(0, daysLeft)} day${Math.max(0, daysLeft) === 1 ? '' : 's'} left, based on when you said you got it.`
          : `You should be well stocked, based on when you said you got it.`,
      };
    }
  }
  // No confirmed date (or no lifespan) → plain reorder, never fake urgency.
  return {
    isReal: false,
    restockSoon: false,
    daysLeft: null,
    confirmedGotAt: confirmedGotAt ?? null,
    typicalLifespanDays: life,
    reason:
      'Reorder anytime — Pura can’t confirm Amazon purchases, so there’s no restock estimate yet.',
  };
}

// ── The engine ──────────────────────────────────────────────────────────────

export function buildSkinShop(input: BuildSkinShopInput): SkinShopModel {
  const {
    skinState,
    routineMorning,
    routineEvening,
    confirmedGotAt,
    now,
    catalog = COMMERCE_CATALOG,
    isDead = isQuarantined,
    resolve = resolveProduct,
    restockThreshold = 0.8,
    maxPicksPerHighFinding = 2,
  } = input;

  const emptyFilter = () => [] as ConcernPick[];

  // H1 — no scan → notScanned, zero products.
  if (!skinState) {
    return {
      status: 'notScanned',
      honesty: HONESTY,
      collection: [],
      featuredRestock: null,
      concerns: [],
      picks: [],
      filterPicksByConcern: emptyFilter,
    };
  }

  // Findings, strongest first (severity then confidence) — drives pick priority.
  const findings = [...skinState.topConcerns]
    .map((finding, index) => ({ finding, index }))
    .sort((a, b) => {
      const sd =
        severityWeight(b.finding.severity) - severityWeight(a.finding.severity);
      if (sd !== 0) return sd;
      return b.finding.confidence - a.finding.confidence;
    });

  // H4 — healthy pool only (dead/quarantined never enter ranking).
  const healthyPool = catalog.filter((s) => !isDead(s.id));
  const budgetPool = healthyPool.filter((s) => s.priceTier === 'budget');

  const used = new Set<string>();
  const picks: ConcernPick[] = [];

  for (const { finding, index } of findings) {
    const echo = echoFor(finding, index);
    const tags = concernTags(finding.concern);
    const candidates = healthyPool.filter((s) =>
      tags.some((t) => s.concerns.includes(t)),
    );
    if (candidates.length === 0) continue;

    const ranked = rankByFit(candidates, finding.concern, finding.severity);
    const primaryCount =
      finding.severity === 'high' ? maxPicksPerHighFinding : 1;

    let taken = 0;
    for (const sku of ranked) {
      if (taken >= primaryCount) break;
      if (used.has(sku.id)) continue;
      used.add(sku.id);
      taken += 1;

      const improved = echo.direction === 'better';
      const product = skuToShopProduct(sku);

      // Budget alternative: best-fit budget-tier SKU for the same finding (H2 —
      // chosen by fit within the budget tier, not by being the cheapest).
      let budgetAlternative: ShopProduct | null = null;
      if (sku.priceTier !== 'budget') {
        const altPool = budgetPool.filter(
          (s) =>
            s.id !== sku.id &&
            tags.some((t) => s.concerns.includes(t)),
        );
        const alt = rankByFit(altPool, finding.concern, finding.severity)[0];
        if (alt) budgetAlternative = skuToShopProduct(alt);
      }

      picks.push({
        product,
        forFindingId: echo.findingId,
        echo,
        whyLine: whyLineFor(finding),
        priceUsd: sku.priceUsd,
        label: pickLabel(finding.severity, improved),
        budgetAlternative,
        lessNeededNow: improved,
        fitScore: fitFor(sku, finding.concern, finding.severity),
      });
    }
  }

  // Concern filter options — ALL the user's actual concerns (scan language),
  // even ones with zero picks, in finding-priority order.
  const concerns: ConcernFilterOption[] = [];
  const seenConcern = new Set<ConcernType>();
  for (const { finding } of findings) {
    if (seenConcern.has(finding.concern)) continue;
    seenConcern.add(finding.concern);
    concerns.push({
      concern: finding.concern,
      label: concernLabel(finding.concern),
      metric: concernMetric(finding.concern),
      tintHex: concernTintHex(finding.concern),
      count: picks.filter((p) => p.echo.concern === finding.concern).length,
    });
  }

  // Collection — the kept routine, reorder source. (H4 + H5: healthy + tied.)
  const slotOf = new Map<string, 'morning' | 'evening' | 'both'>();
  for (const id of routineMorning ?? []) slotOf.set(id, 'morning');
  for (const id of routineEvening ?? []) {
    slotOf.set(id, slotOf.has(id) ? 'both' : 'evening');
  }

  const collection: CollectionItem[] = [];
  for (const [id, slot] of slotOf) {
    if (isDead(id)) continue; // never surface a broken product
    const product = resolve(id);
    if (!product) continue; // unresolvable id → drop, never fabricate
    const confirmed = confirmedGotAt?.[id] ?? null;
    collection.push({
      product,
      slot,
      reorderUrl: product.affiliateUrl,
      restock: computeRestock(product, confirmed, now, restockThreshold),
    });
  }

  // featuredRestock — the single most-due item with a REAL estimate (else null).
  const due = collection.filter((c) => c.restock.isReal && c.restock.restockSoon);
  const featuredRestock =
    due.length > 0
      ? due.reduce((a, b) =>
          (a.restock.daysLeft ?? Infinity) <= (b.restock.daysLeft ?? Infinity)
            ? a
            : b,
        )
      : null;

  const filterPicksByConcern = (concern: ConcernType | 'all'): ConcernPick[] =>
    concern === 'all' ? picks : picks.filter((p) => p.echo.concern === concern);

  return {
    status: 'ready',
    honesty: HONESTY,
    collection,
    featuredRestock,
    concerns,
    picks,
    filterPicksByConcern,
  };
}
