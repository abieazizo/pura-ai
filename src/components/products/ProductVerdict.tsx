/**
 * ProductVerdict — the one-line Pura judgement for a product detail page.
 *
 * Sits near the top of the detail page, after the hero. Tells the user
 * "should I buy this for MY skin?" in one calm sentence + a 1-2 line
 * elaboration. Built deterministically from product metadata + the
 * user's primary concern — never invented prose.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sparkle } from 'phosphor-react-native';
import { palette } from '@/theme';
import { PuraMatchBadge } from '@/components/products/PuraMatchBadge';
import type { Product } from '@/types';

interface Props {
  product: Product;
  /** Resolved match score (0..100) or null. */
  matchScore: number | null;
  /** User's primary concern label, e.g. "breakouts", "hydration". */
  primaryConcern: string | null;
}

export function ProductVerdict({ product, matchScore, primaryConcern }: Props) {
  const { headline, body } = buildVerdict(product, matchScore, primaryConcern);

  return (
    <View style={styles.wrap}>
      <View style={styles.kickerRow}>
        <Sparkle size={11} color={palette.clayDeep} weight="fill" />
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          PURA VERDICT
        </Text>
        <PuraMatchBadge score={matchScore} size="sm" />
      </View>
      <Text
        style={styles.headline}
        maxFontSizeMultiplier={1.15}
        numberOfLines={2}
      >
        {headline}
      </Text>
      <Text
        style={styles.body}
        maxFontSizeMultiplier={1.2}
        numberOfLines={4}
      >
        {body}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Verdict builder
// ---------------------------------------------------------------------------

function buildVerdict(
  product: Product,
  matchScore: number | null,
  primaryConcern: string | null
): { headline: string; body: string } {
  const tags = (product.tags ?? []).map((t) => t.toLowerCase());
  const category = product.category;
  const concern = (primaryConcern ?? '').toLowerCase();

  // Map product semantics to user-facing intent.
  const targetsBreakouts =
    tags.some((t) => /breakout|acne|salicylic|bha|benzoyl/.test(t)) ||
    /breakout|acne|spot/.test(product.name.toLowerCase());
  const targetsDarkMarks =
    tags.some((t) => /dark.*mark|tone|brightening|tranexamic|niacinamide|alpha.*arbutin|azelaic/.test(t)) ||
    /dark|tone|brightening|discoloration/.test(product.name.toLowerCase());
  const targetsHydration =
    tags.some((t) => /hydra|ceramide|hyaluronic|moisture/.test(t)) ||
    category === 'moisturizer' ||
    category === 'serum' && /hydra|hyaluronic/.test(product.name.toLowerCase());

  const concernIsBreakouts = /breakout|acne/.test(concern);
  const concernIsDarkMarks = /dark|mark|tone/.test(concern);
  const concernIsHydration = /hydra|dry/.test(concern);

  // Strong fit — the product targets the user's primary concern.
  if (concernIsBreakouts && targetsBreakouts) {
    return {
      headline: 'Solid breakout fit for your current skin.',
      body:
        'This product targets the kind of activity Pura saw on your latest scan. Pair with a gentle routine and consistent SPF, and give it 4–6 weeks.',
    };
  }
  if (concernIsDarkMarks && targetsDarkMarks) {
    return {
      headline: 'A strong fit for fading dark marks.',
      body:
        'Best for the kind of post-breakout tone changes Pura flagged. Stay consistent and protect your progress with daily SPF.',
    };
  }
  if (concernIsHydration && targetsHydration) {
    return {
      headline: 'Hydration support that fits your scan.',
      body:
        'A barrier-friendly pick that addresses the moisture dip Pura flagged. Layer before your moisturizer.',
    };
  }

  // Cross-purpose — common mismatch case (e.g. brightening serum for an active-acne user).
  if (concernIsBreakouts && targetsDarkMarks) {
    return {
      headline: 'Good fit, but not your only breakout product.',
      body:
        'Best for fading post-breakout marks and evening tone — not active pimples. If your main issue is active breakouts, pair this with a dedicated treatment.',
    };
  }
  if (concernIsDarkMarks && targetsBreakouts) {
    return {
      headline: 'Supportive pick — keep it secondary.',
      body:
        'Strong on breakout activity, gentler on tone changes. Use it for spot moments, but lean on a brightening serum for the dark-mark work.',
    };
  }

  // Confidence-banded defaults.
  if (typeof matchScore === 'number' && matchScore >= 80) {
    return {
      headline: 'Strong fit for your current skin.',
      body:
        'A high-confidence pick based on your scan, ingredient profile, and routine fit. Patch test and introduce one new product at a time.',
    };
  }
  if (typeof matchScore === 'number' && matchScore >= 65) {
    return {
      headline: 'Good fit, with one or two caveats to watch.',
      body:
        'Fine for general use. Read the "Should you buy this?" section below to see whether it earns a spot in your routine right now.',
    };
  }
  return {
    headline: 'Supportive pick, not your headline product.',
    body:
      'Pura did not flag this as a primary match for your current scan. It can still play a supporting role — check the routine compatibility notes below.',
  };
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    marginHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: palette.clayPaper,
    borderWidth: 1,
    borderColor: palette.clayLight,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  kicker: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clayDeep,
    textTransform: 'uppercase',
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 6,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
  },
});
