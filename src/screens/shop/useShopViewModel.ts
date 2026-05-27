/**
 * Pura Shop — view model.
 *
 * v32 — single source of truth for search.
 *   • Search math is owned by `./searchUtils` (tokenize + haystack +
 *     synonyms + Levenshtein suggestion). The VM is now ~30% smaller.
 *   • Emits `suggestion` (closest dictionary word to a 0-hit query)
 *     and `popularSearches` so the screen can offer a recovery path
 *     instead of stranding the user on "Nothing matches X".
 *   • Personalization scoring is unchanged from v31 — every product
 *     is scored against the user's profile and the hero subline
 *     names the matched factors via `describeMatch`.
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store/useAppStore';
import type { ProductMatch } from '@/ai/ai-contracts';
import {
  SHOP_CATALOG,
  scoreForConcern,
  type ConcernKey,
  type ShopCatalogProduct,
} from './shopCatalog';
import {
  describeMatch,
  scoreForUser,
  type UserMatch,
  type UserProfileSnapshot,
} from './personalization';
import {
  matchesQuery,
  POPULAR_SEARCHES,
  suggestSearchTerm,
  tokenize,
} from './searchUtils';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ShopConcernFilter = 'all' | ConcernKey;

export interface ShopSkinContextPill {
  key: string;
  label: string;
  active: boolean;
  concernKey?: ShopConcernFilter;
}

export interface ShopFilterChip {
  key: ShopConcernFilter;
  label: string;
  iconKey: 'sparkle' | 'flame' | 'drop' | 'star' | 'shield';
}

export interface ShopCard {
  catalog: ShopCatalogProduct;
  matchScore: number;
  factors: UserMatch['factors'];
  isSaved: boolean;
  isInRoutine: boolean;
}

export interface ShopHero {
  featured: ShopCard | null;
  subline: string;
}

export interface ShopViewModelInput {
  activeFilter: ShopConcernFilter;
  query?: string;
  activeContextKey?: string | null;
}

export interface ShopViewModel {
  greetingName: string | null;
  hasScan: boolean;
  bagBadgeCount: number;
  savedCount: number;
  contextPills: ShopSkinContextPill[];
  filterChips: ShopFilterChip[];
  activeFilter: ShopConcernFilter;
  hero: ShopHero;
  complete: ShopCard[];
  breakoutEssentials: ShopCard[];
  searchResults: ShopCard[];
  /** Closest dictionary word when query yields 0 hits. */
  suggestion: string | null;
  /** Quick-search shortcut chips (constant across renders). */
  popularSearches: readonly string[];
  isFilterEmpty: boolean;
  isSearchActive: boolean;
  /** 0..1 share of personalization-relevant profile fields filled.
   *  Drives the ProfileMeter accuracy indicator + the "Improve" CTA. */
  profileAccuracy: number;
  /** Hero badge label — flips to "Picked for you" when the hero is a
   *  high-confidence personalized match. */
  heroBadge: string;
}

// ---------------------------------------------------------------------------
// Static
// ---------------------------------------------------------------------------

const FILTER_CHIPS: readonly ShopFilterChip[] = [
  { key: 'all',       label: 'All',        iconKey: 'sparkle' },
  { key: 'breakouts', label: 'Breakouts',  iconKey: 'flame' },
  { key: 'hydration', label: 'Hydration',  iconKey: 'drop' },
  { key: 'marks',     label: 'Marks',      iconKey: 'star' },
  { key: 'barrier',   label: 'Barrier',    iconKey: 'shield' },
] as const;

