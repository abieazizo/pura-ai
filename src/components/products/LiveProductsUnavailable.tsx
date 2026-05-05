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

export interface LiveProductsUnavailableProps {
  variant: LiveProductsUnavailableVariant;
  /** Short, premium, scoped to the surface ("for breakouts",
   *  "for that search", "for this scan"). Optional. */
  scope?: string;
  onRetry?: () => void;
}

export function LiveProductsUnavailable({
  variant,
  scope,
  onRetry,
}: LiveProductsUnavailableProps) {
  const message =
    variant === 'loading'
      ? `Finding your best match${scope ? ` ${scope}` : ''}…`
      : variant === 'slow'
      ? 'Still finding your best match…'
      : variant === 'empty'
      ? `No strong match${scope ? ` ${scope}` : ''} just now.`
      : 'Live recommendations are offline.';

  const sub =
    variant === 'loading'
      ? 'A quiet moment of taste.'
      : variant === 'slow'
      ? 'Thanks for waiting — this can take a few more seconds.'
      : variant === 'empty'
      ? 'Try a broader concern, or pull again.'
      : 'Pull again in a moment, or browse products.';

  const showRetry =
    onRetry && (variant === 'empty' || variant === 'unavailable');

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
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
    maxWidth: '90%',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: palette.ink,
    marginTop: 8,
  },
  retryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
});
