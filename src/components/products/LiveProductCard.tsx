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

export type LiveProductCardVariant = 'hero' | 'alt' | 'list';

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
  if (variant === 'list') {
    return <ListCard candidate={candidate} onOpen={handleOpen} />;
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
  // v22.4 — use the deterministic fitBand from the trust scorer to
  // label the card honestly. Falls back to a `related` label for
  // any legacy candidates that haven't been scored yet.
  const band = candidate.fitBand ?? 'related';
  const bandCopy = fitBandLabel(band, candidate);
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${candidate.brand} ${candidate.name}, ${bandCopy.label}`}
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
        <View
          style={[
            heroStyles.matchPill,
            { backgroundColor: bandCopy.bg },
          ]}
        >
          <Text style={heroStyles.matchPillNum} maxFontSizeMultiplier={1.1}>
            {bandCopy.label}
          </Text>
          <Text style={heroStyles.matchPillLabel} maxFontSizeMultiplier={1.1}>
            {bandCopy.kicker}
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
// List variant — v23.0 compact vertical row.
//
// Used as the PRIMARY alternative-card layout under the hero on the
// Products tab. Replaces the previous two-column grid that read like
// a cheap ecommerce catalog. The row puts a 72×72 image tile on the
// left, all card text on the right (brand kicker, sans-serif name,
// sans-serif reason 2-3 lines, fit-band label, price). Premium,
// readable, and clearly subordinate to the hero card above it.
// ---------------------------------------------------------------------------

function ListCard({
  candidate,
  onOpen,
}: {
  candidate: LiveProductCandidate;
  onOpen: () => void;
}) {
  const band = candidate.fitBand ?? 'related';
  const bandCopy = fitBandLabel(band, candidate);
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${candidate.brand} ${candidate.name}, ${bandCopy.label}`}
      style={({ pressed }) => [
        listStyles.card,
        pressed && { opacity: 0.96 },
      ]}
    >
      <View style={listStyles.imageWrap}>
        <PackshotOrPlaceholder candidate={candidate} radius={12} />
      </View>
      <View style={listStyles.text}>
        <View style={listStyles.topRow}>
          <Text style={listStyles.brand} maxFontSizeMultiplier={1.1}>
            {candidate.brand.toUpperCase()}
          </Text>
          <View
            style={[
              listStyles.bandPill,
              { backgroundColor: bandCopy.compactBg },
            ]}
          >
            <Text
              style={listStyles.bandPillText}
              maxFontSizeMultiplier={1.1}
              numberOfLines={1}
            >
              {bandCopy.label}
            </Text>
          </View>
        </View>
        <Text
          style={listStyles.name}
          numberOfLines={2}
          maxFontSizeMultiplier={1.15}
        >
          {candidate.name}
        </Text>
        {candidate.matchReason && candidate.matchReason.trim().length > 0 ? (
          <Text
            style={listStyles.reason}
            numberOfLines={3}
            maxFontSizeMultiplier={1.2}
          >
            {candidate.matchReason}
          </Text>
        ) : null}
        {candidate.price !== null && candidate.price > 0 ? (
          <Text style={listStyles.price} maxFontSizeMultiplier={1.1}>
            {formatPrice(candidate.price, candidate.currency)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const listStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 12,
    borderRadius: 18,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  imageWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
    position: 'relative',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.inkTertiary,
    flex: 1,
  },
  bandPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bandPillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
  // v23.0 — sans-serif name for utility readability. The hero card
  // keeps a serif name for editorial weight; the list-row name is
  // utility-grade.
  name: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.1,
    color: palette.ink,
  },
  // v23.0 — REASON IS SANS-SERIF + READABLE. The old italic-serif
  // reason was decorative; this is the most important content of the
  // card and now reads as such.
  reason: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: palette.inkSecondary,
    marginTop: 4,
  },
  price: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: palette.inkSecondary,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
});

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
  // v22.4 — fitBand replaces the raw %. The compact badge shows
  // the band label only; the % subtext sits below for transparency
  // when the user wants it. Curated-source cards still surface the
  // band but with the honest fallback fit cap.
  const band = candidate.fitBand ?? 'related';
  const bandCopy = fitBandLabel(band, candidate);
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${candidate.brand} ${candidate.name}, ${bandCopy.label}`}
      style={({ pressed }) => [
        altStyles.card,
        pressed && { opacity: 0.94 },
      ]}
    >
      <View style={altStyles.imageWrap}>
        <PackshotOrPlaceholder candidate={candidate} radius={12} />
        <View
          style={[
            altStyles.matchBadge,
            { backgroundColor: bandCopy.compactBg },
          ]}
        >
          <Text style={altStyles.matchBadgeText} maxFontSizeMultiplier={1.1}>
            {bandCopy.label}
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
      {/* v22.6 — concise why-it-fits line. Built deterministically
          from the scoring breakdown (or supplied by the AI planner
          when available). Reads as a short editorial caption rather
          than a marketing claim. */}
      {candidate.matchReason && candidate.matchReason.trim().length > 0 ? (
        <Text
          style={altStyles.reason}
          numberOfLines={2}
          maxFontSizeMultiplier={1.2}
        >
          {candidate.matchReason}
        </Text>
      ) : null}
      {candidate.price !== null && candidate.price > 0 ? (
        <Text style={altStyles.price} maxFontSizeMultiplier={1.1}>
          {formatPrice(candidate.price, candidate.currency)}
        </Text>
      ) : null}
    </Pressable>
  );
}

/**
 * v22.9 — context-aware match label. The previous v22.4 labels
 * ("Exact fit / Strong fit / Related / Broad") were honest about
 * ranking but generic about what the product DOES. This map now
 * inspects the candidate to pick a label that reads as a real
 * skincare recommendation:
 *
 *   • "Best match"        — exact-band, no strong concern signal
 *   • "Good for breakouts" — concernTags includes 'breakouts'
 *   • "Hydration pick"     — concernTags includes 'hydration'
 *   • "Barrier support"    — name/desc mentions ceramides/barrier/repair
 *   • "Gentle option"      — skinTypeTags includes 'sensitive' OR
 *                            strength=='gentle' OR name has 'gentle'
 *   • "Dark mark support"  — concernTags includes 'dark_marks'
 *   • "Texture support"    — concernTags includes 'texture'
 *   • "Sensitive-skin pick"— skinTypeTags includes 'sensitive'
 *   • "Similar match"      — related band with no specific signal
 *   • "Curated pick"       — broad band
 *
 * The pill BG colour still encodes the fit band so the visual
 * hierarchy is preserved (exact = moss/green-ish; related = clay;
 * broad = neutral) while the label text becomes useful.
 */
function fitBandLabel(
  band: 'exact' | 'strong' | 'related' | 'broad',
  candidate?: LiveProductCandidate
): {
  label: string;
  kicker: string;
  bg: string;
  compactBg: string;
} {
  // Visual band BG — preserved from v22.4 so users still read fit
  // intensity at a glance via colour.
  const bandViz = (() => {
    switch (band) {
      case 'exact':
        return { bg: palette.moss, compactBg: 'rgba(11,18,32,0.78)' };
      case 'strong':
        return {
          bg: palette.mossDeep ?? palette.moss,
          compactBg: 'rgba(11,18,32,0.72)',
        };
      case 'related':
        return { bg: palette.clay, compactBg: 'rgba(89,55,30,0.78)' };
      case 'broad':
      default:
        return { bg: palette.inkTertiary, compactBg: 'rgba(11,18,32,0.55)' };
    }
  })();

  const contextLabel = deriveContextLabel(band, candidate);

  return {
    label: contextLabel,
    kicker: band === 'exact' || band === 'strong' ? 'MATCH' : 'PICK',
    ...bandViz,
  };
}

function deriveContextLabel(
  band: 'exact' | 'strong' | 'related' | 'broad',
  candidate?: LiveProductCandidate
): string {
  if (!candidate) {
    if (band === 'exact' || band === 'strong') return 'Best match';
    if (band === 'related') return 'Similar match';
    return 'Curated pick';
  }
  const tags = (candidate.concernTags ?? []) as string[];
  const skinTypes = (candidate.skinTypeTags ?? []).map((t) =>
    t.toLowerCase()
  );
  const corpus = `${candidate.name ?? ''} ${candidate.shortDescription ?? ''}`.toLowerCase();
  // Exact + strong bands: prefer a "Best/Top" framing.
  if (band === 'exact' || band === 'strong') {
    if (tags.includes('breakouts')) return 'For active-looking areas';
    if (tags.includes('hydration')) return 'Hydration pick';
    if (tags.includes('dark_marks')) return 'Dark mark support';
    if (tags.includes('texture')) return 'Texture support';
    if (tags.includes('redness') || tags.includes('sensitivity')) {
      return 'Sensitive-skin pick';
    }
    if (/cerami[de]+|barrier|repair/i.test(corpus)) return 'Barrier support';
    if (skinTypes.includes('sensitive') || /gentle\b/.test(corpus)) {
      return 'Gentle option';
    }
    return 'Best match';
  }
  // Related band: framing softer ("good for", "support") still works.
  if (band === 'related') {
    if (tags.includes('breakouts')) return 'For active-looking areas';
    if (tags.includes('hydration')) return 'Hydration pick';
    if (tags.includes('dark_marks')) return 'Dark mark support';
    if (tags.includes('texture')) return 'Texture support';
    if (tags.includes('redness') || tags.includes('sensitivity')) {
      return 'Sensitive-skin pick';
    }
    if (/cerami[de]+|barrier|repair/i.test(corpus)) return 'Barrier support';
    if (skinTypes.includes('sensitive') || /gentle\b/.test(corpus)) {
      return 'Gentle option';
    }
    return 'Similar match';
  }
  // Broad band: honest "Curated pick" framing.
  return 'Curated pick';
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
  // v22.5 — track per-card image error so we can swap to the
  // branded placeholder when expo-image's onError fires. Without
  // this state, an imageUrl that 404s leaves the card with a
  // visible empty box.
  const [imageErrored, setImageErrored] = React.useState(false);
  const hasUrl =
    !!candidate.imageUrl && /^https?:\/\//i.test(candidate.imageUrl);
  if (hasUrl && !imageErrored) {
    return (
      <Image
        source={{ uri: candidate.imageUrl as string }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
        contentFit="cover"
        transition={180}
        onLoad={() => {
          _traceImageRender(candidate.id, true);
        }}
        onError={() => {
          // Swap to the branded placeholder on decode failure.
          setImageErrored(true);
          _traceImageRender(candidate.id, false);
        }}
      />
    );
  }
  // v23.0 — premium MISSING-IMAGE placeholder. The old treatment
  // showed a giant brand wordmark inside the image area, which made
  // the placeholder dominate the card and duplicate the brand kicker
  // rendered below the image. This version is the opposite:
  //   • soft brand-blue surface (clayPaper)
  //   • small droplet glyph (Pura motif)
  //   • brand INITIALS only (e.g. "TO" for The Ordinary), never the
  //     full wordmark
  //   • on the hero variant, no product wordmark — the hero's own
  //     name text already lives outside the image
  // Reads as an intentional brand fallback, not a fake product tile.
  const initials = brandInitials(candidate.brand);
  return (
    <View
      style={[
        placeholderStyles.box,
        { borderRadius: radius },
      ]}
    >
      <View style={placeholderStyles.dropletWrap} pointerEvents="none">
        <View style={placeholderStyles.dropletTail} />
        <View style={placeholderStyles.dropletBody} />
      </View>
      <Text
        style={placeholderStyles.initials}
        maxFontSizeMultiplier={1.1}
        numberOfLines={1}
      >
        {initials}
      </Text>
      {/* v23.0 — `showWordmark` retained for API compatibility but
          no longer used. The hero card renders the product name in
          its own text column, outside the image area. */}
      {showWordmark ? null : null}
    </View>
  );
}

function brandInitials(brand: string): string {
  if (!brand) return '·';
  const tokens = brand
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return brand.slice(0, 2).toUpperCase();
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return (tokens[0][0] + tokens[1][0]).toUpperCase();
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
    // v22.6 — was 9; raised to 10 for legibility. Still reads as a
    // kicker because of the letterSpacing + tertiary color.
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.inkTertiary,
    marginBottom: 2,
  },
  // v23.0 — sans-serif title for product utility. Serif reads as
  // editorial decoration on a dense product card; sans-serif reads
  // as a real product name a shopper would scan.
  name: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.1,
    color: palette.ink,
  },
  // v23.0 — REASON IS SANS-SERIF + READABLE. The old italic-serif
  // reason rendered as decorative italic that read like a caption
  // for the brand, not the most important content on the card.
  reason: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: palette.inkSecondary,
    marginTop: 4,
  },
  price: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: palette.inkSecondary,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
});

const placeholderStyles = StyleSheet.create({
  // v23.0 — compact premium placeholder. Soft brand-blue surface
  // with a small Pura-style droplet motif + brand initials. No
  // giant brand wordmark inside — the brand kicker rendered next
  // to the placeholder (outside this component) is the brand
  // identity surface; this is just the image stand-in.
  box: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.clayPaper,
    gap: 6,
  },
  // Droplet motif — tail (small triangle dot) on top, body (rounded
  // circle) below. Reads as a calm Pura mark rather than a fake
  // bottle silhouette.
  dropletWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.55,
    marginBottom: 2,
  },
  dropletTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: palette.clayDeep,
    marginBottom: -1,
  },
  dropletBody: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: palette.clayDeep,
  },
  initials: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.8,
    color: palette.clayDeep,
    textAlign: 'center',
  },
});