const COMPLETE_ROUTINE_IDS: readonly string[] = [
  'cerave-hydrating-cleanser',
  'the-ordinary-niacinamide',
  'la-roche-posay-effaclar',
] as const;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useShopViewModel(input: ShopViewModelInput): ShopViewModel {
  const activeFilter = input.activeFilter;
  const query = (input.query ?? '').trim();
  const activeContextKey = input.activeContextKey ?? null;

  const state = useAppStore(
    useShallow((s) => ({
      name: s.name,
      skinType: s.skinType,
      sensitivity: s.sensitivity,
      concerns: s.concerns,
      goal: s.goal,
      routineTiming: s.routineTiming,
      fragranceSensitive: s.fragranceSensitive,
      avoidIngredients: s.avoidIngredients,
      wishlistIds: s.wishlist,
      morningIds: s.userRoutineMorning,
      eveningIds: s.userRoutineEvening,
      aiMatches: s.aiTopMatches,
      scansCount: s.scans.length,
    })),
  );

  return useMemo<ShopViewModel>(() => {
    const hasScan = state.scansCount > 0;
    const routineSet = new Set<string>([
      ...state.morningIds,
      ...state.eveningIds,
    ]);
    const savedSet = new Set<string>(state.wishlistIds);

    // ---------- Personalized profile snapshot ----------
    const profile: UserProfileSnapshot = {
      primaryConcern: state.concerns?.[0] ?? null,
      concerns: (state.concerns ?? []).map((c) => c.toLowerCase()),
      skinType: state.skinType,
      sensitivity: state.sensitivity,
      goal: state.goal,
      routineTiming: state.routineTiming,
      avoidIngredients: (state.avoidIngredients ?? []).map((s) => s.toLowerCase()),
      fragranceSensitive: state.fragranceSensitive === 'yes',
      hasScan,
    };

    const matchByProduct = new Map<string, UserMatch>();
    for (const p of SHOP_CATALOG) {
      matchByProduct.set(p.id, scoreForUser(p, profile));
    }

    const aiMatchById = new Map<string, ProductMatch>();
    for (const m of state.aiMatches) aiMatchById.set(m.product_id, m);

    function scoreOf(p: ShopCatalogProduct): number {
      const aiM = aiMatchById.get(p.id);
      if (aiM?.match_score != null) return aiM.match_score;
      return matchByProduct.get(p.id)?.score ?? 0;
    }

    function toCard(p: ShopCatalogProduct): ShopCard {
      const m = matchByProduct.get(p.id) ?? { score: 0, factors: [] };
      const aiM = aiMatchById.get(p.id);
      const displayScore = aiM?.match_score ?? m.score;
      return {
        catalog: p,
        matchScore: displayScore,
        factors: m.factors,
        isSaved: savedSet.has(p.id),
        isInRoutine: routineSet.has(p.id),
      };
    }

    // ---------- Personalization pills ----------
    const pills: ShopSkinContextPill[] = [];
    const primaryConcern = profile.primaryConcern;
    const concernPillLabel = primaryConcern
      ? primaryConcern.toLowerCase().includes('breakout')
        ? 'Active breakouts'
        : prettyConcern(primaryConcern)
      : 'Active breakouts';
    const concernKey: ShopConcernFilter | undefined = primaryConcern
      ? primaryConcern.toLowerCase().includes('breakout')
        ? 'breakouts'
        : primaryConcern.toLowerCase().includes('mark')
          ? 'marks'
          : primaryConcern.toLowerCase().includes('hydra')
            ? 'hydration'
            : primaryConcern.toLowerCase().includes('sensit') ||
              primaryConcern.toLowerCase().includes('red')
              ? 'barrier'
              : 'all'
      : 'breakouts';
    pills.push({
      key: 'concern',
      label: concernPillLabel,
      active: activeContextKey === 'concern' || activeContextKey === null,
      concernKey,
    });

    const skinTypeLabel =
      profile.skinType === 'combination' ? 'Combination'
      : profile.skinType === 'oily' ? 'Oily'
      : profile.skinType === 'dry' ? 'Dry'
      : profile.skinType === 'balanced' ? 'Balanced'
      : profile.skinType === 'sensitive' ? 'Sensitive'
      : 'Combination';
    pills.push({
      key: 'skinType',
      label: skinTypeLabel,
      active: activeContextKey === 'skinType',
    });

    pills.push({
      key: 'sensitivity',
      label:
        profile.sensitivity === 'very'
          ? 'Very sensitive'
          : 'Sensitive',
      active: activeContextKey === 'sensitivity',
      concernKey: 'barrier',
    });

    // ---------- Search ----------
    const tokens = tokenize(query);
    const isSearchActive = tokens.short.length + tokens.long.length > 0;
    const queryNarrowed = isSearchActive
      ? SHOP_CATALOG.filter((p) => matchesQuery(p, tokens))
      : SHOP_CATALOG.slice();

    // ---------- Hero candidates ----------
    let heroCandidates: ShopCatalogProduct[] = queryNarrowed.slice();
    if (activeFilter !== 'all') {
      heroCandidates = heroCandidates
        .map((p) => ({
          p,
          score: scoreOf(p) + scoreForConcern(p, activeFilter) * 0.4,
          concernFit: scoreForConcern(p, activeFilter),
        }))
        .filter((x) => x.concernFit > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.p);
    } else {
      heroCandidates.sort((a, b) => scoreOf(b) - scoreOf(a));
    }

    const featuredProduct = heroCandidates[0] ?? null;
    const featuredCard = featuredProduct ? toCard(featuredProduct) : null;

    let heroSubline: string;
    if (isSearchActive) {
      heroSubline = `Top match for “${query}”.`;
    } else if (!hasScan) {
      heroSubline = 'Brand-favorite essentials to start.';
    } else if (featuredCard && featuredCard.factors.length > 0) {
      heroSubline = describeMatch({
        score: featuredCard.matchScore,
        factors: featuredCard.factors,
      });
    } else if (activeFilter !== 'all') {
      heroSubline = 'Personalized for what your skin is doing tonight.';
    } else {
      heroSubline = 'Chosen for tonight’s routine.';
    }

    const hero: ShopHero = {
      featured: featuredCard,
      subline: heroSubline,
    };

    // ---------- Complete tonight's routine — STABLE ----------
    const completePool: ShopCatalogProduct[] = [];
    for (const id of COMPLETE_ROUTINE_IDS) {
      const found = SHOP_CATALOG.find((p) => p.id === id);
      if (found && found.id !== featuredProduct?.id) completePool.push(found);
    }
    while (completePool.length < 3) {
      const next = SHOP_CATALOG.find(
        (p) =>
          p.id !== featuredProduct?.id &&
          !completePool.some((c) => c.id === p.id),
      );
      if (!next) break;
      completePool.push(next);
    }
    const complete = completePool.slice(0, 3).map(toCard);

    // ---------- Breakout essentials ----------
    const breakoutPool = queryNarrowed
      .filter(
        (p) =>
          p.concernTags.includes('breakouts') &&
          p.id !== featuredProduct?.id &&
          !complete.some((c) => c.catalog.id === p.id),
      )
      .sort((a, b) => scoreOf(b) - scoreOf(a))
      .slice(0, 6);

    if (!isSearchActive) {
      while (breakoutPool.length < 4) {
        const next = SHOP_CATALOG.find(
          (p) =>
            p.id !== featuredProduct?.id &&
            !breakoutPool.some((c) => c.id === p.id) &&
            !complete.some((c) => c.catalog.id === p.id),
        );
        if (!next) break;
        breakoutPool.push(next);
      }
    }
    const breakoutEssentials = breakoutPool.map(toCard);

    // ---------- Search results ----------
    const searchResults = isSearchActive
      ? queryNarrowed
          .map((p) => ({ p, s: scoreOf(p) }))
          .sort((a, b) => b.s - a.s)
          .slice(0, 16)
          .map(({ p }) => toCard(p))
      : [];

    const isFilterEmpty = isSearchActive
      ? searchResults.length === 0
      : featuredCard === null && breakoutEssentials.length === 0;

    const suggestion =
      isSearchActive && searchResults.length === 0
        ? suggestSearchTerm(query)
        : null;

    // ---------- Profile accuracy ----------
    // 6 fields × 1 point each = 6. Scan and concerns weigh double
    // because they drive the strongest scorer terms. Total = 8 points.
    let accPts = 0;
    if (hasScan) accPts += 2;
    if (profile.concerns.length > 0) accPts += 2;
    if (profile.skinType && profile.skinType !== 'not_sure') accPts += 1;
    if (profile.sensitivity) accPts += 1;
    if (profile.goal) accPts += 1;
    if (profile.routineTiming) accPts += 1;
    const profileAccuracy = Math.min(1, accPts / 8);

    // ---------- Hero badge — flips to "Picked for you" when the
    // recommendation is a high-confidence personalized match. ----------
    const heroBadge =
      featuredCard && featuredCard.matchScore >= 85 && featuredCard.factors.some((f) => f.kind !== 'baseline')
        ? 'Picked for you'
        : "Tonight's #1";

    return {
      greetingName: state.name && state.name.length > 0 ? state.name : null,
      hasScan,
      bagBadgeCount: routineSet.size,
      savedCount: savedSet.size,
      contextPills: pills,
      filterChips: FILTER_CHIPS.slice(),
      activeFilter,
      hero,
      complete,
      breakoutEssentials,
      searchResults,
      suggestion,
      popularSearches: POPULAR_SEARCHES,
      isFilterEmpty,
      isSearchActive,
      profileAccuracy,
      heroBadge,
    };
  }, [state, activeFilter, query, activeContextKey]);
}

function prettyConcern(c: string): string {
  return c.length > 0 ? c[0].toUpperCase() + c.slice(1) : c;
}
