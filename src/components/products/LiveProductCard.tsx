/**
 * LiveProductCard — v18.0.
 *
 * Renders a `LiveProductCandidate` returned by `lookupLiveProducts`.
 * The card surfaces:
 *   • Brand + product name (real, AI-supplied)
 *   • Match score badge + AI's "why this product" reason line
 *   • Real packshot when imageUrl is present and trusted; otherwise
 *     a wordmark placeholder.
 *   • Real Shop button: opens productUrl when AI-trusted, falls
 *     back to a search-on-merchant URL via buildSearchUrl.
 *   • Real price + currency when present; hidden when null (never
 *     fabricated).
 *
 * Two visual variants:
 *   • "hero"    — full-width card used as the WHAT WE SAW primary
 *                 recommendation under the score module
 *   • "alt"     — compact card used in the ALSO MATCHED carousel
 *                 and the assistant inline product row
 */

import React from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { ArrowUpRight } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import type { LiveProductCandidate } from '@/ai/ai-contracts';
// v19.32 — report image render success/failure to the UI trace
// store so diagnostics can prove the bitmap actually decoded,
// not just that imageUrl was present in the payload.
// v19.37 — also write lastTapped trace so the dev truth panel can
// prove which id the user tapped vs what ProductDetail received.
import {
  updateImageRender,
  setLastTappedProduct,
  type ProductUiTrigger,
} from '@/state/productUiTrace';

// Module-level shim. The card calls `_traceImageRender(id, ok)`
// inside expo-image's onLoad/onError. The active hero+trigger
// is set by the screen rendering the card via
// `setActiveTraceContext`. When no context is set, the call is
// a no-op (e.g. card rendered outside the Products grid).
let _activeScope: string | null = null;
let _activeTrigger: ProductUiTrigger | null = null;
let _activeHeroId: string | null = null;

export function setActiveTraceContext(args: {
  scope: string;
  trigger: ProductUiTrigger;
  heroId: string | null;
}): void {
  _activeScope = args.scope;
  _activeTrigger = args.trigger;
  _activeHeroId = args.heroId;
}

export function clearActiveTraceContext(): void {
  _activeScope = null;
  _activeTrigger = null;
  _activeHeroId = null;
}

function _traceImageRender(candidateId: string, loaded: boolean): void {
  if (!_activeScope || !_activeTrigger) return;
  updateImageRender({
    scope: _activeScope,
    trigger: _activeTrigger,
    candidateId,
    isHero: _activeHeroId === candidateId,
    loaded,
  });
}
import { buildSearchUrl } from '@/api/liveProducts';

export type LiveProductCardVariant = 'hero' | 'alt';

export interface LiveProductCardProps {
  candidate: LiveProductCandidate;
  variant?: LiveProductCardVariant;
  /** Tapping the card body. Default behavior opens the merchant URL
   *  (or search URL fallback). Override to push an in-app detail
   *  screen instead. */
  onOpen?: (candidate: LiveProductCandidate) => void;
}

function openProductPage(candidate: LiveProductCandidate) {
  const url = candidate.productUrl ?? buildSearchUrl(candidate);
  hapt.select();
  Linking.openURL(url).catch(() => {
    /* swallow — never crash on a bad URL */
  });
}

/**
 * v18.5 — CTA label reads from the enriched merchant. After
 * deterministic enrichment in `liveProducts.ts::enrichCommerce`,
 * every candidate carries either a brand DTC merchant ("The Ordinary
 * (DTC)") or a search-merchant ("Sephora (search)") + a productUrl.
 * The card surfaces this as "Shop on The Ordinary" or "Find on
 * Sephora" so the action reads unambiguously.
 */
function shopButtonLabel(c: LiveProductCandidate): string {
  if (!c.merchantName) return c.productUrl ? 'Shop' : 'Find';
  const isSearch = /\(search\)$/i.test(c.merchantName);
  const cleanMerchant = c.merchantName.replace(/\s*\((dtc|search)\)$/i, '');
  return `${isSearch ? 'Find on' : 'Shop on'} ${cleanMerchant}`;
}

function shopButtonAccessibilityLabel(c: LiveProductCandidate): string {
  return `${shopButtonLabel(c)} ${c.brand} ${c.name}`;
}

function formatPrice(value: number, currency: string): string {
  const sym =
    currency === 'GBP'
      ? '£'
      : currency === 'EUR'
      ? '€'
      : currency === 'CAD'
      ? 'C$'
      : currency === 'AUD'
      ? 'A$'
      : '$';
  return Number.isInteger(value) ? `${sym}${value}` : `${sym}${value.toFixed(2)}`;
}

