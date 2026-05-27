/**
 * LiveProductsUnavailable — v18.4.
 *
 * The single shared empty/failure state that every live-product
 * surface uses when retrieval is in flight, came back empty, or the
 * proxy is unreachable. Honest copy + retry button.
 *
 * Variants:
 *   • "loading"     — italic-serif "Finding real products…" line
 *   • "empty"       — "We couldn't find live products for that" +
 *                     "Try a broader search" + retry button
 *   • "unavailable" — "Live retrieval is offline right now" +
 *                     retry button
 *
 * The card never silently presents seed/demo content as if it were
 * the live answer. When a screen does have a hidden seed fallback
 * (e.g. ProductsScreen search), it shows that fallback BELOW this
 * card with its own clear "Browser fallback" framing.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowClockwise, MagnifyingGlass } from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';

export type LiveProductsUnavailableVariant =
  | 'loading'
  | 'slow'
  | 'empty'
  | 'unavailable';

/**
 * v22.4 — context flag for product-search-specific copy. The same
 * component is reused on the scan result screen ("for this scan")
 * and the products tab ("for this search"); copy should read in
 * the right register for each.
 */
export type LiveProductsUnavailableContext = 'scan' | 'search';

export interface LiveProductsUnavailableProps {
  variant: LiveProductsUnavailableVariant;
  /** Short, premium, scoped to the surface ("for breakouts",
   *  "for that search", "for this scan"). Optional. */
  scope?: string;
  onRetry?: () => void;
  /**
   * v19.3 — optional secondary action. When set, the empty +
   * unavailable variants render a quiet "Browse products" link
   * below the Retry button so the screen always offers forward
   * motion. Pass undefined to suppress.
   */
  onBrowse?: () => void;
  /**
   * v22.4 — surface context. Default `scan` preserves the existing
   * scan-result copy; pass `search` from the Products tab to use
   * product-search-specific phrasing.
   */
  context?: LiveProductsUnavailableContext;
  /**
   * v23.0 — compact mode for the Home screen. When true, the card
   * renders as a single sans-serif row with reduced padding so the
   * offline / loading state never dominates the page. The full
   * card variant remains the default for the scan result screen
   * and the products tab where the surface needs more weight.
   */
  compact?: boolean;
}