export function LiveProductCard({
  candidate,
  variant = 'alt',
  onOpen,
}: LiveProductCardProps) {
  // v18.1 — by default, tapping the card body navigates to the
  // in-app ProductDetail screen (which resolves from the live
  // cache via `liveProductsById`). The Shop button still opens
  // the real merchant URL via Linking. Callers can override the
  // body-tap behavior via the `onOpen` prop (e.g. ScanResults
  // wants to dismiss the modal first).
  const nav = useNavigation<{ navigate: (name: string, params?: unknown) => void }>();
  const handleOpen = () => {
    if (onOpen) {
      onOpen(candidate);
      return;
    }
    hapt.select();
    try {
      // v19.37 — pass the full candidate alongside `productId` so
      // ProductDetail can render directly from the navigation
      // payload without depending on a fragile second lookup. The
      // store cache (`liveProductsById`) is still written by the
      // engine but the nav payload is the primary truth — a tap
      // never lands on "Product not found" for a candidate that
      // was just visible on the Products screen.
      // v19.37 — write lastTapped trace fields so the dev truth
      // panel can prove which id the user tapped vs which id
      // ProductDetail received.
      setLastTappedProduct({
        id: candidate.id,
        name: `${candidate.brand} — ${candidate.name}`,
      });
      nav.navigate('ProductDetail', {
        productId: candidate.id,
        tint: 'sand',
        liveCandidate: candidate,
      });
    } catch {
      // No nav context (rare) — fall back to merchant URL.
      openProductPage(candidate);
    }
  };

  if (variant === 'hero') {
    return <HeroCard candidate={candidate} onOpen={handleOpen} />;
  }
  return <AltCard candidate={candidate} onOpen={handleOpen} />;
}

// ---------------------------------------------------------------------------
// Hero variant — wide, used as the YOUR NEXT MOVE card.
// ---------------------------------------------------------------------------