export function LiveProductsUnavailable({
  variant,
  scope,
  onRetry,
  onBrowse,
  context = 'scan',
  compact = false,
}: LiveProductsUnavailableProps) {
  const isSearch = context === 'search';
  // v23.0 — copy hierarchy reshaped so the offline / loading state
  // never sounds like "the app is broken". Compact mode (used on
  // Home) softens the headline further: it never says "Live
  // recommendations are offline" as the page's emotional centerpiece.
  const message = compact
    ? variant === 'loading'
      ? 'Matching products to your skin…'
      : variant === 'slow'
      ? 'Still working on your match…'
      : variant === 'empty'
      ? 'No live match right now'
      : 'Live matching is paused'
    : variant === 'loading'
    ? isSearch
      ? `Looking for the best matches${scope ? ` ${scope}` : ''}…`
      : `Finding your best match${scope ? ` ${scope}` : ''}…`
    : variant === 'slow'
    ? isSearch
      ? 'Still checking the best options for this search…'
      : 'Still finding your best match…'
    : variant === 'empty'
    ? isSearch
      ? `We couldn’t find strong exact matches${scope ? ` ${scope}` : ''} yet.`
      : `No strong match${scope ? ` ${scope}` : ''} just now.`
    : isSearch
    ? 'Product search is offline right now.'
    : 'Live recommendations are offline.';

  // v22.4 — replaced the legacy poetic loading sub-copy with
  // product-search-grounded sub-copy. Every variant reads as
  // honest, calm, and specific to what the user is doing.
  // v23.0 — compact sub-copy is one short, calm sentence.
  const sub = compact
    ? variant === 'loading'
      ? 'Quick read on tonight’s best fit.'
      : variant === 'slow'
      ? 'Almost there.'
      : variant === 'empty'
      ? 'Try Browse, or scan again for a fresh read.'
      : 'Showing curated picks while we reconnect.'
    : variant === 'loading'
    ? isSearch
      ? 'Reading product details, ingredients, and skin fit.'
      : 'Reading your scan and matching to product details.'
    : variant === 'slow'
    ? 'Thanks for waiting — this can take a few more seconds.'
    : variant === 'empty'
    ? isSearch
      ? 'Try a broader term, or browse by goal below.'
      : 'Try a broader concern, or pull again.'
    : isSearch
    ? 'Pull again in a moment, or browse products by goal.'
    : 'Pull again in a moment, or browse products.';

  const showRetry =
    onRetry && (variant === 'empty' || variant === 'unavailable');

  if (compact) {
    return (
      <View style={compactStyles.card}>
        <View style={compactStyles.row}>
          <View style={compactStyles.iconWrap}>
            {variant === 'empty' ? (
              <MagnifyingGlass
                size={15}
                color={palette.inkSecondary}
                weight="duotone"
              />
            ) : (
              <View
                style={[
                  compactStyles.dotPulse,
                  variant === 'slow' && { backgroundColor: palette.amber },
                ]}
              />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={compactStyles.headline}
              maxFontSizeMultiplier={1.15}
              numberOfLines={1}
            >
              {message}
            </Text>
            <Text
              style={compactStyles.sub}
              maxFontSizeMultiplier={1.15}
              numberOfLines={1}
            >
              {sub}
            </Text>
          </View>
          {showRetry ? (
            <Pressable
              onPress={() => {
                hapt.select();
                onRetry();
              }}
              accessibilityRole="button"
              accessibilityLabel="Retry"
              hitSlop={8}
              style={({ pressed }) => [
                compactStyles.retryBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <ArrowClockwise
                size={11}
                color={palette.inkInverse}
                weight="bold"
              />
              <Text style={compactStyles.retryLabel} maxFontSizeMultiplier={1.1}>
                Retry
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        {variant === 'empty' ? (
          <MagnifyingGlass
            size={20}
            color={palette.inkSecondary}
            weight="duotone"
          />
        ) : (
          // Loading + slow + unavailable all show the soft pulse;
          // the loading + slow variants animate via opacity below.
          <View
            style={[
              styles.dotPulse,
              variant === 'slow' && { backgroundColor: palette.amber },
            ]}
          />
        )}
      </View>
      <Text style={styles.headline} maxFontSizeMultiplier={1.2}>
        {message}
      </Text>
      {sub ? (
        <Text style={styles.sub} maxFontSizeMultiplier={1.2}>
          {sub}
        </Text>
      ) : null}
      {showRetry ? (
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => {
              hapt.select();
              onRetry();
            }}
            accessibilityRole="button"
            accessibilityLabel="Retry"
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && { opacity: 0.92 },
            ]}
          >
            <ArrowClockwise
              size={13}
              color={palette.inkInverse}
              weight="bold"
            />
            <Text style={styles.retryLabel} maxFontSizeMultiplier={1.1}>
              Retry
            </Text>
          </Pressable>
          {onBrowse ? (
            <Pressable
              onPress={() => {
                hapt.select();
                onBrowse();
              }}
              accessibilityRole="button"
              accessibilityLabel="Browse products"
              hitSlop={6}
              style={({ pressed }) => [
                styles.browseBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.browseLabel} maxFontSizeMultiplier={1.1}>
                Browse products
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'flex-start',
    gap: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
    marginBottom: 4,
  },
  dotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.clay,
  },
  // v23.0 — switched to sans-serif so the offline / loading
  // status reads as functional, not editorial. Serif is reserved
  // for brand identity, score numbers, and short hero headlines.
  headline: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
    color: palette.ink,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
    maxWidth: '90%',
  },
  // v19.3 — primary Retry pill + secondary "Browse products"
  // text link sit on one row so the empty/unavailable card always
  // offers forward motion.
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: palette.ink,
  },
  retryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
  browseBtn: {
    paddingVertical: 8,
  },
  browseLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.clay,
  },
});

// v23.0 — single-row compact card used on Home so the offline /
// loading state never dominates the page. Same component, smaller
// visual weight, identical accessibility surface.
const compactStyles = StyleSheet.create({
  card: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  dotPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.clay,
  },
  headline: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.05,
    color: palette.ink,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    lineHeight: 15,
    color: palette.inkTertiary,
    marginTop: 2,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: palette.ink,
  },
  retryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
});