function HeroCard({
  candidate,
  onOpen,
}: {
  candidate: LiveProductCandidate;
  onOpen: () => void;
}) {
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${candidate.brand} ${candidate.name}, ${candidate.matchScore} percent match`}
      style={({ pressed }) => [
        heroStyles.card,
        pressed && { opacity: 0.96 },
      ]}
    >
      <View style={heroStyles.imageWrap}>
        <PackshotOrPlaceholder
          candidate={candidate}
          radius={14}
          showWordmark
        />
        <View style={heroStyles.matchPill}>
          <Text style={heroStyles.matchPillNum} maxFontSizeMultiplier={1.1}>
            {`${candidate.matchScore}%`}
          </Text>
          <Text style={heroStyles.matchPillLabel} maxFontSizeMultiplier={1.1}>
            MATCH
          </Text>
        </View>
      </View>
      <View style={heroStyles.text}>
        <Text style={heroStyles.brand} maxFontSizeMultiplier={1.1}>
          {candidate.brand.toUpperCase()}
        </Text>
        <Text
          style={heroStyles.name}
          numberOfLines={2}
          maxFontSizeMultiplier={1.15}
        >
          {candidate.name}
        </Text>
        {candidate.matchReason ? (
          <Text
            style={heroStyles.reason}
            numberOfLines={2}
            maxFontSizeMultiplier={1.2}
          >
            {candidate.matchReason}
          </Text>
        ) : null}
        <View style={heroStyles.foot}>
          {candidate.price !== null && candidate.price > 0 ? (
            <Text style={heroStyles.price} maxFontSizeMultiplier={1.1}>
              {formatPrice(candidate.price, candidate.currency)}
            </Text>
          ) : (
            <View />
          )}
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              openProductPage(candidate);
            }}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={shopButtonAccessibilityLabel(candidate)}
            style={({ pressed }) => [
              heroStyles.shopBtn,
              pressed && { opacity: 0.92 },
            ]}
          >
            <Text style={heroStyles.shopBtnLabel} maxFontSizeMultiplier={1.1}>
              {shopButtonLabel(candidate)}
            </Text>
            <ArrowUpRight size={12} weight="bold" color={palette.inkInverse} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Alt variant — compact, used in carousels and assistant inline cards.
// ---------------------------------------------------------------------------

function AltCard({
  candidate,
  onOpen,
}: {
  candidate: LiveProductCandidate;
  onOpen: () => void;
}) {
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${candidate.brand} ${candidate.name}, ${candidate.matchScore} percent match`}
      style={({ pressed }) => [
        altStyles.card,
        pressed && { opacity: 0.94 },
      ]}
    >
      <View style={altStyles.imageWrap}>
        <PackshotOrPlaceholder candidate={candidate} radius={12} />
        <View style={altStyles.matchBadge}>
          <Text style={altStyles.matchBadgeText} maxFontSizeMultiplier={1.1}>
            {`${candidate.matchScore}%`}
          </Text>
        </View>
      </View>
      <Text style={altStyles.brand} maxFontSizeMultiplier={1.1}>
        {candidate.brand.toUpperCase()}
      </Text>
      <Text
        style={altStyles.name}
        numberOfLines={2}
        maxFontSizeMultiplier={1.15}
      >
        {candidate.name}
      </Text>
      {candidate.price !== null && candidate.price > 0 ? (
        <Text style={altStyles.price} maxFontSizeMultiplier={1.1}>
          {formatPrice(candidate.price, candidate.currency)}
        </Text>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Image render — packshot when imageUrl is set, otherwise a quiet
// brand-wordmark placeholder. Never a "MOCKUP" badge.
// ---------------------------------------------------------------------------

function PackshotOrPlaceholder({
  candidate,
  radius,
  showWordmark = false,
}: {
  candidate: LiveProductCandidate;
  radius: number;
  showWordmark?: boolean;
}) {
  if (candidate.imageUrl && /^https?:\/\//i.test(candidate.imageUrl)) {
    return (
      <Image
        source={{ uri: candidate.imageUrl }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
        contentFit="cover"
        transition={180}
        // v19.32 — report decode success/failure to the trace
        // store so diagnostics + the user can verify whether
        // the bitmap actually rendered (vs payload had URL but
        // expo-image errored). The card receives `onLoad` /
        // `onError` props from the parent below.
        onLoad={() => {
          // forwarded by the wrapping card via globalLoad shim
          // (see `_traceImageRender` below).
          _traceImageRender(candidate.id, true);
        }}
        onError={() => {
          _traceImageRender(candidate.id, false);
        }}
      />
    );
  }
  // Minimal brand-wordmark placeholder. Reads as "image not yet
  // resolved" — quiet, never as "demo product".
  return (
    <View
      style={[
        placeholderStyles.box,
        { borderRadius: radius },
        showWordmark && placeholderStyles.tall,
      ]}
    >
      <Text
        style={placeholderStyles.brand}
        maxFontSizeMultiplier={1.1}
        numberOfLines={1}
      >
        {candidate.brand.toUpperCase()}
      </Text>
      {showWordmark ? (
        <Text
          style={placeholderStyles.product}
          maxFontSizeMultiplier={1.15}
          numberOfLines={2}
        >
          {candidate.name}
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles.
// ---------------------------------------------------------------------------

const heroStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 12,
    borderRadius: 20,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
    shadowColor: palette.ink,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  imageWrap: {
    width: 116,
    height: 148,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
    position: 'relative',
  },
  matchPill: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: palette.moss,
    alignItems: 'center',
    minWidth: 52,
  },
  matchPillNum: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    lineHeight: 14,
    color: palette.inkInverse,
    fontVariant: ['tabular-nums'],
  },
  matchPillLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 8,
    letterSpacing: 1.2,
    color: 'rgba(248,250,252,0.78)',
    marginTop: 1,
  },
  text: {
    flex: 1,
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    marginBottom: 4,
  },
  name: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    lineHeight: 21,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 6,
  },
  reason: {
    flex: 1,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
    marginBottom: 10,
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: palette.clay,
    maxWidth: 220,
  },
  shopBtnLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11.5,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
});

const altStyles = StyleSheet.create({
  card: {
    width: 132,
  },
  imageWrap: {
    width: 132,
    height: 132,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: palette.bgDeep,
    marginBottom: 8,
  },
  matchBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(11,18,32,0.72)',
  },
  matchBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: palette.inkInverse,
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.2,
    color: palette.inkTertiary,
    marginBottom: 2,
  },
  name: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  price: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 12,
    color: palette.inkSecondary,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
});

const placeholderStyles = StyleSheet.create({
  box: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: palette.bgDeep,
  },
  tall: {
    paddingTop: 16,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textAlign: 'center',
  },
  product: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 13,
    lineHeight: 16,
    color: palette.inkSecondary,
    textAlign: 'center',
  },
});
